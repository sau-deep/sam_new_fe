// Checks the release policy and works out whether this build should update.
// Bootstrap behaviour (plan §8): nothing is blocked — the banner informs and
// offers the update; enforcement stays on the server and is currently "off".
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { RELEASE_INFO } from '../constants/releaseInfo';
import { fetchReleasePolicy, readLastKnownPolicy } from '../services/releasePolicyService';
import { computeUpdateVerdict } from '../utils/releaseVerdict';
import { getNativeAppInfo, isNativeApp, loadNativeAppInfo } from '../utils/nativeAppInfo';

const CHECK_EVERY_MS = 15 * 60 * 1000; // plan default
const MIN_GAP_MS = 60 * 1000; // resume/online checks closer than this are skipped

const UpdateContext = createContext({ verdict: null, policy: null, client: null, checkNow: () => {} });

export function currentClient() {
  return {
    platform: isNativeApp() ? 'android' : 'web',
    releaseSequence: RELEASE_INFO.releaseSequence,
    androidVersionCode: getNativeAppInfo()?.versionCode ?? null,
    androidVersionName: getNativeAppInfo()?.versionName ?? null,
    apiContractVersion: RELEASE_INFO.apiContractVersion,
    webBuildId: RELEASE_INFO.webBuildId,
  };
}

function verdictFor(entry) {
  if (!entry) return null;
  const now = Date.now() + (entry.serverOffsetMs || 0);
  const v = computeUpdateVerdict(entry.policy, currentClient(), now);
  const graceMs = (entry.policy?.offlineGraceHours ?? 72) * 3600 * 1000;
  return { ...v, fetchedAt: entry.fetchedAt, stale: Date.now() - entry.fetchedAt > graceMs };
}

export function UpdateProvider({ children }) {
  const [state, setState] = useState(() => {
    const entry = readLastKnownPolicy();
    return { entry, verdict: verdictFor(entry), error: null };
  });
  const lastCheck = useRef(0);

  const checkNow = useCallback(async ({ force = false } = {}) => {
    if (!force && Date.now() - lastCheck.current < MIN_GAP_MS) return;
    lastCheck.current = Date.now();
    await loadNativeAppInfo(); // the installed Android code must be known before comparing
    try {
      const entry = await fetchReleasePolicy();
      setState({ entry, verdict: verdictFor(entry), error: null });
    } catch (e) {
      // Offline / server down / newer policy format: keep the last valid policy.
      setState(prev => ({ ...prev, verdict: verdictFor(prev.entry), error: e?.message || 'check failed' }));
    }
  }, []);

  useEffect(() => {
    checkNow({ force: true });
    const timer = setInterval(() => checkNow({ force: true }), CHECK_EVERY_MS);
    const onOnline = () => checkNow();
    const onVisible = () => { if (document.visibilityState === 'visible') checkNow(); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkNow]);

  return (
    <UpdateContext.Provider value={{
      verdict: state.verdict,
      policy: state.entry?.policy || null,
      lastError: state.error,
      client: currentClient(),
      checkNow,
    }}>
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdateStatus() {
  return useContext(UpdateContext);
}
