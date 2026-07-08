// Option lists for the BEL survey "Personal Information" step.
//
// IMPORTANT CONVENTIONS:
// - `value` is the canonical value stored in the DB and MUST stay in English.
//   Never translate it (translating stored values corrupts the DB and breaks
//   any conditional logic). Only the visible label is translated.
// - `labelKey` points at a key under `personalInfo.*` in the locale files
//   (src/bel/locales/en.json + hi.json). The dropdown renders t(labelKey).
//
// NOTE: The Service band "20-30 years" was entered by the client as "30-30 years"
// (an obvious typo that broke the ascending sequence); confirm if it should differ.

export const SBU_OPTIONS = [
  { value: 'RADAR', labelKey: 'personalInfo.options.sbu.radar' },
  { value: 'DCCS', labelKey: 'personalInfo.options.sbu.dccs' },
  { value: 'NCS', labelKey: 'personalInfo.options.sbu.ncs' },
  { value: 'SCCS', labelKey: 'personalInfo.options.sbu.sccs' },
  { value: 'CENTRAL', labelKey: 'personalInfo.options.sbu.central' },
  { value: 'ANTENNA', labelKey: 'personalInfo.options.sbu.antenna' },
];

export const AGE_OPTIONS = [
  { value: '19-25', labelKey: 'personalInfo.options.age.a19_25' },
  { value: '26-35', labelKey: 'personalInfo.options.age.a26_35' },
  { value: '36-45', labelKey: 'personalInfo.options.age.a36_45' },
  { value: '45+', labelKey: 'personalInfo.options.age.a45_plus' },
];

export const SERVICE_OPTIONS = [
  { value: '0-5', labelKey: 'personalInfo.options.service.s0_5' },
  { value: '5-10', labelKey: 'personalInfo.options.service.s5_10' },
  { value: '10-20', labelKey: 'personalInfo.options.service.s10_20' },
  { value: '20-30', labelKey: 'personalInfo.options.service.s20_30' },
  { value: '30+', labelKey: 'personalInfo.options.service.s30_plus' },
];

// Gender values are hardcoded English; only the labels are translated.
export const GENDER_OPTIONS = [
  { value: 'Male', labelKey: 'personalInfo.options.gender.male' },
  { value: 'Female', labelKey: 'personalInfo.options.gender.female' },
];

// Input rules for the two free-text fields.
export const DEPARTMENT_MAX_LENGTH = 100;
export const DEPARTMENT_ALLOWED = /^[A-Za-z\s]*$/; // letters + spaces only
export const GRADE_MAX_LENGTH = 10;
export const GRADE_ALLOWED = /^[A-Za-z0-9]*$/; // alphanumeric only (e.g. E3)

// The empty shape used to initialise / reset the personal-info form.
export const EMPTY_PERSONAL_INFO = {
  sbuName: '',
  age: '',
  serviceInBel: '',
  gender: '',
  departmentName: '',
  gradeWageGroup: '',
};
