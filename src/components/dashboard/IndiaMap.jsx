import { useState } from "react";
import {
  ComposableMap, Geographies, Geography, ZoomableGroup, Marker, Annotation,
} from "react-simple-maps";
import { Tooltip, Tag } from "antd";
import { MAP_COLOR_SCALE } from "../../theme/unicef";
import indiaGeo from "../../assets/india-states.json";

// Imported directly as a module — no CDN/URL dependency, works offline and with any base path
const INDIA_TOPO = indiaGeo;

// States we cover in SAM
const SAM_STATES = ["Rajasthan", "Odisha", "Madhya Pradesh", "Chhattisgarh", "Jharkhand", "Telangana"];

function getColor(value, max) {
  if (!value || max === 0) return "#F3F4F6";
  const ratio = value / max;
  if (ratio < 0.15) return MAP_COLOR_SCALE[1];
  if (ratio < 0.3) return MAP_COLOR_SCALE[2];
  if (ratio < 0.5) return MAP_COLOR_SCALE[3];
  if (ratio < 0.7) return MAP_COLOR_SCALE[4];
  if (ratio < 0.9) return MAP_COLOR_SCALE[5];
  return MAP_COLOR_SCALE[6];
}

export default function IndiaMap({ data = {}, onStateClick, title = "State-Wise Coverage" }) {
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, state: null });
  const maxVal = Math.max(...Object.values(data).map(Number), 1);

  return (
    <div style={{ position: "relative" }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 1000, center: [82, 22] }}
        style={{ width: "100%", height: 380 }}
      >
        <ZoomableGroup>
          <Geographies geography={INDIA_TOPO}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.ST_NM || geo.properties.NAME_1 || geo.properties.name || "";
                const value = data[stateName] || 0;
                const isCovered = SAM_STATES.some((s) => stateName.toLowerCase().includes(s.toLowerCase()));
                const color = isCovered ? getColor(value, maxVal) : "#F3F4F6";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth={0.8}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: isCovered ? "#1CABE2" : "#E5E7EB", outline: "none", cursor: isCovered ? "pointer" : "default" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(e) => {
                      setTooltip({ visible: true, x: e.clientX, y: e.clientY, state: stateName, value });
                    }}
                    onMouseLeave={() => setTooltip({ ...tooltip, visible: false })}
                    onClick={() => isCovered && onStateClick?.(stateName)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Custom tooltip */}
      {tooltip.visible && tooltip.state && (
        <div style={{
          position: "fixed", left: tooltip.x + 10, top: tooltip.y - 40,
          background: "rgba(0,33,71,0.92)", color: "white",
          padding: "8px 12px", borderRadius: 8, fontSize: 12, zIndex: 1000,
          pointerEvents: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}>
          <div style={{ fontWeight: 700 }}>{tooltip.state}</div>
          {tooltip.value > 0 && (
            <div style={{ color: "#FFC20E", marginTop: 2 }}>
              {tooltip.value.toLocaleString()} surveys
            </div>
          )}
          {!SAM_STATES.some((s) => (tooltip.state || "").toLowerCase().includes(s.toLowerCase())) && (
            <div style={{ color: "#9CA3AF", fontSize: 11 }}>Not in scope</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, justifyContent: "center" }}>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>Low</span>
        {MAP_COLOR_SCALE.slice(1).map((c, i) => (
          <div key={i} style={{ width: 24, height: 8, background: c, borderRadius: 2 }} />
        ))}
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>High</span>
      </div>
    </div>
  );
}
