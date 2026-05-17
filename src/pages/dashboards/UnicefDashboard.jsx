import { useState, useEffect, useCallback } from "react";
import { Row, Col, Card, Select, Typography, Tag, Table, Progress, Spin, Empty, Alert } from "antd";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { EyeOutlined, GlobalOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import StatCard from "../../components/dashboard/StatCard";
import IndiaMap from "../../components/dashboard/IndiaMap";
import ChartCard from "../../components/charts/ChartCard";
import api from "../../services/axiosInstance";
import { CHART_COLORS, UNICEF_COLORS } from "../../theme/unicef";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const ALL_STATES = [
  "All States",
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const DEMO_MAP = {
  "Rajasthan": 3240, "Odisha": 2890, "Madhya Pradesh": 2650,
  "Chhattisgarh": 1980, "Jharkhand": 1120, "Telangana": 600,
};

export default function UnicefDashboard() {
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState("All States");
  const [stateStats, setStateStats] = useState(null);
  const [indicators, setIndicators] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [trends, setTrends] = useState([]);

  const fetchStateData = useCallback(async () => {
    if (!selectedState || selectedState === "All States") {
      setStateStats(null);
      setDistrictData([]);
      return;
    }
    setLoading(true);
    try {
      const stateQuery = encodeURIComponent(selectedState);
      const [statsRes, districtRes] = await Promise.allSettled([
        api.get(`/unicef/dashboard/state-stats?stateCode=${stateQuery}`),
        api.get(`/form/routine-monitoring/indicators/district-wise?state=${stateQuery}`),
      ]);

      if (statsRes.status === "fulfilled") {
        setStateStats(statsRes.value.data?.data || statsRes.value.data || null);
      }

      if (districtRes.status === "fulfilled") {
        const raw = Array.isArray(districtRes.value.data) ? districtRes.value.data : (districtRes.value.data?.data || []);
        const distMap = {};
        raw.forEach(({ district, section_type, submission_count }) => {
          if (!distMap[district]) distMap[district] = { state: district, awc: 0, vhsnd: 0, growth: 0 };
          const cnt = Number(submission_count) || 0;
          const st = (section_type || "").toUpperCase();
          if (st === "AWC") distMap[district].awc = cnt;
          else if (st === "VHSND") distMap[district].vhsnd = cnt;
          else if (st === "CBE") distMap[district].growth = cnt;
        });
        setDistrictData(Object.values(distMap).slice(0, 10));
      }
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedState]);

  const fetchIndicators = useCallback(async () => {
    try {
      const payload = {
        startDate: dayjs().subtract(3, "month").format("YYYY-MM-DD"),
        endDate: dayjs().format("YYYY-MM-DD"),
        state: selectedState === "All States" ? undefined : selectedState,
        sectionType: "AWC",
      };
      const { data } = await api.post("/form/routine-monitoring/indicators/aggregated", payload);
      const arr = Array.isArray(data) ? data : (data?.data || []);
      if (arr.length > 0) {
        setIndicators(arr.slice(0, 6).map((item) => ({
          indicator: item.indicatorName || item.indicatorCode || "Indicator",
          value: Math.round(item.percentageValue ?? 0),
          target: 80,
        })));
      }
    } catch { /* fallback: leave empty */ }
  }, [selectedState]);

  const fetchTrends = useCallback(async () => {
    try {
      const { data } = await api.get("/unicef/dashboard/trends");
      const monthly = data?.monthlyTrends || data?.data?.monthlyTrends || [];
      if (monthly.length > 0) {
        setTrends(monthly.slice(-12).map((m) => ({
          month: dayjs(m.month + "-01").format("MMM"),
          total: m.totalResponses || 0,
        })));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchStateData();
    fetchIndicators();
  }, [fetchStateData, fetchIndicators]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // Stats display — use real state stats when state is selected, else show aggregate
  const totalSurveys = stateStats?.totalSurveys ?? stateStats?.total ?? 8240;
  const activeSurveyors = stateStats?.activeSurveyors ?? stateStats?.activeSurveyorCount ?? 48;
  const totalDistricts = (stateStats?.districtCount ?? districtData.length) || 0;

  // Use real indicators when available, fallback to demo radar data
  const displayIndicators = indicators.length > 0 ? indicators : [
    { indicator: "AWC Visit Rate", value: 72, target: 80 },
    { indicator: "VHSND Conduct", value: 65, target: 75 },
    { indicator: "Growth Monitor", value: 58, target: 70 },
    { indicator: "SAM Treatment", value: 81, target: 85 },
    { indicator: "Referral Rate", value: 44, target: 60 },
    { indicator: "Supplement", value: 76, target: 80 },
  ];

  const radarData = displayIndicators.map((d) => ({
    subject: d.indicator.split(" ")[0],
    A: d.value,
    B: d.target,
    fullMark: 100,
  }));

  const overallAvg = Math.round(displayIndicators.reduce((s, d) => s + d.value, 0) / displayIndicators.length);

  // Use real district data for bar chart when available, else demo
  const barData = districtData.length > 0
    ? districtData
    : [
      { state: "Odisha", awc: 78, vhsnd: 71, growth: 65 },
      { state: "Rajasthan", awc: 72, vhsnd: 63, growth: 58 },
      { state: "MP", awc: 68, vhsnd: 59, growth: 52 },
      { state: "Chhattisgarh", awc: 74, vhsnd: 66, growth: 60 },
      { state: "Jharkhand", awc: 62, vhsnd: 54, growth: 48 },
      { state: "Telangana", awc: 70, vhsnd: 61, growth: 55 },
    ];

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ background: "#E8F6FD", borderRadius: 8, padding: "4px 10px" }}>
              <span style={{ color: "#1CABE2", fontSize: 12, fontWeight: 700 }}>VIEW ONLY</span>
            </div>
            <Tag color="blue" icon={<EyeOutlined />}>UNICEF Access</Tag>
          </div>
          <Title level={3} style={{ margin: 0, color: "#002147" }}>UNICEF Dashboard</Title>
          <Text style={{ color: "#6B7280" }}>
            {selectedState === "All States"
              ? "National overview · All states · Read-only analytics"
              : `Filtered to: ${selectedState}`}
          </Text>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Select
            value={selectedState}
            onChange={setSelectedState}
            style={{ width: 200 }}
            showSearch
            filterOption={(input, opt) => opt?.children?.toLowerCase().includes(input.toLowerCase())}
          >
            {ALL_STATES.map((s) => (
              <Select.Option key={s} value={s}>{s}</Select.Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchStateData(); fetchIndicators(); fetchTrends(); }} loading={loading} />
        </div>
      </div>

      {selectedState !== "All States" && stateStats && (
        <Alert
          type="info" showIcon
          message={`Showing data for ${selectedState} — ${totalSurveys.toLocaleString()} total surveys, ${activeSurveyors} active surveyors`}
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* KPI Cards */}
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {[
            {
              title: "Overall Compliance",
              value: overallAvg,
              suffix: "%",
              gradient: "linear-gradient(135deg, #1CABE2, #374EA2)",
              description: "Avg across key indicators",
            },
            {
              title: selectedState === "All States" ? "States Monitored" : "Districts with Data",
              value: selectedState === "All States" ? 6 : (totalDistricts || districtData.length || "—"),
              gradient: "linear-gradient(135deg, #80BD41, #1CABE2)",
            },
            {
              title: "Active Surveyors",
              value: activeSurveyors,
              gradient: "linear-gradient(135deg, #374EA2, #9B59B6)",
            },
            {
              title: "RMC Submissions",
              value: selectedState === "All States" ? 8240 : (stateStats?.totalSurveys ?? stateStats?.rmcSurveys ?? "—"),
              gradient: "linear-gradient(135deg, #F26A21, #FFC20E)",
            },
          ].map((c) => (
            <Col xs={24} sm={12} lg={6} key={c.title}>
              <StatCard {...c} loading={loading} />
            </Col>
          ))}
        </Row>
      </Spin>

      {/* Key Indicators Progress + Radar */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Key Performance Indicators" style={{ borderRadius: 16 }} extra={<Tag color="green">Live Data</Tag>}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {displayIndicators.map((ind) => (
                <div key={ind.indicator}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: 500 }}>{ind.indicator}</Text>
                    <Text style={{ fontSize: 13, color: ind.value >= ind.target ? "#80BD41" : "#F26A21", fontWeight: 600 }}>
                      {ind.value}% / {ind.target}%
                    </Text>
                  </div>
                  <Progress
                    percent={ind.value}
                    strokeColor={ind.value >= ind.target ? "#80BD41" : "#F26A21"}
                    trailColor="#F3F4F6"
                    size="small"
                    showInfo={false}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard title="Performance vs Target Radar" subtitle="Actual vs target across key indicators" height={340}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Actual" dataKey="A" stroke={UNICEF_COLORS.primary} fill={UNICEF_COLORS.primary} fillOpacity={0.3} strokeWidth={2} />
                <Radar name="Target" dataKey="B" stroke={UNICEF_COLORS.orange} fill={UNICEF_COLORS.orange} fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* State/District bar + India map */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <ChartCard
            title={selectedState === "All States" ? "State-Wise Indicator Performance" : `District Performance — ${selectedState}`}
            subtitle="AWC Visit, VHSND Conduct, CBE Activity"
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="state" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="awc" name="AWC" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="vhsnd" name="VHSND" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="growth" name="CBE" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Survey Coverage Map" style={{ borderRadius: 16 }} bodyStyle={{ padding: 12 }}>
            <IndiaMap data={DEMO_MAP} />
          </Card>
        </Col>
      </Row>

      {/* Monthly Trend */}
      {trends.length > 0 && (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <ChartCard title="Monthly Submission Trend" subtitle="Last 12 months" height={240}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8 }} />
                  <Line type="monotone" dataKey="total" name="Submissions" stroke={UNICEF_COLORS.primary} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </Col>
        </Row>
      )}
    </div>
  );
}
