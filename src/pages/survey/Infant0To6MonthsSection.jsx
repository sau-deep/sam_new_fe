import React, { useState } from 'react'
import styles from "./survey.module.css";
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

const Infant0To6MonthsSection = React.forwardRef((props, ref) => {
    const { t } = useTranslation();
    
    // State for conditional rendering
    const [breastfedInLast24Hours, setBreastfedInLast24Hours] = useState('');
    const [foodsOrDrinksReceived, setFoodsOrDrinksReceived] = useState([]);
    const [reasonsNotExclusivelyBreastfed, setReasonsNotExclusivelyBreastfed] = useState([]);
    const [receieveAdviceFeeding, setReceieveAdviceFeeding] = useState('');
    const [adviceReceive, setAdviceReceive] = useState([]);
    const [childWeighedAware, setChildWeighedAware] = useState('');
    const [ageError, setAgeError] = useState('');
    
    // State to track if validation should be shown (only after submit attempt)
    const [showValidation, setShowValidation] = useState(false);
    
    // State to track form field values for validation
    const [formValues, setFormValues] = useState({
        nameOfChild06: '',
        sexOfChild06: '',
        currentAgeMonths06: '',
        breastfedInLast24Hours: '',
        breastfedPerDay: '',
        breastfedPerNight: '',
        foodsOrDrinksReceived: '',
        otherFoodsOrDrinks: '',
        reasonsNotExclusivelyBreastfed: '',
        otherReasonsNotBreastfed: '',
        bottleUsedToFeedMilk: '',
        awwHomeVisitsLast4Weeks: '',
        ashaHomeVisitsLast4Weeks: '',
        anmHomeVisitsLast4Weeks: '',
        receieveAdviceFeeding: '',
        adviceReceive: '',
        otherAdviceReceive: '',
        childWeighedAwc: '',
        childWeighedAware: '',
        childWeighedLastAwc: '',
        childGrowingWell: ''
    });

    const handleFoodsOrDrinksChange = (option, checked) => {
        let updated;
        if (option === 'noneOfTheAbove') {
            if (checked) {
                updated = ['noneOfTheAbove'];
            } else {
                updated = [];
            }
        } else {
            updated = foodsOrDrinksReceived ? [...foodsOrDrinksReceived] : [];
            if (checked) {
                updated = updated.filter((v) => v !== 'noneOfTheAbove');
                updated.push(option);
            } else {
                updated = updated.filter((v) => v !== option);
            }
        }
        setFoodsOrDrinksReceived(updated);
        updateFormValue('foodsOrDrinksReceived', updated.join(', '));
    };

    const handleReasonsNotBreastfedChange = (option, checked) => {
        let updated;
        if (option === 'notApplicable') {
            if (checked) {
                updated = ['notApplicable'];
            } else {
                updated = [];
            }
        } else {
            updated = reasonsNotExclusivelyBreastfed ? [...reasonsNotExclusivelyBreastfed] : [];
            if (checked) {
                updated = updated.filter((v) => v !== 'notApplicable');
                updated.push(option);
            } else {
                updated = updated.filter((v) => v !== option);
            }
        }
        setReasonsNotExclusivelyBreastfed(updated);
        updateFormValue('reasonsNotExclusivelyBreastfed', updated.join(', '));
    };

    const handleAdviceReceiveChange = (option, checked) => {
        let updated;
        if (checked) {
            updated = [...adviceReceive, option];
        } else {
            updated = adviceReceive.filter(item => item !== option);
        }
        setAdviceReceive(updated);
        updateFormValue('adviceReceive', updated.join(', '));
    };

    // Function to update form values for validation
    const updateFormValue = (fieldName, value) => {
        setFormValues(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    // Function to check if error should be shown for a field
    const shouldShowError = (fieldName) => {
        if (!showValidation) return false;
        
        // Conditional validation based on user's previous answers
        switch (fieldName) {
            // Breastfeeding frequency fields - only show if breastfeeding in last 24 hours
            case 'breastfedPerDay':
            case 'breastfedPerNight':
                return (formValues.breastfedInLast24Hours === 'Yes') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // Foods/drinks received - only show if not exclusively breastfed
            case 'foodsOrDrinksReceived':
            case 'otherFoodsOrDrinks':
                return (formValues.breastfedInLast24Hours === 'No') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // Reasons for not exclusively breastfeeding - only show if not exclusively breastfed
            case 'reasonsNotExclusivelyBreastfed':
            case 'otherReasonsNotBreastfed':
                return (formValues.breastfedInLast24Hours === 'No') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // Advice received fields - only show if advice was received
            case 'adviceReceive':
            case 'otherAdviceReceive':
                return (formValues.receieveAdviceFeeding === 'Yes') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // Weight fields - only show if user is aware of weight
            case 'childWeighedAware':
            case 'childWeighedAtAwc':
                return (formValues.childWeighedAware === 'Yes') && 
                       (!formValues[fieldName] || formValues[fieldName] === '');
            
            // Default case for always required fields
            default:
                return !formValues[fieldName] || formValues[fieldName] === '';
        }
    };

    // Validation function to be called from parent
    const triggerValidation = () => {
        setShowValidation(true);
        
        // Required fields that are always visible
        const requiredFields = [
            'sexOfChild06',
            'currentAgeMonths06', 
            'breastfedInLast24Hours',
            'foodsOrDrinksReceived',
            'reasonsNotExclusivelyBreastfed',
            'bottleUsedToFeedMilk',
            'awwHomeVisitsLast4Weeks',
            'ashaHomeVisitsLast4Weeks',
            'anmHomeVisitsLast4Weeks',
            'receieveAdviceFeeding',
            'childWeighedAwc',
            'childWeighedAware',
            'childGrowingWell'
        ];

        let firstInvalidField = null;
        
        // Check required fields
        for (const field of requiredFields) {
            if (!formValues[field] || formValues[field].trim() === '') {
                firstInvalidField = field;
                break;
            }
        }

        // Conditional validation for breastfeeding details
        if (formValues.breastfedInLast24Hours === 'Yes') {
            if (!formValues.breastfedPerDay || formValues.breastfedPerDay.trim() === '') {
                firstInvalidField = 'breastfedPerDay';
            }
            if (!formValues.breastfedPerNight || formValues.breastfedPerNight.trim() === '') {
                firstInvalidField = 'breastfedPerNight';
            }
        }

        // Conditional validation for "Others" text fields
        if (foodsOrDrinksReceived.includes('others') && (!formValues.otherFoodsOrDrinks || formValues.otherFoodsOrDrinks.trim() === '')) {
            firstInvalidField = 'otherFoodsOrDrinks';
        }

        if (reasonsNotExclusivelyBreastfed.includes('others') && (!formValues.otherReasonsNotBreastfed || formValues.otherReasonsNotBreastfed.trim() === '')) {
            firstInvalidField = 'otherReasonsNotBreastfed';
        }

        // Conditional validation for advice received
        if (formValues.receieveAdviceFeeding === 'Yes') {
            if (!formValues.adviceReceive || formValues.adviceReceive.trim() === '') {
                firstInvalidField = 'adviceReceive';
            }
            if (adviceReceive.includes('others') && (!formValues.otherAdviceReceive || formValues.otherAdviceReceive.trim() === '')) {
                firstInvalidField = 'otherAdviceReceive';
            }
        }

        // Conditional validation for weight awareness
        if (formValues.childWeighedAware === 'Yes') {
            if (!formValues.childWeighedLastAwc || formValues.childWeighedLastAwc.trim() === '') {
                firstInvalidField = 'childWeighedLastAwc';
            }
        }

        if (firstInvalidField) {
            // Scroll to first invalid field
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

    // Expose validation function to parent
    React.useImperativeHandle(ref, () => ({
        triggerValidation
    }));

    return (
        <div id="infant0To6MonthsForm">
            <StyledDetails open>
                <summary>&nbsp;{t('Section 9 - Feeding Practices of Infants (0-6 Months)')}</summary>
                <Grid container rowSpacing={2} sx={{ margin: '0', width: '100%' }}>
                    
                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="nameOfChild06">
                            {t('section91NameOfChild')} 
                        </label>
                        <TextField
                            fullWidth
                            id="nameOfChild06"
                            name="nameOfChild06"
                            value={formValues.nameOfChild06}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^A-Za-z\s]/g, '');
                                updateFormValue('nameOfChild06', value);
                            }}
                            inputProps={{ maxLength: 100 }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="sexOfChild06">
                            {t('section92SexOfChild')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="sexOfChild06"
                            name="sexOfChild06"
                            value={formValues.sexOfChild06}
                            onChange={(e) => updateFormValue('sexOfChild06', e.target.value)}
                        >
                            <FormControlLabel value="Male" control={<Radio />} label={t('male')} />
                            <FormControlLabel value="Female" control={<Radio />} label={t('female')} />
                        </RadioGroup>
                        {shouldShowError('sexOfChild06') && (
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
                        <label className={styles.label} htmlFor="currentAgeMonths06">
                            {t('section93CurrentAgeMonths')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            type="number"
                            id="currentAgeMonths06"
                            name="currentAgeMonths06"
                            value={formValues.currentAgeMonths06}
                            onChange={(e) => {
                                const value = e.target.value;
                                updateFormValue('currentAgeMonths06', value);
                                
                                if (value === '') {
                                    setAgeError('');
                                    return;
                                }
                                
                                const numValue = Number(value);
                                if (numValue < 0 || numValue > 6) {
                                    setAgeError('Input can only be in range 0-6');
                                } else {
                                    setAgeError('');
                                }
                            }}
                            placeholder="enter number 0-6 only"
                            inputProps={{ min: 0, max: 6 }}
                            error={!!ageError}
                            helperText={ageError}
                            onInput={e => {
                                let value = e.target.value;
                                
                                // Limit to 2 digits
                                if (value.length > 2) {
                                    e.target.value = value.slice(0, 2);
                                    value = e.target.value;
                                }
                            }}
                        />
                        {shouldShowError('currentAgeMonths06') && (
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
                        <label className={styles.label} htmlFor="breastfedInLast24Hours">
                            {t('section94BreastfedLast24Hours')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="breastfedInLast24Hours"
                            name="breastfedInLast24Hours"
                            value={breastfedInLast24Hours}
                            onChange={(e) => {
                                setBreastfedInLast24Hours(e.target.value);
                                updateFormValue('breastfedInLast24Hours', e.target.value);
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('breastfedInLast24Hours') && (
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

                    {breastfedInLast24Hours === 'Yes' && (
                        <>
                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="breastfedPerDay">
                                    {t('section941TimesBreastfedDay')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <em>{t('inLast24Hours')}</em>
                                <TextField
                                    fullWidth
                                    type="number"
                                    id="breastfedPerDay"
                                    name="breastfedPerDay"
                                    value={formValues.breastfedPerDay}
                                    onChange={(e) => updateFormValue('breastfedPerDay', e.target.value)}
                                    inputProps={{ min: 0, max: 99 }}
                                    onInput={(e) => {
                                        if (e.target.value.length > 2) {
                                            e.target.value = e.target.value.slice(0, 2);
                                        }
                                    }}
                                />
                                {shouldShowError('breastfedPerDay') && (
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
                                <label className={styles.label} htmlFor="breastfedPerNight">
                                    {t('section942TimesBreastfedNight')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <em>{t('inLast24Hours')}</em>
                                <TextField
                                    fullWidth
                                    type="number"
                                    id="breastfedPerNight"
                                    name="breastfedPerNight"
                                    value={formValues.breastfedPerNight}
                                    onChange={(e) => updateFormValue('breastfedPerNight', e.target.value)}
                                    inputProps={{ min: 0, max: 99 }}
                                    onInput={(e) => {
                                        if (e.target.value.length > 2) {
                                            e.target.value = e.target.value.slice(0, 2);
                                        }
                                    }}
                                />
                                {shouldShowError('breastfedPerNight') && (
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
                        <label className={styles.label} htmlFor="foodsOrDrinksReceived">
                            {t('section95FoodsDrinksOtherThanBreastmilk')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('multipleResponse')}</em>
                        <FormGroup>
                            {[
                                'plainWater',
                                'infantFormula',
                                'milkTinnedPowdered',
                                'freshAnimalMilk',
                                'humanMilkOtherMother',
                                'dalRiceWater',
                                'fruitJuice',
                                'teaCoffee',
                                'janamGhutti',
                                'noneOfTheAbove',
                                'others'
                            ].map((option) => (
                                <FormControlLabel
                                    key={option}
                                    control={
                                        <Checkbox
                                            name="foodsOrDrinksReceived"
                                            value={option}
                                            checked={foodsOrDrinksReceived.includes(option)}
                                            onChange={(e) => {
                                                handleFoodsOrDrinksChange(option, e.target.checked);
                                            }}
                                        />
                                    }
                                    label={t(option)}
                                />
                            ))}
                        </FormGroup>
                        {/* Hidden input for form submission */}
                        <input
                            type="hidden"
                            name="foodsOrDrinksReceived"
                            value={(() => {
                                let finalOptions = [...foodsOrDrinksReceived];
                                if (finalOptions.includes('others')) {
                                    const otherText = document.getElementById('otherFoodsOrDrinks')?.value;
                                    if (otherText && otherText.trim()) {
                                        finalOptions = finalOptions.filter(option => option !== 'others');
                                        finalOptions.push(`Others - ${otherText.trim()}`);
                                    }
                                }
                                return finalOptions.join(', ');
                            })()}
                        />
                        {shouldShowError('foodsOrDrinksReceived') && (
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

                    {foodsOrDrinksReceived.includes('others') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="otherFoodsOrDrinks">
                                {t('others')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                fullWidth
                                id="otherFoodsOrDrinks"
                                name="otherFoodsOrDrinks"
                                value={formValues.otherFoodsOrDrinks}
                                onChange={(e) => updateFormValue('otherFoodsOrDrinks', e.target.value)}
                                placeholder={t('ifOthersSpecifyReason')}
                                inputProps={{ maxLength: 500 }}
                            />
                            {shouldShowError('otherFoodsOrDrinks') && (
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
                        <label className={styles.label} htmlFor="reasonsNotExclusivelyBreastfed">
                            {t('section96ReasonsNotExclusivelyBreastfed')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <FormGroup>
                            {[
                                'infantCouldNotSuckleWell',
                                'lowPoorMilkOutput',
                                'workingMother',
                                'familyPressure',
                                'multipleBirths',
                                'lackOfKnowledgeAwareness',
                                'adviceByDoctorHealthWorker',
                                'notApplicable',
                                'others'
                            ].map((option) => (
                                <FormControlLabel
                                    key={option}
                                    control={
                                        <Checkbox
                                            name="reasonsNotExclusivelyBreastfed"
                                            value={option}
                                            checked={reasonsNotExclusivelyBreastfed.includes(option)}
                                            onChange={(e) => {
                                                handleReasonsNotBreastfedChange(option, e.target.checked);
                                            }}
                                        />
                                    }
                                    label={t(option)}
                                />
                            ))}
                        </FormGroup>
                        {/* Hidden input for form submission */}
                        <input
                            type="hidden"
                            name="reasonsNotExclusivelyBreastfed"
                            value={(() => {
                                let finalOptions = [...reasonsNotExclusivelyBreastfed];
                                if (finalOptions.includes('others')) {
                                    const otherText = document.getElementById('otherReasonsNotBreastfed')?.value;
                                    if (otherText && otherText.trim()) {
                                        finalOptions = finalOptions.filter(option => option !== 'others');
                                        finalOptions.push(`Others - ${otherText.trim()}`);
                                    }
                                }
                                return finalOptions.join(', ');
                            })()}
                        />
                        {shouldShowError('reasonsNotExclusivelyBreastfed') && (
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

                    {reasonsNotExclusivelyBreastfed.includes('others') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="otherReasonsNotBreastfed">
                                {t('others')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                fullWidth
                                id="otherReasonsNotBreastfed"
                                name="otherReasonsNotBreastfed"
                                value={formValues.otherReasonsNotBreastfed}
                                onChange={(e) => updateFormValue('otherReasonsNotBreastfed', e.target.value)}
                                placeholder={t('ifOthersSpecifyReason')}
                                inputProps={{ maxLength: 500 }}
                            />
                            {shouldShowError('otherReasonsNotBreastfed') && (
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
                        <label className={styles.label} htmlFor="bottleUsedToFeedMilk">
                            {t('section97BottleUsedToFeedMilk')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="bottleUsedToFeedMilk"
                            name="bottleUsedToFeedMilk"
                            value={formValues.bottleUsedToFeedMilk}
                            onChange={(e) => updateFormValue('bottleUsedToFeedMilk', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('bottleUsedToFeedMilk') && (
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
                        <label className={styles.label} htmlFor="awwHomeVisitsLast4Weeks">
                            {t('section98AWWHomeVisitsLast4Weeks')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('notVisitedWrite0')}</em>
                        <TextField
                            fullWidth
                            type="number"
                            id="awwHomeVisitsLast4Weeks"
                            name="awwHomeVisitsLast4Weeks"
                            value={formValues.awwHomeVisitsLast4Weeks}
                            onChange={(e) => updateFormValue('awwHomeVisitsLast4Weeks', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 2) {
                                    e.target.value = e.target.value.slice(0, 2);
                                }
                            }}
                        />
                        {shouldShowError('awwHomeVisitsLast4Weeks') && (
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
                        <label className={styles.label} htmlFor="ashaHomeVisitsLast4Weeks">
                            {t('section99ASHAHomeVisitsLast4Weeks')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('notVisitedWrite0')}</em>
                        <TextField
                            fullWidth
                            type="number"
                            id="ashaHomeVisitsLast4Weeks"
                            name="ashaHomeVisitsLast4Weeks"
                            value={formValues.ashaHomeVisitsLast4Weeks}
                            onChange={(e) => updateFormValue('ashaHomeVisitsLast4Weeks', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 2) {
                                    e.target.value = e.target.value.slice(0, 2);
                                }
                            }}
                        />
                        {shouldShowError('ashaHomeVisitsLast4Weeks') && (
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
                        <label className={styles.label} htmlFor="anmHomeVisitsLast4Weeks">
                            {t('section910ANMHomeVisitsLast4Weeks')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('notVisitedWrite0')}</em>
                        <TextField
                            fullWidth
                            type="number"
                            id="anmHomeVisitsLast4Weeks"
                            name="anmHomeVisitsLast4Weeks"
                            value={formValues.anmHomeVisitsLast4Weeks}
                            onChange={(e) => updateFormValue('anmHomeVisitsLast4Weeks', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 2) {
                                    e.target.value = e.target.value.slice(0, 2);
                                }
                            }}
                        />
                        {shouldShowError('anmHomeVisitsLast4Weeks') && (
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
                        <label className={styles.label} htmlFor="receieveAdviceFeeding">
                            {t('section911ReceivedAdviceFeeding')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="receieveAdviceFeeding"
                            name="receieveAdviceFeeding"
                            value={receieveAdviceFeeding}
                            onChange={(e) => {
                                setReceieveAdviceFeeding(e.target.value);
                                updateFormValue('receieveAdviceFeeding', e.target.value);
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('receieveAdviceFeeding') && (
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

                    {receieveAdviceFeeding === 'Yes' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="adviceReceive">
                                {t('section912WhatAdviceReceived')}<span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('multipleResponse')}</em>
                            <FormGroup>
                                {[
                                    'exclusiveBreastfeeding',
                                    'feedingDuringIllness',
                                    'cueSignsChildHungry',
                                    'positioningAttachmentBreastfeeding',
                                    'newBornCare',
                                    'expressingBreastMilk',
                                    'feedingWithCupSpoonPaladi',
                                    'others'
                                ].map((option) => (
                                    <FormControlLabel
                                        key={option}
                                        control={
                                            <Checkbox
                                                name="adviceReceive"
                                                value={option}
                                                onChange={(e) => {
                                                    handleAdviceReceiveChange(option, e.target.checked);
                                                }}
                                            />
                                        }
                                        label={t(option)}
                                    />
                                ))}
                            </FormGroup>
                            {/* Hidden input for form submission */}
                            <input
                                type="hidden"
                                name="adviceReceive"
                                value={(() => {
                                    let finalOptions = [...adviceReceive];
                                    if (finalOptions.includes('others')) {
                                        const otherText = document.getElementById('otherAdviceReceive')?.value;
                                        if (otherText && otherText.trim()) {
                                            finalOptions = finalOptions.filter(option => option !== 'others');
                                            finalOptions.push(`Others - ${otherText.trim()}`);
                                        }
                                    }
                                    return finalOptions.join(', ');
                                })()}
                            />
                            {shouldShowError('adviceReceive') && (
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

                    {adviceReceive.includes('others') && receieveAdviceFeeding === 'Yes' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="otherAdviceReceive">
                                {t('others')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                fullWidth
                                id="otherAdviceReceive"
                                name="otherAdviceReceive"
                                value={formValues.otherAdviceReceive}
                                onChange={(e) => updateFormValue('otherAdviceReceive', e.target.value)}
                                placeholder={t('ifOthersSpecifyReason')}
                                inputProps={{ maxLength: 500 }}
                            />
                            {shouldShowError('otherAdviceReceive') && (
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
                        <label className={styles.label} htmlFor="childWeighedAwc">
                            {t('section913ChildWeighedAWCLastMonth')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childWeighedAwc"
                            name="childWeighedAwc"
                            value={formValues.childWeighedAwc}
                            onChange={(e) => updateFormValue('childWeighedAwc', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('childWeighedAwc') && (
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
                        <label className={styles.label} htmlFor="childWeighedAware">
                            {t('section914AwareChildWeight')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childWeighedAware"
                            name="childWeighedAware"
                            value={childWeighedAware}
                            onChange={(e) => {
                                setChildWeighedAware(e.target.value);
                                updateFormValue('childWeighedAware', e.target.value);
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('childWeighedAware') && (
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

                    {childWeighedAware === 'Yes' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="childWeighedLastAwc">
                                {t('ifYesPleaseTeelWeightChild')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('inKgs')}</em>
                            <TextField
                                fullWidth
                                type="text"
                                id="childWeighedLastAwc"
                                name="childWeighedLastAwc"
                                value={formValues.childWeighedLastAwc}
                                onChange={(e) => updateFormValue('childWeighedLastAwc', e.target.value)}
                                placeholder="Enter weight in kg (e.g., 1.45)"
                                onInput={(e) => {
                                    let value = e.target.value;
                                    
                                    // Only allow numbers and one decimal point
                                    value = value.replace(/[^0-9.]/g, '');
                                    
                                    // Ensure only one decimal point
                                    const parts = value.split('.');
                                    if (parts.length > 2) {
                                        value = parts[0] + '.' + parts.slice(1).join('');
                                    }
                                    
                                    // Allow up to 2 decimal places
                                    if (parts.length === 2 && parts[1].length > 2) {
                                        value = parts[0] + '.' + parts[1].slice(0, 2);
                                    }
                                    
                                    // Limit total length to 6 characters (e.g., "50.99")
                                    if (value.length > 6) {
                                        value = value.slice(0, 6);
                                    }
                                    
                                    // Validate range (0-50)
                                    const numValue = parseFloat(value);
                                    if (value && (isNaN(numValue) || numValue < 0 || numValue > 50)) {
                                        return; // Don't update if invalid
                                    }
                                    
                                    e.target.value = value;
                                }}
                            />
                            {shouldShowError('childWeighedLastAwc') && (
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
                        <label className={styles.label} htmlFor="childGrowingWell">
                            {t('section915ChildGrowingWell')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childGrowingWell"
                            name="childGrowingWell"
                            value={formValues.childGrowingWell}
                            onChange={(e) => updateFormValue('childGrowingWell', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                            <FormControlLabel value="Don't know" control={<Radio />} label={t('dontKnow')} />
                        </RadioGroup>
                        {shouldShowError('childGrowingWell') && (
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

                </Grid>
            </StyledDetails>
        </div>
    );
});

export default Infant0To6MonthsSection; 
