import { useState, useEffect, useRef } from 'react';

const useLocationStatus = () => {
  const [locationStatus, setLocationStatus] = useState({
    permission: 'checking', // 'granted', 'denied', 'prompt', 'checking'
    coordinates: null,
    error: null,
    isAvailable: false
  });

  const isRequestingLocation = useRef(false);
  const lastLocationUpdate = useRef(0);
  const locationIntervalRef = useRef(null);
  const permissionChangeTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  // Minimum time between location requests (2 minutes)
  const MIN_LOCATION_INTERVAL = 120000;

  const getCachedLocation = () => {
    try {
      const cached = localStorage.getItem('app_location');
      if (cached) {
        const locationData = JSON.parse(cached);
        // Return any cached location, regardless of age for fallback purposes
        if (locationData.latitude !== undefined && locationData.longitude !== undefined) {
          return {
            lat: locationData.latitude,
            lng: locationData.longitude,
            accuracy: locationData.accuracy || 0
          };
        }
      }
    } catch (error) {
      console.warn('📍 Location: Error reading cached location:', error);
    }
    return null;
  };

  const getCurrentLocation = () => {
    if (isRequestingLocation.current) {
      return;
    }

    isRequestingLocation.current = true;
    
    // Set checking state
    setLocationStatus(prev => ({
      ...prev,
      permission: 'checking'
    }));
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) {
          isRequestingLocation.current = false;
          return;
        }
        
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        
        // Cache the location
        try {
          const locationData = {
            latitude: coords.lat,
            longitude: coords.lng,
            accuracy: coords.accuracy,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('app_location', JSON.stringify(locationData));
        } catch (error) {
          console.warn('📍 Location: Error caching location:', error);
        }
        
        setLocationStatus({
          permission: 'granted',
          coordinates: coords,
          error: null,
          isAvailable: true
        });
        
        lastLocationUpdate.current = Date.now();
        isRequestingLocation.current = false;
      },
      (error) => {
        if (!mountedRef.current) {
          isRequestingLocation.current = false;
          return;
        }
        
        console.warn('📍 Location: Error getting position:', error.message);
        
        let errorMessage = 'Location unavailable';
        let permission = 'denied';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied';
            permission = 'denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            permission = 'granted'; // Permission granted but GPS unavailable
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            permission = 'granted'; // Permission granted but request timed out
            break;
          default:
            errorMessage = 'Unknown location error';
            break;
        }
        
        // Check if we have cached location as fallback
        const cachedLocation = getCachedLocation();
        
        // If no cached location, provide fallback coordinates
        const fallbackCoordinates = cachedLocation || { lat: 0, lng: 0, accuracy: 0 };
        
        setLocationStatus({
          permission,
          coordinates: fallbackCoordinates,
          error: errorMessage,
          isAvailable: true // Always available with fallback
        });
        
        isRequestingLocation.current = false;
      },
      {
        enableHighAccuracy: false, // Start with lower accuracy for better reliability
        timeout: 10000, // Reduced timeout to 10 seconds
        maximumAge: 300000 // Accept cached position up to 5 minutes old
      }
    );
  };

  useEffect(() => {
    mountedRef.current = true;

    const checkLocationStatus = async () => {
      if (!mountedRef.current) return;

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        // Even if geolocation is not supported, provide fallback coordinates
        const cachedLocation = getCachedLocation();
        const fallbackCoordinates = cachedLocation || { lat: 0, lng: 0, accuracy: 0 };
        
        setLocationStatus({
          permission: 'denied',
          coordinates: fallbackCoordinates,
          error: 'Geolocation not supported',
          isAvailable: true // Still available with fallback
        });
        return;
      }

      // Check for cached location first, or use fallback
      const cachedLocation = getCachedLocation();
      const initialCoordinates = cachedLocation || { lat: 0, lng: 0, accuracy: 0 };
      
      setLocationStatus({
        permission: cachedLocation ? 'granted' : 'checking',
        coordinates: initialCoordinates,
        error: null,
        isAvailable: true
      });
      
      if (cachedLocation) {
      } else {
      }

      try {
        // Check permissions API if available
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          
          
          if (permission.state === 'denied') {
            setLocationStatus(prev => ({
              ...prev,
              permission: 'denied',
              error: 'Location access denied',
              isAvailable: false
            }));
            return;
          }
          
          if (permission.state === 'granted') {
            // Only get fresh location if no cached location or it's old
            const now = Date.now();
            if (!cachedLocation || now - lastLocationUpdate.current > MIN_LOCATION_INTERVAL) {
              getCurrentLocation();
            }
          } else {
            // Permission is 'prompt' - try to get location
            getCurrentLocation();
          }
          
          // Listen for permission changes with debouncing
          permission.addEventListener('change', () => {
            
            // Clear previous timeout
            if (permissionChangeTimeoutRef.current) {
              clearTimeout(permissionChangeTimeoutRef.current);
            }
            
            // Debounce permission changes
            permissionChangeTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                checkLocationStatus();
              }
            }, 1000);
          });
        } else {
          // Fallback if permissions API not available
          getCurrentLocation();
        }
      } catch (error) {
        console.warn('📍 Location: Error checking permissions:', error);
        getCurrentLocation();
      }
    };

    checkLocationStatus();
    
    // Set up less frequent periodic location checking (every 5 minutes)
    locationIntervalRef.current = setInterval(() => {
      if (mountedRef.current && !isRequestingLocation.current) {
        const now = Date.now();
        if (now - lastLocationUpdate.current > MIN_LOCATION_INTERVAL) {
          // Only retry if we don't have a valid location and permission isn't denied
          const currentStatus = locationStatus.permission;
          if (currentStatus !== 'denied' && !locationStatus.coordinates) {
            getCurrentLocation();
          }
        }
      }
    }, 300000); // Check every 5 minutes

    return () => {
      mountedRef.current = false;
      isRequestingLocation.current = false;
      
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      
      if (permissionChangeTimeoutRef.current) {
        clearTimeout(permissionChangeTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - getCurrentLocation and locationStatus are stable refs/functions

  // Log status changes
  useEffect(() => {
  }, [locationStatus]);

  // Manual retry function
  const retryLocation = () => {
    if (!isRequestingLocation.current && mountedRef.current) {
      lastLocationUpdate.current = 0; // Reset to force fresh request
      
      // Reset status to checking
      setLocationStatus(prev => ({
        ...prev,
        permission: 'checking',
        error: null
      }));
      
      // Try to get location after a short delay
      setTimeout(() => {
        if (mountedRef.current) {
          getCurrentLocation();
        }
      }, 500);
    }
  };

  return { ...locationStatus, retryLocation };
};

export default useLocationStatus; 