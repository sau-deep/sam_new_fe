import { useState, useEffect, useCallback } from "react";
import {
  Card, Select, Button, Table, Typography, message, Space, Tag, Form, Row, Col, Popconfirm, Segmented, Empty,
} from "antd";
import { PlusOutlined, EnvironmentOutlined, DeleteOutlined, AppstoreOutlined } from "@ant-design/icons";
import api from "../../services/axiosInstance";
import {
  StateList, getDistrictOptions, getBlockOptions,
} from "../../constants/locations";

const { Title, Text } = Typography;
const { Option } = Select;

// Must match SURVEY_FORMS keys (backend FormLocationServiceImpl.VALID_FORM_KEYS).
const FORMS = [
  { key: "ROUTINE_MONITORING", label: "Routine Monitoring" },
  { key: "HOUSE_HOLD", label: "Household" },
  { key: "BI_ANNUAL", label: "Concurrent (Bi-Annual)" },
  { key: "FOLLOWUP", label: "Follow-Up" },
];

const ALL_BLOCKS = "__ALL__";

export default function FormLocationManagement() {
  const [form] = Form.useForm();

  const [formKey, setFormKey] = useState(FORMS[0].key);
  const [assigned, setAssigned] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [stateCode, setStateCode] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [districtCode, setDistrictCode] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  const districtOptions = stateCode ? getDistrictOptions(stateCode) : [];
  const blockOptions = districtCode ? getBlockOptions(districtCode) : [];

  const assignedBlockCodes = new Set(assigned.map((a) => String(a.blockCode)));

  const fetchAssigned = useCallback(async (key) => {
    setLoadingList(true);
    try {
      const res = await api.get(`/admin/form-location/${key}`, { noCache: true });
      const data = res.data?.data ?? res.data;
      setAssigned(Array.isArray(data) ? data : []);
    } catch (err) {
      message.error("Failed to load assigned locations.");
      setAssigned([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchAssigned(formKey);
  }, [formKey, fetchAssigned]);

  const handleStateChange = (value) => {
    const state = StateList.find((s) => s.text === value);
    setSelectedState(value);
    setStateCode(state?.state_code ?? null);
    setSelectedDistrict(null);
    setDistrictCode(null);
    form.setFieldsValue({ district: undefined, block: undefined });
  };

  const handleDistrictChange = (value) => {
    const district = districtOptions.find((d) => d.text === value);
    setSelectedDistrict(value);
    setDistrictCode(district?.district_code ?? null);
    form.setFieldsValue({ block: undefined });
  };

  const addBlock = async (b) => {
    await api.post(`/admin/form-location/${formKey}`, {
      state: selectedState,
      stateCode: String(stateCode),
      district: selectedDistrict,
      districtCode: String(districtCode),
      block: b.text,
      blockCode: String(b.block_code),
    });
  };

  const handleSubmit = async (values) => {
    if (!stateCode || !districtCode) {
      message.warning("Please select a state and district.");
      return;
    }
    setSubmitting(true);
    try {
      let targets;
      if (values.block === ALL_BLOCKS || !values.block) {
        // Add every block in the district that isn't already assigned.
        targets = blockOptions.filter((b) => !assignedBlockCodes.has(String(b.block_code)));
      } else {
        const b = blockOptions.find((x) => x.text === values.block);
        targets = b ? [b] : [];
      }

      if (targets.length === 0) {
        message.info("Nothing to add — those blocks are already assigned.");
        return;
      }

      const results = await Promise.allSettled(targets.map(addBlock));
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      if (ok > 0) message.success(`Added ${ok} block${ok > 1 ? "s" : ""} to ${formKey}.`);
      if (failed > 0) message.warning(`${failed} block(s) could not be added (maybe already assigned).`);

      form.setFieldsValue({ block: undefined });
      fetchAssigned(formKey);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to assign block(s).";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (record) => {
    try {
      await api.delete(`/admin/form-location/${formKey}/${record.blockCode}`);
      message.success(`Removed "${record.block}" from ${formKey}.`);
      fetchAssigned(formKey);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to remove block.";
      message.error(msg);
    }
  };

  const columns = [
    { title: "#", key: "index", width: 56, render: (_, __, i) => i + 1 },
    { title: "State", dataIndex: "state", key: "state" },
    { title: "District", dataIndex: "district", key: "district" },
    {
      title: "Block",
      dataIndex: "block",
      key: "block",
      render: (text, r) => (
        <Space>
          <Text strong>{text}</Text>
          {r.blockCode ? <Tag color="blue">{r.blockCode}</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 110,
      render: (_, record) => (
        <Popconfirm
          title="Remove this block from the form?"
          okText="Remove"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleRemove(record)}
        >
          <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: 1040, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: "#002147" }}>
          <AppstoreOutlined style={{ marginRight: 8 }} />
          Form Location Management
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Choose a survey form, then add or remove the blocks (with their state &amp; district)
          that should be available when filling that form. The same block can be active for
          multiple forms. Villages follow their block automatically.
        </Text>
      </div>

      <Segmented
        block
        options={FORMS.map((f) => ({ label: f.label, value: f.key }))}
        value={formKey}
        onChange={(val) => setFormKey(val)}
        style={{ marginBottom: 20 }}
      />

      <Card
        style={{ borderRadius: 12, marginBottom: 24, border: "1px solid #E5E7EB" }}
        bodyStyle={{ padding: "24px" }}
        title={<Space><EnvironmentOutlined /><span>Add location to <strong>{formKey}</strong></span></Space>}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16} align="bottom">
            <Col xs={24} sm={12} md={7}>
              <Form.Item label="State" name="state" rules={[{ required: true, message: "Select a state" }]}>
                <Select placeholder="Select State" onChange={handleStateChange} showSearch
                  filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}>
                  {StateList.map((s) => (<Option key={s.state_code} value={s.text}>{s.text}</Option>))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={7}>
              <Form.Item label="District" name="district" rules={[{ required: true, message: "Select a district" }]}>
                <Select placeholder="Select District" onChange={handleDistrictChange} disabled={!selectedState} showSearch
                  filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}>
                  {districtOptions.map((d) => (<Option key={d.district_code} value={d.text}>{d.text}</Option>))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Block" name="block" tooltip="Leave as 'All blocks' to add every block in the district">
                <Select placeholder="All blocks in district" disabled={!selectedDistrict} allowClear>
                  <Option value={ALL_BLOCKS}>— All blocks in district —</Option>
                  {blockOptions.map((b) => (
                    <Option key={b.block_code} value={b.text} disabled={assignedBlockCodes.has(String(b.block_code))}>
                      {b.text}{assignedBlockCodes.has(String(b.block_code)) ? " (added)" : ""}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label=" ">
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={submitting}
                  style={{ background: "#002147", borderColor: "#002147", width: "100%" }}>
                  Add
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        style={{ borderRadius: 12, border: "1px solid #E5E7EB" }}
        bodyStyle={{ padding: 0 }}
        title={
          <Space>
            <span>Blocks active for <strong>{formKey}</strong></span>
            <Tag color="geekblue">{assigned.length} blocks</Tag>
          </Space>
        }
      >
        <Table
          dataSource={assigned}
          columns={columns}
          rowKey={(r) => r.id ?? `${r.blockCode}`}
          loading={loadingList}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="small"
          locale={{ emptyText: <Empty description="No blocks assigned to this form yet." /> }}
          style={{ borderRadius: "0 0 12px 12px" }}
        />
      </Card>
    </div>
  );
}
