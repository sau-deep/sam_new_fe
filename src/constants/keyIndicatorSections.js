// Key Indicator dashboard layout, shared by KeyIndicatorDashboard and the Key Indicators tab of RMC Analytics.
// One chart per indicator in "Dashboard Indicators" (numbered 1–29 as in the doc, plus its two "Extra"
// indicators). `field` is the chart key in /form/routine-monitoring/key-indicator-dashboard.
// Charts that are not in the doc sit in their own section; `dataKey` names the API section they read.
export const KI_SECTIONS = [
  {
    key: "awc", title: "AWC Level Monitoring", color: "#1CABE2", bg: "#E6F7FF", border: "#91D5FF",
    indicators: [
      { no: 1, field: "weighingScaleFunctional", label: "% of AWC with availability of functional weighing scale (child)" },
      { no: 2, field: "stadiometerFunctional", label: "% of AWC with availability of functional stadiometer (child)" },
      { no: 3, field: "infantometerFunctional", label: "% of AWC with availability of functional infantometer (child)" },
      { no: 4, field: "athrAvailableSAM", label: "% of AWCs that have A-THR available for SAM children as per state protocol" },
      { no: 5, field: "thrAvailableSAM", label: "% of AWCs that have THR available for SAM children as per state protocol" },
      { no: "Extra", field: "athrOrThrAvailableSAM", label: "% of AWCs that have either A-THR or THR available for SAM children as per state protocol" },
      { no: 6, field: "awwTrainingCMAM", label: "% of AWWs received training on CMAM" },
      { no: 7, field: "awwMeasureWeight", label: "% of AWWs able to correctly measure the weight of the child" },
      { no: 8, field: "awwMeasureHeight", label: "% of AWWs able to correctly measure the height/length of the child" },
      { no: 9, field: "awwClassifyWasting", label: "% of AWWs able to classify wasting status of the child" },
      { no: 10, field: "awwKnowledgeScore100", label: "% of AWWs with knowledge score of 100% (6 out of 6)" },
    ],
  },
  {
    key: "anm", title: "ANM Level Monitoring", color: "#52C41A", bg: "#F6FFED", border: "#B7EB8F",
    indicators: [
      { no: 11, field: "anmAntibiotics", label: "% of ANMs that have anti-biotics available for SAM children" },
      { no: 12, field: "anmMultivitamin", label: "% of ANMs that have multi-vitamin syrup available for SAM children" },
      { no: 13, field: "anmFolicAcid", label: "% of ANMs that have folic acid tablets available for SAM children" },
      { no: 14, field: "anmIfaSyrup", label: "% of ANMs that have IFA syrup available for children" },
      { no: 15, field: "anmZinc", label: "% of ANMs that have zinc tablets available for children" },
      { no: "Extra", field: "anmAlbendazole", label: "% of ANMs that have albendazole available for children" },
      { no: 16, field: "anmTrainingCMAM", label: "% of ANMs received training on CMAM" },
      { no: 17, field: "anmAwareSamCriteria", label: "% of ANMs aware of the criteria to identify SAM child" },
      { no: 18, field: "anmKnowledgeScore100", label: "% of ANMs with knowledge score of 100% (4 out of 4)" },
    ],
  },
  {
    key: "samChild", title: "SAM Child Level Monitoring (6–59 months)", color: "#F26A21", bg: "#FFF7E6", border: "#FFD591",
    indicators: [
      { no: 19, field: "scheduledHomeVisits", label: "% of enrolled children with SAM that receive scheduled home visits (as per state protocol)" },
      { no: 20, field: "antibioticConsumed", label: "% of enrolled children with SAM that consumed antibiotic (as per state protocol)" },
      { no: 21, field: "thrFedExclusivelyToSAM", label: "% of households that reported feeding THR (provided by AWW) exclusively to the enrolled children with SAM" },
      { no: 22, field: "thr25DaysPastMonth", label: "% of enrolled children with SAM who received the THR for at least 25 days in past one month" },
      { no: 23, field: "thrRecommendedQuantityDaily", label: "% of enrolled children with SAM who consumed recommended quantity of THR everyday (as per state protocol)" },
      { no: 24, field: "weightMeasuredByAWW", label: "% of enrolled children with SAM whose weight was measured by AWW during follow up period (weekly or fortnightly follow-up during treatment period as per state CMAM protocol)" },
    ],
  },
  {
    key: "child0To23Months", title: "Child Level Monitoring (0–23 months)", color: "#9B59B6", bg: "#F9F0FF", border: "#D3ADF7",
    indicators: [
      { no: 25, field: "exclusiveBreastfeeding0To6", label: "% of 0–6-month children who received exclusive breastfeeding in the previous 24 hours" },
      { no: 26, field: "solidSemiSolidAndBreastmilk6To8", label: "% of 6–8-month children received solid or semi-solid food and breastmilk" },
      { no: 27, field: "minAcceptableDiet6To23", label: "% of 6–23-month children consumed minimum acceptable diet" },
      { no: 28, field: "ifaSyrup6To23", label: "% of 6–23-month children received IFA Syrup twice during last week" },
      { no: 29, field: "vitaminALast6Months9To23", label: "% of 9–23-month children received vitamin A in last 6 months" },
    ],
  },
  {
    key: "samChildAdditional", dataKey: "samChild", title: "Additional SAM Child Monitoring (not in the indicator list)",
    color: "#8C8C8C", bg: "#FAFAFA", border: "#D9D9D9",
    indicators: [
      { field: "counsellingFeedingQuality", label: "Households received counselling on improving feeding / nutritional quality" },
      { field: "adviceDuringHomeVisits", label: "Different advice received during home visits" },
    ],
  },
];

// "10 indicators + 1 extra" for doc sections, "2 charts" for the additional section
export const sectionCountLabel = (section) => {
  const numbered = section.indicators.filter((i) => typeof i.no === "number").length;
  const extra = section.indicators.filter((i) => i.no === "Extra").length;
  if (!numbered && !extra) return `${section.indicators.length} charts`;
  return `${numbered} indicators${extra ? ` + ${extra} extra` : ""}`;
};

// "#7" / "Extra" badge text for a chart title; null for charts that are not in the doc
export const indicatorBadge = (indicator) =>
  indicator.no === "Extra" ? "Extra" : typeof indicator.no === "number" ? `#${indicator.no}` : null;
