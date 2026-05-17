const DB_NAME = "SamAppDB_v2";
const DB_VERSION = 1;
const STORE_FORMS = "surveyForms";
const STORE_QUEUE = "syncQueue";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_FORMS)) {
        db.createObjectStore(STORE_FORMS, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function saveOfflineForm(formType, data) {
  const db = await openDB();
  const tx = db.transaction(STORE_FORMS, "readwrite");
  const store = tx.objectStore(STORE_FORMS);
  store.add({ formType, data, timestamp: Date.now(), synced: false });
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

export async function getOfflineForms() {
  const db = await openDB();
  const tx = db.transaction(STORE_FORMS, "readonly");
  const store = tx.objectStore(STORE_FORMS);
  return new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = rej;
  });
}

export async function deleteOfflineForm(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_FORMS, "readwrite");
  tx.objectStore(STORE_FORMS).delete(id);
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

export async function getPendingCount() {
  const forms = await getOfflineForms();
  return forms.filter((f) => !f.synced).length;
}

// Legacy stubs used by useFormAutoSave hook (no-ops — drafts are handled by the hook itself)
export const saveFormDraft = async () => false;
export const getFormDraft = async () => null;
export const deleteFormDraft = async () => true;
export const cleanupOldDrafts = async () => 0;
