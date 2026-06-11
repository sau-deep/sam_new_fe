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
 * Remove the cached copy for a form so the next fetchFormLocations call is
 * forced to hit the API instead of returning stale data. Call this from the
 * admin UI whenever locations are added, removed, or toggled for a form.
 */
export function clearFormLocationCache(formKey) {
  try {
    localStorage.removeItem(lsKey(formKey));
  } catch {
    // non-fatal
  }
}

/**
 * Fetch the active blocks for a form. Always attempts an API call so admin
 * changes (add / deactivate / remove) are reflected on the next form mount.
 * On any network or server failure the last cached copy is returned so survey
 * forms remain usable offline.
 *
 * @returns {Promise<Array>} list of FormLocationDTO objects
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
    // Offline or server error: serve stale cache regardless of age.
    return getCachedFormLocations(formKey);
  }
}
