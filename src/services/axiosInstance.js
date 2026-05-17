import axios from "axios";
import { API_BASE_URL, JWT_KEY } from "../config";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3600000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(JWT_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
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
