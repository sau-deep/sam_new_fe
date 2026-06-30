import { useState, useEffect, useCallback } from "react";
import { Row, Col, Card, Input, Tag, Button, Typography, Modal, Image, Empty, Alert, Spin, message } from "antd";
import {
  FilePdfOutlined, FileOutlined,
  DownloadOutlined, SyncOutlined,
} from "@ant-design/icons";
import api from "../../services/axiosInstance";

const { Title, Text } = Typography;
const { Search } = Input;

/**
 * Static resources — real files available in /public
 * downloadUrl: relative path from public root (served statically by CRA)
 * preview: image preview path (JPEG previews of SOP pages)
 */
const STATIC_RESOURCES = [
  {
    id: 1,
    title: "Mobile SoP — Routine Monitoring",
    description: "Standard Operating Procedure for Routine Monitoring Common Checklist (mobile field guide)",
    tags: ["SOP", "RMC", "Field Guide"],
    category: "SOPs",
    fileType: "PPTX",
    icon: <FilePdfOutlined style={{ color: "#E2231A", fontSize: 24 }} />,
    preview: null,
    downloadUrl: "/Mobile_SoP_Routine_Monitoring.pptx",
    fileName: "Mobile_SoP_Routine_Monitoring.pptx",
    available: true,
  },
  {
    id: 2,
    title: "Bi-Annual Questionnaire",
    description: "Bi-annual assessment questionnaire in PDF format",
    tags: ["Questionnaire", "Assessment", "Bi-Annual"],
    category: "Protocols",
    fileType: "PDF",
    icon: <FilePdfOutlined style={{ color: "#E2231A", fontSize: 24 }} />,
    preview: null,
    downloadUrl: "/BiAnnual_Questionnaire 1.pdf",
    fileName: "BiAnnual_Questionnaire.pdf",
    available: true,
  },
];

const CATEGORY_COLORS = {
  "SOPs": "blue",
  "Training": "green",
  "Maps & Images": "cyan",
  "Protocols": "red",
  "Technical": "orange",
};

function downloadFile(url, fileName) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || url.split("/").pop();
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function ResourceCard({ resource, onClick }) {
  const handleDownload = (e) => {
    e.stopPropagation();
    if (!resource.available || !resource.downloadUrl) {
      message.warning("This file is not yet available for download.");
      return;
    }
    downloadFile(resource.downloadUrl, resource.fileName);
  };

  return (
    <Card
      style={{
        borderRadius: 14,
        border: `1px solid ${resource.available ? "#F3F4F6" : "#FEF3C7"}`,
        cursor: "pointer",
        transition: "all 0.2s",
        background: resource.available ? "white" : "#FFFBEB",
      }}
      bodyStyle={{ padding: "20px" }}
      hoverable
      onClick={() => resource.available && onClick(resource)}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: "#F5F7FA",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {resource.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 4 }}>
            {resource.title}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10, lineHeight: 1.5 }}>
            {resource.description}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            <Tag color={CATEGORY_COLORS[resource.category] || "default"} style={{ borderRadius: 10, fontSize: 10 }}>
              {resource.category}
            </Tag>
            {resource.tags.slice(0, 2).map((t) => (
              <Tag key={t} style={{ borderRadius: 10, fontSize: 10, background: "#F5F7FA", border: "1px solid #E5E7EB", color: "#6B7280" }}>
                {t}
              </Tag>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: "1px solid #F3F4F6" }}>
        <Tag style={{ borderRadius: 6, fontSize: 11 }}>{resource.fileType}</Tag>
        <Button
          size="small"
          icon={<DownloadOutlined />}
          type="primary"
          disabled={!resource.available}
          onClick={handleDownload}
          style={resource.available ? { background: "#1CABE2", borderColor: "#1CABE2" } : {}}
        >
          {resource.available ? "Download" : "Unavailable"}
        </Button>
      </div>
    </Card>
  );
}

export default function ResourceMaterials() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [preview, setPreview] = useState(null);
  const [apiResources, setApiResources] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);

  // Optionally fetch server-uploaded resources
  const fetchApiResources = useCallback(async () => {
    setApiLoading(true);
    try {
      const { data } = await api.get("/resources/list");
      const arr = Array.isArray(data) ? data : (data?.data || []);
      setApiResources(arr);
    } catch {
      // No resources API yet — fine, use static list only
    } finally {
      setApiLoading(false);
    }
  }, []);

  useEffect(() => { fetchApiResources(); }, [fetchApiResources]);

  // Merge static + API resources (API resources come first if any)
  const allResources = [
    ...apiResources.map((r, i) => ({
      id: `api-${i}`,
      title: r.title || r.name,
      description: r.description || "",
      tags: r.tags || [],
      category: r.category || "General",
      fileType: r.fileType || "File",
      icon: <FileOutlined style={{ color: "#374151", fontSize: 24 }} />,
      preview: r.previewUrl || null,
      downloadUrl: r.downloadUrl || r.url,
      fileName: r.fileName || r.title,
      available: !!r.downloadUrl,
    })),
    ...STATIC_RESOURCES,
  ];

  const categories = ["All", ...new Set(allResources.map((r) => r.category))];

  const filtered = allResources.filter((r) => {
    const matchSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = selectedCategory === "All" || r.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handlePreviewDownload = () => {
    if (!preview?.downloadUrl) return;
    downloadFile(preview.downloadUrl, preview.fileName);
  };

  return (
    <div style={{ padding: 24, background: "#F5F7FA", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: "#002147" }}>Resource Materials</Title>
        <Text style={{ color: "#6B7280" }}>SOPs, training guides, state maps, and reference materials</Text>
      </div>

      {/* Hero banner */}
      <Card style={{
        borderRadius: 16, marginBottom: 24, border: "none",
        background: "linear-gradient(135deg, #002147, #1CABE2)",
      }} bodyStyle={{ padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>
              SAM Program Reference Library
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, maxWidth: 500 }}>
              Official documentation, SOPs, training materials, and state coverage maps.
              All files are real and downloadable.
            </div>
          </div>
          <div style={{ textAlign: "center", color: "white" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#FFC20E" }}>{allResources.length}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Resources</div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <Search
          placeholder="Search resources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280, borderRadius: 8 }}
          allowClear
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {categories.map((c) => (
            <Tag
              key={c}
              style={{
                cursor: "pointer", borderRadius: 20, padding: "4px 14px", fontSize: 13,
                background: selectedCategory === c ? "#1CABE2" : "white",
                color: selectedCategory === c ? "white" : "#374151",
                border: selectedCategory === c ? "none" : "1px solid #E5E7EB",
              }}
              onClick={() => setSelectedCategory(c)}
            >
              {c}
            </Tag>
          ))}
        </div>
        {apiLoading && <SyncOutlined spin style={{ color: "#1CABE2" }} />}
      </div>

      {/* Resource Grid */}
      <Spin spinning={apiLoading && allResources.length === 0}>
        {filtered.length === 0
          ? <Empty description="No resources found" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 60 }} />
          : (
            <Row gutter={[16, 16]}>
              {filtered.map((r) => (
                <Col xs={24} sm={12} lg={8} key={r.id}>
                  <ResourceCard resource={r} onClick={setPreview} />
                </Col>
              ))}
            </Row>
          )}
      </Spin>

      {/* Preview Modal */}
      <Modal
        open={!!preview}
        title={preview?.title}
        onCancel={() => setPreview(null)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setPreview(null)}>Close</Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            disabled={!preview?.available}
            onClick={handlePreviewDownload}
            style={{ background: "#1CABE2", borderColor: "#1CABE2" }}
          >
            Download {preview?.fileType}
          </Button>,
        ]}
      >
        {preview?.preview ? (
          <Image src={preview.preview} style={{ width: "100%", borderRadius: 8 }} preview={false} />
        ) : (
          <Empty description="Preview not available for this file type" />
        )}
        <div style={{ marginTop: 12 }}>
          <Text style={{ color: "#6B7280" }}>{preview?.description}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            File: {preview?.fileName} · Type: {preview?.fileType}
          </Text>
        </div>
      </Modal>
    </div>
  );
}
