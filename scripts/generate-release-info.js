#!/usr/bin/env node
/*
 * Writes src/generated/releaseInfo.json — the single source of the web build's
 * identity (plan §4 "Version contract"). Runs before start/build/test.
 *
 * The release identity comes from release-manifest.json (checked in, bumped when a
 * coordinated release is prepared). Environment variables override it:
 *   SAM_RELEASE_ID            e.g. sam-1.0.11   (must match sam_BE's release id rules)
 *   SAM_RELEASE_SEQUENCE      monotonic integer for coordinated releases
 *   SAM_BUILD_VARIANT         web | android   (default: web; sam_surveyor_app sets android)
 *   SAM_API_CONTRACT_VERSION  integer (default: manifest, else 1)
 *   SAM_FRONTEND_COMMIT       full SHA (default: GITHUB_SHA or `git rev-parse HEAD`)
 *   SAM_REQUIRE_RELEASE_IDENTITY=1  fail unless commit, release id, sequence and a clean tree are known
 *                                   (set in CI so no deployed build reports "dev")
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));

// Same rule as sam_BE ReleasePolicyService.RELEASE_ID, so every build id can be registered there.
const RELEASE_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const COMMIT = /^[0-9a-f]{7,40}$/;

const fail = msg => {
  console.error(`[release-info] ${msg}`);
  process.exit(1);
};

const git = cmd => {
  try { return execSync(`git ${cmd}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return ''; }
};

let manifest = {};
const manifestPath = path.join(root, 'release-manifest.json');
if (fs.existsSync(manifestPath)) {
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (e) { fail(`release-manifest.json is not valid JSON: ${e.message}`); }
}

const strict = process.env.SAM_REQUIRE_RELEASE_IDENTITY === '1';

const rawCommit = (process.env.SAM_FRONTEND_COMMIT || process.env.GITHUB_SHA || git('rev-parse HEAD') || '').toLowerCase();
const commit = COMMIT.test(rawCommit) ? rawCommit : 'unknown';
if (rawCommit && commit === 'unknown') console.warn(`[release-info] ignoring malformed commit "${rawCommit}"`);
const dirty = !process.env.SAM_FRONTEND_COMMIT && !process.env.GITHUB_SHA && git('status --porcelain') !== '';

const explicitId = process.env.SAM_RELEASE_ID || manifest.releaseId || null;
if (explicitId != null && !RELEASE_ID.test(String(explicitId))) {
  fail(`release id "${explicitId}" must be 1-64 lowercase letters, digits, '.', '_' or '-' (starting with a letter or digit)`);
}
const releaseId = explicitId || `dev-${pkg.version}`;

const seqRaw = process.env.SAM_RELEASE_SEQUENCE ?? manifest.releaseSequence;
if (seqRaw != null && seqRaw !== '' && !/^\d+$/.test(String(seqRaw))) fail(`release sequence "${seqRaw}" must be a positive integer`);
const releaseSequence = seqRaw != null && seqRaw !== '' ? Number(seqRaw) : 0;

const apiRaw = process.env.SAM_API_CONTRACT_VERSION ?? manifest.apiContractVersion;
if (apiRaw != null && apiRaw !== '' && !/^[1-9]\d*$/.test(String(apiRaw))) fail(`API contract version "${apiRaw}" must be a positive integer`);
const apiContractVersion = apiRaw != null && apiRaw !== '' ? Number(apiRaw) : 1;

const variant = (process.env.SAM_BUILD_VARIANT || 'web').toLowerCase();
if (!['web', 'android'].includes(variant)) fail(`SAM_BUILD_VARIANT must be web or android, got "${variant}"`);

if (strict) {
  const missing = [];
  if (commit === 'unknown') missing.push('frontend commit');
  if (!explicitId) missing.push('release id (release-manifest.json or SAM_RELEASE_ID)');
  if (!releaseSequence) missing.push('release sequence (release-manifest.json or SAM_RELEASE_SEQUENCE)');
  if (dirty) missing.push('clean working tree');
  if (missing.length) fail(`Refusing to build without release identity: ${missing.join(', ')}`);
}

const shortSha = commit === 'unknown' ? 'unknown' : commit.slice(0, 7);
const info = {
  releaseId,
  releaseSequence,
  variant,
  frontendCommit: commit,
  dirty,
  apiContractVersion,
  packageVersion: pkg.version,
  webBuildId: `${releaseId}-${variant}-${shortSha}${dirty ? '-dirty' : ''}`,
  builtAt: new Date().toISOString(),
};

const outDir = path.join(root, 'src', 'generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'releaseInfo.json'), JSON.stringify(info, null, 2) + '\n');
console.log(`[release-info] ${info.webBuildId} (sequence ${releaseSequence})`);
