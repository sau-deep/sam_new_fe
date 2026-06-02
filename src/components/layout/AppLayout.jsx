import { useState, useEffect } from "react";
import { Layout } from "antd";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import AppHeader from "./Header";
import Footer from "../../layouts/footer/Footer";
import { useAuth } from "../../context/AuthContext";
import { useNetworkStatus } from "../../utils/networkState";
import api from "../../services/axiosInstance";
import { ROLES } from "../../config";
import { DisconnectOutlined, EyeOutlined, SaveOutlined } from "@ant-design/icons";

const { Content } = Layout;

// Role-aware offline banner shown below the header when network is lost
function OfflineBanner({ isSurveyor }) {
  return (
    <div style={{
      background: isSurveyor ? "#7C2D12" : "#1C1917",
      color: "white",
      padding: "8px 20px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 13,
      fontWeight: 500,
      borderBottom: `2px solid ${isSurveyor ? "#D45800" : "#44403C"}`,
    }}>
      <DisconnectOutlined style={{ fontSize: 15, color: isSurveyor ? "#FF7A3D" : "#A8A29E", flexShrink: 0 }} />
      {isSurveyor ? (
        <>
          <SaveOutlined style={{ fontSize: 13, color: "#FF7A3D" }} />
          <span>
            <strong>Offline mode</strong> — forms will be saved to your device and uploaded automatically when connection returns.
          </span>
        </>
      ) : (
        <>
          <EyeOutlined style={{ fontSize: 13, color: "#A8A29E" }} />
          <span>
            <strong>Read-only mode</strong> — you are offline. Data cannot be submitted or modified until connection is restored.
          </span>
        </>
      )}
    </div>
  );
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const { isAdmin, isIEG, getPrimaryRole } = useAuth();
  const isOnline = useNetworkStatus();
  const navigate = useNavigate();

  const isSurveyor = getPrimaryRole?.() === ROLES.SURVEYOR;

  // Fetch pending notification count
  useEffect(() => {
    if (!isAdmin() && !isIEG()) return;
    const fetchCount = async () => {
      try {
        const { data } = await api.get("/form/routine-monitoring/edit-notifications/pending/count");
        const count = typeof data === "number" ? data : (data?.count ?? data?.data ?? 0);
        setNotifCount(count);
      } catch { /* ignore */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, isIEG]);

  const sidebarWidth = collapsed ? 70 : 260;

  if (isSurveyor) {
    // Surveyor: no sidebar, mobile-centered layout
    return (
      <Layout style={{ minHeight: "100vh", background: "#F5F7FA" }}>
        <Layout>
          <AppHeader
            collapsed={true}
            onToggle={() => {}}
            notifCount={0}
            hideSidebarToggle
          />
          {!isOnline && <OfflineBanner isSurveyor />}
          <Content style={{
            minHeight: "calc(100vh - 56px)",
            background: "#F5F7FA",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}>
            <div className="surveyor-mobile-view" style={{ flex: 1 }}>
              <Outlet />
            </div>
            <Footer />
          </Content>
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#F5F7FA" }}>
      <Sidebar collapsed={collapsed} notifCount={notifCount} />
      <Layout style={{ marginLeft: sidebarWidth, transition: "margin 0.2s" }}>
        <AppHeader
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          notifCount={notifCount}
        />
        {!isOnline && <OfflineBanner isSurveyor={false} />}
        <Content style={{
          minHeight: "calc(100vh - 64px)",
          background: "#F5F7FA",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ flex: 1 }}>
            <Outlet />
          </div>
          <Footer />
        </Content>
      </Layout>
    </Layout>
  );
}
