import { useState, useEffect } from "react";
import {
  Table, Button, Tag, Modal, Descriptions, Space, Card, Typography,
  Badge, message, Popconfirm, Input, Tabs, Empty, Alert, Spin,
} from "antd";
import {
  CheckOutlined, CloseOutlined, EyeOutlined, BellOutlined,
  SyncOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/axiosInstance";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const STATUS_CONFIG = {
  PENDING: { color: "orange", icon: <ClockCircleOutlined /> },
  APPROVED: { color: "success", icon: <CheckOutlined /> },
  REJECTED: { color: "error", icon: <CloseOutlined /> },
};

const BASE = "/form/routine-monitoring/edit-notifications";
const STATUS_ENDPOINT = {
  PENDING: `${BASE}/pending`,
  APPROVED: `${BASE}/approved`,
  REJECTED: `${BASE}/rejected`,
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedStatuses, setLoadedStatuses] = useState({}); // { PENDING: true, ... }
  const [selected, setSelected] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [activeTab, setActiveTab] = useState("PENDING");
  const { isAdmin, isIEG } = useAuth();
  const navigate = useNavigate();

  const unwrap = (res) =>
    Array.isArray(res?.value?.data) ? res.value.data : (res?.value?.data?.data || []);

  // Fetch one or more status lists. Statuses already loaded this session are skipped
  // unless `force` is set (Refresh). The pending/approved/rejected list endpoints no
  // longer carry the heavy form-data blobs — those are fetched per-row by the detail
  // modal — so each list is small and cheap.
  const fetchStatuses = async (statuses, { force = false } = {}) => {
    const toFetch = force ? statuses : statuses.filter((s) => !loadedStatuses[s]);
    if (toFetch.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        toFetch.map((s) => api.get(STATUS_ENDPOINT[s], force ? { noCache: true } : {}))
      );
      setNotifications((prev) => {
        // Replace the rows for the statuses we just fetched; keep the rest.
        let next = prev.filter((n) => !toFetch.includes(n.status));
        results.forEach((res, i) => {
          if (res.status === "fulfilled") {
            const arr = unwrap(res).map((n) => ({ ...n, status: n.status || toFetch[i] }));
            next = next.concat(arr);
          }
        });
        return next;
      });
      setLoadedStatuses((prev) => {
        const upd = { ...prev };
        results.forEach((res, i) => { if (res.status === "fulfilled") upd[toFetch[i]] = true; });
        return upd;
      });
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const statusesForTab = (tab) =>
    tab === "ALL" ? ["PENDING", "APPROVED", "REJECTED"] : [tab];

  // On mount only load the default (PENDING) tab. History tabs load lazily on first
  // visit, so the initial render no longer waits on approved+rejected history.
  useEffect(() => { fetchStatuses(["PENDING"]); }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    fetchStatuses(statusesForTab(tab));
  };

  const handleRefresh = () => fetchStatuses(statusesForTab(activeTab), { force: true });

  // Load the full form-data (not present in list responses) for the diff view.
  const openDetail = async (row) => {
    setSelected(row);
    setDetailModal(true);
    if (row?.originalFormData != null || row?.updatedFormData != null) return; // already have it
    setDetailLoading(true);
    try {
      const res = await api.get(`${BASE}/${row.id}`);
      const data = res?.data?.data || (res?.data && !res.data.success ? res.data : null);
      if (data) setSelected((prev) => (prev && prev.id === row.id ? { ...prev, ...data } : prev));
    } catch { /* ignore — diff will show no changes */ } finally {
      setDetailLoading(false);
    }
  };

  // For these endpoints the SAMResponse wrapper uses success===true / statusCode 200 to mean OK.
  const isOk = (res) => {
    const d = res?.data;
    return d?.success === true || d?.statusCode === 200 || d?.statusCode === 201;
  };

  const handleApprove = async (id) => {
    try {
      const res = await api.post(`/form/routine-monitoring/edit-notifications/${id}/approve`);
      if (isOk(res)) {
        message.success(res.data?.message || "Edit approved and applied");
        // Optimistic update — the row is already in memory; avoid a 3-endpoint refetch.
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status: "APPROVED" } : n)));
      } else {
        message.error(res.data?.message || "Failed to approve");
      }
    } catch (e) { message.error(e.response?.data?.message || "Failed to approve"); }
  };

  const handleReject = async (id) => {
    try {
      const res = await api.post(
        `/form/routine-monitoring/edit-notifications/${id}/reject`,
        { reason: rejectComment }
      );
      if (isOk(res)) {
        message.success(res.data?.message || "Edit rejected");
        // Optimistic update — the row is already in memory; avoid a 3-endpoint refetch.
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, status: "REJECTED", rejectionReason: rejectComment } : n));
        setDetailModal(false);
        setRejectComment("");
      } else {
        message.error(res.data?.message || "Failed to reject");
      }
    } catch (e) { message.error(e.response?.data?.message || "Failed to reject"); }
  };

  // ---- Field-level diff (original vs updated form data) ----
  const computeChanges = (original, updated, prefix = "") => {
    const changes = [];
    if (!original || !updated || typeof original !== "object" || typeof updated !== "object") return changes;
    const keys = new Set([...Object.keys(original), ...Object.keys(updated)]);
    keys.forEach((key) => {
      if (key === "id" || /error/i.test(key)) return;
      const ov = original[key];
      const uv = updated[key];
      const path = prefix ? `${prefix}.${key}` : key;
      const bothObj = ov && uv && typeof ov === "object" && !Array.isArray(ov)
        && typeof uv === "object" && !Array.isArray(uv);
      if (bothObj) {
        changes.push(...computeChanges(ov, uv, path));
      } else {
        const os = ov === null || ov === undefined ? "" : String(ov).trim();
        const us = uv === null || uv === undefined ? "" : String(uv).trim();
        if (os !== us) changes.push({ field: path, original: os || "(empty)", updated: us || "(empty)" });
      }
    });
    return changes;
  };

  const parseFormData = (v) => {
    if (!v) return null;
    if (typeof v === "string") { try { return JSON.parse(v); } catch { return null; } }
    return v;
  };

  const getChanges = (n) => {
    if (!n) return [];
    return computeChanges(parseFormData(n.originalFormData), parseFormData(n.updatedFormData));
  };

  const formatField = (path) =>
    path.split(".").map((p) =>
      p.replace(/_/g, " ").replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c) => c.toUpperCase()).trim()
    ).join(" → ");

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
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>
            Review
          </Button>
          {r.status === "PENDING" && (isAdmin() || isIEG()) && (
            <>
              <Popconfirm title="Approve this edit request?" onConfirm={() => handleApprove(r.id)}>
                <Button size="small" type="primary" icon={<CheckOutlined />}>Approve</Button>
              </Popconfirm>
              <Button size="small" danger icon={<CloseOutlined />}
                onClick={() => openDetail(r)}>
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
            RMC edit requests submitted by surveyors for review
          </Text>
        </div>
        <Space>
          {(isAdmin() || isIEG()) && (
            <Button type="primary" icon={<BellOutlined />} onClick={() => navigate("/notifications/report-issue")}>
              Report Issue
            </Button>
          )}
          <Button icon={<SyncOutlined />} onClick={handleRefresh} loading={loading}>Refresh</Button>
        </Space>
      </div>

      <Card style={{ borderRadius: 16 }}>
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
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
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }} bordered>
              <Descriptions.Item label="Notification ID">#{selected.id}</Descriptions.Item>
              <Descriptions.Item label="Record ID">{selected.recordId ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={STATUS_CONFIG[selected.status]?.color === "success" ? "success" : selected.status === "REJECTED" ? "error" : "warning"} text={selected.status} />
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

            {/* Field-level diff */}
            {detailLoading ? (
              <div style={{ textAlign: "center", padding: 32 }}>
                <Spin tip="Loading changes..." />
              </div>
            ) : (() => {
              const changes = getChanges(selected);
              return (
                <>
                  <Text strong style={{ display: "block", marginBottom: 8, color: "#1565c0" }}>
                    Form Changes {changes.length > 0 ? `(${changes.length} field${changes.length > 1 ? "s" : ""} changed)` : ""}
                  </Text>
                  {changes.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No field changes detected" style={{ padding: 16 }} />
                  ) : (
                    <Table
                      dataSource={changes.map((c, i) => ({ key: i, ...c }))}
                      pagination={false}
                      size="small"
                      scroll={{ y: 320 }}
                      columns={[
                        { title: "Field", dataIndex: "field", render: (v) => formatField(v), width: "34%" },
                        { title: "Original", dataIndex: "original", render: (v) => <span style={{ background: "#fff3cd", padding: "2px 6px", borderRadius: 4, wordBreak: "break-word" }}>{v}</span> },
                        { title: "Updated", dataIndex: "updated", render: (v) => <span style={{ background: "#d1ecf1", padding: "2px 6px", borderRadius: 4, fontWeight: 500, wordBreak: "break-word" }}>{v}</span> },
                      ]}
                    />
                  )}
                </>
              );
            })()}

            {selected.status === "REJECTED" && selected.rejectionReason && (
              <Alert
                type="error"
                showIcon
                style={{ marginTop: 16 }}
                message="Rejection Reason"
                description={selected.rejectionReason}
              />
            )}

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
