import { useState, useCallback, useEffect, useRef } from "react";
import {
  Row, Col, Card, Select, DatePicker, Button, Table, Tag, Tabs,
  Typography, Segmented, Space, Progress, Statistic, Spin, Alert,
} from "antd";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, RadialBarChart, RadialBar,
} from "recharts";
import { FilterOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import ChartCard from "../../components/charts/ChartCard";
import IndiaMap from "../../components/dashboard/IndiaMap";
import StatCard from "../../components/dashboard/StatCard";
import api from "../../services/axiosInstance";
import { CHART_COLORS, UNICEF_COLORS } from "../../theme/unicef";
import { useAuth } from "../../context/AuthContext";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const SECTION_TYPES = [
  { label: "AWC", value: "AWC" },
  { label: "VHSND", value: "VHSND" },
  { label: "CBE", value: "CBE" },
  { label: "Household", value: "HOUSEHOLD" },
];

// Demo data
const DEMO_INDICATORS = [
  { name: "AWC Open During Visit", value: 78, target: 80, section: "AWC" },
  { name: "Weighing Machine Available", value: 92, target: 95, section: "AWC" },
  { name: "Growth Chart Maintained", value: 65, target: 75, section: "AWC" },
  { name: "VHSND Conducted", value: 71, target: 80, section: "VHSND" },
  { name: "Pregnant Women Screened", value: 58, target: 70, section: "VHSND" },
  { name: "Children Weighed", value: 83, target: 85, section: "VHSND" },
  { name: "CBE Activity Held", value: 62, target: 75, section: "CBE" },
  { name: "Community Attendance", value: 48, target: 60, section: "CBE" },
];
const DEMO_DISTRICT = [
  { district: "District A", awc: 78, vhsnd: 65, cbe: 58, submissions: 420 },
  { district: "District B", awc: 82, vhsnd: 71, cbe: 62, submissions: 380 },
  { district: "District C", awc: 70, vhsnd: 60, cbe: 52, submissions: 310 },
  { district: "District D", awc: 68, vhsnd: 55, cbe: 48, submissions: 280 },
  { district: "District E", awc: 85, vhsnd: 74, cbe: 68, submissions: 250 },
];
const DEMO_SECTION_DIST = [
  { name: "AWC", value: 3200, color: CHART_COLORS[0] },
  { name: "VHSND", value: 2400, color: CHART_COLORS[1] },
  { name: "CBE", value: 1800, color: CHART_COLORS[2] },
  { name: "Household", value: 840, color: CHART_COLORS[3] },
];
const DEMO_TREND = Array.from({ length: 12 }, (_, i) => ({
  month: dayjs().subtract(11 - i, "month").format("MMM"),
  awc: 200 + Math.random() * 200,
  vhsnd: 150 + Math.random() * 150,
  cbe: 100 + Math.random() * 100,
}));
const DEMO_MAP = { "Rajasthan": 3240, "Odisha": 2890, "Madhya Pradesh": 2650, "Chhattisgarh": 1980, "Jharkhand": 1120, "Telangana": 600 };

const DISTRICT_COLS = [
  { title: "District", dataIndex: "district", fixed: "left" },
  { title: "Submissions", dataIndex: "submissions", sorter: (a, b) => a.submissions - b.submissions, render: (v) => <strong>{v}</strong> },
  { title: "AWC Rate", dataIndex: "awc", render: (v) => <Progress percent={v} size="small" strokeColor={CHART_COLORS[0]} showInfo style={{ minWidth: 120 }} /> },
  { title: "VHSND Rate", dataIndex: "vhsnd", render: (v) => <Progress percent={v} size="small" strokeColor={CHART_COLORS[1]} showInfo style={{ minWidth: 120 }} /> },
  { title: "CBE Rate", dataIndex: "cbe", render: (v) => <Progress percent={v} size="small" strokeColor={CHART_COLORS[2]} showInfo style={{ minWidth: 120 }} /> },
];


// ─── Key Indicator Chart Helpers ─────────────────────────────────────────────
const KI_CHART_COLORS = ["#1CABE2", "#374EA2", "#52C41A", "#F26A21", "#9B59B6", "#00BCD4", "#FF7043"];
const KI_STACK_COLORS = ["#52C41A", "#FF4D4F", "#1CABE2", "#F26A21"];

const isKIMultiSeries = (d) => d != null && Array.isArray(d?.categories) && Array.isArray(d?.series);

// Abbreviate multi-word names to initials: "Mohla-Manpur-Ambagarh Chouki" → "MMAC"
const shortLabel = (name) => {
  const s = String(name ?? "").trim();
  if (!s) return "";
  const tokens = s.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (tokens.length <= 1) return s;
  return tokens.map(t => t.charAt(0)).join("").toUpperCase();
};

function KISingleChart({ data }) {
  const safe = Array.isArray(data) ? data : [];
  if (!safe.length) return <div style={{ color: "#9CA3AF", textAlign: "center", padding: "28px 0", fontSize: 12 }}>No data available</div>;
  const maxRaw = Math.max(...safe.map(d => Number(d.value ?? d.percentage ?? 0)), 0);
  const isRatio = maxRaw > 0 && maxRaw <= 1;
  const pts = safe.map(d => ({
    full: d.name || d.district || "",
    name: shortLabel(d.name || d.district || ""),
    v: Number(d.value ?? d.percentage ?? 0) * (isRatio ? 100 : 1),
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={pts} margin={{ top: 4, right: 8, left: -18, bottom: 58 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" height={68} interval={0} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
        <Tooltip
          formatter={v => [`${Number(v).toFixed(1)}%`, "Value"]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ""}
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        <Bar dataKey="v" name="%" fill="#1CABE2" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function KIClusteredChart({ categories, series }) {
  if (!categories?.length || !series?.length) return <div style={{ color: "#9CA3AF", textAlign: "center", padding: "28px 0", fontSize: 12 }}>No data available</div>;
  const pts = categories.map((cat, i) => {
    const p = { full: cat, name: shortLabel(cat) };
    series.forEach(s => { p[s.name] = Array.isArray(s.data) ? Number(s.data[i] ?? 0) : 0; });
    return p;
  });
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={pts} margin={{ top: 4, right: 8, left: -18, bottom: 58 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" height={68} interval={0} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
        <Tooltip
          formatter={v => `${Number(v).toFixed(1)}%`}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ""}
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
        {series.map((s, idx) => (
          <Bar key={s.name} dataKey={s.name} fill={KI_CHART_COLORS[idx % KI_CHART_COLORS.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function KIStackedChart({ categories, series }) {
  if (!categories?.length || !series?.length) return <div style={{ color: "#9CA3AF", textAlign: "center", padding: "28px 0", fontSize: 12 }}>No data available</div>;
  const sorted = [...series].sort((a, b) => {
    const r = n => { const l = (n || "").toLowerCase(); return l === "yes" ? 0 : l === "no" ? 1 : 2; };
    return r(a.name) - r(b.name);
  });
  const pts = categories.map((cat, i) => {
    const p = { full: cat, name: shortLabel(cat) }; let sum = 0;
    sorted.forEach(s => { const v = Number(Array.isArray(s.data) ? (s.data[i] ?? 0) : 0); p[s.name] = v; sum += v; });
    if (sum > 0 && Math.abs(sum - 100) > 0.01) sorted.forEach(s => { p[s.name] = Math.round((p[s.name] / sum) * 1e4) / 100; });
    return p;
  });
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={pts} margin={{ top: 4, right: 8, left: -18, bottom: 58 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" height={68} interval={0} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
        <Tooltip
          formatter={v => `${Number(v).toFixed(1)}%`}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ""}
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
        {sorted.map((s, idx) => (
          <Bar key={s.name} dataKey={s.name} stackId="s" fill={KI_STACK_COLORS[idx % KI_STACK_COLORS.length]}
            radius={idx === sorted.length - 1 ? [3, 3, 0, 0] : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function KIAutoChart({ data }) {
  if (!data) return <div style={{ color: "#9CA3AF", textAlign: "center", padding: "28px 0", fontSize: 12 }}>No data available</div>;
  if (isKIMultiSeries(data)) {
    const hasYesNo = data.series.some(s => ["yes", "no"].includes((s.name || "").toLowerCase()));
    return hasYesNo
      ? <KIStackedChart categories={data.categories} series={data.series} />
      : <KIClusteredChart categories={data.categories} series={data.series} />;
  }
  return Array.isArray(data)
    ? <KISingleChart data={data} />
    : <div style={{ color: "#9CA3AF", textAlign: "center", padding: "28px 0", fontSize: 12 }}>No data available</div>;
}

const KI_SECTIONS = [
  {
    key: "awc", title: "AWC Level Monitoring", color: "#1CABE2", bg: "#E6F7FF", border: "#91D5FF",
    indicators: [
      { field: "functionalMeasuringInstrument", label: "AWC with availability of functional measuring instrument (child)" },
      { field: "athrAndThrAvailableSAM", label: "AWCs that have A-THR and THR available for SAM children as per state protocol" },
      { field: "awwTrainingCMAM", label: "AWWs received training on CMAM" },
      { field: "awwCorrectlyMeasureChild", label: "AWWs able to correctly measure the child" },
      { field: "awwKnowledgeScore100", label: "AWWs with knowledge score of 100% (6 out of 6)" },
    ],
  },
  {
    key: "anm", title: "ANM Level Monitoring", color: "#52C41A", bg: "#F6FFED", border: "#B7EB8F",
    indicators: [
      { field: "medicinesAvailableSAM", label: "ANMs that have medicines available for SAM children" },
      { field: "anmTrainingCMAMAndCriteria", label: "ANMs received training on CMAM and aware of criteria to identify SAM child" },
      { field: "anmKnowledgeScore100", label: "ANMs with knowledge score of 100% (4 out of 4)" },
    ],
  },
  {
    key: "samChild", title: "SAM Child Level Monitoring", color: "#F26A21", bg: "#FFF7E6", border: "#FFD591",
    indicators: [
      { field: "scheduledHomeVisits", label: "Enrolled SAM children receiving scheduled home visits (as per state protocol)" },
      { field: "counsellingFeedingQuality", label: "Households received counselling on improving feeding / nutritional quality" },
      { field: "adviceDuringHomeVisits", label: "Different advice received during home visits" },
      { field: "antibioticConsumed", label: "Enrolled SAM children that consumed antibiotic (as per state protocol)" },
      { field: "thr25DaysPastMonth", label: "Enrolled SAM children who received THR for at least 25 days in past one month" },
      { field: "thrFedExclusivelyToSAM", label: "Households that reported feeding THR exclusively to enrolled SAM children" },
      { field: "thrRecommendedQuantityDaily", label: "Enrolled SAM children who consumed recommended quantity of THR everyday" },
      { field: "weightMeasuredByAWW", label: "Enrolled SAM children whose weight was measured by AWW during follow up" },
    ],
  },
  {
    key: "child0To23Months", title: "Child Level Monitoring (0–23 months)", color: "#9B59B6", bg: "#F9F0FF", border: "#D3ADF7",
    indicators: [
      { field: "exclusiveBreastfeeding0To6", label: "0–6-month children who received exclusive breastfeeding in the previous 24 hours" },
      { field: "solidSemiSolidAndBreastmilk6To8", label: "6–8-month children received solid or semi-solid food and breastmilk" },
      { field: "minAcceptableDietAndIFA6To23", label: "6–23-month children consumed minimum acceptable diet and received IFA syrup" },
      { field: "vitaminALast6Months9To23", label: "9–23-month children received vitamin A in last 6 months" },
    ],
  },
];

function computeKISectionStatus(sectionKey, kiData, indicators) {
  const sd = (kiData || {})[sectionKey] || {};
  let above = 0, below = 0, noData = 0;
  indicators.forEach(ind => {
    const d = sd[ind.field];
    if (!d) { noData++; return; }
    let avg = null;
    if (isKIMultiSeries(d)) {
      const yesS = d.series.find(s => (s.name || "").toLowerCase() === "yes");
      const noS = d.series.find(s => (s.name || "").toLowerCase() === "no");
      if (yesS || noS) {
        const yT = (yesS?.data || []).reduce((a, v) => a + Number(v || 0), 0);
        const nT = (noS?.data || []).reduce((a, v) => a + Number(v || 0), 0);
        avg = yT + nT > 0 ? (yT / (yT + nT)) * 100 : null;
      } else {
        let sum = 0, cnt = 0;
        d.series.forEach(s => (s.data || []).forEach(v => { sum += Number(v || 0); cnt++; }));
        avg = cnt > 0 ? sum / cnt : null;
      }
    } else if (Array.isArray(d) && d.length) {
      const maxRaw = Math.max(...d.map(x => Number(x.value ?? x.percentage ?? 0)));
      const scale = maxRaw > 0 && maxRaw <= 1 ? 100 : 1;
      avg = d.reduce((a, x) => a + Number(x.value ?? x.percentage ?? 0) * scale, 0) / d.length;
    }
    if (avg === null) noData++;
    else if (avg >= 80) above++;
    else below++;
  });
  return { above, below, noData };
}

export default function RMCAnalytics() {
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().subtract(3, "month"), dayjs()]);
  const [selectedSection, setSelectedSection] = useState("ALL");
  const [indicators, setIndicators] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  // Primary stats source: state-wise-summary (GET, reliable)
  const [stateWiseSummary, setStateWiseSummary] = useState([]);
  // Secondary: full dashboard for trend chart only
  const [dashStats, setDashStats] = useState(null);
  const { isAdmin, isUnicef, isStateAdmin, user } = useAuth();
  const [keyIndicatorLoading, setKeyIndicatorLoading] = useState(false);
  const [keyIndicatorData, setKeyIndicatorData] = useState(null);

  // State admin is locked to their own state; others can pick freely.
  const userState = user?.state || null;
  const [selectedState, setSelectedState] = useState(
    () => (isStateAdmin() && userState ? userState : "All States")
  );
  const defaultStateApplied = useRef(false);

  // Catch the case where auth loads asynchronously after mount
  useEffect(() => {
    if (isStateAdmin() && userState && selectedState === "All States") {
      setSelectedState(userState);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userState]);

  // Auto-select the first available state on initial load for non-state-admin users
  useEffect(() => {
    if (!isStateAdmin() && !defaultStateApplied.current && stateWiseSummary.length > 0) {
      const firstState = stateWiseSummary.map((s) => s.state).filter(Boolean).sort()[0];
      if (firstState) {
        defaultStateApplied.current = true;
        setSelectedState(firstState);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateWiseSummary]);

  const fetchIndicators = useCallback(async () => {
    setIndicatorsLoading(true);
    setIndicators([]); // Clear stale data from previous section immediately
    try {
      const basePayload = {
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
        state: selectedState === "All States" ? undefined : selectedState,
      };

      // Map UI section selection to backend sectionType values.
      // Household indicators are stored as HOUSEHOLD_SEC8 / HOUSEHOLD_SEC9_10_11 in DB.
      let sectionTypes;
      if (selectedSection === "ALL") {
        sectionTypes = ["AWC", "VHSND", "CBE", "HOUSEHOLD_SEC8", "HOUSEHOLD_SEC9_10_11"];
      } else if (selectedSection === "HOUSEHOLD") {
        sectionTypes = ["HOUSEHOLD_SEC8", "HOUSEHOLD_SEC9_10_11"];
      } else {
        sectionTypes = [selectedSection];
      }

      const results = await Promise.all(
        sectionTypes.map((sectionType) =>
          api.post("/form/routine-monitoring/indicators/aggregated", { ...basePayload, sectionType })
            .then(({ data }) => data?.data?.data || [])
            .catch(() => [])
        )
      );

      const allItems = results.flat();
      if (allItems.length > 0) {
        // Aggregate multiple district rows into one entry per indicator_code
        const byCode = {};
        allItems.forEach((item) => {
          const code = item.indicator_code || item.indicatorCode || "";
          if (!byCode[code]) {
            byCode[code] = {
              code,
              name: item.indicator_name || item.indicatorName || code,
              section: item.section_type || item.sectionType || "AWC",
              totalNumerator: 0,
              totalDenominator: 0,
            };
          }
          byCode[code].totalNumerator += Number(item.total_numerator ?? item.numeratorValue ?? 0);
          byCode[code].totalDenominator += Number(item.total_denominator ?? item.denominatorValue ?? 0);
        });
        const mapped = Object.values(byCode).map((g) => ({
          name: g.name,
          code: g.code,
          value: g.totalDenominator > 0
            ? Math.round((g.totalNumerator / g.totalDenominator) * 100)
            : 0,
          target: 80,
          section: g.section,
        }));
        setIndicators(mapped);
      }
    } catch { /* silent — empty state shown */ } finally {
      setIndicatorsLoading(false);
    }
  }, [dateRange, selectedState, selectedSection]);

  // Primary stats fetch — always fetches ALL states so the dropdown stays populated.
  // State-level scoping for stats is done client-side via activeSummary.
  // Backend enforces state filtering for ROLE_STATE users automatically.
  const fetchStateWiseSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const { data } = await api.get("/form/routine-monitoring/state-wise-summary", {
        params: {
          startDate: dateRange[0].format("YYYY-MM-DD"),
          endDate: dateRange[1].format("YYYY-MM-DD"),
        },
      });
      // Response: SAMResponse { data: [{ state, awcSection1to4, cbeSection5, vhsndSection6to7,
      //   section8-11, overall }] }
      const list = data?.data;
      setStateWiseSummary(Array.isArray(list) ? list : []);
    } catch { setStateWiseSummary([]); } finally {
      setSummaryLoading(false);
    }
  }, [dateRange]);

  // Secondary stats fetch — for trend chart only; failures are non-fatal
  const fetchDashStats = useCallback(async () => {
    try {
      const payload = {
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
        state: selectedState === "All States" ? undefined : selectedState,
      };
      const { data } = await api.post("/form/routine-monitoring/dashboard", payload);
      setDashStats(data?.data || null);
    } catch { /* supplementary only — ignore failures */ }
  }, [dateRange, selectedState]);

  const fetchDistrictData = useCallback(async () => {
    if (!selectedState || selectedState === "All States") {
      setDistrictData(DEMO_DISTRICT);
      return;
    }
    setDistrictLoading(true);
    try {
      const { data } = await api.get("/form/routine-monitoring/indicators/district-wise", {
        params: {
          state: selectedState,
          startDate: dateRange[0].format("YYYY-MM-DD"),
          endDate: dateRange[1].format("YYYY-MM-DD"),
        },
      });
      // Response: SAMResponse { data: [...] }
      const raw = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      if (raw.length > 0) {
        // Aggregate section-level rows into per-district totals
        const distMap = {};
        raw.forEach(({ district, section_type, submission_count }) => {
          if (!distMap[district]) distMap[district] = { district, awc: 0, vhsnd: 0, cbe: 0, submissions: 0 };
          const cnt = Number(submission_count) || 0;
          distMap[district].submissions += cnt;
          const st = (section_type || "").toUpperCase();
          if (st === "AWC") distMap[district].awc = cnt;
          else if (st === "VHSND") distMap[district].vhsnd = cnt;
          else if (st === "CBE") distMap[district].cbe = cnt;
        });
        setDistrictData(Object.values(distMap).sort((a, b) => b.submissions - a.submissions));
      } else {
        setDistrictData([]);
      }
    } catch { setDistrictData(DEMO_DISTRICT); } finally { setDistrictLoading(false); }
  }, [selectedState, dateRange]);

  const fetchKeyIndicatorData = useCallback(async () => {
    if (!selectedState || selectedState === "All States") { setKeyIndicatorData(null); return; }
    setKeyIndicatorLoading(true);
    try {
      const { data } = await api.post("/form/routine-monitoring/key-indicator-dashboard", {
        state: selectedState,
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
      });
      setKeyIndicatorData(data?.data || data || null);
    } catch { setKeyIndicatorData(null); } finally { setKeyIndicatorLoading(false); }
  }, [selectedState, dateRange]);

  useEffect(() => {
    fetchIndicators();
    fetchStateWiseSummary();
    fetchDashStats();
    fetchDistrictData();
    fetchKeyIndicatorData();
  }, [fetchIndicators, fetchStateWiseSummary, fetchDashStats, fetchDistrictData, fetchKeyIndicatorData]);

  const filtered = selectedSection === "ALL"
    ? indicators
    : selectedSection === "HOUSEHOLD"
      ? indicators.filter((d) => (d.section || "").startsWith("HOUSEHOLD"))
      : indicators.filter((d) => d.section === selectedSection);

  // --- Derived from stateWiseSummary (primary, reliable source) ---

  // States that have RMC data for the selected date range
  const coveredStates = stateWiseSummary.map((s) => s.state).filter(Boolean).sort();

  // Rows scoped to the current selection (used for stats + pie chart)
  const activeSummary = selectedState === "All States"
    ? stateWiseSummary
    : stateWiseSummary.filter((s) => s.state === selectedState);

  const totalSubmissions = activeSummary.reduce((n, s) => n + (Number(s.overall) || 0), 0);
  const statesCovered = isStateAdmin() ? 1 : (selectedState === "All States" ? coveredStates.length : (activeSummary.length > 0 ? 1 : 0));

  // Section distribution pie — computed from state-wise summary
  const sectionDistData = (() => {
    const awc = activeSummary.reduce((n, s) => n + (Number(s.awcSection1to4) || 0), 0);
    const vhsnd = activeSummary.reduce((n, s) => n + (Number(s.vhsndSection6to7) || 0), 0);
    const cbe = activeSummary.reduce((n, s) => n + (Number(s.cbeSection5) || 0), 0);
    const hh = activeSummary.reduce((n, s) =>
      n + (Number(s.section8) || 0) + (Number(s.section9) || 0)
        + (Number(s.section10) || 0) + (Number(s.section11) || 0), 0);
    if (awc + vhsnd + cbe + hh === 0) return DEMO_SECTION_DIST;
    return [
      { name: "AWC", value: awc, color: CHART_COLORS[0] },
      { name: "VHSND", value: vhsnd, color: CHART_COLORS[1] },
      { name: "CBE", value: cbe, color: CHART_COLORS[2] },
      { name: "Household", value: hh, color: CHART_COLORS[3] },
    ].filter((s) => s.value > 0);
  })();

  // Geographic map — state → total submissions
  const mapChartData = (() => {
    if (stateWiseSummary.length > 0) {
      return stateWiseSummary.reduce((acc, s) => {
        if (s.state) acc[s.state] = Number(s.overall) || 0;
        return acc;
      }, {});
    }
    return DEMO_MAP;
  })();

  // Monthly trend — from dashboard (supplementary); falls back to demo
  const trendData = (() => {
    const raw = dashStats?.lineCharts?.monthlyTrends;
    if (raw && raw.length > 0) {
      const monthMap = {};
      raw.forEach((item) => {
        const m = item.month || item.month_label || "";
        if (!monthMap[m]) monthMap[m] = { month: m, awc: 0, vhsnd: 0, cbe: 0 };
        const st = (item.section_type || item.sectionType || "").toUpperCase();
        const cnt = Number(item.submission_count || item.count || 0);
        if (st === "AWC") monthMap[m].awc = cnt;
        else if (st === "VHSND") monthMap[m].vhsnd = cnt;
        else if (st === "CBE") monthMap[m].cbe = cnt;
      });
      return Object.values(monthMap);
    }
    return DEMO_TREND;
  })();

  const handleDownload = async (type) => {
    try {
      const payload = {
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
        state: selectedState === "All States" ? undefined : selectedState,
      };
      const { data } = await api.post(`/form/routine-monitoring/indicators/${type}-excel-download`, payload, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a"); a.href = url;
      a.download = `${type}_export_${dayjs().format("YYYYMMDD")}.xlsx`; a.click();
    } catch { /* ignore */ }
  };

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: "#002147" }}>RMC Analytics</Title>
          <Text style={{ color: "#6B7280" }}>Routine Monitoring Checklist — Deep Insights</Text>
        </div>
        <Space wrap>
          <RangePicker value={dateRange} onChange={setDateRange} style={{ borderRadius: 8 }} />
          {isStateAdmin() && userState ? (
            <Tag color="blue" style={{ padding: "4px 12px", fontSize: 13 }}>{userState}</Tag>
          ) : (
            <Select
              value={selectedState}
              onChange={(v) => { setSelectedState(v); }}
              style={{ width: 220 }}
              showSearch
              placeholder="Select State"
              loading={summaryLoading && coveredStates.length === 0}
              notFoundContent={summaryLoading ? <Spin size="small" /> : "No states with data found"}
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              <Select.Option key="All States" value="All States">All States</Select.Option>
              {coveredStates.length > 0 && (
                coveredStates.map((s) => (
                  <Select.Option key={s} value={s}>{s}</Select.Option>
                ))
              )}
            </Select>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => { fetchIndicators(); fetchStateWiseSummary(); fetchDashStats(); }} loading={indicatorsLoading || summaryLoading}>
            Refresh
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleDownload("awc")}>Export AWC</Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleDownload("vhsnd")}>Export VHSND</Button>
        </Space>
      </div>

      {/* Top Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          {
            title: "Total RMC Submissions",
            value: summaryLoading ? null : totalSubmissions,
            gradient: "linear-gradient(135deg, #1CABE2, #374EA2)",
          },
          {
            title: "States Covered",
            value: summaryLoading ? null : statesCovered,
            gradient: "linear-gradient(135deg, #80BD41, #1CABE2)",
          },
          {
            title: "AWC Sessions",
            value: summaryLoading ? null : activeSummary.reduce((n, s) => n + (Number(s.awcSection1to4) || 0), 0),
            gradient: "linear-gradient(135deg, #374EA2, #9B59B6)",
          },
          {
            title: "Indicators Tracked",
            value: summaryLoading ? null : (indicators.length || 0),
            gradient: "linear-gradient(135deg, #F26A21, #FFC20E)",
          },
        ].map((c) => (
          <Col xs={24} sm={12} lg={6} key={c.title}>
            {c.value === null
              ? (
                <Card style={{ borderRadius: 16, height: "100%" }} bodyStyle={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", minHeight: 100 }}>
                  <Text style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 }}>{c.title}</Text>
                  <Spin size="small" style={{ marginTop: 8 }} />
                </Card>
              )
              : <StatCard {...c} />
            }
          </Col>
        ))}
      </Row>

      <Tabs defaultActiveKey="indicators">
        <TabPane tab="Key Indicators" key="indicators">
          {selectedState === "All States" ? (
            <Alert
              type="info" showIcon
              message="Select a specific state above to view Key Indicator monitoring charts."
              style={{ borderRadius: 8 }}
            />
          ) : (
            <Spin spinning={keyIndicatorLoading} tip="Loading key indicators...">
              {KI_SECTIONS.map((section) => {
                const sd = keyIndicatorData?.[section.key] || {};
                return (
                  <div key={section.key} style={{ marginBottom: 32 }}>
                    {/* Section header */}
                    <div style={{
                      background: section.bg,
                      border: `1px solid ${section.border}`,
                      borderRadius: "14px 14px 0 0",
                      padding: "12px 20px",
                      display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <div style={{ width: 5, height: 24, background: section.color, borderRadius: 3 }} />
                      <Text style={{ fontSize: 15, fontWeight: 700, color: section.color, flex: 1 }}>
                        {section.title}
                      </Text>
                      <Tag style={{ background: section.color, color: "#fff", border: "none", fontSize: 11, borderRadius: 10 }}>
                        {section.indicators.length} indicators
                      </Tag>
                    </div>

                    {/* Section body */}
                    <div style={{
                      border: `1px solid ${section.border}`,
                      borderTop: "none",
                      borderRadius: "0 0 14px 14px",
                      background: "#FAFAFA",
                      overflow: "hidden",
                    }}>
                      {/* Charts grid */}
                      <div style={{ padding: 16 }}>
                        <Row gutter={[16, 16]}>
                          {section.indicators.map((ind) => (
                            <Col xs={24} lg={12} key={ind.field}>
                              <Card
                                style={{ borderRadius: 10, border: "1px solid #F0F0F0", height: "100%" }}
                                bodyStyle={{ padding: "14px 16px" }}
                              >
                                <Text style={{ fontSize: 11.5, fontWeight: 600, color: "#1F2937", display: "block", marginBottom: 12, lineHeight: 1.5 }}>
                                  {ind.label}
                                </Text>
                                <KIAutoChart data={sd[ind.field]} />
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Spin>
          )}
        </TabPane>

        <TabPane tab="Trends" key="trends">
          <ChartCard title="Monthly RMC Submissions Trend" subtitle="All sections over selected date range" height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {[{ key: "awc", label: "AWC" }, { key: "vhsnd", label: "VHSND" }, { key: "cbe", label: "CBE" }].map(({ key, label }, i) => (
                  <Line key={key} type="monotone" dataKey={key} name={label} stroke={CHART_COLORS[i]} strokeWidth={2.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabPane>

        <TabPane tab="District-Wise" key="district">
          {selectedState === "All States" && (
            <Alert
              type="info" showIcon
              message="Select a specific state above to see real district-level data."
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card style={{ borderRadius: 16 }} title={`District Performance — ${selectedState}`}>
                <Table
                  dataSource={districtData}
                  columns={DISTRICT_COLS}
                  rowKey="district"
                  size="middle"
                  loading={districtLoading}
                  pagination={false}
                  scroll={{ x: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <ChartCard title="District Comparison" height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="district" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="awc" name="AWC" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="vhsnd" name="VHSND" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cbe" name="CBE" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Geographic" key="map">
          <Card style={{ borderRadius: 16 }} title="State-Wise RMC Coverage Map">
            <IndiaMap data={mapChartData} />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}
