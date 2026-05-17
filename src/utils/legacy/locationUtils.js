/**
 * Location Utilities
 * Handles location capture and localStorage management for forms and app updates
 */

// Single location storage key for all app needs
const LOCATION_KEY = 'app_location';

// Legacy keys to clean up
const LEGACY_KEYS = [
  'lastKnownLocation',
  'app_last_location', 
  'app_update_location',
  'app_location_history'
];

/**
 * Clean up old localStorage keys
 */
const cleanupLegacyKeys = () => {
  try {
    LEGACY_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error cleaning up legacy location keys:', error);
  }
};

// Clean up legacy keys when this module is imported
cleanupLegacyKeys();

/**
 * Capture current location and store in localStorage
 * @param {Object} options - Location capture options
 * @returns {Promise<Object>} - Promise resolving to location data
 */
export const captureAndStoreLocation = async (options = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    purpose = 'form_submission'
  } = options;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const error = new Error('Geolocation not supported');
      reject(error);
      return;
    }

    const locationOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          purpose,
          online: navigator.onLine
        };

        // Store in localStorage
        try {
          localStorage.setItem(LOCATION_KEY, JSON.stringify(locationData));
          resolve(locationData);
        } catch (error) {
          console.error('Error storing location in localStorage:', error);
          // Still resolve with location data even if storage fails
          resolve(locationData);
        }
      },
      (error) => {
        console.error('Error capturing location:', error);
        reject(error);
      },
      locationOptions
    );
  });
};

/**
 * Get last captured location from localStorage
 * @returns {Object|null} - Last location data or null
 */
export const getLastLocation = () => {
  try {
    const stored = localStorage.getItem(LOCATION_KEY);
    if (stored) {
      const locationData = JSON.parse(stored);
      // Ensure we have valid coordinates
      if (locationData.latitude !== undefined && locationData.longitude !== undefined) {
        return locationData;
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading location from localStorage:', error);
    return null;
  }
};

/**
 * Clear location data from localStorage
 */
export const clearLocationData = () => {
  try {
    localStorage.removeItem(LOCATION_KEY);
  } catch (error) {
    console.error('Error clearing location data:', error);
  }
};

/**
 * Check if location data exists in localStorage
 * @returns {boolean} - True if location data exists
 */
export const hasLocationData = () => {
  return !!localStorage.getItem(LOCATION_KEY);
};

/**
 * Get location with fallback to cached location
 * @param {number} maxAge - Maximum age of cached location in milliseconds (default: 5 minutes)
 * @returns {Promise<Object>} - Promise resolving to location data with fallback
 */
export const getLocationWithFallback = async (maxAge = 300000) => {
  try {
    // Always try to get cached location first
    const cachedLocation = getLastLocation();
    if (cachedLocation && !cachedLocation.error) {
      const age = Date.now() - new Date(cachedLocation.timestamp).getTime();
      if (age < maxAge) {
        return {
          lat: cachedLocation.latitude,
          lng: cachedLocation.longitude,
          accuracy: cachedLocation.accuracy || 0,
          cached: true
        };
      }
    }

    // Try to capture fresh location
    const locationData = await captureAndStoreLocation({
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 60000
    });

    return {
      lat: locationData.latitude,
      lng: locationData.longitude,
      accuracy: locationData.accuracy || 0,
      cached: false
    };
  } catch (error) {
    
    // Try to get any cached location, even if old
    const cachedLocation = getLastLocation();
    if (cachedLocation && !cachedLocation.error && cachedLocation.latitude !== undefined && cachedLocation.longitude !== undefined) {
      return {
        lat: cachedLocation.latitude,
        lng: cachedLocation.longitude,
        accuracy: cachedLocation.accuracy || 0,
        cached: true,
        fallback: false
      };
    }
    
    // Final fallback to (0,0) coordinates
    return {
      lat: 0,
      lng: 0,
      accuracy: 0,
      cached: false,
      fallback: true,
      error: error.message
    };
  }
};

// Legacy support - these functions maintain compatibility with existing code
export const getUpdateLocation = getLastLocation;
export const getLocationHistory = () => []; // Simplified - no longer maintaining history

const locationUtils = {
  captureAndStoreLocation,
  getLastLocation,
  getLocationWithFallback,
  clearLocationData,
  hasLocationData
};

export default locationUtils; 