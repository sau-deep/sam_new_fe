#!/usr/bin/env node
/*
 * Runs after `npm run build`: writes this build's id into build/serviceWorker.js.
 * Different bytes per build make browsers install the new worker, and the
 * worker names its cache after the build (sam-shell-<webBuildId>).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const buildDir = path.resolve(root, process.env.BUILD_PATH || 'build');
const swPath = path.join(buildDir, 'serviceWorker.js');
const info = JSON.parse(fs.readFileSync(path.join(root, 'src', 'generated', 'releaseInfo.json'), 'utf8'));

if (!fs.existsSync(swPath)) {
  console.error(`[stamp-sw] ${swPath} not found`);
  process.exit(1);
}
const source = fs.readFileSync(swPath, 'utf8');
const placeholder = "'__SAM_BUILD_ID__'";
if (!source.includes(placeholder)) {
  console.error('[stamp-sw] build id placeholder not found in serviceWorker.js');
  process.exit(1);
}
const id = String(info.webBuildId).replace(/[^A-Za-z0-9._-]/g, '');
fs.writeFileSync(swPath, source.replace(placeholder, JSON.stringify(id)));
console.log(`[stamp-sw] serviceWorker.js → ${id}`);
