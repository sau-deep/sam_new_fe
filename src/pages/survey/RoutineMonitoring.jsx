import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
    Alert,
} from "@mui/material";
import { Formik, Form, useFormikContext } from "formik";
import apiService from '../../services/api';
import Loader from "components/ui/Loader";
import AutoSaveIndicator from "components/ui/AutoSaveIndicator";
import { ArrowBack, ArrowForward, Check, Description } from "@mui/icons-material";
// Per-form location helpers (block-level, backend-driven + offline cache).
import { getFormLocationHelpers } from "utils/formLocations";
import useFormLocations from "hooks/useFormLocations";
import { filterNumberKeyDown } from 'utils'
import { saveOfflineForm, stableDraftKey, newClientId } from 'utils/indexDB'
import useNetworkStatus from 'utils/networkState';
import useFormAutoSave, { hasUserChanges } from 'hooks/useFormAutoSave';
import usePreventPageReload from 'hooks/usePreventPageReload';
import { captureSurveyLocation, surveyLocationMetadata } from 'utils/locationUtils';
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
import { sendSilentWhatsAppReport } from '../../utils/whatsappUtils';
import { 
    saveRoutineMonitoringPreferences, 
    loadRoutineMonitoringPreferences, 
    getTodaysDate 
} from '../../utils/routineMonitoringPreferences';
import { incrementDailyCount, isSurveyorUser, syncAfterSubmission } from '../../utils/dailySurveyCount';
import { isApiSuccess, apiErrorMessage, apiFieldErrors, isValidationFailure } from '../../utils/apiResult';
import { makeToEnglish } from './rmc/rmcSerializer';
import { collectSection, RMC_SECTION_FORM_IDS } from './rmc/collectSectionData';
import { activeSectionIds, buildRoutineRequest, missingActivitySections } from './rmc/buildRoutineRequest';
import { routineRequestLimitErrors } from './rmc/rmcLimits';
import { buildRoutineDraftValues, splitRoutineDraft, draftFingerprint } from './rmc/routineDraft';
import { describeFieldErrors, locateErrorControl } from './rmc/fieldErrorTargets';
import { createSubmissionGate, runGated } from './rmc/submissionGate';

// The SOP deck shipped in public/ (web) and in the Android app's bundled assets.
const RMC_SOP_PATH = '/Mobile_SoP_Routine_Monitoring.pptx';

const {
  getStateOptions,
  getDistrictOptions,
  getBlockOptions,
  getDistrictOptionsByStateName,
  getBlockOptionsByDistrictName,
} = getFormLocationHelpers("ROUTINE_MONITORING");

/** Re-derive location codes from selected labels so payload always has codes. */
function enrichRoutineMonitoringLocationCodes(v) {
  if (!v) return v;
  const out = { ...v };
  if (out.state) {
    const stateOpt = getStateOptions(out.state)?.[0];
    if (stateOpt?.state_code != null && stateOpt.state_code !== "") {
      out.stateCode = String(stateOpt.state_code);
    }
  }
  if (out.state && out.district) {
    const districtOpt = getDistrictOptionsByStateName(out.state)?.find((d) => d.text === out.district);
    if (districtOpt?.district_code != null && districtOpt.district_code !== "") {
      out.districtCode = String(districtOpt.district_code).padStart(3, "0");
    }
  }
  if (out.state && out.district && out.block) {
    const blockOpt = getBlockOptionsByDistrictName(out.state, out.district)?.find((b) => b.text === out.block);
    if (blockOpt?.block_code != null && blockOpt.block_code !== "") {
      out.blockCode = String(blockOpt.block_code).padStart(4, "0");
    }
  }
  return out;
}

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
    // Load this form's active locations (online -> backend + cache, offline -> cache).
    useFormLocations("ROUTINE_MONITORING");

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
    const [formHasUserChanges, setFormHasUserChanges] = useState(false);
    const [draftToRestore, setDraftToRestore] = useState(null);
    const [preferencesLoaded, setPreferencesLoaded] = useState(false);
    const [savedPreferences, setSavedPreferences] = useState({});
    const formKey = useRef(stableDraftKey('routinemonitoring')).current; // Stable per form type + account, so the draft is found again after reopening
    const formikRef = useRef(null);
    // The request built by the last Submit; Retry and Save Offline reuse it:
    // { request, values, fingerprint, clientSubmissionId, sent }.
    const preparedRef = useRef(null);
    const [submitProblems, setSubmitProblems] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    // Synchronous guard: one attempt at a time and nothing after a confirmed save.
    const submitGateRef = useRef(null);
    if (!submitGateRef.current) submitGateRef.current = createSubmissionGate();

    // Section answers live in each section's own state; they report them here so
    // autosave stores them and a restored draft can rehydrate them (audit A06).
    const sectionDraftsRef = useRef({});
    const sectionDirtyRef = useRef({});
    const snapshotTimerRef = useRef(null);
    const [sectionSnapshots, setSectionSnapshots] = useState({});
    const [sectionsDirty, setSectionsDirty] = useState(false);
    const [restoredSections, setRestoredSections] = useState({});
    const [sectionEpoch, setSectionEpoch] = useState(0);
    const cbeRef = useRef(null);

    const handleSectionDraftChange = useCallback((sectionId, sectionValues, dirty) => {
        if (sectionValues === undefined) {
            delete sectionDraftsRef.current[sectionId];
            delete sectionDirtyRef.current[sectionId];
        } else {
            sectionDraftsRef.current[sectionId] = sectionValues;
            sectionDirtyRef.current[sectionId] = !!dirty;
        }
        if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
        snapshotTimerRef.current = setTimeout(() => {
            setSectionSnapshots({ ...sectionDraftsRef.current });
            setSectionsDirty(Object.values(sectionDirtyRef.current).some(Boolean));
        }, 500);
    }, []);

    useEffect(() => () => {
        if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    }, []);
    
    const awaRegistrationRef = useRef(null);
    const equipmentAvailabilityRef = useRef(null);
    const skillAssessmentRef = useRef(null);
    const cmamClinicRef = useRef(null);
    const anmChoKnowledgeRef = useRef(null);
    const cmamChildServicesRef = useRef(null);
    const infant0To6MonthsRef = useRef(null);
    const child6To8MonthsRef = useRef(null);
    const child9To23MonthsRef = useRef(null);
    
    // Full questionnaire for autosave: top-level values, selected activity and
    // household section, every mounted section's answers and the form step.
    const autoSaveValues = useMemo(
        () => buildRoutineDraftValues(currentFormValues, { sections: sectionSnapshots, step }),
        [currentFormValues, sectionSnapshots, step]
    );

    // Auto-save hook at component level
    const autoSave = useFormAutoSave(
        'routinemonitoring',
        formKey,
        autoSaveValues,
        coordinates,
        (formHasUserChanges || sectionsDirty) && !submitted, // only once the surveyor has entered something
        3000 // Save every 3 seconds
    );
    
    // Prevent accidental page reload
    const { confirmNavigation } = usePreventPageReload(
        hasUnsavedChanges,
        "You have unsaved form data. Are you sure you want to leave?"
    );

    // Track if form has been modified
    useEffect(() => {
        // Prefilled values don't count; a restored draft still needs reload protection.
        setHasUnsavedChanges((formHasUserChanges || sectionsDirty) && !submitted);
    }, [formHasUserChanges, sectionsDirty, submitted]);
    
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
                                    const blockData = getBlockOptions(districtData.state_code, districtData.district_code).find(b => b.text === preferences.block);
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

    // Check for an existing draft once saved preferences are in place, so a
    // Formik re-initialisation from preferences cannot overwrite the restored answers.
    const draftCheckedRef = useRef(false);
    useEffect(() => {
        if (!preferencesLoaded || draftCheckedRef.current) return;
        draftCheckedRef.current = true;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferencesLoaded]);

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
                const locationData = await captureSurveyLocation();
                setCoordinates(locationData);
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
        stateCode: '',
        block: savedPreferences.block || 'Agra',
        blockCode: '',
        district: savedPreferences.district || 'Agra',
        districtCode: '',
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
    


    // ----- Submission (audit F01 / W1) -----------------------------------------
    // One preparation step validates the active sections, reads their answers,
    // resolves location codes and builds the complete request. Submit, Retry and
    // Save Offline all send that same prepared request.

    const sectionRefs = {
        awaRegistration: awaRegistrationRef,
        equipmentAvailability: equipmentAvailabilityRef,
        skillAssessment: skillAssessmentRef,
        cbe: cbeRef,
        cmamClinic: cmamClinicRef,
        anmChoKnowledge: anmChoKnowledgeRef,
        section8: cmamChildServicesRef,
        section9: infant0To6MonthsRef,
        section10: child6To8MonthsRef,
        section11: child9To23MonthsRef,
    };

    const sectionIncompleteMessage = (sectionId) => {
        switch (sectionId) {
            case 'awaRegistration':
                return t('awaRegistrationSectionIncomplete') || "Please complete all required fields in Section 2 - SAM Children Identification and CMAM Enrollment";
            case 'equipmentAvailability':
                return t('equipmentAvailabilitySectionIncomplete') ||
                    "Please complete all required fields in Section 3 - Equipment/Supplies Availability. Check: Digital Weighing Scale, Salter Scale, Infantometer, Stadiometer, Supplementary Nutrition, Register Availability, Poshan Tracker Status, Amoxycillin Syrup, Folic Acid Tablet, Albendazole, Vitamin A, IFA Syrup, Multivitamin Syrup, Zinc, ORS, Paracetamol";
            case 'skillAssessment':
                return t('skillAssessmentSectionIncomplete') || "Please complete all required fields in Section 4 - Skill Assessment";
            case 'cbe':
                return "Please complete all required fields in Section 5 - Community Based Events, including the 'Other' details";
            case 'cmamClinic':
                return t('cmamClinicSectionIncomplete') || "Please complete all required fields in Section 6 - VHSND CMAM Clinic";
            case 'anmChoKnowledge':
                return t('anmChoKnowledgeSectionIncomplete') || "Please complete all required fields in Section 7 - ANM/CHO Knowledge Assessment";
            case 'section8':
                return t('cmamChildServicesSectionIncomplete') || "Please complete all required fields in Section 8 - CMAM Child Services";
            case 'section9':
                return t('infant0To6MonthsSectionIncomplete') || "Please complete all required fields in Section 9 - Infant 0-6 Months";
            case 'section10':
                return t('child6To8MonthsSectionIncomplete') || "Please complete all required fields in Section 10 - Child 6-8 Months";
            case 'section11':
                return t('child9To23MonthsSectionIncomplete') || "Please complete all required fields in Section 11 - Child 9-23 Months";
            default:
                return t('pleaseCompleteRequiredFields') || "Please complete all required fields";
        }
    };

    /** Answers currently held by the mounted sections (for the draft and the prepared-request check). */
    const liveSectionDrafts = (values) => {
        const out = {};
        activeSectionIds(values).forEach((id) => {
            const state = sectionRefs[id]?.current?.getDraftState?.();
            if (state) out[id] = state;
        });
        return out;
    };

    const scrollToElement = (el) => {
        if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        }
    };

    /**
     * Validate, collect and build. Returns { ok: true, request } or
     * { ok: false, message, focusFormId?, fieldErrors? }. Never sends anything.
     */
    const prepareRoutineSubmission = (values) => {
        const sectionIds = activeSectionIds(values);

        // Show every active section's own errors, report the first failing one.
        let firstInvalid = null;
        sectionIds.forEach((id) => {
            const ref = sectionRefs[id];
            const valid = ref?.current?.triggerValidation ? ref.current.triggerValidation() : true;
            if (!valid && !firstInvalid) firstInvalid = id;
        });
        if (firstInvalid) {
            return { ok: false, message: sectionIncompleteMessage(firstInvalid), focusFormId: RMC_SECTION_FORM_IDS[firstInvalid] };
        }

        const toEnglish = makeToEnglish(t);
        const sections = {};
        sectionIds.forEach((id) => { sections[id] = collectSection(id, { toEnglish }); });

        const request = buildRoutineRequest({
            values,
            coordinates,
            sections,
            isTestData: canMarkTestSubmission() && isTestSubmission,
            enrichLocation: enrichRoutineMonitoringLocationCodes,
            locationMetadata: surveyLocationMetadata,
        });

        const limitErrors = routineRequestLimitErrors(request);
        if (Object.keys(limitErrors).length > 0) {
            return { ok: false, message: Object.values(limitErrors)[0], fieldErrors: limitErrors };
        }
        const missing = missingActivitySections(request);
        if (missing.length > 0) {
            return { ok: false, message: t('pleaseCompleteRequiredFields') || "Please complete the questions for the selected activity" };
        }
        return { ok: true, request };
    };

    const showProblems = (fieldErrors) => {
        const described = describeFieldErrors(fieldErrors);
        setSubmitProblems(described);
        const formik = formikRef.current;
        described.filter((d) => d.topLevelField && formik).forEach((d) => {
            formik.setFieldTouched(d.topLevelField, true, false);
            formik.setFieldError(d.topLevelField, d.message);
        });
        if (described.length > 0) {
            setTimeout(() => scrollToElement(locateErrorControl(described[0])), 200);
        }
    };

    const showPrepareError = (prepared) => {
        setShowSnackBar(true);
        setSnackBarMessage({ text: prepared.message, type: "error" });
        if (prepared.fieldErrors) {
            showProblems(prepared.fieldErrors);
        } else if (prepared.focusFormId) {
            setTimeout(() => scrollToElement(document.getElementById(prepared.focusFormId)), 200);
        }
    };

    /**
     * The prepared submission when the answers are unchanged since it was built,
     * else a freshly validated one. One clientSubmissionId per prepared
     * submission (A08): a retry or post-failure offline save of a request that
     * was already sent reuses it, so the server can recognise a lost acknowledgement.
     */
    const resolvePreparedRequest = (values) => {
        const fingerprint = draftFingerprint(
            { ...values, isTestData: canMarkTestSubmission() && isTestSubmission },
            liveSectionDrafts(values)
        );
        const snapshot = preparedRef.current;
        if (snapshot && snapshot.fingerprint === fingerprint) {
            return { ok: true, snapshot };
        }
        const prepared = prepareRoutineSubmission(values);
        if (!prepared.ok) return prepared;
        preparedRef.current = {
            request: prepared.request,
            values,
            fingerprint,
            clientSubmissionId: newClientId(),
            sent: false,
        };
        return { ok: true, snapshot: preparedRef.current };
    };

    // Id for an offline save: the sent attempt's id, or none (the queue makes a new one).
    const offlineIdFor = (snapshot) => (snapshot?.sent ? snapshot.clientSubmissionId : undefined);

    /**
     * After a confirmed send or queue: close the gate at once (no second send or
     * queue of the same answers), keep Submit/Retry/Save Offline disabled, and
     * only reset the form and drop the prepared request when navigating away.
     */
    const finishSubmission = async (resetForm, successText, navigateAfterMs) => {
        submitGateRef.current.succeed();
        setSubmitted(true);
        setSubmitButtonDisabled(true);
        setHasUnsavedChanges(false);
        setShowSaveOfflineOption(false);
        setSubmitProblems([]);
        await autoSave.clearDraft(); // submitted or queued — don't offer it for restore too
        setShowSnackBar(true);
        setSnackBarMessage({ text: successText, type: "success" });
        setTimeout(() => {
            if (typeof resetForm === 'function') resetForm();
            preparedRef.current = null;
            navigate("/surveys", { replace: true });
        }, navigateAfterMs);
    };

    /**
     * Queue a prepared request for upload. `resetForm` must be Formik's reset
     * function. If the device cannot store it (C11), the form and every
     * section keep their answers and an error is shown.
     */
    const queueRoutineRequest = async (request, resetForm, clientSubmissionId) => {
        const reset = typeof resetForm === 'function' ? resetForm : formikRef.current?.resetForm;
        // After a sent attempt (A08) queue the byte-identical request with its id, so a
        // replay of an already-saved submission returns the original result. A fresh
        // offline save is marked 'offline' and gets a new id from the queue.
        const data = clientSubmissionId ? request : { ...request, responseMode: 'offline' };
        setLoadingStatus(true);
        setSubmitButtonDisabled(true);
        try {
            await saveOfflineForm({ url: '/form/routine', data, clientSubmissionId });
        } catch {
            setLoadingStatus(false);
            setSubmitButtonDisabled(false);
            setShowSnackBar(true);
            setSnackBarMessage({
                text: "Could not save the survey on this device. Your answers are still on screen — free some storage and try again.",
                type: "error",
            });
            return false;
        }
        setLoadingStatus(false);
        await finishSubmission(reset, "Form saved offline. It will sync when you're back online.", 2000);
        return true;
    };

    const showServerValidationFailure = (resOrError) => {
        const backendMessage = apiErrorMessage(resOrError, "Some answers were not accepted. Please check them and submit again.");
        setShowSaveOfflineOption(false); // the same answers would be rejected again on upload
        setShowSnackBar(true);
        setSnackBarMessage({ text: `Submission not accepted: ${backendMessage}`, type: "error" });
        const fieldErrors = apiFieldErrors(resOrError);
        if (Object.keys(fieldErrors).length > 0) {
            showProblems(fieldErrors);
        } else {
            setSubmitProblems([{ path: '', message: backendMessage, topLevelField: null, formIds: [], controlNames: [] }]);
        }
    };

    /** Send a prepared submission. Answers stay on screen unless the server confirms the save. */
    const sendRoutineRequest = async (snapshot, resetForm) => {
        const { request, values: formValues, clientSubmissionId } = snapshot;
        const reset = typeof resetForm === 'function' ? resetForm : formikRef.current?.resetForm;
        setLoadingStatus(true);
        setSubmitButtonDisabled(true);
        try {
            // From here on the server may have this submission even if no answer arrives.
            snapshot.sent = true;
            const res = await apiService.post('/form/routine', request, { params: { clientSubmissionId } });

            if (isApiSuccess(res)) {
                try {
                    await saveRoutineMonitoringPreferences(formValues || {});
                } catch (error) {
                    console.error('Error saving preferences:', error);
                }

                if (isSurveyorUser()) {
                    try {
                        incrementDailyCount(null, 'routine');
                        syncAfterSubmission(apiService, 'routine').catch((error) => {
                            console.error('Error syncing daily count with API:', error);
                        });
                    } catch (error) {
                        console.error('Error updating daily count:', error);
                    }
                }

                await finishSubmission(reset, t('formSubmittedSuccessfully'), 1000);
            } else if (isValidationFailure(res)) {
                showServerValidationFailure(res);
            } else {
                const backendMessage = apiErrorMessage(res, "Form submission failed");
                const errorStatusCode = res?.statusCode || 'Unknown';
                setShowSnackBar(true);
                setSnackBarMessage({ text: `Submission failed: ${backendMessage}`, type: "error" });
                setShowSaveOfflineOption(true);
                setWhatsAppErrorMessage(`Backend Error (${errorStatusCode}): ${backendMessage}`);
                setErrorPayload(request);
                setShowWhatsAppDialog(true);
            }
        } catch (error) {
            console.error('RoutineMonitoring form submission error:', error);
            const statusCode = error.response?.status || error.status;

            if (statusCode === 401 || statusCode === 403) {
                setShowSnackBar(true);
                setSnackBarMessage({ text: "Session expired. Please login again.", type: "error" });
                setShowSaveOfflineOption(true);
                return;
            }
            if (isValidationFailure(error)) {
                showServerValidationFailure(error);
                return;
            }

            const backendMessage = apiErrorMessage(error, 'Network error');
            setShowSaveOfflineOption(true);
            setShowSnackBar(true);
            setSnackBarMessage({ text: `Error: ${backendMessage}`, type: "error" });
            const errorType = statusCode >= 500 ? 'Server Error' : 'Network/Connection Error';
            setWhatsAppErrorMessage(`${errorType} (${statusCode || 'Unknown'}): ${backendMessage}`);
            setErrorPayload(request);
            setShowWhatsAppDialog(true);
        } finally {
            setLoadingStatus(false);
            // After a confirmed save Submit stays disabled until the page navigates away.
            if (!submitGateRef.current.isDone) setSubmitButtonDisabled(false);
        }
    };

    // Formik onSubmit: prepare once, then send (online) or queue (offline).
    const handleFormSubmit = (values, { resetForm }) => runGated(submitGateRef.current, async () => {
        setSubmitProblems([]);
        setShowSaveOfflineOption(false);
        setIsRetrying(false);

        // Unchanged answers after a failed attempt reuse that attempt's request and id.
        const resolved = resolvePreparedRequest(values);
        if (!resolved.ok) {
            showPrepareError(resolved);
            return;
        }

        if (!isOnline) {
            await queueRoutineRequest(resolved.snapshot.request, resetForm, offlineIdFor(resolved.snapshot));
            return;
        }
        await sendRoutineRequest(resolved.snapshot, resetForm);
    });

    // Post-failure "Save Offline": queue the prepared request (rebuilt only if answers changed).
    const handleSaveOfflineAfterFailure = (values, resetForm) => runGated(submitGateRef.current, async () => {
        const resolved = resolvePreparedRequest(values);
        if (!resolved.ok) {
            showPrepareError(resolved);
            return;
        }
        await queueRoutineRequest(resolved.snapshot.request, resetForm, offlineIdFor(resolved.snapshot));
    });

    // Post-failure "Retry": resend the prepared request (rebuilt only if answers changed).
    const handleRetryAfterFailure = (values, resetForm) => runGated(submitGateRef.current, async () => {
        const resolved = resolvePreparedRequest(values);
        if (!resolved.ok) {
            showPrepareError(resolved);
            return;
        }
        setIsRetrying(true);
        setRetryCount((c) => c + 1);
        setShowSaveOfflineOption(false);
        try {
            await sendRoutineRequest(resolved.snapshot, resetForm);
        } finally {
            setIsRetrying(false);
        }
    });

    // Consent and error handling functions
    const handleConsentGiven = () => {
        setShowConsentDialog(false);
        if (pendingErrorReport) {
            const { formType, errorMessage, payload } = pendingErrorReport;
            sendSilentWhatsAppReport(formType, errorMessage, payload);
            setPendingErrorReport(null);
        }
    };

    // Error dialog handlers — they reuse the prepared request and Formik's own reset function.
    const handleErrorDialogClose = () => {
        setShowErrorDialog(false);
        setCurrentError(null);
    };

    const handleRetry = async () => {
        setShowErrorDialog(false);
        const formik = formikRef.current;
        if (!formik) return;
        await handleRetryAfterFailure(formik.values, formik.resetForm);
    };

    const handleErrorSaveOffline = async () => {
        const formik = formikRef.current;
        if (!formik) return;
        await handleSaveOfflineAfterFailure(formik.values, formik.resetForm);
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

        // When "Others" is chosen, its "please specify" text is mandatory
        const isOtherTextMissing = (optionName, otherValue, otherInputName) => {
            const otherChecked = cbeForm.querySelector(`input[name="${optionName}"][value="${otherValue}"]:checked`);
            if (!otherChecked) return false;
            const otherInput = cbeForm.querySelector(`input[name="${otherInputName}"]`);
            return !otherInput || otherInput.value.trim() === '';
        };
        if (isOtherTextMissing('themeOfCbe', 'Others', 'themeOfCbeOther')) return false;
        if (isOtherTextMissing('typeOfBeneficiaryAttendedCbe', 'others', 'typeOfBeneficiaryAttendedCbeOther')) return false;
        if (isOtherTextMissing('serviceProvidersPresentCbe', 'others', 'serviceProvidersPresentCbeOther')) return false;

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

            if (isOtherTextMissing('counsellingTopicsCbe', 'others', 'counsellingTopicsCbeOther')) return false;
            if (isOtherTextMissing('counsellingAidsUsed', 'others', 'counsellingAidsUsedOther')) return false;
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
        const { values, initialValues, setFieldValue, setErrors, errors } = useFormikContext();

        // Keep latest values for auto-save
        useEffect(() => {
            setCurrentFormValues(values);
            setFormHasUserChanges(hasUserChanges(values, initialValues));
        }, [values, initialValues]);

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

        // Restore draft if requested: top-level values (incl. the selected activity
        // and household section), then remount the sections with their saved answers.
        useEffect(() => {
            if (draftToRestore && draftToRestore.formData) {
                const { values: savedValues, sections: savedSections, step: savedStep } = splitRoutineDraft(draftToRestore.formData);
                Object.keys(savedValues).forEach(k => {
                    setFieldValue(k, savedValues[k]);
                });
                setRestoredSections(savedSections);
                setSectionEpoch((e) => e + 1);
                setStep(savedStep);
                if (draftToRestore.coordinates) setCoordinates(draftToRestore.coordinates);
                setDraftToRestore(null);
            }
        }, [draftToRestore, setFieldValue]);

        // Update submit button state based on form readiness - with interval check for DOM changes
        useEffect(() => {
            const checkFormReadiness = () => {
                // Don't enable submit button while loading, or once this survey was saved
                if (loadingStatus || submitted || submitGateRef.current.isDone) {
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
        }, [values, isOnline, loadingStatus, submitted]);

        return null;
    };

    const sectionDraftProps = (sectionId) => ({
        sectionId,
        initialDraft: restoredSections[sectionId],
        onDraftChange: handleSectionDraftChange,
    });

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
                sopFilePath={RMC_SOP_PATH}
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
                            innerRef={formikRef}
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
                                                        const stateData = getStateOptions(value)[0];
                                                        setFieldValue("state", value);
                                                        setFieldValue("district", '');
                                                        setFieldValue("block", '');
                                                        setFieldValue("stateCode", stateData?.state_code != null ? stateData.state_code.toString() : '');
                                                        setFieldValue("districtCode", '');
                                                        setFieldValue("blockCode", '');
                                                        setAddress(stateData || {});
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
                                                        const districtData = address.state_code ? getDistrictOptions(address.state_code).find(e => e.text === value) : null;
                                                        setFieldValue("district", value);
                                                        setFieldValue("block", '');
                                                        setFieldValue("districtCode", districtData?.district_code != null ? districtData.district_code.toString() : '');
                                                        setFieldValue("blockCode", '');
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
                                                        const blockData = address.district_code ? getBlockOptions(address.state_code, address.district_code).find(e => e.text === value) : null;
                                                        setFieldValue("block", value);
                                                        setFieldValue("blockCode", blockData?.block_code != null ? blockData.block_code.toString() : '');
                                                        setAddress(blockData || {});
                                                    }}
                                                    onBlur={handleBlur}
                                                    error={touched.block && !!errors.block}
                                                >
                                                    <MenuItem value={null} disabled>{t('selectBlock')}</MenuItem>
                                                    {values.district && address.district_code && getBlockOptions(address.state_code, address.district_code).map((block, i) => (
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
                                                        surveyPosition={coordinates}
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
                                                        setRestoredSections({}); // a restored draft only applies to the sections it was saved with
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
                                                                            setRestoredSections({});
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
                                            <AwaRegistration key={`awaRegistration-${sectionEpoch}`} ref={awaRegistrationRef} {...sectionDraftProps('awaRegistration')} />
                                            <EquipmentAvailabilityAWC key={`equipmentAvailability-${sectionEpoch}`} ref={equipmentAvailabilityRef} {...sectionDraftProps('equipmentAvailability')} />
                                            <SkillAssessment key={`skillAssessment-${sectionEpoch}`} ref={skillAssessmentRef} {...sectionDraftProps('skillAssessment')} />
                                        </Grid>
                                    )}

                                            {values.activityToObserve === 'CBE Session' && (
                                                <Grid item xs={12} sx={{ mt: 4, mb: 4, borderTop: '1px solid #e0e0e0', pt: 2 }}>
                                                    <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 'bold', color: '#2196f3' }}>
                                                        {t('cbeSessionVisitSection')}
                                                    </Typography>
                                                    <CommunityBasedEventsObservationSection key={`cbe-${sectionEpoch}`} ref={cbeRef} {...sectionDraftProps('cbe')} />
                                                </Grid>
                                            )}
                                    
                                            {values.activityToObserve === 'VHSND Session/RI Session' && (
                                        <Grid item xs={12} sx={{ mt: 4, mb: 4, borderTop: '1px solid #e0e0e0', pt: 2 }}>
                                            <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 'bold', color: '#2196f3' }}>
                                                {t('vhsndSessionVisitSections')}
                                            </Typography>
                                            <CMAMClinicSection key={`cmamClinic-${sectionEpoch}`} ref={cmamClinicRef} {...sectionDraftProps('cmamClinic')} />
                                            <ANMCHOKnowledgeAssessmentSection key={`anmChoKnowledge-${sectionEpoch}`} ref={anmChoKnowledgeRef} {...sectionDraftProps('anmChoKnowledge')} />
                                        </Grid>
                                    )}
                                    
                                            {values.activityToObserve === 'Household/caregiver interaction' && (
                                        <Grid item xs={12} sx={{ mt: 4, mb: 4, borderTop: '1px solid #e0e0e0', pt: 2 }}>
                                            <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 'bold', color: '#2196f3' }}>
                                                {t('householdVisitSections')}
                                            </Typography>
                                            {values.section8 && <CMAMChildServicesSection key={`section8-${sectionEpoch}`} ref={cmamChildServicesRef} {...sectionDraftProps('section8')} />}
                                            {values.section9 && <Infant0To6MonthsSection key={`section9-${sectionEpoch}`} ref={infant0To6MonthsRef} {...sectionDraftProps('section9')} />}
                                            {values.section10 && <Child6To8MonthsSection key={`section10-${sectionEpoch}`} ref={child6To8MonthsRef} {...sectionDraftProps('section10')} />}
                                            {values.section11 && <Child9To23MonthsSection key={`section11-${sectionEpoch}`} ref={child9To23MonthsRef} {...sectionDraftProps('section11')} />}
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
                                                disabled={submitButtonDisabled || submitted}
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
                                                    color="primary"
                                                    onClick={async () => {
                                                        await handleRetryAfterFailure(values, resetForm);
                                                    }}
                                                    disabled={loadingStatus || submitted}
                                                    size="large"
                                                    sx={{ minWidth: '200px', py: 1.5 }}
                                                >
                                                    Retry
                                                </Button>
                                            )}
                                            {showSaveOfflineOption && (
                                                <Button
                                                    variant="outlined"
                                                    color="warning"
                                                    onClick={async () => {
                                                        await handleSaveOfflineAfterFailure(values, resetForm);
                                                    }}
                                                    disabled={loadingStatus || submitted}
                                                    size="large"
                                                    sx={{ minWidth: '200px', py: 1.5 }}
                                                >
                                                    Save Offline
                                                </Button>
                                            )}
                                            </Box>
                                            {submitProblems.length > 0 && (
                                                <Alert severity="error" sx={{ width: '100%', maxWidth: 720 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                        Please correct these answers (your other answers are kept):
                                                    </Typography>
                                                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                                        {submitProblems.map((p, i) => (
                                                            <li key={`${p.path}-${i}`}>
                                                                <Box
                                                                    component="span"
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                    onClick={() => scrollToElement(locateErrorControl(p))}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') scrollToElement(locateErrorControl(p)); }}
                                                                >
                                                                    {p.field || p.topLevelField ? `${p.field || p.topLevelField}: ` : ''}{p.message}
                                                                </Box>
                                                            </li>
                                                        ))}
                                                    </Box>
                                                </Alert>
                                            )}
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
