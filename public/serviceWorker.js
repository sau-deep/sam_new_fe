/* eslint-disable */
/* SAM v2 Service Worker — cache-first offline support with /v2 base-path awareness */

const CACHE_VERSION = 'sam-v2-cache-v2';

// Detect base path from where the SW file is served
const SW_PATH = self.location.pathname; // e.g. /v2/serviceWorker.js or /serviceWorker.js
const BASE = SW_PATH.startsWith('/v2') ? '/v2' : '';

const ESSENTIAL_FILES = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/favicon.ico`,
  `${BASE}/LogoAmb.png`,
  `${BASE}/Institute-of-Economic-Growth.png`,
];

const STATIC_ASSETS = [
  `${BASE}/assets/img/telangana.jpg`,
  `${BASE}/assets/img/rajasthan.jpg`,
  `${BASE}/assets/img/odisha.jpg`,
  `${BASE}/assets/img/mp.jpg`,
  `${BASE}/assets/img/chattis.jpg`,
  `${BASE}/assets/img/jhark.jpg`,
  `${BASE}/assets/sop/1.jpeg`,
  `${BASE}/assets/sop/2.jpeg`,
  `${BASE}/assets/sop/3.jpeg`,
  `${BASE}/assets/sop/4.jpeg`,
];

async function getChunkAssets() {
  try {
    const res = await fetch(`${BASE}/asset-manifest.json`);
    if (!res.ok) return [];
    const manifest = await res.json();
    const assets = [];
    const files = manifest.files || {};
    Object.keys(files).forEach(key => {
      const val = files[key];
      if (
        (key.endsWith('.js') || key.endsWith('.css')) &&
        !key.endsWith('.map') &&
        typeof val === 'string'
      ) {
        assets.push(val);
      }
    });
    return assets;
  } catch {
    return [];
  }
}

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const chunks = await getChunkAssets();
      const all = [...ESSENTIAL_FILES, ...STATIC_ASSETS, ...chunks];

      await Promise.allSettled(
        all.map(async url => {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res.ok || res.type === 'opaque') {
              await cache.put(url, res);
            }
          } catch { /* network unavailable during install is OK */ }
        })
      );

      // Always skip waiting so the new SW activates immediately
      await self.skipWaiting();
    })()
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Delete any old caches from previous versions
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, browser extensions, and hot-update requests
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;
  if (url.pathname.includes('.hot-update.')) return;
  if (request.url.includes('chrome-extension')) return;

  // Skip anything that isn't this app's own origin — always go to network.
  // NOTE: compare origin (protocol+host+PORT), not hostname. The backend API
  // runs on a different origin (e.g. localhost:8082 vs the app on :3000, or an
  // api.* subdomain in prod). Comparing only hostname let same-host/different-port
  // API GETs fall through to the cache-first branch below, which then served
  // stale API responses forever (e.g. removed locations still showing up).
  const isExternal =
    url.origin !== self.location.origin ||
    url.pathname.includes('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('openstreetmap.org');
  if (isExternal) return;

  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);

  // Navigation requests → serve app shell (SPA routing)
  if (request.mode === 'navigate') {
    const cached =
      (await caches.match(`${BASE}/index.html`)) ||
      (await caches.match(`${BASE}/`));
    if (cached) return cached;

    try {
      const net = await fetch(request);
      if (net.ok) {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(`${BASE}/index.html`, net.clone());
        return net;
      }
    } catch { /* offline */ }

    return offlineHtml();
  }

  // Static assets — cache first, network fallback, then cache on success
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const net = await fetch(request, { cache: 'no-cache' });
    if (net.ok && net.type === 'basic') {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, net.clone());
    }
    return net;
  } catch {
    return new Response(
      JSON.stringify({ offline: true, message: 'No network and no cache.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function offlineHtml() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>SAM v2 — Offline</title>
  <style>
    body{margin:0;font-family:Arial,sans-serif;background:#002147;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:16px;padding:36px 28px;max-width:360px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3)}
    h2{color:#002147;margin:0 0 8px}
    p{color:#6B7280;font-size:14px;margin:0 0 20px}
    button{background:#1CABE2;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:15px;cursor:pointer}
    .icon{font-size:48px;margin-bottom:12px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h2>You're offline</h2>
    <p>SAM Platform needs a connection to load for the first time. Please reconnect and try again.</p>
    <button onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

// ── Messages from main thread ─────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();

  if (event.data?.type === 'GET_CACHE_STATUS') {
    caches.open(CACHE_VERSION).then(cache => cache.keys()).then(keys => {
      event.ports[0]?.postMessage({ cachedFiles: keys.length });
    });
  }
});
