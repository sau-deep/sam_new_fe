import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import styles from './StatusBox.module.css';

// Network Status Component
const NetworkStatus = ({ isOnline }) => {
  const getNetworkIcon = () => {
    if (isOnline) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M1 9L12 2L23 9V20C23 20.5304 22.7893 21.0391 22.4142 21.4142C22.0391 21.7893 21.5304 22 21 22H3C2.46957 22 1.96086 21.7893 1.58579 21.4142C1.21071 21.0391 1 20.5304 1 20V9Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M9 22V12H15V22" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M6 12H18" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      );
    } else {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M1 9L12 2L23 9V20C23 20.5304 22.7893 21.0391 22.4142 21.4142C22.0391 21.7893 21.5304 22 21 22H3C2.46957 22 1.96086 21.7893 1.58579 21.4142C1.21071 21.0391 1 20.5304 1 20V9Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M9 22V12H15V22" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M6 12H18" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M18 6L6 18" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      );
    }
  };

  return (
    <Tooltip title={`Network: ${isOnline ? 'Online' : 'Offline'}`} arrow>
      <Box className={`${styles.statusIcon} ${isOnline ? styles.online : styles.offline}`}>
        {getNetworkIcon()}
      </Box>
    </Tooltip>
  );
};

// Location Status Component
const LocationStatus = ({ locationStatus, isOnline }) => {
  const getLocationStatus = () => {
    // Check if we have valid coordinates from the hook
    const hasValidCoordinates = locationStatus.coordinates && 
                               locationStatus.coordinates.lat !== null && 
                               locationStatus.coordinates.lng !== null &&
                               !isNaN(locationStatus.coordinates.lat) &&
                               !isNaN(locationStatus.coordinates.lng) &&
                               locationStatus.coordinates.lat !== 0 &&
                               locationStatus.coordinates.lng !== 0;

    // Check localStorage for cached location (using correct key)
    let hasCachedLocation = false;
    try {
      const cachedLocation = localStorage.getItem('app_location');
      if (cachedLocation) {
        const locationData = JSON.parse(cachedLocation);
        const age = Date.now() - new Date(locationData.timestamp).getTime();
        // Consider cached if less than 10 minutes old
        hasCachedLocation = age < 600000 && locationData.latitude && locationData.longitude;
      }
    } catch (error) {
      console.warn('Error checking cached location:', error);
    }

    if (hasValidCoordinates) {
      return { status: 'available', color: '#27ae60', icon: 'location-on' };
    } else if (hasCachedLocation && locationStatus.permission !== 'denied') {
      return { status: 'available', color: '#27ae60', icon: 'location-on' };
    } else if (locationStatus.permission === 'checking' || locationStatus.permission === 'prompt') {
      return { status: 'checking', color: '#f39c12', icon: 'location-checking' };
    } else if (locationStatus.permission === 'denied') {
      return { status: 'denied', color: '#e74c3c', icon: 'location-off' };
    } else {
      return { status: 'unavailable', color: '#e74c3c', icon: 'location-off' };
    }
  };

  const locationState = getLocationStatus();

  const getLocationIcon = () => {
    switch (locationState.icon) {
      case 'location-on':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M21 10C21 17 12 23 12 23S3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.3639 3.63604C20.0518 5.32387 21 7.61305 21 10Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <circle 
              cx="12" 
              cy="10" 
              r="3" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'location-checking':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M21 10C21 17 12 23 12 23S3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.3639 3.63604C20.0518 5.32387 21 7.61305 21 10Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <circle 
              cx="12" 
              cy="10" 
              r="3" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M12 6V10L14 12" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'location-off':
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M21 10C21 17 12 23 12 23S3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.3639 3.63604C20.0518 5.32387 21 7.61305 21 10Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M18 6L6 18" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        );
    }
  };

  const getLocationTooltip = () => {
    if (locationState.status === 'available') {
      let coords = locationStatus.coordinates;
      
      // If no coordinates from hook, try cached location
      if (!coords) {
        try {
          const cachedLocation = localStorage.getItem('app_location');
          if (cachedLocation) {
            const locationData = JSON.parse(cachedLocation);
            coords = {
              lat: locationData.latitude,
              lng: locationData.longitude
            };
          }
        } catch (error) {
          console.warn('Error reading cached location for tooltip:', error);
        }
      }
      
      if (coords) {
        return `Location: Available (${coords.lat?.toFixed(4)}, ${coords.lng?.toFixed(4)})`;
      } else {
        return 'Location: Available';
      }
    } else if (locationState.status === 'checking') {
      return 'Location: Checking access...';
    } else if (locationState.status === 'denied') {
      return 'Location: Access denied - Please enable location permissions';
    } else {
      return `Location: Unavailable${locationStatus.error ? ' - ' + locationStatus.error : ''}`;
    }
  };

  const handleLocationClick = () => {
    if (locationStatus.retryLocation && (locationState.status === 'checking' || locationState.status === 'unavailable' || locationState.status === 'denied')) {
      locationStatus.retryLocation();
    }
  };

  return (
    <Tooltip title={getLocationTooltip() + (locationState.status !== 'available' ? ' (Click to retry)' : '')} arrow>
      <Box 
        className={`${styles.statusIcon} ${styles.location}`}
        style={{ '--status-color': locationState.color, cursor: locationState.status !== 'available' ? 'pointer' : 'default' }}
        onClick={handleLocationClick}
      >
        {getLocationIcon()}
      </Box>
    </Tooltip>
  );
};

// Main Status Box Component
const StatusBox = ({ isOnline, locationStatus }) => {
  return (
    <Box className={styles.statusBox}>
      <Typography variant="caption" className={styles.statusLabel}>
        Status
      </Typography>
      <Box className={styles.statusIcons}>
        {!isOnline ? (
          <Tooltip title="Offline Mode" arrow>
            <Box className={`${styles.statusIcon} ${styles.offlineMode}`}>
              <Typography className={styles.offlineText}>Offline mode</Typography>
            </Box>
          </Tooltip>
        ) : (
          <>
            <NetworkStatus isOnline={isOnline} />
            <LocationStatus locationStatus={locationStatus} isOnline={isOnline} />
          </>
        )}
      </Box>
    </Box>
  );
};

export default StatusBox;
