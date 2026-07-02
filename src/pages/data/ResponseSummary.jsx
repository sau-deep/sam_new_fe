/**
 * ResponseSummary — Village-wise response summary (Household + Concurrent Assessment counts).
 * Mirrors the "Response Summary" page in the old admin UI.
 *
 * API: GET /admin/response-summary/village-summary?state=&district=
 * Response: [{ villageCode, villageName, householdChecklistCount, concurrentAssessmentCount }]
 *
 * Note: Data is available from 1 July 2026 onwards (backend filter).
 */
import { useState, useCallback } from "react";
import {
  Card, Button, Select, Typography, Table, Tag, Space,
  Row, Col, Statistic, message, Empty, Alert,
} from "antd";
import { SearchOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import api from "../../services/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import useFormLocations from "../../hooks/useFormLocations";

const { Title, Text } = Typography;
const { Option } = Select;

function exportToExcel(data, state, district) {
  if (!data.length) { message.warning("No data to export."); return; }
  const rows = data.map((r) => ({
    "Village Code": r.villageCode || "—",
    "Village Name": r.villageName || "—",
    "Household Checklist": r.householdChecklistCount ?? 0,
    "Concurrent Assessment": r.concurrentAssessmentCount ?? 0,
    "Total": (r.householdChecklistCount ?? 0) + (r.concurrentAssessmentCount ?? 0),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Response Summary");
  XLSX.writeFile(wb, `Response_Summary_${state}_${district}_${dayjs().format("YYYYMMDD")}.xlsx`);
}

export default function ResponseSummary() {
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const { isStateAdmin, user } = useAuth();

  // Location dropdowns are sourced from the Household form's active form-locations
  // (form_location table, form_key = HOUSE_HOLD) — the same source the Household
  // survey uses — so the filter values exactly match what was saved. The static
  // master list caused mismatches (e.g. form-location "Malakangir" vs master "Malkangiri").
  const { getStateOptions, getDistrictOptionsByStateName, getCanonicalStateName } = useFormLocations("HOUSE_HOLD");

  // State admin locked to their state. users.state is stored UPPERCASE, so resolve it to
  // the canonical proper-case form-location value that matches the survey data.
  const userState = user?.state || null;
  const lockedState = isStateAdmin() && userState ? getCanonicalStateName(userState) : null;
  const effectiveState = lockedState || selectedState;

  // District options based on selected state (form-location backed)
  const districtOptions = effectiveState
    ? getDistrictOptionsByStateName(effectiveState)
    : [];

  const handleStateChange = (val) => {
    setSelectedState(val);
    setSelectedDistrict(null);
    setData([]);
    setFetched(false);
  };

  const fetchSummary = useCallback(async () => {
    if (!effectiveState) { message.warning("Please select a state."); return; }
    if (!selectedDistrict) { message.warning("Please select a district."); return; }
    setLoading(true);
    setFetched(false);
    try {
      const { data: res } = await api.get("/admin/response-summary/village-summary", {
        params: { state: effectiveState, district: selectedDistrict },
      });
      const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setData(arr);
      setFetched(true);
      if (arr.length === 0) message.info("No data found for the selected state and district.");
    } catch (e) {
      message.error("Failed to fetch response summary. " + (e.response?.data?.message || ""));
    } finally {
      setLoading(false);
    }
  }, [effectiveState, selectedDistrict]);

  const totalHH = data.reduce((s, r) => s + (r.householdChecklistCount ?? 0), 0);
  const totalCA = data.reduce((s, r) => s + (r.concurrentAssessmentCount ?? 0), 0);

  const columns = [
    {
      title: "#",
      key: "index",
      width: 55,
      render: (_, __, i) => <Text type="secondary" style={{ fontSize: 12 }}>{i + 1}</Text>,
    },
    {
      title: "Village Code",
      dataIndex: "villageCode",
      width: 130,
      render: (v) => <Text style={{ fontSize: 12, fontFamily: "monospace" }}>{v || "—"}</Text>,
    },
    {
      title: "Village Name",
      dataIndex: "villageName",
      render: (v) => v || "—",
    },
    {
      title: "Household Checklist",
      dataIndex: "householdChecklistCount",
      align: "center",
      width: 170,
      sorter: (a, b) => (a.householdChecklistCount ?? 0) - (b.householdChecklistCount ?? 0),
      render: (v) => (
        <Tag color={(v ?? 0) > 20 ? "green" : (v ?? 0) > 0 ? "purple" : "default"} style={{ minWidth: 40, textAlign: "center" }}>
          {v ?? 0}
        </Tag>
      ),
    },
    {
      title: "Concurrent Assessment",
      dataIndex: "concurrentAssessmentCount",
      align: "center",
      width: 180,
      sorter: (a, b) => (a.concurrentAssessmentCount ?? 0) - (b.concurrentAssessmentCount ?? 0),
      render: (v) => (
        <Tag color={(v ?? 0) > 20 ? "green" : (v ?? 0) > 0 ? "blue" : "default"} style={{ minWidth: 40, textAlign: "center" }}>
          {v ?? 0}
        </Tag>
      ),
    },
    {
      title: "Total",
      align: "center",
      width: 90,
      sorter: (a, b) =>
        ((a.householdChecklistCount ?? 0) + (a.concurrentAssessmentCount ?? 0)) -
        ((b.householdChecklistCount ?? 0) + (b.concurrentAssessmentCount ?? 0)),
      render: (_, r) => {
        const t = (r.householdChecklistCount ?? 0) + (r.concurrentAssessmentCount ?? 0);
        return <Text strong style={{ color: t > 0 ? "#002147" : "#9CA3AF" }}>{t}</Text>;
      },
    },
  ];

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: "#002147" }}>Response Summary</Title>
        <Text type="secondary">
          Village-wise response summary — Household Checklist and Concurrent Assessment counts
          (Data from 1 July 2026 onwards)
        </Text>
      </div>

      {/* Filters */}
      <Card style={{ borderRadius: 12, marginBottom: 20 }} bodyStyle={{ padding: "20px 24px" }}>
        <Space wrap size="middle">
          {lockedState ? (
            <div>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>State</div>
              <Tag color="blue" style={{ padding: "6px 16px", fontSize: 14 }}>{lockedState}</Tag>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>State <span style={{ color: "red" }}>*</span></div>
              <Select
                placeholder="Select State"
                value={selectedState}
                onChange={handleStateChange}
                style={{ width: 220 }}
                showSearch
                filterOption={(inp, opt) => opt?.children?.toLowerCase().includes(inp.toLowerCase())}
              >
                {getStateOptions().map((s) => <Option key={s.text} value={s.text}>{s.text}</Option>)}
              </Select>
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>District <span style={{ color: "red" }}>*</span></div>
            <Select
              placeholder="Select District"
              value={selectedDistrict}
              onChange={setSelectedDistrict}
              style={{ width: 220 }}
              disabled={!effectiveState}
              showSearch
              filterOption={(inp, opt) => opt?.children?.toLowerCase().includes(inp.toLowerCase())}
            >
              {districtOptions.map((d) => <Option key={d.text} value={d.text}>{d.text}</Option>)}
            </Select>
          </div>

          <div style={{ marginTop: 20 }}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={fetchSummary}
              loading={loading}
              disabled={!effectiveState || !selectedDistrict}
              style={{ background: "#1CABE2", borderColor: "#1CABE2", marginRight: 8 }}
            >
              Get Response Summary
            </Button>
            {fetched && data.length > 0 && (
              <Button
                icon={<DownloadOutlined />}
                onClick={() => exportToExcel(data, effectiveState, selectedDistrict)}
                style={{ borderColor: "#80BD41", color: "#80BD41" }}
              >
                Export to Excel
              </Button>
            )}
          </div>
        </Space>
      </Card>

      {/* Summary stats */}
      {fetched && data.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {[
            { title: "Villages with Data", value: data.length, color: "#002147" },
            { title: "Household Checklist", value: totalHH, color: "#8e44ad" },
            { title: "Concurrent Assessment", value: totalCA, color: "#3498db" },
            { title: "Total Responses", value: totalHH + totalCA, color: "#1CABE2" },
          ].map((s) => (
            <Col xs={12} sm={6} key={s.title}>
              <Card bodyStyle={{ padding: "14px 16px" }} style={{ borderRadius: 10, textAlign: "center" }}>
                <Statistic
                  title={s.title}
                  value={s.value}
                  valueStyle={{ fontSize: 22, color: s.color, fontWeight: 700 }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Results table */}
      <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey={(r) => r.villageCode || r.villageName || Math.random()}
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
          size="middle"
          scroll={{ x: 700 }}
          locale={{
            emptyText: fetched
              ? <Empty description="No data for selected filters" style={{ padding: 40 }} />
              : <Empty description="Select state and district, then click 'Get Response Summary'" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />,
          }}
        />
      </Card>
    </div>
  );
}
