const CACHE_PREFIX = 'sam_v2_dash_';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export const CACHE_KEYS = {
  STATS: 'stats',
  CHARTS: 'charts',
  MAP_DATA: 'map_data',
  TRENDS: 'trends',
  DISTRIBUTION: 'distribution',
  PERFORMANCE: 'performance',
  ACTIVITY: 'activity',
  KEY_INDICATOR_DASHBOARD: 'key_indicator_dashboard',
};

const key = (k) => `${CACHE_PREFIX}${k}`;
const valid = (ts) => Date.now() - ts < CACHE_EXPIRY_MS;

export const setCacheData = (k, data) => {
  try {
    localStorage.setItem(key(k), JSON.stringify({ data, timestamp: Date.now() }));
    return true;
  } catch { return false; }
};

export const getCacheData = (k) => {
  try {
    const raw = localStorage.getItem(key(k));
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (!valid(timestamp)) { removeCacheData(k); return null; }
    return data;
  } catch { return null; }
};

export const removeCacheData = (k) => {
  try { localStorage.removeItem(key(k)); return true; } catch { return false; }
};

export const clearAllCache = () => {
  try {
    Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(key(k)));
    return true;
  } catch { return false; }
};

export const getCacheStatus = () => {
  const status = {};
  Object.entries(CACHE_KEYS).forEach(([name, k]) => {
    try {
      const raw = localStorage.getItem(key(k));
      if (raw) {
        const { timestamp } = JSON.parse(raw);
        status[name] = { exists: true, age: Math.round((Date.now() - timestamp) / 1000), valid: valid(timestamp) };
      } else {
        status[name] = { exists: false };
      }
    } catch { status[name] = { exists: false }; }
  });
  return status;
};

export const getCachedData = async (k, apiCall, fallback = null) => {
  const cached = getCacheData(k);
  if (cached) return cached;
  try {
    const res = await apiCall();
    if (res?.success) { setCacheData(k, res.data); return res.data; }
    return fallback;
  } catch { return fallback; }
};
