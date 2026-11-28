import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import CommunityBasedEventsObservationSection from '../CommunityBasedEventsObservationSection';
import Child6To8MonthsSection from '../Child6To8MonthsSection';
import Child9To23MonthsSection from '../Child9To23MonthsSection';
import CMAMClinicSection from '../CMAMClinicSection';
import CMAMChildServicesSection from '../CMAMChildServicesSection';
import { collectSection } from './collectSectionData';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));

// Real section components: a draft restored into a remounted section must put
// the same answers back into the DOM that submission reads (audit A06).

let container;
let root;
const show = (element) => { root.render(element); };
const teardown = () => { root.unmount(); };

beforeAll(() => { global.IS_REACT_ACT_ENVIRONMENT = true; });
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => { teardown(); });
  container.remove();
});

it('CBE: restored answers are what submission collects; Other text and length are checked', () => {
  const ref = React.createRef();
  const reports = [];
  act(() => {
    show(
      <CommunityBasedEventsObservationSection
        ref={ref}
        sectionId="cbe"
        onDraftChange={(id, values) => reports.push(values)}
        initialDraft={{
          themeOfCbe: 'Others',
          themeOfCbeOther: 'Nutrition fair',
          typeOfBeneficiaryAttendedCbe: ['otherMaleMembers', 'others'],
          typeOfBeneficiaryAttendedCbeOther: 'Grandfathers, uncles',
          serviceProvidersPresentCbe: ['asha'],
          groupCounsellingConducted: 'No',
          otherImportantObservation: 'Good turnout',
        }}
      />
    );
  });

  const cbe = collectSection('cbe');
  expect(cbe.themeOfCbe).toBe('Others - Nutrition fair');
  expect(cbe.typeOfBeneficiaryAttendedCbe).toBe('otherMaleMembers, Others - Grandfathers, uncles');
  expect(cbe.serviceProvidersPresentCbe).toBe('asha');
  expect(cbe.otherImportantObservation).toBe('Good turnout');
  expect(reports[reports.length - 1].themeOfCbeOther).toBe('Nutrition fair');

  let valid;
  act(() => { valid = ref.current.triggerValidation(); });
  expect(valid).toBe(true);
});

it('CBE: Other chosen without text, or over 51 characters, blocks submission', () => {
  const ref = React.createRef();
  act(() => {
    show(
      <CommunityBasedEventsObservationSection
        ref={ref}
        initialDraft={{ themeOfCbe: 'Others', themeOfCbeOther: 'x'.repeat(52), typeOfBeneficiaryAttendedCbe: ['pregnantWomen'], serviceProvidersPresentCbe: ['others'], groupCounsellingConducted: 'No' }}
      />
    );
  });
  let valid;
  act(() => { valid = ref.current.triggerValidation(); });
  expect(valid).toBe(false);
  expect(container.textContent).toMatch(/51 characters/);
  // The typed text is kept, not trimmed to fit.
  expect(container.querySelector('input[name="themeOfCbeOther"]').value).toBe('x'.repeat(52));
});

it('Section 10: restored Other details, Q10.25 ticks and otherRegularFood reach the collected data', () => {
  const ref = React.createRef();
  act(() => {
    show(
      <Child6To8MonthsSection
        ref={ref}
        sectionId="section10"
        initialDraft={{
          receivedFeedingAdvice: 'Yes',
          adviceReceived: ['immunization', 'othersAdvice'],
          annaprashanConductedAtAwc: 'Yes',
          familyAttendedAnnaprashan: 'Others',
          startedTakingFoodOtherThanBreastmilk: 'Yes',
          formValues: {
            receivedFeedingAdvice: 'Yes',
            adviceReceived: 'immunization, othersAdvice',
            otherAdviceReceived: 'Iodised salt, daily',
            annaprashanConductedAtAwc: 'Yes',
            familyAttendedAnnaprashan: 'Others',
            familyAttendedAnnaprashanOthers: 'Grandmother',
            startedTakingFoodOtherThanBreastmilk: 'Yes',
            timesFedFoodInLast24Hours: '2',
            otherRegularFood: 'Khichdi, banana',
          },
        }}
      />
    );
  });

  const checked = Array.from(container.querySelectorAll('input[name="adviceReceived"][type="checkbox"]'))
    .filter((c) => c.checked).map((c) => c.value);
  expect(checked).toEqual(['immunization', 'othersAdvice']);

  const s10 = collectSection('section10');
  expect(s10.adviceReceived).toBe('immunization, Others - Iodised salt, daily');
  expect(s10.familyAttendedAnnaprashan).toBe('Others - Grandmother');
  expect(s10.otherRegularFood).toBe('Khichdi, banana');
  expect(ref.current.getDraftState().formValues.otherRegularFood).toBe('Khichdi, banana');
});

it('Section 11: "Any Other" quantity/storage keep their typed detail; radio values are not rewritten', () => {
  act(() => {
    show(
      <Child9To23MonthsSection
        initialDraft={{
          thrReceivedLast3Month: 'Yes',
          thrConsumedByChild: 'Yes',
          qtyThrFood: 'Any Other',
          storeOpenedThr: 'Any other',
          formValues: {
            thrReceivedLast3Month: 'Yes',
            thrConsumedByChild: 'Yes',
            qtyThrFood: 'Any Other',
            qtyThrFoodOther: '3 spoons, twice a day',
            storeOpenedThr: 'Any other',
            storeOpenedThrOther: 'Steel tin',
          },
        }}
      />
    );
  });
  const radios = Array.from(container.querySelectorAll('input[type="radio"][name="qtyThrFood"]')).map((r) => r.value);
  expect(radios).toContain('Half Katori');
  expect(radios).not.toContain('Others - 3 spoons, twice a day');
  const s11 = collectSection('section11');
  expect(s11.qtyThrFood).toBe('Others - 3 spoons, twice a day');
  expect(s11.storeOpenedThr).toBe('Others - Steel tin');
});

it('VHSND: the Other boxes for 6.8, 6.21 and 6.22 render and their text is submitted', () => {
  act(() => {
    show(
      <CMAMClinicSection
        initialDraft={{
          physicalExamSam: 'yesNewSAMChild',
          childReferralNrc: 'Yes',
          motherAgreeNrc: 'No',
          childEnrolledCmam: 'Yes',
          motherNotAgreeReason: ['others'],
          motherGivenMessage: ['others'],
          counsellingAids: ['others'],
          formValues: {
            physicalExamSam: 'yesNewSAMChild',
            childReferralNrc: 'Yes',
            motherAgreeNrc: 'No',
            childEnrolledCmam: 'Yes',
            motherNotAgreeReasonOther: 'Far away, no transport',
            motherGivenMessageOther: 'Hygiene',
            counsellingAidsOther: 'Flip book',
          },
        }}
      />
    );
  });
  ['motherNotAgreeReasonOther', 'motherGivenMessageOther', 'counsellingAidsOther'].forEach((name) => {
    expect(container.querySelector(`input[name="${name}"]`)).not.toBeNull();
  });
  const vhsnd = collectSection('cmamClinic');
  expect(vhsnd.motherNotAgreeReason).toBe('Others - Far away, no transport');
  expect(vhsnd.motherGivenMessage).toBe('Others - Hygiene');
  expect(vhsnd.counsellingAids).toBe('Others - Flip book');
});

it('Section 8: "others" for THR not consumed keeps its detail (combined value)', () => {
  act(() => {
    show(
      <CMAMChildServicesSection
        initialDraft={{
          thrReceivedFromAwc: 'Yes',
          childConsumeThr: 'No',
          childNotConsumeThr: ['howToUse', 'others'],
          formValues: { thrReceivedFromAwc: 'Yes', childConsumeThr: 'No', childNotConsumeThr: 'howToUse, others', otherChildNotConsumeThr: 'Sold, shared' },
        }}
      />
    );
  });
  expect(collectSection('section8').childNotConsumeThr).toBe('howToUse, Others - Sold, shared');
});

it('Section 8: an Other detail longer than its column shows the limit and keeps the text', () => {
  const long = 'x'.repeat(92);
  act(() => {
    show(
      <CMAMChildServicesSection
        initialDraft={{
          childCardRecordAvailability: 'Available',
          typeOfRecordAvailable: 'Others',
          formValues: { childCardRecordAvailability: 'Available', typeOfRecordAvailable: 'Others', otherTypeOfRecord: long },
        }}
      />
    );
  });
  const input = container.querySelector('input[name="otherTypeOfRecord"]');
  expect(input.value).toBe(long);
  expect(container.textContent).toMatch(/91 characters or fewer \(currently 92\)/);
});
