import * as XLSX from 'xlsx';
import ExcelMappingService from './ExcelMappingService';

const OTHER_TEXT_COLUMNS = [
  'primaryCaregiverOtherText', 'caregiversexOtherText', 'childSexOtherText',
  'weightNotMeasuredReasonOtherText', 'heightNotMeasuredReasonOtherText', 'childUndernourishedTypeOtherText',
  'reasonWtNotMeasuringOtherText', 'reasonHtNotMeasuringOtherText', 'reasonNotAssessingOtherText',
];

// Write rows the way the pages do and read the sheet back.
function roundTrip(rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.read(XLSX.write({ SheetNames: ['S'], Sheets: { S: ws } }, { type: 'array', bookType: 'xlsx' }), { type: 'array' });
  const sheet = wb.Sheets.S;
  return { sheet, aoa: XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) };
}

describe('Concurrent (bi-annual) template', () => {
  const base = {
    id: 7, stateCode: '09', districtCode: '005', blockCode: '0123', villageCode: '345',
    clusterCode: '01', structureCode: '02', householdNumber: '003',
    latitude: '21.1', longitude: '79.0', location: 'Ward 4, Patna',
    primaryCaregiver: 'Other', primaryCaregiverOtherText: 'Grandmother, maternal',
    reasonNotAssessingOtherText: 'Child asleep',
  };

  it('keeps every existing header in place and appends the address and nine Other details', () => {
    const [row] = ExcelMappingService.generateBiAnnualExcelData([base]);
    const headers = Object.keys(row);
    const appended = ['location', ...OTHER_TEXT_COLUMNS];
    expect(headers.slice(-appended.length)).toEqual(appended);
    expect(headers[headers.length - appended.length - 2]).toBe('latitude');
    expect(headers[headers.length - appended.length - 1]).toBe('longitude');
    expect(headers.slice(0, 4)).toEqual(['id', 'visitDate', 'submittedBy', 'submissionTime']);
    expect(row.location).toBe('Ward 4, Patna');
    expect(row.primaryCaregiver).toBe('Other');
    expect(row.primaryCaregiverOtherText).toBe('Grandmother, maternal');
    expect(row.reasonNotAssessingOtherText).toBe('Child asleep');
    expect(row.childSexOtherText).toBe('');
  });

  it('shows the stored Child ID and never fabricates one when it is blank', () => {
    const [blank, stored] = ExcelMappingService.generateBiAnnualExcelData([
      { ...base, childId: null },
      { ...base, childId: '005012334501020' },
    ]);
    expect(blank.childId).toBe('');
    expect(stored.childId).toBe('005012334501020');
  });

  it('writes codes and ids as text so leading zeros survive', () => {
    const rows = ExcelMappingService.generateBiAnnualExcelData([{ ...base, childId: '00501233450102' }]);
    const { sheet, aoa } = roundTrip(rows);
    const headers = aoa[0];
    const col = (name) => XLSX.utils.encode_col(headers.indexOf(name));
    expect(sheet[`${col('childId')}2`]).toMatchObject({ t: 's', v: '00501233450102' });
    expect(sheet[`${col('districtCode')}2`]).toMatchObject({ t: 's', v: '005' });
  });
});

describe('Complete Response → Routine Monitoring (nested sections flattened)', () => {
  const rmc = (overrides = {}) => ({
    state: 'Bihar', stateCode: '10', district: 'Patna', villageCode: '05', activityToObserve: 'Household/caregiver interaction',
    createdOn: '2026-11-27T05:00:00Z', createdBy: 's1@x.in', filledSectionsCount: 0, hasCbeData: false,
    aganwadiData: null, cbeData: null, vhsndData: null, householdData: null,
    ...overrides,
  });

  it('gives every section field its own prefixed column, with values exactly as stored', () => {
    const rows = ExcelMappingService.generateCompleteResponseData([
      rmc({
        activityToObserve: 'Aanganwadi Center',
        aganwadiData: { samChildrenTotal: '5', variationReason: 'Others - family moved, then returned' },
      }),
      rmc({
        householdData: {
          nameOfChild68: 'Asha', otherRegularFood: 'Ragi porridge, mashed banana',
          otherRegularFoodItem: 'Eggs', thrNotReceivedReasonChild: 'Stock out',
        },
      }),
      rmc({ cbeData: { themeOfCbe: 'Others - Home visit, with demonstration' } }),
    ], 'routine', { titles: { state: 'State' } });

    const [awc, hh, cbe] = rows;
    expect(awc['AWC - samChildrenTotal']).toBe('5');
    expect(awc['AWC - variationReason']).toBe('Others - family moved, then returned');
    expect(hh['HH - otherRegularFood']).toBe('Ragi porridge, mashed banana');
    expect(hh['HH - otherRegularFoodItem']).toBe('Eggs');
    expect(hh['HH - thrNotReceivedReasonChild']).toBe('Stock out');
    expect(cbe['CBE - themeOfCbe']).toBe('Others - Home visit, with demonstration');
    // Sections a record does not have are blank, not missing.
    expect(awc['HH - otherRegularFood']).toBe('');
    expect(hh['VHSND - vhsndVisitDay']).toBe('');
    // Top-level fields keep their titles; section objects are replaced by their columns.
    expect(awc.State).toBe('Bihar');
    expect(awc.villageCode).toBe('05');
    expect(Object.keys(awc)).not.toContain('aganwadiData');
    expect(awc.filledSectionsCount).toBe(0);
    expect(awc.hasCbeData).toBe(false);
    // Same headers, same order, for every row.
    expect(Object.keys(hh)).toEqual(Object.keys(awc));
  });

  it('has the same headers whether or not any selected record has a section', () => {
    const none = ExcelMappingService.generateCompleteResponseData([rmc()], 'routine');
    const some = ExcelMappingService.generateCompleteResponseData([rmc({ vhsndData: { vhsndVisitDay: 'Yes' } })], 'routine');
    expect(Object.keys(none[0])).toEqual(Object.keys(some[0]));
    ['AWC - samChildrenTotal', 'CBE - otherImportantObservation', 'VHSND - medicinesGivenCommunityLevel', 'HH - otherRegularFood']
      .forEach((h) => expect(Object.keys(none[0])).toContain(h));
  });

  it('keeps a section field the definitions do not know yet (appended after the known ones)', () => {
    const [row] = ExcelMappingService.generateCompleteResponseData(
      [rmc({ cbeData: { themeOfCbe: 'x', brandNewField: 'kept' } })], 'routine');
    const headers = Object.keys(row);
    expect(row['CBE - brandNewField']).toBe('kept');
    expect(headers.indexOf('CBE - brandNewField')).toBeGreaterThan(headers.indexOf('CBE - otherImportantObservation'));
    expect(headers.indexOf('CBE - brandNewField')).toBeLessThan(headers.indexOf('VHSND - vhsndVisitDay'));
  });
});

describe('Complete Response → Household / Follow-Up (stable headers)', () => {
  it('keeps a column for a field that is null in every selected row', () => {
    const rows = ExcelMappingService.generateCompleteResponseData([
      { id: 1, childId: '0050123450102003', locationHousehold: null, reverseGeocodedAddress: null, villageCode: '05' },
      { id: 2, childId: null, locationHousehold: null, villageCode: '345' },
    ], 'household', { titles: { childId: 'Child ID', villageCode: 'Village Code' } });
    const headers = Object.keys(rows[0]);
    expect(headers).toContain('locationHousehold');
    expect(headers).toContain('reverseGeocodedAddress');
    expect(headers).toContain('headOfHousehold'); // absent from both rows
    expect(rows[0]['Child ID']).toBe('0050123450102003');
    expect(rows[1]['Child ID']).toBe(''); // blank stays blank
    expect(rows[1]['Village Code']).toBe('345');
    expect(Object.keys(rows[1])).toEqual(headers);
  });

  it('gives identical headers for different selections', () => {
    const a = ExcelMappingService.generateCompleteResponseData([{ id: 1, mobileNumber: '9876543210' }], 'household');
    const b = ExcelMappingService.generateCompleteResponseData([{ id: 2, headOfHousehold: 'Ram' }], 'household');
    expect(Object.keys(a[0])).toEqual(Object.keys(b[0]));
  });

  it('writes ids and codes as text and formats date arrays', () => {
    const [row] = ExcelMappingService.generateCompleteResponseData(
      [{ id: 12, stateCode: 9, mobileNumber: 9876543210, date: [2026, 11, 7], numberOfChildren: 2 }], 'household');
    expect(row.ID).toBe('12');
    expect(row.stateCode).toBe('9');
    expect(row.Mobile).toBe('9876543210');
    expect(row['Survey Date']).toBe('2026-11-07');
    expect(row['No. of Children']).toBe(2);
  });

  it('appends the Follow-Up THR11 / THR13 Other details after every existing column', () => {
    const [row] = ExcelMappingService.generateCompleteResponseData([
      { id: 1, quantityThrEveryDay: 'Other', quantityThrEveryDayOtherText: 'Half packet', storeThrPacket: 'Other' },
    ], 'followup');
    const headers = Object.keys(row);
    expect(headers.slice(-2)).toEqual(['quantityThrEveryDayOtherText', 'storeThrPacketOtherText']);
    expect(row.quantityThrEveryDayOtherText).toBe('Half packet');
    expect(row.storeThrPacketOtherText).toBe('');
  });
});

// Header order of the Complete Response downloads BEFORE this change (release
// e4036cd: the generic mapper wrote each record's JSON keys in backend order,
// titled with the page's FIELD_TITLES). Existing reports depend on it: these
// columns must keep the same headers in the same order, with anything new after them.
const PREVIOUS_HOUSEHOLD_HEADERS = Object.freeze([
  'ID', 'Participant Name', 'Consent', 'Survey Date', 'time', 'State', 'stateCode', 'District',
  'districtCode', 'Block', 'blockCode', 'Village', 'Village Code', 'clusterNumber',
  'structureCode', 'householdNumber', 'Mobile', 'Head of HH', 'No. of Children',
  'childrenStayingHh', 'locationHousehold', 'latitude', 'longitude', 'locationAccuracyMeters',
  'locationCapturedAt', 'Child ID', 'responseMode', 'createdOn', 'createdBy',
]);

const PREVIOUS_FOLLOWUP_HEADERS = Object.freeze([
  'ID', 'visitDate', 'State', 'stateCode', 'District', 'districtCode', 'Block', 'blockCode',
  'Village', 'Village Code', 'icdsProject', 'childCode', 'latitude', 'longitude',
  'locationAccuracyMeters', 'locationCapturedAt', 'Child ID', 'nameOfRespondent',
  'sexOfRespondent', 'ageRespondent', 'educationRespondent', 'Child Name', 'childSex', 'childDob',
  'birthWeight', 'childAgeMonths', 'chronicMedicalCondition', 'chronicMedicalConditionSpecify',
  'childWeightLast1Month', 'weightMeasuredTimes', 'childHeightLast1Month', 'heightMeasuredTimes',
  'receivedThr', 'receivedThrMonthsCount', 'infoRecordsVerification', 'reasonNotReceivedThr',
  'receivedThrSam', 'quantityThrReceived', 'thrConsumed', 'reasonNotConsumed', 'whoConsumedThr',
  'daysThrConsumed1Month', 'quantityThrEveryDay', 'thrMostLiked', 'storeThrPacket',
  'receivedOtherThr', 'receivedOtherFoodAwc', 'fedSolidOrSemisolidFood',
  'timesFedSolidOrSemisolidFood', 'yesterdayFoodItemsConsumed', 'howToEnrichHomemadeFood',
  'toldAboutUndernutritionTreatment', 'referredToHealthFacility', 'takenToHealthFacility',
  'reasonNotTakenToHealthFacility', 'admittedToHealthFacility', 'receivedMedicinesFromAnmOrMo',
  'consumedAntibiotics', 'consumedDewormingMedicine', 'consumedIronSyrup',
  'timesIronSyrupConsumed', 'reasonLessIronSyrupConsumed', 'consumedMultivitamin',
  'timesMultivitaminConsumed', 'reasonLessMultivitaminConsumed', 'awwHomeVisitsCount',
  'familyPresentDuringAwwVisit', 'familyMembersPresentDuringAwwVisit', 'awwInformationDiscussed',
  'awwCounselingToolsUsed', 'ashaHomeVisitsCount', 'familyPresentDuringAshaVisit',
  'familyMembersPresentDuringAshaVisit', 'ashaInformationDiscussed', 'ashaCounselingToolsUsed',
  'recordedWeightAtAdmission', 'recordedHeightLengthAtAdmission', 'admissionMeasurementDate',
  'lastRecordedWeight', 'lastRecordedHeightLength', 'lastMeasurementDate', 'currentWeight',
  'currentHeightLength', 'measurementMethod', 'bilateralPittingOedema', 'reasonNotMeasured',
  'relevantInfo', 'responseMode', 'createdOn', 'createdBy',
]);

const PREVIOUS_RMC_HEADERS = Object.freeze([
  'State', 'stateCode', 'District', 'districtCode', 'Block', 'blockCode', 'Village',
  'Village Code', 'icdsProject', 'sector', 'awc', 'fieldMonitorName', 'dateVisit', 'latitude',
  'longitude', 'locationAccuracyMeters', 'locationCapturedAt', 'location', 'selectionCriteriaAwc',
  'activityToObserve', 'createdOn', 'createdBy', 'responseMode', 'isTestData',
  'filledSectionsCount', 'totalSectionsCount', 'hasAganwadiData', 'hasVhsndData', 'hasCbeData',
  'hasHouseholdData',
]);

describe('Complete Response keeps the previous header order', () => {
  // Records shaped like the API's JSON, in the backend's current serialization order
  // (new fields sit mid-entity there; the export must still append them).
  const household = {
    id: 1, nameParticipant: 'A', verbalConsent: 'Yes', date: '2026-11-27', time: '10:00', state: 'Bihar',
    stateCode: '10', district: 'Patna', districtCode: '005', block: 'Danapur', blockCode: '0123', village: 'Rampur',
    villageCode: '05', clusterNumber: '01', structureCode: '02', householdNumber: '003', mobileNumber: '9876543210',
    headOfHousehold: 'B', numberOfChildren: '1', childrenStayingHh: '1', locationHousehold: 'Ward 4',
    reverseGeocodedAddress: 'Danapur, Patna', latitude: '25.6', longitude: '85.1', locationAccuracyMeters: 12,
    locationCapturedAt: '2026-11-27T04:30:00Z', childId: '00501230501020003', responseMode: 'online',
    createdOn: '2026-11-27T04:31:00Z', createdBy: 's1@x.in',
  };

  it('Household: same headers in the same order, new address column appended', () => {
    const headers = Object.keys(ExcelMappingService.generateCompleteResponseData([household], 'household')[0]);
    expect(headers.slice(0, PREVIOUS_HOUSEHOLD_HEADERS.length)).toEqual([...PREVIOUS_HOUSEHOLD_HEADERS]);
    expect(headers.slice(PREVIOUS_HOUSEHOLD_HEADERS.length)).toEqual(['reverseGeocodedAddress']);
  });

  it('Follow-Up: same headers in the same order, THR11/THR13 details appended', () => {
    const headers = Object.keys(ExcelMappingService.generateCompleteResponseData([{ id: 1, storeThrPacket: 'x' }], 'followup')[0]);
    expect(headers.slice(0, PREVIOUS_FOLLOWUP_HEADERS.length)).toEqual([...PREVIOUS_FOLLOWUP_HEADERS]);
    expect(headers.slice(PREVIOUS_FOLLOWUP_HEADERS.length)).toEqual(['quantityThrEveryDayOtherText', 'storeThrPacketOtherText']);
  });

  it('Routine Monitoring: same top-level headers (section statistics included), then the section columns', () => {
    const headers = Object.keys(ExcelMappingService.generateCompleteResponseData([{ state: 'Bihar', aganwadiData: {} }], 'routine')[0]);
    expect(headers.slice(0, PREVIOUS_RMC_HEADERS.length)).toEqual([...PREVIOUS_RMC_HEADERS]);
    expect(headers[PREVIOUS_RMC_HEADERS.length]).toBe('AWC - samChildrenTotal');
  });
});
