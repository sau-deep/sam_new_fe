// indexedDBService.js

const DB_NAME = 'SamFE';
const DB_VERSION = 2;
const STORE_NAME = 'offlineForms';

// Check if IndexedDB is supported and available
const isIndexedDBAvailable = () => {
  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch (e) {
    console.warn('IndexedDB not available:', e);
    return false;
  }
};

// Local storage fallback
const localStorageFallback = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('LocalStorage set error:', e);
      return false;
    }
  },
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('LocalStorage get error:', e);
      return null;
    }
  }
};

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      console.warn('IndexedDB not available, using localStorage fallback');
      reject(new Error('IndexedDB not available'));
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.error('IndexedDB blocked. Please close other tabs with this site open');
        reject(new Error('IndexedDB blocked'));
      };
    } catch (e) {
      console.error('Error opening IndexedDB:', e);
      reject(e);
    }
  });
};

// Modified saveOfflineForm with fallback
export const saveOfflineForm = async (formData) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Helper function to handle array fields with other option
    const processArrayWithOther = (array, otherValue) => {
      if (!Array.isArray(array)) return array || '';
      const values = [...array];
      if (otherValue && values.includes('Other')) {
        // Remove 'Other' from the array and add it with its value
        values.splice(values.indexOf('Other'), 1);
        values.push(`Other - ${otherValue}`);
      }
      return values.join(',');
    };

    // Convert arrays to comma-separated strings in the form data
    const processedFormData = {
      ...formData,
      // Convert array fields to strings with other options
      reasonStoppedFeedingw: processArrayWithOther(formData.reasonStoppedFeedingw, formData.reasonStoppedFeedingw_other),
      medicineConsumed: processArrayWithOther(formData.medicineConsumed, formData.medicineConsumed_other),
      reasonAdmitted: processArrayWithOther(formData.reasonAdmitted, formData.reasonAdmitted_other),
      otherThanMilkGiven: processArrayWithOther(formData.otherThanMilkGiven, formData.otherThanMilkGiven_other),
      otherThanMilkGivenReason: processArrayWithOther(formData.otherThanMilkGivenReason, formData.otherThanMilkGivenReason_other),
      awwDiscussion: processArrayWithOther(formData.awwDiscussion, formData.awwDiscussion_other),
      awwCounsel: processArrayWithOther(formData.awwCounsel, formData.awwCounsel_other),
      ashaInform: processArrayWithOther(formData.ashaInform, formData.ashaInform_other),
      ashaUsedtoInform: processArrayWithOther(formData.ashaUsedtoInform, formData.ashaUsedtoInform_other)
    };

    // Use put instead of add to update existing entries
    await store.put(processedFormData);
    await transaction.complete;
    return true;
  } catch (error) {
    console.warn('IndexedDB save failed, using localStorage fallback:', error);
    const key = `offline_form_${Date.now()}`;
    return localStorageFallback.set(key, formData);
  }
};

// Modified getOfflineForms with fallback
export const getOfflineForms = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const forms = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return forms;
  } catch (error) {
    console.warn('IndexedDB get failed, using localStorage fallback:', error);
    const forms = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('offline_form_')) {
        const form = await localStorageFallback.get(key);
        if (form) forms.push(form);
      }
    }
    return forms;
  }
};

export const deleteForm = async (id) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.delete(id);
    await transaction.complete;
    return true;
  } catch (error) {
    console.warn('IndexedDB delete failed:', error);
    return false;
  }
};

// Dummy functions for backward compatibility - auto-save disabled
export const saveFormDraft = async () => false;
export const getFormDraft = async () => null;
export const deleteFormDraft = async () => true;
export const getAllFormDrafts = async () => [];
export const cleanupOldDrafts = async () => 0;
