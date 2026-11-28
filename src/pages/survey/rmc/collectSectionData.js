// Reads the answers of one mounted Routine Monitoring section from its DOM
// container and serializes them (audit F01). Moved out of RoutineMonitoring.jsx
// so Submit, Retry and Save Offline share exactly one preparation path.

import { serializeSectionValues } from './rmcSerializer';

/** Section id -> id of the container element the section component renders. */
export const RMC_SECTION_FORM_IDS = Object.freeze({
  awaRegistration: 'awaRegistrationForm',
  equipmentAvailability: 'equipmentAvailabilityForm',
  skillAssessment: 'skillAssessmentForm',
  cbe: 'cbeForm',
  cmamClinic: 'cmamClinicForm',
  anmChoKnowledge: 'anmChoKnowledgeForm',
  section8: 'cmamChildServicesForm',
  section9: 'infant0To6MonthsForm',
  section10: 'child6To8MonthsForm',
  section11: 'child9To23MonthsForm',
});

export const S10_FOOD_FREQUENCY_FIELDS = Object.freeze([
  'porridgeFrequency', 'fortifiedBabyFoodFrequency', 'grainsFoodFrequency',
  'yellowOrangeVegetables', 'rootsFoodFrequency', 'darkGreenLeafyVegetables',
  'ripeFruitsFrequency', 'otherFruitsVegetablesFrequency', 'dryFruitsFrequency',
  'organMeatsFrequency', 'meatFoodFrequency', 'eggsFrequency', 'fishFrequency',
  'beansLentilsFrequency', 'nutsFrequency', 'milkProductsFrequency',
  'oilGheeFrequency', 'sugaryFoodsFrequency', 'beveragesFrequency', 'sweetenedBeveragesFrequency',
]);

export const S11_FOOD_FREQUENCY_FIELDS = Object.freeze([
  'porridgeGruelFrequency', 'babyFoodFrequency', 'grainsBasedFoodFrequency',
  'yellowOrangeVeggies', 'rootsBasedFoodFrequency', 'darkGreenVeggiesFrequency',
  'ripeFruitsFrequencys', 'otherFruitsVeggiesFrequency', 'driedFruitsFrequency',
  'organMeatsFrequencys', 'chickenMeatFrequency', 'eggsConsumptionFrequency',
  'fishConsumptionFrequency', 'legumesFoodFrequency', 'nutsConsumptionFrequency',
  'dairyProductsFrequency', 'oilsFatsFrequency', 'sugaryFoodFrequency',
  'beveragesConsumptionFrequency', 'sweetenedBeveragesFrequencys',
]);

const SECTION8_ONLY_FIELDS = Object.freeze([
  'typeOfRecordAvailable', 'awwActionsDuringVisit', 'childNotConsumeThr',
  'thrQtyPrepareChild', 'storeThr', 'counsellingAdviceReceive', 'thrNotReceivedReasonChild',
]);

const cssEscape = (s) => String(s).replace(/(["\\])/g, '\\$1');

/**
 * Group every named control under `root` and read its value the way a form
 * post would: checkbox groups -> array of checked values, radios -> checked
 * value, other inputs -> their value. When a name is shared by a radio group
 * and a hidden input, the later control in document order wins (the hidden
 * "final value" inputs come after their radios).
 */
export function readSectionControls(root) {
  const data = {};
  if (!root) return data;
  const byName = new Map();
  root.querySelectorAll('input, select, textarea, [role="textbox"]').forEach((control) => {
    if (!control.name) return;
    if (!byName.has(control.name)) byName.set(control.name, []);
    const list = byName.get(control.name);
    if (!list.includes(control)) list.push(control);
  });

  byName.forEach((controls, name) => {
    const isCheckboxGroup = controls.length > 1 && controls[0].type === 'checkbox';
    if (isCheckboxGroup) {
      data[name] = controls.filter((c) => c.type === 'checkbox' && c.checked).map((c) => c.value);
      return;
    }
    controls.forEach((control) => {
      if (control.type === 'checkbox' || control.type === 'radio') {
        if (control.checked) data[name] = control.value;
      } else if (control.type === 'select-multiple') {
        const selected = Array.from(control.selectedOptions).map((o) => o.value);
        if (selected.length) data[name] = selected;
      } else if (control.value !== undefined && control.value !== null) {
        data[name] = control.value || '';
      }
    });
    if (controls[0].type === 'radio' && !data[name]) data[name] = '';
  });
  return data;
}

/** Fill empty `fields` in `data` from same-named hidden inputs under `root`. */
export function applyHiddenInputFallback(data, root, fields) {
  if (!root) return data;
  fields.forEach((field) => {
    if (data[field]) return;
    const input = root.querySelector(`input[name="${cssEscape(field)}"]`);
    if (input) data[field] = input.value || '';
  });
  return data;
}

function section8Rules(data) {
  const out = { ...data };
  if (out.childCardRecordAvailability && out.childCardRecordAvailability !== 'Available') {
    delete out.typeOfRecordAvailable;
    delete out.typeOfRecordAvailableCombined;
    delete out.otherTypeOfRecord;
  }
  if (out.thrReceivedFromAwc === 'Yes') {
    delete out.thrNotReceivedReasonChild;
    delete out.thrNotReceivedReasonChildCombined;
    delete out.otherThrNotReceivedReasonChild;
  }
  if (out.counsellingOnHomeFood === 'No') {
    delete out.counsellingAdviceReceive;
    delete out.counsellingAdviceReceiveCombined;
    delete out.otherCounsellingAdvice;
  }
  const required = ['awwActionsDuringVisit', 'childNotConsumeThr', 'thrQtyPrepareChild', 'storeThr'];
  if (out.counsellingOnHomeFood === 'Yes') required.push('counsellingAdviceReceive');
  if (out.childCardRecordAvailability === 'Available') required.push('typeOfRecordAvailable');
  required.forEach((f) => { if (!out[f]) out[f] = ''; });
  if (out.thrReceivedFromAwc === 'No' && !out.thrNotReceivedReasonChild) out.thrNotReceivedReasonChild = '';
  return out;
}

function section10FoodFrequencies(data, root) {
  const out = { ...data };
  S10_FOOD_FREQUENCY_FIELDS.forEach((field) => {
    if (out[field]) return;
    const active = root.querySelector(`button[data-food="${cssEscape(field)}"][data-frequency].MuiButton-contained`);
    if (active) {
      out[field] = active.getAttribute('data-frequency');
      return;
    }
    const hidden = root.querySelector(`input[name="${cssEscape(field)}"]`);
    out[field] = hidden && hidden.value ? hidden.value : '';
  });
  return out;
}

/**
 * Collect and serialize one section. Returns {} when the section is not mounted.
 * @param {string} sectionId key of RMC_SECTION_FORM_IDS
 * @param {{doc?: Document, toEnglish?: Function}} options
 */
export function collectSection(sectionId, { doc = document, toEnglish } = {}) {
  const formId = RMC_SECTION_FORM_IDS[sectionId];
  const root = formId ? doc.getElementById(formId) : null;
  if (!root) return {};

  let raw = readSectionControls(root);
  if (sectionId === 'section8') {
    raw = section8Rules(raw);
  } else {
    SECTION8_ONLY_FIELDS.forEach((f) => { delete raw[f]; });
    if (sectionId === 'section10') raw = section10FoodFrequencies(raw, root);
  }

  const data = serializeSectionValues(raw, { toEnglish });

  if (sectionId === 'cbe') {
    const textarea = root.querySelector('textarea[name="otherImportantObservation"]');
    data.otherImportantObservation = textarea ? textarea.value || '' : '';
  }

  if (sectionId === 'section11') {
    const otherFood = root.querySelector('textarea[name="otherRegularFoodItem"]');
    if (otherFood) data.otherRegularFoodItem = otherFood.value || '';
    const combinedReason = root.querySelector('input[name="thrNotConsumedReasonCombined"]');
    if (combinedReason && combinedReason.value) data.thrNotConsumedReason = combinedReason.value;
    // Hidden food-frequency inputs (incl. otherFruitsVeggiesFrequency) are the fallback.
    applyHiddenInputFallback(data, root, S11_FOOD_FREQUENCY_FIELDS);
  }

  return data;
}
