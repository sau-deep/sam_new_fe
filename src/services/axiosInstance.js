import axios from "axios";
import { API_BASE_URL, JWT_KEY } from "../config";
import { RELEASE_INFO } from "../constants/releaseInfo";
import { addFormSchemaParam } from "./formSchemaParam";
import { getCurrentOwnerId } from "../utils/currentOwner";
import { isApiSuccess } from "../utils/apiResult";
import { getNativeAppInfo, isNativeApp } from "../utils/nativeAppInfo";
import { pingServerNow } from "../utils/networkState";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3600000,
});

// Compatibility hints for the backend (plan §5 "API contract"). They are not
// authorization; the server only observes them until enforcement is switched on.
// OFF by default: custom headers trigger a CORS preflight, and backends older than
// the one that lists X-SAM-* in RequestFilter's Access-Control-Allow-Headers would
// block every request. Turn on (REACT_APP_SEND_RELEASE_HEADERS=true) only after
// every backend this build talks to allows them.
const SEND_RELEASE_HEADERS = process.env.REACT_APP_SEND_RELEASE_HEADERS === "true";

export function releaseHeaders() {
  const headers = {
    "X-SAM-Platform": isNativeApp() ? "android" : "web",
    "X-SAM-Web-Build": RELEASE_INFO.webBuildId,
    "X-SAM-Release-Sequence": String(RELEASE_INFO.releaseSequence),
    "X-SAM-API-Contract": String(RELEASE_INFO.apiContractVersion),
  };
  const native = getNativeAppInfo();
  if (native?.versionCode) headers["X-SAM-Android-Code"] = String(native.versionCode);
  return headers;
}

// Only add the hints to requests that already need a CORS preflight (signed-in
// calls carry Authorization) or to the release endpoints themselves. Adding custom
// headers to otherwise "simple" requests — health pings, public config — would
// turn each of them into two round trips on slow field networks.
const wantsReleaseHeaders = (config) =>
  SEND_RELEASE_HEADERS && (!!config.headers?.Authorization || String(config.url || "").startsWith("/app/releases"));

const cacheOwner = () => getCurrentOwnerId() || "anon";

// Private in-memory GET cache (audit A11): key → { data, expiresAt }.
//  * Keys start with the signed-in account's login id, so one user's responses are
//    never served to the next login.
//  * A cache hit never renews its own expiry: an entry lives CACHE_TTL_MS from the
//    moment the server produced it, however often it is read.
//  * Only semantic successes are stored (isApiSuccess on the body), never an error
//    body that happened to arrive with HTTP 200.
//  * Clearing (login, logout, account change) bumps a generation. A response to a
//    request that started before the clear — or under a different account than the
//    one signed in when it arrives — is handed to its caller but never cached.
const GET_CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cacheGeneration = 0;
let lastSeenOwner = null;

export function clearApiCache(urlPattern) {
  if (!urlPattern) {
    GET_CACHE.clear();
    cacheGeneration++;
    return;
  }
  for (const key of GET_CACHE.keys()) {
    if (key.includes(urlPattern)) GET_CACHE.delete(key);
  }
  // A read already in flight may predate the change that made it stale.
  cacheGeneration++;
}

// Called on every request: if another account signed in (here or in another tab)
// since the last request, drop everything cached for the previous one.
function noteOwner(owner) {
  if (lastSeenOwner !== null && lastSeenOwner !== owner) clearApiCache();
  lastSeenOwner = owner;
}

const cacheKeyFor = (owner, config) => {
  const params = config.params ? JSON.stringify(config.params) : "";
  return `${owner}|${config.url}|${params}`;
};

const isCacheableGet = (config) => String(config?.method).toLowerCase() === "get" && !config.noCache;

/** Test hook: number of cached entries. */
export function _apiCacheSize() {
  return GET_CACHE.size;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(JWT_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (wantsReleaseHeaders(config)) {
    Object.entries(releaseHeaders()).forEach(([k, v]) => {
      if (config.headers[k] == null) config.headers[k] = v;
    });
  }
  addFormSchemaParam(config);

  if (isCacheableGet(config)) {
    const owner = cacheOwner();
    noteOwner(owner);
    const cacheKey = cacheKeyFor(owner, config);
    // Remember who asked and when, so the response can be checked before caching.
    config.samCache = { key: cacheKey, owner, generation: cacheGeneration };
    const cached = GET_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      config.adapter = () =>
        Promise.resolve({ data: cached.data, status: 200, statusText: "OK (cached)", headers: {}, config, fromCache: true });
    } else if (cached) {
      GET_CACHE.delete(cacheKey);
    }
  }

  return config;
});

api.interceptors.response.use(
  (res) => {
    const meta = res.config?.samCache;
    if (meta && !res.fromCache && isCacheableGet(res.config) && isApiSuccess(res)) {
      // Same account and no clear since the request started: safe to keep.
      if (meta.owner === cacheOwner() && meta.generation === cacheGeneration) {
        GET_CACHE.set(meta.key, { data: res.data, expiresAt: Date.now() + CACHE_TTL_MS });
      }
    }
    return res;
  },
  (error) => {
    // No response object => the request never reached the server (connection
    // refused, DNS/network failure, or timeout). Trigger an immediate backend
    // health re-check so the app flips into offline mode right away instead of
    // waiting for the next poll tick. A response with any status (4xx/5xx) means
    // the server IS reachable, so we don't treat those as "server down".
    if (!error.response) {
      pingServerNow();
    }

    if (error.response?.status === 401) {
      const isDevBypass = process.env.NODE_ENV === "development" && localStorage.getItem("sam_dev_user");
      if (!isDevBypass) {
        localStorage.removeItem(JWT_KEY);
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
