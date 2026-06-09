import { Card, Switch, Tag, Typography, message } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { useFormConfig } from "../../context/FormConfigContext";
import { useAuth } from "../../context/AuthContext";

const { Title, Text } = Typography;

const FORM_LABELS = [
  { key: "ROUTINE_MONITORING", label: "Routine Monitoring (RMC)", description: "AWC, VHSND, CBE, Household sections" },
  { key: "HOUSE_HOLD", label: "Household Questionnaire", description: "Complete household assessment" },
  { key: "BI_ANNUAL", label: "Concurrent Assessment (Bi-Annual)", description: "Bi-annual child health and nutrition" },
  { key: "FOLLOWUP", label: "Follow-Up Assessment", description: "Track progress of assessed children" },
];

export default function Settings() {
  const { formConfig, updateFormConfig } = useFormConfig();
  const { user } = useAuth();

  const handleToggle = async (key, value) => {
    try {
      await updateFormConfig(key, value, user?.username || "admin");
      const label = FORM_LABELS.find((f) => f.key === key)?.label ?? key;
      message.success(`${label} ${value ? "enabled" : "disabled"}`);
    } catch {
      message.error("Failed to save setting. Please try again.");
    }
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <SettingOutlined style={{ fontSize: 22, color: "#002147" }} />
        <Title level={4} style={{ margin: 0, color: "#002147" }}>Settings</Title>
      </div>
      <Text style={{ color: "#6B7280", fontSize: 13, display: "block", marginBottom: 28 }}>
        Manage application configuration. Changes are applied immediately for all users.
      </Text>

      <Card
        title={<span style={{ fontWeight: 700, fontSize: 15 }}>Survey Form Visibility</span>}
        style={{ borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
        bodyStyle={{ padding: "8px 24px 20px" }}
      >
        <Text style={{ color: "#6B7280", fontSize: 13, display: "block", margin: "12px 0 16px" }}>
          Enable or disable survey forms. Disabled forms are hidden from all users and cannot be accessed.
        </Text>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FORM_LABELS.map(({ key, label, description }) => (
            <Card
              key={key}
              style={{ borderRadius: 10, border: "1px solid #F3F4F6", background: formConfig[key] ? "#FAFFFE" : "#FAFAFA" }}
              bodyStyle={{ padding: "14px 20px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{description}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Tag color={formConfig[key] ? "success" : "default"} style={{ margin: 0 }}>
                    {formConfig[key] ? "Enabled" : "Disabled"}
                  </Tag>
                  <Switch
                    checked={!!formConfig[key]}
                    onChange={(checked) => handleToggle(key, checked)}
                    style={{ background: formConfig[key] ? "#1CABE2" : undefined }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
