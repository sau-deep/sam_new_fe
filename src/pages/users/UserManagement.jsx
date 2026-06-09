import { useState, useEffect } from "react";
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm,
  message, Card, Row, Col, Typography, Badge, Tabs, Statistic, Avatar, Switch, Divider,
} from "antd";
import {
  UserAddOutlined, EditOutlined, DeleteOutlined, CheckOutlined,
  StopOutlined, PlayCircleOutlined, TeamOutlined, SearchOutlined, SettingOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { useFormConfig } from "../../context/FormConfigContext";
import api from "../../services/axiosInstance";
import { ROLES } from "../../config";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const STATES = ["Rajasthan", "Odisha", "Madhya Pradesh", "Chhattisgarh", "Jharkhand", "Telangana"];

const FORM_LABELS = [
  { key: "ROUTINE_MONITORING", label: "Routine Monitoring (RMC)", description: "AWC, VHSND, CBE, Household sections" },
  { key: "HOUSE_HOLD", label: "Household Questionnaire", description: "Complete household assessment" },
  { key: "BI_ANNUAL", label: "Concurrent Assessment (Bi-Annual)", description: "Bi-annual child health and nutrition" },
  { key: "FOLLOWUP", label: "Follow-Up Assessment", description: "Track progress of assessed children" },
];

function FormSettingsTab() {
  const { formConfig: config, updateFormConfig } = useFormConfig();
  const { user } = useAuth();

  const handleToggle = async (key, value) => {
    try {
      await updateFormConfig(key, value, user?.username || "admin");
      const label = FORM_LABELS.find((f) => f.key === key)?.label ?? key;
      message.success(`${label} ${value ? "enabled" : "disabled"}`);
    } catch {
      message.error("Failed to save setting. Please try again.");
    }
  };

  return (
    <div style={{ padding: "8px 0" }}>
      <Text style={{ color: "#6B7280", fontSize: 13, display: "block", marginBottom: 16 }}>
        Toggle survey forms on or off. Disabled forms are hidden from all users and cannot be accessed.
      </Text>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {FORM_LABELS.map(({ key, label, description }) => (
          <Card key={key} style={{ borderRadius: 12, border: "1px solid #F3F4F6" }} bodyStyle={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{label}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{description}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Tag color={config[key] ? "success" : "default"}>{config[key] ? "Enabled" : "Disabled"}</Tag>
                <Switch
                  checked={!!config[key]}
                  onChange={(checked) => handleToggle(key, checked)}
                  style={{ background: config[key] ? "#1CABE2" : undefined }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const STATUS_COLOR = { true: "success", false: "error" };
const STATUS_LABEL = { true: "Active", false: "Inactive" };

export default function UserManagement() {
  const { isAdmin, isStateAdmin, user } = useAuth();
  const [surveyors, setSurveyors] = useState([]);
  const [stateUsers, setStateUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState({ open: false, type: "surveyor" });
  const [editModal, setEditModal] = useState({ open: false, record: null });
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, pending: 0 });
  const [search, setSearch] = useState("");
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (isAdmin()) {
        const [sRes, suRes, statsRes] = await Promise.allSettled([
          api.get("/user-management/surveyors"),
          api.get("/user-management/state-users"),
          api.get("/user-management/stats"),
        ]);
        if (sRes.status === "fulfilled") {
          const d = sRes.value.data;
          setSurveyors(Array.isArray(d) ? d : (d?.data || []));
        }
        if (suRes.status === "fulfilled") {
          const d = suRes.value.data;
          setStateUsers(Array.isArray(d) ? d : (d?.data || []));
        }
        if (statsRes.status === "fulfilled") {
          const d = statsRes.value.data;
          const statsData = d?.totalSurveyors !== undefined ? d : (d?.data || {});
          setStats({
            total: statsData.totalSurveyors ?? 0,
            active: statsData.activeSurveyors ?? 0,
            inactive: statsData.inactiveSurveyors ?? 0,
            pending: statsData.pendingApproval ?? 0,
          });
        }
      } else {
        const [sRes, statsRes] = await Promise.allSettled([
          api.get("/user-management/surveyors"),
          api.get("/user-management/stats"),
        ]);
        if (sRes.status === "fulfilled") {
          const d = sRes.value.data;
          setSurveyors(Array.isArray(d) ? d : (d?.data || []));
        }
        if (statsRes.status === "fulfilled") {
          const d = statsRes.value.data;
          const statsData = d?.totalSurveyors !== undefined ? d : (d?.data || {});
          setStats({
            total: statsData.totalSurveyors ?? 0,
            active: statsData.activeSurveyors ?? 0,
            inactive: statsData.inactiveSurveyors ?? 0,
            pending: statsData.pendingApproval ?? 0,
          });
        }
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (values) => {
    try {
      const endpoint = createModal.type === "surveyor"
        ? "/user-management/create-surveyor"
        : "/user-management/create-state-user";
      await api.post(endpoint, values);
      message.success("User created successfully");
      setCreateModal({ open: false });
      form.resetFields();
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.message || err.response?.data || "Error creating user");
    }
  };

  const openEditModal = (record) => {
    setEditModal({ open: true, record });
    editForm.setFieldsValue({
      name: record.name,
      email: record.email,
      phoneNumber: record.phoneNumber,
      state: record.state,
      designation: record.designation,
      organisation: record.organisation,
      gender: record.gender,
    });
  };

  const handleEditSurveyor = async (values) => {
    try {
      const userId = editModal.record?.userId;
      await api.put(`/user-management/surveyor/${userId}`, values);
      message.success("Surveyor updated successfully");
      setEditModal({ open: false, record: null });
      editForm.resetFields();
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to update surveyor");
    }
  };

  const handleAction = async (action, userId) => {
    try {
      const endpoints = {
        activate: `/user-management/activate/${userId}`,
        deactivate: `/user-management/deactivate/${userId}`,
        delete: `/user-management/user/${userId}`,
      };
      const methods = { activate: "put", deactivate: "put", delete: "delete" };
      await api[methods[action]](endpoints[action]);
      message.success(`User ${action}d successfully`);
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.message || "Action failed");
    }
  };

  const surveyorColumns = [
    {
      title: "User",
      dataIndex: "name",
      filteredValue: [search],
      onFilter: (v, r) => r.name?.toLowerCase().includes(v.toLowerCase()) || r.username?.toLowerCase().includes(v.toLowerCase()),
      render: (name, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar style={{ background: "#1CABE2" }}>{(name || r.username || "U")[0].toUpperCase()}</Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{name || r.username}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>@{r.username}</div>
          </div>
        </div>
      ),
    },
    { title: "State", dataIndex: "state", render: (v) => v ? <Tag color="blue">{v}</Tag> : "—" },
    { title: "Mobile", dataIndex: "phoneNumber" },
    {
      title: "Status",
      render: (_, r) => (
        <Space>
          <Badge status={r.isActive ? "success" : "error"} text={r.isActive ? "Active" : "Inactive"} />
          {!r.isApproved && <Tag color="orange">Pending Approval</Tag>}
        </Space>
      ),
    },
    {
      title: "Actions",
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(r)}>Edit</Button>
          {!r.isActive && (
            <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleAction("activate", r.userId)}>
              Activate
            </Button>
          )}
          {r.isActive && (
            <Popconfirm title="Deactivate this user?" onConfirm={() => handleAction("deactivate", r.userId)}>
              <Button size="small" danger icon={<StopOutlined />}>Deactivate</Button>
            </Popconfirm>
          )}
          {isAdmin() && (
            <Popconfirm title="Permanently delete this user?" onConfirm={() => handleAction("delete", r.userId)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const stateUserColumns = [
    {
      title: "User",
      dataIndex: "name",
      render: (name, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar style={{ background: "#374EA2" }}>{(name || r.username || "U")[0].toUpperCase()}</Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    { title: "State", dataIndex: "state", render: (v) => <Tag color="green">{v}</Tag> },
    { title: "Designation", dataIndex: "designation" },
    { title: "Status", render: (_, r) => <Badge status={r.isActive ? "success" : "error"} text={r.isActive ? "Active" : "Inactive"} /> },
    {
      title: "Actions",
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />}>Edit</Button>
          {r.isActive
            ? <Popconfirm title="Deactivate?" onConfirm={() => handleAction("deactivate", r.userId)}><Button size="small" danger icon={<StopOutlined />} /></Popconfirm>
            : <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleAction("activate", r.userId)} />}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: "#002147" }}>User Management</Title>
          <Text style={{ color: "#6B7280" }}>Manage surveyors and state administrators</Text>
        </div>
        <Space>
          <Input.Search
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220, borderRadius: 8 }}
          />
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setCreateModal({ open: true, type: "surveyor" })}
          >
            Add Surveyor
          </Button>
          {isAdmin() && (
            <Button
              icon={<UserAddOutlined />}
              onClick={() => setCreateModal({ open: true, type: "state" })}
            >
              Add State Admin
            </Button>
          )}
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: "Total Surveyors", value: stats.total || surveyors.length, color: "#1CABE2" },
          { title: "Active", value: stats.active || surveyors.filter((s) => s.isActive).length, color: "#80BD41" },
          { title: "Inactive", value: stats.inactive || surveyors.filter((s) => !s.isActive).length, color: "#E2231A" },
          { title: "Pending Approval", value: stats.pending || surveyors.filter((s) => !s.isApproved).length, color: "#F26A21" },
        ].map((s) => (
          <Col xs={12} sm={6} key={s.title}>
            <Card style={{ borderRadius: 12, textAlign: "center" }} bodyStyle={{ padding: 16 }}>
              <Statistic title={s.title} value={s.value} valueStyle={{ color: s.color, fontWeight: 800 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ borderRadius: 16 }}>
        <Tabs defaultActiveKey="surveyors">
          <TabPane tab={<span><TeamOutlined /> Surveyors ({surveyors.length})</span>} key="surveyors">
            <Table
              dataSource={surveyors}
              columns={surveyorColumns}
              rowKey="userId"
              loading={loading}
              size="middle"
              pagination={{ pageSize: 15, showSizeChanger: true }}
            />
          </TabPane>
          {isAdmin() && (
            <TabPane tab={<span><TeamOutlined /> State Admins ({stateUsers.length})</span>} key="state-admins">
              <Table
                dataSource={stateUsers}
                columns={stateUserColumns}
                rowKey="userId"
                loading={loading}
                size="middle"
                pagination={{ pageSize: 15 }}
              />
            </TabPane>
          )}
          {(isAdmin() || isStateAdmin()) && (
            <TabPane tab={<span><SettingOutlined /> Form Settings</span>} key="form-settings">
              <FormSettingsTab />
            </TabPane>
          )}
        </Tabs>
      </Card>

      {/* Edit Surveyor Modal */}
      <Modal
        open={editModal.open}
        title={`Edit Surveyor — ${editModal.record?.name || editModal.record?.username || ""}`}
        onCancel={() => { setEditModal({ open: false, record: null }); editForm.resetFields(); }}
        onOk={() => editForm.submit()}
        okText="Save Changes"
        okButtonProps={{ style: { background: "#1CABE2" } }}
        width={520}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSurveyor} requiredMark="optional">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Full Name" rules={[{ min: 2 }]}>
                <Input placeholder="Full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phoneNumber" label="Phone Number" rules={[{ pattern: /^[0-9]{10}$/, message: "10 digits required" }]}>
                <Input placeholder="Mobile (10 digits)" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
            <Input placeholder="Email address" />
          </Form.Item>
          <Form.Item name="state" label="State">
            <Select placeholder="Select state" allowClear>
              {STATES.map((s) => <Option key={s} value={s}>{s}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="designation" label="Designation">
                <Input placeholder="e.g. Field Coordinator" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="Gender">
                <Select placeholder="Select gender" allowClear>
                  <Option value="Male">Male</Option>
                  <Option value="Female">Female</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="organisation" label="Organisation">
            <Input placeholder="Organisation name" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create User Modal */}
      <Modal
        open={createModal.open}
        title={createModal.type === "surveyor" ? "Create Surveyor" : "Create State Admin"}
        onCancel={() => { setCreateModal({ open: false }); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Create User"
        okButtonProps={{ style: { background: "#1CABE2" } }}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} requiredMark="optional">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                <Input placeholder="Enter full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                <Input placeholder="Unique username" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input placeholder="Email address" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true }]}>
                <Input placeholder="Mobile number" maxLength={10} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
                <Input.Password placeholder="Set password" />
              </Form.Item>
            </Col>
          </Row>
          {isAdmin() && (
            <Form.Item name="state" label="State" rules={[{ required: true }]}>
              <Select placeholder="Select state">
                {STATES.map((s) => <Option key={s} value={s}>{s}</Option>)}
              </Select>
            </Form.Item>
          )}
          {createModal.type === "state" && (
            <>
              <Form.Item name="designation" label="Designation">
                <Input placeholder="e.g. District Coordinator" />
              </Form.Item>
              <Form.Item name="organisation" label="Organisation">
                <Input placeholder="Organisation name" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
