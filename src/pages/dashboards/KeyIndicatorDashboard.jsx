import { useState } from "react";
import { Row, Col, Card, Select, Progress, Tag, Typography, Table, Tabs } from "antd";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import StatCard from "../../components/dashboard/StatCard";
import ChartCard from "../../components/charts/ChartCard";
import { CHART_COLORS, UNICEF_COLORS } from "../../theme/unicef";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const KPI_DATA = [
  { indicator: "AWC Open During Visit", national: 78, rajasthan: 75, odisha: 82, mp: 71, target: 80, section: "AWC", status: "below" },
  { indicator: "Weighing Machine Functional", national: 91, rajasthan: 89, odisha: 93, mp: 88, target: 90, section: "AWC", status: "met" },
  { indicator: "IFA Tablets Available", national: 85, rajasthan: 82, odisha: 88, mp: 80, target: 85, section: "AWC", status: "met" },
  { indicator: "VHSND Conducted Monthly", national: 67, rajasthan: 63, odisha: 72, mp: 61, target: 75, section: "VHSND", status: "below" },
  { indicator: "Pregnant Women Screened", national: 58, rajasthan: 55, odisha: 62, mp: 52, target: 70, section: "VHSND", status: "below" },
  { indicator: "Children <5 Weighed", national: 83, rajasthan: 80, odisha: 86, mp: 78, target: 80, section: "VHSND", status: "met" },
  { indicator: "CBE Activity Conducted", national: 62, rajasthan: 58, odisha: 68, mp: 56, target: 70, section: "CBE", status: "below" },
  { indicator: "SAM Children Referred", national: 81, rajasthan: 79, odisha: 84, mp: 76, target: 80, section: "CBE", status: "met" },
];

const RADAR_DATA = [
  { subject: "AWC", national: 85, target: 90, fullMark: 100 },
  { subject: "VHSND", national: 67, target: 75, fullMark: 100 },
  { subject: "CBE", national: 62, target: 70, fullMark: 100 },
  { subject: "SAM Mgmt", national: 78, target: 80, fullMark: 100 },
  { subject: "Nutrition", national: 72, target: 75, fullMark: 100 },
  { subject: "Referral", national: 81, target: 80, fullMark: 100 },
];

const COLS = [
  { title: "Indicator", dataIndex: "indicator", width: 250 },
  { title: "Section", dataIndex: "section", render: (v) => <Tag color="blue">{v}</Tag> },
  {
    title: "National Avg",
    dataIndex: "national",
    render: (v, r) => (
      <div style={{ display: "flex", align: "center", gap: 8 }}>
        <Progress percent={v} size="small" strokeColor={v >= r.target ? UNICEF_COLORS.green : UNICEF_COLORS.orange} style={{ width: 120, margin: 0 }} />
        <span style={{ fontSize: 12, color: "#374151", minWidth: 32 }}>{v}%</span>
      </div>
    ),
  },
  { title: "Target", dataIndex: "target", render: (v) => `${v}%` },
  {
    title: "Status",
    render: (_, r) => r.national >= r.target
      ? <Tag color="success">Met</Tag>
      : <Tag color="warning">Below Target</Tag>,
  },
];

export default function KeyIndicatorDashboard() {
  const [selectedState, setSelectedState] = useState("national");

  const metCount = KPI_DATA.filter((d) => d.national >= d.target).length;
  const belowCount = KPI_DATA.length - metCount;

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: "#002147" }}>Key Indicator Dashboard</Title>
          <Text style={{ color: "#6B7280" }}>Performance against national targets — by state</Text>
        </div>
        <Select value={selectedState} onChange={setSelectedState} style={{ width: 180 }}>
          <Select.Option value="national">National Average</Select.Option>
          <Select.Option value="rajasthan">Rajasthan</Select.Option>
          <Select.Option value="odisha">Odisha</Select.Option>
          <Select.Option value="mp">Madhya Pradesh</Select.Option>
        </Select>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}><StatCard title="Total Indicators" value={KPI_DATA.length} gradient="linear-gradient(135deg, #1CABE2, #374EA2)" /></Col>
        <Col xs={12} sm={6}><StatCard title="Targets Met" value={metCount} gradient="linear-gradient(135deg, #80BD41, #1CABE2)" /></Col>
        <Col xs={12} sm={6}><StatCard title="Below Target" value={belowCount} gradient="linear-gradient(135deg, #F26A21, #FFC20E)" /></Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="Compliance Rate"
            value={Math.round((metCount / KPI_DATA.length) * 100)}
            suffix="%"
            gradient="linear-gradient(135deg, #374EA2, #9B59B6)"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card style={{ borderRadius: 16 }} title="Indicator Performance Table">
            <Table dataSource={KPI_DATA} columns={COLS} rowKey="indicator" size="small" pagination={false} scroll={{ y: 350 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard title="Section-Wise Radar" subtitle="National performance vs targets" height={340}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="National" dataKey="national" stroke={UNICEF_COLORS.primary} fill={UNICEF_COLORS.primary} fillOpacity={0.3} strokeWidth={2} />
                <Radar name="Target" dataKey="target" stroke={UNICEF_COLORS.orange} fill="none" strokeWidth={2} strokeDasharray="5 5" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      <Card style={{ borderRadius: 16, marginTop: 16 }} title="State Comparison — Top Indicators">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={KPI_DATA.slice(0, 5)} margin={{ top: 5, right: 20, left: -10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="indicator" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip contentStyle={{ borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="rajasthan" name="Rajasthan" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="odisha" name="Odisha" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="mp" name="MP" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="target" name="Target" fill={UNICEF_COLORS.orange} radius={[4, 4, 0, 0]} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
