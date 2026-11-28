// Canonical request builder and final-payload validator for the Household
// checklist, POST /form/household (audit F07, F08, F09, F10, W1).
import { isBlank, lengthError } from 'utils/textLimits';
import { CODE_WIDTHS, padCode } from './childId';
import { REQUIRED_MESSAGE, isClockTime, isIsoDate } from './common';
import { HOUSEHOLD_COLUMNS, checkColumns } from './columnLimits';

export const HOUSEHOLD_URL = '/form/household';

/** Column widths (C4). Names are ordinary JPA strings (255). */
export const HOUSEHOLD_LIMITS = Object.freeze({
  nameParticipant: 255,
  headOfHousehold: 255,
  mobileDigits: 10,
});

export const PHONE_MESSAGE = 'Mobile number must be exactly 10 digits';
const PHONE_RE = /^\d{10}$/;

/**
 * Normalise what was typed or pasted into the phone box: spaces, dashes, dots and
 * brackets are formatting and are removed. Anything else (a "+91" prefix, letters)
 * is left in place so the 10-digit check rejects it instead of silently dropping it.
 */
export function normalizePhoneInput(raw) {
  if (raw === undefined || raw === null) return '';
  return String(raw).replace(/[\s\-.()]/g, '');
}

export const isValidPhone = value => PHONE_RE.test(String(value ?? ''));

/** Codes travel as strings; padded only when shorter, never truncated (C5 / F08). */
const asCode = value => (value === undefined || value === null ? '' : String(value).trim());

/**
 * Build the /form/household request from raw Formik values.
 * The selected date and time and the captured locationHousehold are sent unchanged (F09).
 */
export function buildHouseholdPayload(values, { coordinates = null, locationMetadata = () => ({}) } = {}) {
  const v = values || {};
  return {
    ...v,
    stateCode: asCode(v.stateCode),
    districtCode: asCode(v.districtCode),
    blockCode: asCode(v.blockCode),
    villageCode: padCode(v.villageCode, CODE_WIDTHS.village),
    clusterNumber: asCode(v.clusterNumber),
    structureCode: asCode(v.structureCode),
    householdNumber: asCode(v.householdNumber),
    mobileNumber: v.mobileNumber === undefined || v.mobileNumber === null ? '' : String(v.mobileNumber),
    date: v.date,
    time: v.time,
    locationHousehold: v.locationHousehold,
    latitude: coordinates?.lat,
    longitude: coordinates?.lng,
    ...locationMetadata(coordinates),
  };
}

/**
 * Final checks on the request exactly as it will be sent (online or queued).
 * Returns { requestKey: message }; empty when the request is acceptable.
 */
export function validateHouseholdRequest(req) {
  const errors = {};
  if (!req) return { request: 'Nothing to submit' };

  [['nameParticipant', 'Participant name'], ['headOfHousehold', 'Head of household name']].forEach(([key, label]) => {
    if (isBlank(req[key])) errors[key] = REQUIRED_MESSAGE;
    else {
      const e = lengthError(req[key], HOUSEHOLD_LIMITS[key], label);
      if (e) errors[key] = e;
    }
  });

  if (!isValidPhone(req.mobileNumber)) errors.mobileNumber = PHONE_MESSAGE;
  if (!isIsoDate(req.date)) errors.date = 'Select the date';
  if (!isClockTime(req.time)) errors.time = 'Select the time';
  if (isBlank(req.villageCode)) errors.villageCode = REQUIRED_MESSAGE;

  // Every value must fit its column exactly as the backend checks it (F10).
  Object.entries(checkColumns(req, HOUSEHOLD_COLUMNS)).forEach(([key, message]) => {
    if (!errors[key]) errors[key] = message;
  });
  return errors;
}

const CODE_FIELDS = { stateCode: 'state', districtCode: 'district', blockCode: 'block', villageCode: 'village' };

/** Household request keys are the Formik field names; location codes are reported on their dropdown. */
export const householdFieldForKey = key => CODE_FIELDS[key] || key;
