import {
  getCachedFormLocations,
  fetchFormLocations,
} from "../services/formLocationService";

/**
 * Form-aware location helpers.
 *
 * Each survey form has its own set of active BLOCKS (managed by admins and served
 * by the backend, cached to localStorage for offline use). State / District / Block
 * dropdown options are derived from that per-form block set, so two forms can expose
 * different locations. Only active entries are shown; inactive or unconfigured locations
 * are excluded — dropdowns are empty rather than falling back to a master list.
 *
 * The exported helpers intentionally mirror the signatures of the original
 * constants/locations helpers so wiring a survey form is close to a drop-in swap:
 *   const { getStateOptions, getDistrictOptions, getBlockOptions, getVillageOptions }
 *       = getFormLocationHelpers('BI_ANNUAL');
 */

// formKey -> normalized block rows. Hydrated lazily from localStorage, refreshed
// by loadFormLocations(). Module-scoped so helpers work outside React too.
const cache = {};

/**
 * Drop the in-memory cache for one form. Call this from the admin UI after any
 * add / deactivate / remove so the next getBlocks() call re-hydrates from the
 * fresh localStorage data (which is separately cleared by clearFormLocationCache
 * in formLocationService).
 */
export function clearFormLocationsCache(formKey) {
  delete cache[formKey];
}

function normalize(rows) {
  return (rows || []).map((r) => ({
    state:         r.state,
    state_code:    r.stateCode    ?? null,
    district:      r.district,
    district_code: r.districtCode ?? null,
    block:         r.block,
    block_code:    r.blockCode    ?? null,
    village:       r.village      || null,
    village_code:  r.villageCode  || null,
    entry_type:    r.entryType    || "BLOCK",
    is_active:     r.isActive !== false,
  }));
}

function getBlocks(formKey) {
  if (!cache[formKey]) {
    // Synchronous hydrate so a returning/offline user has data on first render.
    cache[formKey] = normalize(getCachedFormLocations(formKey));
  }
  return cache[formKey];
}

/**
 * Fetch (online) or read (offline) the form's active blocks and refresh the cache.
 * Returns the normalized block rows.
 */
export async function loadFormLocations(formKey) {
  const rows = await fetchFormLocations(formKey);
  cache[formKey] = normalize(rows);
  return cache[formKey];
}

/** Distinct states present in the form's active blocks. Empty when none are active. */
function deriveStates(formKey) {
  const seen = new Map();
  getBlocks(formKey)
    .filter((b) => b.is_active)
    .forEach((b) => {
      if (b.state_code != null && !seen.has(b.state_code))
        seen.set(b.state_code, { text: b.state, state_code: b.state_code });
    });
  return Array.from(seen.values()).sort((a, b) => a.text.localeCompare(b.text));
}

/** Distinct districts present in the form's active blocks. Empty when none are active. */
function deriveDistricts(formKey) {
  const seen = new Map();
  getBlocks(formKey)
    .filter((b) => b.is_active)
    .forEach((b) => {
      if (b.district_code != null && !seen.has(b.district_code))
        seen.set(b.district_code, {
          text: b.district,
          district_code: b.district_code,
          state_code: b.state_code,
        });
    });
  return Array.from(seen.values()).sort((a, b) => a.text.localeCompare(b.text));
}

/** Active blocks for the form. Empty when none are active. */
function deriveBlocks(formKey) {
  const mapped = getBlocks(formKey)
    .filter((b) => b.is_active)
    .map((b) => ({
      text: b.block,
      block_code: b.block_code,
      district_code: b.district_code,
      state_code: b.state_code,
    }));
  return Array.from(
    new Map(mapped.map((b) => [`${b.district_code}:${b.text}`, b])).values()
  ).sort((a, b) => (a.text || "").localeCompare(b.text || ""));
}

/**
 * Returns location helper functions scoped to a single form. Functions read the
 * live cache on every call, so they reflect data loaded after they were created.
 */
export function getFormLocationHelpers(formKey) {
  const getStateOptions = (value) => {
    const all = deriveStates(formKey);
    if (value == null || value === "") return all;
    if (typeof value === "string") return all.filter((e) => e.text?.toLowerCase() === value.toLowerCase());
    if (typeof value === "number") return all.filter((e) => String(e.state_code) === String(value));
    return all;
  };

  const getDistrictOptions = (stateCode) =>
    deriveDistricts(formKey).filter((e) => e.state_code === stateCode);

  const getBlockOptions = (districtCode) =>
    deriveBlocks(formKey).filter((e) => e.district_code === districtCode);

  const getVillageOptions = (blockCode) => {
    return (cache[formKey] || [])
      .filter((loc) => loc.is_active && loc.entry_type === "VILLAGE" && loc.block_code === blockCode)
      .map((loc) => ({
        text: loc.village,
        village_code: loc.village_code,
        block_code: loc.block_code,
      }));
  };

  // Resolve a (possibly differently-cased) state name to the canonical form-location
  // text so callers send the exact value stored in the data. State-admin users carry
  // an UPPERCASE state (users.state is stored uppercased); survey/form-location data is
  // proper-case. Returns the input unchanged when no active form-location matches.
  const getCanonicalStateName = (stateName) => {
    if (!stateName) return stateName;
    const st = deriveStates(formKey).find((s) => s.text?.toLowerCase() === stateName.toLowerCase());
    return st ? st.text : stateName;
  };

  const getDistrictOptionsByStateName = (stateName) => {
    const st = deriveStates(formKey).find((s) => s.text?.toLowerCase() === stateName?.toLowerCase());
    return st ? deriveDistricts(formKey).filter((d) => d.state_code === st.state_code) : [];
  };

  const getBlockOptionsByDistrictName = (stateName, districtName) => {
    const st = deriveStates(formKey).find((s) => s.text?.toLowerCase() === stateName?.toLowerCase());
    const d = deriveDistricts(formKey).find(
      (x) => x.text?.toLowerCase() === districtName?.toLowerCase() && x.state_code === st?.state_code
    );
    return d ? deriveBlocks(formKey).filter((b) => b.district_code === d.district_code) : [];
  };

  const getVillageOptionsByBlockName = (stateName, districtName, blockName) => {
    const st = deriveStates(formKey).find((s) => s.text?.toLowerCase() === stateName?.toLowerCase());
    const d = deriveDistricts(formKey).find(
      (x) => x.text?.toLowerCase() === districtName?.toLowerCase() && x.state_code === st?.state_code
    );
    const b = deriveBlocks(formKey).find(
      (x) => x.text?.toLowerCase() === blockName?.toLowerCase() && x.district_code === d?.district_code
    );
    if (!b) return [];
    return (cache[formKey] || [])
      .filter((loc) => loc.is_active && loc.entry_type === "VILLAGE" && loc.block_code === b.block_code)
      .map((loc) => ({
        text: loc.village,
        village_code: loc.village_code,
        block_code: loc.block_code,
      }));
  };

  return {
    getStateOptions,
    getDistrictOptions,
    getBlockOptions,
    getVillageOptions,
    getCanonicalStateName,
    getDistrictOptionsByStateName,
    getBlockOptionsByDistrictName,
    getVillageOptionsByBlockName,
  };
}
