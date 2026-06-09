import { useState } from "react";
import {
  Card, Select, Input, Button, Table, Typography, message, Space, Tag, Form, Row, Col,
} from "antd";
import { PlusOutlined, EnvironmentOutlined, SearchOutlined, EditOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import api from "../../services/axiosInstance";
import {
  StateList, DistrictList, BlockList,
  getDistrictOptions, getBlockOptions,
} from "../../constants/locations";

const { Title, Text } = Typography;
const { Option } = Select;

export default function VillageManagement() {
  const [form] = Form.useForm();

  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [stateCode, setStateCode] = useState(null);
  const [districtCode, setDistrictCode] = useState(null);
  const [blockCode, setBlockCode] = useState(null);

  const [villages, setVillages] = useState([]);
  const [loadingVillages, setLoadingVillages] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const districtOptions = stateCode ? getDistrictOptions(stateCode) : [];
  const blockOptions = districtCode ? getBlockOptions(districtCode) : [];

  const handleStateChange = (value) => {
    const state = StateList.find((s) => s.text === value);
    setSelectedState(value);
    setStateCode(state?.state_code ?? null);
    setSelectedDistrict(null);
    setDistrictCode(null);
    setSelectedBlock(null);
    setBlockCode(null);
    setVillages([]);
    form.setFieldsValue({ district: undefined, block: undefined, villageName: undefined });
  };

  const handleDistrictChange = (value) => {
    const district = DistrictList.find((d) => d.text === value);
    setSelectedDistrict(value);
    setDistrictCode(district?.district_code ?? null);
    setSelectedBlock(null);
    setBlockCode(null);
    setVillages([]);
    form.setFieldsValue({ block: undefined, villageName: undefined });
  };

  const handleBlockChange = (value) => {
    const block = BlockList.find((b) => b.text === value && b.district_code === districtCode);
    setSelectedBlock(value);
    setBlockCode(block?.block_code ?? null);
    form.setFieldsValue({ villageName: undefined });
    if (block?.block_code) {
      fetchVillages(block.block_code);
    }
  };

  const fetchVillages = async (bCode) => {
    setLoadingVillages(true);
    try {
      const res = await api.get("/admin/location/villages", {
        params: { blockCode: bCode },
        noCache: true,
      });
      const data = res.data;
      setVillages(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      setVillages([]);
    } finally {
      setLoadingVillages(false);
    }
  };

  const handleSubmit = async (values) => {
    if (!blockCode) {
      message.warning("Please select a block first.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/admin/location/village", {
        stateName: selectedState,
        stateCode,
        districtName: selectedDistrict,
        districtCode,
        blockName: selectedBlock,
        blockCode,
        villageName: values.villageName.trim(),
      });
      message.success(`Village "${values.villageName.trim()}" added successfully.`);
      form.setFieldValue("villageName", undefined);
      fetchVillages(blockCode);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to add village. Please try again.";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (record) => {
    if (!editingName?.trim()) {
      message.warning("Village name cannot be empty.");
      return;
    }
    setSavingEdit(true);
    try {
      await api.put(`/admin/location/village/${record.id}`, {
        villageName: editingName.trim(),
      });
      message.success("Village name updated successfully.");
      setEditingId(null);
      fetchVillages(blockCode);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to update village name.";
      message.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 60,
      render: (_, __, i) => i + 1,
    },
    {
      title: "Village Name",
      dataIndex: "village",
      key: "village",
      render: (text, record, index) => {
        const id = record.id ?? record.villageCode ?? `idx-${index}`;
        if (editingId !== null && editingId === id) {
          return (
            <Space>
              <Input
                size="small"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onPressEnter={() => handleSaveEdit(record)}
                style={{ width: 160 }}
                autoFocus
              />
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined style={{ color: "#52c41a" }} />}
                loading={savingEdit}
                onClick={() => handleSaveEdit(record)}
              />
              <Button
                type="link"
                size="small"
                icon={<CloseOutlined style={{ color: "#ff4d4f" }} />}
                onClick={() => setEditingId(null)}
              />
            </Space>
          );
        }
        return (
          <Space>
            <Text strong>{text}</Text>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => { setEditingId(id); setEditingName(text); }}
              style={{ color: "#9CA3AF", padding: "0 4px" }}
            />
          </Space>
        );
      },
    },
    {
      title: "Village Code",
      dataIndex: "villageCode",
      key: "villageCode",
      render: (code) => code ? <Tag color="blue">{code}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Block",
      dataIndex: "block",
      key: "block",
      render: (text) => text || selectedBlock,
    },
    {
      title: "District",
      dataIndex: "district",
      key: "district",
      render: (text) => text || selectedDistrict,
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
      render: (text) => text || selectedState,
    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, color: "#002147" }}>
          <EnvironmentOutlined style={{ marginRight: 8 }} />
          Village Management
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Select a state, district, and block to add a village to the location table.
        </Text>
      </div>

      <Card
        style={{ borderRadius: 12, marginBottom: 24, border: "1px solid #E5E7EB" }}
        bodyStyle={{ padding: "24px" }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            {/* State */}
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="State" name="state" rules={[{ required: true, message: "Please select a state" }]}>
                <Select
                  placeholder="Select State"
                  value={selectedState}
                  onChange={handleStateChange}
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: "100%" }}
                >
                  {StateList.map((s) => (
                    <Option key={s.state_code} value={s.text}>{s.text}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* District */}
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="District" name="district" rules={[{ required: true, message: "Please select a district" }]}>
                <Select
                  placeholder="Select District"
                  value={selectedDistrict}
                  onChange={handleDistrictChange}
                  disabled={!selectedState}
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: "100%" }}
                >
                  {districtOptions.map((d) => (
                    <Option key={d.district_code} value={d.text}>{d.text}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* Block */}
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Block" name="block" rules={[{ required: true, message: "Please select a block" }]}>
                <Select
                  placeholder="Select Block"
                  value={selectedBlock}
                  onChange={handleBlockChange}
                  disabled={!selectedDistrict}
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: "100%" }}
                >
                  {blockOptions.map((b) => (
                    <Option key={b.block_code} value={b.text}>{b.text}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Village input — shown only after block is selected */}
          {selectedBlock && (
            <Row gutter={16} align="bottom">
              <Col xs={24} sm={16} md={12}>
                <Form.Item
                  label="Village Name"
                  name="villageName"
                  rules={[
                    { required: true, message: "Please enter the village name" },
                    { min: 2, message: "Village name must be at least 2 characters" },
                    { max: 100, message: "Village name must be at most 100 characters" },
                    {
                      validator: (_, value) => {
                        if (value && !/^[a-zA-Z0-9\s\-().,']+$/.test(value)) {
                          return Promise.reject("Village name contains invalid characters");
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    placeholder="Enter village name"
                    prefix={<EnvironmentOutlined style={{ color: "#9CA3AF" }} />}
                    maxLength={100}
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8} md={6}>
                <Form.Item label=" ">
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlusOutlined />}
                    loading={submitting}
                    style={{
                      background: "#002147",
                      borderColor: "#002147",
                      width: "100%",
                    }}
                  >
                    Add Village
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          )}
        </Form>
      </Card>

      {/* Villages table */}
      {selectedBlock && (
        <Card
          style={{ borderRadius: 12, border: "1px solid #E5E7EB" }}
          bodyStyle={{ padding: 0 }}
          title={
            <Space>
              <SearchOutlined />
              <span>
                Villages in <strong>{selectedBlock}</strong> block
              </span>
              <Tag color="geekblue">{villages.length} records</Tag>
            </Space>
          }
        >
          <Table
            dataSource={villages}
            columns={columns}
            rowKey={(r, i) => r?.villageCode ?? r?.id ?? i}
            loading={loadingVillages}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{ emptyText: "No villages found for this block." }}
            size="small"
            style={{ borderRadius: "0 0 12px 12px" }}
          />
        </Card>
      )}
    </div>
  );
}
