import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Chip
} from '@mui/material';
import { ExpandMore, LocationOn, History, Update } from '@mui/icons-material';
import { 
  getLastLocation, 
  getUpdateLocation, 
  getLocationHistory, 
  hasLocationData,
  clearLocationData,
  cleanupErrorData
} from 'utils/locationUtils';

const LocationDebugger = () => {
  const [locationData, setLocationData] = useState({
    lastLocation: null,
    updateLocation: null,
    history: [],
    hasData: { lastLocation: false, updateLocation: false, history: false }
  });

  const refreshData = () => {
    const lastLocation = getLastLocation();
    const updateLocation = getUpdateLocation();
    const history = getLocationHistory();
    const hasData = hasLocationData();

    setLocationData({
      lastLocation,
      updateLocation,
      history,
      hasData
    });
  };

  useEffect(() => {
    // Clean up any existing error data first
    cleanupErrorData();
    refreshData();
  }, []);

  const formatLocation = (location) => {
    if (!location) return 'No data';
    
    if (location.error) {
      return (
        <Box>
          <Typography variant="body2" color="error">
            Error: {location.error} (Code: {location.code})
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {new Date(location.timestamp).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
            ⚠️ This is old error data. New captures will only store valid coordinates.
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="body2">
          <strong>Latitude:</strong> {location.latitude}
        </Typography>
        <Typography variant="body2">
          <strong>Longitude:</strong> {location.longitude}
        </Typography>
        {location.accuracy && (
          <Typography variant="body2">
            <strong>Accuracy:</strong> {location.accuracy}m
          </Typography>
        )}
        <Typography variant="body2">
          <strong>Purpose:</strong> {location.purpose}
        </Typography>
        <Typography variant="body2">
          <strong>Online:</strong> {location.online ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {new Date(location.timestamp).toLocaleString()}
        </Typography>
      </Box>
    );
  };

  const handleClearData = (type) => {
    clearLocationData(type);
    refreshData();
  };

  if (!locationData.hasData.lastLocation && !locationData.hasData.updateLocation && !locationData.hasData.history) {
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Location Data Debugger
          </Typography>
          <Typography variant="body2" color="textSecondary">
            No location data found in localStorage.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Location Data Debugger
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={refreshData}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button 
            variant="outlined" 
            color="warning" 
            size="small" 
            onClick={() => {
              cleanupErrorData();
              refreshData();
            }}
            sx={{ mr: 1 }}
          >
            Clean Errors
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            size="small" 
            onClick={() => handleClearData('all')}
          >
            Clear All
          </Button>
        </Box>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOn color="primary" />
              <Typography variant="subtitle1">Last Captured Location</Typography>
              {locationData.hasData.lastLocation && (
                <Chip label="Available" size="small" color="success" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {locationData.lastLocation ? (
              <Box>
                {formatLocation(locationData.lastLocation)}
                <Button 
                  size="small" 
                  color="error" 
                  onClick={() => handleClearData('last')}
                  sx={{ mt: 1 }}
                >
                  Clear
                </Button>
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No last location data available.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Update color="primary" />
              <Typography variant="subtitle1">Update Check Location</Typography>
              {locationData.hasData.updateLocation && (
                <Chip label="Available" size="small" color="success" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {locationData.updateLocation ? (
              <Box>
                {formatLocation(locationData.updateLocation)}
                <Button 
                  size="small" 
                  color="error" 
                  onClick={() => handleClearData('update')}
                  sx={{ mt: 1 }}
                >
                  Clear
                </Button>
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No update location data available.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History color="primary" />
              <Typography variant="subtitle1">Location History</Typography>
              {locationData.hasData.history && (
                <Chip label={`${locationData.history.length} entries`} size="small" color="info" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {locationData.history.length > 0 ? (
              <Box>
                <Typography variant="body2" gutterBottom>
                  Last {locationData.history.length} location captures:
                </Typography>
                {locationData.history.map((entry, index) => (
                  <Box key={index} sx={{ mb: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="caption" color="textSecondary">
                      Entry {index + 1}
                    </Typography>
                    {formatLocation(entry)}
                  </Box>
                ))}
                <Button 
                  size="small" 
                  color="error" 
                  onClick={() => handleClearData('history')}
                  sx={{ mt: 1 }}
                >
                  Clear History
                </Button>
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No location history available.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default LocationDebugger; 