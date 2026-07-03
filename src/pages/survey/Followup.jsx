import React, {useState, useEffect, useRef} from "react";
import Switch from '@mui/material/Switch';
import {useNavigate, useLocation} from "react-router-dom";
import styles from "./survey.module.css";
import * as Yup from "yup";
import useNetworkStatus from 'utils/networkState';
import {
    Box,
    Button,
    Checkbox,
    Container,
    FormControlLabel,
    FormGroup,
    Grid,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    TextareaAutosize,
    TextField,
    Typography,
    IconButton,
} from "@mui/material";
import {Form, Formik} from "formik";
import apiService from '../../services/api';
import Loader from "components/ui/Loader";
import SnackBar from "components/ui/SnackBar";
import WhatsAppContact from "components/ui/WhatsAppContact";
import {ArrowBack, ArrowForward, Check} from "@mui/icons-material";
// Per-form location helpers (block-level, backend-driven + offline cache).
import { getFormLocationHelpers } from "utils/formLocations";
import useFormLocations from "hooks/useFormLocations";
import {useTranslation} from "react-i18next";
import { useFormTranslation } from "hooks/useFormTranslation";
import {filterNumberKeyDown} from 'utils'
import {saveOfflineForm} from 'utils/indexDB'
import usePreventPageReload from 'hooks/usePreventPageReload';
import { getLocationWithFallback } from 'utils/locationUtils';

import { useFormikContext } from "formik";
import ErrorReportingDialog from '../../components/ui/ErrorReportingDialog';
import ConsentDialog from '../../components/ui/ConsentDialog';
import { sendSilentWhatsAppReport, createErrorMessage } from '../../utils/whatsappUtils';
import { getConsentStatus } from '../../utils/consentManager';
import { incrementDailyCount, isSurveyorUser, syncAfterSubmission } from '../../utils/dailySurveyCount';

const { getDistrictOptions, getStateOptions, getBlockOptions } =
  getFormLocationHelpers("FOLLOWUP");

// Validation schemas for each step
const step1ValidationSchema = Yup.object({
    state: Yup.string().required("This is required field"),
    district: Yup.string().required("This is required field"),
    block: Yup.string().required("This is required field"),
    village: Yup.string().max(150, "Maximum 150 characters allowed").required("This is required field"),
    icdsProject: Yup.string().max(150, "Maximum 150 characters allowed").required("This is required field"),
    childCode: Yup.string().required("This is required field"),
    visitDate: Yup.string().required("This is required field"),
    nameOfRespondent: Yup.string().required("This is required field"),
    sexOfRespondent: Yup.string().required("This is required field"),
    ageRespondent: Yup.string().required("This is required field"),
    educationRespondent: Yup.string().required("This is required field"),
    sexOfRespondent_other: Yup.string().test(
        'conditional-required',
        'This is a required field',
        function (value) {
            const {sexOfRespondent} = this.parent;
            return sexOfRespondent !== 'Other' || (value && value.trim() !== '');
        }
    ),

});

const step2ValidationSchema = Yup.object({
    childSex: Yup.string().required("This is required field"),
    childDob: Yup.string().required("This is required field"),
    childAgeMonths: Yup.string().required("This is required field"),
    birthWeight: Yup.string().required("This is required field"),
    chronicMedicalCondition: Yup.string().required("This is required field"),
    chronicMedicalConditionSpecify:Yup.string().test(
        'conditional-required',
        'This is a required field',
        function (value) {
          const { chronicMedicalCondition } = this.parent;
          return !((chronicMedicalCondition === 'Yes') && (!value || value.trim() === ''));
        }
    ),

    childWeightLast1Month: Yup.string().required("This is required field"),
    weightMeasuredTimes:Yup.string().test(
        'conditional-required',
        'This is a required field',
        function (value) {
          const { childWeightLast1Month } = this.parent;
          return !((childWeightLast1Month === 'Yes') && (!value || value.trim() === ''));
        }
    ),
    childHeightLast1Month: Yup.string().required("This is required field"),
    heightMeasuredTimes:Yup.string().test(
        'conditional-required',
        'This is a required field',
        function (value) {
          const { childHeightLast1Month } = this.parent;
          return !((childHeightLast1Month === 'Yes') && (!value || value.trim() === ''));
        }
    ),

    fedSolidOrSemisolidFood:Yup.string().required("This is required field"),

    recordedWeightAtAdmission: Yup.string().required("This is required field"),

    lastRecordedWeight: Yup.string().required("This is required field"),
    lastMeasurementDate: Yup.string().required("This is required field"),
    measurementMethod: Yup.string().required("This is required field"),
    reasonNotMeasured: Yup.string().required("This is required field"),

    currentWeight: Yup.number()
        .min(1, "Must be at least 1")
        .max(99, "Must be less than 99")
        .test(
            'decimal-precision',
            'Must have at most 3 decimal places',
            value => !value || /^\d+(\.\d{1,3})?$/.test(value)
        )
        .required("This is a required field"),

    lastRecordedHeightLength: Yup.number()
        .min(40, "Must be at least 40")
        .max(130, "Must be less than 130")
        .required("This is a required field"),

    recordedHeightLengthAtAdmission: Yup.mixed()
        .test(
            'height-range',
            'Must be 40-130 or 999',
            value => !value ||
                (typeof value === 'number' && ((value >= 40 && value <= 130) || value === 999))
        )
        .required("This is a required field"),


    currentHeightLength: Yup.mixed()
        .test(
            'height-range',
            'Must be 40-130 or 999',
            value => !value ||
                (typeof value === 'number' && ((value >= 40 && value <= 130) || value === 999))
        )
        .required("This is a required field"),

    bilateralPittingOedema: Yup.string().required("This is required field"),
    receivedMedicinesFromAnmOrMo: Yup.string().required("This is required field"),
    consumedAntibiotics: Yup.string().required("This is required field"),
    consumedDewormingMedicine: Yup.string().required("This is required field"),
    consumedIronSyrup: Yup.string().required("This is required field"),
    consumedMultivitamin:Yup.string().required("This is required field"),
    awwHomeVisitsCount: Yup.string().required("This is required field"),
    toldAboutUndernutritionTreatment: Yup.string().required("This is required field"),
    referredToHealthFacility: Yup.string().required("This is required field"),
    receivedThr: Yup.string().required("This is required field"),
    ashaHomeVisitsCount:Yup.string().required("This is required field"),
});

const step3ValidationSchema = Yup.object({});

const Followup = () => {
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [address, setAddress] = useState({});
    const [showSnackBar, setShowSnackBar] = useState(false);
    const [snackBarMessage, setSnackBarMessage] = useState({text: "", type: ""});
    const isOnline = useNetworkStatus();
    // Load this form's active locations (online -> backend + cache, offline -> cache).
    useFormLocations("FOLLOWUP");
    const navigate = useNavigate();
    const location = useLocation();
    const {t} = useFormTranslation('followup');
    
    // Add retry state management
    const [retryCount, setRetryCount] = useState(0);
    const [showSaveOfflineOption, setShowSaveOfflineOption] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
    const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
    const [whatsAppErrorMessage, setWhatsAppErrorMessage] = useState('');
    const [errorPayload, setErrorPayload] = useState(null);

    // Form state management
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [currentFormValues, setCurrentFormValues] = useState({});
    
    // Add coordinates state
    const [coordinates, setCoordinates] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasValidCoordinates, setHasValidCoordinates] = useState(false);

    // Add location capture effect
    useEffect(() => {
        const getLocation = async () => {
            try {
                const locationData = await getLocationWithFallback();
                setCoordinates({ lat: locationData.lat, lng: locationData.lng });
                setHasValidCoordinates(true);

                // Show warning if using fallback coordinates
                if (locationData.fallback) {
                    // setShowSnackBar(true);
                    // setSnackBarMessage({
                    //     text: `Location error: ${locationData.error}. Using default coordinates.`,
                    //     type: "warning",
                    // });
                }
            } catch (error) {
                // This should not happen with getLocationWithFallback, but just in case
                setCoordinates({ lat: 0, lng: 0 });
                setHasValidCoordinates(true);
                // setShowSnackBar(true);
                // setSnackBarMessage({
                //     text: `Location error: ${error.message}. Using default coordinates.`,
                //     type: "warning",
                // });
            }
        };

        getLocation();
    }, []); // Empty dependency array - run only once on mount

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



    const handleGoBack = () => {
        confirmNavigation(() => {
            navigate(-1);
        });
    };

    const handleCloseSnackBar = () => {
        setShowSnackBar(false);
    };


    const [step, setStep] = useState(0);

    // Helper function to get current date
    const getCurrentDate = () => {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    };

    const initialValues = {
        responseMode: 'online',
        visitDate: getCurrentDate(),
        state: '',
        district: '',
        block: '',
        village: '',
        icdsProject: '',
        childCode: '',
        nameOfRespondent: '',
        sexOfRespondent: '',
        sexOfRespondent_other: '',
        ageRespondent: '',
        educationRespondent: '',
        childName: '',
        childSex: '',
        childDob: '',
        childAgeMonths: '',
        birthWeight: '',
        chronicMedicalCondition: '',
        childWeightLast1Month: '',
        childHeightLast1Month: '',
        recordedWeightAtAdmission: '',
        recordedHeightLengthAtAdmission: '',
        admissionMeasurementDate: '',
        lastRecordedWeight: '',
        lastRecordedHeightLength: '',
        lastMeasurementDate: '',
        measurementMethod: '',
        reasonNotMeasured: '',
        receivedThr: '',
        currentWeight: '',
        currentHeightLength: '',
        bilateralPittingOedema: '',
        relevantInfo: '',
        childSex_other: '',
         awwInformationDiscussed: [],
         ashaInformationDiscussed: [],
         yesterdayFoodItemsConsumed: [],
        awwInformationDiscussed_other: '',
        ashaInformationDiscussed_other: '',
        yesterdayFoodItemsConsumed_other: '',
        receivedOtherFoodAwc: '',
        receivedOtherFoodAwc_other:'',
        awwCounselingToolsUsed: '',
        ashaCounselingToolsUsed: '',
        chronicMedicalConditionSpecify_other:'',
        howToEnrichHomemadeFood_other:'',
        timesIronSyrupConsumed:'',
        consumedIronSyrup:'',
        consumedDewormingMedicine:'',
        consumedAntibiotics:'',
        receivedMedicinesFromAnmOrMo:'',
        timesMultivitaminConsumed:'',
        consumedMultivitamin:'',
        reasonLessIronSyrupConsumed:'',
        awwHomeVisitsCount:'',
        reasonLessMultivitaminConsumed:'',
        referredToHealthFacility:'',
        toldAboutUndernutritionTreatment:'',
        infoRecordsVerification:'',
        chronicMedicalConditionSpecify:'',
        receivedThrMonthsCount:'',
        reasonNotReceivedThr:'',
        receivedThrSam:'',
        storeThrPacket:'',
        thrMostLiked:'',
        quantityThrEveryDay:'',
        daysThrConsumed1Month:'',
        whoConsumedThr:'',
        thrConsumed:'',
        quantityThrReceived:'',
        reasonNotConsumed:'',
        receivedOtherThr:'',
        takenToHealthFacility:'',
        admittedToHealthFacility:'',
        reasonNotTakenToHealthFacility:'',
        fedSolidOrSemisolidFood:'',
        howToEnrichHomemadeFood:'',
        timesFedSolidOrSemisolidFood:'',
        familyPresentDuringAwwVisit:'',
        familyMembersPresentDuringAwwVisit:'',
        familyPresentDuringAshaVisit:'',
        familyMembersPresentDuringAshaVisit:'',
        ashaHomeVisitsCount:'',
        weightMeasuredTimes:'',
        heightMeasuredTimes:'',
    };

     const handleNext = (values, actions) => {
    const currentValidationSchema = step === 0 ? step1ValidationSchema : step === 1 ? step2ValidationSchema : step3ValidationSchema;
    currentValidationSchema.validate(values).then((data) => {
      if (values.ageRespondent) {
        setStep((prevStep) => prevStep + 1);
      } else {
        setStep(2);
      }
      actions.setTouched({}); // Reset touched fields
    }).catch((err) => {
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
      // const element = document.querySelector('.survey_invalid__FWSPn')
      setTimeout(() => {
        const element = document.getElementsByClassName('survey_invalid__xnDLv')[0]
        element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 500);
    });
  };

    const handleBack = () => {
        setStep(0);
    };

    // Handle form submission without auto-save
    const handleSubmit = async (values, { resetForm, setSubmitting }) => {
      // If offline, save directly to IndexedDB
      if (!isOnline) {
        handleSaveOffline(values, { resetForm, setSubmitting });
        return;
      }

      // Use coordinates if available, otherwise use default (0, 0)
      const lat = coordinates?.lat || 0;
      const lng = coordinates?.lng || 0;

      // Helper function to process array fields with other option
      const processArrayWithOther = (array, otherValue) => {
        if (!Array.isArray(array)) return array || '';
        const values = [...array];
        if (otherValue && otherValue.trim() && values.includes('Other')) {
          values.splice(values.indexOf('Other'), 1);
          values.push(`Other - ${otherValue.trim()}`);
        }
        return values.join(', ');
      };

      // Helper function to process object fields (like yesterdayFoodItemsConsumed)
      const processObjectField = (obj) => {
        if (!obj) return '';
        if (Array.isArray(obj)) return '';
        if (typeof obj !== 'object') return obj || '';
        
        const entries = Object.entries(obj);
        if (entries.length === 0) return '';
        
        return entries.map(([key, value]) => `${key} - ${value}`).join(',');
      };

      // Helper function to process string fields with other option
      const processStringWithOther = (value, otherValue) => {
        if (value && value.includes('other') && otherValue && otherValue.trim()) {
          const selectedValues = value.split(', ').filter(Boolean);
          const updatedValues = selectedValues.map(item => 
            item === 'other' ? `Other - ${otherValue.trim()}` : item
          );
          return updatedValues.join(', ');
        }
        return value || '';
      };

      // Process the form data to convert arrays to strings and handle other options
      const processedValues = {
        ...values,
        // Convert array fields to strings with other option handling
        awwInformationDiscussed: processArrayWithOther(values.awwInformationDiscussed, values.awwInformationDiscussed_other),
        ashaInformationDiscussed: processArrayWithOther(values.ashaInformationDiscussed, values.ashaInformationDiscussed_other),
        yesterdayFoodItemsConsumed: processObjectField(values.yesterdayFoodItemsConsumed),
        
        // Convert string fields with other option handling
        awwCounselingToolsUsed: processStringWithOther(values.awwCounselingToolsUsed, values.awwCounselingToolsUsed_other),
        ashaCounselingToolsUsed: processStringWithOther(values.ashaCounselingToolsUsed, values.ashaCounselingToolsUsed_other),
        receivedOtherFoodAwc: processStringWithOther(values.receivedOtherFoodAwc, values.receivedOtherFoodAwc_other),
        howToEnrichHomemadeFood: processStringWithOther(values.howToEnrichHomemadeFood, values.howToEnrichHomemadeFood_other),
        
        // Handle other single field options
        sexOfRespondent: values.sexOfRespondent === 'Other' && values.sexOfRespondent_other ? 
          `Other - ${values.sexOfRespondent_other}` : values.sexOfRespondent,
        childSex: values.childSex === 'Other' && values.childSex_other ? 
          `Other - ${values.childSex_other}` : values.childSex,
        chronicMedicalConditionSpecify: values.chronicMedicalConditionSpecify === 'Other' && values.chronicMedicalConditionSpecify_other ? 
          `Other - ${values.chronicMedicalConditionSpecify_other}` : values.chronicMedicalConditionSpecify,
      };

      // Remove the _other fields from the payload
      const {
        sexOfRespondent_other,
        childSex_other,
        chronicMedicalConditionSpecify_other,
        awwInformationDiscussed_other,
        ashaInformationDiscussed_other,
        yesterdayFoodItemsConsumed_other,
        receivedOtherFoodAwc_other,
        howToEnrichHomemadeFood_other,
        awwCounselingToolsUsed_other,
        ashaCounselingToolsUsed_other,
        ...payload
      } = processedValues;

      // Add coordinates to payload
      payload.latitude = lat;
      payload.longitude = lng;
      
      setLoadingStatus(true);
      setIsRetrying(false);

      try {
        const res = await apiService.post('/form/followup', payload);
        setLoadingStatus(false);
        setSubmitting(false);
        
        // Check for actual success: only statusCode: 200 indicates success
        if (res.statusCode === 200) {
          // Increment daily count for surveyors and sync with API
          if (isSurveyorUser()) {
            try {
              incrementDailyCount(null, 'followup');
              syncAfterSubmission(apiService, 'followup').catch((error) => {
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
          const backendMessage = res.message || res.error || "Form submission failed";
          const errorStatusCode = res.statusCode || 'Unknown';
          
          setShowSnackBar(true);
          setSnackBarMessage({
            text: `Submission failed: ${backendMessage}. Please try again or save offline.`,
            type: "error",
          });
          
          // Show WhatsApp contact dialog for backend errors
          setWhatsAppErrorMessage(`Backend Error (${errorStatusCode}): ${backendMessage}`);
          setErrorPayload(payload);
          setShowWhatsAppDialog(true);
        }
      } catch (error) {
        // Handle network/server errors with improved error messages
        console.error('Followup form submission error:', error);
        const statusCode = error.response?.status || error.status;
        
        if (statusCode === 401 || statusCode === 403) {
          setShowSnackBar(true);
          setSnackBarMessage({
            text: "Session expired. Please login again.",
            type: "error",
          });
          return;
        }
        
        if (statusCode >= 500) {
          setShowSaveOfflineOption(true);
          setShowSnackBar(true);
          setSnackBarMessage({
            text: "Server error. You can save this form offline.",
            type: "error",
          });
          
          // Show WhatsApp contact dialog for server errors
          setWhatsAppErrorMessage(`Server Error (${statusCode}): Please try again later or contact support`);
          setErrorPayload(payload);
          setShowWhatsAppDialog(true);
          return;
        }
        
        const backendMessage = error.response?.data?.message || error.response?.data?.error || error.message;
        setShowSaveOfflineOption(true);
        setShowSnackBar(true);
        setSnackBarMessage({
          text: `Error: ${backendMessage}. You can save this form offline.`,
          type: "error",
        });
        
        // Show WhatsApp contact dialog for other errors
        setWhatsAppErrorMessage(`Network/Connection Error: ${backendMessage}`);
        setErrorPayload(payload);
        setShowWhatsAppDialog(true);
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
      setCurrentError(error);
      setCurrentPayload(payload);
      setShowErrorDialog(true);
    };

    const handleSubmissionError = (error, payload, resetForm, setSubmitting) => {
      console.error('Form submission error:', error);
      setLoadingStatus(false);
      setSubmitting(false);
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

    const handleSaveOffline = async (values, { resetForm, setSubmitting }) => {
      // Helper function to process array fields with other option
      const processArrayWithOther = (array, otherValue) => {
        if (!Array.isArray(array)) return array || '';
        const values = [...array];
        if (otherValue && otherValue.trim() && values.includes('Other')) {
          values.splice(values.indexOf('Other'), 1);
          values.push(`Other - ${otherValue.trim()}`);
        }
        return values.join(', ');
      };

      // Helper function to process object fields (like yesterdayFoodItemsConsumed)
      const processObjectField = (obj) => {
        if (!obj) return '';
        if (Array.isArray(obj)) return '';
        if (typeof obj !== 'object') return obj || '';
        
        const entries = Object.entries(obj);
        if (entries.length === 0) return '';
        
        return entries.map(([key, value]) => `${key} - ${value}`).join(',');
      };

      // Helper function to process string fields with other option
      const processStringWithOther = (value, otherValue) => {
        if (value && value.includes('other') && otherValue && otherValue.trim()) {
          const selectedValues = value.split(', ').filter(Boolean);
          const updatedValues = selectedValues.map(item => 
            item === 'other' ? `Other - ${otherValue.trim()}` : item
          );
          return updatedValues.join(', ');
        }
        return value || '';
      };

      // Process the form data to convert arrays to strings and handle other options
      const processedValues = {
        ...values,
        // Convert array fields to strings with other option handling
        awwInformationDiscussed: processArrayWithOther(values.awwInformationDiscussed, values.awwInformationDiscussed_other),
        ashaInformationDiscussed: processArrayWithOther(values.ashaInformationDiscussed, values.ashaInformationDiscussed_other),
        yesterdayFoodItemsConsumed: processObjectField(values.yesterdayFoodItemsConsumed),
        
        // Convert string fields with other option handling
        awwCounselingToolsUsed: processStringWithOther(values.awwCounselingToolsUsed, values.awwCounselingToolsUsed_other),
        ashaCounselingToolsUsed: processStringWithOther(values.ashaCounselingToolsUsed, values.ashaCounselingToolsUsed_other),
        receivedOtherFoodAwc: processStringWithOther(values.receivedOtherFoodAwc, values.receivedOtherFoodAwc_other),
        howToEnrichHomemadeFood: processStringWithOther(values.howToEnrichHomemadeFood, values.howToEnrichHomemadeFood_other),
        
        // Handle other single field options
        sexOfRespondent: values.sexOfRespondent === 'Other' && values.sexOfRespondent_other ? 
          `Other - ${values.sexOfRespondent_other}` : values.sexOfRespondent,
        childSex: values.childSex === 'Other' && values.childSex_other ? 
          `Other - ${values.childSex_other}` : values.childSex,
        chronicMedicalConditionSpecify: values.chronicMedicalConditionSpecify === 'Other' && values.chronicMedicalConditionSpecify_other ? 
          `Other - ${values.chronicMedicalConditionSpecify_other}` : values.chronicMedicalConditionSpecify,
      };

      // Remove the _other fields from the payload
      const {
        sexOfRespondent_other,
        childSex_other,
        chronicMedicalConditionSpecify_other,
        awwInformationDiscussed_other,
        ashaInformationDiscussed_other,
        yesterdayFoodItemsConsumed_other,
        receivedOtherFoodAwc_other,
        howToEnrichHomemadeFood_other,
        awwCounselingToolsUsed_other,
        ashaCounselingToolsUsed_other,
        ...payload
      } = processedValues;

      // Use coordinates if available, otherwise use default (0, 0)
      const lat = coordinates?.lat || 0;
      const lng = coordinates?.lng || 0;

      await saveOfflineForm({ url: '/form/followup', data: { ...payload, latitude: lat, longitude: lng, responseMode: 'offline' } });

      setHasUnsavedChanges(false);
      
      resetForm();
      setShowSnackBar(true);
      setRetryCount(0);
      setShowSaveOfflineOption(false);
      setSnackBarMessage({
          text: "Form saved offline due to repeated failures. It will sync when you're online.",
          type: "warning",
      });
      setTimeout(() => {
          navigate("/survey/list", { replace: true });
      }, 3000);
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
            setShowSnackBar(true);
            setSnackBarMessage({
                text: "Connection lost. Form data will be preserved locally.",
                type: "warning",
            });
            lastNotificationTime.current = now;
        } else if (isOnline && !previousOnlineStatus.current) {
            // Just came back online
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

    // ----- Local component to safely use hooks with Formik values -----
    const FormObserver = () => {
      const { values } = useFormikContext();

      // Keep latest values for form tracking
      useEffect(() => {
        setCurrentFormValues(values);
      }, [values]);

      return null;
    };

    // Error reporting states
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [currentError, setCurrentError] = useState(null);
    const [currentPayload, setCurrentPayload] = useState(null);

    // Consent management states
    const [showConsentDialog, setShowConsentDialog] = useState(false);
    const [pendingErrorReport, setPendingErrorReport] = useState(null);

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
                        <Box display="flex" alignItems="center" mb={4}>
                            <IconButton 
                                onClick={handleGoBack}
                                sx={{ mr: 2 }}
                                aria-label="Go back"
                            >
                                <ArrowBack />
                            </IconButton>
                            <Typography variant="h3" className={styles.heading}>Followup Assessment</Typography>
                        </Box>
                        <Formik
                            initialValues={initialValues}
                            validationSchema={(values) =>
                                step === 0 ? step1ValidationSchema : step === 1 ? step2ValidationSchema : step3ValidationSchema}
                            onSubmit={handleSubmit}
                        >
                            {({
                                  values,
                                  handleChange,
                                  handleBlur,
                                  errors,
                                  touched,
                                  isValid,
                                  dirty,
                                  setErrors,
                                  setTouched,
                                  setFieldValue,
                                  resetForm
                              }) => {
                                
                                return (
                                <Form autoComplete="off">
                                    <FormObserver />

                                    {step === 0 && (
                                        <>
                                            <Box className={styles.formSection}>
                                                <Box className={styles.sectionHeader}>
                                                    <Box className={styles.sectionIcon}>
                                                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                                                            📋
                                                        </Typography>
                                                    </Box>
                                                    <Box>
                                                        <Typography className={styles.sectionTitle}>
                                                            {t('general_information')}
                                                        </Typography>
                                                        <Typography className={styles.sectionSubtitle}>
                                                            Basic location and demographic information
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Grid container rowSpacing={2} sx={{
                                                    margin: '0',
                                                    width: '100%'
                                                }}>

                                                    <Grid item xs={12} sm={7} className={{
                                                        [styles.invalid]: touched.state && !!errors.state,
                                                    }}>
                                                        <label className={styles.label} htmlFor="state">
                                                            {t('state')} <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <Select
                                                            size="small"
                                                            name="state"
                                                            id="state"
                                                            placeholder="Select one"
                                                            className={styles.formInput}
                                                            value={values.state}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                setFieldValue("state", value);
                                                                setFieldValue("district", '');
                                                                //              setFieldValue("subDistrict", '');
                                                                setAddress(getStateOptions(value)[0])
                                                            }}
                                                            onBlur={handleBlur}
                                                            error={touched.state && !!errors.state}
                                                        >
                                                            <MenuItem value={null} disabled>Select State</MenuItem>
                                                            {getStateOptions().map((state, i) => (
                                                                <MenuItem key={i}
                                                                          value={state.text}>{state.text}</MenuItem>
                                                            ))}
                                                        </Select>
                                                        {touched.state && errors.state ? (
                                                            <div className={styles.error}>{errors.state}</div>
                                                        ) : null}
                                                    </Grid>

                                                    <Grid item xs={12} sm={7} className={{
                                                        [styles.invalid]: touched.district && !!errors.district,
                                                    }}>
                                                        <label className={styles.label} htmlFor="district">
                                                            {t('district')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <Select
                                                            size="small"
                                                            className={styles.formInput}
                                                            name="district"
                                                            id="district"
                                                            placeholder="Select one"
                                                            value={values.district}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                setFieldValue("district", value);
                                                                setFieldValue("block", '');
                                                                setFieldValue("village", '');
                                                                const districtData = address.state_code ? getDistrictOptions(address.state_code).find(e => e.text === value) : null;
                                                                setAddress(districtData || {});
                                                            }}
                                                            onBlur={handleBlur}
                                                            error={touched.district && !!errors.district}
                                                        >
                                                            <MenuItem value={null} disabled>Select District</MenuItem>
                                                            {values.state && address.state_code && getDistrictOptions(address.state_code).map((district, i) => (
                                                                <MenuItem key={i}
                                                                          value={district.text}>{district.text}</MenuItem>
                                                            ))}
                                                        </Select>
                                                        {touched.district && errors.district ? (
                                                            <div className={styles.error}>{errors.district}</div>
                                                        ) : null}
                                                    </Grid>

                                                    <Grid item xs={12} sm={7} className={{
                                                        [styles.invalid]: touched.block && !!errors.block,
                                                    }}>
                                                        <label className={styles.label} htmlFor="block">
                                                            {t('block_name')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <Select
                                                            size="small"
                                                            className={styles.formInput}
                                                            name="block"
                                                            id="block"
                                                            placeholder="Select Block"
                                                            value={values.block}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                setFieldValue("block", value);
                                                                setFieldValue("village", '');
                                                                const blockData = address.district_code ? getBlockOptions(address.state_code, address.district_code).find(e => e.text === value) : null;
                                                                setAddress(blockData || {});
                                                            }}
                                                            onBlur={handleBlur}
                                                            error={touched.block && !!errors.block}
                                                        >
                                                            <MenuItem value={null} disabled>Select Block</MenuItem>
                                                            {values.district && address.district_code && getBlockOptions(address.state_code, address.district_code).length > 0 && getBlockOptions(address.state_code, address.district_code).map((block, i) => (
                                                                <MenuItem key={i} value={block.text}>{block.text}</MenuItem>
                                                            ))}
                                                        </Select>
                                                        {touched.block && errors.block ? (
                                                            <div className={styles.error}>{errors.block}</div>
                                                        ) : null}
                                                    </Grid>

                                                    <Grid item xs={12} sm={7} className={{
                                                        [styles.invalid]: touched.village && !!errors.village,
                                                    }}>
                                                        <label className={styles.label} htmlFor="village">
                                                            {t('village_name')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="text"
                                                            name="village"
                                                            id="village"
                                                            placeholder="Enter village name"
                                                            value={values.village}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                if (value.length <= 150) {
                                                                    handleChange(e);
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            error={touched.village && !!errors.village}
                                                            helperText={touched.village && errors.village}
                                                            inputProps={{maxLength: 150}}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} sm={7} className={{
                                                        [styles.invalid]: touched.icdsProject && !!errors.icdsProject,
                                                    }}>
                                                        <label className={styles.label} htmlFor="icdsProject">
                                                            {t('icdsProject')} <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="text"
                                                            name="icdsProject"
                                                            id="icdsProject"
                                                            placeholder="Enter ICDS Project name"
                                                            value={values.icdsProject}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                if (value.length <= 150) {
                                                                    handleChange(e);
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            error={touched.icdsProject && !!errors.icdsProject}
                                                            helperText={touched.icdsProject && errors.icdsProject}
                                                            inputProps={{maxLength: 150}}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} sm={7} className={{
                                                        [styles.invalid]: touched.childCode && !!errors.childCode,
                                                    }}>
                                                        <label className={styles.label} htmlFor="childCode">
                                                            {t("child_code")}<span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="number"
                                                            name="childCode"
                                                            id="childCode"
                                                            value={values.childCode}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                const regex = /^\d{0,3}$/; // Regex to allow only numbers and max 3 digits
                                                                if (regex.test(value)) {
                                                                    handleChange(e); // Allow the change if it matches the regex
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                                            error={touched.childCode && !!errors.childCode}
                                                            helperText={touched.childCode && errors.childCode}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} sm={7} className={{
                                                        [styles.invalid]: touched.visitDate && !!errors.visitDate,
                                                    }}>
                                                        <label className={styles.label} htmlFor="visitDate">
                                                            {t('date_of_visit')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="date"
                                                            name="visitDate"
                                                            id="visitDate"
                                                            value={values.visitDate}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            fullWidth={false}
                                                            error={touched.visitDate && !!errors.visitDate}
                                                            helperText={touched.visitDate && errors.visitDate}
                                                            inputProps={{max: today}}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.nameOfRespondent && !!errors.nameOfRespondent,
                                                    }}>
                                                        <label className={styles.label} htmlFor="nameOfRespondent">
                                                            {t("name_of_respondent")} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('onlyUppercaseAllowed')}</em>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="text"
                                                            name="nameOfRespondent"
                                                            id="nameOfRespondent"
                                                            value={values.nameOfRespondent}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (/^[A-Za-z\s]*$/.test(value)) {
                                                                    handleChange(e);
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            error={touched.nameOfRespondent && !!errors.nameOfRespondent}
                                                            helperText={touched.nameOfRespondent && errors.nameOfRespondent}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.sexOfRespondent && !!errors.sexOfRespondent,
                                                    }}>
                                                        <label className={styles.label} htmlFor="sexOfRespondent">
                                                            {t("gender_of_respondent")} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="Beneficiary caste category"
                                                                    name="sexOfRespondent" size="small"
                                                                    id="sexOfRespondent" value={values.sexOfRespondent}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.sexOfRespondent && errors.sexOfRespondent}>
                                                            <FormControlLabel value="Male" control={<Radio/>}
                                                                              label={t('male')}/>
                                                            <FormControlLabel value="Female" control={<Radio/>}
                                                                              label={t('female')}/>
                                                            <FormControlLabel value="N/A" control={<Radio/>}
                                                                              label={t('refused_to_answer')}/>
                                                            <FormControlLabel value="Other" control={<Radio/>}
                                                                              label={t('other')}/>
                                                        </RadioGroup>
                                                    </Grid>
                                                    {values.sexOfRespondent === 'Other' && (
                                                        <Grid item xs={12} sm={7} className={{
                                                            [styles.invalid]: touched.sexOfRespondent_other && !!errors.sexOfRespondent_other,
                                                        }}>
                                                            <label className={styles.label}
                                                                   htmlFor="sexOfRespondent_other">
                                                                {t('other_answer')} <span
                                                                className={styles.requiredStar}>*</span>
                                                            </label>
                                                            <TextField
                                                                size="small"
                                                                className={styles.formInput}
                                                                name="sexOfRespondent_other"
                                                                id="sexOfRespondent_other"
                                                                value={values.sexOfRespondent_other}
                                                                onChange={handleChange}
                                                                onBlur={handleBlur}
                                                                error={touched.sexOfRespondent_other && !!errors.sexOfRespondent_other}
                                                                helperText={touched.sexOfRespondent_other && errors.sexOfRespondent_other}
                                                            />
                                                        </Grid>
                                                    )}
                                                    <Grid item xs={12} sm={7} className={{
                                                        [styles.invalid]: touched.ageRespondent && !!errors.ageRespondent,
                                                    }}>
                                                        <label className={styles.label} htmlFor="ageRespondent">
                                                            {t("age_of_respondent")}<span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="number"
                                                            name="ageRespondent"
                                                            id="ageRespondent"
                                                            value={values.ageRespondent}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                const regex = /^\d{0,3}$/; // Regex to allow only numbers and max 2 digits
                                                                if (regex.test(value)) {
                                                                    handleChange(e); // Allow the change if it matches the regex
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                                            error={touched.ageRespondent && !!errors.ageRespondent}
                                                            helperText={touched.ageRespondent && errors.ageRespondent}
                                                        />
                                                    </Grid>


                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.educationRespondent && !!errors.educationRespondent,
                                                    }}>
                                                        <label className={styles.label} htmlFor="educationRespondent">
                                                            {t("education_level_of_respondent")} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="Beneficiary caste category"
                                                                    name="educationRespondent" size="small"
                                                                    id="educationRespondent"
                                                                    value={values.educationRespondent}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.educationRespondent && errors.educationRespondent}>
                                                            <FormControlLabel value="No formal education"
                                                                              control={<Radio/>}
                                                                              label={t('no_formal_education')}/>
                                                            <FormControlLabel value="Primary (1-5 class)"
                                                                              control={<Radio/>}
                                                                              label={t('primary_education')}/>
                                                            <FormControlLabel value="Upper Primary (6-8 class)"
                                                                              control={<Radio/>}
                                                                              label={t('upper_primary_education')}/>
                                                            <FormControlLabel value="Secondary (9-12 class)"
                                                                              control={<Radio/>}
                                                                              label={t('secondary_education')}/>
                                                            <FormControlLabel
                                                                value="Higher Education (Graduate and above)"
                                                                control={<Radio/>} label={t('higher_education')}/>
                                                            <FormControlLabel value="N/A" control={<Radio/>}
                                                                              label={t('refused_to_answer')}/>
                                                        </RadioGroup>
                                                    </Grid>


                                                    <Grid item xs={12} display={"flex"} alignItems={"center"}
                                                          justifyContent={"center"}>
                                                        <Button
                                                            variant="contained"
                                                            color="primary"
                                                            size="large"
                                                            fullWidth={false}
                                                            onClick={() => handleNext(values, {setErrors, setTouched})}
                                                            startIcon={<ArrowForward/>}
                                                        >
                                                            {t('next')}
                                                        </Button>
                                                    </Grid>
                                                </Grid>
                                            </Box>
                                        </>
                                    )}
                                    {step === 1 && (
                                        <>
                                            <Box className={styles.formSection}>
                                                <Box className={styles.sectionHeader}>
                                                    <Box className={styles.sectionIcon}>
                                                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                                                            📝
                                                        </Typography>
                                                    </Box>
                                                    <Box>
                                                        <Typography className={styles.sectionTitle}>
                                                            {t("responses_from_caregiver")}
                                                        </Typography>
                                                        <Typography className={styles.sectionSubtitle}>
                                                            Caregiver responses and assessments
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Grid container rowSpacing={2} sx={{
                                                    margin: '0',
                                                    width: '100%'
                                                }}>
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.childName && !!errors.childName,
                                                    }}>
                                                        <label className={styles.label} htmlFor="childName">
                                                            {t('cq1_child_name')}
                                                        </label>
                                                        <em>{t('onlyUppercaseAllowed')}</em>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="text"
                                                            name="childName"
                                                            id="childName"
                                                            value={values.childName}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (/^[A-Za-z\s]*$/.test(value)) {
                                                                    handleChange(e);
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            error={touched.childName && !!errors.childName}
                                                            helperText={touched.childName && errors.childName}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.childSex && !!errors.childSex,
                                                    }}>
                                                        <label className={styles.label} htmlFor="childSex">
                                                            {t('cq2_sex_of_child')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="Beneficiary caste category"
                                                                    name="childSex" size="small"
                                                                    id="childSex" value={values.childSex}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.childSex && errors.childSex}>
                                                            <FormControlLabel value="Male" control={<Radio/>}
                                                                              label={t('male')}/>
                                                            <FormControlLabel value="Female" control={<Radio/>}
                                                                              label={t('female')}/>
                                                            <FormControlLabel value="Other" control={<Radio/>}
                                                                              label={t('other')}/>
                                                        </RadioGroup>
                                                    </Grid>
                                                    {values.childSex === 'Other' && (
                                                        <Grid item xs={7} className={{
                                                            [styles.invalid]: touched.childSex_other && !!errors.childSex_other,
                                                        }}>
                                                            <label className={styles.label} htmlFor="childSex_other">
                                                                {t('other_answer')} <span
                                                                className={styles.requiredStar}>*</span>
                                                            </label>
                                                            <TextField
                                                                size="small"
                                                                className={styles.formInput}
                                                                name="childSex_other"
                                                                id="childSex_other"
                                                                value={values.childSex_other}
                                                                onChange={handleChange}
                                                                onBlur={handleBlur}
                                                                error={touched.childSex_other && !!errors.childSex_other}
                                                                helperText={touched.childSex_other && errors.childSex_other}
                                                            />
                                                        </Grid>
                                                    )}
                                                    <Grid item xs={12} sm={7} className={{
                                                        [styles.invalid]: touched.childDob && !!errors.childDob,
                                                    }}>
                                                        <label className={styles.label} htmlFor="childDob">
                                                            {t('cq3_dob_of_child')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('health_card_instruction')}</em>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="date"
                                                            name="childDob"
                                                            id="childDob"
                                                            value={values.childDob}
                                                            onChange={(event) => {
                                                                const selectedDate = event.target.value;
                                                                setFieldValue('childDob', selectedDate);
                                                                //         setFieldValue('childAgeDays', getDobDays(selectedDate));
                                                                setFieldValue('childAgeMonths', getDobMonths(selectedDate));
                                                            }}
                                                            onBlur={handleBlur}
                                                            fullWidth={false}
                                                            error={touched.childDob && errors.childDob}
                                                            helperText={touched.childDob && errors.childDob}
                                                            inputProps={{max: today}}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.birthWeight && !!errors.birthWeight,
                                                    }}>
                                                        <label className={styles.label} htmlFor="birthWeight">
                                                            {t('cq4_birth_weight')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('monitor_weight_instruction')}</em>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="number"
                                                            name="birthWeight"
                                                            id="birthWeight"
                                                            value={values.birthWeight}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                const regex = /^\d{0,4}$/; // Regex to allow only numbers and max 4 digits
                                                                if (regex.test(value)) {
                                                                    handleChange(e); // Allow the change if it matches the regex
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                                            error={touched.birthWeight && !!errors.birthWeight}
                                                            helperText={touched.birthWeight && errors.birthWeight}

                                                        />
                                                    </Grid>


                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.childAgeMonths && !!errors.childAgeMonths,
                                                    }}>
                                                        <label className={styles.label} htmlFor="childAgeMonths">
                                                            {t('cq5_age_of_child_in_months')}<span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            name="childAgeMonths"
                                                            id="childAgeMonths"
                                                            value={values.childAgeMonths}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            error={touched.childAgeMonths && !!errors.childAgeMonths}
                                                            helperText={touched.childAgeMonths && errors.childAgeMonths}
                                                            InputProps={{
                                                                disabled: true,
                                                            }}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.chronicMedicalCondition && !!errors.chronicMedicalCondition,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="chronicMedicalCondition">
                                                            {t('cq6_does_the_child_have_any_chronic_medical_condition_/_disability?')}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="Chronic medical condition"
                                                                    name="chronicMedicalCondition" size="small"
                                                                    id="chronicMedicalCondition"
                                                                    value={values.chronicMedicalCondition}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.chronicMedicalCondition && !!errors.chronicMedicalCondition}>
                                                            <FormControlLabel value="Yes" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="No" control={<Radio/>}
                                                                              label={t('no')}/>
                                                        </RadioGroup>
                                                    </Grid>
                                                    {values.chronicMedicalCondition === 'Yes' && (
                                                        <Grid item xs={12} sm={7} className={{
                                                            [styles.invalid]: touched.chronicMedicalConditionSpecify && !!errors.chronicMedicalConditionSpecify,
                                                        }}>
                                                            <label className={styles.label}
                                                                   htmlFor="chronicMedicalConditionSpecify">
                                                                {t('cq7_If_yes,_please_specify')} <span
                                                                className={styles.requiredStar}>*</span>
                                                            </label>
                                                            <RadioGroup aria-label="Chronic medical condition specify"
                                                                        name="chronicMedicalConditionSpecify"
                                                                        size="small"
                                                                        id="chronicMedicalConditionSpecify"
                                                                        value={values.chronicMedicalConditionSpecify}
                                                                        onChange={handleChange}
                                                                        onBlur={handleBlur}
                                                                        error={touched.chronicMedicalConditionSpecify && !!errors.chronicMedicalConditionSpecify}>
                                                                <FormControlLabel value="Congenital heart disease"
                                                                                  control={<Radio/>}
                                                                                  label={t('congenital_heart_disease')}/>
                                                                <FormControlLabel
                                                                    value="Neurological issue / cerebral palsy"
                                                                    control={<Radio/>}
                                                                    label={t('neurological_issue_cerebral_palsy')}/>
                                                                <FormControlLabel value="Mental retardation"
                                                                                  control={<Radio/>}
                                                                                  label={t('mental_retardation')}/>
                                                                <FormControlLabel
                                                                    value="Disability related to limbs (leg, arm)"
                                                                    control={<Radio/>}
                                                                    label={t('disability_related_to_limbs')}/>
                                                                <FormControlLabel
                                                                    value="Disability related hearing, vision"
                                                                    control={<Radio/>}
                                                                    label={t('disability_related_hearing_vision')}/>
                                                                <FormControlLabel value="Other" control={<Radio/>}
                                                                                  label={t('other')}/>
                                                                {values.chronicMedicalConditionSpecify === 'Other' && (
                                                                    <TextField
                                                                        size="small"
                                                                        className={styles.formInput}
                                                                        name="chronicMedicalConditionSpecify_other"
                                                                        id="chronicMedicalConditionSpecify_other"
                                                                        value={values.chronicMedicalConditionSpecify_other}
                                                                        onChange={handleChange}
                                                                        onBlur={handleBlur}
                                                                        error={touched.chronicMedicalConditionSpecify_other && !!errors.chronicMedicalConditionSpecify_other}
                                                                        helperText={touched.chronicMedicalConditionSpecify_other && errors.chronicMedicalConditionSpecify_other}
                                                                    />
                                                                )}
                                                            </RadioGroup>
                                                        </Grid>
                                                    )}
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.childWeightLast1Month && !!errors.childWeightLast1Month,
                                                    }}>
                                                        <label className={styles.label} htmlFor="childWeightLast1Month">
                                                            {t("gm1_weight_measured")}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="Child weight measured last month"
                                                                    name="childWeightLast1Month" size="small"
                                                                    id="childWeightLast1Month"
                                                                    value={values.childWeightLast1Month}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.childWeightLast1Month && !!errors.childWeightLast1Month}>
                                                            <FormControlLabel value="Yes" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="No" control={<Radio/>}
                                                                              label={t('no')}/>
                                                        </RadioGroup>
                                                    </Grid>
                                                    {values.childWeightLast1Month === 'Yes' && (
                                                        <Grid item xs={7} className={{
                                                            [styles.invalid]: touched.weightMeasuredTimes && !!errors.weightMeasuredTimes,
                                                        }}>
                                                            <label className={styles.label}
                                                                   htmlFor="weightMeasuredTimes">
                                                                {t('gm1.1_how_many_times_was_the_weight_measured_last_month?')}
                                                                <span className={styles.requiredStar}>*</span>
                                                            </label>
                                                            <TextField
                                                                size="small"
                                                                className={styles.formInput}
                                                                type="number"
                                                                name="weightMeasuredTimes"
                                                                id="weightMeasuredTimes"
                                                                value={values.weightMeasuredTimes}
                                                                onChange={(e) => {
                                                                    const {value} = e.target;
                                                                    const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                                                    if (regex.test(value)) {
                                                                        handleChange(e); // Allow the change if it matches the regex
                                                                    }
                                                                }}
                                                                onBlur={handleBlur}
                                                                onKeyDown={filterNumberKeyDown}
                                                                error={touched.weightMeasuredTimes && !!errors.weightMeasuredTimes}
                                                                helperText={touched.weightMeasuredTimes && errors.weightMeasuredTimes}
                                                            />
                                                        </Grid>
                                                    )}
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.childHeightLast1Month && !!errors.childHeightLast1Month,
                                                    }}>
                                                        <label className={styles.label} htmlFor="childHeightLast1Month">
                                                            {t("gm2_height_measured")}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="Child height measured last month"
                                                                    name="childHeightLast1Month" size="small"
                                                                    id="childHeightLast1Month"
                                                                    value={values.childHeightLast1Month}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.childHeightLast1Month && !!errors.childHeightLast1Month}>
                                                            <FormControlLabel value="Yes" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="No" control={<Radio/>}
                                                                              label={t('no')}/>
                                                        </RadioGroup>
                                                    </Grid>
                                                    {values.childHeightLast1Month === 'Yes' && (
                                                        <Grid item xs={7} className={{
                                                            [styles.invalid]: touched.heightMeasuredTimes && !!errors.heightMeasuredTimes,
                                                        }}>
                                                            <label className={styles.label}
                                                                   htmlFor="heightMeasuredTimes">
                                                                {t('gm2.1_How_many_times_was_the_height_measured_last_month?')}
                                                                <span className={styles.requiredStar}>*</span>
                                                            </label>
                                                            <TextField
                                                                size="small"
                                                                className={styles.formInput}
                                                                type="number"
                                                                name="heightMeasuredTimes"
                                                                id="heightMeasuredTimes"
                                                                value={values.heightMeasuredTimes}
                                                                onChange={(e) => {
                                                                    const {value} = e.target;
                                                                    const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                                                    if (regex.test(value)) {
                                                                        handleChange(e); // Allow the change if it matches the regex
                                                                    }
                                                                }}
                                                                onBlur={handleBlur}
                                                                onKeyDown={filterNumberKeyDown}
                                                                error={touched.heightMeasuredTimes && !!errors.heightMeasuredTimes}
                                                                helperText={touched.heightMeasuredTimes && errors.heightMeasuredTimes}
                                                            />
                                                        </Grid>
                                                    )}

                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.receivedThr && !!errors.receivedThr,
                                                    }}>
                                                        <label className={styles.label} htmlFor="receivedThr">
                                                            {t('thr1_Did_the_child_receive_THR_during_past_three_months?')}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="Received THR" name="receivedThr"
                                                                    size="small"
                                                                    id="receivedThr" value={values.receivedThr}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.receivedThr && !!errors.receivedThr}>
                                                            <FormControlLabel value="Yes" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="No" control={<Radio/>}
                                                                              label={t('no')}/>
                                                            <FormControlLabel value="ChildIsUnderSixMonths"
                                                                              control={<Radio/>}
                                                                              label={t('child_is_under_six_months')}/>
                                                        </RadioGroup>
                                                    </Grid>

                                                    {values.receivedThr === 'Yes' && (
                                                        <>

                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.receivedThrMonthsCount && !!errors.receivedThrMonthsCount,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="receivedThrMonthsCount">
                                                                    {t('thr2_out_of_the_three_months,_in_how_many_months_did_you_receive_THR_for_the_child?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <RadioGroup aria-label="THR months count"
                                                                            name="receivedThrMonthsCount" size="small"
                                                                            id="receivedThrMonthsCount"
                                                                            value={values.receivedThrMonthsCount}
                                                                            onChange={handleChange}
                                                                            onBlur={handleBlur}
                                                                            error={touched.receivedThrMonthsCount && !!errors.receivedThrMonthsCount}>
                                                                    <FormControlLabel value="All Three Months"
                                                                                      control={<Radio/>}
                                                                                      label={t('all_the_three_months')}/>
                                                                    <FormControlLabel value="Two Out Of Three Months"
                                                                                      control={<Radio/>}
                                                                                      label={t('two_out_of_three_months')}/>
                                                                    <FormControlLabel value="One Month OutOf Three"
                                                                                      control={<Radio/>}
                                                                                      label={t('only_one_month_out_of_three_months')}/>
                                                                </RadioGroup>
                                                            </Grid>
                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.infoRecordsVerification && !!errors.infoRecordsVerification,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="infoRecordsVerification">
                                                                    {t('thr3_is_above_information_available_in_the_records_for_verification?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <em>{t("Check if there is any card available with mother that records provision of THR to the mother")}</em>
                                                                <RadioGroup aria-label="THR records available"
                                                                            name="infoRecordsVerification"
                                                                            size="small"
                                                                            id="infoRecordsVerification"
                                                                            value={values.infoRecordsVerification}
                                                                            onChange={handleChange}
                                                                            onBlur={handleBlur}
                                                                            error={touched.infoRecordsVerification && !!errors.infoRecordsVerification}>
                                                                    <FormControlLabel value="Yes" control={<Radio/>}
                                                                                      label={t('yes')}/>
                                                                    <FormControlLabel value="No" control={<Radio/>}
                                                                                      label={t('no')}/>
                                                                </RadioGroup>
                                                            </Grid>
                                                        </>
                                                    )}
                                                    {values.receivedThr === 'No' && (
                                                        <>
                                                            <Grid item xs={12} sm={7} className={{
                                                                [styles.invalid]: touched.reasonNotReceivedThr && !!errors.reasonNotReceivedThr,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="reasonNotReceivedThr">
                                                                    {t('thr4_what_was_the_reason_for_not_receiving_THR?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <RadioGroup aria-label="THR not received"
                                                                            name="reasonNotReceivedThr" size="small"
                                                                            id="reasonNotReceivedThr"
                                                                            value={values.reasonNotReceivedThr}
                                                                            onChange={handleChange}
                                                                            onBlur={handleBlur}
                                                                            error={touched.reasonNotReceivedThr && !!errors.reasonNotReceivedThr}>
                                                                    <FormControlLabel value="Not distributed"
                                                                                      control={<Radio/>}
                                                                                      label={t('not_distributed')}/>
                                                                    <FormControlLabel value="Not interested"
                                                                                      control={<Radio/>}
                                                                                      label={t('not_interested')}/>
                                                                    <FormControlLabel value="Beneficiary out of village"
                                                                                      control={<Radio/>}
                                                                                      label={t('beneficiary_out_of_village')}/>
                                                                </RadioGroup>
                                                            </Grid>
                                                        </>
                                                    )}
                                                    {values.receivedThr !== 'ChildIsUnderSixMonths' && (
                                                        <>
                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.receivedThrSam && !!errors.receivedThrSam,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="receivedThrSam">
                                                                    {t('thr5_have_you_received_this_A-THR/THR_entitled_for_SAM_children,_during_past_one_month?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <em>{t("show the packet of THR or picture of the packet entitled for SAM children, during past one month")}</em>
                                                                <div>
                                                                    {values.state === 'Chhattisgarh' && (
                                                                        <img src="/assets/img/chattis.jpg"
                                                                             alt="Chhattisgarh THR"
                                                                             style={{maxWidth: '100%'}}/>
                                                                    )}
                                                                    {values.state === 'Odisha' && (
                                                                        <img src="/assets/img/odisha.jpg"
                                                                             alt="Odisha THR"
                                                                             style={{maxWidth: '100%'}}/>
                                                                    )}
                                                                    {values.state === 'Jharkhand' && (
                                                                        <img src="/assets/img/jhark.jpg"
                                                                             alt="Jharkhand THR"
                                                                             style={{maxWidth: '100%'}}/>
                                                                    )}
                                                                    {values.state === 'Madhya Pradesh' && (
                                                                        <img src="/assets/img/mp.jpg"
                                                                             alt="MP THR"
                                                                             style={{maxWidth: '100%'}}/>
                                                                    )}
                                                                    {values.state === 'Rajasthan' && (
                                                                        <img src="/assets/img/rajasthan.jpg"
                                                                             alt="Rajasthan THR"
                                                                             style={{maxWidth: '100%'}}/>
                                                                    )}
                                                                    {values.state === 'Telangana' && (
                                                                        <img src="/assets/img/telangana.jpg"
                                                                             alt="Telangana THR"
                                                                             style={{maxWidth: '100%'}}/>
                                                                    )}
                                                                </div>
                                                                <RadioGroup aria-label="Received THR for SAM children"
                                                                            name="receivedThrSam" size="small"
                                                                            id="receivedThrSam"
                                                                            value={values.receivedThrSam}
                                                                            onChange={handleChange}
                                                                            onBlur={handleBlur}
                                                                            error={touched.receivedThrSam && !!errors.receivedThrSam}>
                                                                    <FormControlLabel value="Yes" control={<Radio/>}
                                                                                      label={t('yes')}/>
                                                                    <FormControlLabel value="No" control={<Radio/>}
                                                                                      label={t('no')}/>
                                                                    <FormControlLabel value="Child got recovered"
                                                                                      control={<Radio/>}
                                                                                      label={t('child_recovered')}/>

                                                                </RadioGroup>
                                                            </Grid>
                                                            {values.receivedThrSam === 'Yes' && (
                                                                <>
                                                                    <Grid item xs={12} sm={7} className={{
                                                                        [styles.invalid]: touched.quantityThrReceived && !!errors.quantityThrReceived,
                                                                    }}>
                                                                        <label className={styles.label}
                                                                               htmlFor="quantityThrReceived">
                                                                            {t('thr6_if_yes,_what_was_the_quantity_of_THR_received,_during_past_one_month?')}
                                                                            <span
                                                                                className={styles.requiredStar}>*</span>
                                                                        </label>
                                                                        <em>{t('mention_in_packets')}</em>
                                                                        <TextField
                                                                            size="small"
                                                                            className={styles.formInput}
                                                                            type="number"
                                                                            name="quantityThrReceived"
                                                                            id="quantityThrReceived"
                                                                            value={values.quantityThrReceived}
                                                                            onChange={(e) => {
                                                                                const {value} = e.target;
                                                                                const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                                                                if (regex.test(value)) {
                                                                                    handleChange(e); // Allow the change if it matches the regex
                                                                                }
                                                                            }}
                                                                            onBlur={handleBlur}
                                                                            onKeyDown={filterNumberKeyDown}
                                                                            error={touched.quantityThrReceived && !!errors.quantityThrReceived}
                                                                            helperText={touched.quantityThrReceived && errors.quantityThrReceived}
                                                                        />
                                                                    </Grid>
                                                                    <Grid item xs={12} className={{
                                                                        [styles.invalid]: touched.thrConsumed && !!errors.thrConsumed,
                                                                    }}>
                                                                        <label className={styles.label}
                                                                               htmlFor="thrConsumed">
                                                                            {t('thr7_was_the_THR_consumed_during_past_one_month?')}
                                                                            <span
                                                                                className={styles.requiredStar}>*</span>
                                                                        </label>
                                                                        <RadioGroup aria-label="THR consumed"
                                                                                    name="thrConsumed"
                                                                                    size="small"
                                                                                    id="thrConsumed"
                                                                                    value={values.thrConsumed}
                                                                                    onChange={(e) => {
                                                                                        const {value} = e.target;
                                                                                        setFieldValue('thrConsumed', value);

                                                                                        // Clear dependent values if 'No' is selected
                                                                                        if (value === 'No') {
                                                                                            setFieldValue('daysThrConsumed1Month', '');
                                                                                            setFieldValue('whoConsumedThr', '');
                                                                                        }
                                                                                    }} onBlur={handleBlur}
                                                                                    error={touched.thrConsumed && !!errors.thrConsumed}>
                                                                            <FormControlLabel value="Yes"
                                                                                              control={<Radio/>}
                                                                                              label={t('yes')}/>
                                                                            <FormControlLabel value="No"
                                                                                              control={<Radio/>}
                                                                                              label={t('no')}/>
                                                                        </RadioGroup>
                                                                    </Grid>
                                                                    {values.thrConsumed === 'No' && (
                                                                        <Grid item xs={12} sm={7} className={{
                                                                            [styles.invalid]: touched.reasonNotConsumed && !!errors.reasonNotConsumed,
                                                                        }}>
                                                                            <label className={styles.label}
                                                                                   htmlFor="reasonNotConsumed">
                                                                                {t('thr8_if_no,_what_is_the_reason_for_not_consuming_THR?')}
                                                                                <span
                                                                                    className={styles.requiredStar}>*</span>
                                                                            </label>
                                                                            <RadioGroup
                                                                                aria-label="Reason for not consuming THR"
                                                                                name="reasonNotConsumed" size="small"
                                                                                id="reasonNotConsumed"
                                                                                value={values.reasonNotConsumed}
                                                                                onChange={handleChange}
                                                                                onBlur={handleBlur}
                                                                                error={touched.reasonNotConsumed && !!errors.reasonNotConsumed}>
                                                                                <FormControlLabel
                                                                                    value="Did not like the content/packet"
                                                                                    control={<Radio/>}
                                                                                    label={t('did_not_like_the_content_packet')}/>
                                                                                <FormControlLabel
                                                                                    value="Did not like the taste"
                                                                                    control={<Radio/>}
                                                                                    label={t('did_not_like_the_taste')}/>
                                                                                <FormControlLabel
                                                                                    value="Quality is poor"
                                                                                    control={<Radio/>}
                                                                                    label={t('quality_is_poor')}/>
                                                                                <FormControlLabel
                                                                                    value="Did not know how to use"
                                                                                    control={<Radio/>}
                                                                                    label={t('did_not_know_how_to_use')}/>
                                                                                <FormControlLabel
                                                                                    value="Not possible to separately cook for the child"
                                                                                    control={<Radio/>}
                                                                                    label={t('not_possible_to_separately_cook_for_the_child')}/>
                                                                                <FormControlLabel value="Any other"
                                                                                                  control={<Radio/>}
                                                                                                  label={t('any_other')}/>
                                                                            </RadioGroup>
                                                                        </Grid>
                                                                    )}

                                                                    {(values.thrConsumed === 'Yes') && (
                                                                        <>
                                                                            <Grid item xs={12} className={{
                                                                                [styles.invalid]: touched.whoConsumedThr && !!errors.whoConsumedThr,
                                                                            }}>
                                                                                <label className={styles.label}
                                                                                       htmlFor="whoConsumedThr">
                                                                                    {t('thr9_if_yes,_who_consumed_the_THR?')}
                                                                                    <span
                                                                                        className={styles.requiredStar}>*</span>
                                                                                </label>
                                                                                <RadioGroup
                                                                                    aria-label="Who consumed THR"
                                                                                    name="whoConsumedThr" size="small"
                                                                                    id="whoConsumedThr"
                                                                                    value={values.whoConsumedThr}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={touched.whoConsumedThr && !!errors.whoConsumedThr}>
                                                                                    <FormControlLabel
                                                                                        value="Only intended child"
                                                                                        control={<Radio/>}
                                                                                        label={t('only_by_the_intended_child')}/>
                                                                                    <FormControlLabel
                                                                                        value="Intended child and other children"
                                                                                        control={<Radio/>}
                                                                                        label={t('intended_child_and_other_children_in_the_family')}/>
                                                                                    <FormControlLabel
                                                                                        value="Intended and other family members"
                                                                                        control={<Radio/>}
                                                                                        label={t('intended_+_other_family_members_including_adults')}/>
                                                                                    <FormControlLabel
                                                                                        value="Only adults"
                                                                                        control={<Radio/>}
                                                                                        label={t('only_by_adults_in_the_family')}/>
                                                                                </RadioGroup>
                                                                            </Grid>

                                                                            <Grid item xs={12} sm={7} className={{
                                                                                [styles.invalid]: touched.daysThrConsumed1Month && !!errors.daysThrConsumed1Month,
                                                                            }}>
                                                                                <label className={styles.label}
                                                                                       htmlFor="daysThrConsumed1Month">
                                                                                    {t('thr10_how_many_days_in_past_one_month,_did_the_child_consume_THR?')}
                                                                                    <span
                                                                                        className={styles.requiredStar}>*</span>
                                                                                </label>
                                                                                <TextField
                                                                                    size="small"
                                                                                    className={styles.formInput}
                                                                                    type="number"
                                                                                    name="daysThrConsumed1Month"
                                                                                    id="daysThrConsumed1Month"
                                                                                    value={values.daysThrConsumed1Month}
                                                                                    onChange={(e) => {
                                                                                        const {value} = e.target;
                                                                                        const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                                                                        if (regex.test(value)) {
                                                                                            handleChange(e); // Allow the change if it matches the regex
                                                                                        }
                                                                                    }}
                                                                                    onBlur={handleBlur}
                                                                                    onKeyDown={filterNumberKeyDown}
                                                                                    error={touched.daysThrConsumed1Month && !!errors.daysThrConsumed1Month}
                                                                                    helperText={touched.daysThrConsumed1Month && errors.daysThrConsumed1Month}
                                                                                />
                                                                            </Grid>
                                                                            <Grid item xs={12} className={{
                                                                                [styles.invalid]: touched.quantityThrEveryDay && !!errors.quantityThrEveryDay,
                                                                            }}>
                                                                                <label className={styles.label}
                                                                                       htmlFor="quantityThrEveryDay">
                                                                                    {t('thr11_how_much_quantity_of_THR_do_you_use_for_preparing_feed_for_the_child_every_day?')}
                                                                                    <span
                                                                                        className={styles.requiredStar}>*</span>
                                                                                </label>
                                                                                <em>{t('Standard size of Katori is 250ml')}</em>
                                                                                <RadioGroup
                                                                                    aria-label="Quantity THR every day"
                                                                                    name="quantityThrEveryDay"
                                                                                    size="small"
                                                                                    id="quantityThrEveryDay"
                                                                                    value={values.quantityThrEveryDay}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={touched.quantityThrEveryDay && !!errors.quantityThrEveryDay}>
                                                                                    <FormControlLabel
                                                                                        value="Half Katori"
                                                                                        control={<Radio/>}
                                                                                        label={t('half_katori')}/>
                                                                                    <FormControlLabel value="One Katori"
                                                                                                      control={<Radio/>}
                                                                                                      label={t('one_katori')}/>
                                                                                    <FormControlLabel value="Two Katori"
                                                                                                      control={<Radio/>}
                                                                                                      label={t('two_katori')}/>
                                                                                    <FormControlLabel
                                                                                        value="Half Packet"
                                                                                        control={<Radio/>}
                                                                                        label={t('half_packet')}/>
                                                                                    <FormControlLabel
                                                                                        value="Full Packet"
                                                                                        control={<Radio/>}
                                                                                        label={t('full_packet')}/>
                                                                                    <FormControlLabel value="Other"
                                                                                                      control={<Radio/>}
                                                                                                      label={t('other')}/>
                                                                                </RadioGroup>
                                                                                {values.quantityThrEveryDay === 'Other' && (
                                                                                    <Grid item xs={12} sm={7}>
                                                                                        <TextField
                                                                                            size="small"
                                                                                            className={styles.formInput}
                                                                                            name="quantityThrEveryDay_other"
                                                                                            id="quantityThrEveryDay_other"
                                                                                            value={values.quantityThrEveryDay_other || ''}
                                                                                            onChange={(e) => {
                                                                                                setFieldValue('quantityThrEveryDay_other', e.target.value);
                                                                                            }}
                                                                                            onBlur={handleBlur}
                                                                                        />
                                                                                    </Grid>
                                                                                )}
                                                                            </Grid>

                                                                            <Grid item xs={12} className={{
                                                                                [styles.invalid]: touched.thrMostLiked && !!errors.thrMostLiked,
                                                                            }}>
                                                                                <label className={styles.label}
                                                                                       htmlFor="thrMostLiked">
                                                                                    {t('thr12_among_the_different_packets_of_THR_provided_for_the_child,_which_one_is_most_liked_by_the_child?')}
                                                                                    <span
                                                                                        className={styles.requiredStar}>*</span>
                                                                                </label>
                                                                                Chhattisgarh
                                                                                {values.state === 'Chhattisgarh' && (
                                                                                    <RadioGroup
                                                                                        aria-label="THR most liked"
                                                                                        name="thrMostLiked"
                                                                                        size="small"
                                                                                        id="thrMostLiked"
                                                                                        value={values.thrMostLiked}
                                                                                        onChange={handleChange}
                                                                                        onBlur={handleBlur}
                                                                                        error={touched.thrMostLiked && !!errors.thrMostLiked}
                                                                                    >
                                                                                        <FormControlLabel
                                                                                            value="Mukhyamantri Shishu Shakti Aahar"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_c_o1')}/>
                                                                                        <FormControlLabel
                                                                                            value="Samvardhit THR"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_c_o2')}/>
                                                                                        <FormControlLabel
                                                                                            value="None of the above"
                                                                                            control={<Radio/>}
                                                                                            label={t('nota')}/>
                                                                                    </RadioGroup>
                                                                                )}

                                                                                {values.state === 'Jharkhand' && (
                                                                                    <RadioGroup
                                                                                        aria-label="THR most liked"
                                                                                        name="thrMostLiked"
                                                                                        size="small"
                                                                                        id="thrMostLiked"
                                                                                        value={values.thrMostLiked}
                                                                                        onChange={handleChange}
                                                                                        onBlur={handleBlur}
                                                                                        error={touched.thrMostLiked && !!errors.thrMostLiked}
                                                                                    >
                                                                                        <FormControlLabel
                                                                                            value="Shishu aahar"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_j_o1')}/>
                                                                                        <FormControlLabel
                                                                                            value="Paushtik meetha dalia"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_j_o2')}/>
                                                                                        <FormControlLabel
                                                                                            value="None of the above"
                                                                                            control={<Radio/>}
                                                                                            label={t('nota')}/>
                                                                                    </RadioGroup>
                                                                                )}

                                                                                {values.state === 'Madhya Pradesh' && (
                                                                                    <RadioGroup
                                                                                        aria-label="THR most liked"
                                                                                        name="thrMostLiked"
                                                                                        size="small"
                                                                                        id="thrMostLiked"
                                                                                        value={values.thrMostLiked}
                                                                                        onChange={handleChange}
                                                                                        onBlur={handleBlur}
                                                                                        error={touched.thrMostLiked && !!errors.thrMostLiked}
                                                                                    >
                                                                                        <FormControlLabel
                                                                                            value="Bal aahar premix"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_mp_o1')}/>
                                                                                        <FormControlLabel
                                                                                            value="Khichdi premix"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_mp_o2')}/>
                                                                                        <FormControlLabel
                                                                                            value="Halwa premix"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_mp_o3')}/>
                                                                                        <FormControlLabel
                                                                                            value="None of the above"
                                                                                            control={<Radio/>}
                                                                                            label={t('nota')}/>
                                                                                    </RadioGroup>
                                                                                )}

                                                                                {values.state === 'Odisha' && (
                                                                                    <RadioGroup
                                                                                        aria-label="THR most liked"
                                                                                        name="thrMostLiked"
                                                                                        size="small"
                                                                                        id="thrMostLiked"
                                                                                        value={values.thrMostLiked}
                                                                                        onChange={handleChange}
                                                                                        onBlur={handleBlur}
                                                                                        error={touched.thrMostLiked && !!errors.thrMostLiked}
                                                                                    >
                                                                                        <FormControlLabel
                                                                                            value="Bardhita Chhatua"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_o_o1')}/>
                                                                                        <FormControlLabel
                                                                                            value="None of the above"
                                                                                            control={<Radio/>}
                                                                                            label={t('nota')}/>
                                                                                    </RadioGroup>
                                                                                )}

                                                                                {values.state === 'Rajasthan' && (
                                                                                    <RadioGroup
                                                                                        aria-label="THR most liked"
                                                                                        name="thrMostLiked"
                                                                                        size="small"
                                                                                        id="thrMostLiked"
                                                                                        value={values.thrMostLiked}
                                                                                        onChange={handleChange}
                                                                                        onBlur={handleBlur}
                                                                                        error={touched.thrMostLiked && !!errors.thrMostLiked}
                                                                                    >
                                                                                        <FormControlLabel
                                                                                            value="Fortified balahar premix"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_r_o1')}/>
                                                                                        <FormControlLabel
                                                                                            value="Fortified moong daal chawal khichdi"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_r_o2')}/>
                                                                                        <FormControlLabel
                                                                                            value="Fortified Saada genhu dalia"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_r_o3')}/>
                                                                                        <FormControlLabel
                                                                                            value="Fortified nutri meetha dalia"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_r_o4')}/>
                                                                                        <FormControlLabel
                                                                                            value="None of the above"
                                                                                            control={<Radio/>}
                                                                                            label={t('nota')}/>
                                                                                    </RadioGroup>
                                                                                )}

                                                                                {values.state === 'Telangana' && (
                                                                                    <RadioGroup
                                                                                        aria-label="THR most liked"
                                                                                        name="thrMostLiked"
                                                                                        size="small"
                                                                                        id="thrMostLiked"
                                                                                        value={values.thrMostLiked}
                                                                                        onChange={handleChange}
                                                                                        onBlur={handleBlur}
                                                                                        error={touched.thrMostLiked && !!errors.thrMostLiked}
                                                                                    >
                                                                                        <FormControlLabel
                                                                                            value="Balamrutham"
                                                                                            control={<Radio/>}
                                                                                            label={t('thr12_t_o1')}/>
                                                                                        <FormControlLabel
                                                                                            value="None of the above"
                                                                                            control={<Radio/>}
                                                                                            label={t('nota')}/>
                                                                                    </RadioGroup>
                                                                                )}

                                                                            </Grid>

                                                                            <Grid item xs={12} className={{
                                                                                [styles.invalid]: touched.storeThrPacket && !!errors.storeThrPacket,
                                                                            }}>
                                                                                <label className={styles.label}
                                                                                       htmlFor="storeThrPacket">
                                                                                    {t('thr13_how_do_you_store_the_THR_packet_once_opened?')}
                                                                                    <span
                                                                                        className={styles.requiredStar}>*</span>
                                                                                </label>
                                                                                <RadioGroup
                                                                                    aria-label="Store THR packet"
                                                                                    name="storeThrPacket" size="small"
                                                                                    id="storeThrPacket"
                                                                                    value={values.storeThrPacket}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={touched.storeThrPacket && !!errors.storeThrPacket}>
                                                                                    <FormControlLabel
                                                                                        value="Closed container"
                                                                                        control={<Radio/>}
                                                                                        label={t('closed_container')}/>
                                                                                    <FormControlLabel
                                                                                        value="Keeping SamePacket Tightly Packed"
                                                                                        control={<Radio/>}
                                                                                        label={t('keeping_the_same_packet_with_tightly_packed')}/>
                                                                                    <FormControlLabel
                                                                                        value="Keeping Same Packet Opened"
                                                                                        control={<Radio/>}
                                                                                        label={t('keeping_the_same_packet_opened_as_it_is')}/>
                                                                                    <FormControlLabel value="Other"
                                                                                                      control={<Radio/>}
                                                                                                      label={t('other')}/>
                                                                                </RadioGroup>
                                                                                {values.storeThrPacket === 'Other' && (
                                                                                    <Grid item xs={12} sm={7}>
                                                                                        <TextField
                                                                                            size="small"
                                                                                            className={styles.formInput}
                                                                                            name="storeThrPacket_other"
                                                                                            id="storeThrPacket_other"
                                                                                            value={values.storeThrPacket_other || ''}
                                                                                            onChange={(e) => {
                                                                                                setFieldValue('storeThrPacket_other', e.target.value);
                                                                                            }}
                                                                                            onBlur={handleBlur}
                                                                                        />
                                                                                    </Grid>
                                                                                )}
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                            {values.receivedThrSam === 'No' && (
                                                                <Grid item xs={12} className={{
                                                                    [styles.invalid]: touched.receivedOtherThr && !!errors.receivedOtherThr,
                                                                }}>
                                                                    <label className={styles.label}
                                                                           htmlFor="receivedOtherThr">
                                                                        {t('thr14_If_no,_have_you_received_any_other_THR,_during_past_one_month?')}
                                                                        <span className={styles.requiredStar}>*</span>
                                                                    </label>
                                                                    <RadioGroup aria-label="Received other THR"
                                                                                name="receivedOtherThr" size="small"
                                                                                id="receivedOtherThr"
                                                                                value={values.receivedOtherThr}
                                                                                onChange={handleChange}
                                                                                onBlur={handleBlur}
                                                                                error={touched.receivedOtherThr && !!errors.receivedOtherThr}>
                                                                        <FormControlLabel value="Yes" control={<Radio/>}
                                                                                          label={t('yes')}/>
                                                                        <FormControlLabel value="No" control={<Radio/>}
                                                                                          label={t('no')}/>
                                                                    </RadioGroup>
                                                                </Grid>
                                                            )}

                                                            {values.receivedThr === 'No' && (
                                                                <>


                                                                </>
                                                            )}

                                                            {values.thrConsumed === 'Yes' && (
                                                                <>
                                                                    {values.childAgeMonths > 36 && (
                                                                        <>
                                                                            <Grid
                                                                                item
                                                                                xs={12}
                                                                                className={{
                                                                                    [styles.invalid]: touched.receivedOtherFoodAwc && !!errors.receivedOtherFoodAwc,
                                                                                }}
                                                                            >
                                                                                <label className={styles.label}
                                                                                       htmlFor="receivedOtherFoodAwc">
                                                                                    {t('thr15_do_you_receive_any_other_food_items_from_the_AWC?')}
                                                                                    <span
                                                                                        className={styles.requiredStar}>*</span>
                                                                                </label>
                                                                                <FormGroup
                                                                                    aria-label="Received other food AWC"
                                                                                    id="receivedOtherFoodAwc">
                                                                                    {[
                                                                                        {
                                                                                            value: 'Hot Cooked Meal',
                                                                                            label: 'hot_cooked_meal'
                                                                                        },
                                                                                        {value: 'Milk', label: 'milk'},
                                                                                        {value: 'Egg', label: 'egg'},
                                                                                        {
                                                                                            value: 'Other',
                                                                                            label: 'other'
                                                                                        },
                                                                                        {
                                                                                            value: 'Nothing',
                                                                                            label: 'nothing'
                                                                                        },
                                                                                    ].map((option) => {
                                                                                        const selectedValues = typeof values.receivedOtherFoodAwc === 'string'
                                                                                            ? values.receivedOtherFoodAwc.split(', ').filter(Boolean)
                                                                                            : [];

                                                                                        return (
                                                                                            <FormControlLabel
                                                                                                key={option.value}
                                                                                                control={
                                                                                                    <Checkbox
                                                                                                        value={option.value}
                                                                                                        checked={selectedValues.includes(option.value)}
                                                                                                        onChange={(e) => {
                                                                                                            const {value} = e.target;

                                                                                                            const newArray = selectedValues.includes(value)
                                                                                                                ? selectedValues.filter(item => item !== value)
                                                                                                                : [...selectedValues, value];

                                                                                                            // Unselect all others if "Nothing" is selected
                                                                                                            const updatedArray = newArray.includes('Nothing') ? ['Nothing'] : newArray;

                                                                                                            // Convert the updated array into a comma-separated string
                                                                                                            const updatedString = updatedArray.join(', ');

                                                                                                            setFieldValue('receivedOtherFoodAwc', updatedString);
                                                                                                        }}
                                                                                                    />
                                                                                                }
                                                                                                label={t(option.label)}
                                                                                            />
                                                                                        );
                                                                                    })}
                                                                                </FormGroup>

                                                                                {values.receivedOtherFoodAwc.split(', ').includes('Other') && (
                                                                                    <Grid item xs={12} sm={7}>
                                                                                        <TextField
                                                                                            size="small"
                                                                                            className={styles.formInput}
                                                                                            name="receivedOtherFoodAwc_other"
                                                                                            id="receivedOtherFoodAwc_other"
                                                                                            value={values.receivedOtherFoodAwc_other || ''}
                                                                                            onChange={(e) => {
                                                                                                setFieldValue('receivedOtherFoodAwc_other', e.target.value);
                                                                                            }}
                                                                                            onBlur={handleBlur}
                                                                                        />
                                                                                    </Grid>
                                                                                )}

                                                                                {/* Error handling */}
                                                                                {touched.receivedOtherFoodAwc && errors.receivedOtherFoodAwc && (
                                                                                    <div
                                                                                        className={styles.error}>{errors.receivedOtherFoodAwc}</div>
                                                                                )}
                                                                            </Grid>


                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </>
                                                    )}


                                                    {/* FD  */}
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.fedSolidOrSemisolidFood && !!errors.fedSolidOrSemisolidFood,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="fedSolidOrSemisolidFood">
                                                            {t('fd1_for_children_above_six_months_Yesterday_in_the_day_or_at_night_did_you_feed_the_child_any_solid_or_semi-solid_foods?')}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="Feed solid food"
                                                                    name="fedSolidOrSemisolidFood" size="small"
                                                                    id="fedSolidOrSemisolidFood"
                                                                    value={values.fedSolidOrSemisolidFood}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.fedSolidOrSemisolidFood && !!errors.fedSolidOrSemisolidFood}>
                                                            <FormControlLabel value="Yes" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="No" control={<Radio/>}
                                                                              label={t('no')}/>
                                                        </RadioGroup>
                                                    </Grid>
                                                    {values.fedSolidOrSemisolidFood === 'Yes' && (
                                                        <>
                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.timesFedSolidOrSemisolidFood && !!errors.timesFedSolidOrSemisolidFood,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="timesFedSolidOrSemisolidFood">
                                                                    {t('fd2_if_yes,_yesterday_in_the_day_or_at_night,_how_many_times_did_the_child_receive_semi_solid_or_solid_food_other_than_liquids?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <TextField
                                                                    size="small"
                                                                    className={styles.formInput}
                                                                    type="number"
                                                                    name="timesFedSolidOrSemisolidFood"
                                                                    id="timesFedSolidOrSemisolidFood"
                                                                    value={values.timesFedSolidOrSemisolidFood}
                                                                    onChange={(e) => {
                                                                        const {value} = e.target;
                                                                        const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                                                        if (regex.test(value)) {
                                                                            handleChange(e); // Allow the change if it matches the regex
                                                                        }
                                                                    }}
                                                                    onBlur={handleBlur}
                                                                    onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                                                    error={touched.timesFedSolidOrSemisolidFood && !!errors.timesFedSolidOrSemisolidFood}
                                                                    helperText={touched.timesFedSolidOrSemisolidFood && errors.timesFedSolidOrSemisolidFood}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.yesterdayFoodItemsConsumed && !!errors.yesterdayFoodItemsConsumed,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="yesterdayFoodItemsConsumed">
                                                                    {t('CF2')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                            </Grid>

                                                            <Grid container spacing={3}>
                                                                {[
                                                                    {
                                                                        id: "foodYesterdayBreastmilk",
                                                                        label: "Breastmilk"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayPlainWater",
                                                                        label: "Plain water"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayMilkAnimals",
                                                                        label: "Milk from animals (fresh, tinned or powdered milk)"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayYogurtDrink",
                                                                        label: "Yogurt drink"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayTeaCoffee",
                                                                        label: "Any beverages – tea, coffee, etc."
                                                                    },
                                                                    {
                                                                        id: "foodYesterdaySweetBeverages",
                                                                        label: "Any other sweetened beverages – soft drinks, commercial juices, etc."
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayClearBroth",
                                                                        label: "Clear broth or clear soup"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayPorridgeGruel",
                                                                        label: "Any porridge or gruel (kheer, dal-rice, soft khichadi)"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayFortifiedBabyFood",
                                                                        label: "Any commercially fortified baby food"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayGrains",
                                                                        label: "Any bread, roti, chapati, rice, noodles, idli, upma, halwa or any other foods made from grains"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayYellowVeg",
                                                                        label: "Any pumpkin, carrots, or sweet potatoes that are yellow or orange inside"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayWhiteRoots",
                                                                        label: "Any white potatoes, or any other foods made from roots"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayGreenLeafyVeg",
                                                                        label: "Any dark green leafy vegetables"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayRipeFruits",
                                                                        label: "Any ripe mangoes, papayas, muskmelon, watermelon, or jackfruit"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayUnripeFruits",
                                                                        label: "Any unripe mangoes, papayas, muskmelon, watermelon, or jackfruit"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayOtherFruits",
                                                                        label: "Any other fruits"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayOtherVeg",
                                                                        label: "Any other vegetables"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayDryFruits",
                                                                        label: "Any dry fruits (raisins, sultanas, dried dates)"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayOrganMeats",
                                                                        label: "Any liver or other organ meats (kidney, brain)"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayMeat",
                                                                        label: "Any chicken, animal, or other bird meat"
                                                                    },
                                                                    {id: "foodYesterdayEggs", label: "Any eggs"},
                                                                    {
                                                                        id: "foodYesterdayFish",
                                                                        label: "Any fresh or dried fish, shellfish, oysters, crabs"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayMushrooms",
                                                                        label: "Any mushrooms"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayBeansPeasLentils",
                                                                        label: "Any foods made from beans, peas, or lentils"
                                                                    },
                                                                    {id: "foodYesterdaySeeds", label: "Any seeds"},
                                                                    {id: "foodYesterdayNuts", label: "Any nuts"},
                                                                    {
                                                                        id: "foodYesterdayMilkProducts",
                                                                        label: "Any cheese, curd or other milk products"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayOilsFats",
                                                                        label: "Any oil, hydrogenated fat, ghee or butter or food made with these"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdaySugaryFoods",
                                                                        label: "Any sugary foods – chocolates, sweets, candies, cakes, pastries, biscuits"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayFriedSnacks",
                                                                        label: "Any chips, crisps, puffs, instant noodles, samosa, pakora, french fries, fried dough"
                                                                    },
                                                                    {
                                                                        id: "foodYesterdayOtherFood",
                                                                        label: "Any other liquid, solid or semi-solid food"
                                                                    },
                                                                ].map((item) => (
                                                                    <Grid item xs={12} key={item.id}
                                                                          className={styles.multiRaio}>
                                                                        <label className={styles.label}
                                                                               htmlFor={item.id}>
                                                                            {t(item.label)}
                                                                        </label>
                                                                        <RadioGroup
                                                                            className={styles.colSpan}
                                                                            row
                                                                            name="yesterdayFoodItemsConsumed"
                                                                            size="small"
                                                                            id={item.id}
                                                                            value={values.yesterdayFoodItemsConsumed[item.id]}
                                                                            onChange={(e) => {
                                                                                const updatedFoodData = {
                                                                                    ...values.yesterdayFoodItemsConsumed,
                                                                                    [item.id]: e.target.value
                                                                                };
                                                                                handleChange({
                                                                                    target: {
                                                                                        name: "yesterdayFoodItemsConsumed",
                                                                                        value: updatedFoodData
                                                                                    }
                                                                                });
                                                                            }}
                                                                            onBlur={handleBlur}
                                                                        >
                                                                            <FormControlLabel value="0"
                                                                                              control={<Radio/>}
                                                                                              label={t("0")}/>
                                                                            <FormControlLabel value="1"
                                                                                              control={<Radio/>}
                                                                                              label={t("1")}/>
                                                                            <FormControlLabel value="2"
                                                                                              control={<Radio/>}
                                                                                              label={t("2")}/>
                                                                            <FormControlLabel value="3"
                                                                                              control={<Radio/>}
                                                                                              label={t("3")}/>
                                                                            <FormControlLabel value="More than 3"
                                                                                              control={<Radio/>}
                                                                                              label={t('More_than_3')}/>
                                                                        </RadioGroup>
                                                                    </Grid>
                                                                ))}
                                                                <Grid item xs={12}>
                                                                    <TextField
                                                                        fullWidth
                                                                        name="yesterdayFoodItemsConsumed_other"
                                                                        label="Specify any other food item given"
                                                                        variant="outlined"
                                                                        onChange={handleChange} // Ensure this updates formik state
                                                                        value={values.yesterdayFoodItemsConsumed_other || ""}
                                                                    />
                                                                </Grid>
                                                            </Grid>

                                                            <Grid
                                                                item
                                                                xs={12}
                                                                className={{
                                                                    [styles.invalid]: touched.howToEnrichHomemadeFood && !!errors.howToEnrichHomemadeFood,
                                                                }}
                                                            >
                                                                <label className={styles.label}
                                                                       htmlFor="howToEnrichHomemadeFood">
                                                                    {t('fd4_can_you_tell_me_how_to_enrich_homemade_food_for_children_to_make_it_more_nutritious/energy_dense?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <FormGroup aria-label="Enrich homemade food"
                                                                           id="howToEnrichHomemadeFood">
                                                                    {[
                                                                        {
                                                                            value: 'peanutSoyabeanChunkPowder',
                                                                            label: 'by_adding_peanut/soyabean_chunk_powder'
                                                                        },
                                                                        {
                                                                            value: 'extraOilFat',
                                                                            label: 'by_adding_extra_oil/fat'
                                                                        },
                                                                        {
                                                                            value: 'greenLeafyVegetables',
                                                                            label: 'by_adding_green_leafy_vegetables'
                                                                        },
                                                                        {
                                                                            value: 'fruitsAndVegetables',
                                                                            label: 'by_adding_fruits_and_vegetables'
                                                                        },
                                                                        {
                                                                            value: 'pulsesAndVegetables',
                                                                            label: 'by_adding_pulses_and_vegetables'
                                                                        },
                                                                        {
                                                                            value: 'animalSourceFood',
                                                                            label: 'by_adding_animal_source_food'
                                                                        },
                                                                        {value: 'Other', label: 'other'},
                                                                        {value: 'dontKnow', label: "dont_know"},
                                                                    ].map((option) => {
                                                                        const selectedValues = typeof values.howToEnrichHomemadeFood === 'string'
                                                                            ? values.howToEnrichHomemadeFood.split(', ').filter(Boolean)
                                                                            : [];

                                                                        return (
                                                                            <FormControlLabel
                                                                                key={option.value}
                                                                                control={
                                                                                    <Checkbox
                                                                                        value={option.value}
                                                                                        checked={selectedValues.includes(option.value)}
                                                                                        disabled={option.value !== 'dontKnow' && selectedValues.includes('dontKnow')}
                                                                                        onChange={(e) => {
                                                                                            const {value} = e.target;

                                                                                            const newArray = selectedValues.includes(value)
                                                                                                ? selectedValues.filter(item => item !== value)
                                                                                                : [...selectedValues, value];

                                                                                            // If "dontKnow" is selected, deselect all others
                                                                                            // If other options are selected, deselect "dontKnow"
                                                                                            let updatedArray;
                                                                                            if (value === 'dontKnow') {
                                                                                                updatedArray = newArray.includes('dontKnow') ? ['dontKnow'] : newArray;
                                                                                            } else {
                                                                                                updatedArray = newArray.filter(item => item !== 'dontKnow');
                                                                                            }

                                                                                            // Convert the updated array into a comma-separated string
                                                                                            const updatedString = updatedArray.join(', ');

                                                                                            setFieldValue('howToEnrichHomemadeFood', updatedString);
                                                                                        }}
                                                                                    />
                                                                                }
                                                                                label={t(option.label)}
                                                                            />
                                                                        );
                                                                    })}
                                                                </FormGroup>

                                                                {values.howToEnrichHomemadeFood.split(', ').includes('Other') && (
                                                                    <Grid item xs={12} sm={7}>
                                                                        <TextField
                                                                            size="small"
                                                                            className={styles.formInput}
                                                                            name="howToEnrichHomemadeFood_other"
                                                                            id="howToEnrichHomemadeFood_other"
                                                                            value={values.howToEnrichHomemadeFood_other || ''}
                                                                            onChange={(e) => {
                                                                                setFieldValue('howToEnrichHomemadeFood_other', e.target.value);
                                                                            }}
                                                                            onBlur={handleBlur}
                                                                        />
                                                                    </Grid>
                                                                )}

                                                                {/* Error handling */}
                                                                {touched.howToEnrichHomemadeFood && errors.howToEnrichHomemadeFood && (
                                                                    <div
                                                                        className={styles.error}>{errors.howToEnrichHomemadeFood}</div>
                                                                )}
                                                            </Grid>

                                                        </>
                                                    )}


                                                    {/* TM */}
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.toldAboutUndernutritionTreatment && !!errors.toldAboutUndernutritionTreatment,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="toldAboutUndernutritionTreatment">
                                                            {t('tm1_were_you_told_that_the_child_is_receiving_treatment_for_undernutrition?')}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="toldAboutUndernutritionTreatment"
                                                                    name="toldAboutUndernutritionTreatment"
                                                                    value={values.toldAboutUndernutritionTreatment}
                                                                    onChange={handleChange} onBlur={handleBlur}
                                                                    error={touched.toldAboutUndernutritionTreatment && !!errors.toldAboutUndernutritionTreatment}>
                                                            <FormControlLabel value="1" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="2" control={<Radio/>}
                                                                              label={t('no')}/>
                                                        </RadioGroup>
                                                        {touched.toldAboutUndernutritionTreatment && errors.toldAboutUndernutritionTreatment &&
                                                            <div
                                                                className={styles.error}>{errors.toldAboutUndernutritionTreatment}</div>}
                                                    </Grid>
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.referredToHealthFacility && !!errors.referredToHealthFacility,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="referredToHealthFacility">
                                                            {t('tm2_was_the_child_referred_to_health_facility_during_past_12/16_weeks?')}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="referredToHealthFacility"
                                                                    name="referredToHealthFacility"
                                                                    value={values.referredToHealthFacility}
                                                                    onChange={handleChange} onBlur={handleBlur}
                                                                    error={touched.referredToHealthFacility && !!errors.referredToHealthFacility}>
                                                            <FormControlLabel value="1" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="2" control={<Radio/>}
                                                                              label={t('no')}/>
                                                        </RadioGroup>
                                                        {touched.referredToHealthFacility && errors.referredToHealthFacility &&
                                                            <div
                                                                className={styles.error}>{errors.referredToHealthFacility}</div>}
                                                    </Grid>
                                                    {values.referredToHealthFacility === '1' && (
                                                        <>
                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.takenToHealthFacility && !!errors.takenToHealthFacility,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="takenToHealthFacility">
                                                                    {t('tm3_did_you_take_the_child_to_health_facility?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <RadioGroup aria-label="takenToHealthFacility"
                                                                            name="takenToHealthFacility"
                                                                            value={values.takenToHealthFacility}
                                                                            onChange={(e) => {
                                                                                const {value} = e.target;
                                                                                setFieldValue('takenToHealthFacility', value);

                                                                                // Clear dependent values if 'No' is selected
                                                                                if (value === '2') {
                                                                                    setFieldValue('admittedToHealthFacility', '');
                                                                                    setFieldValue('whoConsumedThr', '');
                                                                                }
                                                                            }} onBlur={handleBlur}
                                                                            error={touched.takenToHealthFacility && !!errors.takenToHealthFacility}>
                                                                    <FormControlLabel value="1" control={<Radio/>}
                                                                                      label={t('yes')}/>
                                                                    <FormControlLabel value="2" control={<Radio/>}
                                                                                      label={t('no')}/>
                                                                </RadioGroup>
                                                                {touched.takenToHealthFacility && errors.takenToHealthFacility &&
                                                                    <div
                                                                        className={styles.error}>{errors.takenToHealthFacility}</div>}
                                                            </Grid>
                                                            {values.takenToHealthFacility === '2' && (
                                                                <>
                                                                    <Grid item xs={12} className={{
                                                                        [styles.invalid]: touched.reasonNotTakenToHealthFacility && !!errors.reasonNotTakenToHealthFacility,
                                                                    }}>
                                                                        <label className={styles.label}
                                                                               htmlFor="reasonNotTakenToHealthFacility">
                                                                            {t('tm3.1_what_were_the_reasons?')}
                                                                        </label>
                                                                        <TextField
                                                                            size="small"
                                                                            className={styles.formInput}
                                                                            name="reasonNotTakenToHealthFacility"
                                                                            id="reasonNotTakenToHealthFacility"
                                                                            value={values.reasonNotTakenToHealthFacility}
                                                                            onChange={handleChange}
                                                                            onBlur={handleBlur}
                                                                            error={touched.reasonNotTakenToHealthFacility && !!errors.reasonNotTakenToHealthFacility}
                                                                            helperText={touched.reasonNotTakenToHealthFacility && errors.reasonNotTakenToHealthFacility}
                                                                        />
                                                                    </Grid>
                                                                </>
                                                            )}

                                                            {values.takenToHealthFacility === '1' && (
                                                                <>
                                                                    <Grid item xs={12} className={{
                                                                        [styles.invalid]: touched.admittedToHealthFacility && !!errors.admittedToHealthFacility,
                                                                    }}>
                                                                        <label className={styles.label}
                                                                               htmlFor="admittedToHealthFacility">
                                                                            {t('tm4_was_the_child_admitted_in_a_health_facility_during_past_12/16_weeks?')}
                                                                            <span
                                                                                className={styles.requiredStar}>*</span>
                                                                        </label>
                                                                        <RadioGroup
                                                                            aria-label="admittedToHealthFacility"
                                                                            name="admittedToHealthFacility"
                                                                            value={values.admittedToHealthFacility}
                                                                            onChange={handleChange} onBlur={handleBlur}
                                                                            error={touched.admittedToHealthFacility && !!errors.admittedToHealthFacility}>
                                                                            <FormControlLabel value="1"
                                                                                              control={<Radio/>}
                                                                                              label={t('yes')}/>
                                                                            <FormControlLabel value="2"
                                                                                              control={<Radio/>}
                                                                                              label={t('no')}/>
                                                                        </RadioGroup>
                                                                        {touched.admittedToHealthFacility && errors.admittedToHealthFacility &&
                                                                            <div
                                                                                className={styles.error}>{errors.admittedToHealthFacility}</div>}
                                                                    </Grid>
                                                                </>
                                                            )}
                                                        </>
                                                    )}

                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.receivedMedicinesFromAnmOrMo && !!errors.receivedMedicinesFromAnmOrMo,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="receivedMedicinesFromAnmOrMo">
                                                            {t('mn1_did_you_receive_any_medicines_from_the_ANM/MO?')}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="receivedMedicinesFromAnmOrMo"
                                                                    name="receivedMedicinesFromAnmOrMo"
                                                                    value={values.receivedMedicinesFromAnmOrMo}
                                                                    onChange={handleChange} onBlur={handleBlur}
                                                                    error={touched.receivedMedicinesFromAnmOrMo && !!errors.receivedMedicinesFromAnmOrMo}>
                                                            <FormControlLabel value="1" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="2" control={<Radio/>}
                                                                              label={t('no')}/>
                                                        </RadioGroup>
                                                        {touched.receivedMedicinesFromAnmOrMo && errors.receivedMedicinesFromAnmOrMo &&
                                                            <div
                                                                className={styles.error}>{errors.receivedMedicinesFromAnmOrMo}</div>}
                                                    </Grid>
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.consumedAntibiotics && !!errors.consumedAntibiotics,
                                                    }}>
                                                        <label className={styles.label} htmlFor="consumedAntibiotics">
                                                            {t('mn2_antibiotics')}
                                                            <span
                                                                className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('mn2_hint')}</em>
                                                        <RadioGroup aria-label="consumedAntibiotics"
                                                                    name="consumedAntibiotics"
                                                                    value={values.consumedAntibiotics}
                                                                    onChange={handleChange} onBlur={handleBlur}
                                                                    error={touched.consumedAntibiotics && !!errors.consumedAntibiotics}>
                                                            <FormControlLabel value="1" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="2" control={<Radio/>}
                                                                              label={t('no')}/>
                                                            <FormControlLabel value="99" control={<Radio/>}
                                                                              label={t("dont_know")}/>
                                                            <FormControlLabel value="Not Applicable"
                                                                              control={<Radio/>}
                                                                              label={t('na')}/>
                                                        </RadioGroup>
                                                        {touched.consumedAntibiotics && errors.consumedAntibiotics &&
                                                            <div
                                                                className={styles.error}>{errors.consumedAntibiotics}</div>}
                                                    </Grid>
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.consumedDewormingMedicine && !!errors.consumedDewormingMedicine,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="consumedDewormingMedicine">
                                                            {t('mn3_did_the_child_consume_any_MEDICINE_TO_GET_RID_OF_INTENSTINAL_WORMS_in_the_past_12/16_weeks?')}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="consumedDewormingMedicine"
                                                                    name="consumedDewormingMedicine"
                                                                    value={values.consumedDewormingMedicine}
                                                                    onChange={handleChange} onBlur={handleBlur}
                                                                    error={touched.consumedDewormingMedicine && !!errors.consumedDewormingMedicine}>
                                                            <FormControlLabel value="1" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="2" control={<Radio/>}
                                                                              label={t('no')}/>
                                                            <FormControlLabel value="99" control={<Radio/>}
                                                                              label={t("dont_know")}/>
                                                            <FormControlLabel value="Not Applicable"
                                                                              control={<Radio/>}
                                                                              label={t('na')}/>
                                                        </RadioGroup>
                                                        {touched.consumedDewormingMedicine && errors.consumedDewormingMedicine &&
                                                            <div
                                                                className={styles.error}>{errors.consumedDewormingMedicine}</div>}
                                                    </Grid>

                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.consumedIronSyrup && !!errors.consumedIronSyrup,
                                                    }}>
                                                        <label className={styles.label} htmlFor="consumedIronSyrup">
                                                            {t('mn4_did_the_child_consume_IRON_SYRUP_like_this_in_the_past_12/16_weeks?')}
                                                            <span
                                                                className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('m4_hint')}</em>
                                                        <RadioGroup aria-label="consumedIronSyrup"
                                                                    name="consumedIronSyrup"
                                                                    value={values.consumedIronSyrup}
                                                                    onChange={handleChange} onBlur={handleBlur}
                                                                    error={touched.consumedIronSyrup && !!errors.consumedIronSyrup}>
                                                            <FormControlLabel value="1" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="2" control={<Radio/>}
                                                                              label={t('no')}/>
                                                            <FormControlLabel value="99" control={<Radio/>}
                                                                              label={t("dont_know")}/>
                                                            <FormControlLabel value="Not Applicable"
                                                                              control={<Radio/>}
                                                                              label={t('na')}/>
                                                        </RadioGroup>
                                                        {touched.consumedIronSyrup && errors.consumedIronSyrup &&
                                                            <div
                                                                className={styles.error}>{errors.consumedIronSyrup}</div>}
                                                    </Grid>
                                                    {values.consumedIronSyrup === '1' && (
                                                        <Grid item xs={12} className={{
                                                            [styles.invalid]: touched.timesIronSyrupConsumed && !!errors.timesIronSyrupConsumed,
                                                        }}>
                                                            <label className={styles.label}
                                                                   htmlFor="timesIronSyrupConsumed">
                                                                {t('mn5_how_many_times_was_the_iron_syrup_consumed_during_the_period?')}
                                                                <span className={styles.requiredStar}>*</span>
                                                            </label>
                                                            <RadioGroup aria-label="timesIronSyrupConsumed"
                                                                        name="timesIronSyrupConsumed"
                                                                        value={values.timesIronSyrupConsumed}
                                                                        onChange={handleChange} onBlur={handleBlur}
                                                                        error={touched.timesIronSyrupConsumed && !!errors.timesIronSyrupConsumed}>
                                                                <FormControlLabel value="During last one month"
                                                                                  control={<Radio/>}
                                                                                  label={t('during_last_one_month')}/>
                                                                <FormControlLabel value="During last one week"
                                                                                  control={<Radio/>}
                                                                                  label={t('during_last_one_week')}/>
                                                                <FormControlLabel value='Dont know' control={<Radio/>}
                                                                                  label={t("dont_know")}/>
                                                            </RadioGroup>
                                                            {(values.timesIronSyrupConsumed === "During last one month" ||
                                                                values.timesIronSyrupConsumed === "During last one week") && (
                                                                <Grid item xs={12} sm={7}>
                                                                    <TextField
                                                                        size="small"
                                                                        className={styles.formInput}
                                                                        label={t('mn5_extra')}
                                                                        type="number"
                                                                        name="timesIronSyrupConsumedTimes"
                                                                        id="timesIronSyrupConsumedTimes"
                                                                        variant="outlined"
                                                                        value={values.timesIronSyrupConsumedTimes}
                                                                        onChange={(e) => {
                                                                            const {value} = e.target;
                                                                            const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                                                            if (regex.test(value)) {
                                                                                handleChange(e); // Allow the change if it matches the regex
                                                                                if (value === '8') { // Compare as a string
                                                                                    setFieldValue('reasonLessIronSyrupConsumed', 'Not aware of correct doses');
                                                                                }
                                                                            }
                                                                        }}

                                                                        onBlur={handleBlur}
                                                                    />
                                                                </Grid>
                                                            )}
                                                            {touched.timesIronSyrupConsumed && errors.timesIronSyrupConsumed &&
                                                                <div
                                                                    className={styles.error}>{errors.timesIronSyrupConsumed}</div>}
                                                        </Grid>

                                                    )}
                                                    {values.consumedIronSyrup === '1' && (
                                                        <Grid item xs={12} className={{
                                                            [styles.invalid]: touched.reasonLessIronSyrupConsumed && !!errors.reasonLessIronSyrupConsumed,
                                                        }}>
                                                            <label className={styles.label}
                                                                   htmlFor="reasonLessIronSyrupConsumed">
                                                                {t('mn6_what_was_the_reason_if_consumed_less_than_times_in_the_last_month?')}
                                                                <span
                                                                    className={styles.requiredStar}>*</span>
                                                            </label>
                                                            <RadioGroup aria-label="reasonLessIronSyrupConsumed"
                                                                        name="reasonLessIronSyrupConsumed"
                                                                        value={values.reasonLessIronSyrupConsumed}
                                                                        onChange={handleChange} onBlur={handleBlur}
                                                                        error={touched.reasonLessIronSyrupConsumed && !!errors.reasonLessIronSyrupConsumed}>
                                                                <FormControlLabel value="Not aware of correct doses"
                                                                                  control={<Radio/>}
                                                                                  label={t('not_aware_about_correct_doses')}/>
                                                                <FormControlLabel value="Iron syrup not available"
                                                                                  control={<Radio/>}
                                                                                  label={t('iron_syrup_not_available')}/>
                                                                <FormControlLabel value="Not Applicable"
                                                                                  control={<Radio/>}
                                                                                  label={t("dont_know")}/>
                                                                <FormControlLabel value="Not Applicable Option"
                                                                                  control={<Radio/>}
                                                                                  label={t('na')}/>
                                                            </RadioGroup>
                                                            {touched.reasonLessIronSyrupConsumed && errors.reasonLessIronSyrupConsumed &&
                                                                <div
                                                                    className={styles.error}>{errors.reasonLessIronSyrupConsumed}</div>}
                                                        </Grid>
                                                    )}
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.consumedMultivitamin && !!errors.consumedMultivitamin,
                                                    }}>
                                                        <label className={styles.label} htmlFor="consumedMultivitamin">
                                                            {t('mn7_did_the_child_consume_any_multivitamin_supplement_in_the_past_12/16_weeks?')}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="consumedMultivitamin"
                                                                    name="consumedMultivitamin"
                                                                    value={values.consumedMultivitamin}
                                                                    onChange={handleChange} onBlur={handleBlur}
                                                                    error={touched.consumedMultivitamin && !!errors.consumedMultivitamin}>
                                                            <FormControlLabel value="1" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="2" control={<Radio/>}
                                                                              label={t('no')}/>
                                                            <FormControlLabel value="99" control={<Radio/>}
                                                                              label={t("dont_know")}/>
                                                            <FormControlLabel value="Not Applicable"
                                                                              control={<Radio/>}
                                                                              label={t('na')}/>
                                                        </RadioGroup>
                                                        {touched.consumedMultivitamin && errors.consumedMultivitamin &&
                                                            <div
                                                                className={styles.error}>{errors.consumedMultivitamin}</div>}
                                                    </Grid>
                                                    {(values.consumedMultivitamin === '1') && (
                                                        <>
                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.timesMultivitaminConsumed && !!errors.timesMultivitaminConsumed,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="timesMultivitaminConsumed">
                                                                    {t('mn8_how_many_times_was_the_multivitamins_consumed_during_the_period?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <RadioGroup aria-label="timesMultivitaminConsumed"
                                                                            name="timesMultivitaminConsumed"
                                                                            value={values.timesMultivitaminConsumed}
                                                                            onChange={handleChange} onBlur={handleBlur}
                                                                            error={touched.timesMultivitaminConsumed && !!errors.timesMultivitaminConsumed}>
                                                                    <FormControlLabel value="During last one month"
                                                                                      control={<Radio/>}
                                                                                      label={t('during_last_one_month')}/>
                                                                    <FormControlLabel value="During last one week"
                                                                                      control={<Radio/>}
                                                                                      label={t('during_last_one_week')}/>
                                                                    <FormControlLabel value="Dont know"
                                                                                      control={<Radio/>}
                                                                                      label={t("dont_know")}/>
                                                                </RadioGroup>
                                                                {(values.timesMultivitaminConsumed === "During last one month" ||
                                                                    values.timesMultivitaminConsumed === "During last one week") && (
                                                                    <Grid item xs={12} sm={7}>
                                                                        <TextField
                                                                            size="small"
                                                                            className={styles.formInput}
                                                                            label={t('mn8_extra')}
                                                                            type="number"
                                                                            name="timesMultiVitConsumedTimes"
                                                                            id="timesMultiVitConsumedTimes"
                                                                            variant="outlined"
                                                                            value={values.timesMultiVitConsumedTimes}
                                                                            onChange={(e) => {
                                                                                const {value} = e.target;
                                                                                const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                                                                if (regex.test(value)) {
                                                                                    handleChange(e); // Allow the change if it matches the regex
                                                                                    // if (value === '8') { // Compare as a string
                                                                                    //     setFieldValue('reasonLessIronSyrupConsumed', 'Not aware of correct doses');
                                                                                    // }
                                                                                }
                                                                            }}
                                                                            onBlur={handleBlur}
                                                                        />
                                                                    </Grid>
                                                                )}
                                                                {touched.timesMultivitaminConsumed && errors.timesMultivitaminConsumed &&
                                                                    <div
                                                                        className={styles.error}>{errors.timesMultivitaminConsumed}</div>}
                                                            </Grid>
                                                            {(values.timesMultivitaminConsumed === "During last one month" ||
                                                                values.timesMultivitaminConsumed === "During last one week") && (
                                                                <Grid item xs={12} className={{
                                                                    [styles.invalid]: touched.reasonLessMultivitaminConsumed && !!errors.reasonLessMultivitaminConsumed,
                                                                }}>
                                                                    <label className={styles.label}
                                                                           htmlFor="reasonLessMultivitaminConsumed">
                                                                        {t('mn9_what_was_the_reason_if_consumed_less_than_times_in_the_last_month?')}
                                                                        <span className={styles.requiredStar}>*</span>
                                                                    </label>
                                                                    <RadioGroup
                                                                        aria-label="reasonLessMultivitaminConsumed"
                                                                        name="reasonLessMultivitaminConsumed"
                                                                        value={values.reasonLessMultivitaminConsumed}
                                                                        onChange={handleChange} onBlur={handleBlur}
                                                                        error={touched.reasonLessMultivitaminConsumed && !!errors.reasonLessMultivitaminConsumed}>
                                                                        <FormControlLabel value="notAwareCorrectDoses"
                                                                                          control={<Radio/>}
                                                                                          label={t('not_aware_about_correct_doses')}/>
                                                                        <FormControlLabel
                                                                            value="multivitaminsNotAvailable"
                                                                            control={<Radio/>}
                                                                            label={t('multivitamins_was_not_available')}/>
                                                                        <FormControlLabel value="Other"
                                                                                          control={<Radio/>}
                                                                                          label={t('other')}/>
                                                                        <FormControlLabel value="Not Applicable"
                                                                                          control={<Radio/>}
                                                                                          label={t("dont_know")}/>
                                                                        <FormControlLabel value="Not Applicable Option"
                                                                                          control={<Radio/>}
                                                                                          label={t('na')}/>
                                                                    </RadioGroup>
                                                                    {values.reasonLessMultivitaminConsumed === 'Other' && (
                                                                        <TextField
                                                                            size="small"
                                                                            className={styles.formInput}
                                                                            name="reasonLessMultivitaminConsumedSpecify"
                                                                            id="reasonLessMultivitaminConsumedSpecify"
                                                                            value={values.reasonLessMultivitaminConsumedSpecify}
                                                                            onChange={handleChange}
                                                                            onBlur={handleBlur}
                                                                            error={touched.reasonLessMultivitaminConsumedSpecify && !!errors.reasonLessMultivitaminConsumedSpecify}
                                                                            helperText={touched.reasonLessMultivitaminConsumedSpecify && errors.reasonLessMultivitaminConsumedSpecify}
                                                                        />
                                                                    )}
                                                                    {touched.reasonLessMultivitaminConsumed && errors.reasonLessMultivitaminConsumed &&
                                                                        <div
                                                                            className={styles.error}>{errors.reasonLessMultivitaminConsumed}</div>}
                                                                </Grid>
                                                            )}
                                                        </>
                                                    )}
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.awwHomeVisitsCount && !!errors.awwHomeVisitsCount,
                                                    }}>
                                                        <label className={styles.label} htmlFor="awwHomeVisitsCount">
                                                            {t('mn10_how_many_home_visits_by_AWW_did_the_child/family_receive_in_the_past_one_month?')}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('mn10_hint')}</em>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="number"
                                                            name="awwHomeVisitsCount"
                                                            id="awwHomeVisitsCount"
                                                            value={values.awwHomeVisitsCount}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                                                if (regex.test(value)) {
                                                                    handleChange(e); // Allow the change if it matches the regex
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            onKeyDown={filterNumberKeyDown}
                                                            error={touched.awwHomeVisitsCount && !!errors.awwHomeVisitsCount}
                                                            helperText={touched.awwHomeVisitsCount && errors.awwHomeVisitsCount}
                                                        />
                                                    </Grid>
                                                    {(values.awwHomeVisitsCount !== 0) && (
                                                        <>
                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.familyPresentDuringAwwVisit && !!errors.familyPresentDuringAwwVisit,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="familyPresentDuringAwwVisit">
                                                                    {t('mn11_were_any_of_your_family_members_present_during_the_home_visit?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <RadioGroup aria-label="familyPresentDuringAwwVisit"
                                                                            name="familyPresentDuringAwwVisit"
                                                                            value={values.familyPresentDuringAwwVisit}
                                                                            onChange={handleChange} onBlur={handleBlur}
                                                                            error={touched.familyPresentDuringAwwVisit && !!errors.familyPresentDuringAwwVisit}>
                                                                    <FormControlLabel value="yes" control={<Radio/>}
                                                                                      label={t('yes')}/>
                                                                    <FormControlLabel value="no" control={<Radio/>}
                                                                                      label={t('no')}/>
                                                                </RadioGroup>
                                                                {touched.familyPresentDuringAwwVisit && errors.familyPresentDuringAwwVisit &&
                                                                    <div
                                                                        className={styles.error}>{errors.familyPresentDuringAwwVisit}</div>}
                                                            </Grid>
                                                            {values.familyPresentDuringAwwVisit === 'yes' && (
                                                                <Grid item xs={12} className={{
                                                                    [styles.invalid]: touched.familyMembersPresentDuringAwwVisit && !!errors.familyMembersPresentDuringAwwVisit,
                                                                }}>
                                                                    <label className={styles.label}
                                                                           htmlFor="familyMembersPresentDuringAwwVisit">
                                                                        {t('mn12_which_family_members_were_present_during_the_home_visit?')}
                                                                        <span className={styles.requiredStar}>*</span>
                                                                    </label>
                                                                    <FormGroup id="familyMembersPresentDuringAwwVisit">
                                                                        {[
                                                                            { value: 'mother In Law', label: 'mother_in_law' },
                                                                            { value: 'husband', label: 'husband' },
                                                                            { value: 'other Family Member', label: 'other_family_member' }
                                                                        ].map((option) => {
                                                                            const selectedValues = typeof values.familyMembersPresentDuringAwwVisit === 'string'
                                                                                ? values.familyMembersPresentDuringAwwVisit.split(', ').filter(Boolean)
                                                                                : [];

                                                                            return (
                                                                                <FormControlLabel
                                                                                    key={option.value}
                                                                                    control={
                                                                                        <Checkbox
                                                                                            value={option.value}
                                                                                            checked={selectedValues.includes(option.value)}
                                                                                            onChange={(e) => {
                                                                                                const { value } = e.target;
                                                                                                const newArray = selectedValues.includes(value)
                                                                                                    ? selectedValues.filter(item => item !== value)
                                                                                                    : [...selectedValues, value];
                                                                                                
                                                                                                // Convert array to comma-separated string
                                                                                                const updatedString = newArray.join(', ');
                                                                                                setFieldValue('familyMembersPresentDuringAwwVisit', updatedString);
                                                                                            }}
                                                                                        />
                                                                                    }
                                                                                    label={t(option.label)}
                                                                                />
                                                                            );
                                                                        })}
                                                                    </FormGroup>
                                                                    {touched.familyMembersPresentDuringAwwVisit && errors.familyMembersPresentDuringAwwVisit &&
                                                                        <div
                                                                            className={styles.error}>{errors.familyMembersPresentDuringAwwVisit}</div>}
                                                                </Grid>
                                                            )}

                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.awwInformationDiscussed && !!errors.awwInformationDiscussed,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="awwInformationDiscussed">
                                                                    {t('mn13_what_did_aww_inform_or_discuss_with_you?')}<span
                                                                    className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <em>{t('probe_responses_instruction_1')}</em>
                                                                <FormGroup id="awwInformationDiscussed">
                                                                    {[
                                                                        {
                                                                            text: 'Importance of giving colostrum to newborn',
                                                                            value: 'importance_of_giving_colostrum_to_newborn'
                                                                        },
                                                                        {
                                                                            text: 'Exclusive Breastfeeding importance',
                                                                            value: 'exclusive_breastfeeding_importance'
                                                                        },
                                                                        {
                                                                            text: 'Breastfeeding frequency',
                                                                            value: 'breastfeeding_frequency'
                                                                        },
                                                                        {
                                                                            text: 'Breastfeeding - correct position and attachment',
                                                                            value: 'breastfeeding_correct_position_and_attachment'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – when to start',
                                                                            value: 'complementary_feeding_when_to_start'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – frequency',
                                                                            value: 'complementary_feeding_frequency'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – consistency',
                                                                            value: 'complementary_feeding_consistency'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – age-appropriate quantity',
                                                                            value: 'complementary_feeding_age_appropriate_quantity'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – dietary diversity',
                                                                            value: 'complementary_feeding_dietary_diversity'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – feeding during illness',
                                                                            value: 'complementary_feeding_feeding_during_illness'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – responsive feeding',
                                                                            value: 'complementary_feeding_responsive_feeding'
                                                                        },
                                                                        {
                                                                            text: 'Stimulation activities / role of play therapy',
                                                                            value: 'stimulation_activities_role_of_play_therapy'
                                                                        },
                                                                        {
                                                                            text: 'Use of Take-Home Ration – preparation tips',
                                                                            value: 'use_of_take_home_ration_preparation_tips'
                                                                        },
                                                                        {
                                                                            text: 'Regular growth monitoring – importance',
                                                                            value: 'regular_growth_monitoring_importance'
                                                                        },
                                                                        {
                                                                            text: 'Nutrition status of children',
                                                                            value: 'nutrition_status_of_children'
                                                                        },
                                                                        {
                                                                            text: 'What is undernutrition / severe wasting/SAM',
                                                                            value: 'what_is_undernutrition_severe_wasting_sam'
                                                                        },
                                                                        {
                                                                            text: 'Consequences of undernutrition for child',
                                                                            value: 'consequences_of_undernutrition_for_child'
                                                                        },
                                                                        {
                                                                            text: 'Importance of hand-wash and sanitation',
                                                                            value: 'importance_of_hand_wash_and_sanitation'
                                                                        },
                                                                        {
                                                                            text: 'IFA supplementation for children',
                                                                            value: 'ifa_supplementation_for_children'
                                                                        },
                                                                        {
                                                                            text: 'Vitamin A supplementation for children',
                                                                            value: 'vitamin_a_supplementation_for_children'
                                                                        },
                                                                        {
                                                                            text: 'Deworming for children',
                                                                            value: 'deworming_for_children'
                                                                        },
                                                                        {
                                                                            text: 'Vaccination of child',
                                                                            value: 'vaccination_of_child'
                                                                        },
                                                                        {
                                                                            text: 'Care of sick child (diarrhea, fever etc.)',
                                                                            value: 'care_of_sick_child_diarrhea_fever_etc'
                                                                        },
                                                                        {
                                                                            text: 'Feeding demonstration',
                                                                            value: 'feeding_demonstration'
                                                                        },
                                                                        {text: 'Nothing', value: 'nothing'},
                                                                        {text: 'Other', value: 'other'}
                                                                    ].map((option) => (
                                                                        <FormControlLabel
                                                                            key={option.text}
                                                                            control={
                                                                                <Checkbox
                                                                                    value={option.text}
                                                                                    checked={values.awwInformationDiscussed.includes(option.text)}
                                                                                    disabled={option.text !== 'Nothing' && values.awwInformationDiscussed.includes('Nothing')}
                                                                                    onChange={(e) => {
                                                                                        const {value} = e.target;
                                                                                                                                                                const newArray = values.awwInformationDiscussed.includes(value)
                                                                            ? values.awwInformationDiscussed.filter((item) => item !== value)
                                                                            : [...values.awwInformationDiscussed, value];
                                                                        
                                                                        // If "Nothing" is selected, deselect all others
                                                                        // If other options are selected, deselect "Nothing"
                                                                        let filterNothing;
                                                                        if (value === 'Nothing') {
                                                                            filterNothing = newArray.includes('Nothing') ? ['Nothing'] : newArray;
                                                                        } else {
                                                                            filterNothing = newArray.filter(item => item !== 'Nothing');
                                                                        }
                                                                        setFieldValue("awwInformationDiscussed", filterNothing);
                                                                                    }}
                                                                                />
                                                                            }
                                                                            label={t(option.value)}
                                                                        />
                                                                    ))}
                                                                </FormGroup>

                                                                {touched.awwInformationDiscussed && errors.awwInformationDiscussed && (
                                                                    <div
                                                                        className={styles.error}>{errors.awwInformationDiscussed}</div>
                                                                )}
                                                            </Grid>
                                                            {values.awwInformationDiscussed.includes('Other') && (
                                                                <Grid item xs={7} className={{
                                                                    [styles.invalid]: touched.awwInformationDiscussed_other && !!errors.awwInformationDiscussed_other,
                                                                }}>
                                                                    <label className={styles.label}
                                                                           htmlFor="awwInformationDiscussed_other">
                                                                        {t('other_answer')} <span
                                                                        className={styles.requiredStar}>*</span>
                                                                    </label>
                                                                    <TextField
                                                                        size="small"
                                                                        className={styles.formInput}
                                                                        name="awwInformationDiscussed_other"
                                                                        id="awwInformationDiscussed_other"
                                                                        value={values.awwInformationDiscussed_other}
                                                                        onChange={handleChange}
                                                                        onBlur={handleBlur}
                                                                        error={touched.awwInformationDiscussed_other && !!errors.awwInformationDiscussed_other}
                                                                        helperText={touched.awwInformationDiscussed_other && errors.awwInformationDiscussed_other}
                                                                    />
                                                                </Grid>
                                                            )}

                                                            <Grid
                                                                item
                                                                xs={12}
                                                                className={{
                                                                    [styles.invalid]: touched.awwCounselingToolsUsed && !!errors.awwCounselingToolsUsed,
                                                                }}
                                                            >
                                                                <label className={styles.label}
                                                                       htmlFor="awwCounselingToolsUsed">
                                                                    {t('mn14_what_did_AWW_use_to_inform/counsel_you?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <FormGroup aria-label="AWW Counseling Tools Used"
                                                                           id="awwCounselingToolsUsed">
                                                                    {[
                                                                        {value: 'mcpCard', label: 'mcp_card'},
                                                                        {
                                                                            value: 'flipbook',
                                                                            label: 'flipbook_flipchart'
                                                                        },
                                                                        {
                                                                            value: 'video',
                                                                            label: 'video_on_mobile_device'
                                                                        },
                                                                        {
                                                                            value: 'counselingCard',
                                                                            label: 'counselling_card'
                                                                        },
                                                                        {value: 'poster', label: 'poster'},
                                                                        {value: 'other', label: 'other'},
                                                                        {value: 'nothing', label: 'nothing'},
                                                                    ].map((option) => {
                                                                        const selectedValues = typeof values.awwCounselingToolsUsed === 'string'
                                                                            ? values.awwCounselingToolsUsed.split(', ').filter(Boolean)
                                                                            : [];

                                                                        return (
                                                                            <FormControlLabel
                                                                                key={option.value}
                                                                                control={
                                                                                    <Checkbox
                                                                                        value={option.value}
                                                                                        checked={selectedValues.includes(option.value)}
                                                                                        disabled={option.value !== 'nothing' && selectedValues.includes('nothing')}
                                                                                        onChange={(e) => {
                                                                                            const {value} = e.target;

                                                                                            const newArray = selectedValues.includes(value)
                                                                                                ? selectedValues.filter(item => item !== value)
                                                                                                : [...selectedValues, value];

                                                                                                                                                                        // If "nothing" is selected, deselect all others
                                                                            // If other options are selected, deselect "nothing"
                                                                            let updatedArray;
                                                                            if (value === 'nothing') {
                                                                                updatedArray = newArray.includes('nothing') ? ['nothing'] : newArray;
                                                                            } else {
                                                                                updatedArray = newArray.filter(item => item !== 'nothing');
                                                                            }

                                                                                            // Convert the updated array into a comma-separated string
                                                                                            const updatedString = updatedArray.join(', ');

                                                                                            setFieldValue('awwCounselingToolsUsed', updatedString);
                                                                                        }}
                                                                                    />
                                                                                }
                                                                                label={t(option.label)}
                                                                            />
                                                                        );
                                                                    })}
                                                                </FormGroup>

                                                                {values.awwCounselingToolsUsed.split(', ').includes('other') && (
                                                                    <Grid item xs={12} sm={7}>
                                                                        <TextField
                                                                            size="small"
                                                                            className={styles.formInput}
                                                                            name="awwCounselingToolsUsed_other"
                                                                            id="awwCounselingToolsUsed_other"
                                                                            value={values.awwCounselingToolsUsed_other || ''}
                                                                            onChange={(e) => {
                                                                                setFieldValue('awwCounselingToolsUsed_other', e.target.value);
                                                                            }}
                                                                            onBlur={handleBlur}
                                                                        />
                                                                    </Grid>
                                                                )}

                                                                {/* Error handling */}
                                                                {touched.awwCounselingToolsUsed && errors.awwCounselingToolsUsed && (
                                                                    <div
                                                                        className={styles.error}>{errors.awwCounselingToolsUsed}</div>
                                                                )}
                                                            </Grid>

                                                        </>
                                                    )}

                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.ashaHomeVisitsCount && !!errors.ashaHomeVisitsCount,
                                                    }}>
                                                        <label className={styles.label} htmlFor="ashaHomeVisitsCount">
                                                            {t('mn15_how_many_home_visits_by_ASHA_did_the_child/family_receive_in_the_past_one_month?')}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('mn10_hint')}</em>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="number"
                                                            name="ashaHomeVisitsCount"
                                                            id="ashaHomeVisitsCount"
                                                            value={values.ashaHomeVisitsCount}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                                                if (regex.test(value)) {
                                                                    handleChange(e); // Allow the change if it matches the regex
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            onKeyDown={filterNumberKeyDown}
                                                            error={touched.ashaHomeVisitsCount && !!errors.ashaHomeVisitsCount}
                                                            helperText={touched.ashaHomeVisitsCount && errors.ashaHomeVisitsCount}
                                                        />
                                                    </Grid>
                                                    {(values.ashaHomeVisitsCount !== 0) && (
                                                        <>

                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.familyPresentDuringAshaVisit && !!errors.familyPresentDuringAshaVisit,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="familyPresentDuringAshaVisit">
                                                                    {t('mn16_were_any_of_your_family_members_present_during_the_home_visit?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <RadioGroup aria-label="familyPresentDuringAshaVisit"
                                                                            name="familyPresentDuringAshaVisit"
                                                                            value={values.familyPresentDuringAshaVisit}
                                                                            onChange={handleChange} onBlur={handleBlur}
                                                                            error={touched.familyPresentDuringAshaVisit && !!errors.familyPresentDuringAshaVisit}>
                                                                    <FormControlLabel value="1" control={<Radio/>}
                                                                                      label={t('yes')}/>
                                                                    <FormControlLabel value="2" control={<Radio/>}
                                                                                      label={t('no')}/>
                                                                </RadioGroup>
                                                                {touched.familyPresentDuringAshaVisit && errors.familyPresentDuringAshaVisit &&
                                                                    <div
                                                                        className={styles.error}>{errors.familyPresentDuringAshaVisit}</div>}
                                                            </Grid>
                                                            {values.familyPresentDuringAshaVisit === '1' && (
                                                                <Grid item xs={12} className={{
                                                                    [styles.invalid]: touched.familyMembersPresentDuringAshaVisit && !!errors.familyMembersPresentDuringAshaVisit,
                                                                }}>
                                                                    <label className={styles.label}
                                                                           htmlFor="familyMembersPresentDuringAshaVisit">
                                                                        {t('mn17_which_family_members_were_present_during_the_home_visit?')}
                                                                        <span className={styles.requiredStar}>*</span>
                                                                    </label>
                                                                    <RadioGroup
                                                                        aria-label="familyMembersPresentDuringAshaVisit"
                                                                        name="familyMembersPresentDuringAshaVisit"
                                                                        value={values.familyMembersPresentDuringAshaVisit}
                                                                        onChange={handleChange} onBlur={handleBlur}
                                                                        error={touched.familyMembersPresentDuringAshaVisit && !!errors.familyMembersPresentDuringAshaVisit}>
                                                                        <FormControlLabel value="1" control={<Radio/>}
                                                                                          label={t('mother_in_law')}/>
                                                                        <FormControlLabel value="2" control={<Radio/>}
                                                                                          label={t('husband')}/>
                                                                        <FormControlLabel value="3" control={<Radio/>}
                                                                                          label={t('other_family_member')}/>
                                                                    </RadioGroup>
                                                                    {touched.familyMembersPresentDuringAshaVisit && errors.familyMembersPresentDuringAshaVisit &&
                                                                        <div
                                                                            className={styles.error}>{errors.familyMembersPresentDuringAshaVisit}</div>}
                                                                </Grid>
                                                            )}


                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.ashaInformationDiscussed && !!errors.ashaInformationDiscussed,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="ashaInformationDiscussed">
                                                                    {t('mn18_asha_inform_discuss')}<span
                                                                    className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <em>{t('probe_responses_instruction_1')}</em>
                                                                <FormGroup id="ashaInformationDiscussed">
                                                                    {[
                                                                        {
                                                                            text: 'Importance of giving colostrum to newborn',
                                                                            value: 'importance_of_giving_colostrum_to_newborn'
                                                                        },
                                                                        {
                                                                            text: 'Exclusive Breastfeeding importance',
                                                                            value: 'exclusive_breastfeeding_importance'
                                                                        },
                                                                        {
                                                                            text: 'Breastfeeding frequency',
                                                                            value: 'breastfeeding_frequency'
                                                                        },
                                                                        {
                                                                            text: 'Breastfeeding - correct position and attachment',
                                                                            value: 'breastfeeding_correct_position_and_attachment'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – when to start',
                                                                            value: 'complementary_feeding_when_to_start'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – frequency',
                                                                            value: 'complementary_feeding_frequency'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – consistency',
                                                                            value: 'complementary_feeding_consistency'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – age-appropriate quantity',
                                                                            value: 'complementary_feeding_age_appropriate_quantity'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – dietary diversity',
                                                                            value: 'complementary_feeding_dietary_diversity'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – feeding during illness',
                                                                            value: 'complementary_feeding_feeding_during_illness'
                                                                        },
                                                                        {
                                                                            text: 'Complementary feeding – responsive feeding',
                                                                            value: 'complementary_feeding_responsive_feeding'
                                                                        },
                                                                        {
                                                                            text: 'Stimulation activities / role of play therapy',
                                                                            value: 'stimulation_activities_role_of_play_therapy'
                                                                        },
                                                                        {
                                                                            text: 'Use of Take-Home Ration – preparation tips',
                                                                            value: 'use_of_take_home_ration_preparation_tips'
                                                                        },
                                                                        {
                                                                            text: 'Regular growth monitoring – importance',
                                                                            value: 'regular_growth_monitoring_importance'
                                                                        },
                                                                        {
                                                                            text: 'Nutrition status of children',
                                                                            value: 'nutrition_status_of_children'
                                                                        },
                                                                        {
                                                                            text: 'What is undernutrition / severe wasting/SAM',
                                                                            value: 'what_is_undernutrition_severe_wasting_sam'
                                                                        },
                                                                        {
                                                                            text: 'Consequences of undernutrition for child',
                                                                            value: 'consequences_of_undernutrition_for_child'
                                                                        },
                                                                        {
                                                                            text: 'Importance of hand-wash and sanitation',
                                                                            value: 'importance_of_hand_wash_and_sanitation'
                                                                        },
                                                                        {
                                                                            text: 'IFA supplementation for children',
                                                                            value: 'ifa_supplementation_for_children'
                                                                        },
                                                                        {
                                                                            text: 'Vitamin A supplementation for children',
                                                                            value: 'vitamin_a_supplementation_for_children'
                                                                        },
                                                                        {
                                                                            text: 'Deworming for children',
                                                                            value: 'deworming_for_children'
                                                                        },
                                                                        {
                                                                            text: 'Vaccination of child',
                                                                            value: 'vaccination_of_child'
                                                                        },
                                                                        {
                                                                            text: 'Care of sick child (diarrhea, fever etc.)',
                                                                            value: 'care_of_sick_child_diarrhea_fever_etc'
                                                                        },
                                                                        {
                                                                            text: 'Feeding demonstration',
                                                                            value: 'feeding_demonstration'
                                                                        },
                                                                        {text: 'Nothing', value: 'nothing'},
                                                                        {text: 'Other', value: 'other'}
                                                                    ].map((option) => (
                                                                        <FormControlLabel
                                                                            key={option.text}
                                                                            control={
                                                                                <Checkbox
                                                                                    value={option.text}
                                                                                    checked={values.ashaInformationDiscussed.includes(option.text)}
                                                                                    disabled={option.text !== 'Nothing' && values.ashaInformationDiscussed.includes('Nothing')}
                                                                                    onChange={(e) => {
                                                                                        const {value} = e.target;
                                                                                                                                                                const newArray = values.ashaInformationDiscussed.includes(value)
                                                                            ? values.ashaInformationDiscussed.filter((item) => item !== value)
                                                                            : [...values.ashaInformationDiscussed, value];
                                                                        
                                                                        // If "Nothing" is selected, deselect all others
                                                                        // If other options are selected, deselect "Nothing"
                                                                        let filterNothing;
                                                                        if (value === 'Nothing') {
                                                                            filterNothing = newArray.includes('Nothing') ? ['Nothing'] : newArray;
                                                                        } else {
                                                                            filterNothing = newArray.filter(item => item !== 'Nothing');
                                                                        }
                                                                        setFieldValue("ashaInformationDiscussed", filterNothing);
                                                                                    }}
                                                                                />
                                                                            }
                                                                            label={t(option.value)}
                                                                        />
                                                                    ))}
                                                                </FormGroup>

                                                                {touched.ashaInformationDiscussed && errors.ashaInformationDiscussed && (
                                                                    <div
                                                                        className={styles.error}>{errors.ashaInformationDiscussed}</div>
                                                                )}
                                                            </Grid>
                                                            {values.ashaInformationDiscussed.includes('Other') && (
                                                                <Grid item xs={7} className={{
                                                                    [styles.invalid]: touched.ashaInformationDiscussed_other && !!errors.ashaInformationDiscussed_other,
                                                                }}>
                                                                    <label className={styles.label}
                                                                           htmlFor="ashaInformationDiscussed_other">
                                                                        {t('other_answer')} <span
                                                                        className={styles.requiredStar}>*</span>
                                                                    </label>
                                                                    <TextField
                                                                        size="small"
                                                                        className={styles.formInput}
                                                                        name="ashaInformationDiscussed_other"
                                                                        id="ashaInformationDiscussed_other"
                                                                        value={values.ashaInformationDiscussed_other}
                                                                        onChange={handleChange}
                                                                        onBlur={handleBlur}
                                                                        error={touched.ashaInformationDiscussed_other && !!errors.ashaInformationDiscussed_other}
                                                                        helperText={touched.ashaInformationDiscussed_other && errors.ashaInformationDiscussed_other}
                                                                    />
                                                                </Grid>
                                                            )}
                                                            <Grid item xs={12} className={{
                                                                [styles.invalid]: touched.ashaCounselingToolsUsed && !!errors.ashaCounselingToolsUsed,
                                                            }}>
                                                                <label className={styles.label}
                                                                       htmlFor="ashaCounselingToolsUsed">
                                                                    {t('MN19: What did ASHA use to inform / counsel you?')}
                                                                    <span className={styles.requiredStar}>*</span>
                                                                </label>
                                                                <FormGroup aria-label="ASHA Counseling Tools Used"
                                                                           id="ashaCounselingToolsUsed">
                                                                    {[
                                                                        {value: 'MCPcard', label: 'mcp_card'},
                                                                        {
                                                                            value: 'flipbookFlipchart',
                                                                            label: 'flipbook_flipchart'
                                                                        },
                                                                        {
                                                                            value: 'videoMobile',
                                                                            label: 'video_on_mobile_device'
                                                                        },
                                                                        {
                                                                            value: 'counselingCard',
                                                                            label: 'counselling_card'
                                                                        },
                                                                        {value: 'poster', label: 'poster'},
                                                                        {value: 'other', label: 'other'},
                                                                        {value: 'nothing', label: 'nothing'}
                                                                    ].map((option) => (
                                                                        <FormControlLabel
                                                                            key={option.value}
                                                                            control={
                                                                                <Checkbox
                                                                                    value={option.value}
                                                                                    checked={values.ashaCounselingToolsUsed.split(', ').includes(option.value)}
                                                                                    onChange={(e) => {
                                                                                        const {value} = e.target;
                                                                                        const selectedOptions = values.ashaCounselingToolsUsed
                                                                                            ? values.ashaCounselingToolsUsed.split(', ').filter(Boolean)
                                                                                            : [];

                                                                                        const newArray = selectedOptions.includes(value)
                                                                                            ? selectedOptions.filter(item => item !== value)
                                                                                            : [...selectedOptions, value];

                                                                                                                                                                // If "nothing" is selected, deselect all others
                                                                        // If other options are selected, deselect "nothing"
                                                                        let updatedArray;
                                                                        if (value === 'nothing') {
                                                                            updatedArray = newArray.includes('nothing') ? ['nothing'] : newArray;
                                                                        } else {
                                                                            updatedArray = newArray.filter(item => item !== 'nothing');
                                                                        }

                                                                                        // Convert the updated array into a string
                                                                                        const updatedString = updatedArray.join(', ');

                                                                                        setFieldValue("ashaCounselingToolsUsed", updatedString);
                                                                                    }}
                                                                                />
                                                                            }
                                                                            label={t(option.label)}
                                                                        />
                                                                    ))}
                                                                </FormGroup>

                                                                {values.ashaCounselingToolsUsed.split(', ').includes('other') && (
                                                                    <Grid item xs={12} sm={7}>
                                                                        <TextField
                                                                            size="small"
                                                                            className={styles.formInput}
                                                                            name="ashaCounselingToolsUsed_other"
                                                                            id="ashaCounselingToolsUsed_other"
                                                                            value={values.ashaCounselingToolsUsed_other || ''}
                                                                            onChange={(e) => {
                                                                                setFieldValue('ashaCounselingToolsUsed_other', e.target.value);
                                                                            }}
                                                                            onBlur={handleBlur}
                                                                        />
                                                                    </Grid>
                                                                )}

                                                                {/* Error handling (if needed) */}
                                                                {touched.ashaCounselingToolsUsed && errors.ashaCounselingToolsUsed && (
                                                                    <div
                                                                        className={styles.error}>{errors.ashaCounselingToolsUsed}</div>
                                                                )}
                                                            </Grid>

                                                        </>
                                                    )}


                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.recordedWeightAtAdmission && !!errors.recordedWeightAtAdmission,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="recordedWeightAtAdmission">
                                                            {t('anth1_recorded_weight_at_admission')}<span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('check_record')}</em>
                                                        <em>{t('not_enrolled_cmam99')}</em>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="number"
                                                            name="recordedWeightAtAdmission"
                                                            id="recordedWeightAtAdmission"
                                                            value={values.recordedWeightAtAdmission}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                const regex = /^\d{0,2}(\.\d{1,3})?$/; // Updated regex
                                                                if (regex.test(value)) {
                                                                    handleChange(e);
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                                            error={touched.recordedWeightAtAdmission && !!errors.recordedWeightAtAdmission}
                                                            helperText={touched.recordedWeightAtAdmission && errors.recordedWeightAtAdmission}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.recordedHeightLengthAtAdmission && !!errors.recordedHeightLengthAtAdmission,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="recordedHeightLengthAtAdmission">
                                                            {t('anth2_recorded_height/length_at_admission')}<span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('check_record')}</em>
                                                        <em>{t('not_enrolled_cmam999')}</em>

                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="number"
                                                            name="recordedHeightLengthAtAdmission"
                                                            id="recordedHeightLengthAtAdmission"
                                                            value={values.recordedHeightLengthAtAdmission}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                const regex = /^\d{0,3}(\.\d)?$/;
                                                                if (regex.test(value)) {
                                                                    handleChange(e);
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                                            error={touched.recordedHeightLengthAtAdmission && !!errors.recordedHeightLengthAtAdmission}
                                                            helperText={touched.recordedHeightLengthAtAdmission && errors.recordedHeightLengthAtAdmission}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.admissionMeasurementDate && !!errors.admissionMeasurementDate,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="admissionMeasurementDate">
                                                            {t('anth3_date_of_admission_measurement')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="date"
                                                            name="admissionMeasurementDate"
                                                            id="admissionMeasurementDate"
                                                            value={values.admissionMeasurementDate}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            error={touched.admissionMeasurementDate && !!errors.admissionMeasurementDate}
                                                            helperText={touched.admissionMeasurementDate && errors.admissionMeasurementDate}
                                                        />
                                                    </Grid>


                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.lastRecordedWeight && !!errors.lastRecordedWeight,
                                                    }}>
                                                        <label className={styles.label} htmlFor="lastRecordedWeight">
                                                            {t('anth4_last_measured/recorded_weight_(or discharge weight)')}
                                                            <span
                                                                className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('check_record')}</em>

                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="number"
                                                            name="lastRecordedWeight"
                                                            id="lastRecordedWeight"
                                                            value={values.lastRecordedWeight}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                const regex = /^\d{0,2}(\.\d{1,3})?$/; // Updated regex
                                                                if (regex.test(value)) {
                                                                    handleChange(e);
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                                            error={touched.lastRecordedWeight && !!errors.lastRecordedWeight}
                                                            helperText={touched.lastRecordedWeight && errors.lastRecordedWeight}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.lastRecordedHeightLength && !!errors.lastRecordedHeightLength,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="lastRecordedHeightLength">
                                                            {t('anth5_last_measured/recorded_height/Length (or discharge Height/Length)')}
                                                            <span
                                                                className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('check_record')}</em>

                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="number"
                                                            name="lastRecordedHeightLength"
                                                            id="lastRecordedHeightLength"
                                                            value={values.lastRecordedHeightLength}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                const regex = /^\d{0,3}(\.\d)?$/;
                                                                if (regex.test(value)) {
                                                                    handleChange(e);
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                                            error={touched.lastRecordedHeightLength && !!errors.lastRecordedHeightLength}
                                                            helperText={touched.lastRecordedHeightLength && errors.lastRecordedHeightLength}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.lastMeasurementDate && !!errors.lastMeasurementDate,
                                                    }}>
                                                        <label className={styles.label} htmlFor="lastMeasurementDate">
                                                            {t('anth6_date_of_last_measurement')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="date"
                                                            name="lastMeasurementDate"
                                                            id="lastMeasurementDate"
                                                            value={values.lastMeasurementDate}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            error={touched.lastMeasurementDate && !!errors.lastMeasurementDate}
                                                            helperText={touched.lastMeasurementDate && errors.lastMeasurementDate}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.currentWeight && !!errors.currentWeight,
                                                    }}>
                                                        <label className={styles.label} htmlFor="currentWeight">
                                                            {t('anth7_current_weight_(KG)')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('not_record99')}</em>

                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="number"
                                                            name="currentWeight"
                                                            id="currentWeight"
                                                            value={values.currentWeight}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                const regex = /^\d{0,2}(\.\d{1,3})?$/; // Updated regex
                                                                if (regex.test(value)) {
                                                                    handleChange(e);
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                                            error={touched.currentWeight && !!errors.currentWeight}
                                                            helperText={touched.currentWeight && errors.currentWeight}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.currentHeightLength && !!errors.currentHeightLength,
                                                    }}>
                                                        <label className={styles.label} htmlFor="currentHeightLength">
                                                            {t('anth8_current_Height/Length(CM)')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <em>{t('not_record999')}</em>

                                                        <TextField
                                                            size="small"
                                                            className={styles.formInput}
                                                            type="number"
                                                            name="currentHeightLength"
                                                            id="currentHeightLength"
                                                            value={values.currentHeightLength}
                                                            onChange={(e) => {
                                                                const {value} = e.target;
                                                                const regex = /^\d{0,3}(\.\d)?$/;
                                                                if (regex.test(value)) {
                                                                    handleChange(e);
                                                                }
                                                            }}
                                                            onBlur={handleBlur}
                                                            onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                                            error={touched.currentHeightLength && !!errors.currentHeightLength}
                                                            helperText={touched.currentHeightLength && errors.currentHeightLength}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.measurementMethod && !!errors.measurementMethod,
                                                    }}>
                                                        <label className={styles.label} htmlFor="measurementMethod">
                                                            {t('anth9_measuring_lying_down_or_standing_up?')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="Measuring position"
                                                                    name="measurementMethod" size="small"
                                                                    id="measurementMethod"
                                                                    value={values.measurementMethod}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.measurementMethod && !!errors.measurementMethod}>
                                                            <FormControlLabel value="LyingDown" control={<Radio/>}
                                                                              label={t('lying_down')}/>
                                                            <FormControlLabel value="StandingUp" control={<Radio/>}
                                                                              label={t('standing_up')}/>
                                                            <FormControlLabel value="NotMeasured" control={<Radio/>}
                                                                              label={t('not_measured')}/>
                                                        </RadioGroup>
                                                    </Grid>

                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.bilateralPittingOedema && !!errors.bilateralPittingOedema,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="bilateralPittingOedema">
                                                            {t('anth10_bilateral_pitting_oedema')} <span
                                                            className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="Bilateral Pitting oedema"
                                                                    name="bilateralPittingOedema" size="small"
                                                                    id="bilateralPittingOedema"
                                                                    value={values.bilateralPittingOedema}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.bilateralPittingOedema && !!errors.bilateralPittingOedema}>
                                                            <FormControlLabel value="Yes" control={<Radio/>}
                                                                              label={t('yes')}/>
                                                            <FormControlLabel value="No" control={<Radio/>}
                                                                              label={t('no')}/>
                                                        </RadioGroup>
                                                    </Grid>

                                                    <Grid item xs={7} className={{
                                                        [styles.invalid]: touched.reasonNotMeasured && !!errors.reasonNotMeasured,
                                                    }}>
                                                        <label className={styles.label} htmlFor="reasonNotMeasured">
                                                            {t('anth11_if_any_of_the_above_measurement_was_not_done,_what_is_the_reason_for_not_measuring_the_child?')}
                                                            <span className={styles.requiredStar}>*</span>
                                                        </label>
                                                        <RadioGroup aria-label="Measuring position"
                                                                    name="reasonNotMeasured" size="small"
                                                                    id="reasonNotMeasured"
                                                                    value={values.reasonNotMeasured}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.reasonNotMeasured && !!errors.reasonNotMeasured}>
                                                            <FormControlLabel
                                                                value="Not present at the time of measuring"
                                                                control={<Radio/>}
                                                                label={t('Not_present_at_the_time_of_measuring')}/>
                                                            <FormControlLabel value="Sick" control={<Radio/>}
                                                                              label={t('sick')}/>
                                                            <FormControlLabel value="Not Measured" control={<Radio/>}
                                                                              label={t('not_measured')}/>
                                                            <FormControlLabel value="Not Applicable" control={<Radio/>}
                                                                              label={t("dont_know")}/>
                                                            <FormControlLabel value="Not Applicable Option" control={<Radio/>}
                                                                              label={t('na')}/>
                                                        </RadioGroup>
                                                    </Grid>

                                                    <Grid item xs={12} display={"flex"} alignItems={"center"}
                                                          justifyContent={"center"}>
                                                        <Button variant="contained" color="primary"
                                                                style={{marginRight: "20px"}} onClick={handleBack}
                                                                startIcon={<ArrowBack/>}>
                                                            {t('back')}
                                                        </Button>

                                                        <Button
                                                            className="ml-2"
                                                            variant="contained"
                                                            color="primary"
                                                            fullWidth={false}
                                                            onClick={() => handleNext(values, {setErrors, setTouched})}
                                                            startIcon={<ArrowForward/>}
                                                        >
                                                            {t('next')}
                                                        </Button>
                                                    </Grid>
                                                </Grid>
                                            </Box>

                                        </>
                                    )}
                                    {step === 2 && (
                                        <>
                                            <Box className={styles.formSection}>
                                                <Box className={styles.sectionHeader}>
                                                    <Box className={styles.sectionIcon}>
                                                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                                                            ℹ️
                                                        </Typography>
                                                    </Box>
                                                    <Box>
                                                        <Typography className={styles.sectionTitle}>
                                                            {t('any_other_information')}
                                                        </Typography>
                                                        <Typography className={styles.sectionSubtitle}>
                                                            Additional information and notes
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Grid container rowSpacing={2} sx={{
                                                    margin: '0',
                                                    width: '100%'
                                                }}>
                                                    <Grid item xs={12} className={{
                                                        [styles.invalid]: touched.relevantInfo && !!errors.relevantInfo,
                                                    }}>
                                                        <label className={styles.label}
                                                               htmlFor="relevantInfo">
                                                            {t('write_other_relevant_information')}
                                                        </label>
                                                        <TextareaAutosize
                                                            minRows={6}
                                                            className={styles.formInput}
                                                            name="relevantInfo"
                                                            id="relevantInfo"
                                                            value={values.relevantInfo}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            error={touched.relevantInfo && !!errors.relevantInfo}
                                                        />
                                                        {touched.relevantInfo && !!errors.relevantInfo ? (
                                                            <div
                                                                className={styles.error}>{errors.relevantInfo}</div>
                                                        ) : null}
                                                    </Grid>


                                                    <Grid item xs={12} display={"flex"}
                                                          alignItems={"center"}
                                                          justifyContent={"center"}>
                                                        <Button variant="contained" color="primary"
                                                                style={{marginRight: "20px"}}
                                                                onClick={handleBack}
                                                                startIcon={<ArrowBack/>}>
                                                            {t('back')}
                                                        </Button>

                                                        <Button
                                                            className="ml-2"
                                                            variant="contained"
                                                            color="primary"
                                                            type="submit"
                                                            disabled={loadingStatus || submitButtonDisabled}
                                                            endIcon={<Check/>}
                                                        >
                                                            {loadingStatus ? 
                                                                (isRetrying ? `Retrying (${retryCount}/3)...` : 'Submitting...') : 
                                                                (isOnline ? t('submit') : t('save'))
                                                            }
                                                        </Button>
                                                        
                                                        {showSaveOfflineOption && (
                                                            <Button
                                                                variant="outlined"
                                                                color="warning"
                                                                onClick={() => handleSaveOffline(values, { resetForm })}
                                                                disabled={loadingStatus}
                                                                sx={{ ml: 2 }}
                                                            >
                                                                Save Offline
                                                            </Button>
                                                        )}
                                                    </Grid>
                                                </Grid>
                                            </Box>
                                            {
                                                loadingStatus && <Loader loading={loadingStatus}/>
                                            }
                                        </>
                                    )}

                                </Form>
                                );
                            }}
                        </Formik>
                    </Box>
                        </Container>
      </div>
    </>
  );
};

export default Followup;
