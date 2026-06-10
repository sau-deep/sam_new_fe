/**
 * Declarative validation for editing a saved Routine Monitoring record.
 *
 * Mirrors the survey form's mandatory-field + conditional rules so a surveyor's
 * edit follows the same conditions as filling the form. Rules were extracted from
 * the section components (AwaRegistration, EquipmentAvailabilityAWC, SkillAssessment,
 * CommunityBasedEventsObservationSection, CMAMClinicSection, ANMCHO…, and the four
 * household sub-sections) and keyed by the SUBMITTED PAYLOAD field names.
 *
 * A field is only required when its `when` condition (if any) is met — matching the
 * form's conditional display. In addition, the editor treats any field that was
 * already filled in the original record as mandatory (it cannot be cleared), which
 * guarantees previously-required data is never silently dropped.
 */

export const isEmpty = (v) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
};

const norm = (v) => String(v ?? "").trim();

// Comma-separated multiselect string → array of trimmed tokens
const tokens = (v) => norm(v).split(",").map((s) => s.trim()).filter(Boolean);

// Evaluate a single `when` clause against the section data.
const clauseMet = (data, clause) => {
  if (!clause || !clause.field) return true;
  const raw = data[clause.field];
  if (clause.in) return clause.in.map(norm).includes(norm(raw));
  if (clause.nin) return !clause.nin.map(norm).includes(norm(raw)); // includes "" => treat empty as not-met below
  if (clause.notIn) {
    // required when the parent has a (non-empty) value that is NOT one of these
    return !isEmpty(raw) && !clause.notIn.map(norm).includes(norm(raw));
  }
  if (clause.contains) {
    return tokens(raw).map((t) => t.toLowerCase()).includes(String(clause.contains).toLowerCase());
  }
  return true;
};

// `nin` should not fire when the parent itself is empty.
const conditionMet = (data, cond) => {
  if (!cond) return true;
  if (cond.nin && isEmpty(data[cond.field])) return false;
  if (!clauseMet(data, cond)) return false;
  if (Array.isArray(cond.and)) {
    return cond.and.every((c) => clauseMet(data, c) && !(c.nin && isEmpty(data[c.field])));
  }
  return true;
};

// A value that is a bare "Other(s)"/"Any other" with no specify text is incomplete.
const bareOther = /^(others?|any\s*other)\s*-?\s*$/i;
const hasBareOther = (v) => tokens(v).some((t) => bareOther.test(t));

// ---------------------------------------------------------------------------
// Rules per section (payload field keys)
// ---------------------------------------------------------------------------

// food-frequency fields that become required once the child eats other food
const FOOD_FREQ_S10 = [
  "porridgeFrequency", "fortifiedBabyFoodFrequency", "grainsFoodFrequency", "yellowOrangeVegetables",
  "rootsFoodFrequency", "darkGreenLeafyVegetables", "ripeFruitsFrequency", "otherFruitsVegetablesFrequency",
  "dryFruitsFrequency", "organMeatsFrequency", "meatFoodFrequency", "eggsFrequency", "fishFrequency",
  "beansLentilsFrequency", "nutsFrequency", "milkProductsFrequency", "oilGheeFrequency",
  "sugaryFoodsFrequency", "beveragesFrequency", "sweetenedBeveragesFrequency",
];
const FOOD_FREQ_S11 = [
  "porridgeGruelFrequency", "babyFoodFrequency", "grainsBasedFoodFrequency", "yellowOrangeVeggies",
  "rootsBasedFoodFrequency", "darkGreenVeggiesFrequency", "ripeFruitsFrequencys", "otherFruitsVeggiesFrequency",
  "driedFruitsFrequency", "organMeatsFrequencys", "chickenMeatFrequency", "eggsConsumptionFrequency",
  "fishConsumptionFrequency", "legumesFoodFrequency", "nutsConsumptionFrequency", "dairyProductsFrequency",
  "oilsFatsFrequency", "sugaryFoodFrequency", "beveragesConsumptionFrequency", "sweetenedBeveragesFrequencys",
];

const SAM_PRESENT = { field: "physicalExamSam", notIn: ["no", "noSAMChildIdentifiedDuringMonth", "noSAMChildUndergoingTreatment"] };
const ENROLLED = { field: "childEnrolledCmam", in: ["Yes"] };

export const RMC_RULES = {
  aganwadi: {
    required: [
      "samChildrenTotal", "samChildren06", "samChildren65",
      "cmamChildrenTotal", "cmamChildren06", "cmamChildren65",
      "weighingScale", "salterScale", "infantometer", "stadiometer",
      "supplementaryNutrition", "registerAvailability", "poshanTrackerUpdated",
      "amoxycillinSyrup", "folicAcidTablet", "albendazole", "vitA", "ifaSyrup",
      "multivitaminSyrup", "zinc", "ors", "pcm",
      "cmamTraining", "dateChildMeasured", "childSex", "childAge", "childWeight", "childHeight",
      "instrumentAww", "childHeightInstrument", "classifyWastingAww",
      "screeningSamChildren", "appetiteTestFood", "nutritionalOedema", "childNrcMtc",
      "childFollowupCmam", "activitiesFollowupCmam",
    ],
    conditional: [
      { field: "variationReason", when: { field: "samChildrenTotal" }, custom: (d) =>
        (parseInt(d.samChildren06 || 0) + parseInt(d.samChildren65 || 0)) !==
        (parseInt(d.cmamChildren06 || 0) + parseInt(d.cmamChildren65 || 0)) },
      { field: "cmamTrainingMonth", when: { field: "cmamTraining", in: ["Yes"] } },
      { field: "reasonPoshanTrackerNotUpdated", when: { field: "poshanTrackerUpdated", in: ["No"] } },
      { field: "childWeightAww", when: { field: "instrumentAww", notIn: ["Not functional / Not available"] } },
      { field: "childWeightFieldMonitor", when: { field: "instrumentAww", notIn: ["Not functional / Not available"] } },
      { field: "childHeightAww", when: { field: "childHeightInstrument", notIn: ["Not functional / Not available"] } },
      { field: "childHeightFieldMonitor", when: { field: "childHeightInstrument", notIn: ["Not functional / Not available"] } },
      { field: "nutritionalStatusXScorecard", when: { field: "classifyWastingAww", in: ["Used WFL / WFH z-score chart"] } },
    ],
    numeric: [
      { field: "cmamChildren06", lte: "samChildren06", message: "Cannot exceed SAM (0-6 months)" },
      { field: "cmamChildren65", lte: "samChildren65", message: "Cannot exceed SAM (6m-5y)" },
    ],
  },

  cbe: {
    required: ["themeOfCbe", "typeOfBeneficiaryAttendedCbe", "serviceProvidersPresentCbe", "groupCounsellingConducted"],
    conditional: [
      { field: "counsellingTopicsCbe", when: { field: "groupCounsellingConducted", in: ["Yes"] } },
      { field: "counsellingAidsUsed", when: { field: "groupCounsellingConducted", in: ["Yes"] } },
    ],
  },

  vhsnd: {
    required: [
      "vhsndVisitDay", "physicalExamSam", "childDischargedCmam",
      "vhsndAmoxycillin", "vhsndFolicAcidTablet", "vhsndAlbendazole", "vhsndIfaSyrup", "vhsndVitA",
      "vhsndMultivitaminSyrup", "vhsndZinc", "vhsndOrs", "vhsndPcm",
      "cmamTraining", "confirmChildSam", "assessingMedicalComplication",
      "childSamReferredNrc", "medicinesGivenCommunityLevel",
    ],
    conditional: [
      { field: "testConductedSam", when: SAM_PRESENT },
      { field: "vhsndMedicalComplication", when: SAM_PRESENT },
      { field: "vhsndAppetiteTestConducted", when: SAM_PRESENT },
      { field: "childReferralNrc", when: SAM_PRESENT },
      { field: "childEnrolledCmam", when: SAM_PRESENT },
      { field: "motherAgreeNrc", when: { field: "childReferralNrc", in: ["Yes"] } },
      { field: "motherNotAgreeReason", when: { field: "childReferralNrc", in: ["Yes"], and: [{ field: "motherAgreeNrc", in: ["No"] }] } },
      { field: "firstDoseAmoxicillin", when: ENROLLED },
      { field: "motherAmoxicillin", when: ENROLLED },
      { field: "motherAmoxicillinCounselled", when: ENROLLED },
      { field: "childFolic", when: ENROLLED },
      { field: "albendazoleGuidelines", when: ENROLLED },
      { field: "vitAEnrolement", when: ENROLLED },
      { field: "firstDoseMultivit", when: ENROLLED },
      { field: "motherMultivitamin", when: ENROLLED },
      { field: "motherCounsel", when: ENROLLED },
      { field: "motherThr", when: ENROLLED },
      { field: "motherGivenMessage", when: ENROLLED },
      { field: "counsellingAids", when: ENROLLED },
      { field: "cmamTrainingMonth", when: { field: "cmamTraining", in: ["Yes"] } },
    ],
  },

  household: {
    section8: {
      required: [
        "currentAgeMonths", "sexOfChild", "currentFollowupOrRecovered", "childCardRecordAvailability",
        "lastWeighedDate", "lastMeasuredHeightDate", "whoMeasuredChild", "awwVisitsPastMonth",
        "frequencyOfWeightMeasurement", "anmMedicineAtEnrollment", "thrReceivedFromAwc", "counsellingOnHomeFood",
      ],
      conditional: [
        { field: "typeOfRecordAvailable", when: { field: "childCardRecordAvailability", in: ["Available"] } },
        { field: "awwActionsDuringVisit", when: { field: "awwVisitsPastMonth" }, custom: (d) => norm(d.awwVisitsPastMonth) !== "" && norm(d.awwVisitsPastMonth) !== "0" },
        { field: "childConsumeAntibioticFiveDays", when: { field: "anmMedicineAtEnrollment", in: ["Yes"] } },
        { field: "thrNotReceivedReason", when: { field: "thrReceivedFromAwc", in: ["No"] } },
        { field: "recordForVerification", when: { field: "thrReceivedFromAwc", in: ["Yes"] } },
        { field: "qtyThrReceivedPastMonth", when: { field: "thrReceivedFromAwc", in: ["Yes"] } },
        { field: "childConsumeThr", when: { field: "thrReceivedFromAwc", in: ["Yes"] } },
        { field: "childNotConsumeThr", when: { field: "childConsumeThr", in: ["No"] } },
        { field: "whoConsumeThr", when: { field: "childConsumeThr", in: ["Yes"] } },
        { field: "daysThrConsumeChild", when: { field: "childConsumeThr", in: ["Yes"] } },
        { field: "thrQtyPrepareChild", when: { field: "childConsumeThr", in: ["Yes"] } },
        { field: "storeThr", when: { field: "childConsumeThr", in: ["Yes"] } },
        { field: "counsellingAdviceReceive", when: { field: "counsellingOnHomeFood", in: ["Yes"] } },
      ],
    },
    section9: {
      required: [
        "sexOfChild06", "currentAgeMonths06", "breastfedInLast24Hours", "foodsOrDrinksReceived",
        "reasonsNotExclusivelyBreastfed", "bottleUsedToFeedMilk", "awwHomeVisitsLast4Weeks",
        "ashaHomeVisitsLast4Weeks", "anmHomeVisitsLast4Weeks", "receieveAdviceFeeding",
        "childWeighedAwc", "childWeighedAware", "childGrowingWell",
      ],
      conditional: [
        { field: "breastfedPerDay", when: { field: "breastfedInLast24Hours", in: ["Yes"] } },
        { field: "breastfedPerNight", when: { field: "breastfedInLast24Hours", in: ["Yes"] } },
        { field: "adviceReceive", when: { field: "receieveAdviceFeeding", in: ["Yes"] } },
        { field: "childWeighedLastAwc", when: { field: "childWeighedAware", in: ["Yes"] } },
      ],
    },
    section10: {
      required: [
        "sexOfChild68", "currentAgeMonths68", "startedTakingFoodOtherThanBreastmilk", "annaprashanConductedAtAwc",
        "timesBreastfedInLast24Hours", "foodConsistencyCorrect", "thrReceivedPastMonth",
        "awwVisitsLast4Weeks", "ashaVisitsLast4Weeks", "anmVisitsLast4Weeks",
        "receivedFeedingAdvice", "ifaSyrupReceivedLastWeek", "childWeighedAtAwc", "awareWeightChild", "isChildGrowingWell",
      ],
      conditional: [
        { field: "familyAttendedAnnaprashan", when: { field: "annaprashanConductedAtAwc", in: ["Yes"] } },
        { field: "timesFedFoodInLast24Hours", when: { field: "startedTakingFoodOtherThanBreastmilk", in: ["Yes"] } },
        ...FOOD_FREQ_S10.map((f) => ({ field: f, when: { field: "startedTakingFoodOtherThanBreastmilk", in: ["Yes"] },
          custom: (d) => norm(d.timesFedFoodInLast24Hours) !== "" && norm(d.timesFedFoodInLast24Hours) !== "0" })),
        { field: "thrNotReceivedReason", when: { field: "thrReceivedPastMonth", in: ["No"] } },
        { field: "thrReceivedDays", when: { field: "thrReceivedPastMonth", in: ["Yes"] } },
        { field: "thrQtyReceived", when: { field: "thrReceivedPastMonth", in: ["Yes"] } },
        { field: "thrConsumed", when: { field: "thrReceivedPastMonth", in: ["Yes"] } },
        { field: "reasonNotConsumedThr", when: { field: "thrConsumed", in: ["No"] } },
        { field: "thrConsumedBy", when: { field: "thrConsumed", in: ["Yes"] } },
        { field: "thrConsumedDays", when: { field: "thrConsumed", in: ["Yes"] } },
        { field: "qtyPrepareFood", when: { field: "thrConsumed", in: ["Yes"] } },
        { field: "thrStore", when: { field: "thrConsumed", in: ["Yes"] } },
        { field: "adviceReceived", when: { field: "receivedFeedingAdvice", in: ["Yes"] } },
        { field: "weightChild", when: { field: "awareWeightChild", in: ["Yes"] } },
      ],
    },
    section11: {
      required: [
        "childGender", "childAgeInMonths", "breastfedTimesIn24Hrs", "fedFoodTimesIn24Hrs",
        "rightFoodConsistency", "thrReceivedLast3Month", "albendazoleReceived", "vitaminAReceived",
        "ifaSyrupGiven", "awwVisitsLast4Week", "ashaVisitsLast4Week", "anmVisitsLast4Week",
        "feedingAdviceReceived", "childLastWeighed", "childAwareLastWeighed", "childGrowWell",
      ],
      conditional: [
        ...FOOD_FREQ_S11.map((f) => ({ field: f, when: { field: "fedFoodTimesIn24Hrs" },
          custom: (d) => norm(d.fedFoodTimesIn24Hrs) !== "" && norm(d.fedFoodTimesIn24Hrs) !== "0" })),
        { field: "otherRegularFoodItem", when: { field: "fedFoodTimesIn24Hrs" },
          custom: (d) => norm(d.fedFoodTimesIn24Hrs) !== "" && norm(d.fedFoodTimesIn24Hrs) !== "0" },
        { field: "thrNotReceivedReasonLast3Month", when: { field: "thrReceivedLast3Month", in: ["No"] } },
        { field: "monthsThrReceivedLast3Month", when: { field: "thrReceivedLast3Month", in: ["Yes"] } },
        { field: "qtyThrReceived", when: { field: "thrReceivedLast3Month", in: ["Yes"] } },
        { field: "thrConsumedByChild", when: { field: "thrReceivedLast3Month", in: ["Yes"] } },
        { field: "thrNotConsumedReason", when: { field: "thrConsumedByChild", in: ["No"] } },
        { field: "thrConsumer", when: { field: "thrConsumedByChild", in: ["Yes"] } },
        { field: "daysThrConsumed", when: { field: "thrConsumedByChild", in: ["Yes"] } },
        { field: "qtyThrFood", when: { field: "thrConsumedByChild", in: ["Yes"] } },
        { field: "storeOpenedThr", when: { field: "thrConsumedByChild", in: ["Yes"] } },
        { field: "typeOfFeedingAdvice", when: { field: "feedingAdviceReceived", in: ["Yes"] } },
        { field: "childWeighed", when: { field: "childAwareLastWeighed", in: ["Yes"] } },
      ],
    },
  },
};

// Detect which household sub-section the saved data belongs to.
export const detectHouseholdSection = (data) => {
  if (!data) return null;
  if (!isEmpty(data.sexOfChild06) || !isEmpty(data.currentAgeMonths06)) return "section9";
  if (!isEmpty(data.sexOfChild68) || !isEmpty(data.currentAgeMonths68)) return "section10";
  if (!isEmpty(data.childGender) || !isEmpty(data.childAgeInMonths)) return "section11";
  if (!isEmpty(data.sexOfChild) || !isEmpty(data.currentAgeMonths) || !isEmpty(data.childCardRecordAvailability)) return "section8";
  return null;
};

const getRuleSet = (sectionType, data) => {
  if (sectionType === "household") {
    const sub = detectHouseholdSection(data);
    return sub ? RMC_RULES.household[sub] : null;
  }
  return RMC_RULES[sectionType] || null;
};

/**
 * Whether a section field is mandatory right now (always-required, or a conditional
 * rule whose parent condition is currently met). Used to show the asterisk.
 */
export const isFieldRequired = (sectionType, data, field) => {
  const rules = getRuleSet(sectionType, data || {});
  if (!rules) return false;
  if ((rules.required || []).includes(field)) return true;
  const cond = (rules.conditional || []).find((r) => r.field === field);
  if (cond) return conditionMet(data || {}, cond.when) && (!cond.custom || cond.custom(data || {}));
  return false;
};

/**
 * Validate one section's data. Returns { fieldKey: message } for every violation.
 * `original` (the pre-edit section data) is used to treat already-filled fields as
 * mandatory so they cannot be cleared.
 */
export const validateSectionData = (sectionType, data, original = null) => {
  const errors = {};
  if (!data) return errors;
  const rules = getRuleSet(sectionType, data);
  const REQUIRED_MSG = "This field is required";

  if (rules) {
    (rules.required || []).forEach((f) => {
      if (isEmpty(data[f])) errors[f] = REQUIRED_MSG;
    });
    (rules.conditional || []).forEach((rule) => {
      const applies = conditionMet(data, rule.when) && (!rule.custom || rule.custom(data));
      if (applies && isEmpty(data[rule.field])) errors[rule.field] = REQUIRED_MSG;
    });
    (rules.numeric || []).forEach((c) => {
      const a = parseInt(data[c.field] || 0);
      const b = parseInt(data[c.lte] || 0);
      if (!isEmpty(data[c.field]) && !isEmpty(data[c.lte]) && a > b) errors[c.field] = c.message;
    });
  }

  // Generic: a selected "Other" without specify text is incomplete
  Object.entries(data).forEach(([k, v]) => {
    if (!errors[k] && typeof v === "string" && hasBareOther(v)) {
      errors[k] = "Please specify the 'Other' value";
    }
  });

  // Safety net: a field filled in the original record may not be cleared
  if (original) {
    Object.keys(original).forEach((k) => {
      if (!errors[k] && !isEmpty(original[k]) && isEmpty(data[k])) {
        errors[k] = REQUIRED_MSG;
      }
    });
  }

  return errors;
};
