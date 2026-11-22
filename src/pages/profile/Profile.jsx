import { useEffect, useState } from "react";
import {
  Card, Form, Input, Button, Typography, Avatar, Tag,
  Descriptions, message, Divider, Space, Modal,
} from "antd";
import {
  UserOutlined, LockOutlined, SafetyOutlined, EditOutlined, PhoneOutlined,
} from "@ant-design/icons";
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

const primaryBtnStyle = {
  background: "#002147",
  borderColor: "#002147",
  borderRadius: 8,
  fontWeight: 600,
};

const apiErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || fallback;

export default function Profile() {
  const { user, getPrimaryRole, updateUserName, isOfflineMode } = useAuth();
  const [detailsForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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

  const displayName = account?.name || user?.name || user?.username || "";
  const phoneNumber = account?.phoneNumber || null;
  const assignedState = formatStateName(account?.state || user?.state);
  const isGlobalRole = role === ROLES.ADMIN || role === ROLES.UNICEF || role === ROLES.IEG;
  const stateLabel = assignedState || (isGlobalRole ? "All States" : "—");
  // Editing needs the server (and /account/me tells us the current values).
  const canEdit = !!account && !isOfflineMode();

  // Both modals use destroyOnClose, so each open starts from a fresh form.
  const closeDetails = () => setDetailsOpen(false);
  const closePassword = () => setPasswordOpen(false);

  const handleUpdateDetails = async (values) => {
    setSavingDetails(true);
    try {
      // The user is identified from the JWT on the server.
      const res = await api.post("/account/update-profile", {
        name: values.name.trim(),
        phoneNumber: values.phoneNumber.trim(),
      });
      // SAMResponse errors come back as HTTP 200 with success:false.
      if (!res?.data?.success) {
        message.error(res?.data?.message || "Failed to update details. Please try again.");
        return;
      }
      const saved = res.data.data || {};
      setAccount((prev) => ({ ...prev, ...saved }));
      updateUserName(saved.name);
      message.success(res.data.message || "Profile updated successfully.");
      closeDetails();
    } catch (err) {
      message.error(apiErrorMessage(err, "Failed to update details. Please try again."));
    } finally {
      setSavingDetails(false);
    }
  };

  const handleChangePassword = async (values) => {
    setSavingPassword(true);
    try {
      // The user is identified from the JWT on the server; never send an
      // email/username (user.username here is the display name, not the login id).
      const res = await api.post("/account/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (!res?.data?.success) {
        message.error(res?.data?.message || "Failed to change password. Please try again.");
        return;
      }
      message.success(res.data.message || "Password changed successfully.");
      closePassword();
    } catch (err) {
      message.error(apiErrorMessage(err, "Failed to change password. Please try again."));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ color: "#002147", margin: 0 }}>My Profile</Title>
        <Text type="secondary">View and update your account information.</Text>
      </div>

      <Card
        style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        styles={{ body: { padding: 28 } }}
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
            {displayName || "User"}
          </Title>
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
          <Descriptions.Item label="Full Name">{displayName || "—"}</Descriptions.Item>
          <Descriptions.Item label="Phone Number">{phoneNumber || "—"}</Descriptions.Item>
          <Descriptions.Item label="State">{stateLabel}</Descriptions.Item>
          <Descriptions.Item label="Role">{roleStyle.label}</Descriptions.Item>
        </Descriptions>

        <Divider style={{ margin: "20px 0" }} />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="large"
            onClick={() => setDetailsOpen(true)}
            disabled={!canEdit}
            style={{ ...primaryBtnStyle, flex: "1 1 200px" }}
          >
            Edit Details
          </Button>
          <Button
            icon={<SafetyOutlined />}
            size="large"
            onClick={() => setPasswordOpen(true)}
            disabled={isOfflineMode()}
            style={{ borderRadius: 8, fontWeight: 600, flex: "1 1 200px" }}
          >
            Change Password
          </Button>
        </div>
        {isOfflineMode() && (
          <Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}>
            You are offline. Connect to the internet to update your details or password.
          </Text>
        )}
      </Card>

      {/* Edit Details */}
      <Modal
        title={<Space><EditOutlined /> Edit Details</Space>}
        open={detailsOpen}
        onCancel={closeDetails}
        footer={null}
        destroyOnClose
        maskClosable={!savingDetails}
      >
        <Form
          form={detailsForm}
          layout="vertical"
          onFinish={handleUpdateDetails}
          requiredMark={false}
          initialValues={{ name: displayName, phoneNumber: phoneNumber || "" }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="Full Name"
            name="name"
            rules={[
              { required: true, whitespace: true, message: "Please enter your name." },
              { max: 100, message: "Name must be at most 100 characters." },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#9CA3AF" }} />}
              placeholder="Enter your full name"
              size="large"
              maxLength={100}
            />
          </Form.Item>

          <Form.Item
            label="Phone Number"
            name="phoneNumber"
            rules={[
              { required: true, message: "Please enter your phone number." },
              { pattern: /^[0-9]{10}$/, message: "Phone number must be exactly 10 digits." },
            ]}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: "#9CA3AF" }} />}
              placeholder="10-digit mobile number"
              size="large"
              maxLength={10}
              inputMode="numeric"
            />
          </Form.Item>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <Button onClick={closeDetails} disabled={savingDetails}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={savingDetails} style={primaryBtnStyle}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Change Password */}
      <Modal
        title={<Space><SafetyOutlined /> Change Password</Space>}
        open={passwordOpen}
        onCancel={closePassword}
        footer={null}
        destroyOnClose
        maskClosable={!savingPassword}
      >
        <Text type="secondary" style={{ display: "block", margin: "8px 0 16px", fontSize: 13 }}>
          Choose a strong password. Minimum 8 characters.
        </Text>

        <Form
          form={passwordForm}
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

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <Button onClick={closePassword} disabled={savingPassword}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={savingPassword} style={primaryBtnStyle}>
              Update Password
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
