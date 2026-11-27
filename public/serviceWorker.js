/* eslint-disable */
/*
 * SAM v2 service worker — offline app shell with per-build identity
 * (plan §6 "Web release activation and cache rules").
 *
 *  - BUILD_ID is stamped by scripts/stamp-service-worker.js after every build, so
 *    each deploy has different worker bytes and its own cache (sam-shell-<build>).
 *  - Page loads are NETWORK-FIRST (short timeout, then the cached shell), so a
 *    reload while online always gets the deployed HTML. Hashed /static/ assets are
 *    cache-first (their names change when their content does).
 *  - Install caches the whole core shell or fails; a partial shell never takes over.
 *  - A new worker waits until the page asks it to activate (SKIP_WAITING) or all
 *    tabs close. Exception: replacing the old cache-first worker
 *    ("sam-v2-cache-v2"), whose pages cannot ask — it hands over once installed.
 *  - Only SAM's own caches are deleted, and the previous build's cache is kept so
 *    tabs still running it can load their chunks.
 *  - Not used inside the Android app (see src/serviceWorkerRegistration.js).
 */
const BUILD_ID = '__SAM_BUILD_ID__';
const STAMPED = BUILD_ID.indexOf('__SAM_') !== 0;
const SHELL_PREFIX = 'sam-shell-';
const LEGACY_CACHES = ['sam-v2-cache-v2'];
const CACHE_NAME = SHELL_PREFIX + (STAMPED ? BUILD_ID : 'unstamped');
const NAVIGATION_TIMEOUT_MS = 5000;

// Detect base path from where the SW file is served
const SW_PATH = self.location.pathname; // e.g. /v2/serviceWorker.js or /serviceWorker.js
const BASE = SW_PATH.startsWith('/v2') ? '/v2' : '';
const SHELL_URL = `${BASE}/index.html`;

const CORE_FILES = [SHELL_URL, `${BASE}/manifest.json`];

const OPTIONAL_FILES = [
  `${BASE}/favicon.ico`,
  `${BASE}/LogoAmb.png`,
  `${BASE}/Institute-of-Economic-Growth.png`,
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

const isOwnedCache = name => name.startsWith(SHELL_PREFIX) || LEGACY_CACHES.includes(name);
const isHashedAsset = url => /\/static\/(js|css|media)\/.+\.[0-9a-f]{8,}\./.test(url.pathname);

async function chunkAssets() {
  const res = await fetch(`${BASE}/asset-manifest.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('asset-manifest.json unavailable');
  const files = (await res.json()).files || {};
  return Object.keys(files)
    .filter(k => (k.endsWith('.js') || k.endsWith('.css')) && !k.endsWith('.map') && typeof files[k] === 'string')
    .map(k => files[k]);
}

async function put(cache, url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  await cache.put(url, res);
}

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // Core shell: every file or nothing.
      const core = [...CORE_FILES, ...(await chunkAssets())];
      await Promise.all(core.map(url => put(cache, url)));
    } catch (e) {
      await caches.delete(CACHE_NAME);
      throw e; // install fails; the current worker keeps serving
    }
    // Images are nice to have offline but must not block an update.
    await Promise.allSettled(OPTIONAL_FILES.map(url => put(cache, url)));

    const names = await caches.keys();
    if (names.some(n => LEGACY_CACHES.includes(n))) {
      // Bridge: pages controlled by the old cache-first worker cannot request
      // activation, and that worker would keep serving its old shell forever.
      await self.skipWaiting();
    }
  })());
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const owned = (await caches.keys()).filter(isOwnedCache).filter(n => n !== CACHE_NAME);
    // keys() lists caches in creation order: keep the newest other one (the build
    // open tabs may still be running), delete the rest. Other apps' caches on this
    // origin are never touched.
    const keepPrevious = owned[owned.length - 1];
    await Promise.all(owned.filter(n => n !== keepPrevious).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;
  if (url.pathname.includes('.hot-update.')) return;
  if (request.url.includes('chrome-extension')) return;

  // Only this app's own static files. The API runs on another origin (compare
  // origin, not hostname: same host + different port is still the API).
  const isExternal =
    url.origin !== self.location.origin ||
    url.pathname.includes('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('openstreetmap.org');
  if (isExternal) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigation(request));
  } else if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function navigation(request) {
  try {
    const net = await withTimeout(fetch(request, { cache: 'no-store' }), NAVIGATION_TIMEOUT_MS);
    if (net.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(SHELL_URL, net.clone());
      return net;
    }
  } catch { /* offline or slow: use the cached shell */ }
  const shell =
    (await (await caches.open(CACHE_NAME)).match(SHELL_URL)) ||
    (await caches.match(SHELL_URL)) ||
    (await caches.match(`${BASE}/`));
  return shell || offlineHtml();
}

async function cacheFirst(request) {
  const cached = await caches.match(request); // any owned build: old tabs still find their chunks
  if (cached) return cached;
  try {
    const net = await fetch(request);
    if (net.ok && net.type === 'basic') (await caches.open(CACHE_NAME)).put(request, net.clone());
    return net;
  } catch {
    return offlineResponse();
  }
}

async function staleWhileRevalidate(request, event) {
  // This build's copy first: caches.match() searches oldest cache first, which for
  // un-hashed files would keep returning a previous build's copy forever.
  const cached = (await (await caches.open(CACHE_NAME)).match(request)) || (await caches.match(request));
  const refresh = fetch(request, { cache: 'no-cache' }).then(async net => {
    if (net.ok && net.type === 'basic') await (await caches.open(CACHE_NAME)).put(request, net.clone());
    return net;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  try {
    return await refresh;
  } catch {
    return offlineResponse();
  }
}

function offlineResponse() {
  return new Response(JSON.stringify({ offline: true, message: 'No network and no cache.' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } });
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

// ── Messages from the page ────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();

  if (event.data?.type === 'GET_BUILD') {
    event.ports[0]?.postMessage({ build: BUILD_ID, stamped: STAMPED, cache: CACHE_NAME });
  }

  if (event.data?.type === 'GET_CACHE_STATUS') {
    caches.open(CACHE_NAME).then(cache => cache.keys()).then(keys => {
      event.ports[0]?.postMessage({ cachedFiles: keys.length });
    });
  }
});
