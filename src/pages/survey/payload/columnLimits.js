// Column widths of the tables each survey request is stored in, so the final
// check on the request (online and before queueing offline) rejects exactly what
// the backend's ColumnLimits rejects (sam_BE validation/ColumnLimits.java,
// SurveySubmissionValidator.java). A queued survey can then never be refused
// later for length.
//
// Copied from the JPA mapping of each entity (sam_BE src/main/java/com/app/sam/entity/),
// including the widening done in the same change: child_id 40, block_code 10 on the
// survey tables, household location_household TEXT. Keep in step with the entities.
//
// A number is a VARCHAR(n) limit counted in Unicode code points (MySQL utf8mb4).
// TEXT is limited in UTF-8 bytes. Columns stored as LONGTEXT/JSON (the multi-select
// answers) are unbounded and not listed. Server-set columns (childId, createdBy,
// createdOn, reverseGeocodedAddress) are not listed: the backend does not check them.
import { textLength } from 'utils/textLimits';

export const TEXT_BYTES = 65535;
const TEXT = Object.freeze({ bytes: TEXT_BYTES });

/** entity/BiAnnualAssessment.java (request: BiannualFormDto, checked field by field). */
export const BIANNUAL_COLUMNS = Object.freeze({
  state: 150, stateCode: 3, district: 150, placeOfResidence: 10, districtCode: 3,
  block: 150, blockCode: 10, village: 150, villageCode: 10,
  clusterCode: 2, structureCode: 2, householdNumber: 3,
  hhHeadReligion: 20, hhHeadReligionOther: 100, hhHeadCaste: 10,
  primaryCaregiverOtherText: 255, caregiversexOtherText: 255, childSexOtherText: 255,
  weightNotMeasuredReasonOtherText: 255, heightNotMeasuredReasonOtherText: 255,
  childUndernourishedTypeOtherText: 255, reasonWtNotMeasuringOtherText: 255,
  reasonHtNotMeasuringOtherText: 255, reasonNotAssessingOtherText: 255,
  primaryCaregiver: 50, careGiverInterview: 5, caregiverName: 80, caregiversex: 30,
  caregiverAge: 3, caregiverEducation: 50, childName: 80, childSex: 30,
  childAgeDays: 5, childAgeMonths: 3, childBirthOrder: 2, childRegisteredPoshanTracker: 3,
  childAgeAppropriateImmunization: 25, childIllnessPast2Weeks: 3, childIllnessType: 60,
  childBreastfeed: 4, childBreastfeedFirstTime: 40, noOfDays: 2, noOfHours: 3, noOfMins: 4,
  firstMilk: 4, otherThanMilk: 4, otherThanMilkGivenPreviousDay: 3, stillBreastfeeding: 4,
  breastFeedMonth: 3, givingFluids: 4, ageGivingFluids: 2, ageGivingSemisolid: 2, ageGivingSolid: 2,
  foodYesterdayBreastmilk: 15, foodYesterdayPorridge: 15, foodYesterdayFortifiedFood: 15,
  foodYesterdayGrain: 15, foodYesterdayYellow: 15, foodYesterdayRoots: 15, foodYesterdayLeafy: 15,
  foodYesterdayFruits: 15, foodYesterdayOtherFruits: 15, foodYesterdayDryFruits: 15,
  foodYesterdayOrganMeat: 15, foodYesterdayChicken: 15, foodYesterdayEggs: 15, foodYesterdayFish: 15,
  foodYesterdayBeans: 15, foodYesterdayNuts: 15, foodYesterdayCheese: 15, foodYesterdayOil: 15,
  foodYesterdaySugar: 15, foodYesterdayOtherSweetened: 15,
  receivedThr: 25, receivedThrDays: 3, consumeThrDays: 3, likeConsumeThr: 4, hhProvidedThr: 4,
  weightLastMonthAww: 3, weightNotMeasuredReason: 40, heightLastMonthAww: 3, heightNotMeasuredReason: 40,
  childUndernourished: 4, childUndernourishedType: 20, adviceChildHealthFacility: 4,
  childVisitHealthFacility: 4, receivedTreatment: 4,
  vitA6Months: 15, medicineWorm: 15, iron6Months: 15, ironDoses: 3, homeVisitAww: 3, homeVisitAsha: 3,
  current_wt: 5, reasonWtNotMeasuring: 150, currentHt: 6, reasonHtNotMeasuring: 150,
  positionHtMeasured: 15, presentBilateralOedema: 15, reasonNotAssessing: 150,
  nutritionalCategory: 7, samIdentifiedByAww: 3, mamIdentifiedByAww: 3, childEnrollCmam: 4,
  responseMode: 10, location: 255, latitude: 255, longitude: 255,
});

/** entity/FollowupChecklist.java (bound directly as the request body). */
export const FOLLOWUP_COLUMNS = Object.freeze({
  state: 150, stateCode: 2, district: 150, districtCode: 3, block: 255, blockCode: 10,
  village: 255, villageCode: 10, icdsProject: 255, childCode: 3, latitude: 255, longitude: 255,
  nameOfRespondent: 50, sexOfRespondent: 20, ageRespondent: 3, educationRespondent: 50,
  childName: 80, childSex: 30, birthWeight: 6, childAgeMonths: 3,
  chronicMedicalCondition: 3, chronicMedicalConditionSpecify: 255,
  childWeightLast1Month: 6, weightMeasuredTimes: 3, childHeightLast1Month: 6, heightMeasuredTimes: 3,
  receivedThr: 30, receivedThrMonthsCount: 60, infoRecordsVerification: 3, reasonNotReceivedThr: 50,
  receivedThrSam: 25, quantityThrReceived: 3, thrConsumed: 3, reasonNotConsumed: 80, whoConsumedThr: 80,
  daysThrConsumed1Month: 3, quantityThrEveryDay: 25, thrMostLiked: 255, storeThrPacket: 100,
  quantityThrEveryDayOtherText: 255, storeThrPacketOtherText: 255,
  receivedOtherThr: 3, receivedOtherFoodAwc: 255, fedSolidOrSemisolidFood: 3, timesFedSolidOrSemisolidFood: 2,
  toldAboutUndernutritionTreatment: 3, referredToHealthFacility: 3, takenToHealthFacility: 3,
  reasonNotTakenToHealthFacility: 255, admittedToHealthFacility: 3, receivedMedicinesFromAnmOrMo: 3,
  consumedAntibiotics: 25, consumedDewormingMedicine: 25, consumedIronSyrup: 25, timesIronSyrupConsumed: 50,
  reasonLessIronSyrupConsumed: 255, consumedMultivitamin: 25, timesMultivitaminConsumed: 32,
  reasonLessMultivitaminConsumed: 75, awwHomeVisitsCount: 2, familyPresentDuringAwwVisit: 3,
  familyMembersPresentDuringAwwVisit: 50, awwCounselingToolsUsed: 255, ashaHomeVisitsCount: 2,
  familyPresentDuringAshaVisit: 3, familyMembersPresentDuringAshaVisit: 50, ashaCounselingToolsUsed: 255,
  recordedWeightAtAdmission: 6, recordedHeightLengthAtAdmission: 5, lastRecordedWeight: 6,
  lastRecordedHeightLength: 5, currentWeight: 6, currentHeightLength: 5, measurementMethod: 30,
  bilateralPittingOedema: 3, reasonNotMeasured: 255, relevantInfo: TEXT, responseMode: 10,
});

/** entity/HouseholdChecklist.java (bound directly as the request body). */
export const HOUSEHOLD_COLUMNS = Object.freeze({
  nameParticipant: 255, verbalConsent: 255, time: 255,
  state: 150, stateCode: 3, district: 150, districtCode: 3, block: 150, blockCode: 10,
  village: 150, villageCode: 10, clusterNumber: 2, structureCode: 2, householdNumber: 3,
  mobileNumber: 255, headOfHousehold: 255, numberOfChildren: 255, childrenStayingHh: 255,
  locationHousehold: TEXT, latitude: 255, longitude: 255, responseMode: 10,
});

/** UTF-8 size of a text, as MySQL counts a TEXT column. */
export function utf8Bytes(value) {
  if (value === undefined || value === null) return 0;
  let bytes = 0;
  for (const ch of String(value)) {
    const cp = ch.codePointAt(0);
    bytes += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
  }
  return bytes;
}

/** "caregiverName" → "Caregiver name", "current_wt" → "Current wt". */
export function fieldLabel(key) {
  const words = String(key).replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The value as the backend stores it in a String column (numbers as text); null for anything else. */
function storedText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

/** Error when `value` does not fit `limit`, else null. */
export function columnError(key, value, limit, label = fieldLabel(key)) {
  const text = storedText(value);
  if (text === null || limit === undefined || limit === null) return null;
  if (typeof limit === 'number') {
    const length = textLength(text);
    return length > limit ? `${label} can be at most ${limit} characters (currently ${length}).` : null;
  }
  const bytes = utf8Bytes(text);
  return bytes > limit.bytes ? `${label} is too long to store (${bytes} bytes; the limit is ${limit.bytes}).` : null;
}

/** { requestKey: message } for every value in `request` that does not fit its column. */
export function checkColumns(request, columns, { labels = {} } = {}) {
  const errors = {};
  if (!request) return errors;
  Object.entries(columns).forEach(([key, limit]) => {
    const error = columnError(key, request[key], limit, labels[key] || fieldLabel(key));
    if (error) errors[key] = error;
  });
  return errors;
}
