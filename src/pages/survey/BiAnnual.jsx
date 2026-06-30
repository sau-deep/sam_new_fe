import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./survey.module.css";
import * as Yup from "yup";
import {
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid,
  Box,
  Typography,
  Container,
  TextareaAutosize,
  FormGroup,
  Checkbox,
  Select,
  MenuItem,
  IconButton,
  Alert,
} from "@mui/material";
import { Formik, Form } from "formik";
import apiService from '../../services/api';
import { generateQuestionnairePDF } from '../../services/BiAnnualPDFService';
import Loader from "components/ui/Loader";
import SnackBar from "components/ui/SnackBar";
import WhatsAppContact from "components/ui/WhatsAppContact";
import AutoSaveIndicator from "components/ui/AutoSaveIndicator";
import ErrorReportingDialog from '../../components/ui/ErrorReportingDialog';
import ConsentDialog from '../../components/ui/ConsentDialog';
import { ArrowBack, ArrowForward, Check, LocationOn, LocationOff, PictureAsPdf } from "@mui/icons-material";
// Per-form location helpers (block-level, backend-driven + offline cache).
import { getFormLocationHelpers } from "utils/formLocations";
import useFormLocations from "hooks/useFormLocations";
import { useTranslation } from "react-i18next";
import { useFormTranslation } from "hooks/useFormTranslation";
import { filterNumberKeyDown } from 'utils'
import { saveOfflineForm } from 'utils/indexDB'
import useNetworkStatus from 'utils/networkState';
import useFormAutoSave from 'hooks/useFormAutoSave';
import usePreventPageReload from 'hooks/usePreventPageReload';
import { getLocationWithFallback } from 'utils/locationUtils';
import { sendSilentWhatsAppReport, createErrorMessage } from '../../utils/whatsappUtils';
import { getConsentStatus } from '../../utils/consentManager';
import { incrementDailyCount, isSurveyorUser, syncAfterSubmission } from '../../utils/dailySurveyCount';
import { useFormikContext } from "formik";
import { calculateWHZ, classifyWHZ } from 'utils/whoZScore';
// import MapComponent from 'components/ui/StreetMap'; // Removed - using direct geolocation API instead

const {
  getStateOptions,
  getDistrictOptions,
  getBlockOptions,
  getVillageOptions,
  getDistrictOptionsByStateName,
  getBlockOptionsByDistrictName,
  getVillageOptionsByBlockName,
} = getFormLocationHelpers("BI_ANNUAL");

/**
 * Watches ANTH1 (weight) / ANTH2 (height) / sex / age and auto-fills
 * ANTH4 (nutritionalCategory) using the WHO 2006 WHZ LMS method.
 * Must be rendered inside a <Formik> tree.
 */
const WHZAutoCalculator = () => {
  const { values, setFieldValue } = useFormikContext();
  useEffect(() => {
    // Bilateral oedema present → SAM regardless of WHZ (ANTH3=Yes → ANTH4=SAM)
    if (values.presentBilateralOedema === 'Yes') {
      setFieldValue('whzOutOfRange', false);
      setFieldValue('nutritionalCategory', 'SAM');
      return;
    }
    const wt = values.current_wt;
    const ht = values.currentHt;
    // 999 = not measured — no basis for a category. Clear any stale auto-selection
    // (e.g. SAM previously forced by oedema=Yes) so it does not linger.
    if (wt === '999' || String(wt) === '999' || ht === '999' || String(ht) === '999') {
      setFieldValue('whzOutOfRange', false);
      setFieldValue('nutritionalCategory', '');
      return;
    }
    const whz = calculateWHZ(wt, ht, values.childAgeMonths, values.childSex);
    if (whz !== null && (whz < -6 || whz > 6)) {
      // Out of valid range — flag error, clear auto-selection
      setFieldValue('whzOutOfRange', true);
      setFieldValue('nutritionalCategory', '');
    } else if (whz !== null) {
      setFieldValue('whzOutOfRange', false);
      const cls = classifyWHZ(whz);
      if (cls) setFieldValue('nutritionalCategory', cls);
    } else {
      // WHZ can't be computed (measurements missing/incomplete) and oedema is not
      // 'Yes' — clear any stale auto-selection (the category is always derived).
      setFieldValue('whzOutOfRange', false);
      setFieldValue('nutritionalCategory', '');
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    values.current_wt, values.currentHt,
    values.childAgeMonths, values.childSex,
    values.presentBilateralOedema,
  ]);
  return null;
};

// Validation schemas for each step
const step1ValidationSchema = Yup.object({
  caregiverName: Yup.string().required("This is required field"),
  caregiversex: Yup.string().required("This is required field"),
  caregiverAge: Yup.string()
    .required("This is a required field")
    .test(
      'max-3-digits',
      'Must be at most 3 digits',
      value => !value || /^\d{1,3}$/.test(value)
    ),
  caregiverEducation: Yup.string().required("This is required field"),
  childSex: Yup.string().required("This is required field"),
  childDob: Yup.string().required("This is required field"),
  childBreastfeed: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childAgeMonths } = this.parent;
      return !(childAgeMonths < 24 && (!value || value.trim() === ''));
    }
  ),
  childBreastfeedFirstTime: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childBreastfeed, childAgeMonths } = this.parent;
      return !(childAgeMonths < 24 && childBreastfeed === 'Yes' && (!value || value.trim() === ''));
    }
  ),
  noOfDays: Yup.string()
    .test(
      'conditional-required',
      'This is a required field',
      function (value) {
        const { childBreastfeedFirstTime } = this.parent;
        return !(
          (childBreastfeedFirstTime === 'On second day after birth or later') &&
          (!value || value.trim() === '')
        );
      }
    )
    .test(
      'max-2-digits',
      'Must be at most 2 digits',
      value => !value || /^\d{1,2}$/.test(value)
    ),
  noOfHours: Yup.string()
    .test(
      'conditional-required',
      'This is a required field',
      function (value) {
        const { childBreastfeedFirstTime } = this.parent;
        return !(
          (childBreastfeedFirstTime === 'On the day of birth' ||
            childBreastfeedFirstTime === 'On second day after birth or later') &&
          (!value || value.trim() === '')
        );
      }
    )
    .test(
      'max-hours',
      'Hours cannot be more than 24',
      value => !value || (/^\d+$/.test(value) && parseInt(value, 10) <= 24)
    ),
  noOfMins: Yup.string()
    .test(
      'conditional-required',
      'This is a required field',
      function (value) {
        const { childBreastfeedFirstTime } = this.parent;
        return !(
          (childBreastfeedFirstTime === 'On the day of birth' ||
            childBreastfeedFirstTime === 'On second day after birth or later') &&
          (!value || value.trim() === '')
        );
      }
    )
    .test(
      'max-minutes',
      'Minutes cannot be more than 59',
      value => !value || (/^\d+$/.test(value) && parseInt(value, 10) <= 59)
    ),
  firstMilk: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childBreastfeed, childAgeMonths } = this.parent;
      return !(childAgeMonths < 24 && childBreastfeed === 'Yes' && (!value || value.trim() === ''));
    }
  ),
  otherThanMilk: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childBreastfeed, childAgeMonths } = this.parent;
      return !(childAgeMonths < 24 && childBreastfeed === 'Yes' && (!value || value.trim() === ''));
    }
  ),
  otherThanMilkGiven: Yup.array().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { otherThanMilk, childAgeMonths } = this.parent;
      return !(childAgeMonths < 24 && otherThanMilk === 'Yes') || (value && value.length >= 1);
    }
  ),
  receivedThr: Yup.string().required("This is required field"),
  receivedThrDays: Yup.string()
  .test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { receivedThr } = this.parent;
      return !(receivedThr === 'Yes' && (!value|| value.trim() === ''));
    }
  ).test(
    'max-receivedThrDays',
    'Value cannot be greater than 30 days',
    function (value) {
      const { receivedThr } = this.parent;
      return !(receivedThr === 'Yes' && value && Number(value) > 30);
    }
  ),
  consumeThrDays: Yup.string()
  .test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { receivedThr } = this.parent;
      return !(receivedThr === 'Yes' && (!value || value.trim() === ''));
    }
  )
  .test(
    'min-required',
    'Value should not be in negative (-)',
    function (value) {
      const { receivedThr } = this.parent;
      return !(receivedThr === 'Yes' && (value && value.trim() && Number(value) < 0));
    }
  )
  .test(
    'max-receivedThrDays',
    'THR3 cannot be greater than THR2',
    function (value) {
      const { receivedThr, receivedThrDays } = this.parent;
      return !(receivedThr === 'Yes' && value && Number(value) > Number(receivedThrDays));
    }
  ),
  likeConsumeThr: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { receivedThr } = this.parent;
      return !((receivedThr === 'Yes') && (!value || value.trim() === ''));
    }
  ),
  hhProvidedThr: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { receivedThr } = this.parent;
      return !((receivedThr === 'Yes') && (!value || value.trim() === ''));
    }
  ),
  vitA6Months: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childAgeMonths } = this.parent;
      return !(childAgeMonths > 9 && (!value || value.trim() === ''));
    }
  ),
  medicineWorm: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childAgeMonths } = this.parent;
      return !(childAgeMonths > 12 && (!value || value.trim() === ''));
    }
  ),
  iron6Months: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childAgeMonths } = this.parent;
      return !(childAgeMonths > 6 && (!value || value.trim() === ''));
    }
  ),
  ironDoses: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childAgeMonths, iron6Months } = this.parent;
      return !(childAgeMonths > 6 && iron6Months === 'Yes' && (!value || value.trim() === ''));
    }
  ),
  homeVisitAww: Yup.string()
    .required("This is required field")
    .test(
      'max-2-digits',
      'Must be at most 2 digits',
      value => !value || /^\d{1,2}$/.test(value)
    ),
  homeVisitAsha: Yup.string()
    .required("This is required field")
    .test(
      'max-2-digits',
      'Must be at most 2 digits',
      value => !value || /^\d{1,2}$/.test(value)
    ),
    current_wt: Yup.string()
        .test(
            'is-number-or-999',
            'upto 2 decimal number or 999',
            value => !value || value === '999' || /^\d+(\.\d{1,2})?$/.test(value)
        )
        .test(
            'min-value',
            'Must be at least 1 or 999',
            value => !value || value === '999' || parseFloat(value) >= 1
        )
        .test(
            'max-value',
            'Must be less than 999 or exactly 999',
            value => !value || value === '999' || parseFloat(value) < 999
        )
        .required("This is a required field"),
  currentHt: Yup.string()
        .test(
            'is-number-or-999',
            'upto 2 decimal number or 999',
            value => !value || value === '999' || /^\d+(\.\d{1,2})?$/.test(value)
        )
        .test(
            'min-value',
            'Must be at least 40 or 999',
            value => !value || value === '999' || parseFloat(value) >= 40
        )
        .test(
            'max-value',
            'Must be less than 999 or exactly 999',
            value => !value || value === '999' || parseFloat(value) < 999
        )
        .required("This is a required field"),
  presentBilateralOedema: Yup.string().required("This is required field"),
  nutritionalCategory: Yup.string().required("This is required field"),
  whzOutOfRange: Yup.boolean().test(
    'whz-range-check',
    'WHZ is out of valid range (−6 to +6). Please enter correct weight and height values.',
    value => !value
  ),
  childEnrollCmam: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { nutritionalCategory } = this.parent;
      return !((nutritionalCategory === 'SAM' || nutritionalCategory === 'MAM') && (!value || value.trim() === ''));
    }
  ),
  caregiversex_other: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { caregiversex } = this.parent;
      return !(caregiversex === 'Other' && (!value || value.trim() === ''));
    }
  ),
  childSex_other: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childSex } = this.parent;
      return !(childSex === 'Other' && (!value || value.trim() === ''));
    }
  ),
  awwCounsel: Yup.array().test(
    'conditional-required',
    'At least one option must be selected',
    function (value) {
      const { homeVisitAww } = this.parent;
      return !(Number(homeVisitAww) > 0 && (!value || value.length === 0));
    }
  ),
  ashaUsedtoInform: Yup.array().test(
    'conditional-required',
    'At least one option must be selected',
    function (value) {
      const { homeVisitAsha } = this.parent;
      return !(Number(homeVisitAsha) > 0 && (!value || value.length === 0));
    }
  ),
  ageGivingFluids: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { givingFluids, childAgeMonths } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === ''));
    }
  ).test(
    'valid-age',
    'Age must be between 0 and 24 months',
    function (value) {
      const { givingFluids, childAgeMonths } = this.parent;
      if (childAgeMonths < 24 && givingFluids === 'Yes' && value) {
        if (value === '99') return true;
        const age = Number(value);
        return age >= 0 && age <= 24;
      }
      return true;
    }
  ),
  ageGivingSemisolid: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { givingFluids, childAgeMonths } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === ''));
    }
  ).test(
    'valid-age',
    'Age must be between 0 and 24 months',
    function (value) {
      const { givingFluids, childAgeMonths } = this.parent;
      if (childAgeMonths < 24 && givingFluids === 'Yes' && value) {
        if (value === '99') return true;
        const age = Number(value);
        return age >= 0 && age <= 24;
      }
      return true;
    }
  ),
  ageGivingSolid: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { givingFluids, childAgeMonths } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === ''));
    }
  ).test(
    'valid-age',
    'Age must be between 0 and 24 months',
    function (value) {
      const { givingFluids, childAgeMonths } = this.parent;
      if (childAgeMonths < 24 && givingFluids === 'Yes' && value) {
        if (value === '99') return true;
        const age = Number(value);
        return age >= 0 && age <= 24;
      }
      return true;
    }
  ),
  weightLastMonthAww: Yup.string().required("This is a required field"),
  heightLastMonthAww: Yup.string().required("This is a required field"),
  childUndernourished: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { weightLastMonthAww, heightLastMonthAww } = this.parent;
      return !((weightLastMonthAww === 'Yes' || heightLastMonthAww === 'Yes') && (!value || value.trim() === ''));
    }
  ),
  givingFluids: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childAgeMonths } = this.parent;
      return !(childAgeMonths < 24 && (!value || value.trim() === ''));
    }
  ),
  weightNotMeasuredReason: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { weightLastMonthAww } = this.parent;
      return !(weightLastMonthAww === 'No' && (!value || value.trim() === ''));
    }
  ),
  heightNotMeasuredReason: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { heightLastMonthAww } = this.parent;
      return !(heightLastMonthAww === 'No' && (!value || value.trim() === ''));
    }
  ),
  positionHtMeasured: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { currentHt } = this.parent;
      return !(currentHt && currentHt !== '999' && String(currentHt) !== '999' && (!value || value.trim() === ''));
    }
  ),
  reasonWtNotMeasuring: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { current_wt } = this.parent;
      return !((current_wt === '999' || String(current_wt) === '999') && (!value || value.trim() === ''));
    }
  ),
  reasonHtNotMeasuring: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { currentHt } = this.parent;
      return !((currentHt === '999' || String(currentHt) === '999') && (!value || value.trim() === ''));
    }
  ),
  reasonNotAssessing: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { presentBilateralOedema } = this.parent;
      return !(presentBilateralOedema === 'Not assessed' && (!value || value.trim() === ''));
    }
  ),
  adviceChildHealthFacility: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childUndernourished } = this.parent;
      return !(childUndernourished === 'Yes' && (!value || value.trim() === ''));
    }
  ),
  receivedTreatment: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childUndernourished } = this.parent;
      return !(childUndernourished === 'Yes' && (!value || value.trim() === ''));
    }
  ),
  childUndernourishedType: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childUndernourished } = this.parent;
      return !(childUndernourished === 'Yes' && (!value || value.trim() === ''));
    }
  ),
  childVisitHealthFacility: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { adviceChildHealthFacility } = this.parent;
      return !(adviceChildHealthFacility === 'Yes' && (!value || value.trim() === ''));
    }
  ),
  childVisitHealthFacility_reason: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childVisitHealthFacility } = this.parent;
      return !(childVisitHealthFacility === 'No' && (!value || value.trim() === ''));
    }
  ),
  medicineConsumed: Yup.array().test(
    'conditional-required',
    'At least one option must be selected',
    function (value) {
      const { receivedTreatment } = this.parent;
      return !(receivedTreatment === 'Yes' && (!value || value.length === 0));
    }
  ),
  ashaInform: Yup.array().test(
    'conditional-required',
    'At least one option must be selected',
    function (value) {
      const { homeVisitAsha } = this.parent;
      return !(Number(homeVisitAsha) > 0 && (!value || value.length === 0));
    }
  ),
  awwDiscussion: Yup.array().test(
    'conditional-required',
    'At least one option must be selected',
    function (value) {
      const { homeVisitAww } = this.parent;
      return !(Number(homeVisitAww) > 0 && (!value || value.length === 0));
    }
  ),
  otherThanMilkGivenPreviousDay: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childBreastfeed, childAgeMonths } = this.parent;
      return !(childBreastfeed === 'Yes' && childAgeMonths < 6 && (!value || value.trim() === ''));
    }
  ),
  otherThanMilkGivenReason: Yup.array().test(
    'conditional-required',
    'At least one option must be selected',
    function (value) {
      const { childBreastfeed, childAgeMonths, otherThanMilkGivenPreviousDay } = this.parent;
      return !(childBreastfeed === 'Yes' && childAgeMonths < 6 && otherThanMilkGivenPreviousDay === 'Yes' && (!value || value.length === 0));
    }
  ),
  stillBreastfeeding: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childBreastfeed, childAgeMonths } = this.parent;
      return !(childBreastfeed === 'Yes' && childAgeMonths >= 6 && (!value || value.trim() === ''));
    }
  ),
  breastFeedMonth: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { childBreastfeed, childAgeMonths, stillBreastfeeding } = this.parent;
      return !(childBreastfeed === 'Yes' && childAgeMonths >= 6 && stillBreastfeeding === 'No' && (!value || value.trim() === ''));
    }
  ),
  reasonStoppedFeedingw: Yup.array().test(
    'conditional-required',
    'At least one option must be selected',
    function (value) {
      const { childBreastfeed, childAgeMonths, stillBreastfeeding } = this.parent;
      const isVisible = childBreastfeed === 'No' ||
        (childBreastfeed === 'Yes' && childAgeMonths >= 6 && stillBreastfeeding === 'No');
      return !(isVisible && (!value || value.length === 0));
    }
  ),
  foodYesterdayBreastmilk: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayPorridge: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayFortifiedFood: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayGrain: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayYellow: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayRoots: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayLeafy: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayFruits: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayOtherFruits: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayDryFruits: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayOrganMeat: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayChicken: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayEggs: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayFish: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayBeans: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayNuts: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayCheese: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayOil: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdaySugar: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  foodYesterdayOtherSweetened: Yup.string().test('conditional-required', 'This is a required field',
    function (value) { const { childAgeMonths, givingFluids } = this.parent;
      return !(childAgeMonths < 24 && givingFluids === 'Yes' && (!value || value.trim() === '')); }),
  otherThanMilkGiven_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { otherThanMilkGiven } = this.parent;
      return !(Array.isArray(otherThanMilkGiven) && otherThanMilkGiven.includes('Other') && (!value || value.trim() === ''));
    }
  ),
  otherThanMilkGivenReason_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { otherThanMilkGivenReason } = this.parent;
      return !(Array.isArray(otherThanMilkGivenReason) && otherThanMilkGivenReason.includes('Other') && (!value || value.trim() === ''));
    }
  ),
  reasonStoppedFeedingw_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { reasonStoppedFeedingw } = this.parent;
      return !(Array.isArray(reasonStoppedFeedingw) && reasonStoppedFeedingw.includes('Other') && (!value || value.trim() === ''));
    }
  ),
  medicineConsumed_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { medicineConsumed } = this.parent;
      return !(Array.isArray(medicineConsumed) && medicineConsumed.includes('Other') && (!value || value.trim() === ''));
    }
  ),
  awwDiscussion_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { awwDiscussion } = this.parent;
      return !(Array.isArray(awwDiscussion) && awwDiscussion.includes('other') && (!value || value.trim() === ''));
    }
  ),
  awwCounsel_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { awwCounsel } = this.parent;
      return !(Array.isArray(awwCounsel) && awwCounsel.includes('other') && (!value || value.trim() === ''));
    }
  ),
  ashaInform_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { ashaInform } = this.parent;
      return !(Array.isArray(ashaInform) && ashaInform.includes('other') && (!value || value.trim() === ''));
    }
  ),
  ashaUsedtoInform_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { ashaUsedtoInform, homeVisitAsha } = this.parent;
      return !(Number(homeVisitAsha) > 0 && Array.isArray(ashaUsedtoInform) && ashaUsedtoInform.includes('other') && (!value || value.trim() === ''));
    }
  ),
  weightNotMeasuredReason_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { weightNotMeasuredReason } = this.parent;
      return !(weightNotMeasuredReason === 'Other' && (!value || value.trim() === ''));
    }
  ),
  heightNotMeasuredReason_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { heightNotMeasuredReason } = this.parent;
      return !(heightNotMeasuredReason === 'Other' && (!value || value.trim() === ''));
    }
  ),
  childUndernourishedType_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { childUndernourishedType } = this.parent;
      return !(childUndernourishedType === 'Other' && (!value || value.trim() === ''));
    }
  ),
  reasonWtNotMeasuring_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { reasonWtNotMeasuring } = this.parent;
      return !(reasonWtNotMeasuring === 'Other' && (!value || value.trim() === ''));
    }
  ),
  reasonHtNotMeasuring_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { reasonHtNotMeasuring } = this.parent;
      return !(reasonHtNotMeasuring === 'Other' && (!value || value.trim() === ''));
    }
  ),
  reasonNotAssessing_other: Yup.string().test(
    'conditional-required', 'This is a required field',
    function (value) {
      const { reasonNotAssessing } = this.parent;
      return !(reasonNotAssessing === 'Other' && (!value || value.trim() === ''));
    }
  ),
});

const step0ValidationSchema = Yup.object({
  visitDate: Yup.string().required("This is required field"),
  state: Yup.string().required("This is required field"),
  district: Yup.string().required("This is required field"),
  block: Yup.string().required("This is required field"),
  village: Yup.string().required("This is required field"),
  villageCode: Yup.string()
    .required("This is a required field"),
  clusterCode: Yup.string().min(1, 'Max 2 digit allowed')
    .max(2, 'Max 2 digit allowed')
    .required("This is required field"),
  structureCode: Yup.string().min(1, 'Max 2 digit allowed')
    .max(2, 'Max 2 digit allowed')
    .required("This is required field"),
  householdNumber: Yup.number()
    .max(300, 'Max value 300 allowed')
    .required("This is a required field"),
  primaryCaregiver: Yup.string().required("This is required field"),
  careGiverInterview: Yup.string().required("This is required field"),
  primaryCaregiver_other: Yup.string().test(
    'conditional-required',
    'This is a required field',
    function (value) {
      const { primaryCaregiver } = this.parent;
      return primaryCaregiver !== 'Other' || (value && value.trim() !== '');
    }
  ),
});

/** Re-derive admin codes from selected labels so payload always has codes (drafts / edge cases). */
function enrichBiannualLocationCodes(v) {
  if (!v) return v;
  const out = { ...v };
  if (out.state) {
    const stateOpt = getStateOptions(out.state)?.[0];
    if (stateOpt?.state_code != null && stateOpt.state_code !== "") {
      out.stateCode = String(stateOpt.state_code);
    }
  }
  if (out.state && out.district) {
    const districtOpt = getDistrictOptionsByStateName(out.state)?.find((d) => d.text === out.district);
    if (districtOpt?.district_code != null && districtOpt.district_code !== "") {
      out.districtCode = String(districtOpt.district_code).padStart(3, "0");
    }
  }
  if (out.state && out.district && out.block) {
    const blockOpt = getBlockOptionsByDistrictName(out.state, out.district)?.find((b) => b.text === out.block);
    if (blockOpt?.block_code != null && blockOpt.block_code !== "") {
      out.blockCode = String(blockOpt.block_code).padStart(4, "0");
    }
  }
  if (out.state && out.district && out.block && out.village) {
    const villageOpt = getVillageOptionsByBlockName(out.state, out.district, out.block)?.find(
      (x) => x.text === out.village
    );
    if (villageOpt?.village_code != null && villageOpt.village_code !== "") {
      out.villageCode = String(villageOpt.village_code);
    }
  }
  return out;
}

const BiAnnual = () => {
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [address, setAddress] = useState({});
  const [showSnackBar, setShowSnackBar] = useState(false);
  const [snackBarMessage, setSnackBarMessage] = useState({ text: "", type: "" });
  const [coordinates, setCoordinates] = useState(null);
  const [hasValidCoordinates, setHasValidCoordinates] = useState(false);
  const [locationStatus, setLocationStatus] = useState('checking'); // 'checking', 'granted', 'denied', 'error', 'unavailable'
  const [locationError, setLocationError] = useState('');
  const isOnline = useNetworkStatus();
  // Load this form's active locations (online -> backend + cache, offline -> cache)
  // and re-render dropdowns once ready.
  useFormLocations("BI_ANNUAL");
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedVillage, setSelectedVillage] = useState(null);
  
  // Safe translation hook initialization with fallback
  const formTranslation = useFormTranslation('biannual');
  const t = formTranslation?.t || ((key) => {
    console.warn(`Translation not available for key: ${key}`);
    return key;
  });
  
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add location state
  const [showSaveOfflineOption, setShowSaveOfflineOption] = useState(false);
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsAppErrorMessage, setWhatsAppErrorMessage] = useState('');
  const [errorPayload, setErrorPayload] = useState(null);
  
  // Error reporting states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [currentError, setCurrentError] = useState(null);
  const [currentPayload, setCurrentPayload] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Consent management states
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingErrorReport, setPendingErrorReport] = useState(null);

  // Auto-save state management
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentFormValues, setCurrentFormValues] = useState({});
  const [draftToRestore, setDraftToRestore] = useState(null);
  const formKey = useRef(`biannual_${Date.now()}_${location.pathname}`).current; // Stable form key
  
  // Location capture refs
  const locationTimeoutRef = useRef(null);
  const locationRetryCount = useRef(0);
  const maxLocationRetries = 3;
  
  // Auto-save hook at component level
  const autoSave = useFormAutoSave(
    'biannual',
    formKey,
    currentFormValues,
    coordinates,
    true,
    3000 // Save every 3 seconds
  );
  
  // Prevent accidental page reload
  const { confirmNavigation } = usePreventPageReload(
    hasUnsavedChanges,
    "You have unsaved form data. Are you sure you want to leave?"
  );

  // Track if form has been modified
  useEffect(() => {
    const hasData = Object.values(currentFormValues).some(value => {
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    });
    setHasUnsavedChanges(hasData);
  }, [currentFormValues]);

  // Enhanced location capture with localStorage caching
  useEffect(() => {
    const getLocation = async () => {
      try {
        setLocationStatus('checking');
        setLocationError('');
        
        const locationData = await getLocationWithFallback();
        
        setCoordinates({
          lat: locationData.lat,
          lng: locationData.lng,
          accuracy: locationData.accuracy
        });
        
        setLocationStatus('granted');
        setHasValidCoordinates(!locationData.fallback);
        
        if (locationData.fallback) {
          setLocationError('Location unavailable. Form can still be submitted with default coordinates.');
        } else if (locationData.cached) {
          setLocationError('Using cached location data');
        } else {
          setLocationError('');
        }
      } catch (error) {
        console.error("❌ BiAnnual: Location error:", error);
        setCoordinates({ lat: 0, lng: 0 });
        setHasValidCoordinates(false);
        setLocationStatus('error');
        setLocationError(`Location error: ${error.message}. Form can still be submitted with default coordinates.`);
      }
    };

    getLocation();
  }, []);

  // Monitor coordinates state changes
  useEffect(() => {
    if (coordinates && coordinates.lat && coordinates.lng) {
      const isValid = coordinates.lat !== 0 && coordinates.lng !== 0;
      setHasValidCoordinates(isValid);
    }
  }, [coordinates]);

  // Retry location capture function
  const retryLocationCapture = async () => {
    try {
      setLocationStatus('checking');
      setLocationError('');
      
      const locationData = await getLocationWithFallback();
      
      setCoordinates({
        lat: locationData.lat,
        lng: locationData.lng,
        accuracy: locationData.accuracy
      });
      
      setLocationStatus('granted');
      setHasValidCoordinates(!locationData.fallback);
      
      if (locationData.fallback) {
        setLocationError('Location unavailable. Using default coordinates.');
      } else if (locationData.cached) {
        setLocationError('Using cached location data');
      } else {
        setLocationError('');
      }
    } catch (error) {
      console.error("❌ BiAnnual: Retry location error:", error);
      setCoordinates({ lat: 0, lng: 0 });
      setHasValidCoordinates(false);
      setLocationStatus('error');
      setLocationError('Failed to capture location. Using default coordinates.');
    }
  };

  const handleGoBack = () => {
    confirmNavigation(() => {
      navigate(-1);
    });
  };

  const handleCloseSnackBar = () => {
    setShowSnackBar(false);
  };

  // Consent and error handling functions
  const handleConsentGiven = () => {
    setShowConsentDialog(false);
    if (pendingErrorReport) {
      const { formType, errorMessage, payload } = pendingErrorReport;
      sendSilentWhatsAppReport(formType, errorMessage, payload);
      setPendingErrorReport(null);
    }
  };

  const checkAndRequestConsent = (formType, errorMessage, payload) => {
    const consentStatus = getConsentStatus();
    if (consentStatus === 'granted') {
      sendSilentWhatsAppReport(formType, errorMessage, payload);
    } else if (consentStatus === 'denied') {
      // User has denied consent, don't send report
    } else {
      // Consent not determined yet, show dialog
      setPendingErrorReport({ formType, errorMessage, payload });
      setShowConsentDialog(true);
    }
  };

  const handleNext = async (values, actions) => {
    
    const currentValidationSchema = step === 0 ? step0ValidationSchema : step1ValidationSchema;
    
    try {
      await currentValidationSchema.validate(values, { abortEarly: false });
      setStep((prevStep) => prevStep + 1);
      actions.setTouched({});
    } catch (err) {
      const errors = {};
      err.inner.forEach((validationError) => {
        errors[validationError.path] = validationError.message;
      });
      actions.setTouched(
        Object.keys(values).reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {})
      );
      actions.setErrors(errors);
      setTimeout(() => {
        const element = document.querySelector(`[name="${Object.keys(errors)[0]}"]`);
        element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 500);
    }
  };

  const handleBack = () => {
    setStep(0);
  };

  // Helper function to get current date
  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const initialValues = {
    responseMode: 'online',
    visitDate: getCurrentDate(),
    state: '',
    stateCode: '',
    district: '',
    districtCode: '',
    //subDistrict : '',
    block: '',
    blockCode: '',
    village:'',
    villageCode: '',
    clusterCode: '',
    structureCode: '',
    householdNumber: '',
    childId: '',
    primaryCaregiver: '',
    careGiverInterview: '',
    caregiverName: '',
    caregiversex: '',
    caregiverAge: '',
    caregiverEducation: '',
    childName: '',
    childSex: '',
    childDob: '',
    childAgeMonths: 0,
    givingFluids: '',
    ageGivingFluids: '',
    ageGivingSemisolid: '',
    ageGivingSolid: '',
    foodYesterday: '',
    receivedThr: '',
    receivedThrDays: '',
    consumeThrDays: '',
    likeConsumeThr: '',
    hhProvidedThr: '',
    childUndernourished: '',
    receivedTreatment: '',
    receivedTreatmentWhere: '',
    treatmentAww: '',
    admitted6Months: '',
    vitA6Months: '',
    medicineWorm: '',
    iron6Months: '',
    ironDoses: '',
    homeVisitAww: '',
    homeVisitAsha: '',
    childWeightLastmonth: '',
    childHtMeasured: '',
    childHtWtUpdated: '',
    current_wt: '',
    currentHt: '',
    presentBilateralOedema: '',
    reasonNotAssessing: '',
    currentMuac: '',
    reasonNotMeasuing: '',
    nutritionalCategory: '',
    whzOutOfRange: false,
    childEnrollCmam: '',
    reasonNotEnrollCmam: '',
    daysChildTreated: '',
    relevantInfo: '',
    primaryCaregiver_other: '',
    caregiversex_other: '',
    childSex_other: '',
    receivedTreatmentWhere_other: '',
    medicineConsumed_other: '',
    reasonAdmitted_other: '',
    reasonNotAssessing_other: '',
    nutritionalCategory_other: '',
    therThanMilkGiven_other: '',
    reasonStoppedFeedingw: [],
    medicineConsumed: [],
    reasonAdmitted: [],
    otherThanMilkGiven: [],
    otherThanMilkGiven_other: '',
    otherThanMilkGivenPreviousDay: '',
    otherThanMilkGivenReason: [],
    otherThanMilkGivenReason_other: '',
    reasonStoppedFeedingw_other: '',
    reasonWtNotMeasuring: '',
    reasonHtNotMeasuring: '',
    reasonWtNotMeasuring_other: '',
    reasonHtNotMeasuring_other: '',
    positionHtMeasured: '',
    childBreastfeed: '',
    firstMilk: '',
    otherThanMilk: '',
    stillBreastfeeding: '',
    breastFeedMonth: '',
    foodYesterdayBreastmilk: '',
    foodYesterdayPorridge: '',
    foodYesterdayFortifiedFood: '',
    foodYesterdayGrain: '',
    foodYesterdayYellow: '',
    foodYesterdayRoots: '',
    foodYesterdayLeafy: '',
    foodYesterdayFruits: '',
    foodYesterdayOtherFruits: '',
    foodYesterdayDryFruits: '',
    foodYesterdayOrganMeat: '',
    foodYesterdayChicken: '',
    foodYesterdayEggs: '',
    foodYesterdayFish: '',
    foodYesterdayBeans: '',
    foodYesterdayNuts: '',
    foodYesterdayCheese: '',
    foodYesterdayOil: '',
    foodYesterdaySugar: '',
    foodYesterdayOtherSweetened: '',
    awwDiscussion: [],
    awwDiscussion_other: '',
    awwCounsel: [],
    awwCounsel_other: '',
    ashaInform: [],
    ashaInform_other: '',
    ashaUsedtoInform: [],
    ashaUsedtoInform_other: '',
    childBreastfeedFirstTime: '',
    noOfDays: '',
    noOfHours: '',
    noOfMins: '',
    typeOfUndernutiration: '',
    typeOfUndernutiration_other: '',
    // GMT fields
    weightLastMonthAww: '',
    weightNotMeasuredReason: '',
    weightNotMeasuredReason_other: '',
    heightLastMonthAww: '',
    heightNotMeasuredReason: '',
    heightNotMeasuredReason_other: '',
    childUndernourishedType: '',
    childUndernourishedType_other: '',
    adviceChildHealthFacility: '',
    childVisitHealthFacility: '',
    childVisitHealthFacility_reason: '',
    latitude: '',
    longitude: '',
  };

  const handleSubmit = async (values, { resetForm, setSubmitting }) => {
    // Disable submit button immediately
    setSubmitButtonDisabled(true);
    setLoadingStatus(true);
    setShowSaveOfflineOption(false); // Hide Save Offline button when starting new submission
    
    // If offline, save directly to IndexedDB
    if (!isOnline) {
      handleSaveOffline(values, { resetForm, setSubmitting });
      return;
    }

    // Always allow submission - location is not mandatory for form submission
    // Use captured coordinates if available, otherwise use fallback (0,0)
    const finalCoordinates = coordinates || { lat: 0, lng: 0 };
    

    // Helper function to handle array fields with other option
    const processArrayWithOther = (array, otherValue) => {
      if (!Array.isArray(array)) return array || '';
      const values = [...array];
      const otherIndex = values.findIndex((v) => v.toLowerCase() === 'other');
      if (otherValue && otherIndex !== -1) {
        values.splice(otherIndex, 1);
        values.push(`Other - ${otherValue}`);
      }
      return values.join(',');
    };

    // Process the form data to convert arrays to strings
    const processedValues = {
      ...enrichBiannualLocationCodes(values),
      reasonStoppedFeedingw: processArrayWithOther(values.reasonStoppedFeedingw, values.reasonStoppedFeedingw_other),
      medicineConsumed: processArrayWithOther(values.medicineConsumed, values.medicineConsumed_other),
      reasonAdmitted: processArrayWithOther(values.reasonAdmitted, values.reasonAdmitted_other),
      otherThanMilkGiven: processArrayWithOther(values.otherThanMilkGiven, values.otherThanMilkGiven_other),
      otherThanMilkGivenReason: processArrayWithOther(values.otherThanMilkGivenReason, values.otherThanMilkGivenReason_other),
      awwDiscussion: processArrayWithOther(values.awwDiscussion, values.awwDiscussion_other),
      awwCounsel: processArrayWithOther(values.awwCounsel, values.awwCounsel_other),
      ashaInform: processArrayWithOther(values.ashaInform, values.ashaInform_other),
      ashaUsedtoInform: processArrayWithOther(values.ashaUsedtoInform, values.ashaUsedtoInform_other)
    };

    // DEBUG — remove after verifying other_text fix
    console.log('[DEBUG] ashaInform raw:', values.ashaInform, '| other text:', values.ashaInform_other);
    console.log('[DEBUG] ashaInform processed:', processedValues.ashaInform);
    console.log('[DEBUG] awwDiscussion processed:', processedValues.awwDiscussion);

    // Always include coordinates in payload (either captured or fallback)
    const payload = { 
      ...processedValues, 
      latitude: finalCoordinates.lat?.toString() || '0', 
      longitude: finalCoordinates.lng?.toString() || '0'
    };

    try {
      const res = await apiService.post('/form/biannual', payload);
      setLoadingStatus(false);
      setSubmitting(false);
      
      // Check for actual success: only statusCode: 200 indicates success
      if (res.statusCode === 200) {
        // Increment daily count for surveyors and sync with API
        if (isSurveyorUser()) {
          try {
            incrementDailyCount(null, 'concurrent');
            syncAfterSubmission(apiService, 'concurrent').catch((error) => {
              console.error('Error syncing daily count with API:', error);
            });
          } catch (error) {
            console.error('Error updating daily count:', error);
          }
        }

        setShowSaveOfflineOption(false); // Hide Save Offline button on successful submission
        setShowSnackBar(true);
        setSnackBarMessage({
          text: hasValidCoordinates 
            ? "Form submitted successfully with location data!" 
            : "Form submitted successfully with default coordinates!",
          type: "success",
        });

        resetForm();
        setTimeout(() => {
          navigate("/survey/list", { replace: true });
        }, 1000);
      } else {
        // Handle backend errors (including 200 responses with error statusCode)
        const backendMessage = res.message || res.error || "Form submission failed";
        const errorStatusCode = res.statusCode || 'Unknown';
        
        setShowSnackBar(true);
        setSnackBarMessage({
          text: `Submission failed: ${backendMessage}. Please try again.`,
          type: "error",
        });
        
        // Show WhatsApp contact dialog for backend errors
        setWhatsAppErrorMessage(`Backend Error (${errorStatusCode}): ${backendMessage}`);
        setErrorPayload(payload);
        setShowWhatsAppDialog(true);
      }
    } catch (error) {
      // Handle network/server errors with improved error messages
      console.error('BiAnnual form submission error:', error);
      const statusCode = error.response?.status || error.status;
      
      if (statusCode === 401 || statusCode === 403) {
        setShowSnackBar(true);
        setSnackBarMessage({
          text: "Session expired. Please login again.",
          type: "error",
        });
        return;
      }
      
      if (statusCode >= 500) {
        setShowSnackBar(true);
        setSnackBarMessage({
          text: "Server error. Please try again later.",
          type: "error",
        });
        
        // Show WhatsApp contact dialog for server errors
        setWhatsAppErrorMessage(`Server Error (${statusCode}): Please try again later or contact support`);
        setErrorPayload(payload);
        setShowWhatsAppDialog(true);
        return;
      }
      
      const backendMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      setShowSnackBar(true);
      setSnackBarMessage({
        text: `Error: ${backendMessage}. Please try again.`,
        type: "error",
      });
      
      // Show WhatsApp contact dialog for other errors
      setWhatsAppErrorMessage(`Network/Connection Error: ${backendMessage}`);
      setErrorPayload(payload);
      setShowWhatsAppDialog(true);
    }
  };

  const handleSubmissionFailure = (payload, resetForm, setSubmitting, response) => {
    setLoadingStatus(false);
    setSubmitting(false);
    setSubmitButtonDisabled(false);
    setShowSaveOfflineOption(true); // Show Save Offline button after API failure
    
    // Create error object for the dialog
    const error = {
      status: response?.statusCode || 'Unknown',
      message: response?.message || response?.error || "Form submission failed",
      response: { data: response }
    };
    
    // Show error dialog
    setCurrentError(error);
    setCurrentPayload(payload);
    setShowErrorDialog(true);
  };

  const handleSubmissionError = (error, payload, resetForm, setSubmitting) => {
    console.error('Form submission error:', error);
    setLoadingStatus(false);
    setSubmitting(false);
    setSubmitButtonDisabled(false);
    setShowSaveOfflineOption(true); // Show Save Offline button after API failure
    
    const statusCode = error.response?.status || error.status;
    
    // Handle authentication/authorization errors
    if (statusCode === 401 || statusCode === 403) {
      setShowSnackBar(true);
      setSnackBarMessage({
        text: "Session expired. Please login again.",
        type: "error",
      });
      return;
    }
    
    // For all other errors, show error dialog
    setCurrentError(error);
    setCurrentPayload(payload);
    setShowErrorDialog(true);
  };

  const handleSaveOffline = async (values, { resetForm, setSubmitting }) => {
    // Disable submit button immediately
    setSubmitButtonDisabled(true);
    setLoadingStatus(true);

    // Helper function to handle array fields with other option
    const processArrayWithOther = (array, otherValue) => {
      if (!Array.isArray(array)) return array || '';
      const values = [...array];
      const otherIndex = values.findIndex((v) => v.toLowerCase() === 'other');
      if (otherValue && otherIndex !== -1) {
        values.splice(otherIndex, 1);
        values.push(`Other - ${otherValue}`);
      }
      return values.join(',');
    };

    // Process the form data to convert arrays to strings
    const processedValues = {
      ...enrichBiannualLocationCodes(values),
      reasonStoppedFeedingw: processArrayWithOther(values.reasonStoppedFeedingw, values.reasonStoppedFeedingw_other),
      medicineConsumed: processArrayWithOther(values.medicineConsumed, values.medicineConsumed_other),
      reasonAdmitted: processArrayWithOther(values.reasonAdmitted, values.reasonAdmitted_other),
      otherThanMilkGiven: processArrayWithOther(values.otherThanMilkGiven, values.otherThanMilkGiven_other),
      otherThanMilkGivenReason: processArrayWithOther(values.otherThanMilkGivenReason, values.otherThanMilkGivenReason_other),
      awwDiscussion: processArrayWithOther(values.awwDiscussion, values.awwDiscussion_other),
      awwCounsel: processArrayWithOther(values.awwCounsel, values.awwCounsel_other),
      ashaInform: processArrayWithOther(values.ashaInform, values.ashaInform_other),
      ashaUsedtoInform: processArrayWithOther(values.ashaUsedtoInform, values.ashaUsedtoInform_other)
    };

    const finalCoordinates = coordinates || { lat: 0, lng: 0 };
    const payload = {
      ...processedValues,
      latitude: finalCoordinates?.lat ? finalCoordinates.lat.toString() : (values.latitude || '0'),
      longitude: finalCoordinates?.lng ? finalCoordinates.lng.toString() : (values.longitude || '0')
    };
    
    try {
      await saveOfflineForm({ url: '/form/biannual', data: { ...payload, responseMode: 'offline' } });
      
      // Clear auto-save draft after offline save
      await autoSave.clearDraft();
      setHasUnsavedChanges(false);
      
      resetForm();
      if(setSubmitting) setSubmitting(false);
      setShowSnackBar(true);
      setShowSaveOfflineOption(false);
      setSnackBarMessage({
        text: "Form saved offline. It will sync when you're online.",
        type: "warning",
      });
      setTimeout(() => {
        navigate("/survey/list", { replace: true });
      }, 3000);
    } catch (error) {
      console.error('Error saving form offline:', error);
      setShowSnackBar(true);
      setSnackBarMessage({
        text: "Failed to save form offline. Please try again.",
        type: "error",
      });
      setSubmitButtonDisabled(false);
      setLoadingStatus(false);
      if(setSubmitting) setSubmitting(false);
    }
  };

  // Get today's date in the format YYYY-MM-DD
  const date = new Date();

  const today = date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');

  const resolveChildId = formValue => {
    try {
      const formattedDistrictCode = address?.district_code ? address.district_code.toString().padStart(3, '0') : '000';
      const formattedBlockCode = address?.block_code ? address.block_code.toString().padStart(4, '0') : '0000';
      const formattedVillageCode = formValue?.villageCode ? formValue.villageCode.toString().padStart(2, '0') : '00';
      const formattedClusterCode = formValue?.clusterCode ? formValue.clusterCode.toString().padStart(2, '0') : '00';
      const formattedStructureCode = formValue?.structureCode ? formValue.structureCode.toString().padStart(2, '0') : '00';
      const formattedHouseholdNumber = formValue?.householdNumber ? formValue.householdNumber.toString().padStart(3, '0') : '000';
      // Concatenate all formatted values
      const childId = formattedDistrictCode + formattedBlockCode + formattedVillageCode + formattedClusterCode + formattedStructureCode + formattedHouseholdNumber;

      return childId;
    } catch (error) {
      console.error('Error in resolveChildId:', error);
      return 'ERROR_GENERATING_ID';
    }
  }

  // Calculate child age in months from date of birth
  const getDobMonths = date => {
    if (date) {
      const selectedDate = new Date(date);
      const today = new Date();
      const months = today.getMonth() - selectedDate.getMonth() +
        (12 * (today.getFullYear() - selectedDate.getFullYear()));

      return months;
    }
    return 0;
  }

  // ----- Local component to safely use hooks with Formik values -----
  const FormObserver = () => {
    const { values, setFieldValue } = useFormikContext();

    // Keep latest values for auto-save
    useEffect(() => {
      setCurrentFormValues(values);
    }, [values]);

    // Inject coordinates once they are available
    useEffect(() => {
      if (coordinates && (!values.latitude || !values.longitude)) {
        setFieldValue("latitude", coordinates.lat?.toString() || "0");
        setFieldValue("longitude", coordinates.lng?.toString() || "0");
      }
    }, [coordinates, values.latitude, values.longitude, setFieldValue]);

    // Restore draft if requested
    useEffect(() => {
      if (draftToRestore && draftToRestore.formData) {
        Object.keys(draftToRestore.formData).forEach(k => {
          setFieldValue(k, draftToRestore.formData[k]);
        });
        if (draftToRestore.coordinates) setCoordinates(draftToRestore.coordinates);
        setDraftToRestore(null);
      }
    }, [draftToRestore, setFieldValue]);

    return null;
  };

  // Error dialog handlers
  const handleErrorDialogClose = () => {
    setShowErrorDialog(false);
    setCurrentError(null);
    setCurrentPayload(null);
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setShowErrorDialog(false);
    // Retry the form submission
    if (currentPayload) {
      handleSubmit(currentPayload, { 
        resetForm: () => {}, 
        setSubmitting: () => {} 
      });
    }
    setIsRetrying(false);
  };

  const handleErrorSaveOffline = () => {
    if (currentPayload) {
      handleSaveOffline(currentPayload, { 
        resetForm: () => {}, 
        setSubmitting: () => {} 
      });
    }
  };

  return (
    <>
      <SnackBar
        message={snackBarMessage.text}
        open={showSnackBar}
        handleClose={handleCloseSnackBar}
        type={snackBarMessage.type}
      />
      <ConsentDialog
        open={showConsentDialog}
        onClose={() => setShowConsentDialog(false)}
        onConsentGiven={handleConsentGiven}
      />
      <ErrorReportingDialog
        open={showErrorDialog}
        onClose={handleErrorDialogClose}
        onRetry={handleRetry}
        onSaveOffline={handleErrorSaveOffline}
        isRetrying={isRetrying}
        error={currentError}
      />
      <div>
        <Container maxWidth="lg">
          <Box my={4} p={4} className={styles.paper} sx={{
            '@media (max-width: 768px)': {
              p: 3,
              my: 2
            },
            '@media (max-width: 480px)': {
              p: 2,
              my: 1
            }
          }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
              <Box display="flex" alignItems="center">
                <IconButton
                  onClick={handleGoBack}
                  sx={{ mr: 2 }}
                  aria-label="Go back"
                >
                  <ArrowBack />
                </IconButton>
                <Typography variant="h3" className={styles.heading}>{t('concurrent_assessment')}</Typography>
              </Box>
              {/* <Button
                variant="outlined"
                size="small"
                startIcon={<PictureAsPdf />}
                onClick={generateQuestionnairePDF}
                sx={{ whiteSpace: 'nowrap', ml: 2 }}
              >
                Download Questionnaire
              </Button> */}
            </Box>
            
            {/* Location Status Display */}
            <Box mb={3}>
              {locationStatus === 'checking' && (
                <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOn sx={{ mr: 1 }} />
                  Checking location access... (Form can be submitted regardless)
                </Alert>
              )}
              
              {locationStatus === 'denied' && (
                <Alert severity="warning" sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOff sx={{ mr: 1 }} />
                  Location access denied. Form will be submitted with {coordinates?.cached ? 'cached' : 'default'} coordinates.
                  <Button size="small" onClick={retryLocationCapture} sx={{ ml: 2 }}>
                    Try Again
                  </Button>
                </Alert>
              )}
              
              {locationStatus === 'error' && !locationError.includes('cached') && (
                <Alert severity="warning" sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOff sx={{ mr: 1 }} />
                  {locationError}
                  <Button size="small" onClick={retryLocationCapture} sx={{ ml: 2 }}>
                    Try Again
                  </Button>
                </Alert>
              )}
              

            </Box>

            <Formik
              initialValues={initialValues}
              enableReinitialize={false}
              validationSchema={(values) =>
                step === 0 ? step0ValidationSchema : step1ValidationSchema}
              onSubmit={async (values, actions) => {
                console.log("Caregiver interview:", values.careGiverInterview);
                console.log("Step 1 condition:", step === 1);
                console.log("Caregiver No condition:", values.careGiverInterview === 'No');
                console.log("Should submit:", step === 1 || values.careGiverInterview === 'No');
                
                if (step === 1 || values.careGiverInterview === 'No') {
                  console.log("✅ Proceeding to handleFormSubmit");
                  
                  // Validate before submission
                  const currentValidationSchema = step === 0 ? step0ValidationSchema : step1ValidationSchema;
                  try {
                    await currentValidationSchema.validate(values, { abortEarly: false });
                    console.log("✅ Final validation passed, submitting form");
                    
                    const valuesWithCoordinates = {
                      ...values,
                      latitude: coordinates?.lat?.toString() || values.latitude || '0',
                      longitude: coordinates?.lng?.toString() || values.longitude || '0'
                    };
                    await handleSubmit(valuesWithCoordinates, actions);
                  } catch (err) {
                    console.log("❌ Final validation failed:", err);
                    const errors = {};
                    err.inner.forEach((validationError) => {
                      errors[validationError.path] = validationError.message;
                    });
                    actions.setTouched(
                      Object.keys(values).reduce((acc, field) => {
                        acc[field] = true;
                        return acc;
                      }, {})
                    );
                    actions.setErrors(errors);
                    
                    // Show snackbar with error message
                    setShowSnackBar(true);
                    setSnackBarMessage({
                      text: `Please fill all required fields. ${Object.keys(errors).length} field(s) have errors.`,
                      type: "error",
                    });
                    
                    // Scroll to first error
                    setTimeout(() => {
                      const element = document.querySelector(`[name="${Object.keys(errors)[0]}"]`);
                      element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    }, 500);
                  }
                } else {
                  console.log("➡️ Moving to next step");
                  await handleNext(values, actions);
                }
              }}
            >
              {({ values, handleChange, handleBlur, errors, touched, isValid, dirty, setErrors, setTouched, setFieldValue, handleSubmit, isSubmitting, resetForm }) => {
                
                return (
                <Form>
                  {/* WHZ auto-calculator: watches ANTH1/ANTH2/sex/age → auto-sets ANTH4 */}
                  <WHZAutoCalculator />
                  {/* Auto-save indicator */}
                  <AutoSaveIndicator
                    lastSaved={autoSave.lastSaved}
                    isSaving={autoSave.isSaving}
                    isDraftRestored={autoSave.isDraftRestored}
                    onClearDraft={autoSave.clearDraft}
                    showDraftAlert={true}
                  />
                  <FormObserver />

                  {step === 0 && (
                    <>
                      <Box className={styles.formSection}>
                        <Box className={styles.sectionHeader}>
                          <Box className={styles.sectionIcon}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                              📋
                            </Typography>
                          </Box>
                          <Box>
                            <Typography className={styles.sectionTitle}>
                              {t('general_information')}
                            </Typography>
                            <Typography className={styles.sectionSubtitle}>
                              Basic location and demographic information
                            </Typography>
                          </Box>
                        </Box>
                        <Grid container rowSpacing={2} sx={{
                          margin: '0',
                          width: '100%'
                        }}>
                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.visitDate && !!errors.visitDate,
                          }} >
                            <label className={styles.label} htmlFor="visitDate">
                              {t('date_of_visit')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="date"
                              name="visitDate"
                              id="visitDate"
                              value={values.visitDate}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              fullWidth={false}
                              error={touched.visitDate && !!errors.visitDate}
                              helperText={touched.visitDate && errors.visitDate}
                              inputProps={{ max: today }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.state && !!errors.state,
                          }}>
                            <label className={styles.label} htmlFor="state">
                              {t('state')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <Select
                              size="small"
                              name="state"
                              id="state"
                              placeholder="Select one"
                              className={styles.formInput}
                              value={values.state}
                              onChange={(e) => {
                                const { value } = e.target;
                                setFieldValue("state", value);
                                const stateData = getStateOptions(value)[0];
                                setAddress(stateData || {});
                                setFieldValue(
                                  'stateCode',
                                  stateData?.state_code != null && stateData.state_code !== ''
                                    ? String(stateData.state_code)
                                    : ''
                                );
                                setFieldValue('districtCode', '');
                                setFieldValue('blockCode', '');
                              }}
                              onBlur={handleBlur}
                              error={touched.state && !!errors.state}
                            >
                              <MenuItem value={null} disabled>{t('select_state')}</MenuItem>
                              {getStateOptions().map((state, i) => (
                                <MenuItem key={i} value={state.text}>{state.text}</MenuItem>
                              ))}
                            </Select>
                            {touched.state && errors.state ? (
                              <div className={styles.error}>{errors.state}</div>
                            ) : null}
                          </Grid>

                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.district && !!errors.district,
                          }}>
                            <label className={styles.label} htmlFor="district">
                              {t('district')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <Select
                              size="small"
                              className={styles.formInput}
                              name="district"
                              id="district"
                              placeholder="Select one"
                              value={values.district}
                              onChange={(e) => {
                                const { value } = e.target;
                                setFieldValue("district", value);
                                setFieldValue("block", '');
                                setFieldValue("village", '');
                                setFieldValue("villageCode", '');
                                setSelectedVillage(null);
                                const districtData = address.state_code ? getDistrictOptions(address.state_code).find(e => e.text === value) : null;
                                setAddress(districtData || {});
                                setFieldValue(
                                  'districtCode',
                                  districtData?.district_code != null && districtData.district_code !== ''
                                    ? String(districtData.district_code).padStart(3, '0')
                                    : ''
                                );
                                setFieldValue('blockCode', '');
                              }}
                              onBlur={handleBlur}
                              error={touched.district && !!errors.district}
                            >
                              <MenuItem value={null} disabled>{t('select_district')}</MenuItem>
                              {values.state && address.state_code && getDistrictOptions(address.state_code).map((district, i) => (
                                <MenuItem key={i} value={district.text}>{district.text}</MenuItem>
                              ))}
                            </Select>
                            {touched.district && errors.district ? (
                              <div className={styles.error}>{errors.district}</div>
                            ) : null}
                          </Grid>

                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.block && !!errors.block,
                          }}>
                            <label className={styles.label} htmlFor="block">
                              {t('block_name')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <Select
                              size="small"
                              className={styles.formInput}
                              name="block"
                              id="block"
                              placeholder="Select Block"
                              value={values.block}
                              onChange={(e) => {
                                const { value } = e.target;
                                setFieldValue("block", value);
                                setFieldValue("village", '');
                                setFieldValue("villageCode", '');
                                setSelectedVillage(null);
                                const blockData = address.district_code ? getBlockOptions(address.district_code).find(e => e.text === value) : null;
                                setAddress(blockData || {});
                                setFieldValue(
                                  'blockCode',
                                  blockData?.block_code != null && blockData.block_code !== ''
                                    ? String(blockData.block_code).padStart(4, '0')
                                    : ''
                                );
                              }}
                              onBlur={handleBlur}
                              error={touched.block && !!errors.block}
                            >
                              <MenuItem value={null} disabled>Select Block</MenuItem>
                              {values.state && values.district && address.district_code && getBlockOptions(address.district_code).map((block, i) => (
                                <MenuItem key={i} value={block.text}>{block.text}</MenuItem>
                              ))}
                            </Select>
                            {touched.block && errors.block ? (
                              <div className={styles.error}>{errors.block}</div>
                            ) : null}
                          </Grid>
                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.village && !!errors.village,
                          }}>
                            <label className={styles.label} htmlFor="village">
                              {t('village_name')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <Select
                              size="small"
                              className={styles.formInput}
                              name="village"
                              id="village"
                              displayEmpty
                              value={values.village}
                              onChange={(e) => {
                                const { value } = e.target;
                                setFieldValue("village", value);
                                if (value) {
                                  const villageData = address.block_code ? getVillageOptions(address.block_code).find(v => v.text === value) : null;
                                  setSelectedVillage(villageData);
                                  setFieldValue("villageCode", villageData ? villageData.village_code.toString().padStart(2, '0') : '');
                                } else {
                                  setSelectedVillage(null);
                                  setFieldValue("villageCode", '');
                                }
                              }}
                              onBlur={handleBlur}
                              error={touched.village && !!errors.village}
                            >
                              <MenuItem value={null} disabled>Select Village</MenuItem>
                              {values.state && values.district && values.block && address.block_code && getVillageOptions(address.block_code).map((village, i) => (
                                <MenuItem key={i} value={village.text}>{village.text}</MenuItem>
                              ))}
                            </Select>
                            {touched.village && errors.village ? (
                              <div className={styles.error}>{errors.village}</div>
                            ) : null}
                          </Grid>

                          {selectedVillage ? (
                            <Box sx={{ 
                              p: 1.5, 
                              backgroundColor: '#f5f5f5', 
                              borderRadius: 1, 
                              border: '1px solid #ddd',
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                                {values.villageCode}
                              </Typography>
                            </Box>
                          ) : (
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="text"
                              name="villageCode"
                              id="villageCode"
                              value={values.villageCode}
                              InputProps={{
                                readOnly: true,
                              }}
                              placeholder="Select village to see code"
                              error={touched.villageCode && !!errors.villageCode}
                              helperText={touched.villageCode && errors.villageCode}
                            />
                          )}

                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.clusterCode && !!errors.clusterCode,
                          }}>
                            <label className={styles.label} htmlFor="clusterCode">
                              {t('cluster_code')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('cluster_code_instruction')}</em>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="number"
                              name="clusterCode"
                              id="clusterCode"
                              value={values.clusterCode}
                              onChange={(e) => {
                                const { value } = e.target;
                                const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                if (regex.test(value)) {
                                  handleChange(e); // Allow the change if it matches the regex
                                }
                              }}
                              onBlur={handleBlur}
                              onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                              error={touched.clusterCode && !!errors.clusterCode}
                              helperText={touched.clusterCode && errors.clusterCode}

                            />
                          </Grid>

                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.structureCode && !!errors.structureCode,
                          }}>
                            <label className={styles.label} htmlFor="structureCode">
                              {t('structure_code')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('family_type_instruction')}</em>
                            <Select
                              size="small"
                              name="structureCode"
                              id="structureCode"
                              placeholder="Select one"
                              className={styles.formInput}
                              value={values.structureCode}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              error={touched.structureCode && !!errors.structureCode}
                            >
                              <MenuItem value='01'>01</MenuItem>
                              <MenuItem value='02'>02</MenuItem>
                            </Select>
                            {touched.structureCode && errors.structureCode ? (
                              <div className={styles.error}>{errors.structureCode}</div>
                            ) : null}
                          </Grid>

                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.householdNumber && !!errors.householdNumber,
                          }}>
                            <label className={styles.label} htmlFor="householdNumber">
                              {t('household_number')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('household_number_instruction')}</em>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="number"
                              name="householdNumber"
                              id="householdNumber"
                              value={values.householdNumber}
                              onChange={(e) => {
                                const value = e.target.value;
                                const regex = /^\d{0,3}$/; // Regex to allow only numbers and max 3 digits
                                if (regex.test(value)) {
                                  handleChange(e); // Allow the change if it matches the regex
                                }
                              }}
                              onBlur={handleBlur}
                              onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                              error={touched.householdNumber && !!errors.householdNumber}
                              helperText={touched.householdNumber && errors.householdNumber}
                              InputProps={{
                                inputProps: { min: 0, max: 999 }, // Set min and max values here
                              }}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <label className={styles.label} htmlFor="childId">
                              {t('child_id')} <span className={styles.requiredStar}>*</span>
                            </label>
                            {/* <em>{t('child_id_instruction')}</em> */}
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="text"
                              name="childId"
                              id="childId"
                              value={resolveChildId(values)}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              InputProps={{
                                disabled: true,
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} className={{
                            [styles.invalid]: touched.primaryCaregiver && !!errors.primaryCaregiver,
                          }}>
                            <label className={styles.label} htmlFor="primaryCaregiver">
                              {t('primary_caregiver_of_child')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup aria-label="Beneficiary caste category" name="primaryCaregiver" size="small"
                              id="primaryCaregiver" value={values.primaryCaregiver}
                              onChange={handleChange}
                              onBlur={handleBlur} error={touched.primaryCaregiver && errors.primaryCaregiver}>
                              <FormControlLabel value="Mother" control={<Radio />} label={t('mother')} />
                              <FormControlLabel value="Father" control={<Radio />} label={t('father')} />
                              <FormControlLabel value="N/A" control={<Radio />} label={t('refused_to_answer')} />
                              <FormControlLabel value="Other" control={<Radio />} label={t('other')} />
                            </RadioGroup>
                          </Grid>
                          {values.primaryCaregiver === 'Other' && (
                            <Grid item xs={12} sm={7} className={{
                              [styles.invalid]: touched.primaryCaregiver_other && !!errors.primaryCaregiver_other,
                            }}>
                              <label className={styles.label} htmlFor="primaryCaregiver_other">
                                {t('other_answer')} <span className={styles.requiredStar}>*</span>
                              </label>
                              <TextField
                                size="small"
                                className={styles.formInput}
                                name="primaryCaregiver_other"
                                id="primaryCaregiver_other"
                                value={values.primaryCaregiver_other}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.primaryCaregiver_other && !!errors.primaryCaregiver_other}
                                helperText={touched.primaryCaregiver_other && errors.primaryCaregiver_other}
                              />
                            </Grid>
                          )}
                          <Grid item xs={12} className={{
                            [styles.invalid]: touched.careGiverInterview && !!errors.careGiverInterview,
                          }}>
                            <label className={styles.label} htmlFor="careGiverInterview">
                              {t('caregiver_available_for_interview')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup aria-label="Beneficiary caste category" name="careGiverInterview" size="small"
                              id="careGiverInterview"
                              value={values.careGiverInterview}
                              onChange={handleChange}
                              onBlur={handleBlur} error={touched.careGiverInterview && errors.careGiverInterview}>
                              <FormControlLabel value='Yes' control={<Radio />} label={t('yes')} />
                              <FormControlLabel value='No' control={<Radio />} label={t('no')} />
                            </RadioGroup>
                          </Grid>
                          <Grid item xs={12} display={"flex"} alignItems={"center"} justifyContent={"center"}>
                            {values.careGiverInterview === 'No' ? (
                              <>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  type="submit"
                                  endIcon={<Check />}
                                  disabled={loadingStatus || submitButtonDisabled}
                                >
                                  {loadingStatus ? 'Submitting...' : (isOnline ? t('submit') : t('save'))}
                                </Button>
                                {showSaveOfflineOption && isOnline && (
                                  <Button
                                    variant="outlined"
                                    color="warning"
                                    onClick={() => handleSaveOffline(values, { resetForm, setSubmitting: () => {} })}
                                    disabled={loadingStatus}
                                    sx={{ ml: 2 }}
                                  >
                                    {t('saveOffline')}
                                  </Button>
                                )}
                              </>
                            ) : step === 1 ? (
                              <>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  type="submit"
                                  endIcon={<Check />}
                                  disabled={loadingStatus || submitButtonDisabled}
                                >
                                  {loadingStatus ? 'Submitting...' : (isOnline ? t('submit') : t('save'))}
                                </Button>
                                {showSaveOfflineOption && isOnline && (
                                  <Button
                                    variant="outlined"
                                    color="warning"
                                    onClick={() => handleSaveOffline(values, { resetForm, setSubmitting: () => {} })}
                                    disabled={loadingStatus}
                                    sx={{ ml: 2 }}
                                  >
                                    {t('saveOffline')}
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Button
                                variant="contained"
                                color="primary"
                                size="large"
                                fullWidth={false}
                                type="submit"
                                startIcon={<ArrowForward />}
                                disabled={loadingStatus || submitButtonDisabled}
                              >
                                {t('next')}
                              </Button>
                            )}
                          </Grid>
                        </Grid>
                      </Box>
                    </>
                  )}

                  {step === 1 && values.careGiverInterview === 'Yes' && (
                    <>
                      <Box className={styles.formSection}>
                        <Box className={styles.sectionHeader}>
                          <Box className={styles.sectionIcon}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                              📝
                            </Typography>
                          </Box>
                          <Box>
                            <Typography className={styles.sectionTitle}>
                              {t('responses_from_caregiver')}
                            </Typography>
                            <Typography className={styles.sectionSubtitle}>
                              Caregiver responses and assessments
                            </Typography>
                          </Box>
                        </Box>
                        <Grid container rowSpacing={2} sx={{
                          margin: '0',
                          width: '100%'
                        }}>
                          <Grid item xs={12} className={{
                            [styles.invalid]: touched.caregiverName && !!errors.caregiverName,
                          }}>
                            <label className={styles.label} htmlFor="caregiverName">
                              {t('name_of_caregiver')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('onlyUppercaseAllowed')}</em>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="text"
                              name="caregiverName"
                              id="caregiverName"
                              value={values.caregiverName}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^[A-Za-z\s]*$/.test(value)) {
                                  handleChange(e);
                                }
                              }}
                              onBlur={handleBlur}
                              error={touched.caregiverName && !!errors.caregiverName}
                              helperText={touched.caregiverName && errors.caregiverName}

                            />
                          </Grid>
                          <Grid item xs={12} className={{
                            [styles.invalid]: touched.caregiversex && !!errors.caregiversex,
                          }}>
                            <label className={styles.label} htmlFor="caregiversex">
                              {t('sex_of_caregiver')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup aria-label="Beneficiary caste category" name="caregiversex" size="small"
                              id="caregiversex" value={values.caregiversex}
                              onChange={handleChange}
                              onBlur={handleBlur} error={touched.caregiversex && !!errors.caregiversex}>
                              <FormControlLabel value="Male" control={<Radio />} label={t('male')} />
                              <FormControlLabel value="Female" control={<Radio />} label={t('female')} />
                              <FormControlLabel value="N/A" control={<Radio />} label={t('refused_to_answer')} />
                              <FormControlLabel value="Other" control={<Radio />} label={t('other')} />
                            </RadioGroup>
                            {touched.caregiversex && errors.caregiversex && (
                              <div className={styles.error}>{errors.caregiversex}</div>
                            )}
                          </Grid>
                          {values.caregiversex === 'Other' && (
                            <Grid item xs={7} className={{
                              [styles.invalid]: touched.caregiversex_other && !!errors.caregiversex_other,
                            }}>
                              <label className={styles.label} htmlFor="caregiversex_other">
                                {t('other_answer')} <span className={styles.requiredStar}>*</span>
                              </label>
                              <TextField
                                size="small"
                                className={styles.formInput}
                                name="caregiversex_other"
                                id="caregiversex_other"
                                value={values.caregiversex_other}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.caregiversex_other && !!errors.caregiversex_other}
                                helperText={touched.caregiversex_other && errors.caregiversex_other}
                              />
                            </Grid>
                          )}
                          <Grid item xs={7} className={{
                            [styles.invalid]: touched.caregiverAge && !!errors.caregiverAge,
                          }}>
                            <label className={styles.label} htmlFor="caregiverAge">
                              {t('age_of_caregiver')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="number"
                              name="caregiverAge"
                              id="caregiverAge"
                              value={values.caregiverAge}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                              error={touched.caregiverAge && !!errors.caregiverAge}
                              helperText={touched.caregiverAge && errors.caregiverAge}

                            />
                          </Grid>
                          <Grid item xs={12} className={{
                            [styles.invalid]: touched.caregiverEducation && !!errors.caregiverEducation,
                          }}>
                            <label className={styles.label} htmlFor="caregiverEducation">
                              {t('education_level_of_caregiver')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup aria-label="Beneficiary caste category" name="caregiverEducation" size="small"
                              id="caregiverEducation" value={values.caregiverEducation}
                              onChange={handleChange}
                              onBlur={handleBlur} error={touched.caregiverEducation && errors.caregiverEducation}>
                              <FormControlLabel value="No formal education" control={<Radio />} label={t('no_formal_education')} />
                              <FormControlLabel value="Primary (1-5 class)" control={<Radio />} label={t('primary_education')} />
                              <FormControlLabel value="Upper Primary (6-8 class)" control={<Radio />} label={t('upper_primary_education')} />
                              <FormControlLabel value="Secondary (9-12 class)" control={<Radio />} label={t('secondary_education')} />
                              <FormControlLabel value="Higher Education (Graduate and above)" control={<Radio />} label={t('higher_education')} />
                              <FormControlLabel value="N/A" control={<Radio />} label={t('refused_to_answer')} />
                            </RadioGroup>
                            {touched.caregiverEducation && errors.caregiverEducation && (
                              <div className={styles.error}>{errors.caregiverEducation}</div>
                            )}
                          </Grid>
                          <Grid item xs={12} className={{
                            [styles.invalid]: touched.childName && !!errors.childName,
                          }}>
                            <label className={styles.label} htmlFor="childName">
                              {t('cq1_child_name')}
                            </label>
                            <em>{t('onlyUppercaseAllowed')}</em>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="text"
                              name="childName"
                              id="childName"
                              value={values.childName}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^[A-Za-z\s]*$/.test(value)) {
                                  handleChange(e);
                                }
                              }}
                              onBlur={handleBlur}
                              error={touched.childName && !!errors.childName}
                              helperText={touched.childName && errors.childName}
                            />
                          </Grid>
                          <Grid item xs={12} className={{
                            [styles.invalid]: touched.childSex && !!errors.childSex,
                          }}>
                            <label className={styles.label} htmlFor="childSex">
                              {t('cq2_sex_of_child')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup aria-label="Beneficiary caste category" name="childSex" size="small"
                              id="childSex" value={values.childSex}
                              onChange={handleChange}
                              onBlur={handleBlur} error={touched.childSex && errors.childSex}>
                              <FormControlLabel value="Male" control={<Radio />} label={t('male')} />
                              <FormControlLabel value="Female" control={<Radio />} label={t('female')} />
                              <FormControlLabel value="Other" control={<Radio />} label={t('other')} />
                            </RadioGroup>
                            {touched.childSex && errors.childSex && (
                              <div className={styles.error}>{errors.childSex}</div>
                            )}
                          </Grid>
                          {values.childSex === 'Other' && (
                            <Grid item xs={7} className={{
                              [styles.invalid]: touched.childSex_other && !!errors.childSex_other,
                            }}>
                              <label className={styles.label} htmlFor="childSex_other">
                                {t('other_answer')} <span className={styles.requiredStar}>*</span>
                              </label>
                              <TextField
                                size="small"
                                className={styles.formInput}
                                name="childSex_other"
                                id="childSex_other"
                                value={values.childSex_other}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.childSex_other && !!errors.childSex_other}
                                helperText={touched.childSex_other && errors.childSex_other}
                              />
                            </Grid>
                          )}
                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.childDob && !!errors.childDob,
                          }}>
                            <label className={styles.label} htmlFor="childDob">
                              {t('cq3_dob_of_child')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('health_card_instruction')}</em>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="date"
                              name="childDob"
                              id="childDob"
                              value={values.childDob}
                              onChange={(event) => {
                                const selectedDate = event.target.value;
                                setFieldValue('childDob', selectedDate);
                                setFieldValue('childAgeMonths', getDobMonths(selectedDate));
                              }}
                              onBlur={handleBlur}
                              fullWidth={false}
                              error={touched.childDob && errors.childDob}
                              helperText={touched.childDob && errors.childDob}
                              inputProps={{ max: today }}
                            />
                          </Grid>
                          {/* BF section: Only show for children under 24 months */}
                          {values.childAgeMonths < 24 && (
                            <>
                              {/* BF1 */}
                              <Grid item xs={12} className={{
                                [styles.invalid]: touched.childBreastfeed && !!errors.childBreastfeed,
                              }}>
                                <label className={styles.label} htmlFor="childBreastfeed">
                                  {t('BF1')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup aria-label="Beneficiary caste category" name="childBreastfeed" size="small"
                                  id="childBreastfeed" value={values.childBreastfeed}
                                  onChange={handleChange}
                                  onBlur={handleBlur} error={touched.childBreastfeed && !!errors.childBreastfeed}>
                                  <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                  <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                </RadioGroup>
                                {touched.childBreastfeed && errors.childBreastfeed && (
                                  <div className={styles.error}>{errors.childBreastfeed}</div>
                                )}
                              </Grid>
                              {values.childBreastfeed === 'Yes' && (
                                <>
                                  <Grid item xs={12} className={{
                                    [styles.invalid]: touched.childBreastfeedFirstTime && !!errors.childBreastfeedFirstTime,
                                  }}>
                                    <label className={styles.label} htmlFor="childBreastfeedFirstTime">
                                      {t('BF2')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <em>{t('enter_zero_if_not_applicable')}</em>
                                    <RadioGroup aria-label="Beneficiary caste category" name="childBreastfeedFirstTime" size="small"
                                      id="childBreastfeedFirstTime" value={values.childBreastfeedFirstTime}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.childBreastfeedFirstTime && !!errors.childBreastfeedFirstTime}>
                                      <FormControlLabel value="On the day of birth" control={<Radio />} label={t('on_the_day_of_birth')} />
                                      <FormControlLabel value="On second day after birth or later" control={<Radio />} label={t('on_second_day_after_birth_or_later')} />
                                    </RadioGroup>
                                    {touched.childBreastfeedFirstTime && errors.childBreastfeedFirstTime && (
                                      <div className={styles.error}>{errors.childBreastfeedFirstTime}</div>
                                    )}
                                  </Grid>
                                  {(values.childBreastfeedFirstTime === 'On second day after birth or later') && (
                                    <Grid item xs={7} className={{
                                      [styles.invalid]: touched.noOfDays && !!errors.noOfDays,
                                    }}>
                                      <label className={styles.label} htmlFor="noOfDays">
                                        {t('no_of_days')}<span className={styles.requiredStar}>*</span>
                                      </label>
                                      <TextField
                                        size="small"
                                        className={styles.formInput}
                                        name="noOfDays"
                                        id="noOfDays"
                                        value={values.noOfDays}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                        error={touched.noOfDays && !!errors.noOfDays}
                                        helperText={touched.noOfDays && errors.noOfDays}
                                      />
                                    </Grid>
                                  )}
                                  {(values.childBreastfeedFirstTime === 'On the day of birth' || values.childBreastfeedFirstTime === 'On second day after birth or later') && (
                                    <Grid item xs={7} className={{
                                      [styles.invalid]: touched.noOfHours && !!errors.noOfHours,
                                    }}>
                                      <label className={styles.label} htmlFor="noOfHours">
                                        {t('no_of_hours')}<span className={styles.requiredStar}>*</span>
                                      </label>
                                      <TextField
                                        size="small"
                                        className={styles.formInput}
                                        name="noOfHours"
                                        id="noOfHours"
                                        value={values.noOfHours}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                        error={touched.noOfHours && !!errors.noOfHours}
                                        helperText={touched.noOfHours && errors.noOfHours}
                                      />
                                    </Grid>
                                  )}
                                  {(values.childBreastfeedFirstTime === 'On the day of birth' || values.childBreastfeedFirstTime === 'On second day after birth or later') && (
                                    <Grid item xs={7} className={{
                                      [styles.invalid]: touched.noOfMins && !!errors.noOfMins,
                                    }}>
                                      <label className={styles.label} htmlFor="noOfMins">
                                        {t('no_of_minutes')}<span className={styles.requiredStar}>*</span>
                                      </label>
                                      <TextField
                                        size="small"
                                        className={styles.formInput}
                                        name="noOfMins"
                                        id="noOfMins"
                                        value={values.noOfMins}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                        error={touched.noOfMins && !!errors.noOfMins}
                                        helperText={touched.noOfMins && errors.noOfMins}
                                      />
                                    </Grid>
                                  )}
                                  <Grid item xs={12} className={{
                                    [styles.invalid]: touched.firstMilk && !!errors.firstMilk,
                                  }}>
                                    <label className={styles.label} htmlFor="firstMilk">
                                      {t('BF3')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup aria-label="Beneficiary caste category" name="firstMilk" size="small"
                                      id="firstMilk" value={values.firstMilk}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.firstMilk && !!errors.firstMilk}>
                                      <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                      <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                    </RadioGroup>
                                    {touched.firstMilk && errors.firstMilk && (
                                      <div className={styles.error}>{errors.firstMilk}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={{
                                    [styles.invalid]: touched.otherThanMilk && !!errors.otherThanMilk,
                                  }}>
                                    <label className={styles.label} htmlFor="otherThanMilk">
                                      {t('BF4')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup aria-label="Beneficiary caste category" name="otherThanMilk" size="small"
                                      id="otherThanMilk" value={values.otherThanMilk}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.otherThanMilk && !!errors.otherThanMilk}>
                                      <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                      <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                    </RadioGroup>
                                    {touched.otherThanMilk && errors.otherThanMilk && (
                                      <div className={styles.error}>{errors.otherThanMilk}</div>
                                    )}
                                  </Grid>
                                  {values.otherThanMilk === 'Yes' && (
                                    <>
                                      <Grid item xs={12} className={{
                                        [styles.invalid]: touched.otherThanMilkGiven && !!errors.otherThanMilkGiven,
                                      }}>
                                        <label className={styles.label} htmlFor="otherThanMilkGiven">
                                          {t('BF5')}<span className={styles.requiredStar}>*</span>
                                        </label>
                                        <em>{t('probe_responses_instruction_1')}</em>

                                        <FormGroup aria-label="Beneficiary caste category" id="otherThanMilkGiven" >
                                          {[
                                            "Animal Milk",
                                            "Plain water",
                                            "Sugar / glucose water",
                                            "Jaggery",
                                            "Honey",
                                            "Fruit Juice",
                                            "Infant formula milk",
                                            "Tea",
                                            "Gripe water",
                                            "Janam ghutti",
                                            "Other",
                                          ].map((option) => (
                                            <FormControlLabel
                                              key={option}
                                              control={
                                                <Checkbox
                                                  value={option}
                                                  checked={values.otherThanMilkGiven.includes(option)}
                                                  onChange={(e) => {
                                                    const { value } = e.target;
                                                    const newArray = values.otherThanMilkGiven.includes(value)
                                                      ? values.otherThanMilkGiven.filter((item) => item !== value)
                                                      : [...values.otherThanMilkGiven, value];
                                                    setFieldValue("otherThanMilkGiven", newArray);
                                                  }}
                                                />
                                              }
                                              label={t(option.toLowerCase().replace(/\/ /g, '').replace(/ /g, '_').replace(/\//g, '_'))}
                                            />
                                          ))}
                                        </FormGroup>

                                        {touched.otherThanMilkGiven && errors.otherThanMilkGiven && (
                                          <div className={styles.error}>{errors.otherThanMilkGiven}</div>
                                        )}
                                      </Grid>

                                      {values.otherThanMilkGiven.includes('Other') && (
                                        <Grid item xs={7} className={{
                                          [styles.invalid]: touched.otherThanMilkGiven_other && !!errors.otherThanMilkGiven_other,
                                        }}>
                                          <label className={styles.label} htmlFor="otherThanMilkGiven_other">
                                            {t('other_answer')} <span className={styles.requiredStar}>*</span>
                                          </label>
                                          <TextField
                                            size="small"
                                            className={styles.formInput}
                                            name="otherThanMilkGiven_other"
                                            id="otherThanMilkGiven_other"
                                            value={values.otherThanMilkGiven_other}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.otherThanMilkGiven_other && !!errors.otherThanMilkGiven_other}
                                            helperText={touched.otherThanMilkGiven_other && errors.otherThanMilkGiven_other}
                                          />
                                        </Grid>
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                              {/* BF6 - Only show for children under 6 months and if BF1 is Yes */}
                              {values.childBreastfeed === 'Yes' && values.childAgeMonths < 6 && (
                                <Grid item xs={12} className={{
                                  [styles.invalid]: touched.otherThanMilkGivenPreviousDay && !!errors.otherThanMilkGivenPreviousDay,
                                }}>
                                  <label className={styles.label} htmlFor="otherThanMilkGivenPreviousDay">
                                    {t('BF6')}<span className={styles.requiredStar}>*</span>
                                  </label>
                                  <RadioGroup aria-label="Beneficiary caste category" name="otherThanMilkGivenPreviousDay" size="small"
                                    id="otherThanMilkGivenPreviousDay" value={values.otherThanMilkGivenPreviousDay}
                                    onChange={handleChange}
                                    onBlur={handleBlur} error={touched.otherThanMilkGivenPreviousDay && !!errors.otherThanMilkGivenPreviousDay}>
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                  </RadioGroup>
                                  {touched.otherThanMilkGivenPreviousDay && errors.otherThanMilkGivenPreviousDay && (
                                    <div className={styles.error}>{errors.otherThanMilkGivenPreviousDay}</div>
                                  )}
                                </Grid>
                              )}

                              {/* BF7 - Only show if BF6 is Yes and BF1 is Yes */}
                              {values.childBreastfeed === 'Yes' && values.childAgeMonths < 6 && values.otherThanMilkGivenPreviousDay === 'Yes' && (
                                <>
                                  <Grid item xs={12} className={{
                                    [styles.invalid]: touched.otherThanMilkGivenReason && !!errors.otherThanMilkGivenReason,
                                  }}>
                                    <label className={styles.label} htmlFor="otherThanMilkGivenReason">
                                      {t('BF7')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <em>{t('probe_responses_instruction_2')}</em>
                                    <FormGroup aria-label="Beneficiary caste category" id="otherThanMilkGivenReason">
                                      {[
                                        "Mother sick / weak",
                                        "Child sick / weak",
                                        "Problems with breast",
                                        "Not enough milk",
                                        "Child refused to breastfeed",
                                        "Child reached complementary feeding age",
                                        "Work priority for mother",
                                        "Mother currently pregnant",
                                        "Advised by someone",
                                        "Cultural practice",
                                        "Other",
                                      ].map((option) => (
                                        <FormControlLabel
                                          key={option}
                                          control={
                                            <Checkbox
                                              value={option}
                                              checked={values.otherThanMilkGivenReason.includes(option)}
                                              onChange={(e) => {
                                                const { value } = e.target;
                                                const newArray = values.otherThanMilkGivenReason.includes(value)
                                                  ? values.otherThanMilkGivenReason.filter((item) => item !== value)
                                                  : [...values.otherThanMilkGivenReason, value];
                                                setFieldValue("otherThanMilkGivenReason", newArray);
                                              }}
                                            />
                                          }
                                          label={t(option.toLowerCase().replace(/\/ /g, '').replace(/ /g, '_').replace(/\//g, '_'))}
                                        />
                                      ))}
                                    </FormGroup>

                                    {touched.otherThanMilkGivenReason && errors.otherThanMilkGivenReason && (
                                      <div className={styles.error}>{errors.otherThanMilkGivenReason}</div>
                                    )}
                                  </Grid>

                                  {values.otherThanMilkGivenReason.includes('Other') && (
                                    <Grid item xs={7} className={{
                                      [styles.invalid]: touched.otherThanMilkGivenReason_other && !!errors.otherThanMilkGivenReason_other,
                                    }}>
                                      <label className={styles.label} htmlFor="otherThanMilkGivenReason_other">
                                        {t('other_answer')} <span className={styles.requiredStar}>*</span>
                                      </label>
                                      <TextField
                                        size="small"
                                        className={styles.formInput}
                                        name="otherThanMilkGivenReason_other"
                                        id="otherThanMilkGivenReason_other"
                                        value={values.otherThanMilkGivenReason_other}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.otherThanMilkGivenReason_other && !!errors.otherThanMilkGivenReason_other}
                                        helperText={touched.otherThanMilkGivenReason_other && errors.otherThanMilkGivenReason_other}
                                      />
                                    </Grid>
                                  )}
                                </>
                              )}
                              {/* BF8 - Only show for children above 6 months and older and if BF1 is Yes */}
                              {values.childBreastfeed === 'Yes' && values.childAgeMonths >= 6 && (
                                <Grid item xs={12} className={{
                                  [styles.invalid]: touched.stillBreastfeeding && !!errors.stillBreastfeeding,
                                }}>
                                  <label className={styles.label} htmlFor="stillBreastfeeding">
                                    {t('BF8')}<span className={styles.requiredStar}>*</span>
                                  </label>
                                  <RadioGroup aria-label="Beneficiary caste category" name="stillBreastfeeding" size="small"
                                    id="stillBreastfeeding" value={values.stillBreastfeeding}
                                    onChange={handleChange}
                                    onBlur={handleBlur} error={touched.stillBreastfeeding && !!errors.stillBreastfeeding}>
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                  </RadioGroup>
                                  {touched.stillBreastfeeding && errors.stillBreastfeeding && (
                                    <div className={styles.error}>{errors.stillBreastfeeding}</div>
                                  )}
                                </Grid>
                              )}
                              {/* BF9 - Only show for children 6 months and older when stillBreastfeeding is No and BF1 is Yes */}
                              {values.childBreastfeed === 'Yes' && values.childAgeMonths >= 6 && values.stillBreastfeeding === 'No' && (
                                <Grid item xs={12} className={{
                                  [styles.invalid]: touched.breastFeedMonth && !!errors.breastFeedMonth,
                                }}>
                                  <label className={styles.label} htmlFor="breastFeedMonth">
                                    {t('BF9')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <em>{t('caregiver_unable_to_answer_instruction')}</em>
                                  <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="breastFeedMonth"
                                    id="breastFeedMonth"
                                    type="number"
                                    value={values.breastFeedMonth}
                                    onChange={(e) => {
                                      const { value } = e.target;
                                      const regex = /^\d{0,2}$/; // Regex to allow only numbers and max 2 digits
                                      if (regex.test(value)) {
                                        handleChange(e); // Allow the change if it matches the regex
                                      }
                                    }}
                                    onBlur={handleBlur}
                                    onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                    error={touched.breastFeedMonth && !!errors.breastFeedMonth}
                                    helperText={touched.breastFeedMonth && errors.breastFeedMonth}
                                  />
                                </Grid>
                              )}
                              
                              {/* BF10 - Show when BF1 is No OR when BF1 is Yes and stillBreastfeeding is No */}
                              {(values.childBreastfeed === 'No' || (values.childBreastfeed === 'Yes' && values.childAgeMonths >= 6 && values.stillBreastfeeding === 'No')) && (
                                <>
                                  <Grid item xs={12} className={{
                                    [styles.invalid]: touched.reasonStoppedFeedingw && !!errors.reasonStoppedFeedingw,
                                  }}>
                                    <label className={styles.label} htmlFor="reasonStoppedFeedingw">
                                      {t('BF10')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <em>{t('probe_responses_instruction_2')}</em>
                                    <FormGroup aria-label="Beneficiary caste category" id="reasonStoppedFeedingw">
                                      {[
                                        "Mother sick / weak",
                                        "Child sick / weak",
                                        "Problems with breast",
                                        "Not enough milk",
                                        "Child refused to breastfeed",
                                        "Child reached complementary feeding age",
                                        "Work priority for mother",
                                        "Mother currently pregnant",
                                        "Advised by someone",
                                        "Cultural practice",
                                        "Other",
                                      ].map((option) => (
                                        <FormControlLabel
                                          key={option}
                                          control={
                                            <Checkbox
                                              value={option}
                                              checked={values.reasonStoppedFeedingw.includes(option)}
                                              onChange={(e) => {
                                                const { value } = e.target;
                                                const newArray = values.reasonStoppedFeedingw.includes(value)
                                                  ? values.reasonStoppedFeedingw.filter((item) => item !== value)
                                                  : [...values.reasonStoppedFeedingw, value];
                                                setFieldValue("reasonStoppedFeedingw", newArray);
                                              }}
                                            />
                                          }
                                          label={t(option.toLowerCase().replace(/\/ /g, '').replace(/ /g, '_').replace(/\//g, '_'))}
                                        />
                                      ))}
                                    </FormGroup>

                                    {touched.reasonStoppedFeedingw && errors.reasonStoppedFeedingw && (
                                      <div className={styles.error}>{errors.reasonStoppedFeedingw}</div>
                                    )}
                                  </Grid>

                                  {values.reasonStoppedFeedingw.includes('Other') && (
                                    <Grid item xs={7} className={{
                                      [styles.invalid]: touched.reasonStoppedFeedingw_other && !!errors.reasonStoppedFeedingw_other,
                                    }}>
                                      <label className={styles.label} htmlFor="reasonStoppedFeedingw_other">
                                        {t('other_answer')} <span className={styles.requiredStar}>*</span>
                                      </label>
                                      <TextField
                                        size="small"
                                        className={styles.formInput}
                                        name="reasonStoppedFeedingw_other"
                                        id="reasonStoppedFeedingw_other"
                                        value={values.reasonStoppedFeedingw_other}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.reasonStoppedFeedingw_other && !!errors.reasonStoppedFeedingw_other}
                                        helperText={touched.reasonStoppedFeedingw_other && errors.reasonStoppedFeedingw_other}
                                      />
                                    </Grid>
                                  )}
                                </>
                              )}
                              {/* CF1 - Show for all children under 24 months */}
                              {values.childAgeMonths < 24 && (
                                <Grid item xs={12} className={{
                                  [styles.invalid]: touched.givingFluids && !!errors.givingFluids,
                                }}>
                                  <label className={styles.label} htmlFor="givingFluids">
                                    {t('CF1')}<span className={styles.requiredStar}>*</span>
                                  </label>
                                  <RadioGroup aria-label="Beneficiary caste category" name="givingFluids" size="small"
                                    id="givingFluids" value={values.givingFluids}
                                    onChange={handleChange}
                                    onBlur={handleBlur} error={touched.givingFluids && !!errors.givingFluids}>
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                  </RadioGroup>
                                  {touched.givingFluids && errors.givingFluids && (
                                    <div className={styles.error}>{errors.givingFluids}</div>
                                  )}
                                </Grid>
                              )}
                              {/* CF1.1, CF1.2, CF1.3 - Show if CF1 is Yes */}
                              {values.childAgeMonths < 24 && values.givingFluids === 'Yes' && (
                                <>
                                  <Grid item xs={7} className={{
                                    [styles.invalid]: touched.ageGivingFluids && !!errors.ageGivingFluids,
                                  }}>
                                    <label className={styles.label} htmlFor="ageGivingFluids">
                                      {t('CF1.1')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <em>{t('not_given_instruction_1')}</em>
                                    <TextField
                                      size="small"
                                      className={styles.formInput}
                                      name="ageGivingFluids"
                                      id="ageGivingFluids"
                                      type="number"
                                      value={values.ageGivingFluids}
                                      onChange={handleChange}
                                      onBlur={handleBlur}
                                      onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                      error={touched.ageGivingFluids && !!errors.ageGivingFluids}
                                      helperText={touched.ageGivingFluids && errors.ageGivingFluids}
                                    />
                                  </Grid>
                                  <Grid item xs={7} className={{
                                    [styles.invalid]: touched.ageGivingSemisolid && !!errors.ageGivingSemisolid,
                                  }}>
                                    <label className={styles.label} htmlFor="ageGivingSemisolid">
                                      {t('CF1.2')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <em>{t('not_given_instruction_2')}</em>
                                    <TextField
                                      size="small"
                                      className={styles.formInput}
                                      name="ageGivingSemisolid"
                                      id="ageGivingSemisolid"
                                      type="number"
                                      value={values.ageGivingSemisolid}
                                      onChange={handleChange}
                                      onBlur={handleBlur}
                                      onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                      error={touched.ageGivingSemisolid && !!errors.ageGivingSemisolid}
                                      helperText={touched.ageGivingSemisolid && errors.ageGivingSemisolid}
                                    />
                                  </Grid>
                                  <Grid item xs={7} className={{
                                    [styles.invalid]: touched.ageGivingSolid && !!errors.ageGivingSolid,
                                  }}>
                                    <label className={styles.label} htmlFor="ageGivingSolid">
                                      {t('CF1.3')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <em>{t('not_given_instruction_3')}</em>
                                    <TextField
                                      size="small"
                                      className={styles.formInput}
                                      name="ageGivingSolid"
                                      id="ageGivingSolid"
                                      type="number"
                                      value={values.ageGivingSolid}
                                      onChange={handleChange}
                                      onBlur={handleBlur}
                                      onKeyDown={filterNumberKeyDown} // Prevent non-numeric characters
                                      error={touched.ageGivingSolid && !!errors.ageGivingSolid}
                                      helperText={touched.ageGivingSolid && errors.ageGivingSolid}
                                    />
                                  </Grid>
                                </>
                              )}
                              {/* CF2 - Show if CF1 is Yes */}
                              {values.childAgeMonths < 24 && values.givingFluids === 'Yes' && (
                                <>
                                  <Grid item xs={12}>
                                    <label className={styles.label}>
                                      {t('CF2')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <em>{t('food_items_instruction')}</em>
                                  </Grid>
                                  <Grid item xs={12} className={styles.multiRaio}>
                                    <div></div><div style={{ display: "flex", gap: "40px", alignItems: "center", flexWrap: "wrap" }}>
                                      <span>0</span>
                                      <span>1</span>
                                      <span>2</span>
                                      <span>3</span>
                                      <span style={{ maxWidth: "60px" }}>{t('More_than_3')}</span>
                                    </div>
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayBreastmilk && errors.foodYesterdayBreastmilk ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayBreastmilk">
                                      {t('Breastmilk')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayBreastmilk" size="small"
                                      id="foodYesterdayBreastmilk" value={values.foodYesterdayBreastmilk}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayBreastmilk && !!errors.foodYesterdayBreastmilk}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayBreastmilk && errors.foodYesterdayBreastmilk && (
                                      <div className={styles.error}>{errors.foodYesterdayBreastmilk}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayPorridge && errors.foodYesterdayPorridge ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayPorridge">
                                      {t('Porridge_or_gruel')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayPorridge" size="small"
                                      id="foodYesterdayPorridge" value={values.foodYesterdayPorridge}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayPorridge && !!errors.foodYesterdayPorridge}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayPorridge && errors.foodYesterdayPorridge && (
                                      <div className={styles.error}>{errors.foodYesterdayPorridge}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayFortifiedFood && errors.foodYesterdayFortifiedFood ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayFortifiedFood">
                                      {t('Fortified_baby_food')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayFortifiedFood" size="small"
                                      id="foodYesterdayFortifiedFood" value={values.foodYesterdayFortifiedFood}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayFortifiedFood && !!errors.foodYesterdayFortifiedFood}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayFortifiedFood && errors.foodYesterdayFortifiedFood && (
                                      <div className={styles.error}>{errors.foodYesterdayFortifiedFood}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayGrain && errors.foodYesterdayGrain ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayGrain">
                                      {t('Bread_or_grains')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayGrain" size="small"
                                      id="foodYesterdayGrain" value={values.foodYesterdayGrain}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayGrain && !!errors.foodYesterdayGrain}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayGrain && errors.foodYesterdayGrain && (
                                      <div className={styles.error}>{errors.foodYesterdayGrain}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayYellow && errors.foodYesterdayYellow ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayYellow">
                                      {t('Pumpkin_or_carrots')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayYellow" size="small"
                                      id="foodYesterdayYellow" value={values.foodYesterdayYellow}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayYellow && !!errors.foodYesterdayYellow}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayYellow && errors.foodYesterdayYellow && (
                                      <div className={styles.error}>{errors.foodYesterdayYellow}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayRoots && errors.foodYesterdayRoots ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayRoots">
                                      {t('White_potatoes')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayRoots" size="small"
                                      id="foodYesterdayRoots" value={values.foodYesterdayRoots}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayRoots && !!errors.foodYesterdayRoots}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayRoots && errors.foodYesterdayRoots && (
                                      <div className={styles.error}>{errors.foodYesterdayRoots}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayLeafy && errors.foodYesterdayLeafy ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayLeafy">
                                      {t('Dark_green_leafy')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayLeafy" size="small"
                                      id="foodYesterdayLeafy" value={values.foodYesterdayLeafy}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayLeafy && !!errors.foodYesterdayLeafy}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayLeafy && errors.foodYesterdayLeafy && (
                                      <div className={styles.error}>{errors.foodYesterdayLeafy}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayFruits && errors.foodYesterdayFruits ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayFruits">
                                      {t('Mangoes_or_papayas')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayFruits" size="small"
                                      id="foodYesterdayFruits" value={values.foodYesterdayFruits}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayFruits && !!errors.foodYesterdayFruits}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayFruits && errors.foodYesterdayFruits && (
                                      <div className={styles.error}>{errors.foodYesterdayFruits}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayOtherFruits && errors.foodYesterdayOtherFruits ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayOtherFruits">
                                      {t('Other_fruits_or_vegetables')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayOtherFruits" size="small"
                                      id="foodYesterdayOtherFruits" value={values.foodYesterdayOtherFruits}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayOtherFruits && !!errors.foodYesterdayOtherFruits}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayOtherFruits && errors.foodYesterdayOtherFruits && (
                                      <div className={styles.error}>{errors.foodYesterdayOtherFruits}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayDryFruits && errors.foodYesterdayDryFruits ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayDryFruits">
                                      {t('Dry_fruits')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayDryFruits" size="small"
                                      id="foodYesterdayDryFruits" value={values.foodYesterdayDryFruits}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayDryFruits && !!errors.foodYesterdayDryFruits}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayDryFruits && errors.foodYesterdayDryFruits && (
                                      <div className={styles.error}>{errors.foodYesterdayDryFruits}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayOrganMeat && errors.foodYesterdayOrganMeat ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayOrganMeat">
                                      {t('Liver_or_organ_meats')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayOrganMeat" size="small"
                                      id="foodYesterdayOrganMeat" value={values.foodYesterdayOrganMeat}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayOrganMeat && !!errors.foodYesterdayOrganMeat}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayOrganMeat && errors.foodYesterdayOrganMeat && (
                                      <div className={styles.error}>{errors.foodYesterdayOrganMeat}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayChicken && errors.foodYesterdayChicken ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayChicken">
                                      {t('Chicken_or_other_meat')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayChicken" size="small"
                                      id="foodYesterdayChicken" value={values.foodYesterdayChicken}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayChicken && !!errors.foodYesterdayChicken}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayChicken && errors.foodYesterdayChicken && (
                                      <div className={styles.error}>{errors.foodYesterdayChicken}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayEggs && errors.foodYesterdayEggs ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayEggs">
                                      {t('Eggs')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayEggs" size="small"
                                      id="foodYesterdayEggs" value={values.foodYesterdayEggs}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayEggs && !!errors.foodYesterdayEggs}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayEggs && errors.foodYesterdayEggs && (
                                      <div className={styles.error}>{errors.foodYesterdayEggs}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayFish && errors.foodYesterdayFish ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayFish">
                                      {t('Fish_or_shellfish')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayFish" size="small"
                                      id="foodYesterdayFish" value={values.foodYesterdayFish}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayFish && !!errors.foodYesterdayFish}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayFish && errors.foodYesterdayFish && (
                                      <div className={styles.error}>{errors.foodYesterdayFish}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayBeans && errors.foodYesterdayBeans ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayBeans">
                                      {t('Beans_or_lentils')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayBeans" size="small"
                                      id="foodYesterdayBeans" value={values.foodYesterdayBeans}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayBeans && !!errors.foodYesterdayBeans}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayBeans && errors.foodYesterdayBeans && (
                                      <div className={styles.error}>{errors.foodYesterdayBeans}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayNuts && errors.foodYesterdayNuts ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayNuts">
                                      {t('Nuts')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayNuts" size="small"
                                      id="foodYesterdayNuts" value={values.foodYesterdayNuts}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayNuts && !!errors.foodYesterdayNuts}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayNuts && errors.foodYesterdayNuts && (
                                      <div className={styles.error}>{errors.foodYesterdayNuts}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayCheese && errors.foodYesterdayCheese ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayCheese">
                                      {t('Milk_products')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayCheese" size="small"
                                      id="foodYesterdayCheese" value={values.foodYesterdayCheese}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayCheese && !!errors.foodYesterdayCheese}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayCheese && errors.foodYesterdayCheese && (
                                      <div className={styles.error}>{errors.foodYesterdayCheese}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayOil && errors.foodYesterdayOil ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayOil">
                                      {t('Oils_or_fats')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayOil" size="small"
                                      id="foodYesterdayOil" value={values.foodYesterdayOil}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayOil && !!errors.foodYesterdayOil}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayOil && errors.foodYesterdayOil && (
                                      <div className={styles.error}>{errors.foodYesterdayOil}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdaySugar && errors.foodYesterdaySugar ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdaySugar">
                                      {t('Sugary_foods')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdaySugar" size="small"
                                      id="foodYesterdaySugar" value={values.foodYesterdaySugar}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdaySugar && !!errors.foodYesterdaySugar}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdaySugar && errors.foodYesterdaySugar && (
                                      <div className={styles.error}>{errors.foodYesterdaySugar}</div>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} className={`${styles.multiRaio} ${touched.foodYesterdayOtherSweetened && errors.foodYesterdayOtherSweetened ? styles.invalid : ''}`}>
                                    <label className={styles.label} htmlFor="foodYesterdayOtherSweetened">
                                      {t('Sweetened_beverages')}<span className={styles.requiredStar}>*</span>
                                    </label>
                                    <RadioGroup className={styles.colSpan} row name="foodYesterdayOtherSweetened" size="small"
                                      id="foodYesterdayOtherSweetened" value={values.foodYesterdayOtherSweetened}
                                      onChange={handleChange}
                                      onBlur={handleBlur} error={touched.foodYesterdayOtherSweetened && !!errors.foodYesterdayOtherSweetened}>
                                      <FormControlLabel value="0" control={<Radio />} />
                                      <FormControlLabel value="1" control={<Radio />} />
                                      <FormControlLabel value="2" control={<Radio />} />
                                      <FormControlLabel value="3" control={<Radio />} />
                                      <FormControlLabel value="More then 3" control={<Radio />} />
                                    </RadioGroup>
                                    {touched.foodYesterdayOtherSweetened && errors.foodYesterdayOtherSweetened && (
                                      <div className={styles.error}>{errors.foodYesterdayOtherSweetened}</div>
                                    )}
                                  </Grid>
                                </>
                              )}
                            </>
                          )}
                        </Grid>
                      </Box>

                      {/* THR Section */}
                      <Box className={styles.formSection}>
                        <Box className={styles.sectionHeader}>
                          <Box className={styles.sectionIcon}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                              🍽️
                            </Typography>
                          </Box>
                          <Box>
                            <Typography className={styles.sectionTitle}>
                              {t('thr_questions')}
                            </Typography>
                            <Typography className={styles.sectionSubtitle}>
                              Take-Home Ration related questions
                            </Typography>
                          </Box>
                        </Box>
                        <Grid container rowSpacing={2} sx={{ margin: '0', width: '100%' }}>
                          {/* THR1 */}
                          <Grid item xs={12} className={{
                            [styles.invalid]: touched.receivedThr && !!errors.receivedThr,
                          }}>
                            <label className={styles.label} htmlFor="receivedThr">
                              {t('thr1')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup aria-label="THR received" name="receivedThr" size="small"
                              id="receivedThr" value={values.receivedThr}
                              onChange={handleChange}
                              onBlur={handleBlur} error={touched.receivedThr && !!errors.receivedThr}>
                              <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                              <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                              <FormControlLabel value="Child is under 6 months" control={<Radio />} label={t('child_is_under_6_months')} />
                              <FormControlLabel value="Child is above 3 years" control={<Radio />} label={t('child_is_above_3_years')} />
                            </RadioGroup>
                            {touched.receivedThr && errors.receivedThr && (
                              <div className={styles.error}>{errors.receivedThr}</div>
                            )}
                          </Grid>

                          {/* THR2-THR5 - Only show if THR1 is Yes */}
                          {values.receivedThr === 'Yes' && (
                            <>
                              {/* THR2 */}
                              <Grid item xs={12} sm={7} className={{
                                [styles.invalid]: touched.receivedThrDays && !!errors.receivedThrDays,
                              }}>
                                <label className={styles.label} htmlFor="receivedThrDays">
                                  {t('thr2')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <TextField
                                  size="small"
                                  className={styles.formInput}
                                  type="number"
                                  name="receivedThrDays"
                                  id="receivedThrDays"
                                  value={values.receivedThrDays}
                                  onChange={(e) => {
                                    const { value } = e.target;
                                    const regex = /^\d{0,3}$/;
                                    if (regex.test(value)) {
                                      handleChange(e);
                                    }
                                  }}
                                  onBlur={handleBlur}
                                  onKeyDown={filterNumberKeyDown}
                                  error={touched.receivedThrDays && !!errors.receivedThrDays}
                                  helperText={touched.receivedThrDays && errors.receivedThrDays}
                                />
                              </Grid>

                              {/* THR3 */}
                              <Grid item xs={12} sm={7} className={{
                                [styles.invalid]: touched.consumeThrDays && !!errors.consumeThrDays,
                              }}>
                                <label className={styles.label} htmlFor="consumeThrDays">
                                  {t('thr3')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <TextField
                                  size="small"
                                  className={styles.formInput}
                                  type="number"
                                  name="consumeThrDays"
                                  id="consumeThrDays"
                                  value={values.consumeThrDays}
                                  onChange={(e) => {
                                    const { value } = e.target;
                                    const regex = /^\d{0,3}$/;
                                    if (regex.test(value)) {
                                      handleChange(e);
                                    }
                                  }}
                                  onBlur={handleBlur}
                                  onKeyDown={filterNumberKeyDown}
                                  error={touched.consumeThrDays && !!errors.consumeThrDays}
                                  helperText={touched.consumeThrDays && errors.consumeThrDays}
                                />
                              </Grid>

                              {/* THR4 */}
                              <Grid item xs={12} className={{
                                [styles.invalid]: touched.likeConsumeThr && !!errors.likeConsumeThr,
                              }}>
                                <label className={styles.label} htmlFor="likeConsumeThr">
                                  {t('thr4')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup aria-label="Like consume THR" name="likeConsumeThr" size="small"
                                  id="likeConsumeThr" value={values.likeConsumeThr}
                                  onChange={handleChange}
                                  onBlur={handleBlur} error={touched.likeConsumeThr && !!errors.likeConsumeThr}>
                                  <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                  <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                </RadioGroup>
                                {touched.likeConsumeThr && errors.likeConsumeThr && (
                                  <div className={styles.error}>{errors.likeConsumeThr}</div>
                                )}
                              </Grid>

                              {/* THR5 */}
                              <Grid item xs={12} className={{
                                [styles.invalid]: touched.hhProvidedThr && !!errors.hhProvidedThr,
                              }}>
                                <label className={styles.label} htmlFor="hhProvidedThr">
                                  {t('thr5')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup aria-label="HH provided THR" name="hhProvidedThr" size="small"
                                  id="hhProvidedThr" value={values.hhProvidedThr}
                                  onChange={handleChange}
                                  onBlur={handleBlur} error={touched.hhProvidedThr && !!errors.hhProvidedThr}>
                                  <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                  <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                </RadioGroup>
                                {touched.hhProvidedThr && errors.hhProvidedThr && (
                                  <div className={styles.error}>{errors.hhProvidedThr}</div>
                                )}
                              </Grid>
                            </>
                          )}
                        </Grid>
                      </Box>

                      {/* GMT Section */}
                      <Box className={styles.formSection}>
                        <Box className={styles.sectionHeader}>
                          <Box className={styles.sectionIcon}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                              📈
                            </Typography>
                          </Box>
                          <Box>
                            <Typography className={styles.sectionTitle}>
                              {t('growth_monitoring_and_treatment')}
                            </Typography>
                            <Typography className={styles.sectionSubtitle}>
                              Growth monitoring and treatment information
                            </Typography>
                          </Box>
                        </Box>
                        <Grid container rowSpacing={2} sx={{ margin: '0', width: '100%' }}>
                          {/* GMT1 */}
                          <Grid item xs={12} className={{
                            [styles.invalid]: touched.weightLastMonthAww && !!errors.weightLastMonthAww,
                          }}>
                            <label className={styles.label} htmlFor="weightLastMonthAww">
                              {t('gmt1')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup aria-label="Weight measured" name="weightLastMonthAww" size="small"
                              id="weightLastMonthAww" value={values.weightLastMonthAww}
                              onChange={handleChange}
                              onBlur={handleBlur} error={touched.weightLastMonthAww && !!errors.weightLastMonthAww}>
                              <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                              <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                            </RadioGroup>
                            {touched.weightLastMonthAww && errors.weightLastMonthAww && (
                              <div className={styles.error}>{errors.weightLastMonthAww}</div>
                            )}
                          </Grid>

                          {/* GMT1.1 - Only show if GMT1 is No */}
                          {values.weightLastMonthAww === 'No' && (
                            <>
                              <Grid item xs={12} className={{
                                [styles.invalid]: touched.weightNotMeasuredReason && !!errors.weightNotMeasuredReason,
                              }}>
                                <label className={styles.label} htmlFor="weightNotMeasuredReason">
                                  {t('gmt1_1')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup aria-label="Weight not measured reason" name="weightNotMeasuredReason" size="small"
                                  id="weightNotMeasuredReason" value={values.weightNotMeasuredReason}
                                  onChange={handleChange}
                                  onBlur={handleBlur} error={touched.weightNotMeasuredReason && !!errors.weightNotMeasuredReason}>
                                  <FormControlLabel value="Not present at the time of measuring" control={<Radio />} label={t('not_present_at_the_time_of_measuring')} />
                                  <FormControlLabel value="Sick" control={<Radio />} label={t('sick')} />
                                  <FormControlLabel value="Not willing to be measured" control={<Radio />} label={t('not_willing_to_be_measured')} />
                                  <FormControlLabel value="Other" control={<Radio />} label={t('other')} />
                                </RadioGroup>
                                {touched.weightNotMeasuredReason && errors.weightNotMeasuredReason && (
                                  <div className={styles.error}>{errors.weightNotMeasuredReason}</div>
                                )}
                              </Grid>

                              {values.weightNotMeasuredReason === 'Other' && (
                                <Grid item xs={7} className={{
                                  [styles.invalid]: touched.weightNotMeasuredReason_other && !!errors.weightNotMeasuredReason_other,
                                }}>
                                  <label className={styles.label} htmlFor="weightNotMeasuredReason_other">
                                    {t('please_specify')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="weightNotMeasuredReason_other"
                                    id="weightNotMeasuredReason_other"
                                    value={values.weightNotMeasuredReason_other}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={touched.weightNotMeasuredReason_other && !!errors.weightNotMeasuredReason_other}
                                    helperText={touched.weightNotMeasuredReason_other && errors.weightNotMeasuredReason_other}
                                  />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* GMT2 */}
                          <Grid item xs={12} className={{
                            [styles.invalid]: touched.heightLastMonthAww && !!errors.heightLastMonthAww,
                          }}>
                            <label className={styles.label} htmlFor="heightLastMonthAww">
                              {t('gmt2')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <RadioGroup aria-label="Height measured" name="heightLastMonthAww" size="small"
                              id="heightLastMonthAww" value={values.heightLastMonthAww}
                              onChange={handleChange}
                              onBlur={handleBlur} error={touched.heightLastMonthAww && !!errors.heightLastMonthAww}>
                              <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                              <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                            </RadioGroup>
                            {touched.heightLastMonthAww && errors.heightLastMonthAww && (
                              <div className={styles.error}>{errors.heightLastMonthAww}</div>
                            )}
                          </Grid>

                          {/* GMT2.1 - Only show if GMT2 is No */}
                          {values.heightLastMonthAww === 'No' && (
                            <>
                              <Grid item xs={12} className={{
                                [styles.invalid]: touched.heightNotMeasuredReason && !!errors.heightNotMeasuredReason,
                              }}>
                                <label className={styles.label} htmlFor="heightNotMeasuredReason">
                                  {t('gmt2_1')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup aria-label="Height not measured reason" name="heightNotMeasuredReason" size="small"
                                  id="heightNotMeasuredReason" value={values.heightNotMeasuredReason}
                                  onChange={handleChange}
                                  onBlur={handleBlur} error={touched.heightNotMeasuredReason && !!errors.heightNotMeasuredReason}>
                                  <FormControlLabel value="Not present at the time of measuring" control={<Radio />} label={t('not_present_at_the_time_of_measuring')} />
                                  <FormControlLabel value="Sick" control={<Radio />} label={t('sick')} />
                                  <FormControlLabel value="Not willing to be measured" control={<Radio />} label={t('not_willing_to_be_measured')} />
                                  <FormControlLabel value="Other" control={<Radio />} label={t('other')} />
                                </RadioGroup>
                                {touched.heightNotMeasuredReason && errors.heightNotMeasuredReason && (
                                  <div className={styles.error}>{errors.heightNotMeasuredReason}</div>
                                )}
                              </Grid>

                              {values.heightNotMeasuredReason === 'Other' && (
                                <Grid item xs={7} className={{
                                  [styles.invalid]: touched.heightNotMeasuredReason_other && !!errors.heightNotMeasuredReason_other,
                                }}>
                                  <label className={styles.label} htmlFor="heightNotMeasuredReason_other">
                                    {t('please_specify')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="heightNotMeasuredReason_other"
                                    id="heightNotMeasuredReason_other"
                                    value={values.heightNotMeasuredReason_other}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={touched.heightNotMeasuredReason_other && !!errors.heightNotMeasuredReason_other}
                                    helperText={touched.heightNotMeasuredReason_other && errors.heightNotMeasuredReason_other}
                                  />
                                </Grid>
                              )}
                            </>
                          )}
                        </Grid>
                      </Box>

                      {/* GMT3-GMT8 - Only show if GMT1 or GMT2 is Yes */}
                      {(values.weightLastMonthAww === 'Yes' || values.heightLastMonthAww === 'Yes') && (
                        <Box className={styles.formSection}>
                          <Box className={styles.sectionHeader}>
                            <Box className={styles.sectionIcon}>
                              <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                                ⚠️
                              </Typography>
                            </Box>
                            <Box>
                              <Typography className={styles.sectionTitle}>
                                {t('undernutrition_assessment')}
                              </Typography>
                              <Typography className={styles.sectionSubtitle}>
                                Undernutrition assessment and interventions
                              </Typography>
                            </Box>
                          </Box>
                          <Grid container rowSpacing={2} sx={{ margin: '0', width: '100%' }}>
                            {/* GMT3 */}
                            <Grid item xs={12} className={{
                              [styles.invalid]: touched.childUndernourished && !!errors.childUndernourished,
                            }}>
                              <label className={styles.label} htmlFor="childUndernourished">
                                {t('gmt3')} <span className={styles.requiredStar}>*</span>
                              </label>
                              <RadioGroup aria-label="Child undernourished" name="childUndernourished" size="small"
                                id="childUndernourished" value={values.childUndernourished}
                                onChange={handleChange}
                                onBlur={handleBlur} error={touched.childUndernourished && !!errors.childUndernourished}>
                                <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                              </RadioGroup>
                              {touched.childUndernourished && errors.childUndernourished && (
                                <div className={styles.error}>{errors.childUndernourished}</div>
                              )}
                            </Grid>

                            {/* GMT4-GMT8 - Only show if GMT3 is Yes */}
                            {values.childUndernourished === 'Yes' && (
                              <>
                                {/* GMT4 */}
                                <Grid item xs={12} className={{
                                  [styles.invalid]: touched.childUndernourishedType && !!errors.childUndernourishedType,
                                }}>
                                  <label className={styles.label} htmlFor="childUndernourishedType">
                                    {t('gmt4')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <RadioGroup aria-label="Undernutrition type" name="childUndernourishedType" size="small"
                                    id="childUndernourishedType" value={values.childUndernourishedType}
                                    onChange={handleChange}
                                    onBlur={handleBlur} error={touched.childUndernourishedType && !!errors.childUndernourishedType}>
                                    <FormControlLabel value="SAM" control={<Radio />} label={t('sam')} />
                                    <FormControlLabel value="MAM" control={<Radio />} label={t('mam')} />
                                    <FormControlLabel value="SUW" control={<Radio />} label={t('suW')} />
                                    <FormControlLabel value="MUW" control={<Radio />} label={t('muW')} />
                                    <FormControlLabel value="Severely Stunted" control={<Radio />} label={t('severely_stunted')} />
                                    <FormControlLabel value="Moderately Stunted" control={<Radio />} label={t('moderately_stunted')} />
                                    <FormControlLabel value="Other" control={<Radio />} label={t('other')} />
                                  </RadioGroup>
                                  {touched.childUndernourishedType && errors.childUndernourishedType && (
                                    <div className={styles.error}>{errors.childUndernourishedType}</div>
                                  )}
                                </Grid>

                                {values.childUndernourishedType === 'Other' && (
                                  <Grid item xs={7} className={{
                                    [styles.invalid]: touched.childUndernourishedType_other && !!errors.childUndernourishedType_other,
                                  }}>
                                    <label className={styles.label} htmlFor="childUndernourishedType_other">
                                      {t('please_specify')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <TextField
                                      size="small"
                                      className={styles.formInput}
                                      name="childUndernourishedType_other"
                                      id="childUndernourishedType_other"
                                      value={values.childUndernourishedType_other}
                                      onChange={handleChange}
                                      onBlur={handleBlur}
                                      error={touched.childUndernourishedType_other && !!errors.childUndernourishedType_other}
                                      helperText={touched.childUndernourishedType_other && errors.childUndernourishedType_other}
                                    />
                                  </Grid>
                                )}

                                {/* GMT5 */}
                                <Grid item xs={12} className={{
                                  [styles.invalid]: touched.adviceChildHealthFacility && !!errors.adviceChildHealthFacility,
                                }}>
                                  <label className={styles.label} htmlFor="adviceChildHealthFacility">
                                    {t('gmt5')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <RadioGroup aria-label="Advice health facility" name="adviceChildHealthFacility" size="small"
                                    id="adviceChildHealthFacility" value={values.adviceChildHealthFacility}
                                    onChange={handleChange}
                                    onBlur={handleBlur} error={touched.adviceChildHealthFacility && !!errors.adviceChildHealthFacility}>
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                  </RadioGroup>
                                  {touched.adviceChildHealthFacility && errors.adviceChildHealthFacility && (
                                    <div className={styles.error}>{errors.adviceChildHealthFacility}</div>
                                  )}
                                </Grid>

                                {/* GMT6 - Only show if GMT5 is Yes */}
                                {values.adviceChildHealthFacility === 'Yes' && (
                                  <>
                                    <Grid item xs={12} className={{
                                      [styles.invalid]: touched.childVisitHealthFacility && !!errors.childVisitHealthFacility,
                                    }}>
                                      <label className={styles.label} htmlFor="childVisitHealthFacility">
                                        {t('gmt6')} <span className={styles.requiredStar}>*</span>
                                      </label>
                                      <RadioGroup aria-label="Child visit health facility" name="childVisitHealthFacility" size="small"
                                        id="childVisitHealthFacility" value={values.childVisitHealthFacility}
                                        onChange={handleChange}
                                        onBlur={handleBlur} error={touched.childVisitHealthFacility && !!errors.childVisitHealthFacility}>
                                        <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                        <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                      </RadioGroup>
                                      {touched.childVisitHealthFacility && errors.childVisitHealthFacility && (
                                        <div className={styles.error}>{errors.childVisitHealthFacility}</div>
                                      )}
                                    </Grid>

                                    {values.childVisitHealthFacility === 'No' && (
                                      <Grid item xs={7} className={{
                                        [styles.invalid]: touched.childVisitHealthFacility_reason && !!errors.childVisitHealthFacility_reason,
                                      }}>
                                        <label className={styles.label} htmlFor="childVisitHealthFacility_reason">
                                          {t('if_no_reason')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <TextField
                                          size="small"
                                          className={styles.formInput}
                                          name="childVisitHealthFacility_reason"
                                          id="childVisitHealthFacility_reason"
                                          value={values.childVisitHealthFacility_reason}
                                          onChange={handleChange}
                                          onBlur={handleBlur}
                                          error={touched.childVisitHealthFacility_reason && !!errors.childVisitHealthFacility_reason}
                                          helperText={touched.childVisitHealthFacility_reason && errors.childVisitHealthFacility_reason}
                                        />
                                      </Grid>
                                    )}
                                  </>
                                )}

                                {/* GMT7 */}
                                <Grid item xs={12} className={{
                                  [styles.invalid]: touched.receivedTreatment && !!errors.receivedTreatment,
                                }}>
                                  <label className={styles.label} htmlFor="receivedTreatment">
                                    {t('gmt7')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <RadioGroup aria-label="Received treatment" name="receivedTreatment" size="small"
                                    id="receivedTreatment" value={values.receivedTreatment}
                                    onChange={handleChange}
                                    onBlur={handleBlur} error={touched.receivedTreatment && !!errors.receivedTreatment}>
                                    <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                    <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                  </RadioGroup>
                                  {touched.receivedTreatment && errors.receivedTreatment && (
                                    <div className={styles.error}>{errors.receivedTreatment}</div>
                                  )}
                                </Grid>

                                {/* GMT8 - Only show if GMT7 is Yes */}
                                {values.receivedTreatment === 'Yes' && (
                                  <>
                                    <Grid item xs={12} className={{
                                      [styles.invalid]: touched.medicineConsumed && !!errors.medicineConsumed,
                                    }}>
                                      <label className={styles.label} htmlFor="medicineConsumed">
                                        {t('gmt8')} <span className={styles.requiredStar}>*</span>
                                      </label>
                                      <FormGroup aria-label="Medicine consumed" id="medicineConsumed">
                                        {[
                                          "Amoxycillin tablet/syrup",
                                          "Folic acid tablet",
                                          "Albendazole tablet",
                                          "Vitamin A Syrup",
                                          "IFA syrup",
                                          "Multivitamin syrup",
                                          "Zinc",
                                          "ORS",
                                          "Paracetamol",
                                          "Other",
                                        ].map((option) => (
                                          <FormControlLabel
                                            key={option}
                                            control={
                                              <Checkbox
                                                value={option}
                                                checked={values.medicineConsumed.includes(option)}
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  const newArray = values.medicineConsumed.includes(value)
                                                    ? values.medicineConsumed.filter((item) => item !== value)
                                                    : [...values.medicineConsumed, value];
                                                  setFieldValue("medicineConsumed", newArray);
                                                }}
                                              />
                                            }
                                            label={t(option.toLowerCase().replace(/[\/\s]/g, '_'))}
                                          />
                                        ))}
                                      </FormGroup>
                                      {touched.medicineConsumed && errors.medicineConsumed && (
                                        <div className={styles.error}>{errors.medicineConsumed}</div>
                                      )}
                                    </Grid>

                                    {values.medicineConsumed.includes('Other') && (
                                      <Grid item xs={7} className={{
                                        [styles.invalid]: touched.medicineConsumed_other && !!errors.medicineConsumed_other,
                                      }}>
                                        <label className={styles.label} htmlFor="medicineConsumed_other">
                                          {t('please_specify')} <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <TextField
                                          size="small"
                                          className={styles.formInput}
                                          name="medicineConsumed_other"
                                          id="medicineConsumed_other"
                                          value={values.medicineConsumed_other}
                                          onChange={handleChange}
                                          onBlur={handleBlur}
                                          error={touched.medicineConsumed_other && !!errors.medicineConsumed_other}
                                          helperText={touched.medicineConsumed_other && errors.medicineConsumed_other}
                                        />
                                      </Grid>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </Grid>
                        </Box>
                      )}

                      {/* MN Section */}
                      <Box className={styles.formSection}>
                        <Box className={styles.sectionHeader}>
                          <Box className={styles.sectionIcon}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                              💊
                            </Typography>
                          </Box>
                          <Box>
                            <Typography className={styles.sectionTitle}>
                              {t('micronutrient_supplementation')}
                            </Typography>
                            <Typography className={styles.sectionSubtitle}>
                              Micronutrient supplementation information
                            </Typography>
                          </Box>
                        </Box>
                        <Grid container rowSpacing={2} sx={{ margin: '0', width: '100%' }}>
                          <Grid item xs={12}>
                            <em>{t('mn_note')}</em>
                          </Grid>

                          {/* MN1 */}
                          {values.childAgeMonths > 9 && (
                            <Grid item xs={12} className={{
                              [styles.invalid]: touched.vitA6Months && !!errors.vitA6Months,
                            }}>
                              <label className={styles.label} htmlFor="vitA6Months">
                                {t('mn1')} <span className={styles.requiredStar}>*</span>
                              </label>
                              <em>{t('mn1_note')}</em>
                              <RadioGroup aria-label="Vitamin A 6 months" name="vitA6Months" size="small"
                                id="vitA6Months" value={values.vitA6Months}
                                onChange={handleChange}
                                onBlur={handleBlur} error={touched.vitA6Months && !!errors.vitA6Months}>
                                <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                <FormControlLabel value="Don't Know" control={<Radio />} label={t('dont_know')} />
                              </RadioGroup>
                              {touched.vitA6Months && errors.vitA6Months && (
                                <div className={styles.error}>{errors.vitA6Months}</div>
                              )}
                            </Grid>
                          )}

                          {/* MN2 */}
                          {values.childAgeMonths > 12 && (
                            <Grid item xs={12} className={{
                              [styles.invalid]: touched.medicineWorm && !!errors.medicineWorm,
                            }}>
                              <label className={styles.label} htmlFor="medicineWorm">
                                {t('mn2')} <span className={styles.requiredStar}>*</span>
                              </label>
                              <em>{t('mn2_note')}</em>
                              <RadioGroup aria-label="Medicine worm" name="medicineWorm" size="small"
                                id="medicineWorm" value={values.medicineWorm}
                                onChange={handleChange}
                                onBlur={handleBlur} error={touched.medicineWorm && !!errors.medicineWorm}>
                                <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                <FormControlLabel value="Don't Know" control={<Radio />} label={t('dont_know')} />
                              </RadioGroup>
                              {touched.medicineWorm && errors.medicineWorm && (
                                <div className={styles.error}>{errors.medicineWorm}</div>
                              )}
                            </Grid>
                          )}

                          {/* MN3 */}
                          {values.childAgeMonths > 6 && (
                            <Grid item xs={12} className={{
                              [styles.invalid]: touched.iron6Months && !!errors.iron6Months,
                            }}>
                              <label className={styles.label} htmlFor="iron6Months">
                                {t('mn3')} <span className={styles.requiredStar}>*</span>
                              </label>
                              <em>{t('mn3_note')}</em>
                              <RadioGroup aria-label="Iron 6 months" name="iron6Months" size="small"
                                id="iron6Months" value={values.iron6Months}
                                onChange={handleChange}
                                onBlur={handleBlur} error={touched.iron6Months && !!errors.iron6Months}>
                                <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                                <FormControlLabel value="Don't Know" control={<Radio />} label={t('dont_know')} />
                              </RadioGroup>
                              {touched.iron6Months && errors.iron6Months && (
                                <div className={styles.error}>{errors.iron6Months}</div>
                              )}
                            </Grid>
                          )}

                          {/* MN4 - Only show if MN3 is Yes */}
                          {values.childAgeMonths > 6 && values.iron6Months === 'Yes' && (
                            <Grid item xs={12} sm={7} className={{
                              [styles.invalid]: touched.ironDoses && !!errors.ironDoses,
                            }}>
                              <label className={styles.label} htmlFor="ironDoses">
                                {t('mn4')} <span className={styles.requiredStar}>*</span>
                              </label>
                              <TextField
                                size="small"
                                className={styles.formInput}
                                type="number"
                                name="ironDoses"
                                id="ironDoses"
                                value={values.ironDoses}
                                onChange={(e) => {
                                  const { value } = e.target;
                                  const regex = /^\d{0,3}$/;
                                  if (regex.test(value)) {
                                    handleChange(e);
                                  }
                                }}
                                onBlur={handleBlur}
                                onKeyDown={filterNumberKeyDown}
                                error={touched.ironDoses && !!errors.ironDoses}
                                helperText={touched.ironDoses && errors.ironDoses}
                              />
                            </Grid>
                          )}
                        </Grid>
                      </Box>

                      {/* HV Section */}
                      <Box className={styles.formSection}>
                        <Box className={styles.sectionHeader}>
                          <Box className={styles.sectionIcon}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                              🏠
                            </Typography>
                          </Box>
                          <Box>
                            <Typography className={styles.sectionTitle}>
                              {t('home_visits')}
                            </Typography>
                            <Typography className={styles.sectionSubtitle}>
                              Home visit information and activities
                            </Typography>
                          </Box>
                        </Box>
                        <Grid container rowSpacing={2} sx={{ margin: '0', width: '100%' }}>
                          {/* HV1 */}
                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.homeVisitAww && !!errors.homeVisitAww,
                          }}>
                            <label className={styles.label} htmlFor="homeVisitAww">
                              {t('hv1')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('hv1_note')}</em>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="number"
                              name="homeVisitAww"
                              id="homeVisitAww"
                              value={values.homeVisitAww}
                              onChange={(e) => {
                                const { value } = e.target;
                                const regex = /^\d{0,2}$/;
                                if (regex.test(value)) {
                                  handleChange(e);
                                }
                              }}
                              onBlur={handleBlur}
                              onKeyDown={filterNumberKeyDown}
                              error={touched.homeVisitAww && !!errors.homeVisitAww}
                              helperText={touched.homeVisitAww && errors.homeVisitAww}
                            />
                          </Grid>

                          {/* HV2 - Only show if HV1 is not 0 */}
                          {values.homeVisitAww > 0 && (
                            <>
                              {/* HV2 */}
                              <Grid item xs={12} className={{
                                [styles.invalid]: touched.awwDiscussion && !!errors.awwDiscussion,
                              }}>
                                <label className={styles.label} htmlFor="awwDiscussion">
                                  {t('hv2')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <em>{t('hv2_note')}</em>
                                <FormGroup aria-label="AWW discussion" id="awwDiscussion">
                                  {[
                                    "section5igcv_colostrum",
                                    "section5igcv_exclusive_breastfeeding",
                                    "section5igcv_breastfeeding_frequency",
                                    "section5igcv_breastfeeding_position",
                                    "section5igcv_complementary_start",
                                    "section5igcv_complementary_frequency",
                                    "section5igcv_complementary_consistency",
                                    "section5igcv_complementary_quantity",
                                    "section5igcv_complementary_diversity",
                                    "section5igcv_complementary_illness",
                                    "section5igcv_complementary_responsive",
                                    "section5igcv_stimulation",
                                    "section5igcv_thr_tips",
                                    "section5igcv_growth_monitoring",
                                    "section5igcv_nutrition_status",
                                    "section5igcv_undernutrition",
                                    "section5igcv_undernutrition_consequences",
                                    "section5igcv_handwash",
                                    "section5igcv_ifa",
                                    "section5igcv_vitamin_a",
                                    "section5igcv_deworming",
                                    "section5igcv_vaccination",
                                    "section5igcv_sick_child",
                                    "section5igcv_demonstration",
                                    "nothing",
                                    "other",
                                  ].map((option) => (
                                    <FormControlLabel
                                      key={option}
                                      control={
                                        <Checkbox
                                          checked={values.awwDiscussion?.includes(option) || false}
                                          onChange={(e) => {
                                            const { value } = e.target;
                                            let newArray = [...(values.awwDiscussion || [])];
                                            if (value === 'nothing') {
                                              newArray = newArray.includes('nothing')
                                                ? newArray.filter((item) => item !== 'nothing')
                                                : ['nothing'];
                                            } else if (value === 'other') {
                                              newArray = newArray.includes('other')
                                                ? newArray.filter((item) => item !== 'other')
                                                : [...newArray.filter((item) => item !== 'nothing'), 'other'];
                                            } else {
                                              newArray = newArray.includes(value)
                                                ? newArray.filter((item) => item !== value)
                                                : [...newArray.filter((item) => item !== 'nothing'), value];
                                            }
                                            setFieldValue('awwDiscussion', newArray);
                                          }}
                                          name="awwDiscussion"
                                          value={option}
                                        />
                                      }
                                      label={t(option)}
                                    />
                                  ))}
                                </FormGroup>
                                {touched.awwDiscussion && errors.awwDiscussion && (
                                  <div className={styles.error}>{errors.awwDiscussion}</div>
                                )}
                              </Grid>

                              {values.awwDiscussion?.includes('other') && (
                                <Grid item xs={7} className={{
                                  [styles.invalid]: touched.awwDiscussion_other && !!errors.awwDiscussion_other,
                                }}>
                                  <label className={styles.label} htmlFor="awwDiscussion_other">
                                    {t('please_specify')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="awwDiscussion_other"
                                    id="awwDiscussion_other"
                                    value={values.awwDiscussion_other}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={touched.awwDiscussion_other && !!errors.awwDiscussion_other}
                                    helperText={touched.awwDiscussion_other && errors.awwDiscussion_other}
                                  />
                                </Grid>
                              )}

                              {/* HV3 */}
                              <Grid item xs={12} className={{
                                [styles.invalid]: touched.awwCounsel && !!errors.awwCounsel,
                              }}>
                                <label className={styles.label} htmlFor="awwCounsel">
                                  {t('hv3')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <em>{t('hv3_note')}</em>
                                <FormGroup aria-label="AWW counsel" id="awwCounsel">
                                  {[
                                    "mcp_card",
                                    "flipbook_flipchart",
                                    "posters",
                                    "video_on_mobile_device",
                                    "counselling_card",
                                    "nothing",
                                    "other",
                                  ].map((option) => (
                                    <FormControlLabel
                                      key={option}
                                      control={
                                        <Checkbox
                                          checked={values.awwCounsel?.includes(option) || false}
                                          onChange={(e) => {
                                            const { value } = e.target;
                                            let newArray = [...(values.awwCounsel || [])];
                                            if (value === 'nothing') {
                                              newArray = newArray.includes('nothing')
                                                ? newArray.filter((item) => item !== 'nothing')
                                                : ['nothing'];
                                            } else if (value === 'other') {
                                              newArray = newArray.includes('other')
                                                ? newArray.filter((item) => item !== 'other')
                                                : [...newArray.filter((item) => item !== 'nothing'), 'other'];
                                            } else {
                                              newArray = newArray.includes(value)
                                                ? newArray.filter((item) => item !== value)
                                                : [...newArray.filter((item) => item !== 'nothing'), value];
                                            }
                                            setFieldValue('awwCounsel', newArray);
                                          }}
                                          name="awwCounsel"
                                          value={option}
                                        />
                                      }
                                      label={t(option)}
                                    />
                                  ))}
                                </FormGroup>
                                {touched.awwCounsel && errors.awwCounsel && (
                                  <div className={styles.error}>{errors.awwCounsel}</div>
                                )}
                              </Grid>

                              {values.awwCounsel?.includes('other') && (
                                <Grid item xs={7} className={{
                                  [styles.invalid]: touched.awwCounsel_other && !!errors.awwCounsel_other,
                                }}>
                                  <label className={styles.label} htmlFor="awwCounsel_other">
                                    {t('please_specify')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="awwCounsel_other"
                                    id="awwCounsel_other"
                                    value={values.awwCounsel_other}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={touched.awwCounsel_other && !!errors.awwCounsel_other}
                                    helperText={touched.awwCounsel_other && errors.awwCounsel_other}
                                  />
                                </Grid>
                              )}
                            </>
                          )}
                        </Grid>
                      </Box>

                      {/* ASHA Home Visits */}
                      <Box className={styles.formSection}>
                        <Box className={styles.sectionHeader}>
                          <Box className={styles.sectionIcon}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                              👩‍⚕️
                            </Typography>
                          </Box>
                          <Box>
                            <Typography className={styles.sectionTitle}>
                              {t('asha_home_visits')}
                            </Typography>
                            <Typography className={styles.sectionSubtitle}>
                              ASHA worker home visit information
                            </Typography>
                          </Box>
                        </Box>
                        <Grid container rowSpacing={2} sx={{ margin: '0', width: '100%' }}>
                          {/* HV4 */}
                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.homeVisitAsha && !!errors.homeVisitAsha,
                          }}>
                            <label className={styles.label} htmlFor="homeVisitAsha">
                              {t('hv4')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('hv4_note')}</em>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="number"
                              name="homeVisitAsha"
                              id="homeVisitAsha"
                              value={values.homeVisitAsha}
                              onChange={(e) => {
                                const { value } = e.target;
                                const regex = /^\d{0,2}$/;
                                if (regex.test(value)) {
                                  handleChange(e);
                                }
                              }}
                              onBlur={handleBlur}
                              onKeyDown={filterNumberKeyDown}
                              error={touched.homeVisitAsha && !!errors.homeVisitAsha}
                              helperText={touched.homeVisitAsha && errors.homeVisitAsha}
                            />
                          </Grid>

                          {/* HV5 - Only show if HV4 is not 0 */}
                          {values.homeVisitAsha > 0 && (
                            <>
                              <Grid item xs={12} className={{
                                [styles.invalid]: touched.ashaInform && !!errors.ashaInform,
                              }}>
                                <label className={styles.label} htmlFor="ashaInform">
                                  {t('hv5')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <em>{t('hv5_note')}</em>
                                <FormGroup aria-label="ASHA inform" id="ashaInform">
                                  {[
                                    "section5igcv_colostrum",
                                    "section5igcv_exclusive_breastfeeding",
                                    "section5igcv_breastfeeding_frequency",
                                    "section5igcv_breastfeeding_position",
                                    "section5igcv_complementary_start",
                                    "section5igcv_complementary_frequency",
                                    "section5igcv_complementary_consistency",
                                    "section5igcv_complementary_quantity",
                                    "section5igcv_complementary_diversity",
                                    "section5igcv_complementary_illness",
                                    "section5igcv_complementary_responsive",
                                    "section5igcv_stimulation",
                                    "section5igcv_thr_tips",
                                    "section5igcv_growth_monitoring",
                                    "section5igcv_nutrition_status",
                                    "section5igcv_undernutrition",
                                    "section5igcv_undernutrition_consequences",
                                    "section5igcv_handwash",
                                    "section5igcv_ifa",
                                    "section5igcv_vitamin_a",
                                    'section5igcv_deworming',
                                    'section5igcv_vaccination',
                                    'section5igcv_sick_child',
                                    'section5igcv_demonstration',
                                    'nothing',
                                    'other',
                                  ].map((option) => (
                                    <FormControlLabel
                                      key={option}
                                      control={
                                        <Checkbox
                                          checked={values.ashaInform?.includes(option) || false}
                                          onChange={(e) => {
                                            const { value } = e.target;
                                            let newArray = [...(values.ashaInform || [])];
                                            if (value === 'nothing') {
                                              newArray = newArray.includes('nothing')
                                                ? newArray.filter((item) => item !== 'nothing')
                                                : ['nothing'];
                                            } else if (value === 'other') {
                                              newArray = newArray.includes('other')
                                                ? newArray.filter((item) => item !== 'other')
                                                : [...newArray.filter((item) => item !== 'nothing'), 'other'];
                                            } else {
                                              newArray = newArray.includes(value)
                                                ? newArray.filter((item) => item !== value)
                                                : [...newArray.filter((item) => item !== 'nothing'), value];
                                            }
                                            setFieldValue('ashaInform', newArray);
                                          }}
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

                              {values.ashaInform?.includes('other') && (
                                <Grid item xs={7} className={{
                                  [styles.invalid]: touched.ashaInform_other && !!errors.ashaInform_other,
                                }}>
                                  <label className={styles.label} htmlFor="ashaInform_other">
                                    {t('please_specify')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="ashaInform_other"
                                    id="ashaInform_other"
                                    value={values.ashaInform_other}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={touched.ashaInform_other && !!errors.ashaInform_other}
                                    helperText={touched.ashaInform_other && errors.ashaInform_other}
                                  />
                                </Grid>
                              )}

                              {/* HV6 */}
                              <Grid item xs={12} className={{
                                [styles.invalid]: touched.ashaUsedtoInform && !!errors.ashaUsedtoInform,
                              }}>
                                <label className={styles.label} htmlFor="ashaUsedtoInform">
                                  {t('hv6')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <em>{t('hv6_note')}</em>
                                <FormGroup aria-label="ASHA methods" id="ashaUsedtoInform">
                                  {[
                                    "mcp_card",
                                    "flipbook_flipchart",
                                    "posters",
                                    "video_on_mobile_device",
                                    "counselling_card",
                                    "nothing",
                                    "other",
                                  ].map((option) => (
                                    <FormControlLabel
                                      key={option}
                                      control={
                                        <Checkbox
                                          value={option}
                                          checked={values.ashaUsedtoInform.includes(option)}
                                          onChange={(e) => {
                                            const { value } = e.target;
                                            let newArray = [...values.ashaUsedtoInform];
                                            if (value === 'nothing') {
                                              newArray = newArray.includes('nothing')
                                                ? newArray.filter((item) => item !== 'nothing')
                                                : ['nothing'];
                                            } else if (value === 'other') {
                                              newArray = newArray.includes('other')
                                                ? newArray.filter((item) => item !== 'other')
                                                : [...newArray.filter((item) => item !== 'nothing'), 'other'];
                                            } else {
                                              newArray = newArray.includes(value)
                                                ? newArray.filter((item) => item !== value)
                                                : [...newArray.filter((item) => item !== 'nothing'), value];
                                            }
                                            setFieldValue("ashaUsedtoInform", newArray);
                                          }}
                                          name="ashaUsedtoInform"
                                        />
                                      }
                                      label={t(option)}
                                    />
                                  ))}
                                </FormGroup>
                                {touched.ashaUsedtoInform && errors.ashaUsedtoInform && (
                                  <div className={styles.error}>{errors.ashaUsedtoInform}</div>
                                )}
                              </Grid>

                              {values.ashaUsedtoInform.includes('other') && (
                                <Grid item xs={7} className={{
                                  [styles.invalid]: touched.ashaUsedtoInform_other && !!errors.ashaUsedtoInform_other,
                                }}>
                                  <label className={styles.label} htmlFor="ashaUsedtoInform_other">
                                    {t('please_specify')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="ashaUsedtoInform_other"
                                    id="ashaUsedtoInform_other"
                                    value={values.ashaUsedtoInform_other}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={touched.ashaUsedtoInform_other && !!errors.ashaUsedtoInform_other}
                                    helperText={touched.ashaUsedtoInform_other && errors.ashaUsedtoInform_other}
                                  />
                                </Grid>
                              )}
                            </>
                          )}
                        </Grid>
                      </Box>

                      {/* Anthropometry Section */}
                      <Box className={styles.formSection}>
                        <Box className={styles.sectionHeader}>
                          <Box className={styles.sectionIcon}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                              📏
                            </Typography>
                          </Box>
                          <Box>
                            <Typography className={styles.sectionTitle}>
                              {t('anthropometry')}
                            </Typography>
                            <Typography className={styles.sectionSubtitle}>
                              Anthropometric measurements and assessments
                            </Typography>
                          </Box>
                        </Box>
                        <Grid container rowSpacing={2} sx={{ margin: '0', width: '100%' }}>
                          {/* ANTH1: Current weight (in kg) */}
                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.current_wt && !!errors.current_wt,
                          }}>
                            <label className={styles.label} htmlFor="current_wt">
                              {t('anth1')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('anth1_note')}</em>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="text"
                              name="current_wt"
                              id="current_wt"
                              value={values.current_wt}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              inputProps={{ maxLength: 5 }}
                              error={touched.current_wt && !!errors.current_wt}
                              helperText={touched.current_wt && errors.current_wt}
                            />
                          </Grid>
                          {/* ANTH1.1: Reason for not measuring weight */}
                          {values.current_wt === 999 || values.current_wt === '999' ? (
                            <>
                              <Grid item xs={12} sm={7} className={{
                                [styles.invalid]: touched.reasonWtNotMeasuring && !!errors.reasonWtNotMeasuring,
                              }}>
                                <label className={styles.label} htmlFor="reasonWtNotMeasuring">
                                  {t('anth1_1')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup aria-label="Reason weight not measured" name="reasonWtNotMeasuring" size="small"
                                  id="reasonWtNotMeasuring" value={values.reasonWtNotMeasuring}
                                  onChange={handleChange}
                                  onBlur={handleBlur} error={touched.reasonWtNotMeasuring && !!errors.reasonWtNotMeasuring}>
                                  <FormControlLabel value="Not present at the time of measuring" control={<Radio />} label={t('not_present_at_the_time_of_measuring')} />
                                  <FormControlLabel value="Sick" control={<Radio />} label={t('sick')} />
                                  <FormControlLabel value="Not willing to be measured" control={<Radio />} label={t('not_willing_to_be_measured')} />
                                  <FormControlLabel value="Other" control={<Radio />} label={t('other')} />
                                </RadioGroup>
                                {touched.reasonWtNotMeasuring && errors.reasonWtNotMeasuring && (
                                  <div className={styles.error}>{errors.reasonWtNotMeasuring}</div>
                                )}
                              </Grid>
                              {values.reasonWtNotMeasuring === 'Other' && (
                                <Grid item xs={7} className={{
                                  [styles.invalid]: touched.reasonWtNotMeasuring_other && !!errors.reasonWtNotMeasuring_other,
                                }}>
                                  <label className={styles.label} htmlFor="reasonWtNotMeasuring_other">
                                    {t('please_specify')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="reasonWtNotMeasuring_other"
                                    id="reasonWtNotMeasuring_other"
                                    value={values.reasonWtNotMeasuring_other}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    inputProps={{ maxLength: 150 }}
                                    error={touched.reasonWtNotMeasuring_other && !!errors.reasonWtNotMeasuring_other}
                                    helperText={touched.reasonWtNotMeasuring_other && errors.reasonWtNotMeasuring_other}
                                  />
                                </Grid>
                              )}
                            </>
                          ) : null}

                          {/* ANTH2: Current height/length (in cm) */}
                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.currentHt && !!errors.currentHt,
                          }}>
                            <label className={styles.label} htmlFor="currentHt">
                              {t('anth2')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('anth2_note')}</em>
                            <TextField
                              size="small"
                              className={styles.formInput}
                              type="text"
                              name="currentHt"
                              id="currentHt"
                              value={values.currentHt}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              inputProps={{ maxLength: 6 }}
                              error={touched.currentHt && !!errors.currentHt}
                              helperText={touched.currentHt && errors.currentHt}
                            />
                          </Grid>
                          {/* ANTH2.1: Reason for not measuring height */}
                          {values.currentHt === 999 || values.currentHt === '999' ? (
                            <>
                              <Grid item xs={12} sm={7} className={{
                                [styles.invalid]: touched.reasonHtNotMeasuring && !!errors.reasonHtNotMeasuring,
                              }}>
                                <label className={styles.label} htmlFor="reasonHtNotMeasuring">
                                  {t('anth2_1')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup aria-label="Reason height not measured" name="reasonHtNotMeasuring" size="small"
                                  id="reasonHtNotMeasuring" value={values.reasonHtNotMeasuring}
                                  onChange={handleChange}
                                  onBlur={handleBlur} error={touched.reasonHtNotMeasuring && !!errors.reasonHtNotMeasuring}>
                                  <FormControlLabel value="Not present at the time of measuring" control={<Radio />} label={t('not_present_at_the_time_of_measuring')} />
                                  <FormControlLabel value="Sick" control={<Radio />} label={t('sick')} />
                                  <FormControlLabel value="Not willing to be measured" control={<Radio />} label={t('not_willing_to_be_measured')} />
                                  <FormControlLabel value="Other" control={<Radio />} label={t('other')} />
                                </RadioGroup>
                                {touched.reasonHtNotMeasuring && errors.reasonHtNotMeasuring && (
                                  <div className={styles.error}>{errors.reasonHtNotMeasuring}</div>
                                )}
                              </Grid>
                              {values.reasonHtNotMeasuring === 'Other' && (
                                <Grid item xs={7} className={{
                                  [styles.invalid]: touched.reasonHtNotMeasuring_other && !!errors.reasonHtNotMeasuring_other,
                                }}>
                                  <label className={styles.label} htmlFor="reasonHtNotMeasuring_other">
                                    {t('please_specify')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="reasonHtNotMeasuring_other"
                                    id="reasonHtNotMeasuring_other"
                                    value={values.reasonHtNotMeasuring_other}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    inputProps={{ maxLength: 150 }}
                                    error={touched.reasonHtNotMeasuring_other && !!errors.reasonHtNotMeasuring_other}
                                    helperText={touched.reasonHtNotMeasuring_other && errors.reasonHtNotMeasuring_other}
                                  />
                                </Grid>
                              )}
                            </>
                          ) : (
                            // ANTH2.2: Position height/length measured (if not 999)
                            <Grid item xs={12} sm={7} className={{
                              [styles.invalid]: touched.positionHtMeasured && !!errors.positionHtMeasured,
                            }}>
                              <label className={styles.label} htmlFor="positionHtMeasured">
                                {t('anth2_2')} <span className={styles.requiredStar}>*</span>
                              </label>
                              <RadioGroup aria-label="Position height measured" name="positionHtMeasured" size="small"
                                id="positionHtMeasured" value={values.positionHtMeasured}
                                onChange={handleChange}
                                onBlur={handleBlur} error={touched.positionHtMeasured && !!errors.positionHtMeasured}>
                                <FormControlLabel value={t('standing_up')} control={<Radio />} label={t('standing_up')} />
                                <FormControlLabel value={t('lying_down')} control={<Radio />} label={t('lying_down')} />
                              </RadioGroup>
                              {touched.positionHtMeasured && errors.positionHtMeasured && (
                                <div className={styles.error}>{errors.positionHtMeasured}</div>
                              )}
                            </Grid>
                          )}

                          {/* ANTH3: Presence of bilateral pitting oedema */}
                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.presentBilateralOedema && !!errors.presentBilateralOedema,
                          }}>
                            <label className={styles.label} htmlFor="presentBilateralOedema">
                              {t('anth3')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('anth3_note')}</em>
                            <RadioGroup aria-label="Presence of oedema" name="presentBilateralOedema" size="small"
                              id="presentBilateralOedema" value={values.presentBilateralOedema}
                              onChange={handleChange}
                              onBlur={handleBlur} error={touched.presentBilateralOedema && !!errors.presentBilateralOedema}>
                              <FormControlLabel value={t('yes')} control={<Radio />} label={t('yes')} />
                              <FormControlLabel value={t('no')} control={<Radio />} label={t('no')} />
                              <FormControlLabel value={t('not_assessed')} control={<Radio />} label={t('not_assessed')} />
                            </RadioGroup>
                            {touched.presentBilateralOedema && errors.presentBilateralOedema && (
                              <div className={styles.error}>{errors.presentBilateralOedema}</div>
                            )}
                          </Grid>
                          {/* ANTH3.1: Reason for not assessing oedema */}
                          {values.presentBilateralOedema === 'Not assessed' && (
                            <>
                              <Grid item xs={12} sm={7} className={{
                                [styles.invalid]: touched.reasonNotAssessing && !!errors.reasonNotAssessing,
                              }}>
                                <label className={styles.label} htmlFor="reasonNotAssessing">
                                  {t('anth3_1')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <RadioGroup aria-label="Reason not assessing oedema" name="reasonNotAssessing" size="small"
                                  id="reasonNotAssessing" value={values.reasonNotAssessing}
                                  onChange={handleChange}
                                  onBlur={handleBlur} error={touched.reasonNotAssessing && !!errors.reasonNotAssessing}>
                                  <FormControlLabel value="Not present at the time of assessment" control={<Radio />} label={t('not_present_at_the_time_of_assessment')} />
                                  <FormControlLabel value="Sick" control={<Radio />} label={t('sick')} />
                                  <FormControlLabel value="Not willing to be assessed" control={<Radio />} label={t('not_willing_to_be_assessed')} />
                                  <FormControlLabel value="Other" control={<Radio />} label={t('other')} />
                                </RadioGroup>
                                {touched.reasonNotAssessing && errors.reasonNotAssessing && (
                                  <div className={styles.error}>{errors.reasonNotAssessing}</div>
                                )}
                              </Grid>
                              {values.reasonNotAssessing === 'Other' && (
                                <Grid item xs={7} className={{
                                  [styles.invalid]: touched.reasonNotAssessing_other && !!errors.reasonNotAssessing_other,
                                }}>
                                  <label className={styles.label} htmlFor="reasonNotAssessing_other">
                                    {t('please_specify')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                  <TextField
                                    size="small"
                                    className={styles.formInput}
                                    name="reasonNotAssessing_other"
                                    id="reasonNotAssessing_other"
                                    value={values.reasonNotAssessing_other}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    inputProps={{ maxLength: 150 }}
                                    error={touched.reasonNotAssessing_other && !!errors.reasonNotAssessing_other}
                                    helperText={touched.reasonNotAssessing_other && errors.reasonNotAssessing_other}
                                  />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* ANTH4: Nutritional category — auto-set from WHZ (ANTH1 weight + ANTH2 height) */}
                          <Grid item xs={12} sm={7} className={{
                            [styles.invalid]: touched.nutritionalCategory && !!errors.nutritionalCategory,
                          }}>
                            <label className={styles.label} htmlFor="nutritionalCategory">
                              {t('anth4')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <em>{t('anth4_note')}</em>
                            {(() => {
                              const oedemaYes = values.presentBilateralOedema === 'Yes';
                              const skip =
                                values.current_wt === '999' || String(values.current_wt) === '999' ||
                                values.currentHt === '999' || String(values.currentHt) === '999';
                              const whz = (skip || oedemaYes) ? null : calculateWHZ(
                                values.current_wt, values.currentHt,
                                values.childAgeMonths, values.childSex
                              );
                              const outOfRange = whz !== null && (whz < -6 || whz > 6);
                              const autoSet = oedemaYes || (whz !== null && !outOfRange);
                              return (
                                <>
                                  {/* WHZ could not be calculated — measurements present but age/sex missing or out of range */}
                                  {!skip && !oedemaYes && whz === null &&
                                    parseFloat(values.current_wt) > 0 && parseFloat(values.currentHt) > 0 && (
                                    <Box sx={{ mb: 1.5, p: 1.5, backgroundColor: '#fff8e1', borderRadius: 1, border: '1px solid #ffb300' }}>
                                      <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 600 }}>
                                        ⚠ WHZ score could not be calculated
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#e65100', display: 'block', mt: 0.25 }}>
                                        Please ensure the child's sex and date of birth are correctly entered (valid age: 0–60 months).
                                      </Typography>
                                    </Box>
                                  )}
                                  {/* Out-of-range error */}
                                  {outOfRange && (
                                    <Box sx={{ mb: 1.5, p: 1.5, backgroundColor: '#fdecea', borderRadius: 1, border: '1px solid #e57373' }}>
                                      <Typography variant="body2" sx={{ color: '#c62828', fontWeight: 600 }}>
                                        ⚠ WHZ: {whz.toFixed(2)} — out of valid range (−6 to +6)
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#c62828', display: 'block', mt: 0.25 }}>
                                        Data is incorrect. Please enter the correct weight and height values.
                                      </Typography>
                                    </Box>
                                  )}
                                  {/* Bilateral oedema badge — ANTH3=Yes forces SAM */}
                                  {oedemaYes && (
                                    <Box sx={{
                                      display: 'inline-flex', alignItems: 'center', gap: 1,
                                      mb: 1, mt: 0.5, px: 1.5, py: 0.75, borderRadius: 1,
                                      backgroundColor: '#fdecea',
                                      border: '1px solid #e57373',
                                    }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        Bilateral oedema present — SAM
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#555', fontStyle: 'italic' }}>
                                        — auto-selected
                                      </Typography>
                                    </Box>
                                  )}
                                  {/* WHZ badge */}
                                  {!oedemaYes && autoSet && (
                                    <Box sx={{
                                      display: 'inline-flex', alignItems: 'center', gap: 1,
                                      mb: 1, mt: 0.5, px: 1.5, py: 0.75, borderRadius: 1,
                                      backgroundColor: whz < -3 ? '#fdecea' : whz < -2 ? '#fff8e1' : '#e8f5e9',
                                      border: '1px solid',
                                      borderColor: whz < -3 ? '#e57373' : whz < -2 ? '#ffb300' : '#66bb6a',
                                    }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        WHZ: {whz.toFixed(2)} ({classifyWHZ(whz)})
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#555', fontStyle: 'italic' }}>
                                        — auto-selected
                                      </Typography>
                                    </Box>
                                  )}
                                  <RadioGroup aria-label="Nutritional category" name="nutritionalCategory" size="small"
                                    id="nutritionalCategory" value={values.nutritionalCategory}
                                    onChange={handleChange}
                                    onBlur={handleBlur} error={touched.nutritionalCategory && !!errors.nutritionalCategory}
                                    sx={{ pointerEvents: 'none' }}>
                                    <FormControlLabel value="SAM" control={<Radio />} label={
                                      <Typography variant="body2">{t('sam')} <Typography component="span" variant="caption" sx={{ color: '#888' }}>(WHZ &lt; -3)</Typography></Typography>
                                    } />
                                    <FormControlLabel value="MAM" control={<Radio />} label={
                                      <Typography variant="body2">{t('mam')} <Typography component="span" variant="caption" sx={{ color: '#888' }}>(-3 ≤ WHZ &lt; -2)</Typography></Typography>
                                    } />
                                    <FormControlLabel value="Normal" control={<Radio />} label={
                                      <Typography variant="body2">{t('normal')} <Typography component="span" variant="caption" sx={{ color: '#888' }}>(WHZ ≥ -2)</Typography></Typography>
                                    } />
                                  </RadioGroup>
                                </>
                              );
                            })()}
                          </Grid>

                          {/* ANTH5: Is the child enrolled in the CMAM programme? */}
                          {(values.nutritionalCategory === 'SAM' || values.nutritionalCategory === 'MAM') && (
                            <Grid item xs={12} sm={7} className={{
                              [styles.invalid]: touched.childEnrollCmam && !!errors.childEnrollCmam,
                            }}>
                              <label className={styles.label} htmlFor="childEnrollCmam">
                                {t('anth5')} <span className={styles.requiredStar}>*</span>
                              </label>
                              <em>{t('anth5_note')}</em>
                              <RadioGroup aria-label="Child enrolled CMAM" name="childEnrollCmam" size="small"
                                id="childEnrollCmam" value={values.childEnrollCmam}
                                onChange={handleChange}
                                onBlur={handleBlur} error={touched.childEnrollCmam && !!errors.childEnrollCmam}>
                                <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                                <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                              </RadioGroup>
                              {touched.childEnrollCmam && errors.childEnrollCmam && (
                                <div className={styles.error}>{errors.childEnrollCmam}</div>
                              )}
                            </Grid>
                          )}
                          {/* Show message if ANTH5 is No */}
                          {values.childEnrollCmam === 'No' && (values.nutritionalCategory === 'SAM' || values.nutritionalCategory === 'MAM') && (
                            <Grid item xs={12}>
                              <Typography color="error" variant="body1">
                                {t('cmam_enrollment_message')}
                              </Typography>
                            </Grid>
                          )}

                          {/* Location capture - small but visible for proper initialization */}
                          <div style={{ height: '1px', width: '1px', overflow: 'hidden', position: 'absolute', top: '-1000px' }}>
                            {/* <MapComponent
                              setCoordinates={(coords) => {
                                console.log("📍 COORDINATES RECEIVED:", coords);
                                setCoordinates(coords);
                              }}
                              setAddressDetails={(details) => {
                                console.log('📍 LOCATION DETAILS:', details);
                              }}
                            /> */}
                          </div>
                        </Grid>
                      </Box>
                      {
                        loadingStatus && <Loader loading={loadingStatus} />
                      }
                        <Grid item xs={12} display={"flex"} alignItems={"center"} justifyContent={"center"}>
                            {step === 1 && (
                              <Button 
                                variant="contained" 
                                color="primary" 
                                style={{ marginRight: "20px" }} 
                                onClick={handleBack} 
                                startIcon={<ArrowBack />}
                              >
                                {t('back')}
                              </Button>
                            )}

                            {values.careGiverInterview === 'No' ? (
                              <>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  type="submit"
                                  endIcon={<Check />}
                                  disabled={loadingStatus || submitButtonDisabled}
                                >
                                  {loadingStatus ? 'Submitting...' : (isOnline ? t('submit') : t('save'))}
                                </Button>
                                {showSaveOfflineOption && isOnline && (
                                  <Button
                                    variant="outlined"
                                    color="warning"
                                    onClick={() => handleSaveOffline(values, { resetForm, setSubmitting: () => {} })}
                                    disabled={loadingStatus}
                                    sx={{ ml: 2 }}
                                  >
                                    {t('saveOffline')}
                                  </Button>
                                )}
                              </>
                            ) : step === 1 ? (
                              <>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  type="submit"
                                  endIcon={<Check />}
                                  disabled={loadingStatus || submitButtonDisabled}
                                >
                                  {loadingStatus ? 'Submitting...' : (isOnline ? t('submit') : t('save'))}
                                </Button>
                                {showSaveOfflineOption && isOnline && (
                                  <Button
                                    variant="outlined"
                                    color="warning"
                                    onClick={() => handleSaveOffline(values, { resetForm, setSubmitting: () => {} })}
                                    disabled={loadingStatus}
                                    sx={{ ml: 2 }}
                                  >
                                    {t('saveOffline')}
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Button
                                variant="contained"
                                color="primary"
                                size="large"
                                fullWidth={false}
                                type="submit"
                                startIcon={<ArrowForward />}
                                disabled={loadingStatus || submitButtonDisabled}
                              >
                                {t('next')}
                              </Button>
                            )}
                        </Grid>
                    </>
                  )}
                </Form>
                );
              }}
            
            </Formik>
          </Box>
        </Container>
      </div>
    </>
  );
};

export default BiAnnual;
