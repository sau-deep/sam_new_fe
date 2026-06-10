import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Button, Typography, Space } from "antd";
import {
  EditOutlined, ExclamationCircleOutlined, RightOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axiosInstance";

const { Text } = Typography;

const STATUS_TAG = {
  OPEN: { color: "green", label: "OPEN" },
  IN_PROGRESS: { color: "blue", label: "IN PROGRESS" },
  REJECTED: { color: "orange", label: "NEEDS RE-EDIT" },
  RESOLVED: { color: "cyan", label: "RESOLVED" },
};

/**
 * Compact mobile banner for the surveyor landing page: records the admin flagged
 * for correction, each with a full-width "Fix Record" action. Renders nothing
 * when there are no open issues. New-UI equivalent of the old SurveyorNotificationBlock.
 */
export default function SurveyorIssuesBanner() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/form/routine-monitoring/issues/my-issues", { noCache: true });
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (!cancelled) {
          setIssues(
            list
              .filter((i) => i.status !== "CLOSED")
              .sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt))
          );
        }
      } catch {
        /* surveyor may have no issues / endpoint unavailable — stay silent */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!loaded || issues.length === 0) return null;

  return (
    <div style={{
      borderRadius: 16, marginBottom: 24, overflow: "hidden",
      border: "1px solid #FFE0B2", background: "white",
      boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, padding: "13px 16px",
        background: "linear-gradient(135deg, #D45800 0%, #F26A21 100%)",
      }}>
        <Space align="center" size={8}>
          <ExclamationCircleOutlined style={{ fontSize: 17, color: "white" }} />
          <Text strong style={{ color: "white", fontSize: 14 }}>
            Issues to fix ({issues.length})
          </Text>
        </Space>
        {issues.length > 2 && (
          <Button
            size="small"
            type="text"
            style={{ color: "white", fontSize: 12, padding: "0 4px" }}
            onClick={() => navigate("/notifications/my-issues")}
          >
            View all <RightOutlined style={{ fontSize: 10 }} />
          </Button>
        )}
      </div>

      {/* Items */}
      <div style={{ padding: 12 }}>
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          {issues.slice(0, 2).map((issue) => {
            const cfg = STATUS_TAG[issue.status] || { color: "default", label: issue.status };
            return (
              <div
                key={issue.id || issue.recordId}
                style={{
                  border: "1px solid #F0F0F0", borderRadius: 12, padding: 12, background: "#FFFDFB",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>Record #{issue.recordId}</Tag>
                  <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>
                </div>
                <Text style={{ display: "block", color: "#374151", fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>
                  {issue.comment}
                </Text>
                {issue.reportedAt && (
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 10 }}>
                    <ClockCircleOutlined /> {dayjs(issue.reportedAt).format("DD MMM YYYY")}
                  </Text>
                )}
                <Button
                  type="primary"
                  block
                  icon={<EditOutlined />}
                  style={{ borderRadius: 9, fontWeight: 600 }}
                  onClick={() => navigate(`/surveys/record-edit?recordId=${encodeURIComponent(issue.recordId)}`)}
                >
                  Fix Record
                </Button>
              </div>
            );
          })}
        </Space>
      </div>
    </div>
  );
}
