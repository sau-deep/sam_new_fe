import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";

// `navigator.onLine` and the browser's `online`/`offline` events only reflect
// whether a network interface (WiFi/cellular radio) is connected — NOT
// whether it actually has working internet access. On mobile this is
// routinely wrong: a phone can show full signal bars and `navigator.onLine
// === true` while genuinely unable to reach any server (weak cell data,
// captive portal, carrier throttling). Some mobile browsers also simply never
// fire the `online`/`offline` events again after the initial page load, so a
// naive `navigator.onLine` read gets frozen at whatever it was on first load.
//
// To get a real answer we do a lightweight network round-trip to our own API
// host. We don't care about the HTTP response at all (even a 404/CORS-opaque
// response proves the network path is up) — we only care whether the request
// completes or fails/times out, so `mode: "no-cors"` is used to sidestep any
// backend CORS/method configuration entirely (no backend changes needed).
const PROBE_URL = `${API_BASE_URL}/`;
const PROBE_TIMEOUT_MS = 5000;
const PROBE_INTERVAL_MS = 15000;

async function probeConnectivity() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    await fetch(PROBE_URL, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      // If the OS reports no network interface at all, trust it immediately —
      // a probe would just time out and delay the UI for no benefit.
      if (!navigator.onLine) {
        if (!cancelled) setIsOnline(false);
        return;
      }
      if (inFlight.current) return; // avoid overlapping probes
      inFlight.current = true;
      const reachable = await probeConnectivity();
      inFlight.current = false;
      if (!cancelled) setIsOnline(reachable);
    };

    verify();

    const on = () => verify();
    const off = () => { if (!cancelled) setIsOnline(false); };
    const onVisible = () => { if (document.visibilityState === "visible") verify(); };

    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(verify, PROBE_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
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
