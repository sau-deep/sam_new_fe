import { useNavigate } from "react-router-dom";
import { Button, Typography, Divider, Anchor, Grid } from "antd";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import IEGLogo from "../../assets/img/Institute-of-Economic-Growth.png";
import { POLICY_META, POLICY_SECTIONS } from "./privacyPolicyContent";

const { Title, Paragraph, Text } = Typography;
const { useBreakpoint } = Grid;

const NAVY = "#002147";
const BLUE = "#1CABE2";

// Renders one body item: a plain paragraph, a bullet list, or a subheading block.
function BodyItem({ item }) {
  if (typeof item === "string") {
    return (
      <Paragraph style={{ color: "#374151", fontSize: 14, lineHeight: 1.75, marginBottom: 14 }}>
        {item}
      </Paragraph>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {item.subheading && (
        <Text
          strong
          style={{ display: "block", color: NAVY, fontSize: 14, margin: "6px 0 8px" }}
        >
          {item.subheading}
        </Text>
      )}
      {Array.isArray(item.list) && (
        <ul style={{ paddingLeft: 22, margin: 0 }}>
          {item.list.map((li, i) => (
            <li
              key={i}
              style={{ color: "#374151", fontSize: 14, lineHeight: 1.7, marginBottom: 6 }}
            >
              {li}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isDesktop = screens.lg;

  // Static PDF lives in /public and is served from the app root.
  // The ?v= query busts browser / service-worker cache when the PDF is updated —
  // bump PDF_VERSION whenever privacy-policy.pdf is regenerated.
  const PDF_VERSION = "4";
  const pdfHref = `${process.env.PUBLIC_URL || ""}/privacy-policy.pdf?v=${PDF_VERSION}`;

  const anchorItems = POLICY_SECTIONS.map((s) => ({
    key: s.id,
    href: `#${s.id}`,
    title: s.heading,
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#F0F6FF" }}>
      {/* ── Hero header ── */}
      <div
        style={{
          background: "linear-gradient(160deg, #002147 0%, #1565C0 60%, #1CABE2 100%)",
          color: "white",
          padding: "28px 24px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Top bar: back + download */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ color: "white", fontWeight: 600, paddingLeft: 0 }}
            >
              Back
            </Button>

            <Button
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              icon={<DownloadOutlined />}
              style={{
                background: "white",
                color: NAVY,
                border: "none",
                fontWeight: 700,
                borderRadius: 10,
                height: 40,
              }}
            >
              Download PDF
            </Button>
          </div>

          {/* Title block */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <div
              style={{
                background: "white",
                borderRadius: 14,
                width: 64,
                height: 64,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
                padding: 6,
                flexShrink: 0,
              }}
            >
              <img
                src={IEGLogo}
                alt="IEG"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  padding: "4px 12px",
                  borderRadius: 20,
                  marginBottom: 10,
                }}
              >
                <SafetyOutlined style={{ fontSize: 12 }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4 }}>
                  {POLICY_META.programme}
                </span>
              </div>
              <Title level={2} style={{ color: "white", margin: 0, fontWeight: 900 }}>
                {POLICY_META.title}
              </Title>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 6 }}>
                {POLICY_META.operator} · {POLICY_META.collaboration}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "24px",
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {/* Table of contents (desktop only) */}
        {isDesktop && (
          <div
            style={{
              position: "sticky",
              top: 24,
              width: 260,
              flexShrink: 0,
              background: "white",
              borderRadius: 16,
              padding: "18px 12px",
              boxShadow: "0 2px 12px rgba(0,33,71,0.08)",
            }}
          >
            <Text
              strong
              style={{
                display: "block",
                color: NAVY,
                fontSize: 12,
                letterSpacing: 0.5,
                padding: "0 12px 8px",
              }}
            >
              ON THIS PAGE
            </Text>
            <Anchor
              affix={false}
              offsetTop={80}
              items={anchorItems}
              style={{ fontSize: 13 }}
            />
          </div>
        )}

        {/* Policy body */}
        <div
          style={{
            flex: 1,
            background: "white",
            borderRadius: 16,
            padding: isDesktop ? "36px 40px" : "24px 20px",
            boxShadow: "0 4px 24px rgba(0,33,71,0.08)",
            border: "1px solid rgba(28,171,226,0.1)",
          }}
        >
          <Paragraph style={{ color: "#6B7280", fontSize: 13, marginBottom: 4 }}>
            This policy describes how we handle information collected through the CMAM Programme
            platform. Please read it carefully.
          </Paragraph>

          <Divider style={{ margin: "18px 0 24px", borderColor: "#E5EDF8" }} />

          {POLICY_SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              style={{ marginBottom: 28, scrollMarginTop: 80 }}
            >
              <Title
                level={4}
                style={{ color: NAVY, marginBottom: 12, borderLeft: `4px solid ${BLUE}`, paddingLeft: 12 }}
              >
                {section.heading}
              </Title>
              {section.body.map((item, i) => (
                <BodyItem key={i} item={item} />
              ))}
            </section>
          ))}

          <Divider style={{ margin: "8px 0 20px", borderColor: "#E5EDF8" }} />

          <div style={{ textAlign: "center" }}>
            <Button
              type="primary"
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              icon={<DownloadOutlined />}
              size="large"
              style={{
                background: "linear-gradient(135deg, #1CABE2 0%, #374EA2 100%)",
                border: "none",
                borderRadius: 12,
                fontWeight: 700,
                height: 48,
                paddingInline: 28,
              }}
            >
              Download this policy as PDF
            </Button>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 14 }}>
              CMAM Programme v{POLICY_META.version} · Institute of Economic Growth · All rights reserved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
