import axios from "axios";
import { API_BASE_URL, JWT_KEY } from "../config";
import { RELEASE_INFO } from "../constants/releaseInfo";
import { addFormSchemaParam } from "./formSchemaParam";
import { getCurrentOwnerId } from "../utils/currentOwner";
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

// In-memory GET cache: key → { data, expiresAt }. Keys include the signed-in
// account's login id so one user's cached responses are never served to the next login.
const GET_CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearApiCache(urlPattern) {
  if (!urlPattern) {
    GET_CACHE.clear();
    return;
  }
  for (const key of GET_CACHE.keys()) {
    if (key.includes(urlPattern)) GET_CACHE.delete(key);
  }
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

  // Serve cached GET responses
  if (config.method === "get" && !config.noCache) {
    const params = config.params ? JSON.stringify(config.params) : "";
    const cacheKey = `${cacheOwner()}|${config.url}|${params}`;
    const cached = GET_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      config.adapter = () =>
        Promise.resolve({ data: cached.data, status: 200, statusText: "OK (cached)", headers: {}, config, fromCache: true });
    }
  }

  return config;
});

api.interceptors.response.use(
  (res) => {
    // Cache successful GET responses
    // (a cache hit must not extend its own expiry)
    if (res.config.method === "get" && !res.config.noCache && res.status === 200 && !res.fromCache) {
      const params = res.config.params ? JSON.stringify(res.config.params) : "";
      const cacheKey = `${cacheOwner()}|${res.config.url}|${params}`;
      GET_CACHE.set(cacheKey, { data: res.data, expiresAt: Date.now() + CACHE_TTL_MS });
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
