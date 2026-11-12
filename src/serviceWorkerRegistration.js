/* eslint-disable */
// Registers the SAM v2 service worker for offline caching

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL || ''}/serviceWorker.js`;
    registerValidSW(swUrl, config);

    navigator.serviceWorker.ready.then(() => {
      console.log('[SW] Service Worker is active and ready for offline use');
    });
  });
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl, { scope: `${process.env.PUBLIC_URL || ''}/` })
    .then(registration => {
      registration.onupdatefound = () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.onstatechange = () => {
          if (worker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('[SW] New version available — close all tabs to update');
              if (config?.onUpdate) config.onUpdate(registration);
            } else {
              console.log('[SW] Content cached for offline use');
              if (config?.onSuccess) config.onSuccess(registration);
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
 * Tear down every worker and cache for this origin.
 *
 * Used by the Capacitor surveyor app: its web assets ship inside the APK and are
 * served locally, so a service worker buys no offline benefit there and only
 * risks pinning the app to a stale cached shell.
 *
 * Note this uses getRegistrations() rather than `.ready`, which never settles
 * when no worker is installed.
 */
export async function unregisterAll() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if (regs.length) console.log('[SW] Unregistered', regs.length, 'worker(s), cleared caches');
  } catch (err) {
    console.error('[SW] Unregister failed:', err);
  }
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
