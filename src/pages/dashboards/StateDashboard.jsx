import { useState, useEffect, useCallback } from "react";
import { Row, Col, Card, Typography, Tag, Progress, Table, Button, Spin, Empty } from "antd";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TeamOutlined, FileTextOutlined, EnvironmentOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/dashboard/StatCard";
import ChartCard from "../../components/charts/ChartCard";
import { CHART_COLORS, UNICEF_COLORS } from "../../theme/unicef";
import axiosInstance from "../../services/axiosInstance";

const { Title, Text } = Typography;

const DISTRICT_COLS = [
  { title: "District", dataIndex: "district", sorter: (a, b) => a.district.localeCompare(b.district) },
  {
    title: "Total Submissions", dataIndex: "total",
    sorter: (a, b) => a.total - b.total,
    render: (v) => v.toLocaleString(),
    defaultSortOrder: "descend",
  },
  { title: "AWC", dataIndex: "awc", render: (v) => v.toLocaleString() },
  { title: "VHSND", dataIndex: "vhsnd", render: (v) => v.toLocaleString() },
  {
    title: "Household", dataIndex: "household",
    render: (v) => <Progress percent={v} size="small" strokeColor={UNICEF_COLORS.primary} showInfo style={{ minWidth: 80 }} />,
  },
];

function aggregateDistrictData(rawData) {
  const map = {};
  (rawData || []).forEach(({ district, section_type, submission_count }) => {
    if (!district) return;
    if (!map[district]) map[district] = { district, total: 0, awc: 0, vhsnd: 0, hhRaw: 0, awcMax: 0 };
    const count = Number(submission_count) || 0;
    map[district].total += count;
    const st = (section_type || "").toUpperCase();
    if (st === "AWC") { map[district].awc += count; map[district].awcMax = Math.max(map[district].awcMax, count); }
    if (st === "VHSND") map[district].vhsnd += count;
    if (st.startsWith("HOUSEHOLD")) map[district].hhRaw += count;
  });
  // Convert to array, compute household %
  const allHH = Object.values(map).map((d) => d.hhRaw);
  const maxHH = Math.max(...allHH, 1);
  return Object.values(map).map((d) => ({
    ...d,
    household: Math.round((d.hhRaw / maxHH) * 100),
    key: d.district,
  }));
}

function buildPieData(stateStats) {
  const { rmcSurveys = 0, householdSurveys = 0, biAnnualSurveys = 0, followupSurveys = 0 } = stateStats;
  return [
    { name: "RMC", value: rmcSurveys, color: CHART_COLORS[0] },
    { name: "Household", value: householdSurveys, color: CHART_COLORS[1] },
    { name: "BiAnnual", value: biAnnualSurveys, color: CHART_COLORS[2] },
    { name: "Follow-Up", value: followupSurveys, color: CHART_COLORS[3] },
  ].filter((d) => d.value > 0);
}

function buildTrendData(monthlyTrends) {
  if (!monthlyTrends?.length) return [];
  // Show last 8 months
  const sorted = [...monthlyTrends].sort((a, b) => a.month.localeCompare(b.month)).slice(-8);
  return sorted.map((m) => ({
    month: m.month?.slice(0, 7) || "",
    submissions: Number(m.totalResponses) || 0,
  }));
}

export default function StateDashboard() {
  const { user } = useAuth();
  const stateName = user?.state || "";

  const [stateStats, setStateStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [districtData, setDistrictData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!stateName) return;
    setLoading(true);
    setError(null);
    try {
      const stateQuery = encodeURIComponent(stateName);

      const [statsRes, districtRes, trendsRes, userStatsRes] = await Promise.allSettled([
        axiosInstance.get(`/unicef/dashboard/state-stats?stateCode=${stateQuery}`),
        axiosInstance.get(`/form/routine-monitoring/indicators/district-wise?state=${stateQuery}`),
        axiosInstance.get(`/unicef/dashboard/trends`),
        axiosInstance.get(`/user-management/stats`),
      ]);

      if (statsRes.status === "fulfilled") {
        setStateStats(statsRes.value.data?.data || {});
      }
      if (districtRes.status === "fulfilled") {
        const raw = districtRes.value.data?.data || [];
        setDistrictData(aggregateDistrictData(raw));
      }
      if (trendsRes.status === "fulfilled") {
        const mt = trendsRes.value.data?.data?.monthlyTrends || [];
        setTrendData(buildTrendData(mt));
      }
      if (userStatsRes.status === "fulfilled") {
        setUserStats(userStatsRes.value.data?.data || null);
      }
    } catch (e) {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [stateName]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalSurveys = stateStats?.totalSurveys ?? 0;
  const activeSurveyors = userStats?.activeSurveyorCount ?? stateStats?.activeSurveyors ?? 0;
  const totalSurveyors = userStats?.surveyorCount ?? activeSurveyors;
  const districtCount = districtData.length;
  const rmcSurveys = stateStats?.rmcSurveys ?? 0;
  const pieData = stateStats ? buildPieData(stateStats) : [];

  const displayState = (stateName || "State").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <Tag color="green" icon={<EnvironmentOutlined />}>{displayState}</Tag>
            <Tag color="blue">State Admin</Tag>
          </div>
          <Title level={3} style={{ margin: 0, color: "#002147" }}>State Dashboard</Title>
          <Text style={{ color: "#6B7280" }}>State-scoped data · Manage your surveyors</Text>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading}>Refresh</Button>
          <Button type="primary" icon={<TeamOutlined />} onClick={() => (window.location.href = "/users/surveyors")}>
            Manage Surveyors
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: 12, marginBottom: 16, color: "#DC2626" }}>
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {[
            {
              title: "State Surveys",
              value: totalSurveys,
              gradient: "linear-gradient(135deg, #1CABE2, #374EA2)",
              icon: <FileTextOutlined />,
            },
            {
              title: "Active Surveyors",
              value: activeSurveyors,
              suffix: totalSurveyors > 0 ? ` / ${totalSurveyors}` : "",
              gradient: "linear-gradient(135deg, #80BD41, #1CABE2)",
              icon: <TeamOutlined />,
            },
            {
              title: "Districts (with data)",
              value: districtCount,
              gradient: "linear-gradient(135deg, #374EA2, #9B59B6)",
              icon: <EnvironmentOutlined />,
            },
            {
              title: "RMC Submissions",
              value: rmcSurveys,
              gradient: "linear-gradient(135deg, #F26A21, #FFC20E)",
              icon: <FileTextOutlined />,
            },
          ].map((c) => (
            <Col xs={24} sm={12} lg={6} key={c.title}>
              <StatCard {...c} />
            </Col>
          ))}
        </Row>

        {/* Charts */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={16}>
            <ChartCard title="Monthly Submission Trend" subtitle={`${displayState} — last 8 months`} height={260}>
              {trendData.length === 0 ? (
                <Empty description="No trend data available" style={{ paddingTop: 60 }} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v) => v.toLocaleString()} />
                    <Line
                      type="monotone" dataKey="submissions" name="Total Submissions"
                      stroke={UNICEF_COLORS.primary} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Col>
          <Col xs={24} lg={8}>
            <ChartCard title="Form Distribution" height={260}>
              {pieData.length === 0 ? (
                <Empty description="No form data" style={{ paddingTop: 60 }} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%"
                      outerRadius={80} innerRadius={45}
                      dataKey="value" paddingAngle={3}
                    >
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => v.toLocaleString()} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Col>
        </Row>

        {/* District Table */}
        <Card
          title={`District-Wise Performance — ${displayState}`}
          style={{ borderRadius: 16 }}
          extra={<Text type="secondary">{districtCount} districts with submissions</Text>}
        >
          {districtData.length === 0 ? (
            <Empty description="No district data available" />
          ) : (
            <Table
              dataSource={districtData}
              columns={DISTRICT_COLS}
              rowKey="district"
              size="middle"
              pagination={{ pageSize: 10, showSizeChanger: false }}
            />
          )}
        </Card>
      </Spin>
    </div>
  );
}
