import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Form, Input, Button, message, Select, Typography, Divider, Spin } from "antd";
import { UserOutlined, LockOutlined, GlobalOutlined, SafetyOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import api from "../../services/axiosInstance";
import { ROLES } from "../../config";

const { Title, Text } = Typography;
const { Option } = Select;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
];

const HERO_STATS = [
  { value: "6+", label: "States Covered" },
  { value: "10K+", label: "Surveys Conducted" },
  { value: "500+", label: "Surveyors Active" },
  { value: "50K+", label: "Children Assessed" },
];

export default function Login() {
  const { login, user, loading: authLoading, isAdmin, isUnicef, isStateAdmin, isSurveyor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin() || isUnicef()) navigate("/dashboard/admin", { replace: true });
      else if (isStateAdmin()) navigate("/dashboard/state", { replace: true });
      else navigate("/surveys", { replace: true });
    }
  }, [authLoading, user, isAdmin, isUnicef, isStateAdmin, isSurveyor, navigate]);
  const [form] = Form.useForm();

  const from = location.state?.from?.pathname || "/dashboard";

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
        const isAdmin = roles.some((r) => r === ROLES.ADMIN || r.authority === ROLES.ADMIN);
        const isUnicef = roles.some((r) => r === ROLES.UNICEF || r.authority === ROLES.UNICEF);
        const isState = roles.some((r) => r === ROLES.STATE || r.authority === ROLES.STATE);
        const isSurveyor = roles.some((r) => r === ROLES.SURVEYOR || r.authority === ROLES.SURVEYOR);
        if (isAdmin || isUnicef) navigate("/dashboard/admin");
        else if (isState) navigate("/dashboard/state");
        else if (isSurveyor) navigate("/surveys");
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
    <div className="login-page">
      {/* Left Hero Panel */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        alignItems: "center", padding: "48px", color: "white",
        background: "linear-gradient(160deg, #002147 0%, #1CABE2 100%)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Background pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.05,
          backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* Logos */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 48, zIndex: 1 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 16, background: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#1CABE2" }}>UN</div>
          </div>
          <div style={{ width: 2, height: 48, background: "rgba(255,255,255,0.3)" }} />
          <div style={{
            width: 80, height: 80, borderRadius: 16, background: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#002147", lineHeight: 1.1 }}>IEG</div>
          </div>
        </div>

        <Title level={2} style={{ color: "white", textAlign: "center", marginBottom: 8, zIndex: 1, fontWeight: 800 }}>
          SAM Platform
        </Title>
        <Text style={{ color: "rgba(255,255,255,0.85)", textAlign: "center", fontSize: 15, maxWidth: 340, lineHeight: 1.6, zIndex: 1 }}>
          Hot-Spot Identification & Micro-Targeting for Child Malnutrition Interventions
        </Text>

        <Divider style={{ borderColor: "rgba(255,255,255,0.2)", margin: "32px 0" }} />

        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textAlign: "center", maxWidth: 340, zIndex: 1 }}>
          Wasting Among Under-Five Children · Sponsored by UNICEF · Developed & Managed by IEG
        </Text>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 24, marginTop: 40, flexWrap: "wrap", justifyContent: "center", zIndex: 1 }}>
          {HERO_STATS.map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#FFC20E" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Decorative circles */}
        <div style={{
          position: "absolute", bottom: -80, right: -80, width: 320, height: 320,
          borderRadius: "50%", border: "60px solid rgba(255,255,255,0.04)",
        }} />
        <div style={{
          position: "absolute", top: -40, left: -40, width: 200, height: 200,
          borderRadius: "50%", border: "40px solid rgba(255,255,255,0.04)",
        }} />
      </div>

      {/* Right Login Panel */}
      <div style={{
        width: 480, background: "white", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "48px 40px",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.15)",
      }}>
        {/* Language switch */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
          <Select
            defaultValue={i18n.language?.split("-")[0] || "en"}
            onChange={(v) => i18n.changeLanguage(v)}
            style={{ width: 120 }}
            suffixIcon={<GlobalOutlined />}
            size="small"
          >
            {LANGUAGES.map((l) => (
              <Option key={l.code} value={l.code}>{l.label}</Option>
            ))}
          </Select>
        </div>

        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#E8F6FD", padding: "6px 14px", borderRadius: 20, marginBottom: 16,
          }}>
            <SafetyOutlined style={{ color: "#1CABE2", fontSize: 13 }} />
            <span style={{ color: "#1CABE2", fontSize: 12, fontWeight: 600 }}>Official Access Only</span>
          </div>
          <Title level={2} style={{ color: "#002147", marginBottom: 4, fontWeight: 800 }}>
            {t("signIn")}
          </Title>
          <Text style={{ color: "#6B7280", fontSize: 14 }}>
            Sign in to access your personalized dashboard
          </Text>
        </div>

        <Spin spinning={loading} tip="Authenticating...">
          <Form form={form} onFinish={handleSubmit} layout="vertical" size="large" requiredMark={false}>
            <Form.Item
              name="username"
              label={<span style={{ fontWeight: 500, color: "#374151" }}>{t("username")}</span>}
              rules={[{ required: true, message: "Please enter your username" }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#9CA3AF" }} />}
                placeholder="Enter username"
                style={{ borderRadius: 10, height: 48 }}
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 500, color: "#374151" }}>{t("password")}</span>}
              rules={[{ required: true, message: "Please enter your password" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#9CA3AF" }} />}
                placeholder="Enter password"
                style={{ borderRadius: 10, height: 48 }}
                autoComplete="current-password"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 52, borderRadius: 10, marginTop: 8,
                fontSize: 16, fontWeight: 600,
                background: "linear-gradient(135deg, #1CABE2, #374EA2)",
                border: "none",
                boxShadow: "0 4px 16px rgba(28,171,226,0.4)",
              }}
            >
              {loading ? "Signing In..." : t("signIn")}
            </Button>
          </Form>
        </Spin>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
            Having trouble? Contact your administrator
          </Text>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "auto", paddingTop: 32, textAlign: "center", borderTop: "1px solid #F3F4F6" }}>
          <Text style={{ color: "#D1D5DB", fontSize: 11 }}>
            SAM Platform v2.0 · UNICEF × IEG · Restricted Access
          </Text>
        </div>
      </div>
    </div>
  );
}
