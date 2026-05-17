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

const ALL_STATES = [
  "All States",
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export default function RMCAnalytics() {
  const [loading, setLoading] = useState(false);
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().subtract(3, "month"), dayjs()]);
  const [selectedSection, setSelectedSection] = useState("ALL");
  const [indicators, setIndicators] = useState(DEMO_INDICATORS);
  const [districtData, setDistrictData] = useState(DEMO_DISTRICT);
  const [dashStats, setDashStats] = useState(null);
  const { isAdmin, isUnicef, isStateAdmin, user } = useAuth();

  // State admin is locked to their own state; others can pick freely
  const userState = user?.state || null;
  const [selectedState, setSelectedState] = useState("All States");

  // Once auth loads, lock state admin to their own state
  useEffect(() => {
    if (isStateAdmin() && userState) {
      setSelectedState(userState);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userState]);

  const fetchIndicators = useCallback(async () => {
    setIndicatorsLoading(true);
    try {
      const payload = {
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
        state: selectedState === "All States" ? undefined : selectedState,
        sectionType: selectedSection === "ALL" ? "AWC" : selectedSection,
      };
      const { data } = await api.post("/form/routine-monitoring/indicators/aggregated", payload);
      const arr = Array.isArray(data) ? data : (data?.data || []);
      if (arr.length > 0) {
        const mapped = arr.map((item) => ({
          name: item.indicatorName || item.indicatorCode,
          value: item.percentageValue ?? 0,
          target: 80, // default target since API doesn't return it
          section: item.sectionType || "AWC",
          numerator: item.numeratorValue,
          denominator: item.denominatorValue,
          state: item.state,
        }));
        setIndicators(mapped);
      }
    } catch { /* fallback to demo */ } finally {
      setIndicatorsLoading(false);
    }
  }, [dateRange, selectedState, selectedSection]);

  const fetchDashStats = useCallback(async () => {
    try {
      const { data } = await api.get("/form/routine-monitoring/dashboard", {
        params: {
          startDate: dateRange[0].format("YYYY-MM-DD"),
          endDate: dateRange[1].format("YYYY-MM-DD"),
          state: selectedState === "All States" ? undefined : selectedState,
        },
      });
      setDashStats(data);
    } catch { /* ignore */ }
  }, [dateRange, selectedState]);

  const fetchDistrictData = useCallback(async () => {
    if (!selectedState || selectedState === "All States") {
      setDistrictData(DEMO_DISTRICT);
      return;
    }
    setDistrictLoading(true);
    try {
      const { data } = await api.get("/form/routine-monitoring/indicators/district-wise", {
        params: { state: selectedState },
      });
      const raw = Array.isArray(data) ? data : (data?.data || []);
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
  }, [selectedState]);

  useEffect(() => {
    fetchIndicators();
    fetchDashStats();
    fetchDistrictData();
  }, [fetchIndicators, fetchDashStats, fetchDistrictData]);

  const filtered = selectedSection === "ALL"
    ? indicators
    : indicators.filter((d) => d.section === selectedSection);

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
              onChange={setSelectedState}
              style={{ width: 200 }}
              showSearch
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {ALL_STATES.map((s) => (
                <Select.Option key={s} value={s}>{s}</Select.Option>
              ))}
            </Select>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => { fetchIndicators(); fetchDashStats(); }} loading={indicatorsLoading}>
            Refresh
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleDownload("awc")}>Export AWC</Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleDownload("vhsnd")}>Export VHSND</Button>
        </Space>
      </div>

      {/* Top Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: "Total RMC Submissions", value: dashStats?.totalSubmissions ?? 8240, gradient: "linear-gradient(135deg, #1CABE2, #374EA2)" },
          { title: "States Covered", value: dashStats?.stateCount ?? 6, gradient: "linear-gradient(135deg, #80BD41, #1CABE2)" },
          { title: "Active Surveyors", value: dashStats?.activeSurveyors ?? 48, gradient: "linear-gradient(135deg, #374EA2, #9B59B6)" },
          { title: "Indicators Tracked", value: indicators.length || 8, gradient: "linear-gradient(135deg, #F26A21, #FFC20E)" },
        ].map((c) => (
          <Col xs={24} sm={12} lg={6} key={c.title}><StatCard {...c} /></Col>
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
            {/* Indicator bars */}
            <Col xs={24} lg={14}>
              <ChartCard title="Indicator Achievement vs Target" height={320}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filtered} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="value" name="Actual %" fill={UNICEF_COLORS.primary} radius={[0, 4, 4, 0]} barSize={14} />
                    <Bar dataKey="target" name="Target %" fill={UNICEF_COLORS.orange} radius={[0, 4, 4, 0]} barSize={6} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>

            {/* Section distribution pie */}
            <Col xs={24} lg={10}>
              <ChartCard title="Submissions by Section" height={320}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={DEMO_SECTION_DIST} cx="50%" cy="45%" outerRadius={90} innerRadius={55}
                      dataKey="value" paddingAngle={3}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {DEMO_SECTION_DIST.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => v.toLocaleString()} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
          </Row>
          </Spin>
        </TabPane>

        <TabPane tab="Trends" key="trends">
          <ChartCard title="Monthly RMC Submissions Trend" subtitle="All sections over last 12 months" height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DEMO_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <IndiaMap data={DEMO_MAP} />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}
