import { useState, useEffect } from "react";
import {
  Table, Button, Tag, Modal, Descriptions, Space, Card, Typography,
  Badge, message, Popconfirm, Input, Tabs, Empty,
} from "antd";
import {
  CheckOutlined, CloseOutlined, EyeOutlined, BellOutlined,
  SyncOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/axiosInstance";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const STATUS_CONFIG = {
  PENDING: { color: "orange", icon: <ClockCircleOutlined /> },
  APPROVED: { color: "success", icon: <CheckOutlined /> },
  REJECTED: { color: "error", icon: <CloseOutlined /> },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [activeTab, setActiveTab] = useState("PENDING");
  const { isAdmin, isIEG, isSurveyor } = useAuth();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      if (isSurveyor()) {
        // Surveyors see their own submissions — no specific endpoint listed, show pending as fallback
        const { data } = await api.get("/form/routine-monitoring/edit-notifications/pending");
        const arr = Array.isArray(data) ? data : (data?.data || []);
        setNotifications(arr);
      } else {
        // Fetch all three statuses in parallel
        const [pendingRes, approvedRes, rejectedRes] = await Promise.allSettled([
          api.get("/form/routine-monitoring/edit-notifications/pending"),
          api.get("/form/routine-monitoring/edit-notifications/approved"),
          api.get("/form/routine-monitoring/edit-notifications/rejected"),
        ]);
        const pendingArr = pendingRes.status === "fulfilled"
          ? (Array.isArray(pendingRes.value.data) ? pendingRes.value.data : (pendingRes.value.data?.data || []))
          : [];
        const approvedArr = approvedRes.status === "fulfilled"
          ? (Array.isArray(approvedRes.value.data) ? approvedRes.value.data : (approvedRes.value.data?.data || []))
          : [];
        const rejectedArr = rejectedRes.status === "fulfilled"
          ? (Array.isArray(rejectedRes.value.data) ? rejectedRes.value.data : (rejectedRes.value.data?.data || []))
          : [];

        // Normalise status fields
        const withStatus = [
          ...pendingArr.map((n) => ({ ...n, status: n.status || "PENDING" })),
          ...approvedArr.map((n) => ({ ...n, status: n.status || "APPROVED" })),
          ...rejectedArr.map((n) => ({ ...n, status: n.status || "REJECTED" })),
        ];
        setNotifications(withStatus);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [activeTab]);

  const handleApprove = async (id) => {
    try {
      await api.put(`/form/routine-monitoring/edit-notifications/${id}/approve`);
      message.success("Edit approved and applied");
      fetchNotifications();
    } catch { message.error("Failed to approve"); }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/form/routine-monitoring/edit-notifications/${id}/reject`, { rejectionReason: rejectComment });
      message.success("Edit rejected");
      setDetailModal(false);
      setRejectComment("");
      fetchNotifications();
    } catch { message.error("Failed to reject"); }
  };

  const filtered = notifications.filter((n) => activeTab === "ALL" || n.status === activeTab);

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      render: (v) => <Tag color="blue">#{v}</Tag>,
      width: 80,
    },
    {
      title: "Submitted By",
      render: (_, r) => r.surveyorName || r.submittedBy || "—",
    },
    {
      title: "Location",
      render: (_, r) => [r.state, r.district, r.block, r.village].filter(Boolean).join(", ") || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => {
        const cfg = STATUS_CONFIG[v] || STATUS_CONFIG.PENDING;
        return <Badge status={cfg.color === "success" ? "success" : cfg.color === "error" ? "error" : "warning"} text={v} />;
      },
    },
    {
      title: "Submitted",
      render: (_, r) => {
        const ts = r.submittedAt || r.createdAt;
        return ts ? dayjs(ts).format("DD MMM YYYY, HH:mm") : "—";
      },
    },
    {
      title: "Actions",
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailModal(true); }}>
            Review
          </Button>
          {r.status === "PENDING" && (isAdmin() || isIEG()) && (
            <>
              <Popconfirm title="Approve this edit request?" onConfirm={() => handleApprove(r.id)}>
                <Button size="small" type="primary" icon={<CheckOutlined />}>Approve</Button>
              </Popconfirm>
              <Button size="small" danger icon={<CloseOutlined />}
                onClick={() => { setSelected(r); setDetailModal(true); }}>
                Reject
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const pendingCount = notifications.filter((n) => n.status === "PENDING").length;

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Title level={3} style={{ margin: 0, color: "#002147" }}>Notifications</Title>
            {pendingCount > 0 && (
              <Badge count={pendingCount} style={{ background: "#E2231A" }} />
            )}
          </div>
          <Text style={{ color: "#6B7280" }}>
            {isSurveyor() ? "Your reported issues and edit requests" : "RMC edit notifications requiring review"}
          </Text>
        </div>
        <Button icon={<SyncOutlined />} onClick={fetchNotifications} loading={loading}>Refresh</Button>
      </div>

      <Card style={{ borderRadius: 16 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((t) => {
            const count = t === "ALL" ? notifications.length : notifications.filter((n) => n.status === t).length;
            return (
              <TabPane
                key={t}
                tab={
                  <span>
                    {t === "PENDING" ? <ClockCircleOutlined style={{ color: "#F26A21" }} /> : null}
                    {" "}{t.charAt(0) + t.slice(1).toLowerCase()}
                    {count > 0 && (
                      <Badge count={count} size="small" style={{ marginLeft: 6, background: t === "PENDING" ? "#F26A21" : "#6B7280" }} />
                    )}
                  </span>
                }
              />
            );
          })}
        </Tabs>

        {filtered.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`No ${activeTab.toLowerCase()} notifications`}
            style={{ padding: 40 }}
          />
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={{ pageSize: 15 }}
          />
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        open={detailModal}
        title={`Edit Notification — #${selected?.id}`}
        onCancel={() => { setDetailModal(false); setRejectComment(""); }}
        width={700}
        footer={
          selected?.status === "PENDING" && (isAdmin() || isIEG())
            ? [
                <Button key="cancel" onClick={() => setDetailModal(false)}>Cancel</Button>,
                <Button key="reject" danger icon={<CloseOutlined />} onClick={() => handleReject(selected?.id)}>Reject</Button>,
                <Popconfirm key="approve" title="Approve and apply?" onConfirm={() => { handleApprove(selected?.id); setDetailModal(false); }}>
                  <Button type="primary" icon={<CheckOutlined />}>Approve Edit</Button>
                </Popconfirm>,
              ]
            : [<Button key="close" onClick={() => setDetailModal(false)}>Close</Button>]
        }
      >
        {selected && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Notification ID">#{selected.id}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={STATUS_CONFIG[selected.status]?.color === "success" ? "success" : "warning"} text={selected.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Submitted By">{selected.surveyorName || selected.submittedBy || "—"}</Descriptions.Item>
              <Descriptions.Item label="Submitted At">
                {(selected.submittedAt || selected.createdAt) ? dayjs(selected.submittedAt || selected.createdAt).format("DD MMM YYYY HH:mm") : "—"}
              </Descriptions.Item>
              {selected.state && <Descriptions.Item label="State">{selected.state}</Descriptions.Item>}
              {selected.district && <Descriptions.Item label="District">{selected.district}</Descriptions.Item>}
              {selected.block && <Descriptions.Item label="Block">{selected.block}</Descriptions.Item>}
              {selected.village && <Descriptions.Item label="Village">{selected.village}</Descriptions.Item>}
            </Descriptions>

            {selected.status === "PENDING" && (
              <div style={{ marginTop: 16 }}>
                <Text style={{ fontWeight: 500, fontSize: 13 }}>Rejection Reason (optional)</Text>
                <Input.TextArea
                  rows={3}
                  placeholder="Reason for rejection..."
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  style={{ marginTop: 8, borderRadius: 8 }}
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
