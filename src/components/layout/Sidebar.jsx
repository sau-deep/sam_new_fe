import { useState } from "react";
import { Layout, Menu, Badge, Tooltip } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config";
import {
  DashboardOutlined, FileTextOutlined, TeamOutlined, BarChartOutlined,
  BellOutlined, FolderOpenOutlined, DownloadOutlined, AuditOutlined,
  UserOutlined, SettingOutlined, GlobalOutlined, HomeOutlined,
  PieChartOutlined, LineChartOutlined, HeatMapOutlined, AppstoreOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

function buildMenuItems(role, notifCount) {
  const isAdmin = role === ROLES.ADMIN;
  const isUnicef = role === ROLES.UNICEF;
  const isState = role === ROLES.STATE;
  const isSurveyor = role === ROLES.SURVEYOR;
  const isIEG = role === ROLES.IEG;
  const canViewDash = isAdmin || isUnicef || isState || isIEG;

  const items = [];

  // Surveyor: only survey forms + submitted list + issues
  if (isSurveyor) {
    return [
      { key: "/surveys", icon: <FileTextOutlined />, label: "Survey Forms" },
      { key: "/surveys/my-submissions", icon: <AppstoreOutlined />, label: "My Submissions" },
      { key: "/notifications/my-issues", icon: <BellOutlined />, label: "My Reported Issues" },
    ];
  }

  // Dashboards
  if (canViewDash) {
    const dashChildren = [
      isAdmin || isIEG ? { key: "/dashboard/admin", icon: <AppstoreOutlined />, label: "Admin Overview" } : null,
      isUnicef ? { key: "/dashboard/unicef", icon: <GlobalOutlined />, label: "UNICEF Overview" } : null,
      isState ? { key: "/dashboard/state", icon: <HeatMapOutlined />, label: "State Overview" } : null,
      { key: "/dashboard/rmc", icon: <PieChartOutlined />, label: "RMC Dashboard" },
      { key: "/dashboard/key-indicators", icon: <LineChartOutlined />, label: "Key Indicators" },
    ].filter(Boolean);

    if (isAdmin || isIEG) {
      items.push({ key: "/dashboard/admin", icon: <DashboardOutlined />, label: "Dashboard" });
    } else if (isUnicef) {
      items.push({ key: "/dashboard/unicef", icon: <DashboardOutlined />, label: "Dashboard" });
    } else if (isState) {
      items.push({ key: "/dashboard/state", icon: <DashboardOutlined />, label: "Dashboard" });
    }

    items.push({
      key: "analytics",
      icon: <BarChartOutlined />,
      label: "Analytics",
      children: [
        { key: "/analytics/rmc", icon: <PieChartOutlined />, label: "RMC Analytics" },
        { key: "/analytics/key-indicators", icon: <LineChartOutlined />, label: "Key Indicators" },
      ],
    });
  }

  // Survey Forms (flat link — no dropdown)
  items.push({ key: "/surveys", icon: <FileTextOutlined />, label: "Survey Forms" });

  // Data — summary + complete response + section exports
  if (isAdmin || isUnicef || isState || isIEG) {
    const dataChildren = [
      { key: "/data/state-wise-summary", icon: <BarChartOutlined />, label: "State-Wise Summary" },
      { key: "/data/complete-response",  icon: <DownloadOutlined />, label: "Complete Response" },
      // Response Summary: admin + state only
      ...(isAdmin || isState
        ? [{ key: "/data/response-summary", icon: <PieChartOutlined />, label: "Response Summary" }]
        : []),
      { key: "/data/export/rmc",       icon: <DownloadOutlined />, label: "RMC Data" },
      { key: "/data/export/household", icon: <DownloadOutlined />, label: "Household Data" },
      { key: "/data/export/followup",  icon: <DownloadOutlined />, label: "Follow-Up Data" },
      { key: "/data/export/biannual",  icon: <DownloadOutlined />, label: "Bi-Annual Data" },
    ];
    items.push({
      key: "data",
      icon: <DownloadOutlined />,
      label: "Data",
      children: dataChildren,
    });
  }

  // Users
  if (isAdmin || isState) {
    items.push({
      key: "users",
      icon: <TeamOutlined />,
      label: "Users",
      children: [
        isAdmin ? { key: "/users/state-admins", icon: <UserOutlined />, label: "State Admins" } : null,
        { key: "/users/surveyors", icon: <TeamOutlined />, label: "Surveyors" },
      ].filter(Boolean),
    });
  }

  // Notifications
  if (isAdmin || isIEG) {
    items.push({
      key: "/notifications",
      icon: <Badge count={notifCount} offset={[6, -2]}><BellOutlined /></Badge>,
      label: (
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Notifications
          {notifCount > 0 && (
            <span style={{
              background: "#E2231A", color: "white", borderRadius: 10,
              padding: "1px 7px", fontSize: 11, fontWeight: 700,
            }}>
              {notifCount}
            </span>
          )}
        </span>
      ),
    });
  }

  // Audit
  if (isAdmin || isState) {
    items.push({ key: "/audit", icon: <AuditOutlined />, label: "Audit Logs" });
  }

  // Resources
  items.push({ key: "/resources", icon: <FolderOpenOutlined />, label: "Resources" });

  return items;
}

export default function Sidebar({ collapsed, notifCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getPrimaryRole } = useAuth();
  const role = getPrimaryRole();

  const items = buildMenuItems(role, notifCount);

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith("/dashboard") || path.startsWith("/analytics")) return ["analytics"];
    if (path.startsWith("/data")) return ["data"];
    if (path.startsWith("/users")) return ["users"];
    return [];
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={260}
      collapsedWidth={70}
      style={{
        height: "100vh",
        position: "fixed",
        left: 0, top: 0, bottom: 0,
        zIndex: 100,
        background: "#002147",
        boxShadow: "2px 0 12px rgba(0,0,0,0.15)",
        overflow: "auto",
      }}
    >
      {/* Logo area */}
      <div style={{
        height: 64, display: "flex", alignItems: "center",
        padding: collapsed ? "0 20px" : "0 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          <span style={{ fontWeight: 800, color: "#1CABE2", fontSize: 12 }}>SAM</span>
        </div>
        {!collapsed && (
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>SAM v2</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>UNICEF × IEG</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={getOpenKeys()}
        items={items}
        onClick={({ key }) => navigate(key)}
        style={{
          background: "#002147",
          border: "none",
          marginTop: 8,
          fontSize: 13,
        }}
      />

      {/* Version at bottom */}
      {!collapsed && (
        <div style={{
          position: "absolute", bottom: 16, left: 0, right: 0,
          textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 11,
        }}>
          v2.0.0
        </div>
      )}
    </Sider>
  );
}
