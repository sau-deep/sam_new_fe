// Household/caregiver interaction sub-sections of Routine Monitoring (Sections 8–11; audit A09).
//
// The surveyor picks the one section that fits the child; householdData carries that
// section's answers (the choice itself is not sent). The backend applies the same rule
// (sam_BE validation/HouseholdSection.java + SurveySubmissionValidator.checkHouseholdSection):
//  - every client: at least one Section 8–11 question is answered;
//  - formSchemaVersion 2 (this form): only one section is answered, and all the questions
//    that section always shows and requires are answered.
// The required lists are RMC_RULES.household (utils/rmcValidation.js), which match the
// section components' own triggerValidation lists.

import { RMC_RULES, isEmpty } from 'utils/rmcValidation';

export const HOUSEHOLD_SECTION_INFO = Object.freeze({
  section8: Object.freeze({ number: 8, title: 'Section 8 (child enrolled under CMAM)', identifying: ['nameOfChild'] }),
  section9: Object.freeze({ number: 9, title: 'Section 9 (infant 0–6 months)', identifying: ['nameOfChild06'] }),
  section10: Object.freeze({ number: 10, title: 'Section 10 (child 6–8 months)', identifying: ['nameOfChild68'] }),
  section11: Object.freeze({ number: 11, title: 'Section 11 (child 9–23 months)', identifying: ['childFullName'] }),
});

const HOUSEHOLD_KEY = 'householdData';

/** The always-required questions of a household section ('section8' … 'section11'). */
export const householdRequiredFields = (sectionId) => RMC_RULES.household[sectionId]?.required || [];

/** Section ids with at least one answered question, in form order. */
export function answeredHouseholdSections(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.keys(HOUSEHOLD_SECTION_INFO).filter((id) =>
    [...householdRequiredFields(id), ...HOUSEHOLD_SECTION_INFO[id].identifying].some((f) => !isEmpty(data[f])));
}

/**
 * Field errors (request paths -> message) for householdData, the same keys the backend
 * returns: 'householdData' for a missing or doubled section, 'householdData.<field>' for an
 * unanswered required question. {} when the answers are fine.
 */
export function householdSectionErrors(data) {
  const answered = answeredHouseholdSections(data);
  if (answered.length === 0) {
    return {
      [HOUSEHOLD_KEY]: "'Household/caregiver interaction' was selected, but none of the household sections "
        + '(8, 9, 10 or 11) is answered. Choose the section that fits the child and answer its questions.',
    };
  }
  if (answered.length > 1) {
    const numbers = answered.map((id) => HOUSEHOLD_SECTION_INFO[id].number).join(' and ');
    return {
      [HOUSEHOLD_KEY]: `Only one household section can be filled in a survey, but answers were found for Sections ${numbers}.`
        + ' Keep the section that fits the child and submit again.',
    };
  }
  const id = answered[0];
  const errors = {};
  householdRequiredFields(id).forEach((field) => {
    if (isEmpty(data[field])) errors[`${HOUSEHOLD_KEY}.${field}`] = `This question is required in ${HOUSEHOLD_SECTION_INFO[id].title}.`;
  });
  return errors;
}
