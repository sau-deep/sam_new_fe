import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm,
  message, Card, Row, Col, Typography, Badge, Tabs, Statistic, Avatar, Switch, Tooltip, Alert,
} from "antd";
import {
  UserAddOutlined, EditOutlined, DeleteOutlined,
  StopOutlined, PlayCircleOutlined, TeamOutlined, SettingOutlined, CopyOutlined, CheckCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { useFormConfig } from "../../context/FormConfigContext";
import api, { clearApiCache } from "../../services/axiosInstance";
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

// --- localStorage cache helpers ---
const LS_KEY = "sam_uc";
const LS_TTL = 10 * 60 * 1000; // 10 minutes

function readUsersCache() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() > parsed.expiresAt) { localStorage.removeItem(LS_KEY); return null; }
    return parsed;
  } catch { return null; }
}

function patchUsersCache(patch) {
  try {
    const existing = readUsersCache() || {};
    localStorage.setItem(LS_KEY, JSON.stringify({ ...existing, ...patch, expiresAt: Date.now() + LS_TTL }));
  } catch { /* quota exceeded — skip */ }
}

function clearUsersCache() {
  localStorage.removeItem(LS_KEY);
}
// ----------------------------------

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
  const location = useLocation();
  const navigate = useNavigate();

  const tabFromPath = location.pathname === "/users/state-admins" ? "state-admins" : "surveyors";

  const [surveyors, setSurveyors] = useState([]);
  const [stateUsers, setStateUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState({ open: false, type: "surveyor" });
  const [editModal, setEditModal] = useState({ open: false, record: null, type: "surveyor" });
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, pending: 0 });
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(tabFromPath);
  const [statusFilter, setStatusFilter] = useState(null);
  const [credentialsModal, setCredentialsModal] = useState({ open: false, username: "", password: "" });
  // tracks which tabs have had a network fetch this session (prevents redundant fetches on tab switch)
  const [tabsLoaded, setTabsLoaded] = useState({ surveyors: false, "state-admins": false });

  useEffect(() => {
    setActiveTab(tabFromPath);
    setStatusFilter(null);
  }, [location.pathname]);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const invalidateCaches = () => {
    clearUsersCache();
    clearApiCache("/user-management");
    clearApiCache("/admin/user-management");
  };

  const fetchUsers = async (tab = activeTab, force = false) => {
    // Seed state from localStorage immediately for instant display
    if (!force) {
      const cached = readUsersCache();
      if (cached) {
        if (cached.surveyors) setSurveyors(cached.surveyors);
        if (cached.stateUsers) setStateUsers(cached.stateUsers);
        if (cached.stats) setStats(cached.stats);
      }
    }

    setLoading(true);
    try {
      if (isAdmin()) {
        const fetchSurveyors = force || tab === "surveyors";
        const fetchStateUsers = force || tab === "state-admins";

        const requests = [];
        if (fetchSurveyors) requests.push(api.get("/admin/user-management/surveyors", force ? { noCache: true } : {}));
        if (fetchStateUsers) requests.push(api.get("/admin/user-management/state-users", force ? { noCache: true } : {}));
        requests.push(api.get("/admin/user-management/stats", force ? { noCache: true } : {}));

        const results = await Promise.allSettled(requests);
        let idx = 0;
        let newSurveyors, newStateUsers, newStats;

        if (fetchSurveyors) {
          const sRes = results[idx++];
          if (sRes.status === "fulfilled") {
            const d = sRes.value.data;
            newSurveyors = Array.isArray(d) ? d : (d?.data || []);
            setSurveyors(newSurveyors);
          }
        }
        if (fetchStateUsers) {
          const suRes = results[idx++];
          if (suRes.status === "fulfilled") {
            const d = suRes.value.data;
            newStateUsers = Array.isArray(d) ? d : (d?.data || []);
            setStateUsers(newStateUsers);
          }
        }
        const statsRes = results[idx];
        if (statsRes?.status === "fulfilled") {
          const d = statsRes.value.data;
          const statsData = d?.totalSurveyors !== undefined ? d : (d?.data || {});
          newStats = {
            total: statsData.totalSurveyors ?? 0,
            active: statsData.activeSurveyors ?? statsData.activeStateUsers ?? 0,
            inactive: statsData.inactiveSurveyors ?? 0,
            pending: statsData.pendingApproval ?? 0,
          };
          setStats(newStats);
        }

        patchUsersCache({
          ...(newSurveyors !== undefined && { surveyors: newSurveyors }),
          ...(newStateUsers !== undefined && { stateUsers: newStateUsers }),
          ...(newStats !== undefined && { stats: newStats }),
        });

      } else {
        const [sRes, statsRes] = await Promise.allSettled([
          api.get("/user-management/surveyors", force ? { noCache: true } : {}),
          api.get("/user-management/stats", force ? { noCache: true } : {}),
        ]);
        let newSurveyors, newStats;
        if (sRes.status === "fulfilled") {
          const d = sRes.value.data;
          newSurveyors = Array.isArray(d) ? d : (d?.data || []);
          setSurveyors(newSurveyors);
        }
        if (statsRes.status === "fulfilled") {
          const d = statsRes.value.data;
          const raw = d?.totalSurveyors !== undefined ? d
            : d?.surveyorCount !== undefined ? d
            : (d?.data || {});
          newStats = {
            total: raw.totalSurveyors ?? raw.surveyorCount ?? 0,
            active: raw.activeSurveyors ?? raw.activeSurveyorCount ?? 0,
            inactive: raw.inactiveSurveyors ?? raw.inactiveSurveyorCount ?? 0,
            pending: raw.pendingApproval ?? 0,
          };
          setStats(newStats);
        }
        patchUsersCache({
          ...(newSurveyors !== undefined && { surveyors: newSurveyors }),
          ...(newStats !== undefined && { stats: newStats }),
        });
      }

      setTabsLoaded(prev => ({ ...prev, [tab]: true }));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(tabFromPath); }, []);

  const handleCreate = async (values) => {
    try {
      const isStateType = createModal.type === "state";
      const endpoint = isStateType
        ? "/admin/user-management/create-state-user"
        : "/user-management/create-surveyor";
      // The backend requires `state` on surveyor creation. Global admins pick it in
      // the form; state admins have no state field shown, so inherit their own state.
      const payload = (!isStateType && !isAdmin())
        ? { ...values, state: user?.state }
        : values;
      if (!isStateType && !payload.state) {
        message.error("Your account has no state assigned; cannot create a surveyor.");
        return;
      }
      const res = await api.post(endpoint, payload);
      // The backend returns HTTP 200 even on business failures, carrying the real
      // outcome in the SAMResponse body ({ success, message }). Treat success:false
      // as an error so failed creations don't masquerade as success.
      const body = res?.data;
      if (body && body.success === false) {
        message.error(body.message || "Error creating user");
        return;
      }
      setCreateModal({ open: false });
      form.resetFields();
      invalidateCaches();
      fetchUsers(activeTab, true);
      if (isStateType) {
        setCredentialsModal({ open: true, username: values.email, password: "password" });
      } else {
        message.success("Surveyor created successfully");
      }
    } catch (err) {
      message.error(err.response?.data?.message || err.response?.data || "Error creating user");
    }
  };

  const openEditModal = (record, type = "surveyor") => {
    setEditModal({ open: true, record, type });
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
      const userId = editModal.record?.id;
      const endpoint = (editModal.type === "state-admin" || isAdmin())
        ? `/admin/user-management/user/${userId}`
        : `/user-management/surveyor/${userId}`;
      await api.put(endpoint, values);
      message.success(`${editModal.type === "state-admin" ? "State Admin" : "Surveyor"} updated successfully`);
      setEditModal({ open: false, record: null, type: "surveyor" });
      editForm.resetFields();
      invalidateCaches();
      fetchUsers(activeTab, true);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to update user");
    }
  };

  const handleAction = async (action, userId) => {
    try {
      const endpoints = {
        activate: `/user-management/activate/${userId}`,
        deactivate: `/user-management/deactivate/${userId}`,
        delete: isAdmin()
          ? `/admin/user-management/user/${userId}`
          : `/user-management/surveyor/${userId}`,
      };
      const methods = { activate: "put", deactivate: "put", delete: "delete" };
      await api[methods[action]](endpoints[action]);
      message.success(`User ${action}d successfully`);
      invalidateCaches();
      fetchUsers(activeTab, true);
    } catch (err) {
      message.error(err.response?.data?.message || "Action failed");
    }
  };

  const handleTabChange = (k) => {
    setActiveTab(k);
    setStatusFilter(null);
    navigate(k === "state-admins" ? "/users/state-admins" : "/users/surveyors");
    // Only fetch from network if this tab hasn't been loaded this session
    if (k !== "form-settings" && !tabsLoaded[k]) {
      fetchUsers(k);
    }
  };

  const handleRefresh = () => {
    invalidateCaches();
    setTabsLoaded({ surveyors: false, "state-admins": false });
    fetchUsers(activeTab, true);
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
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(r, "surveyor")}>Edit</Button>
          {!r.isActive && (
            <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleAction("activate", r.id)}>
              Activate
            </Button>
          )}
          {r.isActive && (
            <Popconfirm title="Deactivate this user?" onConfirm={() => handleAction("deactivate", r.id)}>
              <Button size="small" danger icon={<StopOutlined />}>Deactivate</Button>
            </Popconfirm>
          )}
          {isAdmin() && (
            <Popconfirm title="Permanently delete this user?" onConfirm={() => handleAction("delete", r.id)}>
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
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(r, "state-admin")}>Edit</Button>
          {r.isActive
            ? <Popconfirm title="Deactivate?" onConfirm={() => handleAction("deactivate", r.id)}><Button size="small" danger icon={<StopOutlined />} /></Popconfirm>
            : <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleAction("activate", r.id)} />}
        </Space>
      ),
    },
  ];

  const handleStatClick = (filter) => {
    setActiveTab("surveyors");
    setStatusFilter((prev) => (prev === filter ? null : filter));
  };

  const filteredSurveyors = surveyors.filter((s) => {
    if (statusFilter === "active") return s.isActive;
    if (statusFilter === "inactive") return !s.isActive;
    if (statusFilter === "pending") return !s.isApproved;
    return true;
  });

  const STAT_CARDS = [
    { title: "Total Surveyors", filter: null,      color: "#1CABE2", value: stats.total    || surveyors.length },
    { title: "Active",          filter: "active",  color: "#80BD41", value: stats.active   || surveyors.filter((s) => s.isActive).length },
    { title: "Inactive",        filter: "inactive",color: "#E2231A", value: stats.inactive || surveyors.filter((s) => !s.isActive).length },
    { title: "Pending Approval",filter: "pending", color: "#F26A21", value: stats.pending  || surveyors.filter((s) => !s.isApproved).length },
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
          <Tooltip title="Refresh user list">
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
          </Tooltip>
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
        {STAT_CARDS.map((s) => {
          const isActive = statusFilter === s.filter;
          return (
            <Col xs={12} sm={6} key={s.title}>
              <Tooltip title={s.filter ? `Filter by ${s.title}` : "Show all surveyors"}>
                <Card
                  onClick={() => handleStatClick(s.filter)}
                  style={{
                    borderRadius: 12,
                    textAlign: "center",
                    cursor: "pointer",
                    border: isActive ? `2px solid ${s.color}` : "1px solid #f0f0f0",
                    boxShadow: isActive ? `0 0 0 3px ${s.color}22` : undefined,
                    transition: "all 0.2s",
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <Statistic title={s.title} value={s.value} valueStyle={{ color: s.color, fontWeight: 800 }} />
                  {isActive && (
                    <div style={{ fontSize: 11, color: s.color, marginTop: 4, fontWeight: 600 }}>● Filtered</div>
                  )}
                </Card>
              </Tooltip>
            </Col>
          );
        })}
      </Row>

      <Card style={{ borderRadius: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
        >
          <TabPane
            tab={<span><TeamOutlined /> Surveyors ({surveyors.length})</span>}
            key="surveyors"
          >
            {statusFilter && (
              <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <Tag
                  color={STAT_CARDS.find((c) => c.filter === statusFilter)?.color}
                  closable
                  onClose={() => setStatusFilter(null)}
                  style={{ borderRadius: 6, fontWeight: 600 }}
                >
                  {STAT_CARDS.find((c) => c.filter === statusFilter)?.title}
                </Tag>
                <span style={{ fontSize: 12, color: "#6B7280" }}>
                  Showing {filteredSurveyors.length} of {surveyors.length} surveyors
                </span>
              </div>
            )}
            <Table
              dataSource={filteredSurveyors}
              columns={surveyorColumns}
              rowKey="id"
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
                rowKey="id"
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

      {/* Edit User Modal */}
      <Modal
        open={editModal.open}
        title={`Edit ${editModal.type === "state-admin" ? "State Admin" : "Surveyor"} — ${editModal.record?.name || editModal.record?.username || ""}`}
        onCancel={() => { setEditModal({ open: false, record: null, type: "surveyor" }); editForm.resetFields(); }}
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
            <Col span={createModal.type === "state" ? 24 : 12}>
              <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                <Input placeholder="Enter full name" />
              </Form.Item>
            </Col>
            {createModal.type === "surveyor" && (
              <Col span={12}>
                <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                  <Input placeholder="Unique username" />
                </Form.Item>
              </Col>
            )}
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input placeholder="Email address" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={createModal.type === "state" ? 24 : 12}>
              <Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true }]}>
                <Input placeholder="Mobile number" maxLength={10} />
              </Form.Item>
            </Col>
            {createModal.type === "surveyor" && (
              <Col span={12}>
                <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
                  <Input.Password placeholder="Set password" />
                </Form.Item>
              </Col>
            )}
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

      {/* State Admin Credentials Modal */}
      <Modal
        open={credentialsModal.open}
        title={<span><CheckCircleOutlined style={{ color: "#80BD41", marginRight: 8 }} />State Admin Created</span>}
        onCancel={() => setCredentialsModal({ open: false, username: "", password: "" })}
        footer={[
          <Button
            key="close"
            type="primary"
            style={{ background: "#1CABE2" }}
            onClick={() => setCredentialsModal({ open: false, username: "", password: "" })}
          >
            Done
          </Button>,
        ]}
        width={480}
      >
        <Alert
          message="Share these login credentials with the new State Admin."
          description="They should change their password after first login."
          type="info"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Username (Email)", value: credentialsModal.username },
            { label: "Default Password", value: credentialsModal.password },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#F5F7FA", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {label}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: "#111827" }}>{value}</span>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => { navigator.clipboard.writeText(value); message.success(`${label} copied`); }}
                  style={{ borderRadius: 6 }}
                >
                  Copy
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
