import { hasUserChanges } from './useFormAutoSave';

describe('hasUserChanges', () => {
  const initial = { state: 'Bihar', visitDate: '2026-11-27', childAgeMonths: 0, names: [], responseMode: 'online' };

  it('ignores prefilled defaults and app-filled location fields', () => {
    expect(hasUserChanges({ ...initial }, initial)).toBe(false);
    expect(hasUserChanges({ ...initial, latitude: '21.1', longitude: '79.0', location: 'Patna', locationAccuracyMeters: 12, responseMode: 'offline' }, initial)).toBe(false);
    expect(hasUserChanges({ ...initial, caregiverName: '' }, initial)).toBe(false);
  });

  it('detects what the surveyor entered', () => {
    expect(hasUserChanges({ ...initial, caregiverName: 'Asha' }, initial)).toBe(true);
    expect(hasUserChanges({ ...initial, names: ['a'] }, initial)).toBe(true);
    expect(hasUserChanges({ ...initial, childAgeMonths: 7 }, initial)).toBe(true);
  });
});
