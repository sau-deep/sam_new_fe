import { Button, Avatar, Dropdown, Badge, Tag, Select, Space, Tooltip } from "antd";
import {
  MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined, UserOutlined,
  LogoutOutlined, GlobalOutlined, WifiOutlined, DisconnectOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNetworkStatus } from "../../utils/networkState";
import { ROLES } from "../../config";
import { LANGUAGES } from "../../constants";
import IEGLogo from "../../assets/img/Institute-of-Economic-Growth.png";

const { Option } = Select;

const ROLE_COLORS = {
  [ROLES.ADMIN]:    { bg: "#E8F0FE", color: "#374EA2", label: "Admin" },
  [ROLES.UNICEF]:   { bg: "#E8F6FD", color: "#1CABE2", label: "UNICEF" },
  [ROLES.STATE]:    { bg: "#EBF9E0", color: "#4A8C1C", label: "State Admin" },
  [ROLES.SURVEYOR]: { bg: "#FEF3E8", color: "#D45800", label: "Surveyor" },
  [ROLES.IEG]:      { bg: "#F3E8FF", color: "#7C3AED", label: "IEG" },
};

// Compact mobile header for surveyor role — no sidebar toggle, no language, no notifs
function SurveyorMobileHeader({ isOnline, user, userMenuItems }) {
  const initials = (user?.name || user?.username || "U")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{
      height: 56, background: "#002147", display: "flex", alignItems: "center",
      padding: "0 16px", gap: 12,
      position: "sticky", top: 0, zIndex: 90,
      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
    }}>
      {/* Branding */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 6, background: "white",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 3,
        }}>
          <img src={IEGLogo} alt="IEG" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>CMAM programme</span>
      </div>

      {/* Prominent network signal pill */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: isOnline ? "rgba(74,140,28,0.25)" : "rgba(212,88,0,0.3)",
        border: `1.5px solid ${isOnline ? "#4A8C1C" : "#D45800"}`,
        padding: "5px 12px", borderRadius: 20,
        animation: isOnline ? "none" : "offlinePulse 2s ease-in-out infinite",
      }}>
        {isOnline
          ? <WifiOutlined style={{ color: "#6DCC36", fontSize: 15 }} />
          : <DisconnectOutlined style={{ color: "#FF7A3D", fontSize: 15 }} />}
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: isOnline ? "#6DCC36" : "#FF7A3D",
          letterSpacing: 0.3,
        }}>
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      {/* User avatar with dropdown */}
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
        <Avatar
          size={32}
          style={{
            background: "linear-gradient(135deg, #1CABE2, #374EA2)",
            cursor: "pointer", flexShrink: 0, fontWeight: 700, fontSize: 12,
          }}
        >
          {initials}
        </Avatar>
      </Dropdown>

      <style>{`
        @keyframes offlinePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}

export default function AppHeader({ collapsed, onToggle, notifCount = 0, hideSidebarToggle = false }) {
  const { user, logout, getPrimaryRole } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isOnline = useNetworkStatus();
  const role = getPrimaryRole();
  const roleStyle = ROLE_COLORS[role] || { bg: "#F3F4F6", color: "#6B7280", label: "User" };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => navigate("/profile"),
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Sign Out",
      danger: true,
      onClick: () => { logout(); navigate("/auth/login"); },
    },
  ];

  if (hideSidebarToggle) {
    return <SurveyorMobileHeader isOnline={isOnline} user={user} userMenuItems={userMenuItems} />;
  }

  return (
    <div style={{
      height: 64, background: "white", display: "flex", alignItems: "center",
      padding: "0 24px", gap: 16,
      boxShadow: "0 1px 0 #E5E7EB",
      position: "sticky", top: 0, zIndex: 90,
    }}>
      {/* Collapse toggle */}
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onToggle}
        style={{ width: 40, height: 40, color: "#6B7280", borderRadius: 8 }}
      />

      {/* App title */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>
          Hot-Spot Identification & Micro-Targeting
        </div>
        <div style={{ fontSize: 11, color: "#9CA3AF" }}>
          Child Malnutrition Interventions · Wasting Among Under-Five Children
        </div>
      </div>

      <Space size={8}>
        {/* Network status */}
        <Tooltip title={isOnline ? "Online" : "Offline — forms saved locally"}>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: isOnline ? "#EBF9E0" : "#FEF3E8",
            padding: "4px 10px", borderRadius: 20,
          }}>
            {isOnline
              ? <WifiOutlined style={{ color: "#4A8C1C", fontSize: 13 }} />
              : <DisconnectOutlined style={{ color: "#D45800", fontSize: 13 }} />}
            <span style={{ fontSize: 11, fontWeight: 600, color: isOnline ? "#4A8C1C" : "#D45800" }}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </Tooltip>

        {/* Language */}
        <Select
          value={i18n.language?.split("-")[0] || "en"}
          onChange={(v) => i18n.changeLanguage(v)}
          size="small"
          style={{ width: 150 }}
          suffixIcon={<GlobalOutlined style={{ color: "#6B7280" }} />}
          bordered={false}
        >
          {LANGUAGES.map((lang) => (
            <Option key={lang.code} value={lang.code}>{lang.label}</Option>
          ))}
        </Select>

        {/* Notifications */}
        <Tooltip title="Notifications">
          <Badge count={notifCount} size="small">
            <Button
              type="text"
              icon={<BellOutlined />}
              style={{ width: 40, height: 40, borderRadius: 8, color: "#6B7280" }}
              onClick={() => navigate("/notifications")}
            />
          </Badge>
        </Tooltip>

        {/* Role badge */}
        <Tag style={{
          background: roleStyle.bg, color: roleStyle.color,
          border: "none", borderRadius: 20, fontWeight: 600, fontSize: 11,
          padding: "2px 10px",
        }}>
          {roleStyle.label}
        </Tag>

        {/* User avatar + dropdown */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <Avatar
              style={{ background: "linear-gradient(135deg, #1CABE2, #374EA2)", cursor: "pointer" }}
              icon={<UserOutlined />}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.2 }}>
                {user?.name || user?.username || "User"}
              </span>
              {user?.state && (
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{user.state}</span>
              )}
            </div>
          </div>
        </Dropdown>
      </Space>
    </div>
  );
}
