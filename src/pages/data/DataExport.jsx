import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, Row, Col, Button, Select, DatePicker, Table, Tag,
  Typography, Space, Alert, Tabs, message,
} from "antd";
import {
  DownloadOutlined, FileExcelOutlined, HistoryOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/axiosInstance";
import ExcelMappingService from "../../services/ExcelMappingService";
import { UNICEF_COLORS } from "../../theme/unicef";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

const STATES = [
  "All States", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

// Export types grouped by form category
const FORM_CATEGORIES = [
  {
    key: "rmc",
    label: "Routine Monitoring",
    description: "Routine Monitoring Common Checklist exports",
    color: "#16a085",
    exports: [
      {
        key: "awc",
        label: "AWC Section",
        description: "Anganwadi Worker Centre data",
        endpoint: "/excel-export/awc",
        icon: "📋",
        color: UNICEF_COLORS.primary,
      },
      {
        key: "cbe",
        label: "CBE Session",
        description: "Community-Based Event / Session data",
        endpoint: "/excel-export/cbe",
        icon: "👥",
        color: "#00695c",
      },
      {
        key: "vhsnd",
        label: "VHSND Section",
        description: "Village Health, Sanitation & Nutrition Day data",
        endpoint: "/excel-export/vhsnd",
        icon: "🏥",
        color: UNICEF_COLORS.navy,
      },
      {
        key: "rmc-complete",
        label: "Complete RMC Export",
        description: "All RMC sections combined",
        endpoint: "/excel-export/complete",
        icon: "🗃️",
        color: UNICEF_COLORS.red,
        isFull: true,
      },
    ],
  },
  {
    key: "household",
    label: "Household Data",
    description: "Household Checklist exports by section",
    color: "#8e44ad",
    exports: [
      {
        key: "household-sec8",
        label: "Household Section 8",
        description: "Child nutrition & feeding data",
        endpoint: "/excel-export/household-section8",
        icon: "🏠",
        color: UNICEF_COLORS.green,
      },
      {
        key: "household-sec9",
        label: "Household Section 9",
        description: "Extended household assessment — Part 1",
        endpoint: "/excel-export/household-section9",
        icon: "📊",
        color: UNICEF_COLORS.orange,
      },
      {
        key: "household-sec10",
        label: "Household Section 10",
        description: "Extended household assessment — Part 2",
        endpoint: "/excel-export/household-section10",
        icon: "📊",
        color: "#9B59B6",
      },
      {
        key: "household-sec11",
        label: "Household Section 11",
        description: "Extended household assessment — Part 3",
        endpoint: "/excel-export/household-section11",
        icon: "📊",
        color: "#16A085",
      },
    ],
  },
  {
    key: "followup",
    label: "Follow-Up Data",
    description: "Follow-Up Assessment exports",
    color: "#e74c3c",
    exports: [
      {
        key: "followup",
        label: "Follow-Up Assessment",
        description: "All follow-up checklist records",
        endpoint: "/excel-export/followup-assessment",
        icon: "🔄",
        color: "#E67E22",
      },
    ],
  },
  {
    key: "biannual",
    label: "Concurrent Assessment",
    description: "Concurrent Assessment exports and summaries",
    color: "#3498db",
    exports: [
      {
        key: "biannual",
        label: "Bi-Annual Assessment",
        description: "All concurrent/bi-annual assessment records",
        endpoint: "/form/biannuals",
        icon: "📅",
        color: "#3498db",
        clientSideExcel: true,
      },
    ],
  },
];

const AUDIT_COLUMNS = [
  { title: "Type", dataIndex: "downloadType", render: (v) => <Tag color="blue">{v || "—"}</Tag> },
  { title: "User", dataIndex: "userName", render: (v) => v || "—" },
  { title: "Records", dataIndex: "recordCount", render: (v) => v?.toLocaleString() || "—" },
  { title: "State Filter", dataIndex: "stateFilter", render: (v) => v || "All" },
  { title: "Downloaded", dataIndex: "downloadTimestamp", render: (v) => v ? dayjs(v).format("DD MMM HH:mm") : "—" },
  {
    title: "Status",
    dataIndex: "downloadStatus",
    render: (v) => {
      const map = { SUCCESS: "success", COMPLETED: "success", FAILED: "error", FAILURE: "error" };
      return <Tag color={map[v] || "warning"}>{v || "Unknown"}</Tag>;
    },
  },
];

const CA_NAV_ITEMS = [
  {
    key: "response-summary",
    label: "Response Summary",
    description: "Village-wise response counts for Household Checklist and Concurrent Assessment",
    icon: "📊",
    path: "/data/response-summary",
    color: "#8e44ad",
  },
  {
    key: "household-child-list",
    label: "Household Child List",
    description: "Filter and export household survey records by location and date range",
    icon: "🏠",
    path: "/data/household-child-list",
    color: "#16a085",
  },
];

export default function DataExport({ defaultForm }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState({});
  const [dateRange, setDateRange] = useState([dayjs().subtract(1, "month"), dayjs()]);
  const [selectedState, setSelectedState] = useState("All States");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultForm || "rmc");
  const { isAdmin, isStateAdmin } = useAuth();

  // When the route changes (e.g., navigating from /data/export/household → /data/export/rmc),
  // sync the active tab with the new defaultForm prop.
  useEffect(() => {
    if (defaultForm) setActiveTab(defaultForm);
  }, [defaultForm]);

  const handleDownload = async (exportType) => {
    setLoading((prev) => ({ ...prev, [exportType.key]: true }));
    try {
      const payload = {
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
        state: selectedState === "All States" ? undefined : selectedState,
      };

      if (exportType.clientSideExcel) {
        const { data: res } = await api.post(exportType.endpoint, payload);
        const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (!arr.length) { message.warning("No records found for the selected criteria."); return; }
        const rows = ExcelMappingService.generateBiAnnualExcelData(arr);
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, exportType.label.slice(0, 31));
        XLSX.writeFile(wb, `${exportType.key}_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`);
        message.success(`${exportType.label} downloaded — ${arr.length.toLocaleString()} records`);
      } else {
        const { data } = await api.post(exportType.endpoint, payload, { responseType: "blob" });
        const url = URL.createObjectURL(new Blob([data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${exportType.key}_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        message.success(`${exportType.label} downloaded successfully`);
      }
    } catch (err) {
      message.error(`Download failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, [exportType.key]: false }));
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const { data } = await api.get("/audit/downloads");
      const arr = Array.isArray(data) ? data : (data?.data || []);
      setAuditLogs(arr);
    } catch { /* ignore */ } finally {
      setAuditLoading(false);
    }
  };

  const ExportGrid = ({ exports }) => (
    <Row gutter={[16, 16]}>
      {exports.map((et) => (
        <Col xs={24} sm={12} lg={8} key={et.key}>
          <Card
            style={{
              borderRadius: 14,
              border: `1px solid ${et.isFull ? et.color + "40" : "#F3F4F6"}`,
              background: et.isFull ? `${et.color}08` : "white",
              height: "100%",
            }}
            bodyStyle={{ padding: 20, display: "flex", flexDirection: "column", height: "100%" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ fontSize: 28 }}>{et.icon}</div>
              {et.isFull && <Tag color="red">Full Dataset</Tag>}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 4 }}>{et.label}</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.5, flex: 1 }}>
              {et.description}
            </div>
            <Button
              type={et.isFull ? "primary" : "default"}
              icon={<FileExcelOutlined />}
              loading={loading[et.key]}
              onClick={() => handleDownload(et)}
              block
              style={{
                borderRadius: 8, height: 38,
                ...(et.isFull
                  ? { background: et.color, borderColor: et.color }
                  : { borderColor: et.color, color: et.color }),
              }}
            >
              {loading[et.key] ? "Downloading..." : "Download Excel"}
            </Button>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const householdCat = FORM_CATEGORIES.find((c) => c.key === "household");

  const tabItems = FORM_CATEGORIES.filter((cat) => cat.key !== "household").map((cat) => ({
    key: cat.key,
    label: (
      <span style={{ fontWeight: activeTab === cat.key ? 700 : 400 }}>
        {cat.label}
      </span>
    ),
    children: (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">{cat.description}</Text>
        </div>
        <ExportGrid exports={cat.exports} />

        {cat.key === "rmc" && householdCat && (
          <div style={{ marginTop: 36 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 12, paddingBottom: 10,
              borderBottom: "1px solid #F3F4F6",
            }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, background: householdCat.color }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: householdCat.color }}>
                  {householdCat.label}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>{householdCat.description}</Text>
              </div>
            </div>
            <ExportGrid exports={householdCat.exports} />
          </div>
        )}

        {cat.key === "biannual" && (
          <div style={{ marginTop: 36 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 12, paddingBottom: 10,
              borderBottom: "1px solid #F3F4F6",
            }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, background: "#3498db" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#3498db" }}>Summaries &amp; Lists</div>
                <Text type="secondary" style={{ fontSize: 12 }}>View detailed response summaries and child lists</Text>
              </div>
            </div>
            <Row gutter={[16, 16]}>
              {CA_NAV_ITEMS.map((item) => (
                <Col xs={24} sm={12} lg={8} key={item.key}>
                  <Card
                    style={{ borderRadius: 14, border: "1px solid #F3F4F6", background: "white", height: "100%" }}
                    bodyStyle={{ padding: 20, display: "flex", flexDirection: "column", height: "100%" }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.5, flex: 1 }}>
                      {item.description}
                    </div>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => navigate(item.path)}
                      block
                      style={{ borderRadius: 8, height: 38, borderColor: item.color, color: item.color }}
                    >
                      Open
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </div>
    ),
  }));

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: "#002147" }}>Data Export</Title>
        <Text style={{ color: "#6B7280" }}>Download survey data as Excel files with date &amp; state filters</Text>
      </div>

      {/* Filter Panel */}
      <Card style={{ borderRadius: 16, marginBottom: 24 }} bodyStyle={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Date Range</div>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ borderRadius: 8 }}
              disabledDate={(d) => d && d > dayjs()}
              format="DD MMM YYYY"
              presets={[
                { label: "Last 7 days", value: [dayjs().subtract(6, "day"), dayjs()] },
                { label: "Last 30 days", value: [dayjs().subtract(29, "day"), dayjs()] },
                { label: "This month", value: [dayjs().startOf("month"), dayjs()] },
                { label: "Last 3 months", value: [dayjs().subtract(3, "month"), dayjs()] },
              ]}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>State Filter</div>
            <Select
              value={selectedState}
              onChange={setSelectedState}
              style={{ width: 200, borderRadius: 8 }}
              showSearch
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {STATES.map((s) => <Option key={s} value={s}>{s}</Option>)}
            </Select>
          </div>
          <Alert
            type="info"
            showIcon
            message={
              `Exporting: ${dateRange[0]?.format("DD MMM YYYY")} → ${dateRange[1]?.format("DD MMM YYYY")} · ${selectedState}`
            }
            style={{ borderRadius: 8, flex: 1, minWidth: 200 }}
          />
        </div>
      </Card>

      {/* Tabs by form type */}
      <Card style={{ borderRadius: 16, marginBottom: 24 }} bodyStyle={{ padding: "0 24px 24px" }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          style={{ marginTop: 0 }}
        />
      </Card>

      {/* Audit Logs */}
      {(isAdmin() || isStateAdmin()) && (
        <Card
          style={{ borderRadius: 16 }}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HistoryOutlined />
              <span>Download Audit Logs</span>
            </div>
          }
          extra={
            <Button size="small" onClick={fetchAuditLogs} loading={auditLoading}>
              Load Logs
            </Button>
          }
        >
          <Table
            dataSource={auditLogs}
            columns={AUDIT_COLUMNS}
            rowKey="id"
            loading={auditLoading}
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "Click 'Load Logs' to fetch audit history" }}
          />
        </Card>
      )}
    </div>
  );
}
