// Shape of the Routine Monitoring autosave snapshot (audit A06).
//
// useFormAutoSave keeps its signature (contract C11), so everything that is
// not a top-level Formik value travels inside the values object under one key:
//   { ...formikValues, __rmcDraft: { version, step, sections: { <sectionId>: {...} } } }
// The selected activity and household section are ordinary Formik values;
// coordinates are stored by the hook itself.

export const RMC_DRAFT_KEY = '__rmcDraft';
export const RMC_DRAFT_VERSION = 1;

/** Values object handed to useFormAutoSave. */
export function buildRoutineDraftValues(formValues, { sections = {}, step = 0 } = {}) {
  return {
    ...(formValues || {}),
    [RMC_DRAFT_KEY]: { version: RMC_DRAFT_VERSION, step, sections: { ...sections } },
  };
}

/** Split a stored draft back into Formik values, section answers and step. */
export function splitRoutineDraft(formData) {
  if (!formData || typeof formData !== 'object') return { values: {}, sections: {}, step: 0 };
  const { [RMC_DRAFT_KEY]: extra, ...values } = formData;
  const sections = extra && typeof extra === 'object' && extra.sections && typeof extra.sections === 'object'
    ? extra.sections
    : {};
  const step = Number.isInteger(extra?.step) ? extra.step : 0;
  return { values, sections, step };
}

// Filled in by the app (network state, captured address), not by the surveyor.
const AUTO_FILLED_KEYS = ['responseMode', 'location'];

/**
 * Stable text used to tell whether the surveyor's answers changed since a
 * request was prepared. Going offline after a failed send must not count as a
 * change, or the retry/offline save would lose the sent attempt's id.
 */
export function draftFingerprint(formValues, sections) {
  const answers = { ...(formValues || {}) };
  AUTO_FILLED_KEYS.forEach((k) => { delete answers[k]; });
  return JSON.stringify(buildRoutineDraftValues(answers, { sections }));
}
