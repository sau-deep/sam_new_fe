import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// BEL Survey Components
import BELSurveyPage from './bel/pages/BELSurveyPage';
import BELAdminPage from './bel/pages/BELAdminPage';
import BELScanQRPage from './bel/pages/BELScanQRPage';
import BELWalkInAdminPage from './bel/pages/BELWalkInAdminPage';
import BELRankPage from './bel/pages/BELRankPage';
import BELPasswordProtection from './bel/components/BELPasswordProtection';
import { ConfigProvider, Spin } from "antd";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { antdTheme } from "./theme/unicef";
import AppLayout from "./components/layout/AppLayout";
import { ROLES } from "./config";

// Lazy load pages for code splitting
const Login = lazy(() => import("./pages/auth/Login"));
const AdminDashboard = lazy(() => import("./pages/dashboards/AdminDashboard"));
const UnicefDashboard = lazy(() => import("./pages/dashboards/UnicefDashboard"));
const StateDashboard = lazy(() => import("./pages/dashboards/StateDashboard"));
const SurveyHome = lazy(() => import("./pages/surveys/SurveyHome"));
const UserManagement = lazy(() => import("./pages/users/UserManagement"));
const RMCAnalytics = lazy(() => import("./pages/analytics/RMCAnalytics"));
const Notifications = lazy(() => import("./pages/notifications/Notifications"));
const ResourceMaterials = lazy(() => import("./pages/resources/ResourceMaterials"));
const DataExport = lazy(() => import("./pages/data/DataExport"));
const KeyIndicatorDashboard = lazy(() => import("./pages/dashboards/KeyIndicatorDashboard"));
const AuditLogs = lazy(() => import("./pages/audit/AuditLogs"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const RoutineMonitoring = lazy(() => import("./pages/survey/RoutineMonitoring"));
const HouseHold = lazy(() => import("./pages/survey/HouseHold"));
const BiAnnual = lazy(() => import("./pages/survey/BiAnnual"));
const Followup = lazy(() => import("./pages/survey/Followup"));
const MySubmissions = lazy(() => import("./pages/surveys/MySubmissions"));
const StateWiseSummary = lazy(() => import("./pages/data/StateWiseSummary"));
const ResponseSummary = lazy(() => import("./pages/data/ResponseSummary"));
const CompleteResponse = lazy(() => import("./pages/data/CompleteResponse"));

const PageLoader = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
    <Spin size="large" tip="Loading..." />
  </div>
);

function ProtectedRoute({ children, roles = [] }) {
  const { user, loading, hasRole } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (roles.length > 0 && !roles.some((r) => hasRole(r))) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

function RoleRedirect() {
  const { user, loading, isAdmin, isUnicef, isStateAdmin, isSurveyor } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (isAdmin()) return <Navigate to="/dashboard/admin" replace />;
  if (isUnicef()) return <Navigate to="/dashboard/unicef" replace />;
  if (isStateAdmin()) return <Navigate to="/dashboard/state" replace />;
  if (isSurveyor()) return <Navigate to="/surveys" replace />;
  return <Navigate to="/surveys" replace />;
}

function Unauthorized() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
      <h2 style={{ color: "#002147" }}>Access Denied</h2>
      <p style={{ color: "#6B7280" }}>You don't have permission to view this page.</p>
    </div>
  );
}

function AppRoutes() {
  const ADMIN_ROLES = [ROLES.ADMIN];
  const VIEWER_ROLES = [ROLES.ADMIN, ROLES.UNICEF, ROLES.IEG, ROLES.STATE];
  const MANAGE_ROLES = [ROLES.ADMIN, ROLES.STATE];
  const ALL_ROLES = [ROLES.ADMIN, ROLES.UNICEF, ROLES.IEG, ROLES.STATE, ROLES.SURVEYOR];

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* BEL Survey Routes */}
        <Route path="/bel/survey" element={<BELSurveyPage />} />
        <Route path="/bel/admin" element={
          <BELPasswordProtection>
            <BELAdminPage />
          </BELPasswordProtection>
        } />
        <Route path="/bel/scanqr" element={<BELScanQRPage />} />
        <Route path="/bel/walkin-admin" element={<BELWalkInAdminPage />} />
        <Route path="/bel/scanrank" element={<BELRankPage />} />

        {/* Protected — with layout */}
        <Route element={<ProtectedRoute roles={ALL_ROLES}><AppLayout /></ProtectedRoute>}>
          {/* Root redirect */}
          <Route index element={<RoleRedirect />} />

          {/* Dashboards */}
          <Route path="/dashboard/admin" element={
            <ProtectedRoute roles={[ROLES.ADMIN, ROLES.IEG]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/unicef" element={
            <ProtectedRoute roles={[ROLES.UNICEF, ROLES.ADMIN, ROLES.IEG]}>
              <UnicefDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/state" element={
            <ProtectedRoute roles={[ROLES.STATE, ROLES.ADMIN]}>
              <StateDashboard />
            </ProtectedRoute>
          } />

          {/* Analytics */}
          <Route path="/analytics/rmc" element={
            <ProtectedRoute roles={VIEWER_ROLES}><RMCAnalytics /></ProtectedRoute>
          } />
          <Route path="/analytics/key-indicators" element={
            <ProtectedRoute roles={VIEWER_ROLES}><KeyIndicatorDashboard /></ProtectedRoute>
          } />
          {/* /analytics/state-wise removed — state filtering is built into RMC Analytics */}

          {/* Surveys */}
          <Route path="/surveys" element={<SurveyHome />} />
          <Route path="/surveys/routine-monitoring" element={
            <ProtectedRoute roles={ALL_ROLES}><RoutineMonitoring /></ProtectedRoute>
          } />
          <Route path="/surveys/household" element={
            <ProtectedRoute roles={ALL_ROLES}><HouseHold /></ProtectedRoute>
          } />
          <Route path="/surveys/biannual" element={
            <ProtectedRoute roles={ALL_ROLES}><BiAnnual /></ProtectedRoute>
          } />
          <Route path="/surveys/followup" element={
            <ProtectedRoute roles={ALL_ROLES}><Followup /></ProtectedRoute>
          } />

          {/* Users */}
          <Route path="/users/surveyors" element={
            <ProtectedRoute roles={MANAGE_ROLES}><UserManagement /></ProtectedRoute>
          } />
          <Route path="/users/state-admins" element={
            <ProtectedRoute roles={ADMIN_ROLES}><UserManagement /></ProtectedRoute>
          } />

          {/* Notifications */}
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/notifications/my-issues" element={<Notifications />} />

          {/* Resources */}
          <Route path="/resources" element={<ResourceMaterials />} />

          {/* Data Export — form-specific sub routes */}
          <Route path="/data/export" element={
            <ProtectedRoute roles={VIEWER_ROLES}><DataExport /></ProtectedRoute>
          } />
          <Route path="/data/export/rmc" element={
            <ProtectedRoute roles={VIEWER_ROLES}><DataExport defaultForm="rmc" /></ProtectedRoute>
          } />
          <Route path="/data/export/household" element={
            <ProtectedRoute roles={VIEWER_ROLES}><DataExport defaultForm="household" /></ProtectedRoute>
          } />
          <Route path="/data/export/followup" element={
            <ProtectedRoute roles={VIEWER_ROLES}><DataExport defaultForm="followup" /></ProtectedRoute>
          } />
          <Route path="/data/export/biannual" element={
            <ProtectedRoute roles={VIEWER_ROLES}><DataExport defaultForm="biannual" /></ProtectedRoute>
          } />
          {/* New data sub-pages */}
          <Route path="/data/state-wise-summary" element={
            <ProtectedRoute roles={VIEWER_ROLES}><StateWiseSummary /></ProtectedRoute>
          } />
          <Route path="/data/response-summary" element={
            <ProtectedRoute roles={MANAGE_ROLES}><ResponseSummary /></ProtectedRoute>
          } />
          <Route path="/data/complete-response" element={
            <ProtectedRoute roles={VIEWER_ROLES}><CompleteResponse /></ProtectedRoute>
          } />
          <Route path="/dashboard/key-indicators" element={
            <ProtectedRoute roles={VIEWER_ROLES}><KeyIndicatorDashboard /></ProtectedRoute>
          } />

          {/* Audit */}
          <Route path="/audit" element={
            <ProtectedRoute roles={VIEWER_ROLES}><AuditLogs /></ProtectedRoute>
          } />

          {/* Surveyor submissions */}
          <Route path="/surveys/my-submissions" element={
            <ProtectedRoute roles={ALL_ROLES}><MySubmissions /></ProtectedRoute>
          } />

          {/* Profile */}
          <Route path="/profile" element={
            <ProtectedRoute roles={ALL_ROLES}><Profile /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={process.env.PUBLIC_URL || ""}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <ConfigProvider theme={antdTheme}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ConfigProvider>
      </LocalizationProvider>
    </BrowserRouter>
  );
}
