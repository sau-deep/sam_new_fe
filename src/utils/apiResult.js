// One success rule for SAM API results (audit A04 / A10).
//
// The backend answers with a SAMResponse body: { success, statusCode, message, data }.
// Older producers disagreed with themselves: some sent success=true with a 404/500
// body status, others success=false with 200 for a real update. The body statusCode
// is therefore the source of truth whenever it is set; `success` is only used when
// the body has no status. An HTTP error status always means failure.
//
// Accepts either an axios response ({ status, data }) or an already-unwrapped body.

function unwrap(resOrBody) {
  if (resOrBody && typeof resOrBody === 'object' && 'config' in resOrBody && 'data' in resOrBody && 'status' in resOrBody) {
    return { httpStatus: resOrBody.status, body: resOrBody.data };
  }
  return { httpStatus: null, body: resOrBody };
}

function bodyStatus(body) {
  if (!body || typeof body !== 'object') return null;
  const raw = body.statusCode;
  if (raw === undefined || raw === null || raw === '') return null;
  const code = Number(raw);
  // SAMResponse.statusCode is a Java int: 0 means "not set".
  if (!Number.isFinite(code) || code === 0) return null;
  return code;
}

/** True only for a semantically successful SAM API result. */
export function isApiSuccess(resOrBody) {
  const { httpStatus, body } = unwrap(resOrBody);
  if (httpStatus != null && (httpStatus < 200 || httpStatus >= 300)) return false;
  if (!body || typeof body !== 'object') return false;
  const code = bodyStatus(body);
  if (code != null) return code >= 200 && code < 300;
  return body.success === true;
}

/** Field errors the backend attached to a validation failure: { 'cbeData.themeOther': 'Too long', ... }. */
export function apiFieldErrors(resOrErrorOrBody) {
  const body = resOrErrorOrBody?.response?.data ?? unwrap(resOrErrorOrBody).body;
  const errs = body?.data?.fieldErrors;
  return errs && typeof errs === 'object' ? errs : {};
}

/** Human-readable failure reason from a body, an axios response, or an axios error. */
export function apiErrorMessage(resOrErrorOrBody, fallback = 'The server could not save this. Please try again.') {
  if (!resOrErrorOrBody) return fallback;
  const body = resOrErrorOrBody?.response?.data ?? unwrap(resOrErrorOrBody).body;
  const fieldErrors = apiFieldErrors(body);
  const firstField = Object.values(fieldErrors)[0];
  const msg = (body && typeof body === 'object' && body.message) || firstField || resOrErrorOrBody?.message;
  return msg ? String(msg) : fallback;
}

/**
 * True when a failure was a validation rejection (fix the data) rather than a
 * transient problem (retry later). Offline replay must not retry these blindly.
 */
export function isValidationFailure(resOrErrorOrBody) {
  const httpStatus = resOrErrorOrBody?.response?.status ?? unwrap(resOrErrorOrBody).httpStatus;
  if (httpStatus === 400 || httpStatus === 422) return true;
  const body = resOrErrorOrBody?.response?.data ?? unwrap(resOrErrorOrBody).body;
  const code = bodyStatus(body);
  return code === 400 || code === 422;
}
