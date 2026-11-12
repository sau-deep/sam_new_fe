// Android hardware/gesture back-button handling for the SAM Surveyor mobile app.
//
// By default a Capacitor WebView exits the whole app when the user presses the
// device back button while at the first history entry. Surveyors filling long
// forms kept losing their place by accidentally closing the app, so here we:
//   • navigate back through the in-app (React Router) history when possible;
//   • at the root screen, require a *second* back press within 2s to exit
//     (a single/accidental press never closes the app), showing a hint toast.
//
// This is entirely inert in a normal browser — the `backButton` event only
// ever fires inside the native shell, and we additionally gate on
// isSurveyorApp(). The `@capacitor/app` plugin is provided by the wrapper
// (sam_surveyor_app); we reach it through the global bridge so this file needs
// no extra npm dependency in the web repo.
import { useEffect, useRef } from "react";
import { message } from "antd";
import { isSurveyorApp } from "./appPlatform";

const EXIT_WINDOW_MS = 2000;

export function useHardwareBackButton() {
  const lastBackAt = useRef(0);

  useEffect(() => {
    if (!isSurveyorApp()) return undefined;

    const App = window.Capacitor?.Plugins?.App;
    if (!App || typeof App.addListener !== "function") return undefined;

    let handle;
    const registration = App.addListener("backButton", ({ canGoBack }) => {
      // Prefer in-app navigation. `canGoBack` reflects the WebView history,
      // which BrowserRouter drives, so this walks the router stack.
      if (canGoBack && window.history.length > 1) {
        window.history.back();
        return;
      }
      // At the root: double-press-to-exit so a stray back press can't close it.
      const now = Date.now();
      if (now - lastBackAt.current < EXIT_WINDOW_MS) {
        App.exitApp?.();
      } else {
        lastBackAt.current = now;
        message.info("Press back again to exit");
      }
    });

    // App.addListener resolves to a handle with .remove()
    Promise.resolve(registration).then((h) => { handle = h; });

    return () => {
      if (handle && typeof handle.remove === "function") handle.remove();
    };
  }, []);
}
