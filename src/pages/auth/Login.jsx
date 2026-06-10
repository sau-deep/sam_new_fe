import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Form, Input, Button, message, Select } from "antd";
import { UserOutlined, LockOutlined, GlobalOutlined, SafetyOutlined, CheckCircleFilled } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import api from "../../services/axiosInstance";
import { ROLES } from "../../config";
import { LANGUAGES } from "../../constants";
import IEGLogo from "../../assets/img/Institute-of-Economic-Growth.png";

const { Option } = Select;

const SUPPORT_WA = "https://wa.me/917701816408?text=Hello%2C%20I%20need%20support%20with%20the%20SAM%20Platform%20login.";

const FEATURES = [
  "Real-time data collection",
  "Offline form support",
  "Multi-language interface",
  "Role-based access control",
];

export default function Login() {
  const { login, user, loading: authLoading, isAdmin, isUnicef, isStateAdmin, isSurveyor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin() || isUnicef()) navigate("/dashboard/admin", { replace: true });
      else if (isStateAdmin()) navigate("/dashboard/state", { replace: true });
      else navigate("/surveys", { replace: true });
    }
  }, [authLoading, user, isAdmin, isUnicef, isStateAdmin, isSurveyor, navigate]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signin", {
        username: values.username,
        password: values.password,
      });
      if (data.success) {
        login(data.data);
        const roles = data.data.authorities || [];
        const isAdminRole = roles.some((r) => r === ROLES.ADMIN || r.authority === ROLES.ADMIN);
        const isUnicefRole = roles.some((r) => r === ROLES.UNICEF || r.authority === ROLES.UNICEF);
        const isState = roles.some((r) => r === ROLES.STATE || r.authority === ROLES.STATE);
        const isSurveyorRole = roles.some((r) => r === ROLES.SURVEYOR || r.authority === ROLES.SURVEYOR);
        if (isAdminRole || isUnicefRole) navigate("/dashboard/admin");
        else if (isState) navigate("/dashboard/state");
        else if (isSurveyorRole) navigate("/surveys");
        else navigate(from);
      } else {
        message.error(data.message || "Invalid credentials");
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#F0F6FF" }}>

      {/* ── Left Hero Panel ── */}
      <div className="login-hero" style={{
        background: "linear-gradient(160deg, #002147 0%, #1565C0 60%, #1CABE2 100%)",
        padding: "48px 40px",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Dot grid background */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(28,171,226,0.12)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        {/* Logo badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40, position: "relative", zIndex: 1 }}>
          <div style={{
            background: "white", borderRadius: 14, width: 72, height: 72,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
            padding: 6,
          }}>
            <img src={IEGLogo} alt="IEG" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        </div>

        {/* Title */}
        <div style={{ position: "relative", zIndex: 1, marginBottom: 12 }}>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.2, letterSpacing: -0.5 }}>CMAM Programme</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 6, lineHeight: 1.5 }}>
            Hot-Spot Identification & Micro-Targeting<br />for Child Malnutrition Interventions
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "28px 0", position: "relative", zIndex: 1 }} />

        {/* Feature list */}
        <div style={{ position: "relative", zIndex: 1, marginBottom: 36 }}>
          {FEATURES.map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <CheckCircleFilled style={{ color: "#1CABE2", fontSize: 15, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Bottom credit */}
        <div style={{ position: "relative", zIndex: 1, marginTop: 36, fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
          Wasting Among Under-Five Children
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="login-form-panel" style={{ background: "#F0F6FF" }}>

        {/* Mobile branding — shown only on mobile */}
        <div className="login-mobile-brand" style={{ display: "none", marginBottom: 28 }}>
          <div style={{
            background: "linear-gradient(135deg, #002147, #1CABE2)",
            borderRadius: 20,
            padding: "24px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 8px 32px rgba(0,33,71,0.25)",
          }}>
            <div style={{
              background: "white", borderRadius: 12, width: 52, height: 52,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              padding: 5,
            }}>
              <img src={IEGLogo} alt="IEG" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>CMAM Programme</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 3 }}>IEG · Hot-Spot Identification</div>
            </div>
          </div>

        </div>

        {/* Language selector */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <Select
            value={i18n.language?.split("-")[0] || "en"}
            onChange={(v) => i18n.changeLanguage(v)}
            style={{ width: 160 }}
            suffixIcon={<GlobalOutlined style={{ color: "#1CABE2" }} />}
            size="small"
            variant="outlined"
          >
            {LANGUAGES.map((l) => (
              <Option key={l.code} value={l.code}>{l.label}</Option>
            ))}
          </Select>
        </div>

        {/* Form card */}
        <div style={{
          background: "white",
          borderRadius: 24,
          padding: "36px 32px",
          boxShadow: "0 4px 32px rgba(0,33,71,0.10)",
          border: "1px solid rgba(28,171,226,0.1)",
        }}>
          {/* Official badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "linear-gradient(135deg, #E8F6FD, #D6F0FB)",
            border: "1px solid rgba(28,171,226,0.25)",
            padding: "5px 12px", borderRadius: 20, marginBottom: 20,
          }}>
            <SafetyOutlined style={{ color: "#1CABE2", fontSize: 12 }} />
            <span style={{ color: "#1CABE2", fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>OFFICIAL ACCESS ONLY</span>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#002147", lineHeight: 1.2 }}>
              {t("signIn")}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 6 }}>
              Sign in to access your personalized dashboard
            </div>
          </div>

          <Form form={form} onFinish={handleSubmit} layout="vertical" requiredMark={false}>
            <Form.Item
              name="username"
              label={
                <span style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>
                  {t("username")}
                </span>
              }
              rules={[{ required: true, message: "Please enter your username" }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#1CABE2" }} />}
                placeholder="Enter your username"
                size="large"
                style={{ borderRadius: 12, height: 50, borderColor: "#D1E9F8", fontSize: 14 }}
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={
                <span style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>
                  {t("password")}
                </span>
              }
              rules={[{ required: true, message: "Please enter your password" }]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#1CABE2" }} />}
                placeholder="Enter your password"
                size="large"
                style={{ borderRadius: 12, height: 50, borderColor: "#D1E9F8", fontSize: 14 }}
                autoComplete="current-password"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size="large"
              style={{
                height: 52,
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                background: "linear-gradient(135deg, #1CABE2 0%, #374EA2 100%)",
                border: "none",
                boxShadow: "0 6px 20px rgba(28,171,226,0.35)",
                letterSpacing: 0.3,
              }}
            >
              {loading ? "Signing In…" : t("signIn")}
            </Button>
          </Form>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <span style={{ color: "#9CA3AF", fontSize: 12 }}>
              Having trouble?{" "}
              <span style={{ color: "#1CABE2", fontWeight: 600 }}>Contact your administrator</span>
            </span>
          </div>
        </div>

        {/* Info boxes below form */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
          <div style={{
            background: "white", borderRadius: 16, padding: "16px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            borderLeft: "4px solid #1CABE2",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1CABE2", marginBottom: 4, letterSpacing: 0.5 }}>PLATFORM</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#002147" }}>CMAM Programme</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Secure · Encrypted</div>
          </div>
          <a href={SUPPORT_WA} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <div style={{
              background: "white", borderRadius: 16, padding: "16px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              borderLeft: "4px solid #25D366",
              cursor: "pointer",
              transition: "box-shadow 0.2s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,211,102,0.2)"}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)"}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#25D366", marginBottom: 4, letterSpacing: 0.5 }}>SUPPORT</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#002147" }}>WhatsApp Help</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Tap to message us</div>
            </div>
          </a>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid #E5EDF8" }}>
          <span style={{ fontSize: 11, color: "#C3D4E8" }}>
            CMAM Programme v2.0 · IEG · All rights reserved
          </span>
        </div>
      </div>
    </div>
  );
}
