import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography, Tag, Button, Space, Empty, message, Spin,
} from "antd";
import {
  SyncOutlined, EditOutlined, BellOutlined, ExclamationCircleOutlined,
  EnvironmentOutlined, ClockCircleOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axiosInstance";

const { Title, Text } = Typography;

// Status → colour/label. REJECTED behaves like OPEN (visible, actionable).
const STATUS_TAG = {
  OPEN: { color: "green", label: "OPEN" },
  IN_PROGRESS: { color: "blue", label: "IN PROGRESS" },
  REJECTED: { color: "orange", label: "NEEDS RE-EDIT" },
  RESOLVED: { color: "cyan", label: "RESOLVED" },
};

export default function MyIssues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await api.get("/form/routine-monitoring/issues/my-issues", { noCache: true });
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const sorted = [...list]
        .filter((i) => i.status !== "CLOSED")
        .sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
      setIssues(sorted);
    } catch (err) {
      if (err.response?.status === 403) {
        message.error("Access denied. This view is for surveyors.");
      } else {
        message.error(err.response?.data?.message || "Failed to load your issues");
      }
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIssues(); }, []);

  return (
    <div style={{ padding: 16, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <Space align="center" size={8}>
          <BellOutlined style={{ fontSize: 20, color: "#1CABE2" }} />
          <Title level={4} style={{ margin: 0, color: "#002147" }}>My Reported Issues</Title>
        </Space>
        <Button
          shape="circle"
          icon={<SyncOutlined spin={loading} />}
          onClick={fetchIssues}
          aria-label="Refresh"
        />
      </div>
      <Text style={{ display: "block", color: "#6B7280", fontSize: 13, marginBottom: 16 }}>
        Records the admin flagged. Tap a card to fix it and send back for approval.
      </Text>

      {loading && issues.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <Spin size="large" />
        </div>
      ) : issues.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 16px" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 16px",
            background: "linear-gradient(135deg, #E8F6FD, #D1ECF1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CheckCircleOutlined style={{ fontSize: 36, color: "#1CABE2" }} />
          </div>
          <Title level={5} style={{ margin: 0, color: "#002147" }}>All caught up!</Title>
          <Text type="secondary">You don't have any open issues right now.</Text>
        </div>
      ) : (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {issues.map((issue) => {
            const cfg = STATUS_TAG[issue.status] || { color: "default", label: issue.status || "INFO" };
            const rejected = issue.status === "REJECTED";
            return (
              <div
                key={issue.id || issue.recordId}
                style={{
                  background: "white",
                  border: `1px solid ${rejected ? "#FFD8A8" : "#E5E7EB"}`,
                  borderLeft: `4px solid ${rejected ? "#F26A21" : "#1CABE2"}`,
                  borderRadius: 14,
                  padding: 16,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>Record #{issue.recordId}</Tag>
                  <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>
                </div>

                <Text style={{ display: "block", color: "#374151", fontSize: 14, lineHeight: 1.5, marginBottom: 10 }}>
                  {issue.comment}
                </Text>

                <Space size={12} wrap style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 14 }}>
                  {issue.reportedAt && (
                    <span><ClockCircleOutlined /> {dayjs(issue.reportedAt).format("DD MMM YYYY, HH:mm")}</span>
                  )}
                  {issue.state && <span><EnvironmentOutlined /> {issue.state}</span>}
                </Space>

                {rejected && (
                  <div style={{
                    background: "#FFF4E6", border: "1px solid #FFD8A8", borderRadius: 8,
                    padding: "8px 10px", marginBottom: 12, fontSize: 12, color: "#B25000",
                  }}>
                    <ExclamationCircleOutlined /> Your previous edit was rejected — please re-edit and resubmit.
                  </div>
                )}

                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<EditOutlined />}
                  style={{ borderRadius: 10, fontWeight: 600 }}
                  onClick={() => navigate(`/surveys/record-edit?recordId=${encodeURIComponent(issue.recordId)}`)}
                >
                  Fix Record
                </Button>
              </div>
            );
          })}
        </Space>
      )}
    </div>
  );
}
