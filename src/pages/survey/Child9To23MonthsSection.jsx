import React, { useState, useEffect } from 'react'
import styles from "./survey.module.css";
import {
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    Grid,
    FormGroup,
    Checkbox,
    Button,
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

const Child9To23MonthsSection = React.forwardRef((props, ref) => {
    const { t } = useTranslation();
    
    // State for conditional rendering
    const [thrReceivedLast3Month, setThrReceivedLast3Month] = useState('');
    const [thrNotReceivedReason, setThrNotReceivedReason] = useState('');
    const [thrConsumedByChild, setThrConsumedByChild] = useState('');
    const [thrNotConsumedReason, setThrNotConsumedReason] = useState([]);
    const [qtyThrFood, setQtyThrFood] = useState('');
    const [storeOpenedThr, setStoreOpenedThr] = useState('');
    const [feedingAdviceReceived, setFeedingAdviceReceived] = useState('');
    const [typeOfFeedingAdvice, setTypeOfFeedingAdvice] = useState([]);
    const [childAwareLastWeighed, setChildAwareLastWeighed] = useState('');
    const [ageError, setAgeError] = useState('');
    
    // State to track if validation should be shown (only after submit attempt)
    const [showValidation, setShowValidation] = useState(false);
    
    // State to track form field values for validation
    const [formValues, setFormValues] = useState({
        childFullName: '',
        childGender: '',
        childAgeInMonths: '',
        breastfedTimesIn24Hrs: '',
        fedFoodTimesIn24Hrs: '',
        otherRegularFoodItem: '',
        porridgeGruelFrequency: '',
        babyFoodFrequency: '',
        grainsBasedFoodFrequency: '',
        yellowOrangeVeggies: '',
        rootsBasedFoodFrequency: '',
        darkGreenVeggiesFrequency: '',
        ripeFruitsFrequencys: '',
        otherFruitsVeggiesFrequency: '',
        driedFruitsFrequency: '',
        organMeatsFrequencys: '',
        chickenMeatFrequency: '',
        eggsConsumptionFrequency: '',
        fishConsumptionFrequency: '',
        legumesFoodFrequency: '',
        nutsConsumptionFrequency: '',
        dairyProductsFrequency: '',
        oilsFatsFrequency: '',
        sugaryFoodFrequency: '',
        beveragesConsumptionFrequency: '',
        sweetenedBeveragesFrequencys: '',
        rightFoodConsistency: '',
        thrReceivedLast3Month: '',
        thrNotReceivedReasonLast3Month: '',
        thrNotReceivedReasonOther: '',
        monthsThrReceivedLast3Month: '',
        qtyThrReceived: '',
        thrConsumedByChild: '',
        thrNotConsumedReason: '',
        thrNotConsumedReasonOther: '',
        thrConsumer: '',
        daysThrConsumed: '',
        qtyThrFood: '',
        qtyThrFoodOther: '',
        storeOpenedThr: '',
        storeOpenedThrOther: '',
        albendazoleReceived: '',
        vitaminAReceived: '',
        ifaSyrupGiven: '',
        awwVisitsLast4Week: '',
        ashaVisitsLast4Week: '',
        anmVisitsLast4Week: '',
        feedingAdviceReceived: '',
        typeOfFeedingAdvice: '',
        typeOfFeedingAdviceOther: '',
        childLastWeighed: '',
        childAwareLastWeighed: '',
        childWeighed: '',
        childGrowWell: ''
    });
    
    // State for food frequency selections (11.6)
    const [foodFrequencies, setFoodFrequencies] = useState({
        porridgeGruelFrequency: '',
        babyFoodFrequency: '',
        grainsBasedFoodFrequency: '',
        yellowOrangeVeggies: '',
        rootsBasedFoodFrequency: '',
        darkGreenVeggiesFrequency: '',
        ripeFruitsFrequencys: '',
        otherFruitsVeggiesFrequency: '',
        driedFruitsFrequency: '',
        organMeatsFrequencys: '',
        chickenMeatFrequency: '',
        eggsConsumptionFrequency: '',
        fishConsumptionFrequency: '',
        legumesFoodFrequency: '',
        nutsConsumptionFrequency: '',
        dairyProductsFrequency: '',
        oilsFatsFrequency: '',
        sugaryFoodFrequency: '',
        beveragesConsumptionFrequency: '',
        sweetenedBeveragesFrequencys: ''
    });

    const handleThrNotConsumedReasonChange = (option, checked) => {
        const updated = checked 
            ? [...(formValues.thrNotConsumedReason ? formValues.thrNotConsumedReason.split(', ') : []), option]
            : (formValues.thrNotConsumedReason ? formValues.thrNotConsumedReason.split(', ') : []).filter(item => item !== option);
        updateFormValue('thrNotConsumedReason', updated.join(', '));
    };

    const handleFeedingAdviceChange = (option, checked) => {
        const updated = checked 
            ? [...(formValues.typeOfFeedingAdvice ? formValues.typeOfFeedingAdvice.split(', ') : []), option]
            : (formValues.typeOfFeedingAdvice ? formValues.typeOfFeedingAdvice.split(', ') : []).filter(item => item !== option);
        updateFormValue('typeOfFeedingAdvice', updated.join(', '));
    };

    const handleFrequencyChange = (foodType, frequency) => {
        setFoodFrequencies({
            ...foodFrequencies,
            [foodType]: frequency
        });
        updateFormValue(foodType, frequency);
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
            // THR not received reason - only show if THR was not received
            case 'thrNotReceivedReasonLast3Month':
            case 'thrNotReceivedReasonOther':
                return (formValues.thrReceivedLast3Month === 'No') &&
                       (!formValues[fieldName] || formValues[fieldName] === '');

            // THR received fields - only show if THR was received
            case 'monthsThrReceivedLast3Month':
            case 'qtyThrReceived':
            case 'thrConsumedByChild':
                return (formValues.thrReceivedLast3Month === 'Yes') &&
                       (!formValues[fieldName] || formValues[fieldName] === '');

            // THR not consumed reason - only show if THR was not consumed
            case 'thrNotConsumedReason':
            case 'thrNotConsumedReasonOther':
                return (formValues.thrConsumedByChild === 'No') &&
                       (!formValues[fieldName] || formValues[fieldName] === '');

            // THR consumed fields - only show if THR was consumed
            case 'thrConsumer':
            case 'daysThrConsumed':
            case 'qtyThrFood':
            case 'qtyThrFoodOther':
            case 'storeOpenedThr':
            case 'storeOpenedThrOther':
                return (formValues.thrConsumedByChild === 'Yes') &&
                       (!formValues[fieldName] || formValues[fieldName] === '');

            // Feeding advice - only show if advice was received
            case 'typeOfFeedingAdvice':
            case 'typeOfFeedingAdviceOther':
                return (formValues.feedingAdviceReceived === 'Yes') &&
                       (!formValues[fieldName] || formValues[fieldName] === '');

            // Weight fields - only show if user is aware of weight
            case 'childAwareLastWeighed':
            case 'childWeighed':
                return (formValues.childAwareLastWeighed === 'Yes') &&
                       (!formValues[fieldName] || formValues[fieldName] === '');

            // Food frequency and other food fields - only show if fed food times is not 0
            case 'otherRegularFoodItem':
            case 'porridgeGruelFrequency':
            case 'babyFoodFrequency':
            case 'grainsBasedFoodFrequency':
            case 'yellowOrangeVeggies':
            case 'rootsBasedFoodFrequency':
            case 'darkGreenVeggiesFrequency':
            case 'ripeFruitsFrequencys':
            case 'otherFruitsVeggiesFrequency':
            case 'driedFruitsFrequency':
            case 'organMeatsFrequencys':
            case 'chickenMeatFrequency':
            case 'eggsConsumptionFrequency':
            case 'fishConsumptionFrequency':
            case 'legumesFoodFrequency':
            case 'nutsConsumptionFrequency':
            case 'dairyProductsFrequency':
            case 'oilsFatsFrequency':
            case 'sugaryFoodFrequency':
            case 'beveragesConsumptionFrequency':
            case 'sweetenedBeveragesFrequencys':
                return (formValues.fedFoodTimesIn24Hrs !== '0') &&
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
            'childGender',
            'childAgeInMonths',
            'breastfedTimesIn24Hrs',
            'fedFoodTimesIn24Hrs',
            'rightFoodConsistency',
            'thrReceivedLast3Month',
            'albendazoleReceived',
            'vitaminAReceived',
            'ifaSyrupGiven',
            'awwVisitsLast4Week',
            'ashaVisitsLast4Week',
            'anmVisitsLast4Week',
            'feedingAdviceReceived',
            'childLastWeighed',
            'childAwareLastWeighed',
            'childGrowWell'
        ];

        // Food frequency and other food fields - only required if fed food times is not 0
        const conditionalRequiredFields = formValues.fedFoodTimesIn24Hrs !== '0' ? [
            'otherRegularFoodItem',
            'porridgeGruelFrequency',
            'babyFoodFrequency',
            'grainsBasedFoodFrequency',
            'yellowOrangeVeggies',
            'rootsBasedFoodFrequency',
            'darkGreenVeggiesFrequency',
            'ripeFruitsFrequencys',
            'otherFruitsVeggiesFrequency',
            'driedFruitsFrequency',
            'organMeatsFrequencys',
            'chickenMeatFrequency',
            'eggsConsumptionFrequency',
            'fishConsumptionFrequency',
            'legumesFoodFrequency',
            'nutsConsumptionFrequency',
            'dairyProductsFrequency',
            'oilsFatsFrequency',
            'sugaryFoodFrequency',
            'beveragesConsumptionFrequency',
            'sweetenedBeveragesFrequencys'
        ] : [];

        let firstInvalidField = null;

        // Check always required fields
        for (const field of requiredFields) {
            if (!formValues[field] || formValues[field].trim() === '') {
                firstInvalidField = field;
                break;
            }
        }

        // Check conditionally required fields only if fed food times is not 0
        if (!firstInvalidField) {
            for (const field of conditionalRequiredFields) {
                if (!formValues[field] || formValues[field].trim() === '') {
                    firstInvalidField = field;
                    break;
                }
            }
        }

        // Conditional validation for THR not received
        if (formValues.thrReceivedLast3Month === 'No') {
            if (!formValues.thrNotReceivedReasonLast3Month || formValues.thrNotReceivedReasonLast3Month.trim() === '') {
                firstInvalidField = 'thrNotReceivedReasonLast3Month';
            }
            if (formValues.thrNotReceivedReasonLast3Month === 'Other' && (!formValues.thrNotReceivedReasonOther || formValues.thrNotReceivedReasonOther.trim() === '')) {
                firstInvalidField = 'thrNotReceivedReasonOther';
            }
        }

        // Conditional validation for THR received
        if (formValues.thrReceivedLast3Month === 'Yes') {
            if (!formValues.monthsThrReceivedLast3Month || formValues.monthsThrReceivedLast3Month.trim() === '') {
                firstInvalidField = 'monthsThrReceivedLast3Month';
            }
            if (!formValues.qtyThrReceived || formValues.qtyThrReceived.trim() === '') {
                firstInvalidField = 'qtyThrReceived';
            }
            if (!formValues.thrConsumedByChild || formValues.thrConsumedByChild.trim() === '') {
                firstInvalidField = 'thrConsumedByChild';
            }
            
            if (formValues.thrConsumedByChild === 'No') {
                if (!formValues.thrNotConsumedReason || formValues.thrNotConsumedReason.trim() === '') {
                    firstInvalidField = 'thrNotConsumedReason';
                }
                if (formValues.thrNotConsumedReason && formValues.thrNotConsumedReason.includes('others') && (!formValues.thrNotConsumedReasonOther || formValues.thrNotConsumedReasonOther.trim() === '')) {
                    firstInvalidField = 'thrNotConsumedReasonOther';
                }
            }
            
            if (formValues.thrConsumedByChild === 'Yes') {
                if (!formValues.thrConsumer || formValues.thrConsumer.trim() === '') {
                    firstInvalidField = 'thrConsumer';
                }
                if (!formValues.daysThrConsumed || formValues.daysThrConsumed.trim() === '') {
                    firstInvalidField = 'daysThrConsumed';
                }
                if (!formValues.qtyThrFood || formValues.qtyThrFood.trim() === '') {
                    firstInvalidField = 'qtyThrFood';
                }
                if (formValues.qtyThrFood === 'Any Other' && (!formValues.qtyThrFoodOther || formValues.qtyThrFoodOther.trim() === '')) {
                    firstInvalidField = 'qtyThrFoodOther';
                }
                if (!formValues.storeOpenedThr || formValues.storeOpenedThr.trim() === '') {
                    firstInvalidField = 'storeOpenedThr';
                }
                if (formValues.storeOpenedThr === 'Any other' && (!formValues.storeOpenedThrOther || formValues.storeOpenedThrOther.trim() === '')) {
                    firstInvalidField = 'storeOpenedThrOther';
                }
            }
        }

        // Conditional validation for feeding advice
        if (formValues.feedingAdviceReceived === 'Yes') {
            if (!formValues.typeOfFeedingAdvice || formValues.typeOfFeedingAdvice.trim() === '') {
                firstInvalidField = 'typeOfFeedingAdvice';
            }
            if (formValues.typeOfFeedingAdvice && formValues.typeOfFeedingAdvice.includes('others') && (!formValues.typeOfFeedingAdviceOther || formValues.typeOfFeedingAdviceOther.trim() === '')) {
                firstInvalidField = 'typeOfFeedingAdviceOther';
            }
        }

        // Conditional validation for weight awareness
        if (formValues.childAwareLastWeighed === 'Yes') {
            if (!formValues.childWeighed || formValues.childWeighed.trim() === '') {
                firstInvalidField = 'childWeighed';
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

    // Update hidden inputs when food frequencies change
    useEffect(() => {
        Object.entries(foodFrequencies).forEach(([key, value]) => {
            const hiddenInput = document.querySelector(`input[name="${key}"]`);
            if (hiddenInput) {
                hiddenInput.value = value;
            }
        });
    }, [foodFrequencies]);

    // Update hidden inputs when "Other" text fields change
    useEffect(() => {
        const updateHiddenInputs = () => {
            // Update qtyThrFood hidden input
            const qtyOtherText = document.getElementById('qtyThrFoodOther')?.value;
            const qtyHiddenInput = document.querySelector('input[name="qtyThrFood"]');
            if (qtyHiddenInput) {
                if (qtyThrFood === 'Any Other' && qtyOtherText?.trim()) {
                    qtyHiddenInput.value = `Others - ${qtyOtherText.trim()}`;
                } else {
                    qtyHiddenInput.value = qtyThrFood || '';
                }
            }

            // Update storeOpenedThr hidden input
            const storeOtherText = document.getElementById('storeOpenedThrOther')?.value;
            const storeHiddenInput = document.querySelector('input[name="storeOpenedThr"]');
            if (storeHiddenInput) {
                if (storeOpenedThr === 'Any other' && storeOtherText?.trim()) {
                    storeHiddenInput.value = `Others - ${storeOtherText.trim()}`;
                } else {
                    storeHiddenInput.value = storeOpenedThr || '';
                }
            }
        };

        // Add event listeners to the "Other" text fields
        const qtyOtherField = document.getElementById('qtyThrFoodOther');
        const storeOtherField = document.getElementById('storeOpenedThrOther');

        if (qtyOtherField) {
            qtyOtherField.addEventListener('input', updateHiddenInputs);
        }
        if (storeOtherField) {
            storeOtherField.addEventListener('input', updateHiddenInputs);
        }

        // Initial update
        updateHiddenInputs();

        // Cleanup event listeners
        return () => {
            if (qtyOtherField) {
                qtyOtherField.removeEventListener('input', updateHiddenInputs);
            }
            if (storeOtherField) {
                storeOtherField.removeEventListener('input', updateHiddenInputs);
            }
        };
    }, [qtyThrFood, storeOpenedThr]);

    const frequencyOptions = ['0', '1', '2', '3', 'morethan3'];

    const foodItems = [
        { key: 'porridgeGruelFrequency', label: 'anyPorridgeOrGruel' },
        { key: 'babyFoodFrequency', label: 'anyCommerciallyFortifiedBabyFood' },
        { key: 'grainsBasedFoodFrequency', label: 'anyBreadRotiChapatiRice' },
        { key: 'yellowOrangeVeggies', label: 'anyPumpkinCarrotsYellowOrange' },
        { key: 'rootsBasedFoodFrequency', label: 'anyWhitePotatoesRootFoods' },
        { key: 'darkGreenVeggiesFrequency', label: 'anyDarkGreenLeafyVegetables' },
        { key: 'ripeFruitsFrequencys', label: 'anyRipeMangoesPapayasMuskmelon' },
        { key: 'otherFruitsVeggiesFrequency', label: 'anyOtherFruitsOrVegetables' },
        { key: 'driedFruitsFrequency', label: 'anyDryFruitsRaisinsSultanas' },
        { key: 'organMeatsFrequencys', label: 'anyLiverOrOtherOrganMeats' },
        { key: 'chickenMeatFrequency', label: 'anyChickenAnimalOtherBirdMeat' },
        { key: 'eggsConsumptionFrequency', label: 'anyEggs' },
        { key: 'fishConsumptionFrequency', label: 'anyFreshOrDriedFishShellfish' },
        { key: 'legumesFoodFrequency', label: 'anyFoodsMadeFromBeansLentils' },
        { key: 'nutsConsumptionFrequency', label: 'anyNuts' },
        { key: 'dairyProductsFrequency', label: 'anyCheeseCurdOtherMilkProducts' },
        { key: 'oilsFatsFrequency', label: 'anyOilHydrogenatedFatGhee' },
        { key: 'sugaryFoodFrequency', label: 'anySugaryFoodsChocolatesSweets' },
        { key: 'beveragesConsumptionFrequency', label: 'anyBeveragesTeaCoffee' },
        { key: 'sweetenedBeveragesFrequencys', label: 'anyOtherSweetenedBeverages' }
    ];

    return (
        <div id="child9To23MonthsForm">
            <StyledDetails open>
                <summary>&nbsp;{t('Section 11 - Child (9-23 months)')}</summary>
                <Grid container rowSpacing={2} sx={{ margin: '0', width: '100%' }}>
                    
                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="childFullName">
                            {t('section111NameOfChild')} 
                        </label>
                        <TextField
                            fullWidth
                            id="childFullName"
                            name="childFullName"
                            value={formValues.childFullName}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^A-Za-z\s]/g, '');
                                updateFormValue('childFullName', value);
                            }}
                            inputProps={{ maxLength: 100 }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="childGender">
                            {t('section112SexOfChild')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childGender"
                            name="childGender"
                            value={formValues.childGender}
                            onChange={(e) => updateFormValue('childGender', e.target.value)}
                        >
                            <FormControlLabel value="Male" control={<Radio />} label={t('male')} />
                            <FormControlLabel value="Female" control={<Radio />} label={t('female')} />
                        </RadioGroup>
                        {shouldShowError('childGender') && (
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
                        <label className={styles.label} htmlFor="childAgeInMonths">
                            {t('section113CurrentAgeMonths')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            type="number"
                            id="childAgeInMonths"
                            name="childAgeInMonths"
                            value={formValues.childAgeInMonths}
                            onChange={(e) => {
                                const value = e.target.value;
                                updateFormValue('childAgeInMonths', value);
                                
                                if (value === '') {
                                    setAgeError('');
                                    return;
                                }
                                
                                const numValue = Number(value);
                                if (numValue < 9 || numValue > 23) {
                                    setAgeError('Input can only be in range 9-23');
                                } else {
                                    setAgeError('');
                                }
                            }}
                            placeholder="enter number between 9-23 only."
                            inputProps={{ min: 9, max: 23 }}
                            error={!!ageError}
                            helperText={ageError}
                            onInput={(e) => {
                                let value = e.target.value;
                                
                                // Limit to 2 digits
                                if (value.length > 2) {
                                    e.target.value = value.slice(0, 2);
                                    value = e.target.value;
                                }
                            }}
                        />
                        {shouldShowError('childAgeInMonths') && (
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
                        <label className={styles.label} htmlFor="breastfedTimesIn24Hrs">
                            {t('section114BreastfedTimesLast24Hours')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('writeZeroIfNotBreastfed')}</em>
                        <TextField
                            fullWidth
                            type="number"
                            id="breastfedTimesIn24Hrs"
                            name="breastfedTimesIn24Hrs"
                            value={formValues.breastfedTimesIn24Hrs}
                            onChange={(e) => updateFormValue('breastfedTimesIn24Hrs', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 3) {
                                    e.target.value = e.target.value.slice(0, 3);
                                }
                            }}
                        />
                        {shouldShowError('breastfedTimesIn24Hrs') && (
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
                        <label className={styles.label} htmlFor="fedFoodTimesIn24Hrs">
                            {t('section115FedFoodTimesLast24Hours')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('writeZeroIfNotfed')}</em>
                        <TextField
                            fullWidth
                            type="number"
                            id="fedFoodTimesIn24Hrs"
                            name="fedFoodTimesIn24Hrs"
                            value={formValues.fedFoodTimesIn24Hrs}
                            onChange={(e) => updateFormValue('fedFoodTimesIn24Hrs', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 3) {
                                    e.target.value = e.target.value.slice(0, 3);
                                }
                            }}
                        />
                        {shouldShowError('fedFoodTimesIn24Hrs') && (
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

                    {/* Section 11.6 - Food Frequency (only show if not 0 in 11.5) */}
                    {formValues.fedFoodTimesIn24Hrs !== '0' && (
                        <Grid item xs={12}>
                            <label className={styles.label}>
                                {t('section116FoodFrequencyLast24Hours')} <span className={styles.requiredStar}>*</span>
                            </label>

                            {foodItems.map((item, index) => (
                                <Grid container key={item.key} sx={{ mb: 2, alignItems: 'center' }}>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {t(item.label)} <span className={styles.requiredStar}>*</span>
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {frequencyOptions.map(freq => (
                                                <Button
                                                    key={freq}
                                                    variant={foodFrequencies[item.key] === freq ? "contained" : "outlined"}
                                                    size="small"
                                                    onClick={() => handleFrequencyChange(item.key, freq)}
                                                    sx={{ minWidth: '60px', fontSize: '0.875rem' }}
                                                >
                                                    {freq === 'morethan3' ? t('morethan3') : freq}
                                                </Button>
                                            ))}
                                        </div>
                                        {/* Hidden input for form submission */}
                                        <input
                                            type="hidden"
                                            name={item.key}
                                            value={foodFrequencies[item.key]}
                                        />
                                        {shouldShowError(item.key) && (
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
                            ))}
                        </Grid>
                    )}

                    {/* Section 11.7 - Any Other Food (only show if not 0 in 11.5) */}
                    {formValues.fedFoodTimesIn24Hrs !== '0' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="otherRegularFoodItem">
                                {t('anyOtherFood')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                fullWidth
                                id="otherRegularFoodItem"
                                name="otherRegularFoodItem"
                                value={formValues.otherRegularFoodItem}
                                onChange={(e) => updateFormValue('otherRegularFoodItem', e.target.value)}
                                placeholder={t('pleaseSpecifyOtherFoodsDrinks')}
                                multiline
                                rows={2}
                            />
                            {shouldShowError('otherRegularFoodItem') && (
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
                        <label className={styles.label} htmlFor="rightFoodConsistency">
                            {t('section117THRReceivedLast3Months')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('askObserveHowThickTextureFood')}</em>
                        <RadioGroup
                            aria-label="rightFoodConsistency"
                            name="rightFoodConsistency"
                            value={formValues.rightFoodConsistency}
                            onChange={(e) => updateFormValue('rightFoodConsistency', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('rightFoodConsistency') && (
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
                        <label className={styles.label} htmlFor="thrReceivedLast3Month">
                            {t('section118THRNotReceivedReason')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="thrReceivedLast3Month"
                            name="thrReceivedLast3Month"
                            value={formValues.thrReceivedLast3Month}
                            onChange={(e) => updateFormValue('thrReceivedLast3Month', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('thrReceivedLast3Month') && (
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

                    {formValues.thrReceivedLast3Month === 'No' && (
                        <>
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="thrNotReceivedReasonLast3Month">
                                {t('section119THRConsumedByChild')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup
                                aria-label="thrNotReceivedReasonLast3Month"
                                name="thrNotReceivedReasonLast3Month"
                                value={formValues.thrNotReceivedReasonLast3Month}
                                onChange={(e) => updateFormValue('thrNotReceivedReasonLast3Month', e.target.value)}
                            >
                                <FormControlLabel value="Not distributed" control={<Radio />} label={t('notDistributed')} />
                                <FormControlLabel value="Not taken/interested" control={<Radio />} label={t('notTakenInterested')} />
                                <FormControlLabel value="Beneficiary was out of village" control={<Radio />} label={t('beneficiaryWasOutOfVillage')} />
                                <FormControlLabel value="Other" control={<Radio />} label={t('others')} />
                            </RadioGroup>
                            {shouldShowError('thrNotReceivedReasonLast3Month') && (
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
                    {formValues.thrNotReceivedReasonLast3Month === 'Other' && (
                        <Grid item xs={12}>
                    <label className={styles.label} htmlFor="thrNotReceivedReasonOther">
                        {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                    </label>
                    <TextField
                        fullWidth
                        id="thrNotReceivedReasonOther"
                        name="thrNotReceivedReasonOther"
                        value={formValues.thrNotReceivedReasonOther}
                        onChange={(e) => updateFormValue('thrNotReceivedReasonOther', e.target.value)}
                        placeholder={t('pleaseSpecifyOtherReasons')}
                        inputProps={{ maxLength: 75 }}
                    />
                    {shouldShowError('thrNotReceivedReasonOther') && (
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



                    {formValues.thrReceivedLast3Month === 'Yes' && (
                        <>
                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="monthsThrReceivedLast3Month">
                                    {t('section1110THRNotConsumedReason')}<span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup
                                    aria-label="monthsThrReceivedLast3Month"
                                    name="monthsThrReceivedLast3Month"
                                    value={formValues.monthsThrReceivedLast3Month}
                                    onChange={(e) => updateFormValue('monthsThrReceivedLast3Month', e.target.value)}
                                >
                                    <FormControlLabel value="1" control={<Radio />} label={t('1')} />
                                    <FormControlLabel value="2" control={<Radio />} label={t('2')} />
                                    <FormControlLabel value="3" control={<Radio />} label={t('3')} />
                                </RadioGroup>
                                {shouldShowError('monthsThrReceivedLast3Month') && (
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
                                <label className={styles.label} htmlFor="qtyThrReceived">
                                    {t('section1111WhoConsumeTHR')}<span className={styles.requiredStar}>*</span>
                                </label>
                                <em>{t('enterNumberPacketsReceived')}</em>
                                <TextField
                                    fullWidth
                                    type="number"
                                    id="qtyThrReceived"
                                    name="qtyThrReceived"
                                    value={formValues.qtyThrReceived}
                                    onChange={(e) => updateFormValue('qtyThrReceived', e.target.value)}
                                    inputProps={{ min: 0, max: 99 }}
                                    onInput={(e) => {
                                        if (e.target.value.length > 3) {
                                            e.target.value = e.target.value.slice(0, 3);
                                        }
                                    }}
                                />
                                {shouldShowError('qtyThrReceived') && (
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
                                <label className={styles.label} htmlFor="thrConsumedByChild">
                                    {t('section1112DaysTHRConsumeChild')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup
                                    aria-label="thrConsumedByChild"
                                    name="thrConsumedByChild"
                                    value={formValues.thrConsumedByChild}
                                    onChange={(e) => updateFormValue('thrConsumedByChild', e.target.value)}
                                >
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                </RadioGroup>
                                {shouldShowError('thrConsumedByChild') && (
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

                            {formValues.thrConsumedByChild === 'No' && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="thrNotConsumedReason">
                                        {t('section1113QtyTHRPrepareFood')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <FormGroup>
                                        {[
                                            'didNotLikeTheContentPacket',
                                            'didNotLikeTaste',
                                            'qualityIsPoor',
                                            'howToUse',
                                            'notPossibleToSeparatelyCookForTheChild',
                                            'others'
                                        ].map((option) => (
                                            <FormControlLabel
                                                key={option}
                                                control={
                                                    <Checkbox
                                                        name="thrNotConsumedReason"
                                                        value={option}
                                                        checked={formValues.thrNotConsumedReason ? formValues.thrNotConsumedReason.includes(option) : false}
                                                        onChange={(e) => handleThrNotConsumedReasonChange(option, e.target.checked)}
                                                    />
                                                }
                                                label={t(option)}
                                            />
                                        ))}
                                    </FormGroup>
                                    {/* Hidden input for form submission */}
                                    <input
                                        type="hidden"
                                        name="thrNotConsumedReason"
                                        value={formValues.thrNotConsumedReason}
                                    />
                                </Grid>
                            )}

                            {formValues.thrNotConsumedReason && formValues.thrNotConsumedReason.includes('others') && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="thrNotConsumedReasonOther">
                                        {t('otherSpecify')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <TextField
                                        fullWidth
                                        id="thrNotConsumedReasonOther"
                                        name="thrNotConsumedReasonOther"
                                        value={formValues.thrNotConsumedReasonOther}
                                        onChange={(e) => updateFormValue('thrNotConsumedReasonOther', e.target.value)}
                                        placeholder={t('pleaseSpecifyOtherReasons')}
                                        inputProps={{ maxLength: 75 }}
                                    />
                                </Grid>
                            )}

                            {/* Hidden input for combined thrNotConsumedReason with Others handling */}
                            <input
                                type="hidden"
                                name="thrNotConsumedReasonCombined"
                        value={(() => {
                            let finalOptions = formValues.thrNotConsumedReason ? formValues.thrNotConsumedReason.split(', ') : [];
                            const otherText = document.getElementById('thrNotConsumedReasonOther')?.value;
                            if (formValues.thrNotConsumedReason && formValues.thrNotConsumedReason.includes('others') && otherText?.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'others');
                                finalOptions.push(`Others - ${otherText.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                            />

                            {formValues.thrConsumedByChild === 'Yes' && (
                                <>
                                    <Grid item xs={12}>
                                        <label className={styles.label} htmlFor="thrConsumer">
                                            {t('section1114StoreTHRPacket')}<span className={styles.requiredStar}>*</span>
                                        </label>
                                        <RadioGroup
                                            aria-label="thrConsumer"
                                            name="thrConsumer"
                                            value={formValues.thrConsumer}
                                            onChange={(e) => updateFormValue('thrConsumer', e.target.value)}
                                        >
                                            <FormControlLabel value="Only by the intended child" control={<Radio />} label={t('onlyByTheIntendedChild')} />
                                            <FormControlLabel value="Intended child and other children in the family" control={<Radio />} label={t('intendedChildOtherChildren')} />
                                            <FormControlLabel value="Intended + other family members including adults" control={<Radio />} label={t('intendedOtherFamilyMembers')} />
                                            <FormControlLabel value="Only by adults in the family" control={<Radio />} label={t('onlyAdultsFamily')} />
                                        </RadioGroup>
                                        {shouldShowError('thrConsumer') && (
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
                                        <label className={styles.label} htmlFor="daysThrConsumed">
                                            {t('section1115AWWVisitsLast4Weeks')}<span className={styles.requiredStar}>*</span>
                                        </label>
                                        <em>{t('enterNumberOfDays')}</em>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            id="daysThrConsumed"
                                            name="daysThrConsumed"
                                            value={formValues.daysThrConsumed}
                                            onChange={(e) => updateFormValue('daysThrConsumed', e.target.value)}
                                            inputProps={{ min: 0, max: 31 }}
                                            onInput={(e) => {
                                                if (e.target.value.length > 2) {
                                                    e.target.value = e.target.value.slice(0, 2);
                                                }
                                            }}
                                        />
                                        {shouldShowError('daysThrConsumed') && (
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
                                        <label className={styles.label} htmlFor="qtyThrFood">
                                            {t('section1116ASHAVisitsLast4Weeks')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <em>{t('pleaseNoteThatStandardSizeOfTheKatoriIs250ml')}</em>
                                        <RadioGroup
                                            aria-label="qtyThrFood"
                                            name="qtyThrFood"
                                            value={formValues.qtyThrFood}
                                            onChange={(e) => updateFormValue('qtyThrFood', e.target.value)}
                                        >
                                            <FormControlLabel value="Half Katori" control={<Radio />} label={t('halfKatori')} />
                                            <FormControlLabel value="One Katori" control={<Radio />} label={t('oneKatori')} />
                                            <FormControlLabel value="Two Katori" control={<Radio />} label={t('twoKatori')} />
                                            <FormControlLabel value="Half Packet" control={<Radio />} label={t('halfPacket')} />
                                            <FormControlLabel value="Full Packet" control={<Radio />} label={t('fullPacket')} />
                                            <FormControlLabel value="Any Other" control={<Radio />} label={t('anyOther')} />
                                        </RadioGroup>
                                        {shouldShowError('qtyThrFood') && (
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

                                    {formValues.qtyThrFood === 'Any Other' && (
                                        <Grid item xs={12}>
                                            <label className={styles.label} htmlFor="qtyThrFoodOther">
                                                {t('otherSpecify')}<span className={styles.requiredStar}>*</span>
                                            </label>
                                            <TextField
                                                fullWidth
                                                id="qtyThrFoodOther"
                                                name="qtyThrFoodOther"
                                                value={formValues.qtyThrFoodOther}
                                                onChange={(e) => updateFormValue('qtyThrFoodOther', e.target.value)}
                                                placeholder={t('specifyQuantity')}
                                                inputProps={{ maxLength: 25 }}
                                            />
                                        </Grid>
                                    )}

                                    <Grid item xs={12}>
                                        <label className={styles.label} htmlFor="storeOpenedThr">
                                            {t('section1117ANMVisitsLast4Weeks')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <RadioGroup
                                            aria-label="storeOpenedThr"
                                            name="storeOpenedThr"
                                            value={formValues.storeOpenedThr}
                                            onChange={(e) => updateFormValue('storeOpenedThr', e.target.value)}
                                        >
                                            <FormControlLabel value="Closed container" control={<Radio />} label={t('closeCont')} />
                                            <FormControlLabel value="Keeping the same packet with tightly packed" control={<Radio />} label={t('tightlyPacked')} />
                                            <FormControlLabel value="Keeping the same packet opened as it is" control={<Radio />} label={t('openedPack')} />
                                            <FormControlLabel value="Any other" control={<Radio />} label={t('anyOtherQuantity')} />
                                        </RadioGroup>
                                        {shouldShowError('storeOpenedThr') && (
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

                                    {formValues.storeOpenedThr === 'Any other' && (
                                        <Grid item xs={12}>
                                            <label className={styles.label} htmlFor="storeOpenedThrOther">
                                                {t('otherSpecify')}<span className={styles.requiredStar}>*</span>
                                            </label>
                                            <TextField
                                                fullWidth
                                                id="storeOpenedThrOther"
                                                name="storeOpenedThrOther"
                                                value={formValues.storeOpenedThrOther}
                                                onChange={(e) => updateFormValue('storeOpenedThrOther', e.target.value)}
                                                placeholder={t('otherStorage')}
                                                inputProps={{ maxLength: 50 }}
                                            />
                                        </Grid>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="albendazoleReceived">
                            {t('section1118FeedingAdviceReceived')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('showBottle')}</em>
                        <RadioGroup
                            aria-label="albendazoleReceived"
                            name="albendazoleReceived"
                            value={formValues.albendazoleReceived}
                            onChange={(e) => updateFormValue('albendazoleReceived', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('albendazoleReceived') && (
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
                        <label className={styles.label} htmlFor="vitaminAReceived">
                            {t('section1119TypeOfFeedingAdvice')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('showBottleVit')}</em>
                        <RadioGroup
                            aria-label="vitaminAReceived"
                            name="vitaminAReceived"
                            value={formValues.vitaminAReceived}
                            onChange={(e) => updateFormValue('vitaminAReceived', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('vitaminAReceived') && (
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
                        <label className={styles.label} htmlFor="ifaSyrupGiven">
                            {t('section1120IFASyrupReceivedLastWeek')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('showBottleSyrup')}</em>
                        <RadioGroup
                            aria-label="ifaSyrupGiven"
                            name="ifaSyrupGiven"
                            value={formValues.ifaSyrupGiven}
                            onChange={(e) => updateFormValue('ifaSyrupGiven', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('ifaSyrupGiven') && (
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
                        <label className={styles.label} htmlFor="awwVisitsLast4Week">
                            {t('section1121ChildWeighedAWC')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            type="number"
                            id="awwVisitsLast4Week"
                            name="awwVisitsLast4Week"
                            value={formValues.awwVisitsLast4Week}
                            onChange={(e) => updateFormValue('awwVisitsLast4Week', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 3) {
                                    e.target.value = e.target.value.slice(0, 3);
                                }
                            }}
                        />
                        {shouldShowError('awwVisitsLast4Week') && (
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
                        <label className={styles.label} htmlFor="ashaVisitsLast4Week">
                            {t('section1122AwareWeightChild')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            type="number"
                            id="ashaVisitsLast4Week"
                            name="ashaVisitsLast4Week"
                            value={formValues.ashaVisitsLast4Week}
                            onChange={(e) => updateFormValue('ashaVisitsLast4Week', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 3) {
                                    e.target.value = e.target.value.slice(0, 3);
                                }
                            }}
                        />
                        {shouldShowError('ashaVisitsLast4Week') && (
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
                        <label className={styles.label} htmlFor="anmVisitsLast4Week">
                            {t('section1123ChildGrowingWell')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            type="number"
                            id="anmVisitsLast4Week"
                            name="anmVisitsLast4Week"
                            value={formValues.anmVisitsLast4Week}
                            onChange={(e) => updateFormValue('anmVisitsLast4Week', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 3) {
                                    e.target.value = e.target.value.slice(0, 3);
                                }
                            }}
                        />
                        {shouldShowError('anmVisitsLast4Week') && (
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
                        <label className={styles.label} htmlFor="feedingAdviceReceived">
                            {t('section1124')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="feedingAdviceReceived"
                            name="feedingAdviceReceived"
                            value={formValues.feedingAdviceReceived}
                            onChange={(e) => updateFormValue('feedingAdviceReceived', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('feedingAdviceReceived') && (
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

                    {formValues.feedingAdviceReceived === 'Yes' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="typeOfFeedingAdvice">
                                {t('section1125')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('multipleResponse')}</em>
                            <FormGroup>
                                {[
                                    'timelyInitiationComplementaryFeeding',
                                    'reinforcedMessagesContinuedBreastfeeding',
                                    'immunization',
                                    'managementIllnessHome',
                                    'managementContinuedFeedingIllness',
                                    'hygieneSanitation',
                                    'counselledFamilyReferral',
                                    'responsiveFeeding',
                                    'dietaryDiversity',
                                    'consistencyFood',
                                    'quantityQualityFood',
                                    'consumptionTHR',
                                    'others'
                                ].map((option) => (
                                    <FormControlLabel
                                        key={option}
                                        control={
                                            <Checkbox
                                                name="typeOfFeedingAdvice"
                                                value={option}
                                                checked={formValues.typeOfFeedingAdvice ? formValues.typeOfFeedingAdvice.includes(option) : false}
                                                onChange={(e) => handleFeedingAdviceChange(option, e.target.checked)}
                                            />
                                        }
                                        label={t(option)}
                                    />
                                ))}
                            </FormGroup>
                            {/* Hidden input for form submission with Others handling */}
                            <input
                                type="hidden"
                                name="typeOfFeedingAdvice"
                                value={(() => {
                                    let finalOptions = formValues.typeOfFeedingAdvice ? formValues.typeOfFeedingAdvice.split(', ') : [];
                                    const otherText = document.getElementById('typeOfFeedingAdviceOther')?.value;
                                    if (formValues.typeOfFeedingAdvice && formValues.typeOfFeedingAdvice.includes('others') && otherText?.trim()) {
                                        finalOptions = finalOptions.filter(option => option !== 'others');
                                        finalOptions.push(`Others - ${otherText.trim()}`);
                                    }
                                    return finalOptions.join(', ');
                                })()}
                            />
                        </Grid>
                    )}

                    {formValues.typeOfFeedingAdvice && formValues.typeOfFeedingAdvice.includes('others') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="typeOfFeedingAdviceOther">
                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>  
                            </label>
                            <TextField
                                fullWidth
                                id="typeOfFeedingAdviceOther"
                                name="typeOfFeedingAdviceOther"
                                value={formValues.typeOfFeedingAdviceOther}
                                onChange={(e) => updateFormValue('typeOfFeedingAdviceOther', e.target.value)}
                                placeholder={t('pleaseSpecifyOtherAdviceReceived')}
                                multiline
                                rows={2}
                            />
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="childLastWeighed">
                            {t('section1126')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childLastWeighed"
                            name="childLastWeighed"
                            value={formValues.childLastWeighed}
                            onChange={(e) => updateFormValue('childLastWeighed', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('childLastWeighed') && (
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
                        <label className={styles.label} htmlFor="childAwareLastWeighed">
                            {t('section1127')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childAwareLastWeighed"
                            name="childAwareLastWeighed"
                            value={formValues.childAwareLastWeighed}
                            onChange={(e) => updateFormValue('childAwareLastWeighed', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('childAwareLastWeighed') && (
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

                    {formValues.childAwareLastWeighed === 'Yes' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="childWeighed">
                                {t('ifYesPleaseTeelWeightChild')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('inKgs')}</em>
                            <TextField
                                fullWidth
                                type="text"
                                id="childWeighed"
                                name="childWeighed"
                                value={formValues.childWeighed}
                                onChange={(e) => updateFormValue('childWeighed', e.target.value)}
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
                            {shouldShowError('childWeighed') && (
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
                        <label className={styles.label} htmlFor="childGrowWell">
                            {t('section1128')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childGrowWell"
                            name="childGrowWell"
                            value={formValues.childGrowWell}
                            onChange={(e) => updateFormValue('childGrowWell', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                            <FormControlLabel value="Don't know" control={<Radio />} label={t('dontKnow')} />
                        </RadioGroup>
                        {shouldShowError('childGrowWell') && (
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

                    {/* Hidden inputs for single-choice Others options */}
                    <input
                        type="hidden"
                        name="thrNotReceivedReasonLast3MonthCombined"
                        value={(() => {
                            const otherText = document.getElementById('thrNotReceivedReasonOther')?.value;
                            if (formValues.thrNotReceivedReasonLast3Month === 'Other' && otherText?.trim()) {
                                return `Others - ${otherText.trim()}`;
                            }
                            return formValues.thrNotReceivedReasonLast3Month;
                        })()}
                    />
                    
                    {/* Hidden inputs that will override the original form inputs with combined values */}
                    <input
                        type="hidden"
                        name="qtyThrFood"
                        value={(() => {
                            const otherText = document.getElementById('qtyThrFoodOther')?.value;
                            if (formValues.qtyThrFood === 'Any Other' && otherText?.trim()) {
                                return `Others - ${otherText.trim()}`;
                            }
                            return formValues.qtyThrFood || '';
                        })()}
                    />
                    
                    <input
                        type="hidden"
                        name="storeOpenedThr"
                        value={(() => {
                            const otherText = document.getElementById('storeOpenedThrOther')?.value;
                            if (formValues.storeOpenedThr === 'Any other' && otherText?.trim()) {
                                return `Others - ${otherText.trim()}`;
                            }
                            return formValues.storeOpenedThr || '';
                        })()}
                    />

                </Grid>
            </StyledDetails>
        </div>
    );
});

export default Child9To23MonthsSection;
