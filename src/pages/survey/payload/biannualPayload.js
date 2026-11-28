// Canonical request builder and final-payload validator for the Concurrent
// (Bi-Annual) assessment, POST /form/biannual (audit F02, F03, F07, F09, F10, W1).
//
// Normal Submit (online and offline), the direct Save Offline buttons and Retry
// all go through buildBiannualPayload + validateBiannualRequest. Retry and the
// post-failure Save Offline reuse the request built here; they never feed an
// already-encoded request back into the builder.
import { isBlank, lengthError, textLength } from 'utils/textLimits';
import { buildChildId } from './childId';
import { BIANNUAL_COLUMNS, checkColumns } from './columnLimits';
import {
  ONLY_SPACES_MESSAGE, OTHER_DETAIL_MAX, REQUIRED_MESSAGE, detailOrNull, isIsoDate, isOnlySpaces, otherDetailRule, trimText,
} from './common';

export const BIANNUAL_URL = '/form/biannual';

/** Column widths (C4). */
export const BIANNUAL_LIMITS = Object.freeze({
  caregiverName: 80,
  childName: 80,
  hhHeadReligionOther: 100,
  otherDetail: OTHER_DETAIL_MAX,
});

// When each question is shown (mirrors the conditions in BiAnnual.jsx). The
// caregiver questions (step 2) are shown only when the caregiver is interviewed.
const caregiverStep = v => v.careGiverInterview === 'Yes';
const isNotMeasured = value => String(value ?? '').trim() === '999';

/**
 * The nine single-choice questions whose typed "Other" detail is stored in its
 * own column (C3). `field` keeps its choice value; `detail` is the Formik input;
 * `key` is the request JSON name; `isAsked(values)` says whether the question is
 * shown. A hidden question's answer and detail are not sent.
 */
export const BIANNUAL_OTHER_DETAILS = Object.freeze([
  { field: 'primaryCaregiver', detail: 'primaryCaregiver_other', key: 'primaryCaregiverOtherText', isAsked: () => true },
  { field: 'caregiversex', detail: 'caregiversex_other', key: 'caregiversexOtherText', isAsked: caregiverStep },
  { field: 'childSex', detail: 'childSex_other', key: 'childSexOtherText', isAsked: caregiverStep },
  // GMT1.1 / GMT2.1: only when GMT1 / GMT2 is No
  { field: 'weightNotMeasuredReason', detail: 'weightNotMeasuredReason_other', key: 'weightNotMeasuredReasonOtherText',
    isAsked: v => caregiverStep(v) && v.weightLastMonthAww === 'No' },
  { field: 'heightNotMeasuredReason', detail: 'heightNotMeasuredReason_other', key: 'heightNotMeasuredReasonOtherText',
    isAsked: v => caregiverStep(v) && v.heightLastMonthAww === 'No' },
  // GMT4: only when GMT1 or GMT2 is Yes and GMT3 is Yes
  { field: 'childUndernourishedType', detail: 'childUndernourishedType_other', key: 'childUndernourishedTypeOtherText',
    isAsked: v => caregiverStep(v) && (v.weightLastMonthAww === 'Yes' || v.heightLastMonthAww === 'Yes') && v.childUndernourished === 'Yes' },
  // ANTH1.1 / ANTH2.1: only when the measurement is 999; ANTH3.1: only when oedema was not assessed
  { field: 'reasonWtNotMeasuring', detail: 'reasonWtNotMeasuring_other', key: 'reasonWtNotMeasuringOtherText',
    isAsked: v => caregiverStep(v) && isNotMeasured(v.current_wt) },
  { field: 'reasonHtNotMeasuring', detail: 'reasonHtNotMeasuring_other', key: 'reasonHtNotMeasuringOtherText',
    isAsked: v => caregiverStep(v) && isNotMeasured(v.currentHt) },
  { field: 'reasonNotAssessing', detail: 'reasonNotAssessing_other', key: 'reasonNotAssessingOtherText',
    isAsked: v => caregiverStep(v) && v.presentBilateralOedema === 'Not assessed' },
]);

const OTHER_BY_DETAIL = Object.fromEntries(BIANNUAL_OTHER_DETAILS.map(d => [d.detail, d]));
const OTHER_BY_KEY = Object.fromEntries(BIANNUAL_OTHER_DETAILS.map(d => [d.key, d]));

/**
 * Yup rule for one of the nine `<field>_other` inputs: required (and limited to
 * 200 characters) only while its question is shown and Other is chosen.
 */
export function biannualOtherDetailRule(detailField) {
  const d = OTHER_BY_DETAIL[detailField];
  return otherDetailRule({ mainField: d.field, max: BIANNUAL_LIMITS.otherDetail, label: 'Other detail', isAsked: d.isAsked });
}

/**
 * Blank the answer and the Other detail of each of the nine questions that is no
 * longer shown (its parent condition changed), so a stale hidden "Other" is never
 * sent and never blocks the submission (same approach as Follow-Up).
 */
export function withoutHiddenOtherQuestions(v) {
  if (!v) return v;
  const out = { ...v };
  BIANNUAL_OTHER_DETAILS.forEach(({ field, detail, isAsked }) => {
    if (!isAsked(out)) {
      if (field in out) out[field] = '';
      if (detail in out) out[detail] = '';
    }
  });
  return out;
}

// ── Skip logic ────────────────────────────────────────────────────────────────

/** ANTH5 is asked only for a SAM child (ANTH4) whom the AWW also identified as SAM (ANTH4.1 = Yes). */
export const isAnth5Asked = v => v.nutritionalCategory === 'SAM' && v.samIdentifiedByAww === 'Yes';

/** Answers that depend on another answer; blanked by withoutSkippedCaAnswers when their condition fails. */
export const CA_DEPENDENT_FIELDS = ['hhHeadReligionOther', 'childIllnessType', 'samIdentifiedByAww', 'mamIdentifiedByAww', 'childEnrollCmam'];

/**
 * Blank answers whose skip condition no longer holds, e.g. ANTH4.1 after the
 * auto-calculated ANTH4 changes from SAM to Normal, or CQ6.1 after CQ6 turns No.
 */
export function withoutSkippedCaAnswers(v) {
  if (!v) return v;
  const out = { ...v };
  if (out.hhHeadReligion !== 'Others') out.hhHeadReligionOther = '';
  if (out.childIllnessPast2Weeks !== 'Yes') out.childIllnessType = '';
  if (out.nutritionalCategory !== 'SAM') out.samIdentifiedByAww = '';
  if (out.nutritionalCategory !== 'MAM') out.mamIdentifiedByAww = '';
  if (!isAnth5Asked(out)) out.childEnrollCmam = '';
  return out;
}

/** Multi-select answer → "a,b,Other - <text>" (unchanged legacy encoding). */
export function processArrayWithOther(array, otherValue) {
  if (!Array.isArray(array)) return array || '';
  const values = [...array];
  const otherIndex = values.findIndex(v => String(v).toLowerCase() === 'other');
  if (otherValue && otherIndex !== -1) {
    values.splice(otherIndex, 1);
    values.push(`Other - ${otherValue}`);
  }
  return values.join(',');
}

const MULTI_SELECT_OTHER = [
  'reasonStoppedFeedingw', 'medicineConsumed', 'reasonAdmitted', 'otherThanMilkGiven',
  'otherThanMilkGivenReason', 'awwDiscussion', 'awwCounsel', 'ashaInform', 'ashaUsedtoInform',
];

/** Child ID preview for the form, using the same rule as the request (C5). */
export function biannualChildId(values) {
  if (!values) return null;
  return buildChildId({
    districtCode: values.districtCode,
    blockCode: values.blockCode,
    villageCode: values.villageCode,
    clusterCode: values.clusterCode,
    structureCode: values.structureCode,
    householdNumber: values.householdNumber,
  });
}

/**
 * Build the /form/biannual request from raw Formik values.
 * options.coordinates      – captured { lat, lng, accuracy, timestamp } (or null)
 * options.enrichLocationCodes – re-derives state/district/block/village codes from the selected names
 * options.locationMetadata – surveyLocationMetadata(coordinates)
 * The selected visitDate is sent unchanged (F09).
 */
export function buildBiannualPayload(values, { coordinates = null, enrichLocationCodes = v => v, locationMetadata = () => ({}) } = {}) {
  const cleaned = enrichLocationCodes(withoutHiddenOtherQuestions(withoutSkippedCaAnswers(values))) || {};
  const request = { ...cleaned };

  MULTI_SELECT_OTHER.forEach(field => {
    request[field] = processArrayWithOther(cleaned[field], cleaned[`${field}_other`]);
  });

  // F02: the typed detail goes in its own key; null when the choice is not Other.
  BIANNUAL_OTHER_DETAILS.forEach(({ field, detail, key }) => {
    request[key] = detailOrNull(cleaned[field], cleaned[detail]);
    delete request[detail];
  });

  // F03: the Child ID the form shows is the one that is sent (null when a code is missing).
  request.childId = biannualChildId(cleaned);

  // F09: keep the visit date the surveyor selected.
  request.visitDate = values?.visitDate;

  const lat = coordinates?.lat ?? cleaned.latitude;
  const lng = coordinates?.lng ?? cleaned.longitude;
  request.latitude = lat != null && lat !== '' ? String(lat) : '0';
  request.longitude = lng != null && lng !== '' ? String(lng) : '0';
  Object.assign(request, locationMetadata(coordinates));
  return request;
}

/**
 * Final checks on the request exactly as it will be sent (online or queued).
 * Returns { requestKey: message }; empty when the request is acceptable.
 */
export function validateBiannualRequest(req) {
  const errors = {};
  if (!req) return { request: 'Nothing to submit' };

  if (!isIsoDate(req.visitDate)) errors.visitDate = 'Select the date of visit';

  if (req.careGiverInterview === 'Yes' && isBlank(req.caregiverName)) errors.caregiverName = REQUIRED_MESSAGE;
  else if (isOnlySpaces(req.caregiverName)) errors.caregiverName = ONLY_SPACES_MESSAGE;
  if (isOnlySpaces(req.childName)) errors.childName = ONLY_SPACES_MESSAGE;
  const caregiverNameError = lengthError(req.caregiverName, BIANNUAL_LIMITS.caregiverName, 'Caregiver name');
  if (caregiverNameError && !errors.caregiverName) errors.caregiverName = caregiverNameError;
  const childNameError = lengthError(req.childName, BIANNUAL_LIMITS.childName, 'Child name');
  if (childNameError && !errors.childName) errors.childName = childNameError;

  if (req.hhHeadReligion === 'Others') {
    if (isBlank(req.hhHeadReligionOther)) errors.hhHeadReligionOther = REQUIRED_MESSAGE;
    else {
      const e = lengthError(req.hhHeadReligionOther, BIANNUAL_LIMITS.hhHeadReligionOther, 'Religion detail');
      if (e) errors.hhHeadReligionOther = e;
    }
  }

  BIANNUAL_OTHER_DETAILS.forEach(({ field, key }) => {
    const detail = req[key];
    if (req[field] === 'Other') {
      if (isBlank(detail)) errors[key] = 'Please specify the other answer';
      else if (textLength(trimText(detail)) > BIANNUAL_LIMITS.otherDetail) {
        errors[key] = lengthError(trimText(detail), BIANNUAL_LIMITS.otherDetail, 'Other detail');
      }
    } else if (detail != null) {
      errors[key] = 'Other detail is only allowed when Other is selected';
    }
  });

  // Every other value must fit its column exactly as the backend checks it (F10).
  Object.entries(checkColumns(req, BIANNUAL_COLUMNS)).forEach(([key, message]) => {
    if (!errors[key]) errors[key] = message;
  });
  return errors;
}

const CODE_FIELDS = { stateCode: 'state', districtCode: 'district', blockCode: 'block', villageCode: 'village' };

/** Formik field that shows the error for a request key (server fieldErrors or the final check). */
export function biannualFieldForKey(key) {
  if (OTHER_BY_KEY[key]) return OTHER_BY_KEY[key].detail;
  // Location codes are not typed: report them on the dropdown they come from.
  if (CODE_FIELDS[key]) return CODE_FIELDS[key];
  return key;
}
