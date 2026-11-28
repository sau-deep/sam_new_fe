// Parse and serialize RMC answers that have an "Other (please specify)" option
// (audit A02, A13, E03). Used by the record editor (SectionFieldRenderer) and
// its validation (rmcValidation).
//
// Stored formats this reads:
//   multi-select:  "optA, optB, Others - free text, with commas"
//                  "optA, others"                  (Other ticked, no text)
//                  "Others - text, optB"            (older rows: Other not last)
//                  '["optA","optB"]'                (JSON array)
//   single choice: "Others - text", "Other - text", "Any Other - text",
//                  "Any other - text", or the bare option ("Others", "Any Other").
//
// New writes always put the Other entry last as "Others - <detail>", so a
// detail containing commas reads back unchanged.

import { OTHERS_PREFIX } from 'utils/textLimits';

/** Option keys that are the special "Other" option. Exact matches only. */
export const OTHER_OPTION_KEYS = Object.freeze(['other', 'others', 'Other', 'Others', 'othersAdvice']);

// "Others - x", "Other - x", "Any Other - x", "Any other - x" (case-insensitive).
const OTHER_PREFIX_RE = /^(?:others?|any\s+other)\s+-\s?/i;
// Bare Other tokens, incl. an empty "Others -".
const BARE_OTHER_RE = /^(?:others?|othersadvice|any\s+other)(?:\s*-)?\s*$/i;

const lower = (s) => String(s ?? '').trim().toLowerCase();

/** The option key in `options` that is the Other option, or null. */
export function findOtherOptionKey(options = []) {
  return options.find((o) => OTHER_OPTION_KEYS.includes(o)) || null;
}

/** True when a single stored token means "Other" without a detail. */
export function isBareOtherToken(token) {
  return BARE_OTHER_RE.test(String(token ?? '').trim());
}

/** Detail text of a token like "Others - text", or null when it is not one. */
export function otherDetailOf(token) {
  const s = String(token ?? '').replace(/^\s+/, '');
  const m = s.match(OTHER_PREFIX_RE);
  return m ? s.slice(m[0].length) : null;
}

function matchOption(token, options, displayNames) {
  const t = lower(token);
  if (!t) return null;
  return options.find((o) => lower(o) === t || (displayNames?.[o] && lower(displayNames[o]) === t)) || null;
}

function toTokens(value) {
  if (value === undefined || value === null || value === '') return { list: [], joined: false };
  if (Array.isArray(value)) return { list: value.map((v) => String(v)), joined: false };
  const s = String(value);
  const trimmed = s.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return { list: parsed.map((v) => String(v)), joined: false };
    } catch { /* not JSON */ }
  }
  return { list: s.split(','), joined: true };
}

/**
 * Parse a stored multi-select answer.
 * @returns {{ selected: string[], otherSelected: boolean, otherText: string, extras: string[] }}
 *   selected: option keys (exact, in stored order); extras: stored tokens that
 *   match no option and are kept so an edit never drops them.
 */
export function parseMultiSelect(value, { options = [], displayNames = {} } = {}) {
  const result = { selected: [], otherSelected: false, otherText: '', extras: [] };
  const otherKey = findOtherOptionKey(options);
  const { list, joined } = toTokens(value);

  let inOtherText = false;
  for (const piece of list) {
    const token = piece.trim();
    if (inOtherText) {
      // Inside a comma-split "Others - ..." detail. New writes put Other last, so
      // everything after the prefix is detail, except in older rows that wrote
      // Other in click order: there an exact stored option KEY (case-sensitive,
      // never a display name or free wording) after the detail is a selection.
      // A detail that itself contains ", <exact option key>" cannot be told
      // apart from such an old row and is read the old way.
      const isOptionKey = options.includes(token) && !OTHER_OPTION_KEYS.includes(token);
      if (!isOptionKey && otherDetailOf(token) === null) {
        result.otherText += `,${piece}`;
        continue;
      }
      inOtherText = false;
    }
    if (!token) continue;

    const detail = otherDetailOf(token);
    if (detail !== null && !isBareOtherToken(token)) {
      result.otherSelected = true;
      // Keep the typed text exactly (incl. trailing space while typing).
      result.otherText = joined ? otherDetailOf(piece) : detail;
      inOtherText = joined;
      continue;
    }
    if (isBareOtherToken(token) || (otherKey && token === otherKey)) {
      result.otherSelected = true;
      continue;
    }
    const key = matchOption(token, options, displayNames);
    if (key) {
      if (!result.selected.includes(key)) result.selected.push(key);
    } else if (!result.extras.includes(token)) {
      result.extras.push(token);
    }
  }
  return result;
}

/**
 * Serialize a multi-select answer: selected keys (in the given order), kept
 * extras, then the Other entry last ("Others - <text>", or the bare Other key
 * when no text has been typed yet).
 */
export function serializeMultiSelect({ selected = [], otherSelected = false, otherText = '', extras = [] }, { options = [] } = {}) {
  const otherKey = findOtherOptionKey(options) || 'others';
  const parts = [...selected.filter((k) => !OTHER_OPTION_KEYS.includes(k)), ...extras];
  if (otherSelected) {
    parts.push(String(otherText ?? '').trim() ? `${OTHERS_PREFIX}${String(otherText).replace(/^\s+/, '')}` : otherKey);
  }
  return parts.join(', ');
}

/**
 * Parse a stored single-choice answer with an Other option.
 * @param {string} otherOption the option value that means Other for this question ("Others", "Other", "Any Other", ...)
 * @returns {{ choice: string, otherText: string, isOther: boolean }}
 */
export function parseSingleChoice(value, otherOption = 'Others') {
  const s = value === undefined || value === null ? '' : String(value);
  const detail = otherDetailOf(s);
  if (detail !== null && !isBareOtherToken(s)) return { choice: otherOption, otherText: detail, isOther: true };
  if (s.trim() && (lower(s) === lower(otherOption) || isBareOtherToken(s))) {
    return { choice: otherOption, otherText: '', isOther: true };
  }
  return { choice: s.trim(), otherText: '', isOther: false };
}

/** Serialize a single-choice answer; the Other choice is stored as "Others - <text>". */
export function serializeSingleChoice(choice, otherText, otherOption = 'Others') {
  if (choice !== otherOption) return choice || '';
  const text = String(otherText ?? '').replace(/^\s+/, '');
  return text.trim() ? `${OTHERS_PREFIX}${text}` : otherOption;
}
