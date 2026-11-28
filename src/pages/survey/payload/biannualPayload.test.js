import {
  BIANNUAL_OTHER_DETAILS, biannualChildId, biannualFieldForKey, biannualOtherDetailRule,
  buildBiannualPayload, validateBiannualRequest, withoutHiddenOtherQuestions, withoutSkippedCaAnswers,
} from './biannualPayload';
import { collectYupErrors } from './common';
import * as Yup from 'yup';

/** Child ID from its six segments. */
const id = (...parts) => parts.join('');

const OTHER_TEXT_KEYS = [
  'primaryCaregiverOtherText', 'caregiversexOtherText', 'childSexOtherText',
  'weightNotMeasuredReasonOtherText', 'heightNotMeasuredReasonOtherText', 'childUndernourishedTypeOtherText',
  'reasonWtNotMeasuringOtherText', 'reasonHtNotMeasuringOtherText', 'reasonNotAssessingOtherText',
];

const values = (over = {}) => ({
  responseMode: 'online',
  visitDate: '2026-11-20',
  state: 'Bihar', stateCode: '10', district: 'Patna', districtCode: '028', block: 'Danapur', blockCode: '0123',
  village: 'V1', villageCode: '45', clusterCode: '3', structureCode: '01', householdNumber: '9',
  hhHeadReligion: 'Hindu', hhHeadReligionOther: '',
  childId: '',
  primaryCaregiver: 'Mother', primaryCaregiver_other: '',
  careGiverInterview: 'Yes',
  caregiverName: 'SITA DEVI', caregiversex: 'Female', caregiversex_other: '',
  childName: 'RAM', childSex: 'Male', childSex_other: '',
  weightNotMeasuredReason: '', weightNotMeasuredReason_other: '',
  heightNotMeasuredReason: '', heightNotMeasuredReason_other: '',
  childUndernourishedType: '', childUndernourishedType_other: '',
  reasonWtNotMeasuring: '', reasonWtNotMeasuring_other: '',
  reasonHtNotMeasuring: '', reasonHtNotMeasuring_other: '',
  reasonNotAssessing: '', reasonNotAssessing_other: '',
  awwDiscussion: ['feeding', 'other'], awwDiscussion_other: 'hygiene',
  awwCounsel: [], ashaInform: [], ashaUsedtoInform: [], reasonStoppedFeedingw: [], medicineConsumed: [],
  reasonAdmitted: [], otherThanMilkGiven: [], otherThanMilkGivenReason: [],
  latitude: '', longitude: '',
  ...over,
});

// Answers that make each question visible (GMT1.1/GMT2.1 and GMT4 cannot all be shown at once).
const SHOWN = {
  primaryCaregiver: {},
  caregiversex: {},
  childSex: {},
  weightNotMeasuredReason: { weightLastMonthAww: 'No' },
  heightNotMeasuredReason: { heightLastMonthAww: 'No' },
  childUndernourishedType: { weightLastMonthAww: 'Yes', childUndernourished: 'Yes' },
  reasonWtNotMeasuring: { current_wt: '999' },
  reasonHtNotMeasuring: { currentHt: 999 },
  reasonNotAssessing: { presentBilateralOedema: 'Not assessed' },
};

describe('buildBiannualPayload', () => {
  it('sends each of the nine Other details when its question is shown and Other is chosen', () => {
    expect(BIANNUAL_OTHER_DETAILS.map(d => d.key)).toEqual(OTHER_TEXT_KEYS);
    BIANNUAL_OTHER_DETAILS.forEach(({ field, detail, key }, i) => {
      const req = buildBiannualPayload(values({ ...SHOWN[field], [field]: 'Other', [detail]: `  detail ${i}  ` }));
      expect(req[field]).toBe('Other');
      expect(req[key]).toBe(`detail ${i}`);
      expect(req).not.toHaveProperty(detail);
      expect(validateBiannualRequest(req)).toEqual({});
    });
  });

  it('clears a hidden question and its Other detail instead of blocking the submit', () => {
    // GMT1.1 = Other with a blank detail, then GMT1 switched back to Yes: GMT1.1 is hidden.
    const v = values({ weightLastMonthAww: 'Yes', weightNotMeasuredReason: 'Other', weightNotMeasuredReason_other: '' });
    const req = buildBiannualPayload(v);
    expect(req.weightNotMeasuredReason).toBe('');
    expect(req.weightNotMeasuredReasonOtherText).toBeNull();
    expect(validateBiannualRequest(req)).toEqual({});
    // Caregiver not interviewed: every caregiver-step question is hidden.
    const notInterviewed = buildBiannualPayload(values({ careGiverInterview: 'No', caregiversex: 'Other', caregiversex_other: '', childSex: 'Other' }));
    expect(notInterviewed).toMatchObject({ caregiversex: '', childSex: '', caregiversexOtherText: null, childSexOtherText: null });
    expect(validateBiannualRequest(notInterviewed)).toEqual({});
    // A shown question keeps its answer.
    expect(withoutHiddenOtherQuestions(values({ weightLastMonthAww: 'No', weightNotMeasuredReason: 'Sick' })).weightNotMeasuredReason).toBe('Sick');
  });

  it('sends null details when the choice is not Other, even if text was typed earlier', () => {
    const v = values({ primaryCaregiver: 'Father', primaryCaregiver_other: 'left over', childSex: 'Female', childSex_other: 'x' });
    const req = buildBiannualPayload(v);
    OTHER_TEXT_KEYS.forEach(k => expect(req[k]).toBeNull());
    expect(req.primaryCaregiver).toBe('Father');
  });

  it('keeps hhHeadReligionOther working as before', () => {
    expect(buildBiannualPayload(values({ hhHeadReligion: 'Others', hhHeadReligionOther: 'Sikh' })).hhHeadReligionOther).toBe('Sikh');
    expect(buildBiannualPayload(values({ hhHeadReligion: 'Hindu', hhHeadReligionOther: 'stale' })).hhHeadReligionOther).toBe('');
    expect(validateBiannualRequest(buildBiannualPayload(values({ hhHeadReligion: 'Others', hhHeadReligionOther: ' ' }))))
      .toHaveProperty('hhHeadReligionOther');
  });

  it('keeps the legacy multi-select Other encoding', () => {
    expect(buildBiannualPayload(values()).awwDiscussion).toBe('feeding,Other - hygiene');
  });

  it('assigns the previewed Child ID to the request (C5 rule)', () => {
    const v = values({ villageCode: '345' });
    const req = buildBiannualPayload(v);
    expect(req.childId).toBe(biannualChildId(v));
    expect(req.childId).toBe('028-0123-345-03-01-009');
    expect(buildBiannualPayload(values({ villageCode: '45' })).childId).toBe(id('028', '0123', '45', '03', '01', '009'));
    expect(buildBiannualPayload(values({ villageCode: '45' })).childId).not.toBe(req.childId);
  });

  it('sends null rather than a made-up Child ID when a code is missing', () => {
    expect(buildBiannualPayload(values({ blockCode: '' })).childId).toBeNull();
  });

  it('uses re-derived location codes for the Child ID', () => {
    const enrich = v => ({ ...v, districtCode: '005', blockCode: '0042', villageCode: '7' });
    expect(buildBiannualPayload(values(), { enrichLocationCodes: enrich }).childId).toBe(id('005', '0042', '07', '03', '01', '009'));
  });

  it('passes the selected visit date through unchanged', () => {
    expect(buildBiannualPayload(values({ visitDate: '2026-10-01' })).visitDate).toBe('2026-10-01');
  });

  it('adds coordinates and metadata', () => {
    const req = buildBiannualPayload(values(), {
      coordinates: { lat: 25.6, lng: 85.1, accuracy: 9, timestamp: 'T' },
      locationMetadata: c => ({ locationAccuracyMeters: c.accuracy, locationCapturedAt: c.timestamp }),
    });
    expect(req).toMatchObject({ latitude: '25.6', longitude: '85.1', locationAccuracyMeters: 9, locationCapturedAt: 'T' });
    expect(buildBiannualPayload(values())).toMatchObject({ latitude: '0', longitude: '0' });
  });

  it('blanks skipped dependent answers', () => {
    expect(withoutSkippedCaAnswers({ nutritionalCategory: 'Normal', samIdentifiedByAww: 'Yes' }).samIdentifiedByAww).toBe('');
  });
});

describe('validateBiannualRequest', () => {
  it('requires the Other detail and limits it to 200 characters', () => {
    const req = buildBiannualPayload(values({ childSex: 'Other', childSex_other: '   ' }));
    expect(validateBiannualRequest(req)).toEqual({ childSexOtherText: 'Please specify the other answer' });

    const exact = buildBiannualPayload(values({ childSex: 'Other', childSex_other: 'क'.repeat(200) }));
    expect(validateBiannualRequest(exact)).toEqual({});
    const over = buildBiannualPayload(values({ childSex: 'Other', childSex_other: 'a'.repeat(201) }));
    expect(validateBiannualRequest(over).childSexOtherText).toBe('Other detail can be at most 200 characters (currently 201).');
  });

  it('limits caregiver and child names to 80 and rejects a whitespace-only caregiver name', () => {
    expect(validateBiannualRequest(buildBiannualPayload(values({ caregiverName: 'A'.repeat(80), childName: 'B'.repeat(80) })))).toEqual({});
    const over = validateBiannualRequest(buildBiannualPayload(values({ caregiverName: 'A'.repeat(81), childName: 'B'.repeat(81) })));
    expect(over.caregiverName).toBe('Caregiver name can be at most 80 characters (currently 81).');
    expect(over.childName).toBe('Child name can be at most 80 characters (currently 81).');
    expect(validateBiannualRequest(buildBiannualPayload(values({ caregiverName: '   ' })))).toHaveProperty('caregiverName', 'This is a required field');
    // Caregiver not interviewed: name is not asked.
    expect(validateBiannualRequest(buildBiannualPayload(values({ careGiverInterview: 'No', caregiverName: '' })))).toEqual({});
  });

  it('requires a visit date', () => {
    expect(validateBiannualRequest(buildBiannualPayload(values({ visitDate: '' })))).toHaveProperty('visitDate');
  });
});

describe('UI rule and field mapping', () => {
  it('maps request keys to the detail inputs', () => {
    expect(biannualFieldForKey('reasonNotAssessingOtherText')).toBe('reasonNotAssessing_other');
    expect(biannualFieldForKey('caregiverName')).toBe('caregiverName');
  });

  it('applies the same limit in the Yup rule', async () => {
    const schema = Yup.object({
      childSex_other: biannualOtherDetailRule('childSex_other'),
      weightNotMeasuredReason_other: biannualOtherDetailRule('weightNotMeasuredReason_other'),
    });
    const shown = { careGiverInterview: 'Yes', weightLastMonthAww: 'No' };
    expect(await collectYupErrors([schema], { ...shown, childSex: 'Other', childSex_other: 'a'.repeat(201) }))
      .toEqual({ childSex_other: 'Other detail can be at most 200 characters (currently 201).' });
    expect(await collectYupErrors([schema], { ...shown, childSex: 'Other', childSex_other: '' }))
      .toEqual({ childSex_other: 'Please specify the other answer' });
    expect(await collectYupErrors([schema], { ...shown, childSex: 'Male', childSex_other: '' })).toEqual({});
    // Hidden question (GMT1 back to Yes): no error on its hidden detail.
    expect(await collectYupErrors([schema], { careGiverInterview: 'Yes', weightLastMonthAww: 'Yes', weightNotMeasuredReason: 'Other', weightNotMeasuredReason_other: '' }))
      .toEqual({});
  });
});

describe('column widths (F10, same as the backend)', () => {
  it('rejects any value longer than its column and maps codes to their dropdown', () => {
    const errs = validateBiannualRequest(buildBiannualPayload(values({
      current_wt: '123.45', blockCode: '12345678901', hhHeadReligion: 'Others', hhHeadReligionOther: 'Sikh',
    })));
    expect(errs.current_wt).toBe('Current wt can be at most 5 characters (currently 6).');
    expect(errs.blockCode).toBe('Block code can be at most 10 characters (currently 11).');
    expect(biannualFieldForKey('blockCode')).toBe('block');
    expect(validateBiannualRequest(buildBiannualPayload(values({ blockCode: '1234567890' })))).toEqual({});
  });

  it('rejects names made only of spaces (optional child name included)', () => {
    expect(validateBiannualRequest(buildBiannualPayload(values({ childName: '   ' })))).toEqual({ childName: 'This cannot be only spaces' });
    expect(validateBiannualRequest(buildBiannualPayload(values({ childName: '' })))).toEqual({});
  });
});
