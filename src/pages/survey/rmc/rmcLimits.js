// Storage limits for Routine Monitoring answers (audit F05, contract C4).
//
// "Others - " (9 characters) is stored in front of an Other detail, so the
// limit applies to the whole stored value. A detail may use the column width
// minus the prefix: 60 -> 51 for the CBE theme, 100 -> 91 for the others.
// Lengths are Unicode code points (textLength). Values are never trimmed to
// fit; callers report the error and keep what the surveyor typed.

import { OTHERS_PREFIX, detailLimit, textLength } from 'utils/textLimits';
import { RMC_COLUMN_LIMITS, TEXT, TEXT_MAX_BYTES } from './rmcColumnLimits';

export const LONG_NOTE_MAX = 5000;

/**
 * Caps set by the contract that are tighter than the column (C3/C4), plus the
 * Other questions called out in audit F05. Every other field is limited by its
 * column width from RMC_COLUMN_LIMITS.
 */
export const RMC_FIELD_LIMITS = Object.freeze({
  cbeData: Object.freeze({
    themeOfCbe: 60,                    // 5.1 theme (Other detail <= 51)
    otherImportantObservation: LONG_NOTE_MAX,
  }),
  householdData: Object.freeze({
    familyAttendedAnnaprashan: 100,    // 10.6 Annaprashan (Other detail <= 91)
    qtyPrepareFood: 100,               // 10.19 THR quantity (Other detail <= 91)
    thrStore: 100,                     // 10.20 THR storage (Other detail <= 91)
    otherRegularFood: 500,             // 10.9 any other food (C3)
  }),
  aganwadiData: Object.freeze({
    childFollowupCmam: 100,            // 4.23 follow-up frequency (Other detail <= 91)
  }),
});

/** Section type used by the record editor -> request section key. */
export const SECTION_TYPE_TO_KEY = Object.freeze({
  aganwadi: 'aganwadiData',
  cbe: 'cbeData',
  vhsnd: 'vhsndData',
  household: 'householdData',
});

/** Characters left for an Other detail stored in a column of `column` width. */
export const otherDetailMax = (column) => detailLimit(column, OTHERS_PREFIX);

export const CBE_THEME_OTHER_MAX = otherDetailMax(RMC_FIELD_LIMITS.cbeData.themeOfCbe);                    // 51
export const ANNAPRASHAN_OTHER_MAX = otherDetailMax(RMC_FIELD_LIMITS.householdData.familyAttendedAnnaprashan); // 91
export const THR_QTY_OTHER_MAX = otherDetailMax(RMC_FIELD_LIMITS.householdData.qtyPrepareFood);            // 91
export const THR_STORE_OTHER_MAX = otherDetailMax(RMC_FIELD_LIMITS.householdData.thrStore);                // 91
export const FOLLOWUP_FREQ_OTHER_MAX = otherDetailMax(RMC_FIELD_LIMITS.aganwadiData.childFollowupCmam);    // 91

/**
 * Character limit for one field: the contract cap when there is one, else its
 * VARCHAR width. TEXT columns (byte-limited) and unknown fields return undefined.
 */
export function columnLimitFor(sectionKey, field) {
  const cap = RMC_FIELD_LIMITS[sectionKey]?.[field];
  const column = RMC_COLUMN_LIMITS[sectionKey]?.[field];
  const width = typeof column === 'number' ? column : undefined;
  if (cap !== undefined && width !== undefined) return Math.min(cap, width);
  return cap !== undefined ? cap : width;
}

/** Characters left for an Other detail of `field` (column minus the "Others - " prefix). */
export function otherDetailMaxFor(sectionKey, field) {
  const limit = columnLimitFor(sectionKey, field);
  return limit === undefined ? undefined : otherDetailMax(limit);
}

const utf8Bytes = (value) => {
  try {
    return new TextEncoder().encode(String(value)).length;
  } catch {
    return unescape(encodeURIComponent(String(value))).length;
  }
};

/** Error text for a typed Other detail over `max`, or null. */
export function otherDetailError(detail, max) {
  const len = textLength(String(detail ?? '').trim());
  if (len <= max) return null;
  return `Please keep this to ${max} characters or fewer (currently ${len}).`;
}

/** Error and counter text for an Other detail input with `max` characters. */
export function otherDetailFeedback(detail, max) {
  const error = otherDetailError(detail, max);
  return { error, helperText: error || `${textLength(String(detail ?? '').trim())}/${max}` };
}

/** Error text for a long free-text note over `max`, or null. */
export function noteError(text, max = LONG_NOTE_MAX) {
  const len = textLength(text);
  if (len <= max) return null;
  return `Please keep this to ${max} characters or fewer (currently ${len}).`;
}

/**
 * Error for one stored value against its column, phrased in terms of what the
 * surveyor typed (the Other detail when the value is "Others - <detail>").
 */
export function storedValueError(value, column) {
  if (value === undefined || value === null) return null;
  const s = String(value);
  const len = textLength(s);
  if (len <= column) return null;
  if (s.startsWith(OTHERS_PREFIX)) {
    const max = otherDetailMax(column);
    return `The Other (please specify) text can be at most ${max} characters (currently ${len - textLength(OTHERS_PREFIX)}).`;
  }
  return `This answer can be at most ${column} characters (currently ${len}).`;
}

/**
 * Check every field of a section object (or of the top level when sectionKey
 * is '') against its contract cap and column width. Returns { field: message }.
 * @param {string} sectionKey request key, e.g. 'cbeData'
 */
export function sectionLimitErrors(sectionKey, data) {
  const errors = {};
  if (!data || typeof data !== 'object') return errors;
  const columns = RMC_COLUMN_LIMITS[sectionKey] || {};
  const caps = RMC_FIELD_LIMITS[sectionKey] || {};
  Object.entries(data).forEach(([field, value]) => {
    if (typeof value !== 'string') return;
    const limit = columnLimitFor(sectionKey, field);
    let msg = limit !== undefined ? storedValueError(value, limit) : null;
    if (!msg && columns[field] === TEXT && caps[field] === undefined) {
      const bytes = utf8Bytes(value);
      if (bytes > TEXT_MAX_BYTES) msg = `This answer is too long to store (${bytes} bytes; the limit is ${TEXT_MAX_BYTES}). Please shorten it.`;
    }
    if (msg) errors[field] = msg;
  });
  return errors;
}

/**
 * Check a complete RMC request (top level and all four sections). Returns
 * { 'cbeData.themeOfCbe': message, village: message, ... } using the same key
 * paths as the backend's fieldErrors (C1).
 */
export function routineRequestLimitErrors(request) {
  const errors = {};
  if (!request) return errors;
  const top = {};
  Object.keys(RMC_COLUMN_LIMITS['']).forEach((k) => { if (k in request) top[k] = request[k]; });
  Object.entries(sectionLimitErrors('', top)).forEach(([field, msg]) => { errors[field] = msg; });
  ['aganwadiData', 'cbeData', 'vhsndData', 'householdData'].forEach((sectionKey) => {
    const sectionErrors = sectionLimitErrors(sectionKey, request[sectionKey]);
    Object.entries(sectionErrors).forEach(([field, msg]) => { errors[`${sectionKey}.${field}`] = msg; });
  });
  return errors;
}
