import { useState, useEffect, useCallback } from "react";
import {
  Card, Select, Button, Table, Typography, message, Space, Tag, Form, Row, Col,
  Popconfirm, Segmented, Empty, Radio, Checkbox, Switch, Tooltip, Input, Divider, Tabs,
} from "antd";
import { PlusOutlined, EnvironmentOutlined, DeleteOutlined, AppstoreOutlined, EditOutlined } from "@ant-design/icons";
import api from "../../services/axiosInstance";
import { clearFormLocationCache } from "../../services/formLocationService";
import { clearFormLocationsCache } from "../../utils/formLocations";
import { StateList } from "../../constants/locations";

const { Title, Text } = Typography;
const { Option } = Select;

// Must match SURVEY_FORMS keys (backend FormLocationServiceImpl.VALID_FORM_KEYS).
const FORMS = [
  { key: "ROUTINE_MONITORING", label: "Routine Monitoring" },
  { key: "HOUSE_HOLD", label: "Household" },
  { key: "BI_ANNUAL", label: "Concurrent (Bi-Annual)" },
  { key: "FOLLOWUP", label: "Follow-Up" },
];

const ENTRY_TYPES = [
  { value: "DISTRICT", label: "New District" },
  { value: "BLOCK",    label: "New Block" },
  { value: "VILLAGE",  label: "New Village" },
];

const TYPE_COLOR = { DISTRICT: "orange", BLOCK: "blue", VILLAGE: "green" };


export default function FormLocationManagement() {
  const [form]       = Form.useForm();
  const [customForm] = Form.useForm();

  // Table view — which form tab is active
  const [formKey, setFormKey]       = useState(FORMS[0].key);
  const [assigned, setAssigned]     = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  // Add-form entry type
  const [entryType, setEntryType] = useState("BLOCK");

  // Location cascade
  const [selectedState,    setSelectedState]    = useState(null);
  const [stateCode,        setStateCode]        = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtCode,     setDistrictCode]     = useState(null);
  const [selectedBlock,    setSelectedBlock]    = useState(null);
  const [blockCode,        setBlockCode]        = useState(null);
  const [selectedVillage,  setSelectedVillage]  = useState(null);
  const [villageCode,      setVillageCode]      = useState(null);

  // Which forms to activate — default all 4 checked
  const [selectedForms, setSelectedForms] = useState(FORMS.map(f => f.key));

  // Track which row id is currently being toggled to show per-row loading
  const [togglingId, setTogglingId] = useState(null);

  // Track bulk activate/deactivate loading
  const [bulkToggling, setBulkToggling] = useState(false);

  // ── Custom / new location add form ──────────────────────────────────────
  const [customEntryType,      setCustomEntryType]      = useState("DISTRICT");
  const [customStateCode,      setCustomStateCode]      = useState(null);
  const [customStateName,      setCustomStateName]      = useState(null);
  const [customForms,          setCustomForms]          = useState(FORMS.map(f => f.key));
  const [customSubmitting,     setCustomSubmitting]     = useState(false);

  // Which add-mode tab is visible: "existing" | "new"
  const [addMode, setAddMode] = useState("existing");

  // Districts and blocks fetched from form_location for the custom-card dropdowns
  const [locationData,         setLocationData]         = useState({ districts: [], blocks: [], villages: [] });
  const [customSelStateCode,   setCustomSelStateCode]   = useState(null); // state filter for BLOCK/VILLAGE
  const [customSelDistrict,    setCustomSelDistrict]    = useState(null); // full district object
  const [customSelBlock,       setCustomSelBlock]       = useState(null); // full block object

  const districtOptions = stateCode
    ? locationData.districts.filter(d => String(d.stateCode) === String(stateCode))
    : [];
  const blockOptions = districtCode
    ? Array.from(
        new Map(
          locationData.blocks
            .filter(b => String(b.districtCode) === String(districtCode))
            .map(b => [b.block, b])
        ).values()
      )
    : [];
  const villageOptions = blockCode
    ? (locationData.villages || []).filter(v => String(v.blockCode) === String(blockCode))
    : [];

  // ─── Cache invalidation ───────────────────────────────────────────────────
  // Clears both the localStorage entry and the module-level in-memory cache so
  // the next survey form mount fetches fresh data from the API.
  const invalidateFormCache = (fk) => {
    clearFormLocationCache(fk);
    clearFormLocationsCache(fk);
  };

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchAssigned = useCallback(async (key) => {
    setLoadingList(true);
    try {
      const res  = await api.get(`/admin/form-location/${key}`, { noCache: true });
      const data = res.data?.data ?? res.data;
      setAssigned(Array.isArray(data) ? data : []);
    } catch {
      message.error("Failed to load assigned locations.");
      setAssigned([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchAssigned(formKey);
  }, [formKey, fetchAssigned]);

  useEffect(() => {
    api.get("/admin/form-location/location-data", { noCache: true })
      .then(res => {
        const d = res.data?.data ?? res.data;
        if (d && d.districts) setLocationData(d);
      })
      .catch(() => {});
  }, []);

  // ─── Cascade reset helpers ────────────────────────────────────────────────

  const clearBlock = () => {
    setSelectedBlock(null); setBlockCode(null);
    setSelectedVillage(null); setVillageCode(null);
    form.setFieldsValue({ block: undefined, village: undefined });
  };

  const clearDistrict = () => {
    setSelectedDistrict(null); setDistrictCode(null);
    clearBlock();
    form.setFieldsValue({ district: undefined });
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleEntryTypeChange = (val) => {
    setEntryType(val);
    clearBlock();
  };

  const handleStateChange = (value) => {
    const entry = locationData.districts.find(d => d.state === value);
    setSelectedState(value);
    setStateCode(entry?.stateCode ?? null);
    clearDistrict();
  };

  const handleDistrictChange = (value) => {
    const district = districtOptions.find(d => d.district === value);
    setSelectedDistrict(value);
    setDistrictCode(district?.districtCode ?? null);
    clearBlock();
  };

  const handleBlockChange = (value) => {
    const b = blockOptions.find(b => b.block === value);
    setSelectedBlock(value);
    setBlockCode(b?.blockCode ?? null);
    setSelectedVillage(null); setVillageCode(null);
    form.setFieldsValue({ village: undefined });
  };

  const handleVillageChange = (value) => {
    const v = villageOptions.find(v => v.village === value);
    setSelectedVillage(value);
    setVillageCode(v?.villageCode ?? null);
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const postEntry = (fk, payload) =>
    api.post(`/admin/form-location/${fk}`, payload).then((res) => {
      if (res.data?.success === false) {
        const err = new Error(res.data?.message || "Request failed");
        err.response = { data: res.data };
        throw err;
      }
      return res;
    });

  const handleSubmit = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    if (selectedForms.length === 0) {
      message.warning("Please select at least one form.");
      return;
    }

    setSubmitting(true);
    try {
      let calls = [];

      if (entryType === "DISTRICT") {
        // Expand to all blocks in the district — one POST per block per form
        if (blockOptions.length === 0) {
          message.info("No blocks found for the selected district.");
          return;
        }
        for (const fk of selectedForms) {
          for (const b of blockOptions) {
            calls.push(postEntry(fk, {
              state: selectedState, stateCode: String(stateCode),
              district: selectedDistrict, districtCode: String(districtCode),
              block: b.block, blockCode: String(b.blockCode),
              village: null, villageCode: "",
              entryType: "BLOCK",
            }));
          }
        }
      } else if (entryType === "BLOCK") {
        calls = selectedForms.map(fk => postEntry(fk, {
          state: selectedState, stateCode: String(stateCode),
          district: selectedDistrict, districtCode: String(districtCode),
          block: selectedBlock, blockCode: String(blockCode),
          village: null, villageCode: "",
          entryType: "BLOCK",
        }));
      } else {
        // VILLAGE
        calls = selectedForms.map(fk => postEntry(fk, {
          state: selectedState, stateCode: String(stateCode),
          district: selectedDistrict, districtCode: String(districtCode),
          block: selectedBlock, blockCode: String(blockCode),
          village: selectedVillage, villageCode: String(villageCode),
          entryType: "VILLAGE",
        }));
      }

      const results = await Promise.allSettled(calls);
      const ok     = results.filter(r => r.status === "fulfilled").length;
      const failed = results.length - ok;
      if (ok > 0)     message.success(`Added ${ok} entr${ok > 1 ? "ies" : "y"} successfully.`);
      if (failed > 0) {
        const reason = results
          .filter(r => r.status === "rejected")
          .map(r => r.reason?.response?.data?.message || r.reason?.message)
          .find(Boolean);
        message.warning(reason || `${failed} entr${failed > 1 ? "ies" : "y"} skipped.`);
      }

      selectedForms.forEach(invalidateFormCache);
      form.resetFields();
      setSelectedState(null); setStateCode(null);
      setSelectedDistrict(null); setDistrictCode(null);
      setSelectedBlock(null); setBlockCode(null);
      setSelectedVillage(null); setVillageCode(null);
      fetchAssigned(formKey);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to assign location(s).");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Toggle active / inactive ─────────────────────────────────────────────

  const handleToggleActive = async (record, checked) => {
    const previous = assigned.slice();
    setAssigned(prev =>
      prev.map(r => r.id === record.id ? { ...r, isActive: checked } : r)
    );
    setTogglingId(record.id);
    try {
      await api.patch(`/admin/form-location/${record.id}/active?value=${checked}`);
      invalidateFormCache(formKey);
      message.success(`"${record.village || record.block}" ${checked ? "activated" : "deactivated"}.`);
    } catch (err) {
      setAssigned(previous);
      message.error(err?.response?.data?.message || "Failed to update status.");
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Bulk activate / deactivate all ──────────────────────────────────────

  const handleToggleAll = async (activate) => {
    const toChange = assigned.filter(r => r.isActive !== activate);
    if (toChange.length === 0) {
      message.info(`All locations are already ${activate ? "active" : "inactive"}.`);
      return;
    }
    const previous = assigned.slice();
    setAssigned(prev => prev.map(r => ({ ...r, isActive: activate })));
    setBulkToggling(true);
    try {
      await Promise.all(
        toChange.map(r => api.patch(`/admin/form-location/${r.id}/active?value=${activate}`))
      );
      invalidateFormCache(formKey);
      message.success(`All ${toChange.length} location(s) ${activate ? "activated" : "deactivated"}.`);
    } catch (err) {
      setAssigned(previous);
      message.error(err?.response?.data?.message || "Failed to update some locations.");
    } finally {
      setBulkToggling(false);
    }
  };

  // ─── Remove ───────────────────────────────────────────────────────────────

  const handleRemove = async (record) => {
    try {
      const bc = encodeURIComponent(record.blockCode ?? "");
      const vc = encodeURIComponent(record.villageCode ?? "");
      await api.delete(`/admin/form-location/${formKey}/${bc}?villageCode=${vc}`);
      invalidateFormCache(formKey);
      message.success(`Removed "${record.village || record.block}" from ${formKey}.`);
      fetchAssigned(formKey);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to remove entry.");
    }
  };

  // ─── Custom location submit ───────────────────────────────────────────────

  const handleCustomSubmit = async (values) => {
    if (customForms.length === 0) {
      message.warning("Please select at least one form.");
      return;
    }

    let basePayload;

    if (customEntryType === "DISTRICT") {
      const stc   = String(customStateCode);
      const dist  = (values.customDistrict      || "").trim();
      const dCode = (values.customDistrictCode  || "").trim();
      const blk   = (values.customBlock         || "").trim();
      const bCode = (values.customBlockCode     || "").trim();
      const vlg   = (values.customVillage       || "").trim();
      const vCode = (values.customVillageCode   || "").trim();
      basePayload = {
        state: customStateName, stateCode: stc,
        district: dist, districtCode: dCode,
        block: blk, blockCode: bCode,
        village: vlg, villageCode: vCode,
        entryType: "VILLAGE",
      };

    } else if (customEntryType === "BLOCK") {
      const blk   = (values.customBlock        || "").trim();
      const bCode = (values.customBlockCode    || "").trim();
      const vlg   = (values.customVillage      || "").trim();
      const vCode = (values.customVillageCode  || "").trim();
      const d     = customSelDistrict;
      basePayload = {
        state: d.state, stateCode: d.stateCode,
        district: d.district, districtCode: d.districtCode,
        block: blk, blockCode: bCode,
        village: vlg, villageCode: vCode,
        entryType: "VILLAGE",
      };

    } else {
      const vlg   = (values.customVillage     || "").trim();
      const vCode = (values.customVillageCode || "").trim();
      const b     = customSelBlock;
      basePayload = {
        state: b.state, stateCode: b.stateCode,
        district: b.district, districtCode: b.districtCode,
        block: b.block, blockCode: b.blockCode,
        village: vlg, villageCode: vCode,
        entryType: "VILLAGE",
      };
    }

    setCustomSubmitting(true);
    try {
      const calls   = customForms.map(fk => postEntry(fk, basePayload));
      const results = await Promise.allSettled(calls);
      const ok      = results.filter(r => r.status === "fulfilled").length;
      const failed  = results.length - ok;
      if (ok > 0)     message.success(`Custom location added to ${ok} form(s).`);
      if (failed > 0) {
        const reason = results
          .filter(r => r.status === "rejected")
          .map(r => r.reason?.response?.data?.message || r.reason?.message)
          .find(Boolean);
        message.warning(reason || `${failed} form(s) skipped.`);
      }

      customForms.forEach(invalidateFormCache);
      customForm.resetFields();
      setCustomStateCode(null); setCustomStateName(null);
      setCustomSelDistrict(null); setCustomSelBlock(null);
      // Refresh the location-data so newly added entries appear in future dropdowns
      api.get("/admin/form-location/location-data", { noCache: true })
        .then(res => { const d = res.data?.data ?? res.data; if (d?.districts) setLocationData(d); })
        .catch(() => {});
      fetchAssigned(formKey);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to add custom location.");
    } finally {
      setCustomSubmitting(false);
    }
  };

  // ─── Table columns ────────────────────────────────────────────────────────

  const activeCount   = assigned.filter(r => r.isActive).length;
  const inactiveCount = assigned.length - activeCount;

  const columns = [
    { title: "#", key: "index", width: 50, render: (_, __, i) => i + 1 },
    { title: "State",    dataIndex: "state",    key: "state" },
    { title: "District", dataIndex: "district", key: "district" },
    {
      title: "Block",
      dataIndex: "block",
      key: "block",
      render: (text, r) => text ? (
        <Space>
          <Text strong>{text}</Text>
          {r.blockCode ? <Tag color="blue">{r.blockCode}</Tag> : null}
        </Space>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: "Village",
      dataIndex: "village",
      key: "village",
      render: (text, r) => text ? (
        <Space>
          <Text>{text}</Text>
          {r.villageCode ? <Tag color="cyan">{r.villageCode}</Tag> : null}
        </Space>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: "Type",
      dataIndex: "entryType",
      key: "entryType",
      width: 90,
      render: (type) => {
        const t = type || "BLOCK";
        const label = t.charAt(0) + t.slice(1).toLowerCase();
        return <Tag color={TYPE_COLOR[t] || "default"}>{label}</Tag>;
      },
    },
    {
      title: "Active",
      dataIndex: "isActive",
      key: "isActive",
      width: 80,
      render: (val, record) => (
        <Tooltip title={val ? "Click to deactivate" : "Click to activate"}>
          <Switch
            size="small"
            checked={!!val}
            loading={togglingId === record.id}
            onChange={checked => handleToggleActive(record, checked)}
          />
        </Tooltip>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 110,
      render: (_, record) => (
        <Popconfirm
          title="Permanently remove this entry?"
          okText="Remove"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleRemove(record)}
        >
          <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
        </Popconfirm>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: "#002147" }}>
          <AppstoreOutlined style={{ marginRight: 8 }} />
          Form Location Management
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Add districts, blocks, or villages to survey forms and choose which forms each location should be active for.
        </Text>
      </div>

      {/* ── ADD LOCATION (tabbed) ── */}
      <Card
        style={{ borderRadius: 12, marginBottom: 24, border: "1px solid #E5E7EB" }}
        bodyStyle={{ padding: "0 24px 24px" }}
      >
        <Tabs
          activeKey={addMode}
          onChange={setAddMode}
          items={[
            {
              key: "existing",
              label: <Space><EnvironmentOutlined />From Existing</Space>,
              children: (
                <Form form={form} layout="vertical" onFinish={handleSubmit}>

                  {/* Entry type */}
                  <Form.Item label="Entry Type" style={{ marginBottom: 20 }}>
                    <Radio.Group
                      value={entryType}
                      onChange={e => handleEntryTypeChange(e.target.value)}
                      buttonStyle="solid"
                    >
                      {ENTRY_TYPES.map(et => (
                        <Radio.Button key={et.value} value={et.value}>{et.label}</Radio.Button>
                      ))}
                    </Radio.Group>
                  </Form.Item>

                  {/* Location cascade */}
                  <Row gutter={16}>
                    <Col xs={24} sm={12} md={entryType === "DISTRICT" ? 12 : 8}>
                      <Form.Item label="State" name="state" rules={[{ required: true, message: "Select a state" }]}>
                        <Select
                          placeholder="Select State"
                          onChange={handleStateChange}
                          showSearch
                          filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                        >
                          {[...new Map(locationData.districts.map(d => [d.stateCode, d])).values()]
                            .sort((a, b) => a.state.localeCompare(b.state))
                            .map(d => <Option key={d.stateCode} value={d.state}>{d.state}</Option>)}
                        </Select>
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12} md={entryType === "DISTRICT" ? 12 : 8}>
                      <Form.Item label="District" name="district" rules={[{ required: true, message: "Select a district" }]}>
                        <Select
                          placeholder="Select District"
                          onChange={handleDistrictChange}
                          disabled={!selectedState}
                          showSearch
                          filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                        >
                          {districtOptions.map(d => <Option key={d.districtCode} value={d.district}>{d.district}</Option>)}
                        </Select>
                      </Form.Item>
                    </Col>

                    {(entryType === "BLOCK" || entryType === "VILLAGE") && (
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="Block" name="block" rules={[{ required: true, message: "Select a block" }]}>
                          <Select
                            placeholder="Select Block"
                            onChange={handleBlockChange}
                            disabled={!selectedDistrict}
                            showSearch
                            filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                          >
                            {blockOptions.map(b => <Option key={b.blockCode} value={b.block}>{b.block}</Option>)}
                          </Select>
                        </Form.Item>
                      </Col>
                    )}

                    {entryType === "VILLAGE" && (
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="Village" name="village" rules={[{ required: true, message: "Select a village" }]}>
                          <Select
                            placeholder="Select Village"
                            onChange={handleVillageChange}
                            disabled={!selectedBlock}
                            showSearch
                            filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                          >
                            {villageOptions.map(v => <Option key={v.villageCode} value={v.village}>{v.village}</Option>)}
                          </Select>
                        </Form.Item>
                      </Col>
                    )}
                  </Row>

                  {/* Form selection */}
                  <Form.Item
                    label="Active for Forms"
                    style={{ marginBottom: 16 }}
                    extra="Select which survey forms this location should be active for"
                  >
                    <Checkbox.Group
                      options={FORMS.map(f => ({ label: f.label, value: f.key }))}
                      value={selectedForms}
                      onChange={setSelectedForms}
                    />
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<PlusOutlined />}
                      loading={submitting}
                      disabled={selectedForms.length === 0}
                      style={{ background: "#002147", borderColor: "#002147" }}
                    >
                      Add {entryType === "DISTRICT" ? "District (all blocks)" : entryType === "VILLAGE" ? "Village" : "Block"}
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: "new",
              label: <Space><EditOutlined />Add New Location</Space>,
              children: (
                <Form form={customForm} layout="vertical" onFinish={handleCustomSubmit}>

                  {/* Entry type */}
                  <Form.Item label="What are you adding?" style={{ marginBottom: 20 }}>
                    <Radio.Group
                      value={customEntryType}
                      onChange={e => {
                        setCustomEntryType(e.target.value);
                        setCustomStateCode(null); setCustomStateName(null);
                        setCustomSelStateCode(null);
                        setCustomSelDistrict(null);
                        setCustomSelBlock(null);
                        customForm.resetFields([
                          "customState","customDistrict","customDistrictCode",
                          "customBlock","customBlockCode","customVillage","customVillageCode",
                          "customStateSelB","customDistrictSel","customStateSelV",
                          "customDistrictSelV","customBlockSelV",
                        ]);
                      }}
                      buttonStyle="solid"
                    >
                      {ENTRY_TYPES.map(et => (
                        <Radio.Button key={et.value} value={et.value}>{et.label}</Radio.Button>
                      ))}
                    </Radio.Group>
                  </Form.Item>

                  {/* Location inputs: dropdowns for parent levels, name+code pairs for new items */}
                  <Row gutter={16}>

                    {/* ── New District ── */}
                    {customEntryType === "DISTRICT" && (<>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="State" name="customState" rules={[{ required: true, message: "Select a state" }]}>
                          <Select
                            placeholder="Select State"
                            onChange={value => {
                              const s = StateList.find(x => x.text === value);
                              setCustomStateCode(s?.state_code ?? null);
                              setCustomStateName(value);
                            }}
                            showSearch
                            filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                          >
                            {StateList.map(s => <Option key={s.state_code} value={s.text}>{s.text}</Option>)}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="New District Name" name="customDistrict"
                          rules={[{ required: true, message: "Enter district name" }, { min: 2 }]}>
                          <Input placeholder="District name" maxLength={100} disabled={!customStateName} />
                        </Form.Item>
                        <Form.Item label="District Code" name="customDistrictCode"
                          rules={[
                            { required: true, message: "Enter district code" },
                            { max: 3, message: "Max 3 characters" },
                            { pattern: /^[a-zA-Z0-9]+$/, message: "Alphanumeric only" },
                          ]}>
                          <Input placeholder="e.g. D01" maxLength={3} disabled={!customStateName} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="New Block Name" name="customBlock"
                          rules={[{ required: true, message: "Enter block name" }, { min: 2 }]}>
                          <Input placeholder="Block name" maxLength={100} disabled={!customStateName} />
                        </Form.Item>
                        <Form.Item label="Block Code" name="customBlockCode"
                          rules={[
                            { required: true, message: "Enter block code" },
                            { max: 4, message: "Max 4 characters" },
                            { pattern: /^[a-zA-Z0-9]+$/, message: "Alphanumeric only" },
                          ]}>
                          <Input placeholder="e.g. B001" maxLength={4} disabled={!customStateName} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="New Village Name" name="customVillage"
                          rules={[{ required: true, message: "Enter village name" }, { min: 2 }]}>
                          <Input placeholder="Village name" maxLength={150} disabled={!customStateName} />
                        </Form.Item>
                        <Form.Item label="Village Code" name="customVillageCode"
                          rules={[
                            { required: true, message: "Enter village code" },
                            { max: 2, message: "Max 2 characters" },
                            { pattern: /^[a-zA-Z0-9]+$/, message: "Alphanumeric only" },
                          ]}>
                          <Input placeholder="e.g. V1" maxLength={2} disabled={!customStateName} />
                        </Form.Item>
                      </Col>
                    </>)}

                    {/* ── New Block ── */}
                    {customEntryType === "BLOCK" && (<>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="State" name="customStateSelB"
                          rules={[{ required: true, message: "Select a state" }]}>
                          <Select
                            placeholder="Select state"
                            showSearch
                            filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                            onChange={value => {
                              const s = StateList.find(x => x.text === value);
                              setCustomSelStateCode(s?.state_code ?? null);
                              setCustomSelDistrict(null);
                              customForm.setFieldsValue({
                                customDistrictSel: undefined,
                                customBlock: undefined, customBlockCode: undefined,
                                customVillage: undefined, customVillageCode: undefined,
                              });
                            }}
                          >
                            {StateList.map(s => <Option key={s.state_code} value={s.text}>{s.text}</Option>)}
                          </Select>
                        </Form.Item>
                        <Form.Item label="District" name="customDistrictSel"
                          rules={[{ required: true, message: "Select a district" }]}>
                          <Select
                            placeholder="Select district"
                            disabled={!customSelStateCode}
                            showSearch
                            filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                            onChange={(_, opt) => {
                              setCustomSelDistrict(opt.data);
                              customForm.setFieldsValue({
                                customBlock: undefined, customBlockCode: undefined,
                                customVillage: undefined, customVillageCode: undefined,
                              });
                            }}
                          >
                            {locationData.districts
                              .filter(d => String(d.stateCode) === String(customSelStateCode))
                              .map(d => (
                                <Option key={d.districtCode} value={d.districtCode} data={d}>{d.district}</Option>
                              ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="New Block Name" name="customBlock"
                          rules={[{ required: true, message: "Enter block name" }, { min: 2 }]}>
                          <Input placeholder="Block name" maxLength={100} disabled={!customSelDistrict} />
                        </Form.Item>
                        <Form.Item label="Block Code" name="customBlockCode"
                          rules={[
                            { required: true, message: "Enter block code" },
                            { max: 4, message: "Max 4 characters" },
                            { pattern: /^[a-zA-Z0-9]+$/, message: "Alphanumeric only" },
                          ]}>
                          <Input placeholder="e.g. B001" maxLength={4} disabled={!customSelDistrict} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="New Village Name" name="customVillage"
                          rules={[{ required: true, message: "Enter village name" }, { min: 2 }]}>
                          <Input placeholder="Village name" maxLength={150} disabled={!customSelDistrict} />
                        </Form.Item>
                        <Form.Item label="Village Code" name="customVillageCode"
                          rules={[
                            { required: true, message: "Enter village code" },
                            { max: 2, message: "Max 2 characters" },
                            { pattern: /^[a-zA-Z0-9]+$/, message: "Alphanumeric only" },
                          ]}>
                          <Input placeholder="e.g. V1" maxLength={2} disabled={!customSelDistrict} />
                        </Form.Item>
                      </Col>
                    </>)}

                    {/* ── New Village ── */}
                    {customEntryType === "VILLAGE" && (<>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="State" name="customStateSelV"
                          rules={[{ required: true, message: "Select a state" }]}>
                          <Select
                            placeholder="Select state"
                            showSearch
                            filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                            onChange={value => {
                              const s = StateList.find(x => x.text === value);
                              setCustomSelStateCode(s?.state_code ?? null);
                              setCustomSelDistrict(null);
                              setCustomSelBlock(null);
                              customForm.setFieldsValue({
                                customDistrictSelV: undefined,
                                customBlockSelV: undefined,
                                customVillage: undefined, customVillageCode: undefined,
                              });
                            }}
                          >
                            {StateList.map(s => <Option key={s.state_code} value={s.text}>{s.text}</Option>)}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="District" name="customDistrictSelV"
                          rules={[{ required: true, message: "Select a district" }]}>
                          <Select
                            placeholder="Select district"
                            disabled={!customSelStateCode}
                            showSearch
                            filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                            onChange={(_, opt) => {
                              setCustomSelDistrict(opt.data);
                              setCustomSelBlock(null);
                              customForm.setFieldsValue({
                                customBlockSelV: undefined,
                                customVillage: undefined, customVillageCode: undefined,
                              });
                            }}
                          >
                            {locationData.districts
                              .filter(d => String(d.stateCode) === String(customSelStateCode))
                              .map(d => (
                                <Option key={d.districtCode} value={d.districtCode} data={d}>{d.district}</Option>
                              ))}
                          </Select>
                        </Form.Item>
                        <Form.Item label="Block" name="customBlockSelV"
                          rules={[{ required: true, message: "Select a block" }]}>
                          <Select
                            placeholder="Select block"
                            disabled={!customSelDistrict}
                            showSearch
                            filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                            onChange={(_, opt) => {
                              setCustomSelBlock(opt.data);
                              customForm.setFieldsValue({
                                customVillage: undefined, customVillageCode: undefined,
                              });
                            }}
                          >
                            {locationData.blocks
                              .filter(b => b.districtCode === customSelDistrict?.districtCode)
                              .map(b => (
                                <Option key={b.blockCode} value={b.blockCode} data={b}>{b.block}</Option>
                              ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="New Village Name" name="customVillage"
                          rules={[{ required: true, message: "Enter village name" }, { min: 2 }]}>
                          <Input placeholder="Village name" maxLength={150} disabled={!customSelBlock} />
                        </Form.Item>
                        <Form.Item label="Village Code" name="customVillageCode"
                          rules={[
                            { required: true, message: "Enter village code" },
                            { max: 2, message: "Max 2 characters" },
                            { pattern: /^[a-zA-Z0-9]+$/, message: "Alphanumeric only" },
                          ]}>
                          <Input placeholder="e.g. V1" maxLength={2} disabled={!customSelBlock} />
                        </Form.Item>
                      </Col>
                    </>)}

                  </Row>

                  <Divider style={{ margin: "12px 0" }} />

                  {/* Form selection */}
                  <Form.Item
                    label="Active for Forms"
                    style={{ marginBottom: 16 }}
                    extra="Select which survey forms this new location should be active for"
                  >
                    <Checkbox.Group
                      options={FORMS.map(f => ({ label: f.label, value: f.key }))}
                      value={customForms}
                      onChange={setCustomForms}
                    />
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<PlusOutlined />}
                      loading={customSubmitting}
                      disabled={customForms.length === 0}
                      style={{ background: "#d4a017", borderColor: "#d4a017" }}
                    >
                      Add {customEntryType === "DISTRICT" ? "New District + Village" : customEntryType === "BLOCK" ? "New Block + Village" : "New Village"}
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>

      {/* ── TABLE SECTION ── */}
      <Segmented
        block
        options={FORMS.map(f => ({ label: f.label, value: f.key }))}
        value={formKey}
        onChange={val => setFormKey(val)}
        style={{ marginBottom: 20 }}
      />

      <Card
        style={{ borderRadius: 12, border: "1px solid #E5E7EB" }}
        bodyStyle={{ padding: 0 }}
        title={
          <Space>
            <span>Locations for <strong>{formKey}</strong></span>
            <Tag color="geekblue">{activeCount} active</Tag>
            {inactiveCount > 0 && <Tag color="default">{inactiveCount} inactive</Tag>}
          </Space>
        }
        extra={
          assigned.length > 0 && (
            <Space>
              <Button
                size="small"
                type="primary"
                loading={bulkToggling}
                disabled={activeCount === assigned.length || loadingList}
                onClick={() => handleToggleAll(true)}
              >
                Activate All
              </Button>
              <Button
                size="small"
                danger
                ghost
                loading={bulkToggling}
                disabled={inactiveCount === assigned.length || loadingList}
                onClick={() => handleToggleAll(false)}
              >
                Deactivate All
              </Button>
            </Space>
          )
        }
      >
        <Table
          dataSource={assigned}
          columns={columns}
          rowKey={r => r.id ?? `${r.blockCode}__${r.villageCode ?? ""}`}
          loading={loadingList}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="small"
          rowClassName={r => r.isActive === false ? "row-inactive" : ""}
          locale={{ emptyText: <Empty description="No locations assigned to this form yet." /> }}
          style={{ borderRadius: "0 0 12px 12px" }}
        />
      </Card>
      <style>{`.row-inactive td { opacity: 0.45; }`}</style>
    </div>
  );
}
