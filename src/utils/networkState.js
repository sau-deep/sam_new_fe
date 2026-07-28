import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return isOnline;
}

// ── Manual offline-mode toggle ────────────────────────────────────────────────
const FORCED_OFFLINE_KEY = "app_forced_offline";
const FORCED_OFFLINE_EVENT = "app:forcedofflinechange";

export function getForcedOffline() {
  try { return localStorage.getItem(FORCED_OFFLINE_KEY) === "true"; } catch { return false; }
}

export function setForcedOffline(val) {
  try {
    localStorage.setItem(FORCED_OFFLINE_KEY, val ? "true" : "false");
    window.dispatchEvent(new Event(FORCED_OFFLINE_EVENT));
  } catch { /* ignore */ }
}

// ── Backend server health ─────────────────────────────────────────────────────
// A single shared poller pings the backend /health endpoint. When the server is
// unreachable/erroring we report "down", which flips the whole app into offline
// mode (see useEffectiveNetworkStatus below) so forms are saved locally instead
// of failing against a dead server.
const SERVER_HEALTH_EVENT = "app:serverhealthchange";
export const HEALTH_URL = `${API_BASE_URL}/health`;
const HEALTH_POLL_MS = 15000;    // routine re-check every 15s
const HEALTH_TIMEOUT_MS = 4000;  // a request slower than this counts as down
const PING_DEBOUNCE_MS = 2000;   // collapse bursts of forced re-checks

let serverHealth = "checking";   // 'checking' | 'up' | 'down'
let pollTimer = null;
let subscribers = 0;
let inFlight = false;
let lastPingAt = 0;

function setServerHealth(next) {
  if (next !== serverHealth) {
    serverHealth = next;
    try { window.dispatchEvent(new Event(SERVER_HEALTH_EVENT)); } catch { /* ignore */ }
  }
}

async function pingServer() {
  // If the browser itself has no connectivity, the server is unreachable — skip
  // the network round-trip and report down straight away.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setServerHealth("down");
    return;
  }
  if (inFlight) return;
  inFlight = true;
  lastPingAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    // Plain fetch (not the axios instance) so this stays a simple, unauthenticated
    // request with no CORS preflight and no interceptor recursion.
    const res = await fetch(HEALTH_URL, { method: "GET", cache: "no-store", signal: controller.signal });
    let up = res.ok;
    try {
      const body = await res.json();
      if (body && body.status) up = body.status === "UP";
    } catch { /* non-JSON body (e.g. "OK") — rely on res.ok */ }
    setServerHealth(up ? "up" : "down");
  } catch {
    setServerHealth("down");
  } finally {
    clearTimeout(timeout);
    inFlight = false;
  }
}

/**
 * Force an immediate health re-check (debounced). Call this the moment an API
 * request fails with a network error so the app switches to offline mode right
 * away instead of waiting for the next poll tick.
 */
export function pingServerNow() {
  if (Date.now() - lastPingAt < PING_DEBOUNCE_MS) return;
  pingServer();
}

function startPolling() {
  if (pollTimer) return;
  pingServer();
  pollTimer = setInterval(pingServer, HEALTH_POLL_MS);
  // Re-check as soon as the browser connectivity changes.
  window.addEventListener("online", pingServer);
  window.addEventListener("offline", pingServer);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  window.removeEventListener("online", pingServer);
  window.removeEventListener("offline", pingServer);
}

export function getServerHealth() { return serverHealth; }

/** Subscribe to backend health: returns 'checking' | 'up' | 'down'. */
export function useServerHealth() {
  const [status, setStatus] = useState(serverHealth);
  useEffect(() => {
    subscribers += 1;
    startPolling();
    const handler = () => setStatus(getServerHealth());
    window.addEventListener(SERVER_HEALTH_EVENT, handler);
    handler(); // sync current value immediately
    return () => {
      window.removeEventListener(SERVER_HEALTH_EVENT, handler);
      subscribers -= 1;
      if (subscribers <= 0) stopPolling();
    };
  }, []);
  return status;
}

/**
 * Returns { isOnline, forcedOffline, realOnline, serverHealth, serverDown }.
 * isOnline = real network is up AND the backend is reachable AND the user has
 * not manually forced offline. A "down" health check flips isOnline to false
 * immediately, switching the app into offline mode. "checking" (before the
 * first result) is treated as reachable to avoid a startup flash of offline.
 */
export function useEffectiveNetworkStatus() {
  const realOnline = useNetworkStatus();
  const serverHealth = useServerHealth();
  const [forcedOffline, setForcedOfflineState] = useState(() => getForcedOffline());

  useEffect(() => {
    const handler = () => setForcedOfflineState(getForcedOffline());
    window.addEventListener(FORCED_OFFLINE_EVENT, handler);
    return () => window.removeEventListener(FORCED_OFFLINE_EVENT, handler);
  }, []);

  const serverDown = serverHealth === "down";
  return {
    isOnline: realOnline && !serverDown && !forcedOffline,
    forcedOffline,
    realOnline,
    serverHealth,
    serverDown,
  };
}

// Default export: returns effective online status (respects the manual offline
// toggle AND backend health). All form pages use this via:
//   import useNetworkStatus from 'utils/networkState'
function useNetworkStatusWithOverride() {
  return useEffectiveNetworkStatus().isOnline;
}
export default useNetworkStatusWithOverride;
