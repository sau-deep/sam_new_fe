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
    Button,
    ButtonGroup,
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

const FrequencyButtonGroup = styled(ButtonGroup)(({ theme }) => ({
    marginTop: theme.spacing(1),
    '& .MuiButton-root': {
        minWidth: '60px',
        fontSize: '0.875rem',
    }
}));

const Child6To8MonthsSection = React.forwardRef((props, ref) => {
    const { t } = useTranslation();
    
    // State for conditional rendering
    const [familyAttendedAnnaprashan, setFamilyAttendedAnnaprashan] = useState('');
    const [thrReceivedPastMonth, setThrReceivedPastMonth] = useState('');
    const [thrConsumed, setThrConsumed] = useState('');
    const [receivedFeedingAdvice, setReceivedFeedingAdvice] = useState('');
    const [adviceReceived, setAdviceReceived] = useState([]);
    const [awareWeightChild, setAwareWeightChild] = useState('');
    const [reasonNotConsumedThr, setReasonNotConsumedThr] = useState([]);
    const [thrNotReceivedReason, setThrNotReceivedReason] = useState('');
    const [qtyPrepareFood, setQtyPrepareFood] = useState('');
    const [thrStore, setThrStore] = useState('');
    const [startedTakingFoodOtherThanBreastmilk, setStartedTakingFoodOtherThanBreastmilk] = useState('');
    const [annaprashanConductedAtAwc, setAnnaprashanConductedAtAwc] = useState('');
    const [reasonNotConsumedThrOther, setReasonNotConsumedThrOther] = useState('');
    const [ageError, setAgeError] = useState('');
    
    // State to track if validation should be shown (only after submit attempt)
    const [showValidation, setShowValidation] = useState(false);
    
    // State to track form field values for validation
    const [formValues, setFormValues] = useState({
        nameOfChild68: '',
        sexOfChild68: '',
        currentAgeMonths68: '',
        startedTakingFoodOtherThanBreastmilk: '',
        annaprashanConductedAtAwc: '',
        familyAttendedAnnaprashan: '',
        familyAttendedAnnaprashanOthers: '',
        timesBreastfedInLast24Hours: '',
        timesFedFoodInLast24Hours: '',
        otherRegularFood: '',
        porridgeFrequency: '',
        fortifiedBabyFoodFrequency: '',
        grainsFoodFrequency: '',
        yellowOrangeVegetables: '',
        rootsFoodFrequency: '',
        darkGreenLeafyVegetables: '',
        ripeFruitsFrequency: '',
        otherFruitsVegetablesFrequency: '',
        dryFruitsFrequency: '',
        organMeatsFrequency: '',
        meatFoodFrequency: '',
        eggsFrequency: '',
        fishFrequency: '',
        beansLentilsFrequency: '',
        nutsFrequency: '',
        milkProductsFrequency: '',
        oilGheeFrequency: '',
        sugaryFoodsFrequency: '',
        beveragesFrequency: '',
        sweetenedBeveragesFrequency: '',
        foodConsistencyCorrect: '',
        thrReceivedPastMonth: '',
        thrNotReceivedReason: '',
        otherThrNotReceivedReason: '',
        thrReceivedDays: '',
        thrQtyReceived: '',
        thrConsumed: '',
        reasonNotConsumedThr: '',
        reasonNotConsumedThrOther: '',
        thrConsumedBy: '',
        thrConsumedDays: '',
        qtyPrepareFood: '',
        qtyPrepareFoodOthers: '',
        thrStore: '',
        thrStoreOthers: '',
        awwVisitsLast4Weeks: '',
        ashaVisitsLast4Weeks: '',
        anmVisitsLast4Weeks: '',
        receivedFeedingAdvice: '',
        adviceReceived: '',
        otherAdviceReceived: '',
        ifaSyrupReceivedLastWeek: '',
        childWeighedAtAwc: '',
        awareWeightChild: '',
        weightChild: '',
        isChildGrowingWell: ''
    });
    
    // State for food frequency selections (10.9)
    const [foodFrequencies, setFoodFrequencies] = useState({
        porridgeFrequency: '',
        fortifiedBabyFoodFrequency: '',
        grainsFoodFrequency: '',
        yellowOrangeVegetables: '',
        rootsFoodFrequency: '',
        darkGreenLeafyVegetables: '',
        ripeFruitsFrequency: '',
        otherFruitsVegetablesFrequency: '',
        dryFruitsFrequency: '',
        organMeatsFrequency: '',
        meatFoodFrequency: '',
        eggsFrequency: '',
        fishFrequency: '',
        beansLentilsFrequency: '',
        nutsFrequency: '',
        milkProductsFrequency: '',
        oilGheeFrequency: '',
        sugaryFoodsFrequency: '',
        beveragesFrequency: '',
        sweetenedBeveragesFrequency: ''
    });

    const handleAdviceReceivedChange = (option, checked) => {
        let updated;
        if (checked) {
            updated = [...adviceReceived, option];
        } else {
            updated = adviceReceived.filter(item => item !== option);
        }
        setAdviceReceived(updated);
        updateFormValue('adviceReceived', updated.join(', '));
    };

    const handleReasonNotConsumedChange = (option, checked) => {
        let updated;
        if (checked) {
            updated = [...reasonNotConsumedThr, option];
        } else {
            updated = reasonNotConsumedThr.filter(item => item !== option);
        }
        setReasonNotConsumedThr(updated);
        updateFormValue('reasonNotConsumedThr', updated.join(', '));
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
        
        // Don't show errors for food frequency fields if user hasn't started taking food other than breastmilk
        if (formValues.startedTakingFoodOtherThanBreastmilk === 'No') {
            const foodFrequencyFields = [
                'porridgeFrequency',
                'fortifiedBabyFoodFrequency',
                'grainsFoodFrequency',
                'yellowOrangeVegetables',
                'rootsFoodFrequency',
                'darkGreenLeafyVegetables',
                'ripeFruitsFrequency',
                'otherFruitsVegetablesFrequency',
                'dryFruitsFrequency',
                'organMeatsFrequency',
                'meatFoodFrequency',
                'eggsFrequency',
                'fishFrequency',
                'beansLentilsFrequency',
                'nutsFrequency',
                'milkProductsFrequency',
                'oilGheeFrequency',
                'sugaryFoodsFrequency',
                'beveragesFrequency',
                'sweetenedBeveragesFrequency',
                'otherRegularFood'
            ];
            if (foodFrequencyFields.includes(fieldName)) {
                return false;
            }
        }

        // Don't show errors for food frequency fields if times fed food is 0
        if (formValues.timesFedFoodInLast24Hours === '0') {
            const foodFrequencyFields = [
                'porridgeFrequency',
                'fortifiedBabyFoodFrequency',
                'grainsFoodFrequency',
                'yellowOrangeVegetables',
                'rootsFoodFrequency',
                'darkGreenLeafyVegetables',
                'ripeFruitsFrequency',
                'otherFruitsVegetablesFrequency',
                'dryFruitsFrequency',
                'organMeatsFrequency',
                'meatFoodFrequency',
                'eggsFrequency',
                'fishFrequency',
                'beansLentilsFrequency',
                'nutsFrequency',
                'milkProductsFrequency',
                'oilGheeFrequency',
                'sugaryFoodsFrequency',
                'beveragesFrequency',
                'sweetenedBeveragesFrequency',
                'otherRegularFood'
            ];
            if (foodFrequencyFields.includes(fieldName)) {
                return false;
            }
        }
        
        // Don't show errors for family attended annaprashan if annaprashan was not conducted
        if (formValues.annaprashanConductedAtAwc === 'No' && fieldName === 'familyAttendedAnnaprashan') {
            return false;
        }
        
        // Don't show errors for family attended annaprashan others if not selected
        if (formValues.familyAttendedAnnaprashan !== 'Others' && fieldName === 'familyAttendedAnnaprashanOthers') {
            return false;
        }
        
        // Don't show errors for times fed food if not started taking food other than breastmilk
        if (formValues.startedTakingFoodOtherThanBreastmilk === 'No' && fieldName === 'timesFedFoodInLast24Hours') {
            return false;
        }
        
        // Don't show errors for THR not received reason if THR was received
        if (formValues.thrReceivedPastMonth === 'Yes' && fieldName === 'thrNotReceivedReason') {
            return false;
        }
        
        // Don't show errors for THR not received reason other if not selected
        if (formValues.thrNotReceivedReason !== 'Other' && fieldName === 'otherThrNotReceivedReason') {
            return false;
        }
        
        // Don't show errors for THR received fields if THR was not received
        if (formValues.thrReceivedPastMonth === 'No') {
            const thrReceivedFields = ['thrReceivedDays', 'thrQtyReceived', 'thrConsumed', 'thrConsumedBy', 'thrConsumedDays', 'qtyPrepareFood', 'qtyPrepareFoodOthers', 'thrStore', 'thrStoreOthers'];
            if (thrReceivedFields.includes(fieldName)) {
                return false;
            }
        }
        
        // Don't show errors for THR consumed fields if THR was not consumed
        if (formValues.thrConsumed === 'No') {
            const thrConsumedFields = ['thrConsumedBy', 'thrConsumedDays', 'qtyPrepareFood', 'qtyPrepareFoodOthers', 'thrStore', 'thrStoreOthers'];
            if (thrConsumedFields.includes(fieldName)) {
                return false;
            }
        }
        
        // Don't show errors for THR not consumed reason if THR was consumed
        if (formValues.thrConsumed === 'Yes' && fieldName === 'reasonNotConsumedThr') {
            return false;
        }
        
        // Don't show errors for THR not consumed reason other if not selected
        if (!reasonNotConsumedThr.includes('others') && fieldName === 'reasonNotConsumedThrOther') {
            return false;
        }
        
        // Don't show errors for qty prepare food other if not selected
        if (formValues.qtyPrepareFood !== 'Any Other' && fieldName === 'qtyPrepareFoodOthers') {
            return false;
        }
        
        // Don't show errors for thr store other if not selected
        if (formValues.thrStore !== 'Any other' && fieldName === 'thrStoreOthers') {
            return false;
        }
        
        // Don't show errors for advice received if no advice was received
        if (formValues.receivedFeedingAdvice === 'No' && fieldName === 'adviceReceived') {
            return false;
        }
        
        // Don't show errors for advice received other if not selected
        if (fieldName === 'otherAdviceReceived') {
            if (formValues.receivedFeedingAdvice !== 'Yes') return false;
            if (!formValues.adviceReceived || !formValues.adviceReceived.includes('othersAdvice')) return false;
        }
        
        // Don't show errors for weight child if not aware of weight
        if (formValues.awareWeightChild === 'No' && fieldName === 'weightChild') {
            return false;
        }
        
        return !formValues[fieldName] || formValues[fieldName] === '';
    };

    // Validation function to be called from parent
    const triggerValidation = () => {
        setShowValidation(true);
        
        let firstInvalidField = null;
        let hasErrors = false;
        
        // Core required fields that are always visible
        const coreRequiredFields = [
            'sexOfChild68',
            'currentAgeMonths68',
            'startedTakingFoodOtherThanBreastmilk',
            'annaprashanConductedAtAwc',
            'timesBreastfedInLast24Hours',
            'foodConsistencyCorrect',
            'thrReceivedPastMonth',
            'awwVisitsLast4Weeks',
            'ashaVisitsLast4Weeks',
            'anmVisitsLast4Weeks',
            'receivedFeedingAdvice',
            'ifaSyrupReceivedLastWeek',
            'childWeighedAtAwc',
            'awareWeightChild',
            'isChildGrowingWell'
        ];
        
        // Check core required fields
        for (const field of coreRequiredFields) {
            if (!formValues[field] || formValues[field].trim() === '') {
                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
                hasErrors = true;
            }
        }

        // Only validate conditional fields if core fields are filled
        if (!hasErrors) {
            // Conditional validation for food frequency (only if started taking food other than breastmilk AND times fed is not 0)
            if (formValues.startedTakingFoodOtherThanBreastmilk === 'Yes' && formValues.timesFedFoodInLast24Hours !== '0' && formValues.timesFedFoodInLast24Hours !== '') {
                const foodFrequencyFields = [
                    'porridgeFrequency',
                    'fortifiedBabyFoodFrequency',
                    'grainsFoodFrequency',
                    'yellowOrangeVegetables',
                    'rootsFoodFrequency',
                    'darkGreenLeafyVegetables',
                    'ripeFruitsFrequency',
                    'otherFruitsVegetablesFrequency',
                    'dryFruitsFrequency',
                    'organMeatsFrequency',
                    'meatFoodFrequency',
                    'eggsFrequency',
                    'fishFrequency',
                    'beansLentilsFrequency',
                    'nutsFrequency',
                    'milkProductsFrequency',
                    'oilGheeFrequency',
                    'sugaryFoodsFrequency',
                    'beveragesFrequency',
                    'sweetenedBeveragesFrequency',
                    'otherRegularFood'
                ];

                for (const field of foodFrequencyFields) {
                    if (!formValues[field] || formValues[field].trim() === '') {
                        if (!firstInvalidField) {
                            firstInvalidField = field;
                        }
                        hasErrors = true;
                    }
                }
            }

            // Conditional validation for family attended annaprashan
            if (formValues.annaprashanConductedAtAwc !== 'No') {
                if (!formValues.familyAttendedAnnaprashan || formValues.familyAttendedAnnaprashan.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'familyAttendedAnnaprashan';
                    }
                    hasErrors = true;
                }

                // 10.6 "Other specify" when "Family attended annaprashan" = Others
                if (formValues.familyAttendedAnnaprashan === 'Others') {
                    if (!formValues.familyAttendedAnnaprashanOthers || formValues.familyAttendedAnnaprashanOthers.trim() === '') {
                        if (!firstInvalidField) {
                            firstInvalidField = 'familyAttendedAnnaprashanOthers';
                        }
                        hasErrors = true;
                    }
                }
            }

            // Conditional validation for food feeding (times fed food)
            if (formValues.startedTakingFoodOtherThanBreastmilk === 'Yes') {
                if (!formValues.timesFedFoodInLast24Hours || formValues.timesFedFoodInLast24Hours.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'timesFedFoodInLast24Hours';
                    }
                    hasErrors = true;
                }
            }

            // Conditional validation for THR not received
            if (formValues.thrReceivedPastMonth === 'No') {
                if (!formValues.thrNotReceivedReason || formValues.thrNotReceivedReason.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'thrNotReceivedReason';
                    }
                    hasErrors = true;
                }

                // 10.12 "Other specify" when THR not received reason = Other
                if (formValues.thrNotReceivedReason === 'Other') {
                    if (!formValues.otherThrNotReceivedReason || formValues.otherThrNotReceivedReason.trim() === '') {
                        if (!firstInvalidField) {
                            firstInvalidField = 'otherThrNotReceivedReason';
                        }
                        hasErrors = true;
                    }
                }
            }

            // Conditional validation for THR received
            if (formValues.thrReceivedPastMonth === 'Yes') {
                if (!formValues.thrReceivedDays || formValues.thrReceivedDays.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'thrReceivedDays';
                    }
                    hasErrors = true;
                }
                if (!formValues.thrQtyReceived || formValues.thrQtyReceived.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'thrQtyReceived';
                    }
                    hasErrors = true;
                }
                if (!formValues.thrConsumed || formValues.thrConsumed.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'thrConsumed';
                    }
                    hasErrors = true;
                }
            }

            // Conditional validation for THR consumed fields
            // 10.17 and 10.18 are only shown when THR was received and consumed
            if (formValues.thrReceivedPastMonth === 'Yes' && formValues.thrConsumed === 'Yes') {
                if (!formValues.thrConsumedBy || formValues.thrConsumedBy.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'thrConsumedBy';
                    }
                    hasErrors = true;
                }

                if (!formValues.thrConsumedDays || formValues.thrConsumedDays.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'thrConsumedDays';
                    }
                    hasErrors = true;
                }

                // 10.19 and 10.20 (shown when THR was received and consumed)
                if (!formValues.qtyPrepareFood || formValues.qtyPrepareFood.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'qtyPrepareFood';
                    }
                    hasErrors = true;
                }

                if (formValues.qtyPrepareFood === 'Any Other') {
                    if (!formValues.qtyPrepareFoodOthers || formValues.qtyPrepareFoodOthers.trim() === '') {
                        if (!firstInvalidField) {
                            firstInvalidField = 'qtyPrepareFoodOthers';
                        }
                        hasErrors = true;
                    }
                }

                if (!formValues.thrStore || formValues.thrStore.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'thrStore';
                    }
                    hasErrors = true;
                }

                if (formValues.thrStore === 'Any other') {
                    if (!formValues.thrStoreOthers || formValues.thrStoreOthers.trim() === '') {
                        if (!firstInvalidField) {
                            firstInvalidField = 'thrStoreOthers';
                        }
                        hasErrors = true;
                    }
                }
            }

            // 10.16 reasons when THR was received but not consumed
            if (formValues.thrReceivedPastMonth === 'Yes' && formValues.thrConsumed === 'No') {
                if (!formValues.reasonNotConsumedThr || formValues.reasonNotConsumedThr.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'reasonNotConsumedThr';
                    }
                    hasErrors = true;
                }

                if (reasonNotConsumedThr.includes('others')) {
                    if (!formValues.reasonNotConsumedThrOther || formValues.reasonNotConsumedThrOther.trim() === '') {
                        if (!firstInvalidField) {
                            firstInvalidField = 'reasonNotConsumedThrOther';
                        }
                        hasErrors = true;
                    }
                }
            }

            // Conditional validation for feeding advice
            if (formValues.receivedFeedingAdvice === 'Yes') {
                if (!formValues.adviceReceived || formValues.adviceReceived.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'adviceReceived';
                    }
                    hasErrors = true;
                }

                // 10.25 "Other specify" when advice includes othersAdvice
                if (formValues.adviceReceived && formValues.adviceReceived.includes('othersAdvice')) {
                    if (!formValues.otherAdviceReceived || formValues.otherAdviceReceived.trim() === '') {
                        if (!firstInvalidField) {
                            firstInvalidField = 'otherAdviceReceived';
                        }
                        hasErrors = true;
                    }
                }
            }

            // Conditional validation for weight awareness
            if (formValues.awareWeightChild === 'Yes') {
                if (!formValues.weightChild || formValues.weightChild.trim() === '') {
                    if (!firstInvalidField) {
                        firstInvalidField = 'weightChild';
                    }
                    hasErrors = true;
                }
            }
        }


        if (hasErrors) {
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

    const frequencyOptions = ['0', '1', '2', '3', 'morethan3'];

    const foodItems = [
        { key: 'porridgeFrequency', label: 'anyPorridgeOrGruel' },
        { key: 'fortifiedBabyFoodFrequency', label: 'anyCommerciallyFortifiedBabyFood' },
        { key: 'grainsFoodFrequency', label: 'anyBreadRotiChapatiRice' },
        { key: 'yellowOrangeVegetables', label: 'anyPumpkinCarrotsYellowOrange' },
        { key: 'rootsFoodFrequency', label: 'anyWhitePotatoesRootFoods' },
        { key: 'darkGreenLeafyVegetables', label: 'anyDarkGreenLeafyVegetables' },
        { key: 'ripeFruitsFrequency', label: 'anyRipeMangoesPapayasMuskmelon' },
        { key: 'otherFruitsVegetablesFrequency', label: 'anyOtherFruitsOrVegetables' },
        { key: 'dryFruitsFrequency', label: 'anyDryFruitsRaisinsSultanas' },
        { key: 'organMeatsFrequency', label: 'anyLiverOrOtherOrganMeats' },
        { key: 'meatFoodFrequency', label: 'anyChickenAnimalOtherBirdMeat' },
        { key: 'eggsFrequency', label: 'anyEggs' },
        { key: 'fishFrequency', label: 'anyFreshOrDriedFishShellfish' },
        { key: 'beansLentilsFrequency', label: 'anyFoodsMadeFromBeansLentils' },
        { key: 'nutsFrequency', label: 'anyNuts' },
        { key: 'milkProductsFrequency', label: 'anyCheeseCurdOtherMilkProducts' },
        { key: 'oilGheeFrequency', label: 'anyOilHydrogenatedFatGhee' },
        { key: 'sugaryFoodsFrequency', label: 'anySugaryFoodsChocolatesSweets' },
        { key: 'beveragesFrequency', label: 'anyBeveragesTeaCoffee' },
        { key: 'sweetenedBeveragesFrequency', label: 'anyOtherSweetenedBeverages' }
    ];

    return (
        <div id="child6To8MonthsForm">
            <StyledDetails open>
                <summary>&nbsp;{t('Section 10 - Child (6-8 months)')}</summary>
                <Grid container rowSpacing={2} sx={{ margin: '0', width: '100%' }}>
                    
                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="nameOfChild68">
                            {t('section101NameOfChild')}
                        </label>
                        <TextField
                            fullWidth
                            id="nameOfChild68"
                            name="nameOfChild68"
                            value={formValues.nameOfChild68}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^A-Za-z\s]/g, '');
                                updateFormValue('nameOfChild68', value);
                            }}
                            inputProps={{ maxLength: 100 }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="sexOfChild68">
                            {t('section102SexOfChild')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="sexOfChild68"
                            name="sexOfChild68"
                            value={formValues.sexOfChild68}
                            onChange={(e) => updateFormValue('sexOfChild68', e.target.value)}
                        >
                            <FormControlLabel value="Male" control={<Radio />} label={t('male')} />
                            <FormControlLabel value="Female" control={<Radio />} label={t('female')} />
                        </RadioGroup>
                        {shouldShowError('sexOfChild68') && (
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
                        <label className={styles.label} htmlFor="currentAgeMonths68">
                            {t('section103CurrentAgeMonths')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            type="number"
                            id="currentAgeMonths68"
                            name="currentAgeMonths68"
                            value={formValues.currentAgeMonths68}
                            onChange={(e) => {
                                const value = e.target.value;
                                updateFormValue('currentAgeMonths68', value);
                                
                                if (value === '') {
                                    setAgeError('');
                                    return;
                                }
                                
                                const numValue = Number(value);
                                if (numValue < 6 || numValue > 8) {
                                    setAgeError('Input can only be in range 6-8');
                                } else {
                                    setAgeError('');
                                }
                            }}
                            placeholder="enter number between 6-8 only"
                            inputProps={{ min: 6, max: 8 }}
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
                        {shouldShowError('currentAgeMonths68') && (
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
                        <label className={styles.label} htmlFor="startedTakingFoodOtherThanBreastmilk">
                            {t('section104StartedTakingFoodOtherThanBreastmilk')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="startedTakingFoodOtherThanBreastmilk"
                            name="startedTakingFoodOtherThanBreastmilk"
                            value={startedTakingFoodOtherThanBreastmilk}
                            onChange={(e) => {
                                setStartedTakingFoodOtherThanBreastmilk(e.target.value);
                                updateFormValue('startedTakingFoodOtherThanBreastmilk', e.target.value);
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('startedTakingFoodOtherThanBreastmilk') && (
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
                        <label className={styles.label} htmlFor="annaprashanConductedAtAwc">
                            {t('section105AnnaprashanConductedAtAwc')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="annaprashanConductedAtAwc"
                            name="annaprashanConductedAtAwc"
                            value={annaprashanConductedAtAwc}
                            onChange={(e) => {
                                setAnnaprashanConductedAtAwc(e.target.value);
                                updateFormValue('annaprashanConductedAtAwc', e.target.value);
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('annaprashanConductedAtAwc') && (
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

                    {formValues.annaprashanConductedAtAwc !== 'No' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="familyAttendedAnnaprashan">
                                {t('section106FamilyAttendedAnnaprashan')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup
                                aria-label="familyAttendedAnnaprashan"
                                name="familyAttendedAnnaprashan"
                                value={familyAttendedAnnaprashan}
                                onChange={(e) => {
                                    setFamilyAttendedAnnaprashan(e.target.value);
                                    updateFormValue('familyAttendedAnnaprashan', e.target.value);
                                }}
                            >
                                <FormControlLabel value="Husband" control={<Radio />} label={t('husband')} />
                                <FormControlLabel value="Mother-in-law" control={<Radio />} label={t('mil')} />
                                <FormControlLabel value="Others" control={<Radio />} label={t('others')} />
                                <FormControlLabel value="No one else" control={<Radio />} label={t('noOneElse')} />
                            </RadioGroup>
                            {shouldShowError('familyAttendedAnnaprashan') && (
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

                    {/* Conditional text field for "Others" */}
                    {familyAttendedAnnaprashan === 'Others' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="familyAttendedAnnaprashanOthers">
                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                id="familyAttendedAnnaprashanOthers"
                                name="familyAttendedAnnaprashanOthers"
                                label={t('ifOthersSpecifyReason')}
                                fullWidth
                                value={formValues.familyAttendedAnnaprashanOthers}
                                onChange={(e) => updateFormValue('familyAttendedAnnaprashanOthers', e.target.value)}
                                inputProps={{maxLength: 100}}
                            />
                            {shouldShowError('familyAttendedAnnaprashanOthers') && (
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
                    
                    {/* Hidden input for combined familyAttendedAnnaprashan */}
                    <input
                        type="hidden"
                        name="familyAttendedAnnaprashanCombined"
                        value={(() => {
                            if (familyAttendedAnnaprashan === 'Others') {
                                const otherText = document.getElementById('familyAttendedAnnaprashanOthers')?.value;
                                return otherText?.trim() ? `Others - ${otherText.trim()}` : 'Others';
                            }
                            return familyAttendedAnnaprashan;
                        })()}
                    />

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="timesBreastfedInLast24Hours">
                            {t('section107LastBreastfed')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('writeZeroIfNotBreastfed')}</em>
                        <TextField
                            fullWidth
                            type="number"
                            id="timesBreastfedInLast24Hours"
                            name="timesBreastfedInLast24Hours"
                            value={formValues.timesBreastfedInLast24Hours}
                            onChange={(e) => updateFormValue('timesBreastfedInLast24Hours', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 2) {
                                    e.target.value = e.target.value.slice(0, 2);
                                }
                            }}
                        />
                        {shouldShowError('timesBreastfedInLast24Hours') && (
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

                    {formValues.startedTakingFoodOtherThanBreastmilk === 'Yes' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="timesFedFoodInLast24Hours">
                                {t('section108FedFoodTimesLast24Hours')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('writeZeroIfNoFoodFed')}</em>
                            <TextField
                                fullWidth
                                type="number"
                                id="timesFedFoodInLast24Hours"
                                name="timesFedFoodInLast24Hours"
                                value={formValues.timesFedFoodInLast24Hours}
                                onChange={(e) => updateFormValue('timesFedFoodInLast24Hours', e.target.value)}
                                inputProps={{ min: 0, max: 99 }}
                                onInput={(e) => {
                                    if (e.target.value.length > 2) {
                                        e.target.value = e.target.value.slice(0, 2);
                                    }
                                }}
                            />
                            {shouldShowError('timesFedFoodInLast24Hours') && (
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

                    {formValues.startedTakingFoodOtherThanBreastmilk === 'Yes' && formValues.timesFedFoodInLast24Hours !== '0' && formValues.timesFedFoodInLast24Hours !== '' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="foodFrequency">
                                {t('section109FoodFrequencyLast24Hours')} <span className={styles.requiredStar}>*</span>
                            </label>
                            {foodItems.map((food) => (
                                <Grid container key={food.key} sx={{ mb: 2, alignItems: 'center' }}>
                                    <Grid item xs={12} md={8}>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            {t(food.label)} <span className={styles.requiredStar}>*</span>
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {frequencyOptions.map((freq) => (
                                                <Button
                                                    key={freq}
                                                    variant={foodFrequencies[food.key] === freq ? "contained" : "outlined"}
                                                    size="small"
                                                    onClick={() => handleFrequencyChange(food.key, freq)}
                                                    sx={{ minWidth: '60px', fontSize: '0.875rem' }}
                                                    data-food={food.key}
                                                    data-frequency={freq}
                                                >
                                                    {freq === 'morethan3' ? t('morethan3') : freq}
                                                </Button>
                                            ))}
                                        </div>
                                        {/* Hidden input for form submission */}
                                        <input
                                            type="hidden"
                                            name={food.key}
                                            value={foodFrequencies[food.key] || ''}
                                            key={`${food.key}-${foodFrequencies[food.key]}`}
                                        />
                                        {shouldShowError(food.key) && (
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

                    {formValues.startedTakingFoodOtherThanBreastmilk === 'Yes' && formValues.timesFedFoodInLast24Hours !== '0' && formValues.timesFedFoodInLast24Hours !== '' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="otherRegularFood">
                                {t('anyOtherFood')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                fullWidth
                                id="otherRegularFood"
                                name="otherRegularFood"
                                value={formValues.otherRegularFood}
                                onChange={(e) => updateFormValue('otherRegularFood', e.target.value)}
                                placeholder={t('pleaseSpecifyOtherFoodsDrinks')}
                                multiline
                                rows={2}
                            />
                            {shouldShowError('otherRegularFood') && (
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
                        <label className={styles.label} htmlFor="foodConsistencyCorrect">
                            {t('section1010FoodConsistencyCorrect')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('askObserveHowThickTextureFood')}</em>
                        <RadioGroup
                            aria-label="foodConsistencyCorrect"
                            name="foodConsistencyCorrect"
                            value={formValues.foodConsistencyCorrect}
                            onChange={(e) => updateFormValue('foodConsistencyCorrect', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('foodConsistencyCorrect') && (
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
                        <label className={styles.label} htmlFor="thrReceivedPastMonth">
                            {t('section1011THRReceivedPastMonth')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="thrReceivedPastMonth"
                            name="thrReceivedPastMonth"
                            value={thrReceivedPastMonth}
                            onChange={(e) => {
                                setThrReceivedPastMonth(e.target.value);
                                updateFormValue('thrReceivedPastMonth', e.target.value);
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('thrReceivedPastMonth') && (
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

                    {formValues.thrReceivedPastMonth === 'No' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="thrNotReceivedReason">
                                {t('section1012THRNotReceivedReason')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup
                                aria-label="thrNotReceivedReason"
                                name="thrNotReceivedReason"
                                value={formValues.thrNotReceivedReason}
                                onChange={(e) => updateFormValue('thrNotReceivedReason', e.target.value)}
                            >
                                <FormControlLabel value="Not distributed" control={<Radio />} label={t('notDistributedTHR')} />
                                <FormControlLabel value="Not taken/interested" control={<Radio />} label={t('notTakenInterestedTHR')} />
                                <FormControlLabel value="Beneficiary was out of village" control={<Radio />} label={t('beneficiaryOutOfVillage')} />
                                <FormControlLabel value="Other" control={<Radio />} label={t('others')} />
                            </RadioGroup>
                        </Grid>
                    )}

                    {formValues.thrNotReceivedReason === 'Other' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="otherThrNotReceivedReason">
                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                fullWidth
                                id="otherThrNotReceivedReason"
                                name="otherThrNotReceivedReason"
                                value={formValues.otherThrNotReceivedReason}
                                onChange={(e) => updateFormValue('otherThrNotReceivedReason', e.target.value)}
                                placeholder={t('pleaseSpecifyOtherReasons')}
                                inputProps={{ maxLength: 500 }}
                            />
                                            {shouldShowError('otherThrNotReceivedReason') && (
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

                    {formValues.thrReceivedPastMonth === 'Yes' && (
                        <>
                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="thrReceivedDays">
                                    {t('section1013RecordAvailableVerification')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup
                                    aria-label="thrReceivedDays"
                                    name="thrReceivedDays"
                                    value={formValues.thrReceivedDays}
                                    onChange={(e) => updateFormValue('thrReceivedDays', e.target.value)}
                                >
                                    <FormControlLabel value="1" control={<Radio />} label={t('1')} />
                                    <FormControlLabel value="2" control={<Radio />} label={t('2')} />
                                    <FormControlLabel value="3" control={<Radio />} label={t('3')} />
                                </RadioGroup>
                            </Grid>

                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="thrQtyReceived">
                                    {t('section1014QtyTHRReceived')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <em>{t('enterNumberPacketsReceived')}</em>
                                <TextField
                                    fullWidth
                                    type="number"
                                    id="thrQtyReceived"
                                    name="thrQtyReceived"
                                    value={formValues.thrQtyReceived}
                                    onChange={(e) => updateFormValue('thrQtyReceived', e.target.value)}
                                    inputProps={{ min: 0, max: 99 }}
                                    onInput={(e) => {
                                        if (e.target.value.length > 2) {
                                            e.target.value = e.target.value.slice(0, 2);
                                        }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <label className={styles.label} htmlFor="thrConsumed">
                                    {t('section1015ChildConsumeTHR')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup
                                    aria-label="thrConsumed"
                                    name="thrConsumed"
                                    value={formValues.thrConsumed}
                                    onChange={(e) => updateFormValue('thrConsumed', e.target.value)}
                                >
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                </RadioGroup>
                            </Grid>

                            {formValues.thrConsumed === 'No' && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="reasonNotConsumedThr">
                                        {t('section1016ChildNotConsumeTHRReason')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <FormGroup>
                                        {[
                                            'didNotLikeContentPacket',
                                            'didNotLikeTaste',
                                            'qualityPoor',
                                            'howToUse',
                                            'notPossibleToSeparatelyCookForTheChild',
                                            'others'
                                        ].map((option) => (
                                            <FormControlLabel
                                                key={option}
                                                control={
                                                    <Checkbox
                                                        name="reasonNotConsumedThr"
                                                        value={option}
                                                        checked={reasonNotConsumedThr.includes(option)}
                                                        onChange={(e) => handleReasonNotConsumedChange(option, e.target.checked)}
                                                    />
                                                }
                                                label={t(option)}
                                            />
                                        ))}
                                    </FormGroup>
                                    {reasonNotConsumedThr.includes('others') && (
                                        <Grid item xs={12}>
                                            <label className={styles.label} htmlFor="reasonNotConsumedThrOther">
                                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                                            </label>
                                            <TextField
                                                fullWidth
                                                id="reasonNotConsumedThrOther"
                                                name="reasonNotConsumedThrOther"
                                                value={reasonNotConsumedThrOther}
                                                onChange={(e) => {
                                                    setReasonNotConsumedThrOther(e.target.value);
                                                    updateFormValue('reasonNotConsumedThrOther', e.target.value);
                                                }}
                                                placeholder={t('pleaseSpecifyOtherReasons')}
                                                inputProps={{ maxLength: 200 }}
                                            />
                                            {shouldShowError('reasonNotConsumedThrOther') && (
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
                                    {/* Hidden input for form submission */}
                                    <input
                                        type="hidden"
                                        name="reasonNotConsumedThr"
                                        value={(() => {
                                            let finalOptions = [...reasonNotConsumedThr];
                                            if (finalOptions.includes('others') && reasonNotConsumedThrOther.trim()) {
                                                finalOptions = finalOptions.filter(option => option !== 'others');
                                                finalOptions.push(`Others - ${reasonNotConsumedThrOther.trim()}`);
                                            }
                                            return finalOptions.join(', ');
                                        })()}
                                    />
                                </Grid>
                            )}

                            {formValues.thrConsumed === 'Yes' && (
                                <>
                                    <Grid item xs={12}>
                                        <label className={styles.label} htmlFor="thrConsumedBy">
                                            {t('section1017WhoConsumeTHR')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <RadioGroup
                                            aria-label="thrConsumedBy"
                                            name="thrConsumedBy"
                                            value={formValues.thrConsumedBy}
                                            onChange={(e) => updateFormValue('thrConsumedBy', e.target.value)}
                                        >
                                            <FormControlLabel value="Only by the intended child" control={<Radio />} label={t('onlyIntendedChild')} />
                                            <FormControlLabel value="Intended child and other children in the family" control={<Radio />} label={t('intendedChildOtherChildren')} />
                                            <FormControlLabel value="Intended + other family members including adults" control={<Radio />} label={t('intendedOtherFamilyMembers')} />
                                            <FormControlLabel value="Only by adults in the family" control={<Radio />} label={t('onlyAdultsFamily')} />
                                        </RadioGroup>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <label className={styles.label} htmlFor="thrConsumedDays">
                                            {t('section1018DaysTHRConsumeChild')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <em>{t('enterNumberDays')}</em>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            id="thrConsumedDays"
                                            name="thrConsumedDays"
                                            value={formValues.thrConsumedDays}
                                            onChange={(e) => updateFormValue('thrConsumedDays', e.target.value)}
                                            inputProps={{ min: 0, max: 31 }}
                                            onInput={(e) => {
                                                if (e.target.value.length > 3) {
                                                    e.target.value = e.target.value.slice(0, 3);
                                                }
                                            }}
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <label className={styles.label} htmlFor="qtyPrepareFood">
                                            {t('section1019QtyTHRPrepareFood')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <em>{t('standardSizeKatori250ml')}</em>
                                        <RadioGroup
                                            aria-label="qtyPrepareFood"
                                            name="qtyPrepareFood"
                                            value={formValues.qtyPrepareFood}
                                            onChange={(e) => updateFormValue('qtyPrepareFood', e.target.value)}
                                        >
                                            <FormControlLabel value="Half Katori" control={<Radio />} label={t('halfKatori')} />
                                            <FormControlLabel value="One Katori" control={<Radio />} label={t('oneKatori')} />
                                            <FormControlLabel value="Two Katori" control={<Radio />} label={t('twoKatori')} />
                                            <FormControlLabel value="Half Packet" control={<Radio />} label={t('halfPacket')} />
                                            <FormControlLabel value="Full Packet" control={<Radio />} label={t('fullPacket')} />
                                            <FormControlLabel value="Any Other" control={<Radio />} label={t('anyOtherQuantity')} />
                                        </RadioGroup>
                                    </Grid>

                                    {formValues.qtyPrepareFood === 'Any Other' && (
                                        <Grid item xs={12}>
                                            <label className={styles.label} htmlFor="qtyPrepareFoodOthers">
                                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                                            </label>
                                            <TextField
                                                fullWidth
                                                id="qtyPrepareFoodOthers"
                                                name="qtyPrepareFoodOthers"
                                                value={formValues.qtyPrepareFoodOthers}
                                                onChange={(e) => updateFormValue('qtyPrepareFoodOthers', e.target.value)}
                                                placeholder={t('specifyQuantity')}
                                                inputProps={{ maxLength: 200 }}
                                            />
                                        </Grid>
                                    )}
                                    
                                    {/* Hidden input for combined qtyPrepareFood */}
                                    <input
                                        type="hidden"
                                        name="qtyPrepareFoodCombined"
                                        value={(() => {
                                            if (formValues.qtyPrepareFood === 'Any Other') {
                                                const otherText = document.getElementById('qtyPrepareFoodOthers')?.value;
                                                return otherText?.trim() ? `Others - ${otherText.trim()}` : 'Others';
                                            }
                                            return formValues.qtyPrepareFood;
                                        })()}
                                    />

                                    <Grid item xs={12}>
                                        <label className={styles.label} htmlFor="thrStore">
                                            {t('section1020StoreTHRPacket')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <RadioGroup
                                            aria-label="thrStore"
                                            name="thrStore"
                                            value={formValues.thrStore}
                                            onChange={(e) => updateFormValue('thrStore', e.target.value)}
                                        >
                                            <FormControlLabel value="Closed container" control={<Radio />} label={t('closeCont')} />
                                            <FormControlLabel value="Keeping the same packet with tightly packed" control={<Radio />} label={t('tightlyPacked')} />
                                            <FormControlLabel value="Keeping the same packet opened as it is" control={<Radio />} label={t('openedPack')} />
                                            <FormControlLabel value="Any other" control={<Radio />} label={t('anyOtherQuantity')} />
                                        </RadioGroup>
                                    </Grid>

                                    {formValues.thrStore === 'Any other' && (
                                        <Grid item xs={12}>
                                            <label className={styles.label} htmlFor="thrStoreOthers">
                                                {t('otherSpecify')}<span className={styles.requiredStar}>*</span>
                                            </label>
                                            <TextField
                                                fullWidth
                                                id="thrStoreOthers"
                                                name="thrStoreOthers"
                                                value={formValues.thrStoreOthers}
                                                onChange={(e) => updateFormValue('thrStoreOthers', e.target.value)}
                                                placeholder={t('otherStorage')}
                                                inputProps={{ maxLength: 200 }}
                                            />
                                        </Grid>
                                    )}
                                    
                                    {/* Hidden input for combined thrStore */}
                                    <input
                                        type="hidden"
                                        name="thrStoreCombined"
                                        value={(() => {
                                            if (formValues.thrStore === 'Any other') {
                                                const otherText = document.getElementById('thrStoreOthers')?.value;
                                                return otherText?.trim() ? `Others - ${otherText.trim()}` : 'Others';
                                            }
                                            return formValues.thrStore;
                                        })()}
                                    />
                                    
                                    {/* Hidden input for combined thrStore */}
                                    <input
                                        type="hidden"
                                        name="thrStoreCombined"
                                        value={(() => {
                                            if (formValues.thrStore === 'Any other') {
                                                const otherText = document.getElementById('thrStoreOthers')?.value;
                                                return otherText?.trim() ? `Others - ${otherText.trim()}` : 'Others';
                                            }
                                            return formValues.thrStore;
                                        })()}
                                    />
                                </>
                            )}
                        </>
                    )}

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="awwVisitsLast4Weeks">
                            {t('section1021AWWVisitsLast4Weeks')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            type="number"
                            id="awwVisitsLast4Weeks"
                            name="awwVisitsLast4Weeks"
                            value={formValues.awwVisitsLast4Weeks}
                            onChange={(e) => updateFormValue('awwVisitsLast4Weeks', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 3) {
                                    e.target.value = e.target.value.slice(0, 3);
                                }
                            }}
                        />
                        {shouldShowError('awwVisitsLast4Weeks') && (
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
                        <label className={styles.label} htmlFor="ashaVisitsLast4Weeks">
                            {t('section1022ASHAVisitsLast4Weeks')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            type="number"
                            id="ashaVisitsLast4Weeks"
                            name="ashaVisitsLast4Weeks"
                            value={formValues.ashaVisitsLast4Weeks}
                            onChange={(e) => updateFormValue('ashaVisitsLast4Weeks', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 3) {
                                    e.target.value = e.target.value.slice(0, 3);
                                }
                            }}
                        />
                        {shouldShowError('ashaVisitsLast4Weeks') && (
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
                        <label className={styles.label} htmlFor="anmVisitsLast4Weeks">
                            {t('section1023ANMVisitsLast4Weeks')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <TextField
                            fullWidth
                            type="number"
                            id="anmVisitsLast4Weeks"
                            name="anmVisitsLast4Weeks"
                            value={formValues.anmVisitsLast4Weeks}
                            onChange={(e) => updateFormValue('anmVisitsLast4Weeks', e.target.value)}
                            inputProps={{ min: 0, max: 99 }}
                            onInput={(e) => {
                                if (e.target.value.length > 3) {
                                    e.target.value = e.target.value.slice(0, 3);
                                }
                            }}
                        />
                        {shouldShowError('anmVisitsLast4Weeks') && (
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
                        <label className={styles.label} htmlFor="receivedFeedingAdvice">
                            {t('section1024ReceivedFeedingAdvice')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="receivedFeedingAdvice"
                            name="receivedFeedingAdvice"
                            value={receivedFeedingAdvice}
                            onChange={(e) => {
                                setReceivedFeedingAdvice(e.target.value);
                                updateFormValue('receivedFeedingAdvice', e.target.value);
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('receivedFeedingAdvice') && (
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

                    {formValues.receivedFeedingAdvice === 'Yes' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="adviceReceived">
                                {t('section1025WhatAdviceReceived')} <span className={styles.requiredStar}>*</span>
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
                                    'othersAdvice'
                                ].map((option) => (
                                    <FormControlLabel
                                        key={option}
                                        control={
                                            <Checkbox
                                                name="adviceReceived"
                                                value={option}
                                                onChange={(e) => handleAdviceReceivedChange(option, e.target.checked)}
                                            />
                                        }
                                        label={t(option)}
                                    />
                                ))}
                            </FormGroup>
                            {/* Hidden input for form submission */}
                            <input
                                type="hidden"
                                name="adviceReceived"
                                value={(() => {
                                    let finalOptions = [...adviceReceived];
                                    if (finalOptions.includes('othersAdvice')) {
                                        const otherText = document.getElementById('otherAdviceReceived')?.value;
                                        if (otherText && otherText.trim()) {
                                            finalOptions = finalOptions.filter(option => option !== 'othersAdvice');
                                            finalOptions.push(`Others - ${otherText.trim()}`);
                                        }
                                    }
                                    return finalOptions.join(', ');
                                })()}
                            />
                        </Grid>
                    )}

                    {formValues.adviceReceived && formValues.adviceReceived.includes('othersAdvice') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="otherAdviceReceived">
                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                fullWidth
                                id="otherAdviceReceived"
                                name="otherAdviceReceived"
                                value={formValues.otherAdviceReceived}
                                onChange={(e) => updateFormValue('otherAdviceReceived', e.target.value)}
                                placeholder={t('pleaseSpecifyOtherAdviceReceived')}
                                inputProps={{ maxLength: 500 }}
                            />
                            {shouldShowError('otherAdviceReceived') && (
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
                        <label className={styles.label} htmlFor="ifaSyrupReceivedLastWeek">
                            {t('section1026IFASyrupReceivedLastWeek')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <em>{t('showTheBottle')}</em>
                        <RadioGroup
                            aria-label="ifaSyrupReceivedLastWeek"
                            name="ifaSyrupReceivedLastWeek"
                            value={formValues.ifaSyrupReceivedLastWeek}
                            onChange={(e) => updateFormValue('ifaSyrupReceivedLastWeek', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('ifaSyrupReceivedLastWeek') && (
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
                        <label className={styles.label} htmlFor="childWeighedAtAwc">
                            {t('section1027ChildWeighedAWC')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="childWeighedAtAwc"
                            name="childWeighedAtAwc"
                            value={formValues.childWeighedAtAwc}
                            onChange={(e) => updateFormValue('childWeighedAtAwc', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('childWeighedAtAwc') && (
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
                        <label className={styles.label} htmlFor="awareWeightChild">
                            {t('section1028AwareWeightChild')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="awareWeightChild"
                            name="awareWeightChild"
                            value={awareWeightChild}
                            onChange={(e) => {
                                setAwareWeightChild(e.target.value);
                                updateFormValue('awareWeightChild', e.target.value);
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {shouldShowError('awareWeightChild') && (
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

                    {formValues.awareWeightChild === 'Yes' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="weightChild">
                                {t('ifYesPleaseTeelWeightChild')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('inKgs')}</em>
                            <TextField
                                fullWidth
                                type="text"
                                id="weightChild"
                                name="weightChild"
                                value={formValues.weightChild}
                                onChange={(e) => updateFormValue('weightChild', e.target.value)}
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
                                    updateFormValue('weightChild', value);
                                }}
                            />
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="isChildGrowingWell">
                            {t('section1029ChildGrowingWell')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="isChildGrowingWell"
                            name="isChildGrowingWell"
                            value={formValues.isChildGrowingWell}
                            onChange={(e) => updateFormValue('isChildGrowingWell', e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                            <FormControlLabel value="Don't know" control={<Radio />} label={t('dontKnow')} />
                        </RadioGroup>
                        {shouldShowError('isChildGrowingWell') && (
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

export default Child6To8MonthsSection;
