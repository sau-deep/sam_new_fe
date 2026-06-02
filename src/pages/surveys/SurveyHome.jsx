import { useState } from "react";
import { Row, Col, Card, Button, Tag, Typography } from "antd";
import { BarChartOutlined, FormOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { SURVEY_FORMS, ROLES } from "../../config";

const { Title, Text } = Typography;

const FORM_CONFIG_KEY = "formConfig";

function getFormConfig() {
  try {
    const stored = localStorage.getItem(FORM_CONFIG_KEY);
    if (stored) return { ...SURVEY_FORMS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...SURVEY_FORMS };
}

const FORM_CARD_DEFINITIONS = [
  {
    key: "ROUTINE_MONITORING",
    title: "Routine Monitoring",
    subtitle: "RMC — AWC, VHSND, CBE, Household Sections",
    path: "/surveys/routine-monitoring",
    color: "#1CABE2",
    gradient: "linear-gradient(135deg, #1CABE2 0%, #374EA2 100%)",
    icon: "📋",
    sections: ["AWA Registration", "Equipment", "Skill Assessment", "CMAM Clinic", "CBE", "VHSND", "Household"],
  },
  {
    key: "HOUSE_HOLD",
    title: "Household Questionnaire",
    subtitle: "Complete household assessment with child data",
    path: "/surveys/household",
    color: "#80BD41",
    gradient: "linear-gradient(135deg, #80BD41 0%, #1CABE2 100%)",
    icon: "🏠",
    sections: ["Household Info", "Child Data", "Nutrition", "WASH"],
  },
  {
    key: "BI_ANNUAL",
    title: "Concurrent Assessment",
    subtitle: "Bi-annual child health and nutrition assessment",
    path: "/surveys/bi-annual",
    color: "#5B21B6",
    gradient: "linear-gradient(135deg, #1E1B4B 0%, #5B21B6 100%)",
    icon: "📊",
    sections: ["Child Assessment", "Anthropometry", "Feeding Practices"],
  },
  {
    key: "FOLLOWUP",
    title: "Follow-Up Assessment",
    subtitle: "Track progress of previously assessed children",
    path: "/surveys/followup",
    color: "#C2410C",
    gradient: "linear-gradient(135deg, #7C2D12 0%, #C2410C 100%)",
    icon: "🔄",
    sections: ["Previous Data Review", "Current Status", "Referral"],
  },
];

export default function SurveyHome() {
  const navigate = useNavigate();
  const { user, getPrimaryRole } = useAuth();
  const role = getPrimaryRole();
  const isSurveyor = role === ROLES.SURVEYOR;
  const [formConfig] = useState(getFormConfig);

  const FORM_CARDS = FORM_CARD_DEFINITIONS.map((def) => ({
    ...def,
    enabled: !!formConfig[def.key],
  }));

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 8 }}>
          <Title level={3} style={{ margin: 0, color: "#002147" }}>
            {isSurveyor ? "My Survey Forms" : "Survey Forms"}
          </Title>
        </div>
        <Text style={{ color: "#6B7280" }}>
          Welcome back, <strong>{user?.name || user?.username}</strong> · Select a form to begin
        </Text>
      </div>

      {/* Form Cards */}
      <Row gutter={[20, 20]}>
        {FORM_CARDS.map((form) => (
          <Col xs={24} sm={12} xl={12} key={form.key}>
            <Card
              style={{
                borderRadius: 20, border: "none", overflow: "hidden",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                cursor: form.enabled ? "pointer" : "not-allowed",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              bodyStyle={{ padding: 0 }}
              onClick={() => form.enabled && navigate(form.path)}
              onMouseEnter={(e) => { if (form.enabled) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.14)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; }}
            >
              {/* Gradient header */}
              <div style={{
                background: form.gradient, padding: "24px 28px 28px",
                position: "relative", overflow: "hidden",
                filter: form.enabled ? "none" : "grayscale(60%) brightness(0.75)",
              }}>
                <div style={{
                  position: "absolute", top: -20, right: -20, width: 120, height: 120,
                  borderRadius: "50%", background: "rgba(255,255,255,0.1)",
                }} />
                <div style={{
                  position: "absolute", bottom: -30, right: 30, width: 80, height: 80,
                  borderRadius: "50%", background: "rgba(255,255,255,0.06)",
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{form.icon}</div>
                    <div style={{ color: "white", fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>{form.title}</div>
                    <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4 }}>{form.subtitle}</div>
                  </div>
                  <div>
                    {form.enabled
                      ? <Tag style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20 }}>Active</Tag>
                      : <Tag style={{ background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.6)", border: "none", borderRadius: 20 }}>Disabled</Tag>}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: "20px 28px 24px", background: "white" }}>
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>SECTIONS COVERED</Text>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {form.sections.map((s) => (
                      <Tag key={s} style={{ borderRadius: 12, fontSize: 11, background: "#F5F7FA", border: "1px solid #E5E7EB", color: "#374151" }}>
                        {s}
                      </Tag>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                        {form.key === "ROUTINE_MONITORING" ? "8,240" : form.key === "HOUSE_HOLD" ? "2,180" : form.key === "BI_ANNUAL" ? "1,320" : "740"}
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF" }}>Submitted</div>
                    </div>
                  </div>

                  {form.enabled ? (
                    <Button
                      type="primary"
                      icon={<FormOutlined />}
                      style={{
                        background: form.color, borderColor: form.color,
                        borderRadius: 10, fontWeight: 600, height: 40,
                      }}
                      onClick={(e) => { e.stopPropagation(); navigate(form.path); }}
                    >
                      Fill Form
                    </Button>
                  ) : (
                    <Button disabled style={{ borderRadius: 10, height: 40 }}>
                      {isSurveyor ? "Not Available" : "Disabled"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Admin quick links */}
      {!isSurveyor && (
        <Card style={{ borderRadius: 16, marginTop: 24, background: "linear-gradient(135deg, #002147, #1CABE2)", border: "none" }} bodyStyle={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>View Analytics Dashboard</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Deep-dive into survey results and key indicators</div>
            </div>
            <Button
              style={{ background: "white", color: "#002147", fontWeight: 600, borderRadius: 10, border: "none" }}
              icon={<BarChartOutlined />}
              onClick={() => navigate("/dashboard/admin")}
            >
              Open Dashboard
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
