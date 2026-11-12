// Detects whether the SAM web app is running inside the SAM Surveyor mobile
// (Android APK) shell rather than a normal desktop/mobile browser.
//
// The Capacitor wrapper (see the `sam_surveyor_app` repo) is configured with
// `appendUserAgent: "SAMSurveyorApp"` and injects a global `window.Capacitor`
// object into the WebView. Either signal is enough to confirm we are running
// inside the native surveyor app. On a plain website neither is present, so the
// surveyor-only restriction stays completely inactive for web users.
export function isSurveyorApp() {
  if (typeof window === "undefined") return false;
  try {
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === "function") {
      if (window.Capacitor.isNativePlatform()) return true;
    }
  } catch {
    /* ignore — fall through to the User-Agent check */
  }
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  return ua.includes("SAMSurveyorApp");
}
