// Same cases as sam_BE ReleaseVerdictTest.java — keep them in step.
import { computeUpdateVerdict, UPDATE_LEVEL } from './releaseVerdict';

const NOW = Date.parse('2026-11-27T10:00:00Z');
const policy = (extra = {}) => ({
  active: true,
  enforcement: 'off',
  api: { minimum: 1, maximum: 1 },
  android: { latestVersionCode: 15, minimumSupportedVersionCode: 14 },
  web: { latestReleaseSequence: 15, minimumReleaseSequence: 14 },
  requiredAfter: null,
  ...extra,
});
const level = (p, c) => computeUpdateVerdict(p, { apiContractVersion: 1, ...c }, NOW).level;

it('android compares version codes', () => {
  expect(level(policy(), { platform: 'android', androidVersionCode: 13 })).toBe(UPDATE_LEVEL.REQUIRED);
  expect(level(policy(), { platform: 'android', androidVersionCode: 14 })).toBe(UPDATE_LEVEL.RECOMMENDED);
  expect(level(policy(), { platform: 'android', androidVersionCode: 15 })).toBe(UPDATE_LEVEL.CURRENT);
  expect(level(policy(), { platform: 'android', androidVersionCode: 16 })).toBe(UPDATE_LEVEL.CURRENT);
  expect(level(policy(), { platform: 'android', androidVersionCode: null })).toBe(UPDATE_LEVEL.UNKNOWN);
});

it('web compares release sequences', () => {
  expect(level(policy(), { platform: 'web', releaseSequence: 13 })).toBe(UPDATE_LEVEL.REQUIRED);
  expect(level(policy(), { platform: 'web', releaseSequence: 14 })).toBe(UPDATE_LEVEL.RECOMMENDED);
  expect(level(policy(), { platform: 'web', releaseSequence: 15 })).toBe(UPDATE_LEVEL.CURRENT);
  expect(level(policy(), { platform: 'web', releaseSequence: 0 })).toBe(UPDATE_LEVEL.UNKNOWN);
});

it('below minimum is only recommended until requiredAfter', () => {
  expect(level(policy({ requiredAfter: '2026-11-28T10:00:00Z' }), { platform: 'android', androidVersionCode: 13 }))
    .toBe(UPDATE_LEVEL.RECOMMENDED);
  expect(level(policy({ requiredAfter: '2026-11-27T09:59:00Z' }), { platform: 'android', androidVersionCode: 13 }))
    .toBe(UPDATE_LEVEL.REQUIRED);
});

it('unsupported API contract is required', () => {
  expect(level(policy(), { platform: 'web', releaseSequence: 15, apiContractVersion: 2 })).toBe(UPDATE_LEVEL.REQUIRED);
});

it('no policy or platform is unknown', () => {
  expect(level(null, { platform: 'web', releaseSequence: 15 })).toBe(UPDATE_LEVEL.UNKNOWN);
  expect(level({ active: false }, { platform: 'web', releaseSequence: 15 })).toBe(UPDATE_LEVEL.UNKNOWN);
  expect(level(policy(), { platform: undefined, releaseSequence: 15 })).toBe(UPDATE_LEVEL.UNKNOWN);
});
