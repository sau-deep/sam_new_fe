// Reads the backend's public release policy (GET /app/releases/policy) and keeps
// the last valid copy so the app still knows its update status offline.
// A missing, failed or unrecognised policy never clears local data and never
// invents a minimum version (plan §6 "Client state machine").
import api from './axiosInstance';

const STORE_KEY = 'samReleasePolicy';
export const POLICY_TIMEOUT_MS = 5000; // independent of the app's one-hour default
export const SUPPORTED_POLICY_SCHEMA = 1;

export function isSupportedPolicy(p) {
  return !!p && typeof p === 'object' && p.policySchemaVersion === SUPPORTED_POLICY_SCHEMA && typeof p.active === 'boolean';
}

/** { policy, fetchedAt, serverOffsetMs } or null. */
export function readLastKnownPolicy() {
  try {
    const entry = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    return entry && isSupportedPolicy(entry.policy) ? entry : null;
  } catch {
    return null;
  }
}

export async function fetchReleasePolicy() {
  const res = await api.get('/app/releases/policy', { noCache: true, timeout: POLICY_TIMEOUT_MS });
  const policy = res?.data;
  if (!isSupportedPolicy(policy)) {
    // A newer policy format: keep using the last one we understood.
    throw new Error(`Unsupported release policy (schema ${policy?.policySchemaVersion})`);
  }
  const serverMs = Date.parse(policy.serverTime);
  const entry = {
    policy,
    fetchedAt: Date.now(),
    serverOffsetMs: Number.isFinite(serverMs) ? serverMs - Date.now() : 0,
  };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(entry)); } catch { /* storage full: still use it now */ }
  return entry;
}
