import React, { useState, forwardRef, useImperativeHandle } from 'react'
import { useNavigate } from "react-router-dom";
import styles from "./survey.module.css";
import * as Yup from "yup";
import SnackBar from "components/ui/SnackBar";
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import ListItemText from '@mui/material/ListItemText';

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
} from "@mui/material";
import apiService from '../../services/api';
import Loader from "components/ui/Loader";
import { ArrowBack, ArrowForward, Check } from "@mui/icons-material";
import { getStateOptions, getDistrictOptions, getBlockOptions } from "constants";
import { useTranslation } from "react-i18next";
import { filterNumberKeyDown } from 'utils'
import { saveOfflineForm } from 'utils/indexDB'
import useNetworkStatus from 'utils/networkState';
import AwaRegistration from './AwaRegistration';
import { styled } from '@mui/material/styles';
import { useCheckboxGroupWithOthers, useRadioGroupWithOthers, createOthersValidation } from 'utils/formUtils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

// Styled components for better section styling
const StyledDetails = styled('details')(({ theme }) => ({
    marginBottom: theme.spacing(3),
    padding: theme.spacing(1),
    borderRadius: theme.spacing(1),
    backgroundColor: '#f9f9f9',
    '&[open]': {
        paddingBottom: theme.spacing(2),
    },
    '& summary': {
        cursor: 'pointer',
        padding: theme.spacing(1),
        fontWeight: 'bold',
        fontSize: '1.05rem',
        backgroundColor: '#e8f4fd',
        borderRadius: theme.spacing(0.5),
        marginBottom: theme.spacing(2),
        '&:hover': {
            backgroundColor: '#d5e8f6',
        },
    }
}));

const validationSchema = Yup.object({
    ...createOthersValidation('string', 'cmamTraining', 'cmamTrainingOther', true),
    lastTrainingDate: Yup.date().when('cmamTraining', 
        (cmamTraining, schema) => {
            return cmamTraining === 'Yes'
                ? schema.required("Please provide training date")
                : schema;
        }
    ),
    lastDiscussionDate: Yup.date(),
    lastMeasurementDate: Yup.date(),
    childSex: Yup.string().required("This is a required field"),
    childAge: Yup.string()
        .matches(/^\d+$/, "Must be a valid number")
        .test('max-length', 'Must be at most 2 digits', value => !value || value.length <= 2)
        .required("This is a required field"),
    childWeight: Yup.string()
        .matches(/^\d*\.?\d*$/, "Must be a valid number")
        .required("This is a required field"),
    childHeight: Yup.string()
        .matches(/^\d*\.?\d*$/, "Must be a valid number")
        .required("This is a required field"),
    ...createOthersValidation('string', 'instrumentAww', 'instrumentAwwOther', true),
    instrumentAwwMissing: Yup.string().when('instrumentAww', 
        (instrumentAww, schema) => {
            return instrumentAww === 'Not available'
                ? schema.required("Please specify what was used instead")
                : schema;
        }
    ),
    ...createOthersValidation('array', 'salterScaleSteps', 'salterScaleStepsOther', false),
    childWeightRecord: Yup.string().required("This is a required field"),
    fieldMonitorWeight: Yup.string().required("This is a required field"),
    ...createOthersValidation('string', 'heightInstrument', 'heightInstrumentOther', true),
    infantometerSteps: Yup.string().when('heightInstrument', 
        (heightInstrument, schema) => {
            return heightInstrument === 'Infantometer'
                ? schema.required("Please select measurement steps")
                : schema;
        }
    ),
    stadiometerSteps: Yup.string().when('heightInstrument', 
        (heightInstrument, schema) => {
            return heightInstrument === 'Stadiometer'
                ? schema.required("Please select measurement steps")
                : schema;
        }
    ),
    heightRecord: Yup.string().required("This is a required field"),
    fieldMonitorHeight: Yup.string().required("This is a required field"),
    wastingClassification: Yup.string().required("This is a required field"),
    samScreeningCriteria: Yup.string().required("This is a required field"),
    ...createOthersValidation('string', 'appetiteTestFood', 'appetiteTestFoodOther', true),
    ...createOthersValidation('array', 'samTreatmentMedicines', 'samTreatmentMedicinesOther', true),
    ...createOthersValidation('array', 'oedemaCheckSteps', 'oedemaCheckStepsOther', true),
    wastingWithOedema: Yup.string().required("This is a required field"),
    medicalComplications: Yup.string().required("This is a required field"),
    appetiteTestFailNoComplications: Yup.string().required("This is a required field"),
    bilateralPittingOedema: Yup.string().required("This is a required field"),
    medicalComplicationDuringCmam: Yup.string().required("This is a required field"),
    appetiteTestFailFollowUp: Yup.string().required("This is a required field"),
    weightLossNoGainFollowUp: Yup.string().required("This is a required field"),
    complicationsTwoFollowUps: Yup.string().required("This is a required field"),
    ...createOthersValidation('string', 'followUpFrequency', 'followUpFrequencyOther', true),
    ...createOthersValidation('array', 'followUpActivities', 'followUpActivitiesOther', true),
});

const SkillAssessment = forwardRef((props, ref) => {
    const { t } = useTranslation();
    
    // Validation state
    const [showValidation, setShowValidation] = useState(false);
    
    // Form values state for validation
    const [formValues, setFormValues] = useState({
        cmamTraining: '',
        childSex: '',
        childAge: '',
        childWeight: '',
        childHeight: '',
        instrumentAww: '',
        childHeightInstrumentOther: '',
        measurementFollowedStepDigital: [],
        measurementFollowedStepMechanical: [],
        measurementFollowedStepSalter: [],
        childWeightAww: '',
        childWeightFieldMonitor: '',
        childHeightInstrument: '',
        infantometerSteps: [],
        stadiometerSteps: [],
        childHeightAww: '',
        childHeightFieldMonitor: '',
        classifyWastingAww: '',
        nutritionalStatusXScorecard: '',
        screeningSamChildren: '',
        appetiteTestFood: [],
        appetiteTestFoodOther: '',
        nutritionalOedema: [],
        childNrcMtc: [],
        childFollowupCmam: '',
        childFollowupCmamOther: '',
        activitiesFollowupCmam: [],
        activitiesFollowupCmamOther: ''
    });
    
    // Helper function to update form values
    const updateFormValue = (field, value) => {
        setFormValues(prev => ({
            ...prev,
            [field]: value
        }));
    };
    
    // Function to check if field should show error
    const shouldShowError = (fieldName) => {
        if (!showValidation) return false;
        const value = formValues[fieldName];
        if (Array.isArray(value)) {
            return value.length === 0;
        }
        return !value || value.trim() === '';
    };
    const [cmamTraining, setCmamTraining] = useState('');
    const [instrumentAww, setInstrumentAww] = useState('');
    const [heightInstrument, setHeightInstrument] = useState('');
    const [appetiteTestFood, setAppetiteTestFood] = useState([]);
    const [appetiteTestFoodOther, setAppetiteTestFoodOther] = useState('');
    const [childFollowupCmam, setChildFollowupCmam] = useState('');
    const [childFollowupCmamOther, setChildFollowupCmamOther] = useState('');
    const [activitiesFollowupCmam, setActivitiesFollowupCmam] = useState([]);
    const [activitiesFollowupCmamOther, setActivitiesFollowupCmamOther] = useState('');
    const [lastTrainingMonthYear, setLastTrainingMonthYear] = useState('');
    const [lastDiscussionMonthYear, setLastDiscussionMonthYear] = useState('');
    const [measurementFollowedStepDigital, setMeasurementFollowedStepDigital] = useState([]);
    const [measurementFollowedStepMechanical, setMeasurementFollowedStepMechanical] = useState([]);
    const [measurementFollowedStepSalter, setMeasurementFollowedStepSalter] = useState([]);
    const [infantometerSteps, setInfantometerSteps] = useState([]);
    const [stadiometerSteps, setStadiometerSteps] = useState([]);
    const [nutritionalOedema, setNutritionalOedema] = useState([]);
    const [childNrcMtc, setChildNrcMtc] = useState([]);
    const [lastMeasurementDate, setLastMeasurementDate] = useState('');
    const [childWeight, setChildWeight] = useState('');
    const [childSex, setChildSex] = useState('');
    const [childAge, setChildAge] = useState('');
    const [childHeight, setChildHeight] = useState('');
    const [childWeightAww, setChildWeightAww] = useState('');
    const [childWeightFieldMonitor, setChildWeightFieldMonitor] = useState('');
    const [childHeightInstrumentOther, setChildHeightInstrumentOther] = useState('');
    const [childHeightAww, setChildHeightAww] = useState('');
    const [childHeightFieldMonitor, setChildHeightFieldMonitor] = useState('');
    const [classifyWastingAww, setClassifyWastingAww] = useState('');
    const [nutritionalStatusXScorecard, setNutritionalStatusXScorecard] = useState('');
    const [screeningSamChildren, setScreeningSamChildren] = useState('');

    const generateMonthOptions = () => [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];
    const generateYearOptions = () => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 12 }, (_, i) => (currentYear - i).toString());
    };
    
    // Function to trigger validation (called from parent on submit)
    const triggerValidation = () => {
        setShowValidation(true);
        
        // Check all required fields using formValues state
        const requiredFields = [
            'cmamTraining', 'childSex', 'childAge', 'childWeight', 'childHeight',
            'instrumentAww', 'childHeightInstrument', 'classifyWastingAww', 'screeningSamChildren',
            'childFollowupCmam'
        ];
        
        // Add conditional required fields
        if (formValues.instrumentAww && formValues.instrumentAww !== 'Not functional / Not available') {
            requiredFields.push('childWeightAww', 'childWeightFieldMonitor');
            
            if (formValues.instrumentAww === 'Digital Weighing Scale') {
                requiredFields.push('measurementFollowedStepDigital');
            } else if (formValues.instrumentAww === 'Mechanical Weighing Scale') {
                requiredFields.push('measurementFollowedStepMechanical');
            } else if (formValues.instrumentAww === 'Salter Weighing Scale (Mechanical/Digital)') {
                requiredFields.push('measurementFollowedStepSalter');
            }
        }
        
        if (formValues.childHeightInstrument && formValues.childHeightInstrument !== 'Not functional / Not available') {
            requiredFields.push('childHeightAww', 'childHeightFieldMonitor');
            
            if (formValues.childHeightInstrument === 'Infantometer') {
                requiredFields.push('infantometerSteps');
            } else if (formValues.childHeightInstrument === 'Stadiometer') {
                requiredFields.push('stadiometerSteps');
            } else if (formValues.childHeightInstrument === 'Others') {
                requiredFields.push('childHeightInstrumentOther');
            }
        }
        
        // Add conditional required field for 4.18 based on 4.17 selection
        if (formValues.classifyWastingAww === 'Used WFL / WFH z-score chart') {
            requiredFields.push('nutritionalStatusXScorecard');
        }

        // Check conditional other fields
        if (formValues.appetiteTestFood.includes('others')) {
            requiredFields.push('appetiteTestFoodOther');
        }
        if (formValues.childFollowupCmam === 'Others') {
            requiredFields.push('childFollowupCmamOther');
        }
        if (formValues.activitiesFollowupCmam.includes('others')) {
            requiredFields.push('activitiesFollowupCmamOther');
        }
        
        // Add multi-select required fields
        requiredFields.push('appetiteTestFood', 'nutritionalOedema', 'childNrcMtc', 'activitiesFollowupCmam');
        
        // Find first invalid field
        let firstInvalidField = null;
        for (const field of requiredFields) {
            const value = formValues[field];
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    firstInvalidField = field;
                    break;
                }
            } else {
                if (!value || value.trim() === '') {
                    firstInvalidField = field;
                    break;
                }
            }
        }
        
        // If we found an invalid field, scroll to it
        if (firstInvalidField) {
            setTimeout(() => {
                const element = document.querySelector(`[name="${firstInvalidField}"]`);
                if (element) {
                    element.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'nearest'
                    });
                    element.focus();
                }
            }, 100);
            return false;
        }
        
        return true;
    };
    
    // Expose validation function to parent component
    useImperativeHandle(ref, () => ({
        triggerValidation
    }));

    return (
        <div id="skillAssessmentForm" name="skillAssessmentForm">
            <StyledDetails open>
                <summary>&nbsp;{t('section4SkillAssessment')}</summary>
                <Grid container rowSpacing={3} columnSpacing={2} sx={{
                    margin: '0',
                    width: '100%'
                }}>
                    {/* Training Section */}
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#1976d2' }}>
                            {t('trainingAndBackground')}
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="cmamTraining">
                            {t('section41CMAMTraining')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="cmamTraining"
                            name="cmamTraining"
                            value={formValues.cmamTraining}
                            onChange={(e) => {
                                const value = e.target.value;
                                updateFormValue('cmamTraining', value);
                                setCmamTraining(value);
                                // If "No" is selected, clear the training date
                                if (value === 'No') {
                                    setLastTrainingMonthYear('');
                                }
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('cmamTraining') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationRequiredField') || 'This field is required'}
                            </Typography>
                        )}
                    </Grid>

                    {/* Conditional Question 4.2 - only appears when "Yes" is selected for 4.1 */}
                    {cmamTraining === 'Yes' && (
                        <>
                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="lastTrainingDate">
                                    {t('section42LastTrainingDate')}
                                </label>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1, color: '#666' }}>
                                    {t('awwCannotRecallInstruction')}
                                </Typography>
                                <Box sx={{ mb: 2 }} />
                                <DatePicker
                                    views={['year', 'month']}
                                    label={t('selectMonthYear')}
                                    minDate={dayjs('2010-01-01')}
                                    maxDate={dayjs()}
                                    value={lastTrainingMonthYear ? dayjs(lastTrainingMonthYear) : null}
                                    onChange={(newValue) => setLastTrainingMonthYear(newValue ? newValue.format('MM/YYYY') : '')}
                                    format="MM/YYYY"
                                    slotProps={{ textField: { size: 'small', className: styles.formInput } }}
                                />
                                {/* Hidden field for backend */}
                                <input
                                    type="hidden"
                                    name="cmamTrainingMonth"
                                    value={lastTrainingMonthYear || ''}
                                />
                            </Grid>
                        </>
                    )}

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="lastDiscussionDate">
                            {t('section43LastDiscussionDate')}
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1, color: '#666' }}>
                            {t('awwCannotRecallInstruction')}
                        </Typography>
                        <Box sx={{ mb: 2 }} />
                        <DatePicker
                            views={['year', 'month']}
                            label={t('selectMonthYear')}
                            minDate={dayjs('2010-01-01')}
                            maxDate={dayjs()}
                            value={lastDiscussionMonthYear ? dayjs(lastDiscussionMonthYear) : null}
                            onChange={(newValue) => setLastDiscussionMonthYear(newValue ? newValue.format('MM/YYYY') : '')}
                            format="MM/YYYY"
                            slotProps={{ textField: { size: 'small', className: styles.formInput } }}
                        />
                        {/* Hidden field for backend */}
                        <input
                            type="hidden"
                            name="cmamTrainingDiscussed"
                            value={lastDiscussionMonthYear || ''}
                        />
                    </Grid>

                    {/* New H2 heading between 4.3 and 4.4 */}
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 3, color: '#1976d2' }}>
                            {t('practicalAssessmentChildMeasurement')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2, color: '#666' }}>
                            {t('identifyChildInstructions')}
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="lastMeasurementDate">
                            {t('section44LastMeasurementDate')}
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1, color: '#666' }}>
                            {t('awcRecordPoshanTracker')}
                        </Typography>
                       <TextField
                            size="small"
                            className={styles.formInput}
                            type="date"
                            name="lastMeasurementDate"
                            id="lastMeasurementDate"
                            value={lastMeasurementDate}
                            onChange={(e) => setLastMeasurementDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <label className={styles.label} htmlFor="childSex">
                            {t('section45ChildSex')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childSex"
                            name="childSex"
                            value={formValues.childSex}
                            onChange={(e) => {
                                updateFormValue('childSex', e.target.value);
                                setChildSex(e.target.value);
                            }}
                        >
                            <FormControlLabel value="Male" control={<Radio />} label={t('male')} />
                            <FormControlLabel value="Female" control={<Radio />} label={t('female')} />
                        </RadioGroup>
                        {shouldShowError('childSex') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationRequiredField') || 'This field is required'}
                            </Typography>
                        )}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <label className={styles.label} htmlFor="childAge">
                            {t('section46ChildAge')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1, color: '#666' }}>
                            {t('awcRecordPoshanTracker')}
                        </Typography>
                        <TextField
                            size="small"
                            className={styles.formInput}
                            name="childAge"
                            id="childAge"
                            value={formValues.childAge}
                            placeholder={t('enterAgeInMonths')}
                            inputProps={{ 
                                maxLength: 3,
                                pattern: "[0-9]*"
                            }}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Allow only numbers, max 3 characters (for ages up to 999 months)
                                if (/^\d*$/.test(value) && value.length <= 3) {
                                    updateFormValue('childAge', value);
                                    setChildAge(value);
                                }
                            }}
                            onKeyPress={(e) => {
                                // Allow only numbers and backspace
                                if (!/\d/.test(e.key) && e.key !== 'Backspace') {
                                    e.preventDefault();
                                }
                            }}
                            error={shouldShowError('childAge')}
                        />
                        {shouldShowError('childAge') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationRequiredField') || 'This field is required'}
                            </Typography>
                        )}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <label className={styles.label} htmlFor="childWeight">
                            {t('section47ChildWeight')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1, color: '#666' }}>
                            {t('awcRecordPoshanTracker')}
                        </Typography>
                        <TextField
                            size="small"
                            className={styles.formInput}
                            name="childWeight"
                            id="childWeight"
                            value={formValues.childWeight}
                            placeholder={t('enterWeightInKg')}
                            inputProps={{ 
                                maxLength: 6,
                                pattern: "^[0-9]*\\.?[0-9]*$"
                            }}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Allow only numbers and one decimal point, max 6 characters
                                // Prevent multiple decimal points
                                if (value === '' || 
                                    (/^[0-9]*\.?[0-9]*$/.test(value) && 
                                    value.split('.').length <= 2 && 
                                    value.length <= 6)) {
                                    updateFormValue('childWeight', value);
                                    setChildWeight(value);
                                }
                            }}
                            onKeyPress={(e) => {
                                const currentValue = e.target.value;
                                // Block decimal point if one already exists
                                if (e.key === '.' && currentValue.includes('.')) {
                                    e.preventDefault();
                                    return;
                                }
                                // Allow only numbers, one decimal point, and control keys
                                if (!/[\d.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            error={shouldShowError('childWeight')}
                        />
                        {shouldShowError('childWeight') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationRequiredField') || 'This field is required'}
                            </Typography>
                        )}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <label className={styles.label} htmlFor="childHeight">
                            {t('section48ChildHeight')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1, color: '#666' }}>
                            {t('awcRecordPoshanTracker')}
                        </Typography>
                        <TextField
                            size="small"
                            className={styles.formInput}
                            name="childHeight"
                            id="childHeight"
                            value={formValues.childHeight}
                            placeholder={t('enterHeightInCm')}
                            inputProps={{ 
                                maxLength: 6,
                                pattern: "^[0-9]*\\.?[0-9]*$"
                            }}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Allow only numbers and one decimal point, max 6 characters
                                if (value === '' || 
                                    (/^[0-9]*\.?[0-9]*$/.test(value) && 
                                     value.split('.').length <= 2 && 
                                     value.length <= 6)) {
                                    updateFormValue('childHeight', value);
                                    setChildHeight(value);
                                }
                            }}
                            onKeyPress={(e) => {
                                const currentValue = e.target.value;
                                // Block decimal point if one already exists
                                if (e.key === '.' && currentValue.includes('.')) {
                                    e.preventDefault();
                                    return;
                                }
                                // Allow only numbers, one decimal point, and control keys
                                if (!/[\d.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            error={shouldShowError('childHeight')}
                        />
                        {shouldShowError('childHeight') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationRequiredField') || 'This field is required'}
                            </Typography>
                        )}
                    </Grid>

                    {/* Weight Measurement Assessment */}
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 3, color: '#1976d2' }}>
                            {t('weightMeasurementAssessment')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2, color: '#666' }}>
                            {t('askAWWMeasureWeight')}
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="instrumentAww">
                            {t('section49WeighingInstrument')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="instrumentAww"
                            name="instrumentAww"
                            value={formValues.instrumentAww}
                            onChange={(e) => {
                                const selectedValue = e.target.value;
                                updateFormValue('instrumentAww', selectedValue);
                                setInstrumentAww(selectedValue);
                                
                                // Clear all measurement-related fields based on instrument selection
                                if (selectedValue === 'Digital Weighing Scale') {
                                    // Clear fields for other instrument types
                                    setMeasurementFollowedStepMechanical([]);
                                    setMeasurementFollowedStepSalter([]);
                                    updateFormValue('measurementFollowedStepMechanical', []);
                                    updateFormValue('measurementFollowedStepSalter', []);
                                } else if (selectedValue === 'Mechanical Weighing Scale') {
                                    // Clear fields for other instrument types
                                    setMeasurementFollowedStepDigital([]);
                                    setMeasurementFollowedStepSalter([]);
                                    updateFormValue('measurementFollowedStepDigital', []);
                                    updateFormValue('measurementFollowedStepSalter', []);
                                } else if (selectedValue === 'Salter Weighing Scale (Mechanical/Digital)') {
                                    // Clear fields for other instrument types
                                    setMeasurementFollowedStepDigital([]);
                                    setMeasurementFollowedStepMechanical([]);
                                    updateFormValue('measurementFollowedStepDigital', []);
                                    updateFormValue('measurementFollowedStepMechanical', []);
                                } else if (selectedValue === 'Not functional / Not available') {
                                    // Clear all measurement fields when instrument is not available
                                    setMeasurementFollowedStepDigital([]);
                                    setMeasurementFollowedStepMechanical([]);
                                    setMeasurementFollowedStepSalter([]);
                                    setChildWeightAww('');
                                    setChildWeightFieldMonitor('');
                                    updateFormValue('measurementFollowedStepDigital', []);
                                    updateFormValue('measurementFollowedStepMechanical', []);
                                    updateFormValue('measurementFollowedStepSalter', []);
                                    updateFormValue('childWeightAww', '');
                                    updateFormValue('childWeightFieldMonitor', '');
                                }
                            }}
                        >
                            <FormControlLabel value="Digital Weighing Scale" control={<Radio />} label={t('digitalWeighingScale')} />
                            <FormControlLabel value="Mechanical Weighing Scale" control={<Radio />} label={t('mechanicalWeighingScale')} />
                            <FormControlLabel value="Salter Weighing Scale (Mechanical/Digital)" control={<Radio />} label={t('salterWeighingScale')} />
                            <FormControlLabel value="Not functional / Not available" control={<Radio />} label={t('notFunctionalNotAvailable')} />
                        </RadioGroup>
                        {shouldShowError('instrumentAww') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationRequiredField') || 'This field is required'}
                            </Typography>
                        )}
                    </Grid>

                    {/* Conditional Questions based on weighing instrument */}
                    {formValues.instrumentAww && formValues.instrumentAww !== 'Not functional / Not available' && (
                        <>
                            {formValues.instrumentAww === 'Digital Weighing Scale' && (
                                <Grid item xs={12}>
                                    <label className={styles.label}>
                                        {t('section4101DigitalScaleSteps')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                        {t('multipleChoicePossible')}
                                    </Typography>
                                    <FormGroup>
                                        {[
                                            'scaleKeptFlatSurface',
                                            'zeroErrorChecked',
                                            'childWeighedMinimumClothes',
                                            'awwReadMeasurementsCorrectly',
                                            'notFollowedAnySteps'
                                        ].map((step) => (
                                            <FormControlLabel
                                                key={step}
                                                control={
                                                    <Checkbox
                                                        name="measurementFollowedStepDigital"
                                                        value={step}
                                                        checked={
                                                            step === 'notFollowedAnySteps'
                                                                ? formValues.measurementFollowedStepDigital?.includes('notFollowedAnySteps')
                                                                : formValues.measurementFollowedStepDigital?.includes(step)
                                                        }
                                                        onChange={(e) => {
                                                            const { checked, value } = e.target;
                                                            let newMeasurementFollowedStepDigital;
                                                            if (value === 'notFollowedAnySteps') {
                                                                if (checked) {
                                                                    newMeasurementFollowedStepDigital = ['notFollowedAnySteps'];
                                                                    setMeasurementFollowedStepDigital(['notFollowedAnySteps']);
                                                                } else {
                                                                    newMeasurementFollowedStepDigital = [];
                                                                    setMeasurementFollowedStepDigital([]);
                                                                }
                                                            } else {
                                                                let updated = formValues.measurementFollowedStepDigital ? [...formValues.measurementFollowedStepDigital] : [];
                                                                let oldUpdated = measurementFollowedStepDigital ? [...measurementFollowedStepDigital] : [];
                                                                if (checked) {
                                                                    updated = updated.filter((v) => v !== 'notFollowedAnySteps');
                                                                    updated.push(value);
                                                                    oldUpdated = oldUpdated.filter((v) => v !== 'notFollowedAnySteps');
                                                                    oldUpdated.push(value);
                                                                } else {
                                                                    updated = updated.filter((v) => v !== value);
                                                                    oldUpdated = oldUpdated.filter((v) => v !== value);
                                                                }
                                                                newMeasurementFollowedStepDigital = updated;
                                                                setMeasurementFollowedStepDigital(oldUpdated);
                                                            }
                                                            updateFormValue('measurementFollowedStepDigital', newMeasurementFollowedStepDigital);
                                                        }}
                                                    />
                                                }
                                                label={t(step)}
                                            />
                                        ))}
                                    </FormGroup>
                                    {shouldShowError('measurementFollowedStepDigital') && (
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: '#d32f2f', 
                                                fontSize: '0.75rem', 
                                                mt: 0.5, 
                                                display: 'block' 
                                            }}
                                        >
                                            {t('validationPleaseSelectAtLeastOne') || 'Please select at least one option'}
                                        </Typography>
                                    )}
                                </Grid>
                            )}

                            {formValues.instrumentAww === 'Mechanical Weighing Scale' && (
                                <Grid item xs={12}>
                                    <label className={styles.label}>
                                        {t('section4102MechanicalScaleSteps')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                        {t('multipleChoicePossible')}
                                    </Typography>
                                    <FormGroup>
                                        {[
                                            'scaleKeptFlatSurface',
                                            'zeroErrorChecked',
                                            'childWeighedMinimumClothes',
                                            'awwReadMeasurementsCorrectly',
                                            'notFollowedAnySteps'
                                        ].map((step) => (
                                            <FormControlLabel
                                                key={step}
                                                control={
                                                    <Checkbox
                                                        name="measurementFollowedStepMechanical"
                                                        value={step}
                                                        checked={
                                                            step === 'notFollowedAnySteps'
                                                                ? formValues.measurementFollowedStepMechanical?.includes('notFollowedAnySteps')
                                                                : formValues.measurementFollowedStepMechanical?.includes(step)
                                                        }
                                                        onChange={(e) => {
                                                            const { checked, value } = e.target;
                                                            let newMeasurementFollowedStepMechanical;
                                                            if (value === 'notFollowedAnySteps') {
                                                                if (checked) {
                                                                    newMeasurementFollowedStepMechanical = ['notFollowedAnySteps'];
                                                                    setMeasurementFollowedStepMechanical(['notFollowedAnySteps']);
                                                                } else {
                                                                    newMeasurementFollowedStepMechanical = [];
                                                                    setMeasurementFollowedStepMechanical([]);
                                                                }
                                                            } else {
                                                                let updated = formValues.measurementFollowedStepMechanical ? [...formValues.measurementFollowedStepMechanical] : [];
                                                                let oldUpdated = measurementFollowedStepMechanical ? [...measurementFollowedStepMechanical] : [];
                                                                if (checked) {
                                                                    updated = updated.filter((v) => v !== 'notFollowedAnySteps');
                                                                    updated.push(value);
                                                                    oldUpdated = oldUpdated.filter((v) => v !== 'notFollowedAnySteps');
                                                                    oldUpdated.push(value);
                                                                } else {
                                                                    updated = updated.filter((v) => v !== value);
                                                                    oldUpdated = oldUpdated.filter((v) => v !== value);
                                                                }
                                                                newMeasurementFollowedStepMechanical = updated;
                                                                setMeasurementFollowedStepMechanical(oldUpdated);
                                                            }
                                                            updateFormValue('measurementFollowedStepMechanical', newMeasurementFollowedStepMechanical);
                                                        }}
                                                    />
                                                }
                                                label={t(step)}
                                            />
                                        ))}
                                    </FormGroup>
                                    {shouldShowError('measurementFollowedStepMechanical') && (
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: '#d32f2f', 
                                                fontSize: '0.75rem', 
                                                mt: 0.5, 
                                                display: 'block' 
                                            }}
                                        >
                                            {t('validationPleaseSelectAtLeastOne') || 'Please select at least one option'}
                                        </Typography>
                                    )}
                                </Grid>
                            )}

                            {formValues.instrumentAww === 'Salter Weighing Scale (Mechanical/Digital)' && (
                                <Grid item xs={12}>
                                    <label className={styles.label}>
                                        {t('section4103SalterScaleSteps')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                        {t('multipleChoicePossible')}
                                    </Typography>
                                    <FormGroup>
                                        {[
                                            'scaleHangingCorrectly',
                                            'zeroErrorChecked',
                                            'childWeighedMinimumClothes',
                                            'awwReadMeasurementsCorrectly',
                                            'notFollowedAnySteps'
                                        ].map((step) => (
                                            <FormControlLabel
                                                key={step}
                                                control={
                                                    <Checkbox
                                                        name="measurementFollowedStepSalter"
                                                        value={step}
                                                        checked={
                                                            step === 'notFollowedAnySteps'
                                                                ? formValues.measurementFollowedStepSalter?.includes('notFollowedAnySteps')
                                                                : formValues.measurementFollowedStepSalter?.includes(step)
                                                        }
                                                        onChange={(e) => {
                                                            const { checked, value } = e.target;
                                                            let newMeasurementFollowedStepSalter;
                                                            if (value === 'notFollowedAnySteps') {
                                                                if (checked) {
                                                                    newMeasurementFollowedStepSalter = ['notFollowedAnySteps'];
                                                                    setMeasurementFollowedStepSalter(['notFollowedAnySteps']);
                                                                } else {
                                                                    newMeasurementFollowedStepSalter = [];
                                                                    setMeasurementFollowedStepSalter([]);
                                                                }
                                                            } else {
                                                                let updated = formValues.measurementFollowedStepSalter ? [...formValues.measurementFollowedStepSalter] : [];
                                                                let oldUpdated = measurementFollowedStepSalter ? [...measurementFollowedStepSalter] : [];
                                                                if (checked) {
                                                                    updated = updated.filter((v) => v !== 'notFollowedAnySteps');
                                                                    updated.push(value);
                                                                    oldUpdated = oldUpdated.filter((v) => v !== 'notFollowedAnySteps');
                                                                    oldUpdated.push(value);
                                                                } else {
                                                                    updated = updated.filter((v) => v !== value);
                                                                    oldUpdated = oldUpdated.filter((v) => v !== value);
                                                                }
                                                                newMeasurementFollowedStepSalter = updated;
                                                                setMeasurementFollowedStepSalter(oldUpdated);
                                                            }
                                                            updateFormValue('measurementFollowedStepSalter', newMeasurementFollowedStepSalter);
                                                        }}
                                                    />
                                                }
                                                label={t(step)}
                                            />
                                        ))}
                                    </FormGroup>
                                    {shouldShowError('measurementFollowedStepSalter') && (
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: '#d32f2f', 
                                                fontSize: '0.75rem', 
                                                mt: 0.5, 
                                                display: 'block' 
                                            }}
                                        >
                                            {t('validationPleaseSelectAtLeastOne') || 'Please select at least one option'}
                                        </Typography>
                                    )}
                                </Grid>
                            )}
                            <Grid item xs={12} sm={6}>
                                <label className={styles.label} htmlFor="childWeightAww">
                                    {t('section411RecordChildWeightAWW')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                    {t('inKgs')}
                                </Typography>
                                <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="childWeightAww"
                                    id="childWeightAww"
                                    value={formValues.childWeightAww}
                                    placeholder={t('enterWeightInKg')}
                                    inputProps={{ 
                                        maxLength: 6,
                                        pattern: "^[0-9]*\\.?[0-9]*$"
                                    }}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Allow only numbers and one decimal point, max 6 characters
                                        if (value === '' || 
                                            (/^[0-9]*\.?[0-9]*$/.test(value) && 
                                             value.split('.').length <= 2 && 
                                             value.length <= 6)) {
                                            updateFormValue('childWeightAww', value);
                                            setChildWeightAww(value);
                                        }
                                    }}
                                    onKeyPress={(e) => {
                                        // Allow only numbers, decimal point, and backspace
                                        if (!/[\d.]/.test(e.key) && e.key !== 'Backspace') {
                                            e.preventDefault();
                                        }
                                    }}
                                    error={shouldShowError('childWeightAww')}
                                />
                                {shouldShowError('childWeightAww') && (
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            color: '#d32f2f', 
                                            fontSize: '0.75rem', 
                                            mt: 0.5, 
                                            display: 'block' 
                                        }}
                                    >
                                        {t('validationRequiredField') || 'This field is required'}
                                    </Typography>
                                )}
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <label className={styles.label} htmlFor="childWeightFieldMonitor">
                                    {t('section412MeasureChildYourself')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                    {t('inKgs')}
                                </Typography>
                                <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="childWeightFieldMonitor"
                                    id="childWeightFieldMonitor"
                                    value={formValues.childWeightFieldMonitor}
                                    placeholder={t('enterWeightInKg')}
                                    inputProps={{ 
                                        maxLength: 6,
                                        pattern: "^[0-9]*\\.?[0-9]*$"
                                    }}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Allow only numbers and one decimal point, max 6 characters
                                        if (value === '' || 
                                            (/^[0-9]*\.?[0-9]*$/.test(value) && 
                                             value.split('.').length <= 2 && 
                                             value.length <= 6)) {
                                            updateFormValue('childWeightFieldMonitor', value);
                                            setChildWeightFieldMonitor(value);
                                        }
                                    }}
                                    onKeyPress={(e) => {
                                        // Allow only numbers, decimal point, and backspace
                                        if (!/[\d.]/.test(e.key) && e.key !== 'Backspace') {
                                            e.preventDefault();
                                        }
                                    }}
                                    error={shouldShowError('childWeightFieldMonitor')}
                                />
                                {shouldShowError('childWeightFieldMonitor') && (
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            color: '#d32f2f', 
                                            fontSize: '0.75rem', 
                                            mt: 0.5, 
                                            display: 'block' 
                                        }}
                                    >
                                        {t('validationRequiredField') || 'This field is required'}
                                    </Typography>
                                )}
                            </Grid>
                        </>
                    )}

                    {/* Height Measurement Section */}
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 3, color: '#1976d2' }}>
                            {t('heightMeasurementAssessment')}
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="childHeightInstrument">
                            {t('section413HeightInstrument')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childHeightInstrument"
                            name="childHeightInstrument"
                            value={formValues.childHeightInstrument}
                            onChange={(e) => {
                                const selectedValue = e.target.value;
                                updateFormValue('childHeightInstrument', selectedValue);
                                setHeightInstrument(selectedValue);
                                
                                // Clear fields based on height instrument selection
                                if (selectedValue === 'Not functional / Not available') {
                                    // Clear all height measurement fields when instrument is not available
                                    setChildHeightAww('');
                                    setChildHeightFieldMonitor('');
                                    setChildHeightInstrumentOther('');
                                    setInfantometerSteps([]);
                                    setStadiometerSteps([]);
                                    // Also clear formValues
                                    updateFormValue('childHeightAww', '');
                                    updateFormValue('childHeightFieldMonitor', '');
                                    updateFormValue('childHeightInstrumentOther', '');
                                    updateFormValue('infantometerSteps', []);
                                    updateFormValue('stadiometerSteps', []);

                                } else if (selectedValue === 'Infantometer') {
                                    // Clear fields not relevant to Infantometer
                                    setStadiometerSteps([]);
                                    setChildHeightInstrumentOther('');
                                    updateFormValue('stadiometerSteps', []);
                                    updateFormValue('childHeightInstrumentOther', '');
                                } else if (selectedValue === 'Stadiometer') {
                                    // Clear fields not relevant to Stadiometer
                                    setChildHeightInstrumentOther('');
                                    setInfantometerSteps([]);
                                    updateFormValue('childHeightInstrumentOther', '');
                                    updateFormValue('infantometerSteps', []);
                                } else if (selectedValue === 'Others') {
                                    // Clear fields not relevant to Others
                                    setInfantometerSteps([]);
                                    setStadiometerSteps([]);
                                    updateFormValue('infantometerSteps', []);
                                    updateFormValue('stadiometerSteps', []);
                                }
                            }}
                        >
                            <FormControlLabel value="Infantometer" control={<Radio />} label={t('infantometer')} />
                            <FormControlLabel value="Stadiometer" control={<Radio />} label={t('stadiometer')} />
                            <FormControlLabel value="Not functional / Not available" control={<Radio />} label={t('notFunctionalNotAvailable')} />
                            <FormControlLabel value="Others" control={<Radio />} label={t('others')} />
                        </RadioGroup>
                        {shouldShowError('childHeightInstrument') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationRequiredField') || 'This field is required'}
                            </Typography>
                        )}
                    </Grid>

                    {formValues.childHeightInstrument === 'Others' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="childHeightInstrumentOther">
                                {t('ifOthersSpecifyReason')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                className={styles.formInput}
                                name="childHeightInstrumentOther"
                                id="childHeightInstrumentOther"
                                value={formValues.childHeightInstrumentOther}
                                onChange={(e) => {
                                    updateFormValue('childHeightInstrumentOther', e.target.value);
                                    setChildHeightInstrumentOther(e.target.value);
                                }}
                                placeholder={t('pleaseSpecifyOtherInstrument')}
                                error={shouldShowError('childHeightInstrumentOther')}
                            />
                            {shouldShowError('childHeightInstrumentOther') && (
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        color: '#d32f2f', 
                                        fontSize: '0.75rem', 
                                        mt: 0.5, 
                                        display: 'block' 
                                    }}
                                >
                                    {t('validationRequiredField') || 'This field is required'}
                                </Typography>
                            )}
                        </Grid>
                    )}

                    {/* Hide 4.14.1, 4.14.2, 4.15, 4.16 if heightInstrument is 'Not functional / Not available' */}
                    {formValues.childHeightInstrument !== 'Not functional / Not available' && (
                        <>
                            {formValues.childHeightInstrument === 'Infantometer' && (
                                <Grid item xs={12}>
                                    <label className={styles.label}>
                                        {t('section4141InfantometerSteps')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                        {t('multipleChoicePossible')}
                                    </Typography>
                                    <FormGroup>
                                        {[
                                            'scaleKeptFlatSurfaceHeight',
                                            'headFootTouchingPieces',
                                            'childKneeStraight',
                                            'awwTookHelpMother',
                                            'awwReadMeasurementsCorrectly',
                                            'notFollowedAnySteps'
                                        ].map((step) => (
                                            <FormControlLabel
                                                key={step}
                                                control={
                                                    <Checkbox
                                                        name="infantometerSteps"
                                                        value={step}
                                                        checked={
                                                            step === 'notFollowedAnySteps'
                                                                ? formValues.infantometerSteps?.includes('notFollowedAnySteps')
                                                                : formValues.infantometerSteps?.includes(step)
                                                        }
                                                        onChange={(e) => {
                                                            const { checked, value } = e.target;
                                                            let newInfantometerSteps;
                                                            if (value === 'notFollowedAnySteps') {
                                                                if (checked) {
                                                                    newInfantometerSteps = ['notFollowedAnySteps'];
                                                                    setInfantometerSteps(['notFollowedAnySteps']);
                                                                } else {
                                                                    newInfantometerSteps = [];
                                                                    setInfantometerSteps([]);
                                                                }
                                                            } else {
                                                                let updated = formValues.infantometerSteps ? [...formValues.infantometerSteps] : [];
                                                                let oldUpdated = infantometerSteps ? [...infantometerSteps] : [];
                                                                if (checked) {
                                                                    updated = updated.filter((v) => v !== 'notFollowedAnySteps');
                                                                    updated.push(value);
                                                                    oldUpdated = oldUpdated.filter((v) => v !== 'notFollowedAnySteps');
                                                                    oldUpdated.push(value);
                                                                } else {
                                                                    updated = updated.filter((v) => v !== value);
                                                                    oldUpdated = oldUpdated.filter((v) => v !== value);
                                                                }
                                                                newInfantometerSteps = updated;
                                                                setInfantometerSteps(oldUpdated);
                                                            }
                                                            updateFormValue('infantometerSteps', newInfantometerSteps);
                                                        }}
                                                    />
                                                }
                                                label={t(step)}
                                            />
                                        ))}
                                    </FormGroup>
                                    {shouldShowError('infantometerSteps') && (
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: '#d32f2f', 
                                                fontSize: '0.75rem', 
                                                mt: 0.5, 
                                                display: 'block' 
                                            }}
                                        >
                                            {t('validationPleaseSelectAtLeastOne') || 'Please select at least one option'}
                                        </Typography>
                                    )}
                                </Grid>
                            )}

                            {formValues.childHeightInstrument === 'Stadiometer' && (
                                <Grid item xs={12}>
                                    <label className={styles.label}>
                                        {t('section4142StadiometerSteps')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                        {t('multipleChoicePossible')}
                                    </Typography>
                                    <FormGroup>
                                        {[
                                            'scaleKeptFlatSurface',
                                            'childShoesSocksRemoved',
                                            'backButtockBackOfKneeTouchingBoard',
                                            'headTouchingHeadPiece',
                                            'childKneeStraight',
                                            'awwTookHelpMother',
                                            'awwReadMeasurementsCorrectly',
                                            'notFollowedAnySteps'
                                        ].map((step) => (
                                            <FormControlLabel
                                                key={step}
                                                control={
                                                    <Checkbox
                                                        name="stadiometerSteps"
                                                        value={step}
                                                        checked={
                                                            step === 'notFollowedAnySteps'
                                                                ? formValues.stadiometerSteps?.includes('notFollowedAnySteps')
                                                                : formValues.stadiometerSteps?.includes(step)
                                                        }
                                                        onChange={(e) => {
                                                            const { checked, value } = e.target;
                                                            let newStadiometerSteps;
                                                            if (value === 'notFollowedAnySteps') {
                                                                if (checked) {
                                                                    newStadiometerSteps = ['notFollowedAnySteps'];
                                                                    setStadiometerSteps(['notFollowedAnySteps']);
                                                                } else {
                                                                    newStadiometerSteps = [];
                                                                    setStadiometerSteps([]);
                                                                }
                                                            } else {
                                                                let updated = formValues.stadiometerSteps ? [...formValues.stadiometerSteps] : [];
                                                                let oldUpdated = stadiometerSteps ? [...stadiometerSteps] : [];
                                                                if (checked) {
                                                                    updated = updated.filter((v) => v !== 'notFollowedAnySteps');
                                                                    updated.push(value);
                                                                    oldUpdated = oldUpdated.filter((v) => v !== 'notFollowedAnySteps');
                                                                    oldUpdated.push(value);
                                                                } else {
                                                                    updated = updated.filter((v) => v !== value);
                                                                    oldUpdated = oldUpdated.filter((v) => v !== value);
                                                                }
                                                                newStadiometerSteps = updated;
                                                                setStadiometerSteps(oldUpdated);
                                                            }
                                                            updateFormValue('stadiometerSteps', newStadiometerSteps);
                                                        }}
                                                    />
                                                }
                                                label={t(step)}
                                            />
                                        ))}
                                    </FormGroup>
                                    {shouldShowError('stadiometerSteps') && (
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: '#d32f2f', 
                                                fontSize: '0.75rem', 
                                                mt: 0.5, 
                                                display: 'block' 
                                            }}
                                        >
                                            {t('validationPleaseSelectAtLeastOne') || 'Please select at least one option'}
                                        </Typography>
                                    )}
                                </Grid>
                            )}

                            <Grid item xs={12} sm={6}>
                                <label className={styles.label} htmlFor="childHeightAww">
                                    {t('section415RecordChildHeightAWW')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                    {t('inCms')}
                                </Typography>
                                <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="childHeightAww"
                                    id="childHeightAww"
                                    value={formValues.childHeightAww}
                                    placeholder={t('enterHeightInCm')}
                                    inputProps={{ 
                                        maxLength: 6,
                                        pattern: "^[0-9]*\\.?[0-9]*$"
                                    }}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || 
                                            (/^[0-9]*\.?[0-9]*$/.test(value) && 
                                             value.split('.').length <= 2 && 
                                             value.length <= 6)) {
                                            updateFormValue('childHeightAww', value);
                                            setChildHeightAww(value);
                                        }
                                    }}
                                    error={shouldShowError('childHeightAww')}
                                    onKeyPress={(e) => {
                                        // Allow only numbers, decimal point, and backspace
                                        if (!/[\d.]/.test(e.key) && e.key !== 'Backspace') {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                                {shouldShowError('childHeightAww') && (
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            color: '#d32f2f', 
                                            fontSize: '0.75rem', 
                                            mt: 0.5, 
                                            display: 'block' 
                                        }}
                                    >
                                        {t('validationRequiredField') || 'This field is required'}
                                    </Typography>
                                )}
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <label className={styles.label} htmlFor="childHeightFieldMonitor">
                                    {t('section416MeasureChildYourself')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                    {t('inCms')}
                                </Typography>
                                <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="childHeightFieldMonitor"
                                    id="childHeightFieldMonitor"
                                    value={formValues.childHeightFieldMonitor}
                                    placeholder={t('enterHeightInCm')}
                                    inputProps={{ 
                                        maxLength: 6,
                                        pattern: "^[0-9]*\\.?[0-9]*$"
                                    }}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || 
                                            (/^[0-9]*\.?[0-9]*$/.test(value) && 
                                             value.split('.').length <= 2 && 
                                             value.length <= 6)) {
                                            updateFormValue('childHeightFieldMonitor', value);
                                            setChildHeightFieldMonitor(value);
                                        }
                                    }}
                                    error={shouldShowError('childHeightFieldMonitor')}
                                    onKeyPress={(e) => {
                                        // Allow only numbers, decimal point, and backspace
                                        if (!/[\d.]/.test(e.key) && e.key !== 'Backspace') {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                                {shouldShowError('childHeightFieldMonitor') && (
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            color: '#d32f2f', 
                                            fontSize: '0.75rem', 
                                            mt: 0.5, 
                                            display: 'block' 
                                        }}
                                    >
                                        {t('validationRequiredField') || 'This field is required'}
                                    </Typography>
                                )}
                            </Grid>
                        </>
                    )}

                    {/* Nutritional Assessment Section */}
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 3, color: '#1976d2' }}>
                            {t('nutritionalStatusAssessment')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2, color: '#666' }}>
                            {t('basedOnMeasurementsAskAWWClassify')}
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="classifyWastingAww">
                            {t('section417ClassifyWastingAWW')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="classifyWastingAww"
                            name="classifyWastingAww"
                            value={formValues.classifyWastingAww}
                            onChange={(e) => {
                                updateFormValue('classifyWastingAww', e.target.value);
                                setClassifyWastingAww(e.target.value);
                            }}
                        >
                            <FormControlLabel value="Used WFL / WFH z-score chart" control={<Radio />} label={t('usedWFLWFHZScoreChart')} />
                            <FormControlLabel value="Used status shown by Poshan Tracker Application" control={<Radio />} label={t('usedStatusShownPoshanTracker')} />
                            <FormControlLabel value="Did not know how to classify the wasting status" control={<Radio />} label={t('didNotKnowClassifyWasting')} />
                        </RadioGroup>
                        {shouldShowError('classifyWastingAww') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationRequiredField') || 'This field is required'}
                            </Typography>
                        )}
                    </Grid>

                    {/* Conditional Question 4.18 - only appears when "Used WFL / WFH z-score chart" is selected for 4.17 */}
                    {formValues.classifyWastingAww === 'Used WFL / WFH z-score chart' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="nutritionalStatusXScorecard">
                                {t('section418NutritionalStatusXScorecard')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup
                                aria-label="nutritionalStatusXScorecard"
                                name="nutritionalStatusXScorecard"
                                value={formValues.nutritionalStatusXScorecard}
                                onChange={(e) => {
                                    updateFormValue('nutritionalStatusXScorecard', e.target.value);
                                    setNutritionalStatusXScorecard(e.target.value);
                                }}
                            >
                                <FormControlLabel value="SAM" control={<Radio />} label={t('SAM')} />
                                <FormControlLabel value="MAM" control={<Radio />} label={t('MAM')} />
                                <FormControlLabel value="Normal" control={<Radio />} label={t('normal')} />
                            </RadioGroup>
                            {shouldShowError('nutritionalStatusXScorecard') && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: '#d32f2f',
                                        fontSize: '0.75rem',
                                        mt: 0.5,
                                        display: 'block'
                                    }}
                                >
                                    {t('validationRequiredField') || 'This field is required'}
                                </Typography>
                            )}
                        </Grid>
                    )}

                    {/* Knowledge Assessment Section */}
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 3, color: '#1976d2' }}>
                            {t('askAwwQuestions')}
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="screeningSamChildren">
                            {t('section419ScreeningSamChildren')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="screeningSamChildren"
                            name="screeningSamChildren"
                            value={formValues.screeningSamChildren}
                            onChange={(e) => {
                                updateFormValue('screeningSamChildren', e.target.value);
                                setScreeningSamChildren(e.target.value);
                            }}
                        >
                            <FormControlLabel value="WHZ < -3SD/ red category as per WFH" control={<Radio />} label={t('whzLessThan3SDRedCategory')} />
                            <FormControlLabel value="Bilateral pitting oedema" control={<Radio />} label={t('bilateralPittingOedema')} />
                            <FormControlLabel value="Both WHZ < -3 s.d. and/or bilateral pitting oedema" control={<Radio />} label={t('bothWHZAndBilateralOedema')} />
                            <FormControlLabel value="Don't Know" control={<Radio />} label={t("dontKnow")} />
                        </RadioGroup>
                        {shouldShowError('screeningSamChildren') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationRequiredField') || 'This field is required'}
                            </Typography>
                        )}
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label}>
                            {t('section420IfAppetiteTestIsBeingConducted')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                            {t('multipleResponse')}
                        </Typography>
                        <FormGroup>
                            {[
                                'takeRationRoutine',
                                'takeHomeRationEnhanced',
                                'hotCookedMeal',
                                'hotCookedMealAWW',
                                'basedOnDietHistory',
                                'others',
                                'dontKnow'
                            ].map((option) => (
                                <FormControlLabel
                                    key={option}
                                    control={
                                        <Checkbox
                                            name="appetiteTestFood"
                                            value={option}
                                            checked={formValues.appetiteTestFood.includes(option)}
                                            onChange={(e) => {
                                                const { checked, value } = e.target;
                                                let newAppetiteTestFood;
                                                if (value === 'dontKnow') {
                                                    if (checked) {
                                                        newAppetiteTestFood = ['dontKnow'];
                                                        setAppetiteTestFood(['dontKnow']);
                                                        setAppetiteTestFoodOther('');
                                                        updateFormValue('appetiteTestFoodOther', '');
                                                    } else {
                                                        newAppetiteTestFood = [];
                                                        setAppetiteTestFood([]);
                                                        setAppetiteTestFoodOther('');
                                                        updateFormValue('appetiteTestFoodOther', '');
                                                    }
                                                } else {
                                                    let updated = formValues.appetiteTestFood ? [...formValues.appetiteTestFood] : [];
                                                    let oldUpdated = appetiteTestFood ? [...appetiteTestFood] : [];
                                                    if (checked) {
                                                        updated = updated.filter(item => item !== 'dontKnow');
                                                        updated.push(value);
                                                        oldUpdated = oldUpdated.filter(item => item !== 'dontKnow');
                                                        oldUpdated.push(value);
                                                    } else {
                                                        updated = updated.filter(item => item !== value);
                                                        oldUpdated = oldUpdated.filter(item => item !== value);
                                                        // Clear the "others" text field when "others" is unchecked
                                                        if (value === 'others') {
                                                            setAppetiteTestFoodOther('');
                                                            updateFormValue('appetiteTestFoodOther', '');
                                                        }
                                                    }
                                                    newAppetiteTestFood = updated;
                                                    setAppetiteTestFood(oldUpdated);
                                                }
                                                updateFormValue('appetiteTestFood', newAppetiteTestFood);
                                            }}
                                        />
                                    }
                                    label={t(option)}
                                />
                            ))}
                        </FormGroup>
                        {shouldShowError('appetiteTestFood') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationPleaseSelectAtLeastOne') || 'Please select at least one option'}
                            </Typography>
                        )}
                    </Grid>

                    {formValues.appetiteTestFood.includes('others') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="appetiteTestFoodOther">
                                {t('others')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                className={styles.formInput}
                                name="appetiteTestFoodOther"
                                id="appetiteTestFoodOther"
                                value={formValues.appetiteTestFoodOther}
                                placeholder={t('ifOthersSpecifyReason')}
                                onChange={(e) => {
                                    updateFormValue('appetiteTestFoodOther', e.target.value);
                                    setAppetiteTestFoodOther(e.target.value);
                                }}
                                error={shouldShowError('appetiteTestFoodOther')}
                            />
                            {shouldShowError('appetiteTestFoodOther') && (
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        color: '#d32f2f', 
                                        fontSize: '0.75rem', 
                                        mt: 0.5, 
                                        display: 'block' 
                                    }}
                                >
                                    {t('validationRequiredField') || 'This field is required'}
                                </Typography>
                            )}
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <label className={styles.label}>
                            {t('section421AskAWWTheStepsToCheckForNutritionalOedema')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                            {t('multipleResponse')}
                        </Typography>
                        <FormGroup>
                            {[
                                'assessmentDoneRemovingSocksShoes',
                                'assessmentOedemaBothFeet',
                                'pressedBothFeetThreeSeconds',
                                'lookedFeltPits',
                                'dontKnow'
                            ].map((step) => (
                                <FormControlLabel
                                    key={step}
                                    control={
                                        <Checkbox
                                            name="nutritionalOedema"
                                            value={step}
                                            checked={formValues.nutritionalOedema.includes(step)}
                                            onChange={(e) => {
                                                const { checked, value } = e.target;
                                                let newNutritionalOedema;
                                                if (value === 'dontKnow') {
                                                    if (checked) {
                                                        newNutritionalOedema = ['dontKnow'];
                                                        setNutritionalOedema(['dontKnow']);
                                                    } else {
                                                        newNutritionalOedema = [];
                                                        setNutritionalOedema([]);
                                                    }
                                                } else {
                                                    let updated = formValues.nutritionalOedema ? [...formValues.nutritionalOedema] : [];
                                                    let oldUpdated = nutritionalOedema ? [...nutritionalOedema] : [];
                                                    if (checked) {
                                                        updated = updated.filter(item => item !== 'dontKnow');
                                                        updated.push(value);
                                                        oldUpdated = oldUpdated.filter(item => item !== 'dontKnow');
                                                        oldUpdated.push(value);
                                                    } else {
                                                        updated = updated.filter(item => item !== value);
                                                        oldUpdated = oldUpdated.filter(item => item !== value);
                                                    }
                                                    newNutritionalOedema = updated;
                                                    setNutritionalOedema(oldUpdated);
                                                }
                                                updateFormValue('nutritionalOedema', newNutritionalOedema);
                                            }}
                                        />
                                    }
                                    label={t(step)}
                                />
                            ))}
                        </FormGroup>
                        {shouldShowError('nutritionalOedema') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationPleaseSelectAtLeastOne') || 'Please select at least one option'}
                            </Typography>
                        )}
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label}>
                            {t('section422WhenAChildShouldReferredToNRC')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                            {t('multipleOptionsAww')}
                        </Typography>
                        <FormGroup>
                            {[
                                'identifiedWithMedicalComplications',
                                'identifiedWithoutComplicationsFailedAppetite',
                                'passedAppetiteTestNoComplications',
                                'identifiedBilateralPittingEdema',
                                'developsMedicalComplicationDuringCMAM',
                                'failsAppetiteTestDuringFollowUp',
                                'noWeightGainTwoConsecutiveFollowUps',
                                'complicationsTwoConsecutiveFollowUps',
                                'dontKnow'
                            ].map((condition) => (
                                <FormControlLabel
                                    key={condition}
                                    control={
                                        <Checkbox
                                            name="childNrcMtc"
                                            value={condition}
                                            checked={formValues.childNrcMtc.includes(condition)}
                                            onChange={(e) => {
                                                const { checked, value } = e.target;
                                                let newChildNrcMtc;
                                                if (value === 'dontKnow') {
                                                    if (checked) {
                                                        newChildNrcMtc = ['dontKnow'];
                                                        setChildNrcMtc(['dontKnow']);
                                                    } else {
                                                        newChildNrcMtc = [];
                                                        setChildNrcMtc([]);
                                                    }
                                                } else {
                                                    let updated = formValues.childNrcMtc ? [...formValues.childNrcMtc] : [];
                                                    let oldUpdated = childNrcMtc ? [...childNrcMtc] : [];
                                                    if (checked) {
                                                        updated = updated.filter(item => item !== 'dontKnow');
                                                        updated.push(value);
                                                        oldUpdated = oldUpdated.filter(item => item !== 'dontKnow');
                                                        oldUpdated.push(value);
                                                    } else {
                                                        updated = updated.filter(item => item !== value);
                                                        oldUpdated = oldUpdated.filter(item => item !== value);
                                                    }
                                                    newChildNrcMtc = updated;
                                                    setChildNrcMtc(oldUpdated);
                                                }
                                                updateFormValue('childNrcMtc', newChildNrcMtc);
                                            }}
                                        />
                                    }
                                    label={t(condition)}
                                />
                            ))}
                        </FormGroup>
                        {shouldShowError('childNrcMtc') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationPleaseSelectAtLeastOne') || 'Please select at least one option'}
                            </Typography>
                        )}
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="childFollowupCmam">
                            {t('section423HowFrequentlyShouldTheChildBeFollowedUpWhileHeSheIsStillEnrolledInTheCMAMProgramUnderTreatmentPhase')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childFollowupCmam"
                            name="childFollowupCmam"
                            value={formValues.childFollowupCmam}
                            onChange={(e) => {
                                setChildFollowupCmam(e.target.value);
                                updateFormValue('childFollowupCmam', e.target.value);
                                if(e.target.value !== 'Others') {
                                    setChildFollowupCmamOther('');
                                    updateFormValue('childFollowupCmamOther', '');
                                }
                            }}
                        >
                            <FormControlLabel value="Weekly" control={<Radio />} label={t('weekly')} />
                            <FormControlLabel value="Fortnightly" control={<Radio />} label={t('fortnightly')} />
                            <FormControlLabel value="Monthly" control={<Radio />} label={t('monthly')} />
                            <FormControlLabel value="Quarterly" control={<Radio />} label={t('quarterly')} />
                            <FormControlLabel value="Don't know" control={<Radio />} label={t("dontKnow")} />
                            <FormControlLabel value="Others" control={<Radio />} label={t('others')} />
                        </RadioGroup>
                        {shouldShowError('childFollowupCmam') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationRequiredField') || 'This field is required'}
                            </Typography>
                        )}
                    </Grid>

                    {formValues.childFollowupCmam === 'Others' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="childFollowupCmamOther">
                                {t('others')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                className={styles.formInput}
                                name="childFollowupCmamOther"
                                id="childFollowupCmamOther"
                                value={formValues.childFollowupCmamOther}
                                placeholder={t('ifOthersSpecifyReason')}
                                onChange={(e) => {
                                    setChildFollowupCmamOther(e.target.value);
                                    updateFormValue('childFollowupCmamOther', e.target.value);
                                }}
                                error={shouldShowError('childFollowupCmamOther')}
                                helperText={shouldShowError('childFollowupCmamOther') ? (t('validationRequiredField') || 'This field is required') : ''}
                            />
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <label className={styles.label}>
                            {t('section424WhatAreTheActivitiesToBeConductedDuringFollowUpSessionsDuringTreatmentInTheCMAMProgram')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                            {t('multipleResponse')}
                        </Typography>
                        <FormGroup>
                            {[
                                'anthropometricAssessment',
                                'assessmentOfOedema',
                                'askingMedicalComplicationSymptoms',
                                'entriesTreatmentCardRegister',
                                'checkingWeightChangePrevious',
                                'providingMedicinesIfAny',
                                'providingTHRATHR',
                                'stateSpecificFoodSupplement',
                                'individualCounsellingMothers',
                                'linkagePDSGovernmentSchemes',
                                'assessmentCounselingFood',
                                'dontKnow',
                                'others'
                            ].map((activity) => (
                                <FormControlLabel
                                    key={activity}
                                    control={
                                        <Checkbox
                                            name="activitiesFollowupCmam"
                                            value={activity}
                                            checked={formValues.activitiesFollowupCmam.includes(activity)}
                                            onChange={(e) => {
                                                const { checked, value } = e.target;
                                                let newActivitiesFollowupCmam;
                                                if (value === 'dontKnow') {
                                                    if (checked) {
                                                        newActivitiesFollowupCmam = ['dontKnow'];
                                                        setActivitiesFollowupCmam(['dontKnow']);
                                                        updateFormValue('activitiesFollowupCmamOther', '');
                                                        setActivitiesFollowupCmamOther('');
                                                    } else {
                                                        newActivitiesFollowupCmam = [];
                                                        setActivitiesFollowupCmam([]);
                                                        updateFormValue('activitiesFollowupCmamOther', '');
                                                        setActivitiesFollowupCmamOther('');
                                                    }
                                                } else {
                                                    let updated = formValues.activitiesFollowupCmam ? [...formValues.activitiesFollowupCmam] : [];
                                                    let oldUpdated = activitiesFollowupCmam ? [...activitiesFollowupCmam] : [];
                                                    if (checked) {
                                                        updated = updated.filter(item => item !== 'dontKnow');
                                                        updated.push(value);
                                                        oldUpdated = oldUpdated.filter(item => item !== 'dontKnow');
                                                        oldUpdated.push(value);
                                                    } else {
                                                        updated = updated.filter(item => item !== value);
                                                        oldUpdated = oldUpdated.filter(item => item !== value);
                                                        if (value === 'others') {
                                                            updateFormValue('activitiesFollowupCmamOther', '');
                                                            setActivitiesFollowupCmamOther('');
                                                        }
                                                    }
                                                    newActivitiesFollowupCmam = updated;
                                                    setActivitiesFollowupCmam(oldUpdated);
                                                }
                                                updateFormValue('activitiesFollowupCmam', newActivitiesFollowupCmam);
                                            }}
                                        />
                                    }
                                    label={t(activity)}
                                />
                            ))}
                        </FormGroup>
                        {shouldShowError('activitiesFollowupCmam') && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#d32f2f', 
                                    fontSize: '0.75rem', 
                                    mt: 0.5, 
                                    display: 'block' 
                                }}
                            >
                                {t('validationPleaseSelectAtLeastOne') || 'Please select at least one option'}
                            </Typography>
                        )}
                    </Grid>

                    {formValues.activitiesFollowupCmam.includes('others') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="activitiesFollowupCmamOther">
                                {t('others')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                className={styles.formInput}
                                name="activitiesFollowupCmamOther"
                                id="activitiesFollowupCmamOther"
                                value={formValues.activitiesFollowupCmamOther}
                                placeholder={t('ifOthersSpecifyReason')}
                                onChange={(e) => {
                                    updateFormValue('activitiesFollowupCmamOther', e.target.value);
                                    setActivitiesFollowupCmamOther(e.target.value);
                                }}
                                error={shouldShowError('activitiesFollowupCmamOther')}
                            />
                            {shouldShowError('activitiesFollowupCmamOther') && (
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        color: '#d32f2f', 
                                        fontSize: '0.75rem', 
                                        mt: 0.5, 
                                        display: 'block' 
                                    }}
                                >
                                    {t('validationRequiredField') || 'This field is required'}
                                </Typography>
                            )}
                        </Grid>
                    )}

                    {/* Hidden inputs to combine selected options with "Others" text for form submission */}
                    <input
                        type="hidden"
                        name="appetiteTestFood"
                        value={(() => {
                            let finalOptions = [...appetiteTestFood];
                            if (appetiteTestFood.includes('others') && appetiteTestFoodOther.trim()) {
                                // Replace "Others" with "Others - custom text"
                                finalOptions = finalOptions.filter(option => option !== 'others');
                                finalOptions.push(`Others - ${appetiteTestFoodOther.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />

                    <input
                        type="hidden"
                        name="childFollowupCmam"
                        value={childFollowupCmam === 'Others' && childFollowupCmamOther.trim() ? `Others - ${childFollowupCmamOther.trim()}` : childFollowupCmam}
                    />

                    <input
                        type="hidden"
                        name="activitiesFollowupCmam"
                        value={(() => {
                            let finalOptions = [...activitiesFollowupCmam];
                            if (activitiesFollowupCmam.includes('Others') && activitiesFollowupCmamOther.trim()) {
                                // Replace "Others" with "Others - custom text"
                                finalOptions = finalOptions.filter(option => option !== 'Others');
                                finalOptions.push(`Others - ${activitiesFollowupCmamOther.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />

                    <input
                        type="hidden"
                        name="nutritionalOedema"
                        value={nutritionalOedema.join(', ')}
                    />

                    <input
                        type="hidden"
                        name="childNrcMtc"
                        value={childNrcMtc.join(', ')}
                    />

                    {/* Additional hidden fields for proper backend mapping */}
                    <input
                        type="hidden"
                        name="measurementFollowedStepDigital"
                        value={measurementFollowedStepDigital.join(', ')}
                    />
                    <input
                        type="hidden"
                        name="measurementFollowedStepMechanical"
                        value={measurementFollowedStepMechanical.join(', ')}
                    />
                    <input
                        type="hidden"
                        name="measurementFollowedStepSalter"
                        value={measurementFollowedStepSalter.join(', ')}
                    />
                    <input
                        type="hidden"
                        name="stadiometerSteps"
                        value={stadiometerSteps.join(', ')}
                    />
                    <input
                        type="hidden"
                        name="infantometerSteps"
                        value={infantometerSteps.join(', ')}
                    />
                </Grid>
            </StyledDetails>
        </div>
    )
});

export default SkillAssessment
