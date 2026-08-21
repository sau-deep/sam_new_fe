import { useEffect, useState } from "react";
import { Button, Avatar, Dropdown, Badge, Tag, Select, Space, Tooltip, message } from "antd";
import {
  MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined, UserOutlined,
  LogoutOutlined, GlobalOutlined, WifiOutlined, DisconnectOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffectiveNetworkStatus, setForcedOffline } from "../../utils/networkState";

import { ROLES } from "../../config";
import api from "../../services/axiosInstance";
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

// Compact mobile header for surveyor role — no sidebar toggle, no language
function SurveyorMobileHeader({ user, userMenuItems }) {
  const navigate = useNavigate();
  const { isOnline, forcedOffline, realOnline, serverDown } = useEffectiveNetworkStatus();
  const [issueCount, setIssueCount] = useState(0);
  const initials = (user?.name || user?.username || "U")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  // Poll the surveyor's open issues so the bell badge reflects flagged records
  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await api.get("/form/routine-monitoring/issues/my-issues", { noCache: true });
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (!cancelled) setIssueCount(list.filter((i) => i.status !== "CLOSED").length);
      } catch { /* ignore */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleNetworkToggle = () => {
    if (forcedOffline) {
      setForcedOffline(false);
      if (!realOnline) {
        message.info("Online mode selected — will activate when network is available.");
      } else if (serverDown) {
        message.info("Online mode selected — will activate when the server is reachable.");
      } else {
        message.success("Back online — forms will be uploaded automatically.");
      }
    } else {
      if (!realOnline) {
        message.warning("No network connection available.");
        return;
      }
      if (serverDown) {
        message.warning("Server is unreachable — already in offline mode.");
        return;
      }
      setForcedOffline(true);
      message.info("Offline mode activated. Forms will be saved locally.");
    }
  };

  // Pill colour: green = online, orange = forced-offline (network OK), red = no network / server down
  const softOffline = forcedOffline && realOnline && !serverDown;
  const pillColor  = isOnline ? "#6DCC36" : (softOffline ? "#FF7A3D" : "#FF4D4F");
  const pillBg     = isOnline ? "rgba(74,140,28,0.25)" : (softOffline ? "rgba(212,88,0,0.3)" : "rgba(255,77,79,0.15)");
  const pillBorder = isOnline ? "#4A8C1C" : (softOffline ? "#D45800" : "#FF4D4F");
  const tooltipText = isOnline
    ? "Online — tap to switch to offline mode"
    : forcedOffline
      ? "Offline mode active — tap to go back online"
      : serverDown
        ? "Server unreachable — offline mode (forms saved locally)"
        : "No network connection";

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
        <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>CMAM Programme</span>
      </div>

      {/* Online / Offline toggle pill */}
      <Tooltip title={tooltipText}>
        <div
          role="button"
          aria-pressed={!isOnline}
          onClick={handleNetworkToggle}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: pillBg,
            border: `1.5px solid ${pillBorder}`,
            padding: "5px 12px", borderRadius: 20,
            cursor: "pointer",
            userSelect: "none",
            transition: "opacity 0.15s, transform 0.1s",
            animation: !isOnline ? "offlinePulse 2s ease-in-out infinite" : "none",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.93)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {isOnline
            ? <WifiOutlined style={{ color: pillColor, fontSize: 15 }} />
            : <DisconnectOutlined style={{ color: pillColor, fontSize: 15 }} />}
          <span style={{ fontSize: 12, fontWeight: 700, color: pillColor, letterSpacing: 0.3 }}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </Tooltip>

      {/* My reported issues */}
      <Tooltip title="My Reported Issues">
        <Badge count={issueCount} size="small" offset={[-2, 2]}>
          <Button
            type="text"
            icon={<BellOutlined style={{ color: "white", fontSize: 18 }} />}
            onClick={() => navigate("/notifications/my-issues")}
            style={{ width: 36, height: 36, borderRadius: 8 }}
          />
        </Badge>
      </Tooltip>

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
  // Effective status: browser online AND backend /health reachable AND not forced offline
  const { isOnline, serverDown } = useEffectiveNetworkStatus();
  const role = getPrimaryRole();
  const roleStyle = ROLE_COLORS[role] || { bg: "#F3F4F6", color: "#6B7280", label: "User" };


  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => navigate("/profile"),
    },
    ...(role === ROLES.SURVEYOR
      ? [{
          key: "my-issues",
          icon: <BellOutlined />,
          label: "My Reported Issues",
          onClick: () => navigate("/notifications/my-issues"),
        }]
      : []),
    {
      key: "privacy",
      icon: <SafetyCertificateOutlined />,
      label: "Privacy Policy",
      onClick: () => navigate("/privacy-policy"),
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
    return <SurveyorMobileHeader user={user} userMenuItems={userMenuItems} />;
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
        {/* Network status — flips to Offline when /health reports server down */}
        <Tooltip title={
          isOnline
            ? "Online"
            : serverDown
              ? "Server unreachable — offline mode (forms saved locally)"
              : "Offline — forms saved locally"
        }>
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
