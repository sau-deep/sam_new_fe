import { useState } from "react";
import {
  Card, Row, Col, Button, Select, DatePicker, Table,
  Typography, message, Empty, Alert,
} from "antd";
import { SearchOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import api from "../../services/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import useFormLocations from "../../hooks/useFormLocations";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

// Single source of truth for every column the household_checklist record carries.
// Both the on-screen table and the Excel export are derived from this list, so
// they always stay in sync with the full API response.
const fmtDateTime = (v) => (v ? dayjs(v).format("DD MMM YYYY HH:mm") : "—");
const blank = (v) => (v === null || v === undefined || v === "" ? "—" : v);

// The household_checklist source can carry the same child_id on more than one row
// (a child surveyed again, or duplicated rows), and the backend's 25-record cluster
// sample does not dedupe. Keep only the first record per non-empty childId so every
// row shown in the table and written to the Excel export has a unique Child ID.
// Records with no childId are kept as-is since they can't be keyed by it.
const dedupeByChildId = (records) => {
  const seen = new Set();
  return records.filter((r) => {
    const id = r?.childId;
    if (id === null || id === undefined || id === "") return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const FIELDS = [
  { key: "childId", title: "Child ID", width: 160 },
  { key: "nameParticipant", title: "Participant Name", width: 160 },
  { key: "verbalConsent", title: "Verbal Consent", width: 130 },
  { key: "date", title: "Visit Date", width: 120 },
  { key: "time", title: "Time", width: 90 },
  { key: "headOfHousehold", title: "Head of Household", width: 160 },
  { key: "mobileNumber", title: "Mobile Number", width: 130 },
  { key: "numberOfChildren", title: "No. of Children", width: 120 },
  { key: "childrenStayingHh", title: "Children Staying in HH", width: 160 },
  { key: "householdNumber", title: "Household Number", width: 140 },
  { key: "clusterNumber", title: "Cluster Code", width: 110 },
  { key: "structureCode", title: "Structure Code", width: 120 },
  { key: "state", title: "State", width: 130 },
  { key: "stateCode", title: "State Code", width: 100 },
  { key: "district", title: "District", width: 140 },
  { key: "districtCode", title: "District Code", width: 110 },
  { key: "block", title: "Block", width: 140 },
  { key: "blockCode", title: "Block Code", width: 100 },
  { key: "village", title: "Village", width: 140 },
  { key: "villageCode", title: "Village Code", width: 110 },
  { key: "latitude", title: "Latitude", width: 120 },
  { key: "longitude", title: "Longitude", width: 120 },
  { key: "responseMode", title: "Response Mode", width: 120 },
  { key: "createdBy", title: "Created By", width: 140 },
  { key: "createdOn", title: "Created On", width: 160, format: fmtDateTime },
];

const COLUMNS = FIELDS.map((f) => ({
  title: f.title,
  dataIndex: f.key,
  key: f.key,
  width: f.width,
  render: (v) => (f.format ? f.format(v) : blank(v)),
}));

export default function HouseholdChildList() {
  const { isStateAdmin, user } = useAuth();

  // Location dropdowns come from the Household form's active form-locations
  // (form_location, form_key = HOUSE_HOLD) — the same source the Household survey
  // uses — so filter values match what was saved. Filtering is by name (not code),
  // since newer records may carry names but null location codes.
  const {
    getStateOptions,
    getCanonicalStateName,
    getDistrictOptionsByStateName,
    getBlockOptionsByDistrictName,
    getVillageOptionsByBlockName,
  } = useFormLocations("HOUSE_HOLD");

  // users.state is stored UPPERCASE; resolve to the canonical proper-case form-location
  // value so the locked state matches dropdown options and saved survey data.
  const lockedState = isStateAdmin() && user?.state ? getCanonicalStateName(user.state) : null;

  const [dateRange, setDateRange] = useState([dayjs().subtract(10, "month"), dayjs()]);

  // Selected values are location NAMES (matching the DB name columns).
  const [selectedState, setSelectedState] = useState(lockedState || null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);

  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const effectiveState = lockedState || selectedState;

  // Cascading options derived from the form-locations (live cache, re-derived per render).
  const stateOptions = getStateOptions();
  const districtOptions = effectiveState ? getDistrictOptionsByStateName(effectiveState) : [];
  const blockOptions = effectiveState && selectedDistrict
    ? getBlockOptionsByDistrictName(effectiveState, selectedDistrict)
    : [];
  const villageOptions = effectiveState && selectedDistrict && selectedBlock
    ? getVillageOptionsByBlockName(effectiveState, selectedDistrict, selectedBlock)
    : [];

  const handleStateChange = (val) => {
    setSelectedState(val);
    setSelectedDistrict(null);
    setSelectedBlock(null);
    setSelectedVillage(null);
    setResults([]); setSearched(false);
  };

  const handleDistrictChange = (val) => {
    setSelectedDistrict(val);
    setSelectedBlock(null);
    setSelectedVillage(null);
    setResults([]); setSearched(false);
  };

  const handleBlockChange = (val) => {
    setSelectedBlock(val);
    setSelectedVillage(null);
    setResults([]); setSearched(false);
  };

  const handleSearch = async () => {
    if (!dateRange || dateRange.length < 2) { message.warning("Please select a date range."); return; }
    if (!effectiveState) { message.warning("Please select a state."); return; }
    if (!selectedDistrict) { message.warning("Please select a district."); return; }
    if (!selectedBlock) { message.warning("Please select a block."); return; }

    setSearchLoading(true);
    setSearched(false);
    try {
      const payload = {
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
        state: effectiveState,
        district: selectedDistrict,
        block: selectedBlock,
        village: selectedVillage || null,
      };
      const { data } = await api.post("/survey/household", payload);
      const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      const unique = dedupeByChildId(arr);
      setResults(unique);
      setSearched(true);
      if (unique.length === 0) {
        message.info("No records found for the selected criteria.");
      } else {
        message.success(`Found ${unique.length} record${unique.length !== 1 ? "s" : ""}.`);
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
    if (!lockedState) setSelectedState(null);
    setSelectedDistrict(null);
    setSelectedBlock(null);
    setSelectedVillage(null);
    setResults([]);
    setSearched(false);
  };

  const handleExport = () => {
    if (!results.length) { message.warning("No data to export."); return; }
    const rows = results.map((r) =>
      FIELDS.reduce((acc, f) => {
        acc[f.title] = f.format ? f.format(r[f.key]) : blank(r[f.key]);
        return acc;
      }, {})
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Household Child List");
    const s = (effectiveState || "all").replace(/\s+/g, "_");
    const d = (selectedDistrict || "all").replace(/\s+/g, "_");
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
              value={effectiveState}
              onChange={handleStateChange}
              disabled={!!lockedState}
              style={{ width: "100%" }}
              placeholder="Select State"
              showSearch
              optionFilterProp="label"
              options={stateOptions.map((s) => ({ value: s.text, label: s.text }))}
            />
          </Col>

          {/* District */}
          <Col xs={24} sm={12} lg={4}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>District</div>
            <Select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              disabled={!effectiveState}
              style={{ width: "100%" }}
              placeholder="Select District"
              showSearch
              optionFilterProp="label"
              options={districtOptions.map((d) => ({ value: d.text, label: d.text }))}
            />
          </Col>

          {/* Block */}
          <Col xs={24} sm={12} lg={4}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Block</div>
            <Select
              value={selectedBlock}
              onChange={handleBlockChange}
              disabled={!selectedDistrict}
              style={{ width: "100%" }}
              placeholder="Select Block"
              showSearch
              optionFilterProp="label"
              options={blockOptions.map((b) => ({ value: b.text, label: b.text }))}
            />
          </Col>

          {/* Village (optional) */}
          <Col xs={24} sm={12} lg={4}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Village (optional)</div>
            <Select
              value={selectedVillage}
              onChange={setSelectedVillage}
              disabled={!selectedBlock}
              style={{ width: "100%" }}
              placeholder="All Villages"
              allowClear
              showSearch
              optionFilterProp="label"
              options={villageOptions.map((v) => ({ value: v.text, label: v.text }))}
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
            disabled={!effectiveState || !selectedDistrict || !selectedBlock}
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
            scroll={{ x: "max-content" }}
            locale={{ emptyText: "No records found for the selected criteria" }}
          />
        )}
      </Card>
    </div>
  );
}
