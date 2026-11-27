// Durable local storage for queued survey submissions and form drafts.
//
// Rules (see SAM-COORDINATED-UPDATE-IMPLEMENTATION-PLAN §6 "Safe data/cache refresh"):
//  * Records are business data. Nothing here deletes them by age.
//  * IndexedDB is primary; localStorage is a fallback. Reads ALWAYS merge both
//    stores, de-duplicated by a stable id, so a record written to the fallback
//    while IndexedDB was failing stays visible after IndexedDB recovers.
//  * Writes resolve only after the transaction commits; failures throw so callers
//    never report "saved" for data that was not stored.
//  * Every new record carries ownerId (the signed-in LOGIN ID — never the display
//    name, which two people can share), formSchemaVersion, and a
//    clientSubmissionId so uploads can be scoped to the right account and the
//    server can de-duplicate retries. Legacy records without an owner are left
//    alone — they are never silently assigned to whoever is logged in.
import { RELEASE_INFO, formSchemaVersionFor } from '../constants/releaseInfo';
import { getCurrentOwnerId } from './currentOwner';

const DB_NAME = 'SamAppDB_v2';
const DB_VERSION = 2; // do not bump without a migration plan: old builds fail to open a newer version
const STORE_FORMS = 'surveyForms';
const STORE_DRAFTS = 'formDrafts';

export const FORM_FALLBACK_PREFIX = 'samv2_form_';
export const DRAFT_FALLBACK_PREFIX = 'samv2_draft_';
export const LOCAL_RECORD_VERSION = 2;

const isIDBAvailable = () => {
  try { return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB != null; }
  catch { return false; }
};

const lsFallback = {
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  get: (k) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  del: (k) => { try { localStorage.removeItem(k); return true; } catch { return false; } },
  keys: (prefix) => { try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)); } catch { return []; } },
};

// Re-exported so existing imports keep working; the logic lives in currentOwner.js.
export { getCurrentOwnerId };

export function newClientId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* fall through */ }
  // RFC4122 v4 shape from Math.random — only used on very old WebViews.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!isIDBAvailable()) { reject(new Error('IndexedDB unavailable')); return; }
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_FORMS)) {
        db.createObjectStore(STORE_FORMS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'formKey' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

// Run one request inside a transaction; resolve with the request result only
// after the transaction has committed.
function runTx(db, storeName, mode, fn) {
  return new Promise((resolve, reject) => {
    let tx;
    try { tx = db.transaction(storeName, mode); } catch (e) { reject(e); return; }
    let result;
    const req = fn(tx.objectStore(storeName));
    if (req) req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    tx.onerror = () => reject(tx.error);
  });
}

const recordIdentity = rec => rec?.clientSubmissionId || (rec?.id != null ? `id:${rec.id}` : null);

// ── Offline form submissions ──────────────────────────────────────────────────

// Survey pages call this with a single object: saveOfflineForm({ url, data }).
// Resolves true only after the record is durably stored; throws otherwise.
export async function saveOfflineForm(payload) {
  const { url, data } = payload || {};
  const record = {
    url,
    data,
    timestamp: Date.now(),
    lastModified: Date.now(),
    synced: false,
    clientSubmissionId: newClientId(),
    ownerId: getCurrentOwnerId(),
    // The payload shape this build produced; sent with the upload even after an app update.
    formSchemaVersion: formSchemaVersionFor(url),
    createdWithRelease: RELEASE_INFO.webBuildId,
    recordVersion: LOCAL_RECORD_VERSION,
  };
  try {
    const db = await openDB();
    await runTx(db, STORE_FORMS, 'readwrite', store => store.add(record));
    return true;
  } catch {
    const key = `${FORM_FALLBACK_PREFIX}${record.clientSubmissionId}`;
    if (!lsFallback.set(key, record)) throw new Error('Could not store offline survey');
    return true;
  }
}

// Older builds stored records via a two-arg saveOfflineForm(formType, data),
// which nested the real payload as { formType: { url, data }, data: undefined }.
// Normalize every record to a flat { ...record, url, data } so the drawer and
// the uploader work regardless of when the form was saved.
function normalizeForm(rec) {
  if (!rec || typeof rec !== 'object') return rec;
  if (rec.url && rec.data) return rec;
  const ft = rec.formType;
  if (ft && typeof ft === 'object' && (ft.url || ft.data)) {
    return { ...rec, url: ft.url, data: ft.data };
  }
  return rec;
}

/**
 * All queued submissions from IndexedDB and the localStorage fallback, merged.
 * Each record gets `storage` ('idb' | 'local') and, for fallback records, `id`
 * set to its localStorage key so deleteOfflineForm can find it.
 */
export async function getOfflineForms() {
  const fallback = lsFallback.keys(FORM_FALLBACK_PREFIX).flatMap(key => {
    const record = lsFallback.get(key);
    return record ? [normalizeForm({ ...record, id: key, storage: 'local' })] : [];
  });
  let primary = [];
  try {
    const db = await openDB();
    primary = ((await runTx(db, STORE_FORMS, 'readonly', store => store.getAll())) || [])
      .map(r => normalizeForm({ ...r, storage: 'idb' }));
  } catch { /* fallback only */ }

  const seen = new Set();
  const merged = [];
  for (const rec of [...primary, ...fallback]) {
    const ident = recordIdentity(rec);
    if (ident && seen.has(ident)) continue;
    if (ident) seen.add(ident);
    merged.push(rec);
  }
  return merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

/**
 * Who may upload a queued record from this session.
 *  'mine'    – saved by the signed-in account
 *  'legacy'  – saved before ownership tracking; needs explicit confirmation
 *  'other'   – saved by a different account; must not be uploaded here
 */
export function offlineFormOwnership(rec, ownerId = getCurrentOwnerId()) {
  if (!rec?.ownerId) return 'legacy';
  return ownerId && rec.ownerId === ownerId ? 'mine' : 'other';
}

/** Give a legacy record a client id and owner (only after the user confirmed). */
export async function claimLegacyOfflineForm(rec, ownerId = getCurrentOwnerId()) {
  if (!rec || rec.ownerId || !ownerId) return rec;
  const claimed = {
    ...rec,
    ownerId,
    clientSubmissionId: rec.clientSubmissionId || newClientId(),
    claimedAt: Date.now(),
  };
  delete claimed.storage;
  if (typeof rec.id === 'string' && rec.id.startsWith(FORM_FALLBACK_PREFIX)) {
    const { id, ...rest } = claimed;
    if (!lsFallback.set(rec.id, rest)) throw new Error('Could not update offline survey');
    return { ...claimed, storage: 'local' };
  }
  const db = await openDB();
  await runTx(db, STORE_FORMS, 'readwrite', store => store.put(claimed));
  return { ...claimed, storage: 'idb' };
}

/** Assign a client id to a record that lacks one, persisting it before first retry. */
export async function ensureClientSubmissionId(rec) {
  if (!rec || rec.clientSubmissionId) return rec;
  const updated = { ...rec, clientSubmissionId: newClientId() };
  delete updated.storage;
  if (typeof rec.id === 'string' && rec.id.startsWith(FORM_FALLBACK_PREFIX)) {
    const { id, ...rest } = updated;
    if (!lsFallback.set(rec.id, rest)) throw new Error('Could not update offline survey');
    return { ...updated, storage: 'local' };
  }
  const db = await openDB();
  await runTx(db, STORE_FORMS, 'readwrite', store => store.put(updated));
  return { ...updated, storage: 'idb' };
}

// Persist changed fields of a queued record in whichever store holds it.
async function updateOfflineForm(rec, changes) {
  const updated = { ...rec, ...changes };
  delete updated.storage;
  if (typeof rec.id === 'string' && rec.id.startsWith(FORM_FALLBACK_PREFIX)) {
    const { id, ...rest } = updated;
    if (!lsFallback.set(rec.id, rest)) throw new Error('Could not update offline survey');
    return { ...updated, storage: 'local' };
  }
  const db = await openDB();
  await runTx(db, STORE_FORMS, 'readwrite', store => store.put(updated));
  return { ...updated, storage: 'idb' };
}

/**
 * The server answered 409: this submission id was already used for DIFFERENT data.
 * Keep the record, stop automatic retries, and let the user decide (see resendAsNewSubmission).
 */
export async function markOfflineFormConflict(rec, message) {
  if (!rec) return rec;
  return updateOfflineForm(rec, { syncConflict: { at: Date.now(), message: message || 'Submission id already used for different data' } });
}

/** User-confirmed: send this record again as a brand-new submission (fresh id). */
export async function resendAsNewSubmission(rec) {
  if (!rec) return rec;
  const previous = [...(rec.previousSubmissionIds || []), rec.clientSubmissionId].filter(Boolean);
  return updateOfflineForm(rec, { clientSubmissionId: newClientId(), previousSubmissionIds: previous, syncConflict: null });
}

export async function deleteOfflineForm(id) {
  if (typeof id === 'string' && id.startsWith(FORM_FALLBACK_PREFIX)) return lsFallback.del(id);
  try {
    const db = await openDB();
    await runTx(db, STORE_FORMS, 'readwrite', store => store.delete(id));
    return true;
  } catch { return false; }
}

// alias used in some places
export const deleteForm = deleteOfflineForm;

export async function getPendingCount() {
  const forms = await getOfflineForms();
  return forms.filter(f => !f.synced).length;
}

// ── Form drafts (auto-save) ───────────────────────────────────────────────────

/** Stable draft key for one form type and account, so a draft is found again after reopening. */
export function stableDraftKey(formType, ownerId = getCurrentOwnerId()) {
  return `${formType}__${ownerId || 'anonymous'}`;
}

// Resolves true once the draft is durably stored; throws if neither store worked.
export async function saveFormDraft(formKey, formType, formData, coordinates = null) {
  const draft = {
    formKey,
    formType,
    formData,
    coordinates,
    ownerId: getCurrentOwnerId(),
    formSchemaVersion: formSchemaVersionFor(formType),
    lastModified: Date.now(),
    createdWithRelease: RELEASE_INFO.webBuildId,
    recordVersion: LOCAL_RECORD_VERSION,
  };
  try {
    const db = await openDB();
    await runTx(db, STORE_DRAFTS, 'readwrite', store => store.put(draft));
    // A newer copy now lives in IndexedDB; drop any stale fallback copy.
    lsFallback.del(`${DRAFT_FALLBACK_PREFIX}${formKey}`);
    return true;
  } catch {
    if (!lsFallback.set(`${DRAFT_FALLBACK_PREFIX}${formKey}`, draft)) {
      throw new Error('Could not store form draft');
    }
    return true;
  }
}

// Newest copy from either store.
export async function getFormDraft(formKey) {
  const fallback = lsFallback.get(`${DRAFT_FALLBACK_PREFIX}${formKey}`);
  let primary = null;
  try {
    const db = await openDB();
    primary = (await runTx(db, STORE_DRAFTS, 'readonly', store => store.get(formKey))) || null;
  } catch { /* fallback only */ }
  if (primary && fallback) return (fallback.lastModified || 0) > (primary.lastModified || 0) ? fallback : primary;
  return primary || fallback || null;
}

// Removes the draft from both stores.
export async function deleteFormDraft(formKey) {
  const lsOk = lsFallback.del(`${DRAFT_FALLBACK_PREFIX}${formKey}`);
  try {
    const db = await openDB();
    await runTx(db, STORE_DRAFTS, 'readwrite', store => store.delete(formKey));
    return true;
  } catch {
    return lsOk;
  }
}

// All drafts from both stores, newest copy per formKey.
export async function getAllFormDrafts() {
  const byKey = new Map();
  const keep = d => {
    if (!d?.formKey) return;
    const prev = byKey.get(d.formKey);
    if (!prev || (d.lastModified || 0) > (prev.lastModified || 0)) byKey.set(d.formKey, d);
  };
  try {
    const db = await openDB();
    ((await runTx(db, STORE_DRAFTS, 'readonly', store => store.getAll())) || []).forEach(keep);
  } catch { /* fallback only */ }
  lsFallback.keys(DRAFT_FALLBACK_PREFIX).forEach(k => keep(lsFallback.get(k)));
  return [...byKey.values()];
}

// Draft keys written by builds before stableDraftKey: `<formType>_<Date.now()>_<path>`.
// No screen can reach them any more, so they are only taking up storage.
const LEGACY_DRAFT_KEY = /^[a-z]+_\d{12,}_/;

/**
 * Deletes ONLY legacy random-key drafts older than maxAgeMs (the same 7-day rule
 * those builds applied). Drafts under the current stable keys are never removed
 * by age (plan §6) — they are deleted only on submit/queue or when the user
 * declines to restore.
 */
export async function cleanupOldDrafts(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  try {
    const cutoff = Date.now() - maxAgeMs;
    let deleted = 0;
    for (const d of await getAllFormDrafts()) {
      if (LEGACY_DRAFT_KEY.test(d.formKey) && (d.lastModified || 0) < cutoff) {
        await deleteFormDraft(d.formKey);
        deleted++;
      }
    }
    return deleted;
  } catch { return 0; }
}
