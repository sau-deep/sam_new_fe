import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Card, Typography, Input, Button, Space, Form, Row, Col, Divider,
  message, Alert, Tag, Empty, Collapse, Select,
} from "antd";
import {
  SearchOutlined, EditOutlined, SaveOutlined, CloseOutlined, SendOutlined,
} from "@ant-design/icons";
import api from "../../services/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import { UNICEF_COLORS } from "../../theme/unicef";
import SectionFieldRenderer from "../../components/survey/SectionFieldRenderer";
import { validateSectionData, isFieldRequired, isEmpty as valIsEmpty } from "../../utils/rmcValidation";
import useFormLocations from "../../hooks/useFormLocations";
import { isApiSuccess, apiErrorMessage, apiFieldErrors } from "../../utils/apiResult";
import { sectionLimitErrors } from "./rmc/rmcLimits";

// Locations come from the same backend, form-scoped list (and offline cache) that
// Routine Monitoring intake uses (audit A03), not from constants/locations.
const RMC_FORM_KEY = "ROUTINE_MONITORING";

// Case-insensitive name match — saved records may store names in a different
// case (e.g. "MADHYA PRADESH") than the location list ("Madhya Pradesh").
const eqi = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// Code padding (contract C5): trim, left-pad with zeros only when shorter, never truncate.
const padCode = (code, width) => {
  if (code === undefined || code === null) return "";
  const s = String(code).trim();
  return s && s.length < width ? s.padStart(width, "0") : s;
};

// Map the backend section keys to the sectionType used by fieldMappings / SectionFieldRenderer.
const SECTION_TYPE = {
  aganwadiData: "aganwadi",
  cbeData: "cbe",
  vhsndData: "vhsnd",
  householdData: "household",
};

const { Title, Text } = Typography;
const { TextArea } = Input;

// Top-level editable basic fields. Required ones are marked.
const BASIC_FIELDS = [
  { key: "state", label: "State", required: true },
  { key: "district", label: "District", required: true },
  { key: "block", label: "Block", required: true },
  { key: "village", label: "Village", required: true },
  { key: "fieldMonitorName", label: "Field Monitor Name", required: true },
  { key: "villageCode", label: "Village Code", derived: true },
  { key: "icdsProject", label: "ICDS Project" },
  { key: "sector", label: "Sector" },
  { key: "awc", label: "AWC" },
  { key: "activityToObserve", label: "Activity to Observe", multiline: true },
];

const READONLY_FIELDS = [
  { key: "id", label: "Record ID" },
  { key: "dateVisit", label: "Date of Visit" },
  { key: "location", label: "Location" },
  { key: "responseMode", label: "Response Mode" },
  { key: "createdBy", label: "Created By" },
];

const SECTIONS = [
  { key: "aganwadiData", label: "Anganwadi Centre" },
  { key: "cbeData", label: "CBE Session" },
  { key: "vhsndData", label: "VHSND Session" },
  { key: "householdData", label: "Household Visit" },
];

const isSkippableSectionKey = (key) =>
  key === "id" || /error/i.test(key) || /Combined$/.test(key) || /hidden/i.test(key);

export default function RecordSearchEdit() {
  const [searchParams] = useSearchParams();
  const { isSurveyor } = useAuth();
  const surveyor = isSurveyor();
  const pad = surveyor ? 16 : 24;

  const [recordId, setRecordId] = useState(searchParams.get("recordId") || "");
  const [searching, setSearching] = useState(false);
  const [record, setRecord] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [basic, setBasic] = useState({});
  const [sections, setSections] = useState({});
  const [sectionErrors, setSectionErrors] = useState({}); // { sectionKey: { fieldKey: msg } }
  const [basicErrors, setBasicErrors] = useState({});     // { fieldKey: msg } from the server
  const [activeKeys, setActiveKeys] = useState([]);        // expanded Collapse panels
  // Codes of the location entries chosen in this edit (only these are sent; an
  // untouched historical location is resolved by the backend from its names).
  const [chosenCodes, setChosenCodes] = useState({});

  const {
    getStateOptions, getDistrictOptions, getBlockOptions, getVillageOptions,
  } = useFormLocations(RMC_FORM_KEY);

  // Active entries for the current selection (by name, case-insensitive).
  const findState = (name) => getStateOptions().find((st) => eqi(st.text, name)) || null;
  const districtOpts = (stateName) => {
    const st = findState(stateName);
    return st ? getDistrictOptions(st.state_code) : [];
  };
  const findDistrict = (stateName, distName) => districtOpts(stateName).find((d) => eqi(d.text, distName)) || null;
  const blockOpts = (stateName, distName) => {
    const d = findDistrict(stateName, distName);
    return d ? getBlockOptions(d.state_code, d.district_code) : [];
  };
  const findBlock = (stateName, distName, blockName) => blockOpts(stateName, distName).find((b) => eqi(b.text, blockName)) || null;
  const villageOpts = (stateName, distName, blockName) => {
    const b = findBlock(stateName, distName, blockName);
    return b ? getVillageOptions(b.state_code, b.district_code, b.block_code) : [];
  };

  // Basic + section state from a record, with names canonicalised to the active
  // list's casing where an entry matches (the historical value is kept otherwise).
  const applyRecord = (rec) => {
    setRecord(rec);
    const b = {};
    BASIC_FIELDS.forEach((f) => { b[f.key] = rec[f.key] ?? ""; });
    const st = findState(b.state);
    if (st) b.state = st.text;
    const dt = findDistrict(b.state, b.district);
    if (dt) b.district = dt.text;
    const bl = findBlock(b.state, b.district, b.block);
    if (bl) b.block = bl.text;
    const vl = villageOpts(b.state, b.district, b.block).find((v) => eqi(v.text, b.village));
    if (vl) b.village = vl.text;
    setBasic(b);
    setChosenCodes({});
    setBasicErrors({});
    const s = {};
    SECTIONS.forEach(({ key }) => {
      if (rec[key] && typeof rec[key] === "object") s[key] = { ...rec[key] };
    });
    setSections(s);
  };

  const loadRecord = useCallback(async (id, { quiet = false } = {}) => {
    if (!id || !String(id).trim()) {
      message.warning("Please enter a record ID");
      return;
    }
    setSearching(true);
    if (!quiet) {
      setRecord(null);
      setEditing(false);
      setSectionErrors({});
      setActiveKeys([]);
    }
    try {
      const res = await api.get(`/form/admin/routine-monitoring/${String(id).trim()}`, { noCache: true });
      const rec = res.data?.data;
      if (isApiSuccess(res) && rec && typeof rec === "object" && (rec.id || rec.state)) {
        applyRecord(rec);
        if (!quiet) message.success(res.data?.message || "Record found");
      } else if (!quiet) {
        message.error(apiErrorMessage(res, "Record not found"));
      }
    } catch (err) {
      if (!quiet) message.error(apiErrorMessage(err, "Error searching record. Please try again."));
    } finally {
      setSearching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("recordId");
    if (fromUrl) loadRecord(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBasicChange = (key, value) => setBasic((p) => ({ ...p, [key]: value }));

  // Cascading location selects — changing a parent clears its children (like the
  // form) and the codes are taken from the chosen active entry, never kept from
  // the previous selection.
  const clearBasicError = (...keys) => setBasicErrors((prev) => {
    const next = { ...prev };
    keys.forEach((k) => { delete next[k]; });
    return next;
  });
  const handleStateChange = (val) => {
    const st = findState(val);
    setChosenCodes({ stateCode: st?.state_code != null ? String(st.state_code).trim() : "" });
    setBasic((p) => ({ ...p, state: val || "", district: "", block: "", village: "", villageCode: "" }));
    clearBasicError("state", "district", "block", "village");
  };
  const handleDistrictChange = (val) => {
    const d = findDistrict(basic.state, val);
    setChosenCodes((c) => ({
      stateCode: c.stateCode ?? (d?.state_code != null ? String(d.state_code).trim() : ""),
      districtCode: d?.district_code != null ? padCode(d.district_code, 3) : "",
    }));
    setBasic((p) => ({ ...p, district: val || "", block: "", village: "", villageCode: "" }));
    clearBasicError("district", "block", "village");
  };
  const handleBlockChange = (val) => {
    const b = findBlock(basic.state, basic.district, val);
    setChosenCodes((c) => ({
      stateCode: c.stateCode ?? (b?.state_code != null ? String(b.state_code).trim() : ""),
      districtCode: c.districtCode ?? (b?.district_code != null ? padCode(b.district_code, 3) : ""),
      blockCode: b?.block_code != null ? padCode(b.block_code, 4) : "",
    }));
    setBasic((p) => ({ ...p, block: val || "", village: "", villageCode: "" }));
    clearBasicError("block", "village");
  };
  // Village: an active entry (code from that entry) or, where the block has no
  // village entries (RMC intake takes the name as text), a typed name without a code.
  const handleVillageChange = (val) => {
    const v = villageOpts(basic.state, basic.district, basic.block).find((o) => o.text === val);
    const unchanged = record && eqi(val, record.village) && eqi(basic.block, record.block)
      && eqi(basic.district, record.district) && eqi(basic.state, record.state);
    let villageCode = "";
    if (v?.village_code != null && String(v.village_code).trim() !== "") villageCode = padCode(v.village_code, 2);
    else if (unchanged) villageCode = record.villageCode ?? "";
    setBasic((p) => ({ ...p, village: val || "", villageCode }));
    clearBasicError("village", "villageCode");
  };
  const handleSectionChange = (sectionKey, fieldKey, value) => {
    setSections((p) => ({ ...p, [sectionKey]: { ...p[sectionKey], [fieldKey]: value } }));
    // Clear this field's error as the user edits it
    setSectionErrors((prev) => {
      if (!prev[sectionKey]?.[fieldKey]) return prev;
      const next = { ...prev, [sectionKey]: { ...prev[sectionKey] } };
      delete next[sectionKey][fieldKey];
      return next;
    });
  };

  const cancelEdit = () => {
    const b = {};
    BASIC_FIELDS.forEach((f) => { b[f.key] = record[f.key] ?? ""; });
    setBasic(b);
    const s = {};
    SECTIONS.forEach(({ key }) => {
      if (record[key] && typeof record[key] === "object") s[key] = { ...record[key] };
    });
    setSections(s);
    setSectionErrors({});
    setBasicErrors({});
    setChosenCodes({});
    setEditing(false);
  };

  // Validate basics + every present section against the form's mandatory/conditional
  // rules. Returns { basicMissing: [field], secErr: { sectionKey: { field: msg } }, count }.
  const runValidation = () => {
    const basicMissing = BASIC_FIELDS.filter((f) => f.required && valIsEmpty(basic[f.key]));
    // Top-level column widths (e.g. village code 10), same rule as the backend.
    const basicTooLong = sectionLimitErrors("", basic);
    const secErr = {};
    SECTIONS.forEach(({ key }) => {
      if (sections[key] && typeof sections[key] === "object") {
        const errs = validateSectionData(SECTION_TYPE[key], sections[key], record?.[key]);
        if (Object.keys(errs).length) secErr[key] = errs;
      }
    });
    const count = basicMissing.length + Object.keys(basicTooLong).length +
      Object.values(secErr).reduce((n, e) => n + Object.keys(e).length, 0);
    return { basicMissing, basicTooLong, secErr, count };
  };

  const buildPayload = () => {
    const payload = {};
    BASIC_FIELDS.forEach((f) => {
      payload[f.key] = typeof basic[f.key] === "string" ? basic[f.key].trim() : basic[f.key];
    });
    // Codes of entries chosen in this edit; omitted when the location was not changed.
    ["stateCode", "districtCode", "blockCode"].forEach((k) => {
      if (chosenCodes[k]) payload[k] = chosenCodes[k];
    });
    ["dateVisit", "latitude", "longitude", "location", "responseMode"].forEach((k) => {
      if (record[k] !== undefined) payload[k] = record[k];
    });
    SECTIONS.forEach(({ key }) => {
      const sec = sections[key];
      if (sec && typeof sec === "object") {
        const cleaned = {};
        Object.entries(sec).forEach(([fk, fv]) => {
          if (isSkippableSectionKey(fk)) return;
          cleaned[fk] = typeof fv === "string" ? fv.trim() : fv;
        });
        payload[key] = cleaned;
      }
    });
    return payload;
  };

  const handleSave = async () => {
    const { basicMissing, basicTooLong, secErr, count } = runValidation();
    if (count > 0) {
      setSectionErrors(secErr);
      setBasicErrors(basicTooLong);
      // Open every section panel that has an error so the surveyor can see them
      const erroredSections = Object.keys(secErr);
      if (erroredSections.length) {
        setActiveKeys((prev) => Array.from(new Set([...prev, ...erroredSections])));
      }
      message.error(
        `Please fill all mandatory fields — ${count} field${count > 1 ? "s" : ""} need${count > 1 ? "" : "s"} attention`
        + (basicMissing.length ? ` (incl. ${basicMissing.map((m) => m.label).join(", ")})` : "")
      );
      // Scroll to the first errored control once it renders
      setTimeout(() => {
        const el = document.querySelector(".Mui-error, .ant-form-item-has-error");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
      return;
    }
    setSectionErrors({});
    setBasicErrors({});
    setSaving(true);
    try {
      const payload = buildPayload();
      let res;
      if (surveyor) {
        res = await api.post(`/form/routine-monitoring/edit-notifications/create/${record.id}`, payload);
        if (isApiSuccess(res)) {
          message.success(res.data?.message || "Edit submitted. Waiting for admin approval.");
          setEditing(false);
          // The record itself changes only after approval; show what the server holds.
          loadRecord(record.id, { quiet: true });
        } else {
          showSaveFailure(res, "Failed to submit edit request");
        }
      } else {
        res = await api.put(`/form/admin/routine-monitoring/${record.id}`, payload);
        if (isApiSuccess(res)) {
          message.success(res.data?.message || "Record updated successfully");
          setEditing(false);
          // Refresh from the server's copy, not from what was typed.
          const rec = res.data?.data;
          if (rec && typeof rec === "object" && rec.id) applyRecord({ ...record, ...rec });
          loadRecord(record.id, { quiet: true });
        } else {
          showSaveFailure(res, "Failed to update record");
        }
      }
    } catch (err) {
      showSaveFailure(err, "Error saving record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // A rejected save keeps the editor open with the backend's reason (audit A04),
  // and puts any field errors (C1 fieldErrors, e.g. "cbeData.themeOfCbe") on the fields.
  const showSaveFailure = (resOrError, fallback) => {
    message.error(apiErrorMessage(resOrError, fallback));
    const fieldErrors = apiFieldErrors(resOrError);
    const secErr = {};
    const basicErr = {};
    Object.entries(fieldErrors).forEach(([path, msg]) => {
      const [head, ...rest] = String(path).split(".");
      if (rest.length && SECTION_TYPE[head]) {
        secErr[head] = { ...(secErr[head] || {}), [rest.join(".")]: String(msg) };
      } else {
        basicErr[head] = String(msg);
      }
    });
    if (Object.keys(secErr).length) {
      setSectionErrors(secErr);
      setActiveKeys((prev) => Array.from(new Set([...prev, ...Object.keys(secErr)])));
    }
    setBasicErrors(basicErr);
  };

  const renderField = (key, label, value, onChange, { required, multiline, disabled, serverError } = {}) => {
    const longText = multiline || (typeof value === "string" && value.length > 60);
    const missing = required && editing && !String(value ?? "").trim();
    // Surveyors render inside a fixed 430px column — force single column (antd
    // Col breakpoints are viewport-based, so sm={12} would clip on a desktop viewport).
    return (
      <Col xs={24} sm={surveyor || longText ? 24 : 12} key={key}>
        <Form.Item
          label={<span>{label}{required && <span style={{ color: UNICEF_COLORS.red }}> *</span>}</span>}
          style={{ marginBottom: 12 }}
          validateStatus={missing || serverError ? "error" : ""}
          help={serverError || undefined}
        >
          {longText ? (
            <TextArea
              rows={2}
              size="large"
              value={value ?? ""}
              disabled={disabled || !editing}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <Input
              size="large"
              value={value ?? ""}
              disabled={disabled || !editing}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Form.Item>
      </Col>
    );
  };

  // Cascading dropdown for a location field. Options are the active entries for
  // this form; a saved value that is no longer active stays visible (and is kept
  // unless the surveyor explicitly picks a replacement).
  const renderLocationSelect = (key, label, options, onChange, required) => {
    const opts = options.map((o) => ({ value: o.text, label: o.text }));
    if (basic[key] && !opts.some((o) => o.value === basic[key])) {
      opts.unshift({ value: basic[key], label: `${basic[key]} (saved value — not in the active list)` });
    }
    const serverError = basicErrors[key] || (key === "village" ? basicErrors.villageCode : null);
    return (
      <Col xs={24} sm={surveyor ? 24 : 12} key={key}>
        <Form.Item
          label={<span>{label}{required && <span style={{ color: UNICEF_COLORS.red }}> *</span>}</span>}
          style={{ marginBottom: 12 }}
          validateStatus={(required && editing && valIsEmpty(basic[key])) || serverError ? "error" : ""}
          help={serverError || (required && editing && valIsEmpty(basic[key]) ? "This field is required" : "")}
        >
          <Select
            size="large"
            showSearch
            allowClear
            optionFilterProp="label"
            value={basic[key] || undefined}
            disabled={!editing}
            placeholder={`Select ${label}`}
            onChange={onChange}
            options={opts}
          />
        </Form.Item>
      </Col>
    );
  };

  const LOCATION_KEYS = ["state", "district", "block", "village"];

  const sectionPanels = SECTIONS
    .filter(({ key }) => sections[key] && Object.keys(sections[key]).some((k) => !isSkippableSectionKey(k)))
    .map(({ key, label }) => {
      const errCount = Object.keys(sectionErrors[key] || {}).length;
      return {
        key,
        label: (
          <span style={{ fontWeight: 600 }}>
            {label}
            {errCount > 0 && (
              <Tag color="error" style={{ marginLeft: 8 }}>{errCount} to fix</Tag>
            )}
          </span>
        ),
        children: (
          // Render each field with its real form control (radio / checkbox / select / text)
          // and the same options as the survey form — matching the old-UI edit experience.
          <div style={{
            display: "grid",
            gridTemplateColumns: surveyor ? "1fr" : "1fr 1fr",
            columnGap: 24,
          }}>
            {Object.entries(sections[key])
              .filter(([fk]) => !isSkippableSectionKey(fk))
              .map(([fk, fv]) => (
                <SectionFieldRenderer
                  key={fk}
                  fieldName={fk}
                  value={fv}
                  onChange={(val) => handleSectionChange(key, fk, val)}
                  sectionType={SECTION_TYPE[key]}
                  isEditMode={editing}
                  error={sectionErrors[key]?.[fk] || null}
                  required={isFieldRequired(SECTION_TYPE[key], sections[key], fk)}
                />
              ))}
          </div>
        ),
      };
    });

  const saveLabel = surveyor ? "Update & Send for Approval" : "Save Changes";

  return (
    <div style={{ padding: pad, minHeight: "100%", paddingBottom: editing && surveyor ? 96 : pad }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Space align="center" size={8}>
          <EditOutlined style={{ fontSize: 20, color: "#1CABE2" }} />
          <Title level={surveyor ? 4 : 3} style={{ margin: 0, color: "#002147" }}>Fix Record</Title>
        </Space>
        <Text style={{ display: "block", color: "#6B7280", fontSize: 13, marginTop: 4 }}>
          {surveyor
            ? "Correct the flagged information, then send it back for admin approval."
            : "Find a routine-monitoring record and update it directly."}
        </Text>
      </div>

      {/* Search */}
      <Card style={{ borderRadius: 14, marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
        <Input
          size="large"
          placeholder="Enter Record ID"
          value={recordId}
          onChange={(e) => setRecordId(e.target.value)}
          onPressEnter={() => loadRecord(recordId)}
          allowClear
          style={{ marginBottom: 10 }}
        />
        <Button
          type="primary"
          size="large"
          block
          icon={<SearchOutlined />}
          loading={searching}
          onClick={() => loadRecord(recordId)}
        >
          Search
        </Button>
      </Card>

      {/* Empty state */}
      {!record && !searching && (
        <Card style={{ borderRadius: 14 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Search for a record to view and edit it" style={{ padding: 24 }} />
        </Card>
      )}

      {/* Record */}
      {record && (
        <Card style={{ borderRadius: 14 }} bodyStyle={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Text strong style={{ fontSize: 16 }}>Record Details</Text>
            <Tag color="blue" style={{ margin: 0 }}>#{record.id}</Tag>
          </div>

          {/* Top action (only when not editing) */}
          {!editing && (
            <Button
              type="primary"
              size="large"
              block={surveyor}
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(true);
                setActiveKeys(sectionPanels.map((p) => p.key)); // expand all sections for editing
              }}
              style={{ marginBottom: 16, borderRadius: 10 }}
            >
              Edit Record
            </Button>
          )}

          {editing && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={surveyor
                ? "Your changes are sent to the admin for approval before they are applied."
                : "Your changes will be applied directly to the record."}
            />
          )}

          <Form layout="vertical">
            <Row gutter={16}>
              {READONLY_FIELDS.map((f) =>
                record[f.key] !== undefined && record[f.key] !== null
                  ? renderField(f.key, f.label, record[f.key], () => {}, { disabled: true })
                  : null
              )}
            </Row>

            <Divider orientation="left" plain style={{ margin: "8px 0 16px" }}>Basic Information</Divider>
            <Row gutter={16}>
              {/* State → District → Block → Village as cascading dropdowns (like the form) */}
              {renderLocationSelect("state", "State", getStateOptions(), handleStateChange, true)}
              {renderLocationSelect("district", "District", districtOpts(basic.state), handleDistrictChange, true)}
              {renderLocationSelect("block", "Block", blockOpts(basic.state, basic.district), handleBlockChange, true)}
              {villageOpts(basic.state, basic.district, basic.block).length > 0
                ? renderLocationSelect("village", "Village", villageOpts(basic.state, basic.district, basic.block), handleVillageChange, true)
                : renderField("village", "Village", basic.village, handleVillageChange, { required: true, serverError: basicErrors.village })}
              {/* Remaining basic fields stay as text inputs; the village code follows the chosen village */}
              {BASIC_FIELDS.filter((f) => !LOCATION_KEYS.includes(f.key)).map((f) =>
                renderField(f.key, f.label, basic[f.key], (val) => handleBasicChange(f.key, val), {
                  required: f.required,
                  multiline: f.multiline,
                  disabled: f.derived,
                  serverError: basicErrors[f.key],
                })
              )}
            </Row>

            {sectionPanels.length > 0 && (
              <>
                <Divider orientation="left" plain style={{ margin: "8px 0 16px" }}>Section Data</Divider>
                <Collapse items={sectionPanels} activeKey={activeKeys} onChange={setActiveKeys} />
              </>
            )}
          </Form>

          {/* Desktop / inline action buttons when editing */}
          {editing && !surveyor && (
            <Space style={{ marginTop: 8 }}>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                {saveLabel}
              </Button>
              <Button icon={<CloseOutlined />} onClick={cancelEdit} disabled={saving}>Cancel</Button>
            </Space>
          )}
        </Card>
      )}

      {/* Surveyor: sticky mobile action bar when editing */}
      {editing && surveyor && (
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 100,
          maxWidth: 430, margin: "0 auto",
          background: "white", borderTop: "1px solid #E5E7EB",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
          padding: 12, display: "flex", gap: 10,
        }}>
          <Button size="large" onClick={cancelEdit} disabled={saving} style={{ flex: "0 0 38%", borderRadius: 10 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            loading={saving}
            onClick={handleSave}
            style={{ flex: 1, borderRadius: 10, fontWeight: 600 }}
          >
            {saveLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
