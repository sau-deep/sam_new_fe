import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./survey.module.css";
import * as Yup from "yup";
import {
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid,
  Box,
  Typography,
  Container,
  IconButton,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";

import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import { ArrowBack, ArrowForward, Check } from "@mui/icons-material";
import { Formik, Form, Field, useFormikContext } from "formik";
import { useTranslation } from "react-i18next";

// Components
import Loader from "components/ui/Loader";
import SnackBar from "components/ui/SnackBar";
import MapComponent from 'components/ui/StreetMap';
import ConsentDialog from '../../components/ui/ConsentDialog';
import ErrorReportingDialog from '../../components/ui/ErrorReportingDialog';

// Hooks
import { useFormTranslation } from '../../hooks/useFormTranslation';
import useNetworkStatus from 'utils/networkState';
import { usePreventPageReload } from '../../hooks/usePreventPageReload';

// Utils
import { speak, stopSpeak } from "utils/TextToSpeech";
import { filterNumberKeyDown } from 'utils';
import { saveOfflineForm } from 'utils/indexDB';
import { getLocationWithFallback } from 'utils/locationUtils';
import { sendSilentWhatsAppReport, createErrorMessage } from '../../utils/whatsappUtils';
import { getConsentStatus } from '../../utils/consentManager';
import { incrementDailyCount, isSurveyorUser, syncAfterSubmission } from '../../utils/dailySurveyCount';

// Services
import apiService from '../../services/api';

// Per-form location helpers (block-level, backend-driven + offline cache).
import { getFormLocationHelpers } from "utils/formLocations";
import useFormLocations from "hooks/useFormLocations";
const { getStateOptions, getDistrictOptions, getBlockOptions, getVillageOptions } =
  getFormLocationHelpers("HOUSE_HOLD");

// Validation schemas for each step
const step1ValidationSchema = Yup.object({
  nameParticipant: Yup.string().required("This is required field"),
  verbalConsent: Yup.string().required("This is required field"),
  date: Yup.string().required("This is required field"),
  time: Yup.string().required("This is required field"),
});

// Step 2 (household details) validates every mandatory field shown on this step.
// This was previously an accidental copy of step 1's schema, so at submit time only
// the four consent fields — already filled on step 1 — were checked and the household
// fields could be left blank. Location/coordinates are intentionally not listed here:
// they're enforced separately by the `hasValidCoordinates` gate (the submit button
// stays disabled and handleSubmit re-checks before posting).
const step2ValidationSchema = Yup.object({
  state: Yup.string().required("This is required field"),
  district: Yup.string().required("This is required field"),
  block: Yup.string().required("This is required field"),
  village: Yup.string().required("This is required field"),
  villageCode: Yup.string().required("This is required field"),
  clusterNumber: Yup.string().required("This is required field"),
  structureCode: Yup.string().required("This is required field"),
  householdNumber: Yup.string().required("This is required field"),
  mobileNumber: Yup.string().required("This is required field"),
  headOfHousehold: Yup.string().required("This is required field"),
  numberOfChildren: Yup.string().required("This is required field"),
  childrenStayingHh: Yup.string().required("This is required field"),
});

const HouseHold = () => {
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [showSnackBar, setShowSnackBar] = useState(false);
  const [snackBarMessage, setSnackBarMessage] = useState({ text: "", type: "" });
  const [coordinates, setCoordinates] = useState({ lat: '', lng: '', alt: '', acc: '' });
  const [step, setStep] = useState(1);
  const [speakSound, setSpeakSound] = useState(false);
  const [address, setAddress] = useState({});
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [villagesAvailable, setVillagesAvailable] = useState(true); // New state to track village availability
  const [villageValidationError, setVillageValidationError] = useState(''); // New state for village validation error
  const isOnline = useNetworkStatus();
  // Load this form's active locations (online -> backend + cache, offline -> cache).
  useFormLocations("HOUSE_HOLD");
  const { t, i18n } = useFormTranslation('household');
  const navigate = useNavigate();

  // Add missing state variables for error handling in form submission
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
  const [showSaveOfflineOption, setShowSaveOfflineOption] = useState(false);
  
  // Error reporting states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [currentError, setCurrentError] = useState(null);
  const [currentPayload, setCurrentPayload] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Consent management states
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingErrorReport, setPendingErrorReport] = useState(null);
  
  // Location validation states
  const [locationStatus, setLocationStatus] = useState('checking'); // 'checking', 'granted', 'denied', 'unavailable', 'error'
  const [locationError, setLocationError] = useState('');
  const [isLocationRequired, setIsLocationRequired] = useState(true);
  const [hasValidCoordinates, setHasValidCoordinates] = useState(false);

  // Form state management
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentFormValues, setCurrentFormValues] = useState({});
  
  // Prevent accidental page reload
  const { confirmNavigation } = usePreventPageReload(
    hasUnsavedChanges,
    "You have unsaved form data. Are you sure you want to leave?"
  );

  // Track if form has been modified
  useEffect(() => {
    const hasData = Object.values(currentFormValues).some(value => {
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    });
    setHasUnsavedChanges(hasData);
  }, [currentFormValues]);

  // Monitor network status changes and notify user without affecting form data
  const previousOnlineStatus = useRef(isOnline);
  const lastNotificationTime = useRef(0);
  
  useEffect(() => {
    // Skip notification on initial mount or if status hasn't actually changed
    if (previousOnlineStatus.current === isOnline) {
      return;
    }
    
    // Debounce notifications to prevent rapid status changes from spamming the user
    const now = Date.now();
    if (now - lastNotificationTime.current < 2000) { // 2 second debounce
      previousOnlineStatus.current = isOnline;
      return;
    }
    
    if (!isOnline && previousOnlineStatus.current) {
      // Just went offline - notify user
      console.log("📡 Connection lost");
      setShowSnackBar(true);
      setSnackBarMessage({
        text: "Connection lost. Form data will be preserved locally.",
        type: "warning",
      });
      lastNotificationTime.current = now;
    } else if (isOnline && !previousOnlineStatus.current) {
      // Just came back online
      console.log("📡 Connection restored");
      setShowSnackBar(true);
      setSnackBarMessage({
        text: "Connection restored. You can now submit your form.",
        type: "success",
      });
      lastNotificationTime.current = now;
    }
    
    // Update the previous status
    previousOnlineStatus.current = isOnline;
  }, [isOnline]);

  const handleGoBack = () => {
    confirmNavigation(() => {
      navigate(-1);
    });
  };

  const todayDate = new Date()

  const readText = (text) => {
    if (speakSound) {
      stopSpeak()
      setSpeakSound(false)
    } else {
      setSpeakSound(true)
      // Get current language from i18n, default to 'en-US' if not available
      const currentLang = i18n?.language || 'en';
      // Map language codes to speech synthesis language codes
      const langMap = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'odi': 'or-IN',
        'tel': 'te-IN'
      };
      const speechLang = langMap[currentLang] || 'en-US';
      speak(text, speechLang, () => {
        setSpeakSound(false)
      })
    }
  }

  const handleCloseSnackBar = () => {
    setShowSnackBar(false);
  };

  // Consent handling functions
  const handleConsentGiven = () => {
    if (pendingErrorReport) {
      const { formType, errorMessage, payload } = pendingErrorReport;
      sendSilentWhatsAppReport(formType, errorMessage, payload);
      setPendingErrorReport(null);
    }
  };

  const checkAndRequestConsent = (formType, errorMessage, payload) => {
    const consentStatus = getConsentStatus();
    
    if (consentStatus.canSendReports) {
      // User has already consented, send report immediately
      sendSilentWhatsAppReport(formType, errorMessage, payload);
    } else {
      // User hasn't consented, show consent dialog
      setPendingErrorReport({ formType, errorMessage, payload });
      setShowConsentDialog(true);
    }
  };

  // Helper function to get current date and time
  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const time = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
    return { date, time };
  };

  const { date: currentDate, time: currentTime } = getCurrentDateTime();

  const initialValues = {
    responseMode: 'online',
    nameParticipant: "",
    verbalConsent: "",
    date: currentDate,
    time: currentTime,
    state: "",
    stateCode: "",
    district: "",
    districtCode: "",
    block: "",
    blockCode: "",
    village: "",
    villageCode: "",
    clusterNumber: "",
    structureCode: "",
    householdNumber: "",
    mobileNumber: "",
    headOfHousehold: "",
    numberOfChildren: "",
    childrenStayingHh: "",
    locationHousehold: "",
    latitude: 0,
    longitude: 0,
  };


  const handleNext = (values, actions) => {
    // Check village availability validation for step 2 (household details step)
    if (step === 2 && !villagesAvailable) {
      setShowSnackBar(true);
      setSnackBarMessage({
        text: "No villages available for the selected block. Please select another block.",
        type: "error",
      });
      return; // Prevent proceeding to next step
    }

    const currentValidationSchema = step === 1 ? step1ValidationSchema : step2ValidationSchema;
    currentValidationSchema.validate(values).then(() => {
      if (step === 1) {
        // After consent, automatically capture location and go to household details
        getCurrentLocation();
        setStep(2);
      } else {
        setStep((prevStep) => prevStep + 1);
      }
      actions.setTouched({}); // Reset touched fields
    }).catch((err) => {
      console.log('[Form Validation Error] =>', err.path);

      // Set errors for each invalid field
      const errors = {};
      err.inner.forEach((validationError) => {
        errors[validationError.path] = validationError.message;
      });

      // Set all fields as touched so that errors will be displayed
      actions.setTouched(
        Object.keys(values).reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {})
      );

      actions.setErrors(errors); // Set formik errors
      setTimeout(() => {
        const element = document.getElementsByClassName('survey_invalid__xnDLv')[0]
        element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 500);
    });
  };

  const handleBack = () => {
    setStep((prevStep) => prevStep - 1);
  };

  // Check location permissions and capture coordinates
  useEffect(() => {
    const getLocation = async () => {
      try {
        setLocationStatus('checking');
        const locationData = await getLocationWithFallback();
        
        setCoordinates({
          lat: locationData.lat,
          lng: locationData.lng,
          alt: 0,
          acc: locationData.accuracy
        });
        
        setLocationStatus('granted');
        setHasValidCoordinates(!locationData.fallback);
        
        if (locationData.fallback) {
          setLocationError('Location unavailable, using default coordinates (0, 0)');
        } else if (locationData.cached) {
          setLocationError('Using cached location data');
        } else {
          setLocationError('');
        }
      } catch (error) {
        setLocationStatus('error');
        setLocationError('Error getting location');
        setCoordinates({ lat: 0, lng: 0, alt: 0, acc: 0 });
        setHasValidCoordinates(false);
      }
    };

    getLocation();
  }, []);

  // Validate coordinates
  useEffect(() => {
    const isValid = coordinates && 
                   coordinates.lat !== '' && 
                   coordinates.lng !== '' && 
                   coordinates.lat !== 0 && 
                   coordinates.lng !== 0 &&
                   !isNaN(parseFloat(coordinates.lat)) && 
                   !isNaN(parseFloat(coordinates.lng));
    
    setHasValidCoordinates(isValid);
  }, [coordinates]);

  // Function to retry location capture
  const retryLocationCapture = async () => {
    try {
      setLocationStatus('checking');
      setLocationError('');
      const locationData = await getLocationWithFallback();
      
      setCoordinates({
        lat: locationData.lat,
        lng: locationData.lng,
        alt: 0,
        acc: locationData.accuracy
      });
      
      setLocationStatus('granted');
      setHasValidCoordinates(!locationData.fallback);
      
      if (locationData.fallback) {
        setLocationError('Location unavailable, using default coordinates (0, 0)');
      } else if (locationData.cached) {
        setLocationError('Using cached location data');
      } else {
        setLocationError('');
      }
    } catch (error) {
      setLocationStatus('error');
      setLocationError('Error getting location');
      setCoordinates({ lat: 0, lng: 0, alt: 0, acc: 0 });
      setHasValidCoordinates(false);
    }
  };

  // Get current location function
  const getCurrentLocation = async () => {
    setLoadingStatus(true);
    try {
      setLocationStatus('checking');
      setLocationError('');
      const locationData = await getLocationWithFallback();
      
      setCoordinates({
        lat: locationData.lat,
        lng: locationData.lng,
        alt: 0,
        acc: locationData.accuracy
      });
      
      setLocationStatus('granted');
      setHasValidCoordinates(!locationData.fallback);
      
      if (locationData.fallback) {
        setLocationError('Location unavailable, using default coordinates (0, 0)');
      } else if (locationData.cached) {
        setLocationError('Using cached location data');
      } else {
        setLocationError('');
      }
    } catch (error) {
      setLocationStatus('error');
      setLocationError('Error getting location');
      setCoordinates({ lat: 0, lng: 0, alt: 0, acc: 0 });
      setHasValidCoordinates(false);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Render location status function
  const renderLocationStatus = () => {
    const getStatusColor = () => {
      switch (locationStatus) {
        case 'granted': return hasValidCoordinates ? 'success' : 'warning';
        case 'denied': return 'error';
        case 'unavailable': return 'error';
        case 'error': return 'error';
        default: return 'info';
      }
    };

    const getStatusIcon = () => {
      return hasValidCoordinates ? <LocationOnIcon /> : <LocationOffIcon />;
    };

    const getStatusMessage = () => {
      switch (locationStatus) {
        case 'checking': return 'Checking location access...';
        case 'granted': return hasValidCoordinates ? 
          'Location access granted and coordinates captured successfully.' : 
          'Location access granted, capturing coordinates...';
        case 'denied': return 'Location access denied. Please enable location permissions.';
        case 'unavailable': return 'Location services are unavailable on this device.';
        case 'error': return 'Error accessing location. Please try again.';
        default: return 'Location status unknown.';
      }
    };

    // Only show status alert for loading, denied, unavailable, or error states
    // Success state is handled by the coordinate display box below
    if (locationStatus === 'granted' && hasValidCoordinates) {
      return null;
    }

    return (
      <Alert 
        severity={getStatusColor()} 
        icon={getStatusIcon()}
        action={
          (locationStatus === 'denied' || locationStatus === 'error') && (
            <Button color="inherit" size="small" onClick={retryLocationCapture}>
              Retry
            </Button>
          )
        }
        sx={{ mb: 2 }}
      >
        <Typography variant="body2">
          {getStatusMessage()}
          {locationError && (
            <><br /><strong>Error:</strong> {locationError}</>
          )}
        </Typography>
      </Alert>
    );
  };

  const handleSubmit = async (values, { resetForm, setSubmitting }) => {
    // If offline, save directly to IndexedDB
    if (!isOnline) {
      handleSaveOffline(values, { resetForm, setSubmitting });
      return;
    }

    // If online, proceed with form submission
    if (!hasValidCoordinates) {
      setShowSnackBar(true);
      setSnackBarMessage({
        text: `${t('locationRequired')} ${t('enableLocation')}.`,
        type: "error",
      });
      setSubmitting(false);
      return;
    }

    const payload = { ...values, latitude: coordinates.lat, longitude: coordinates.lng };
    
    setLoadingStatus(true);

    try {
      const res = await apiService.post('/form/household', payload);
      setLoadingStatus(false);
      setSubmitting(false);
      
      // Check for actual success: only statusCode: 200 indicates success
      if (res.statusCode === 200) {
        // Increment daily count for surveyors and sync with API
        if (isSurveyorUser()) {
          try {
            incrementDailyCount(null, 'household');
            syncAfterSubmission(apiService, 'household').catch((error) => {
              console.error('Error syncing daily count with API:', error);
            });
          } catch (error) {
            console.error('Error updating daily count:', error);
          }
        }

        setShowSnackBar(true);
        setSnackBarMessage({
          text: "Form submitted successfully!",
          type: "success",
        });

        resetForm();
        setTimeout(() => {
          navigate("/survey/list", { replace: true });
        }, 1000);
      } else {
        // Handle backend errors (including 200 responses with error statusCode)
        handleSubmissionFailure(payload, resetForm, setSubmitting, res);
      }
    } catch (error) {
      // Handle network/server errors
      handleSubmissionError(error, payload, resetForm, setSubmitting);
    }
  };

  const handleSubmissionFailure = (payload, resetForm, setSubmitting, response) => {
    setLoadingStatus(false);
    setSubmitting(false);
    
    // Create error object for the dialog
    const error = {
      status: response?.statusCode || 'Unknown',
      message: response?.message || response?.error || "Form submission failed",
      response: { data: response }
    };
    
    // Show error dialog
    setCurrentError(error);
    setCurrentPayload(payload);
    setShowErrorDialog(true);
  };

  const handleSubmissionError = (error, payload, resetForm, setSubmitting) => {
    console.error('Form submission error:', error);
    setLoadingStatus(false);
    setSubmitting(false);
    
    const statusCode = error.response?.status || error.status;
    
    // Handle authentication/authorization errors
    if (statusCode === 401 || statusCode === 403) {
      setShowSnackBar(true);
      setSnackBarMessage({
        text: "Session expired. Please login again.",
        type: "error",
      });
      return;
    }
    
    // For all other errors, show error dialog
    setCurrentError(error);
    setCurrentPayload(payload);
    setShowErrorDialog(true);
  };

  const handleSaveOffline = async (values, { resetForm, setSubmitting }) => {
    // Validate location before offline save
    if (!hasValidCoordinates) {
      setShowSnackBar(true);
      setSnackBarMessage({
        text: `${t('locationRequired')} ${t('enableLocation')}.`,
        type: "error",
      });
      setSubmitting(false);
      return;
    }

    const payload = { ...values, latitude: coordinates.lat, longitude: coordinates.lng };
    const saved = await saveOfflineForm({ url: '/form/household', data: { ...payload, responseMode: 'offline' } });

    if (!saved) {
      // Both IndexedDB and the localStorage fallback failed (e.g. device
      // storage full) — do NOT claim success or reset the form, or the
      // surveyor's answers are lost with no trace.
      setSubmitting(false);
      setShowSnackBar(true);
      setSnackBarMessage({
        text: "Could not save form on this device (storage full?). Please free up space and try again.",
        type: "error",
      });
      return;
    }

    setHasUnsavedChanges(false);

    resetForm();
    setSubmitting(false);
    setShowSnackBar(true);
    setSnackBarMessage({
      text: "Form saved offline successfully with location coordinates.",
      type: "warning",
    });
    setTimeout(() => {
      navigate("/survey/list", { replace: true });
    }, 3000);
  };

  // Error dialog handlers
  const handleErrorDialogClose = () => {
    setShowErrorDialog(false);
    setCurrentError(null);
    setCurrentPayload(null);
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setShowErrorDialog(false);
    // Retry the form submission
    if (currentPayload) {
      handleSubmit(currentPayload, { 
        resetForm: () => {}, 
        setSubmitting: () => {} 
      });
    }
    setIsRetrying(false);
  };

  const handleErrorSaveOffline = () => {
    if (currentPayload) {
      handleSaveOffline(currentPayload, { 
        resetForm: () => {}, 
        setSubmitting: () => {} 
      });
    }
  };

  // Get today's date in the format YYYY-MM-DD
  const date = new Date();

  const today = date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');

  // Restore draft from IndexedDB - disabled
  const restoreDraftIfExists = React.useCallback(async () => {
    // Auto-save disabled
    return null;
  }, []);

  // Always check for a draft on mount
  React.useEffect(() => {
    // setFieldValue is not available here, so we restore in FormObserver
  }, []);

  // ----- Local component to safely use hooks with Formik values -----
  const FormObserver = () => {
    const { values } = useFormikContext();

    // Keep latest values for form tracking
    useEffect(() => {
      setCurrentFormValues(values);
    }, [values]);

    return null;
  };

  // Location status component
  const LocationStatus = () => {
    const getStatusColor = () => {
      switch (locationStatus) {
        case 'granted': return 'success';
        case 'checking': return 'info';
        case 'denied':
        case 'error': return 'error';
        case 'unavailable': return 'warning';
        default: return 'info';
      }
    };

    const getStatusIcon = () => {
      return hasValidCoordinates ? <LocationOnIcon /> : <LocationOffIcon />;
    };

    const getStatusMessage = () => {
      switch (locationStatus) {
        case 'checking': return 'Checking location access...';
        case 'granted': return hasValidCoordinates ? 
          'Location access granted and coordinates captured successfully.' : 
          'Location access granted, capturing coordinates...';
        case 'denied': return t('locationDenied');
        case 'unavailable': return t('locationUnavailable');
        case 'error': return t('locationError');
        default: return 'Unknown location status';
      }
    };

    // Only show status alert for loading, denied, unavailable, or error states
    // Success state is handled by the coordinate display box below
    if (locationStatus === 'granted' && hasValidCoordinates) {
      return null;
    }

    return (
      <Alert 
        severity={getStatusColor()} 
        icon={getStatusIcon()}
        action={
                     (locationStatus === 'denied' || locationStatus === 'error') && (
            <Button color="inherit" size="small" onClick={retryLocationCapture}>
              {t('retryLocation')}
            </Button>
          )
        }
        sx={{ mb: 2 }}
      >
        <Typography variant="body2">
          {getStatusMessage()}
          {locationError && (
            <><br /><strong>Error:</strong> {locationError}</>
          )}
        </Typography>
      </Alert>
    );
  };

  return (
    <>
      <SnackBar
        message={snackBarMessage.text}
        open={showSnackBar}
        handleClose={handleCloseSnackBar}
        type={snackBarMessage.type}
      />
      <ConsentDialog
        open={showConsentDialog}
        onClose={() => setShowConsentDialog(false)}
        onConsentGiven={handleConsentGiven}
      />
      <ErrorReportingDialog
        open={showErrorDialog}
        onClose={handleErrorDialogClose}
        onRetry={handleRetry}
        onSaveOffline={handleErrorSaveOffline}
        isRetrying={isRetrying}
        error={currentError}
      />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: { xs: '12px 0', sm: '16px 0', md: '20px 0' },
          position: 'relative'
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1000 1000\'><defs><radialGradient id=\'a\'><stop offset=\'0\' stop-color=\'%23ffffff\' stop-opacity=\'.1\'/><stop offset=\'1\' stop-color=\'%23ffffff\' stop-opacity=\'0\'/></radialGradient></defs><g><circle fill=\'url(%23a)\' cx=\'200\' cy=\'200\' r=\'180\'/><circle fill=\'url(%23a)\' cx=\'800\' cy=\'300\' r=\'120\'/><circle fill=\'url(%23a)\' cx=\'600\' cy=\'700\' r=\'200\'/></g></svg>") no-repeat',
            backgroundSize: 'cover',
            opacity: { xs: 0.1, sm: 0.2, md: 0.3 },
            pointerEvents: 'none'
          }}
        />
        
        <Container 
          maxWidth="lg" 
          sx={{
            position: 'relative', 
            zIndex: 1,
            padding: { xs: '0 8px', sm: '0 12px', md: '0 16px' }
          }}
        >
          <Box 
            className={styles.paper} 
            sx={{ 
              p: { xs: 2, sm: 3, md: 4 }
            }}
          >
            {/* Header Section */}
            <Box 
              display="flex" 
              alignItems="center" 
              mb={{ xs: 2, sm: 3, md: 4 }}
              className={styles.sectionHeader}
              sx={{
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'flex-start', md: 'center' },
                gap: { xs: 2, md: 0 }
              }}
            >
              <IconButton 
                onClick={handleGoBack}
                sx={{ 
                  mr: 2,
                  background: 'rgba(30, 60, 114, 0.1)',
                  '&:hover': {
                    background: 'rgba(30, 60, 114, 0.2)'
                  }
                }}
                aria-label="Go back"
              >
                <ArrowBack sx={{ color: '#1e3c72' }} />
              </IconButton>
              <Box className={styles.sectionIcon}>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                  H
                </Typography>
              </Box>
              <Box>
                <Typography variant="h3" className={styles.heading}>
                  Household Survey
                </Typography>
                <Typography className={styles.sectionSubtitle}>
                  Comprehensive household data collection form
                </Typography>
              </Box>
            </Box>

            {/* Progress Indicator */}
            <Box 
              className={styles.progressIndicator}
              sx={{
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 1, md: 2 },
                mb: { xs: 2, sm: 3, md: 4 }
              }}
            >
              <Box className={`${styles.progressStep} ${step >= 1 ? 'active' : 'pending'}`}>
                <Typography variant="body2">1</Typography>
                <Typography variant="body2">Consent</Typography>
              </Box>
              <Box className={`${styles.progressStep} ${step >= 2 ? 'active' : 'pending'}`}>
                <Typography variant="body2">2</Typography>
                <Typography variant="body2">Household Details</Typography>
              </Box>
            </Box>
            <Formik
              initialValues={initialValues}
              validationSchema={step === 1 ? step1ValidationSchema : step2ValidationSchema}
              onSubmit={handleSubmit}
            >
              {({ values, handleChange, handleBlur, setFieldValue, errors, touched, isValid, dirty, setErrors, setTouched, isSubmitting, resetForm, setSubmitting }) => {
                
                return (
                <Form autoComplete="off">
                  <FormObserver />

                  {step === 1 && (
                    <>
                      <Box className={styles.formSection}>
                        <Box className={styles.sectionHeader}>
                          <Box className={styles.sectionIcon}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                              ✓
                            </Typography>
                          </Box>
                          <Box>
                            <Typography className={styles.sectionTitle}>
                              {t('consentSheetInvestigatorCopy')}
                            </Typography>
                            <Typography className={styles.sectionSubtitle}>
                              Participant consent and basic information
                            </Typography>
                          </Box>
                        </Box>
                        <Grid container rowSpacing={2} sx={{
                          margin: '0',
                          width: '100%'
                        }}>
                          <Grid item xs={12} className={styles.formField}>
                            <label className={styles.label} htmlFor="nameParticipant">
                              {t('participantName')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <Typography variant="caption" sx={{ color: '#7f8c8d', mb: 1, display: 'block' }}>
                              {t('onlyUppercaseAllowed')}
                            </Typography>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="text"
                              name="nameParticipant"
                              id="nameParticipant"
                              value={values.nameParticipant}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^[A-Za-z\s]*$/.test(value)) {
                                  handleChange(e);
                                }
                              }}
                              onBlur={handleBlur}
                              error={touched.nameParticipant && !!errors.nameParticipant}
                              helperText={touched.nameParticipant && errors.nameParticipant}
                            />
                            {touched.nameParticipant && errors.nameParticipant && (
                              <Box className={styles.errorMessage}>
                                <Typography variant="body2" className={styles.errorIcon}>⚠️</Typography>
                                <Typography variant="body2">{errors.nameParticipant}</Typography>
                              </Box>
                            )}
                          </Grid>
                          <Grid item xs={12} className={styles.formField}>
                            <label className={styles.label} htmlFor="verbalConsent">
                              {t('verbalConsentParticipant')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <Box className={styles.radioGroup}>
                              <Box 
                                className={`${styles.radioOption} ${values.verbalConsent === 'Yes' ? 'selected' : ''}`}
                                onClick={() => setFieldValue('verbalConsent', 'Yes')}
                              >
                                <Radio 
                                  checked={values.verbalConsent === 'Yes'} 
                                  onChange={handleChange}
                                  name="verbalConsent"
                                  value="Yes"
                                  sx={{ color: '#1e3c72' }}
                                />
                                <Typography className={styles.radioLabel}>{t('yes')}</Typography>
                              </Box>
                              <Box 
                                className={`${styles.radioOption} ${values.verbalConsent === 'No' ? 'selected' : ''}`}
                                onClick={() => setFieldValue('verbalConsent', 'No')}
                              >
                                <Radio 
                                  checked={values.verbalConsent === 'No'} 
                                  onChange={handleChange}
                                  name="verbalConsent"
                                  value="No"
                                  sx={{ color: '#1e3c72' }}
                                />
                                <Typography className={styles.radioLabel}>{t('no')}</Typography>
                              </Box>
                            </Box>
                            {touched.verbalConsent && errors.verbalConsent && (
                              <Box className={styles.errorMessage}>
                                <Typography variant="body2" className={styles.errorIcon}>⚠️</Typography>
                                <Typography variant="body2">{errors.verbalConsent}</Typography>
                              </Box>
                            )}
                          </Grid>
                          <Grid item xs={12} sm={6} className={styles.formField}>
                            <label className={styles.label} htmlFor="date">
                              {t('date')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="date"
                              name="date"
                              id="date"
                              max={todayDate}
                              value={values.date}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              fullWidth={false}
                              error={touched.date && !!errors.date}
                              helperText={touched.date && errors.date}
                              inputProps={{ max: today }}
                            />
                            {touched.date && errors.date && (
                              <Box className={styles.errorMessage}>
                                <Typography variant="body2" className={styles.errorIcon}>⚠️</Typography>
                                <Typography variant="body2">{errors.date}</Typography>
                              </Box>
                            )}
                          </Grid>
                          <Grid item xs={12} sm={6} className={styles.formField}>
                            <label className={styles.label} htmlFor="time">
                              {t('time')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="time"
                              name="time"
                              id="time"
                              value={values.time}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              error={touched.time && !!errors.time}
                              helperText={touched.time && errors.time}
                            />
                            {touched.time && errors.time && (
                              <Box className={styles.errorMessage}>
                                <Typography variant="body2" className={styles.errorIcon}>⚠️</Typography>
                                <Typography variant="body2">{errors.time}</Typography>
                              </Box>
                            )}
                          </Grid>
                          <Grid item xs={12}>
                            <Box className={styles.formNote}>
                              <Box className={styles.formNoteHeader}>
                                <IconButton 
                                  onClick={() => readText(t('formNote'))}
                                  size="small"
                                  sx={{ color: '#2980b9' }}
                                >
                                  {speakSound ? <StopCircleIcon /> : <VolumeUpIcon />}
                                </IconButton>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  यह नोट प्रतिभागी को पढ़कर सुनायें (This note can be read out loud)
                                </Typography>
                              </Box>
                              <Typography className={styles.formNoteText}>
                                {t('formNote')}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                      
                      {/* Action Buttons */}
                      <Box className={styles.actionButtons}>
                        <Button
                          className={styles.primaryButton}
                          size="large"
                          fullWidth={false}
                          onClick={() => handleNext(values, { setErrors, setTouched })}
                          startIcon={<ArrowForward />}
                        >
                          {t('next')}
                        </Button>
                      </Box>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <Box className={styles.formSection}>
                        <Box className={styles.sectionHeader}>
                          <Box className={styles.sectionIcon}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                              🏠
                            </Typography>
                          </Box>
                          <Box>
                            <Typography className={styles.sectionTitle}>
                              {t('houseListingChecklist')}
                            </Typography>
                            <Typography className={styles.sectionSubtitle}>
                              Household details and location information
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Location Status - Show if location is being captured */}
                        {loadingStatus && (
                          <Box className={styles.locationStatus} sx={{ 
                            background: 'rgba(52, 152, 219, 0.1)',
                            borderColor: '#3498db',
                            color: '#2980b9',
                            mb: 2
                          }}>
                            <LocationOnIcon sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              Automatically capturing your location...
                            </Typography>
                          </Box>
                        )}
                        
                        {/* Location Status - Show if there's an error */}
                        {locationStatus === 'error' && (
                          <Box className={styles.locationStatus} sx={{ 
                            background: 'rgba(231, 76, 60, 0.1)',
                            borderColor: '#e74c3c',
                            color: '#c0392b',
                            mb: 2
                          }}>
                            <LocationOffIcon sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              Location capture failed. Using default coordinates.
                            </Typography>
                          </Box>
                        )}
                        
                        {/* Location Status - Show success */}
                        {hasValidCoordinates && !loadingStatus && (
                          <Box className={styles.locationStatus} sx={{ 
                            background: 'rgba(46, 204, 113, 0.1)',
                            borderColor: '#27ae60',
                            color: '#27ae60',
                            mb: 2
                          }}>
                            <LocationOnIcon sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              Location captured successfully: {coordinates.lat}, {coordinates.lng}
                            </Typography>
                          </Box>
                        )}
                        <Grid container rowSpacing={2} sx={{
                          margin: '0',
                          width: '100%'
                        }}>
                          <Grid item xs={12} sm={6} className={styles.formField}>
                            <label className={styles.label} htmlFor="state">
                              {t('stateName')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <Select
                              size="small"
                              name="state"
                              id="state"
                              displayEmpty
                              className={styles.formInput}
                              value={values.state}
                              onChange={(e) => {
                                const { value } = e.target;
                                setFieldValue("state", value);
                                setFieldValue("district", '');
                                // Clear child location codes when state changes
                                setFieldValue("districtCode", '');
                                setFieldValue("blockCode", '');
                                setFieldValue("villageCode", '');
                                // Reset village availability state when state changes
                                setVillagesAvailable(true);
                                setVillageValidationError('');
                                const stateData = getStateOptions(value)[0];
                                setAddress(stateData || {});
                                // Persist the selected state's code so it is submitted with the form
                                setFieldValue("stateCode", stateData?.state_code != null ? stateData.state_code.toString() : '');
                              }}
                              onBlur={handleBlur}
                              error={touched.state && !!errors.state}
                            >
                              <MenuItem value={null} disabled>Select State</MenuItem>
                              {getStateOptions().map((state, i) => (
                                <MenuItem key={i} value={state.text}>{state.text}</MenuItem>
                              ))}
                            </Select>
                            {touched.state && errors.state && (
                              <Box className={styles.errorMessage}>
                                <Typography variant="body2" className={styles.errorIcon}>⚠️</Typography>
                                <Typography variant="body2">{errors.state}</Typography>
                              </Box>
                            )}
                          </Grid>
                          <Grid item xs={12} sm={6} className={styles.formField}>
                            <label className={styles.label} htmlFor="district">
                              {t('district')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <Select
                              size="small"
                              className={styles.formInput}
                              name="district"
                              id="district"
                              placeholder="Select one"
                              value={values.district}
                              onChange={(e) => {
                                const { value } = e.target;
                                setFieldValue("district", value);
                                setFieldValue("block", '');
                                setFieldValue("blockCode", '');
                                setFieldValue("village", '');
                                setFieldValue("villageCode", '');
                                setSelectedVillage(null);
                                // Reset village availability state when district changes
                                setVillagesAvailable(true);
                                setVillageValidationError('');
                                const districtData = address.state_code ? getDistrictOptions(address.state_code).find(e => e.text === value) : null;
                                setAddress(districtData || {});
                                // Persist the selected district's code so it is submitted with the form
                                setFieldValue("districtCode", districtData?.district_code != null ? districtData.district_code.toString() : '');
                              }}
                              onBlur={handleBlur}
                             error={touched.district && !!errors.district}
                            >
                              <MenuItem value={null} disabled>Select District</MenuItem>
                              {values.state && address.state_code && getDistrictOptions(address.state_code).map((district, i) => (
                                <MenuItem key={i} value={district.text}>{district.text}</MenuItem>
                              ))}
                            </Select>
                            {touched.district && errors.district ? (
                              <div className={styles.error}>{errors.district}</div>
                            ) : null}
                          </Grid>
                          <Grid item xs={12} sm={7} className={(touched.block && !!errors.block) ?
                            styles.invalid : ''}>
                            <label className={styles.label} htmlFor="block">
                              {t('block_name')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <Select
                              size="small"
                              className={styles.formInput}
                              name="block"
                              id="block"
                              placeholder="Select Block"
                              value={values.block}
                              onChange={(e) => {
                                const { value } = e.target;
                                setFieldValue("block", value);
                                setFieldValue("village", '');
                                setFieldValue("villageCode", '');
                                setSelectedVillage(null);
                                setVillageValidationError(''); // Clear previous village validation error

                                const blockData = address.district_code ? getBlockOptions(address.state_code, address.district_code).find(e => e.text === value) : null;
                                setAddress(blockData || {});
                                // Persist the selected block's code so it is submitted with the form
                                setFieldValue("blockCode", blockData?.block_code != null ? blockData.block_code.toString() : '');
                                
                                // Check if villages are available for this block
                                if (blockData && blockData.block_code) {
                                  const availableVillages = getVillageOptions(blockData.state_code, blockData.district_code, blockData.block_code);
                                  if (availableVillages.length === 0) {
                                    setVillagesAvailable(false);
                                    setVillageValidationError('No villages available for this block. Please select another block.');
                                    setShowSnackBar(true);
                                    setSnackBarMessage({
                                      text: "No villages available for the selected block. Please select another block.",
                                      type: "warning",
                                    });
                                  } else {
                                    setVillagesAvailable(true);
                                    setVillageValidationError('');
                                  }
                                } else {
                                  setVillagesAvailable(true);
                                  setVillageValidationError('');
                                }
                              }}
                              onBlur={handleBlur}
                              error={touched.block && !!errors.block}
                            >
                              <MenuItem value={null} disabled>Select Block</MenuItem>
                              {values.state && values.district && address.district_code && getBlockOptions(address.state_code, address.district_code).map((block, i) => (
                                <MenuItem key={i} value={block.text}>{block.text}</MenuItem>
                              ))}
                            </Select>
                            {touched.block && errors.block ? (
                              <div className={styles.error}>{errors.block}</div>
                            ) : null}
                            {villageValidationError && (
                              <div className={styles.error} style={{ color: '#ff9800', fontWeight: 'bold' }}>
                                ⚠️ {villageValidationError}
                              </div>
                            )}
                          </Grid>
                          <Grid item xs={12} sm={7} className={(touched.village && !!errors.village) ?
                            styles.invalid : ''}>
                            <label className={styles.label} htmlFor="village">
                              {t('village_name')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <Select
                              size="small"
                              className={styles.formInput}
                              name="village"
                              id="village"
                              displayEmpty
                              value={values.village}
                              disabled={!villagesAvailable} // Disable village dropdown when no villages available
                              onChange={(e) => {
                                const { value } = e.target;
                                setFieldValue("village", value);
                                if (value) {
                                  const villageData = address.block_code ? getVillageOptions(address.state_code, address.district_code, address.block_code).find(v => v.text === value) : null;
                                  setSelectedVillage(villageData);
                                  setFieldValue("villageCode", villageData ? villageData.village_code.toString().padStart(2, '0') : '');
                                } else {
                                  setSelectedVillage(null);
                                  setFieldValue("villageCode", '');
                                }
                              }}
                              onBlur={handleBlur}
                              error={touched.village && !!errors.village}
                            >
                              <MenuItem value={null} disabled>
                                {!villagesAvailable ? "No villages available - select another block" : "Select Village"}
                              </MenuItem>
                              {values.state && values.district && values.block && address.block_code && villagesAvailable && getVillageOptions(address.state_code, address.district_code, address.block_code).map((village, i) => (
                                <MenuItem key={i} value={village.text}>{village.text}</MenuItem>
                              ))}
                            </Select>
                            {touched.village && errors.village ? (
                              <div className={styles.error}>{errors.village}</div>
                            ) : null}
                          </Grid>

                          <Grid item xs={12} sm={7} className={(touched.villageCode && !!errors.villageCode) ?
                            styles.invalid : ''}>
                            <label className={styles.label} htmlFor="villageCode">
                              {t('villageUrbanTownCode')} <span className={styles.requiredStar}>*</span>
                            </label>
                            {selectedVillage ? (
                              <Box sx={{ 
                                p: 1.5, 
                                backgroundColor: '#f5f5f5', 
                                borderRadius: 1, 
                                border: '1px solid #ddd',
                                minHeight: '40px',
                                display: 'flex',
                                alignItems: 'center'
                              }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                                  {values.villageCode}
                                </Typography>
                              </Box>
                            ) : (
                              <TextField
                                size="small"
                                className={styles.formInput}
                                type="text"
                                name="villageCode"
                                id="villageCode"
                                value={values.villageCode}
                                InputProps={{
                                  readOnly: true,
                                }}
                                placeholder="Select village to see code"
                                error={touched.villageCode && !!errors.villageCode}
                                helperText={touched.villageCode && errors.villageCode}
                              />
                            )}
                          </Grid>

                          <Grid item xs={12} sm={7} className={(touched.clusterNumber && !!errors.clusterNumber) ?
                            styles.invalid : ''}>
                            <label className={styles.label} htmlFor="clusterNumber">
                              {t('clusterNumber')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('cluster_code_instruction')}</em>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="number"
                              name="clusterNumber"
                              id="clusterNumber"
                              value={values.clusterNumber}
                              onChange={(e) => {
                                const { value } = e.target;
                                const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                if (regex.test(value)) {
                                  handleChange(e); // Allow the change if it matches the regex
                                }
                              }}
                              onBlur={handleBlur}
                              onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                              error={touched.clusterNumber && !!errors.clusterNumber}
                              helperText={touched.clusterNumber && errors.clusterNumber}
                            />
                          </Grid>

                          <Grid item xs={12} sm={7} className={(touched.structureCode && !!errors.structureCode) ?
                            styles.invalid : ''}>
                            <label className={styles.label} htmlFor="structureCode">
                              {t('structureCode')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('family_type_instruction')}</em>
                            <Select
                              size="small"
                              name="structureCode"
                              id="structureCode"
                              placeholder="Select one"
                              className={styles.formInput}
                              value={values.structureCode}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              error={touched.structureCode && !!errors.structureCode}
                            >
                              <MenuItem value='01'>01</MenuItem>
                              <MenuItem value='02'>02</MenuItem>
                            </Select>
                            {touched.structureCode && errors.structureCode ? (
                              <div className={styles.error}>{errors.structureCode}</div>
                            ) : null}
                          </Grid>

                          <Grid item xs={12} sm={7} className={(touched.householdNumber && !!errors.householdNumber) ?
                            styles.invalid : ''}>
                            <label className={styles.label} htmlFor="householdNumber">
                              {t('householdNumber')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="number"
                              name="householdNumber"
                              id="householdNumber"
                              value={values.householdNumber}
                              onChange={(e) => {
                                const { value } = e.target;
                                const regex = /^\d{0,3}$/; // Regex to allow only numbers and max 2 digits
                                if (regex.test(value)) {
                                  handleChange(e); // Allow the change if it matches the regex
                                }
                              }}
                              onBlur={handleBlur}
                              onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                              error={touched.householdNumber && !!errors.householdNumber}
                              helperText={touched.householdNumber && errors.householdNumber}
                            />
                          </Grid>

                          <Grid item xs={12} sm={7} className={(touched.mobileNumber && !!errors.mobileNumber) ?
                            styles.invalid : ''}>
                            <label className={styles.label} htmlFor="mobileNumber">
                              {t('mobileNumber')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="number"
                              name="mobileNumber"
                              id="mobileNumber"
                              value={values.mobileNumber}
                              onChange={(e) => {
                                const { value } = e.target;
                                const regex = /^\d{0,10}$/; // Regex to allow only numbers and max 2 digits
                                if (regex.test(value)) {
                                  handleChange(e); // Allow the change if it matches the regex
                                }
                              }}
                              onBlur={handleBlur}
                              onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                              error={touched.mobileNumber && !!errors.mobileNumber}
                              helperText={touched.mobileNumber && errors.mobileNumber}
                            />
                          </Grid>

                          <Grid item xs={12} className={(touched.headOfHousehold && !!errors.headOfHousehold) ?
                            styles.invalid : ''}>
                            <label className={styles.label} htmlFor="headOfHousehold">
                              {t('headOfHousehold')}<span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('onlyUppercaseAllowed')}</em>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="text"
                              name="headOfHousehold"
                              id="headOfHousehold"
                              value={values.headOfHousehold}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^[A-Za-z\s]*$/.test(value)) {
                                  handleChange(e);
                                }
                              }}
                              onBlur={handleBlur}
                              error={touched.headOfHousehold && !!errors.headOfHousehold}
                              helperText={touched.headOfHousehold && errors.headOfHousehold}
                            />
                          </Grid>

                          <Grid item xs={12} className={(touched.numberOfChildren && !!errors.numberOfChildren) ?
                            styles.invalid : ''}>
                            <label className={styles.label} htmlFor="numberOfChildren">
                              {t('totalChildren0to5Years')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="number"
                              name="numberOfChildren"
                              id="numberOfChildren"
                              value={values.numberOfChildren}
                              onChange={(e) => {
                                const { value } = e.target;
                                const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                if (regex.test(value)) {
                                  handleChange(e); // Allow the change if it matches the regex
                                }
                              }}
                              onBlur={handleBlur}
                              onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                              error={touched.numberOfChildren && !!errors.numberOfChildren}
                              helperText={touched.numberOfChildren && errors.numberOfChildren}
                            />
                          </Grid>

                          <Grid item xs={12} className={(touched.childrenStayingHh && !!errors.childrenStayingHh) ?
                            styles.invalid : ''}>
                            <label className={styles.label} htmlFor="childrenStayingHh">
                              {t('numberU5ChildrenInHH')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="number"
                              name="childrenStayingHh"
                              id="childrenStayingHh"
                              value={values.childrenStayingHh}
                              onChange={(e) => {
                                const { value } = e.target;
                                const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                if (regex.test(value)) {
                                  handleChange(e); // Allow the change if it matches the regex
                                }
                              }}
                              onBlur={handleBlur}
                              onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                              error={touched.childrenStayingHh && !!errors.childrenStayingHh}
                              helperText={touched.childrenStayingHh && errors.childrenStayingHh}
                            />
                          </Grid>

                          <Grid
                            item
                            xs={12}
                            style={{ display: isOnline ? 'block' : 'none' }} // Hide when offline
                            className={(touched.locationHousehold && !!errors.locationHousehold) ?
                              styles.invalid : ''}>
                            <label className={styles.label} htmlFor="locationHousehold">
                              {t('locationOfHousehold')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="text"
                              name="locationHousehold"
                              id="locationHousehold"
                              value={values.locationHousehold}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              error={touched.locationHousehold && !!errors.locationHousehold}
                              helperText={touched.locationHousehold && errors.locationHousehold}
                              InputProps={{
                                readOnly: true,
                              }}
                            />
                          </Grid>

                          {/* Location Status Alert */}
                          {isOnline && (
                            <Grid item xs={12}>
                              <LocationStatus />
                            </Grid>
                          )}

                          {/* Map Component */}
                          {isOnline && (
                            <Grid item xs={12} sx={{ position: 'relative' }}>
                              <label className={styles.label} htmlFor="locationOfHousehold">
                                {t('autoLocationCapture') || 'Auto Location Capture'}<span className={styles.requiredStar}>*</span>
                              </label>
                              <MapComponent
                                setCoordinates={(coords) => {
                                  setCoordinates(coords);
                                  setFieldValue('latitude', coords.lat);
                                  setFieldValue('longitude', coords.lng);
                                }}
                                setAddressDetails={(details) => {
                                  setFieldValue('locationHousehold', details.display_name);
                                }}
                                showLocationStatus={true}
                                disableManualSelection={true}
                              />
                            </Grid>
                          )}

                          {/* Coordinates Display */}
                          {isOnline && coordinates && coordinates.lat && coordinates.lng && (
                            <Grid item xs={12}>
                              <Box sx={{ 
                                p: 2, 
                                backgroundColor: '#e8f5e8', 
                                borderRadius: 1, 
                                border: '1px solid #4caf50',
                                position: 'relative',
                                zIndex: 1000,
                                marginTop: 2,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                                  ✅ Location Captured Successfully:
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#2e7d32' }}>
                                  <strong>Latitude:</strong> {coordinates.lat}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#2e7d32' }}>
                                  <strong>Longitude:</strong> {coordinates.lng}
                                </Typography>
                                {coordinates.acc && (
                                  <Typography variant="body2" sx={{ color: '#2e7d32' }}>
                                    <strong>Accuracy:</strong> ±{Math.round(coordinates.acc)} meters
                                  </Typography>
                                )}
                              </Box>
                            </Grid>
                          )}

                          <Grid item xs={12}>
                            <Box className={styles.formNote}>
                              <Box className={styles.formNoteHeader}>
                                <IconButton 
                                  onClick={() => readText(t('formNote'))}
                                  size="small"
                                  sx={{ color: '#2980b9' }}
                                >
                                  {speakSound ? <StopCircleIcon /> : <VolumeUpIcon />}
                                </IconButton>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  यह नोट प्रतिभागी को पढ़कर सुनायें (This note can be read out loud)
                                </Typography>
                              </Box>
                              <Typography className={styles.formNoteText}>
                                {t('formNote')}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                      
                      {/* Action Buttons */}
                      <Box className={styles.actionButtons}>
                        <Button 
                          className={styles.secondaryButton}
                          onClick={handleBack} 
                          startIcon={<ArrowBack />}
                        >
                          {t('back')}
                        </Button>
                        <Button
                          className={styles.primaryButton}
                          type="submit"
                          disabled={isSubmitting || loadingStatus || !hasValidCoordinates || submitButtonDisabled}
                          endIcon={<Check />}
                          title={!hasValidCoordinates ? "Location coordinates are required before submission" : ""}
                        >
                          {(isSubmitting || loadingStatus) ? 
                            'Submitting...' : 
                            !hasValidCoordinates ? t('waitingForLocation') :
                            (isOnline ? t('submit') : t('save'))
                          }
                        </Button>
                        {showSaveOfflineOption && isOnline && (
                          <Button
                            className={styles.warningButton}
                            onClick={() => handleSaveOffline(values, { resetForm, setSubmitting })}
                            disabled={isSubmitting || loadingStatus || !hasValidCoordinates || submitButtonDisabled}
                            title={!hasValidCoordinates ? "Location coordinates are required even for offline save" : ""}
                          >
                            {!hasValidCoordinates ? t('enableLocation') : 'Save Offline'}
                          </Button>
                        )}
                      </Box>
                      {loadingStatus && (
                        <Box className={styles.loadingOverlay}>
                          <Loader loading={loadingStatus} />
                        </Box>
                      )}
                    </>
                  )}
                </Form>
                );
              }}
            </Formik>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default HouseHold;
