import { useState, useEffect, useRef, useCallback } from "react";
import {
  ConfigProvider,
  FloatButton,
  Drawer,
  Button,
  Empty,
  Card,
  Tag,
  Descriptions,
  Modal,
  Typography,
  Space,
  Spin,
  Alert,
  message,
} from "antd";
import {
  CloudUploadOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  SendOutlined,
  DownloadOutlined,
  CopyOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import RouterSharpIcon from "@mui/icons-material/RouterSharp";
import {
  getOfflineForms,
  offlineFormOwnership,
  sameOfflineId,
} from "../../utils/indexDB";
import { useEffectiveNetworkStatus } from "../../utils/networkState";
import {
  REPLAY,
  replayOfflineQueue,
  replayOfflineRecord,
  discardOfflineRecord,
  offlineRecordCopyText,
  offlineRecordCopyFilename,
} from "./offlineReplay";

const { Text } = Typography;

// FloatButton appearance
const ACCENT_COLOR = "#0F766E"; // teal — distinct from the navy app shell
const BADGE_COLOR = "#F59E0B"; // amber for the pending count

// Friendly names for each stored form url
const FORM_TYPE_NAMES = {
  "/form/routine": "Routine Monitoring",
  "/form/household": "Household Checklist",
  "/form/biannual": "Bi-Annual Assessment",
  "/form/followup": "Follow-up Assessment",
};

// System fields not worth showing in the read-only view
const HIDDEN_FIELDS = ["id", "createdAt", "updatedAt"];

const AUTO_UPLOAD_INTERVAL = 5 * 60 * 1000; // 5 minutes, matches the old UI
const AUTO_UPLOAD_THROTTLE = 30 * 1000; // don't re-run within 30s

const getFormName = (url) => FORM_TYPE_NAMES[url] || url || "Unknown Form";

const prettyLabel = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, " ")
    .trim();

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function OfflineDrawer() {
  const { isOnline } = useEffectiveNetworkStatus();
  const [open, setOpen] = useState(false);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Read-only view modal state
  const [viewForm, setViewForm] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Parked records for which a copy was saved/copied in this session: only these
  // can be removed from the device.
  const [copiedIds, setCopiedIds] = useState(() => new Set());

  const intervalRef = useRef(null);
  const lastAutoUpload = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const stored = await getOfflineForms();
      setForms(stored || []);
    } catch (err) {
      console.error("Error reading offline forms:", err);
      setForms([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reload the list each time the drawer is opened
  useEffect(() => {
    if (open) {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    }
  }, [open, refresh]);

  // Upload everything of the signed-in account through the shared replay
  // coordinator (serialized, claimed per record, owner-scoped). Older or other
  // accounts' forms are never uploaded here; parked forms wait for the user.
  const uploadAll = useCallback(
    async (notify = true) => {
      if (!isOnline) {
        if (notify) message.error("No internet connection. Please try again when online.");
        return;
      }
      if (notify) setUploading(true);
      let summary;
      try {
        summary = await replayOfflineQueue({ automatic: !notify });
      } catch (err) {
        console.error("Offline upload failed:", err);
        if (notify) {
          setUploading(false);
          message.error("Failed to upload forms. Please try again.");
        }
        await refresh();
        return;
      }
      await refresh();
      if (!notify) return;
      setUploading(false);
      const { uploaded, failed, busy, needsAttention, authFailed, total } = summary;
      if (authFailed) message.error("Session expired. Please log in again to upload forms.");
      if (total === 0 && needsAttention === 0) {
        message.info("No offline forms of yours to upload. Older or other accounts' forms are uploaded individually.");
      } else if (uploaded > 0 && failed === 0) message.success(`Uploaded ${uploaded} form(s) successfully!`);
      else if (uploaded > 0 && failed > 0) message.warning(`Uploaded ${uploaded}, ${failed} will be retried.`);
      else if (failed > 0) message.error("Failed to upload forms. They stay saved and will be retried.");
      if (busy > 0) message.info(`${busy} form(s) are already being uploaded.`);
      if (needsAttention > 0) {
        message.warning(`${needsAttention} form(s) need your attention — open them below.`);
      }
    },
    [isOnline, refresh],
  );

  // Auto-upload every 5 minutes while online
  useEffect(() => {
    if (isOnline) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        if (now - lastAutoUpload.current < AUTO_UPLOAD_THROTTLE) return;
        lastAutoUpload.current = now;
        uploadAll(false);
      }, AUTO_UPLOAD_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOnline, uploadAll]);

  // Resume the queue on app launch and after connectivity is restored.
  useEffect(() => {
    if (!isOnline) return;
    const timer = setTimeout(() => uploadAll(false), 2000);
    return () => clearTimeout(timer);
  }, [isOnline, uploadAll]);

  // ── Read-only view handlers ──────────────────────────────────────────
  const openView = (form) => {
    setViewForm(form);
    setViewOpen(true);
  };

  // ── Parked records: keep a copy, then (only if the user asks) remove ──────
  const markCopied = (rec) => setCopiedIds((prev) => new Set(prev).add(String(rec.id)));
  const hasCopy = (rec) => !!rec && copiedIds.has(String(rec.id));

  // Download the queued request as a readable JSON file.
  const saveCopy = (rec) => {
    const name = offlineRecordCopyFilename(rec);
    try {
      const blob = new Blob([offlineRecordCopyText(rec)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      markCopied(rec);
      message.success(`Copy saved as ${name}. If no file appears on this device, use “Copy text”.`);
    } catch (err) {
      console.error("Saving a copy failed:", err);
      message.error("Could not save a file on this device. Use “Copy text” and paste it somewhere safe.");
    }
  };

  // Clipboard fallback (file downloads may not work inside the Android app).
  const copyText = async (rec) => {
    try {
      await navigator.clipboard.writeText(offlineRecordCopyText(rec));
      markCopied(rec);
      message.success("Copied. Paste it into a note or message to keep it.");
    } catch {
      message.error("Could not copy here. Use “Save a copy” instead.");
    }
  };

  const savedOn = (rec) => (rec?.timestamp ? new Date(rec.timestamp).toLocaleString() : "an unknown date");

  const removeFromDevice = async (rec) => {
    if (!rec || !hasCopy(rec)) return;
    const confirmed = await new Promise((resolve) => Modal.confirm({
      title: "Remove this survey from the device?",
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            <strong>{getFormName(rec.url)}</strong> saved on {savedOn(rec)}
            {rec.clientSubmissionId ? <> (id <Text code>{rec.clientSubmissionId}</Text>)</> : null} will be deleted
            from this device.
          </p>
          <p style={{ marginBottom: 8 }}>
            The server has not accepted it, so the copy you saved ({offlineRecordCopyFilename(rec)}) will be the only
            record of these answers.
          </p>
          <p style={{ marginBottom: 0 }}><strong>This cannot be undone.</strong></p>
        </div>
      ),
      okText: "Remove permanently",
      okButtonProps: { danger: true },
      cancelText: "Keep it",
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    }));
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const res = await discardOfflineRecord(rec.id);
      if (res.status === REPLAY.REMOVED || res.status === REPLAY.GONE) {
        message.success("Removed from this device.");
        closeView();
      } else if (res.status === REPLAY.BUSY) {
        message.info("This form is being uploaded right now. Try again in a moment.");
      } else {
        message.error("This form cannot be removed here.");
      }
    } catch (err) {
      message.error(err?.message || "Could not remove the form.");
    } finally {
      setSubmitting(false);
      await refresh();
    }
  };

  const closeView = () => {
    setViewOpen(false);
    setViewForm(null);
  };

  // Upload just the form currently being viewed.
  const submitNow = async () => {
    if (!viewForm) return;
    if (!isOnline) {
      message.error("No internet connection. Form will be uploaded automatically when online.");
      return;
    }
    const ownership = offlineFormOwnership(viewForm);
    if (ownership === "other") {
      message.error(`This form was saved by ${viewForm.ownerId}. Log in as that account to upload it.`);
      return;
    }
    if (ownership === "legacy") {
      const confirmed = await new Promise(resolve => Modal.confirm({
        title: "Upload under your account?",
        content: "This form was saved before the app recorded which account saved it. Upload it only if you collected this survey.",
        okText: "Yes, it's mine — upload",
        cancelText: "Cancel",
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      }));
      if (!confirmed) return;
    }
    setSubmitting(true);
    try {
      const res = await replayOfflineRecord(viewForm.id, {
        allowLegacy: ownership === "legacy",
        retryRejected: !!viewForm.syncRejected,
      });
      await afterSingleUpload(res);
    } catch (err) {
      console.error("Offline upload failed:", err);
      message.error(err?.message || "Unable to upload form. Please try again later.");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  // Show the outcome of a single-record upload and refresh the view.
  const afterSingleUpload = async (res) => {
    switch (res?.status) {
      case REPLAY.UPLOADED:
      case REPLAY.GONE:
        message.success(res.status === REPLAY.GONE ? "This form was already uploaded." : "Form uploaded successfully!");
        closeView();
        break;
      case REPLAY.CONFLICT:
        message.warning("This form needs your attention — see the note above.");
        break;
      case REPLAY.REJECTED:
        message.error(`The server did not accept this form: ${res.message || "please check the answers"}`);
        break;
      case REPLAY.BUSY:
        message.info("This form is already being uploaded. Please wait a moment.");
        break;
      case REPLAY.AUTH:
        message.error("Session expired. Please log in again.");
        break;
      case REPLAY.SKIPPED:
        message.error("This form cannot be uploaded from this account.");
        break;
      default:
        message.error(res?.message ? `Unable to upload form: ${res.message}` : "Unable to upload form. Please try again later.");
    }
    const fresh = (await getOfflineForms()).find(f => sameOfflineId(f.id, viewForm?.id));
    if (fresh && res?.status !== REPLAY.UPLOADED) setViewForm(fresh);
    await refresh();
  };

  // A 409 means the server holds different data under this record's id. Sending
  // it as a new submission is the user's call: it may create a second record.
  const resendNow = async () => {
    if (!viewForm) return;
    const confirmed = await new Promise(resolve => Modal.confirm({
      title: "Send as a new submission?",
      content: "The server already has a different survey under this form's id. Send this saved copy as a separate, new submission only if both surveys are real.",
      okText: "Send as new",
      cancelText: "Cancel",
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    }));
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const res = await replayOfflineRecord(viewForm.id, { resendAsNew: true });
      await afterSingleUpload(res);
    } catch (err) {
      message.error(err?.message || "Unable to upload form. Please try again later.");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const count = forms.length;

  return (
    <>
      <ConfigProvider theme={{ token: { colorPrimary: ACCENT_COLOR } }}>
        <FloatButton
          icon={<RouterSharpIcon style={{ fontSize: 22 }} />}
          type="primary"
          badge={{ count, color: BADGE_COLOR }}
          tooltip="Offline saved forms"
          style={{ right: 24, bottom: 96 }}
          onClick={() => setOpen(true)}
        />
      </ConfigProvider>

      <Drawer
        title={
          <Space direction="vertical" size={0}>
            <Space>
              <RouterSharpIcon style={{ fontSize: 18 }} />
              <span>Offline Saved Forms</span>
            </Space>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {count} form{count !== 1 ? "s" : ""} pending {isOnline ? "" : "· you are offline"}
            </Text>
          </Space>
        }
        placement="right"
        width={420}
        open={open}
        onClose={() => setOpen(false)}
      >
        <Button
          type="primary"
          icon={<CloudUploadOutlined />}
          block
          size="large"
          loading={uploading}
          disabled={count === 0 || !isOnline}
          onClick={() => uploadAll(true)}
          style={{ marginBottom: 16 }}
        >
          Upload All Forms
        </Button>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin />
          </div>
        ) : count === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No offline forms — everything is uploaded"
            style={{ marginTop: 48 }}
          />
        ) : (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {forms.map((form, idx) => (
              <Card
                key={form.id ?? idx}
                size="small"
                styles={{ body: { padding: 14 } }}
                style={{ borderColor: "#ffe2b3", background: "#fffaf0" }}
              >
                <Space style={{ width: "100%", justifyContent: "space-between" }} align="start">
                  <Space direction="vertical" size={2}>
                    <Text strong>{getFormName(form.url)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {form.data?.date ||
                        form.data?.visitDate ||
                        form.data?.dateOfVisit ||
                        (form.timestamp ? new Date(form.timestamp).toLocaleString() : "N/A")}
                    </Text>
                  </Space>
                  {(() => {
                    const ownership = offlineFormOwnership(form);
                    if (form.syncConflict) return <Tag color="error">Needs attention</Tag>;
                    if (form.syncRejected) return <Tag color="error">Needs correction</Tag>;
                    if (ownership === "other") return <Tag color="default">Saved by {form.ownerId}</Tag>;
                    if (ownership === "legacy") return <Tag color="orange">Older form — upload manually</Tag>;
                    return (
                      <Tag icon={<ClockCircleOutlined />} color="warning">
                        Pending
                      </Tag>
                    );
                  })()}
                </Space>
                {form.syncRejected?.message && (
                  <Text type="danger" style={{ display: "block", fontSize: 12, marginTop: 6 }}>
                    {form.syncRejected.message}
                  </Text>
                )}
                {!form.syncRejected && !form.syncConflict && form.lastSyncAttempt?.message && (
                  <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 6 }}>
                    Last attempt failed: {form.lastSyncAttempt.message} — will retry.
                  </Text>
                )}
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => openView(form)}
                  style={{ marginTop: 10 }}
                >
                  View
                </Button>
              </Card>
            ))}
          </Space>
        )}

        <Text type="secondary" style={{ display: "block", textAlign: "center", marginTop: 24, fontSize: 12 }}>
          Forms are stored on this device and auto-upload every 5 minutes when online.
        </Text>
      </Drawer>

      <Modal
        title={viewForm ? `${getFormName(viewForm.url)} — Saved Form` : "Saved Form"}
        open={viewOpen}
        width={640}
        onCancel={closeView}
        footer={[
          <Button key="close" onClick={closeView}>
            Close
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            disabled={!isOnline || (viewForm && (offlineFormOwnership(viewForm) === "other" || !!viewForm.syncConflict))}
            onClick={submitNow}
          >
            {viewForm?.syncRejected ? "Try again" : "Submit Now"}
          </Button>,
        ]}
      >
        {viewForm?.syncRejected && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="The server did not accept this form"
            description={
              <div>
                <div>{viewForm.syncRejected.message}</div>
                {Object.entries(viewForm.syncRejected.fieldErrors || {}).length > 0 && (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {Object.entries(viewForm.syncRejected.fieldErrors).map(([field, msg]) => (
                      <li key={field}><Text code>{field}</Text> {String(msg)}</li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  It stays saved on this device and is not retried automatically. “Try again” sends the same
                  answers, so it helps only after the problem is fixed on the server (or by an app update). Save a
                  copy and contact your supervisor if it keeps failing.
                </div>
              </div>
            }
          />
        )}
        {viewForm?.syncConflict && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="This form was not uploaded"
            description={viewForm.syncConflict.message || "The server already has different data under this form's id."}
            action={
              <Button size="small" danger loading={submitting} disabled={!isOnline} onClick={resendNow}>
                Send as new
              </Button>
            }
          />
        )}
        {(viewForm?.syncRejected || viewForm?.syncConflict) && offlineFormOwnership(viewForm) === "mine" && (
          <div style={{ border: "1px solid #F0F0F0", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>Keep a copy of these answers</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
              Save the queued survey as a file (or copy its text) before doing anything else. Removing it from the
              device is possible only after a copy has been saved.
            </Text>
            <Space wrap>
              <Button icon={<DownloadOutlined />} onClick={() => saveCopy(viewForm)}>Save a copy</Button>
              <Button icon={<CopyOutlined />} onClick={() => copyText(viewForm)}>Copy text</Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!hasCopy(viewForm) || submitting}
                title={hasCopy(viewForm) ? undefined : "Save a copy first"}
                onClick={() => removeFromDevice(viewForm)}
              >
                Remove from device
              </Button>
            </Space>
          </div>
        )}
        {viewForm?.data && (
          <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
            <Descriptions bordered column={1} size="small">
              {Object.entries(viewForm.data)
                .filter(([key]) => !HIDDEN_FIELDS.includes(key))
                .map(([key, value]) => (
                  <Descriptions.Item key={key} label={prettyLabel(key)}>
                    {displayValue(value)}
                  </Descriptions.Item>
                ))}
            </Descriptions>
          </div>
        )}
      </Modal>
    </>
  );
}
