import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import "./i18n";
import { register as registerSW } from "./serviceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.StrictMode><App /></React.StrictMode>);

// Register service worker for offline asset caching
registerSW({
  onSuccess: () => console.log("[SW] App ready for offline use"),
  onUpdate: () => console.log("[SW] New version available — reload to update"),
});

// Request persistent storage so the browser doesn't evict the cache under pressure
if (navigator.storage?.persist) {
  navigator.storage.persist().then(granted => {
    if (granted) console.log("[Storage] Persistent storage granted");
  });
}
