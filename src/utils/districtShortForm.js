/**
 * Creates a short (initials) form for long district names.
 * Example: "Mohla-Manpur-Ambagarh Chouki" -> "MMAC"
 */
export const getDistrictShortForm = (districtName) => {
  if (districtName === null || districtName === undefined) return '';

  const trimmed = String(districtName).trim();
  if (!trimmed) return '';

  // Split by any non-alphanumeric separator (spaces, hyphens, punctuation, etc.)
  const tokens = trimmed.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (tokens.length <= 1) return trimmed;

  const initials = tokens
    .map((t) => t.charAt(0))
    .join('')
    .toUpperCase();

  return initials || trimmed;
};

