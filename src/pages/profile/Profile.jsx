import { useEffect, useState } from "react";
import {
  Card, Form, Input, Button, Typography, Avatar, Tag,
  Descriptions, message, Divider, Row, Col, Space,
} from "antd";
import { UserOutlined, LockOutlined, SafetyOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/axiosInstance";
import { ROLES } from "../../config";

const { Title, Text } = Typography;

// user.state is stored UPPERCASE in the DB ("JHARKHAND"); show it as "Jharkhand".
const formatStateName = (state) =>
  state
    ? state.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

const ROLE_LABELS = {
  [ROLES.ADMIN]: { label: "Admin", color: "#374EA2", bg: "#E8F0FE" },
  [ROLES.UNICEF]: { label: "UNICEF", color: "#1CABE2", bg: "#E8F6FD" },
  [ROLES.STATE]: { label: "State Admin", color: "#4A8C1C", bg: "#EBF9E0" },
  [ROLES.SURVEYOR]: { label: "Surveyor", color: "#D45800", bg: "#FEF3E8" },
  [ROLES.IEG]: { label: "IEG", color: "#7C3AED", bg: "#F3E8FF" },
};

export default function Profile() {
  const { user, getPrimaryRole } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const role = getPrimaryRole();
  const roleStyle = ROLE_LABELS[role] || { label: "User", color: "#6B7280", bg: "#F3F4F6" };

  // Assigned state comes from the server: the login response only carries
  // `state` for state admins, so surveyors etc. would otherwise show nothing.
  const [account, setAccount] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api.get("/account/me")
      .then((res) => {
        if (!cancelled && res?.data?.success) setAccount(res.data.data);
      })
      .catch(() => {}); // offline: fall back to the cached login data
    return () => { cancelled = true; };
  }, []);

  const loginId = account?.username || null;
  const assignedState = formatStateName(account?.state || user?.state);
  const isGlobalRole = role === ROLES.ADMIN || role === ROLES.UNICEF || role === ROLES.IEG;
  const stateLabel = assignedState || (isGlobalRole ? "All States" : "—");

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      // The user is identified from the JWT on the server; never send an
      // email/username (user.username here is the display name, not the login id).
      const res = await api.post("/account/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      // SAMResponse errors come back as HTTP 200 with success:false.
      if (!res?.data?.success) {
        message.error(res?.data?.message || "Failed to change password. Please try again.");
        return;
      }
      message.success(res.data.message || "Password changed successfully.");
      form.resetFields();
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to change password. Please try again.";
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ color: "#002147", margin: 0 }}>My Profile</Title>
        <Text type="secondary">View your account information and update your password.</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* User Info Card */}
        <Col xs={24} md={10}>
          <Card
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", height: "100%" }}
            bodyStyle={{ padding: 28 }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
              <Avatar
                size={80}
                icon={<UserOutlined />}
                style={{
                  background: "linear-gradient(135deg, #1CABE2, #374EA2)",
                  marginBottom: 16,
                  fontSize: 32,
                }}
              />
              <Title level={5} style={{ margin: 0, color: "#111827" }}>
                {account?.name || user?.name || user?.username || "User"}
              </Title>
              {loginId && (
                <Text type="secondary" style={{ fontSize: 13 }}>{loginId}</Text>
              )}
              <div style={{ marginTop: 10 }}>
                <Tag
                  style={{
                    background: roleStyle.bg,
                    color: roleStyle.color,
                    border: "none",
                    borderRadius: 20,
                    fontWeight: 600,
                    fontSize: 12,
                    padding: "3px 12px",
                  }}
                >
                  {roleStyle.label}
                </Tag>
              </div>
            </div>

            <Divider style={{ margin: "0 0 20px" }} />

            <Descriptions column={1} size="small" labelStyle={{ color: "#6B7280", fontWeight: 500 }}>
              <Descriptions.Item label="Username">
                {loginId || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Full Name">
                {account?.name || user?.name || user?.username || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="State">
                {stateLabel}
              </Descriptions.Item>
              <Descriptions.Item label="Role">
                {roleStyle.label}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Change Password Card */}
        <Col xs={24} md={14}>
          <Card
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            bodyStyle={{ padding: 28 }}
          >
            <Space align="center" style={{ marginBottom: 20 }}>
              <SafetyOutlined style={{ fontSize: 20, color: "#002147" }} />
              <Title level={5} style={{ margin: 0, color: "#002147" }}>Change Password</Title>
            </Space>

            <Text type="secondary" style={{ display: "block", marginBottom: 20, fontSize: 13 }}>
              Choose a strong password. Minimum 8 characters.
            </Text>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleChangePassword}
              requiredMark={false}
            >
              <Form.Item
                label="Current Password"
                name="currentPassword"
                rules={[{ required: true, message: "Please enter your current password." }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#9CA3AF" }} />}
                  placeholder="Enter current password"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="New Password"
                name="newPassword"
                rules={[
                  { required: true, message: "Please enter a new password." },
                  { min: 8, message: "Password must be at least 8 characters." },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#9CA3AF" }} />}
                  placeholder="Enter new password (min. 8 characters)"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="Confirm New Password"
                name="confirmPassword"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "Please confirm your new password." },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Passwords do not match."));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#9CA3AF" }} />}
                  placeholder="Re-enter new password"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  style={{
                    background: "#002147",
                    borderColor: "#002147",
                    borderRadius: 8,
                    fontWeight: 600,
                    width: "100%",
                  }}
                >
                  Update Password
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
