import { useState, useEffect } from "react";
import { Layout } from "antd";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import AppHeader from "./Header";
import Footer from "../../layouts/footer/Footer";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/axiosInstance";
import { ROLES } from "../../config";

const { Content } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const { isAdmin, isIEG, getPrimaryRole } = useAuth();
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
          <Content style={{
            minHeight: "calc(100vh - 64px)",
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
