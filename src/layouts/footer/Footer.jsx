import { useState } from "react";
import { Modal, Button } from "antd";
import { Link } from "react-router-dom";
// Monogram-only crops: the full lockups carry their own wordmarks, which read as
// duplicated text next to the footer's own labels (and are illegible at 30px).
import iegLogo from "../../assets/img/IEGMark.png";
import divaLogo from "../../assets/img/DivaLogoSmall.png";
import { HEALTH_URL, useServerHealth } from "../../utils/networkState";

/**
 * Small status pill shown in the footer: shares the app-wide /health poller
 * from networkState. When the server is unreachable the same poller flips the
 * app into offline mode (header pill, banners, form save-offline paths).
 */
function ServerHealthIndicator() {
  // 'checking' | 'up' | 'down' — driven by the shared poller in networkState
  const status = useServerHealth();

  const config = {
    up: { color: "#22c55e", label: "Server online" },
    down: { color: "#ef4444", label: "Server offline — app in offline mode" },
    checking: { color: "#9ca3af", label: "Checking server…" },
  }[status];

  return (
    <span
      title={`${config.label} · ${HEALTH_URL}`}
      aria-label={config.label}
      role="status"
      style={{ display: "flex", alignItems: "center" }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: config.color,
          boxShadow: `0 0 6px ${config.color}`,
          transition: "background 0.3s ease, box-shadow 0.3s ease",
          flexShrink: 0,
          ...(status === "up" ? { animation: "samHealthPulse 1.8s ease-in-out infinite" } : {}),
        }}
      />
      <style>{`@keyframes samHealthPulse {
        0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
        70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
        100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
      }`}</style>
    </span>
  );
}

const TEAM_MEMBERS = [
  { name: "Dr. William Joe", role: "Principal Investigator - SAM Hotspot Project" },
  { name: "Dr. Rakesh Kumar", role: "Senior Consultant – SAM Hotspot Project" },
  { name: "Pavan Kumar Singh", role: "Data Manager - SAM Hotspot Project" },
  { name: "Dr. Chanda Murya", role: "Junior Consultant - SAM Hotspot Project" },
  { name: "Dr. Tulika Rohilla", role: "Senior Research Analyst - SAM Hotspot Project" },
  { name: "Diva Enterprises", role: "IT Support" },
];

function IegLink({ height }) {
  return (
    <a
      href="https://iegindia.org/"
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
    >
      <img
        src={iegLogo}
        alt="Institute of Economic Growth"
        style={{ height, objectFit: "contain", filter: "brightness(0) invert(1)" }}
      />
    </a>
  );
}

function DivaCredit({ label, logoHeight, labelSize = 13, style }) {
  return (
    <a
      href="https://diva-it.in/"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "rgba(255,255,255,0.85)",
        textDecoration: "none",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: labelSize }}>{label}</span>
      <img
        src={divaLogo}
        alt="Diva Enterprises"
        style={{ height: logoHeight, objectFit: "contain" }}
      />
    </a>
  );
}

const LINK_STYLE = {
  color: "rgba(255,255,255,0.85)",
  fontWeight: 600,
  fontSize: 13,
  textDecoration: "none",
};

/**
 * `compact` is set for the surveyor layout (the Android app). Same three-part
 * row as the desktop footer, but the DIVA credit is centred with `flex: 1`
 * rather than absolute positioning — at phone width an absolutely-centred
 * element overlaps the items on either side.
 */
export default function Footer({ compact = false }) {
  const [teamOpen, setTeamOpen] = useState(false);

  const teamButton = (
    <Button
      type="text"
      onClick={() => setTeamOpen(true)}
      style={{
        color: "white",
        fontWeight: 600,
        fontSize: compact ? 12 : 13,
        border: "1px solid rgba(255,255,255,0.35)",
        borderRadius: 6,
        padding: compact ? "2px 12px" : "4px 16px",
        height: "auto",
      }}
    >
      Team
    </Button>
  );

  return (
    <>
      {compact ? (
        <footer style={{
          background: "#002147",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          color: "white",
          flexShrink: 0,
        }}>
          <IegLink height={26} />

          {/* flex:1 makes this fill the space between the IEG mark and the links,
              so the credit sits centred between them rather than on its own row. */}
          <DivaCredit
            label="Built by"
            logoHeight={26}
            labelSize={12}
            style={{ flex: 1, justifyContent: "center", gap: 6, minWidth: 0 }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <Link to="/privacy-policy" style={{ ...LINK_STYLE, fontSize: 12 }}>
              Privacy
            </Link>
            {teamButton}
            <ServerHealthIndicator />
          </div>
        </footer>
      ) : (
        <footer style={{
          position: "relative",
          background: "#002147",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          color: "white",
          flexShrink: 0,
        }}>
          {/* Left — IEG logo */}
          <IegLink height={36} />

          {/* Center — "Powered by" DIVA credit */}
          <DivaCredit
            label="Powered by"
            logoHeight={32}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />

          {/* Right — Privacy + Team button + server health light (light at far right) */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link to="/privacy-policy" style={LINK_STYLE}>
              Privacy Policy
            </Link>
            {teamButton}
            <ServerHealthIndicator />
          </div>
        </footer>
      )}

      <Modal
        open={teamOpen}
        onCancel={() => setTeamOpen(false)}
        footer={null}
        title={
          <span style={{ color: "#002147", fontWeight: 700 }}>
            Institute of Economic Growth Technical Support Partner Team
          </span>
        }
        width={480}
        centered
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
          {TEAM_MEMBERS.map((member, idx) => (
            <div
              key={idx}
              style={{
                background: "#F8FAFC",
                borderRadius: 8,
                padding: "12px 16px",
                borderLeft: "3px solid #1CABE2",
              }}
            >
              <div style={{ fontWeight: 700, color: "#002147", fontSize: 14 }}>{member.name}</div>
              {member.role && (
                <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>{member.role}</div>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
