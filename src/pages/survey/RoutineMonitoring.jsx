import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./survey.module.css";
import * as Yup from "yup";
import SnackBar from "components/ui/SnackBar";
import WhatsAppContact from "components/ui/WhatsAppContact";
import { useFormTranslation } from "hooks/useFormTranslation";
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import ListItemText from '@mui/material/ListItemText';
import { styled } from '@mui/material/styles';

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
    TextareaAutosize,
    FormGroup,
    Checkbox,
    Select,
    MenuItem,
    Divider,
    IconButton,
} from "@mui/material";
import { Formik, Form, useFormikContext } from "formik";
import apiService from '../../services/api';
import Loader from "components/ui/Loader";
import AutoSaveIndicator from "components/ui/AutoSaveIndicator";
import { ArrowBack, ArrowForward, Check, Description } from "@mui/icons-material";
import { getStateOptions, getDistrictOptions, getBlockOptions } from "constants/locations";
import { filterNumberKeyDown } from 'utils'
import { saveOfflineForm } from 'utils/indexDB'
import useNetworkStatus from 'utils/networkState';
import useFormAutoSave from 'hooks/useFormAutoSave';
import usePreventPageReload from 'hooks/usePreventPageReload';
import { getLocationWithFallback } from 'utils/locationUtils';
import AwaRegistration from './AwaRegistration';
import EquipmentAvailabilityAWC from './EquipmentAvailabilityAWC';
import SkillAssessment from './SkillAssessment';
import CMAMClinicSection from './CMAMClinicSection';
import ANMCHOKnowledgeAssessmentSection from './ANMCHOKnowledgeAssessmentSection';
import CommunityBasedEventsObservationSection from './CommunityBasedEventsObservationSection';
import CMAMChildServicesSection from './CMAMChildServicesSection';
import Infant0To6MonthsSection from './Infant0To6MonthsSection';
import Child6To8MonthsSection from './Child6To8MonthsSection';
import Child9To23MonthsSection from './Child9To23MonthsSection';
import MapComponent from 'components/ui/StreetMap';
import ErrorReportingDialog from '../../components/ui/ErrorReportingDialog';
import ConsentDialog from '../../components/ui/ConsentDialog';
import SOPViewer from '../../components/ui/SOPViewer';
import { sendSilentWhatsAppReport, createErrorMessage } from '../../utils/whatsappUtils';
import { getConsentStatus } from '../../utils/consentManager';
import { 
    saveRoutineMonitoringPreferences, 
    loadRoutineMonitoringPreferences, 
    getTodaysDate 
} from '../../utils/routineMonitoringPreferences';
import { incrementDailyCount, isSurveyorUser, syncAfterSubmission } from '../../utils/dailySurveyCount';


const ITEM_HEIGHT = 35;
const ITEM_PADDING_TOP = 4;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 200,
        },
    },
};

// Styled components removed - using standard Box sections now

const RoutineMonitoring = () => {
    const [snackBarMessage, setSnackBarMessage] = useState({ text: "", type: "" });
    const [showSnackBar, setShowSnackBar] = useState(false);
    const handleCloseSnackBar = () => setShowSnackBar(false);
    const [address, setAddress] = useState({});
    const [step, setStep] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useFormTranslation('routine');
    const isOnline = useNetworkStatus();
    
    // Add retry state management
    const [retryCount, setRetryCount] = useState(0);
    const [showSaveOfflineOption, setShowSaveOfflineOption] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [submitButtonDisabled, setSubmitButtonDisabled] = useState(true);
    const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
    const [whatsAppErrorMessage, setWhatsAppErrorMessage] = useState('');
    const [errorPayload, setErrorPayload] = useState(null);
    const [showSOPDialog, setShowSOPDialog] = useState(false);

  // Add missing state variables for error reporting and consent dialog
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [currentError, setCurrentError] = useState(null);
  const [currentPayload, setCurrentPayload] = useState(null);
    const [showConsentDialog, setShowConsentDialog] = useState(false);
    const [pendingErrorReport, setPendingErrorReport] = useState(null);
    const [isTestSubmission, setIsTestSubmission] = useState(false);

    const canMarkTestSubmission = () => {
        try {
            const raw = localStorage.getItem('iegUserRoles');
            if (!raw) return false;
            const roles = JSON.parse(raw);
            return roles.some(
                (r) => r.authority === 'ROLE_ADMIN' || r.authority === 'ROLE_IEG'
            );
        } catch {
            return false;
        }
    };

    // Auto-save state management
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [coordinates, setCoordinates] = useState(null);
    const [hasValidCoordinates, setHasValidCoordinates] = useState(false);
    const [locationAttempts, setLocationAttempts] = useState(0);
    const [currentFormValues, setCurrentFormValues] = useState({});
    const [draftToRestore, setDraftToRestore] = useState(null);
    const [preferencesLoaded, setPreferencesLoaded] = useState(false);
    const [savedPreferences, setSavedPreferences] = useState({});
    const formKey = useRef(`routinemonitoring_${Date.now()}_${location.pathname}`).current; // Stable form key
    
    const awaRegistrationRef = useRef(null);
    const equipmentAvailabilityRef = useRef(null);
    const skillAssessmentRef = useRef(null);
    const cmamClinicRef = useRef(null);
    const anmChoKnowledgeRef = useRef(null);
    const cmamChildServicesRef = useRef(null);
    const infant0To6MonthsRef = useRef(null);
    const child6To8MonthsRef = useRef(null);
    const child9To23MonthsRef = useRef(null);
    
    // Auto-save hook at component level
    const autoSave = useFormAutoSave(
        'routinemonitoring',
        formKey,
        currentFormValues,
        coordinates,
        true,
        3000 // Save every 3 seconds
    );
    
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
        setHasUnsavedChanges(hasData && !autoSave.isDraftRestored);
    }, [currentFormValues, autoSave.isDraftRestored]);
    
    // Load saved preferences when component mounts
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const preferences = await loadRoutineMonitoringPreferences();
                setSavedPreferences(preferences);
                
                // Set address state if state preference is loaded
                if (preferences.state) {
                    const stateData = getStateOptions(preferences.state)[0];
                    if (stateData) {
                        setAddress(stateData);
                        
                        // If district is also saved, set district address
                        if (preferences.district && stateData.state_code) {
                            const districtData = getDistrictOptions(stateData.state_code).find(d => d.text === preferences.district);
                            if (districtData) {
                                setAddress(districtData);
                                
                                // If block is also saved, set block address
                                if (preferences.block && districtData.district_code) {
                                    const blockData = getBlockOptions(districtData.district_code).find(b => b.text === preferences.block);
                                    if (blockData) {
                                        setAddress(blockData);
                                    }
                                }
                            }
                        }
                    }
                }
                
                setPreferencesLoaded(true);
            } catch (error) {
                console.error('Error loading preferences:', error);
                setPreferencesLoaded(true);
            }
        };
        
        loadPreferences();
    }, []);

    // Check for existing drafts when component loads (only once)
    useEffect(() => {
        const checkForDrafts = async () => {
            const draft = await autoSave.loadDraft();
            if (draft && draft.formData) {
                const confirmRestore = window.confirm(
                    `Found a saved draft from ${new Date(draft.lastModified).toLocaleString()}. Do you want to restore it?`
                );
                
                if (confirmRestore) {
                    setDraftToRestore(draft);
                    setSnackBarMessage({
                        text: `Draft restored from ${new Date(draft.lastModified).toLocaleString()}`,
                        type: "success",
                    });
                    setShowSnackBar(true);
                } else {
                    // Clear the draft if user doesn't want it
                    await autoSave.clearDraft();
                }
            }
        };
        
        checkForDrafts();
    }, []); // Empty dependency array - only run once

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
            // Just went offline - force save current data and notify user
            autoSave.forceSave();
            setSnackBarMessage({
                text: "Connection lost. Your progress has been saved and will be preserved.",
                type: "warning",
            });
            setShowSnackBar(true);
            lastNotificationTime.current = now;
        } else if (isOnline && !previousOnlineStatus.current) {
            // Just came back online
            setSnackBarMessage({
                text: "Connection restored. You can now submit your form.",
                type: "success",
            });
            setShowSnackBar(true);
            lastNotificationTime.current = now;
        }
        
        // Update the previous status
        previousOnlineStatus.current = isOnline;
    }, [isOnline]); // Remove autoSave from dependencies to prevent unnecessary triggers

    // Location capture effect with improved fallback handling
    useEffect(() => {
        const getLocation = async () => {
            try {
                const locationData = await getLocationWithFallback();
                setCoordinates({
                    lat: locationData.lat,
                    lng: locationData.lng,
                    accuracy: locationData.accuracy || 0
                });
                setHasValidCoordinates(!locationData.fallback);
                setLocationAttempts(0);

                if (locationData.fallback) {
                    // Silent fallback - don't show notification to user
                } else if (locationData.cached) {
                }
            } catch (error) {
                console.error("❌ RoutineMonitoring: Location error, using fallback:", error);
                // Always ensure coordinates are set, even on error
                setCoordinates({ lat: 0, lng: 0, accuracy: 0 });
                setHasValidCoordinates(false);
                // Don't show error to user - just use fallback silently
            }
        };

        getLocation();
    }, []); // Run once on component mount

    // Validate coordinates whenever they change
    useEffect(() => {
        if (coordinates) {
            const isValid = coordinates.lat !== 0 && coordinates.lng !== 0;
            setHasValidCoordinates(isValid);
        }
    }, [coordinates]);

    // Create dynamic validation schema inside component to access t function and current online status
    const getValidationSchema = (values = {}) => {
        // Alphanumeric regex pattern: allows letters (A-Z, a-z), numbers (0-9), and spaces
        const alphanumericPattern = /^[A-Za-z0-9\s]*$/;
        
        const baseSchema = {
            state: Yup.string()
                .max(150, t('validationStateNameMax'))
                .matches(alphanumericPattern, t('validationOnlyAlphanumeric'))
                .required(t('validationRequiredField')),
            district: Yup.string()
                .max(150, t('validationDistrictNameMax'))
                .required(t('validationRequiredField')),
            block: Yup.string()
                .max(150, t('validationBlockNameMax'))
                .required(t('validationRequiredField')),
            icdsProject: Yup.string()
                .max(100, t('validationIcdsProjectMax'))
                .matches(alphanumericPattern, t('validationOnlyAlphanumeric'))
                .required(t('validationRequiredField')),
            sector: Yup.string()
                .max(100, t('validationSectorNameMax'))
                .matches(alphanumericPattern, t('validationOnlyAlphanumeric'))
                .required(t('validationRequiredField')),
            village: Yup.string()
                .max(100, t('validationVillageNameMax'))
                .matches(alphanumericPattern, t('validationOnlyAlphanumeric'))
                .required(t('validationRequiredField')),
            awc: Yup.string()
                .max(100, t('validationAwcNameMax'))
                .matches(alphanumericPattern, t('validationOnlyAlphanumeric'))
                .required(t('validationRequiredField')),
            fieldMonitorName: Yup.string()
                .max(100, t('validationFieldMonitorMax'))
                .matches(alphanumericPattern, t('validationOnlyAlphanumeric'))
                .required(t('validationRequiredField')),
            dateVisit: Yup.string().required(t('validationRequiredField')),
            location: Yup.string()
                .notRequired(), // Location is optional - fallback to coordinates
            activityToObserve: Yup.string().required(t('validationRequiredField')),
        };

        // Add conditional validation for household section selection
        if (values.activityToObserve === 'Household/caregiver interaction') {
            baseSchema.householdSection = Yup.string().required('Please select a household section to fill');
        }

        return Yup.object(baseSchema);
    };

    const handleGoBack = () => {
        confirmNavigation(() => {
            navigate(-1);
        });
    };
    const initialValues = {
        responseMode: 'ONLINE',
        state: savedPreferences.state || 'Uttar Pradesh',
        block: savedPreferences.block || 'Agra',
        district: savedPreferences.district || 'Agra',
        icdsProject: savedPreferences.icdsProject || 'Test ICDS Project',
        sector: savedPreferences.sector || 'Test Sector',
        village: savedPreferences.village || 'Test Village',
        awc: savedPreferences.awc || 'Test AWC',
        fieldMonitorName: savedPreferences.fieldMonitorName || 'Test Monitor',
        dateVisit: getTodaysDate(),
        activityToObserve: 'Aanganwadi Center', // Single select
        location: '',
        householdSection: 'section8', // Single select
        section8: true,
        section9: false,
        section10: false,
        section11: false,
    }
    const handleBack = () => {
        setStep(0);
    };
    


    // Helper function to convert translated values back to English keys for payload
    const mapFormValuesToEnglish = (formData) => {
        const mappedData = {};
        const processedOtherFields = new Set();
        
        // Create reverse mapping from translated values to English keys
        const getEnglishValue = (value) => {
            // Handle empty or null values
            if (!value || value === '') return value;
            
            // If value is already in English (no translation occurred), return as is
            const translatedValue = t(value);
            if (translatedValue === value) {
                return value; // Already in English or no translation available
            }
            
            // Common English mappings for form values
            const englishMappings = {
                // Frequency options
                [t('always')]: 'Always (Every day)',
                [t('very_often')]: 'Very Often (4-5 days a week)',
                [t('often')]: 'Often (2-3 days a week)',
                [t('sometimes')]: 'Sometimes (Once a week)',
                [t('rarely')]: 'Rarely (Few times a month)',
                [t('never')]: 'Never',
                
                // Common status options
                [t('available')]: 'Available',
                [t('notAvailable')]: 'Not Available',
                [t('availableAndFunctional')]: 'Available and Functional',
                [t('availableButNotFunctional')]: 'Available but not Functional',
                [t('yes')]: 'Yes',
                [t('no')]: 'No',
                [t('others')]: 'Others',
                [t('other')]: 'Other',
                
                // Activity options
                [t('aanganwadiCenter')]: 'Aanganwadi Center',
                [t('cbeSession')]: 'CBE Session',
                [t('vhsndSessionRISession')]: 'VHSND Session/RI Session',
                [t('householdCaregiverInteraction')]: 'Household/caregiver interaction',
                
                // Common form values that need to stay in English
                [t('moreThan3')]: 'More than 3',
                [t('morethan3')]: 'More than 3', // Handle typo case
            };
            
            // Check if we have a direct English mapping
            if (englishMappings[value]) {
                return englishMappings[value];
            }
            
            // For values that don't have specific mappings, return the original value
            // This ensures that user input (like names, dates, etc.) stays unchanged
            return value;
        };
        
        // Fields that have Combined versions - use combined versions instead of raw
        const fieldsWithCombinedVersions = {
            'typeOfRecordAvailable': 'typeOfRecordAvailableCombined',
            'thrNotReceivedReasonChild': 'thrNotReceivedReasonChildCombined', 
            'childNotConsumeThr': 'childNotConsumeThrCombined',
            'thrQtyPrepareChild': 'thrQtyPrepareChildCombined',
            'storeThr': 'storeThrCombined',
            'awwActionsDuringVisit': 'awwActionsDuringVisitCombined',
            'counsellingAdviceReceive': 'counsellingAdviceReceiveCombined',
            'familyAttendedAnnaprashan': 'familyAttendedAnnaprashanCombined',
            'qtyPrepareFood': 'qtyPrepareFoodCombined',
            'thrStore': 'thrStoreCombined'
        };
        
        for (const [key, value] of Object.entries(formData)) {
            // Skip if this is an "Other" field that will be processed with its main field
            // But don't skip otherFruitsVegetablesFrequency as it's a legitimate field name
            if (key.endsWith('Other') || key.endsWith('Others') || ((key.startsWith('other') && key !== 'otherFruitsVegetablesFrequency')) || key.endsWith('Combined')) {
                continue;
            }
            
            // Use combined version if available, skip raw version
            if (fieldsWithCombinedVersions[key]) {
                const combinedKey = fieldsWithCombinedVersions[key];
                if (formData[combinedKey] !== undefined) {
                    // Use the combined value and map the key to the original field name
                    mappedData[key] = formData[combinedKey];
                    continue;
                }
            }
            
            // Handle array values (checkbox groups)
            if (Array.isArray(value)) {
                const mappedArray = value.map(item => {
                    return getEnglishValue(item);
                });
                
                // Handle "others" field if present
                const possibleOtherFields = [
                    key + 'Other',
                    key + 'Others', 
                    'other' + key.charAt(0).toUpperCase() + key.slice(1),
                    'otherReasons' + key.charAt(0).toUpperCase() + key.slice(1).replace(/[a-z]/g, ''),
                    'otherReasonsNotBreastfed',
                    'otherThrNotReceivedReason',
                    'thrNotReceivedReasonOther',
                    'otherAdviceReceive',
                    key.replace(/([A-Z])/g, '$1').toLowerCase() + '_other'
                ];
                
                // Find the first matching other field value
                let otherFieldValue = null;
                for (const fieldName of possibleOtherFields) {
                    if (formData[fieldName]) {
                        otherFieldValue = formData[fieldName];
                        break;
                    }
                }
                
                if (otherFieldValue && ((value.includes('others') || value.includes('Other') || value.includes('Others')))) {
                    const otherIndex = mappedArray.findIndex(item => 
                        item === 'Others' || item === 'others' || item === 'Other'
                    );
                    if (otherIndex !== -1) {
                        mappedArray[otherIndex] = `Others - ${otherFieldValue}`;
                        possibleOtherFields.forEach(field => processedOtherFields.add(field));
                    }
                }
                
                mappedData[key] = mappedArray.join(', ');
            } else {
                // Handle single values
                let mappedValue = getEnglishValue(value);
                
                // Handle "others" field if present
                const possibleOtherFields = [
                    key + 'Other',
                    key + 'Others', 
                    'other' + key.charAt(0).toUpperCase() + key.slice(1),
                    'otherReasons' + key.charAt(0).toUpperCase() + key.slice(1).replace(/[a-z]/g, ''),
                    'otherReasonsNotBreastfed',
                    'otherThrNotReceivedReason',
                    'thrNotReceivedReasonOther',
                    'otherAdviceReceive',
                    key.replace(/([A-Z])/g, '$1').toLowerCase() + '_other'
                ];
                
                // Find the first matching other field value
                let otherFieldValue = null;
                for (const fieldName of possibleOtherFields) {
                    if (formData[fieldName]) {
                        otherFieldValue = formData[fieldName];
                        break;
                    }
                }
                
                if (otherFieldValue && ((value === 'Others' || value === 'others' || value === 'Other'))) {
                    mappedValue = `Others - ${otherFieldValue}`;
                    possibleOtherFields.forEach(field => processedOtherFields.add(field));
                }
                
                mappedData[key] = mappedValue;
            }
        }
        
        return mappedData;
    };

    // Helper function to get form data from a section
    const getFormSectionData = (formId) => {
        const formElement = document.getElementById(formId);
        if (!formElement) {
            return {};
        }
        
        // Get all input fields from the form (including Material-UI components)
        const formControls = formElement.querySelectorAll('input, select, textarea, [role="textbox"]');
        
        // Also check for Material-UI TextField components
        const muiTextFields = formElement.querySelectorAll('.MuiTextField-root input, .MuiTextField-root textarea');
        
        // Debug: Log all form control names and values
        
        // Debug: Specifically look for otherFruitsVegetablesFrequency
        const otherFruitsInputs = Array.from(formControls).filter(c => c.name === 'otherFruitsVegetablesFrequency');
        
        let formData = {};
        
        // First pass: collect all form controls by name
        const formControlsByName = {};
        
        // Process regular form controls
        formControls.forEach(control => {
            if (!control.name) return;
            
            if (!formControlsByName[control.name]) {
                formControlsByName[control.name] = [];
            }
            formControlsByName[control.name].push(control);
        });
        
        // Process Material-UI text fields
        muiTextFields.forEach(control => {
            if (!control.name) return;
            
            if (!formControlsByName[control.name]) {
                formControlsByName[control.name] = [];
            }
            formControlsByName[control.name].push(control);
        });
        
        // Second pass: process controls by groups
        Object.entries(formControlsByName).forEach(([name, controls]) => {
            // Debug: Log processing of otherFruitsVegetablesFrequency
            if (name === 'otherFruitsVegetablesFrequency') {
            }
            
            // Check if this is a checkbox group (multiple checkboxes with same name)
            const isCheckboxGroup = controls.length > 1 && controls[0].type === 'checkbox';
            
            if (isCheckboxGroup) {
                // For checkbox groups, collect values in an array
                const checkedValues = controls
                    .filter(control => control.checked)
                    .map(control => control.value);
                
                if (checkedValues.length) {
                    formData[name] = checkedValues;
                } else {
                    // Include empty array for checkbox groups with no selections
                    formData[name] = [];
                }
            } else {
                // Single controls or radio groups
                controls.forEach(control => {
                    if (control.type === 'checkbox') {
                        if (control.checked) {
                            formData[name] = control.value;
                        }
                    } else if (control.type === 'radio') {
                        if (control.checked) {
                            formData[name] = control.value;
                        }
                    } else if (control.type === 'select-multiple') {
                        const selectedOptions = Array.from(control.selectedOptions).map(option => option.value);
                        if (selectedOptions.length) {
                            formData[name] = selectedOptions;
                        }
                    } else {
                        // Text inputs, selects, etc.
                        if (control.value !== undefined && control.value !== null) {
                            formData[name] = control.value || '';
                        }
                    }
                });
                
                // Ensure radio button fields have a value even if empty
                if (controls.length > 0 && controls[0].type === 'radio' && !formData[name]) {
                    formData[name] = '';
                }
            }
            
            // Debug: Log final value for otherFruitsVegetablesFrequency
            if (name === 'otherFruitsVegetablesFrequency') {
            }
        });
        
        // Map UI field names to exact database field names
        // thrNotReceivedReasonChild now uses correct parameter name directly
        
        // Get Others text from DOM elements directly
        const getOtherText = (fieldId) => {
            const element = document.getElementById(fieldId);
            return element ? element.value.trim() : '';
        };
        
        // Debug: Log all captured form data to see what's being collected
        
        // Only add Section 8 required fields if this is the CMAM Child Services form
        // Exclude these fields from other sections (9, 10, 11)
        if (formId === 'cmamChildServicesForm') {
            // Check if child card record is available - if not, exclude typeOfRecordAvailable fields
            const childCardRecordAvailability = formData.childCardRecordAvailability;
            
            // If child card record is not available, remove typeOfRecordAvailable and otherTypeOfRecord
            if (childCardRecordAvailability && childCardRecordAvailability !== 'Available') {
                delete formData.typeOfRecordAvailable;
                delete formData.typeOfRecordAvailableCombined;
                delete formData.otherTypeOfRecord;
            }
            
            // Check if THR was received - if yes, exclude thrNotReceivedReasonChild fields
            const thrReceivedFromAwc = formData.thrReceivedFromAwc;
            if (thrReceivedFromAwc && thrReceivedFromAwc === 'Yes') {
                delete formData.thrNotReceivedReasonChild;
                delete formData.thrNotReceivedReasonChildCombined;
                delete formData.otherThrNotReceivedReasonChild;
            }
            
            // Check if counselling on home food was received - if no, exclude counselling advice fields
            const counsellingOnHomeFood = formData.counsellingOnHomeFood;
            if (counsellingOnHomeFood && counsellingOnHomeFood === 'No') {
                delete formData.counsellingAdviceReceive;
                delete formData.counsellingAdviceReceiveCombined;
                delete formData.otherCounsellingAdvice;
            }
            
            const requiredFields = [
                'awwActionsDuringVisit', 
                'childNotConsumeThr',
                'thrQtyPrepareChild',
                'storeThr'
            ];
            
            // Only add counsellingAdviceReceive to required fields if counselling on home food is "Yes"
            if (counsellingOnHomeFood === 'Yes') {
                requiredFields.push('counsellingAdviceReceive');
            }
            
            // Only add typeOfRecordAvailable to required fields if child card is available
            if (childCardRecordAvailability === 'Available') {
                requiredFields.push('typeOfRecordAvailable');
            }
            
            requiredFields.forEach(field => {
                if (!formData[field]) {
                    formData[field] = '';
                }
            });
            
            // Only add thrNotReceivedReasonChild if THR was not received
            if (thrReceivedFromAwc === 'No' && !formData.thrNotReceivedReasonChild) {
                formData.thrNotReceivedReasonChild = '';
            }
        } else {
            // For other sections (9, 10, 11), remove Section 8 specific fields if they exist
            const section8Fields = [
                'typeOfRecordAvailable',
                'awwActionsDuringVisit', 
                'childNotConsumeThr',
                'thrQtyPrepareChild',
                'storeThr',
                'counsellingAdviceReceive',
                'thrNotReceivedReasonChild'
            ];
            
            section8Fields.forEach(field => {
                delete formData[field];
            });
            
            // For Section 10, ensure all food frequency fields are included
            if (formId === 'child6To8MonthsForm') {
                const foodFrequencyFields = [
                    'porridgeFrequency', 'fortifiedBabyFoodFrequency', 'grainsFoodFrequency',
                    'yellowOrangeVegetables', 'rootsFoodFrequency', 'darkGreenLeafyVegetables',
                    'ripeFruitsFrequency', 'otherFruitsVegetablesFrequency', 'dryFruitsFrequency',
                    'organMeatsFrequency', 'meatFoodFrequency', 'eggsFrequency', 'fishFrequency',
                    'beansLentilsFrequency', 'nutsFrequency', 'milkProductsFrequency',
                    'oilGheeFrequency', 'sugaryFoodsFrequency', 'beveragesFrequency', 'sweetenedBeveragesFrequency'
                ];
                
                // Try to get values from button selections by checking which buttons are active
                foodFrequencyFields.forEach(field => {
                    if (!formData[field]) {
                        // Look for active button for this food type
                        const activeButton = formElement.querySelector(`button[data-food="${field}"][data-frequency].MuiButton-contained`);
                        if (activeButton) {
                            const frequency = activeButton.getAttribute('data-frequency');
                            formData[field] = frequency;
                        } else {
                            // Also try to get from hidden input
                            const hiddenInput = formElement.querySelector(`input[name="${field}"]`);
                            if (hiddenInput && hiddenInput.value) {
                                formData[field] = hiddenInput.value;
                                console.log(`Captured ${field} from hidden input:`, hiddenInput.value);
                            } else {
                                formData[field] = '';
                                console.log(`No value found for ${field}, setting to empty`);
                            }
                        }
                    }
                });
                
                // Special handling for otherFruitsVegetablesFrequency which might not be captured properly
                if (!formData.otherFruitsVegetablesFrequency) {
                    console.log('otherFruitsVegetablesFrequency not found in regular form data, trying manual capture...');
                    
                    // Try multiple selectors to find the field
                    let element = document.querySelector(`#child6To8MonthsForm input[name="otherFruitsVegetablesFrequency"]`);
                    if (!element) {
                        // Try without the form ID
                        element = document.querySelector(`input[name="otherFruitsVegetablesFrequency"]`);
                    }
                    if (!element) {
                        // Try to find by looking for the specific field in the form
                        const formElement = document.getElementById('child6To8MonthsForm');
                        if (formElement) {
                            element = formElement.querySelector(`input[name="otherFruitsVegetablesFrequency"]`);
                        }
                    }
                    
                    if (element) {
                        formData.otherFruitsVegetablesFrequency = element.value || '';
                        console.log(`Manually captured otherFruitsVegetablesFrequency:`, element.value);
                    } else {
                        console.log(`Could not find otherFruitsVegetablesFrequency input element`);
                        // Try to find all input elements with similar names for debugging
                        const allInputs = document.querySelectorAll('input[name*="otherFruits"]');
                        console.log('Found inputs with "otherFruits" in name:', allInputs);
                        formData.otherFruitsVegetablesFrequency = '';
                    }
                } else {
                    console.log('otherFruitsVegetablesFrequency found in regular form data:', formData.otherFruitsVegetablesFrequency);
                }
            }
        }
        
        // Convert translated values back to English for payload
        return mapFormValuesToEnglish(formData);
    };

    const convertArraysToStrings = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        const result = {};
        for (const key in obj) {
            if (Array.isArray(obj[key])) {
                // Only convert arrays to strings if they haven't been processed already
                // (i.e., if they still contain raw values)
                const firstItem = obj[key][0];
                if (typeof firstItem === 'string' && firstItem.includes(' - ')) {
                    // Already processed with "others" handling
                    result[key] = obj[key].join(', ');
                } else {
                    result[key] = obj[key].join(', ');
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                result[key] = convertArraysToStrings(obj[key]);
            } else {
                result[key] = obj[key];
            }
        }
        return result;
    };

    const handleFormSubmit = async (values, { resetForm }) => {
        // Ensure coordinates are always available (fallback to 0,0 if needed)
        let finalCoordinates = coordinates;
        if (!finalCoordinates) {
            console.log("📍 No coordinates available, using fallback (0, 0)");
            finalCoordinates = { lat: 0, lng: 0, accuracy: 0 };
        }

        setLoadingStatus(true);
        setSubmitButtonDisabled(true);
        setIsRetrying(false);
        setShowSaveOfflineOption(false);

        // Create clean payload without section flags
        const { section8, section9, section10, section11, householdSection, ...cleanValues } = values;
        
        const payload = {
            ...cleanValues,
            activityToObserve: values.activityToObserve,
            latitude: finalCoordinates.lat,
            longitude: finalCoordinates.lng
        };

        if (values.activityToObserve.includes('Aanganwadi Center')) {
            // Trigger validation display in AwaRegistration component and check if fields are valid
            let isAwaRegistrationValid = true;
            if (awaRegistrationRef.current) {
                isAwaRegistrationValid = awaRegistrationRef.current.triggerValidation();
            }
            
            // Trigger validation display in EquipmentAvailabilityAWC component
            let isEquipmentAvailabilityValid = true;
            if (equipmentAvailabilityRef.current) {
                isEquipmentAvailabilityValid = equipmentAvailabilityRef.current.triggerValidation();
            }
            
            // Trigger validation display in SkillAssessment component
            let isSkillAssessmentValid = true;
            if (skillAssessmentRef.current) {
                isSkillAssessmentValid = skillAssessmentRef.current.triggerValidation();
            }
            
            // Create specific error messages for each section
            let errorMessage = t('pleaseCompleteRequiredFields') || "Please complete all required fields";

            if (!isAwaRegistrationValid) {
                errorMessage = t('awaRegistrationSectionIncomplete') || "Please complete all required fields in Section 2 - SAM Children Identification and CMAM Enrollment";
            } else if (!isEquipmentAvailabilityValid) {
                // Provide more specific guidance for equipment availability section
                const missingEquipmentFields = [
                    "Digital Weighing Scale", "Salter Scale", "Infantometer", "Stadiometer",
                    "Supplementary Nutrition", "Register Availability", "Poshan Tracker Status",
                    "Amoxycillin Syrup", "Folic Acid Tablet", "Albendazole", "Vitamin A",
                    "IFA Syrup", "Multivitamin Syrup", "Zinc", "ORS", "Paracetamol"
                ];
                errorMessage = t('equipmentAvailabilitySectionIncomplete') ||
                    `Please complete all required fields in Section 3 - Equipment/Supplies Availability. Check: ${missingEquipmentFields.join(", ")}`;
            } else if (!isSkillAssessmentValid) {
                errorMessage = t('skillAssessmentSectionIncomplete') || "Please complete all required fields in Section 4 - Skill Assessment";
            }

            // Only show error and return if any validation failed
            if (!isAwaRegistrationValid || !isEquipmentAvailabilityValid || !isSkillAssessmentValid) {
                setLoadingStatus(false);
                setSubmitButtonDisabled(false);
                setShowSnackBar(true);
                setSnackBarMessage({
                    text: errorMessage,
                    type: "error",
                });
                
                // Scroll to the first invalid section
                setTimeout(() => {
                    if (!isAwaRegistrationValid) {
                        const awaRegistrationSection = document.getElementById('awaRegistrationForm');
                        if (awaRegistrationSection) {
                            awaRegistrationSection.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                            });
                        }
                    } else if (!isEquipmentAvailabilityValid) {
                        const equipmentSection = document.getElementById('equipmentAvailabilityForm');
                        if (equipmentSection) {
                            equipmentSection.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                            });
                        }
                    } else if (!isSkillAssessmentValid) {
                        const skillAssessmentSection = document.getElementById('skillAssessmentForm');
                        if (skillAssessmentSection) {
                            skillAssessmentSection.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                            });
                        }
                    }
                }, 200); // Small delay to ensure snackbar is shown first
                
                return;
            }

            // Get data from AwaRegistration, EquipmentAvailabilityAWC, and SkillAssessment components
            const awaRegistrationData = getFormSectionData('awaRegistrationForm');
            const equipmentAvailabilityData = getFormSectionData('equipmentAvailabilityForm');
            const skillAssessmentData = getFormSectionData('skillAssessmentForm');

            // Fix field name mismatches and add missing fields
            const fixedSkillAssessmentData = {
                ...skillAssessmentData,
                // Fix field name mismatches
                dateChildMeasured: skillAssessmentData.lastMeasurementDate,
                measurementFollowedStep: skillAssessmentData.measurementFollowedStepDigital || 
                                       skillAssessmentData.measurementFollowedStepMechanical || 
                                       skillAssessmentData.measurementFollowedStepSalter || '',
                childHeightSteps: skillAssessmentData.stadiometerSteps || skillAssessmentData.infantometerSteps || '',
                stadiometerSteps: skillAssessmentData.stadiometerSteps || '',
                infantometerSteps: skillAssessmentData.infantometerSteps || '',
                // Add missing fields with default values if not present
                cmamTrainingMonth: skillAssessmentData.cmamTrainingMonth || '',
                cmamTrainingDiscussed: skillAssessmentData.cmamTrainingDiscussed || '',
                reasonPoshanTrackerNotUpdated: equipmentAvailabilityData.reasonPoshanTrackerNotUpdated || '',
                // Add missing medicine fields
                ifaSyrup: equipmentAvailabilityData.ifaSyrup || '',
                multivitaminSyrup: equipmentAvailabilityData.multivitaminSyrup || '',
                // Add missing nutritional status field
                nutritionalStatusXScorecard: skillAssessmentData.nutritionalStatusXScorecard || '',
                // Fix field name for household section
                thrQtyPrepareChild: skillAssessmentData.thrQtyPrepareChild || skillAssessmentData.daysThrPrepareChild || ''
            };

            // Remove the old field names to avoid duplication
            delete fixedSkillAssessmentData.lastMeasurementDate;
            delete fixedSkillAssessmentData.measurementFollowedStepDigital;
            delete fixedSkillAssessmentData.measurementFollowedStepMechanical;
            delete fixedSkillAssessmentData.measurementFollowedStepSalter;
            delete fixedSkillAssessmentData.stadiometerSteps;
            delete fixedSkillAssessmentData.infantometerSteps;

            // Define all required AWC fields
            const requiredAwcFields = [
                'samChildrenTotal', 'samChildren06', 'samChildren65', 'cmamChildrenTotal', 'cmamChildren06', 'cmamChildren65',
                'variationReason', 'weighingScale', 'salterScale', 'infantometer', 'stadiometer', 'supplementaryNutrition',
                'registerAvailability', 'poshanTrackerUpdated', 'reasonPoshanTrackerNotUpdated', 'amoxycillinSyrup',
                'folicAcidTablet', 'albendazole', 'vitA', 'ifaSyrup', 'multivitaminSyrup', 'zinc', 'ors', 'pcm',
                'cmamTraining', 'cmamTrainingMonth', 'cmamTrainingDiscussed', 'dateChildMeasured', 'childSex', 'childAge',
                'childWeight', 'childHeight', 'instrumentAww', 'measurementFollowedStep', 'childWeightAww',
                'childWeightFieldMonitor', 'childHeightInstrument', 'childHeightSteps', 'childHeightAww',
                'childHeightFieldMonitor', 'classifyWastingAww', 'nutritionalStatusXScorecard', 'screeningSamChildren',
                'appetiteTestFood', 'nutritionalOedema', 'childNrcMtc', 'childFollowupCmam', 'activitiesFollowupCmam'
            ];
            
            // Combine data from all sections
            const combinedAwcData = {
                ...awaRegistrationData,
                ...equipmentAvailabilityData,
                ...fixedSkillAssessmentData
            };
            
            // Ensure all required fields are present, use '.' for missing fields
            requiredAwcFields.forEach(field => {
                if (!combinedAwcData[field] || combinedAwcData[field] === '' || combinedAwcData[field] === null || combinedAwcData[field] === undefined) {
                    combinedAwcData[field] = '.';
                }
            });
            
            payload.aganwadiData = combinedAwcData;
        }

        if (values.activityToObserve.includes('VHSND Session/RI Session')) {
            // Trigger validation display in CMAMClinicSection component and check if fields are valid
            let isCmamClinicValid = true;
            if (cmamClinicRef.current) {
                isCmamClinicValid = cmamClinicRef.current.triggerValidation();
            }
            
            // Trigger validation display in ANMCHOKnowledgeAssessmentSection component
            let isAnmChoKnowledgeValid = true;
            if (anmChoKnowledgeRef.current) {
                isAnmChoKnowledgeValid = anmChoKnowledgeRef.current.triggerValidation();
            }
            
            // Create specific error messages for each section
            let errorMessage = t('pleaseCompleteRequiredFields') || "Please complete all required fields";

            if (!isCmamClinicValid) {
                errorMessage = t('cmamClinicSectionIncomplete') || "Please complete all required fields in Section 6 - VHSND CMAM Clinic";
            } else if (!isAnmChoKnowledgeValid) {
                errorMessage = t('anmChoKnowledgeSectionIncomplete') || "Please complete all required fields in Section 7 - ANM/CHO Knowledge Assessment";
            }

            // Only show error and return if any validation failed
            if (!isCmamClinicValid || !isAnmChoKnowledgeValid) {
                setLoadingStatus(false);
                setSubmitButtonDisabled(false);
                setShowSnackBar(true);
                setSnackBarMessage({
                    text: errorMessage,
                    type: "error",
                });
                
                // Scroll to the first invalid section
                setTimeout(() => {
                    if (!isCmamClinicValid) {
                        const cmamClinicSection = document.getElementById('cmamClinicForm');
                        if (cmamClinicSection) {
                            cmamClinicSection.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                            });
                        }
                    } else if (!isAnmChoKnowledgeValid) {
                        const anmChoKnowledgeSection = document.getElementById('anmChoKnowledgeForm');
                        if (anmChoKnowledgeSection) {
                            anmChoKnowledgeSection.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                            });
                        }
                    }
                }, 200); // Small delay to ensure snackbar is shown first
                
                return;
            }
            // Get data from CMAMClinicSection and ANMCHOKnowledgeAssessmentSection components
            const cmamClinicData = getFormSectionData('cmamClinicForm');
            const anmChoKnowledgeData = getFormSectionData('anmChoKnowledgeForm');

            // Combine data from both sections into vhsndData object
            payload.vhsndData = {
                ...cmamClinicData,
                ...anmChoKnowledgeData
            };
        }

        if (values.activityToObserve.includes('CBE Session')) {
            // Get data from CommunityBasedEventsObservationSection component
            const cbeData = getFormSectionData('cbeForm');
            
            // Get the textarea value directly from DOM
            const textareaElement = document.querySelector('#cbeForm textarea[name="otherImportantObservation"]');
            if (textareaElement) {
                cbeData.otherImportantObservation = textareaElement.value || '';
            } else {
                cbeData.otherImportantObservation = '';
            }
            
            payload.cbeData = cbeData;
        }

        if (values.activityToObserve.includes('Household/caregiver interaction')) {
            // Validate Section 8 if it's selected
            if (values.section8) {
                let isCmamChildServicesValid = true;
                if (cmamChildServicesRef.current) {
                    isCmamChildServicesValid = cmamChildServicesRef.current.triggerValidation();
                }
                
                if (!isCmamChildServicesValid) {
                    setLoadingStatus(false);
                    setSubmitButtonDisabled(false);
                    setShowSnackBar(true);
                    setSnackBarMessage({
                        text: t('cmamChildServicesSectionIncomplete') || "Please complete all required fields in Section 8 - CMAM Child Services",
                        type: "error",
                    });
                    
                    // Scroll to the first invalid section
                    setTimeout(() => {
                        const cmamChildServicesSection = document.getElementById('cmamChildServicesForm');
                        if (cmamChildServicesSection) {
                            cmamChildServicesSection.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                            });
                        }
                    }, 200);
                    
                    return;
                }
            }
            
            // Validate Section 9 if it's selected
            if (values.section9) {
                let isInfant0To6MonthsValid = true;
                if (infant0To6MonthsRef.current) {
                    isInfant0To6MonthsValid = infant0To6MonthsRef.current.triggerValidation();
                }
                
                if (!isInfant0To6MonthsValid) {
                    setLoadingStatus(false);
                    setSubmitButtonDisabled(false);
                    setShowSnackBar(true);
                    setSnackBarMessage({
                        text: t('infant0To6MonthsSectionIncomplete') || "Please complete all required fields in Section 9 - Infant 0-6 Months",
                        type: "error",
                    });
                    
                    // Scroll to the first invalid section
                    setTimeout(() => {
                        const infant0To6MonthsSection = document.getElementById('infant0To6MonthsForm');
                        if (infant0To6MonthsSection) {
                            infant0To6MonthsSection.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                            });
                        }
                    }, 200);
                    
                    return;
                }
            }
            
            // Validate Section 10 if it's selected
            if (values.section10) {
                let isChild6To8MonthsValid = true;
                if (child6To8MonthsRef.current) {
                    isChild6To8MonthsValid = child6To8MonthsRef.current.triggerValidation();
                }
                
                if (!isChild6To8MonthsValid) {
                    setLoadingStatus(false);
                    setSubmitButtonDisabled(false);
                    setShowSnackBar(true);
                    setSnackBarMessage({
                        text: t('child6To8MonthsSectionIncomplete') || "Please complete all required fields in Section 10 - Child 6-8 Months",
                        type: "error",
                    });
                    
                    // Scroll to the first invalid section
                    setTimeout(() => {
                        const child6To8MonthsSection = document.getElementById('child6To8MonthsForm');
                        if (child6To8MonthsSection) {
                            child6To8MonthsSection.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                            });
                        }
                    }, 200);
                    
                    return;
                }
            }
            
            // Validate Section 11 if it's selected
            if (values.section11) {
                let isChild9To23MonthsValid = true;
                if (child9To23MonthsRef.current) {
                    isChild9To23MonthsValid = child9To23MonthsRef.current.triggerValidation();
                }
                
                if (!isChild9To23MonthsValid) {
                    setLoadingStatus(false);
                    setSubmitButtonDisabled(false);
                    setShowSnackBar(true);
                    setSnackBarMessage({
                        text: t('child9To23MonthsSectionIncomplete') || "Please complete all required fields in Section 11 - Child 9-23 Months",
                        type: "error",
                    });
                    
                    // Scroll to the first invalid section
                    setTimeout(() => {
                        const child9To23MonthsSection = document.getElementById('child9To23MonthsForm');
                        if (child9To23MonthsSection) {
                            child9To23MonthsSection.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                            });
                        }
                    }, 200);
                    
                    return;
                }
            }
            
            // Get data from all selected household sections
            let householdData = {};
            
            if (values.section8) {
                const section8Data = getFormSectionData('cmamChildServicesForm');
                console.log('Section 8 captured data:', section8Data);
                householdData = { ...householdData, ...section8Data };
            }
            if (values.section9) {
                householdData = { ...householdData, ...getFormSectionData('infant0To6MonthsForm') };
            }
            if (values.section10) {
                householdData = { ...householdData, ...getFormSectionData('child6To8MonthsForm') };
            }
            if (values.section11) {
                const section11Data = getFormSectionData('child9To23MonthsForm');
                
                // Special handling for textarea field that might not be captured properly
                const otherRegularFoodItemElement = document.querySelector('#child9To23MonthsForm textarea[name="otherRegularFoodItem"]');
                if (otherRegularFoodItemElement) {
                    section11Data.otherRegularFoodItem = otherRegularFoodItemElement.value || '';
                }
                
                // Special handling for combined thrNotConsumedReason field
                const thrNotConsumedReasonCombinedElement = document.querySelector('#child9To23MonthsForm input[name="thrNotConsumedReasonCombined"]');
                if (thrNotConsumedReasonCombinedElement && thrNotConsumedReasonCombinedElement.value) {
                    section11Data.thrNotConsumedReason = thrNotConsumedReasonCombinedElement.value;
                }
                
                // Special handling for food frequency fields that might not be captured properly
                const foodFrequencyFields = [
                    'porridgeGruelFrequency', 'babyFoodFrequency', 'grainsBasedFoodFrequency',
                    'yellowOrangeVeggies', 'rootsBasedFoodFrequency', 'darkGreenVeggiesFrequency',
                    'ripeFruitsFrequencys', 'otherFruitsVeggiesFrequency', 'driedFruitsFrequency',
                    'organMeatsFrequencys', 'chickenMeatFrequency', 'eggsConsumptionFrequency',
                    'fishConsumptionFrequency', 'legumesFoodFrequency', 'nutsConsumptionFrequency',
                    'dairyProductsFrequency', 'oilsFatsFrequency', 'sugaryFoodFrequency',
                    'beveragesConsumptionFrequency', 'sweetenedBeveragesFrequencys'
                ];
                
                foodFrequencyFields.forEach(field => {
                    if (!section11Data[field]) {
                        const element = document.querySelector(`#child9To23MonthsForm input[name="${field}"]`);
                        if (element) {
                            section11Data[field] = element.value || '';
                            console.log(`Manually captured ${field}:`, element.value);
                        }
                    }
                });
                
                householdData = { ...householdData, ...section11Data };
            }

            payload.householdData = householdData;
        }

        if (canMarkTestSubmission() && isTestSubmission) {
            payload.isTestData = true;
        }

        console.log('Form payload:', payload);

        // If offline, save directly to IndexedDB
        if (!isOnline) {
          await handleSaveOffline(payload, resetForm);
          return;
        }

        try {
            const res = await apiService.post('/form/routine', payload);
            
            // Check for actual success: only statusCode: 200 indicates success
            if (res.statusCode === 200) {
                // Save form preferences for future use
                try {
                    await saveRoutineMonitoringPreferences(values);
                    console.log('✅ Routine monitoring preferences saved successfully');
                } catch (error) {
                    console.error('Error saving preferences:', error);
                    // Don't show error to user as this is not critical
                }
                
                // Increment daily count for surveyors and sync with API
                if (isSurveyorUser()) {
                    try {
                        // First increment local count (optimistic update)
                        incrementDailyCount(null, 'routine');
                        console.log('✅ Daily survey count updated locally');
                        
                        // Then sync with API to get accurate count from backend
                        // This ensures count is accurate even if localStorage was cleared
                        syncAfterSubmission(apiService, 'routine').then(() => {
                            console.log('✅ Daily survey count synced with API');
                        }).catch((error) => {
                            console.error('Error syncing daily count with API:', error);
                            // Don't show error to user as local count was updated
                        });
                    } catch (error) {
                        console.error('Error updating daily count:', error);
                        // Don't show error to user as this is not critical
                    }
                }
                
                setShowSaveOfflineOption(false);
                setShowSnackBar(true);
                setSnackBarMessage({
                    text: t('formSubmittedSuccessfully'),
                    type: "success",
                });

                resetForm();
                setTimeout(() => {
                    navigate("/survey/list", { replace: true });
                }, 1000);
            } else {
                // Handle backend errors (including 200 responses with error statusCode)
                const backendMessage = res.message || res.error || "Form submission failed";
                const errorStatusCode = res.statusCode || 'Unknown';
                
                setShowSnackBar(true);
                setSnackBarMessage({
                    text: `Submission failed: ${backendMessage}`,
                    type: "error",
                });
                setShowSaveOfflineOption(true);
                
                // Show WhatsApp contact dialog for backend errors
                setWhatsAppErrorMessage(`Backend Error (${errorStatusCode}): ${backendMessage}`);
                setErrorPayload(payload);
                setShowWhatsAppDialog(true);
            }
        } catch (error) {
            // Handle network/server errors with improved error messages
            console.error('RoutineMonitoring form submission error:', error);
            const statusCode = error.response?.status || error.status;
            
            if (statusCode === 401 || statusCode === 403) {
                setShowSnackBar(true);
                setSnackBarMessage({
                    text: "Session expired. Please login again.",
                    type: "error",
                });
                return;
            }
            
            const backendMessage = error.response?.data?.message || error.response?.data?.error || error.message;
            setShowSaveOfflineOption(true);
            setShowSnackBar(true);
            setSnackBarMessage({
                text: `Error: ${backendMessage}`,
                type: "error",
            });
            
            // Show WhatsApp contact dialog for errors
            const errorType = statusCode >= 500 ? 'Server Error' : 'Network/Connection Error';
            setWhatsAppErrorMessage(`${errorType} (${statusCode || 'Unknown'}): ${backendMessage}`);
            setErrorPayload(payload);
            setShowWhatsAppDialog(true);
        } finally {
            // Always re-enable submit button after API call completes
            setLoadingStatus(false);
            setSubmitButtonDisabled(false);
        }
    };

    // Consent and error handling functions
    const handleConsentGiven = () => {
        setShowConsentDialog(false);
        if (pendingErrorReport) {
            const { formType, errorMessage, payload } = pendingErrorReport;
            sendSilentWhatsAppReport(formType, errorMessage, payload);
            setPendingErrorReport(null);
        }
    };

    const checkAndRequestConsent = (formType, errorMessage, payload) => {
        const consentStatus = getConsentStatus();
        if (consentStatus === 'granted') {
            sendSilentWhatsAppReport(formType, errorMessage, payload);
        } else if (consentStatus === 'denied') {
            // User has denied consent, don't send report
            console.log('User has denied WhatsApp error reporting consent');
        } else {
            // Consent not determined yet, show dialog
            setPendingErrorReport({ formType, errorMessage, payload });
            setShowConsentDialog(true);
        }
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
            handleFormSubmit(currentPayload, { 
                resetForm: () => {}, 
                setSubmitting: () => {} 
            });
        }
        setIsRetrying(false);
    };

    const handleErrorSaveOffline = async () => {
        if (currentPayload) {
            await handleSaveOffline(currentPayload, {
                resetForm: () => {},
                setSubmitting: () => {}
            });
        }
    };

    // Update handleSubmissionFailure and handleSubmissionError to use error dialog
    const handleSubmissionFailure = (payload, resetForm, response) => {
        setLoadingStatus(false);
        // Create error object for the dialog
        const error = {
            status: response?.statusCode || 'Unknown',
            message: response?.message || response?.error || "Form submission failed",
            response: { data: response }
        };
        setCurrentError(error);
        setCurrentPayload(payload);
        setShowErrorDialog(true);
    };

    const handleSubmissionError = (error, payload, resetForm) => {
        console.error('Form submission error:', error);
        setLoadingStatus(false);
        const statusCode = error.response?.status || error.status;
        if (statusCode === 401 || statusCode === 403) {
            setShowSnackBar(true);
            setSnackBarMessage({
                text: "Session expired. Please login again.",
                type: "error",
            });
            return;
        }
        setCurrentError(error);
        setCurrentPayload(payload);
        setShowErrorDialog(true);
    };

    const handleSaveOffline = async (payload, resetForm) => {
        await saveOfflineForm({ url: '/form/routine', data: { ...payload, responseMode: 'offline' } });

        setHasUnsavedChanges(false);
        resetForm();
        
        setShowSnackBar(true);
        setSnackBarMessage({
            text: "Form saved offline. It will sync when you're back online.",
            type: "success"
        });

        setTimeout(() => {
            navigate("/survey/list", { replace: true });
        }, 2000);
    };

    // Get today's date in the format YYYY-MM-DD
    const date = new Date();

    const today = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');

    const getDobDays = date => {
        if (date) {
            const selectedDate = new Date(date);
            const today = new Date();
            const timeDifference = today - selectedDate;

            // Calculate days
            const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

            return days
        }
    }
    const getDobMonths = date => {
        if (date) {
            const selectedDate = new Date(date);
            const today = new Date();
            const months = today.getMonth() - selectedDate.getMonth() +
                (12 * (today.getFullYear() - selectedDate.getFullYear()));

            return months
        }
    }

    // Helper function to check if CBE section has required fields filled
    const isCBESectionValid = () => {
        const cbeForm = document.getElementById('cbeForm');
        if (!cbeForm) return false;
        
        // Check if theme is selected
        const themeRadios = cbeForm.querySelectorAll('input[name="themeOfCbe"]:checked');
        if (themeRadios.length === 0) return false;
        
        // Check if beneficiary types are selected
        const beneficiaryCheckboxes = cbeForm.querySelectorAll('input[name="typeOfBeneficiaryAttendedCbe"]:checked');
        if (beneficiaryCheckboxes.length === 0) return false;
        
        // Check if service providers are selected
        const serviceProviderCheckboxes = cbeForm.querySelectorAll('input[name="serviceProvidersPresentCbe"]:checked');
        if (serviceProviderCheckboxes.length === 0) return false;
        
        // Check if group counselling question is answered
        const counsellingRadios = cbeForm.querySelectorAll('input[name="groupCounsellingConducted"]:checked');
        if (counsellingRadios.length === 0) return false;
        
        // If group counselling is Yes, check additional fields
        const counsellingValue = counsellingRadios[0]?.value;
        if (counsellingValue === 'Yes') {
            // Check if counselling topics are selected
            const topicsCheckboxes = cbeForm.querySelectorAll('input[name="counsellingTopicsCbe"]:checked');
            if (topicsCheckboxes.length === 0) return false;
            
            // Check if counselling aids are selected
            const aidsCheckboxes = cbeForm.querySelectorAll('input[name="counsellingAidsUsed"]:checked');
            if (aidsCheckboxes.length === 0) return false;
        }
        
        return true;
    };

    // Check if basic form requirements are met for submit button
    const isFormReadyForSubmit = (values) => {
        // Check basic required fields
        const basicFields = ['state', 'district', 'block', 'icdsProject', 'sector', 'village', 'awc', 'fieldMonitorName', 'dateVisit', 'activityToObserve'];
        const basicFieldsFilled = basicFields.every(field => values[field] && values[field].toString().trim() !== '');
        
        if (!basicFieldsFilled) {
            return false;
        }
        
        // Location is optional - coordinates will fallback to (0,0) if needed
        // Remove location requirement check as fallback coordinates are acceptable
        
        // Check activity-specific requirements
        if (values.activityToObserve.includes('CBE Session')) {
            return isCBESectionValid();
        }
        
        if (values.activityToObserve.includes('Household/caregiver interaction')) {
            return (values.householdSection && values.householdSection.length > 0) && (values.section8 || values.section9 || values.section10 || values.section11);
        }
        
        // For AWC and VHSND activities, just check that an activity is selected
        // The form submission will handle detailed validation
        return true;
    };

    // Custom validation function for conditional fields - minimal validation
    const validateConditionalFields = (values) => {
        const errors = {};
        
        // Only validate household section selection
        if (values.activityToObserve && values.activityToObserve.includes('Household/caregiver interaction') && ((!values.householdSection || values.householdSection.length === 0))) {
            errors.householdSection = 'Please select at least one household section to fill';
        }
        
        return errors;
    };

    // ----- Local component to safely use hooks with Formik values -----
    const FormObserver = () => {
        const { values, setFieldValue, setErrors, errors } = useFormikContext();

        // Keep latest values for auto-save
        useEffect(() => {
            setCurrentFormValues(values);
        }, [values]);

        // Handle online/offline field logic
        useEffect(() => {
            if (values.responseMode === 'ONLINE' && !isOnline) {
                setFieldValue('responseMode', 'OFFLINE');
                setFieldValue('location', 'Location not available in offline mode');
            } else if (values.responseMode === 'OFFLINE' && isOnline && values.location === 'Location not available in offline mode') {
                setFieldValue('responseMode', 'ONLINE');
                setFieldValue('location', '');
            }
        }, [isOnline, values.responseMode, values.location, setFieldValue]);

        // Restore draft if requested
        useEffect(() => {
            if (draftToRestore && draftToRestore.formData) {
                Object.keys(draftToRestore.formData).forEach(k => {
                    setFieldValue(k, draftToRestore.formData[k]);
                });
                if (draftToRestore.coordinates) setCoordinates(draftToRestore.coordinates);
                setDraftToRestore(null);
            }
        }, [draftToRestore, setFieldValue]);

        // Update submit button state based on form readiness - with interval check for DOM changes
        useEffect(() => {
            const checkFormReadiness = () => {
                // Don't enable submit button if currently loading
                if (loadingStatus) {
                    setSubmitButtonDisabled(true);
                    return;
                }
                
                const isReady = isFormReadyForSubmit(values);
                setSubmitButtonDisabled(!isReady);
            };
            
            // Initial check
            checkFormReadiness();
            
            // Set up interval to check form state periodically for DOM-based validations
            const intervalId = setInterval(checkFormReadiness, 1000);
            
            return () => clearInterval(intervalId);
        }, [values, isOnline, loadingStatus]);

        return null;
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
            {showWhatsAppDialog && (
                <WhatsAppContact
                    open={showWhatsAppDialog}
                    onClose={() => setShowWhatsAppDialog(false)}
                    errorMessage={whatsAppErrorMessage}
                    payload={errorPayload}
                />
            )}
            <SOPViewer
                open={showSOPDialog}
                onClose={() => setShowSOPDialog(false)}
                sopFilePath="/Mobile SoP- Routine Monitoring.pptx"
                title="Routine Monitoring - Standard Operating Procedures"
            />
            {loadingStatus && <Loader />}
            <div>
                <Container maxWidth="lg">
                    <Box my={4} p={4} className={styles.paper} sx={{
                        '@media (max-width: 768px)': {
                          p: 3,
                          my: 2
                        },
                        '@media (max-width: 480px)': {
                          p: 2,
                          my: 1
                        }
                      }}>
                        <Box display="flex" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
                            <IconButton 
                                onClick={handleGoBack}
                                sx={{ mr: { xs: 1, sm: 2 } }}
                                aria-label="Go back"
                            >
                                <ArrowBack />
                            </IconButton>
                            <Typography variant="h3" className={styles.heading} sx={{
                                fontWeight: 'bold',
                                color: '#2c3e50',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
                                letterSpacing: '-0.5px',
                                flex: 1,
                                minWidth: { xs: '100%', sm: 'auto' }
                            }}>
                                {t('routineMonitoringChecklist')}
                            </Typography>
                        </Box>
                        
                        {/* SOP Viewer Card */}
                        <Box 
                            className={styles.formSection}
                            sx={{
                                mb: 3,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                                }
                            }}
                            onClick={() => setShowSOPDialog(true)}
                        >
                            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                                <Box
                                    sx={{
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: { xs: 48, sm: 56 },
                                        height: { xs: 48, sm: 56 },
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}
                                >
                                    <Description sx={{ fontSize: { xs: 28, sm: 32 } }} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}>
                                    <Typography 
                                        variant="h6" 
                                        sx={{ 
                                            fontWeight: 600, 
                                            color: '#1e3c72',
                                            mb: 0.5,
                                            fontSize: { xs: '1rem', sm: '1.25rem' }
                                        }}
                                    >
                                        Standard Operating Procedures (SOP)
                                    </Typography>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            color: '#7f8c8d',
                                            fontSize: { xs: '0.85rem', sm: '0.9rem' }
                                        }}
                                    >
                                        View the SOP document for Routine Monitoring activities
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        bgcolor: 'primary.light',
                                        color: 'primary.contrastText',
                                        px: { xs: 2, sm: 3 },
                                        py: { xs: 1, sm: 1.5 },
                                        borderRadius: 2,
                                        fontWeight: 600,
                                        fontSize: { xs: '0.85rem', sm: '0.9rem' },
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    View SOP
                                </Box>
                            </Box>
                        </Box>
                        <Formik
                            initialValues={initialValues}
                            validationSchema={getValidationSchema}
                            validate={(values) => {
                                // Custom validation for conditional fields
                                const conditionalErrors = validateConditionalFields(values);
                                return conditionalErrors;
                            }}
                            onSubmit={handleFormSubmit}
                            enableReinitialize={preferencesLoaded}
                        >
                            {({ values, handleChange, handleBlur, errors, touched, isValid, dirty, setErrors, setTouched, setFieldValue, resetForm }) => {
                                
                                return (
                                <Form autoComplete="off">
                                    {/* Auto-save indicator */}
                                    <AutoSaveIndicator
                                        lastSaved={autoSave.lastSaved}
                                        isSaving={autoSave.isSaving}
                                        isDraftRestored={autoSave.isDraftRestored}
                                        onClearDraft={autoSave.clearDraft}
                                        showDraftAlert={true}
                                    />
                                    <FormObserver />

                                    <Box className={styles.formSection}>
                                        <Box className={styles.sectionHeader}>
                                            <Box className={styles.sectionIcon}>
                                                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                                                    📋
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography className={styles.sectionTitle}>
                                                    {t('sectionGeneralInformation')}
                                                </Typography>
                                                <Typography className={styles.sectionSubtitle}>
                                                    Location, demographic and household information
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Grid container rowSpacing={3} columnSpacing={2} sx={{
                                            margin: '0',
                                            width: '100%'
                                        }}>
                                            <Grid item xs={12} sm={7} className={
                                                touched.state && !!errors.state ? styles.invalid : ''
                                            }>
                                                <label className={styles.label} htmlFor="state">
                                                    {t('state')} <span className={styles.requiredStar}>*</span>
                                                </label>
                                                <Select
                                                    size="small"
                                                    name="state"
                                                    id="state"
                                                    placeholder={t('selectOne')}
                                                    className={styles.formInput}
                                                    value={values.state}
                                                    onChange={(e) => {
                                                        const { value } = e.target;
                                                        setFieldValue("state", value);
                                                        setFieldValue("district", '');
                                                        setFieldValue("block", '');
                                                        setAddress(getStateOptions(value)[0])
                                                    }}
                                                    onBlur={handleBlur}
                                                    error={touched.state && !!errors.state}
                                                >
                                                    <MenuItem value={null} disabled>{t('selectState')}</MenuItem>
                                                    {getStateOptions().map((state, i) => (
                                                        <MenuItem key={i} value={state.text}>{state.text}</MenuItem>
                                                    ))}
                                                </Select>
                                                {touched.state && errors.state ? (
                                                    <div className={styles.error}>{errors.state}</div>
                                                ) : null}
                                            </Grid>

                                            <Grid item xs={12} sm={7} className={
                                                touched.district && !!errors.district ? styles.invalid : ''
                                            }>
                                                <label className={styles.label} htmlFor="district">
                                                    {t('district')} <span className={styles.requiredStar}>*</span>
                                                </label>
                                                <Select
                                                    size="small"
                                                    className={styles.formInput}
                                                    name="district"
                                                    id="district"
                                                    placeholder={t('selectOne')}
                                                    value={values.district}
                                                    onChange={(e) => {
                                                        const { value } = e.target;
                                                        setFieldValue("district", value);
                                                        setFieldValue("block", '');
                                                        const districtData = address.state_code ? getDistrictOptions(address.state_code).find(e => e.text === value) : null;
                                                        setAddress(districtData || {});
                                                    }}
                                                    onBlur={handleBlur}
                                                    error={touched.district && !!errors.district}
                                                >
                                                    <MenuItem value={null} disabled>{t('selectDistrict')}</MenuItem>
                                                    {values.state && address.state_code && getDistrictOptions(address.state_code).map((district, i) => (
                                                        <MenuItem key={i} value={district.text}>{district.text}</MenuItem>
                                                    ))}
                                                </Select>
                                                {touched.district && errors.district ? (
                                                    <div className={styles.error}>{errors.district}</div>
                                                ) : null}
                                            </Grid>

                                            <Grid item xs={12} sm={7} className={
                                                touched.block && !!errors.block ? styles.invalid : ''
                                            }>
                                                <label className={styles.label} htmlFor="block">
                                                    {t('blockName')} <span className={styles.requiredStar}>*</span>
                                                </label>
                                                <Select
                                                    size="small"
                                                    className={styles.formInput}
                                                    name="block"
                                                    id="block"
                                                    placeholder={t('selectOne')}
                                                    value={values.block}
                                                    onChange={(e) => {
                                                        const { value } = e.target;
                                                        setFieldValue("block", value);
                                                        const blockData = address.district_code ? getBlockOptions(address.district_code).find(e => e.text === value) : null;
                                                        setAddress(blockData || {});
                                                    }}
                                                    onBlur={handleBlur}
                                                    error={touched.block && !!errors.block}
                                                >
                                                    <MenuItem value={null} disabled>{t('selectBlock')}</MenuItem>
                                                    {values.district && address.district_code && getBlockOptions(address.district_code).map((block, i) => (
                                                        <MenuItem key={i} value={block.text}>{block.text}</MenuItem>
                                                    ))}
                                                </Select>
                                                {touched.block && errors.block ? (
                                                    <div className={styles.error}>{errors.block}</div>
                                                ) : null}
                                            </Grid>
                                            <Grid item xs={12} sm={7} className={
                                                touched.icdsProject && !!errors.icdsProject ? styles.invalid : ''
                                            }>
                                                <label className={styles.label} htmlFor="icdsProject">
                                                    {t('icdsProject')} <span className={styles.requiredStar}>*</span>
                                                </label>
                                                <TextField
                                                    size="small"
                                                    className={styles.formInput}
                                                    name="icdsProject"
                                                    id="icdsProject"
                                                    value={values.icdsProject}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.icdsProject && !!errors.icdsProject}
                                                    helperText={touched.icdsProject && errors.icdsProject}
                                                />
                                            </Grid>
        <Grid item xs={12} sm={7} className={
            touched.sector && !!errors.sector ? styles.invalid : ''
        }>
            <label className={styles.label} htmlFor="sector">
                {t('sector')} <span className={styles.requiredStar}>*</span>
            </label>
            <TextField
                size="small"
                className={styles.formInput}
                name="sector"
                id="sector"
                value={values.sector}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.sector && !!errors.sector}
                helperText={touched.sector && errors.sector}
            />
        </Grid>
        <Grid item xs={12} sm={7} className={(touched.village && !!errors.village) ? styles.invalid : ''}>
            <label className={styles.label} htmlFor="village">
                {t('village_name')} <span className={styles.requiredStar}>*</span>
            </label>
            <TextField
                size="small"
                className={styles.formInput}
                name="village"
                id="village"
                value={values.village}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.village && !!errors.village}
                helperText={touched.village && errors.village}
            />
        </Grid>

        <Grid item xs={12} sm={7} className={
            touched.awc && !!errors.awc ? styles.invalid : ''
        }>
            <label className={styles.label} htmlFor="awc">
                {t('awc')} <span className={styles.requiredStar}>*</span>
            </label>
                                                <TextField
                                                    size="small"
                                                    className={styles.formInput}
                                                    name="awc"
                                                    id="awc"
                                                    value={values.awc}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.awc && !!errors.awc}
                                                    helperText={touched.awc && errors.awc}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={7} className={
                                                touched.fieldMonitorName && !!errors.fieldMonitorName ? styles.invalid : ''
                                            }>
                                                <label className={styles.label} htmlFor="fieldMonitorName">
                                                    {t('nameOfFieldMonitor')} <span className={styles.requiredStar}>*</span>
                                                </label>
                                                <TextField
                                                    size="small"
                                                    className={styles.formInput}
                                                    name="fieldMonitorName"
                                                    id="fieldMonitorName"
                                                    value={values.fieldMonitorName}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        // Allow alphanumeric characters and spaces
                                                        if (/^[A-Za-z0-9\s]*$/.test(value)) {
                                                            handleChange(e);
                                                        }
                                                    }}
                                                    onBlur={handleBlur}
                                                    error={touched.fieldMonitorName && !!errors.fieldMonitorName}
                                                    helperText={touched.fieldMonitorName && errors.fieldMonitorName}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={7} className={
                                                touched.dateVisit && !!errors.dateVisit ? styles.invalid : ''
                                            } >
                                                <label className={styles.label} htmlFor="dateVisit">
                                                    {t('dateOfVisit')} <span className={styles.requiredStar}>*</span>
                                                </label>
                                                <TextField
                                                    size="small"
                                                    className={styles.formInput}
                                                    type="date"
                                                    name="dateVisit"
                                                    id="dateVisit"
                                                    value={values.dateVisit}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    fullWidth={false}
                                                    error={touched.dateVisit && !!errors.dateVisit}
                                                    helperText={touched.dateVisit && errors.dateVisit}
                                                />
                                            </Grid>

                                            {isOnline && (
                                                <Grid
                                                    item
                                                    xs={12}
                                                    className={
                                                        touched.location && !!errors.location ? styles.invalid : ''
                                                    }>
                                                    <label className={styles.label} htmlFor="location">
                                                        {t('geoCoordinatesLocation')} <span style={{color: '#666', fontSize: '0.9em'}}>(Optional - will use coordinates if available)</span>
                                                    </label>
                                                    <TextField
                                                        size="small"
                                                        className={styles.formInput}
                                                        type="text"
                                                        name="location"
                                                        id="location"
                                                        value={values.location || 'Location will be captured automatically'}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        error={touched.location && !!errors.location}
                                                        helperText={touched.location && errors.location}
                                                        InputProps={{
                                                            readOnly: true,
                                                        }}
                                                    />
                                                </Grid>
                                            )}

                                            {isOnline && (
                                                <Grid item xs={12}>
                                                    <label className={styles.label} htmlFor="mapLocation">
                                                        {t('selectLocation') || 'Auto Location Capture'} <span style={{color: '#666', fontSize: '0.9em'}}>(Optional - fallback coordinates will be used if unavailable)</span>
                                                    </label>
                                                    <MapComponent
                                                        setCoordinates={setCoordinates}
                                                        setAddressDetails={(details) => {
                                                            setFieldValue('location', details.display_name);
                                                        }}
                                                        disableManualSelection={true}
                                                    />
                                                </Grid>
                                            )}


                                                                        <Grid item xs={12}>
                                {coordinates && (
                                    <Box sx={{ 
                                        p: 2, 
                                        backgroundColor: coordinates.lat !== 0 && coordinates.lng !== 0 ? '#e8f5e8' : '#fff3e0', 
                                        borderRadius: 1, 
                                        border: coordinates.lat !== 0 && coordinates.lng !== 0 ? '1px solid #4caf50' : '1px solid #ff9800',
                                        position: 'relative',
                                        zIndex: 1000,
                                        marginTop: 2,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: coordinates.lat !== 0 && coordinates.lng !== 0 ? '#2e7d32' : '#f57c00', mb: 1 }}>
                                            {coordinates.lat !== 0 && coordinates.lng !== 0 ? '✅ Location Captured Successfully' : '📍 Using Fallback Coordinates'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: coordinates.lat !== 0 && coordinates.lng !== 0 ? '#2e7d32' : '#f57c00' }}>
                                            <strong>Latitude:</strong> {coordinates.lat}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: coordinates.lat !== 0 && coordinates.lng !== 0 ? '#2e7d32' : '#f57c00' }}>
                                            <strong>Longitude:</strong> {coordinates.lng}
                                        </Typography>
                                        {coordinates.lat === 0 && coordinates.lng === 0 && (
                                            <Typography variant="body2" sx={{ color: '#f57c00', mt: 1, fontSize: '0.85em' }}>
                                                Location services unavailable. Form can still be submitted with fallback coordinates.
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Grid>

                                            <Grid item xs={12} className={
                                                touched.activityToObserve && !!errors.activityToObserve ? styles.invalid : ''
                                            }>
                                                <label
                                                  className={styles.label}
                                                  htmlFor="activityToObserve"
                                                  style={{ display: 'block', fontWeight: 'bold', fontSize: '1.1rem', width: '100%' }}
                                                >
                                                  {t('selectActivitiesObserve')}
                                                </label>
                                                <em style={{ display: 'block', marginBottom: 8 }}>
                                                  {t('selectOne')}
                                                </em>
                                                <RadioGroup
                                                    name="activityToObserve"
                                                    value={values.activityToObserve}
                                                    onChange={(e) => {
                                                        setFieldValue('activityToObserve', e.target.value);
                                                        // Reset household sections when activity changes
                                                        setFieldValue('section8', false);
                                                        setFieldValue('section9', false);
                                                        setFieldValue('section10', false);
                                                        setFieldValue('section11', false);
                                                        
                                                        // If selecting household/caregiver interaction, set default section8
                                                        if (e.target.value === 'Household/caregiver interaction') {
                                                            setFieldValue('householdSection', 'section8');
                                                            setFieldValue('section8', true);
                                                        }
                                                    }}
                                                >
                                                    {[
                                                        { key: 'Aanganwadi Center', label: t('aanganwadiCenter'), disabled: false },
                                                        { key: 'CBE Session', label: t('cbeSession'), disabled: false },
                                                        { key: 'VHSND Session/RI Session', label: t('vhsndSessionRISession'), disabled: false },
                                                        { key: 'Household/caregiver interaction', label: t('householdCaregiverInteraction'), disabled: false }
                                                    ].map((activity) => (
                                                        <Box key={activity.key}>
                                                            <FormControlLabel
                                                                control={
                                                                    <Radio
                                                                        value={activity.key}
                                                                        disabled={activity.disabled}
                                                                    />
                                                                }
                                                                label={activity.label}
                                                            />
                                                            {activity.key === 'Household/caregiver interaction' && values.activityToObserve === activity.key && (
                                                                <Box sx={{ ml: 4, mt: 1, mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                                                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                                                        Select one section to fill:
                                                                    </Typography>
                                                                    <RadioGroup
                                                                        name="householdSection"
                                                                        value={values.householdSection || ''}
                                                                        onChange={(e) => {
                                                                            const selectedSection = e.target.value;
                                                                            setFieldValue('householdSection', selectedSection);
                                                                            // Reset all section flags
                                                                            setFieldValue('section8', false);
                                                                            setFieldValue('section9', false);
                                                                            setFieldValue('section10', false);
                                                                            setFieldValue('section11', false);
                                                                            // Set the selected section flag
                                                                            setFieldValue(selectedSection, true);
                                                                        }}
                                                                    >
                                                                        {[
                                                                            { key: 'section8', label: 'Section 8: CMAM Child Services' },
                                                                            { key: 'section9', label: 'Section 9: Infant 0-6 Months' },
                                                                            { key: 'section10', label: 'Section 10: Child 6-8 Months' },
                                                                            { key: 'section11', label: 'Section 11: Child 9-23 Months' }
                                                                        ].map((section) => (
                                                                            <FormControlLabel
                                                                                key={section.key}
                                                                                control={
                                                                                    <Radio
                                                                                        value={section.key}
                                                                                        size="small"
                                                                                    />
                                                                                }
                                                                                label={section.label}
                                                                                sx={{ ml: 1 }}
                                                                            />
                                                                        ))}
                                                                    </RadioGroup>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    ))}
                                                </RadioGroup>
                                                {touched.activityToObserve && errors.activityToObserve ? (
                                                    <div className={styles.error}>{errors.activityToObserve}</div>
                                                ) : null}
                                            </Grid>
                                            {/* Location field*/}
                                            
                                    {/* Render sections based on selected activities with spacing */}
                                    {values.activityToObserve === 'Aanganwadi Center' && (
                                        <Grid item xs={12} sx={{ mt: 4, mb: 4, borderTop: '1px solid #e0e0e0', pt: 2 }}>
                                            <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 'bold', color: '#2196f3' }}>
                                                {t('aanganwadiCenterVisitSections')}
                                            </Typography>
                                            <AwaRegistration ref={awaRegistrationRef} />
                                            <EquipmentAvailabilityAWC ref={equipmentAvailabilityRef} />
                                            <SkillAssessment ref={skillAssessmentRef} />
                                        </Grid>
                                    )}

                                            {values.activityToObserve === 'CBE Session' && (
                                                <Grid item xs={12} sx={{ mt: 4, mb: 4, borderTop: '1px solid #e0e0e0', pt: 2 }}>
                                                    <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 'bold', color: '#2196f3' }}>
                                                        {t('cbeSessionVisitSection')}
                                                    </Typography>
                                                    <CommunityBasedEventsObservationSection />
                                                </Grid>
                                            )}
                                    
                                            {values.activityToObserve === 'VHSND Session/RI Session' && (
                                        <Grid item xs={12} sx={{ mt: 4, mb: 4, borderTop: '1px solid #e0e0e0', pt: 2 }}>
                                            <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 'bold', color: '#2196f3' }}>
                                                {t('vhsndSessionVisitSections')}
                                            </Typography>
                                            <CMAMClinicSection ref={cmamClinicRef} />
                                            <ANMCHOKnowledgeAssessmentSection ref={anmChoKnowledgeRef} />
                                        </Grid>
                                    )}
                                    
                                            {values.activityToObserve === 'Household/caregiver interaction' && (
                                        <Grid item xs={12} sx={{ mt: 4, mb: 4, borderTop: '1px solid #e0e0e0', pt: 2 }}>
                                            <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 'bold', color: '#2196f3' }}>
                                                {t('householdVisitSections')}
                                            </Typography>
                                            {values.section8 && <CMAMChildServicesSection ref={cmamChildServicesRef} />}
                                            {values.section9 && <Infant0To6MonthsSection ref={infant0To6MonthsRef} />}
                                            {values.section10 && <Child6To8MonthsSection ref={child6To8MonthsRef} />}
                                            {values.section11 && <Child9To23MonthsSection ref={child9To23MonthsRef} />}
                                        </Grid>
                                    )}

                                    {/* Submit Button */}
                                    {values.activityToObserve && values.activityToObserve.length > 0 && (
                                        <Grid item xs={12} className={styles.submitButtonContainer} 
                                            sx={{ 
                                                mt: 5, 
                                                pt: 3, 
                                                borderTop: '2px solid #e0e0e0', 
                                                display: 'flex', 
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 2
                                            }}
                                        >
                                            {canMarkTestSubmission() && (
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={isTestSubmission}
                                                            onChange={(e) => setIsTestSubmission(e.target.checked)}
                                                            color="warning"
                                                        />
                                                    }
                                                    label={t('testSubmissionLabel', {
                                                        defaultValue: 'Test submission (removed automatically after 7 days)',
                                                    })}
                                                />
                                            )}
                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                                            <Button 
                                                variant="contained" 
                                                color="primary" 
                                                type="submit" 
                                                disabled={submitButtonDisabled}
                                                className={styles.submitButton}
                                                size="large"
                                                sx={{ minWidth: '200px', py: 1.5 }}
                                            >
                                                {loadingStatus ? 
                                                    (isRetrying ? `Retrying (${retryCount}/3)...` : 'Submitting...') : 
                                                    t('submitForm')
                                                }
                                            </Button>
                                            
                                            {showSaveOfflineOption && (
                                                <Button
                                                    variant="outlined"
                                                    color="warning"
                                                    onClick={async () => {
                                                        await handleSaveOffline(values, { resetForm });
                                                    }}
                                                    disabled={loadingStatus}
                                                    size="large"
                                                    sx={{ minWidth: '200px', py: 1.5 }}
                                                >
                                                    Save Offline
                                                </Button>
                                            )}
                                            </Box>
                                        </Grid>
                                    )}
                                        </Grid>
                                    </Box>
                                </Form>
                                );
                            }}
                        </Formik>
                    </Box>
                </Container>
            </div >
        </>
    )
}

export default RoutineMonitoring
