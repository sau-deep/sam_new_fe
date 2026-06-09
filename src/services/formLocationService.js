import api from "./axiosInstance";

/**
 * Per-form location data with offline support.
 *
 * Online: fetch the form's active blocks from the backend and cache them in
 * localStorage. Offline: serve the last cached copy so survey forms keep working
 * in the field (same strategy as FormConfigContext).
 */

const LS_PREFIX = "sam_v2_formloc_";

const lsKey = (formKey) => `${LS_PREFIX}${formKey}`;

/** Read the cached blocks for a form (returns [] when nothing cached). */
export function getCachedFormLocations(formKey) {
  try {
    const raw = localStorage.getItem(lsKey(formKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.data) ? parsed.data : [];
  } catch {
    return [];
  }
}

function setCachedFormLocations(formKey, data) {
  try {
    localStorage.setItem(
      lsKey(formKey),
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    /* storage full / unavailable - non-fatal, dropdowns just won't persist */
  }
}

/**
 * Fetch the active blocks for a form. On success the result is cached. On any
 * failure (offline, server error) the last cached copy is returned instead so
 * the survey form remains usable.
 *
 * @returns {Promise<Array>} list of { id, state, stateCode, district, districtCode, block, blockCode }
 */
export async function fetchFormLocations(formKey) {
  try {
    // Only `noCache` (bypasses the axios in-memory GET cache). Do NOT send
    // Cache-Control/Pragma request headers: `Pragma` is not in the backend's
    // Access-Control-Allow-Headers, so it fails the CORS preflight and the
    // request never reaches the server. The service worker no longer caches
    // this cross-origin call, so no extra cache-busting headers are needed.
    const res = await api.get(`/form-location/${formKey}`, { noCache: true });
    const data = res?.data?.data;
    if (Array.isArray(data)) {
      setCachedFormLocations(formKey, data);
      return data;
    }
    // Unexpected payload - fall back to cache rather than wiping it.
    return getCachedFormLocations(formKey);
  } catch {
    return getCachedFormLocations(formKey);
  }
}
