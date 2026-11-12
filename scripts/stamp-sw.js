/*
 * Postbuild step: stamps build/serviceWorker.js with the build time.
 *
 * A browser only re-installs a service worker when the worker file's bytes
 * change. With a hardcoded CACHE_VERSION every build shipped a byte-identical
 * worker, so the install/activate events never re-ran and users kept the old
 * cached shell. Stamping the version makes every build a new worker.
 *
 * RECONSTRUCTED: the original script ran in the build of APK v1.0.8 (its output
 * 'sam-v2-cache-2026-09-15T10-29-00-308Z' is in the shipped worker) but was
 * never committed. This rewrite reproduces that output format.
 */
const fs = require("fs");
const path = require("path");

const swPath = path.resolve(__dirname, "../build/serviceWorker.js");
if (!fs.existsSync(swPath)) {
  console.error(`stamp-sw: ${swPath} not found — did the build run?`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const src = fs.readFileSync(swPath, "utf8");
const pattern = /const CACHE_VERSION = '[^']*';/;
if (!pattern.test(src)) {
  console.error("stamp-sw: CACHE_VERSION declaration not found in serviceWorker.js");
  process.exit(1);
}

fs.writeFileSync(swPath, src.replace(pattern, `const CACHE_VERSION = 'sam-v2-cache-${stamp}';`));
console.log(`stamp-sw: CACHE_VERSION = sam-v2-cache-${stamp}`);
