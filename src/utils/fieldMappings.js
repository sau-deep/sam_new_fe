// Comprehensive field mappings for routine monitoring data export
// Maps backend field names to question numbers and display names

/**
 * Question number mappings for each section
 */
export const QUESTION_MAPPINGS = {
    // Section 1: General Information
    general: {
        'state': '1.1',
        'district': '1.2', 
        'block': '1.3',
        'icdsProject': '1.4',
        'sector': '1.5',
        'village': '1.6',
        'awc': '1.7',
        'fieldMonitorName': '1.8',
        'dateVisit': '1.9',
        'location': '1.10',
        'activityToObserve': '1.11'
    },
    
    // Section 2-4: Aanganwadi Center
    aganwadi: {
        'samChildrenTotal': '2.1',
        'samChildren06': '2.1.1',
        'samChildren65': '2.1.2',
        'cmamChildrenTotal': '2.2',
        'cmamChildren06': '2.2.1',
        'cmamChildren65': '2.2.2',
        'variationReason': '2.3',
        'weighingScale': '3.1',
        'salterScale': '3.2',
        'infantometer': '3.3',
        'stadiometer': '3.4',
        'supplementaryNutrition': '3.5',
        'registerAvailability': '3.6',
        'poshanTrackerUpdated': '3.7',
        'reasonPoshanTrackerNotUpdated': '3.8',
        'amoxycillinSyrup': '3.9.1',
        'folicAcidTablet': '3.9.2',
        'albendazole': '3.9.3',
        'vitA': '3.9.4',
        'ifaSyrup': '3.9.5',
        'multivitaminSyrup': '3.9.6',
        'zinc': '3.9.7',
        'ors': '3.9.8',
        'pcm': '3.9.9',
        'cmamTraining': '4.1',
        'cmamTrainingMonth': '4.2',
        'cmamTrainingDiscussed': '4.3',
        'dateChildMeasured': '4.4',
        'childSex': '4.5',
        'childAge': '4.6',
        'childWeight': '4.7',
        'childHeight': '4.8',
        'instrumentAww': '4.9',
        'measurementFollowedStep': '4.10',
        'measurementFollowedStep1': '4.10.1',
        'measurementFollowedStep2': '4.10.2', 
        'measurementFollowedStep3': '4.10.3',
        'childWeightAww': '4.11',
        'childWeightFieldMonitor': '4.12',
        'childHeightInstrument': '4.13',
        'childHeightSteps': '4.14',
        'childHeightSteps1': '4.14.1',
        'childHeightSteps2': '4.14.2',
        'childHeightAww': '4.15',
        'childHeightFieldMonitor': '4.16',
        'classifyWastingAww': '4.17',
        'nutritionalStatusXScorecard': '4.18',
        'screeningSamChildren': '4.19',
        'appetiteTestFood': '4.20',
        'nutritionalOedema': '4.21',
        'childNrcMtc': '4.22',
        'childFollowupCmam': '4.23',
        'activitiesFollowupCmam': '4.24'
    },
    
    // Section 5: CBE Session
    cbe: {
        'themeOfCbe': '5.1',
        'typeOfBeneficiaryAttendedCbe': '5.2',
        'serviceProvidersPresentCbe': '5.3',
        'groupCounsellingConducted': '5.4',
        'counsellingTopicsCbe': '5.5',
        'counsellingAidsUsed': '5.6',
        'otherImportantObservation': '5.7'
    },
    
    // Section 6-7: VHSND Session
    vhsnd: {
        'vhsndVisitDay': '6.1',
        'physicalExamSam': '6.2',
        'testConductedSam': '6.3',
        'vhsndMedicalComplication': '6.4',
        'vhsndAppetiteTestConducted': '6.5',
        'childReferralNrc': '6.6',
        'motherAgreeNrc': '6.7',
        'motherNotAgreeReason': '6.8',
        'childEnrolledCmam': '6.9',
        'vhsndAmoxycillin': '6.10',
        'vhsndFolicAcidTablet': '6.11',
        'vhsndAlbendazole': '6.12',
        'vhsndIfaSyrup': '6.13',
        'vhsndVitA': '6.14',
        'vhsndMultivitaminSyrup': '6.15',
        'vhsndZinc': '6.16',
        'vhsndOrs': '6.17',
        'vhsndPcm': '6.18',
        'firstDoseAmoxicillin': '6.19',
        'motherAmoxicillin': '6.20',
        'motherAmoxicillinCounselled': '6.21',
        'childFolic': '6.22',
        'albendazoleGuidelines': '6.23',
        'vitAEnrolement': '6.24',
        'firstDoseMultivit': '6.25',
        'motherMultivitamin': '6.26',
        'motherCounsel': '6.27',
        'motherThr': '6.28',
        'motherGivenMessage': '6.29',
        'counsellingAids': '6.22',
        'childDischargedCmam': '6.31',
        'cmamTraining': '7.1',
        'cmamTrainingMonth': '7.2',
        'confirmChildSam': '7.3',
        'assessingMedicalComplication': '7.4',
        'childSamReferredNrc': '7.5',
        'medicinesGivenCommunityLevel': '7.6',
        'appetiteTestMedicines': '7.7',
        'oedemaCheckSteps': '7.8',
        'wastingWithOedema': '7.9',
        'medicalComplications': '7.10',
        'appetiteTestFailNoComplications': '7.11',
        'bilateralPittingOedema': '7.12',
        'medicalComplicationDuringCmam': '7.13',
        'appetiteTestFailFollowUp': '7.14',
        'weightLossNoGainFollowUp': '7.15',
        'complicationsTwoFollowUps': '7.16',
        'followUpFrequency': '7.17',
        'followUpActivities': '7.18'
    },
    
    // Section 8-11: Household
    household: {
        'nameOfChild': '8.1',
        'currentAgeMonths': '8.2',
        'sexOfChild': '8.3',
        'currentFollowupOrRecovered': '8.4',
        'childCardRecordAvailability': '8.5',
        'typeOfRecordAvailable': '8.6',
        'lastWeighedDate': '8.7',
        'lastMeasuredHeightDate': '8.8',
        'whoMeasuredChild': '8.9',
        'awwVisitsPastMonth': '8.10',
        'awwActionsDuringVisit': '8.11',
        'frequencyOfWeightMeasurement': '8.12',
        'anmMedicineAtEnrollment': '8.13',
        'medicinesConsumedDuringTreatment': '8.14',
        'childConsumeAntibioticFiveDays': '8.15',
        'thrReceivedFromAwc': '8.16',
        'thrNotReceivedReason_child': '8.17',
        'recordForVerification': '8.18',
        'qtyThrReceivedPastMonth': '8.19',
        'childConsumeThr': '8.20',
        'childNotConsumeThr': '8.21',
        'whoConsumeThr': '8.22',
        'daysThrConsumeChild': '8.23',
        'daysThrPrepareChild': '8.24',
        'storeThr': '8.25',
        'counsellingOnHomeFood': '8.26',
        'counsellingAdviceReceive': '8.27',
        'nameOfChild06': '9.1',
        'sexOfChild06': '9.2',
        'currentAgeMonths06': '9.3',
        'breastfedInLast24Hours': '9.4',
        'foodsOrDrinksReceived': '9.5',
        'reasonsNotExclusivelyBreastfed': '9.6',
        'breastfedPerDay': '9.7',
        'breastfedPerNight': '9.8',
        'bottleUsedToFeedMilk': '9.9',
        'awwHomeVisitsLast4Weeks': '9.10',
        'ashaHomeVisitsLast4Weeks': '9.11',
        'anmHomeVisitsLast4Weeks': '9.12',
        'receieveAdviceFeeding': '9.13',
        'adviceReceive': '9.14',
        'childWeighedAwc': '9.15',
        'childWeighedAware': '9.16',
        'childWeighedLastAwc': '9.17',
        'childGrowingWell': '9.18',
        'nameOfChild68': '10.1',
        'sexOfChild68': '10.2',
        'currentAgeMonths68': '10.3',
        'startedTakingFoodOtherThanBreastmilk': '10.4',
        'ageStartedFoodOtherThanBreastmilk': '10.5',
        'breastfedYesterday': '10.6',
        'breastfedTimesYesterday': '10.7',
        'fedFoodTimesYesterday': '10.8',
        'foodConsistencyCorrect': '10.9',
        'thrReceivedPastMonth': '10.10',
        'thrNotReceivedReason': '10.11',
        'thrReceivedDays': '10.12',
        'thrQtyReceived': '10.13',
        'thrConsumed': '10.14',
        'reasonNotConsumedThr': '10.15',
        'thrConsumedBy': '10.16',
        'thrConsumedDays': '10.17',
        'qtyPrepareFood': '10.18',
        'thrStore': '10.19',
        'awwVisitsLast4Weeks': '10.20',
        'ashaVisitsLast4Weeks': '10.21',
        'anmVisitsLast4Weeks': '10.22',
        'receivedFeedingAdvice': '10.23',
        'adviceReceived': '10.24',
        'ifaSyrupReceivedLastWeek': '10.25',
        'childWeighedAtAwc': '10.26',
        'awareWeightChild': '10.27',
        'isChildGrowingWell': '10.28',
        'childFullName': '11.1',
        'childGender': '11.2',
        'childAgeInMonths': '11.3',
        'breastfedTimesIn24Hrs': '11.4',
        'fedFoodTimesIn24Hrs': '11.5',
        'typeOfFeedingAdvice': '11.6'
    }
};

/**
 * Multiple choice field configurations with backend field names mapped to display names
 */
export const MULTIPLE_CHOICE_FIELDS = {
    // Section 2-4: Aanganwadi Center
    aganwadi: {
        'variationReason': {
            options: [
                'vhndVisitDidNotHappen',
                'childNotAvailableDuringVisit', 
                'familyNotWillingToEnroll',
                'childReferredToNRCMTC',
                'childBetween0to6Months',
                'notApplicable',
                'other'
            ],
            displayNames: {
                'vhndVisitDidNotHappen': 'VHND / ANM visit did not happen after identification',
                'childNotAvailableDuringVisit': 'Child was not available during VHND / ANM visit',
                'familyNotWillingToEnroll': 'Family is not willing to get the child checked and enrolled',
                'childReferredToNRCMTC': 'Child referred to NRC/MTC',
                'childBetween0to6Months': 'Child between 0-6 Month',
                'notApplicable': 'Not applicable',
                'other': 'Others'
            }
        },
        'reasonPoshanTrackerNotUpdated': {
            options: [
                'growthMonitoringNotCompleted',
                'mobileDeviceNotFunctional',
                'unableToOperateDevice',
                'connectivityIssues',
                'other'
            ],
            displayNames: {
                'growthMonitoringNotCompleted': 'Growth monitoring could not be completed for all children',
                'mobileDeviceNotFunctional': 'Mobile device not functional',
                'unableToOperateDevice': 'Unable to operate the mobile device / application',
                'connectivityIssues': 'Connectivity issues',
                'other': 'Others'
            }
        },
        'measurementFollowedStep': {
            options: [
                'scaleKeptFlatSurface',
                'zeroErrorChecked', 
                'childWeighedMinimumClothes',
                'awwReadMeasurementsCorrectly',
                'scaleWasHangingCorrectly',
                'notFollowedAnySteps'
            ],
            displayNames: {
                'scaleKeptFlatSurface': 'Scale kept at flat surface',
                'zeroErrorChecked': 'Zero error of the machine was checked',
                'childWeighedMinimumClothes': 'Child weighed with minimum clothes', 
                'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
                'scaleWasHangingCorrectly': 'Scale was hanging correctly',
                'notFollowedAnySteps': 'Not followed any of the above steps'
            }
        },
        'measurementFollowedStep1': {
            options: [
                'scaleKeptFlatSurface',
                'zeroErrorChecked',
                'childWeighedMinimumClothes',
                'awwReadMeasurementsCorrectly',
                'notFollowedAnySteps'
            ],
            displayNames: {
                'scaleKeptFlatSurface': 'Scale kept at flat surface',
                'zeroErrorChecked': 'Zero error of the machine was checked',
                'childWeighedMinimumClothes': 'Child weighed with minimum clothes',
                'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
                'notFollowedAnySteps': 'Not followed any of the above steps'
            }
        },
        'measurementFollowedStep2': {
            options: [
                'scaleKeptFlatSurface',
                'zeroErrorChecked',
                'childWeighedMinimumClothes',
                'awwReadMeasurementsCorrectly',
                'notFollowedAnySteps'
            ],
            displayNames: {
                'scaleKeptFlatSurface': 'Scale kept at flat surface',
                'zeroErrorChecked': 'Zero error of the machine was checked',
                'childWeighedMinimumClothes': 'Child weighed with minimum clothes',
                'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
                'notFollowedAnySteps': 'Not followed any of the above steps'
            }
        },
        'measurementFollowedStep3': {
            options: [
                'scaleWasHangingCorrectly',
                'zeroErrorChecked',
                'childWeighedMinimumClothes',
                'awwReadMeasurementsCorrectly',
                'notFollowedAnySteps'
            ],
            displayNames: {
                'scaleWasHangingCorrectly': 'Scale was hanging correctly',
                'zeroErrorChecked': 'Zero error of the machine was checked',
                'childWeighedMinimumClothes': 'Child weighed with minimum clothes',
                'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
                'notFollowedAnySteps': 'Not followed any of the above steps'
            }
        },
        'childHeightSteps': {
            options: [
                'scaleKeptFlatSurface',
                'childShoesSocksRemoved',
                'backButtockBackOfKneeTouchingBoard',
                'headTouchingHeadPiece',
                'childKneeStraight',
                'awwTookHelpMother',
                'awwReadMeasurementsCorrectly',
                'notFollowedAnySteps'
            ],
            displayNames: {
                'scaleKeptFlatSurface': 'Scale kept at flat surface',
                'childShoesSocksRemoved': 'Child\'s shoes and socks were removed for accurate measurement',
                'backButtockBackOfKneeTouchingBoard': 'Child\'s back, buttock and back of knee were touching the board',
                'headTouchingHeadPiece': 'Head of the child was touching the head piece',
                'childKneeStraight': 'Child\'s knee was straight',
                'awwTookHelpMother': 'AWW took the help of mother/AWH to hold the child in correct position',
                'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
                'notFollowedAnySteps': 'Not followed any of the above steps'
            }
        },
        'childHeightSteps1': {
            options: [
                'scaleKeptFlatSurface',
                'headAndFootTouchingPieces',
                'childKneeStraight',
                'awwTookHelpMother',
                'awwReadMeasurementsCorrectly',
                'notFollowedAnySteps'
            ],
            displayNames: {
                'scaleKeptFlatSurface': 'Scale was kept on flat surface',
                'headAndFootTouchingPieces': 'Head and foot of the child was touching the head piece and foot piece, respectively',
                'childKneeStraight': 'Child\'s knee was straight',
                'awwTookHelpMother': 'AWW took the help of mother/AWH to hold the child in correct position',
                'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
                'notFollowedAnySteps': 'Not followed any of the above steps'
            }
        },
        'childHeightSteps2': {
            options: [
                'scaleKeptFlatSurface',
                'childShoesSocksRemoved',
                'backButtockBackOfKneeTouchingBoard',
                'headTouchingHeadPiece',
                'childKneeStraight',
                'awwTookHelpMother',
                'awwReadMeasurementsCorrectly',
                'notFollowedAnySteps'
            ],
            displayNames: {
                'scaleKeptFlatSurface': 'Scale kept at flat surface',
                'childShoesSocksRemoved': 'Child\'s shoes and socks were removed for accurate measurement',
                'backButtockBackOfKneeTouchingBoard': 'Child\'s back, buttock and back of knee were touching the board',
                'headTouchingHeadPiece': 'Head of the child was touching the head piece',
                'childKneeStraight': 'Child\'s knee was straight',
                'awwTookHelpMother': 'AWW took the help of mother/AWH to hold the child in correct position',
                'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
                'notFollowedAnySteps': 'Not followed any of the above steps'
            }
        },
        'appetiteTestFood': {
            options: [
                'takeRationRoutine',
                'takeHomeRationEnhanced',
                'hotCookedMeal',
                'hotCookedMealAWW',
                'basedOnDietHistory',
                'dontKnow',
                'other'
            ],
            displayNames: {
                'takeRationRoutine': 'Take Home Ration – routine',
                'takeHomeRationEnhanced': 'Take Home Ration – enhanced for SAM child',
                'hotCookedMeal': 'Hot cooked meal prepared by the mother',
                'hotCookedMealAWW': 'Hot cooked meal prepared by AWW / SHG',
                'basedOnDietHistory': 'Based on diet history',
                'dontKnow': 'Don\'t know',
                'other': 'Others'
            }
        },
        'nutritionalOedema': {
            options: [
                'assessmentDoneRemovingSocksShoes',
                'assessmentOedemaBothFeet',
                'pressedBothFeetThreeSeconds',
                'lookedFeltPits',
                'dontKnow'
            ],
            displayNames: {
                'assessmentDoneRemovingSocksShoes': 'Assessment done by removing socks and shoes',
                'assessmentOedemaBothFeet': 'Assessment of oedema done by pressing both the feet simultaneously',
                'pressedBothFeetThreeSeconds': 'Pressed both the feet for at least 3 seconds',
                'lookedFeltPits': 'Looked and felt for pits on both the feet',
                'dontKnow': 'Don\'t know'
            }
        },
        'childNrcMtc': {
            options: [
                'identifiedWithMedicalComplications',
                'identifiedWithoutComplicationsFailedAppetite',
                'passedAppetiteTestNoComplications',
                'identifiedBilateralPittingEdema',
                'developsMedicalComplicationDuringCMAM',
                'failsAppetiteTestDuringFollowUp',
                'noWeightGainTwoConsecutiveFollowUps',
                'complicationsTwoConsecutiveFollowUps',
                'dontKnow'
            ],
            displayNames: {
                'identifiedWithMedicalComplications': 'Identified with medical complications',
                'identifiedWithoutComplicationsFailedAppetite': 'Identified without medical complications but the child failed in the appetite test',
                'passedAppetiteTestNoComplications': 'Child has passed the appetite test and has no medical complications',
                'identifiedBilateralPittingEdema': 'Identified with bilateral pitting edema',
                'developsMedicalComplicationDuringCMAM': 'Child develops any medical complication during the CMAM treatment in community',
                'failsAppetiteTestDuringFollowUp': 'Child fails in the appetite test/reports poor feeding during community level follow up in any CMAM session/clinic',
                'noWeightGainTwoConsecutiveFollowUps': 'Child does not gain weight or loses weight in two consecutive follow-ups during the CMAM treatment in community',
                'complicationsTwoConsecutiveFollowUps': 'Child develops any complication during two consecutive follow-ups during the CMAM treatment in community',
                'dontKnow': 'Don\'t know'
            }
        },
        'activitiesFollowupCmam': {
            options: [
                'anthropometricAssessment',
                'assessmentOfOedema',
                'askingMedicalComplicationSymptoms',
                'entriesTreatmentCardRegister',
                'checkingWeightChangePrevious',
                'providingMedicinesIfAny',
                'providingTHRATHR',
                'stateSpecificFoodSupplement',
                'individualCounsellingMothers',
                'linkagePDSGovernmentSchemes',
                'assessmentCounselingFood',
                'dontKnow'
            ],
            displayNames: {
                'anthropometricAssessment': 'Anthropometric assessment',
                'assessmentOfOedema': 'Assessment of oedema',
                'askingMedicalComplicationSymptoms': 'Asking for any symptoms / signs of medical complications',
                'entriesTreatmentCardRegister': 'Entries in the treatment card / register',
                'checkingWeightChangePrevious': 'Checking for change in weight compared to previous week / month',
                'providingMedicinesIfAny': 'Providing medicines if any',
                'providingTHRATHR': 'Providing THR/A-THR',
                'stateSpecificFoodSupplement': 'Any other state specific food supplement for SAM child (eg: Egg, Milk etc.)',
                'individualCounsellingMothers': 'Individual counselling of mothers on child\'s progress and action required',
                'linkagePDSGovernmentSchemes': 'Linkage with PDS and other government schemes for children and mothers',
                'assessmentCounselingFood': 'Assessment and counseling about food',
                'dontKnow': 'Don\'t know'
            }
        }
    },
    
    // Section 5: CBE Session
    cbe: {
        'typeOfBeneficiaryAttendedCbe': {
            options: [
                'pregnantWomen',
                'lactatingWomen',
                'infants6To8MonthsAndMothers',
                'infants9To12MonthsAndMothers',
                'mothersOfChildren1To3Years',
                'mothersOfChildren3To6Years',
                'elderWomenInLaws',
                'husbandsOfChildren',
                'otherMaleMembers',
                'other'
            ],
            displayNames: {
                'pregnantWomen': 'Pregnant women',
                'lactatingWomen': 'Lactating women',
                'infants6To8MonthsAndMothers': 'Infants 6-8 months and mothers',
                'infants9To12MonthsAndMothers': 'Infants 9-12 months and mothers',
                'mothersOfChildren1To3Years': 'Mothers of children 1-3 years',
                'mothersOfChildren3To6Years': 'Mothers of children 3-6 years',
                'elderWomenInLaws': 'Elder women / in-laws',
                'husbandsOfChildren': 'Husbands of children',
                'otherMaleMembers': 'Other male members',
                'other': 'Others'
            }
        },
        'serviceProvidersPresentCbe': {
            options: ['asha', 'anm', 'other'],
            displayNames: {
                'asha': 'ASHA',
                'anm': 'ANM',
                'other': 'Others'
            }
        },
        'counsellingTopicsCbe': {
            options: [
                'breastfeedingImportance',
                'breastfeedingFrequency',
                'breastfeedingPositionAttachment',
                'breastfeedingSignsAdequateFeeding',
                'importanceExclusiveBreastfeeding',
                'complementaryFeedingWhenToStart',
                'complementaryFeedingFrequency',
                'complementaryFeedingConsistency',
                'complementaryFeedingAgeAppropriateQuantity',
                'complementaryFeedingDietaryDiversity',
                'complementaryFeedingDuringAfterIllness',
                'complementaryFeedingResponsiveFeeding',
                'stimulationActivitiesPlayTherapy',
                'useTakeHomeRationPreparationTips',
                'feedingDemonstrationTHR',
                'regularGrowthMonitoringImportance',
                'nutritionStatusOfChildren',
                'whatIsUndernutritionSevereSAM',
                'consequencesUndernutritionForChild',
                'gettingReadyPreschoolAWC',
                'healthyDietChildrenGeneral',
                'importanceHandWashSanitation',
                'ifaSupplementationChildren',
                'vitaminASupplementationChildren',
                'dewormingForChildren',
                'careDuringPregnancyPreparedness',
                'nutritionCarePregnancyLactation',
                'ifaSupplementationPregnancyLactation',
                'calciumSupplementationPregnancyLactation',
                'anemiaPreventionAdolescentsIFA',
                'lowBirthWeightChildrenFollowUp',
                'vaccinationOfChild',
                'vaccinationOfMother',
                'careOfSickChildDiarrheaFever',
                'other'
            ],
            displayNames: {
                'breastfeedingImportance': 'Breastfeeding importance',
                'breastfeedingFrequency': 'Breastfeeding frequency',
                'breastfeedingPositionAttachment': 'Breastfeeding position attachment',
                'breastfeedingSignsAdequateFeeding': 'Breastfeeding signs adequate feeding',
                'importanceExclusiveBreastfeeding': 'Importance exclusive breastfeeding',
                'complementaryFeedingWhenToStart': 'Complementary feeding when to start',
                'complementaryFeedingFrequency': 'Complementary feeding frequency',
                'complementaryFeedingConsistency': 'Complementary feeding consistency',
                'complementaryFeedingAgeAppropriateQuantity': 'Complementary feeding age appropriate quantity',
                'complementaryFeedingDietaryDiversity': 'Complementary feeding dietary diversity',
                'complementaryFeedingDuringAfterIllness': 'Complementary feeding during after illness',
                'complementaryFeedingResponsiveFeeding': 'Complementary feeding responsive feeding',
                'stimulationActivitiesPlayTherapy': 'Stimulation activities play therapy',
                'useTakeHomeRationPreparationTips': 'Use take home ration preparation tips',
                'feedingDemonstrationTHR': 'Feeding demonstration THR',
                'regularGrowthMonitoringImportance': 'Regular growth monitoring importance',
                'nutritionStatusOfChildren': 'Nutrition status of children',
                'whatIsUndernutritionSevereSAM': 'What is undernutrition severe SAM',
                'consequencesUndernutritionForChild': 'Consequences undernutrition for child',
                'gettingReadyPreschoolAWC': 'Getting ready preschool AWC',
                'healthyDietChildrenGeneral': 'Healthy diet children general',
                'importanceHandWashSanitation': 'Importance hand wash sanitation',
                'ifaSupplementationChildren': 'IFA supplementation children',
                'vitaminASupplementationChildren': 'Vitamin A supplementation children',
                'dewormingForChildren': 'Deworming for children',
                'careDuringPregnancyPreparedness': 'Care during pregnancy preparedness',
                'nutritionCarePregnancyLactation': 'Nutrition care pregnancy lactation',
                'ifaSupplementationPregnancyLactation': 'IFA supplementation pregnancy lactation',
                'calciumSupplementationPregnancyLactation': 'Calcium supplementation pregnancy lactation',
                'anemiaPreventionAdolescentsIFA': 'Anemia prevention adolescents IFA',
                'lowBirthWeightChildrenFollowUp': 'Low birth weight children follow up',
                'vaccinationOfChild': 'Vaccination of child',
                'vaccinationOfMother': 'Vaccination of mother',
                'careOfSickChildDiarrheaFever': 'Care of sick child diarrhea fever',
                'other': 'Others'
            }
        },
        'counsellingAidsUsed': {
            options: [
                'mcpCard',
                'poshanTrackerAppResources',
                'individualGrowthChart',
                'communityGrowthChart',
                'ilaModuleTakeAway',
                'cmamBookResources',
                'otherTechEnabledResource',
                'nothing',
                'other'
            ],
            displayNames: {
                'mcpCard': 'MCP card',
                'poshanTrackerAppResources': 'Poshan Tracker app resources',
                'individualGrowthChart': 'Individual growth chart',
                'communityGrowthChart': 'Community growth chart',
                'ilaModuleTakeAway': 'ILA module take away',
                'cmamBookResources': 'CMAM book resources',
                'otherTechEnabledResource': 'Other tech enabled resource',
                'nothing': 'Nothing',
                'other': 'Others'
            }
        }
    },
    
    // Section 6-7: VHSND Session
    vhsnd: {
        'testConductedSam': {
            options: [
                'askedHistoryIllnessSymptoms',
                'askedChildEatingFood',
                'heartRate',
                'temperature',
                'checkedSignsAnemia',
                'haemoglobinTest',
                'respiratoryRate',
                'chestIndrawing',
                'dehydration',
                'oedema',
                'other'
            ],
            displayNames: {
                'askedHistoryIllnessSymptoms': 'Asked history of illness / symptoms',
                'askedChildEatingFood': 'Asked if child is eating food at home',
                'heartRate': 'Heart rate',
                'temperature': 'Temperature',
                'checkedSignsAnemia': 'Checked for signs of anemia (pallor)',
                'haemoglobinTest': 'Haemoglobin test',
                'respiratoryRate': 'Respiratory rate',
                'chestIndrawing': 'Chest indrawing',
                'dehydration': 'Dehydration',
                'oedema': 'Oedema',
                'other': 'Others'
            }
        },
        'motherNotAgreeReason': {
            options: [
                'careOfSiblings',
                'lossOfLivelihood',
                'notAllowedByFamily',
                'nrcFarFromHome',
                'transportSupportNotAvailable',
                'other'
            ],
            displayNames: {
                'careOfSiblings': 'Care of siblings',
                'lossOfLivelihood': 'Loss of livelihood',
                'notAllowedByFamily': 'Not allowed by husband/other family member',
                'nrcFarFromHome': 'NRC far from home',
                'transportSupportNotAvailable': 'Transport support not available',
                'other': 'Others'
            }
        },
        'motherGivenMessage': {
            options: [
                'breastfeeding',
                'continuingBreastfeedingBelowTwoYears',
                'complementaryFeeding',
                'feedingThrAtHome',
                'augmentationOfHomeFoods',
                'importantMessagesOnAugmentedThr',
                'expectedWeightGain',
                'needForRegularFollowUp',
                'careOfSickChild',
                'feedingInDifficultSituations',
                'roleOfNutritionDuringLifeCycle',
                'nutritionDuringAdolescence',
                'relationshipBetweenFamilySize',
                'sanitationAndHygienePractices',
                'notCounselled',
                'other'
            ],
            displayNames: {
                'breastfeeding': 'Breastfeeding',
                'continuingBreastfeedingBelowTwoYears': 'Continuing breastfeeding if child below two years',
                'complementaryFeeding': 'Complementary feeding',
                'feedingThrAtHome': 'Feeding THR at home',
                'augmentationOfHomeFoods': 'Augmentation of home foods',
                'importantMessagesOnAugmentedThr': 'Important messages on augmented THR',
                'expectedWeightGain': 'Expected weight gain',
                'needForRegularFollowUp': 'Need for regular follow up for growth monitoring',
                'careOfSickChild': 'Care of a sick child',
                'feedingInDifficultSituations': 'Feeding in difficult situations',
                'roleOfNutritionDuringLifeCycle': 'Role of nutrition during life cycle',
                'nutritionDuringAdolescence': 'Nutrition during adolescence, pregnancy, lactation, and breastfeeding',
                'relationshipBetweenFamilySize': 'Relationship between family size and malnutrition',
                'sanitationAndHygienePractices': 'Sanitation and hygiene practices',
                'notCounselled': 'Not counselled',
                'other': 'Others'
            }
        },
        'counsellingAids': {
            options: [
                'mcpCard',
                'poshanTrackerAppResources',
                'individualGrowthChart',
                'communityGrowthChart',
                'ilaModuleTakeAway',
                'cmamBookResources',
                'otherTechEnabledResource',
                'nothing',
                'other'
            ],
            displayNames: {
                'mcpCard': 'MCP Card',
                'poshanTrackerAppResources': 'Poshan Tracker app resources',
                'individualGrowthChart': 'Individual growth chart',
                'communityGrowthChart': 'Community growth chart',
                'ilaModuleTakeAway': 'ILA module take away',
                'cmamBookResources': 'CMAM book resources',
                'otherTechEnabledResource': 'Other tech enabled resource',
                'nothing': 'Nothing',
                'other': 'Others'
            }
        },
        'assessingMedicalComplication': {
            options: [
                'symptomsCough',
                'symptomsFever',
                'symptomsDiarrhea',
                'symptomsVomiting',
                'skinInfection',
                'respiratoryDistress',
                'other'
            ],
            displayNames: {
                'symptomsCough': 'Symptoms – cough',
                'symptomsFever': 'Symptoms – fever',
                'symptomsDiarrhea': 'Symptoms – diarrhea',
                'symptomsVomiting': 'Symptoms – vomiting',
                'skinInfection': 'Skin infection',
                'respiratoryDistress': 'Respiratory distress',
                'other': 'Others'
            }
        },
        'childSamReferredNrc': {
            options: [
                'respiratoryRate50',
                'respiratoryRate60',
                'other'
            ],
            displayNames: {
                'respiratoryRate50': 'Respiratory rate ≥50 /minute for children aged 6 month to 1 year',
                'respiratoryRate60': 'Respiratory rate ≥60 /minute for children aged 1-5 years',
                'other': 'Others'
            }
        },
        'medicinesGivenCommunityLevel': {
            options: [
                'amoxycillin',
                'folicAcidTablet',
                'other'
            ],
            displayNames: {
                'amoxycillin': 'Amoxycillin',
                'folicAcidTablet': 'Folic acid tablet',
                'other': 'Others'
            }
        },
        'appetiteTestMedicines': {
            options: [
                'amoxycillinSyrup',
                'folicAcidTablet',
                'albendazole',
                'vitaminA',
                'ifaSyrup',
                'multivitaminSyrup',
                'zinc',
                'oralRehydrationSalt',
                'paracetamol',
                'other'
            ],
            displayNames: {
                'amoxycillinSyrup': 'Amoxycillin syrup/tablet',
                'folicAcidTablet': 'Folic acid tablet',
                'albendazole': 'Albendazole tablet',
                'vitaminA': 'Vitamin A',
                'ifaSyrup': 'IFA syrup',
                'multivitaminSyrup': 'Multivitamin syrup',
                'zinc': 'Zinc',
                'oralRehydrationSalt': 'Oral rehydration salt (ORS)',
                'paracetamol': 'Paracetamol (PCM)',
                'other': 'Others'
            }
        },
        'oedemaCheckSteps': {
            options: [
                'assessmentDoneRemovingSocksShoes',
                'assessmentOedemaBothFeet',
                'pressedBothFeetThreeSeconds',
                'lookedFeltPits',
                'other'
            ],
            displayNames: {
                'assessmentDoneRemovingSocksShoes': 'Assessment done by removing socks and shoes',
                'assessmentOedemaBothFeet': 'Assessment of oedema done by pressing both the feet simultaneously',
                'pressedBothFeetThreeSeconds': 'Pressed both the feet for at least 3 seconds',
                'lookedFeltPits': 'Looked and felt for pits on both the feet',
                'other': 'Others'
            }
        },
        'followUpActivities': {
            options: [
                'anthropometricAssessment',
                'assessmentOfOedema',
                'askingMedicalComplicationSymptoms',
                'entriesTreatmentCardRegister',
                'checkingWeightChangePrevious',
                'providingMedicinesIfAny',
                'providingTHRATHR',
                'stateSpecificFoodSupplement',
                'individualCounsellingMothers',
                'linkagePDSGovernmentSchemes',
                'assessmentCounselingFood',
                'other'
            ],
            displayNames: {
                'anthropometricAssessment': 'Anthropometric assessment',
                'assessmentOfOedema': 'Assessment of oedema',
                'askingMedicalComplicationSymptoms': 'Asking for any symptoms / signs of medical complications',
                'entriesTreatmentCardRegister': 'Entries in the treatment card / register',
                'checkingWeightChangePrevious': 'Checking for change in weight compared to previous week / month',
                'providingMedicinesIfAny': 'Providing medicines if any',
                'providingTHRATHR': 'Providing THR/A-THR',
                'stateSpecificFoodSupplement': 'Any other state specific food supplement for SAM child',
                'individualCounsellingMothers': 'Individual counselling of mothers',
                'linkagePDSGovernmentSchemes': 'Linkage with PDS and other government schemes',
                'assessmentCounselingFood': 'Assessment and counseling about food',
                'other': 'Others'
            }
        }
    },
    
    // Section 8-11: Household Visit
    household: {
        // Section 8 fields
        'whoMeasuredChild': {
            options: ['AWW', 'ASHA', 'ANM'],
            displayNames: {
                'AWW': 'AWW',
                'ASHA': 'ASHA',
                'ANM': 'ANM'
            }
        },
        'awwActionsDuringVisit': {
            options: [
                'enquiredAboutAnyHealthIssuesInTheChildSymptomsSigns',
                'weighedTheChild',
                'enquiredAboutConsumptionOfMedicineAndSupplementByTheChild',
                'checkedForThePacketsOfTHR',
                'counselledOnUseOfTHR',
                'counselledOnEnrichingHomeFoodForTheChild',
                'counselledOtherFamilyMembersIncludingInLawsHusbandAndOthers',
                'nothing',
                'counselledOnAnyOtherTopic'
            ],
            displayNames: {
                'enquiredAboutAnyHealthIssuesInTheChildSymptomsSigns': 'Enquired about any health issues in the child',
                'weighedTheChild': 'Weighed the child',
                'enquiredAboutConsumptionOfMedicineAndSupplementByTheChild': 'Enquired about consumption of medicine and supplement by the child',
                'checkedForThePacketsOfTHR': 'Checked for the packets of THR',
                'counselledOnUseOfTHR': 'Counselled on use of THR',
                'counselledOnEnrichingHomeFoodForTheChild': 'Counselled on enriching home food for the child',
                'counselledOtherFamilyMembersIncludingInLawsHusbandAndOthers': 'Counselled other family members',
                'nothing': 'Nothing',
                'counselledOnAnyOtherTopic': 'Counselled on any other topic'
            }
        },
        'medicinesConsumedDuringTreatment': {
            options: [
                'Amoxycillin',
                'IFA Syrup',
                'Multivitamin syrup',
                'Folic Acid',
                'Albendazole',
                'Vitamin-A',
                'Zinc'
            ],
            displayNames: {
                'Amoxycillin': 'Amoxycillin',
                'IFA Syrup': 'IFA Syrup',
                'Multivitamin syrup': 'Multivitamin syrup',
                'Folic Acid': 'Folic Acid',
                'Albendazole': 'Albendazole',
                'Vitamin-A': 'Vitamin-A',
                'Zinc': 'Zinc'
            }
        },
        'childNotConsumeThr': {
            options: [
                'didNotLikeTheContentPacket',
                'didNotLikeTheTaste',
                'qualityIsPoor',
                'howToUse',
                'notPossibleToSeparatelyCookForTheChild',
                'other'
            ],
            displayNames: {
                'didNotLikeTheContentPacket': 'Did not like the content packet',
                'didNotLikeTheTaste': 'Did not like the taste',
                'qualityIsPoor': 'Quality is poor',
                'howToUse': 'How to use',
                'notPossibleToSeparatelyCookForTheChild': 'Not possible to separately cook for the child',
                'other': 'Other'
            }
        },
        'counsellingAdviceReceive': {
            options: [
                'feedGreenLeafyVegetables',
                'feedFruitsToTheChild',
                'addGheeOilToTheFood',
                'addGudhSugarToTheFood',
                'prepareRecipesUsingTHR',
                'giveRecipeMadeFromTHROnlyToTheChild',
                'demonstrationOfRecipe',
                'addSehjanSurjanaMoringoriferaLeavesDriedPowderToTheFood',
                'setUpKitchenGarden',
                'continueHomeFoodDuringFeverDiarrhoea',
                'continueBreastfeeding',
                'breastfeedingDuringIllness',
                'correctPositionAndAttachmentBreastfeedingSupport',
                'other'
            ],
            displayNames: {
                'feedGreenLeafyVegetables': 'Feed green leafy vegetables',
                'feedFruitsToTheChild': 'Feed fruits to the child',
                'addGheeOilToTheFood': 'Add ghee oil to the food',
                'addGudhSugarToTheFood': 'Add gudh sugar to the food',
                'prepareRecipesUsingTHR': 'Prepare recipes using THR',
                'giveRecipeMadeFromTHROnlyToTheChild': 'Give recipe made from THR only to the child',
                'demonstrationOfRecipe': 'Demonstration of recipe',
                'addSehjanSurjanaMoringoriferaLeavesDriedPowderToTheFood': 'Add sehjan leaves dried powder to the food',
                'setUpKitchenGarden': 'Set up kitchen garden',
                'continueHomeFoodDuringFeverDiarrhoea': 'Continue home food during fever diarrhoea',
                'continueBreastfeeding': 'Continue breastfeeding',
                'breastfeedingDuringIllness': 'Breastfeeding during illness',
                'correctPositionAndAttachmentBreastfeedingSupport': 'Correct position and attachment breastfeeding support',
                'other': 'Others'
            }
        },
        // Section 9 fields
        'foodsOrDrinksReceived': {
            options: ['plainWater', 'infantFormula', 'milkTinnedPowdered', 'freshAnimalMilk', 'humanMilkOtherMother', 'dalRiceWater', 'fruitJuice', 'teaCoffee', 'janamGhutti', 'noneOfTheAbove', 'others'],
            displayNames: {
                'plainWater': 'Plain water',
                'infantFormula': 'Infant formula',
                'milkTinnedPowdered': 'Milk (tinned/powdered)',
                'freshAnimalMilk': 'Fresh animal milk',
                'humanMilkOtherMother': 'Human milk from other mother',
                'dalRiceWater': 'Dal/rice water',
                'fruitJuice': 'Fruit juice',
                'teaCoffee': 'Tea/Coffee',
                'janamGhutti': 'Janam ghutti',
                'noneOfTheAbove': 'None of the above',
                'others': 'Others'
            }
        },
        'reasonsNotExclusivelyBreastfed': {
            options: ['infantCouldNotSuckleWell', 'lowPoorMilkOutput', 'workingMother', 'familyPressure', 'multipleBirths', 'lackOfKnowledgeAwareness', 'adviceByDoctorHealthWorker', 'notApplicable', 'others'],
            displayNames: {
                'infantCouldNotSuckleWell': 'Infant could not suckle well',
                'lowPoorMilkOutput': 'Low/poor milk output',
                'workingMother': 'Working mother',
                'familyPressure': 'Family pressure',
                'multipleBirths': 'Multiple births',
                'lackOfKnowledgeAwareness': 'Lack of knowledge/awareness',
                'adviceByDoctorHealthWorker': 'Advice by doctor/health worker',
                'notApplicable': 'Not applicable',
                'others': 'Others'
            }
        },
        'adviceReceive': {
            options: ['exclusiveBreastfeeding', 'feedingDuringIllness', 'cueSignsChildHungry', 'positioningAttachmentBreastfeeding', 'newBornCare', 'expressingBreastMilk', 'feedingWithCupSpoonPaladi', 'others'],
            displayNames: {
                'exclusiveBreastfeeding': 'Exclusive breastfeeding',
                'feedingDuringIllness': 'Feeding during illness',
                'cueSignsChildHungry': 'Cue signs child hungry',
                'positioningAttachmentBreastfeeding': 'Positioning and attachment breastfeeding',
                'newBornCare': 'New born care',
                'expressingBreastMilk': 'Expressing breast milk',
                'feedingWithCupSpoonPaladi': 'Feeding with cup/spoon/paladi',
                'others': 'Others'
            }
        },
        // Section 10 fields
        'reasonNotConsumedThr': {
            options: ['childDidNotLike', 'sharedWithFamily', 'spoiled', 'insufficientQuantity', 'tasteProblem', 'other'],
            displayNames: {
                'childDidNotLike': 'Child did not like',
                'sharedWithFamily': 'Shared with family',
                'spoiled': 'Spoiled',
                'insufficientQuantity': 'Insufficient quantity',
                'tasteProblem': 'Taste problem',
                'other': 'Others'
            }
        },
        'adviceReceived': {
            options: ['foodVariety', 'feedingFrequency', 'foodConsistency', 'handwashing', 'safeWaterUse', 'other'],
            displayNames: {
                'foodVariety': 'Food variety',
                'feedingFrequency': 'Feeding frequency',
                'foodConsistency': 'Food consistency',
                'handwashing': 'Handwashing',
                'safeWaterUse': 'Safe water use',
                'other': 'Others'
            }
        },
        // Section 11 fields
        'thrNotConsumedReason': {
            options: [
                'didNotLikeTheContentPacket',
                'didNotLikeTaste',
                'qualityIsPoor',
                'howToUse',
                'notPossibleToSeparatelyCookForTheChild',
                'others'
            ],
            displayNames: {
                'didNotLikeTheContentPacket': 'Did not like the content packet',
                'didNotLikeTaste': 'Did not like the taste',
                'qualityIsPoor': 'Quality is poor',
                'howToUse': 'How to use',
                'notPossibleToSeparatelyCookForTheChild': 'Not possible to separately cook for the child',
                'others': 'Others'
            }
        },
        'typeOfFeedingAdvice': {
            options: [
                'timelyInitiationComplementaryFeeding',
                'reinforcedMessagesContinuedBreastfeeding',
                'immunization',
                'managementIllnessHome',
                'managementContinuedFeedingIllness',
                'hygieneSanitation',
                'counselledFamilyReferral',
                'responsiveFeeding',
                'dietaryDiversity',
                'consistencyFood',
                'quantityQualityFood',
                'consumptionTHR',
                'others'
            ],
            displayNames: {
                'timelyInitiationComplementaryFeeding': 'Timely initiation complementary feeding',
                'reinforcedMessagesContinuedBreastfeeding': 'Reinforced messages continued breastfeeding',
                'immunization': 'Immunization',
                'managementIllnessHome': 'Management illness home',
                'managementContinuedFeedingIllness': 'Management continued feeding illness',
                'hygieneSanitation': 'Hygiene sanitation',
                'counselledFamilyReferral': 'Counselled family referral',
                'responsiveFeeding': 'Responsive feeding',
                'dietaryDiversity': 'Dietary diversity',
                'consistencyFood': 'Consistency food',
                'quantityQualityFood': 'Quantity quality food',
                'consumptionTHR': 'Consumption THR',
                'others': 'Others'
            }
        }
    }
};

/**
 * Helper function to get question number for a field
 */
export const getQuestionNumber = (fieldName, sectionType) => {
    const sectionKey = sectionType.toLowerCase().replace(/[^a-z]/g, '');
    
    if (sectionKey.includes('general') || sectionKey.includes('section1')) {
        return QUESTION_MAPPINGS.general[fieldName] || '';
    } else if (sectionKey.includes('awc') || sectionKey.includes('aanganwadi')) {
        return QUESTION_MAPPINGS.aganwadi[fieldName] || '';
    } else if (sectionKey.includes('cbe')) {
        return QUESTION_MAPPINGS.cbe[fieldName] || '';
    } else if (sectionKey.includes('vhsnd')) {
        return QUESTION_MAPPINGS.vhsnd[fieldName] || '';
    } else if (sectionKey.includes('household') || sectionKey.includes('section')) {
        return QUESTION_MAPPINGS.household[fieldName] || '';
    }
    
    return '';
};

/**
 * Single choice field configurations for radio button questions with "Others" options
 */
export const SINGLE_CHOICE_FIELDS_WITH_OTHERS = {
    // Section 2-4: Aanganwadi Center
    aganwadi: {
        'childFollowupCmam': true, // 4.23 - Has Others option
        'childHeightInstrument': true // 4.13 - Has Others option
    },
    
    // Section 5: CBE Session
    cbe: {
        'themeOfCbe': true // 5.1 - Has Others option
    },
    
    // Section 6-7: VHSND Session
    vhsnd: {
        'followUpFrequency': true // 7.14 - Has Others option
    },
    
    // Section 8-11: Household Visit
    household: {
        // Section 8 fields
        'typeOfRecordAvailable': true, // 8.6 - Has Others option
        'thrNotReceivedReason_child': true, // 8.17 - Has Others option
        'whoConsumeThr': true, // 8.22 - Has Others option
        'thrQtyPrepareChild': true, // 8.24 - Has Others option
        'storeThr': true, // 8.25 - Has Others option
        
        // Section 9 fields
        'bottleUsedToFeedMilk': true, // 9.9 - Has Others option
        
        // Section 10 fields
        'thrNotReceivedReason': true, // 10.11 - Has Others option
        'thrConsumedBy': true, // 10.16 - Has Others option
        'qtyPrepareFood': true, // 10.18 - Has Others option
        'thrStore': true, // 10.19 - Has Others option
        'familyAttendedAnnaprashan': true, // 10.6 - Has Others option
        
        // Section 11 fields
        'thrNotReceivedReasonLast3Month': true, // 11.9 - Has Others option
        'qtyThrFood': true, // 11.16 - Has Others option
        'storeOpenedThr': true // 11.17 - Has Others option
    }
};

/**
 * Single choice RadioGroup field configurations (without Others option)
 */
export const SINGLE_CHOICE_RADIO_FIELDS = {
    // Section 2-4: Aanganwadi Center
    aganwadi: {
        'childSex': {
            options: ['Male', 'Female'],
            displayNames: {
                'Male': 'Male',
                'Female': 'Female'
            }
        },
        'cmamTraining': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'cmamTrainingDiscussed': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'poshanTrackerUpdated': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'classifyWastingAww': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'screeningSamChildren': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'wastingWithOedema': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'medicalComplications': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'appetiteTestFailNoComplications': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'bilateralPittingOedema': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'medicalComplicationDuringCmam': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'appetiteTestFailFollowUp': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'weightLossNoGainFollowUp': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'complicationsTwoFollowUps': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'instrumentAww': {
            options: ['Digital Weighing Scale', 'Mechanical Weighing Scale', 'Salter Weighing Scale (Mechanical/Digital)', 'Not functional / Not available'],
            displayNames: {
                'Digital Weighing Scale': 'Digital Weighing Scale',
                'Mechanical Weighing Scale': 'Mechanical Weighing Scale',
                'Salter Weighing Scale (Mechanical/Digital)': 'Salter Weighing Scale (Mechanical/Digital)',
                'Not functional / Not available': 'Not functional / Not available'
            }
        },
        'classifyWastingAww': {
            options: ['Used WFL / WFH z-score chart', 'Used status shown by Poshan Tracker Application', 'Did not know how to classify the wasting status'],
            displayNames: {
                'Used WFL / WFH z-score chart': 'Used WFL / WFH z-score chart',
                'Used status shown by Poshan Tracker Application': 'Used status shown by Poshan Tracker Application',
                'Did not know how to classify the wasting status': 'Did not know how to classify the wasting status'
            }
        },
        'nutritionalStatusXScorecard': {
            options: ['SAM', 'MAM', 'Normal'],
            displayNames: {
                'SAM': 'SAM',
                'MAM': 'MAM',
                'Normal': 'Normal'
            }
        },
        'screeningSamChildren': {
            options: ['WHZ < -3SD/ red category as per WFH', 'Bilateral pitting oedema', 'Both WHZ < -3 s.d. and/or bilateral pitting oedema', "Don't Know"],
            displayNames: {
                'WHZ < -3SD/ red category as per WFH': 'WHZ < -3SD/ red category as per WFH',
                'Bilateral pitting oedema': 'Bilateral pitting oedema',
                'Both WHZ < -3 s.d. and/or bilateral pitting oedema': 'Both WHZ < -3 s.d. and/or bilateral pitting oedema',
                "Don't Know": "Don't Know"
            }
        },
        'weighingScale': {
            options: ['Available and Functional', 'Available but not Functional', 'Not Available'],
            displayNames: {
                'Available and Functional': 'Available and Functional',
                'Available but not Functional': 'Available but not Functional',
                'Not Available': 'Not Available'
            }
        },
        'salterScale': {
            options: ['Available and Functional', 'Available but not Functional', 'Not Available'],
            displayNames: {
                'Available and Functional': 'Available and Functional',
                'Available but not Functional': 'Available but not Functional',
                'Not Available': 'Not Available'
            }
        },
        'infantometer': {
            options: ['Available and Functional', 'Available but not Functional', 'Not Available'],
            displayNames: {
                'Available and Functional': 'Available and Functional',
                'Available but not Functional': 'Available but not Functional',
                'Not Available': 'Not Available'
            }
        },
        'stadiometer': {
            options: ['Available and Functional', 'Available but not Functional', 'Not Available'],
            displayNames: {
                'Available and Functional': 'Available and Functional',
                'Available but not Functional': 'Available but not Functional',
                'Not Available': 'Not Available'
            }
        },
        'supplementaryNutrition': {
            options: ['Regular THR (Given to normal children too)', 'Augmented THR (Given to children with SAM/MAM/UW)', 'None of the above'],
            displayNames: {
                'Regular THR (Given to normal children too)': 'Regular THR (Given to normal children too)',
                'Augmented THR (Given to children with SAM/MAM/UW)': 'Augmented THR (Given to children with SAM/MAM/UW)',
                'None of the above': 'None of the above'
            }
        },
        'registerAvailability': {
            options: ['Available', 'Not available', 'Not Applicable as per guidelines'],
            displayNames: {
                'Available': 'Available',
                'Not available': 'Not available',
                'Not Applicable as per guidelines': 'Not Applicable as per guidelines'
            }
        },
        'poshanTrackerUpdated': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'amoxycillinSyrup': {
            options: ['Available at village level (AWW or ASHA)', 'Only available with ANM and ANM brings them during VHSND', 'Not applicable as per state protocol'],
            displayNames: {
                'Available at village level (AWW or ASHA)': 'Available at village level (AWW or ASHA)',
                'Only available with ANM and ANM brings them during VHSND': 'Only available with ANM and ANM brings them during VHSND',
                'Not applicable as per state protocol': 'Not applicable as per state protocol'
            }
        },
        'folicAcidTablet': {
            options: ['Available at village level (AWW or ASHA)', 'Only available with ANM and ANM brings them during VHSND', 'Not applicable as per state protocol'],
            displayNames: {
                'Available at village level (AWW or ASHA)': 'Available at village level (AWW or ASHA)',
                'Only available with ANM and ANM brings them during VHSND': 'Only available with ANM and ANM brings them during VHSND',
                'Not applicable as per state protocol': 'Not applicable as per state protocol'
            }
        },
        'albendazole': {
            options: ['Available at village level (AWW or ASHA)', 'Only available with ANM and ANM brings them during VHSND', 'Not applicable as per state protocol'],
            displayNames: {
                'Available at village level (AWW or ASHA)': 'Available at village level (AWW or ASHA)',
                'Only available with ANM and ANM brings them during VHSND': 'Only available with ANM and ANM brings them during VHSND',
                'Not applicable as per state protocol': 'Not applicable as per state protocol'
            }
        },
        'vitA': {
            options: ['Available at village level (AWW or ASHA)', 'Only available with ANM and ANM brings them during VHSND', 'Not applicable as per state protocol'],
            displayNames: {
                'Available at village level (AWW or ASHA)': 'Available at village level (AWW or ASHA)',
                'Only available with ANM and ANM brings them during VHSND': 'Only available with ANM and ANM brings them during VHSND',
                'Not applicable as per state protocol': 'Not applicable as per state protocol'
            }
        },
        'ifaSyrup': {
            options: ['Available at village level (AWW or ASHA)', 'Only available with ANM and ANM brings them during VHSND', 'Not applicable as per state protocol'],
            displayNames: {
                'Available at village level (AWW or ASHA)': 'Available at village level (AWW or ASHA)',
                'Only available with ANM and ANM brings them during VHSND': 'Only available with ANM and ANM brings them during VHSND',
                'Not applicable as per state protocol': 'Not applicable as per state protocol'
            }
        },
        'multivitaminSyrup': {
            options: ['Available at village level (AWW or ASHA)', 'Only available with ANM and ANM brings them during VHSND', 'Not applicable as per state protocol'],
            displayNames: {
                'Available at village level (AWW or ASHA)': 'Available at village level (AWW or ASHA)',
                'Only available with ANM and ANM brings them during VHSND': 'Only available with ANM and ANM brings them during VHSND',
                'Not applicable as per state protocol': 'Not applicable as per state protocol'
            }
        },
        'zinc': {
            options: ['Available at village level (AWW or ASHA)', 'Only available with ANM and ANM brings them during VHSND', 'Not applicable as per state protocol'],
            displayNames: {
                'Available at village level (AWW or ASHA)': 'Available at village level (AWW or ASHA)',
                'Only available with ANM and ANM brings them during VHSND': 'Only available with ANM and ANM brings them during VHSND',
                'Not applicable as per state protocol': 'Not applicable as per state protocol'
            }
        },
        'ors': {
            options: ['Available at village level (AWW or ASHA)', 'Only available with ANM and ANM brings them during VHSND', 'Not applicable as per state protocol'],
            displayNames: {
                'Available at village level (AWW or ASHA)': 'Available at village level (AWW or ASHA)',
                'Only available with ANM and ANM brings them during VHSND': 'Only available with ANM and ANM brings them during VHSND',
                'Not applicable as per state protocol': 'Not applicable as per state protocol'
            }
        },
        'pcm': {
            options: ['Available at village level (AWW or ASHA)', 'Only available with ANM and ANM brings them during VHSND', 'Not applicable as per state protocol'],
            displayNames: {
                'Available at village level (AWW or ASHA)': 'Available at village level (AWW or ASHA)',
                'Only available with ANM and ANM brings them during VHSND': 'Only available with ANM and ANM brings them during VHSND',
                'Not applicable as per state protocol': 'Not applicable as per state protocol'
            }
        }
    },
    
    // Section 5: CBE Session
    cbe: {
        'groupCounsellingConducted': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        }
    },
    
    // Section 6-7: VHSND Session
    vhsnd: {
        'physicalExamSam': {
            options: ['yesNewSAMChild', 'yesSAMChildAlreadyOnTreatment', 'no', 'noSAMChildIdentifiedDuringMonth', 'noSAMChildUndergoingTreatment'],
            displayNames: {
                'yesNewSAMChild': 'Yes - New SAM child',
                'yesSAMChildAlreadyOnTreatment': 'Yes - SAM child already on treatment',
                'no': 'No',
                'noSAMChildIdentifiedDuringMonth': 'No - SAM child identified during the month',
                'noSAMChildUndergoingTreatment': 'No - SAM child undergoing treatment'
            }
        },
        'vhsndAppetiteTestConducted': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childReferralNrc': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'motherAgreeNrc': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childEnrolledCmam': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childDischargedCmam': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'cmamTraining': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'confirmChildSam': {
            options: ['WHZ < -3SD/ Red category as per WFH', 'Bilateral pitting oedema', 'Both WHZ < -3 s.d. and/or bilateral pitting oedema', "Don't know"],
            displayNames: {
                'WHZ < -3SD/ Red category as per WFH': 'WHZ < -3SD/ Red category as per WFH',
                'Bilateral pitting oedema': 'Bilateral pitting oedema',
                'Both WHZ < -3 s.d. and/or bilateral pitting oedema': 'Both WHZ < -3 s.d. and/or bilateral pitting oedema',
                "Don't know": "Don't know"
            }
        },
        'wastingWithOedema': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'medicalComplications': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'appetiteTestFailNoComplications': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'bilateralPittingOedema': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'medicalComplicationDuringCmam': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'appetiteTestFailFollowUp': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'weightLossNoGainFollowUp': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'complicationsTwoFollowUps': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'vhsndVisitDay': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'physicalExamSam': {
            options: ['yesNewSAMChild', 'yesSAMChildAlreadyOnTreatment', 'no', 'noSAMChildIdentifiedDuringMonth', 'noSAMChildUndergoingTreatment'],
            displayNames: {
                'yesNewSAMChild': 'Yes - New SAM child',
                'yesSAMChildAlreadyOnTreatment': 'Yes - SAM child already on treatment',
                'no': 'No',
                'noSAMChildIdentifiedDuringMonth': 'No - SAM child identified during the month',
                'noSAMChildUndergoingTreatment': 'No - SAM child undergoing treatment'
            }
        },
        'vhsndMedicalComplication': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        }
    },
    
    // Section 8-11: Household Visit
    household: {
        'sexOfChild': {
            options: ['Male', 'Female'],
            displayNames: {
                'Male': 'Male',
                'Female': 'Female'
            }
        },
        'currentFollowupOrRecovered': {
            options: ['Currently enrolled under CMAM', 'Completed treatment during past one month'],
            displayNames: {
                'Currently enrolled under CMAM': 'Currently enrolled under CMAM',
                'Completed treatment during past one month': 'Completed treatment during past one month'
            }
        },
        'childCardRecordAvailability': {
            options: ['Available', 'Not Available', 'No record at household level,as per state guidelines'],
            displayNames: {
                'Available': 'Available',
                'Not Available': 'Not Available',
                'No record at household level,as per state guidelines': 'No record at household level,as per state guidelines'
            }
        },
        'frequencyOfWeightMeasurement': {
            options: ['Weekly', 'Fortnightly', 'Monthly'],
            displayNames: {
                'Weekly': 'Weekly',
                'Fortnightly': 'Fortnightly',
                'Monthly': 'Monthly'
            }
        },
        'anmMedicineAtEnrollment': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childConsumeAntibioticFiveDays': {
            options: ['Yes', 'No', 'Not provided'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No',
                'Not provided': 'Not provided'
            }
        },
        'thrReceivedFromAwc': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'thrNotReceivedReason': {
            options: ['Not distributed', 'Not taken/interested', 'Beneficiary was out of village', 'Other'],
            displayNames: {
                'Not distributed': 'Not distributed',
                'Not taken/interested': 'Not taken/interested',
                'Beneficiary was out of village': 'Beneficiary was out of village',
                'Other': 'Other'
            }
        },
        'recordForVerification': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childConsumeThr': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'whoConsumeThr': {
            options: ['Only by the intended child', 'Intended child and other children in the family', 'Intended + other family members including adults', 'Only by adults in the family'],
            displayNames: {
                'Only by the intended child': 'Only by the intended child',
                'Intended child and other children in the family': 'Intended child and other children in the family',
                'Intended + other family members including adults': 'Intended + other family members including adults',
                'Only by adults in the family': 'Only by adults in the family'
            }
        },
        'thrQtyPrepareChild': {
            options: ['Half Katori', 'One Katori', 'Two Katori', 'Half Packet', 'Full Packet', 'Any Other'],
            displayNames: {
                'Half Katori': 'Half Katori',
                'One Katori': 'One Katori',
                'Two Katori': 'Two Katori',
                'Half Packet': 'Half Packet',
                'Full Packet': 'Full Packet',
                'Any Other': 'Any Other'
            }
        },
        'storeThr': {
            options: ['Closed container', 'Keeping the same packet with tightly packed', 'Keeping the same packet opened as it is', 'Any other'],
            displayNames: {
                'Closed container': 'Closed container',
                'Keeping the same packet with tightly packed': 'Keeping the same packet with tightly packed',
                'Keeping the same packet opened as it is': 'Keeping the same packet opened as it is',
                'Any other': 'Any other'
            }
        },
        'counsellingOnHomeFood': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'typeOfRecordAvailable': {
            options: ['MCP card', 'Child Growth card', 'State specific CMAM card', 'Others'],
            displayNames: {
                'MCP card': 'MCP card',
                'Child Growth card': 'Child Growth card',
                'State specific CMAM card': 'State specific CMAM card',
                'Others': 'Others'
            }
        },
        // Section 9 fields
        'sexOfChild06': {
            options: ['Male', 'Female'],
            displayNames: {
                'Male': 'Male',
                'Female': 'Female'
            }
        },
        'breastfedInLast24Hours': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'receieveAdviceFeeding': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childWeighedAwc': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childWeighedAware': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childGrowingWell': {
            options: ['Yes', 'No', "Don't know"],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No',
                "Don't know": "Don't know"
            }
        },
        // Section 10 fields
        'sexOfChild68': {
            options: ['Male', 'Female'],
            displayNames: {
                'Male': 'Male',
                'Female': 'Female'
            }
        },
        'startedTakingFoodOtherThanBreastmilk': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'annaprashanConductedAtAwc': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'familyAttendedAnnaprashan': {
            options: ['Husband', 'Mother-in-law', 'Others', 'No one else'],
            displayNames: {
                'Husband': 'Husband',
                'Mother-in-law': 'Mother-in-law',
                'Others': 'Others',
                'No one else': 'No one else'
            }
        },
        'foodConsistencyCorrect': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'thrReceivedPastMonth': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'thrConsumed': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'receivedFeedingAdvice': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'ifaSyrupReceivedLastWeek': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childWeighedAtAwc': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'awareWeightChild': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'isChildGrowingWell': {
            options: ['Yes', 'No', "Don't know"],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No',
                "Don't know": "Don't know"
            }
        },
        // Section 11 fields
        'childGender': {
            options: ['Male', 'Female'],
            displayNames: {
                'Male': 'Male',
                'Female': 'Female'
            }
        },
        'rightFoodConsistency': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'thrReceivedLast3Month': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'thrNotReceivedReasonLast3Month': {
            options: ['Not distributed', 'Not taken/interested', 'Beneficiary was out of village', 'Other'],
            displayNames: {
                'Not distributed': 'Not distributed',
                'Not taken/interested': 'Not taken/interested',
                'Beneficiary was out of village': 'Beneficiary was out of village',
                'Other': 'Other'
            }
        },
        'monthsThrReceivedLast3Month': {
            options: ['1', '2', '3'],
            displayNames: {
                '1': '1',
                '2': '2',
                '3': '3'
            }
        },
        'thrConsumedByChild': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'thrConsumer': {
            options: ['Only by the intended child', 'Intended child and other children in the family', 'Intended + other family members including adults', 'Only by adults in the family'],
            displayNames: {
                'Only by the intended child': 'Only by the intended child',
                'Intended child and other children in the family': 'Intended child and other children in the family',
                'Intended + other family members including adults': 'Intended + other family members including adults',
                'Only by adults in the family': 'Only by adults in the family'
            }
        },
        'albendazoleReceived': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'vitaminAReceived': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'ifaSyrupGiven': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'feedingAdviceReceived': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childLastWeighed': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childAwareLastWeighed': {
            options: ['Yes', 'No'],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No'
            }
        },
        'childGrowWell': {
            options: ['Yes', 'No', "Don't know"],
            displayNames: {
                'Yes': 'Yes',
                'No': 'No',
                "Don't know": "Don't know"
            }
        }
    }
};

/**
 * Helper function to check if a field is a single-select field with Others option
 */
export const hasSingleChoiceOthersOption = (fieldName, sectionType) => {
    const sectionKey = sectionType.toLowerCase().replace(/[^a-z]/g, '');
    
    if (sectionKey.includes('awc') || sectionKey.includes('aanganwadi')) {
        return SINGLE_CHOICE_FIELDS_WITH_OTHERS.aganwadi[fieldName] || false;
    } else if (sectionKey.includes('cbe')) {
        return SINGLE_CHOICE_FIELDS_WITH_OTHERS.cbe[fieldName] || false;
    } else if (sectionKey.includes('vhsnd')) {
        return SINGLE_CHOICE_FIELDS_WITH_OTHERS.vhsnd[fieldName] || false;
    } else if (sectionKey.includes('household') || sectionKey.includes('section')) {
        return SINGLE_CHOICE_FIELDS_WITH_OTHERS.household[fieldName] || false;
    }
    
    return false;
};

/**
 * Helper function to get multiple choice configuration for a field
 */
export const getMultipleChoiceConfig = (fieldName, sectionType) => {
    const sectionKey = sectionType.toLowerCase().replace(/[^a-z]/g, '');
    
    if (sectionKey.includes('awc') || sectionKey.includes('aanganwadi')) {
        return MULTIPLE_CHOICE_FIELDS.aganwadi[fieldName] || null;
    } else if (sectionKey.includes('cbe')) {
        return MULTIPLE_CHOICE_FIELDS.cbe[fieldName] || null;
    } else if (sectionKey.includes('vhsnd')) {
        return MULTIPLE_CHOICE_FIELDS.vhsnd[fieldName] || null;
    } else if (sectionKey.includes('household') || sectionKey.includes('section')) {
        return MULTIPLE_CHOICE_FIELDS.household[fieldName] || null;
    }
    
    return null;
};

/**
 * Helper function to get single choice radio configuration for a field
 */
export const getSingleChoiceRadioConfig = (fieldName, sectionType) => {
    const sectionKey = sectionType ? sectionType.toLowerCase().replace(/[^a-z]/g, '') : '';
    
    // Check for aganwadi section - match 'aganwadi', 'awc', or 'aanganwadi'
    if (sectionKey === 'aganwadi' || sectionKey.includes('awc') || sectionKey.includes('aanganwadi')) {
        return SINGLE_CHOICE_RADIO_FIELDS.aganwadi?.[fieldName] || null;
    } else if (sectionKey === 'cbe' || sectionKey.includes('cbe')) {
        return SINGLE_CHOICE_RADIO_FIELDS.cbe?.[fieldName] || null;
    } else if (sectionKey === 'vhsnd' || sectionKey.includes('vhsnd')) {
        return SINGLE_CHOICE_RADIO_FIELDS.vhsnd?.[fieldName] || null;
    } else if (sectionKey === 'household' || sectionKey.includes('household') || sectionKey.includes('section')) {
        return SINGLE_CHOICE_RADIO_FIELDS.household?.[fieldName] || null;
    }
    
    return null;
};