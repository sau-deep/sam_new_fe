/**
 * StateWiseSummary — mirrors the "Routine Monitoring" page in the old admin UI.
 * Shows a state × section-type count matrix fetched from
 *   GET /form/routine-monitoring/state-wise-summary?startDate=&endDate=&state=
 *
 * Below the table: per-section Excel download (excel-export endpoints).
 */
import { useState, useEffect, useCallback } from "react";
import {
  Card, Table, Button, DatePicker, Select, Tag, Typography,
  Row, Col, Statistic, Space, Spin, message, Empty, Divider,
} from "antd";
import {
  DownloadOutlined, ReloadOutlined, FileExcelOutlined, FilterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import api from "../../services/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import { StateList } from "../../constants/locations";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

// Section download cards — match old UI "Routine Monitoring Download"
const SECTION_DOWNLOADS = [
  { key: "awc",    label: "AWC (Section 1–4)",  endpoint: "/excel-export/awc",    color: "#1CABE2" },
  { key: "cbe",    label: "CBE (Section 5)",     endpoint: "/excel-export/cbe",    color: "#80BD41" },
  { key: "vhsnd",  label: "VHSND (Section 6–7)", endpoint: "/excel-export/vhsnd",  color: "#374EA2" },
  { key: "complete", label: "Complete (All Sections)", endpoint: "/excel-export/complete", color: "#E2231A", isFull: true },
];

function exportTableToExcel(data) {
  if (!data.length) { message.warning("No data to export."); return; }
  const rows = data.map((r) => ({
    State: r.state,
    "AWC (Sec 1-4)": r.awcSection1to4 ?? 0,
    "CBE (Sec 5)": r.cbeSection5 ?? 0,
    "VHSND (Sec 6-7)": r.vhsndSection6to7 ?? 0,
    "Household Sec-8": r.section8 ?? 0,
    "Household Sec-9": r.section9 ?? 0,
    "Household Sec-10": r.section10 ?? 0,
    "Household Sec-11": r.section11 ?? 0,
    "Overall": r.overall ?? 0,
  }));

  // Add totals row
  const totals = { State: "TOTAL" };
  ["AWC (Sec 1-4)", "CBE (Sec 5)", "VHSND (Sec 6-7)",
   "Household Sec-8", "Household Sec-9", "Household Sec-10",
   "Household Sec-11", "Overall"].forEach((col) => {
    totals[col] = rows.reduce((s, r) => s + (r[col] || 0), 0);
  });
  rows.push(totals);

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "State-Wise Summary");
  XLSX.writeFile(wb, `State_Wise_RMC_Summary_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`);
}

export default function StateWiseSummary() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dlLoading, setDlLoading] = useState({});
  const [dateRange, setDateRange] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const { isStateAdmin, user } = useAuth();

  // State admin is locked to their own state
  const userState = user?.state || null;
  const lockedState = isStateAdmin() && userState ? userState : null;

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange?.[0]) params.startDate = dateRange[0].format("YYYY-MM-DD");
      if (dateRange?.[1]) params.endDate   = dateRange[1].format("YYYY-MM-DD");
      const stateParam = lockedState || selectedState;
      if (stateParam) params.state = stateParam;

      const { data: res } = await api.get("/form/routine-monitoring/state-wise-summary", { params });
      const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setData(arr);
    } catch (e) {
      message.error("Failed to load state-wise summary.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedState, lockedState]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // Section Excel download
  const handleSectionDownload = async (sec) => {
    setDlLoading((p) => ({ ...p, [sec.key]: true }));
    try {
      const payload = {
        startDate: dateRange?.[0]?.format("YYYY-MM-DD") ?? dayjs().subtract(1, "month").format("YYYY-MM-DD"),
        endDate:   dateRange?.[1]?.format("YYYY-MM-DD") ?? dayjs().format("YYYY-MM-DD"),
        state: (lockedState || selectedState) ?? undefined,
      };
      const { data: blob } = await api.post(sec.endpoint, payload, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sec.key}_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`${sec.label} downloaded`);
    } catch {
      message.error(`Download failed for ${sec.label}`);
    } finally {
      setDlLoading((p) => ({ ...p, [sec.key]: false }));
    }
  };

  // Compute totals row
  const totals = data.reduce(
    (acc, r) => {
      acc.awcSection1to4  += r.awcSection1to4  ?? 0;
      acc.cbeSection5     += r.cbeSection5     ?? 0;
      acc.vhsndSection6to7+= r.vhsndSection6to7?? 0;
      acc.section8        += r.section8        ?? 0;
      acc.section9        += r.section9        ?? 0;
      acc.section10       += r.section10       ?? 0;
      acc.section11       += r.section11       ?? 0;
      acc.overall         += r.overall         ?? 0;
      return acc;
    },
    { awcSection1to4: 0, cbeSection5: 0, vhsndSection6to7: 0,
      section8: 0, section9: 0, section10: 0, section11: 0, overall: 0 }
  );

  const columns = [
    {
      title: "States",
      dataIndex: "state",
      fixed: "left",
      width: 160,
      render: (v) => (
        <Text strong style={{ color: "#1CABE2", cursor: "default" }}>{v}</Text>
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>AWC<br /><small style={{ fontWeight: 400 }}>Section 1–4</small></div>,
      dataIndex: "awcSection1to4",
      align: "center",
      width: 100,
      render: (v) => v ?? 0,
    },
    {
      title: <div style={{ textAlign: "center" }}>CBE<br /><small style={{ fontWeight: 400 }}>Section 5</small></div>,
      dataIndex: "cbeSection5",
      align: "center",
      width: 90,
      render: (v) => v ?? 0,
    },
    {
      title: <div style={{ textAlign: "center" }}>🏥 VHSND<br /><small style={{ fontWeight: 400 }}>Section 6–7</small></div>,
      dataIndex: "vhsndSection6to7",
      align: "center",
      width: 110,
    },
    {
      title: <div style={{ textAlign: "center" }}>🏠 Household<br /><small style={{ fontWeight: 400 }}>Section-8</small></div>,
      dataIndex: "section8",
      align: "center",
      width: 120,
    },
    {
      title: <div style={{ textAlign: "center" }}>🏠 Household<br /><small style={{ fontWeight: 400 }}>Section-9</small></div>,
      dataIndex: "section9",
      align: "center",
      width: 120,
    },
    {
      title: <div style={{ textAlign: "center" }}>🏠 Household<br /><small style={{ fontWeight: 400 }}>Section-10</small></div>,
      dataIndex: "section10",
      align: "center",
      width: 120,
    },
    {
      title: <div style={{ textAlign: "center" }}>🏠 Household<br /><small style={{ fontWeight: 400 }}>Section-11</small></div>,
      dataIndex: "section11",
      align: "center",
      width: 120,
    },
    {
      title: <div style={{ textAlign: "center", color: "#1CABE2" }}>📊 Overall</div>,
      dataIndex: "overall",
      align: "center",
      width: 100,
      render: (v) => <Text strong style={{ color: "#1CABE2", fontSize: 15 }}>{v ?? 0}</Text>,
      sorter: (a, b) => (a.overall ?? 0) - (b.overall ?? 0),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: "#002147" }}>Routine Monitoring — State-Wise Summary</Title>
        <Text type="secondary">Section-wise submission counts aggregated by state</Text>
      </div>

      {/* Filters */}
      <Card style={{ borderRadius: 12, marginBottom: 16 }} bodyStyle={{ padding: "16px 20px" }}>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD MMM YYYY"
            allowClear
            placeholder={["Start Date", "End Date"]}
            presets={[
              { label: "Last 7 days",  value: [dayjs().subtract(6, "day"), dayjs()] },
              { label: "Last 30 days", value: [dayjs().subtract(29, "day"), dayjs()] },
              { label: "This month",   value: [dayjs().startOf("month"), dayjs()] },
              { label: "Last 3 months",value: [dayjs().subtract(3, "month"), dayjs()] },
            ]}
          />
          {lockedState ? (
            <Tag color="blue" style={{ padding: "4px 12px", fontSize: 13 }}>{lockedState}</Tag>
          ) : (
            <Select
              placeholder="All States"
              value={selectedState}
              onChange={setSelectedState}
              allowClear
              showSearch
              style={{ width: 200 }}
              filterOption={(inp, opt) => opt?.children?.toLowerCase().includes(inp.toLowerCase())}
            >
              {StateList.map((s) => (
                <Option key={s.text} value={s.text}>{s.text}</Option>
              ))}
            </Select>
          )}
          <Button type="primary" icon={<FilterOutlined />} onClick={fetchSummary} loading={loading}
            style={{ background: "#002147", borderColor: "#002147" }}>
            Apply
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchSummary} loading={loading}>Refresh</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportTableToExcel(data)}
            style={{ borderColor: "#1CABE2", color: "#1CABE2" }}>
            Export Table (Excel)
          </Button>
        </Space>
      </Card>

      {/* Summary stats */}
      {data.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {[
            { title: "Total Submissions", value: totals.overall },
            { title: "States", value: data.length },
            { title: "AWC", value: totals.awcSection1to4 },
            { title: "VHSND", value: totals.vhsndSection6to7 },
            { title: "CBE", value: totals.cbeSection5 },
            { title: "Household (all)", value: totals.section8 + totals.section9 + totals.section10 + totals.section11 },
          ].map((s) => (
            <Col xs={12} sm={8} lg={4} key={s.title}>
              <Card bodyStyle={{ padding: "12px 16px" }} style={{ borderRadius: 10, textAlign: "center" }}>
                <Statistic title={s.title} value={s.value} valueStyle={{ fontSize: 20, color: "#002147" }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Main table */}
      <Card style={{ borderRadius: 12, marginBottom: 24 }} bodyStyle={{ padding: 0 }}>
        <Spin spinning={loading}>
          <Table
            dataSource={data}
            columns={columns}
            rowKey="state"
            pagination={false}
            scroll={{ x: 1000 }}
            size="middle"
            locale={{ emptyText: <Empty description="No data — select filters and click Apply" style={{ padding: 40 }} /> }}
            summary={() =>
              data.length > 0 ? (
                <Table.Summary.Row style={{ background: "#1a5a32", fontWeight: 700 }}>
                  <Table.Summary.Cell index={0}>
                    <Text strong style={{ color: "white" }}>Total</Text>
                  </Table.Summary.Cell>
                  {[
                    totals.awcSection1to4, totals.cbeSection5, totals.vhsndSection6to7,
                    totals.section8, totals.section9, totals.section10, totals.section11,
                  ].map((v, i) => (
                    <Table.Summary.Cell key={i} align="center">
                      <Text strong style={{ color: "white" }}>{v}</Text>
                    </Table.Summary.Cell>
                  ))}
                  <Table.Summary.Cell align="center">
                    <Text strong style={{ color: "#FFC20E", fontSize: 16 }}>{totals.overall}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              ) : null
            }
          />
        </Spin>
      </Card>

      {/* Routine Monitoring Download */}
      <Divider orientation="left">
        <Text strong style={{ fontSize: 15 }}>Routine Monitoring Download</Text>
      </Divider>
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        Download routine monitoring forms with section-wise data. Date range and state filter above apply.
      </Text>
      <Row gutter={[16, 16]}>
        {SECTION_DOWNLOADS.map((sec) => (
          <Col xs={24} sm={12} lg={6} key={sec.key}>
            <Card
              style={{
                borderRadius: 12,
                border: `1px solid ${sec.isFull ? sec.color + "50" : "#E5E7EB"}`,
                background: sec.isFull ? `${sec.color}08` : "white",
              }}
              bodyStyle={{ padding: 18 }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 6 }}>{sec.label}</div>
              <Button
                type={sec.isFull ? "primary" : "default"}
                icon={<FileExcelOutlined />}
                loading={dlLoading[sec.key]}
                onClick={() => handleSectionDownload(sec)}
                block
                style={{
                  height: 36, borderRadius: 8,
                  ...(sec.isFull
                    ? { background: sec.color, borderColor: sec.color }
                    : { borderColor: sec.color, color: sec.color }),
                }}
              >
                Download Excel
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
