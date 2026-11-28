// The ONE place that uploads queued offline surveys (audit A08).
//
// Manual "Upload all", the 5-minute timer, the upload after connectivity returns
// and the single-record "Submit now" all go through this coordinator:
//  * Replay is serialized: one record at a time, one run at a time per tab (and
//    across tabs when the browser supports Web Locks).
//  * Every record is CLAIMED before it is sent: an in-memory lock plus a claim
//    token persisted in localStorage with an expiry, so two tabs or two timers
//    can never send the same record at the same time. A claim left behind by a
//    closed tab simply expires.
//  * Only the signed-in account's records are uploaded automatically. Legacy
//    (unowned) records need the user's explicit confirmation; another account's
//    records are never uploaded from this session.
//  * Results are read with the shared API contract (utils/apiResult):
//      success          → delete exactly that record
//      409              → parked as a conflict (user decides "Send as new")
//      validation (400) → parked with the server's reason, not retried blindly
//      anything else    → left queued and retried later (transient)
//  * Every upload carries the record's clientSubmissionId, so the server returns
//    the original result for a retry of an already-saved submission.
import apiService from '../../services/api';
import { LEGACY_FORM_SCHEMA_VERSION } from '../../constants/releaseInfo';
import { isApiSuccess, isValidationFailure, apiErrorMessage, apiFieldErrors } from '../../utils/apiResult';
import { isSurveyorUser, syncAfterSubmission } from '../../utils/dailySurveyCount';
import {
  getOfflineForms,
  findOfflineForm,
  sameOfflineId,
  offlineFormOwnership,
  claimLegacyOfflineForm,
  ensureClientSubmissionId,
  markOfflineFormConflict,
  resendAsNewSubmission,
  markOfflineFormRejected,
  clearOfflineFormRejection,
  recordOfflineFormAttempt,
  deleteOfflineSubmission,
  newClientId,
} from '../../utils/indexDB';

export const REPLAY = Object.freeze({
  UPLOADED: 'uploaded', // server confirmed; record deleted
  GONE: 'gone',         // record no longer queued (uploaded elsewhere)
  BUSY: 'busy',         // another tab/timer holds the claim right now
  SKIPPED: 'skipped',   // not eligible here (other account, legacy, parked)
  CONFLICT: 'conflict', // 409: id already used for different data
  REJECTED: 'rejected', // validation failure: parked for correction
  FAILED: 'failed',     // transient failure: stays queued, retried later
  AUTH: 'auth',         // session expired / not allowed: stop the run
  REMOVED: 'removed',   // parked record removed from the device by the user
});

// Map a stored form url to the daily-count form type so an offline upload
// refreshes the local counter the same way an online submit does.
const URL_TO_FORM_TYPE = {
  '/form/routine': 'routine',
  '/form/household': 'household',
  '/form/biannual': 'concurrent',
  '/form/followup': 'followup',
};

export const CLAIM_PREFIX = 'samv2_claim_';
// A replay POST times out well before its claim expires, so an expired claim
// always belongs to a tab or task that is gone (closed, crashed, killed by Android,
// or stuck in a WebView that never answers).
export const REPLAY_TIMEOUT_MS = 3 * 60 * 1000;
export const CLAIM_TTL_MS = REPLAY_TIMEOUT_MS + 2 * 60 * 1000;

// Every step of a replay is bounded so one stuck step can never block the
// queue: a record upload (claim, storage, POST, delete) gives up after recordMs,
// listing the queue after listMs, and waiting for another tab's Web Lock after
// lockWaitMs (then it runs anyway; the per-record claims still prevent double sends).
const settings = {
  settleMs: () => 40 + Math.floor(Math.random() * 80),
  claimTtlMs: CLAIM_TTL_MS,
  recordMs: REPLAY_TIMEOUT_MS + 60 * 1000,
  listMs: 30 * 1000,
  lockWaitMs: 15 * 1000,
};

// In-memory claims: record id → expiry. They expire like the persisted ones, so a
// task that never settled cannot keep a record "busy" for the rest of the session.
const memoryClaims = new Map();

/** Test hook: make claim settling deterministic. */
export function _setClaimSettleMs(ms) {
  settings.settleMs = typeof ms === 'function' ? ms : () => ms;
}

/** Test hook: shorten the replay timeouts ({ claimTtlMs, recordMs, listMs, lockWaitMs }). */
export function _setReplayTimeouts(overrides = {}) {
  Object.assign(settings, overrides);
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Settle with the promise, or reject after ms if it has not settled. */
function withTimeout(promise, ms, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(`${what} timed out`), { code: 'SAM_REPLAY_TIMEOUT' })), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

function readClaim(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const claimKeyFor = id => `${CLAIM_PREFIX}${String(id)}`;

/**
 * Claim one queued record for sending. Resolves a claim handle, or null when
 * someone else (this tab or another) holds it. The persisted token is written,
 * then re-read after a short settle delay: if another tab wrote in between, the
 * last writer wins and everyone else backs off.
 */
export async function claimOfflineRecord(rec, now = Date.now) {
  if (!rec || rec.id == null) return null;
  const id = String(rec.id);
  if ((memoryClaims.get(id)?.expiresAt || 0) > now()) return null;
  const token = newClientId();
  memoryClaims.set(id, { token, expiresAt: now() + settings.claimTtlMs });
  const dropMemoryClaim = () => {
    if (memoryClaims.get(id)?.token === token) memoryClaims.delete(id);
  };

  const key = claimKeyFor(id);
  const existing = readClaim(key);
  if (existing && existing.token && existing.expiresAt > now()) {
    dropMemoryClaim();
    return null;
  }
  let persisted = false;
  try {
    localStorage.setItem(key, JSON.stringify({ token, expiresAt: now() + settings.claimTtlMs }));
    persisted = true;
  } catch {
    // localStorage full/unavailable: fall back to the in-memory lock only. The
    // server still de-duplicates by clientSubmissionId.
  }
  if (persisted) {
    const settle = settings.settleMs();
    if (settle > 0) await wait(settle);
    if (readClaim(key)?.token !== token) {
      dropMemoryClaim();
      return null;
    }
  }
  return { id, key, token, persisted };
}

/** Release a claim taken by claimOfflineRecord (only removes our own tokens). */
export function releaseOfflineClaim(claim) {
  if (!claim) return;
  // A task that timed out may finish after a newer claim was taken: leave that one alone.
  if (memoryClaims.get(claim.id)?.token === claim.token) memoryClaims.delete(claim.id);
  if (!claim.persisted) return;
  try {
    if (readClaim(claim.key)?.token === claim.token) localStorage.removeItem(claim.key);
  } catch { /* expires on its own */ }
}

const defaultPost = record =>
  apiService.post(record.url, record.data, {
    // Sent as query parameters, not headers: a custom header would need a CORS
    // allow-list change on every backend first. Older backends ignore them.
    params: {
      clientSubmissionId: record.clientSubmissionId,
      // The schema the record was SAVED with, even if this build uses a newer one.
      formSchemaVersion: record.formSchemaVersion ?? LEGACY_FORM_SCHEMA_VERSION,
    },
    timeout: REPLAY_TIMEOUT_MS,
  });

function statusOf(x, thrown) {
  if (thrown) return x?.response?.status ?? null;
  return null;
}

function bodyCode(x, thrown) {
  const body = thrown ? x?.response?.data : x;
  const code = Number(body?.statusCode);
  return Number.isFinite(code) && code !== 0 ? code : null;
}

async function bestEffort(fn) {
  try { return await fn(); } catch (err) { console.error('Offline queue update failed:', err); return null; }
}

// Decide what a failed upload means and persist the outcome on the record.
async function classifyFailure(record, x, thrown) {
  const http = statusOf(x, thrown);
  const code = bodyCode(x, thrown);
  const message = apiErrorMessage(x, thrown && !x?.response ? 'No connection to the server.' : undefined);

  if (http === 401 || http === 403 || code === 401 || code === 403) {
    return { status: REPLAY.AUTH, record, message };
  }
  if (http === 409 || code === 409) {
    const parked = await markOfflineFormConflict(record, message);
    return { status: REPLAY.CONFLICT, record: parked, message };
  }
  if (isValidationFailure(x)) {
    const parked = await markOfflineFormRejected(record, {
      message,
      fieldErrors: apiFieldErrors(x),
      statusCode: code ?? http,
    });
    return { status: REPLAY.REJECTED, record: parked, message };
  }
  // Transient: connectivity, timeouts, 5xx, 429 (first copy still being saved).
  const updated = await bestEffort(() => recordOfflineFormAttempt(record, message));
  return { status: REPLAY.FAILED, record: updated || record, message };
}

/**
 * Upload one queued record now (not serialized — use replayOfflineRecord).
 * options: allowLegacy (user confirmed an unowned record), resendAsNew (user
 * confirmed a 409 record goes as a new submission), retryRejected (user asked to
 * try a parked record again), post (test hook).
 */
async function uploadRecordNow(recordId, { allowLegacy = false, resendAsNew = false, retryRejected = false, post = defaultPost } = {}) {
  const eligible = rec => {
    const ownership = offlineFormOwnership(rec);
    if (ownership === 'other') return 'other';
    if (ownership === 'legacy' && !allowLegacy) return 'legacy';
    if (rec.syncConflict && !resendAsNew) return 'conflict';
    if (rec.syncRejected && !retryRejected) return 'rejected';
    return null;
  };

  let record = await findOfflineForm(recordId);
  if (!record) return { status: REPLAY.GONE };
  const blocked = eligible(record);
  if (blocked) return { status: REPLAY.SKIPPED, reason: blocked, record };

  const claim = await claimOfflineRecord(record);
  if (!claim) return { status: REPLAY.BUSY, record };
  try {
    // Re-read under the claim: another tab may have uploaded or parked it meanwhile.
    record = await findOfflineForm(recordId);
    if (!record) return { status: REPLAY.GONE };
    const blockedNow = eligible(record);
    if (blockedNow) return { status: REPLAY.SKIPPED, reason: blockedNow, record };

    if (offlineFormOwnership(record) === 'legacy') record = await claimLegacyOfflineForm(record);
    // The server already holds DIFFERENT data under this id: only the user can
    // choose to send it as a new submission.
    if (record.syncConflict) record = await resendAsNewSubmission(record);
    if (record.syncRejected) record = await clearOfflineFormRejection(record);
    // Persist a stable id before the first send so every retry reuses it.
    record = await ensureClientSubmissionId(record);

    let body;
    try {
      body = await post(record);
    } catch (err) {
      return await classifyFailure(record, err, true);
    }
    if (!isApiSuccess(body)) return await classifyFailure(record, body, false);

    if (!(await deleteOfflineSubmission(record))) {
      // The server has it; a later retry of the same clientSubmissionId returns
      // the original result and removes it then.
      throw new Error('Uploaded, but the survey could not be removed from this device\'s queue.');
    }
    const formType = URL_TO_FORM_TYPE[record.url];
    if (formType && isSurveyorUser()) {
      syncAfterSubmission(apiService, formType).catch(err => {
        console.error('Error syncing daily count after offline upload:', err);
      });
    }
    return { status: REPLAY.UPLOADED, record };
  } finally {
    releaseOfflineClaim(claim);
  }
}

// ── Serialization ────────────────────────────────────────────────────────────

let chain = Promise.resolve();
let activeRuns = 0;
let pendingAutoRun = null;
const LOCK_NAME = 'sam-offline-replay';

// Web Locks serialize replay across tabs where available. If the lock cannot be
// taken (unsupported/insecure context) or another tab holds it for longer than
// lockWaitMs (e.g. a frozen background tab), run anyway: the per-record claims
// still prevent double sends.
function withCrossTabLock(task) {
  let locks = null;
  try { locks = typeof navigator !== 'undefined' ? navigator.locks : null; } catch { locks = null; }
  if (!locks || typeof locks.request !== 'function') return Promise.resolve().then(task);
  return new Promise((resolve, reject) => {
    let started = false;
    let timer = null;
    const start = () => {
      if (started) return null;
      started = true;
      clearTimeout(timer);
      const run = Promise.resolve().then(task);
      run.then(resolve, reject);
      return run;
    };
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    timer = setTimeout(() => {
      try { controller?.abort(); } catch { /* ignore */ }
      start();
    }, settings.lockWaitMs);
    let request;
    try {
      request = controller
        ? locks.request(LOCK_NAME, { signal: controller.signal }, () => start())
        : locks.request(LOCK_NAME, () => start());
    } catch {
      start();
      return;
    }
    Promise.resolve(request).catch(() => start());
  });
}

// Run tasks one after another. Every task is bounded (see settings), so the chain
// always moves on even if a step hangs.
function serialize(task) {
  activeRuns++;
  const run = chain.then(() => withCrossTabLock(task));
  chain = run.catch(() => {}).finally(() => { activeRuns--; });
  return run;
}

/** True while a replay run is in progress or waiting in this tab. */
export function isReplayActive() {
  return activeRuns > 0;
}

/** Upload one record (serialized with every other replay). */
export function replayOfflineRecord(recordId, options = {}) {
  return serialize(() => withTimeout(uploadRecordNow(recordId, options), settings.recordMs, 'Upload'));
}

/**
 * Upload every eligible record of the signed-in account, one at a time.
 * automatic=true (timer / reconnect) coalesces with a run that is already
 * waiting, so repeated triggers never stack up.
 * Resolves a summary: { uploaded, failed, conflicts, rejected, busy, skipped,
 * needsAttention, authFailed, total, errors }.
 */
export function replayOfflineQueue({ automatic = false, post } = {}) {
  if (automatic && pendingAutoRun) return pendingAutoRun;
  const run = serialize(async () => {
    if (automatic && pendingAutoRun === run) pendingAutoRun = null;
    const all = await withTimeout(getOfflineForms(), settings.listMs, 'Reading the offline queue');
    const mine = all.filter(r => offlineFormOwnership(r) === 'mine');
    const summary = {
      total: 0, uploaded: 0, failed: 0, conflicts: 0, rejected: 0, busy: 0, skipped: 0,
      needsAttention: mine.filter(r => r.syncConflict || r.syncRejected).length,
      authFailed: false,
      errors: [],
    };
    const todo = mine.filter(r => !r.syncConflict && !r.syncRejected);
    summary.total = todo.length;
    for (const rec of todo) {
      let res;
      try {
        // A hung upload gives up here; its claim keeps the record "busy" until it
        // expires, so it is not sent again while the first attempt may still land.
        res = await withTimeout(uploadRecordNow(rec.id, { post }), settings.recordMs, 'Upload');
      } catch (err) {
        res = { status: REPLAY.FAILED, message: err?.message };
      }
      switch (res.status) {
        case REPLAY.UPLOADED: summary.uploaded++; break;
        case REPLAY.GONE: break; // already uploaded by another tab
        case REPLAY.CONFLICT: summary.conflicts++; summary.needsAttention++; break;
        case REPLAY.REJECTED: summary.rejected++; summary.needsAttention++; break;
        case REPLAY.BUSY: summary.busy++; break;
        case REPLAY.SKIPPED: summary.skipped++; break;
        case REPLAY.AUTH: summary.authFailed = true; break;
        default:
          summary.failed++;
          if (res.message) summary.errors.push(res.message);
      }
      if (res.status === REPLAY.AUTH) break;
    }
    return summary;
  });
  if (automatic) {
    pendingAutoRun = run;
    // However the run ends, the next automatic trigger starts a fresh one.
    run.catch(() => {}).finally(() => { if (pendingAutoRun === run) pendingAutoRun = null; });
  }
  return run;
}

// ── Parked records: keep a copy, then (only on request) remove ───────────────

const FORM_LABELS = {
  '/form/routine': 'Routine Monitoring',
  '/form/household': 'Household Checklist',
  '/form/biannual': 'Concurrent Assessment',
  '/form/followup': 'Follow-up Assessment',
};
const FORM_FILE_KEYS = {
  '/form/routine': 'routine-monitoring',
  '/form/household': 'household',
  '/form/biannual': 'concurrent',
  '/form/followup': 'followup',
};

const localDate = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** A readable, self-describing copy of a queued record (answers exactly as queued). */
export function offlineRecordCopy(record, exportedAt = new Date()) {
  const problem = record?.syncRejected || record?.syncConflict || null;
  return {
    about: 'Copy of a survey saved on this device that has not been accepted by the server. '
      + 'It contains the answers exactly as they were queued. Keep this file.',
    form: FORM_LABELS[record?.url] || record?.url || null,
    url: record?.url || null,
    clientSubmissionId: record?.clientSubmissionId || null,
    savedBy: record?.ownerId || null,
    savedAt: record?.timestamp ? new Date(record.timestamp).toISOString() : null,
    copiedAt: exportedAt.toISOString(),
    formSchemaVersion: record?.formSchemaVersion ?? null,
    appBuild: record?.createdWithRelease || null,
    serverProblem: problem
      ? {
        kind: record.syncRejected ? 'rejected' : 'conflict',
        message: problem.message || null,
        fieldErrors: problem.fieldErrors || {},
        at: problem.at ? new Date(problem.at).toISOString() : null,
      }
      : null,
    request: record?.data ?? null,
  };
}

/** Pretty-printed JSON text of offlineRecordCopy. */
export function offlineRecordCopyText(record) {
  return JSON.stringify(offlineRecordCopy(record), null, 2);
}

/** File name for a copy: form type, the date it was saved, and its submission id. */
export function offlineRecordCopyFilename(record) {
  const type = FORM_FILE_KEYS[record?.url] || 'survey';
  const date = localDate(record?.timestamp || Date.now());
  const id = String(record?.clientSubmissionId || record?.id || 'unknown').replace(/[^A-Za-z0-9-]/g, '_');
  return `SAM_${type}_${date}_${id}.json`;
}

/**
 * User-confirmed: remove a PARKED record (rejected or conflict) of the signed-in
 * account from this device. Never called automatically; the UI offers a copy first.
 */
export function discardOfflineRecord(recordId) {
  return serialize(() => withTimeout((async () => {
    const record = await findOfflineForm(recordId);
    if (!record) return { status: REPLAY.GONE };
    if (offlineFormOwnership(record) !== 'mine') return { status: REPLAY.SKIPPED, reason: 'not-mine', record };
    if (!record.syncRejected && !record.syncConflict) return { status: REPLAY.SKIPPED, reason: 'not-parked', record };
    const claim = await claimOfflineRecord(record);
    if (!claim) return { status: REPLAY.BUSY, record };
    try {
      if (!(await deleteOfflineSubmission(record))) {
        throw new Error('The survey could not be removed from this device.');
      }
      return { status: REPLAY.REMOVED, record };
    } finally {
      releaseOfflineClaim(claim);
    }
  })(), settings.recordMs, 'Removing the survey'));
}

export { sameOfflineId };
