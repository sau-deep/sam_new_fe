import axios from "axios";
import { API_BASE_URL, JWT_KEY } from "../config";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3600000,
});

// In-memory GET cache: key → { data, expiresAt }
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

  // Serve cached GET responses
  if (config.method === "get" && !config.noCache) {
    const params = config.params ? JSON.stringify(config.params) : "";
    const cacheKey = `${config.url}|${params}`;
    const cached = GET_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      config.adapter = () =>
        Promise.resolve({ data: cached.data, status: 200, statusText: "OK (cached)", headers: {}, config });
    }
  }

  return config;
});

api.interceptors.response.use(
  (res) => {
    // Cache successful GET responses
    if (res.config.method === "get" && !res.config.noCache && res.status === 200) {
      const params = res.config.params ? JSON.stringify(res.config.params) : "";
      const cacheKey = `${res.config.url}|${params}`;
      GET_CACHE.set(cacheKey, { data: res.data, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return res;
  },
  (error) => {
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
