import {
  CBE_THEME_OTHER_MAX,
  ANNAPRASHAN_OTHER_MAX,
  THR_QTY_OTHER_MAX,
  THR_STORE_OTHER_MAX,
  FOLLOWUP_FREQ_OTHER_MAX,
  LONG_NOTE_MAX,
  otherDetailError,
  noteError,
  storedValueError,
  routineRequestLimitErrors,
  otherDetailMaxFor,
} from './rmcLimits';
import { validateSectionData } from 'utils/rmcValidation';

const others = (n, ch = 'a') => `Others - ${ch.repeat(n)}`;

describe('RMC detail limits (prefix included)', () => {
  it('derives the detail limits from the column widths', () => {
    expect(CBE_THEME_OTHER_MAX).toBe(51);
    expect(ANNAPRASHAN_OTHER_MAX).toBe(91);
    expect(THR_QTY_OTHER_MAX).toBe(91);
    expect(THR_STORE_OTHER_MAX).toBe(91);
    expect(FOLLOWUP_FREQ_OTHER_MAX).toBe(91);
  });

  it('accepts exactly the limit and rejects one more, keeping the text', () => {
    expect(otherDetailError('a'.repeat(51), CBE_THEME_OTHER_MAX)).toBeNull();
    expect(otherDetailError('a'.repeat(52), CBE_THEME_OTHER_MAX)).toMatch(/51 characters/);
    expect(otherDetailError('a'.repeat(91), ANNAPRASHAN_OTHER_MAX)).toBeNull();
    expect(otherDetailError('a'.repeat(92), ANNAPRASHAN_OTHER_MAX)).toMatch(/91/);
  });

  it('counts Hindi text in characters (code points), not bytes', () => {
    const hindi = 'अ'.repeat(51);
    expect(otherDetailError(hindi, CBE_THEME_OTHER_MAX)).toBeNull();
    expect(otherDetailError(`${hindi}अ`, CBE_THEME_OTHER_MAX)).not.toBeNull();
  });

  it('limits long notes to 5000 characters', () => {
    expect(noteError('x'.repeat(LONG_NOTE_MAX))).toBeNull();
    expect(noteError('x'.repeat(LONG_NOTE_MAX + 1))).toMatch(/5000/);
  });

  it('phrases a stored-value error in terms of the typed detail', () => {
    expect(storedValueError(others(51), 60)).toBeNull();
    expect(storedValueError(others(52), 60)).toMatch(/at most 51 characters \(currently 52\)/);
    expect(storedValueError('x'.repeat(101), 100)).toMatch(/at most 100 characters/);
  });
});

describe('routineRequestLimitErrors', () => {
  it('reports request key paths for every over-limit answer', () => {
    const errors = routineRequestLimitErrors({
      cbeData: { themeOfCbe: others(52), otherImportantObservation: 'y'.repeat(5001) },
      householdData: {
        familyAttendedAnnaprashan: others(92),
        qtyPrepareFood: others(91),
        thrStore: others(92),
        otherRegularFood: 'z'.repeat(501),
      },
      aganwadiData: { childFollowupCmam: others(92) },
    });
    expect(Object.keys(errors).sort()).toEqual([
      'aganwadiData.childFollowupCmam',
      'cbeData.otherImportantObservation',
      'cbeData.themeOfCbe',
      'householdData.familyAttendedAnnaprashan',
      'householdData.otherRegularFood',
      'householdData.thrStore',
    ]);
  });

  it('returns nothing for answers that fit', () => {
    expect(routineRequestLimitErrors({ cbeData: { themeOfCbe: others(51) }, householdData: { qtyPrepareFood: 'Half Katori' } })).toEqual({});
  });
});

describe('record editor validation (rmcValidation)', () => {
  const cbe = {
    themeOfCbe: 'Annaprashan',
    typeOfBeneficiaryAttendedCbe: 'pregnantWomen',
    serviceProvidersPresentCbe: 'asha',
    groupCounsellingConducted: 'No',
  };

  it('requires the Other text for CBE theme, beneficiary type and service provider (P02)', () => {
    expect(validateSectionData('cbe', { ...cbe, themeOfCbe: 'Others' }).themeOfCbe).toMatch(/Other/);
    expect(validateSectionData('cbe', { ...cbe, typeOfBeneficiaryAttendedCbe: 'pregnantWomen, others' }).typeOfBeneficiaryAttendedCbe).toMatch(/Other/);
    expect(validateSectionData('cbe', { ...cbe, serviceProvidersPresentCbe: 'asha, other' }).serviceProvidersPresentCbe).toMatch(/Other/);
    expect(validateSectionData('cbe', { ...cbe, typeOfBeneficiaryAttendedCbe: 'otherMaleMembers' })).toEqual({});
  });

  it('requires topics/aids Other text only when counselling is Yes (P02)', () => {
    const yes = { ...cbe, groupCounsellingConducted: 'Yes', counsellingTopicsCbe: 'others', counsellingAidsUsed: 'mcpCard, Others - flip book, cards' };
    const errs = validateSectionData('cbe', yes);
    expect(errs.counsellingTopicsCbe).toMatch(/Other/);
    expect(errs.counsellingAidsUsed).toBeUndefined();
  });

  it('applies the stored limits to the editable fields (F05)', () => {
    expect(validateSectionData('cbe', { ...cbe, themeOfCbe: others(52) }).themeOfCbe).toMatch(/51/);
    expect(validateSectionData('cbe', { ...cbe, themeOfCbe: others(51) }).themeOfCbe).toBeUndefined();
    expect(validateSectionData('aganwadi', { childFollowupCmam: others(92) }).childFollowupCmam).toMatch(/91/);
    expect(validateSectionData('household', { sexOfChild68: 'Male', thrStore: others(92) }).thrStore).toMatch(/91/);
  });

  it('does not flag a free-text note that happens to contain ", others"', () => {
    expect(validateSectionData('cbe', { ...cbe, otherImportantObservation: 'Mothers came, others' }).otherImportantObservation).toBeUndefined();
  });
});

describe('column-width parity with the backend (all RMC fields)', () => {
  it('rejects Section 8 / 10 Other details that overflow their VARCHAR column', () => {
    const errors = routineRequestLimitErrors({
      householdData: {
        typeOfRecordAvailable: others(92),          // Q8.6, column 100
        thrQtyPrepareChild: others(92),             // Q8.24, column 100
        storeThr: others(91),                       // Q8.25, column 100 (fits)
        thrNotReceivedReasonChild: others(142),     // Q8.17, column 150
        thrNotReceivedReason: others(141),          // Q10.12, column 150 (fits)
      },
    });
    expect(Object.keys(errors).sort()).toEqual([
      'householdData.thrNotReceivedReasonChild',
      'householdData.thrQtyPrepareChild',
      'householdData.typeOfRecordAvailable',
    ]);
    expect(errors['householdData.thrNotReceivedReasonChild']).toMatch(/at most 141 characters/);
  });

  it('checks top-level and every section field, including short coded columns', () => {
    const errors = routineRequestLimitErrors({
      villageCode: '12345678901',                     // column 10
      responseMode: 'offline',
      aganwadiData: { samChildren06: '123' },         // column 2
      vhsndData: { motherThr: 'x'.repeat(31) },        // column 30
      cbeData: { serviceProvidersPresentCbe: 'asha' },
      latitude: 21.1,
    });
    expect(Object.keys(errors).sort()).toEqual(['aganwadiData.samChildren06', 'vhsndData.motherThr', 'villageCode']);
  });

  it('limits TEXT columns by UTF-8 bytes', () => {
    const errors = routineRequestLimitErrors({ vhsndData: { physicalExamSam: 'अ'.repeat(21846) } }); // 65,538 bytes
    expect(errors['vhsndData.physicalExamSam']).toMatch(/bytes/);
    expect(routineRequestLimitErrors({ vhsndData: { physicalExamSam: 'a'.repeat(65535) } })).toEqual({});
  });

  it('the record editor applies the same table', () => {
    expect(validateSectionData('household', { sexOfChild: 'Male', typeOfRecordAvailable: others(92) }).typeOfRecordAvailable).toMatch(/91/);
    expect(validateSectionData('vhsnd', { motherThr: 'x'.repeat(31) }).motherThr).toMatch(/30/);
  });

  it('gives the detail limits for the Section 8 / 10 Other boxes', () => {
    expect(otherDetailMaxFor('householdData', 'typeOfRecordAvailable')).toBe(91);
    expect(otherDetailMaxFor('householdData', 'thrQtyPrepareChild')).toBe(91);
    expect(otherDetailMaxFor('householdData', 'storeThr')).toBe(91);
    expect(otherDetailMaxFor('householdData', 'thrNotReceivedReasonChild')).toBe(141);
    expect(otherDetailMaxFor('householdData', 'thrNotReceivedReason')).toBe(141);
  });
});
