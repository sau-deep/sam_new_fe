import {
  FOLLOWUP_DETAIL_LIMITS, buildFollowupPayload, followupFieldForKey, isThrUsageAsked,
  validateFollowupRequest,
} from './followupPayload';

const values = (over = {}) => ({
  responseMode: 'online',
  visitDate: '2026-11-18',
  state: 'Odisha', district: 'Puri', block: 'B1', village: 'V', icdsProject: 'P', childCode: '12',
  nameOfRespondent: 'GITA', sexOfRespondent: 'Female', sexOfRespondent_other: '',
  childName: 'RAJU', childSex: 'Male', childSex_other: '',
  childAgeMonths: 10,
  chronicMedicalCondition: 'No', chronicMedicalConditionSpecify: '', chronicMedicalConditionSpecify_other: '',
  receivedThr: 'Yes', receivedThrSam: 'Yes', thrConsumed: 'Yes',
  quantityThrEveryDay: 'One Katori', quantityThrEveryDay_other: '',
  storeThrPacket: 'Closed container', storeThrPacket_other: '',
  awwInformationDiscussed: [], ashaInformationDiscussed: [], yesterdayFoodItemsConsumed: [],
  awwCounselingToolsUsed: '', ashaCounselingToolsUsed: '', receivedOtherFoodAwc: '', howToEnrichHomemadeFood: '',
  relevantInfo: '',
  ...over,
});

describe('buildFollowupPayload — THR Other details (F04)', () => {
  it('sends the details in their own keys and keeps the plain choice', () => {
    const req = buildFollowupPayload(values({
      quantityThrEveryDay: 'Other', quantityThrEveryDay_other: ' 3 spoons ',
      storeThrPacket: 'Other', storeThrPacket_other: 'steel dabba',
    }));
    expect(req).toMatchObject({
      quantityThrEveryDay: 'Other', quantityThrEveryDayOtherText: '3 spoons',
      storeThrPacket: 'Other', storeThrPacketOtherText: 'steel dabba',
    });
    expect(req).not.toHaveProperty('quantityThrEveryDay_other');
    expect(req).not.toHaveProperty('storeThrPacket_other');
    expect(validateFollowupRequest(req)).toEqual({});
  });

  it('sends null details when the choice is not Other', () => {
    const req = buildFollowupPayload(values({ quantityThrEveryDay_other: 'stale', storeThrPacket_other: 'stale' }));
    expect(req.quantityThrEveryDayOtherText).toBeNull();
    expect(req.storeThrPacketOtherText).toBeNull();
  });

  it('requires the detail when Other is chosen and limits it to 200', () => {
    expect(validateFollowupRequest(buildFollowupPayload(values({ quantityThrEveryDay: 'Other' }))))
      .toEqual({ quantityThrEveryDayOtherText: 'Please specify the other answer' });
    expect(validateFollowupRequest(buildFollowupPayload(values({ storeThrPacket: 'Other', storeThrPacket_other: 'x'.repeat(200) })))).toEqual({});
    expect(validateFollowupRequest(buildFollowupPayload(values({ storeThrPacket: 'Other', storeThrPacket_other: 'x'.repeat(201) }))))
      .toEqual({ storeThrPacketOtherText: 'Other detail can be at most 200 characters (currently 201).' });
  });

  it('clears THR11/THR13 when those questions are no longer shown', () => {
    const v = values({ thrConsumed: 'No', quantityThrEveryDay: 'Other', quantityThrEveryDay_other: '', storeThrPacket: 'Other' });
    expect(isThrUsageAsked(v)).toBe(false);
    const req = buildFollowupPayload(v);
    expect(req).toMatchObject({ quantityThrEveryDay: '', storeThrPacket: '', quantityThrEveryDayOtherText: null, storeThrPacketOtherText: null });
    expect(validateFollowupRequest(req)).toEqual({});
  });
});

describe('buildFollowupPayload — sex and chronic condition encoding (F06)', () => {
  it('encodes "Other - <detail>" and validates the encoded value against the column', () => {
    const exact = buildFollowupPayload(values({
      sexOfRespondent: 'Other', sexOfRespondent_other: 'a'.repeat(FOLLOWUP_DETAIL_LIMITS.sexOfRespondent),
      childSex: 'Other', childSex_other: 'ब'.repeat(FOLLOWUP_DETAIL_LIMITS.childSex),
    }));
    expect(exact.sexOfRespondent).toBe(`Other - ${'a'.repeat(12)}`);
    expect(exact.sexOfRespondent).toHaveLength(20);
    expect(Array.from(exact.childSex)).toHaveLength(30);
    expect(validateFollowupRequest(exact)).toEqual({});

    const over = validateFollowupRequest(buildFollowupPayload(values({
      sexOfRespondent: 'Other', sexOfRespondent_other: 'a'.repeat(13),
      childSex: 'Other', childSex_other: 'b'.repeat(23),
    })));
    expect(over.sexOfRespondent).toBe('Other detail can be at most 12 characters (currently 13).');
    expect(over.childSex).toBe('Other detail can be at most 22 characters (currently 23).');
  });

  it('requires child sex and chronic condition details when Other is chosen', () => {
    const errs = validateFollowupRequest(buildFollowupPayload(values({
      childSex: 'Other', childSex_other: '  ',
      chronicMedicalCondition: 'Yes', chronicMedicalConditionSpecify: 'Other', chronicMedicalConditionSpecify_other: '',
    })));
    expect(errs).toEqual({
      childSex: 'Please specify the other answer',
      chronicMedicalConditionSpecify: 'Please specify the other answer',
    });
  });

  it('limits the encoded chronic condition to 255 characters', () => {
    const ok = buildFollowupPayload(values({
      chronicMedicalCondition: 'Yes', chronicMedicalConditionSpecify: 'Other', chronicMedicalConditionSpecify_other: 'c'.repeat(247),
    }));
    expect(validateFollowupRequest(ok)).toEqual({});
    const over = buildFollowupPayload(values({
      chronicMedicalCondition: 'Yes', chronicMedicalConditionSpecify: 'Other', chronicMedicalConditionSpecify_other: 'c'.repeat(248),
    }));
    expect(validateFollowupRequest(over).chronicMedicalConditionSpecify).toBe('Other detail can be at most 247 characters (currently 248).');
  });

  it('drops a chronic condition answer when CQ6 is No', () => {
    const req = buildFollowupPayload(values({ chronicMedicalCondition: 'No', chronicMedicalConditionSpecify: 'Other', chronicMedicalConditionSpecify_other: 'x' }));
    expect(req.chronicMedicalConditionSpecify).toBe('');
  });
});

describe('names, notes, date (F06 / F09 / C4)', () => {
  it('limits respondent 50 / child 80 and rejects whitespace-only respondent', () => {
    expect(validateFollowupRequest(buildFollowupPayload(values({ nameOfRespondent: 'A'.repeat(50), childName: 'B'.repeat(80) })))).toEqual({});
    const over = validateFollowupRequest(buildFollowupPayload(values({ nameOfRespondent: 'A'.repeat(51), childName: 'B'.repeat(81) })));
    expect(over.nameOfRespondent).toBe('Respondent name can be at most 50 characters (currently 51).');
    expect(over.childName).toBe('Child name can be at most 80 characters (currently 81).');
    expect(validateFollowupRequest(buildFollowupPayload(values({ nameOfRespondent: '  ' })))).toHaveProperty('nameOfRespondent');
  });

  it('limits Any Other Information to 5000', () => {
    expect(validateFollowupRequest(buildFollowupPayload(values({ relevantInfo: 'x'.repeat(5000) })))).toEqual({});
    expect(validateFollowupRequest(buildFollowupPayload(values({ relevantInfo: 'x'.repeat(5001) })))).toHaveProperty('relevantInfo');
  });

  it('passes the selected visit date through unchanged', () => {
    expect(buildFollowupPayload(values({ visitDate: '2026-09-30' })).visitDate).toBe('2026-09-30');
  });

  it('keeps the existing multi-select and feeding encodings', () => {
    const req = buildFollowupPayload(values({
      awwInformationDiscussed: ['Feeding', 'Other'], awwInformationDiscussed_other: ' play ',
      yesterdayFoodItemsConsumed: { Rice: 2 }, yesterdayFoodItemsConsumed_other: 'Ragi',
    }));
    expect(req.awwInformationDiscussed).toBe('Feeding, Other - play');
    expect(req.yesterdayFoodItemsConsumed).toBe('Rice - 2,Specify any other food item given - Ragi');
    expect(buildFollowupPayload(values({ childAgeMonths: 5, yesterdayFoodItemsConsumed: { Rice: 2 } })).yesterdayFoodItemsConsumed).toBe('');
  });

  it('adds coordinates (0 when not captured)', () => {
    expect(buildFollowupPayload(values())).toMatchObject({ latitude: 0, longitude: 0 });
    expect(buildFollowupPayload(values(), { coordinates: { lat: 20.1, lng: 85.8 } })).toMatchObject({ latitude: 20.1, longitude: 85.8 });
  });
});

describe('followupFieldForKey', () => {
  it('reports encoded answers on the detail input while Other is selected', () => {
    expect(followupFieldForKey('childSex', { childSex: 'Other' })).toBe('childSex_other');
    expect(followupFieldForKey('childSex', { childSex: 'Male' })).toBe('childSex');
    expect(followupFieldForKey('storeThrPacketOtherText', {})).toBe('storeThrPacket_other');
    expect(followupFieldForKey('nameOfRespondent', {})).toBe('nameOfRespondent');
  });
});

describe('column widths (F10, same as the backend)', () => {
  it('checks the whole multi-select value, Other text included, and reports it on the Other box', () => {
    const v = values({ awwCounselingToolsUsed: 'Posters, other', awwCounselingToolsUsed_other: 'x'.repeat(240) });
    const req = buildFollowupPayload(v);
    expect(req.awwCounselingToolsUsed).toBe(`Posters, Other - ${'x'.repeat(240)}`);
    const errs = validateFollowupRequest(req);
    expect(errs.awwCounselingToolsUsed).toBe('Aww counseling tools used can be at most 255 characters (currently 257).');
    expect(followupFieldForKey('awwCounselingToolsUsed', v)).toBe('awwCounselingToolsUsed_other');
    expect(followupFieldForKey('awwCounselingToolsUsed', values())).toBe('awwCounselingToolsUsed');
  });

  it('checks numbers as the text the backend stores and maps codes to their dropdown', () => {
    const errs = validateFollowupRequest(buildFollowupPayload(values({ currentHeightLength: 100.55, stateCode: '123' })));
    expect(errs.currentHeightLength).toBe('Current height length can be at most 5 characters (currently 6).');
    expect(errs.stateCode).toBe('State code can be at most 2 characters (currently 3).');
    expect(followupFieldForKey('stateCode', {})).toBe('state');
    expect(validateFollowupRequest(buildFollowupPayload(values({ currentHeightLength: 100.5, stateCode: '21' })))).toEqual({});
  });

  it('rejects a child name made only of spaces', () => {
    expect(validateFollowupRequest(buildFollowupPayload(values({ childName: '  ' })))).toEqual({ childName: 'This cannot be only spaces' });
  });
});
