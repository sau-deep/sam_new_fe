import { HOUSEHOLD_SECTIONS } from './buildRoutineRequest';
import {
  HOUSEHOLD_SECTION_INFO, answeredHouseholdSections, householdRequiredFields, householdSectionErrors,
} from './householdSections';

const complete = (id) => Object.fromEntries(householdRequiredFields(id).map((f) => [f, '1']));

describe('household sections 8–11 (A09)', () => {
  it('has the same required lists as the backend HouseholdSection, with no question in two sections', () => {
    expect(Object.keys(HOUSEHOLD_SECTION_INFO)).toEqual([...HOUSEHOLD_SECTIONS]);
    expect(HOUSEHOLD_SECTIONS.map((id) => householdRequiredFields(id).length)).toEqual([12, 13, 15, 16]);
    expect(householdRequiredFields('section8')).toEqual([
      'currentAgeMonths', 'sexOfChild', 'currentFollowupOrRecovered', 'childCardRecordAvailability',
      'lastWeighedDate', 'lastMeasuredHeightDate', 'whoMeasuredChild', 'awwVisitsPastMonth',
      'frequencyOfWeightMeasurement', 'anmMedicineAtEnrollment', 'thrReceivedFromAwc', 'counsellingOnHomeFood',
    ]);
    const all = HOUSEHOLD_SECTIONS.flatMap((id) => [...householdRequiredFields(id), ...HOUSEHOLD_SECTION_INFO[id].identifying]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('accepts one complete section', () => {
    HOUSEHOLD_SECTIONS.forEach((id) => {
      expect(answeredHouseholdSections(complete(id))).toEqual([id]);
      expect(householdSectionErrors(complete(id))).toEqual({});
    });
  });

  it('rejects answers that belong to no section', () => {
    const errors = householdSectionErrors({ otherRegularFood: 'Millet porridge', thrStore: 'Shelf' });
    expect(Object.keys(errors)).toEqual(['householdData']);
    expect(errors.householdData).toContain('8, 9, 10 or 11');
    expect(Object.keys(householdSectionErrors({}))).toEqual(['householdData']);
    expect(Object.keys(householdSectionErrors(undefined))).toEqual(['householdData']);
  });

  it('rejects answers for two sections', () => {
    const errors = householdSectionErrors({ ...complete('section8'), sexOfChild06: 'Female' });
    expect(errors).toEqual({ householdData: expect.stringContaining('Sections 8 and 9') });
  });

  it('names each unanswered required question of the chosen section', () => {
    const partial = { ...complete('section9'), bottleUsedToFeedMilk: '  ', childGrowingWell: undefined };
    expect(householdSectionErrors(partial)).toEqual({
      'householdData.bottleUsedToFeedMilk': 'This question is required in Section 9 (infant 0–6 months).',
      'householdData.childGrowingWell': 'This question is required in Section 9 (infant 0–6 months).',
    });
    // The child's name alone identifies the section; every required question is then reported.
    expect(Object.keys(householdSectionErrors({ childFullName: 'Ravi' }))).toHaveLength(16);
    // Answers such as '0' and multi-select arrays count.
    expect(householdSectionErrors({ ...complete('section8'), awwVisitsPastMonth: '0', whoMeasuredChild: ['aww'] })).toEqual({});
  });
});
