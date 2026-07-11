import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

const POLL_INTERVAL_MS = 15000;
const REQUEST_TIMEOUT_MS = 5000;

// Polls the backend's /health endpoint (checks its own DB connection too) and
// reports whether the server is reachable. Used to show a green/red status
// light on public survey pages that have no login/session to signal this via.
export function useBackendHealth() {
  const [status, setStatus] = useState("checking"); // 'up' | 'down' | 'checking'

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const check = async () => {
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
        if (!cancelled) setStatus(res.ok ? "up" : "down");
      } catch {
        if (!cancelled) setStatus("down");
      } finally {
        clearTimeout(timeoutId);
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return status;
}
