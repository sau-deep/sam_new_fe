import React, { useState } from 'react';
import { Grid, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { useTranslation } from 'react-i18next';
import styles from './BiAnnualAssessment.module.css';

const BiAnnualAssessment = () => {
  const { t } = useTranslation();
  const [values, setValues] = useState({
    ashaInform: [],
  });
  const [touched, setTouched] = useState({
    ashaInform: false,
  });
  const [errors, setErrors] = useState({
    ashaInform: '',
  });

  const setFieldValue = (field, value) => {
    setValues((prevValues) => ({
      ...prevValues,
      [field]: value,
    }));
    setTouched((prevTouched) => ({
      ...prevTouched,
      [field]: true,
    }));
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    if (name === 'ashaInform') {
      const newValue = checked
        ? [...(values.ashaInform || []), value]
        : (values.ashaInform || []).filter((v) => v !== value);
      setFieldValue(name, newValue);
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    if (name === 'ashaInform') {
      // Implement validation logic for ashaInform
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} className={{
        [styles.invalid]: touched.ashaInform && !!errors.ashaInform,
      }}>
        <label className={styles.label} htmlFor="ashaInform">
          {t('hv5')} <span className={styles.requiredStar}>*</span>
        </label>
        <em>{t('hv5_note')}</em>
        <FormGroup aria-label="ASHA inform" id="ashaInform">
          {[
            "breastfeedingImportance",
            "exclusiveBreastfeeding",
            "breastfeedingFrequency",
            "breastfeedingPositionAttachment",
            "complementaryFeedingWhenToStart",
            "complementaryFeedingFrequency",
            "complementaryFeedingConsistency",
            "complementaryFeedingAgeAppropriateQuantity",
            "complementaryFeedingDietaryDiversity",
            "complementaryFeedingDuringAfterIllness",
            "complementaryFeedingResponsiveFeeding",
            "stimulationActivitiesPlayTherapy",
            "useTakeHomeRationPreparationTips",
            "regularGrowthMonitoringImportance",
            "nutritionStatusOfChildren",
            "whatIsUndernutritionSevereSAM",
            "consequencesUndernutritionForChild",
            "importanceHandWashSanitation",
            "ifaSupplementationChildren",
            "vitaminASupplementationChildren",
            "dewormingForChildren",
            "vaccinationOfChild",
            "careOfSickChildDiarrheaFever",
            "feedingDemonstrationTHR",
            "nothing",
            "other",
          ].map((option) => (
            <FormControlLabel
              key={option}
              control={
                <Checkbox
                  checked={values.ashaInform?.includes(option) || false}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  name="ashaInform"
                  value={option}
                />
              }
              label={t(option)}
            />
          ))}
        </FormGroup>
        {touched.ashaInform && errors.ashaInform && (
          <div className={styles.error}>{errors.ashaInform}</div>
        )}
      </Grid>
    </Grid>
  );
};

export default BiAnnualAssessment; 