/**
 * Utility functions for managing daily survey counts in localStorage
 * Tracks survey submissions by date for each surveyor
 */

const STORAGE_KEY_PREFIX = 'dailySurveyCounts_'; // Prefix for form-specific storage keys

// Map form types to backend form names
const FORM_TYPE_MAPPING = {
  'household': 'Household Checklist',
  'concurrent': 'Concurrent Assessment',
  'followup': 'Followup Assessment',
  'routine': 'Routine Monitoring Common Checklist'
};

// Get storage key for a specific form type
const getStorageKey = (formType) => {
  return `${STORAGE_KEY_PREFIX}${formType}`;
};

// Legacy key for backward compatibility with routine monitoring
const LEGACY_STORAGE_KEY = 'routineMonitoringDailyCounts';

/**
 * Get all daily counts for the current user for a specific form type
 * @param {string} formType - Form type: 'household', 'concurrent', 'followup', 'routine'
 * @returns {Object} Object with date strings as keys and counts as values (e.g., { '2025-01-15': 3 })
 */
export const getDailyCounts = (formType = 'routine') => {
  try {
    const username = localStorage.getItem('iegUsername');
    if (!username) return {};

    const storageKey = getStorageKey(formType);
    const allData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    // For backward compatibility, also check legacy key for routine
    if (formType === 'routine') {
      const legacyData = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '{}');
      if (legacyData[username] && Object.keys(allData[username] || {}).length === 0) {
        return legacyData[username] || {};
      }
    }
    
    return allData[username] || {};
  } catch (error) {
    console.error('Error reading daily counts from localStorage:', error);
    return {};
  }
};

/**
 * Get count for a specific date
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {string} formType - Form type: 'household', 'concurrent', 'followup', 'routine'
 * @returns {number} Count for that date
 */
export const getCountForDate = (dateString, formType = 'routine') => {
  const dailyCounts = getDailyCounts(formType);
  return dailyCounts[dateString] || 0;
};

/**
 * Get count for today
 * @param {string} formType - Form type: 'household', 'concurrent', 'followup', 'routine'
 * @returns {number} Today's count
 */
export const getTodayCount = (formType = 'routine') => {
  const today = new Date().toISOString().split('T')[0];
  return getCountForDate(today, formType);
};

/**
 * Increment count for a specific date (or today if no date provided)
 * @param {string} dateString - Optional date string in YYYY-MM-DD format. Defaults to today.
 * @param {string} formType - Form type: 'household', 'concurrent', 'followup', 'routine'
 */
export const incrementDailyCount = (dateString = null, formType = 'routine') => {
  try {
    const username = localStorage.getItem('iegUsername');
    if (!username) {
      console.warn('No username found in localStorage, cannot save daily count');
      return;
    }

    const targetDate = dateString || new Date().toISOString().split('T')[0];
    const storageKey = getStorageKey(formType);
    
    // Get existing data
    const allData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    // Initialize user data if it doesn't exist
    if (!allData[username]) {
      allData[username] = {};
    }

    // Increment count for the date
    if (!allData[username][targetDate]) {
      allData[username][targetDate] = 0;
    }
    allData[username][targetDate] += 1;

    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(allData));
    
    console.log(`✅ Incremented daily count for ${username} on ${targetDate} for ${formType}. New count: ${allData[username][targetDate]}`);
  } catch (error) {
    console.error('Error incrementing daily count:', error);
  }
};

/**
 * Get total count across all dates for current user
 * @param {string} formType - Form type: 'household', 'concurrent', 'followup', 'routine'
 * @returns {number} Total count
 */
export const getTotalCount = (formType = 'routine') => {
  const dailyCounts = getDailyCounts(formType);
  return Object.values(dailyCounts).reduce((sum, count) => sum + count, 0);
};

/**
 * Check if current user is a surveyor
 * @returns {boolean}
 */
export const isSurveyorUser = () => {
  try {
    const userRoles = localStorage.getItem("iegUserRoles");
    if (userRoles) {
      const roles = JSON.parse(userRoles);
      return roles.some(role => role.authority === "ROLE_SURVEYOR");
    }
    return false;
  } catch (e) {
    return false;
  }
};

/**
 * Get all dates with counts (sorted by date)
 * @param {string} formType - Form type: 'household', 'concurrent', 'followup', 'routine'
 * @returns {Array} Array of objects with date and count: [{ date: '2025-01-15', count: 3 }, ...]
 */
export const getDatesWithCounts = (formType = 'routine') => {
  const dailyCounts = getDailyCounts(formType);
  return Object.entries(dailyCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * Fetch daily counts from API and sync with localStorage
 * @param {Function} apiService - API service function to make the request
 * @param {string} formType - Form type: 'household', 'concurrent', 'followup', 'routine'
 * @returns {Promise<Object>} Daily counts object
 */
export const fetchAndSyncDailyCounts = async (apiService, formType = 'routine') => {
  try {
    const response = await apiService.get('/survey/daily-submissions-count');
    
    if (response && response.success && response.data) {
      const formCounts = response.data.formCounts || {};
      const backendFormName = FORM_TYPE_MAPPING[formType] || FORM_TYPE_MAPPING['routine'];
      const formCount = formCounts[backendFormName] || 0;
      const today = new Date().toISOString().split('T')[0];
      
      // Get username
      const username = localStorage.getItem('iegUsername');
      if (!username) {
        console.warn('No username found, cannot sync daily counts');
        return {};
      }

      const storageKey = getStorageKey(formType);
      // Get existing data
      const allData = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (!allData[username]) {
        allData[username] = {};
      }

      // Update today's count from API (this is the source of truth)
      allData[username][today] = formCount;

      // Save back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(allData));
      
      console.log(`✅ Synced daily count from API for ${username} on ${today} for ${formType}. Count: ${formCount}`);
      
      return allData[username];
    }
    
    return {};
  } catch (error) {
    console.error('Error fetching daily counts from API:', error);
    return {};
  }
};

/**
 * Check if localStorage has data, if not or if count is 0, fetch from API
 * @param {Function} apiService - API service function
 * @param {string} formType - Form type: 'household', 'concurrent', 'followup', 'routine'
 * @returns {Promise<Object>} Daily counts object
 */
export const getDailyCountsWithFallback = async (apiService, formType = 'routine') => {
  const dailyCounts = getDailyCounts(formType);
  const today = new Date().toISOString().split('T')[0];
  const todayCount = dailyCounts[today] || 0;
  const hasAnyData = Object.keys(dailyCounts).length > 0;

  // If no data in localStorage or today's count is 0, fetch from API
  if (!hasAnyData || todayCount === 0) {
    console.log(`📡 Fetching daily counts from API for ${formType} (localStorage empty or count is 0)`);
    const syncedCounts = await fetchAndSyncDailyCounts(apiService, formType);
    return syncedCounts;
  }

  // Return existing localStorage data
  return dailyCounts;
};

/**
 * Update localStorage with data from API after form submission
 * This ensures the count is synced with the backend
 * @param {Function} apiService - API service function
 * @param {string} formType - Form type: 'household', 'concurrent', 'followup', 'routine'
 */
export const syncAfterSubmission = async (apiService, formType = 'routine') => {
  try {
    await fetchAndSyncDailyCounts(apiService, formType);
  } catch (error) {
    console.error('Error syncing after submission:', error);
  }
};

/**
 * Fetch daily counts for a date range from API
 * @param {Function} apiService - API service function
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} formType - Form type: 'household', 'concurrent', 'followup', 'routine'
 * @returns {Promise<Object>} Daily counts object with date strings as keys
 */
export const fetchDailyCountsByDateRange = async (apiService, startDate, endDate, formType = 'routine') => {
  try {
    const backendFormName = FORM_TYPE_MAPPING[formType] || FORM_TYPE_MAPPING['routine'];
    const response = await apiService.get('/survey/daily-submissions-count-by-range', {
      params: {
        startDate,
        endDate,
        formType: backendFormName
      }
    });
    
    if (response && response.success && response.data) {
      const dailyCounts = response.data.dailyCounts || {};
      
      // Get username
      const username = localStorage.getItem('iegUsername');
      if (!username) {
        console.warn('No username found, cannot sync daily counts');
        return dailyCounts;
      }

      // Merge with existing localStorage data
      const storageKey = getStorageKey(formType);
      const allData = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (!allData[username]) {
        allData[username] = {};
      }

      // Update counts from API (this is the source of truth for historical data)
      Object.entries(dailyCounts).forEach(([date, count]) => {
        allData[username][date] = count;
      });

      // Save back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(allData));
      
      console.log(`✅ Fetched daily counts from API for date range ${startDate} to ${endDate} for ${formType}`);
      
      return allData[username];
    }
    
    return {};
  } catch (error) {
    console.error('Error fetching daily counts by date range from API:', error);
    return {};
  }
};

