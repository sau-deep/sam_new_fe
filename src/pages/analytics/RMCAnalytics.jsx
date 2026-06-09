import { useState, useCallback, useEffect } from "react";
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

  // State admin is locked to their own state; others can pick freely.
  const userState = user?.state || null;
  const [selectedState, setSelectedState] = useState(
    () => (isStateAdmin() && userState ? userState : "All States")
  );

  // Catch the case where auth loads asynchronously after mount
  useEffect(() => {
    if (isStateAdmin() && userState && selectedState === "All States") {
      setSelectedState(userState);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userState]);

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

  useEffect(() => {
    fetchIndicators();
    fetchStateWiseSummary();
    fetchDashStats();
    fetchDistrictData();
  }, [fetchIndicators, fetchStateWiseSummary, fetchDashStats, fetchDistrictData]);

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

      {/* Section filter */}
      <div style={{ marginBottom: 20 }}>
        <Segmented
          options={[{ label: "All Sections", value: "ALL" }, ...SECTION_TYPES]}
          value={selectedSection}
          onChange={setSelectedSection}
        />
      </div>

      <Tabs defaultActiveKey="indicators">
        <TabPane tab="Key Indicators" key="indicators">
          <Spin spinning={indicatorsLoading} tip="Loading indicators...">
          <Row gutter={[16, 16]}>
            {/* Indicator progress list */}
            <Col xs={24} lg={15}>
              <Card
                style={{ borderRadius: 16 }}
                title={
                  <span style={{ fontWeight: 600, color: "#002147" }}>
                    Indicator Achievement vs Target
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                      ({filtered.length} indicator{filtered.length !== 1 ? "s" : ""})
                    </Text>
                  </span>
                }
                bodyStyle={{ padding: "8px 16px" }}
              >
                <div style={{ maxHeight: 480, overflowY: "auto", paddingRight: 4 }}>
                  {filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF" }}>
                      No indicator data available for the selected filters.
                    </div>
                  ) : (
                    filtered.map((ind, idx) => {
                      const pct = Math.min(100, Math.max(0, ind.value));
                      const onTarget = pct >= ind.target;
                      const color = pct >= ind.target ? "#52C41A" : pct >= 60 ? UNICEF_COLORS.primary : "#FF4D4F";
                      return (
                        <div
                          key={ind.code || idx}
                          style={{
                            padding: "10px 0",
                            borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <Text style={{ fontSize: 12.5, color: "#374151", lineHeight: "1.4", flex: 1, paddingRight: 12 }}>
                              {ind.name}
                            </Text>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              <Tag color={onTarget ? "success" : "default"} style={{ fontSize: 11, margin: 0 }}>
                                Target: {ind.target}%
                              </Tag>
                              <Text strong style={{ fontSize: 13, color, minWidth: 36, textAlign: "right" }}>
                                {pct}%
                              </Text>
                            </div>
                          </div>
                          <Progress
                            percent={pct}
                            showInfo={false}
                            strokeColor={color}
                            trailColor="#F3F4F6"
                            size="small"
                            style={{ margin: 0 }}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </Col>

            {/* Right column: pie + summary stats */}
            <Col xs={24} lg={9}>
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <ChartCard title="Submissions by Section" height={260}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sectionDistData} cx="50%" cy="48%" outerRadius={80} innerRadius={48}
                        dataKey="value" paddingAngle={3}
                        label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""}
                        labelLine={false}>
                        {sectionDistData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* On-target summary */}
                <Card style={{ borderRadius: 12, background: "linear-gradient(135deg, #F0F9FF, #E0F2FE)" }} bodyStyle={{ padding: "12px 16px" }}>
                  <Row gutter={16}>
                    <Col span={12} style={{ textAlign: "center" }}>
                      <Text style={{ fontSize: 28, fontWeight: 700, color: "#52C41A", display: "block" }}>
                        {filtered.filter((i) => i.value >= i.target).length}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#6B7280" }}>On Target</Text>
                    </Col>
                    <Col span={12} style={{ textAlign: "center" }}>
                      <Text style={{ fontSize: 28, fontWeight: 700, color: "#FF4D4F", display: "block" }}>
                        {filtered.filter((i) => i.value < i.target).length}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#6B7280" }}>Below Target</Text>
                    </Col>
                  </Row>
                </Card>
              </Space>
            </Col>
          </Row>
          </Spin>
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
