/**
 * MySubmissions — Surveyor view of their submitted forms.
 * Shows form counts by date (local + server), sync status.
 * Mobile-first layout (surveyor uses mobile view).
 * No form editing allowed — edit only via notification flow.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card, Row, Col, Typography, Tag, Button, DatePicker, Select,
  Table, Spin, Empty, Space, message,
} from "antd";
import {
  CheckCircleOutlined, CloudUploadOutlined, CalendarOutlined,
  ReloadOutlined, FileTextOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../services/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import { getCurrentOwnerId } from "../../utils/currentOwner";
import { getOfflineForms, offlineFormOwnership } from "../../utils/indexDB";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const FORM_KEYS = {
  "Routine Monitoring Common Checklist": { label: "Routine Monitoring", color: "#16a085", short: "RMC" },
  "Household Checklist": { label: "Household", color: "#8e44ad", short: "HH" },
  "Concurrent Assessment": { label: "Bi-Annual", color: "#3498db", short: "BA" },
  "Followup Assessment": { label: "Follow-Up", color: "#e74c3c", short: "FU" },
};

export default function MySubmissions() {
  const { user } = useAuth();
  // The account whose data this screen shows: the LOGIN ID, re-read on every render
  // so a sign-in as another account (here or in another tab) is picked up.
  const ownerId = getCurrentOwnerId() || user?.username || null;
  const ownerRef = useRef(ownerId);
  ownerRef.current = ownerId;
  const [todayData, setTodayData] = useState(null);
  const [rangeData, setRangeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [selectedForm, setSelectedForm] = useState("Routine Monitoring Common Checklist");
  const [pendingUploads, setPendingUploads] = useState(0);

  // Surveys still queued on this device for THIS account.
  const refreshPending = useCallback(async () => {
    try {
      const queued = await getOfflineForms();
      setPendingUploads(queued.filter((r) => offlineFormOwnership(r, ownerId) === "mine").length);
    } catch {
      setPendingUploads(0);
    }
  }, [ownerId]);

  const fetchToday = useCallback(async () => {
    const requestedFor = ownerId;
    setLoading(true);
    try {
      // Private, fast-changing counts: always read fresh, never from the shared GET cache.
      const res = await axiosInstance.get("/survey/daily-submissions-count", { noCache: true });
      if (ownerRef.current !== requestedFor) return; // account changed meanwhile
      setTodayData(res.data?.data || null);
    } catch (e) {
      if (ownerRef.current === requestedFor) message.error("Failed to load today's submissions.");
    } finally {
      if (ownerRef.current === requestedFor) setLoading(false);
    }
  }, [ownerId]);

  // On mount and whenever the signed-in account changes: drop the previous
  // account's numbers and load this account's.
  useEffect(() => {
    setTodayData(null);
    setRangeData(null);
    fetchToday();
    refreshPending();
  }, [fetchToday, refreshPending]);

  const fetchByRange = async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) {
      message.warning("Please select a date range.");
      return;
    }
    const requestedFor = ownerId;
    setRangeLoading(true);
    try {
      const start = dateRange[0].format("YYYY-MM-DD");
      const end = dateRange[1].format("YYYY-MM-DD");
      const res = await axiosInstance.get("/survey/daily-submissions-count-by-range", {
        params: { startDate: start, endDate: end, formType: selectedForm },
        noCache: true,
      });
      if (ownerRef.current !== requestedFor) return;
      setRangeData(res.data?.data || null);
    } catch (e) {
      if (ownerRef.current === requestedFor) message.error("Failed to load submissions for the selected range.");
    } finally {
      setRangeLoading(false);
    }
  };

  // Build range table rows
  const rangeTableData = rangeData?.dailyCounts
    ? Object.entries(rangeData.dailyCounts).map(([date, count]) => ({
        key: date,
        date,
        count: Number(count),
        status: "Synced",
      })).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const totalInRange = rangeTableData.reduce((s, r) => s + r.count, 0);

  const rangeColumns = [
    {
      title: "Date",
      dataIndex: "date",
      render: (v) => dayjs(v).format("DD MMM YYYY"),
    },
    {
      title: "Submissions",
      dataIndex: "count",
      align: "center",
      render: (v) => <Tag color={v > 0 ? "green" : "default"}>{v}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      align: "center",
      render: () => <Tag icon={<CheckCircleOutlined />} color="success">Synced</Tag>,
    },
  ];

  const todayCounts = todayData?.formCounts || {};
  const todayTotal = todayData?.totalCount ?? 0;

  return (
    <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: "#002147" }}>
          <FileTextOutlined style={{ marginRight: 8 }} />My Submissions
        </Title>
        <Text type="secondary">All submissions are synced to server in real time</Text>
      </div>

      {/* Today's Summary */}
      <Card
        style={{ borderRadius: 16, marginBottom: 16, background: "linear-gradient(135deg, #002147 0%, #1CABE2 100%)" }}
        bodyStyle={{ padding: 20 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
            <CalendarOutlined style={{ marginRight: 6 }} />
            Today — {dayjs().format("DD MMM YYYY")}
          </Text>
          <Button
            size="small" icon={<ReloadOutlined />}
            onClick={() => { fetchToday(); refreshPending(); }} loading={loading}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white" }}
          >
            Refresh
          </Button>
        </div>
        <Spin spinning={loading}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ color: "white", fontSize: 48, fontWeight: 800, lineHeight: 1 }}>
              {todayTotal}
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Total Submissions Today</div>
          </div>
          <Row gutter={[8, 8]}>
            {Object.entries(FORM_KEYS).map(([key, meta]) => (
              <Col span={12} key={key}>
                <div style={{
                  background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 12px",
                }}>
                  <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginBottom: 2 }}>{meta.short}</div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 20 }}>
                    {todayCounts[key] ?? 0}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>{meta.label}</div>
                </div>
              </Col>
            ))}
          </Row>
        </Spin>
      </Card>

      {/* Sync Status Banner — reflects this account's queue on this device */}
      <Card style={{ borderRadius: 12, marginBottom: 16, borderColor: pendingUploads > 0 ? "#FFD591" : "#B7EB8F" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {pendingUploads > 0 ? (
            <CloudUploadOutlined style={{ color: "#FA8C16", fontSize: 20 }} />
          ) : (
            <CheckCircleOutlined style={{ color: "#52C41A", fontSize: 20 }} />
          )}
          <div>
            <Text strong style={{ color: pendingUploads > 0 ? "#AD4E00" : "#135200" }}>
              {pendingUploads > 0
                ? `${pendingUploads} survey${pendingUploads !== 1 ? "s" : ""} waiting to upload from this device`
                : "No surveys waiting on this device"}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {pendingUploads > 0
                ? "They upload automatically when connected, or from Offline Saved Forms. Counts below include only uploaded surveys."
                : "Submissions upload automatically when connected."}
            </Text>
          </div>
        </div>
      </Card>

      {/* Date Range Lookup */}
      <Card
        title={<Text strong><ClockCircleOutlined style={{ marginRight: 6 }} />Submission History</Text>}
        style={{ borderRadius: 16 }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Select
            value={selectedForm}
            onChange={setSelectedForm}
            style={{ width: "100%" }}
            placeholder="Select form type"
          >
            {Object.entries(FORM_KEYS).map(([key, meta]) => (
              <Option key={key} value={key}>{meta.label}</Option>
            ))}
          </Select>

          <RangePicker
            style={{ width: "100%" }}
            onChange={setDateRange}
            disabledDate={(d) => d && d.isAfter(dayjs())}
            format="DD MMM YYYY"
            presets={[
              { label: "Last 7 days", value: [dayjs().subtract(6, "day"), dayjs()] },
              { label: "Last 30 days", value: [dayjs().subtract(29, "day"), dayjs()] },
              { label: "This month", value: [dayjs().startOf("month"), dayjs()] },
            ]}
          />

          <Button type="primary" onClick={fetchByRange} loading={rangeLoading} block>
            View History
          </Button>

          {rangeData && (
            <>
              <div style={{
                background: "#F6FFED", border: "1px solid #B7EB8F", borderRadius: 8,
                padding: "8px 14px", display: "flex", justifyContent: "space-between",
              }}>
                <Text strong>Total in range:</Text>
                <Text strong style={{ color: "#52C41A" }}>{totalInRange} submissions</Text>
              </div>
              <Table
                dataSource={rangeTableData}
                columns={rangeColumns}
                pagination={{ pageSize: 10, size: "small" }}
                size="small"
                loading={rangeLoading}
                locale={{ emptyText: <Empty description="No submissions in this range" /> }}
              />
            </>
          )}
        </Space>
      </Card>
    </div>
  );
}
