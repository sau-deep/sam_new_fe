/**
 * Utility functions for managing routine monitoring form preferences
 * Stores form data persistently using IndexedDB with localStorage fallback
 */

const PREFERENCES_STORE_NAME = 'routineMonitoringPreferences';
const PREFERENCES_KEY = 'userPreferences';

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

/**
 * Initialize IndexedDB for preferences storage
 */
const initPreferencesDB = () => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('RoutineMonitoringPreferences', 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(PREFERENCES_STORE_NAME)) {
          db.createObjectStore(PREFERENCES_STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };
    } catch (e) {
      console.error('Error opening IndexedDB:', e);
      reject(e);
    }
  });
};

/**
 * Save routine monitoring form preferences
 * @param {Object} preferences - The form preferences to save
 * @returns {Promise<boolean>} - Success status
 */
export const saveRoutineMonitoringPreferences = async (preferences) => {
  try {
    // Filter only the fields we want to persist
    const fieldsToSave = [
      'state',
      'district', 
      'block',
      'icdsProject',
      'sector',
      'village',
      'awc',
      'fieldMonitorName'
    ];

    const filteredPreferences = {};
    fieldsToSave.forEach(field => {
      if (preferences[field] && preferences[field].trim() !== '') {
        filteredPreferences[field] = preferences[field];
      }
    });

    // Add timestamp
    filteredPreferences.lastUpdated = new Date().toISOString();

    // Try IndexedDB first
    try {
      const db = await initPreferencesDB();
      const transaction = db.transaction(PREFERENCES_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PREFERENCES_STORE_NAME);
      
      await store.put({
        id: PREFERENCES_KEY,
        ...filteredPreferences
      });
      
      await transaction.complete;
      console.log('✅ Routine monitoring preferences saved to IndexedDB');
      return true;
    } catch (indexedDBError) {
      console.warn('IndexedDB save failed, using localStorage fallback:', indexedDBError);
      return localStorageFallback.set('routineMonitoringPreferences', filteredPreferences);
    }
  } catch (error) {
    console.error('Error saving routine monitoring preferences:', error);
    return false;
  }
};

/**
 * Load routine monitoring form preferences
 * @returns {Promise<Object>} - The saved preferences or empty object
 */
export const loadRoutineMonitoringPreferences = async () => {
  try {
    // Try IndexedDB first
    try {
      const db = await initPreferencesDB();
      const transaction = db.transaction(PREFERENCES_STORE_NAME, 'readonly');
      const store = transaction.objectStore(PREFERENCES_STORE_NAME);
      
      const request = store.get(PREFERENCES_KEY);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            // Remove the id field and return the preferences
            const { id, ...preferences } = result;
            console.log('✅ Routine monitoring preferences loaded from IndexedDB');
            resolve(preferences);
          } else {
            resolve({});
          }
        };
        
        request.onerror = () => {
          console.warn('IndexedDB load failed, trying localStorage fallback');
          const fallbackData = localStorageFallback.get('routineMonitoringPreferences');
          resolve(fallbackData || {});
        };
      });
    } catch (indexedDBError) {
      console.warn('IndexedDB load failed, using localStorage fallback:', indexedDBError);
      const fallbackData = localStorageFallback.get('routineMonitoringPreferences');
      return fallbackData || {};
    }
  } catch (error) {
    console.error('Error loading routine monitoring preferences:', error);
    return {};
  }
};

/**
 * Clear routine monitoring form preferences
 * @returns {Promise<boolean>} - Success status
 */
export const clearRoutineMonitoringPreferences = async () => {
  try {
    // Try IndexedDB first
    try {
      const db = await initPreferencesDB();
      const transaction = db.transaction(PREFERENCES_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PREFERENCES_STORE_NAME);
      
      await store.delete(PREFERENCES_KEY);
      await transaction.complete;
      console.log('✅ Routine monitoring preferences cleared from IndexedDB');
    } catch (indexedDBError) {
      console.warn('IndexedDB clear failed, using localStorage fallback:', indexedDBError);
    }
    
    // Also clear from localStorage as fallback
    localStorage.removeItem('routineMonitoringPreferences');
    return true;
  } catch (error) {
    console.error('Error clearing routine monitoring preferences:', error);
    return false;
  }
};

/**
 * Get today's date in the format expected by the form
 * @returns {string} - Today's date in YYYY-MM-DD format
 */
export const getTodaysDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
