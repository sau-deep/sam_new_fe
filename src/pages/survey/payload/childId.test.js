import { CODE_WIDTHS, buildChildId, normalizeCode, padCode } from './childId';

/** Child ID from its six segments. */
const id = (...parts) => parts.join('');

// The rule the Concurrent form and the Household backend used before C5
// (numeric codes; the Concurrent preview also kept only 2 village characters).
const legacyChildId = v =>
  String(Number(v.districtCode)).padStart(3, '0')
  + String(Number(v.blockCode)).padStart(4, '0')
  + String(Number(v.villageCode)).padStart(2, '0').slice(-2)
  + String(Number(v.clusterCode)).padStart(2, '0')
  + String(Number(v.structureCode)).padStart(2, '0')
  + String(Number(v.householdNumber)).padStart(3, '0');

const base = { districtCode: '7', blockCode: '12', villageCode: '45', clusterCode: '3', structureCode: '01', householdNumber: '9' };

describe('normalizeCode', () => {
  it('strips leading zeros from digit codes, then pads to the width', () => {
    expect(normalizeCode('007', 2)).toBe('07');
    expect(normalizeCode('00123', 4)).toBe('0123');
    expect(normalizeCode('0045', 2)).toBe('45');
    expect(normalizeCode('000', 3)).toBe('000');
    expect(normalizeCode(' 7 ', 3)).toBe('007');
    expect(normalizeCode(7, 3)).toBe('007');
    expect(normalizeCode('345', 2)).toBe('345');
  });

  it('keeps non-digit codes as stored, padding only when shorter', () => {
    expect(normalizeCode('B12A', 4)).toBe('B12A');
    expect(normalizeCode('AB123', 4)).toBe('AB123');
    expect(normalizeCode('B1', 4)).toBe('00B1');
    expect(normalizeCode('0B1', 2)).toBe('0B1');
  });

  it('is null for missing codes', () => {
    ['', '   ', null, undefined].forEach(v => expect(normalizeCode(v, 2)).toBeNull());
  });
});

describe('padCode (stored codes)', () => {
  it('pads only when shorter and never re-numbers or truncates', () => {
    expect(padCode('5', 2)).toBe('05');
    expect(padCode('345', 2)).toBe('345');
    expect(padCode('007', 2)).toBe('007');
    expect(padCode('', 2)).toBe('');
  });
});

describe('buildChildId', () => {
  it('uses the agreed widths and the plain legacy format when every code fits', () => {
    expect(CODE_WIDTHS).toEqual({ district: 3, block: 4, village: 2, cluster: 2, structure: 2, household: 3 });
    expect(buildChildId(base)).toBe(id('007', '0012', '45', '03', '01', '009'));
  });

  it('matches the previous ID for all-numeric codes that fit their width', () => {
    const samples = [
      base,
      { districtCode: '123', blockCode: '4567', villageCode: '8', clusterCode: '10', structureCode: '02', householdNumber: '300' },
      { districtCode: '1', blockCode: '1', villageCode: '1', clusterCode: '1', structureCode: '1', householdNumber: '1' },
      { districtCode: 99, blockCode: 999, villageCode: 99, clusterCode: 99, structureCode: '02', householdNumber: 999 },
      { districtCode: '007', blockCode: '00123', villageCode: '007', clusterCode: '03', structureCode: '01', householdNumber: '009' },
    ];
    samples.forEach(s => expect(buildChildId(s)).toBe(legacyChildId(s)));
  });

  it('joins with "-" when a code is longer than its width', () => {
    expect(buildChildId({ districtCode: '045', blockCode: '0123', villageCode: '345', clusterCode: '1', structureCode: '2', householdNumber: '3' }))
      .toBe('045-0123-345-01-02-003');
  });

  it('gives village 45 and 345 distinct IDs', () => {
    const a = buildChildId(base);
    const b = buildChildId({ ...base, villageCode: '345' });
    expect(a).not.toBe(b);
    expect(b).toBe('007-0012-345-03-01-009');
    // The old Concurrent preview collapsed them.
    expect(legacyChildId(base)).toBe(legacyChildId({ ...base, villageCode: '345' }));
  });

  it('keeps block 12345 + village 06 apart from block 1234 + village 506', () => {
    const a = buildChildId({ ...base, blockCode: '12345', villageCode: '06' });
    const b = buildChildId({ ...base, blockCode: '1234', villageCode: '506' });
    expect(a).toBe('007-12345-06-03-01-009');
    expect(b).toBe('007-1234-506-03-01-009');
    expect(a).not.toBe(b);
  });

  it('keeps alphanumeric codes whole', () => {
    expect(buildChildId({ ...base, blockCode: 'B12A' })).toBe(id('007', 'B12A', '45', '03', '01', '009'));
    expect(buildChildId({ ...base, blockCode: 'AB123' })).toBe('007-AB123-45-03-01-009');
  });

  it('gives null when any code is missing', () => {
    expect(buildChildId({ ...base, blockCode: '' })).toBeNull();
    expect(buildChildId({ ...base, householdNumber: undefined })).toBeNull();
    expect(buildChildId()).toBeNull();
  });
});
