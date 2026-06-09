import React, { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom";
import styles from "./survey.module.css";
import * as Yup from "yup";

import {
    TextField,
    Grid,
    Typography,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormGroup,
    Checkbox,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import apiService from '../../services/api';
import Loader from "components/ui/Loader";
import { ArrowBack, ArrowForward, Check } from "@mui/icons-material";
// Section of the Routine Monitoring form -> uses ROUTINE_MONITORING per-form locations.
import { getFormLocationHelpers } from "utils/formLocations";
import { filterNumberKeyDown } from 'utils'
import { saveOfflineForm } from 'utils/indexDB'
import useNetworkStatus from 'utils/networkState';
import { styled } from '@mui/material/styles';
import { useCheckboxGroupWithOthers } from 'utils/formUtils';

const { getStateOptions, getDistrictOptions, getBlockOptions } =
  getFormLocationHelpers("ROUTINE_MONITORING");

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

const FormSectionTitle = styled(Typography)(({ theme }) => ({
    margin: theme.spacing(2, 0, 1, 0),
    padding: theme.spacing(1),
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
}));

const AwaRegistration = React.forwardRef((props, ref) => {
    const { t } = useTranslation();
    const [samChildren06, setSamChildren06] = useState('');
    const [samChildren65, setSamChildren65] = useState('');
    const [samChildrenTotal, setSamChildrenTotal] = useState('');
    const [cmamChildren06, setCmamChildren06] = useState('');
    const [cmamChildren65, setCmamChildren65] = useState('');
    const [cmamChildrenTotal, setCmamChildrenTotal] = useState('');
    
    // State to track if validation should be shown (only after submit attempt)
    const [showValidation, setShowValidation] = useState(false);

    // State for real-time validation errors
    const [cmamChildren06Error, setCmamChildren06Error] = useState('');
    const [cmamChildren65Error, setCmamChildren65Error] = useState('');

    // Optimized input validation functions
    const handleNumberInput = (value, setValue, fieldName = '') => {
        // Only allow positive integers between 0-99 (no decimals, leading zeros allowed)
        if (value === '' || (/^[0-9]+$/.test(value) && Number(value) >= 0 && Number(value) <= 99 && value.length <= 2)) {
            setValue(value);

            // Real-time validation for CMAM enrollment vs SAM identification
            if (fieldName === 'cmamChildren06') {
                const maxAllowed = parseInt(samChildren06 || 0);
                if (parseInt(value || 0) > maxAllowed) {
                    setCmamChildren06Error(t('cmamChildren06MaxError', { max: maxAllowed }));
                } else {
                    setCmamChildren06Error('');
                }
            } else if (fieldName === 'cmamChildren65') {
                const maxAllowed = parseInt(samChildren65 || 0);
                if (parseInt(value || 0) > maxAllowed) {
                    setCmamChildren65Error(t('cmamChildren65MaxError', { max: maxAllowed }));
                } else {
                    setCmamChildren65Error('');
                }
            }
        }
    };

    const handleKeyDown = (e) => {
        // Block decimal point, minus sign, plus sign, and 'e' key
        if (e.key === '.' || e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
            e.preventDefault();
        }
    };

    // Calculate total when either age group changes
    useEffect(() => {
        const total = (parseInt(samChildren06 || 0) + parseInt(samChildren65 || 0)).toString();
        setSamChildrenTotal(total);

        // Clear CMAM enrollment errors if they become valid after SAM identification changes
        if (cmamChildren06 && parseInt(cmamChildren06) <= parseInt(samChildren06 || 0)) {
            setCmamChildren06Error('');
        }
        if (cmamChildren65 && parseInt(cmamChildren65) <= parseInt(samChildren65 || 0)) {
            setCmamChildren65Error('');
        }
    }, [samChildren06, samChildren65]);

    useEffect(() => {
        const total = (parseInt(cmamChildren06 || 0) + parseInt(cmamChildren65 || 0)).toString();
        setCmamChildrenTotal(total);
    }, [cmamChildren06, cmamChildren65]);

    // Create validation schema inside component to access t function
    const step1ValidationSchema = Yup.object({
        samChildrenTotal: Yup.number()
            .min(0, t('validationPositiveNumber'))
            .max(999, t('validationMaxLessThan1000'))
            .integer(t('validationWholeNumber'))
            .required(t('validationRequiredField')),
        samChildren06: Yup.number()
            .min(0, t('validationPositiveNumber'))
            .max(99, t('validationMaxLessThan100'))
            .integer(t('validationWholeNumber'))
            .required(t('validationRequiredField')),
        samChildren65: Yup.number()
            .min(0, t('validationPositiveNumber'))
            .max(99, t('validationMaxLessThan100'))
            .integer(t('validationWholeNumber'))
            .required(t('validationRequiredField')),
        cmamChildrenTotal: Yup.number()
            .min(0, t('validationPositiveNumber'))
            .max(999, t('validationMaxLessThan1000'))
            .integer(t('validationWholeNumber'))
            .required(t('validationRequiredField')),
        cmamChildren06: Yup.number()
            .min(0, t('validationPositiveNumber'))
            .max(99, t('validationMaxLessThan100'))
            .integer(t('validationWholeNumber'))
            .required(t('validationRequiredField'))
            .when('samChildren06', (samChildren06, schema) => {
                return schema.max(
                    parseInt(samChildren06 || 0),
                    t('cmamChildren06MaxError', { max: samChildren06 || 0 })
                );
            }),
        cmamChildren65: Yup.number()
            .min(0, t('validationPositiveNumber'))
            .max(99, t('validationMaxLessThan100'))
            .integer(t('validationWholeNumber'))
            .required(t('validationRequiredField'))
            .when('samChildren65', (samChildren65, schema) => {
                return schema.max(
                    parseInt(samChildren65 || 0),
                    t('cmamChildren65MaxError', { max: samChildren65 || 0 })
                );
            }),
        variationReason: Yup.string().when(['samChildrenTotal', 'cmamChildrenTotal'],
            ([samTotal, cmamTotal], schema) => {
                const totalSam = parseInt(samTotal || 0);
                const totalCmam = parseInt(cmamTotal || 0);
                return totalSam !== totalCmam
                    ? schema.required(t('validationSelectVariationReason'))
                    : schema;
            }
        ),
    });

    const variationReasons = [
        t('vhndVisitDidNotHappen'),
        t('childNotAvailableDuringVisit'),
        t('familyNotWillingToEnroll'),
        t('childReferredToNRCMTC'),
        t('childBetween0to6Months'),
        t('notApplicable'),
        t('others')
    ];

    // Use the utility hook for variation reasons
    const variationReasonGroup = useCheckboxGroupWithOthers('variationReason', 'variationReasonOther', [], '');
    
    // Function to trigger validation display (called from parent on submit)
    const triggerValidation = () => {
        setShowValidation(true);
        
        // Check if all required fields are filled
        const basicFieldsValid = samChildren06 !== '' && samChildren65 !== '' &&
                                cmamChildren06 !== '' && cmamChildren65 !== '';

        // Check CMAM enrollment constraints
        const cmam06Valid = parseInt(cmamChildren06 || 0) <= parseInt(samChildren06 || 0);
        const cmam65Valid = parseInt(cmamChildren65 || 0) <= parseInt(samChildren65 || 0);
        const cmamConstraintsValid = cmam06Valid && cmam65Valid;

        // Check if variation reasons are required (when totals don't match)
        const samTotal = parseInt(samChildren06 || 0) + parseInt(samChildren65 || 0);
        const cmamTotal = parseInt(cmamChildren06 || 0) + parseInt(cmamChildren65 || 0);
        const variationRequired = samTotal !== cmamTotal;
        const variationValid = !variationRequired || variationReasonGroup.selectedOptions.length > 0;

        // Check if "others" is selected and text is provided
        const othersSelected = variationReasonGroup.selectedOptions.includes('others');
        const othersTextValid = !othersSelected || (variationReasonGroup.otherText && variationReasonGroup.otherText.trim() !== '');

        const isValid = basicFieldsValid && cmamConstraintsValid && variationValid && othersTextValid;
        
        // If validation fails, scroll to the first invalid field after a brief delay
        if (!isValid) {
            setTimeout(() => {
                let scrollTarget = null;
                
                // Check basic fields first
                if (!basicFieldsValid) {
                    const firstEmptyField = 
                        samChildren06 === '' ? 'samChildren06' :
                        samChildren65 === '' ? 'samChildren65' :
                        cmamChildren06 === '' ? 'cmamChildren06' :
                        cmamChildren65 === '' ? 'cmamChildren65' : null;
                    
                    if (firstEmptyField) {
                        scrollTarget = document.getElementById(firstEmptyField);
                    }
                }
                // Check CMAM enrollment constraints
                else if (!cmamConstraintsValid) {
                    const cmam06Value = parseInt(cmamChildren06 || 0);
                    const cmam65Value = parseInt(cmamChildren65 || 0);
                    const sam06Value = parseInt(samChildren06 || 0);
                    const sam65Value = parseInt(samChildren65 || 0);

                    if (cmam06Value > sam06Value) {
                        scrollTarget = document.getElementById('cmamChildren06');
                    } else if (cmam65Value > sam65Value) {
                        scrollTarget = document.getElementById('cmamChildren65');
                    }
                }
                // Check variation reasons if basic fields are valid
                else if (!variationValid) {
                    // Scroll to variation reasons section
                    scrollTarget = document.querySelector('[name="variationReason"]');
                }
                // Check others text if variation is selected but text is missing
                else if (!othersTextValid) {
                    scrollTarget = document.getElementById('variationReasonOther');
                }
                
                if (scrollTarget) {
                    scrollTarget.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'nearest'
                    });
                    scrollTarget.focus();
                }
            }, 100); // Small delay to ensure error states are rendered
        }
        
        return isValid;
    };
    
    // Expose validation function to parent component
    React.useImperativeHandle(ref, () => ({
        triggerValidation
    }));

    return (
        <div id="awaRegistrationForm" name="awaRegistrationForm">
            <StyledDetails open>
                <summary>&nbsp;{t('section2BasicInformation')}</summary>
                <Grid container rowSpacing={3} columnSpacing={2} sx={{
                    margin: '0',
                    width: '100%'
                }}>
                    {/* Section 2.1 - SAM Children Newly Identified */}
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{fontWeight: 'bold', mb: 2, color: '#1976d2'}}>
                            {t('section21SAMNewlyIdentified')} <span className={styles.requiredStar}>*</span>
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2 }}>
                            {t('mentionZeroIfNoChild')}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <label className={styles.label} htmlFor="samChildrenTotal" style={{ opacity: 0.7 }}>
                            {t('totalChildren')} <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.95em' }}>(auto-calculated)</span>
                        </label>
                        <TextField
                            size="small"
                            className={styles.formInput}
                            name="samChildrenTotal"
                            id="samChildrenTotal"
                            type="text"
                            value={samChildrenTotal}
                            variant="filled"
                            InputProps={{
                                readOnly: true,
                                disableUnderline: true,
                                style: {
                                    background: '#f3f3f3',
                                    color: '#888',
                                    cursor: 'not-allowed',
                                    fontWeight: 'bold',
                                }
                            }}
                            inputProps={{
                                tabIndex: -1,
                                'aria-readonly': true,
                                style: { textAlign: 'center' }
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <label className={styles.label} htmlFor="samChildren06">
                            {t('zeroToSixMonths')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            size="small"
                            className={styles.formInput}
                            name="samChildren06"
                            id="samChildren06"
                            type="number"
                            value={samChildren06}
                            onChange={(e) => handleNumberInput(e.target.value, setSamChildren06)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('enterNumber0to99')}
                            inputProps={{ min: 0, max: 99 }}
                            error={showValidation && samChildren06 === ''}
                            helperText={showValidation && samChildren06 === '' ? t('validationRequiredField') : ''}
                        />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <label className={styles.label} htmlFor="samChildren65">
                            {t('sixMonthsToFiveYears')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            size="small"
                            className={styles.formInput}
                            name="samChildren65"
                            id="samChildren65"
                            type="number"
                            value={samChildren65}
                            onChange={(e) => handleNumberInput(e.target.value, setSamChildren65)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('enterNumber0to99')}
                            inputProps={{ min: 0, max: 99 }}
                            error={showValidation && samChildren65 === ''}
                            helperText={showValidation && samChildren65 === '' ? t('validationRequiredField') : ''}
                        />
                    </Grid>

                    {/* Section 2.2 - CMAM Enrollment */}
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{fontWeight: 'bold', mb: 2, mt: 3, color: '#1976d2'}}>
                            {t('section22CMAMEnrollment')} <span className={styles.requiredStar}>*</span>
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <label className={styles.label} htmlFor="cmamChildrenTotal" style={{ opacity: 0.7 }}>
                            {t('totalChildren')} <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.95em' }}>(auto-calculated)</span>
                        </label>
                        <TextField
                            size="small"
                            className={styles.formInput}
                            name="cmamChildrenTotal"
                            id="cmamChildrenTotal"
                            type="text"
                            value={cmamChildrenTotal}
                            variant="filled"
                            InputProps={{
                                readOnly: true,
                                disableUnderline: true,
                                style: {
                                    background: '#f3f3f3',
                                    color: '#888',
                                    cursor: 'not-allowed',
                                    fontWeight: 'bold',
                                }
                            }}
                            inputProps={{
                                tabIndex: -1,
                                'aria-readonly': true,
                                style: { textAlign: 'center' }
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <label className={styles.label} htmlFor="cmamChildren06">
                            {t('zeroToSixMonths')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            size="small"
                            className={styles.formInput}
                            name="cmamChildren06"
                            id="cmamChildren06"
                            type="number"
                            value={cmamChildren06}
                            onChange={(e) => handleNumberInput(e.target.value, setCmamChildren06, 'cmamChildren06')}
                            onKeyDown={handleKeyDown}
                            placeholder={t('enterNumber0to99')}
                            inputProps={{ min: 0, max: 99 }}
                            error={(showValidation && cmamChildren06 === '') || cmamChildren06Error !== ''}
                            helperText={(showValidation && cmamChildren06 === '' ? t('validationRequiredField') : '') || cmamChildren06Error}
                        />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <label className={styles.label} htmlFor="cmamChildren65">
                            {t('sixMonthsToFiveYears')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            size="small"
                            className={styles.formInput}
                            name="cmamChildren65"
                            id="cmamChildren65"
                            type="number"
                            value={cmamChildren65}
                            onChange={(e) => handleNumberInput(e.target.value, setCmamChildren65, 'cmamChildren65')}
                            onKeyDown={handleKeyDown}
                            placeholder={t('enterNumber0to99')}
                            inputProps={{ min: 0, max: 99 }}
                            error={(showValidation && cmamChildren65 === '') || cmamChildren65Error !== ''}
                            helperText={(showValidation && cmamChildren65 === '' ? t('validationRequiredField') : '') || cmamChildren65Error}
                        />
                    </Grid>

                    {/* Section 2.3 - Variation Reasons */}
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{fontWeight: 'bold', mb: 2, mt: 3, color: '#1976d2'}}>
                            {t('section23VariationReasons')} <span className={styles.requiredStar}>*</span>
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <FormGroup>
                            {variationReasons.map((reason, index) => {
                                // Use the original English values for the checkbox values to maintain form logic
                                const originalReasons = [
                                    'vhndVisitDidNotHappen',
                                    'childNotAvailableDuringVisit',
                                    'familyNotWillingToEnroll',
                                    'childReferredToNRCMTC',
                                    'childBetween0to6Months',
                                    'notApplicable',
                                    'others'
                                ];
                                return (
                                    <FormControlLabel
                                        key={originalReasons[index]}
                                        control={
                                            <Checkbox
                                                name="variationReason"
                                                value={originalReasons[index]}
                                                checked={variationReasonGroup.selectedOptions.includes(originalReasons[index])}
                                                onChange={variationReasonGroup.handleOptionChange}
                                            />
                                        }
                                        label={reason}
                                    />
                                );
                            })}
                        </FormGroup>
                        
                        {/* Show validation error for variation reasons when required */}
                        {showValidation && (() => {
                            const variationSelected = variationReasonGroup.selectedOptions.length > 0;

                            return !variationSelected ? (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: '#d32f2f',
                                        fontSize: '0.75rem',
                                        mt: 1, 
                                        display: 'block' 
                                    }}
                                >
                                    {t('validationSelectVariationReason') || 'Please select at least one variation reason'}
                                </Typography>
                            ) : null;
                        })()}
                    </Grid>

                    {variationReasonGroup.showOtherField && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="variationReasonOther">
                                {t('ifOthersSpecifyReason')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                className={styles.formInput}
                                name="variationReasonOther"
                                id="variationReasonOther"
                                value={variationReasonGroup.otherText}
                                placeholder={t('pleaseSpecifyOtherReasons')}
                                multiline
                                rows={2}
                                inputProps={{ maxLength: 200 }}
                                onChange={variationReasonGroup.handleOtherTextChange}
                                error={showValidation && variationReasonGroup.showOtherField && !variationReasonGroup.otherText.trim()}
                                helperText={showValidation && variationReasonGroup.showOtherField && !variationReasonGroup.otherText.trim() ? t('pleaseSpecifyOtherReasons') : ""}
                            />
                        </Grid>
                    )}

                    {/* Hidden input for the combined variation reason string */}
                    <input
                        type="hidden"
                        name="variationReason"
                        value={variationReasonGroup.getCommaSeperatedValue()}
                    />
                </Grid>
            </StyledDetails>
        </div>
    )
});

export default AwaRegistration
