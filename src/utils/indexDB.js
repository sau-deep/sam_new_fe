const DB_NAME = 'SamAppDB_v2';
const DB_VERSION = 2;
const STORE_FORMS = 'surveyForms';
const STORE_DRAFTS = 'formDrafts';

const isIDBAvailable = () => {
  try { return 'indexedDB' in window && window.indexedDB !== null; }
  catch { return false; }
};

const lsFallback = {
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  get: (k) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  del: (k) => { try { localStorage.removeItem(k); return true; } catch { return false; } },
  keys: () => { try { return Object.keys(localStorage).filter(k => k.startsWith('samv2_')); } catch { return []; } },
};

function openDB() {
  return new Promise((resolve, reject) => {
    if (!isIDBAvailable()) { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
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

// ── Offline form submissions ──────────────────────────────────────────────────

export async function saveOfflineForm(formType, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FORMS, 'readwrite');
      tx.objectStore(STORE_FORMS).add({ formType, data, timestamp: Date.now(), synced: false });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return lsFallback.set(`samv2_form_${Date.now()}`, { formType, data });
  }
}

export async function getOfflineForms() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FORMS, 'readonly');
      const req = tx.objectStore(STORE_FORMS).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return lsFallback.keys()
      .filter(k => k.startsWith('samv2_form_'))
      .map(k => lsFallback.get(k))
      .filter(Boolean);
  }
}

export async function deleteOfflineForm(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FORMS, 'readwrite');
      tx.objectStore(STORE_FORMS).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch { return false; }
}

// alias used in some places
export const deleteForm = deleteOfflineForm;

export async function getPendingCount() {
  const forms = await getOfflineForms();
  return forms.filter(f => !f.synced).length;
}

// ── Form drafts (auto-save) ───────────────────────────────────────────────────

export async function saveFormDraft(formKey, formType, formData, coordinates = null) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, 'readwrite');
      tx.objectStore(STORE_DRAFTS).put({ formKey, formType, formData, coordinates, lastModified: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return lsFallback.set(`samv2_draft_${formKey}`, { formKey, formType, formData, coordinates, lastModified: Date.now() });
  }
}

export async function getFormDraft(formKey) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, 'readonly');
      const req = tx.objectStore(STORE_DRAFTS).get(formKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return lsFallback.get(`samv2_draft_${formKey}`);
  }
}

export async function deleteFormDraft(formKey) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, 'readwrite');
      tx.objectStore(STORE_DRAFTS).delete(formKey);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return lsFallback.del(`samv2_draft_${formKey}`);
  }
}

export async function getAllFormDrafts() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, 'readonly');
      const req = tx.objectStore(STORE_DRAFTS).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

export async function cleanupOldDrafts(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  try {
    const drafts = await getAllFormDrafts();
    const cutoff = Date.now() - maxAgeMs;
    let deleted = 0;
    for (const d of drafts) {
      if (d.lastModified < cutoff) { await deleteFormDraft(d.formKey); deleted++; }
    }
    return deleted;
  } catch { return 0; }
}
