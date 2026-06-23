import { useState, useEffect, useCallback } from "react";
import { Row, Col, Card, Table, Select, Button, Tag, Typography, Progress, Statistic, Timeline, Alert, DatePicker } from "antd";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TeamOutlined, FileTextOutlined, GlobalOutlined,
  SyncOutlined, DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import StatCard from "../../components/dashboard/StatCard";
import ChartCard from "../../components/charts/ChartCard";
import IndiaMap from "../../components/dashboard/IndiaMap";
import api from "../../services/axiosInstance";
import { CHART_COLORS, UNICEF_COLORS } from "../../theme/unicef";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Demo fallback data when API is not available
const DEMO_STATS = {
  totalSurveys: 12480, totalStates: 6, totalSurveyors: 342, activeSurveyors: 287,
  totalDistricts: 48, totalBlocks: 312, totalVillages: 4820, pendingNotifications: 7,
};
const DEMO_TREND = [
  { month: "Jan", rmc: 420, household: 180, biannual: 95, followup: 60 },
  { month: "Feb", rmc: 510, household: 210, biannual: 110, followup: 75 },
  { month: "Mar", rmc: 680, household: 290, biannual: 145, followup: 90 },
  { month: "Apr", rmc: 750, household: 320, biannual: 168, followup: 102 },
  { month: "May", rmc: 890, household: 380, biannual: 195, followup: 125 },
  { month: "Jun", rmc: 1020, household: 430, biannual: 220, followup: 140 },
];
const DEMO_STATE = [
  { state: "Rajasthan", surveys: 3240, surveyors: 82, completion: 78 },
  { state: "Odisha", surveys: 2890, surveyors: 71, completion: 82 },
  { state: "MP", surveys: 2650, surveyors: 68, completion: 69 },
  { state: "Chhattisgarh", surveys: 1980, surveyors: 54, completion: 74 },
  { state: "Jharkhand", surveys: 1120, surveyors: 38, completion: 65 },
  { state: "Telangana", surveys: 600, surveyors: 29, completion: 59 },
];
const DEMO_FORM_DIST = [
  { name: "Routine Monitoring", value: 8240, color: CHART_COLORS[0] },
  { name: "Household", value: 2180, color: CHART_COLORS[1] },
  { name: "Bi-Annual", value: 1320, color: CHART_COLORS[2] },
  { name: "Follow-Up", value: 740, color: CHART_COLORS[3] },
];
const DEMO_MAP_DATA = {
  "Rajasthan": 3240, "Odisha": 2890, "Madhya Pradesh": 2650,
  "Chhattisgarh": 1980, "Jharkhand": 1120, "Telangana": 600,
};

const ACTIVITY_FEED = [
  { time: "2 min ago", text: "New RMC submission from Odisha - Bhubaneswar block", color: "#1CABE2" },
  { time: "18 min ago", text: "State Admin approved 3 surveyors in Rajasthan", color: "#80BD41" },
  { time: "1 hr ago", text: "Edit notification submitted for RMC ID #4821", color: "#F26A21" },
  { time: "3 hr ago", text: "Data export (AWC) by admin - 1,240 records", color: "#374EA2" },
  { time: "Yesterday", text: "New state admin created for Madhya Pradesh", color: "#9B59B6" },
];

const STATE_TABLE_COLS = [
  { title: "State", dataIndex: "state", key: "state", render: (v) => <Tag color="blue">{v}</Tag> },
  { title: "Total", dataIndex: "surveys", key: "surveys", sorter: (a, b) => a.surveys - b.surveys, render: (v) => v.toLocaleString() },
  { title: "AWC", dataIndex: "awc", key: "awc", render: (v) => (v ?? 0).toLocaleString() },
  { title: "VHSND", dataIndex: "vhsnd", key: "vhsnd", render: (v) => (v ?? 0).toLocaleString() },
  { title: "CBE", dataIndex: "cbe", key: "cbe", render: (v) => (v ?? 0).toLocaleString() },
  { title: "Household", dataIndex: "household", key: "household", render: (v) => (v ?? 0).toLocaleString() },
];

const DATE_PRESETS = [
  { label: "Last 7 days", value: [dayjs().subtract(6, "day"), dayjs()] },
  { label: "Last 30 days", value: [dayjs().subtract(29, "day"), dayjs()] },
  { label: "Last 3 months", value: [dayjs().subtract(3, "month"), dayjs()] },
  { label: "Last 6 months", value: [dayjs().subtract(6, "month"), dayjs()] },
  { label: "This year", value: [dayjs().startOf("year"), dayjs()] },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(DEMO_STATS);
  const [trend, setTrend] = useState(DEMO_TREND);
  const [stateData, setStateData] = useState(DEMO_STATE);
  const [mapData, setMapData] = useState(DEMO_MAP_DATA);
  const [formDist, setFormDist] = useState(DEMO_FORM_DIST);
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().subtract(6, "month"), dayjs()]);
  const [loadedRange, setLoadedRange] = useState("");
  const { t } = useTranslation();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].format("YYYY-MM-DD");
      const endDate = dateRange[1].format("YYYY-MM-DD");

      const [stateWiseRes, trendsRes, pendingCountRes, unicefStatsRes, mapDataRes, userStatsRes] = await Promise.allSettled([
        // Primary date-filtered source: state-wise-summary is confirmed working
        api.get("/form/routine-monitoring/state-wise-summary", { params: { startDate, endDate } }),
        // Monthly trend with date range
        api.get("/unicef/dashboard/trends", { params: { startDate, endDate } }),
        api.get("/form/routine-monitoring/edit-notifications/pending/count"),
        api.get("/unicef/dashboard/stats"),
        api.get("/unicef/dashboard/map-data", { params: { startDate, endDate } }),
        api.get("/user-management/stats"),
      ]);

      // State-wise summary → totalSurveys, totalStates, stateData table, form distribution
      if (stateWiseRes.status === "fulfilled") {
        const raw = stateWiseRes.value.data;
        const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
        if (arr.length > 0) {
          const totalSurveys = arr.reduce((s, r) => s + (r.overall ?? 0), 0);
          setStats((prev) => ({
            ...prev,
            totalSurveys,
            totalStates: arr.length,
          }));

          setStateData(arr.map((r) => ({
            state: r.state,
            surveys: r.overall ?? 0,
            awc: r.awcSection1to4 ?? 0,
            vhsnd: r.vhsndSection6to7 ?? 0,
            cbe: r.cbeSection5 ?? 0,
            household: (r.section8 ?? 0) + (r.section9 ?? 0) + (r.section10 ?? 0) + (r.section11 ?? 0),
          })));

          const totals = arr.reduce(
            (acc, r) => ({
              awc: acc.awc + (r.awcSection1to4 ?? 0),
              vhsnd: acc.vhsnd + (r.vhsndSection6to7 ?? 0),
              cbe: acc.cbe + (r.cbeSection5 ?? 0),
              household: acc.household + (r.section8 ?? 0) + (r.section9 ?? 0) + (r.section10 ?? 0) + (r.section11 ?? 0),
            }),
            { awc: 0, vhsnd: 0, cbe: 0, household: 0 }
          );
          setFormDist([
            { name: "AWC", value: totals.awc, color: CHART_COLORS[0] },
            { name: "VHSND", value: totals.vhsnd, color: CHART_COLORS[1] },
            { name: "CBE", value: totals.cbe, color: CHART_COLORS[2] },
            { name: "Household", value: totals.household, color: CHART_COLORS[3] },
          ]);
        }
      }

      // Monthly trend chart
      if (trendsRes.status === "fulfilled") {
        const monthly = trendsRes.value.data?.monthlyTrends || trendsRes.value.data?.data?.monthlyTrends || [];
        if (monthly.length > 0) {
          setTrend(monthly.map((item) => ({
            month: dayjs((item.month || "") + "-01").format("MMM YY"),
            rmc: item.totalResponses || item.count || 0,
            household: 0,
            biannual: 0,
            followup: 0,
          })));
        }
      }

      if (pendingCountRes.status === "fulfilled") {
        const pendingCount = pendingCountRes.value.data;
        setStats((prev) => ({
          ...prev,
          pendingNotifications: typeof pendingCount === "number" ? pendingCount : (pendingCount?.count ?? pendingCount?.data ?? prev.pendingNotifications),
        }));
      }

      if (unicefStatsRes.status === "fulfilled") {
        const d = unicefStatsRes.value.data?.data ?? unicefStatsRes.value.data;
        setStats((prev) => ({
          ...prev,
          totalDistricts: d.totalDistricts ?? prev.totalDistricts,
          totalBlocks: d.totalBlocks ?? prev.totalBlocks,
          totalVillages: d.totalVillages ?? prev.totalVillages,
        }));
      }

      if (userStatsRes.status === "fulfilled") {
        const d = userStatsRes.value.data?.data ?? userStatsRes.value.data;
        setStats((prev) => ({
          ...prev,
          activeSurveyors: d.activeSurveyors ?? prev.activeSurveyors,
          totalSurveyors: d.totalSurveyors ?? prev.totalSurveyors,
        }));
      }

      if (mapDataRes.status === "fulfilled") {
        const payload = mapDataRes.value.data?.data ?? mapDataRes.value.data;
        const stateList = Array.isArray(payload?.data) ? payload.data : [];
        if (stateList.length > 0) {
          const liveMapData = {};
          stateList.forEach((s) => {
            if (s.stateName) liveMapData[s.stateName] = s.responses ?? 0;
          });
          setMapData(liveMapData);
        }
      }
    } catch { /* fallback to demo data on error */ } finally {
      setLoading(false);
      setLoadedRange(`${dateRange[0].format("DD MMM YYYY")} – ${dateRange[1].format("DD MMM YYYY")}`);
    }
  }, [dateRange]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const statCards = [
    {
      title: t("totalSurveys"), value: stats.totalSurveys,
      icon: <FileTextOutlined />,
      gradient: "linear-gradient(135deg, #1CABE2, #374EA2)",
      trend: 12.5, trendLabel: t("vsLastMonth"),
    },
    {
      title: t("statesCovered"), value: stats.totalStates,
      icon: <GlobalOutlined />,
      gradient: "linear-gradient(135deg, #80BD41, #1CABE2)",
    },
    {
      title: t("activeSurveyors"), value: stats.activeSurveyors,
      icon: <TeamOutlined />,
      gradient: "linear-gradient(135deg, #374EA2, #9B59B6)",
      description: `${stats.totalSurveyors} ${t("totalRegistered")}`,
      trend: 5.2, trendLabel: t("vsLastMonth"),
    },
    {
      title: t("pendingReviews"), value: stats.pendingNotifications || 0,
      icon: <SyncOutlined />,
      gradient: "linear-gradient(135deg, #F26A21, #FFC20E)",
      description: t("rmcEditNotifications"),
    },
  ];

  return (
    <div style={{ padding: "24px", background: "#F5F7FA", minHeight: "100vh" }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: "#002147" }}>{t("adminDashboard")}</Title>
          <Text style={{ color: "#6B7280" }}>
            {t("realTimeOverview")} · {t("allStates")} · {t("allForms")}
          </Text>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Data Period</div>
          <RangePicker
            value={dateRange}
            onChange={(val) => val && setDateRange(val)}
            presets={DATE_PRESETS}
            format="DD MMM YYYY"
            disabledDate={(d) => d && d > dayjs()}
            style={{ borderRadius: 8 }}
          />
          {loadedRange && (
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>Showing: {loadedRange}</div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <StatCard {...card} loading={loading} />
          </Col>
        ))}
      </Row>

      {/* Secondary stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { key: "districts", title: t("districts"), value: stats.totalDistricts, color: "#1CABE2" },
          { key: "blocks", title: t("blocks"), value: stats.totalBlocks, color: "#374EA2" },
          { key: "villages", title: t("villages"), value: stats.totalVillages, color: "#80BD41" },
          { key: "totalSurveyors", title: t("totalSurveyors"), value: stats.totalSurveyors, color: "#F26A21" },
        ].map((s) => (
          <Col xs={12} sm={6} key={s.key}>
            <Card style={{ borderRadius: 12, border: "1px solid #F3F4F6", textAlign: "center" }} bodyStyle={{ padding: "16px 12px" }}>
              <Statistic title={s.title} value={s.value} valueStyle={{ color: s.color, fontWeight: 800, fontSize: 24 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Main Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Trend Line Chart */}
        <Col xs={24} lg={16}>
          <ChartCard
            title={t("surveyTrend")}
            subtitle={t("surveyTrendSubtitle")}
            loading={loading}
            height={300}
            extra={
              <Select size="small" defaultValue="6m" style={{ width: 90 }}>
                <Select.Option value="3m">3 Months</Select.Option>
                <Select.Option value="6m">6 Months</Select.Option>
                <Select.Option value="1y">1 Year</Select.Option>
              </Select>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {["rmc", "household", "biannual", "followup"].map((k, i) => (
                    <linearGradient key={k} id={`grad${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[i]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS[i]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {[
                  { key: "rmc", label: "Routine Monitoring" },
                  { key: "household", label: "Household" },
                  { key: "biannual", label: "Bi-Annual" },
                  { key: "followup", label: "Follow-Up" },
                ].map(({ key, label }, i) => (
                  <Area key={key} type="monotone" dataKey={key} name={label}
                    stroke={CHART_COLORS[i]} fill={`url(#grad${key})`} strokeWidth={2.5} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        {/* Form Distribution Pie */}
        <Col xs={24} lg={8}>
          <ChartCard title={t("formDistribution")} subtitle="All-time breakdown by type" loading={loading} height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formDist} cx="50%" cy="45%" outerRadius={90} innerRadius={50}
                  dataKey="value" paddingAngle={3}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {formDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v, entry) => (
                    <span style={{ color: "#374151" }}>{v}: {entry.payload.value.toLocaleString()}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* India Map + Activity Feed */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: "#111827" }}>{t("geographicCoverage")}</div>
              <div style={{ fontWeight: 400, color: "#6B7280", fontSize: 12 }}>Survey density across covered states</div>
            </div>
          } style={{ borderRadius: 16 }} bodyStyle={{ padding: 16 }}>
            <IndiaMap data={mapData} onStateClick={(s) => setSelectedState(s)} />
            {selectedState && (
              <Alert
                message={`Viewing: ${selectedState}`}
                type="info"
                showIcon
                closable
                onClose={() => setSelectedState(null)}
                style={{ marginTop: 12, borderRadius: 8 }}
                action={
                  <Button size="small" onClick={() => window.location.href = "/dashboard/state"}>
                    View State Dashboard
                  </Button>
                }
              />
            )}
          </Card>
        </Col>

        {/* Activity Feed */}
        <Col xs={24} lg={10}>
          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: "#111827" }}>{t("recentActivity")}</div>
              <div style={{ fontWeight: 400, color: "#6B7280", fontSize: 12 }}>System events & submissions</div>
            </div>
          } style={{ borderRadius: 16, height: "100%" }}>
            <Timeline
              items={ACTIVITY_FEED.map((a) => ({
                color: a.color,
                children: (
                  <div>
                    <div style={{ fontSize: 13, color: "#374151" }}>{a.text}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{a.time}</div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      {/* State-wise table */}
      <Card
        title={
          <div>
            <div style={{ fontWeight: 700, color: "#111827" }}>{t("stateBreakdown")}</div>
            <div style={{ fontWeight: 400, color: "#6B7280", fontSize: 12 }}>{t("stateBreakdownSubtitle")}</div>
          </div>
        }
        style={{ borderRadius: 16 }}
        extra={
          <Button size="small" icon={<DownloadOutlined />} onClick={() => window.location.href = "/data/export"}>
            Export
          </Button>
        }
      >
        <Table
          dataSource={stateData}
          columns={STATE_TABLE_COLS}
          rowKey="state"
          size="middle"
          pagination={false}
          loading={loading}
        />
      </Card>

      {/* State-wise bar chart */}
      <Card style={{ borderRadius: 16, marginTop: 16 }} title={
        <div>
          <div style={{ fontWeight: 700 }}>State Comparison — Section Breakdown</div>
          <div style={{ fontWeight: 400, color: "#6B7280", fontSize: 12 }}>Submissions by section type per state for selected period</div>
        </div>
      }>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={stateData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="state" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="awc" name="AWC" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="vhsnd" name="VHSND" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="cbe" name="CBE" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="household" name="Household" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
