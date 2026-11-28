// Map backend validation errors (C1 fieldErrors, keyed by request path such as
// "cbeData.themeOfCbe") to the visible Routine Monitoring controls.

import { RMC_SECTION_FORM_IDS } from './collectSectionData';

const SECTIONS_BY_REQUEST_KEY = Object.freeze({
  aganwadiData: ['awaRegistration', 'equipmentAvailability', 'skillAssessment'],
  cbeData: ['cbe'],
  vhsndData: ['cmamClinic', 'anmChoKnowledge'],
  householdData: ['section8', 'section9', 'section10', 'section11'],
});

// A whole-section error (missing section, no or two household sections) belongs to the
// question that chose the section.
const SECTION_CHOICE_FIELD = Object.freeze({
  aganwadiData: 'activityToObserve',
  cbeData: 'activityToObserve',
  vhsndData: 'activityToObserve',
  householdData: 'householdSection',
});

// Request keys whose control has a different name in the form.
const CONTROL_ALIASES = Object.freeze({
  thrNotReceivedReason_child: ['thrNotReceivedReasonChild', 'otherThrNotReceivedReasonChild'],
  thrNotReceivedReasonChild: ['otherThrNotReceivedReasonChild'],
  thrNotReceivedReasonLast3Month: ['thrNotReceivedReasonOther'],
  familyAttendedAnnaprashan: ['familyAttendedAnnaprashanOthers'],
  dateChildMeasured: ['lastMeasurementDate'],
  measurementFollowedStep: ['measurementFollowedStepDigital', 'measurementFollowedStepMechanical', 'measurementFollowedStepSalter'],
  childHeightSteps: ['stadiometerSteps', 'infantometerSteps'],
});

/**
 * Describe each field error: which top-level Formik field it belongs to, or
 * which section containers / control names to look in.
 */
export function describeFieldErrors(fieldErrors) {
  if (!fieldErrors || typeof fieldErrors !== 'object') return [];
  return Object.entries(fieldErrors).map(([path, message]) => {
    const [head, ...rest] = String(path).split('.');
    if (rest.length === 0 || !SECTIONS_BY_REQUEST_KEY[head]) {
      const topLevelField = rest.length === 0 ? (SECTION_CHOICE_FIELD[head] || head) : head;
      return { path, message: String(message), topLevelField, sectionKey: null, formIds: [], controlNames: [] };
    }
    const field = rest[rest.length - 1];
    // The Other text box first (that is what is too long or missing), then the question.
    const capital = field.charAt(0).toUpperCase() + field.slice(1);
    const controlNames = [...(CONTROL_ALIASES[field] || []), `${field}Other`, `${field}Others`, `other${capital}`, field];
    const formIds = SECTIONS_BY_REQUEST_KEY[head].map((id) => RMC_SECTION_FORM_IDS[id]);
    return { path, message: String(message), topLevelField: null, sectionKey: head, field, formIds, controlNames };
  });
}

/** First rendered control for a described error, or its section container, or null. */
export function locateErrorControl(entry, doc = document) {
  if (!entry) return null;
  if (entry.topLevelField) {
    return doc.querySelector(`[name="${cssAttr(entry.topLevelField)}"]`) || doc.getElementById(entry.topLevelField);
  }
  for (const formId of entry.formIds) {
    const root = doc.getElementById(formId);
    if (!root) continue;
    for (const name of entry.controlNames) {
      const el = root.querySelector(`[name="${cssAttr(name)}"]`) || root.querySelector(`[id="${cssAttr(name)}"]`);
      if (el) return el;
    }
  }
  for (const formId of entry.formIds) {
    const root = doc.getElementById(formId);
    if (root) return root;
  }
  return null;
}

function cssAttr(name) {
  return String(name).replace(/(["\\])/g, '\\$1');
}
