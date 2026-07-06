import { useState, useEffect } from "react";

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

/**
 * Returns { isOnline, forcedOffline, realOnline }.
 * isOnline = real network is up AND user has not manually forced offline.
 */
export function useEffectiveNetworkStatus() {
  const realOnline = useNetworkStatus();
  const [forcedOffline, setForcedOfflineState] = useState(() => getForcedOffline());

  useEffect(() => {
    const handler = () => setForcedOfflineState(getForcedOffline());
    window.addEventListener(FORCED_OFFLINE_EVENT, handler);
    return () => window.removeEventListener(FORCED_OFFLINE_EVENT, handler);
  }, []);

  return { isOnline: realOnline && !forcedOffline, forcedOffline, realOnline };
}

// Default export: returns effective online status (respects the manual offline toggle).
// All form pages use this via: import useNetworkStatus from 'utils/networkState'
function useNetworkStatusWithOverride() {
  return useEffectiveNetworkStatus().isOnline;
}
export default useNetworkStatusWithOverride;
