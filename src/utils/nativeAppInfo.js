// Installed native build identity on Android, read from Capacitor's App plugin
// (@capacitor/app is installed in sam_surveyor_app). Plan §4: read the INSTALLED
// version from the device, never from package.json or the policy.
let info = null;
let loading = null;

export function isNativeApp() {
  try { return !!window.Capacitor?.isNativePlatform?.(); } catch { return false; }
}

/** { versionCode, versionName, appId } once loaded; null on the web or before loading. */
export function getNativeAppInfo() {
  return info;
}

export function loadNativeAppInfo() {
  if (loading) return loading;
  loading = (async () => {
    if (!isNativeApp()) return null;
    try {
      const cap = window.Capacitor;
      const App = cap?.Plugins?.App || cap?.registerPlugin?.('App');
      if (!App?.getInfo) return null;
      const r = await App.getInfo(); // { name, id, build, version }
      const code = Number.parseInt(r?.build, 10);
      info = {
        versionCode: Number.isFinite(code) ? code : null,
        versionName: r?.version || null,
        appId: r?.id || null,
      };
      return info;
    } catch {
      return null;
    }
  })();
  return loading;
}
