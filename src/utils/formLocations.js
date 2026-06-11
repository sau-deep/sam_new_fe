import { StateList, DistrictList, BlockList, VillageList } from "../constants/locations";
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
 * different locations. Villages are NOT form-specific under block-level granularity -
 * they follow the selected block and come from the master VillageList reference data.
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

/**
 * Whether per-form location data is actually available. An empty set almost
 * always means the data hasn't loaded (offline / dev-bypass / unauthenticated /
 * first visit) rather than "admin assigned zero blocks" - so we fall back to the
 * full master list to keep the survey forms usable, exactly like before.
 */
function hasFormData(formKey) {
  const blocks = getBlocks(formKey);
  return Array.isArray(blocks) && blocks.length > 0;
}

/** Distinct states present in the form's active blocks (or all states as fallback). */
function deriveStates(formKey) {
  if (!hasFormData(formKey)) return StateList;
  const seen = new Map();
  getBlocks(formKey).forEach((b) => {
    if (b.state_code != null && !seen.has(b.state_code)) {
      seen.set(b.state_code, { text: b.state, state_code: b.state_code });
    }
  });
  return Array.from(seen.values()).sort((a, b) => a.text.localeCompare(b.text));
}

/** Distinct districts present in the form's active blocks (or all districts as fallback). */
function deriveDistricts(formKey) {
  if (!hasFormData(formKey)) return DistrictList;
  const seen = new Map();
  getBlocks(formKey).forEach((b) => {
    if (b.district_code != null && !seen.has(b.district_code)) {
      seen.set(b.district_code, {
        text: b.district,
        district_code: b.district_code,
        state_code: b.state_code,
      });
    }
  });
  return Array.from(seen.values()).sort((a, b) => a.text.localeCompare(b.text));
}

/** All active blocks for the form (or all blocks as fallback). */
function deriveBlocks(formKey) {
  if (!hasFormData(formKey)) return BlockList;
  return getBlocks(formKey)
    .map((b) => ({
      text: b.block,
      block_code: b.block_code,
      district_code: b.district_code,
      state_code: b.state_code,
    }))
    .sort((a, b) => (a.text || "").localeCompare(b.text || ""));
}

/**
 * Returns location helper functions scoped to a single form. Functions read the
 * live cache on every call, so they reflect data loaded after they were created.
 */
export function getFormLocationHelpers(formKey) {
  const getStateOptions = (value) => {
    const all = deriveStates(formKey);
    if (value == null || value === "") return all;
    if (typeof value === "string") return all.filter((e) => e.text === value);
    if (typeof value === "number") return all.filter((e) => String(e.state_code) === String(value));
    return all;
  };

  const getDistrictOptions = (stateCode) =>
    deriveDistricts(formKey).filter((e) => e.state_code === stateCode);

  const getBlockOptions = (districtCode) =>
    deriveBlocks(formKey).filter((e) => e.district_code === districtCode);

  const getVillageOptions = (blockCode) => {
    const formVillages = (cache[formKey] || []).filter(
      (loc) => loc.entry_type === "VILLAGE" && loc.block_code === blockCode
    );
    if (formVillages.length > 0) {
      return formVillages.map((loc) => ({
        text: loc.village,
        village_code: loc.village_code,
        block_code: loc.block_code,
      }));
    }
    return VillageList.filter((e) => e.block_code === blockCode);
  };

  const getDistrictOptionsByStateName = (stateName) => {
    const st = deriveStates(formKey).find((s) => s.text === stateName);
    return st ? deriveDistricts(formKey).filter((d) => d.state_code === st.state_code) : [];
  };

  const getBlockOptionsByDistrictName = (stateName, districtName) => {
    const st = deriveStates(formKey).find((s) => s.text === stateName);
    const d = deriveDistricts(formKey).find(
      (x) => x.text === districtName && x.state_code === st?.state_code
    );
    return d ? deriveBlocks(formKey).filter((b) => b.district_code === d.district_code) : [];
  };

  const getVillageOptionsByBlockName = (stateName, districtName, blockName) => {
    const st = deriveStates(formKey).find((s) => s.text === stateName);
    const d = deriveDistricts(formKey).find(
      (x) => x.text === districtName && x.state_code === st?.state_code
    );
    const b = deriveBlocks(formKey).find(
      (x) => x.text === blockName && x.district_code === d?.district_code
    );
    if (!b) return [];
    const formVillages = (cache[formKey] || []).filter(
      (loc) => loc.entry_type === "VILLAGE" && loc.block_code === b.block_code
    );
    if (formVillages.length > 0) {
      return formVillages.map((loc) => ({
        text: loc.village,
        village_code: loc.village_code,
        block_code: loc.block_code,
      }));
    }
    return VillageList.filter((v) => v.block_code === b.block_code);
  };

  return {
    getStateOptions,
    getDistrictOptions,
    getBlockOptions,
    getVillageOptions,
    getDistrictOptionsByStateName,
    getBlockOptionsByDistrictName,
    getVillageOptionsByBlockName,
  };
}
