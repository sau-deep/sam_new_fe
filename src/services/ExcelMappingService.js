/**
 * Excel Mapping Service - Frontend-only solution for routine monitoring data export
 * Handles complex multiple-choice fields and "Others" options without backend changes
 */

class ExcelMappingService {

  /**
   * Generate Excel-ready data from routine monitoring records
   */
  static generateExcelData(routineMonitoringData) {
    if (!Array.isArray(routineMonitoringData)) return [];

    return routineMonitoringData.map((record, index) => {
      const excelRow = this.mapGeneralFields(record, index);

      // Handle each section
      if (record.aganwadiData) {
        Object.assign(excelRow, this.mapAwcFields(record.aganwadiData));
      }

      if (record.cbeData) {
        Object.assign(excelRow, this.mapCbeFields(record.cbeData));
      }

      if (record.vhsndData) {
        Object.assign(excelRow, this.mapVhsndFields(record.vhsndData));
      }

      if (record.householdData) {
        Object.assign(excelRow, this.mapHouseholdFields(record.householdData));
      }

      return excelRow;
    });
  }

  /**
   * Generate Excel-ready data for concurrent (bi-annual) assessment export.
   * Output column order + headers must match the provided template.
   */
  static generateBiAnnualExcelData(rows) {
    if (!Array.isArray(rows)) return [];

    // Canonical concurrent-export header row: column order and spellings must match the official template exactly.
    const BI_ANNUAL_COLUMNS = [
      'id',
      'visitDate',
      'state',
      'stateCode',
      'district',
      'districtCode',
      'block',
      'village',
      'villageCode',
      'primaryCaregiver',
      'careGiverInterview',
      'caregiversex',
      'caregiverAge',
      'caregiverEducation',
      'childSex',
      'childDob',
      'childAgeDays',
      'childAgeMonths',
      'bf1',
      'bf2',
      'bf2_days',
      'bf2_hour',
      'bf2_minutes',
      'bf3',
      'bf4',
      'bf5',
      'bf5_animal_milk',
      'bf5_plan_water',
      'bf5_sugar_glucose_water',
      'bf5_honey',
      'bf5_fruit_juice',
      'bf5_gripe_water',
      'bf5_infant_formula',
      'bf5_tea',
      'bf5_janam_ghutti',
      'bf5_jaggery',
      'bf5_other',
      'bf5_other_text',
      'bf6',
      'bf7',
      'bf7_mother_sick',
      'bf7_child_sick',
      'bf7_problems_breast',
      'bf7_not_enough_milk',
      'bf7_child_ref_bf',
      'bf7_child_comp_feed_age',
      'bf7_work_priority',
      'bf7_mother_pregnant',
      'bf7_advised_someone',
      'bf7_cultural_practice',
      'bf7_other',
      'bf7_other_text',
      'bf8',
      'bf9',
      'bf10',
      'bf10_mother_sick',
      'bf10_child_sick',
      'bf10_problems_breast',
      'bf10_not_enough_milk',
      'bf10_child_ref_bf',
      'bf10_child_comp_feeding',
      'bf10_work_priority',
      'bf10_mother_curr_pregnant',
      'bf10_advised_someone',
      'bf10_cultural_practice',
      'bf10_other',
      'bf10_other_text',
      'cf1',
      'cf1_1',
      'cf1_2',
      'cf1_3',
      'cf2_breast_milk',
      'cf2_porridge',
      'cf2_fortifiedfood',
      'cf2_grain',
      'cf2_yellow',
      'cf2_roots',
      'cf2_leafy',
      'cf2_fruits',
      'cf2_other_fruits',
      'cf2_dry_fruits',
      'cf2_organ_meat',
      'cf2_chicken',
      'cf2_eggs',
      'cf2_fish',
      'cf2_beans',
      'cf2_nuts',
      'cf2_cheese',
      'cf2_oil',
      'cf2_sugar',
      'cf2_other_sweetened',
      'thr1',
      'thr2',
      'thr3',
      'thr4',
      'thr5',
      'gmt1',
      'gmt1_1',
      'gmt2',
      'gmt2_1',
      'gmt3',
      'gmt4',
      'gmt5',
      'gmt6',
      'gmt7',
      'gmt8',
      'ors',
      'Albendazole',
      'folic_acid',
      'ifa_syrup',
      'vitaminA',
      'Multivitamin',
      'zinc',
      'Amoxycillin',
      'Paracetamol',
      'gmt8_other',
      'gmt8_other_text',
      'hv1',
      'hv2',
      'hv2_giv_col_new',
      'hv2__exc_bre_imp',
      'hv2__bf_fre',
      'hv2_cor_pos_and_attach',
      'hv2_com_feed_wh_start',
      'hv2_com_fre',
      'hv2_com_consistency',
      'hv2_com_feed_age_app_qua',
      'hv2_com_feed_diet_div',
      'hv2_com_feed_fee_du_illness',
      'hv2_com_feed_res_feeding',
      'hv2_sim_act_rol_pla_therapy',
      'hv2_use_of_thr',
      'hv2_regular_growth_imp',
      'hv2_nut_status_chil',
      'hv2_what_undernutrition',
      'hv2_con_undernutrition_child',
      'hv2_imp_handwash_hyg',
      'hv2_IFA_supli_chil',
      'hv2_vitaminA_sup_chil',
      'hv2_deworming_chil',
      'hv2_vaccination_chil',
      'hv2_care_sick_child',
      'hv2_feeding_demonstration',
      'hv2_nothing',
      'hv2_other',
      'hv2_other_text',
      'hv3',
      'hv3_mcp_card',
      'hv3_flipbook_flipchart',
      'hv3_posters',
      'hv3_vedio_mobile',
      'hv3_counselling_card',
      'hv3_nothing',
      'hv3_other',
      'hv3_other_text',
      'hv4_home_visit_by_Asha',
      'hv5',
      'hv5_imp_giv_col_new',
      'hv5_exc_bre_imp',
      'hv5_bf_fre',
      'hv5_corr_pos_and_attach',
      'hv5_comp_feed_when_start',
      'hv5_comp_feed_fre',
      'hv5_comp_feed_consistency',
      'hv5_comp_feed_age_app_quant',
      'hv5_comp_feed_diet_diver',
      'hv5_comp_feed_during_illness',
      'hv5_comp_respons_feeding',
      'hv5_stimu_act_rol_pla_therapy',
      'hv5_use_thr_pre_tips',
      'hv5_regular_growth_imp',
      'hv5_nut_status',
      'hv5_what_undernutrition',
      'hv5_cons_undernutrition_child',
      'hv5_imp_handwash_sanitaion',
      'hv5_ifa_supli',
      'hv5_vitaminA_supp_chil',
      'hv5_deworming_chil',
      'hv5_vaccination_chil',
      'hv5_care_sick_child',
      'hv5_feeding_demonstration',
      'hv5_nothing',
      'hv5_other',
      'hv5_other_text',
      'hv5_imp_excl_bf',
      'hv5_use_of_thr',
      'hv5_vitaminA',
      'hv6',
      'hv6_verbal_couns',
      'hv6_demonstration',
      'hv6_flip_chart',
      'hv6_pamphlet_leaflet',
      'hv6_video',
      'hv6_nothing',
      'hv6_other',
      'hv6_other_text',
      'mn1',
      'mn2',
      'mn3',
      'mn4',
      'anth1',
      'anth2_1',
      'anth2_2',
      'anthr3',
      'anth3_1',
      'anth4',
      'anth5',
      'haz06',
      'waz06',
      'whz06'
    ];

    const safe = (val) => (val === null || val === undefined ? '' : val);
    const formatMaybeDate = (val) => {
      if (val === null || val === undefined) return '';
      if (val instanceof Date) {
        return val.toISOString();
      }
      if (typeof val === 'string') {
        // Only truncate strict LocalDate strings (YYYY-MM-DD). ISO datetime should keep full precision.
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        return val;
      }
      return String(val);
    };

    const csvToList = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
      if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
      return [String(value).trim()].filter(Boolean);
    };

    const containsOtherLike = (csvValue) => {
      const list = csvToList(csvValue);
      return list.includes('Other') || list.some((v) => v.startsWith('Other -'));
    };

    const indicatorYesNo = (condition) => (condition ? 'Yes' : 'No');

    const getOtherText = (csvValue) => {
      const list = csvToList(csvValue);
      const otherItem = list.find((v) => v.toLowerCase().startsWith('other - '));
      return otherItem ? otherItem.split(' - ').slice(1).join(' - ').trim() : '';
    };

    return rows.map((record) => {
      const bf5List = csvToList(record.otherThanMilkGiven);
      const bf7List = csvToList(record.otherThanMilkGivenReason);
      const bf10List = csvToList(record.reasonStoppedFeedingw);
      const hv2List = csvToList(record.awwDiscussion);
      const hv3List = csvToList(record.awwCounsel);
      const hv5List = csvToList(record.ashaInform);
      const hv6List = csvToList(record.ashaUsedtoInform);
      const medList = csvToList(record.medicineConsumed);

      const excelRow = {};

      // General / identification
      excelRow.id = safe(record.id);
      excelRow.visitDate = formatMaybeDate(record.visitDate);
      excelRow.state = safe(record.state);
      excelRow.stateCode = safe(record.stateCode);
      excelRow.district = safe(record.district);
      excelRow.districtCode = safe(record.districtCode);
      excelRow.block = safe(record.block);
      excelRow.village = safe(record.village);
      excelRow.villageCode = safe(record.villageCode);
      excelRow.primaryCaregiver = safe(record.primaryCaregiver);
      excelRow.careGiverInterview = safe(record.careGiverInterview);
      excelRow.caregiversex = safe(record.caregiversex);
      excelRow.caregiverAge = safe(record.caregiverAge);
      excelRow.caregiverEducation = safe(record.caregiverEducation);
      excelRow.childSex = safe(record.childSex);
      excelRow.childDob = formatMaybeDate(record.childDob);
      excelRow.childAgeDays = safe(record.childAgeDays);
      excelRow.childAgeMonths = safe(record.childAgeMonths);

      // BF (breastfeeding)
      excelRow.bf1 = safe(record.childBreastfeed);
      excelRow.bf2 = safe(record.childBreastfeedFirstTime);
      excelRow.bf2_days = safe(record.noOfDays);
      excelRow.bf2_hour = safe(record.noOfHours);
      excelRow.bf2_minutes = safe(record.noOfMins);
      excelRow.bf3 = safe(record.firstMilk);
      excelRow.bf4 = safe(record.otherThanMilk);
      excelRow.bf5 = safe(record.otherThanMilkGiven);
      excelRow.bf5_animal_milk         = indicatorYesNo(bf5List.includes('Animal Milk'));
      excelRow.bf5_plan_water          = indicatorYesNo(bf5List.includes('Plain water'));
      excelRow.bf5_sugar_glucose_water = indicatorYesNo(bf5List.includes('Sugar / glucose water'));
      excelRow.bf5_honey               = indicatorYesNo(bf5List.includes('Honey'));
      excelRow.bf5_fruit_juice         = indicatorYesNo(bf5List.includes('Fruit Juice'));
      excelRow.bf5_gripe_water         = indicatorYesNo(bf5List.includes('Gripe water'));
      excelRow.bf5_infant_formula      = indicatorYesNo(bf5List.includes('Infant formula milk'));
      excelRow.bf5_tea                 = indicatorYesNo(bf5List.includes('Tea'));
      excelRow.bf5_janam_ghutti        = indicatorYesNo(bf5List.includes('Janam ghutti'));
      excelRow.bf5_jaggery             = indicatorYesNo(bf5List.includes('Jaggery'));
      excelRow.bf5_other               = indicatorYesNo(containsOtherLike(record.otherThanMilkGiven));
      excelRow.bf5_other_text          = getOtherText(record.otherThanMilkGiven);
      excelRow.bf6 = safe(record.otherThanMilkGivenPreviousDay);

      excelRow.bf7                     = safe(record.otherThanMilkGivenReason);
      excelRow.bf7_mother_sick         = indicatorYesNo(bf7List.includes('Mother sick / weak'));
      excelRow.bf7_child_sick          = indicatorYesNo(bf7List.includes('Child sick / weak'));
      excelRow.bf7_problems_breast     = indicatorYesNo(bf7List.includes('Problems with breast'));
      excelRow.bf7_not_enough_milk     = indicatorYesNo(bf7List.includes('Not enough milk'));
      excelRow.bf7_child_ref_bf        = indicatorYesNo(bf7List.includes('Child refused to breastfeed'));
      excelRow.bf7_child_comp_feed_age = indicatorYesNo(bf7List.includes('Child reached complementary feeding age'));
      excelRow.bf7_work_priority       = indicatorYesNo(bf7List.includes('Work priority for mother'));
      excelRow.bf7_mother_pregnant     = indicatorYesNo(bf7List.includes('Mother currently pregnant'));
      excelRow.bf7_advised_someone     = indicatorYesNo(bf7List.includes('Advised by someone'));
      excelRow.bf7_cultural_practice   = indicatorYesNo(bf7List.includes('Cultural practice'));
      excelRow.bf7_other               = indicatorYesNo(containsOtherLike(record.otherThanMilkGivenReason));
      excelRow.bf7_other_text          = getOtherText(record.otherThanMilkGivenReason);

      excelRow.bf8 = safe(record.stillBreastfeeding);
      excelRow.bf9 = safe(record.breastFeedMonth);
      excelRow.bf10 = safe(record.reasonStoppedFeedingw);
      excelRow.bf10_mother_sick          = indicatorYesNo(bf10List.includes('Mother sick / weak'));
      excelRow.bf10_child_sick           = indicatorYesNo(bf10List.includes('Child sick / weak'));
      excelRow.bf10_problems_breast      = indicatorYesNo(bf10List.includes('Problems with breast'));
      excelRow.bf10_not_enough_milk      = indicatorYesNo(bf10List.includes('Not enough milk'));
      excelRow.bf10_child_ref_bf         = indicatorYesNo(bf10List.includes('Child refused to breastfeed'));
      excelRow.bf10_child_comp_feeding   = indicatorYesNo(bf10List.includes('Child reached complementary feeding age'));
      excelRow.bf10_work_priority        = indicatorYesNo(bf10List.includes('Work priority for mother'));
      excelRow.bf10_mother_curr_pregnant = indicatorYesNo(bf10List.includes('Mother currently pregnant'));
      excelRow.bf10_advised_someone      = indicatorYesNo(bf10List.includes('Advised by someone'));
      excelRow.bf10_cultural_practice    = indicatorYesNo(bf10List.includes('Cultural practice'));
      excelRow.bf10_other                = indicatorYesNo(containsOtherLike(record.reasonStoppedFeedingw));
      excelRow.bf10_other_text           = getOtherText(record.reasonStoppedFeedingw);

      // CF (fluids / complementary feeding)
      excelRow.cf1 = safe(record.givingFluids);
      excelRow.cf1_1 = safe(record.ageGivingFluids);
      excelRow.cf1_2 = safe(record.ageGivingSemisolid);
      excelRow.cf1_3 = safe(record.ageGivingSolid);
      excelRow.cf2_breast_milk = safe(record.foodYesterdayBreastmilk);
      excelRow.cf2_porridge = safe(record.foodYesterdayPorridge);
      excelRow.cf2_fortifiedfood = safe(record.foodYesterdayFortifiedFood);
      excelRow.cf2_grain = safe(record.foodYesterdayGrain);
      excelRow.cf2_yellow = safe(record.foodYesterdayYellow);
      excelRow.cf2_roots = safe(record.foodYesterdayRoots);
      excelRow.cf2_leafy = safe(record.foodYesterdayLeafy);
      excelRow.cf2_fruits = safe(record.foodYesterdayFruits);
      excelRow.cf2_other_fruits = safe(record.foodYesterdayOtherFruits);
      excelRow.cf2_dry_fruits = safe(record.foodYesterdayDryFruits);
      excelRow.cf2_organ_meat = safe(record.foodYesterdayOrganMeat);
      excelRow.cf2_chicken = safe(record.foodYesterdayChicken);
      excelRow.cf2_eggs = safe(record.foodYesterdayEggs);
      excelRow.cf2_fish = safe(record.foodYesterdayFish);
      excelRow.cf2_beans = safe(record.foodYesterdayBeans);
      excelRow.cf2_nuts = safe(record.foodYesterdayNuts);
      excelRow.cf2_cheese = safe(record.foodYesterdayCheese);
      excelRow.cf2_oil = safe(record.foodYesterdayOil);
      excelRow.cf2_sugar = safe(record.foodYesterdaySugar);
      excelRow.cf2_other_sweetened = safe(record.foodYesterdayOtherSweetened);

      // THR (take-home ration)
      excelRow.thr1 = safe(record.receivedThr);
      excelRow.thr2 = safe(record.receivedThrDays);
      excelRow.thr3 = safe(record.consumeThrDays);
      excelRow.thr4 = safe(record.likeConsumeThr);
      excelRow.thr5 = safe(record.hhProvidedThr);

      // GMT (growth monitoring and treatment)
      excelRow.gmt1 = safe(record.weightLastMonthAww);
      excelRow.gmt1_1 = [safe(record.weightNotMeasuredReason), safe(record.reasonWtNotMeasuring)]
        .filter(Boolean)
        .join(' | ');
      excelRow.gmt2 = safe(record.heightLastMonthAww);
      excelRow.gmt2_1 = [safe(record.heightNotMeasuredReason), safe(record.reasonHtNotMeasuring)]
        .filter(Boolean)
        .join(' | ');
      excelRow.gmt3 = safe(record.childUndernourished);
      excelRow.gmt4 = safe(record.childUndernourishedType);
      excelRow.gmt5 = safe(record.adviceChildHealthFacility);
      excelRow.gmt6 = safe(record.childVisitHealthFacility);
      excelRow.gmt7 = safe(record.receivedTreatment);
      excelRow.gmt8 = safe(record.medicineConsumed);

      // Medicine indicators from `medicineConsumed`
      excelRow.ors         = indicatorYesNo(medList.includes('ORS'));
      excelRow.Albendazole = indicatorYesNo(medList.includes('Albendazole tablet'));
      excelRow.folic_acid  = indicatorYesNo(medList.includes('Folic acid tablet'));
      excelRow.ifa_syrup   = indicatorYesNo(medList.includes('IFA syrup'));
      excelRow.vitaminA    = indicatorYesNo(medList.includes('Vitamin A Syrup'));
      excelRow.Multivitamin= indicatorYesNo(medList.includes('Multivitamin syrup'));
      excelRow.zinc        = indicatorYesNo(medList.includes('Zinc'));
      excelRow.Amoxycillin = indicatorYesNo(medList.includes('Amoxycillin tablet/syrup'));
      excelRow.Paracetamol = indicatorYesNo(medList.includes('Paracetamol'));
      excelRow.gmt8_other      = indicatorYesNo(containsOtherLike(record.medicineConsumed));
      excelRow.gmt8_other_text = getOtherText(record.medicineConsumed);

      // Home visits
      excelRow.hv1 = safe(record.homeVisitAww);
      excelRow.hv2 = safe(record.awwDiscussion);
      excelRow.hv2__bf_fre = indicatorYesNo(hv2List.includes('section5igcv_breastfeeding_frequency'));
      excelRow.hv2_cor_pos_and_attach = indicatorYesNo(hv2List.includes('section5igcv_breastfeeding_position'));
      excelRow.hv2_com_feed_wh_start = indicatorYesNo(hv2List.includes('section5igcv_complementary_start'));
      excelRow.hv2_com_fre = indicatorYesNo(hv2List.includes('section5igcv_complementary_frequency'));
      excelRow.hv2_com_consistency = indicatorYesNo(hv2List.includes('section5igcv_complementary_consistency'));
      excelRow.hv2_com_feed_age_app_qua = indicatorYesNo(hv2List.includes('section5igcv_complementary_quantity'));
      excelRow.hv2_com_feed_diet_div = indicatorYesNo(hv2List.includes('section5igcv_complementary_diversity'));
      excelRow.hv2_com_feed_fee_du_illness = indicatorYesNo(hv2List.includes('section5igcv_complementary_illness'));
      excelRow.hv2_com_feed_res_feeding = indicatorYesNo(hv2List.includes('section5igcv_complementary_responsive'));
      excelRow.hv2_con_undernutrition_child = indicatorYesNo(hv2List.includes('section5igcv_undernutrition_consequences'));
      excelRow.hv2__exc_bre_imp = indicatorYesNo(hv2List.includes('section5igcv_exclusive_breastfeeding'));
      excelRow.hv2_feeding_demonstration = indicatorYesNo(hv2List.includes('section5igcv_demonstration'));
      excelRow.hv2_IFA_supli_chil = indicatorYesNo(hv2List.includes('section5igcv_ifa'));
      excelRow.hv2_giv_col_new = indicatorYesNo(hv2List.includes('section5igcv_colostrum'));
      excelRow.hv2_imp_handwash_hyg = indicatorYesNo(hv2List.includes('section5igcv_handwash'));
      excelRow.hv2_nothing = indicatorYesNo(hv2List.includes('nothing'));
      excelRow.hv2_nut_status_chil = indicatorYesNo(hv2List.includes('section5igcv_nutrition_status'));
      excelRow.hv2_regular_growth_imp = indicatorYesNo(hv2List.includes('section5igcv_growth_monitoring'));
      excelRow.hv2_sim_act_rol_pla_therapy = indicatorYesNo(hv2List.includes('section5igcv_stimulation'));
      excelRow.hv2_use_of_thr = indicatorYesNo(hv2List.includes('section5igcv_thr_tips'));
      excelRow.hv2_vitaminA_sup_chil = indicatorYesNo(hv2List.includes('section5igcv_vitamin_a'));
      excelRow.hv2_what_undernutrition = indicatorYesNo(hv2List.includes('section5igcv_undernutrition'));
      excelRow.hv2_deworming_chil = indicatorYesNo(hv2List.includes('section5igcv_deworming'));
      excelRow.hv2_vaccination_chil = indicatorYesNo(hv2List.includes('section5igcv_vaccination'));
      excelRow.hv2_care_sick_child = indicatorYesNo(hv2List.includes('section5igcv_sick_child'));
      excelRow.hv2_other      = indicatorYesNo(hv2List.includes('other'));
      excelRow.hv2_other_text = getOtherText(record.awwDiscussion);

      excelRow.hv3 = safe(record.awwCounsel);
      excelRow.hv3_counselling_card = indicatorYesNo(hv3List.includes('counselling_card'));
      excelRow.hv3_flipbook_flipchart = indicatorYesNo(hv3List.includes('flipbook_flipchart'));
      excelRow.hv3_mcp_card = indicatorYesNo(hv3List.includes('mcp_card'));
      excelRow.hv3_vedio_mobile = indicatorYesNo(hv3List.includes('video_on_mobile_device'));
      excelRow.hv3_posters = indicatorYesNo(hv3List.includes('posters'));
      excelRow.hv3_nothing = indicatorYesNo(hv3List.includes('nothing'));
      excelRow.hv3_other      = indicatorYesNo(hv3List.includes('other'));
      excelRow.hv3_other_text = getOtherText(record.awwCounsel);

      excelRow.hv4_home_visit_by_Asha = safe(record.homeVisitAsha);

      excelRow.hv5 = safe(record.ashaInform);
      excelRow.hv5_bf_fre = indicatorYesNo(hv5List.includes('section5igcv_breastfeeding_frequency'));
      excelRow.hv5_corr_pos_and_attach = indicatorYesNo(hv5List.includes('section5igcv_breastfeeding_position'));
      excelRow.hv5_comp_feed_when_start = indicatorYesNo(hv5List.includes('section5igcv_complementary_start'));
      excelRow.hv5_comp_feed_fre = indicatorYesNo(hv5List.includes('section5igcv_complementary_frequency'));
      excelRow.hv5_comp_feed_consistency = indicatorYesNo(hv5List.includes('section5igcv_complementary_consistency'));
      excelRow.hv5_comp_feed_age_app_quant = indicatorYesNo(hv5List.includes('section5igcv_complementary_quantity'));
      excelRow.hv5_comp_feed_diet_diver = indicatorYesNo(hv5List.includes('section5igcv_complementary_diversity'));
      excelRow.hv5_comp_feed_during_illness = indicatorYesNo(hv5List.includes('section5igcv_complementary_illness'));
      excelRow.hv5_comp_respons_feeding = indicatorYesNo(hv5List.includes('section5igcv_complementary_responsive'));
      excelRow.hv5_cons_undernutrition_child = indicatorYesNo(hv5List.includes('section5igcv_undernutrition_consequences'));
      excelRow.hv5_exc_bre_imp = indicatorYesNo(hv5List.includes('section5igcv_exclusive_breastfeeding'));
      excelRow.hv5_feeding_demonstration = indicatorYesNo(hv5List.includes('section5igcv_demonstration'));
      excelRow.hv5_ifa_supli = indicatorYesNo(hv5List.includes('section5igcv_ifa'));
      excelRow.hv5_imp_giv_col_new = indicatorYesNo(hv5List.includes('section5igcv_colostrum'));
      excelRow.hv5_imp_handwash_sanitaion = indicatorYesNo(hv5List.includes('section5igcv_handwash'));
      excelRow.hv5_nothing = indicatorYesNo(hv5List.includes('nothing'));
      excelRow.hv5_nut_status = indicatorYesNo(hv5List.includes('section5igcv_nutrition_status'));
      excelRow.hv5_regular_growth_imp = indicatorYesNo(hv5List.includes('section5igcv_growth_monitoring'));
      excelRow.hv5_stimu_act_rol_pla_therapy = indicatorYesNo(hv5List.includes('section5igcv_stimulation'));
      excelRow.hv5_imp_excl_bf = indicatorYesNo(hv5List.includes('section5igcv_exclusive_breastfeeding'));
      excelRow.hv5_use_thr_pre_tips = indicatorYesNo(hv5List.includes('section5igcv_thr_tips'));
      excelRow.hv5_use_of_thr = indicatorYesNo(hv5List.includes('section5igcv_thr_tips'));
      excelRow.hv5_vitaminA_supp_chil = indicatorYesNo(hv5List.includes('section5igcv_vitamin_a'));
      excelRow.hv5_vitaminA = indicatorYesNo(hv5List.includes('section5igcv_vitamin_a'));
      excelRow.hv5_what_undernutrition = indicatorYesNo(hv5List.includes('section5igcv_undernutrition'));
      excelRow.hv5_deworming_chil = indicatorYesNo(hv5List.includes('section5igcv_deworming'));
      excelRow.hv5_vaccination_chil = indicatorYesNo(hv5List.includes('section5igcv_vaccination'));
      excelRow.hv5_care_sick_child = indicatorYesNo(hv5List.includes('section5igcv_sick_child'));
      excelRow.hv5_other      = indicatorYesNo(hv5List.includes('other'));
      excelRow.hv5_other_text = getOtherText(record.ashaInform);

      excelRow.hv6 = safe(record.ashaUsedtoInform);
      excelRow.hv6_verbal_couns = indicatorYesNo(hv6List.includes('Verbal counseling'));
      excelRow.hv6_demonstration = indicatorYesNo(hv6List.includes('Demonstration'));
      excelRow.hv6_flip_chart = indicatorYesNo(hv6List.includes('Flip chart'));
      excelRow.hv6_pamphlet_leaflet = indicatorYesNo(hv6List.includes('Pamphlet/leaflet'));
      excelRow.hv6_video = indicatorYesNo(hv6List.includes('Video'));
      excelRow.hv6_nothing = indicatorYesNo(hv6List.includes('Nothing') || hv6List.includes('nothing'));
      excelRow.hv6_other      = indicatorYesNo(hv6List.includes('Other') || hv6List.some((v) => v.startsWith('Other -')));
      excelRow.hv6_other_text = getOtherText(record.ashaUsedtoInform);

      // Micronutrients
      excelRow.mn1 = safe(record.vitA6Months);
      excelRow.mn2 = safe(record.medicineWorm);
      excelRow.mn3 = safe(record.iron6Months);
      excelRow.mn4 = safe(record.ironDoses);

      // Anthropometry (anth2_1 = current height cm; template column aligns with concurrent form currentHt)
      excelRow.anth1 = safe(record.current_wt);
      const currentHtRaw = [record.currentHt, record.current_ht].find(
        (v) => v != null && String(v).trim() !== ''
      );
      excelRow.anth2_1 = safe(currentHtRaw);
      excelRow.anth2_2 = safe(record.positionHtMeasured);
      excelRow.anthr3 = safe(record.presentBilateralOedema);
      excelRow.anth3_1 = safe(record.reasonNotAssessing);
      excelRow.anth4 = safe(record.nutritionalCategory);
      excelRow.anth5 = safe(record.childEnrollCmam);
      excelRow.haz06 = safe(record.haz06);
      excelRow.waz06 = safe(record.waz06);
      excelRow.whz06 = safe(record.whz06);

      // Ensure every template column exists (and in the correct insertion order).
      const orderedRow = {};
      BI_ANNUAL_COLUMNS.forEach((col) => {
        orderedRow[col] = safe(excelRow[col]);
      });

      return orderedRow;
    });
  }

  /**
   * Map general information fields
   */
  static mapGeneralFields(record, index) {
    return {
      'Record ID': index + 1,
      '1.1 State': record.state || '',
      '1.2 District': record.district || '',
      '1.3 Block': record.block || '',
      '1.4 ICDS Project': record.icdsProject || '',
      '1.5 Sector': record.sector || '',
      '1.6 Village': record.village || '',
      '1.7 AWC': record.awc || '',
      '1.8 Field Monitor Name': record.fieldMonitorName || '',
      '1.9 Date of Visit': record.dateVisit ? new Date(record.dateVisit).toLocaleDateString('en-IN') : '',
      '1.10 Location': record.location || '',
      '1.11 Activity to Observe': record.activityToObserve || '',
      'Created On': record.createdOn ? new Date(record.createdOn).toLocaleDateString('en-IN') : '',
      'Created By': record.createdBy || '',
      'Response Mode': record.responseMode || '',
      'Latitude': record.latitude || '',
      'Longitude': record.longitude || ''
    };
  }

  /**
   * Map AWC (Aanganwadi) section fields
   */
  static mapAwcFields(awcData) {
    const mapped = {};

    // Regular fields first
    mapped['2.1 AWC - Sam Children Total'] = awcData.samChildrenTotal || '';
    mapped['2.1.1 AWC - Sam Children 06'] = awcData.samChildren06 || '';
    mapped['2.1.2 AWC - Sam Children 65'] = awcData.samChildren65 || '';
    mapped['2.2 AWC - Cmam Children Total'] = awcData.cmamChildrenTotal || '';
    mapped['2.2.1 AWC - Cmam Children 06'] = awcData.cmamChildren06 || '';
    mapped['2.2.2 AWC - Cmam Children 65'] = awcData.cmamChildren65 || '';

    // 2.3 Variation Reason (Multiple choice with Others)
    this.mapMultipleChoiceField(mapped, '2.3 AWC - Variation Reason', awcData.variationReason, {
      'vhndVisitDidNotHappen': 'VHND / ANM visit did not happen after identification',
      'childNotAvailableDuringVisit': 'Child was not available during VHND / ANM visit',
      'familyNotWillingToEnroll': 'Family is not willing to get the child checked and enrolled',
      'childReferredToNRCMTC': 'Child referred to NRC/MTC',
      'childBetween0to6Months': 'Child between 0-6 Month',
      'notApplicable': 'Not applicable',
      'other': 'Others'
    }, true);

    // Equipment availability fields
    mapped['3.1 AWC - Weighing Scale'] = awcData.weighingScale || '';
    mapped['3.2 AWC - Salter Scale'] = awcData.salterScale || '';
    mapped['3.3 AWC - Infantometer'] = awcData.infantometer || '';
    mapped['3.4 AWC - Stadiometer'] = awcData.stadiometer || '';
    mapped['3.5 AWC - Supplementary Nutrition'] = awcData.supplementaryNutrition || '';
    mapped['3.6 AWC - Register Availability'] = awcData.registerAvailability || '';
    mapped['3.7 AWC - Poshan Tracker Updated'] = awcData.poshanTrackerUpdated || '';

    // 3.8 Reason Poshan Tracker Not Updated (Multiple choice with Others)
    this.mapMultipleChoiceField(mapped, '3.8 AWC - Reason Poshan Tracker Not Updated', awcData.reasonPoshanTrackerNotUpdated, {
      'growthMonitoringNotCompleted': 'Growth monitoring could not be completed for all children',
      'mobileDeviceNotFunctional': 'Mobile device not functional',
      'unableToOperateDevice': 'Unable to operate the mobile device / application',
      'connectivityIssues': 'Connectivity issues',
      'other': 'Others'
    }, true);

    // Medicine availability fields
    mapped['3.9.1 AWC - Amoxycillin Syrup'] = awcData.amoxycillinSyrup || '';
    mapped['3.9.2 AWC - Folic Acid Tablet'] = awcData.folicAcidTablet || '';
    mapped['3.9.3 AWC - Albendazole'] = awcData.albendazole || '';
    mapped['3.9.4 AWC - Vit A'] = awcData.vitA || '';
    mapped['3.9.5 AWC - Ifa Syrup'] = awcData.ifaSyrup || '';
    mapped['3.9.6 AWC - Multivitamin Syrup'] = awcData.multivitaminSyrup || '';
    mapped['3.9.7 AWC - Zinc'] = awcData.zinc || '';
    mapped['3.9.8 AWC - Ors'] = awcData.ors || '';
    mapped['3.9.9 AWC - Pcm'] = awcData.pcm || '';

    // Training fields
    mapped['4.1 AWC - Cmam Training'] = awcData.cmamTraining || '';
    mapped['4.2 AWC - Cmam Training Month'] = awcData.cmamTrainingMonth || '';
    mapped['4.3 AWC - Cmam Training Discussed'] = awcData.cmamTrainingDiscussed || '';

    // Child measurement fields
    mapped['4.4 AWC - Date Child Measured'] = awcData.dateChildMeasured || '';
    mapped['4.5 AWC - Child Sex'] = awcData.childSex || '';
    mapped['4.6 AWC - Child Age'] = awcData.childAge || '';
    mapped['4.7 AWC - Child Weight'] = awcData.childWeight || '';
    mapped['4.8 AWC - Child Height'] = awcData.childHeight || '';

    mapped['4.9 AWC - Instrument Aww'] = awcData.instrumentAww || '';

    // 4.10.1 Digital Weighing Scale Steps
    this.mapMultipleChoiceField(mapped, '4.10.1 AWC - Digital Weighing Steps',
      awcData.instrumentAww && awcData.instrumentAww.toLowerCase() === 'digital weighing scale' ? awcData.measurementFollowedStep : '', {
      'scaleKeptFlatSurface': 'Scale kept at flat surface',
      'zeroErrorChecked': 'Zero error of the machine was checked',
      'childWeighedMinimumClothes': 'Child weighed with minimum clothes',
      'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
      'notFollowedAnySteps': 'Not followed any of the above steps'
    }, false);

    // 4.10.2 Mechanical Weighing Scale Steps
    this.mapMultipleChoiceField(mapped, '4.10.2 AWC - Mechanical Weighing Steps',
      awcData.instrumentAww && awcData.instrumentAww.toLowerCase() === 'mechanical weighing scale' ? awcData.measurementFollowedStep : '', {
      'scaleKeptFlatSurface': 'Scale kept at flat surface',
      'zeroErrorChecked': 'Zero error of the machine was checked',
      'childWeighedMinimumClothes': 'Child weighed with minimum clothes',
      'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
      'notFollowedAnySteps': 'Not followed any of the above steps'
    }, false);

    // 4.10.3 Salter Weighing Scale Steps
    this.mapMultipleChoiceField(mapped, '4.10.3 AWC - Salter Weighing Steps',
      awcData.instrumentAww && awcData.instrumentAww.toLowerCase().includes('salter') ? awcData.measurementFollowedStep : '', {
      'scaleHangingCorrectly': 'Scale was hanging correctly',
      'zeroErrorChecked': 'Zero error of the machine was checked',
      'childWeighedMinimumClothes': 'Child weighed with minimum clothes',
      'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
      'notFollowedAnySteps': 'Not followed any of the above steps'
    }, false);

    // Weight measurement fields
    mapped['4.11 AWC - Child Weight Aww'] = awcData.childWeightAww || '';
    mapped['4.12 AWC - Child Weight Field Monitor'] = awcData.childWeightFieldMonitor || '';

    // 4.13 Child Height Instrument (Single choice with Others)
    this.mapSingleChoiceWithOthers(mapped, '4.13 AWC - Child Height Instrument', awcData.childHeightInstrument);

    // 4.14.1 Infantometer Steps
    this.mapMultipleChoiceField(mapped, '4.14.1 AWC - Infantometer Steps',
      awcData.childHeightInstrument && awcData.childHeightInstrument.toLowerCase() === 'infantometer' ? awcData.childHeightSteps : '', {
      'scaleKeptFlatSurfaceHeight': 'Scale was kept on flat surface',
      'headFootTouchingPieces': 'Head and foot of the child was touching the head piece and foot piece, respectively',
      'childKneeStraight': 'Child\'s knee was straight',
      'awwTookHelpMother': 'AWW took the help of mother/AWH to hold the child in correct position',
      'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
      'notFollowedAnySteps': 'Not followed any of the above steps'
    }, false);

    // 4.14.2 Stadiometer Steps
    this.mapMultipleChoiceField(mapped, '4.14.2 AWC - Stadiometer Steps',
      awcData.childHeightInstrument && awcData.childHeightInstrument.toLowerCase() === 'stadiometer' ? awcData.childHeightSteps : '', {
      'scaleKeptFlatSurface': 'Scale kept at flat surface',
      'childShoesSocksRemoved': 'Child\'s shoes and socks were removed for accurate measurement',
      'backButtockBackOfKneeTouchingBoard': 'Child\'s back, buttock and back of knee were touching the board',
      'headTouchingHeadPiece': 'Head of the child was touching the head piece',
      'childKneeStraight': 'Child\'s knee was straight',
      'awwTookHelpMother': 'AWW took the help of mother/AWH to hold the child in correct position',
      'awwReadMeasurementsCorrectly': 'AWW was able to read the measurements, correctly',
      'notFollowedAnySteps': 'Not followed any of the above steps'
    }, false);

    // Height measurement fields
    mapped['4.15 AWC - Child Height Aww'] = awcData.childHeightAww || '';
    mapped['4.16 AWC - Child Height Field Monitor'] = awcData.childHeightFieldMonitor || '';

    mapped['4.17 AWC - Classify Wasting Aww'] = awcData.classifyWastingAww || '';
    mapped['4.18 AWC - Nutritional Status X Scorecard'] = awcData.nutritionalStatusXScorecard || '';
    mapped['4.19 AWC - Screening Sam Children'] = awcData.screeningSamChildren || '';

    // 4.20 Appetite Test Food (Multiple choice with Others)
    this.mapMultipleChoiceField(mapped, '4.20 AWC - Appetite Test Food', awcData.appetiteTestFood, {
      'takeRationRoutine': 'Take Home Ration – routine',
      'takeHomeRationEnhanced': 'Take Home Ration – enhanced for SAM child',
      'hotCookedMeal': 'Hot cooked meal prepared by the mother',
      'hotCookedMealAWW': 'Hot cooked meal prepared by AWW / SHG',
      'basedOnDietHistory': 'Based on diet history',
      'dontKnow': 'Don\'t know',
      'other': 'Others'
    }, true);

    // 4.21 Nutritional Oedema (Multiple choice, no Others)
    this.mapMultipleChoiceField(mapped, '4.21 AWC - Nutritional Oedema', awcData.nutritionalOedema, {
      'assessmentDoneRemovingSocksShoes': 'Assessment done by removing socks and shoes',
      'assessmentOedemaBothFeet': 'Assessment of oedema done by pressing both the feet simultaneously',
      'pressedBothFeetThreeSeconds': 'Pressed both the feet for at least 3 seconds',
      'lookedFeltPits': 'Looked and felt for pits on both the feet',
      'dontKnow': 'Don\'t know'
    }, false);

    // 4.22 Child NRC MTC (Multiple choice, no Others)
    this.mapMultipleChoiceField(mapped, '4.22 AWC - Child Nrc Mtc', awcData.childNrcMtc, {
      'identifiedWithMedicalComplications': 'Identified with medical complications',
      'identifiedWithoutComplicationsFailedAppetite': 'Identified without medical complications but the child failed in the appetite test',
      'passedAppetiteTestNoComplications': 'Child has passed the appetite test and has no medical complications',
      'identifiedBilateralPittingEdema': 'Identified with bilateral pitting edema',
      'developsMedicalComplicationDuringCMAM': 'Child develops any medical complication during the CMAM treatment in community',
      'failsAppetiteTestDuringFollowUp': 'Child fails in the appetite test/reports poor feeding during community level follow up in any CMAM session/clinic',
      'noWeightGainTwoConsecutiveFollowUps': 'Child does not gain weight or loses weight in two consecutive follow-ups during the CMAM treatment in community',
      'complicationsTwoConsecutiveFollowUps': 'Child develops any complication during two consecutive follow-ups during the CMAM treatment in community',
      'dontKnow': 'Don\'t know'
    }, false);

    // 4.23 Child Followup CMAM (Single choice with Others)
    this.mapSingleChoiceWithOthers(mapped, '4.23 AWC - Child Followup Cmam', awcData.childFollowupCmam);

    // 4.24 Activities Followup CMAM (Multiple choice with Others)
    this.mapMultipleChoiceField(mapped, '4.24 AWC - Activities Followup Cmam', awcData.activitiesFollowupCmam, {
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
      'other': 'Others'
    }, true);

    return mapped;
  }

  /**
   * Map CBE section fields
   */
  static mapCbeFields(cbeData) {
    const mapped = {};

    this.mapSingleChoiceWithOthers(mapped, '5.1 CBE - Theme Of Cbe', cbeData.themeOfCbe);

    this.mapMultipleChoiceField(mapped, '5.2 CBE - Type Of Beneficiary Attended', cbeData.typeOfBeneficiaryAttendedCbe, {
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
    }, true);

    this.mapMultipleChoiceField(mapped, '5.3 CBE - Service Providers Present', cbeData.serviceProvidersPresentCbe, {
      'asha': 'ASHA',
      'anm': 'ANM',
      'other': 'Others'
    }, true);

    mapped['5.4 CBE - Group Counselling Conducted'] = cbeData.groupCounsellingConducted || '';

    if (cbeData.groupCounsellingConducted === 'Yes') {
      this.mapMultipleChoiceField(mapped, '5.5 CBE - Counselling Topics', cbeData.counsellingTopicsCbe, {
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
      }, true);

      this.mapMultipleChoiceField(mapped, '5.6 CBE - Counselling Aids Used', cbeData.counsellingAidsUsed, {
        'mcpCard': 'MCP card',
        'poshanTrackerAppResources': 'Poshan Tracker app resources',
        'individualGrowthChart': 'Individual growth chart',
        'communityGrowthChart': 'Community growth chart',
        'ilaModuleTakeAway': 'ILA module take away',
        'cmamBookResources': 'CMAM book resources',
        'otherTechEnabledResource': 'Other tech enabled resource',
        'nothing': 'Nothing',
        'other': 'Others'
      }, true);
    }

    mapped['5.7 CBE - Other Important Observation'] = cbeData.otherImportantObservation || '';

    return mapped;
  }

  /**
   * Map VHSND section fields
   */
  static mapVhsndFields(vhsndData) {
    const mapped = {};

    mapped['6.1 VHSND - Visit Day'] = vhsndData.vhsndVisitDay || '';
    mapped['6.2 VHSND - Physical Exam Sam'] = vhsndData.physicalExamSam || '';

    this.mapMultipleChoiceField(mapped, '6.3 VHSND - Test Conducted Sam', vhsndData.testConductedSam, {
      'askedHistoryIllnessSymptoms': 'Asked history illness symptoms',
      'askedChildEatingFood': 'Asked child eating food',
      'other': 'Others'
    }, true);

    mapped['6.4 VHSND - Medical Complication'] = vhsndData.vhsndMedicalComplication || '';
    mapped['6.5 VHSND - Appetite Test Conducted'] = vhsndData.vhsndAppetiteTestConducted || '';
    mapped['6.6 VHSND - Child Referral Nrc'] = vhsndData.childReferralNrc || '';
    mapped['6.7 VHSND - Mother Agree Nrc'] = vhsndData.motherAgreeNrc || '';

    this.mapMultipleChoiceField(mapped, '6.8 VHSND - Mother Not Agree Reason', vhsndData.motherNotAgreeReason, {
      'careOfSiblings': 'Care of siblings',
      'lossOfLivelihood': 'Loss of livelihood',
      'notAllowedByFamily': 'Not allowed by family',
      'other': 'Others'
    }, true);

    mapped['6.9 VHSND - Child Enrolled Cmam'] = vhsndData.childEnrolledCmam || '';
    mapped['6.10 VHSND - Amoxycillin'] = vhsndData.vhsndAmoxycillin || '';
    mapped['6.11 VHSND - Folic Acid Tablet'] = vhsndData.vhsndFolicAcidTablet || '';
    mapped['6.12 VHSND - Albendazole'] = vhsndData.vhsndAlbendazole || '';
    mapped['6.13 VHSND - Ifa Syrup'] = vhsndData.vhsndIfaSyrup || '';
    mapped['6.14 VHSND - Vit A'] = vhsndData.vhsndVitA || '';
    mapped['6.15 VHSND - Multivitamin Syrup'] = vhsndData.vhsndMultivitaminSyrup || '';
    mapped['6.16 VHSND - Zinc'] = vhsndData.vhsndZinc || '';
    mapped['6.17 VHSND - Ors'] = vhsndData.vhsndOrs || '';
    mapped['6.18 VHSND - Pcm'] = vhsndData.vhsndPcm || '';
    mapped['6.19 VHSND - First Dose Amoxicillin'] = vhsndData.firstDoseAmoxicillin || '';
    mapped['6.20 VHSND - Mother Amoxicillin'] = vhsndData.motherAmoxicillin || '';
    mapped['6.21 VHSND - Mother Amoxicillin Counselled'] = vhsndData.motherAmoxicillinCounselled || '';
    mapped['6.22 VHSND - Child Folic'] = vhsndData.childFolic || '';
    mapped['6.23 VHSND - Albendazole Guidelines'] = vhsndData.albendazoleGuidelines || '';
    mapped['6.24 VHSND - Vit A Enrolement'] = vhsndData.vitAEnrolement || '';
    mapped['6.25 VHSND - First Dose Multivit'] = vhsndData.firstDoseMultivit || '';
    mapped['6.26 VHSND - Mother Multivitamin'] = vhsndData.motherMultivitamin || '';
    mapped['6.27 VHSND - Mother Counsel'] = vhsndData.motherCounsel || '';
    mapped['6.28 VHSND - Mother Thr'] = vhsndData.motherThr || '';

    this.mapMultipleChoiceField(mapped, '6.29 VHSND - Mother Given Message', vhsndData.motherGivenMessage, {
      'breastfeeding': 'Breastfeeding',
      'continuingBreastfeedingBelowTwoYears': 'Continuing breastfeeding below two years',
      'other': 'Others'
    }, true);

    mapped['6.30 VHSND - Child Discharged Cmam'] = vhsndData.childDischargedCmam || '';

    this.mapMultipleChoiceField(mapped, '6.31 VHSND - Counselling Aids', vhsndData.counsellingAids, {
      'mcpCard': 'MCP Card',
      'poshanTrackerAppResources': 'Poshan Tracker app resources',
      'individualGrowthChart': 'Individual growth chart',
      'communityGrowthChart': 'Community growth chart',
      'ilaModuleTakeAway': 'ILA module take away',
      'cmamBookResources': 'CMAM book resources',
      'otherTechEnabledResource': 'Other tech enabled resource',
      'nothing': 'Nothing',
      'other': 'Others'
    }, true);

    mapped['7.1 VHSND - Cmam Training'] = vhsndData.cmamTraining || '';
    mapped['7.2 VHSND - Cmam Training Month'] = vhsndData.cmamTrainingMonth || '';
    mapped['7.3 VHSND - Confirm Child Sam'] = vhsndData.confirmChildSam || '';

    this.mapMultipleChoiceField(mapped, '7.4 VHSND - Assessing Medical Complication', vhsndData.assessingMedicalComplication, {
      'symptomsCough': 'Symptoms – cough',
      'symptomsFever': 'Symptoms – fever',
      'symptomsDiarrhea': 'Symptoms – diarrhea',
      'symptomsVomiting': 'Symptoms – vomiting',
      'skinInfection': 'Skin infection',
      'respiratoryDistress': 'Respiratory distress',
      'other': 'Others'
    }, true);

    this.mapMultipleChoiceField(mapped, '7.5 VHSND - Child Sam Referred Nrc', vhsndData.childSamReferredNrc, {
      'respiratoryRate50': 'Respiratory rate ≥50 /minute for children aged 6 month to 1 year',
      'respiratoryRate60': 'Respiratory rate ≥60 /minute for children aged 1-5 years',
      'other': 'Others'
    }, true);

    this.mapMultipleChoiceField(mapped, '7.6 VHSND - Medicines Given Community Level', vhsndData.medicinesGivenCommunityLevel, {
      'amoxycillin': 'Amoxycillin',
      'folicAcidTablet': 'Folic acid tablet',
      'other': 'Others'
    }, true);

    return mapped;
  }

  /**
   * Map Household section fields
   */
  static mapHouseholdFields(householdData) {
    const mapped = {};

    if (householdData.nameOfChild !== undefined) {
      mapped['8.1 HH - Name Of Child'] = householdData.nameOfChild || '';
      mapped['8.2 HH - Current Age Months'] = householdData.currentAgeMonths || '';
      mapped['8.3 HH - Sex Of Child'] = householdData.sexOfChild || '';
      mapped['8.4 HH - Current Followup Or Recovered'] = householdData.currentFollowupOrRecovered || '';
      mapped['8.5 HH - Child Card Record Availability'] = householdData.childCardRecordAvailability || '';

      this.mapSingleChoiceWithOthers(mapped, '8.6 HH - Type Of Record Available', householdData.typeOfRecordAvailable);

      mapped['8.7 HH - Last Weighed Date'] = householdData.lastWeighedDate || '';
      mapped['8.8 HH - Last Measured Height Date'] = householdData.lastMeasuredHeightDate || '';

      this.mapMultipleChoiceField(mapped, '8.9 HH - Who Measured Child', householdData.whoMeasuredChild, {
        'AWW': 'AWW',
        'ASHA': 'ASHA',
        'ANM': 'ANM'
      }, false);

      mapped['8.10 HH - Aww Visits Past Month'] = householdData.awwVisitsPastMonth || '';

      this.mapMultipleChoiceField(mapped, '8.11 HH - Aww Actions During Visit', householdData.awwActionsDuringVisit, {
        'enquiredAboutAnyHealthIssuesInTheChildSymptomsSigns': 'Enquired about any health issues in the child',
        'weighedTheChild': 'Weighed the child',
        'enquiredAboutConsumptionOfMedicineAndSupplementByTheChild': 'Enquired about consumption of medicine and supplement by the child',
        'checkedForThePacketsOfTHR': 'Checked for the packets of THR',
        'counselledOnUseOfTHR': 'Counselled on use of THR',
        'counselledOnEnrichingHomeFoodForTheChild': 'Counselled on enriching home food for the child',
        'counselledOtherFamilyMembersIncludingInLawsHusbandAndOthers': 'Counselled other family members',
        'nothing': 'Nothing',
        'counselledOnAnyOtherTopic': 'Counselled on any other topic'
      }, true);

      mapped['8.12 HH - Frequency Of Weight Measurement'] = householdData.frequencyOfWeightMeasurement || '';
      mapped['8.13 HH - Anm Medicine At Enrollment'] = householdData.anmMedicineAtEnrollment || '';

      this.mapMultipleChoiceField(mapped, '8.14 HH - Medicines Consumed During Treatment', householdData.medicinesConsumedDuringTreatment, {
        'Amoxycillin': 'Amoxycillin',
        'IFA Syrup': 'IFA Syrup',
        'Multivitamin syrup': 'Multivitamin syrup',
        'Folic Acid': 'Folic Acid',
        'Albendazole': 'Albendazole',
        'Vitamin-A': 'Vitamin-A',
        'Zinc': 'Zinc'
      }, false);

      mapped['8.15 HH - Child Consume Antibiotic Five Days'] = householdData.childConsumeAntibioticFiveDays || '';
      mapped['8.16 HH - Thr Received From Awc'] = householdData.thrReceivedFromAwc || '';

      this.mapSingleChoiceWithOthers(mapped, '8.17 HH - Thr Not Received Reason', householdData.thrNotReceivedReason);

      mapped['8.18 HH - Record For Verification'] = householdData.recordForVerification || '';
      mapped['8.19 HH - Qty Thr Received Past Month'] = householdData.qtyThrReceivedPastMonth || '';
      mapped['8.20 HH - Child Consume Thr'] = householdData.childConsumeThr || '';

      this.mapMultipleChoiceField(mapped, '8.21 HH - Child Not Consume Thr', householdData.childNotConsumeThr, {
        'didNotLikeTheContentPacket': 'Did not like the content packet',
        'didNotLikeTheTaste': 'Did not like the taste',
        'qualityIsPoor': 'Quality is poor',
        'howToUse': 'How to use',
        'notPossibleToSeparatelyCookForTheChild': 'Not possible to separately cook for the child',
        'other': 'Other'
      }, true);

      mapped['8.22 HH - Who Consume Thr'] = householdData.whoConsumeThr || '';
      mapped['8.23 HH - Days Thr Consume Child'] = householdData.daysThrConsumeChild || '';

      this.mapSingleChoiceWithOthers(mapped, '8.24 HH - Thr Qty Prepare Child', householdData.thrQtyPrepareChild);
      this.mapSingleChoiceWithOthers(mapped, '8.25 HH - Store Thr', householdData.storeThr);

      mapped['8.26 HH - Counselling On Home Food'] = householdData.counsellingOnHomeFood || '';

      this.mapMultipleChoiceField(mapped, '8.27 HH - Counselling Advice Receive', householdData.counsellingAdviceReceive, {
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
        'others': 'Others'
      }, true);
    }

    if (householdData.childFullName !== undefined) {
      mapped['9.1 HH - Child Full Name'] = householdData.childFullName || '';
      mapped['9.2 HH - Child Gender'] = householdData.childGender || '';
      mapped['9.3 HH - Child Age In Months'] = householdData.childAgeInMonths || '';
      mapped['9.4 HH - Breastfed Times In 24 Hrs'] = householdData.breastfedTimesIn24Hrs || '';
      mapped['9.5 HH - Fed Food Times In 24 Hrs'] = householdData.fedFoodTimesIn24Hrs || '';
    }

    return mapped;
  }

  /**
   * Helper: Map multiple choice fields with Yes/No columns
   */
  static mapMultipleChoiceField(mapped, fieldPrefix, value, optionMap, hasOthers) {
    if (!value) {
      Object.values(optionMap).forEach(displayName => {
        mapped[`${fieldPrefix} - ${displayName}`] = 'No';
      });
      if (hasOthers) {
        mapped[`${fieldPrefix} - Other (Custom Text)`] = '';
      }
      return;
    }

    const selectedOptions = value.split(',').map(opt => opt.trim());
    let otherText = '';

    Object.entries(optionMap).forEach(([key, displayName]) => {
      if (key === 'other') {
        const otherOption = selectedOptions.find(opt =>
          opt.toLowerCase().startsWith('others - ') ||
          opt.toLowerCase().startsWith('other - ')
        );
        mapped[`${fieldPrefix} - ${displayName}`] = otherOption ? 'Yes' : 'No';
        if (otherOption) {
          otherText = otherOption.split(' - ').slice(1).join(' - ');
        }
      } else {
        const isSelected = selectedOptions.some(selectedOpt => {
          if (selectedOpt === key) return true;
          if (selectedOpt === displayName) return true;
          return false;
        });
        mapped[`${fieldPrefix} - ${displayName}`] = isSelected ? 'Yes' : 'No';
      }
    });

    if (hasOthers) {
      mapped[`${fieldPrefix} - Other (Custom Text)`] = otherText;
    }
  }

  /**
   * Helper: Map single choice fields with Others option
   */
  static mapSingleChoiceWithOthers(mapped, fieldName, value) {
    if (!value) {
      mapped[fieldName] = '';
      mapped[`${fieldName} - Other (Custom Text)`] = '';
      return;
    }

    if (value.toLowerCase().includes('others - ') || value.toLowerCase().includes('other - ')) {
      const parts = value.split(' - ');
      mapped[fieldName] = parts[0].trim();
      mapped[`${fieldName} - Other (Custom Text)`] = parts.slice(1).join(' - ').trim();
    } else {
      mapped[fieldName] = value;
      mapped[`${fieldName} - Other (Custom Text)`] = '';
    }
  }
}

export default ExcelMappingService;
