// Is this build current, should it update, or must it update? Same rules as
// sam_BE ReleaseVerdict.java — keep the two in step (and their tests).
//
//   below minimum  → required (or recommended until requiredAfter, when set)
//   below latest   → recommended
//   no identity    → unknown (development build, or the app version is not known yet)
//   API contract outside what the backend serves → required
//
// A HIGHER build than "latest" is current, never "behind" (after a policy
// rollback, newer installs must not be told to downgrade).
export const UPDATE_LEVEL = Object.freeze({
  CURRENT: 'current',
  RECOMMENDED: 'recommended',
  REQUIRED: 'required',
  UNKNOWN: 'unknown',
});

const num = v => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

function compare(installed, minimum, latest, requiredAfterMs, now, what, reasons) {
  if (installed == null) {
    reasons.push(`This build did not report its ${what} (development or pre-versioning build).`);
    return UPDATE_LEVEL.UNKNOWN;
  }
  if (minimum != null && installed < minimum) {
    if (requiredAfterMs == null || now >= requiredAfterMs) {
      reasons.push(`${what} ${installed} is below the minimum supported ${minimum}.`);
      return UPDATE_LEVEL.REQUIRED;
    }
    reasons.push(`${what} ${installed} is below the minimum ${minimum}; required from ${new Date(requiredAfterMs).toISOString()}.`);
    return UPDATE_LEVEL.RECOMMENDED;
  }
  if (latest != null && installed < latest) {
    reasons.push(`A newer build is available (${what} ${latest}).`);
    return UPDATE_LEVEL.RECOMMENDED;
  }
  return UPDATE_LEVEL.CURRENT;
}

/**
 * @param policy  response of GET /app/releases/policy
 * @param client  { platform: 'web'|'android', releaseSequence, androidVersionCode, apiContractVersion }
 * @param now     ms since epoch, ideally corrected by the server time offset
 */
export function computeUpdateVerdict(policy, client, now = Date.now()) {
  const reasons = [];
  let level;
  const requiredAfterMs = policy?.requiredAfter ? Date.parse(policy.requiredAfter) : null;

  if (!policy || policy.active !== true) {
    level = UPDATE_LEVEL.UNKNOWN;
    reasons.push('No update policy is active.');
  } else if (client?.platform === 'android') {
    level = compare(num(client.androidVersionCode), num(policy.android?.minimumSupportedVersionCode),
      num(policy.android?.latestVersionCode), requiredAfterMs, now, 'Android version code', reasons);
  } else if (client?.platform === 'web') {
    const seq = num(client.releaseSequence);
    level = compare(seq && seq > 0 ? seq : null, num(policy.web?.minimumReleaseSequence),
      num(policy.web?.latestReleaseSequence), requiredAfterMs, now, 'web release sequence', reasons);
  } else {
    level = UPDATE_LEVEL.UNKNOWN;
    reasons.push('The app did not say which platform it runs on.');
  }

  const apiVersion = num(client?.apiContractVersion);
  const apiMin = num(policy?.api?.minimum);
  const apiMax = num(policy?.api?.maximum);
  if (apiVersion != null && apiMin != null && apiMax != null && (apiVersion < apiMin || apiVersion > apiMax)) {
    level = UPDATE_LEVEL.REQUIRED;
    reasons.push(`API contract ${apiVersion} is not served by this backend (${apiMin}..${apiMax}).`);
  }

  return {
    level,
    reasons,
    requiredAfter: Number.isFinite(requiredAfterMs) ? new Date(requiredAfterMs).toISOString() : null,
    enforcement: policy?.enforcement || 'off',
  };
}
