import {
  activeSectionIds,
  buildRoutineRequest,
  buildAganwadiData,
  missingActivitySections,
  REQUIRED_AWC_FIELDS,
} from './buildRoutineRequest';
import { collectSection, readSectionControls, applyHiddenInputFallback } from './collectSectionData';

// Minimal DOM fixtures shaped like the rendered section components.
function mount(html) {
  document.body.innerHTML = html;
}

const baseValues = {
  responseMode: 'ONLINE',
  state: 'Uttar Pradesh',
  stateCode: '',
  district: 'Agra',
  districtCode: '',
  block: 'Agra',
  blockCode: '',
  icdsProject: 'P1',
  sector: 'S1',
  village: 'V1',
  awc: 'A1',
  fieldMonitorName: 'Monitor',
  dateVisit: '2026-11-20',
  location: '',
  householdSection: 'section8',
  section8: false,
  section9: false,
  section10: false,
  section11: false,
};

const coords = { lat: 21.1458, lng: 79.0882, accuracy: 12, timestamp: '2026-11-20T09:00:00.000Z' };
const metadata = (c) => ({ locationAccuracyMeters: c.accuracy, locationCapturedAt: c.timestamp ?? null });
const enrich = (v) => ({ ...v, stateCode: '9', districtCode: '118', blockCode: '0001' });

afterEach(() => { document.body.innerHTML = ''; });

describe('activeSectionIds', () => {
  it('lists the sections of the selected activity', () => {
    expect(activeSectionIds({ activityToObserve: 'Aanganwadi Center' }))
      .toEqual(['awaRegistration', 'equipmentAvailability', 'skillAssessment']);
    expect(activeSectionIds({ activityToObserve: 'VHSND Session/RI Session' })).toEqual(['cmamClinic', 'anmChoKnowledge']);
    expect(activeSectionIds({ activityToObserve: 'CBE Session' })).toEqual(['cbe']);
    expect(activeSectionIds({ activityToObserve: 'Household/caregiver interaction', section10: true })).toEqual(['section10']);
  });
});

describe('buildRoutineRequest', () => {
  it('adds coordinates and capture metadata, resolves codes and drops section flags', () => {
    const req = buildRoutineRequest({
      values: { ...baseValues, activityToObserve: 'CBE Session' },
      coordinates: coords,
      sections: { cbe: { themeOfCbe: 'Annaprashan' } },
      enrichLocation: enrich,
      locationMetadata: metadata,
    });
    expect(req.latitude).toBe(21.1458);
    expect(req.longitude).toBe(79.0882);
    expect(req.locationAccuracyMeters).toBe(12);
    expect(req.locationCapturedAt).toBe('2026-11-20T09:00:00.000Z');
    expect(req.stateCode).toBe('9');
    expect(req.districtCode).toBe('118');
    expect(req.blockCode).toBe('0001');
    ['section8', 'section9', 'section10', 'section11', 'householdSection'].forEach((k) => expect(req).not.toHaveProperty(k));
    expect(req.cbeData).toEqual({ themeOfCbe: 'Annaprashan', otherImportantObservation: '' });
  });

  it('falls back to 0,0 when no position was captured', () => {
    const req = buildRoutineRequest({ values: { ...baseValues, activityToObserve: 'CBE Session' }, coordinates: null, sections: { cbe: { a: 1 } } });
    expect(req.latitude).toBe(0);
    expect(req.longitude).toBe(0);
  });

  it('keeps every AWC section and applies the DTO field fixes', () => {
    const req = buildRoutineRequest({
      values: { ...baseValues, activityToObserve: 'Aanganwadi Center' },
      coordinates: coords,
      sections: {
        awaRegistration: { samChildren06: '2', variationReason: 'notApplicable' },
        equipmentAvailability: { weighingScale: 'Available and Functional', ifaSyrup: 'Available at village level (AWW or ASHA)' },
        skillAssessment: { lastMeasurementDate: '2026-11-01', measurementFollowedStepMechanical: 'zeroErrorChecked', infantometerSteps: 'x', childFollowupCmam: 'Others - every 10 days' },
      },
    });
    const awc = req.aganwadiData;
    expect(awc.samChildren06).toBe('2');
    expect(awc.weighingScale).toBe('Available and Functional');
    expect(awc.ifaSyrup).toBe('Available at village level (AWW or ASHA)');
    expect(awc.dateChildMeasured).toBe('2026-11-01');
    expect(awc.measurementFollowedStep).toBe('zeroErrorChecked');
    expect(awc.childHeightSteps).toBe('x');
    expect(awc.childFollowupCmam).toBe('Others - every 10 days');
    expect(awc).not.toHaveProperty('lastMeasurementDate');
    expect(awc).not.toHaveProperty('measurementFollowedStepMechanical');
    // Unanswered required fields keep the legacy '.' placeholder.
    expect(awc.zinc).toBe('.');
    REQUIRED_AWC_FIELDS.forEach((f) => expect(awc[f]).not.toBe(''));
    expect(req).not.toHaveProperty('cbeData');
    expect(req).not.toHaveProperty('householdData');
  });

  it('merges both VHSND sections', () => {
    const req = buildRoutineRequest({
      values: { ...baseValues, activityToObserve: 'VHSND Session/RI Session' },
      coordinates: coords,
      sections: { cmamClinic: { vhsndVisitDay: 'Monday' }, anmChoKnowledge: { confirmChildSam: 'Yes' } },
    });
    expect(req.vhsndData).toEqual({ vhsndVisitDay: 'Monday', confirmChildSam: 'Yes' });
  });

  it('builds householdData only from the selected household section', () => {
    const req = buildRoutineRequest({
      values: { ...baseValues, activityToObserve: 'Household/caregiver interaction', householdSection: 'section10', section10: true },
      coordinates: coords,
      sections: { section10: { sexOfChild68: 'Male', otherRegularFood: 'Khichdi, dal' }, section8: { sexOfChild: 'Female' } },
    });
    expect(req.householdData).toEqual({ sexOfChild68: 'Male', otherRegularFood: 'Khichdi, dal' });
  });

  it('flags the admin test submission only when asked', () => {
    const values = { ...baseValues, activityToObserve: 'CBE Session' };
    expect(buildRoutineRequest({ values, coordinates: coords, sections: { cbe: { a: 1 } } })).not.toHaveProperty('isTestData');
    expect(buildRoutineRequest({ values, coordinates: coords, sections: { cbe: { a: 1 } }, isTestData: true }).isTestData).toBe(true);
  });
});

describe('serializer Other placement and tokens', () => {
  it('puts the "Others - <detail>" entry last even when Other was ticked first', () => {
    mount(`
      <div id="cbeForm">
        <input type="checkbox" name="counsellingTopicsCbe" value="others" checked />
        <input type="checkbox" name="counsellingTopicsCbe" value="breastfeedingImportance" checked />
        <input type="text" name="counsellingTopicsCbeOther" value="Kitchen garden, recipes" />
      </div>`);
    expect(collectSection('cbe').counsellingTopicsCbe).toBe('breastfeedingImportance, Others - Kitchen garden, recipes');
  });

  it('replaces a bare "Any Other" with the typed detail', () => {
    mount(`
      <div id="child9To23MonthsForm">
        <input type="radio" name="qtyThrFood" value="Any Other" checked />
        <input type="text" name="qtyThrFoodOther" value="3 spoons" />
      </div>`);
    expect(collectSection('section11').qtyThrFood).toBe('Others - 3 spoons');
  });
});

describe('missingActivitySections', () => {
  it('reports the selected activity whose section object is empty', () => {
    expect(missingActivitySections({ activityToObserve: 'Household/caregiver interaction', householdData: {} })).toEqual(['householdData']);
    expect(missingActivitySections({ activityToObserve: 'CBE Session', cbeData: { themeOfCbe: 'x' } })).toEqual([]);
  });
});

describe('collectSection (DOM) -> request', () => {
  it('Section 10 otherRegularFood survives the serializer and reaches householdData (A01)', () => {
    mount(`
      <div id="child6To8MonthsForm">
        <input type="radio" name="sexOfChild68" value="Male" checked />
        <input type="radio" name="sexOfChild68" value="Female" />
        <textarea name="otherRegularFood">Khichdi, mashed banana</textarea>
        <input type="hidden" name="porridgeFrequency" value="2" />
        <input type="hidden" name="otherFruitsVegetablesFrequency" value="1" />
      </div>`);
    const section10 = collectSection('section10');
    expect(section10.otherRegularFood).toBe('Khichdi, mashed banana');
    expect(section10.otherFruitsVegetablesFrequency).toBe('1');
    expect(section10.porridgeFrequency).toBe('2');

    const values = { ...baseValues, activityToObserve: 'Household/caregiver interaction', householdSection: 'section10', section10: true };
    const request = buildRoutineRequest({ values, coordinates: coords, sections: { section10 } });
    expect(request.householdData.otherRegularFood).toBe('Khichdi, mashed banana');
    // The queued (offline) record is the same prepared request.
    const queued = { ...request, responseMode: 'offline' };
    expect(queued.householdData.otherRegularFood).toBe('Khichdi, mashed banana');
  });

  it('Section 10 Q10.25 stores Other as "Others - <detail>" (A13)', () => {
    mount(`
      <div id="child6To8MonthsForm">
        <input type="checkbox" name="adviceReceived" value="immunization" checked />
        <input type="checkbox" name="adviceReceived" value="othersAdvice" checked />
        <input type="checkbox" name="adviceReceived" value="dietaryDiversity" />
        <input type="hidden" name="adviceReceived" value="ignored" />
        <input type="text" name="otherAdviceReceived" value="Use iodised salt, daily" />
      </div>`);
    const s10 = collectSection('section10');
    expect(s10.adviceReceived).toBe('immunization, Others - Use iodised salt, daily');
    expect(s10).not.toHaveProperty('otherAdviceReceived');
  });

  it('Section 11 otherFruitsVeggiesFrequency comes from its hidden input', () => {
    mount(`
      <div id="child9To23MonthsForm">
        <input type="hidden" name="otherFruitsVeggiesFrequency" value="morethan3" />
        <input type="hidden" name="eggsConsumptionFrequency" value="1" />
        <textarea name="otherRegularFoodItem">Sattu</textarea>
        <input type="hidden" name="thrNotConsumedReason" value="others" />
        <input type="hidden" name="thrNotConsumedReasonCombined" value="Others - shared, sold" />
      </div>`);
    const s11 = collectSection('section11');
    expect(s11.otherFruitsVeggiesFrequency).toBe('morethan3');
    expect(s11.eggsConsumptionFrequency).toBe('1');
    expect(s11.otherRegularFoodItem).toBe('Sattu');
    expect(s11.thrNotConsumedReason).toBe('Others - shared, sold');
  });

  it('the Section 11 hidden-input fallback fills a frequency the first read missed', () => {
    mount(`<div id="child9To23MonthsForm"><input type="hidden" name="otherFruitsVeggiesFrequency" value="2" /></div>`);
    const root = document.getElementById('child9To23MonthsForm');
    const data = applyHiddenInputFallback({ otherFruitsVeggiesFrequency: '' }, root, ['otherFruitsVeggiesFrequency']);
    expect(data.otherFruitsVeggiesFrequency).toBe('2');
  });

  it('CBE keeps otherMaleMembers, merges the Other text and keeps observations', () => {
    mount(`
      <div id="cbeForm">
        <input type="radio" name="themeOfCbe" value="Annaprashan" />
        <input type="radio" name="themeOfCbe" value="Others" checked />
        <input type="text" name="themeOfCbeOther" value="Nutrition fair" />
        <input type="hidden" name="themeOfCbe" value="Others - Nutrition fair" />
        <input type="checkbox" name="typeOfBeneficiaryAttendedCbe" value="otherMaleMembers" checked />
        <input type="checkbox" name="typeOfBeneficiaryAttendedCbe" value="others" checked />
        <input type="checkbox" name="typeOfBeneficiaryAttendedCbe" value="pregnantWomen" />
        <input type="text" name="typeOfBeneficiaryAttendedCbeOther" value="Grandfathers, uncles" />
        <textarea name="otherImportantObservation">Good turnout, many questions</textarea>
      </div>`);
    const cbe = collectSection('cbe');
    expect(cbe.themeOfCbe).toBe('Others - Nutrition fair');
    expect(cbe.typeOfBeneficiaryAttendedCbe).toBe('otherMaleMembers, Others - Grandfathers, uncles');
    expect(cbe.otherImportantObservation).toBe('Good turnout, many questions');
    expect(cbe).not.toHaveProperty('themeOfCbeOther');
  });

  it('Section 9 uses each question\'s own Other text, never another question\'s', () => {
    mount(`
      <div id="infant0To6MonthsForm">
        <input type="checkbox" name="foodsOrDrinksReceived" value="plainWater" checked />
        <input type="checkbox" name="foodsOrDrinksReceived" value="others" checked />
        <input type="text" name="otherFoodsOrDrinks" value="Honey" />
        <input type="checkbox" name="reasonsNotExclusivelyBreastfed" value="workingMother" checked />
        <input type="checkbox" name="reasonsNotExclusivelyBreastfed" value="others" checked />
        <input type="text" name="otherReasonsNotBreastfed" value="Mother unwell" />
      </div>`);
    const s9 = collectSection('section9');
    expect(s9.foodsOrDrinksReceived).toBe('plainWater, Others - Honey');
    expect(s9.reasonsNotExclusivelyBreastfed).toBe('workingMother, Others - Mother unwell');
  });

  it('every AWC section container is read into aganwadiData', () => {
    mount(`
      <div id="awaRegistrationForm"><input type="number" name="samChildren06" value="3" /></div>
      <div id="equipmentAvailabilityForm"><input type="radio" name="zinc" value="Available" checked /></div>
      <div id="skillAssessmentForm"><input type="radio" name="childFollowupCmam" value="Others" checked /><input type="text" name="childFollowupCmamOther" value="every 10 days" /></div>`);
    const sections = {};
    activeSectionIds({ activityToObserve: 'Aanganwadi Center' }).forEach((id) => { sections[id] = collectSection(id); });
    const awc = buildAganwadiData(sections);
    expect(awc.samChildren06).toBe('3');
    expect(awc.zinc).toBe('Available');
    expect(awc.childFollowupCmam).toBe('Others - every 10 days');
  });

  it('readSectionControls returns [] for an unticked checkbox group', () => {
    mount(`<div id="x"><input type="checkbox" name="g" value="a" /><input type="checkbox" name="g" value="b" /></div>`);
    expect(readSectionControls(document.getElementById('x')).g).toEqual([]);
  });

  it('returns {} for a section that is not mounted', () => {
    expect(collectSection('section8')).toEqual({});
  });
});
