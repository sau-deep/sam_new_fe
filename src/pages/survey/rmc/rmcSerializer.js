// Turns the raw control values of one Routine Monitoring section into the
// request shape the backend stores (audit F01, A01, A13).
//
// Rules kept from the original in-page serializer:
//  - helper inputs (`<x>Other`, `<x>Others`, `<x>Combined`, `other<X>`) are not
//    answers of their own; their text is merged into the main answer as
//    "Others - <detail>";
//  - a `<x>Combined` hidden value, when present, replaces the raw `<x>` answer;
//  - checkbox groups are stored as a ", " separated string;
//  - choice values are mapped back to English with the caller's `toEnglish`.
//
// Changes:
//  - keys that start with "other" but are real answers (Section 10 Q10.9
//    otherRegularFood, the food-frequency rows, CBE observations, Section 11
//    any-other-food) are kept instead of being dropped (A01);
//  - the Other text is looked up only under the answer's own helper names or an
//    explicit mapping, never borrowed from an unrelated question;
//  - Section 10 Q10.25 "othersAdvice" is stored as "Others - <detail>" (A13).

import { OTHERS_PREFIX } from 'utils/textLimits';

/** Keys that begin with "other" but hold an answer of their own. */
export const STANDALONE_OTHER_ANSWER_KEYS = Object.freeze([
  'otherFruitsVegetablesFrequency', // Section 10 food frequency row
  'otherRegularFood',               // Section 10 any other food (A01)
  'otherFruitsVeggiesFrequency',    // Section 11 food frequency row
  'otherRegularFoodItem',           // Section 11 any other food
  'otherImportantObservation',      // CBE 5.7 observations
]);

// Only this one went through the translation step before; the others are free
// text or raw frequency codes and are passed through unchanged.
const TRANSLATED_STANDALONE_KEYS = new Set(['otherFruitsVegetablesFrequency']);

/** Answers whose hidden `<key>Combined` input carries the final value. */
export const COMBINED_FIELD_KEYS = Object.freeze({
  typeOfRecordAvailable: 'typeOfRecordAvailableCombined',
  thrNotReceivedReasonChild: 'thrNotReceivedReasonChildCombined',
  childNotConsumeThr: 'childNotConsumeThrCombined',
  thrQtyPrepareChild: 'thrQtyPrepareChildCombined',
  storeThr: 'storeThrCombined',
  awwActionsDuringVisit: 'awwActionsDuringVisitCombined',
  counsellingAdviceReceive: 'counsellingAdviceReceiveCombined',
  familyAttendedAnnaprashan: 'familyAttendedAnnaprashanCombined',
  qtyPrepareFood: 'qtyPrepareFoodCombined',
  thrStore: 'thrStoreCombined',
});

/**
 * Answers whose Other text lives under a name the generic guess does not find,
 * or whose Other option has a non-standard token.
 */
export const EXPLICIT_OTHER_FIELDS = Object.freeze({
  // Section 9
  foodsOrDrinksReceived: { textKeys: ['otherFoodsOrDrinks'] },
  reasonsNotExclusivelyBreastfed: { textKeys: ['otherReasonsNotBreastfed'] },
  // Section 10 Q10.25 (A13): option token is "othersAdvice"
  adviceReceived: { textKeys: ['otherAdviceReceived'], tokens: ['othersAdvice'] },
  // Section 11 Q11.9
  thrNotReceivedReasonLast3Month: { textKeys: ['thrNotReceivedReasonOther'] },
});

// Option values that mean Other. "Any Other"/"Any other" are the THR quantity / storage
// options; their typed detail must not be dropped when the hidden combined value is bare.
const GENERIC_OTHER_TOKENS = Object.freeze(['others', 'Other', 'Others', 'Any Other', 'Any other']);

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** True for helper inputs that are not answers of their own. */
export function isHelperKey(key) {
  if (STANDALONE_OTHER_ANSWER_KEYS.includes(key)) return false;
  return key.endsWith('Other') || key.endsWith('Others') || key.startsWith('other') || key.endsWith('Combined');
}

/** Names under which the Other text of `key` may be found, in priority order. */
export function otherTextKeysFor(key) {
  const explicit = EXPLICIT_OTHER_FIELDS[key];
  if (explicit) return explicit.textKeys;
  return [`${key}Other`, `${key}Others`, `other${capitalize(key)}`];
}

/** Option tokens that mean "Other" for `key`. */
export function otherTokensFor(key) {
  const explicit = EXPLICIT_OTHER_FIELDS[key];
  return explicit?.tokens ? [...GENERIC_OTHER_TOKENS, ...explicit.tokens] : GENERIC_OTHER_TOKENS;
}

function findOtherText(formData, key) {
  for (const name of otherTextKeysFor(key)) {
    const v = formData[name];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return null;
}

/**
 * Serialize one section's collected values.
 * @param {object} formData raw values keyed by control name (arrays for checkbox groups)
 * @param {{toEnglish?: (v: string) => string}} options
 */
export function serializeSectionValues(formData, { toEnglish = (v) => v } = {}) {
  const out = {};
  if (!formData || typeof formData !== 'object') return out;

  for (const [key, value] of Object.entries(formData)) {
    if (STANDALONE_OTHER_ANSWER_KEYS.includes(key)) {
      out[key] = TRANSLATED_STANDALONE_KEYS.has(key) && typeof value === 'string' ? toEnglish(value) : value;
      continue;
    }
    if (isHelperKey(key)) continue;

    const combinedKey = COMBINED_FIELD_KEYS[key];
    if (combinedKey && formData[combinedKey] !== undefined) {
      out[key] = formData[combinedKey];
      continue;
    }

    const tokens = otherTokensFor(key);
    const otherText = findOtherText(formData, key);

    if (Array.isArray(value)) {
      let mapped = value.map((item) => toEnglish(item));
      if (otherText) {
        const idx = value.findIndex((item) => tokens.includes(item));
        if (idx !== -1) {
          // Kept selections first, the "Others - <detail>" entry last, so a detail
          // containing ", <option>" reads back unambiguously.
          mapped = mapped.filter((_, i) => i !== idx);
          mapped.push(`${OTHERS_PREFIX}${otherText}`);
        }
      }
      out[key] = mapped.join(', ');
    } else {
      let mapped = toEnglish(value);
      if (otherText && tokens.includes(value)) mapped = `${OTHERS_PREFIX}${otherText}`;
      out[key] = mapped;
    }
  }
  return out;
}

/**
 * Build the `toEnglish` mapper the form used: translated labels of common
 * choices go back to the English value the backend stores; anything else
 * (typed text, codes) is returned unchanged.
 */
export function makeToEnglish(t) {
  if (typeof t !== 'function') return (v) => v;
  const pairs = [
    ['always', 'Always (Every day)'],
    ['very_often', 'Very Often (4-5 days a week)'],
    ['often', 'Often (2-3 days a week)'],
    ['sometimes', 'Sometimes (Once a week)'],
    ['rarely', 'Rarely (Few times a month)'],
    ['never', 'Never'],
    ['available', 'Available'],
    ['notAvailable', 'Not Available'],
    ['availableAndFunctional', 'Available and Functional'],
    ['availableButNotFunctional', 'Available but not Functional'],
    ['yes', 'Yes'],
    ['no', 'No'],
    ['others', 'Others'],
    ['other', 'Other'],
    ['aanganwadiCenter', 'Aanganwadi Center'],
    ['cbeSession', 'CBE Session'],
    ['vhsndSessionRISession', 'VHSND Session/RI Session'],
    ['householdCaregiverInteraction', 'Household/caregiver interaction'],
    ['moreThan3', 'More than 3'],
    ['morethan3', 'More than 3'],
  ];
  // Same lookup as before: keyed by the translated label, later entries win.
  const byLabel = {};
  pairs.forEach(([k, english]) => { byLabel[t(k)] = english; });
  return (value) => {
    if (!value || typeof value !== 'string') return value;
    if (t(value) === value) return value; // already English / no translation
    return Object.prototype.hasOwnProperty.call(byLabel, value) ? byLabel[value] : value;
  };
}
