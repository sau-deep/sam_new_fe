import { useState, useCallback, useEffect, useRef } from "react";
import {
  Row, Col, Card, Select, DatePicker, Space, Tag, Typography, Spin, Alert, Segmented,
} from "antd";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import api from "../../services/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import { KI_SECTIONS, sectionCountLabel, indicatorBadge } from "../../constants/keyIndicatorSections";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Chart helpers ────────────────────────────────────────────────────────────
const KI_CHART_COLORS = ["#1CABE2", "#374EA2", "#52C41A", "#F26A21", "#9B59B6", "#00BCD4", "#FF7043"];
const KI_STACK_COLORS = ["#52C41A", "#FF4D4F", "#1CABE2", "#F26A21"];

const isKIMultiSeries = (d) => d != null && Array.isArray(d?.categories) && Array.isArray(d?.series);

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

const LEVEL_OPTIONS = [
  { label: "All Levels", value: "ALL" },
  { label: "AWC", value: "awc" },
  { label: "ANM", value: "anm" },
  { label: "SAM Child", value: "samChild" },
  { label: "Child 0–23m", value: "child0To23Months" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function KeyIndicatorDashboard() {
  const [loading, setLoading] = useState(false);
  const [kiData, setKiData] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().subtract(3, "month"), dayjs()]);
  const [availableStates, setAvailableStates] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const { isStateAdmin, user } = useAuth();
  const userState = user?.state || null;
  const [selectedState, setSelectedState] = useState(
    () => (isStateAdmin() && userState ? userState : null)
  );
  const defaultStateApplied = useRef(false);

  useEffect(() => {
    if (isStateAdmin() && userState && !selectedState) setSelectedState(userState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userState]);

  useEffect(() => {
    api.get("/form/routine-monitoring/state-wise-summary", {
      params: {
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
      },
    }).then(({ data }) => {
      const list = Array.isArray(data?.data) ? data.data : [];
      const states = list.map(s => s.state).filter(Boolean).sort();
      setAvailableStates(states);
      // Auto-select the first state on initial load for non-state-admin users
      if (!isStateAdmin() && !defaultStateApplied.current && states.length > 0) {
        defaultStateApplied.current = true;
        setSelectedState(states[0]);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchKIData = useCallback(async () => {
    if (!selectedState) { setKiData(null); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/form/routine-monitoring/key-indicator-dashboard", {
        state: selectedState,
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
      });
      setKiData(data?.data || data || null);
    } catch { setKiData(null); } finally { setLoading(false); }
  }, [selectedState, dateRange]);

  useEffect(() => { fetchKIData(); }, [fetchKIData]);

  // The additional SAM charts (dataKey "samChild") show with the SAM Child level
  const visibleSections = selectedLevel === "ALL"
    ? KI_SECTIONS
    : KI_SECTIONS.filter(s => (s.dataKey || s.key) === selectedLevel);

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: "#002147" }}>Key Indicator Dashboard</Title>
          <Text style={{ color: "#6B7280" }}>Routine Monitoring — the 29 key indicators (plus 2 extra), one chart each, by monitoring level</Text>
        </div>
        <Space wrap>
          <RangePicker value={dateRange} onChange={setDateRange} style={{ borderRadius: 8 }} />
          {isStateAdmin() && userState ? (
            <Tag color="blue" style={{ padding: "4px 12px", fontSize: 13 }}>{userState}</Tag>
          ) : (
            <Select
              value={selectedState}
              onChange={setSelectedState}
              placeholder="Select State"
              style={{ width: 220 }}
              showSearch
              allowClear
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableStates.map(s => (
                <Select.Option key={s} value={s}>{s}</Select.Option>
              ))}
            </Select>
          )}
        </Space>
      </div>

      {/* Level filter */}
      <div style={{ marginBottom: 20 }}>
        <Segmented
          options={LEVEL_OPTIONS}
          value={selectedLevel}
          onChange={setSelectedLevel}
        />
      </div>

      {!selectedState ? (
        <Alert
          type="info"
          showIcon
          message="Select a state above to view Key Indicator monitoring charts."
          style={{ borderRadius: 8 }}
        />
      ) : (
        <Spin spinning={loading} tip="Loading key indicators...">
          {visibleSections.map((section) => {
            const sd = kiData?.[section.dataKey || section.key] || {};
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
                    {sectionCountLabel(section)}
                  </Tag>
                </div>

                {/* Charts grid */}
                <div style={{
                  border: `1px solid ${section.border}`,
                  borderTop: "none",
                  borderRadius: "0 0 14px 14px",
                  background: "#FAFAFA",
                  padding: 16,
                }}>
                  <Row gutter={[16, 16]}>
                    {section.indicators.map((ind) => (
                      <Col xs={24} lg={12} key={ind.field}>
                        <Card
                          style={{ borderRadius: 10, border: "1px solid #F0F0F0", height: "100%" }}
                          bodyStyle={{ padding: "14px 16px" }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: 600, color: "#1F2937", display: "block", marginBottom: 12, lineHeight: 1.5 }}>
                            {indicatorBadge(ind) && (
                              <Tag color={ind.no === "Extra" ? "gold" : "blue"} style={{ fontSize: 10, marginRight: 6 }}>
                                {indicatorBadge(ind)}
                              </Tag>
                            )}
                            {ind.label}
                          </Text>
                          <KIAutoChart data={sd[ind.field]} />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              </div>
            );
          })}
        </Spin>
      )}
    </div>
  );
}
