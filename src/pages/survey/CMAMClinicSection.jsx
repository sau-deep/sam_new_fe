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
} from "@mui/material";
import { useTranslation } from "react-i18next";
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

const CMAMClinicSection = React.forwardRef((props, ref) => {
    const { t } = useTranslation();
    
    const initialValues = {
        vhsndVisitDay: '',
        physicalExamSam: '',
        testConductedSam: [],
        testConductedSamOther: '',
        vhsndMedicalComplication: '',
        vhsndAppetiteTestConducted: '',
        childReferralNrc: '',
        motherAgreeNrc: '',
        motherNotAgreeReason: [],
        motherNotAgreeReasonOther: '',
        childEnrolledCmam: '',
        vhsndAmoxycillin: '',
        vhsndFolicAcidTablet: '',
        vhsndAlbendazole: '',
        vhsndIfaSyrup: '',
        vhsndVitA: '',
        vhsndMultivitaminSyrup: '',
        vhsndZinc: '',
        vhsndOrs: '',
        vhsndPcm: '',
        firstDoseAmoxicillin: '',
        motherAmoxicillin: '',
        motherAmoxicillinCounselled: '',
        childFolic: '',
        albendazoleGuidelines: '',
        vitAEnrolement: '',
        firstDoseMultivit: '',
        motherMultivitamin: '',
        motherCounsel: '',
        motherThr: '',
        childDischargedCmam: '',
        motherGivenMessageOther: '',
        counsellingAidsOther: '',
        childReassessedFollowUp: '',
        cmamTrainingReceived: '',
        confirmSamChild: '',
        assessMedicalComplication: '',
        referralCriteria: '',
        medicineSupplements: ''
    }

    // Define arrays with translation keys
    const physicalExamOptions = [
        'yesNewSAMChild',
        'yesSAMChildAlreadyOnTreatment',
        'no',
        'noSAMChildIdentifiedDuringMonth',
        'noSAMChildUndergoingTreatment'
    ];

    const testsOptions = [
        'askedHistoryIllnessSymptoms',
        'askedChildEatingFood',
        'heartRate',
        'temperature',
        'checkedSignsAnemia',
        'haemoglobinTest',
        'respiratoryRate',
        'chestIndrawing',
        'dehydration',
        'oedema',
        'others'
    ];

    const notAgreeReasons = [
        'careOfSiblings',
        'lossOfLivelihood',
        'notAllowedByFamily',
        'nrcFarFromHome',
        'transportSupportNotAvailable',
        'others'
    ];

    const counsellingMessages = [
        'breastfeeding',
        'continuingBreastfeedingBelowTwoYears',
        'complementaryFeeding',
        'feedingTHRAtHome',
        'augmentationHomeFoods',
        'importantMessagesAugmentedTHR',
        'expectedWeightGain',
        'needRegularFollowUpGrowthMonitoring',
        'careOfSickChild',
        'feedingDifficultSituations',
        'roleNutritionLifeCycle',
        'nutritionDuringAdolescencePregnancyLactation',
        'relationshipFamilySizeMalnutrition',
        'sanitationHygienePractices',
        'notCouncel',
        'others'
    ];

    const counsellingAidsOptions = [
        'mcpCard',
        'cmamBookResources',
        'individualGrowthChart',
        'communityGrowthChart',
        'ilaModuleTakeAway',
        'poshanTrackerAppResources',
        'otherTechEnabledResource',
        'nothing',
        'others'
    ];

    // State management for checkbox groups and "Others" options
    const [testConductedSam, setTestConductedSam] = useState([]);
    const [testConductedSamOther, setTestConductedSamOther] = useState('');
    const [motherNotAgreeReason, setMotherNotAgreeReason] = useState([]);
    const [motherNotAgreeReasonOther, setMotherNotAgreeReasonOther] = useState('');
    const [motherGivenMessage, setMotherGivenMessage] = useState([]);
    const [motherGivenMessageOther, setMotherGivenMessageOther] = useState('');
    const [counsellingAids, setCounsellingAids] = useState([]);
    const [counsellingAidsOther, setCounsellingAidsOther] = useState('');
    // Add state for physicalExamSam
    const [physicalExamSam, setPhysicalExamSam] = useState('');
    // Add state for 6.6 and 6.7
    const [childReferralNrc, setChildReferralNrc] = useState('');
    const [motherAgreeNrc, setMotherAgreeNrc] = useState('');
    // Add state for childEnrolledCmam
    const [childEnrolledCmam, setChildEnrolledCmam] = useState('');
    
    // State to track if validation should be shown (only after submit attempt)
    const [showValidation, setShowValidation] = useState(false);
    
    // State to track form field values for validation
    const [formValues, setFormValues] = useState({
        vhsndVisitDay: '',
        physicalExamSam: '',
        vhsndMedicalComplication: '',
        vhsndAppetiteTestConducted: '',
        childReferralNrc: '',
        motherAgreeNrc: '',
        childEnrolledCmam: '',
        vhsndAmoxycillin: '',
        vhsndFolicAcidTablet: '',
        vhsndAlbendazole: '',
        vhsndIfaSyrup: '',
        vhsndVitA: '',
        vhsndMultivitaminSyrup: '',
        vhsndZinc: '',
        vhsndOrs: '',
        vhsndPcm: '',
        firstDoseAmoxicillin: '',
        motherAmoxicillin: '',
        motherAmoxicillinCounselled: '',
        childFolic: '',
        albendazoleGuidelines: '',
        vitAEnrolement: '',
        firstDoseMultivit: '',
        motherMultivitamin: '',
        motherCounsel: '',
        motherThr: '',
        childDischargedCmam: '',
        testConductedSamOther: '',
        motherNotAgreeReasonOther: '',
        motherGivenMessageOther: '',
        counsellingAidsOther: '',
        // Add missing fields for medicine administration
        firstDoseAmoxicillin: '',
        motherAmoxicillin: '',
        motherAmoxicillinCounselled: '',
        childFolic: '',
        albendazoleGuidelines: '',
        vitAEnrolement: '',
        firstDoseMultivit: '',
        motherMultivitamin: '',
        motherCounsel: '',
        motherThr: ''
    });
    
    // Function to trigger validation display (called from parent on submit)
    const triggerValidation = () => {
        setShowValidation(true);
        
        // Always required fields (always visible)
        const alwaysRequiredFields = [
            'vhsndVisitDay', 'physicalExamSam', 'childDischargedCmam'
        ];
        
        // Find first invalid field from always required fields
        let firstInvalidField = null;
        for (const field of alwaysRequiredFields) {
            if (!formValues[field] || formValues[field].trim() === '') {
                firstInvalidField = field;
                break;
            }
        }
        
        // If we found an error in always required fields, return early
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
        
        // Check conditional fields based on physicalExamSam
        if (formValues.physicalExamSam && !['no', 'noSAMChildIdentifiedDuringMonth', 'noSAMChildUndergoingTreatment'].includes(formValues.physicalExamSam)) {
            // SAM child is present - check SAM-related fields
            const samRequiredFields = [
                'testConductedSam', 'vhsndMedicalComplication', 'vhsndAppetiteTestConducted', 
                'childReferralNrc', 'childEnrolledCmam'
            ];
            
            for (const field of samRequiredFields) {
                if (field === 'testConductedSam') {
                    // Special handling for checkbox array
                    if (!testConductedSam || testConductedSam.length === 0) {
                        firstInvalidField = field;
                        break;
                    }
                } else if (!formValues[field] || formValues[field].trim() === '') {
                    firstInvalidField = field;
                    break;
                }
            }
            
            // Check if childReferralNrc is Yes, then motherAgreeNrc is required
            if (!firstInvalidField && formValues.childReferralNrc === 'Yes' && (!formValues.motherAgreeNrc || formValues.motherAgreeNrc.trim() === '')) {
                firstInvalidField = 'motherAgreeNrc';
            }
            
            // NOTE: Medicine availability (6.10.x) is validated unconditionally below.
            
            // Check medicine administration fields - only if child is enrolled in CMAM
            if (!firstInvalidField && formValues.childEnrolledCmam === 'Yes') {
                const medicineAdminFields = [
                    'firstDoseAmoxicillin', 'motherAmoxicillin', 'motherAmoxicillinCounselled',
                    'childFolic', 'albendazoleGuidelines', 'vitAEnrolement', 
                    'firstDoseMultivit', 'motherMultivitamin', 'motherCounsel', 'motherThr'
                ];
                
                for (const field of medicineAdminFields) {
                    if (!formValues[field] || formValues[field].trim() === '') {
                        firstInvalidField = field;
                        break;
                    }
                }
                
                // Check checkbox fields for CMAM enrolled children
                if (!firstInvalidField && (!motherGivenMessage || motherGivenMessage.length === 0)) {
                    firstInvalidField = 'motherGivenMessage';
                }
                
                if (!firstInvalidField && (!counsellingAids || counsellingAids.length === 0)) {
                    firstInvalidField = 'counsellingAids';
                }
            }
            
            // Check "Others" text fields if they are required
            if (!firstInvalidField && testConductedSam && testConductedSam.includes('others') && 
                (!formValues.testConductedSamOther || formValues.testConductedSamOther.trim() === '')) {
                firstInvalidField = 'testConductedSamOther';
            }
            
            if (!firstInvalidField && formValues.childReferralNrc === 'Yes' && formValues.motherAgreeNrc === 'No' && 
                motherNotAgreeReason && motherNotAgreeReason.includes('others') && 
                (!formValues.motherNotAgreeReasonOther || formValues.motherNotAgreeReasonOther.trim() === '')) {
                firstInvalidField = 'motherNotAgreeReasonOther';
            }
            
            if (!firstInvalidField && formValues.childEnrolledCmam === 'Yes' && 
                motherGivenMessage && motherGivenMessage.includes('others') && 
                (!formValues.motherGivenMessageOther || formValues.motherGivenMessageOther.trim() === '')) {
                firstInvalidField = 'motherGivenMessageOther';
            }
            
            if (!firstInvalidField && formValues.childEnrolledCmam === 'Yes' && 
                counsellingAids && counsellingAids.includes('others') && 
                (!formValues.counsellingAidsOther || formValues.counsellingAidsOther.trim() === '')) {
                firstInvalidField = 'counsellingAidsOther';
            }
        }

        // 6.10.x: Medicine availability fields - always required for VHSND submissions
        if (!firstInvalidField) {
            const medicineFields = [
                'vhsndAmoxycillin', 'vhsndFolicAcidTablet', 'vhsndAlbendazole',
                'vhsndIfaSyrup', 'vhsndVitA', 'vhsndMultivitaminSyrup',
                'vhsndZinc', 'vhsndOrs', 'vhsndPcm'
            ];

            for (const field of medicineFields) {
                if (!formValues[field] || formValues[field].trim() === '') {
                    firstInvalidField = field;
                    break;
                }
            }
        }
        
        // Note: Section 7 fields (ANM/CHO Knowledge Assessment) are validated in a separate component
        
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
        
        // Always required fields (always visible)
        if (['vhsndVisitDay', 'physicalExamSam', 'childDischargedCmam'].includes(fieldName)) {
            return !formValues[fieldName] || formValues[fieldName] === '';
        }
        
        // SAM child related fields - only show if SAM child is present
        if (['testConductedSam', 'vhsndMedicalComplication', 'vhsndAppetiteTestConducted', 'childReferralNrc', 'childEnrolledCmam'].includes(fieldName)) {
            if (fieldName === 'testConductedSam') {
                return (formValues.physicalExamSam && 
                       !['no', 'noSAMChildIdentifiedDuringMonth', 'noSAMChildUndergoingTreatment'].includes(formValues.physicalExamSam)) && 
                       (!testConductedSam || testConductedSam.length === 0);
            }
            return (formValues.physicalExamSam && 
                   !['no', 'noSAMChildIdentifiedDuringMonth', 'noSAMChildUndergoingTreatment'].includes(formValues.physicalExamSam)) && 
                   (!formValues[fieldName] || formValues[fieldName] === '');
        }
        
        // Mother agree NRC - only show if child was referred to NRC
        if (fieldName === 'motherAgreeNrc') {
            return (formValues.childReferralNrc === 'Yes') && 
                   (!formValues[fieldName] || formValues[fieldName] === '');
        }
        
        // Medicine availability fields (6.10.x) - always required for VHSND submissions
        if (['vhsndAmoxycillin', 'vhsndFolicAcidTablet', 'vhsndAlbendazole', 'vhsndIfaSyrup', 'vhsndVitA', 'vhsndMultivitaminSyrup', 'vhsndZinc', 'vhsndOrs', 'vhsndPcm'].includes(fieldName)) {
            return (!formValues[fieldName] || formValues[fieldName] === '');
        }
        
        // Medicine administration fields - only show if child is enrolled in CMAM
        if (['firstDoseAmoxicillin', 'motherAmoxicillin', 'motherAmoxicillinCounselled', 'childFolic', 'albendazoleGuidelines', 'vitAEnrolement', 'firstDoseMultivit', 'motherMultivitamin', 'motherCounsel', 'motherThr'].includes(fieldName)) {
            return (formValues.childEnrolledCmam === 'Yes') && 
                   (!formValues[fieldName] || formValues[fieldName] === '');
        }
        
        // Checkbox fields for CMAM enrolled children
        if (fieldName === 'motherGivenMessage') {
            return (formValues.childEnrolledCmam === 'Yes') && 
                   (!motherGivenMessage || motherGivenMessage.length === 0);
        }
        
        if (fieldName === 'counsellingAids') {
            return (formValues.childEnrolledCmam === 'Yes') && 
                   (!counsellingAids || counsellingAids.length === 0);
        }
        
        // Note: Section 7 fields are validated in ANM/CHO Knowledge Assessment component
        
        // Other text fields - conditional validation
        if (fieldName === 'testConductedSamOther') {
            return (testConductedSam && testConductedSam.includes('others')) && 
                   (!formValues[fieldName] || formValues[fieldName] === '');
        }
        
        if (fieldName === 'motherNotAgreeReasonOther') {
            return (motherNotAgreeReason && motherNotAgreeReason.includes('others')) && 
                   (!formValues[fieldName] || formValues[fieldName] === '');
        }
        
        if (fieldName === 'motherGivenMessageOther') {
            return (motherGivenMessage && motherGivenMessage.includes('others')) && 
                   (!formValues[fieldName] || formValues[fieldName] === '');
        }
        
        if (fieldName === 'counsellingAidsOther') {
            return (counsellingAids && counsellingAids.includes('others')) && 
                   (!formValues[fieldName] || formValues[fieldName] === '');
        }
        
        // Default case - no error for fields not in validation logic
        return false;
    };
    
    // Helper function to update form values
    const updateFormValue = (fieldName, value) => {
        setFormValues(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    return (
        <div id="cmamClinicForm">
            <StyledDetails open>
                <summary>&nbsp;{t('section6VHSNDCMAMClinic')}</summary>
                <Grid container rowSpacing={3} columnSpacing={2} sx={{
                    margin: '0',
                    width: '100%'
                }}>
                    {/* 6.1 Is it the day of VHSND? */}
                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="vhsndVisitDay">
                            {t('section61VHSNDDay')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            name="vhsndVisitDay"
                            value={formValues.vhsndVisitDay}
                            onChange={(e) => updateFormValue('vhsndVisitDay', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('vhsndVisitDay') && (
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

                    {/* 6.2 Physical examination */}
                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="physicalExamSam">
                            {t('section62PhysicalExamination')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                            {t('newSAMPreferenceNote')}
                        </Typography>
                        <RadioGroup
                            name="physicalExamSam"
                            value={formValues.physicalExamSam}
                            onChange={e => {
                                const value = e.target.value;
                                setPhysicalExamSam(value);
                                updateFormValue('physicalExamSam', value);
                            }}
                        >
                            {physicalExamOptions.map((optionKey) => (
                                <FormControlLabel
                                    key={optionKey}
                                    value={optionKey}
                                    control={<Radio />}
                                    label={t(optionKey)}
                                />
                            ))}
                        </RadioGroup>
                        {shouldShowError('physicalExamSam') && (
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

                    {/* 6.3 to 6.9: Conditionally render based on physicalExamSam */}
                    {!['no', 'noSAMChildIdentifiedDuringMonth', 'noSAMChildUndergoingTreatment'].includes(formValues.physicalExamSam) && (
                        <>
                            {/* 6.3 Tests conducted */}
                            <Grid item xs={12}>
                                <label className={styles.label}>
                                    {t('section63ExaminationsTests')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                    {t('multipleResponse')}
                                </Typography>
                                <FormGroup>
                                    {testsOptions.map((testKey) => (
                                        <FormControlLabel
                                            key={testKey}
                                            control={
                                                <Checkbox 
                                                    name="testConductedSam" 
                                                    value={testKey}
                                                    checked={testConductedSam.includes(testKey)}
                                                    onChange={(e) => {
                                                        const { checked, value } = e.target;
                                                        if (checked) {
                                                            setTestConductedSam([...testConductedSam, value]);
                                                        } else {
                                                            setTestConductedSam(testConductedSam.filter(item => item !== value));
                                                        }
                                                    }}
                                                />
                                            }
                                            label={t(testKey)}
                                        />
                                    ))}
                                </FormGroup>
                            </Grid>

                            {/* Conditional "Others" field for 6.3 */}
                            {testConductedSam.includes('others') && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="testConductedSamOther">
                                        {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <TextField
                                        size="small"
                                        className={styles.formInput}
                                        name="testConductedSamOther"
                                        id="testConductedSamOther"
                                        value={formValues.testConductedSamOther}
                                        onChange={(e) => updateFormValue('testConductedSamOther', e.target.value)}
                                        placeholder={t('pleaseSpecifyOtherTest')}
                                    />
                                    {shouldShowError('testConductedSamOther') && (
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

                            {/* 6.4 Medical complication */}
                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="vhsndMedicalComplication">
                                    {t('section64MedicalComplication')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup
                                    name="vhsndMedicalComplication"
                                    value={formValues.vhsndMedicalComplication}
                                    onChange={(e) => updateFormValue('vhsndMedicalComplication', e.target.value)}
                                >
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                </RadioGroup>
                                {shouldShowError('vhsndMedicalComplication') && (
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

                            {/* 6.5 Appetite test */}
                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="vhsndAppetiteTestConducted">
                                    {t('section65AppetiteTest')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup
                                    name="vhsndAppetiteTestConducted"
                                    value={formValues.vhsndAppetiteTestConducted}
                                    onChange={(e) => updateFormValue('vhsndAppetiteTestConducted', e.target.value)}
                                >
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                </RadioGroup>
                                {shouldShowError('vhsndAppetiteTestConducted') && (
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

                            {/* 6.6 Child referral to NRC */}
                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="childReferralNrc">
                                    {t('section66ChildReferralNRC')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup
                                    name="childReferralNrc"
                                    value={formValues.childReferralNrc}
                                    onChange={e => {
                                        const value = e.target.value;
                                        setChildReferralNrc(value);
                                        updateFormValue('childReferralNrc', value);
                                        // Reset dependent state if needed
                                        if (value !== 'Yes') {
                                            setMotherAgreeNrc('');
                                            updateFormValue('motherAgreeNrc', '');
                                        }
                                    }}
                                >
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                </RadioGroup>
                                {shouldShowError('childReferralNrc') && (
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

                            {/* 6.7 Mother agree to take child to NRC (only if 6.6 is Yes) */}
                            {formValues.childReferralNrc === 'Yes' && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="motherAgreeNrc">
                                        {t('section67MotherAgreeNRC')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup
                                        name="motherAgreeNrc"
                                        value={formValues.motherAgreeNrc}
                                        onChange={e => {
                                            const value = e.target.value;
                                            setMotherAgreeNrc(value);
                                            updateFormValue('motherAgreeNrc', value);
                                        }}
                                    >
                                        <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                        <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                    </RadioGroup>
                                    {shouldShowError('motherAgreeNrc') && (
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

                            {/* 6.8 Reason for not agreeing (only if 6.6 is Yes and 6.7 is No) */}
                            {formValues.childReferralNrc === 'Yes' && formValues.motherAgreeNrc === 'No' && (
                                <Grid item xs={12}>
                                    <label className={styles.label}>
                                        {t('section68ReasonNotAgreeing')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <FormGroup>
                                        {notAgreeReasons.map((reasonKey) => (
                                            <FormControlLabel
                                                key={reasonKey}
                                                control={
                                                    <Checkbox 
                                                        name="motherNotAgreeReason" 
                                                        value={reasonKey}
                                                        checked={motherNotAgreeReason.includes(reasonKey)}
                                                        onChange={(e) => {
                                                            const { checked, value } = e.target;
                                                            if (checked) {
                                                                setMotherNotAgreeReason([...motherNotAgreeReason, value]);
                                                            } else {
                                                                setMotherNotAgreeReason(motherNotAgreeReason.filter(item => item !== value));
                                                            }
                                                        }}
                                                    />
                                                }
                                                label={t(reasonKey)}
                                            />
                                        ))}
                                    </FormGroup>
                                </Grid>
                            )}

                            {/* Conditional "Others" field for 6.8 (only if 6.8 is shown) */}
                            {formValues.childReferralNrc === 'Yes' && formValues.motherAgreeNrc === 'No' && formValues.motherNotAgreeReason && formValues.motherNotAgreeReason.includes('others') && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="motherNotAgreeReasonOther">
                                        {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <TextField
                                        size="small"
                                        className={styles.formInput}
                                        name="motherNotAgreeReasonOther"
                                        id="motherNotAgreeReasonOther"
                                        value={formValues.motherNotAgreeReasonOther}
                                        onChange={(e) => updateFormValue('motherNotAgreeReasonOther', e.target.value)}
                                        placeholder={t('pleaseSpecifyOtherReasons')}
                                    />
                                    {shouldShowError('motherNotAgreeReasonOther') && (
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

                            {/* 6.9 Child enrolled under CMAM */}
                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="childEnrolledCmam">
                                    {t('section69ChildEnrolledCMAM')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup
                                    name="childEnrolledCmam"
                                    value={formValues.childEnrolledCmam}
                                    onChange={e => {
                                        const value = e.target.value;
                                        setChildEnrolledCmam(value);
                                        updateFormValue('childEnrolledCmam', value);
                                    }}
                                >
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                </RadioGroup>
                                {shouldShowError('childEnrolledCmam') && (
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

                            {/* Medicine availability section */}
                            <Grid item xs={12}>
                                <Typography variant="h6" sx={{fontWeight: 'bold', mb: 2, mt: 3, color: '#1976d2'}}>
                                    {t('medicineAvailability')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2, color: '#666' }}>
                                    {t('medicineSupplementsAvailableVHSND')}
                                </Typography>
                            </Grid>

                            {[
                                { field: 'vhsndAmoxycillin', label: 'section61001AmoxycillinSyrup' },
                                { field: 'vhsndFolicAcidTablet', label: 'section61002FolicAcidTablet' },
                                { field: 'vhsndAlbendazole', label: 'section61003AlbendazoleTablet' },
                                { field: 'vhsndIfaSyrup', label: 'section61004IFASyrup' },
                                { field: 'vhsndVitA', label: 'section61005VitaminA' },
                                { field: 'vhsndMultivitaminSyrup', label: 'section61006MultivitaminSyrup' },
                                { field: 'vhsndZinc', label: 'section61007Zinc' },
                                { field: 'vhsndOrs', label: 'section61008ORS' },
                                { field: 'vhsndPcm', label: 'section61009Paracetamol' }
                            ].map(({ field, label }) => (
                                <Grid item xs={12} sm={6} key={field}>
                                    <label className={styles.label} htmlFor={field}>
                                        {t(label)} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup
                                        name={field}
                                        value={formValues[field]}
                                        onChange={(e) => updateFormValue(field, e.target.value)}
                                    >
                                        <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                        <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                    </RadioGroup>
                                    {shouldShowError(field) && (
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
                            ))}


                    {/* 6.11 to 6.22: Conditionally render if childEnrolledCmam === 'Yes' */}
                    {formValues.childEnrolledCmam === 'Yes' && (
                        <>

                            {/* Medicine administration questions */}
                            <Grid item xs={12}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 3, color: '#1976d2' }}>
                                    {t('medicineAdministration')}
                                </Typography>
                            </Grid>

                            {[
                                { field: 'firstDoseAmoxicillin', label: 'section611FirstDoseAmoxicillin' },
                                { field: 'motherAmoxicillin', label: 'section612MotherProvidedAmoxicillin' },
                                { field: 'motherAmoxicillinCounselled', label: 'section613MotherCounselledAmoxicillin' }
                            ].map(({ field, label }) => (
                                <Grid item xs={12} key={field}>
                                    <label className={styles.label} htmlFor={field}>
                                        {t(label)} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup
                                        name={field}
                                        value={formValues[field]}
                                        onChange={(e) => updateFormValue(field, e.target.value)}
                                    >
                                        <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                        <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                    </RadioGroup>
                                    {shouldShowError(field) && (
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
                            ))}

                            {/* Questions 6.14-6.18 with "Not applicable as per the state protocol" option */}
                            {[
                                { field: 'childFolic', label: 'section614ChildGivenFolicAcid' },
                                { field: 'albendazoleGuidelines', label: 'section615ChildGivenAlbendazole' },
                                { field: 'vitAEnrolement', label: 'section616ChildGivenVitaminA' },
                                { field: 'firstDoseMultivit', label: 'section617ChildGivenFirstDoseMultivitamin' },
                                { field: 'motherMultivitamin', label: 'section618MotherGivenMultivitamin' }
                            ].map(({ field, label }) => (
                                <Grid item xs={12} key={field}>
                                    <label className={styles.label} htmlFor={field}>
                                        {t(label)} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup
                                        name={field}
                                        value={formValues[field]}
                                        onChange={(e) => updateFormValue(field, e.target.value)}
                                    >
                                        <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                        <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                        <FormControlLabel value="Not applicable as per the state protocol" control={<Radio />} label={t('notApplicableAsPerStateProtocol')} />
                                    </RadioGroup>
                                    {shouldShowError(field) && (
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
                            ))}

                            {/* Remaining questions with Yes/No options */}
                            {[
                                { field: 'motherCounsel', label: 'section619MotherCounselledMultivitamin' }
                            ].map(({ field, label }) => (
                                <Grid item xs={12} key={field}>
                                    <label className={styles.label} htmlFor={field}>
                                        {t(label)} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup
                                        name={field}
                                        value={formValues[field]}
                                        onChange={(e) => updateFormValue(field, e.target.value)}
                                    >
                                        <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                        <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                    </RadioGroup>
                                    {shouldShowError(field) && (
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
                            ))}

                            {/* 6.20 Mother provided with THR */}
                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="motherThr">
                                    {t('section620MotherProvidedTHR')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup
                                    name="motherThr"
                                    value={formValues.motherThr}
                                    onChange={(e) => updateFormValue('motherThr', e.target.value)}
                                >
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                    <FormControlLabel value="THR / food not available" control={<Radio />} label={t('thrFoodNotAvailable')} />
                                </RadioGroup>
                                {shouldShowError('motherThr') && (
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

                            {/* 6.21 Messages given to mother */}
                            <Grid item xs={12}>
                                <label className={styles.label}>
                                    {t('section621MessagesGivenMother')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                    {t('multipleResponse')}
                                </Typography>
                                <FormGroup>
                                    {counsellingMessages.map((messageKey) => (
                                        <FormControlLabel
                                            key={messageKey}
                                            control={
                                                <Checkbox 
                                                    name="motherGivenMessage" 
                                                    value={messageKey}
                                                    checked={motherGivenMessage.includes(messageKey)}
                                                    onChange={(e) => {
                                                        const { checked, value } = e.target;
                                                        if (value === 'notCouncel') {
                                                            if (checked) {
                                                                setMotherGivenMessage(['notCouncel']);
                                                            } else {
                                                                setMotherGivenMessage([]);
                                                            }
                                                        } else {
                                                            let updated = motherGivenMessage ? [...motherGivenMessage] : [];
                                                            if (checked) {
                                                                updated = updated.filter((v) => v !== 'notCouncel');
                                                                updated.push(value);
                                                            } else {
                                                                updated = updated.filter((v) => v !== value);
                                                            }
                                                            setMotherGivenMessage(updated);
                                                        }
                                                    }}
                                                />
                                            }
                                            label={t(messageKey)}
                                        />
                                    ))}
                                </FormGroup>
                                {shouldShowError('motherGivenMessage') && (
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

                            {/* Conditional "Others" field for 6.21 */}
                            {formValues.motherGivenMessage && formValues.motherGivenMessage.includes('others') && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="motherGivenMessageOther">
                                        {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <TextField
                                        size="small"
                                        className={styles.formInput}
                                        name="motherGivenMessageOther"
                                        id="motherGivenMessageOther"
                                        value={formValues.motherGivenMessageOther}
                                        onChange={(e) => updateFormValue('motherGivenMessageOther', e.target.value)}
                                        placeholder={t('pleaseSpecifyOtherMessage')}
                                    />
                                    {shouldShowError('motherGivenMessageOther') && (
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

                            {/* 6.22 Counselling aids */}
                            <Grid item xs={12}>
                                <label className={styles.label}>
                                    {t('section623CounsellingAids')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                    {t('multipleResponse')}
                                </Typography>
                                <FormGroup>
                                    {counsellingAidsOptions.map((aidKey) => (
                                        <FormControlLabel
                                            key={aidKey}
                                            control={
                                                <Checkbox 
                                                    name="counsellingAids" 
                                                    value={aidKey}
                                                    checked={counsellingAids.includes(aidKey)}
                                                    onChange={(e) => {
                                                        const { checked, value } = e.target;
                                                        if (value === 'nothing') {
                                                            if (checked) {
                                                                setCounsellingAids(['nothing']);
                                                            } else {
                                                                setCounsellingAids([]);
                                                            }
                                                        } else {
                                                            let updated = counsellingAids ? [...counsellingAids] : [];
                                                            if (checked) {
                                                                updated = updated.filter((v) => v !== 'nothing');
                                                                updated.push(value);
                                                            } else {
                                                                updated = updated.filter((v) => v !== value);
                                                            }
                                                            setCounsellingAids(updated);
                                                        }
                                                    }}
                                                />
                                            }
                                            label={t(aidKey)}
                                        />
                                    ))}
                                </FormGroup>
                                {shouldShowError('counsellingAids') && (
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

                            {/* Conditional "Others" field for 6.22 */}
                            {formValues.counsellingAids && formValues.counsellingAids.includes('others') && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="counsellingAidsOther">
                                        {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <TextField
                                        size="small"
                                        className={styles.formInput}
                                        name="counsellingAidsOther"
                                        id="counsellingAidsOther"
                                        value={formValues.counsellingAidsOther}
                                        onChange={(e) => updateFormValue('counsellingAidsOther', e.target.value)}
                                        placeholder={t('pleaseSpecifyOtherCounsellingAid')}
                                        inputProps={{ maxLength: 500 }}
                                    />
                                    {shouldShowError('counsellingAidsOther') && (
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

                    {/* 6.23 Child discharged from CMAM */}
                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="childDischargedCmam">
                            {t('section622ChildDischargedCMAM')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            name="childDischargedCmam"
                            value={formValues.childDischargedCmam}
                            onChange={(e) => updateFormValue('childDischargedCmam', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                            <FormControlLabel value="Not applicable as per state guidelines" control={<Radio />} label={t('notApplicableAsPerStateGuidelines')} />
                        </RadioGroup>
                        {shouldShowError('childDischargedCmam') && (
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

                    {/* Hidden inputs to combine selected options with "Others" text for form submission */}
                    <input
                        type="hidden"
                        name="testConductedSam"
                        value={(() => {
                            let finalOptions = [...testConductedSam];
                            if (testConductedSam.includes('others') && testConductedSamOther.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'others');
                                finalOptions.push(`Others - ${testConductedSamOther.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />

                    <input
                        type="hidden"
                        name="motherNotAgreeReason"
                        value={(() => {
                            let finalOptions = [...motherNotAgreeReason];
                            if (motherNotAgreeReason.includes('others') && motherNotAgreeReasonOther.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'others');
                                finalOptions.push(`Others - ${motherNotAgreeReasonOther.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />

                    <input
                        type="hidden"
                        name="motherGivenMessage"
                        value={(() => {
                            let finalOptions = [...motherGivenMessage];
                            if (motherGivenMessage.includes('others') && motherGivenMessageOther.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'others');
                                finalOptions.push(`Others - ${motherGivenMessageOther.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />

                    <input
                        type="hidden"
                        name="counsellingAids"
                        value={(() => {
                            let finalOptions = [...counsellingAids];
                            if (counsellingAids.includes('others') && counsellingAidsOther.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'others');
                                finalOptions.push(`Others - ${counsellingAidsOther.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />
                </Grid>
            </StyledDetails>
        </div>
    );
});

export default CMAMClinicSection;
