import { useState } from "react";
import { Modal, Button } from "antd";
import iegLogo from "../../assets/img/IELogo.png";
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

export default function Footer() {
  const [teamOpen, setTeamOpen] = useState(false);

  return (
    <>
      <footer style={{
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
        <a
          href="https://iegindia.org/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center" }}
        >
          <img
            src={iegLogo}
            alt="Institute of Economic Growth"
            style={{ height: 36, objectFit: "contain", filter: "brightness(0) invert(1)" }}
          />
        </a>

        {/* Right — Team button + server health light (light at far right) */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Button
            type="text"
            onClick={() => setTeamOpen(true)}
            style={{
              color: "white",
              fontWeight: 600,
              fontSize: 13,
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 6,
              padding: "4px 16px",
              height: "auto",
            }}
          >
            Team
          </Button>
          <ServerHealthIndicator />
        </div>
      </footer>

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
