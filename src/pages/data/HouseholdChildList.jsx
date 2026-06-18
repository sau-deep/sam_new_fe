import { useState, useEffect } from "react";
import {
  Card, Row, Col, Button, Select, DatePicker, Table,
  Typography, message, Empty, Alert, Spin,
} from "antd";
import { SearchOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import api from "../../services/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import { StateList } from "../../constants/locations";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

const COLUMNS = [
  { title: "Child ID", dataIndex: "childId", key: "childId", render: (v) => v || "—" },
  { title: "Village", dataIndex: "village", key: "village", render: (v) => v || "—" },
  { title: "Block", dataIndex: "block", key: "block", render: (v) => v || "—" },
  { title: "District", dataIndex: "district", key: "district", render: (v) => v || "—" },
  { title: "State", dataIndex: "state", key: "state", render: (v) => v || "—" },
  { title: "Visit Date", dataIndex: "date", key: "date", render: (v) => v || "—" },
];

export default function HouseholdChildList() {
  const { isStateAdmin, user } = useAuth();
  const userState = user?.state || null;
  const lockedState = isStateAdmin() && userState ? userState : null;

  const lockedStateObj = lockedState
    ? StateList.find((s) => s.text === lockedState)
    : null;

  const [dateRange, setDateRange] = useState([dayjs().subtract(10, "month"), dayjs()]);

  // Selected values (store code strings, matching DB)
  const [stateCode, setStateCode] = useState(lockedStateObj ? String(lockedStateObj.state_code) : null);
  const [districtCode, setDistrictCode] = useState(null);
  const [blockCode, setBlockCode] = useState(null);
  const [villageCode, setVillageCode] = useState(null);

  // Display labels (for export filename)
  const [stateLabel, setStateLabel] = useState(lockedState || null);
  const [districtLabel, setDistrictLabel] = useState(null);

  // Dynamic dropdown options from API
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [villages, setVillages] = useState([]);

  // Loading states
  const [districtLoading, setDistrictLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [villageLoading, setVillageLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  // Load districts when state changes
  useEffect(() => {
    if (!stateCode) { setDistricts([]); setDistrictCode(null); setBlocks([]); setBlockCode(null); setVillages([]); setVillageCode(null); return; }
    setDistrictLoading(true);
    api.get("/survey/districts", { params: { stateCode } })
      .then(({ data }) => {
        const arr = Array.isArray(data?.data) ? data.data : [];
        // Deduplicate by districtCode, keep first occurrence (alphabetically sorted by DB)
        const seen = new Set();
        setDistricts(arr.filter((d) => { if (seen.has(d.districtCode)) return false; seen.add(d.districtCode); return true; }));
      })
      .catch(() => message.error("Failed to load districts"))
      .finally(() => setDistrictLoading(false));
  }, [stateCode]);

  // Load blocks when district changes
  useEffect(() => {
    if (!stateCode || !districtCode) { setBlocks([]); setBlockCode(null); setVillages([]); setVillageCode(null); return; }
    setBlockLoading(true);
    api.get("/survey/blocks", { params: { stateCode, districtCode } })
      .then(({ data }) => {
        const arr = Array.isArray(data?.data) ? data.data : [];
        const seen = new Set();
        setBlocks(arr.filter((b) => { if (seen.has(b.blockCode)) return false; seen.add(b.blockCode); return true; }));
      })
      .catch(() => message.error("Failed to load blocks"))
      .finally(() => setBlockLoading(false));
  }, [stateCode, districtCode]);

  // Load villages when block changes
  useEffect(() => {
    if (!stateCode || !districtCode || !blockCode) { setVillages([]); setVillageCode(null); return; }
    if (!dateRange || dateRange.length < 2) return;
    setVillageLoading(true);
    api.get("/survey/villages", {
      params: {
        stateCode,
        districtCode,
        blockCode,
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
      },
    })
      .then(({ data }) => {
        const arr = Array.isArray(data?.data) ? data.data : [];
        setVillages(arr);
      })
      .catch(() => {})
      .finally(() => setVillageLoading(false));
  }, [stateCode, districtCode, blockCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStateChange = (code, option) => {
    setStateCode(code);
    setStateLabel(option?.label || code);
    setDistrictCode(null); setDistrictLabel(null);
    setBlockCode(null);
    setVillageCode(null);
    setResults([]); setSearched(false);
  };

  const handleDistrictChange = (code, option) => {
    setDistrictCode(code);
    setDistrictLabel(option?.label || code);
    setBlockCode(null);
    setVillageCode(null);
    setResults([]); setSearched(false);
  };

  const handleBlockChange = (code) => {
    setBlockCode(code);
    setVillageCode(null);
    setResults([]); setSearched(false);
  };

  const handleSearch = async () => {
    if (!dateRange || dateRange.length < 2) { message.warning("Please select a date range."); return; }
    if (!stateCode) { message.warning("Please select a state."); return; }
    if (!districtCode) { message.warning("Please select a district."); return; }
    if (!blockCode) { message.warning("Please select a block."); return; }

    setSearchLoading(true);
    setSearched(false);
    try {
      const payload = {
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
        stateCode: Number(stateCode),
        districtCode: Number(districtCode),
        blockCode: Number(blockCode),
        villageCode: villageCode ? Number(villageCode) : null,
      };
      const { data } = await api.post("/survey/household", payload);
      const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setResults(arr);
      setSearched(true);
      if (arr.length === 0) {
        message.info("No records found for the selected criteria.");
      } else {
        message.success(`Found ${arr.length} record${arr.length !== 1 ? "s" : ""}.`);
      }
    } catch (err) {
      message.error(`Search failed: ${err.response?.data?.message || err.message}`);
      setResults([]);
      setSearched(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleReset = () => {
    setDateRange([dayjs().subtract(10, "month"), dayjs()]);
    if (!lockedState) { setStateCode(null); setStateLabel(null); }
    setDistrictCode(null); setDistrictLabel(null);
    setBlockCode(null);
    setVillageCode(null);
    setResults([]);
    setSearched(false);
  };

  const handleExport = () => {
    if (!results.length) { message.warning("No data to export."); return; }
    const rows = results.map((r) => ({
      "Child ID": r.childId || "—",
      "Village": r.village || "—",
      "Block": r.block || "—",
      "District": r.district || "—",
      "State": r.state || "—",
      "Visit Date": r.date || "—",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Household Child List");
    const s = (stateLabel || "all").replace(/\s+/g, "_");
    const d = (districtLabel || "all").replace(/\s+/g, "_");
    XLSX.writeFile(wb, `household_child_list_${s}_${d}_${dayjs().format("YYYYMMDD")}.xlsx`);
    message.success("Excel file downloaded.");
  };

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: "#002147" }}>Household Child List Download</Title>
        <Text style={{ color: "#6B7280" }}>
          Filter household survey records by location and date range, then export to Excel
        </Text>
      </div>

      {/* Filter Panel */}
      <Card style={{ borderRadius: 16, marginBottom: 24 }} bodyStyle={{ padding: "20px 24px" }}>
        <Row gutter={[16, 16]}>
          {/* Date Range */}
          <Col xs={24} sm={12} lg={8}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Date Range</div>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: "100%", borderRadius: 8 }}
              disabledDate={(d) => d && d > dayjs()}
              format="DD MMM YYYY"
              presets={[
                { label: "Last 30 days", value: [dayjs().subtract(29, "day"), dayjs()] },
                { label: "Last 3 months", value: [dayjs().subtract(3, "month"), dayjs()] },
                { label: "Last 6 months", value: [dayjs().subtract(6, "month"), dayjs()] },
                { label: "Last 10 months", value: [dayjs().subtract(10, "month"), dayjs()] },
              ]}
            />
          </Col>

          {/* State */}
          <Col xs={24} sm={12} lg={4}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>State</div>
            <Select
              value={stateCode}
              onChange={handleStateChange}
              disabled={!!lockedState}
              style={{ width: "100%" }}
              placeholder="Select State"
              showSearch
              optionFilterProp="label"
              options={StateList.map((s) => ({ value: String(s.state_code), label: s.text }))}
            />
          </Col>

          {/* District */}
          <Col xs={24} sm={12} lg={4}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>District</div>
            <Select
              value={districtCode}
              onChange={handleDistrictChange}
              disabled={!stateCode || districtLoading}
              loading={districtLoading}
              style={{ width: "100%" }}
              placeholder={districtLoading ? "Loading…" : "Select District"}
              showSearch
              optionFilterProp="label"
              options={districts.map((d) => ({ value: d.districtCode, label: d.district }))}
            />
          </Col>

          {/* Block */}
          <Col xs={24} sm={12} lg={4}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Block</div>
            <Select
              value={blockCode}
              onChange={handleBlockChange}
              disabled={!districtCode || blockLoading}
              loading={blockLoading}
              style={{ width: "100%" }}
              placeholder={blockLoading ? "Loading…" : "Select Block"}
              showSearch
              optionFilterProp="label"
              options={blocks.map((b) => ({ value: b.blockCode, label: b.block }))}
            />
          </Col>

          {/* Village (optional) */}
          <Col xs={24} sm={12} lg={4}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Village (optional)</div>
            <Select
              value={villageCode}
              onChange={setVillageCode}
              disabled={!blockCode || villageLoading}
              loading={villageLoading}
              style={{ width: "100%" }}
              placeholder={villageLoading ? "Loading…" : "All Villages"}
              allowClear
              showSearch
              optionFilterProp="label"
              options={villages.map((v) => ({ value: v.villageCode, label: v.village }))}
            />
          </Col>
        </Row>

        {lockedState && (
          <Alert
            type="info"
            showIcon
            message={`State locked to: ${lockedState}`}
            style={{ borderRadius: 8, marginTop: 16 }}
          />
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={searchLoading}
            disabled={!stateCode || !districtCode || !blockCode}
            style={{ borderRadius: 8, height: 38 }}
          >
            Search
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            style={{ borderRadius: 8, height: 38 }}
          >
            Reset
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={results.length === 0}
            style={{ borderRadius: 8, height: 38 }}
          >
            Export to Excel
          </Button>
        </div>
      </Card>

      {/* Results */}
      <Card style={{ borderRadius: 16 }} bodyStyle={{ padding: "20px 24px" }}>
        <div style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: 700, fontSize: 15, color: "#002147" }}>Results</Text>
          {searched && results.length > 0 && (
            <Text type="secondary" style={{ marginLeft: 12, fontSize: 13 }}>
              {results.length} record{results.length !== 1 ? "s" : ""} found
            </Text>
          )}
        </div>

        {!searched ? (
          <Empty description="Select state, district and block above, then click Search" />
        ) : (
          <Table
            dataSource={results}
            columns={COLUMNS}
            rowKey={(row, idx) => row.childId || idx}
            loading={searchLoading}
            size="small"
            pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (total) => `Total ${total} records` }}
            scroll={{ x: 700 }}
            locale={{ emptyText: "No records found for the selected criteria" }}
          />
        )}
      </Card>
    </div>
  );
}
