/**
 * CompleteResponse — Download complete survey responses by form type + date range.
 * Mirrors the "Download Complete Response" page in the old admin UI.
 *
 * APIs:
 *   POST /form/households   → Household Checklist
 *   POST /form/biannuals    → Concurrent Assessment (Bi-Annual)
 *   POST /form/followups    → Followup Assessment
 *   POST /form/routines     → Routine Monitoring Checklist
 *
 * Fetch → preview record count table → Export to Excel (frontend)
 */
import { useState, useCallback } from "react";
import {
  Card, Button, Select, DatePicker, Typography, Table, Tag,
  Space, Row, Col, Statistic, message, Empty, Alert, Checkbox, Divider,
} from "antd";
import { SearchOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import api from "../../services/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import { StateList } from "../../constants/locations";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const FORM_OPTIONS = [
  {
    label: "Household Checklist",
    value: "household",
    endpoint: "/form/households",
    color: "#8e44ad",
    description: "All household survey responses",
  },
  {
    label: "Concurrent Assessment",
    value: "biannual",
    endpoint: "/form/biannuals",
    color: "#3498db",
    description: "Bi-annual / concurrent assessment records",
  },
  {
    label: "Followup Assessment",
    value: "followup",
    endpoint: "/form/followups",
    color: "#e74c3c",
    description: "All follow-up assessment records",
  },
  {
    label: "Routine Monitoring Checklist",
    value: "routine",
    endpoint: "/form/routines",
    color: "#16a085",
    description: "Routine monitoring checklist (AWC, VHSND, CBE)",
  },
];

// Generic flat-mapper — works for any form type
function flattenRecord(record, formType) {
  if (!record || typeof record !== "object") return { raw: String(record) };
  const base = {
    State: record.state,
    District: record.district,
    Block: record.block,
    Village: record.village || record.villageName,
    "Surveyor Name": record.surveyorName || record.surveyor,
    "Submitted At": record.submittedAt || record.createdAt || record.submissionDate,
    "Form Type": formType,
  };
  // Merge remaining flat fields
  Object.entries(record).forEach(([k, v]) => {
    if (typeof v !== "object" && !base[k]) base[k] = v;
  });
  return base;
}

function exportToExcel(data, formLabel) {
  if (!data.length) { message.warning("No data to export."); return; }
  // Flatten nested objects and remap keys to human-readable headers
  const rows = data.map((record) => {
    const row = {};
    Object.entries(record).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      if (typeof v === "object") return; // skip nested objects
      const title = FIELD_TITLES[k] || k;
      row[title] = v;
    });
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, formLabel.slice(0, 31));
  XLSX.writeFile(wb, `Complete_Response_${formLabel.replace(/\s+/g, "_")}_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`);
  message.success(`Excel downloaded — ${data.length.toLocaleString()} records`);
}

// Human-readable titles for known API field names
const FIELD_TITLES = {
  // Location
  state: "State",
  district: "District",
  block: "Block",
  village: "Village",
  villageName: "Village",
  villageCode: "Village Code",
  // Surveyor
  surveyorName: "Surveyor Name",
  surveyorUserName: "Surveyor Username",
  userName: "Surveyor Username",
  surveyedBy: "Surveyor",
  // Date fields — entity uses 'date' for survey date
  date: "Survey Date",
  submittedAt: "Submitted At",
  createdAt: "Created At",
  submissionDate: "Submitted At",
  submittedDate: "Submitted At",
  updatedAt: "Updated At",
  // Identity
  id: "ID",
  nameParticipant: "Participant Name",
  childName: "Child Name",
  childId: "Child ID",
  headOfHousehold: "Head of HH",
  // Misc
  formType: "Form Type",
  mobileNumber: "Mobile",
  gender: "Gender",
  ageMonths: "Age (months)",
  verbalConsent: "Consent",
  numberOfChildren: "No. of Children",
};

// Priority order for columns — shown first if present in the data
const PRIORITY_FIELDS = [
  "state", "district", "block", "village", "villageName",
  "surveyorName", "userName", "surveyedBy",
  "date", "submittedAt", "submittedDate", "createdAt",
  "id", "nameParticipant", "childName", "headOfHousehold",
];

// Build columns directly from raw API field names so dataIndex always matches
function buildPreviewColumns(data) {
  if (!data.length) return [];
  const sample = data[0];
  const allKeys = Object.keys(sample).filter(
    (k) => sample[k] == null || typeof sample[k] !== "object"
  );
  const ordered = [
    ...PRIORITY_FIELDS.filter((k) => k in sample),
    ...allKeys.filter((k) => !PRIORITY_FIELDS.includes(k)),
  ].slice(0, 10);

  return ordered.map((k) => ({
    title: FIELD_TITLES[k] || k,
    dataIndex: k,           // ← actual API field name (camelCase)
    key: k,
    ellipsis: true,
    width: k === "state" || k === "district" ? 120 : 150,
    render: (v) => (v != null && v !== "" ? String(v) : "—"),
  }));
}

export default function CompleteResponse() {
  const [selectedForm, setSelectedForm] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [testDataOnly, setTestDataOnly] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const { isAdmin, isIEG, isStateAdmin, user } = useAuth();

  const lockedState = (isStateAdmin() && user?.state) ? user.state : null;
  const effectiveState = lockedState || selectedState;

  const formMeta = FORM_OPTIONS.find((f) => f.value === selectedForm);

  const handleFetch = useCallback(async () => {
    if (!selectedForm) { message.warning("Please select a form type."); return; }
    if (!dateRange?.[0] || !dateRange?.[1]) { message.warning("Please select a date range."); return; }

    setLoading(true);
    setFetched(false);
    try {
      const payload = {
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate:   dateRange[1].format("YYYY-MM-DD"),
        state: effectiveState || undefined,
        // testDataOnly is only applicable for routines (admin/IEG only)
        ...(selectedForm === "routine" && (isAdmin() || isIEG()) ? { testDataOnly } : {}),
      };

      const { data: res } = await api.post(formMeta.endpoint, payload);
      const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setData(arr);
      setFetched(true);
      if (arr.length === 0) {
        message.info("No records found for the selected criteria.");
      } else {
        message.success(`${arr.length.toLocaleString()} records fetched`);
      }
    } catch (e) {
      message.error("Failed to fetch data: " + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }, [selectedForm, dateRange, effectiveState, testDataOnly, formMeta, isAdmin, isIEG]);

  const previewCols = buildPreviewColumns(data);

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: "#002147" }}>Download Complete Response</Title>
        <Text type="secondary">Download survey responses by selecting date range and form type</Text>
      </div>

      {/* Filter panel */}
      <Card style={{ borderRadius: 12, marginBottom: 20 }} bodyStyle={{ padding: "20px 24px" }}>
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} sm={12} md={6}>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              Select Form <span style={{ color: "red" }}>*</span>
            </div>
            <Select
              placeholder="Select Form"
              value={selectedForm}
              onChange={(v) => { setSelectedForm(v); setData([]); setFetched(false); }}
              style={{ width: "100%" }}
            >
              {FORM_OPTIONS.map((f) => (
                <Option key={f.value} value={f.value}>
                  <span style={{ color: f.color, fontWeight: 600 }}>●</span> {f.label}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={7}>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              Date Range <span style={{ color: "red" }}>*</span>
            </div>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              format="DD MMM YYYY"
              style={{ width: "100%" }}
              disabledDate={(d) => d && d > dayjs()}
              presets={[
                { label: "Last 7 days",  value: [dayjs().subtract(6, "day"), dayjs()] },
                { label: "Last 30 days", value: [dayjs().subtract(29, "day"), dayjs()] },
                { label: "This month",   value: [dayjs().startOf("month"), dayjs()] },
                { label: "Last 3 months",value: [dayjs().subtract(3, "month"), dayjs()] },
              ]}
            />
          </Col>

          <Col xs={24} sm={12} md={5}>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>State</div>
            {lockedState ? (
              <Tag color="blue" style={{ padding: "6px 12px", fontSize: 13 }}>{lockedState}</Tag>
            ) : (
              <Select
                placeholder="All States"
                value={selectedState}
                onChange={setSelectedState}
                allowClear
                showSearch
                style={{ width: "100%" }}
                filterOption={(inp, opt) => opt?.children?.toLowerCase().includes(inp.toLowerCase())}
              >
                {StateList.map((s) => <Option key={s.text} value={s.text}>{s.text}</Option>)}
              </Select>
            )}
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleFetch}
                loading={loading}
                style={{ background: "#1CABE2", borderColor: "#1CABE2" }}
              >
                Fetch
              </Button>
              {fetched && data.length > 0 && (
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => exportToExcel(data, formMeta?.label || selectedForm)}
                  style={{ borderColor: "#80BD41", color: "#80BD41" }}
                >
                  Export
                </Button>
              )}
              {fetched && (
                <Button icon={<ReloadOutlined />} onClick={() => { setData([]); setFetched(false); }}>
                  Reset
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* Test data checkbox (routine + admin/IEG only) */}
        {selectedForm === "routine" && (isAdmin() || isIEG()) && (
          <div style={{ marginTop: 12 }}>
            <Checkbox checked={testDataOnly} onChange={(e) => setTestDataOnly(e.target.checked)}>
              <Text style={{ fontSize: 13 }}>Include test data only</Text>
            </Checkbox>
          </div>
        )}
      </Card>

      {/* Selected form info */}
      {formMeta && (
        <Alert
          type="info"
          showIcon
          message={
            <span>
              <strong>{formMeta.label}</strong> — {formMeta.description}
              {dateRange?.[0] && dateRange?.[1] && (
                <span style={{ marginLeft: 12, color: "#6B7280" }}>
                  · {dateRange[0].format("DD MMM YYYY")} → {dateRange[1].format("DD MMM YYYY")}
                  {effectiveState && ` · ${effectiveState}`}
                </span>
              )}
            </span>
          }
          style={{ borderRadius: 8, marginBottom: 16 }}
        />
      )}

      {/* Stats after fetch */}
      {fetched && data.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {[
            { title: "Total Records", value: data.length },
            { title: "Form Type", value: formMeta?.label || "—" },
            { title: "Date Range",
              value: dateRange ? `${dateRange[0].format("DD MMM")} – ${dateRange[1].format("DD MMM YYYY")}` : "—" },
          ].map((s, i) => (
            <Col xs={24} sm={8} key={i}>
              <Card bodyStyle={{ padding: "14px 18px" }} style={{ borderRadius: 10 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{s.title}</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#002147", marginTop: 2 }}>{s.value}</div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Preview table */}
      <Card
        style={{ borderRadius: 12 }}
        title={
          fetched && data.length > 0
            ? <span>Preview — {data.length.toLocaleString()} records <Tag color="blue">First 100 shown</Tag></span>
            : "Results"
        }
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={data.slice(0, 100)}
          columns={previewCols}
          rowKey={(_, i) => i}
          loading={loading}
          pagination={false}
          scroll={{ x: previewCols.length * 140 }}
          size="small"
          locale={{
            emptyText: fetched
              ? <Empty description="No records found" style={{ padding: 40 }} />
              : <Empty
                  description="Select form type and date range, then click Fetch"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: 40 }}
                />,
          }}
        />
        {fetched && data.length > 100 && (
          <div style={{ padding: "10px 16px", background: "#F9FAFB", textAlign: "center", borderTop: "1px solid #E5E7EB" }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Showing first 100 of {data.length.toLocaleString()} records. Click <strong>Export</strong> to download all.
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
}
