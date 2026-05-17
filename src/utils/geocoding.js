/**
 * Utility functions for geocoding and reverse geocoding
 * Provides robust error handling and fallbacks for location services
 */

const GEOCODING_SERVICES = {
    BIGDATACLOUD: 'bigdatacloud',
    NOMINATIM: 'nominatim',
    GEOCODE_EARTH: 'geocode.earth'
};

// API configuration
const API_CONFIG = {
    [GEOCODING_SERVICES.BIGDATACLOUD]: {
        url: 'https://api.bigdatacloud.net/data/reverse-geocode-client',
        params: (lat, lng) => `?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        rateLimit: 2000, // 2 seconds between requests
        parseResponse: (data) => ({
            display_name: [
                data.locality,
                data.city,
                data.principalSubdivision,
                data.countryName
            ].filter(Boolean).join(', '),
            address: {
                city: data.city,
                state: data.principalSubdivision,
                country: data.countryName,
                latitude: data.latitude,
                longitude: data.longitude,
                locality: data.locality
            }
        })
    },
    [GEOCODING_SERVICES.NOMINATIM]: {
        url: 'https://nominatim.openstreetmap.org/reverse',
        params: (lat, lng) => `?format=jsonv2&lat=${lat}&lon=${lng}`,
        rateLimit: 1000, // 1 second between requests
        parseResponse: (data) => ({
            display_name: data.display_name,
            address: {
                ...data.address,
                latitude: lat,
                longitude: lng
            }
        })
    },
    [GEOCODING_SERVICES.GEOCODE_EARTH]: {
        url: 'https://api.geocode.earth/v1/reverse',
        params: (lat, lng) => `?api_key=${process.env.REACT_APP_GEOCODE_EARTH_API_KEY}&point.lat=${lat}&point.lon=${lng}`,
        rateLimit: 250, // 250ms between requests
        parseResponse: (data) => ({
            display_name: data.features[0].properties.label,
            address: {
                ...data.features[0].properties,
                latitude: lat,
                longitude: lng
            }
        })
    }
};

// Cache management
const geocodeCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const lastRequestTimes = new Map();

/**
 * Cleans up expired cache entries
 */
const cleanCache = () => {
    const now = Date.now();
    for (const [key, value] of geocodeCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            geocodeCache.delete(key);
        }
    }
};

/**
 * Checks if we should respect rate limiting for a service
 * @param {string} service - The geocoding service
 * @returns {boolean} - Whether we should wait before making another request
 */
const shouldRespectRateLimit = (service) => {
    const lastRequest = lastRequestTimes.get(service) || 0;
    const now = Date.now();
    return (now - lastRequest) < API_CONFIG[service].rateLimit;
};

/**
 * Updates the last request time for a service
 * @param {string} service - The geocoding service
 */
const updateLastRequestTime = (service) => {
    lastRequestTimes.set(service, Date.now());
};

/**
 * Creates a cache key from coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Cache key
 */
const createCacheKey = (lat, lng) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

/**
 * Fetches address data from a specific geocoding service
 * @param {string} service - The geocoding service to use
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Address data
 */
const fetchFromService = async (service, lat, lng) => {
    const config = API_CONFIG[service];
    const url = `${config.url}${config.params(lat, lng)}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'IEG-Survey-App/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return config.parseResponse(data);
    } catch (error) {
        console.warn(`📍 ${service} geocoding failed:`, error);
        throw error;
    }
};

/**
 * Performs reverse geocoding with multiple services and fallbacks
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Address information
 */
export const reverseGeocode = async (lat, lng) => {
    // Validate coordinates
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid coordinates');
    }

    // Check cache first
    const cacheKey = createCacheKey(lat, lng);
    const cached = geocodeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('📍 Using cached address');
        return cached.data;
    }

    // Clean up old cache entries periodically
    cleanCache();

    // Create fallback address
    const fallbackAddress = {
        display_name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        address: {
            latitude: lat,
            longitude: lng,
            note: 'Coordinates only'
        }
    };

    // Try each service in sequence
    const services = [
        GEOCODING_SERVICES.BIGDATACLOUD,
        GEOCODING_SERVICES.NOMINATIM,
        GEOCODING_SERVICES.GEOCODE_EARTH
    ];

    for (const service of services) {
        if (shouldRespectRateLimit(service)) {
            console.log(`📍 Rate limit active for ${service}, skipping...`);
            continue;
        }

        try {
            console.log(`📍 Trying ${service}...`);
            updateLastRequestTime(service);
            const result = await fetchFromService(service, lat, lng);

            // Cache successful result
            geocodeCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            console.warn(`📍 ${service} failed, trying next service...`);
        }
    }

    // All services failed, use fallback
    console.warn('📍 All geocoding services failed, using fallback');
    return fallbackAddress;
};

/**
 * Gets a simple address string for form submission
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string>} Address string
 */
export const getAddressString = async (lat, lng) => {
    try {
        const result = await reverseGeocode(lat, lng);
        return result.display_name;
    } catch (error) {
        console.warn('📍 Failed to get address string:', error.message);
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
};

/**
 * Checks if geocoding service is available
 * @returns {Promise<boolean>} True if service is available
 */
export const isGeocodingAvailable = async () => {
  try {
    if (!navigator.onLine) {
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Test with a simple request to check service availability
    const response = await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=0&lon=0', {
      signal: controller.signal,
      method: 'HEAD'
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 404; // 404 is OK, means service is up but no result
  } catch (error) {
    console.warn('📍 Geocoding service check failed:', error.message);
    return false;
  }
};

/**
 * Rate-limited reverse geocoding with caching
 * Useful for batch operations
 */
class GeocodingCache {
  constructor(maxCacheSize = 100, cacheTimeout = 300000) { // 5 minutes default
    this.cache = new Map();
    this.maxCacheSize = maxCacheSize;
    this.cacheTimeout = cacheTimeout;
    this.lastRequest = 0;
    this.minInterval = 1000; // 1 second between requests
  }

  getCacheKey(lat, lng) {
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
  }

  async reverseGeocode(lat, lng, options = {}) {
    const cacheKey = this.getCacheKey(lat, lng);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📍 Using cached address for:', cacheKey);
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
    }

    this.lastRequest = Date.now();

    // Fetch new data
    const result = await reverseGeocode(lat, lng, options);

    // Cache the result
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    // Clean up cache if it gets too large
    if (this.cache.size > this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    return result;
  }

  clearCache() {
    this.cache.clear();
  }
}

// Export a default instance
export const geocodingCache = new GeocodingCache();

export default {
  reverseGeocode,
  getAddressString,
  isGeocodingAvailable,
  geocodingCache
};
