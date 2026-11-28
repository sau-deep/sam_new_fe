// Pure assembly of the Routine Monitoring request (audit F01 / W1, contract C7).
// The page collects each mounted section once, then this module builds the one
// request that Submit, Retry and Save Offline all reuse.

export const ACTIVITY = Object.freeze({
  AWC: 'Aanganwadi Center',
  CBE: 'CBE Session',
  VHSND: 'VHSND Session/RI Session',
  HOUSEHOLD: 'Household/caregiver interaction',
});

export const HOUSEHOLD_SECTIONS = Object.freeze(['section8', 'section9', 'section10', 'section11']);

/** Request key of each activity's section object (C7). */
export const ACTIVITY_SECTION_KEY = Object.freeze({
  [ACTIVITY.AWC]: 'aganwadiData',
  [ACTIVITY.CBE]: 'cbeData',
  [ACTIVITY.VHSND]: 'vhsndData',
  [ACTIVITY.HOUSEHOLD]: 'householdData',
});

/** AWC answers the backend expects to be present; missing ones are sent as '.' (legacy behaviour). */
export const REQUIRED_AWC_FIELDS = Object.freeze([
  'samChildrenTotal', 'samChildren06', 'samChildren65', 'cmamChildrenTotal', 'cmamChildren06', 'cmamChildren65',
  'variationReason', 'weighingScale', 'salterScale', 'infantometer', 'stadiometer', 'supplementaryNutrition',
  'registerAvailability', 'poshanTrackerUpdated', 'reasonPoshanTrackerNotUpdated', 'amoxycillinSyrup',
  'folicAcidTablet', 'albendazole', 'vitA', 'ifaSyrup', 'multivitaminSyrup', 'zinc', 'ors', 'pcm',
  'cmamTraining', 'cmamTrainingMonth', 'cmamTrainingDiscussed', 'dateChildMeasured', 'childSex', 'childAge',
  'childWeight', 'childHeight', 'instrumentAww', 'measurementFollowedStep', 'childWeightAww',
  'childWeightFieldMonitor', 'childHeightInstrument', 'childHeightSteps', 'childHeightAww',
  'childHeightFieldMonitor', 'classifyWastingAww', 'nutritionalStatusXScorecard', 'screeningSamChildren',
  'appetiteTestFood', 'nutritionalOedema', 'childNrcMtc', 'childFollowupCmam', 'activitiesFollowupCmam',
]);

const activityIs = (values, activity) =>
  typeof values?.activityToObserve === 'string' && values.activityToObserve.includes(activity);

/** Which section components must be validated and read for these values. */
export function activeSectionIds(values) {
  const ids = [];
  if (activityIs(values, ACTIVITY.AWC)) ids.push('awaRegistration', 'equipmentAvailability', 'skillAssessment');
  if (activityIs(values, ACTIVITY.VHSND)) ids.push('cmamClinic', 'anmChoKnowledge');
  if (activityIs(values, ACTIVITY.CBE)) ids.push('cbe');
  if (activityIs(values, ACTIVITY.HOUSEHOLD)) {
    HOUSEHOLD_SECTIONS.forEach((s) => { if (values[s]) ids.push(s); });
  }
  return ids;
}

/** Field-name fixes the AWC payload has always needed (SkillAssessment control names differ from the DTO). */
export function buildAganwadiData({ awaRegistration = {}, equipmentAvailability = {}, skillAssessment = {} }) {
  const skill = {
    ...skillAssessment,
    dateChildMeasured: skillAssessment.lastMeasurementDate,
    measurementFollowedStep: skillAssessment.measurementFollowedStepDigital
      || skillAssessment.measurementFollowedStepMechanical
      || skillAssessment.measurementFollowedStepSalter || '',
    childHeightSteps: skillAssessment.stadiometerSteps || skillAssessment.infantometerSteps || '',
    stadiometerSteps: skillAssessment.stadiometerSteps || '',
    infantometerSteps: skillAssessment.infantometerSteps || '',
    cmamTrainingMonth: skillAssessment.cmamTrainingMonth || '',
    cmamTrainingDiscussed: skillAssessment.cmamTrainingDiscussed || '',
    reasonPoshanTrackerNotUpdated: equipmentAvailability.reasonPoshanTrackerNotUpdated || '',
    ifaSyrup: equipmentAvailability.ifaSyrup || '',
    multivitaminSyrup: equipmentAvailability.multivitaminSyrup || '',
    nutritionalStatusXScorecard: skillAssessment.nutritionalStatusXScorecard || '',
    thrQtyPrepareChild: skillAssessment.thrQtyPrepareChild || skillAssessment.daysThrPrepareChild || '',
  };
  ['lastMeasurementDate', 'measurementFollowedStepDigital', 'measurementFollowedStepMechanical',
    'measurementFollowedStepSalter', 'stadiometerSteps', 'infantometerSteps'].forEach((k) => { delete skill[k]; });

  const combined = { ...awaRegistration, ...equipmentAvailability, ...skill };
  REQUIRED_AWC_FIELDS.forEach((field) => {
    const v = combined[field];
    if (v === undefined || v === null || v === '') combined[field] = '.';
  });
  return combined;
}

export function buildVhsndData({ cmamClinic = {}, anmChoKnowledge = {} }) {
  return { ...cmamClinic, ...anmChoKnowledge };
}

export function buildCbeData({ cbe = {} }) {
  return { ...cbe, otherImportantObservation: cbe.otherImportantObservation || '' };
}

/** Merge the selected household sections (8–11) into one householdData object. */
export function buildHouseholdData(values, sections) {
  let household = {};
  HOUSEHOLD_SECTIONS.forEach((s) => {
    if (values[s]) household = { ...household, ...(sections[s] || {}) };
  });
  return household;
}

/**
 * Build the complete /form/routine request.
 * @param {object} p
 * @param {object} p.values        Formik values (top-level questions + section flags)
 * @param {object} p.coordinates   { lat, lng, accuracy, timestamp? } or null
 * @param {object} p.sections      collected section data keyed by section id
 * @param {boolean} p.isTestData   admin/IEG test submission flag
 * @param {Function} p.enrichLocation   values -> values with stateCode/districtCode/blockCode
 * @param {Function} p.locationMetadata coordinates -> extra capture fields
 */
export function buildRoutineRequest({
  values,
  coordinates,
  sections = {},
  isTestData = false,
  enrichLocation = (v) => v,
  locationMetadata = () => ({}),
}) {
  const coords = coordinates || { lat: 0, lng: 0, accuracy: 0 };
  const enriched = enrichLocation(values) || values;
  // Section flags select the household sub-sections; they are not request fields.
  const { section8, section9, section10, section11, householdSection, ...clean } = enriched;

  const request = {
    ...clean,
    activityToObserve: values.activityToObserve,
    latitude: coords.lat,
    longitude: coords.lng,
    ...locationMetadata(coords),
  };

  if (activityIs(values, ACTIVITY.AWC)) request.aganwadiData = buildAganwadiData(sections);
  if (activityIs(values, ACTIVITY.VHSND)) request.vhsndData = buildVhsndData(sections);
  if (activityIs(values, ACTIVITY.CBE)) request.cbeData = buildCbeData(sections);
  if (activityIs(values, ACTIVITY.HOUSEHOLD)) request.householdData = buildHouseholdData(values, sections);
  if (isTestData) request.isTestData = true;
  return request;
}

/** Section objects the selected activity requires but that are missing or empty (mirrors the backend check, C7). */
export function missingActivitySections(request) {
  const key = ACTIVITY_SECTION_KEY[request?.activityToObserve];
  if (!key) return [];
  const section = request[key];
  return section && typeof section === 'object' && Object.keys(section).length > 0 ? [] : [key];
}
