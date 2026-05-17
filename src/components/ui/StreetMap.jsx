import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Alert, Typography, Button, Box } from '@mui/material';

// Fix for missing marker icons
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

const LocationMarker = ({ setCoordinates, setAddressDetails, onLocationCapture, onLocationError, disableManualSelection = false }) => {
    const [position, setPosition] = useState(null);
    const mapRef = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [locationAttempts, setLocationAttempts] = useState(0);
    const [isAddressFetching, setIsAddressFetching] = useState(false);
    const maxAttempts = 5;
    const locationTimeoutRef = useRef(null);
    const lastSuccessfulPosition = useRef(null);

    // Cache and rate limiting
    const addressCacheRef = useRef(new Map());
    const lastRequestTimeRef = useRef(0);
    const MIN_REQUEST_INTERVAL = 3000; // 3 seconds between requests
    const CACHE_DURATION = 300000; // 5 minutes cache
    const LOCATION_UPDATE_INTERVAL = 60000; // 1 minute between location updates

    const map = useMap();

    useEffect(() => {
        if (map) {
            mapRef.current = map;
            setIsMapReady(true);
        }
    }, [map]);

    const fetchAddress = async (latlng) => {
        const { lat, lng } = latlng;

        // Create cache key based on rounded coordinates (to avoid cache misses for tiny differences)
        const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

        // Create a fallback address based on coordinates
        const fallbackAddress = {
            display_name: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            address: {
                latitude: lat,
                longitude: lng,
                note: "Address lookup unavailable"
            }
        };

        // Check cache first
        const cached = addressCacheRef.current.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            setAddressDetails(cached.data);
            return;
        }

        // Check if we're already fetching an address
        if (isAddressFetching) {
            return;
        }

        // Rate limiting - prevent too frequent requests
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTimeRef.current;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            setAddressDetails(fallbackAddress);
            return;
        }

        try {
            setIsAddressFetching(true);
            lastRequestTimeRef.current = now;

            // Check if we're online first
            if (!navigator.onLine) {
                setAddressDetails(fallbackAddress);
                return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;


            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'IEG-Survey-App/1.0'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data && data.display_name) {
                const addressData = {
                    display_name: data.display_name,
                    address: data.address || {}
                };

                // Cache the successful result
                addressCacheRef.current.set(cacheKey, {
                    data: addressData,
                    timestamp: Date.now()
                });

                setAddressDetails(addressData);
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.warn('📍 Address fetch failed, using fallback:', error.message);

            // Use fallback address with more descriptive error info
            const enhancedFallback = {
                ...fallbackAddress,
                display_name: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)} (${error.name === 'AbortError' ? 'Timeout' : 'Lookup failed'})`,
                address: {
                    ...fallbackAddress.address,
                    error: error.name === 'AbortError' ? 'Request timeout' : error.message
                }
            };

            // Cache the fallback to prevent repeated failed requests
            addressCacheRef.current.set(cacheKey, {
                data: enhancedFallback,
                timestamp: Date.now()
            });

            setAddressDetails(enhancedFallback);
        } finally {
            setIsAddressFetching(false);
        }
    };

    const checkLocationPermission = async () => {
        if (!navigator.permissions) {
            return 'unknown'; // Permissions API not supported
        }

        try {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            return permission.state; // 'granted', 'denied', or 'prompt'
        } catch (error) {
            console.warn('Could not check location permission:', error);
            return 'unknown';
        }
    };

    const getLocation = async (isRetry = false) => {
        if (!navigator.geolocation) {
            console.error('❌ StreetMap: Geolocation not supported');
            if (onLocationError) {
                onLocationError(new Error('Geolocation not supported'));
            }
            return;
        }

        // Check permission status first
        const permissionStatus = await checkLocationPermission();

        if (permissionStatus === 'denied') {
            console.error('Location permission denied');
            if (onLocationError) {
                onLocationError(new Error('Location permission denied. Please enable location access in browser settings.'));
            }
            return;
        }

        // Progressive fallback options with more lenient settings
        const options = {
            enableHighAccuracy: false, // Start with low accuracy for better compatibility
            timeout: 30000, // Increased timeout to 30 seconds
            maximumAge: 600000 // Accept cached position up to 10 minutes old
        };

        // For retry attempts, try high accuracy
        if (isRetry && locationAttempts === 1) {
            options.enableHighAccuracy = true;
            options.timeout = 15000;
            options.maximumAge = 300000; // 5 minutes for high accuracy retry
        }

        // If we're offline, use last known position
        if (!navigator.onLine && lastSuccessfulPosition.current) {
            setPosition(lastSuccessfulPosition.current);
            setCoordinates(lastSuccessfulPosition.current);
            return;
        }


        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                const latlng = { lat: latitude, lng: longitude, accuracy };
                
                // Store successful position
                lastSuccessfulPosition.current = latlng;
                
                // Only update if position has changed significantly (more than 10 meters)
                if (!position || !position.lat || 
                    Math.abs(position.lat - latitude) > 0.0001 || 
                    Math.abs(position.lng - longitude) > 0.0001) {
                    
                    setPosition(latlng);
                    setCoordinates(latlng);
                    console.log('✅ StreetMap: Location updated:', latlng);

                    if (mapRef.current && isMapReady) {
                        try {
                            mapRef.current.setView(latlng, 15);
                        } catch (error) {
                            console.error('Error setting map view:', error);
                        }
                    }

                    fetchAddress(latlng);
                    
                    if (onLocationCapture) {
                        onLocationCapture(latlng);
                    }

                    // Reset attempts on success
                    setLocationAttempts(0);
                }
            },
            (error) => {
                console.error('Error getting geolocation:', error);

                // Provide detailed error information
                let errorMessage = 'Location unavailable';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location permissions.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable. Please check GPS/WiFi settings.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Retrying with different settings...';
                        break;
                    default:
                        errorMessage = `Location error: ${error.message}`;
                }

                console.log(`📍 Location error (${error.code}): ${errorMessage}`);

                // Progressive retry strategy with different approaches
                if (locationAttempts < maxAttempts) {
                    console.log(`🔄 StreetMap: Retry attempt ${locationAttempts + 1} of ${maxAttempts}...`);
                    setLocationAttempts(prev => prev + 1);

                    // Different retry delays based on error type
                    let retryDelay = 2000; // Default 2 seconds
                    if (error.code === error.TIMEOUT) {
                        retryDelay = 1000; // Quick retry for timeout
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        retryDelay = 5000; // Longer delay for unavailable
                    }

                    locationTimeoutRef.current = setTimeout(() => {
                        getLocation(true);
                    }, retryDelay);
                    return;
                }

                // Final fallback: Use a default location (India center) if all retries fail
                console.log('⚠️ StreetMap: All location attempts failed, using default location');
                const defaultLocation = { lat: 20.5937, lng: 78.9629 }; // Center of India

                if (lastSuccessfulPosition.current) {
                    console.log('⚠️ StreetMap: Using last known position as fallback');
                    setPosition(lastSuccessfulPosition.current);
                    setCoordinates(lastSuccessfulPosition.current);
                } else {
                    console.log('⚠️ StreetMap: Using default India location as final fallback');
                    setPosition(defaultLocation);
                    setCoordinates(defaultLocation);
                }

                if (onLocationError) {
                    onLocationError(new Error(errorMessage));
                }
            },
            options
        );
    };

    useEffect(() => {
        if (isMapReady) {
            getLocation();

            // Set up periodic updates with a more reasonable interval
            const locationInterval = setInterval(() => {
                // Only update if we haven't exceeded max attempts
                if (locationAttempts < maxAttempts) {
                    getLocation();
                }
            }, LOCATION_UPDATE_INTERVAL);

            return () => {
                clearInterval(locationInterval);
                if (locationTimeoutRef.current) {
                    clearTimeout(locationTimeoutRef.current);
                }
            };
        }
    }, [isMapReady]);

    // Add map click event handler only if manual selection is enabled
    useMapEvents({
        click: (e) => {
            if (disableManualSelection) {
                console.log('📍 Map click disabled - location is auto-fetched only');
                return;
            }

            const { lat, lng } = e.latlng;
            const latlng = { lat, lng };
            setPosition(latlng);
            setCoordinates(latlng);
            
            // Reset location attempts on manual selection
            setLocationAttempts(0);

            const timeSinceLastRequest = Date.now() - lastRequestTimeRef.current;
            if (!isAddressFetching && timeSinceLastRequest >= MIN_REQUEST_INTERVAL) {
                fetchAddress(latlng);
            } else {
                console.log('📍 Map click - using coordinates only (rate limited)');
                if (setAddressDetails) {
                    setAddressDetails({
                        display_name: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)} (Manual)`,
                        address: {
                            latitude: lat,
                            longitude: lng,
                            note: "Manual selection"
                        }
                    });
                }
            }
        }
    });

    return position === null ? null : (
        <Marker position={position} />
    );
};

const MapComponent = ({ setCoordinates, setAddressDetails, showLocationStatus = false, disableManualSelection = false }) => {
    const [mapError, setMapError] = useState(null);
    const [locationStatus, setLocationStatus] = useState('loading');
    const [locationError, setLocationError] = useState(null);
    const [lastKnownLocation, setLastKnownLocation] = useState(null);
    const [isMobile] = useState(window.innerWidth <= 768);

    const handleLocationCapture = (location) => {
        setLocationStatus('success');
        setLocationError(null);
        setLastKnownLocation(location);
    };

    const handleLocationError = (error) => {
        setLocationStatus('error');
        
        // Simplified error messages for mobile
        if (error.code === 1) { // PERMISSION_DENIED
            setLocationError({
                ...error,
                message: 'Location access denied'
            });
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
            setLocationError({
                ...error,
                message: 'Unable to find location'
            });
        } else if (error.code === 3) { // TIMEOUT
            setLocationError({
                ...error,
                message: 'Location request timed out'
            });
        }
    };

    const retryLocation = () => {
        setLocationStatus('loading');
        setLocationError(null);
        window.location.reload();
    };

    const openLocationSettings = () => {
        if (navigator.userAgent.match(/Android/i)) {
            window.location.href = 'intent://settings/location#Intent;scheme=android-app;end';
        } else if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            window.location.href = 'App-Prefs:root=Privacy&path=LOCATION';
        } else {
            alert('Please enable location services in your device settings and refresh the page.');
        }
    };

    if (mapError) {
        return (
            <div style={{ 
                height: isMobile ? '200px' : '400px', 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '4px'
            }}>
                <Box textAlign="center">
                    <Typography variant="body2" color="error" gutterBottom>
                        Error loading map
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => window.location.reload()}>
                        Refresh
                    </Button>
                </Box>
            </div>
        );
    }

    const defaultCenter = [20.5937, 78.9629];

    return (
        <div style={{ 
            height: isMobile ? '200px' : '400px', 
            width: '100%', 
            position: 'relative', 
            zIndex: 1 
        }}>
            {(showLocationStatus || locationStatus === 'error') && (
                <Box sx={{ 
                    mb: isMobile ? 1 : 2,
                    '& .MuiAlert-root': {
                        py: isMobile ? 0.5 : 1,
                        px: isMobile ? 1 : 2,
                        '& .MuiAlert-message': {
                            py: 0
                        }
                    }
                }}>
                    {locationStatus === 'loading' && (
                        <Alert 
                            severity="info"
                            sx={{ 
                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                alignItems: 'center'
                            }}
                        >
                            📍 Capturing location...
                        </Alert>
                    )}
                    {locationStatus === 'error' && (
                        <Alert 
                            severity="error"
                            sx={{
                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                '& .MuiAlert-action': {
                                    pt: 0,
                                    pb: isMobile ? 0 : 0.5,
                                    pl: 1
                                }
                            }}
                            action={
                                <Box sx={{ 
                                    display: 'flex', 
                                    gap: 1,
                                    flexDirection: isMobile ? 'column' : 'row',
                                    '& .MuiButton-root': {
                                        py: 0.5,
                                        px: 1,
                                        minWidth: 'auto',
                                        fontSize: '0.75rem'
                                    }
                                }}>
                                    <Button 
                                        color="error"
                                        size="small" 
                                        variant="outlined"
                                        onClick={openLocationSettings}
                                    >
                                        Enable Location
                                    </Button>
                                    <Button 
                                        color="error"
                                        size="small"
                                        variant="outlined"
                                        onClick={retryLocation}
                                    >
                                        Retry
                                    </Button>
                                </Box>
                            }
                        >
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                gap: 0.5
                            }}>
                                <Typography 
                                    component="div" 
                                    variant="caption" 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        color: 'error.main'
                                    }}
                                >
                                    Location Required
                                </Typography>
                                <Typography 
                                    component="div" 
                                    variant="caption"
                                >
                                    {locationError?.message || 'Unable to access location'}
                                </Typography>
                                {isMobile && (
                                    <Typography 
                                        component="div" 
                                        variant="caption" 
                                        sx={{ 
                                            color: 'text.secondary',
                                            fontSize: '0.7rem'
                                        }}
                                    >
                                        Please enable location access in settings
                                    </Typography>
                                )}
                            </Box>
                        </Alert>
                    )}
                </Box>
            )}

            <MapContainer
                center={defaultCenter}
                zoom={5}
                style={{
                    height: '100%',
                    width: '100%',
                    zIndex: 1,
                    cursor: disableManualSelection ? 'default' : 'crosshair'
                }}
                whenCreated={(map) => {
                    L.control.zoom({
                        position: 'topright'
                    }).addTo(map);
                }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker
                    setCoordinates={setCoordinates}
                    setAddressDetails={setAddressDetails}
                    onLocationCapture={handleLocationCapture}
                    onLocationError={handleLocationError}
                    disableManualSelection={disableManualSelection}
                />
            </MapContainer>
        </div>
    );
};

export default MapComponent;


// use example:
// import MapComponent from 'components/ui/StreetMap';
// <MapComponent
//   setCoordinates={setCoordinates}
//   setAddressDetails={(details) => {
//     setAddressDetails(details.display_name)
//   }}
//   disableManualSelection={true} // Set to true to disable manual location selection
// />