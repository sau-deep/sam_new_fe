// Shared text-limit and "Other" encoding helpers (audit F05, F06, F07, W2).
//
// Lengths are counted in Unicode code points, which is how MySQL utf8mb4
// VARCHAR(n) counts characters (Hindi text included). Validate the FINAL
// serialized value that will be stored, prefix included. Never trim valid
// content to make it fit: report an error and keep what the surveyor typed.

/** Prefix RMC uses when it stores an Other answer ("Others - <detail>"), 9 characters. */
export const OTHERS_PREFIX = 'Others - ';
/** Prefix Follow-Up uses for Other answers ("Other - <detail>"), 8 characters. */
export const OTHER_PREFIX = 'Other - ';

/** Length in characters as the database counts them. */
export function textLength(value) {
  if (value === undefined || value === null) return 0;
  return Array.from(String(value)).length;
}

export function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

/** Characters left for the typed detail once the prefix is stored in a column of `columnLength`. */
export function detailLimit(columnLength, prefix = '') {
  return Math.max(0, columnLength - textLength(prefix));
}

/** Error text for a value that does not fit, or null when it fits. */
export function lengthError(value, max, label = 'This answer') {
  const len = textLength(value);
  if (len <= max) return null;
  return `${label} can be at most ${max} characters (currently ${len}).`;
}

/** Yup test helper: `.test('max-chars', msg, fitsIn(80))` counts code points, not UTF-16 units. */
export function fitsIn(max) {
  return value => textLength(value) <= max;
}

/** "Others - <detail>" style encoding used by existing stored values. */
export function encodeOther(prefix, detail) {
  return `${prefix}${String(detail ?? '').trim()}`;
}

/**
 * Parse a stored single answer that may be an Other encoding.
 * Recognizes the given prefixes (case-insensitive) and bare legacy tokens
 * such as 'other', 'others', 'othersAdvice'. Returns { isOther, detail }.
 */
export function parseOther(value, { prefixes = [OTHERS_PREFIX, OTHER_PREFIX], legacyTokens = ['other', 'others'] } = {}) {
  if (isBlank(value)) return { isOther: false, detail: '' };
  const s = String(value).trim();
  const lower = s.toLowerCase();
  for (const p of prefixes) {
    const pl = p.toLowerCase();
    if (lower.startsWith(pl)) return { isOther: true, detail: s.slice(p.length).trim() };
    const bare = pl.replace(/\s*-\s*$/, '').trim();
    if (lower === bare) return { isOther: true, detail: '' };
  }
  if (legacyTokens.map(t => t.toLowerCase()).includes(lower)) return { isOther: true, detail: '' };
  return { isOther: false, detail: '' };
}
