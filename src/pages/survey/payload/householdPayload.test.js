import {
  PHONE_MESSAGE, buildHouseholdPayload, householdFieldForKey, isValidPhone, normalizePhoneInput, validateHouseholdRequest,
} from './householdPayload';

const values = (over = {}) => ({
  responseMode: 'online',
  nameParticipant: 'SITA', verbalConsent: 'Yes', date: '2026-11-10', time: '09:45',
  state: 'Bihar', stateCode: 10, district: 'Patna', districtCode: '28', block: 'B', blockCode: '123',
  village: 'V', villageCode: '5', clusterNumber: '3', structureCode: '01', householdNumber: '12',
  mobileNumber: '9876543210', headOfHousehold: 'RAM', numberOfChildren: '2', childrenStayingHh: '2',
  locationHousehold: 'Ward 4, Danapur, Patna', latitude: 0, longitude: 0,
  ...over,
});

describe('buildHouseholdPayload', () => {
  it('sends the selected date, time and captured address unchanged (F09)', () => {
    const req = buildHouseholdPayload(values(), { coordinates: { lat: 25.6, lng: 85.1 } });
    expect(req).toMatchObject({ date: '2026-11-10', time: '09:45', locationHousehold: 'Ward 4, Danapur, Patna', latitude: 25.6, longitude: 85.1 });
  });

  it('keeps codes as strings, padding only when shorter (F08)', () => {
    expect(buildHouseholdPayload(values()).villageCode).toBe('05');
    expect(buildHouseholdPayload(values({ villageCode: '345' })).villageCode).toBe('345');
    expect(buildHouseholdPayload(values({ villageCode: 'AB1234' })).villageCode).toBe('AB1234');
    expect(buildHouseholdPayload(values()).stateCode).toBe('10');
    expect(buildHouseholdPayload(values({ districtCode: '007' })).districtCode).toBe('007');
  });

  it('adds location metadata', () => {
    const req = buildHouseholdPayload(values(), { coordinates: { lat: 1, lng: 2, accuracy: 5, timestamp: 'T' }, locationMetadata: c => ({ locationAccuracyMeters: c.accuracy }) });
    expect(req.locationAccuracyMeters).toBe(5);
  });
});

describe('Household phone (F07)', () => {
  it('normalises pasted formatting but keeps anything that is not formatting', () => {
    expect(normalizePhoneInput('98765 43210')).toBe('9876543210');
    expect(normalizePhoneInput('(987) 654-3210')).toBe('9876543210');
    expect(normalizePhoneInput('987.654.3210')).toBe('9876543210');
    expect(normalizePhoneInput('+91 98765 43210')).toBe('+919876543210');
    expect(normalizePhoneInput(9876543210)).toBe('9876543210');
    expect(normalizePhoneInput(null)).toBe('');
  });

  it('accepts exactly ten digits on the final value', () => {
    expect(isValidPhone('9876543210')).toBe(true);
    ['9', '987654321', '98765432101', '+919876543210', '98765-4321', '', null].forEach(v => expect(isValidPhone(v)).toBe(false));
  });

  it('rejects a restored or pasted value that is not ten digits', () => {
    expect(validateHouseholdRequest(buildHouseholdPayload(values({ mobileNumber: '9' })))).toEqual({ mobileNumber: PHONE_MESSAGE });
    expect(validateHouseholdRequest(buildHouseholdPayload(values({ mobileNumber: normalizePhoneInput('+91 98765 43210') }))))
      .toEqual({ mobileNumber: PHONE_MESSAGE });
    expect(validateHouseholdRequest(buildHouseholdPayload(values({ mobileNumber: normalizePhoneInput('98765 43210') })))).toEqual({});
    expect(buildHouseholdPayload(values({ mobileNumber: 9876543210 })).mobileNumber).toBe('9876543210');
  });
});

describe('Household names (F07)', () => {
  it('limits participant and head of household to 255 and rejects whitespace-only', () => {
    expect(validateHouseholdRequest(buildHouseholdPayload(values({ nameParticipant: 'A'.repeat(255), headOfHousehold: 'ह'.repeat(255) })))).toEqual({});
    const over = validateHouseholdRequest(buildHouseholdPayload(values({ nameParticipant: 'A'.repeat(256), headOfHousehold: '   ' })));
    expect(over.nameParticipant).toBe('Participant name can be at most 255 characters (currently 256).');
    expect(over.headOfHousehold).toBe('This is a required field');
  });

  it('checks date and time formats', () => {
    expect(validateHouseholdRequest(buildHouseholdPayload(values({ time: '09:45:30' })))).toEqual({});
    expect(validateHouseholdRequest(buildHouseholdPayload(values({ date: '', time: '9' })))).toEqual({ date: 'Select the date', time: 'Select the time' });
  });
});

describe('column widths (F10, same as the backend)', () => {
  it('rejects codes longer than their columns and maps them to the dropdown', () => {
    const errs = validateHouseholdRequest(buildHouseholdPayload(values({ blockCode: '12345678901', clusterNumber: '123' })));
    expect(errs.blockCode).toBe('Block code can be at most 10 characters (currently 11).');
    expect(errs.clusterNumber).toBe('Cluster number can be at most 2 characters (currently 3).');
    expect(householdFieldForKey('blockCode')).toBe('block');
    expect(householdFieldForKey('villageCode')).toBe('village');
    expect(householdFieldForKey('mobileNumber')).toBe('mobileNumber');
  });

  it('limits the captured address (TEXT) in UTF-8 bytes', () => {
    expect(validateHouseholdRequest(buildHouseholdPayload(values({ locationHousehold: 'ह'.repeat(21845) })))).toEqual({}); // 65,535 bytes
    expect(validateHouseholdRequest(buildHouseholdPayload(values({ locationHousehold: 'ह'.repeat(21846) }))))
      .toEqual({ locationHousehold: 'Location household is too long to store (65538 bytes; the limit is 65535).' });
  });
});
