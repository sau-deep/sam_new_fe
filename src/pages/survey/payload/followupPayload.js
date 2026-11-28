// Canonical request builder and final-payload validator for the Follow-Up
// assessment, POST /form/followup (audit F04, F06, F09, F10, W1).
//
// Submit (online and offline), the direct Save Offline button and Retry all use
// buildFollowupPayload + validateFollowupRequest; Retry and the post-failure
// Save Offline reuse the built request instead of re-encoding it.
import { OTHER_PREFIX, detailLimit, encodeOther, isBlank, lengthError, textLength } from 'utils/textLimits';
import {
  LONG_NOTE_MAX, ONLY_SPACES_MESSAGE, OTHER_DETAIL_MAX, REQUIRED_MESSAGE, detailOrNull, isIsoDate, isOnlySpaces, trimText,
} from './common';
import { FOLLOWUP_COLUMNS, checkColumns } from './columnLimits';

export const FOLLOWUP_URL = '/form/followup';

/** Column widths (C3 / C4). Sex and chronic condition keep the "Other - <text>" encoding. */
export const FOLLOWUP_LIMITS = Object.freeze({
  nameOfRespondent: 50,
  childName: 80,
  sexOfRespondent: 20,
  childSex: 30,
  chronicMedicalConditionSpecify: 255,
  otherDetail: OTHER_DETAIL_MAX,
  relevantInfo: LONG_NOTE_MAX,
});

/** Characters left for the typed detail once "Other - " is stored with it. */
export const FOLLOWUP_DETAIL_LIMITS = Object.freeze({
  sexOfRespondent: detailLimit(FOLLOWUP_LIMITS.sexOfRespondent, OTHER_PREFIX), // 12
  childSex: detailLimit(FOLLOWUP_LIMITS.childSex, OTHER_PREFIX), // 22
  chronicMedicalConditionSpecify: detailLimit(FOLLOWUP_LIMITS.chronicMedicalConditionSpecify, OTHER_PREFIX), // 247
});

/** FD3 "other food" text is saved inside the FD3 string under this key; the follow-up Excel export reads it. */
export const FD3_OTHER_FOOD_KEY = 'Specify any other food item given';

/** FD1 (and FD2–FD4, which depend on it) is asked only when CQ5 age in months is more than 6. */
export const isFeedingSectionAsked = childAgeMonths => Number(childAgeMonths) > 6;

/** Blank values for FD1–FD4, used when the child is 6 months or younger. */
export const FEEDING_SECTION_RESET = Object.freeze({
  fedSolidOrSemisolidFood: '',
  timesFedSolidOrSemisolidFood: '',
  yesterdayFoodItemsConsumed: [],
  yesterdayFoodItemsConsumed_other: '',
  howToEnrichHomemadeFood: '',
  howToEnrichHomemadeFood_other: '',
});

/** Drop FD1–FD4 answers that do not apply because the child is 6 months or younger. */
export function withoutSkippedFeedingAnswers(v) {
  if (!v || isFeedingSectionAsked(v.childAgeMonths)) return v;
  return { ...v, ...FEEDING_SECTION_RESET };
}

/** THR11 / THR13 are shown only when THR was received under the SAM programme and consumed. */
export const isThrUsageAsked = v => !!v
  && v.receivedThr !== 'ChildIsUnderSixMonths'
  && v.receivedThrSam === 'Yes'
  && v.thrConsumed === 'Yes';

/** CQ7 (condition specify) is asked only when CQ6 = Yes. */
export const isChronicSpecifyAsked = v => !!v && v.chronicMedicalCondition === 'Yes';

/**
 * Blank answers to questions that are no longer shown, so a stale hidden "Other"
 * cannot be sent without its detail: THR11/THR13 (+ details) and CQ7 (+ detail).
 */
export function withoutSkippedFollowupAnswers(v) {
  if (!v) return v;
  let out = withoutSkippedFeedingAnswers(v);
  if (!isThrUsageAsked(out)) {
    out = { ...out, quantityThrEveryDay: '', quantityThrEveryDay_other: '', storeThrPacket: '', storeThrPacket_other: '' };
  }
  if (!isChronicSpecifyAsked(out)) {
    out = { ...out, chronicMedicalConditionSpecify: '', chronicMedicalConditionSpecify_other: '' };
  }
  return out;
}

/**
 * Replace a selected "Other" option with "Other - <text>". Matches the option
 * case-insensitively: FD4 stores "Other" while MN14/MN19 store "other".
 */
export function processStringWithOther(value, otherValue) {
  if (value && otherValue && otherValue.trim()) {
    const selectedValues = value.split(', ').filter(Boolean);
    if (selectedValues.some(item => item.toLowerCase() === 'other')) {
      return selectedValues
        .map(item => (item.toLowerCase() === 'other' ? `Other - ${otherValue.trim()}` : item))
        .join(', ');
    }
  }
  return value || '';
}

/** Multi-select array → "a, b, Other - <text>" (legacy encoding). */
export function processArrayWithOther(array, otherValue) {
  if (!Array.isArray(array)) return array || '';
  const values = [...array];
  if (otherValue && otherValue.trim() && values.includes('Other')) {
    values.splice(values.indexOf('Other'), 1);
    values.push(`Other - ${otherValue.trim()}`);
  }
  return values.join(', ');
}

/** FD3 food counts object → "Item - n,..." with the other-food text appended. */
export function processObjectField(obj, otherValue) {
  if (obj && typeof obj !== 'object') return obj;
  // The field starts as [] until a food count is picked, so the other-food text is kept either way
  const entries = obj && !Array.isArray(obj) ? Object.entries(obj) : [];
  if (otherValue && otherValue.trim()) entries.push([FD3_OTHER_FOOD_KEY, otherValue.trim()]);
  if (entries.length === 0) return '';
  return entries.map(([key, value]) => `${key} - ${value}`).join(',');
}

/** "Other - <detail>" when Other has a detail, otherwise the plain choice. */
export function encodeOtherChoice(choice, detail) {
  if (choice === 'Other' && !isBlank(detail)) return encodeOther(OTHER_PREFIX, detail);
  return choice;
}

/** Formik-only keys that never go in the request. */
const UI_ONLY_KEYS = [
  'sexOfRespondent_other', 'childSex_other', 'chronicMedicalConditionSpecify_other',
  'awwInformationDiscussed_other', 'ashaInformationDiscussed_other', 'yesterdayFoodItemsConsumed_other',
  'receivedOtherFoodAwc_other', 'howToEnrichHomemadeFood_other', 'awwCounselingToolsUsed_other',
  'ashaCounselingToolsUsed_other', 'quantityThrEveryDay_other', 'storeThrPacket_other',
];

/**
 * Build the /form/followup request from raw Formik values.
 * options.coordinates, options.enrichLocationCodes, options.locationMetadata as for the other forms.
 * The selected visitDate is sent unchanged (F09).
 */
export function buildFollowupPayload(values, { coordinates = null, enrichLocationCodes = v => v, locationMetadata = () => ({}) } = {}) {
  const v = withoutSkippedFollowupAnswers(values) || {};
  const request = {
    ...enrichLocationCodes(v),
    awwInformationDiscussed: processArrayWithOther(v.awwInformationDiscussed, v.awwInformationDiscussed_other),
    ashaInformationDiscussed: processArrayWithOther(v.ashaInformationDiscussed, v.ashaInformationDiscussed_other),
    yesterdayFoodItemsConsumed: processObjectField(v.yesterdayFoodItemsConsumed, v.yesterdayFoodItemsConsumed_other),
    awwCounselingToolsUsed: processStringWithOther(v.awwCounselingToolsUsed, v.awwCounselingToolsUsed_other),
    ashaCounselingToolsUsed: processStringWithOther(v.ashaCounselingToolsUsed, v.ashaCounselingToolsUsed_other),
    receivedOtherFoodAwc: processStringWithOther(v.receivedOtherFoodAwc, v.receivedOtherFoodAwc_other),
    howToEnrichHomemadeFood: processStringWithOther(v.howToEnrichHomemadeFood, v.howToEnrichHomemadeFood_other),
    // F06: combined "Other - <text>" encoding kept for these three.
    sexOfRespondent: encodeOtherChoice(v.sexOfRespondent, v.sexOfRespondent_other),
    childSex: encodeOtherChoice(v.childSex, v.childSex_other),
    chronicMedicalConditionSpecify: encodeOtherChoice(v.chronicMedicalConditionSpecify, v.chronicMedicalConditionSpecify_other),
    // F04: main answer keeps the plain choice, detail goes in its own key.
    quantityThrEveryDay: v.quantityThrEveryDay,
    storeThrPacket: v.storeThrPacket,
    quantityThrEveryDayOtherText: detailOrNull(v.quantityThrEveryDay, v.quantityThrEveryDay_other),
    storeThrPacketOtherText: detailOrNull(v.storeThrPacket, v.storeThrPacket_other),
    // F09: the date the surveyor selected.
    visitDate: values?.visitDate,
  };
  UI_ONLY_KEYS.forEach(k => { delete request[k]; });

  request.latitude = coordinates?.lat || 0;
  request.longitude = coordinates?.lng || 0;
  Object.assign(request, locationMetadata(coordinates));
  return request;
}

function checkEncodedOther(errors, req, key, column, required, label) {
  const value = req[key];
  if (value === 'Other' && required) {
    errors[key] = 'Please specify the other answer';
    return;
  }
  if (textLength(value) <= column) return;
  const text = String(value);
  // Report an encoded answer in terms of what the surveyor typed.
  errors[key] = text.startsWith(OTHER_PREFIX)
    ? lengthError(text.slice(OTHER_PREFIX.length), detailLimit(column, OTHER_PREFIX), 'Other detail')
    : lengthError(text, column, label);
}

/**
 * Final checks on the request exactly as it will be sent (online or queued).
 * Returns { requestKey: message }; empty when the request is acceptable.
 */
export function validateFollowupRequest(req) {
  const errors = {};
  if (!req) return { request: 'Nothing to submit' };

  if (!isIsoDate(req.visitDate)) errors.visitDate = 'Select the date of visit';

  if (isBlank(req.nameOfRespondent)) errors.nameOfRespondent = REQUIRED_MESSAGE;
  else {
    const e = lengthError(req.nameOfRespondent, FOLLOWUP_LIMITS.nameOfRespondent, 'Respondent name');
    if (e) errors.nameOfRespondent = e;
  }
  const childNameError = isOnlySpaces(req.childName)
    ? ONLY_SPACES_MESSAGE
    : lengthError(req.childName, FOLLOWUP_LIMITS.childName, 'Child name');
  if (childNameError) errors.childName = childNameError;

  // Whole encoded value must fit the column ("Other - " included).
  checkEncodedOther(errors, req, 'sexOfRespondent', FOLLOWUP_LIMITS.sexOfRespondent, true, 'Sex of respondent');
  checkEncodedOther(errors, req, 'childSex', FOLLOWUP_LIMITS.childSex, true, 'Sex of child');
  checkEncodedOther(errors, req, 'chronicMedicalConditionSpecify', FOLLOWUP_LIMITS.chronicMedicalConditionSpecify,
    req.chronicMedicalCondition === 'Yes', 'Chronic condition');

  [['quantityThrEveryDay', 'quantityThrEveryDayOtherText'], ['storeThrPacket', 'storeThrPacketOtherText']].forEach(([field, key]) => {
    const detail = req[key];
    if (req[field] === 'Other') {
      if (isBlank(detail)) errors[key] = 'Please specify the other answer';
      else if (textLength(trimText(detail)) > FOLLOWUP_LIMITS.otherDetail) {
        errors[key] = lengthError(trimText(detail), FOLLOWUP_LIMITS.otherDetail, 'Other detail');
      }
    } else if (detail != null) {
      errors[key] = 'Other detail is only allowed when Other is selected';
    }
  });

  const notesError = lengthError(req.relevantInfo, FOLLOWUP_LIMITS.relevantInfo, 'Other relevant information');
  if (notesError) errors.relevantInfo = notesError;

  // Every other value must fit its column exactly as the backend checks it (F10),
  // "Other - <text>" encodings included.
  Object.entries(checkColumns(req, FOLLOWUP_COLUMNS)).forEach(([key, message]) => {
    if (!errors[key]) errors[key] = message;
  });
  return errors;
}

const ENCODED_OTHER_KEYS = ['sexOfRespondent', 'childSex', 'chronicMedicalConditionSpecify'];
const DETAIL_KEYS = {
  quantityThrEveryDayOtherText: 'quantityThrEveryDay_other',
  storeThrPacketOtherText: 'storeThrPacket_other',
};
/** Multi-select answers stored with "Other - <text>": a too-long value is fixed in the Other text box. */
const MULTI_SELECT_OTHER_INPUTS = {
  awwCounselingToolsUsed: 'awwCounselingToolsUsed_other',
  ashaCounselingToolsUsed: 'ashaCounselingToolsUsed_other',
  receivedOtherFoodAwc: 'receivedOtherFoodAwc_other',
};
const CODE_FIELDS = { stateCode: 'state', districtCode: 'district', blockCode: 'block' };

/**
 * Formik field that shows the error for a request key. An encoded "Other - …"
 * answer is reported on its detail input while Other is selected.
 */
export function followupFieldForKey(key, values) {
  if (DETAIL_KEYS[key]) return DETAIL_KEYS[key];
  if (ENCODED_OTHER_KEYS.includes(key) && values?.[key] === 'Other') return `${key}_other`;
  const otherInput = MULTI_SELECT_OTHER_INPUTS[key];
  if (otherInput && !isBlank(values?.[otherInput])) return otherInput;
  // Location codes are not typed: report them on the dropdown they come from.
  if (CODE_FIELDS[key]) return CODE_FIELDS[key];
  return key;
}
