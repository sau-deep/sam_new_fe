import React, { useState } from 'react'
import styles from "./survey.module.css";
import {
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    Grid,
    Typography,
    FormGroup,
    Checkbox,
    Select,
    MenuItem,
    Box,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { styled } from '@mui/material/styles';
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

const ANMCHOKnowledgeAssessmentSection = React.forwardRef((props, ref) => {
    const { t } = useTranslation();
    
    // State management for checkbox groups and "Others" options
    const [confirmChildSam, setConfirmChildSam] = useState('');
    const [assessingMedicalComplication, setAssessingMedicalComplication] = useState([]);
    const [assessingMedicalComplicationOther, setAssessingMedicalComplicationOther] = useState('');
    const [childSamReferredNrc, setChildSamReferredNrc] = useState([]);
    const [childSamReferredNrcOther, setChildSamReferredNrcOther] = useState('');
    const [medicinesGivenCommunityLevel, setMedicinesGivenCommunityLevel] = useState([]);
    const [medicinesGivenCommunityLevelOther, setMedicinesGivenCommunityLevelOther] = useState('');
    // Re-add state for cmamTraining (7.1)
    const [cmamTraining, setCmamTraining] = useState('');
    // Add state for date picker
    const [lastTrainingMonthYear, setLastTrainingMonthYear] = useState(dayjs());
    
    // State to track if validation should be shown (only after submit attempt)
    const [showValidation, setShowValidation] = useState(false);
    
    // State to track form field values for validation
    const [formValues, setFormValues] = useState({
        cmamTraining: '',
        cmamTrainingMonth: '',
        confirmChildSam: '',
        assessingMedicalComplication: '',
        childSamReferredNrc: '',
        medicinesGivenCommunityLevel: ''
    });

    // Options for question 7.3 with translation keys
    const confirmChildSamOptions = [
        { key: 'whzLessThan3SDRedCategory', value: 'WHZ < -3SD/ Red category as per WFH' },
        { key: 'bilateralPittingOedema', value: 'Bilateral pitting oedema' },
        { key: 'bothWHZAndBilateralOedema', value: 'Both WHZ < -3 s.d. and/or bilateral pitting oedema' },
        { key: 'dontKnow', value: "Don't know" }
    ];

    // Options for question 7.4 with translation keys
    const assessingMedicalComplicationOptions = [
        { key: 'assessMedComplSymptomsCough', value: 'Symptoms – cough' },
        { key: 'assessMedComplSymptomsFever', value: 'Symptoms – fever' },
        { key: 'assessMedComplSymptomsDiarrhea', value: 'Symptoms – diarrhea' },
        { key: 'assessMedComplRespiratoryRate', value: 'Respiratory rate' },
        { key: 'assessMedComplDifficultyBreathing', value: 'Difficulty in breathing with chest indrawing' },
        { key: 'assessMedComplTemperature', value: 'Temperature' },
        { key: 'assessMedComplDehydrationSigns', value: 'Signs of dehydration – sunken eyes, skin pinch going back very slowly' },
        { key: 'assessMedComplSkinInfections', value: 'Skin infections' },
        { key: 'assessMedComplEyeEarInfections', value: 'Eye / ear infections' },
        { key: 'assessMedComplAppetiteTestResult', value: 'Result of appetite test' },
        { key: 'assessMedComplHaemoglobinTest', value: 'Test haemoglobin' },
        { key: 'assessMedComplLookingPallor', value: 'Looking for pallor' },
        { key: 'assessMedComplLookingOedema', value: 'Looking for oedema over both feet' },
        { key: 'dontKnow', value: "Don't Know" },
        { key: 'others', value: 'Others' }
    ];

    // Options for question 7.5 with translation keys
    const childSamReferredNrcOptions = [
        { key: 'nrcReferralRespiratoryRate6to12', value: 'Respiratory rate ≥50 /minute for children aged 6 month to 1 year' },
        { key: 'nrcReferralRespiratoryRate1to5', value: 'Respiratory rate ≥60 /minute for children aged 1-5 years' },
        { key: 'nrcReferralDifficultyBreathing', value: 'Child with difficulty in breathing chest indrawing' },
        { key: 'nrcReferralAxillaryTemperature', value: 'Axillary temperature ≥39 C̊ / ≥102.2˚F' },
        { key: 'nrcReferralHypothermia', value: 'Hypothermia' },
        { key: 'nrcReferralCoughTwoWeeks', value: 'Cough more than 2 weeks' },
        { key: 'nrcReferralDiarrheaFourteenDays', value: 'Diarrhea more than fourteen days' },
        { key: 'nrcReferralDiarrheaDehydration', value: 'Diarrhea with signs of dehydration' },
        { key: 'nrcReferralChildPallorAnemia', value: 'Child with pallor or anemia' },
        { key: 'nrcReferralOtherInfections', value: 'Child with any other infections – skin, eyes, ear' },
        { key: 'nrcReferralFailsAppetiteTest', value: 'Child who fails appetite test' },
        { key: 'nrcReferralBilateralPittingOedema', value: 'Child with bilateral pitting oedema' },
        { key: 'nrcReferralMedicalComplicationDuringCMAM', value: 'Child develops any medical complication during the CMAM treatment in community' },
        { key: 'nrcReferralFailsAppetiteFollowUp', value: 'Child fails in the appetite test during community level follow up in any CMAM session/clinic' },
        { key: 'nrcReferralNoWeightGainTwoFollowUps', value: 'Child does not gain weight or loses weight in two consecutive follow-ups during the CMAM treatment in community' },
        { key: 'nrcReferralComplicationTwoFollowUps', value: 'Child develops any complication during two consecutive follow-ups during the CMAM treatment in community' },
        { key: 'dontKnow', value: "Don't Know" },
        { key: 'others', value: 'Others' }
    ];

    // Options for question 7.6 with translation keys
    const medicinesGivenCommunityLevelOptions = [
        { key: 'medicineAmoxycillin', value: 'Amoxycillin' },
        { key: 'medicineFolicAcidTablet', value: 'Folic acid tablet' },
        { key: 'medicineAlbendazole', value: 'Albendazole' },
        { key: 'medicineVitaminA', value: 'Vitamin A' },
        { key: 'medicineIFASyrup', value: 'IFA syrup' },
        { key: 'medicineMultivitaminSyrup', value: 'Multivitamin syrup' },
        { key: 'medicineZinc', value: 'Zinc' },
        { key: 'medicineORS', value: 'Oral Rehydration Salt (ORS)' },
        { key: 'medicineParacetamol', value: 'Paracetamol (PCM)' },
        { key: 'dontKnow', value: "Don't Know" },
        { key: 'others', value: 'Others' }
    ];
    
    // Function to trigger validation display (called from parent on submit)
    const triggerValidation = () => {
        setShowValidation(true);
        
        // Check all required fields using formValues state
        const requiredFields = [
            'cmamTraining', 'confirmChildSam', 'assessingMedicalComplication', 
            'childSamReferredNrc', 'medicinesGivenCommunityLevel'
        ];
        
        // Find first invalid field
        let firstInvalidField = null;
        for (const field of requiredFields) {
            if (!formValues[field] || formValues[field].trim() === '') {
                firstInvalidField = field;
                break;
            }
        }
        
        // Check conditional field for cmamTrainingMonth
        if (formValues.cmamTraining === 'Yes') {
            if (!formValues.cmamTrainingMonth || formValues.cmamTrainingMonth.trim() === '') {
                firstInvalidField = 'cmamTrainingMonth';
            }
        }
        
        // Check conditional fields for "Others" options
        if (assessingMedicalComplication.includes('Others') && (!assessingMedicalComplicationOther || assessingMedicalComplicationOther.trim() === '')) {
            firstInvalidField = 'assessingMedicalComplicationOther';
        }
        
        if (childSamReferredNrc.includes('Others') && (!childSamReferredNrcOther || childSamReferredNrcOther.trim() === '')) {
            firstInvalidField = 'childSamReferredNrcOther';
        }
        
        if (medicinesGivenCommunityLevel.includes('Others') && (!medicinesGivenCommunityLevelOther || medicinesGivenCommunityLevelOther.trim() === '')) {
            firstInvalidField = 'medicinesGivenCommunityLevelOther';
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
    React.useImperativeHandle(ref, () => ({
        triggerValidation
    }));

    // Helper function to check if field is empty and validation should show
    const shouldShowError = (fieldName) => {
        if (!showValidation) return false;
        return !formValues[fieldName] || formValues[fieldName] === '';
    };
    
    // Helper function to update form values
    const updateFormValue = (fieldName, value) => {
        setFormValues(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    return (
        <div id="anmChoKnowledgeForm">
            <StyledDetails open>
                <summary>&nbsp;{t('section7ANMCHOKnowledgeAssessment')}</summary>
                <Grid container rowSpacing={3} columnSpacing={2} sx={{
                    margin: '0',
                    width: '100%'
                }}>
                    {/* 7.1 CMAM Training */}
                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="cmamTraining">
                            {t('section71CMAMTrainingEverReceived')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            name="cmamTraining"
                            value={formValues.cmamTraining}
                            onChange={e => {
                                const value = e.target.value;
                                setCmamTraining(value);
                                updateFormValue('cmamTraining', value);
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

                    {/* 7.2 Last Training Date: only if cmamTraining === 'Yes' */}
                    {formValues.cmamTraining === 'Yes' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="cmamTrainingMonth">
                                {t('section72LastTrainingDate')}
                            </label>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                {t('anmCannotRecallInstruction')}
                            </Typography>
                            <Box sx={{ mb: 2 }} />
                            <DatePicker
                                views={['year', 'month']}
                                label={t('selectMonthYear')}
                                minDate={dayjs('2010-01-01')}
                                maxDate={dayjs()}
                                value={lastTrainingMonthYear}
                                onChange={(newValue) => {
                                    setLastTrainingMonthYear(newValue ? dayjs(newValue) : dayjs());
                                    updateFormValue('cmamTrainingMonth', newValue ? dayjs(newValue).format('MM/YYYY') : '');
                                }}
                                format="MM/YYYY"
                                slotProps={{ textField: { size: 'small', className: styles.formInput } }}
                            />
                            {shouldShowError('cmamTrainingMonth') && (
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
                            {/* Hidden input for form submission */}
                            <input
                                type="hidden"
                                name="cmamTrainingMonth"
                                value={lastTrainingMonthYear ? lastTrainingMonthYear.format('MM/YYYY') : ''}
                            />
                        </Grid>
                    )}

                    {/* 7.3 How to confirm SAM child */}
                    <Grid item xs={12}>
                        <label className={styles.label}>
                            {t('section73ConfirmChildSAM')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            name="confirmChildSam"
                            value={formValues.confirmChildSam}
                            onChange={(e) => {
                                const value = e.target.value;
                                setConfirmChildSam(value);
                                updateFormValue('confirmChildSam', value);
                            }}
                        >
                            {confirmChildSamOptions.map((option) => (
                                <FormControlLabel
                                    key={option.key}
                                    value={option.value}
                                    control={<Radio />}
                                    label={t(option.key)}
                                />
                            ))}
                        </RadioGroup>
                        {shouldShowError('confirmChildSam') && (
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

                    {/* 7.4 Assessing medical complication */}
                    <Grid item xs={12}>
                        <label className={styles.label}>
                            {t('section74AssessingMedicalComplication')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                            {t('multipleResponse')}
                        </Typography>
                        <FormGroup>
                            {assessingMedicalComplicationOptions.map((option) => (
                                <FormControlLabel
                                    key={option.key}
                                    control={
                                        <Checkbox 
                                            name="assessingMedicalComplication" 
                                            value={option.value}
                                            checked={assessingMedicalComplication.includes(option.value)}
                                            onChange={(e) => {
                                                const { checked, value } = e.target;
                                                if (/don't know/i.test(value)) {
                                                    if (checked) {
                                                        setAssessingMedicalComplication([option.value]);
                                                        updateFormValue('assessingMedicalComplication', option.value);
                                                    } else {
                                                        setAssessingMedicalComplication([]);
                                                        updateFormValue('assessingMedicalComplication', '');
                                                    }
                                                } else {
                                                    let updated = assessingMedicalComplication ? [...assessingMedicalComplication] : [];
                                                    if (checked) {
                                                        updated = updated.filter((v) => !/don't know/i.test(v));
                                                        updated.push(value);
                                                    } else {
                                                        updated = updated.filter((v) => v !== value);
                                                    }
                                                    setAssessingMedicalComplication(updated);
                                                    updateFormValue('assessingMedicalComplication', updated.join(', '));
                                                }
                                            }}
                                        />
                                    }
                                    label={t(option.key)}
                                />
                            ))}
                        </FormGroup>
                        {shouldShowError('assessingMedicalComplication') && (
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

                    {/* Conditional "Others" field for 7.4 */}
                    {assessingMedicalComplication.includes('Others') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="assessingMedicalComplicationOther">
                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                className={styles.formInput}
                                name="assessingMedicalComplicationOther"
                                id="assessingMedicalComplicationOther"
                                value={assessingMedicalComplicationOther}
                                onChange={(e) => setAssessingMedicalComplicationOther(e.target.value)}
                                placeholder={t('pleaseSpecifyOtherAssessmentMethod')}
                                inputProps={{ maxLength: 200 }}
                            />
                            {showValidation && assessingMedicalComplication.includes('Others') && (!assessingMedicalComplicationOther || assessingMedicalComplicationOther.trim() === '') && (
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

                    {/* 7.5 Children with SAM referred to NRC */}
                    <Grid item xs={12}>
                        <label className={styles.label}>
                            {t('section75ChildrenSAMReferredNRC')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                            {t('multipleResponse')}
                        </Typography>
                        <FormGroup>
                            {childSamReferredNrcOptions.map((option) => (
                                <FormControlLabel
                                    key={option.key}
                                    control={
                                        <Checkbox 
                                            name="childSamReferredNrc" 
                                            value={option.value}
                                            checked={childSamReferredNrc.includes(option.value)}
                                            onChange={(e) => {
                                                const { checked, value } = e.target;
                                                if (/don't know/i.test(value)) {
                                                    if (checked) {
                                                        setChildSamReferredNrc([option.value]);
                                                        updateFormValue('childSamReferredNrc', option.value);
                                                    } else {
                                                        setChildSamReferredNrc([]);
                                                        updateFormValue('childSamReferredNrc', '');
                                                    }
                                                } else {
                                                    let updated = childSamReferredNrc ? [...childSamReferredNrc] : [];
                                                    if (checked) {
                                                        updated = updated.filter((v) => !/don't know/i.test(v));
                                                        updated.push(value);
                                                    } else {
                                                        updated = updated.filter((v) => v !== value);
                                                    }
                                                    setChildSamReferredNrc(updated);
                                                    updateFormValue('childSamReferredNrc', updated.join(', '));
                                                }
                                            }}
                                        />
                                    }
                                    label={t(option.key)}
                                />
                            ))}
                        </FormGroup>
                        {shouldShowError('childSamReferredNrc') && (
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

                    {/* Conditional "Others" field for 7.5 */}
                    {childSamReferredNrc.includes('Others') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="childSamReferredNrcOther">
                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                className={styles.formInput}
                                name="childSamReferredNrcOther"
                                id="childSamReferredNrcOther"
                                value={childSamReferredNrcOther}
                                onChange={(e) => setChildSamReferredNrcOther(e.target.value)}
                                placeholder={t('pleaseSpecifyOtherReferralCriteria')}
                                inputProps={{ maxLength: 200 }}
                            />
                            {showValidation && childSamReferredNrc.includes('Others') && (!childSamReferredNrcOther || childSamReferredNrcOther.trim() === '') && (
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

                    {/* 7.6 Medicine/supplements given at community level */}
                    <Grid item xs={12}>
                        <label className={styles.label}>
                            {t('section76MedicinesGivenCommunityLevel')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                            {t('multipleResponse')}
                        </Typography>
                        <FormGroup>
                            {medicinesGivenCommunityLevelOptions.map((option) => (
                                <FormControlLabel
                                    key={option.key}
                                    control={
                                        <Checkbox 
                                            name="medicinesGivenCommunityLevel" 
                                            value={option.value}
                                            checked={medicinesGivenCommunityLevel.includes(option.value)}
                                            onChange={(e) => {
                                                const { checked, value } = e.target;
                                                if (/don't know/i.test(value)) {
                                                    if (checked) {
                                                        setMedicinesGivenCommunityLevel([option.value]);
                                                        updateFormValue('medicinesGivenCommunityLevel', option.value);
                                                    } else {
                                                        setMedicinesGivenCommunityLevel([]);
                                                        updateFormValue('medicinesGivenCommunityLevel', '');
                                                    }
                                                } else {
                                                    let updated = medicinesGivenCommunityLevel ? [...medicinesGivenCommunityLevel] : [];
                                                    if (checked) {
                                                        updated = updated.filter((v) => !/don't know/i.test(v));
                                                        updated.push(value);
                                                    } else {
                                                        updated = updated.filter((v) => v !== value);
                                                    }
                                                    setMedicinesGivenCommunityLevel(updated);
                                                    updateFormValue('medicinesGivenCommunityLevel', updated.join(', '));
                                                }
                                            }}
                                        />
                                    }
                                    label={t(option.key)}
                                />
                            ))}
                        </FormGroup>
                        {shouldShowError('medicinesGivenCommunityLevel') && (
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

                    {/* Conditional "Others" field for 7.6 */}
                    {medicinesGivenCommunityLevel.includes('Others') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="medicinesGivenCommunityLevelOther">
                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                className={styles.formInput}
                                name="medicinesGivenCommunityLevelOther"
                                id="medicinesGivenCommunityLevelOther"
                                value={medicinesGivenCommunityLevelOther}
                                onChange={(e) => setMedicinesGivenCommunityLevelOther(e.target.value)}
                                placeholder={t('pleaseSpecifyOtherMedicineSupplementSection7')}
                                inputProps={{ maxLength: 500 }}
                            />
                            {showValidation && medicinesGivenCommunityLevel.includes('Others') && (!medicinesGivenCommunityLevelOther || medicinesGivenCommunityLevelOther.trim() === '') && (
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
                        name="confirmChildSam"
                        value={confirmChildSam}
                    />

                    <input
                        type="hidden"
                        name="assessingMedicalComplication"
                        value={(() => {
                            let finalOptions = [...assessingMedicalComplication];
                            if (assessingMedicalComplication.includes('Others') && assessingMedicalComplicationOther.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'Others');
                                finalOptions.push(`Others - ${assessingMedicalComplicationOther.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />

                    <input
                        type="hidden"
                        name="childSamReferredNrc"
                        value={(() => {
                            let finalOptions = [...childSamReferredNrc];
                            if (childSamReferredNrc.includes('Others') && childSamReferredNrcOther.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'Others');
                                finalOptions.push(`Others - ${childSamReferredNrcOther.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />

                    <input
                        type="hidden"
                        name="medicinesGivenCommunityLevel"
                        value={(() => {
                            let finalOptions = [...medicinesGivenCommunityLevel];
                            if (medicinesGivenCommunityLevel.includes('Others') && medicinesGivenCommunityLevelOther.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'Others');
                                finalOptions.push(`Others - ${medicinesGivenCommunityLevelOther.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />
                </Grid>
            </StyledDetails>
        </div>
    )
});

export default ANMCHOKnowledgeAssessmentSection
