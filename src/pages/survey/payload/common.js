// Shared pieces of the survey submission path (audit W1 / F10 / C1 / C8).
//
// Every survey page builds ONE request from its Formik values, validates that
// final request, and then either POSTs it or queues it offline. Retry and the
// post-failure "Save Offline" reuse the already-built request; nothing here ever
// rebuilds a request from an encoded payload.
import * as Yup from 'yup';
import { isApiSuccess, apiErrorMessage, apiFieldErrors, isValidationFailure } from 'utils/apiResult';
import { textLength, isBlank, lengthError, fitsIn } from 'utils/textLimits';

/** Where a completed or queued survey returns to (C8 / A12). */
export const SURVEY_LIST_ROUTE = '/surveys';

/** Max characters for a typed "Other" detail stored in its own column (C3). */
export const OTHER_DETAIL_MAX = 200;

/** Max characters for long free-text notes (C4). */
export const LONG_NOTE_MAX = 5000;

export const REQUIRED_MESSAGE = 'This is a required field';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export const trimText = value => (value === undefined || value === null ? '' : String(value).trim());

/** The trimmed Other detail when `choice` is the Other option, otherwise null (C3). */
export function detailOrNull(choice, detail, otherValue = 'Other') {
  if (choice !== otherValue) return null;
  return isBlank(detail) ? null : trimText(detail);
}

export const isIsoDate = value => typeof value === 'string' && DATE_RE.test(value);

/**
 * Today's date on the device as "YYYY-MM-DD" (local calendar, not UTC), used as
 * the default visit date. The backend now keeps the date the client sends (F09),
 * so a UTC default would record the previous day for visits before 05:30 IST.
 */
export function localIsoDate(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export const isClockTime = value => typeof value === 'string' && TIME_RE.test(value);

/** Typed but made only of spaces (an optional name may be empty, never just spaces). */
export const isOnlySpaces = value => typeof value === 'string' && value.length > 0 && value.trim() === '';
export const ONLY_SPACES_MESSAGE = 'This cannot be only spaces';

/** Message for a text that is longer than `max` characters, or null. */
export function tooLongMessage(value, max, label) {
  return lengthError(value, max, label);
}

// ── Yup rule builders (live UI validation uses the same limits as the final check) ──

/** Optional text of at most `max` characters (Unicode code points). */
export const maxCharsRule = (max, label) => Yup.string().nullable().test(
  'max-chars',
  ({ value }) => lengthError(value, max, label),
  value => fitsIn(max)(value),
);

/** Required text: whitespace-only is rejected (schema v2), at most `max` characters. */
export const requiredTextRule = (max, label) => Yup.string().nullable()
  .test('required-text', REQUIRED_MESSAGE, value => !isBlank(value))
  .test('max-chars', ({ value }) => lengthError(value, max, label), value => fitsIn(max)(value));

/**
 * Detail for an "Other" choice: required while `parent[mainField] === otherValue`
 * (and the question is asked), and its trimmed text must fit `max` characters.
 */
export const otherDetailRule = ({ mainField, max, label = 'Other detail', otherValue = 'Other', isAsked = () => true }) =>
  Yup.string().nullable()
    .test('other-required', 'Please specify the other answer', function check(value) {
      const p = this.parent || {};
      if (p[mainField] !== otherValue || !isAsked(p)) return true;
      return !isBlank(value);
    })
    .test('other-max', ({ value }) => lengthError(trimText(value), max, label), function check(value) {
      const p = this.parent || {};
      if (p[mainField] !== otherValue || !isAsked(p)) return true;
      return textLength(trimText(value)) <= max;
    });

// ── Validation result helpers ──────────────────────────────────────────────────

/** { path: firstMessage } from a Yup ValidationError (abortEarly:false). */
export function yupErrorMap(err) {
  const out = {};
  if (!err) return out;
  const items = Array.isArray(err.inner) && err.inner.length ? err.inner : [err];
  items.forEach(e => {
    if (e && e.path && !(e.path in out)) out[e.path] = e.message;
  });
  return out;
}

/** Validate `values` against each schema (nulls skipped) and merge every error. */
export async function collectYupErrors(schemas, values) {
  const out = {};
  for (const schema of schemas) {
    if (!schema) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      await schema.validate(values, { abortEarly: false });
    } catch (err) {
      Object.entries(yupErrorMap(err)).forEach(([k, v]) => { if (!(k in out)) out[k] = v; });
    }
  }
  return out;
}

/**
 * Translate errors keyed by request JSON names into Formik field names.
 * `toField(key, values)` returns the form field for a request key; keys that
 * do not correspond to a field present in `values` are returned in `unmatched`.
 */
export function mapRequestErrors(errors, toField, values) {
  const fields = {};
  const unmatched = {};
  Object.entries(errors || {}).forEach(([key, message]) => {
    const field = toField ? toField(key, values) : key;
    if (field && values && Object.prototype.hasOwnProperty.call(values, field)) {
      if (!(field in fields)) fields[field] = String(message);
    } else {
      unmatched[key] = String(message);
    }
  });
  return { fields, unmatched };
}

// ── Online submission ─────────────────────────────────────────────────────────

/**
 * POST a prepared survey request and classify the outcome. Never throws.
 * status: 'ok' | 'invalid' (server rejected the data: fix it, don't retry) |
 *         'auth' (session expired) | 'failed' (network/server problem: retry or queue).
 */
export async function sendSurvey(post, url, request, clientSubmissionId) {
  const config = clientSubmissionId ? { params: { clientSubmissionId } } : {};
  try {
    const body = await post(url, request, config);
    if (isApiSuccess(body)) return { status: 'ok', body };
    const invalid = isValidationFailure(body);
    return {
      status: invalid ? 'invalid' : 'failed',
      body,
      statusCode: body?.statusCode ?? 'Unknown',
      message: apiErrorMessage(body, 'Form submission failed'),
      fieldErrors: apiFieldErrors(body),
    };
  } catch (error) {
    const httpStatus = error?.response?.status ?? error?.status;
    if (httpStatus === 401 || httpStatus === 403) {
      return { status: 'auth', error, statusCode: httpStatus, message: 'Session expired. Please login again.' };
    }
    const invalid = isValidationFailure(error);
    return {
      status: invalid ? 'invalid' : 'failed',
      error,
      statusCode: httpStatus ?? 'Network',
      message: apiErrorMessage(error, 'Could not reach the server. Please try again.'),
      fieldErrors: apiFieldErrors(error),
    };
  }
}

/** Short summary for a snackbar: the first problem plus how many fields need attention. */
export function errorSummary(fieldErrors, fallback = 'Please correct the highlighted fields.') {
  const messages = Object.values(fieldErrors || {});
  if (messages.length === 0) return fallback;
  const count = messages.length;
  return `${count} field(s) need attention. ${messages[0]}`;
}
