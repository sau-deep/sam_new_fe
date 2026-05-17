import React, { useState } from 'react'
import { useTranslation } from "react-i18next";
import {
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    Grid,
    FormGroup,
    Checkbox,
    Typography,
} from "@mui/material";
import styles from "./survey.module.css";
import { styled } from '@mui/material/styles';

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

const CMAMChildServicesSection = React.forwardRef((props, ref) => {
    const { t } = useTranslation();
    
    // State for conditional rendering
    const [childCardRecordAvailability, setChildCardRecordAvailability] = useState('');
    const [typeOfRecordAvailable, setTypeOfRecordAvailable] = useState('');
    const [awwVisitsPastMonth, setAwwVisitsPastMonth] = useState('0');
    const [awwActionsDuringVisit, setAwwActionsDuringVisit] = useState([]);
    const [anmMedicineAtEnrollment, setAnmMedicineAtEnrollment] = useState('');
    const [thrReceivedFromAwc, setThrReceivedFromAwc] = useState('');
    const [thrNotReceivedReason, setThrNotReceivedReason] = useState('');
    const [childConsumeThr, setChildConsumeThr] = useState('');
    const [childNotConsumeThr, setChildNotConsumeThr] = useState([]);
    const [thrQtyPrepareChild, setThrQtyPrepareChild] = useState('');
    const [storeThr, setStoreThr] = useState('');
    const [counsellingOnHomeFood, setCounsellingOnHomeFood] = useState('');
    const [counsellingAdviceReceive, setCounsellingAdviceReceive] = useState([]);
    const [childConsumeThrSuggested, setChildConsumeThrSuggested] = useState('');
    
    // State to track if validation should be shown (only after submit attempt)
    const [showValidation, setShowValidation] = useState(false);
    
    // State to track form field values for validation
    const [formValues, setFormValues] = useState({
        currentAgeMonths: '',
        sexOfChild: '',
        currentFollowupOrRecovered: '',
        childCardRecordAvailability: '',
        typeOfRecordAvailable: '',
        otherTypeOfRecord: '',
        lastWeighedDate: '',
        lastMeasuredHeightDate: '',
        whoMeasuredChild: '',
        awwVisitsPastMonth: '0',
        awwActionsDuringVisit: '',
        otherCounsellingTopic: '',
        frequencyOfWeightMeasurement: '',
        anmMedicineAtEnrollment: '',
        medicinesConsumedDuringTreatment: '',
        childConsumeAntibioticFiveDays: '',
        thrReceivedFromAwc: '',
        thrNotReceivedReason: '',
        otherThrNotReceivedReason: '',
        recordForVerification: '',
        qtyThrReceivedPastMonth: '',
        childConsumeThr: '',
        childNotConsumeThr: '',
        otherChildNotConsumeThr: '',
        whoConsumeThr: '',
        daysThrConsumeChild: '',
        thrQtyPrepareChild: '',
        otherThrQtyPrepareChild: '',
        storeThr: '',
        otherStoreThr: '',
        counsellingOnHomeFood: '',
        counsellingAdviceReceive: '',
        otherCounsellingAdvice: ''
    });

    const handleAwwActionsChange = (option, checked) => {
        if (option === 'nothing') {
            if (checked) {
                setAwwActionsDuringVisit(['nothing']);
            } else {
                setAwwActionsDuringVisit([]);
            }
        } else {
            let updated = awwActionsDuringVisit ? [...awwActionsDuringVisit] : [];
            if (checked) {
                updated = updated.filter((v) => v !== 'nothing');
                updated.push(option);
            } else {
                updated = updated.filter((v) => v !== option);
            }
            setAwwActionsDuringVisit(updated);
        }
    };
    

    // Helper function to check if field is empty and validation should show
    const shouldShowError = (fieldName) => {
        if (!showValidation) return false;
        
        // Conditional validation based on user's previous answers
        switch (fieldName) {
            // Type of record available - only show if child card record is available
            case 'typeOfRecordAvailable':
            case 'otherTypeOfRecord':
                return (formValues.childCardRecordAvailability === 'Available') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // AWW actions - only show if AWW visits > 0
            case 'awwActionsDuringVisit':
            case 'otherCounsellingTopic':
                return (formValues.awwVisitsPastMonth !== '0') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // ANM medicine - only show if ANM medicine was given
            case 'childConsumeAntibioticFiveDays':
                return (formValues.anmMedicineAtEnrollment === 'Yes') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // THR not received reason - only show if THR was not received
            case 'thrNotReceivedReason':
            case 'otherThrNotReceivedReason':
                return (formValues.thrReceivedFromAwc === 'No') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // THR received fields - only show if THR was received
            case 'qtyThrReceived':
            case 'childConsumeThr':
                return (formValues.thrReceivedFromAwc === 'Yes') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // THR not consumed reason - only show if THR was not consumed
            case 'childNotConsumeThr':
            case 'otherChildNotConsumeThr':
                return (formValues.childConsumeThr === 'No') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // THR consumed fields - only show if THR was consumed
            case 'whoConsumeThr':
            case 'qtyThrPrepareChild':
            case 'otherQtyThrPrepareChild':
            case 'storeThr':
            case 'otherStoreThr':
                return (formValues.childConsumeThr === 'Yes') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // Counselling advice - only show if advice was received
            case 'counsellingAdviceReceived':
            case 'otherCounsellingAdvice':
                return (formValues.counsellingOnHomeFood === 'Yes') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // Default case for always required fields
            default:
                return !formValues[fieldName] || formValues[fieldName] === '';
        }
    };
    
    // Helper function to update form values
    const updateFormValue = (fieldName, value) => {
        setFormValues(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    // Validation function
    const triggerValidation = () => {
        setShowValidation(true);
        
        // Basic required fields
        const requiredFields = [
            'currentAgeMonths',
            'sexOfChild', 
            'currentFollowupOrRecovered',
            'childCardRecordAvailability',
            'lastWeighedDate',
            'lastMeasuredHeightDate',
            'whoMeasuredChild',
            'awwVisitsPastMonth',
            'frequencyOfWeightMeasurement',
            'anmMedicineAtEnrollment',
            'thrReceivedFromAwc',
            'counsellingOnHomeFood'
        ];

        let firstInvalidField = null;

        // Check basic required fields
        for (const field of requiredFields) {
            if (!formValues[field] || formValues[field].trim() === '') {
                firstInvalidField = field;
                break;
            }
        }

        // Conditional validation for type of record available
        if (formValues.childCardRecordAvailability === 'Available') {
            if (!formValues.typeOfRecordAvailable || formValues.typeOfRecordAvailable.trim() === '') {
                firstInvalidField = 'typeOfRecordAvailable';
            }
            if (formValues.typeOfRecordAvailable === 'Others' && (!formValues.otherTypeOfRecord || formValues.otherTypeOfRecord.trim() === '')) {
                firstInvalidField = 'otherTypeOfRecord';
            }
        }

        // Conditional validation for AWW actions
        if (formValues.awwVisitsPastMonth !== '0') {
            if (!formValues.awwActionsDuringVisit || formValues.awwActionsDuringVisit.trim() === '') {
                firstInvalidField = 'awwActionsDuringVisit';
            }
            if (awwActionsDuringVisit.includes('counselledOnAnyOtherTopic') && (!formValues.otherCounsellingTopic || formValues.otherCounsellingTopic.trim() === '')) {
                firstInvalidField = 'otherCounsellingTopic';
            }
        }

        // Conditional validation for ANM medicine
        if (formValues.anmMedicineAtEnrollment === 'Yes') {
            if (!formValues.childConsumeAntibioticFiveDays || formValues.childConsumeAntibioticFiveDays.trim() === '') {
                firstInvalidField = 'childConsumeAntibioticFiveDays';
            }
        }

        // Conditional validation for THR not received reason
        if (formValues.thrReceivedFromAwc === 'No') {
            if (!formValues.thrNotReceivedReason || formValues.thrNotReceivedReason.trim() === '') {
                firstInvalidField = 'thrNotReceivedReason';
            }
            if (formValues.thrNotReceivedReason === 'Other' && (!formValues.otherThrNotReceivedReason || formValues.otherThrNotReceivedReason.trim() === '')) {
                firstInvalidField = 'otherThrNotReceivedReason';
            }
        }

        // Conditional validation for THR received
        if (formValues.thrReceivedFromAwc === 'Yes') {
            if (!formValues.recordForVerification || formValues.recordForVerification.trim() === '') {
                firstInvalidField = 'recordForVerification';
            }
            if (!formValues.qtyThrReceivedPastMonth || formValues.qtyThrReceivedPastMonth.trim() === '') {
                firstInvalidField = 'qtyThrReceivedPastMonth';
            }
            if (!formValues.childConsumeThr || formValues.childConsumeThr.trim() === '') {
                firstInvalidField = 'childConsumeThr';
            }

            // Conditional validation for child not consume THR
            if (formValues.childConsumeThr === 'No') {
                if (!formValues.childNotConsumeThr || formValues.childNotConsumeThr.trim() === '') {
                    firstInvalidField = 'childNotConsumeThr';
                }
                if (childNotConsumeThr.includes('others') && (!formValues.otherChildNotConsumeThr || formValues.otherChildNotConsumeThr.trim() === '')) {
                    firstInvalidField = 'otherChildNotConsumeThr';
                }
            }

            // Conditional validation for child consume THR
            if (formValues.childConsumeThr === 'Yes') {
                if (!formValues.whoConsumeThr || formValues.whoConsumeThr.trim() === '') {
                    firstInvalidField = 'whoConsumeThr';
                }
                if (!formValues.daysThrConsumeChild || formValues.daysThrConsumeChild.trim() === '') {
                    firstInvalidField = 'daysThrConsumeChild';
                }
                if (!formValues.thrQtyPrepareChild || formValues.thrQtyPrepareChild.trim() === '') {
                    firstInvalidField = 'thrQtyPrepareChild';
                }
                if (formValues.thrQtyPrepareChild === 'Any Other' && (!formValues.otherThrQtyPrepareChild || formValues.otherThrQtyPrepareChild.trim() === '')) {
                    firstInvalidField = 'otherThrQtyPrepareChild';
                }
                if (!formValues.storeThr || formValues.storeThr.trim() === '') {
                    firstInvalidField = 'storeThr';
                }
                if (formValues.storeThr === 'Any other' && (!formValues.otherStoreThr || formValues.otherStoreThr.trim() === '')) {
                    firstInvalidField = 'otherStoreThr';
                }
            }
        }

        // Conditional validation for counselling advice
        if (formValues.counsellingOnHomeFood === 'Yes') {
            if (!formValues.counsellingAdviceReceive || formValues.counsellingAdviceReceive.trim() === '') {
                firstInvalidField = 'counsellingAdviceReceive';
            }
            if (counsellingAdviceReceive.includes('others') && (!formValues.otherCounsellingAdvice || formValues.otherCounsellingAdvice.trim() === '')) {
                firstInvalidField = 'otherCounsellingAdvice';
            }
        }

        if (firstInvalidField) {
            setTimeout(() => {
                const element = document.querySelector(`[name="${firstInvalidField}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                    element.focus();
                }
            }, 100);
            return false;
        }

        return true;
    };

    // Expose triggerValidation function to parent component
    React.useImperativeHandle(ref, () => ({
        triggerValidation
    }));

    return (
        <div id="cmamChildServicesForm">
            <StyledDetails open>
                <summary>&nbsp;{t('section8CMAMChildServices')}</summary>
                <Grid container rowSpacing={2} sx={{ margin: '0', width: '100%' }}>
                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="nameOfChild">
                            {t('section81NameOfChild')} 
                        </label>
                        <TextField
                            fullWidth
                            id="nameOfChild"
                            name="nameOfChild"
                            inputProps={{ maxLength: 100 }}
                            onInput={e => {
                                e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, '');
                            }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="currentAgeMonths">
                            {t('section82CurrentAgeMonths')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            id="currentAgeMonths"
                            name="currentAgeMonths"
                            type="number"
                            value={formValues.currentAgeMonths}
                            onChange={(e) => updateFormValue('currentAgeMonths', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 2) {
                                    e.target.value = e.target.value.slice(0, 2);
                                }
                            }}
                        />
                        {shouldShowError('currentAgeMonths') && (
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
                        <label className={styles.label} htmlFor="sexOfChild">
                            {t('section83SexOfChild')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="sexOfChild"
                            name="sexOfChild"
                            value={formValues.sexOfChild}
                            onChange={(e) => updateFormValue('sexOfChild', e.target.value)}
                        >
                            <FormControlLabel value="Male" control={<Radio />} label={t('male')} />
                            <FormControlLabel value="Female" control={<Radio />} label={t('female')} />
                        </RadioGroup>
                        {shouldShowError('sexOfChild') && (
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
                        <label className={styles.label} htmlFor="currentFollowupOrRecovered">
                            {t('section84ChildCurrentFollowup')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="currentFollowupOrRecovered"
                            name="currentFollowupOrRecovered"
                            value={formValues.currentFollowupOrRecovered}
                            onChange={(e) => updateFormValue('currentFollowupOrRecovered', e.target.value)}
                        >
                            <FormControlLabel value="Currently enrolled under CMAM" control={<Radio />} label={t('currentlyEnrolledUnderCMAM')} />
                            <FormControlLabel value="Completed treatment during past one month" control={<Radio />} label={t('completedTreatmentDuringPastOneMonth')} />
                        </RadioGroup>
                        {shouldShowError('currentFollowupOrRecovered') && (
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
                        <label className={styles.label} htmlFor="childCardRecordAvailability">
                            {t('section85ChildCardRecordAvailability')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childCardRecordAvailability"
                            name="childCardRecordAvailability"
                            value={formValues.childCardRecordAvailability}
                            onChange={(e) => {
                                const value = e.target.value;
                                setChildCardRecordAvailability(value);
                                updateFormValue('childCardRecordAvailability', value);
                                // Reset question 8.6 values when "Not Available" is selected
                                if (value !== 'Available') {
                                    setTypeOfRecordAvailable('');
                                    updateFormValue('typeOfRecordAvailable', '');
                                    updateFormValue('otherTypeOfRecord', '');
                                    // Clear the "Others" text field if it exists
                                    const otherField = document.getElementById('otherTypeOfRecord');
                                    if (otherField) {
                                        otherField.value = '';
                                    }
                                }
                            }}
                        >
                            <FormControlLabel value="Available" control={<Radio />} label={t('available')} />
                            <FormControlLabel value="Not Available" control={<Radio />} label={t('notAvailable')} />
                            <FormControlLabel value="No record at household level,as per state guidelines" control={<Radio />} label={t('noRecordAtHouseholdLevelAsPerStateGuidelines')} />
                        </RadioGroup>
                        {shouldShowError('childCardRecordAvailability') && (
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

                    {formValues.childCardRecordAvailability === 'Available' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="typeOfRecordAvailable">
                                {t('section86TypeOfRecordAvailable')}
                            </label>
                            <RadioGroup
                                aria-label="typeOfRecordAvailable"
                                name="typeOfRecordAvailable"
                                value={formValues.typeOfRecordAvailable}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setTypeOfRecordAvailable(value);
                                    updateFormValue('typeOfRecordAvailable', value);
                                }}
                            >
                                <FormControlLabel value="MCP card" control={<Radio />} label={t('mcpCard')} />
                                <FormControlLabel value="Child Growth card" control={<Radio />} label={t('childGrowthCard')} />
                                <FormControlLabel value="State specific CMAM card" control={<Radio />} label={t('stateSpecificCMAMCard')} />
                                <FormControlLabel value="Others" control={<Radio />} label={t('others')} />
                            </RadioGroup>
                            {shouldShowError('typeOfRecordAvailable') && (
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

                    {formValues.childCardRecordAvailability === 'Available' && formValues.typeOfRecordAvailable === 'Others' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="otherTypeOfRecord">
                                {t('ifOthersSpecifyReason')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                fullWidth
                                id="otherTypeOfRecord"
                                name="otherTypeOfRecord"
                                value={formValues.otherTypeOfRecord}
                                onChange={(e) => updateFormValue('otherTypeOfRecord', e.target.value)}
                                placeholder={t('pleaseSpecifyOtherTypeOfRecord')}
                                inputProps={{ maxLength: 200 }}
                            />
                            {showValidation && formValues.typeOfRecordAvailable === 'Others' && (!formValues.otherTypeOfRecord || formValues.otherTypeOfRecord.trim() === '') && (
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
                        <label className={styles.label} htmlFor="lastWeighedDate">
                            {t('section87LastWeighedDate')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            type="date"
                            id="lastWeighedDate"
                            name="lastWeighedDate"
                            value={formValues.lastWeighedDate}
                            onChange={(e) => updateFormValue('lastWeighedDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        {shouldShowError('lastWeighedDate') && (
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
                        <label className={styles.label} htmlFor="lastMeasuredHeightDate">
                            {t('section88LastMeasuredHeightDate')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            type="date"
                            id="lastMeasuredHeightDate"
                            name="lastMeasuredHeightDate"
                            value={formValues.lastMeasuredHeightDate}
                            onChange={(e) => updateFormValue('lastMeasuredHeightDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        {shouldShowError('lastMeasuredHeightDate') && (
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
                        <label className={styles.label} htmlFor="whoMeasuredChild">
                            {t('section89WhoMeasuredChild')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('multipleResponse')}</em>
                        <FormGroup>
                            {['AWW', 'ASHA', 'ANM'].map((option) => (
                                <FormControlLabel
                                    key={option}
                                    control={
                                        <Checkbox
                                            name="whoMeasuredChild"
                                            value={option}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                const currentValues = formValues.whoMeasuredChild ? formValues.whoMeasuredChild.split(', ') : [];
                                                let updatedValues;
                                                if (checked) {
                                                    updatedValues = [...currentValues, option];
                                                } else {
                                                    updatedValues = currentValues.filter(v => v !== option);
                                                }
                                                updateFormValue('whoMeasuredChild', updatedValues.join(', '));
                                            }}
                                        />
                                    }
                                    label={t(option)}
                                />
                            ))}
                        </FormGroup>
                        {shouldShowError('whoMeasuredChild') && (
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
                        <label className={styles.label} htmlFor="awwVisitsPastMonth">
                            {t('section810AWWVisitsPastMonth')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('hintNum')}</em>
                        <TextField
                            fullWidth
                            type="number"
                            id="awwVisitsPastMonth"
                            name="awwVisitsPastMonth"
                            value={formValues.awwVisitsPastMonth}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Only allow 2 digits (0-99)
                                if (value === '' || (value.length <= 2 && parseInt(value) >= 0 && parseInt(value) <= 99)) {
                                    setAwwVisitsPastMonth(value);
                                    updateFormValue('awwVisitsPastMonth', value);
                                    // Reset awwActionsDuringVisit when visits become 0
                                    if (value === '0') {
                                        setAwwActionsDuringVisit([]);
                                        updateFormValue('awwActionsDuringVisit', '');
                                    }
                                }
                            }}
                            onInput={(e) => {
                                // Prevent input beyond 2 digits
                                if (e.target.value.length > 2) {
                                    e.target.value = e.target.value.slice(0, 2);
                                }
                            }}
                            inputProps={{ min: 0, max: 99, maxLength: 2 }}
                        />
                        {shouldShowError('awwVisitsPastMonth') && (
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

                    {formValues.awwVisitsPastMonth !== '0' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="awwActionsDuringVisit">
                                {t('section811AWWActionsDuringVisit')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('multipleResponse')}</em>
                            <FormGroup>
                                {[
                                    'enquiredAboutAnyHealthIssuesInTheChildSymptomsSigns',
                                    'weighedTheChild',
                                    'enquiredAboutConsumptionOfMedicineAndSupplementByTheChild',
                                    'checkedForThePacketsOfTHR',
                                    'counselledOnUseOfTHR',
                                    'counselledOnEnrichingHomeFoodForTheChild',
                                    'counselledOtherFamilyMembersIncludingInLawsHusbandAndOthers',
                                    'nothing',
                                    'counselledOnAnyOtherTopic'
                                ].map((option) => (
                                    <FormControlLabel
                                        key={option}
                                        control={
                                            <Checkbox
                                                name="awwActionsDuringVisit"
                                                value={option}
                                                checked={awwActionsDuringVisit.includes(option)}
                                                onChange={(e) => {
                                                    handleAwwActionsChange(option, e.target.checked);
                                                    const updatedActions = e.target.checked 
                                                        ? [...awwActionsDuringVisit, option]
                                                        : awwActionsDuringVisit.filter(action => action !== option);
                                                    updateFormValue('awwActionsDuringVisit', updatedActions.join(', '));
                                                }}
                                            />
                                        }
                                        label={t(option)}
                                    />
                                ))}
                            </FormGroup>
                            {shouldShowError('awwActionsDuringVisit') && (
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

                    {formValues.awwVisitsPastMonth !== '0' && awwActionsDuringVisit.includes('counselledOnAnyOtherTopic') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="otherCounsellingTopic">
                                {t('ifCounselledOnAnyOtherTopicPleaseSpecify')} <span
                                className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                fullWidth
                                id="otherCounsellingTopic"
                                name="otherCounsellingTopic"
                                value={formValues.otherCounsellingTopic}
                                onChange={(e) => updateFormValue('otherCounsellingTopic', e.target.value)}
                                placeholder={t('pleaseSpecifyOtherCounsellingTopic')}
                                inputProps={{ maxLength: 500 }}
                            />
                            {showValidation && awwActionsDuringVisit.includes('counselledOnAnyOtherTopic') && (!formValues.otherCounsellingTopic || formValues.otherCounsellingTopic.trim() === '') && (
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
                        <label className={styles.label} htmlFor="frequencyOfWeightMeasurement">
                            {t('section812FrequencyOfWeightMeasurement')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="frequencyOfWeightMeasurement"
                            name="frequencyOfWeightMeasurement"
                            value={formValues.frequencyOfWeightMeasurement}
                            onChange={(e) => updateFormValue('frequencyOfWeightMeasurement', e.target.value)}
                        >
                            <FormControlLabel value="Weekly" control={<Radio />} label={t('weekly')} />
                            <FormControlLabel value="Fortnightly" control={<Radio />} label={t('fortnightly')} />
                            <FormControlLabel value="Monthly" control={<Radio />} label={t('monthly')} />
                        </RadioGroup>
                        {shouldShowError('frequencyOfWeightMeasurement') && (
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
                        <label className={styles.label} htmlFor="anmMedicineAtEnrollment">
                            {t('section813ANMMedicineAtEnrollment')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="anmMedicineAtEnrollment"
                            name="anmMedicineAtEnrollment"
                            value={formValues.anmMedicineAtEnrollment}
                            onChange={(e) => {
                                const value = e.target.value;
                                setAnmMedicineAtEnrollment(value);
                                updateFormValue('anmMedicineAtEnrollment', value);
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('anmMedicineAtEnrollment') && (
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

                    {formValues.anmMedicineAtEnrollment === 'Yes' && (
                        <>
                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="medicinesConsumedDuringTreatment">
                                    {t('section814MedicinesConsumedDuringTreatment')}
                                </label>
                                <em>{t('showTheMedicineAndCheckIfMotherIsProvidingTheSameToTheChild')}</em>
                                <FormGroup>
                                    {[
                                        'Amoxycillin',
                                        'IFA Syrup',
                                        'Multivitamin syrup',
                                        'Folic Acid',
                                        'Albendazole',
                                        'Vitamin-A',
                                        'Zinc'
                                    ].map((option) => (
                                        <FormControlLabel
                                            key={option}
                                            control={
                                                <Checkbox
                                                    name="medicinesConsumedDuringTreatment"
                                                    value={option}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        const currentValues = formValues.medicinesConsumedDuringTreatment ? formValues.medicinesConsumedDuringTreatment.split(', ') : [];
                                                        let updatedValues;
                                                        if (checked) {
                                                            updatedValues = [...currentValues, option];
                                                        } else {
                                                            updatedValues = currentValues.filter(v => v !== option);
                                                        }
                                                        updateFormValue('medicinesConsumedDuringTreatment', updatedValues.join(', '));
                                                    }}
                                                />
                                            }
                                            label={t(option)}
                                        />
                                    ))}
                                </FormGroup>
                            </Grid>

                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="childConsumeAntibioticFiveDays">
                                    {t('section815ChildConsumeAntibioticFiveDays')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup
                                    aria-label="childConsumeAntibioticFiveDays"
                                    name="childConsumeAntibioticFiveDays"
                                    value={formValues.childConsumeAntibioticFiveDays}
                                    onChange={(e) => updateFormValue('childConsumeAntibioticFiveDays', e.target.value)}
                                >
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                    <FormControlLabel value="Not provided" control={<Radio />} label={t('notProvided')} />
                                </RadioGroup>
                                {shouldShowError('childConsumeAntibioticFiveDays') && (
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

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="thrReceivedFromAwc">
                            {t('section816THRReceivedFromAWC')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="thrReceivedFromAwc"
                            name="thrReceivedFromAwc"
                            value={formValues.thrReceivedFromAwc}
                            onChange={(e) => {
                                const value = e.target.value;
                                setThrReceivedFromAwc(value);
                                updateFormValue('thrReceivedFromAwc', value);
                                // Clear THR not received reason when THR is received
                                if (value === 'Yes') {
                                    setThrNotReceivedReason('');
                                    updateFormValue('thrNotReceivedReason', '');
                                    updateFormValue('otherThrNotReceivedReason', '');
                                    // Clear the "Others" text field if it exists
                                    const otherField = document.getElementById('otherThrNotReceivedReasonChild');
                                    if (otherField) {
                                        otherField.value = '';
                                    }
                                }
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('thrReceivedFromAwc') && (
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

                    {formValues.thrReceivedFromAwc === 'No' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="thrNotReceivedReasonChild">
                                {t('section817THRNotReceivedReason')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup
                                aria-label="thrNotReceivedReasonChild"
                                name="thrNotReceivedReasonChild"
                                value={formValues.thrNotReceivedReason}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setThrNotReceivedReason(value);
                                    updateFormValue('thrNotReceivedReason', value);
                                }}
                            >
                                <FormControlLabel value="Not distributed" control={<Radio />} label={t('notDistributed')} />
                                <FormControlLabel value="Not taken/interested" control={<Radio />} label={t('notTakenInterested')} />
                                <FormControlLabel value="Beneficiary was out of village" control={<Radio />} label={t('beneficiaryWasOutOfVillage')} />
                                <FormControlLabel value="Other" control={<Radio />} label={t('other')} />
                            </RadioGroup>
                            {shouldShowError('thrNotReceivedReason') && (
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

                    {formValues.thrNotReceivedReason === 'Other' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="otherThrNotReceivedReasonChild">
                                {t('other')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                fullWidth
                                id="otherThrNotReceivedReasonChild"
                                name="otherThrNotReceivedReasonChild"
                                value={formValues.otherThrNotReceivedReason}
                                onChange={(e) => updateFormValue('otherThrNotReceivedReason', e.target.value)}
                                placeholder={t('otherSpecify')}
                                inputProps={{ maxLength: 500 }}
                            />
                            {showValidation && formValues.thrNotReceivedReason === 'Other' && (!formValues.otherThrNotReceivedReason || formValues.otherThrNotReceivedReason.trim() === '') && (
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

                    {formValues.thrReceivedFromAwc === 'Yes' && (
                        <>
                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="recordForVerification">
                                    {t('section818RecordForVerification')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <em>{t('checkIfThereIsAnyCardAvailableWithMotherThatRecordsProvisionOfTHRToTheMother')}</em>
                                <RadioGroup
                                    aria-label="recordForVerification"
                                    name="recordForVerification"
                                    value={formValues.recordForVerification}
                                    onChange={(e) => updateFormValue('recordForVerification', e.target.value)}
                                >
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                </RadioGroup>
                                {shouldShowError('recordForVerification') && (
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
                                <label className={styles.label} htmlFor="qtyThrReceivedPastMonth">
                                    {t('section819QtyTHRReceivedPastMonth')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <em>{t('enterNumberPacketsReceived')}</em>
                                <TextField
                                    fullWidth
                                    type="number"
                                    id="qtyThrReceivedPastMonth"
                                    name="qtyThrReceivedPastMonth"
                                    value={formValues.qtyThrReceivedPastMonth}
                                    onChange={(e) => updateFormValue('qtyThrReceivedPastMonth', e.target.value)}
                                    inputProps={{ min: 0, max: 99 }}
                                />
                                {shouldShowError('qtyThrReceivedPastMonth') && (
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
                                <label className={styles.label} htmlFor="childConsumeThr">
                                    {t('section820ChildConsumeTHR')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup
                                    aria-label="childConsumeThr"
                                    name="childConsumeThr"
                                    value={formValues.childConsumeThr}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setChildConsumeThr(value);
                                        updateFormValue('childConsumeThr', value);
                                    }}
                                >
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                </RadioGroup>
                                {shouldShowError('childConsumeThr') && (
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

                            {formValues.childConsumeThr === 'No' && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="childNotConsumeThr">
                                        {t('section821ChildNotConsumeTHR')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <FormGroup>
                                        {[
                                            'didNotLikeTheContentPacket',
                                            'didNotLikeTheTaste',
                                            'qualityIsPoor',
                                            'howToUse',
                                            'notPossibleToSeparatelyCookForTheChild',
                                            'others'
                                        ].map((option) => (
                                            <FormControlLabel
                                                key={option}
                                                control={
                                                    <Checkbox
                                                        name="childNotConsumeThr"
                                                        value={option}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            let updatedValues;
                                                            if (checked) {
                                                                updatedValues = [...childNotConsumeThr, option];
                                                            } else {
                                                                updatedValues = childNotConsumeThr.filter(item => item !== option);
                                                            }
                                                            setChildNotConsumeThr(updatedValues);
                                                            updateFormValue('childNotConsumeThr', updatedValues.join(', '));
                                                        }}
                                                    />
                                                }
                                                label={t(option)}
                                            />
                                        ))}
                                    </FormGroup>
                                    {shouldShowError('childNotConsumeThr') && (
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

                            {formValues.childConsumeThr === 'No' && childNotConsumeThr.includes('others') && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="otherChildNotConsumeThr">
                                        {t('others')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <TextField
                                        fullWidth
                                        id="otherChildNotConsumeThr"
                                        name="otherChildNotConsumeThr"
                                        value={formValues.otherChildNotConsumeThr}
                                        onChange={(e) => updateFormValue('otherChildNotConsumeThr', e.target.value)}
                                        placeholder={t('otherSpecify')}
                                        inputProps={{ maxLength: 500 }}
                                    />
                                    {showValidation && childNotConsumeThr.includes('others') && (!formValues.otherChildNotConsumeThr || formValues.otherChildNotConsumeThr.trim() === '') && (
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

                            {formValues.childConsumeThr === 'Yes' && (
                                <>
                                    <Grid item xs={12}>
                                        <label className={styles.label} htmlFor="whoConsumeThr">
                                            {t('section822WhoConsumeTHR')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <RadioGroup
                                            aria-label="whoConsumeThr"
                                            name="whoConsumeThr"
                                            value={formValues.whoConsumeThr}
                                            onChange={(e) => updateFormValue('whoConsumeThr', e.target.value)}
                                        >
                                            <FormControlLabel value="Only by the intended child" control={<Radio />} label={t('onlyIntendedChild')} />
                                            <FormControlLabel value="Intended child and other children in the family" control={<Radio />} label={t('intendedChildOtherChildren')} />
                                            <FormControlLabel value="Intended + other family members including adults" control={<Radio />} label={t('intendedOtherFamilyMembers')} />
                                            <FormControlLabel value="Only by adults in the family" control={<Radio />} label={t('onlyAdultsFamily')} />
                                        </RadioGroup>
                                        {shouldShowError('whoConsumeThr') && (
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
                                        <label className={styles.label} htmlFor="daysThrConsumeChild">
                                            {t('section823DaysTHRConsumeChild')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <em>{t('enterNumberDays')}</em>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            id="daysThrConsumeChild"
                                            name="daysThrConsumeChild"
                                            value={formValues.daysThrConsumeChild}
                                            onChange={(e) => updateFormValue('daysThrConsumeChild', e.target.value)}
                                            inputProps={{ min: 0, max: 31 }}
                                        />
                                        {shouldShowError('daysThrConsumeChild') && (
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
                                        <label className={styles.label} htmlFor="thrQtyPrepareChild">
                                            {t('section824DaysTHRPrepareChild')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <em>{t('pleaseNoteThatStandardSizeOfTheKatoriIs250ml')}</em>
                                        <RadioGroup
                                            aria-label="thrQtyPrepareChild"
                                            name="thrQtyPrepareChild"
                                            value={formValues.thrQtyPrepareChild}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setThrQtyPrepareChild(value);
                                                updateFormValue('thrQtyPrepareChild', value);
                                            }}
                                        >
                                            <FormControlLabel value="Half Katori" control={<Radio />} label={t('halfKatori')} />
                                            <FormControlLabel value="One Katori" control={<Radio />} label={t('oneKatori')} />
                                            <FormControlLabel value="Two Katori" control={<Radio />} label={t('twoKatori')} />
                                            <FormControlLabel value="Half Packet" control={<Radio />} label={t('halfPacket')} />
                                            <FormControlLabel value="Full Packet" control={<Radio />} label={t('fullPacket')} />
                                            <FormControlLabel value="Any Other" control={<Radio />} label={t('other')} />
                                        </RadioGroup>
                                        {shouldShowError('thrQtyPrepareChild') && (
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

                                    {formValues.thrQtyPrepareChild === 'Any Other' && (
                                        <Grid item xs={12}>
                                            <label className={styles.label} htmlFor="otherThrQtyPrepareChild">
                                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                                            </label>
                                            <TextField
                                                fullWidth
                                                id="otherThrQtyPrepareChild"
                                                name="otherThrQtyPrepareChild"
                                                value={formValues.otherThrQtyPrepareChild}
                                                onChange={(e) => updateFormValue('otherThrQtyPrepareChild', e.target.value)}
                                                placeholder={t('If other, please specify')}
                                                inputProps={{ maxLength: 200 }}
                                            />
                                            {showValidation && formValues.thrQtyPrepareChild === 'Any Other' && (!formValues.otherThrQtyPrepareChild || formValues.otherThrQtyPrepareChild.trim() === '') && (
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
                                        <label className={styles.label} htmlFor="storeThr">
                                            {t('section825StoreTHR')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <RadioGroup
                                            aria-label="storeThr"
                                            name="storeThr"
                                            value={formValues.storeThr}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setStoreThr(value);
                                                updateFormValue('storeThr', value);
                                            }}
                                        >
                                            <FormControlLabel value="Closed container" control={<Radio />} label={t('closeCont')} />
                                            <FormControlLabel value="Keeping the same packet with tightly packed" control={<Radio />} label={t('tightlyPacked')} />
                                            <FormControlLabel value="Keeping the same packet opened as it is" control={<Radio />} label={t('openedPack')} />
                                            <FormControlLabel value="Any other" control={<Radio />} label={t('other')} />
                                        </RadioGroup>
                                        {shouldShowError('storeThr') && (
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

                                    {formValues.storeThr === 'Any other' && (
                                        <Grid item xs={12}>
                                            <label className={styles.label} htmlFor="otherStoreThr">
                                                {t('other')} <span className={styles.requiredStar}>*</span>
                                            </label>
                                            <TextField
                                                fullWidth
                                                id="otherStoreThr"
                                                name="otherStoreThr"
                                                value={formValues.otherStoreThr}
                                                onChange={(e) => updateFormValue('otherStoreThr', e.target.value)}
                                                placeholder={t('If other, please specify')}
                                                inputProps={{ maxLength: 200 }}
                                            />
                                            {showValidation && formValues.storeThr === 'Any other' && (!formValues.otherStoreThr || formValues.otherStoreThr.trim() === '') && (
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
                                </>
                            )}
                        </>
                    )}

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="counsellingOnHomeFood">
                            {t('section826CounsellingOnHomeFood')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="counsellingOnHomeFood"
                            name="counsellingOnHomeFood"
                            value={formValues.counsellingOnHomeFood}
                            onChange={(e) => {
                                const value = e.target.value;
                                setCounsellingOnHomeFood(value);
                                updateFormValue('counsellingOnHomeFood', value);
                                // Clear counselling advice fields when counselling is "No"
                                if (value === 'No') {
                                    setCounsellingAdviceReceive([]);
                                    updateFormValue('counsellingAdviceReceive', '');
                                    updateFormValue('otherCounsellingAdvice', '');
                                    // Clear the "Others" text field if it exists
                                    const otherField = document.getElementById('otherCounsellingAdvice');
                                    if (otherField) {
                                        otherField.value = '';
                                    }
                                }
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('counsellingOnHomeFood') && (
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

                    {formValues.counsellingOnHomeFood === 'Yes' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="counsellingAdviceReceive">
                                {t('section827Advice')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('multipleResponse')}</em>
                            <FormGroup>
                                {[
                                    'feedGreenLeafyVegetables',
                                    'feedFruitsToTheChild',
                                    'addGheeOilToTheFood',
                                    'addGudhSugarToTheFood',
                                    'prepareRecipesUsingTHR',
                                    'giveRecipeMadeFromTHROnlyToTheChild',
                                    'demonstrationOfRecipe',
                                    'addSehjanSurjanaMoringoriferaLeavesDriedPowderToTheFood',
                                    'setUpKitchenGarden',
                                    'continueHomeFoodDuringFeverDiarrhoea',
                                    'continueBreastfeeding',
                                    'breastfeedingDuringIllness',
                                    'correctPositionAndAttachmentBreastfeedingSupport',
                                    'others'
                                ].map((option) => (
                                    <FormControlLabel
                                        key={option}
                                        control={
                                            <Checkbox
                                                name="counsellingAdviceReceive"
                                                value={option}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    let updatedValues;
                                                    if (checked) {
                                                        updatedValues = [...counsellingAdviceReceive, option];
                                                    } else {
                                                        updatedValues = counsellingAdviceReceive.filter(item => item !== option);
                                                    }
                                                    setCounsellingAdviceReceive(updatedValues);
                                                    updateFormValue('counsellingAdviceReceive', updatedValues.join(', '));
                                                }}
                                            />
                                        }
                                        label={t(option)}
                                    />
                                ))}
                            </FormGroup>
                            {shouldShowError('counsellingAdviceReceive') && (
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

                    {counsellingAdviceReceive.includes('others') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="otherCounsellingAdvice">
                                {t('others')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                fullWidth
                                id="otherCounsellingAdvice"
                                name="otherCounsellingAdvice"
                                value={formValues.otherCounsellingAdvice}
                                onChange={(e) => updateFormValue('otherCounsellingAdvice', e.target.value)}
                                placeholder={t('If others, please specify')}
                                inputProps={{ maxLength: 500 }}
                            />
                            {showValidation && counsellingAdviceReceive.includes('others') && (!formValues.otherCounsellingAdvice || formValues.otherCounsellingAdvice.trim() === '') && (
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

                    {/* Hidden inputs for single-choice and multiple-choice Others options */}
                    {formValues.childCardRecordAvailability === 'Available' && (
                        <input
                            type="hidden"
                            name="typeOfRecordAvailableCombined"
                            value={(() => {
                                const otherText = document.getElementById('otherTypeOfRecord')?.value;
                                if (typeOfRecordAvailable === 'Others' && otherText?.trim()) {
                                    return `Others - ${otherText.trim()}`;
                                }
                                return typeOfRecordAvailable;
                            })()}
                        />
                    )}
                    
                    {/* Only include thrNotReceivedReasonChildCombined when THR was not received */}
                    {formValues.thrReceivedFromAwc === 'No' && (
                        <input
                            type="hidden"
                            name="thrNotReceivedReasonChildCombined"
                            value={(() => {
                                const otherText = document.getElementById('otherThrNotReceivedReasonChild')?.value;
                                if (thrNotReceivedReason === 'Other' && otherText?.trim()) {
                                    return `Others - ${otherText.trim()}`;
                                }
                                return thrNotReceivedReason || '';
                            })()}
                        />
                    )}
                    
                    <input
                        type="hidden"
                        name="childNotConsumeThrCombined"
                        value={(() => {
                            let finalOptions = [...childNotConsumeThr];
                            const otherText = document.getElementById('otherChildNotConsumeThr')?.value;
                            if (childNotConsumeThr.includes('other') && otherText?.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'other');
                                finalOptions.push(`Others - ${otherText.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />
                    
                    <input
                        type="hidden"
                        name="thrQtyPrepareChildCombined"
                        value={(() => {
                            const otherText = document.getElementById('otherThrQtyPrepareChild')?.value;
                            if (thrQtyPrepareChild === 'Any Other' && otherText?.trim()) {
                                return `Others - ${otherText.trim()}`;
                            }
                            return thrQtyPrepareChild;
                        })()}
                    />
                    
                    <input
                        type="hidden"
                        name="storeThrCombined"
                        value={(() => {
                            const otherText = document.getElementById('otherStoreThr')?.value;
                            if (storeThr === 'Any other' && otherText?.trim()) {
                                return `Others - ${otherText.trim()}`;
                            }
                            return storeThr;
                        })()}
                    />
                    
                    <input
                        type="hidden"
                        name="awwActionsDuringVisitCombined"
                        value={(() => {
                            let finalOptions = [...awwActionsDuringVisit];
                            const otherText = document.getElementById('otherCounsellingTopic')?.value;
                            if (awwActionsDuringVisit.includes('counselledOnAnyOtherTopic') && otherText?.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'counselledOnAnyOtherTopic');
                                finalOptions.push(`Others - ${otherText.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />
                    
                    {/* Only include counsellingAdviceReceiveCombined when counselling on home food is "Yes" */}
                    {formValues.counsellingOnHomeFood === 'Yes' && (
                        <input
                            type="hidden"
                            name="counsellingAdviceReceiveCombined"
                            value={(() => {
                                let finalOptions = [...counsellingAdviceReceive];
                                const otherText = document.getElementById('otherCounsellingAdvice')?.value;
                                if (counsellingAdviceReceive.includes('others') && otherText?.trim()) {
                                    finalOptions = finalOptions.filter(option => option !== 'others');
                                    finalOptions.push(`Others - ${otherText.trim()}`);
                                }
                                return finalOptions.join(', ');
                            })()}
                        />
                    )}
                </Grid>
            </StyledDetails>
        </div>
    );
});

export default CMAMChildServicesSection;
