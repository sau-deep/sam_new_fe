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
