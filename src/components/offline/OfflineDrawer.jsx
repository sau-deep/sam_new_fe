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
  message,
} from "antd";
import {
  CloudUploadOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  SendOutlined,
} from "@ant-design/icons";
import RouterSharpIcon from "@mui/icons-material/RouterSharp";
import { getOfflineForms, deleteForm } from "../../utils/indexDB";
import { useEffectiveNetworkStatus } from "../../utils/networkState";
import { isSurveyorUser, syncAfterSubmission } from "../../utils/dailySurveyCount";
import apiService from "../../services/api";

const { Text } = Typography;

// Map a stored form url to the daily-count form type so an offline upload
// refreshes the local counter the same way an online submit does. Without this,
// synced offline forms raise the backend count but not the local cache, so the
// calendar under-counts relative to the "Today" card.
const URL_TO_FORM_TYPE = {
  "/form/routine": "routine",
  "/form/household": "household",
  "/form/biannual": "concurrent",
  "/form/followup": "followup",
};

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

  const previousOnline = useRef(isOnline);
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

  // Upload a single form. Returns true on success.
  const uploadForm = useCallback(async (form) => {
    const res = await apiService.post(form.url, form.data);
    if (res?.statusCode === 200) {
      await deleteForm(form.id);
      // Keep the local daily counter in step with the backend for surveyors,
      // mirroring the online submit path.
      const formType = URL_TO_FORM_TYPE[form.url];
      if (formType && isSurveyorUser()) {
        syncAfterSubmission(apiService, formType).catch((err) => {
          console.error("Error syncing daily count after offline upload:", err);
        });
      }
      return true;
    }
    return false;
  }, []);

  // Upload everything; optionally surface notifications to the user.
  const uploadAll = useCallback(
    async (notify = true) => {
      if (!isOnline) {
        if (notify) message.error("No internet connection. Please try again when online.");
        return;
      }
      const stored = await getOfflineForms();
      if (!stored || stored.length === 0) {
        if (notify) message.info("No offline forms to upload.");
        return;
      }

      if (notify) setUploading(true);
      let success = 0;
      let failed = 0;

      for (const form of stored) {
        try {
          const ok = await uploadForm(form);
          ok ? success++ : failed++;
        } catch (err) {
          failed++;
          const status = err?.response?.status || err?.status;
          if (status === 401 || status === 403) {
            if (notify) message.error("Session expired. Please log in again to upload forms.");
            break;
          }
          console.error("Offline upload failed:", err);
        }
      }

      await refresh();
      if (notify) {
        setUploading(false);
        if (success > 0 && failed === 0) message.success(`Uploaded ${success} form(s) successfully!`);
        else if (success > 0 && failed > 0) message.warning(`Uploaded ${success}, ${failed} failed.`);
        else if (failed > 0) message.error("Failed to upload forms. Please try again.");
      }
    },
    [isOnline, refresh, uploadForm],
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

  // Trigger an upload right after connectivity is restored
  useEffect(() => {
    if (isOnline && !previousOnline.current) {
      const t = setTimeout(() => uploadAll(true), 2000);
      previousOnline.current = isOnline;
      return () => clearTimeout(t);
    }
    previousOnline.current = isOnline;
  }, [isOnline, uploadAll]);

  // ── Read-only view handlers ──────────────────────────────────────────
  const openView = (form) => {
    setViewForm(form);
    setViewOpen(true);
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
    setSubmitting(true);
    try {
      const ok = await uploadForm(viewForm);
      if (ok) {
        message.success("Form uploaded successfully!");
        closeView();
        await refresh();
      } else {
        message.error("Unable to upload form. Please try again later.");
      }
    } catch (err) {
      const status = err?.response?.status || err?.status;
      if (status === 401 || status === 403) message.error("Session expired. Please log in again.");
      else message.error("Unable to upload form. Please try again later.");
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
                  <Tag icon={<ClockCircleOutlined />} color="warning">
                    Pending
                  </Tag>
                </Space>
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
            disabled={!isOnline}
            onClick={submitNow}
          >
            Submit Now
          </Button>,
        ]}
      >
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
