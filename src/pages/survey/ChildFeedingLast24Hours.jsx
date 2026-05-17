import React from 'react';
import { useNavigate } from "react-router-dom";
import styles from "./survey.module.css";
import * as Yup from "yup";
import {
    Button,
    RadioGroup,
    FormControlLabel,
    Radio,
    Grid,
    Typography,
    Container,
    TextField,
} from "@mui/material";
import { Formik, Form } from "formik";
import { useTranslation } from "react-i18next";

const step1ValidationSchema = Yup.object({
    porridgeGruel: Yup.string().required('This field is required'),
    fortifiedBabyFood: Yup.string().required('This field is required'),
    breadGrains: Yup.string().required('This field is required'),
    pumpkinCarrots: Yup.string().required('This field is required'),
    whitePotatoes: Yup.string().required('This field is required'),
    darkGreenLeafy: Yup.string().required('This field is required'),
    ripeMangoes: Yup.string().required('This field is required'),
    otherFruitsVegetables: Yup.string().required('This field is required'),
    dryFruits: Yup.string().required('This field is required'),
    organMeats: Yup.string().required('This field is required'),
    chickenMeat: Yup.string().required('This field is required'),
    eggs: Yup.string().required('This field is required'),
    fishShellfish: Yup.string().required('This field is required'),
    beansLentils: Yup.string().required('This field is required'),
    nuts: Yup.string().required('This field is required'),
    milkProducts: Yup.string().required('This field is required'),
    oilsFats: Yup.string().required('This field is required'),
    sugaryFoods: Yup.string().required('This field is required'),
    beverages: Yup.string().required('This field is required'),
    sweetenedBeverages: Yup.string().required('This field is required'),
    otherFoodItem: Yup.string().max(200, "Must be at most 200 characters"),
    foodConsistency: Yup.string().required('This field is required'),
});

const handleFormSubmit = async (values, { resetForm }) => {
    // Handle form submission
};

const ChildFeedingLast24Hours = () => {
    const { t } = useTranslation();
    const initialValues = {
        porridgeGruel: '',
        fortifiedBabyFood: '',
        breadGrains: '',
        pumpkinCarrots: '',
        whitePotatoes: '',
        darkGreenLeafy: '',
        ripeMangoes: '',
        otherFruitsVegetables: '',
        dryFruits: '',
        organMeats: '',
        chickenMeat: '',
        eggs: '',
        fishShellfish: '',
        beansLentils: '',
        nuts: '',
        milkProducts: '',
        oilsFats: '',
        sugaryFoods: '',
        beverages: '',
        sweetenedBeverages: '',
        otherFoodItem: '',
        foodConsistency: '',
    };

    return (
        <div>
            <Formik initialValues={initialValues}
                validationSchema={step1ValidationSchema}
                onSubmit={handleFormSubmit}>
                {({ values, handleChange, handleBlur, errors, touched }) => (
                    <Form autoComplete="off">
                        <details open>
                            <summary>&nbsp;{t(`What did you feed your child in the last 24 hours? Select food items and their frequency of consumption in last 24 hours`)}</summary>
                            <Grid container rowSpacing={2} sx={{
                                margin: '0',
                                width: '100%'
                            }}>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.porridgeGruel && !!errors.porridgeGruel }}>
                                    <label className={styles.label} htmlFor="porridgeGruel">
                                        {t('10.9 Any porridge or gruel (kheer, dal-rice, soft khichadi)')}
                                    </label>
                                    <RadioGroup
                                        aria-label="porridgeGruel"
                                        name="porridgeGruel"
                                        size="small"
                                        id="porridgeGruel"
                                        value={values.porridgeGruel}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.fortifiedBabyFood && !!errors.fortifiedBabyFood }}>
                                    <label className={styles.label} htmlFor="fortifiedBabyFood">
                                        {t('10.10 Any commercially fortified baby food')}
                                    </label>
                                    <RadioGroup
                                        aria-label="fortifiedBabyFood"
                                        name="fortifiedBabyFood"
                                        size="small"
                                        id="fortifiedBabyFood"
                                        value={values.fortifiedBabyFood}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.breadGrains && !!errors.breadGrains }}>
                                    <label className={styles.label} htmlFor="breadGrains">
                                        {t('10.11 Any bread, roti, chapati, rice, noodles, idli, upma, halwa or any other foods made from grains')}
                                    </label>
                                    <RadioGroup
                                        aria-label="breadGrains"
                                        name="breadGrains"
                                        size="small"
                                        id="breadGrains"
                                        value={values.breadGrains}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.pumpkinCarrots && !!errors.pumpkinCarrots }}>
                                    <label className={styles.label} htmlFor="pumpkinCarrots">
                                        {t('10.12 Any pumpkin, carrots, or sweet potatoes that are yellow or orange inside')}
                                    </label>
                                    <RadioGroup
                                        aria-label="pumpkinCarrots"
                                        name="pumpkinCarrots"
                                        size="small"
                                        id="pumpkinCarrots"
                                        value={values.pumpkinCarrots}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.whitePotatoes && !!errors.whitePotatoes }}>
                                    <label className={styles.label} htmlFor="whitePotatoes">
                                        {t('10.13 Any white potatoes, or any other foods made from roots')}
                                    </label>
                                    <RadioGroup
                                        aria-label="whitePotatoes"
                                        name="whitePotatoes"
                                        size="small"
                                        id="whitePotatoes"
                                        value={values.whitePotatoes}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.darkGreenLeafy && !!errors.darkGreenLeafy }}>
                                    <label className={styles.label} htmlFor="darkGreenLeafy">
                                        {t('10.14 Any dark green leafy vegetables, or any other foods made from roots')}
                                    </label>
                                    <RadioGroup
                                        aria-label="darkGreenLeafy"
                                        name="darkGreenLeafy"
                                        size="small"
                                        id="darkGreenLeafy"
                                        value={values.darkGreenLeafy}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.ripeMangoes && !!errors.ripeMangoes }}>
                                    <label className={styles.label} htmlFor="ripeMangoes">
                                        {t('10.15 Any ripe mangoes, papayas, muskmelon, watermelon, or jackfruit')}
                                    </label>
                                    <RadioGroup
                                        aria-label="ripeMangoes"
                                        name="ripeMangoes"
                                        size="small"
                                        id="ripeMangoes"
                                        value={values.ripeMangoes}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.otherFruitsVegetables && !!errors.otherFruitsVegetables }}>
                                    <label className={styles.label} htmlFor="otherFruitsVegetables">
                                        {t('10.16 Any other fruits or vegetables')}
                                    </label>
                                    <RadioGroup
                                        aria-label="otherFruitsVegetables"
                                        name="otherFruitsVegetables"
                                        size="small"
                                        id="otherFruitsVegetables"
                                        value={values.otherFruitsVegetables}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.dryFruits && !!errors.dryFruits }}>
                                    <label className={styles.label} htmlFor="dryFruits">
                                        {t('10.17 Any dry fruits')}
                                    </label>
                                    <RadioGroup
                                        aria-label="dryFruits"
                                        name="dryFruits"
                                        size="small"
                                        id="dryFruits"
                                        value={values.dryFruits}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.organMeats && !!errors.organMeats }}>
                                    <label className={styles.label} htmlFor="organMeats">
                                        {t('10.18 Any organ meats')}
                                    </label>
                                    <RadioGroup
                                        aria-label="organMeats"
                                        name="organMeats"
                                        size="small"
                                        id="organMeats"
                                        value={values.organMeats}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.chickenMeat && !!errors.chickenMeat }}>
                                    <label className={styles.label} htmlFor="chickenMeat">
                                        {t('10.19 Any chicken meat')}
                                    </label>
                                    <RadioGroup
                                        aria-label="chickenMeat"
                                        name="chickenMeat"
                                        size="small"
                                        id="chickenMeat"
                                        value={values.chickenMeat}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.eggs && !!errors.eggs }}>
                                    <label className={styles.label} htmlFor="eggs">
                                        {t('10.20 Any eggs')}
                                    </label>
                                    <RadioGroup
                                        aria-label="eggs"
                                        name="eggs"
                                        size="small"
                                        id="eggs"
                                        value={values.eggs}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.fishShellfish && !!errors.fishShellfish }}>
                                    <label className={styles.label} htmlFor="fishShellfish">
                                        {t('10.21 Any fish or shellfish')}
                                    </label>
                                    <RadioGroup
                                        aria-label="fishShellfish"
                                        name="fishShellfish"
                                        size="small"
                                        id="fishShellfish"
                                        value={values.fishShellfish}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.beansLentils && !!errors.beansLentils }}>
                                    <label className={styles.label} htmlFor="beansLentils">
                                        {t('10.22 Any beans or lentils')}
                                    </label>
                                    <RadioGroup
                                        aria-label="beansLentils"
                                        name="beansLentils"
                                        size="small"
                                        id="beansLentils"
                                        value={values.beansLentils}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.nuts && !!errors.nuts }}>
                                    <label className={styles.label} htmlFor="nuts">
                                        {t('10.23 Any nuts')}
                                    </label>
                                    <RadioGroup
                                        aria-label="nuts"
                                        name="nuts"
                                        size="small"
                                        id="nuts"
                                        value={values.nuts}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.milkProducts && !!errors.milkProducts }}>
                                    <label className={styles.label} htmlFor="milkProducts">
                                        {t('10.24 Any milk products')}
                                    </label>
                                    <RadioGroup
                                        aria-label="milkProducts"
                                        name="milkProducts"
                                        size="small"
                                        id="milkProducts"
                                        value={values.milkProducts}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.oilsFats && !!errors.oilsFats }}>
                                    <label className={styles.label} htmlFor="oilsFats">
                                        {t('10.25 Any oils or fats')}
                                    </label>
                                    <RadioGroup
                                        aria-label="oilsFats"
                                        name="oilsFats"
                                        size="small"
                                        id="oilsFats"
                                        value={values.oilsFats}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.sugaryFoods && !!errors.sugaryFoods }}>
                                    <label className={styles.label} htmlFor="sugaryFoods">
                                        {t('10.26 Any sugary foods')}
                                    </label>
                                    <RadioGroup
                                        aria-label="sugaryFoods"
                                        name="sugaryFoods"
                                        size="small"
                                        id="sugaryFoods"
                                        value={values.sugaryFoods}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.beverages && !!errors.beverages }}>
                                    <label className={styles.label} htmlFor="beverages">
                                        {t('10.27 Any beverages')}
                                    </label>
                                    <RadioGroup
                                        aria-label="beverages"
                                        name="beverages"
                                        size="small"
                                        id="beverages"
                                        value={values.beverages}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.sweetenedBeverages && !!errors.sweetenedBeverages }}>
                                    <label className={styles.label} htmlFor="sweetenedBeverages">
                                        {t('10.28 Any sweetened beverages')}
                                    </label>
                                    <RadioGroup
                                        aria-label="sweetenedBeverages"
                                        name="sweetenedBeverages"
                                        size="small"
                                        id="sweetenedBeverages"
                                        value={values.sweetenedBeverages}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label="0" />
                                        <FormControlLabel value="1" control={<Radio />} label="1" />
                                        <FormControlLabel value="2" control={<Radio />} label="2" />
                                        <FormControlLabel value="3" control={<Radio />} label="3" />
                                        <FormControlLabel value="moreThan3" control={<Radio />} label="More than 3" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.otherFoodItem && !!errors.otherFoodItem }}>
                                    <label className={styles.label} htmlFor="otherFoodItem">
                                        {t('10.29 Any other food item')}
                                    </label>
                                    <TextField
                                        id="otherFoodItem"
                                        name="otherFoodItem"
                                        value={values.otherFoodItem}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        fullWidth
                                        inputProps={{ maxLength: 200 }}
                                    />
                                </Grid>
                                <Grid item xs={12} className={{ [styles.invalid]: touched.foodConsistency && !!errors.foodConsistency }}>
                                    <label className={styles.label} htmlFor="foodConsistency">
                                        {t('10.30 Is the mother offering the right consistency of food to the child?')}
                                    </label>
                                    <em>{t('Ask and observe if possible, how thick is the texture of food')}</em>
                                    <RadioGroup
                                        aria-label="foodConsistency"
                                        name="foodConsistency"
                                        size="small"
                                        id="foodConsistency"
                                        value={values.foodConsistency}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                                        <FormControlLabel value="no" control={<Radio />} label="No" />
                                    </RadioGroup>
                                </Grid>
                            </Grid>
                        </details>
                    </Form>
                )}
            </Formik>
        </div>
    );
}

export default ChildFeedingLast24Hours;

