import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/axiosInstance";
import { SURVEY_FORMS } from "../config";

const LS_KEY = "formConfig";
const API_KEY = "form_config";

// `raw` can be a JSON string (the normal path) or an already-parsed object
// (if a proxy/CDN somewhere pre-parses the response body).  Handle both so
// we never silently fall back to all-enabled defaults due to a parse error.
function mergeWithDefaults(raw) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ...SURVEY_FORMS, ...parsed };
    }
  } catch {
    // invalid JSON string — fall through to defaults below
  }
  return { ...SURVEY_FORMS };
}

const FormConfigContext = createContext({
  formConfig: SURVEY_FORMS,
  updateFormConfig: async () => {},
  refreshFormConfig: async () => {},
  loading: true,
});

// Channel name for cross-tab config sync (same browser, same origin)
const BC_CHANNEL = "sam_formConfig";

export function FormConfigProvider({ children }) {
  const [formConfig, setFormConfig] = useState(() => mergeWithDefaults(localStorage.getItem(LS_KEY)));
  const [loading, setLoading] = useState(true);

  // Shared fetch helper — bypasses both Axios in-memory cache and any HTTP
  // proxy cache so every call always reaches the backend DB.
  const fetchFromBackend = useCallback(async () => {
    // `noCache` bypasses the axios in-memory cache. Don't send a `Pragma` request
    // header: it isn't in the backend's Access-Control-Allow-Headers, so it fails
    // the CORS preflight and the request silently falls back to cached defaults.
    const res = await api.get(`/bel/config/${API_KEY}`, { noCache: true });
    const raw = res.data?.data;
    if (raw) {
      const config = mergeWithDefaults(raw);
      setFormConfig(config);
      localStorage.setItem(LS_KEY, JSON.stringify(config));
    }
  }, []);

  useEffect(() => {
    fetchFromBackend()
      .catch(() => { /* backend unavailable — keep localStorage/default values */ })
      .finally(() => setLoading(false));
  }, [fetchFromBackend]);

  // Listen for config changes broadcast from other tabs in the same browser.
  // When admin disables a form in Tab A, every other tab (state admin, etc.)
  // receives the update instantly without requiring a page refresh.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(BC_CHANNEL);
    bc.onmessage = (event) => {
      if (event.data?.type === "configUpdate" && event.data.config) {
        const config = mergeWithDefaults(event.data.config);
        setFormConfig(config);
        localStorage.setItem(LS_KEY, JSON.stringify(config));
      }
    };
    return () => bc.close();
  }, []);

  // Called by SurveyHome and FormGuard on every visit to guarantee fresh config.
  const refreshFormConfig = useCallback(async () => {
    try {
      await fetchFromBackend();
    } catch { /* keep existing cached value */ }
  }, [fetchFromBackend]);

  const updateFormConfig = useCallback(
    async (key, value, modifiedBy = "admin") => {
      const previous = formConfig;                        // snapshot for rollback
      const updated = { ...formConfig, [key]: value };

      // Optimistic update — apply locally first for instant UI feedback
      setFormConfig(updated);
      localStorage.setItem(LS_KEY, JSON.stringify(updated));

      try {
        const res = await api.post(`/bel/config/${API_KEY}`, {
          value: JSON.stringify(updated),
          modifiedBy,
        });

        // Backend always returns HTTP 200; check the payload's success flag
        if (res.data?.success === false) {
          throw new Error(res.data?.message || "Backend did not save the config");
        }

        // Broadcast the new config to all other open tabs in this browser so
        // they don't have to wait for their next page-level refresh.
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel(BC_CHANNEL);
          bc.postMessage({ type: "configUpdate", config: updated });
          bc.close();
        }
      } catch (err) {
        // Rollback optimistic update so the UI reflects the true server state
        setFormConfig(previous);
        localStorage.setItem(LS_KEY, JSON.stringify(previous));
        throw err;                                        // re-throw so caller can show error toast
      }
    },
    [formConfig]
  );

  return (
    <FormConfigContext.Provider value={{ formConfig, updateFormConfig, refreshFormConfig, loading }}>
      {children}
    </FormConfigContext.Provider>
  );
}

export function useFormConfig() {
  return useContext(FormConfigContext);
}
