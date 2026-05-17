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

const EquipmentAvailabilityAWC = React.forwardRef((props, ref) => {
    const { t } = useTranslation();
    const [poshanTrackerUpdated, setPoshanTrackerUpdated] = useState('');
    const [reasonPoshanTrackerNotUpdated, setReasonPoshanTrackerNotUpdated] = useState([]);
    const [reasonPoshanTrackerNotUpdatedOther, setReasonPoshanTrackerNotUpdatedOther] = useState('');
    const [reasonPoshanTrackerNotUpdatedOtherError, setReasonPoshanTrackerNotUpdatedOtherError] = useState(false);
    
    // State to track if validation should be shown (only after submit attempt)
    const [showValidation, setShowValidation] = useState(false);
    
    // State to track form field values for validation
    const [formValues, setFormValues] = useState({
        weighingScale: '',
        salterScale: '',
        infantometer: '',
        stadiometer: '',
        supplementaryNutrition: '',
        registerAvailability: '',
        amoxycillinSyrup: '',
        folicAcidTablet: '',
        albendazole: '',
        vitA: '',
        ifaSyrup: '',
        multivitaminSyrup: '',
        zinc: '',
        ors: '',
        pcm: ''
    });
    
    const equipmentOptions = [
        { key: 'Available and Functional', label: t('availableAndFunctional') },
        { key: 'Available but not Functional', label: t('availableButNotFunctional') },
        { key: 'Not Available', label: t('notAvailable') }
    ];

    const nutritionOptions = [
        { key: 'Regular THR (Given to normal children too)', label: t('regularTHR') },
        { key: 'Augmented THR (Given to children with SAM/MAM/UW)', label: t('augmentedTHR') },
        { key: 'None of the above', label: t('noneOfTheAbove') }
    ];

    const registerOptions = [
        { key: 'Available', label: t('available') },
        { key: 'Not available', label: t('notAvailable') },
        { key: 'Not Applicable as per guidelines', label: t('notApplicableAsPerGuidelines') }
    ];

    const medicineOptions = [
        { key: 'Available at village level (AWW or ASHA)', label: t('availableAtVillageLevel') },
        { key: 'Only available with ANM and ANM brings them during VHSND', label: t('onlyAvailableWithANM') },
        { key: 'Not applicable as per state protocol', label: t('notApplicableAsPerStateProtocol') }
    ];

    const poshanTrackerReasons = [
        { key: 'Growth monitoring could not be completed for all children', label: t('growthMonitoringNotCompleted') },
        { key: 'Mobile device not functional', label: t('mobileDeviceNotFunctional') },
        { key: 'Unable to operate the mobile device / application', label: t('unableToOperateDevice') },
        { key: 'Connectivity issues', label: t('connectivityIssues') },
        { key: 'Others', label: t('others') }
    ];

    const medicineTypes = [
        { field: 'amoxycillinSyrup', label: t('amoxycillinSyrup') },
        { field: 'folicAcidTablet', label: t('folicAcidTablet') },
        { field: 'albendazole', label: t('albendazole') },
        { field: 'vitA', label: t('vitaminA') },
        { field: 'ifaSyrup', label: t('ifaSyrup') },
        { field: 'multivitaminSyrup', label: t('multivitaminSyrup') },
        { field: 'zinc', label: t('zinc') },
        { field: 'ors', label: t('oralRehydrationSalt') },
        { field: 'pcm', label: t('paracetamol') }
    ];
    
    // Function to trigger validation display (called from parent on submit)
    const triggerValidation = () => {
        setShowValidation(true);
        
        // Check all required fields using formValues state
        const requiredFields = [
            'weighingScale', 'salterScale', 'infantometer', 'stadiometer',
            'supplementaryNutrition', 'registerAvailability', 'poshanTrackerUpdated',
            'amoxycillinSyrup', 'folicAcidTablet', 'albendazole', 'vitA',
            'ifaSyrup', 'multivitaminSyrup', 'zinc', 'ors', 'pcm'
        ];
        
        // Find first invalid field
        let firstInvalidField = null;
        for (const field of requiredFields) {
            if (!formValues[field] || formValues[field].trim() === '') {
                firstInvalidField = field;
                break;
            }
        }
        
        // Check conditional field for poshanTrackerNotUpdated
        if (formValues.poshanTrackerUpdated === 'No') {
            const hasReasons = reasonPoshanTrackerNotUpdated.length > 0;
            const othersValid = !reasonPoshanTrackerNotUpdated.includes('Others') || 
                              (reasonPoshanTrackerNotUpdatedOther && reasonPoshanTrackerNotUpdatedOther.trim() !== '');
            
            if (!hasReasons || !othersValid) {
                // Scroll to reason section
                setTimeout(() => {
                    const reasonSection = document.querySelector('[name="reasonPoshanTrackerNotUpdated"]');
                    if (reasonSection) {
                        reasonSection.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center',
                            inline: 'nearest'
                        });
                        reasonSection.focus();
                    }
                }, 100);
                return false;
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
        <div id="equipmentAvailabilityForm">
            <StyledDetails open>
                <summary>&nbsp;{t('section3EquipmentAvailability')}</summary>
                <Grid container rowSpacing={3} columnSpacing={2} sx={{
                    margin: '0',
                    width: '100%'
                }}>
                    {/* Equipment Availability */}
                    <Grid item xs={12} sm={6}>
                        <label className={styles.label} htmlFor="weighingScale">
                            {t('section31DigitalWeighingScale')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Select
                            size="small"
                            className={styles.formInput}
                            name="weighingScale"
                            id="weighingScale"
                            value={formValues.weighingScale}
                            onChange={(e) => updateFormValue('weighingScale', e.target.value)}
                            error={shouldShowError('weighingScale')}
                        >
                            <MenuItem value="">{t('selectOption')}</MenuItem>
                            {equipmentOptions.map((option) => (
                                <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>
                            ))}
                        </Select>
                        {shouldShowError('weighingScale') && (
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
                        <label className={styles.label} htmlFor="salterScale">
                            {t('section32SalterScale')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Select
                            size="small"
                            className={styles.formInput}
                            name="salterScale"
                            id="salterScale"
                            value={formValues.salterScale}
                            onChange={(e) => updateFormValue('salterScale', e.target.value)}
                            error={shouldShowError('salterScale')}
                        >
                            <MenuItem value="">{t('selectOption')}</MenuItem>
                            {equipmentOptions.map((option) => (
                                <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>
                            ))}
                        </Select>
                        {shouldShowError('salterScale') && (
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
                        <label className={styles.label} htmlFor="infantometer">
                            {t('section33Infantometer')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Select
                            size="small"
                            className={styles.formInput}
                            name="infantometer"
                            id="infantometer"
                            value={formValues.infantometer}
                            onChange={(e) => updateFormValue('infantometer', e.target.value)}
                            error={shouldShowError('infantometer')}
                        >
                            <MenuItem value="">{t('selectOption')}</MenuItem>
                            {equipmentOptions.map((option) => (
                                <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>
                            ))}
                        </Select>
                        {shouldShowError('infantometer') && (
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
                        <label className={styles.label} htmlFor="stadiometer">
                            {t('section34Stadiometer')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Select
                            size="small"
                            className={styles.formInput}
                            name="stadiometer"
                            id="stadiometer"
                            value={formValues.stadiometer}
                            onChange={(e) => updateFormValue('stadiometer', e.target.value)}
                            error={shouldShowError('stadiometer')}
                        >
                            <MenuItem value="">{t('selectOption')}</MenuItem>
                            {equipmentOptions.map((option) => (
                                <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>
                            ))}
                        </Select>
                        {shouldShowError('stadiometer') && (
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
                        <label className={styles.label} htmlFor="supplementaryNutrition">
                            {t('section35SupplementaryNutrition')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            name="supplementaryNutrition"
                            value={formValues.supplementaryNutrition}
                            onChange={(e) => updateFormValue('supplementaryNutrition', e.target.value)}
                        >
                            {nutritionOptions.map((option) => (
                                <FormControlLabel
                                    key={option.key}
                                    value={option.key}
                                    control={<Radio />}
                                    label={option.label}
                                />
                            ))}
                        </RadioGroup>
                        {shouldShowError('supplementaryNutrition') && (
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
                        <label className={styles.label} htmlFor="registerAvailability">
                            {t('section36RegisterAvailability')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            name="registerAvailability"
                            value={formValues.registerAvailability}
                            onChange={(e) => updateFormValue('registerAvailability', e.target.value)}
                        >
                            {registerOptions.map((option) => (
                                <FormControlLabel
                                    key={option.key}
                                    value={option.key}
                                    control={<Radio />}
                                    label={option.label}
                                />
                            ))}
                        </RadioGroup>
                        {shouldShowError('registerAvailability') && (
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
                        <label className={styles.label} htmlFor="poshanTrackerUpdated">
                            {t('section37PoshanTrackerUpdated')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                            {t('checkFromMPRSection')}
                        </Typography>
                        <RadioGroup
                            name="poshanTrackerUpdated"
                            value={formValues.poshanTrackerUpdated}
                            onChange={(e) => {
                                const value = e.target.value;
                                updateFormValue('poshanTrackerUpdated', value);
                                setPoshanTrackerUpdated(value);
                                // If "Yes" is selected, clear all reasons and other field
                                if (value === 'Yes') {
                                    setReasonPoshanTrackerNotUpdated([]);
                                    setReasonPoshanTrackerNotUpdatedOther('');
                                    setReasonPoshanTrackerNotUpdatedOtherError(false);
                                }
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('poshanTrackerUpdated') && (
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

                    {/* Conditional Question 3.8 - appears when "No" is selected for 3.7 */}
                    {poshanTrackerUpdated === 'No' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="reasonPoshanTrackerNotUpdated">
                                {t('section38ReasonPoshanTrackerNotUpdated')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                {t('multipleResponsesAllowed')}
                            </Typography>
                            <FormGroup>
                                {poshanTrackerReasons.map((reason) => (
                                    <FormControlLabel
                                        key={reason.key}
                                        control={
                                            <Checkbox
                                                name="reasonPoshanTrackerNotUpdated"
                                                value={reason.key}
                                                checked={reasonPoshanTrackerNotUpdated.includes(reason.key)}
                                                onChange={(e) => {
                                                    const { value, checked } = e.target;
                                                    if (checked) {
                                                        setReasonPoshanTrackerNotUpdated(prev => [...prev, value]);
                                                    } else {
                                                        setReasonPoshanTrackerNotUpdated(prev => prev.filter(item => item !== value));
                                                        if(value === 'Others') {
                                                            setReasonPoshanTrackerNotUpdatedOther('');
                                                            setReasonPoshanTrackerNotUpdatedOtherError(false);
                                                        }
                                                    }
                                                }}
                                            />
                                        }
                                        label={reason.label}
                                    />
                                ))}
                            </FormGroup>
                            
                            {/* Show validation error for reason selection */}
                            {showValidation && poshanTrackerUpdated === 'No' && reasonPoshanTrackerNotUpdated.length === 0 && (
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        color: '#d32f2f', 
                                        fontSize: '0.75rem', 
                                        mt: 0.5, 
                                        display: 'block' 
                                    }}
                                >
                                    {t('validationRequiredField') || 'Please select at least one reason'}
                                </Typography>
                            )}
                            
                            {reasonPoshanTrackerNotUpdated.includes('Others') && (
                                <>
                                    <label className={styles.label} htmlFor="reasonPoshanTrackerNotUpdatedOther">
                                        {t('others')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <TextField
                                        fullWidth
                                        name="reasonPoshanTrackerNotUpdatedOther"
                                        placeholder={t('ifOthersSpecifyReason')}
                                        sx={{ mt: 2 }}
                                        size="small"
                                        value={reasonPoshanTrackerNotUpdatedOther}
                                        onChange={e => {
                                            setReasonPoshanTrackerNotUpdatedOther(e.target.value);
                                            if (e.target.value.trim() === '') {
                                                setReasonPoshanTrackerNotUpdatedOtherError(true);
                                            } else {
                                                setReasonPoshanTrackerNotUpdatedOtherError(false);
                                            }
                                        }}
                                        error={showValidation && reasonPoshanTrackerNotUpdatedOtherError && reasonPoshanTrackerNotUpdatedOther.trim() === ''}
                                        helperText={showValidation && reasonPoshanTrackerNotUpdatedOtherError && reasonPoshanTrackerNotUpdatedOther.trim() === '' ? t('validationRequiredField') : ''}
                                    />
                                </>
                            )}
                        </Grid>
                    )}

                    {/* Hidden field for reasonPoshanTrackerNotUpdated */}
                    <input
                        type="hidden"
                        name="reasonPoshanTrackerNotUpdated"
                        value={reasonPoshanTrackerNotUpdated.join(', ')}
                    />

                    {/* Medicine/Supplements Section */}
                    <Grid item xs={12}>
                        <label className={styles.label}>
                            {t('section39MedicineSupplements')} <span className={styles.requiredStar}>*</span>
                        </label>
                    </Grid>

                    {medicineTypes.map(({field, label}) => (
                        <Grid item xs={12} key={field}>
                            <label className={styles.label} htmlFor={field}>
                                {label} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup
                                name={field}
                                value={formValues[field]}
                                onChange={(e) => updateFormValue(field, e.target.value)}
                            >
                                {medicineOptions.map((option) => (
                                    <FormControlLabel
                                        key={option.key}
                                        value={option.key}
                                        control={<Radio />}
                                        label={option.label}
                                    />
                                ))}
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
                </Grid>
            </StyledDetails>
        </div>
    )
});

export default EquipmentAvailabilityAWC
