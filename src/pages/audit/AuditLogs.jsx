import { useState, useEffect, useCallback } from "react";
import {
  Table, DatePicker, Select, Button, Tag, Space, Typography,
  Card, Row, Col, Empty, message,
} from "antd";
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axiosInstance";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_TAG = {
  COMPLETED: { color: "success", text: "Completed" },
  SUCCESS: { color: "success", text: "Success" },
  FAILED: { color: "error", text: "Failed" },
  FAILURE: { color: "error", text: "Failed" },
  PENDING: { color: "warning", text: "Pending" },
  IN_PROGRESS: { color: "processing", text: "In Progress" },
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 70,
    render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>#{v}</Text>,
  },
  {
    title: "User",
    dataIndex: "userName",
    key: "userName",
    width: 140,
    ellipsis: true,
    render: (v) => v || "—",
  },
  {
    title: "Download Type",
    dataIndex: "downloadType",
    key: "downloadType",
    width: 140,
    ellipsis: true,
    render: (v) => v || "—",
  },
  {
    title: "Form Type",
    dataIndex: "formType",
    key: "formType",
    width: 160,
    ellipsis: true,
    render: (v) => v || "—",
  },
  {
    title: "State",
    dataIndex: "stateFilter",
    key: "stateFilter",
    width: 130,
    ellipsis: true,
    render: (v) => v || "—",
  },
  {
    title: "District",
    dataIndex: "districtFilter",
    key: "districtFilter",
    width: 130,
    ellipsis: true,
    render: (v) => v || "—",
  },
  {
    title: "Start Date",
    dataIndex: "startDate",
    key: "startDate",
    width: 110,
    render: (v) => v ? dayjs(v).format("DD MMM YYYY") : "—",
  },
  {
    title: "End Date",
    dataIndex: "endDate",
    key: "endDate",
    width: 110,
    render: (v) => v ? dayjs(v).format("DD MMM YYYY") : "—",
  },
  {
    title: "Records",
    dataIndex: "recordCount",
    key: "recordCount",
    width: 90,
    align: "right",
    render: (v) => v != null ? v.toLocaleString() : "—",
  },
  {
    title: "Status",
    dataIndex: "downloadStatus",
    key: "downloadStatus",
    width: 110,
    render: (v) => {
      const s = STATUS_TAG[v] || { color: "default", text: v || "Unknown" };
      return <Tag color={s.color}>{s.text}</Tag>;
    },
  },
  {
    title: "Timestamp",
    dataIndex: "downloadTimestamp",
    key: "downloadTimestamp",
    width: 160,
    render: (v) => v ? dayjs(v).format("DD MMM YYYY HH:mm") : "—",
  },
  {
    title: "File Name",
    dataIndex: "fileName",
    key: "fileName",
    ellipsis: true,
    render: (v) => v || "—",
  },
];

function exportToCSV(data) {
  if (!data.length) {
    message.warning("No data to export.");
    return;
  }
  const headers = [
    "ID", "User Name", "Download Type", "Form Type", "State Filter",
    "District Filter", "Start Date", "End Date", "Record Count",
    "Download Status", "Download Timestamp", "File Name",
  ];
  const rows = data.map((r) => [
    r.id, r.userName, r.downloadType, r.formType, r.stateFilter,
    r.districtFilter, r.startDate, r.endDate, r.recordCount,
    r.downloadStatus, r.downloadTimestamp, r.fileName,
  ].map((v) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`)).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit_logs_${dayjs().format("YYYYMMDD_HHmmss")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogs() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [stateFilter, setStateFilter] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get("/audit/downloads");
      const logs = Array.isArray(res) ? res : res?.data || [];
      setData(logs);
      setFiltered(logs);
    } catch (err) {
      message.error("Failed to load audit logs. Please try again.");
      setData([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const applyFilters = useCallback(() => {
    let result = [...data];

    if (stateFilter) {
      result = result.filter((r) =>
        r.stateFilter?.toLowerCase().includes(stateFilter.toLowerCase())
      );
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const from = dateRange[0].startOf("day");
      const to = dateRange[1].endOf("day");
      result = result.filter((r) => {
        if (!r.downloadTimestamp) return false;
        const ts = dayjs(r.downloadTimestamp);
        return ts.isAfter(from) && ts.isBefore(to);
      });
    }

    setFiltered(result);
  }, [data, stateFilter, dateRange]);

  const resetFilters = () => {
    setDateRange(null);
    setStateFilter(null);
    setFiltered(data);
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ color: "#002147", margin: 0 }}>Audit Logs</Title>
        <Text type="secondary">Track all data download activity across users and states.</Text>
      </div>

      <Card
        style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}
        bodyStyle={{ padding: "16px 20px" }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={8} lg={7}>
            <RangePicker
              value={dateRange}
              onChange={(val) => setDateRange(val)}
              style={{ width: "100%" }}
              format="DD MMM YYYY"
              allowClear
              placeholder={["From Date", "To Date"]}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Filter by State"
              value={stateFilter}
              onChange={(val) => setStateFilter(val)}
              allowClear
              showSearch
              style={{ width: "100%" }}
            >
              {INDIAN_STATES.map((s) => (
                <Option key={s} value={s}>{s}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={applyFilters}
                style={{ background: "#002147", borderColor: "#002147" }}
              >
                Apply
              </Button>
              <Button onClick={resetFilters}>Reset</Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchLogs}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => exportToCSV(filtered)}
                style={{ borderColor: "#1CABE2", color: "#1CABE2" }}
              >
                Export CSV
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total, range) =>
              `Showing ${range[0]}–${range[1]} of ${total} records`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No audit logs found"
                style={{ margin: "32px 0" }}
              />
            ),
          }}
          style={{ borderRadius: 12, overflow: "hidden" }}
        />
      </Card>
    </div>
  );
}
