import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import "./i18n";
import { register as registerSW, unregisterAll } from "./serviceWorkerRegistration";
import { installToastQueue } from "./utils/toast";
import { isSurveyorApp } from "./utils/appPlatform";

// Show toasts one at a time. Several places react to the same event (network
// toggle, offline upload), and antd stacks concurrent messages into a pile that
// covers the header on a phone.
installToastQueue();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.StrictMode><App /></React.StrictMode>);

if (isSurveyorApp()) {
  // Inside the Capacitor APK the web assets are bundled and served locally, so
  // a service worker adds no offline benefit — it only risks serving a stale
  // cached shell that pins the app to an old build. Tear down anything a
  // previous version of the app left behind.
  unregisterAll();
} else {
  // Register service worker for offline asset caching
  registerSW({
    onSuccess: () => console.log("[SW] App ready for offline use"),
    onUpdate: () => console.log("[SW] New version available — reload to update"),
  });

  // A newly activated worker asks controlled pages to reload so the update
  // lands immediately instead of on the next launch. Guarded so a worker that
  // keeps reactivating cannot put the page in a reload loop.
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type !== "SW_UPDATED") return;
    if (sessionStorage.getItem("sw-reloaded")) return;
    sessionStorage.setItem("sw-reloaded", "1");
    window.location.reload();
  });
}

// Request persistent storage so the browser doesn't evict the cache under pressure
if (navigator.storage?.persist) {
  navigator.storage.persist().then(granted => {
    if (granted) console.log("[Storage] Persistent storage granted");
  });
}
