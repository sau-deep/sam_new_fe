// Location codes and Child ID (audit F03 / F08, contract C5).
//
// The backend builds the authoritative Child ID with the identical rule
// (sam_BE validation/ChildIdBuilder.java); the form shows this value as a
// preview and also sends it.
//
//  1. Normalise each code (widths below): trim; if it is digits only, strip
//     leading zeros (keep at least one digit) and left-pad with '0' to its width;
//     otherwise keep it exactly as stored and left-pad with '0' only when shorter.
//     Nothing is ever truncated.
//  2. If every normalised code is exactly its width, the ID is the plain
//     concatenation: today's format, so existing numeric IDs are unchanged. The block
//     code has two legacy widths, 4 and 6 (6-digit census block codes give the
//     established 18-character ID), so a 6-character block also keeps the plain format.
//  3. Otherwise the normalised codes are joined with '-' ("045-0123-345-01-02-003"),
//     so variable-width codes cannot run into each other (block 12345 + village 06
//     and block 1234 + village 506 stay different).
//  4. Any missing code gives no ID (null).

export const CODE_WIDTHS = Object.freeze({
  district: 3,
  block: 4,
  village: 2,
  cluster: 2,
  structure: 2,
  household: 3,
});

export const CHILD_ID_SEPARATOR = '-';

/** The other legacy block width: 6-digit block codes give the established 18-character ID. */
export const LEGACY_LONG_BLOCK_WIDTH = 6;

const DIGITS = /^[0-9]+$/;
const charCount = s => Array.from(s).length;
const leftPad = (s, width) => {
  const length = charCount(s);
  return length < width ? '0'.repeat(width - length) + s : s;
};

/**
 * Child ID normalisation of one code (rule 1). null when blank.
 * "007" (width 2) → "07", "00123" (width 4) → "0123", "B12A" → "B12A", "B1" (width 4) → "00B1".
 */
export function normalizeCode(value, width) {
  if (value === undefined || value === null) return null;
  let code = String(value).trim();
  if (!code) return null;
  if (DIGITS.test(code)) code = code.replace(/^0+(?=\d)/, '');
  return leftPad(code, width);
}

/**
 * A stored location code: trimmed and left-padded only when shorter, never
 * truncated or re-numbered (F08). '' when blank. Used for the codes a form sends;
 * the Child ID uses normalizeCode.
 */
export function padCode(value, width) {
  if (value === undefined || value === null) return '';
  const code = String(value).trim();
  return code ? leftPad(code, width) : '';
}

/** The Child ID for these codes, or null when any code is missing. */
export function buildChildId({ districtCode, blockCode, villageCode, clusterCode, structureCode, householdNumber } = {}) {
  const parts = [
    [districtCode, CODE_WIDTHS.district],
    [blockCode, CODE_WIDTHS.block],
    [villageCode, CODE_WIDTHS.village],
    [clusterCode, CODE_WIDTHS.cluster],
    [structureCode, CODE_WIDTHS.structure],
    [householdNumber, CODE_WIDTHS.household],
  ].map(([code, width], i) => ({ code: normalizeCode(code, width), width, isBlock: i === 1 }));
  if (parts.some(p => p.code === null)) return null;
  const legacyFormat = parts.every(p => charCount(p.code) === p.width
    || (p.isBlock && charCount(p.code) === LEGACY_LONG_BLOCK_WIDTH));
  return parts.map(p => p.code).join(legacyFormat ? '' : CHILD_ID_SEPARATOR);
}
