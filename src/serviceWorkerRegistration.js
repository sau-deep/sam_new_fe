/* eslint-disable */
// Registers the SAM v2 service worker for offline caching (production web only).
//
// Not inside the Android app: the APK already bundles the app locally, and a
// worker's cache there can keep serving the OLD web shell after Play installs a
// new version (plan §7). Not on the dev server either: a cache-first worker would
// keep serving an old bundle while you develop. In both cases a worker left over
// from an older build is removed, together with SAM's own caches only.

const OWNED_CACHE = name => name.startsWith('sam-shell-') || name === 'sam-v2-cache-v2';
const RELOAD_FLAG = 'samSwRemovedReload';

const isNative = () => {
  try { return !!window.Capacitor?.isNativePlatform?.(); } catch { return false; }
};

export function register(config) {
  if (!('serviceWorker' in navigator)) return;

  if (isNative() || process.env.NODE_ENV !== 'production') {
    removeWorkers();
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL || ''}/serviceWorker.js`;
    registerValidSW(swUrl, config);
  });
}

async function removeWorkers() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const ours = regs.filter(r => /\/serviceWorker\.js$/.test(
      (r.active || r.waiting || r.installing)?.scriptURL || ''));
    await Promise.all(ours.map(r => r.unregister()));
    const names = await caches.keys();
    await Promise.all(names.filter(OWNED_CACHE).map(n => caches.delete(n)));
    // If an old worker served this page, load once more straight from the
    // bundled/served files (never loops: guarded per tab session).
    if (navigator.serviceWorker.controller && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    }
  } catch (err) {
    console.warn('[SW] cleanup failed:', err);
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    // updateViaCache 'none': update checks always reach the server, never the HTTP cache.
    .register(swUrl, { scope: `${process.env.PUBLIC_URL || ''}/`, updateViaCache: 'none' })
    .then(registration => {
      registration.onupdatefound = () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.onstatechange = () => {
          if (worker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              if (config?.onUpdate) config.onUpdate(registration);
            } else if (config?.onSuccess) {
              config.onSuccess(registration);
            }
          }
        };
      };
    })
    .catch(err => {
      console.error('[SW] Registration failed:', err);
    });
}

/**
 * Called when the user chooses to update: activate a waiting worker (if any) and
 * reload once it controls the page. Page loads are network-first, so a reload
 * while online gets the deployed build even when no worker is waiting.
 */
export async function activateUpdateAndReload() {
  let reloaded = false;
  const reload = () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg?.waiting) {
      navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(reload, 3000); // a worker that never takes over must not trap the user
      return;
    }
  } catch { /* fall through */ }
  reload();
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(reg => reg.unregister())
      .catch(err => console.error(err));
  }
}

export function getCacheStatus() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return new Promise(resolve => {
      const channel = new MessageChannel();
      channel.port1.onmessage = e => resolve(e.data);
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [channel.port2]
      );
    });
  }
  return Promise.resolve({ cachedFiles: 0 });
}
