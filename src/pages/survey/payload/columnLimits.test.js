import {
  BIANNUAL_COLUMNS, FOLLOWUP_COLUMNS, HOUSEHOLD_COLUMNS, TEXT_BYTES, checkColumns, columnError, fieldLabel, utf8Bytes,
} from './columnLimits';

describe('column tables', () => {
  it('hold a code-point width or a TEXT byte limit for every column', () => {
    [BIANNUAL_COLUMNS, FOLLOWUP_COLUMNS, HOUSEHOLD_COLUMNS].forEach(table => {
      Object.values(table).forEach(limit => {
        expect(typeof limit === 'number' ? limit > 0 : limit.bytes === TEXT_BYTES).toBe(true);
      });
    });
  });

  it('use the widened columns and leave server-set ones to the backend', () => {
    [BIANNUAL_COLUMNS, FOLLOWUP_COLUMNS, HOUSEHOLD_COLUMNS].forEach(t => {
      expect(t.blockCode).toBe(10);
      expect(t).not.toHaveProperty('childId');
      expect(t).not.toHaveProperty('createdBy');
    });
    expect(HOUSEHOLD_COLUMNS.locationHousehold).toEqual({ bytes: TEXT_BYTES });
    expect(HOUSEHOLD_COLUMNS).not.toHaveProperty('reverseGeocodedAddress');
  });
});

describe('columnError / checkColumns', () => {
  it('counts code points for VARCHAR and states the limit', () => {
    expect(columnError('childName', 'क'.repeat(80), 80)).toBeNull();
    expect(columnError('childName', '😀'.repeat(80), 80)).toBeNull(); // 160 UTF-16 units, 80 characters
    expect(columnError('childName', 'a'.repeat(81), 80)).toBe('Child name can be at most 80 characters (currently 81).');
  });

  it('counts UTF-8 bytes for TEXT', () => {
    expect(utf8Bytes('aé€😀')).toBe(1 + 2 + 3 + 4);
    expect(columnError('relevantInfo', 'a'.repeat(TEXT_BYTES), { bytes: TEXT_BYTES })).toBeNull();
    expect(columnError('relevantInfo', `${'a'.repeat(TEXT_BYTES - 1)}é`, { bytes: TEXT_BYTES }))
      .toBe('Relevant info is too long to store (65536 bytes; the limit is 65535).');
  });

  it('checks numbers as text and ignores missing values, lists and unlisted keys', () => {
    expect(columnError('current_wt', 123.45, 5)).toBe('Current wt can be at most 5 characters (currently 6).');
    const errs = checkColumns({ a: 'abc', b: null, c: ['x'.repeat(50)], extra: 'x'.repeat(999) }, { a: 2, b: 1, c: 3 });
    expect(errs).toEqual({ a: 'A can be at most 2 characters (currently 3).' });
  });

  it('labels request keys readably', () => {
    expect(fieldLabel('caregiverName')).toBe('Caregiver name');
    expect(fieldLabel('current_wt')).toBe('Current wt');
    expect(fieldLabel('quantityThrEveryDayOtherText')).toBe('Quantity thr every day other text');
  });
});
