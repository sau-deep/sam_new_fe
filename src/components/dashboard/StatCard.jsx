import { Card, Tooltip } from "antd";
import CountUp from "react-countup";
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from "@ant-design/icons";

export default function StatCard({
  title, value, suffix = "", prefix = "",
  icon, gradient, trend, trendLabel, description,
  loading = false, onClick,
}) {
  const trendIcon = trend > 0
    ? <ArrowUpOutlined style={{ fontSize: 11 }} />
    : trend < 0
    ? <ArrowDownOutlined style={{ fontSize: 11 }} />
    : <MinusOutlined style={{ fontSize: 11 }} />;
  const trendColor = trend > 0 ? "#80BD41" : trend < 0 ? "#E2231A" : "#9CA3AF";

  return (
    <Card
      loading={loading}
      onClick={onClick}
      style={{
        borderRadius: 16, border: "none", overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; } }}
      onMouseLeave={(e) => { if (onClick) { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; } }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Gradient top bar */}
      <div style={{
        height: 4,
        background: gradient || "linear-gradient(90deg, #1CABE2, #374EA2)",
      }} />

      <div style={{ padding: "20px 24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {title}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              {prefix && <span style={{ fontSize: 18, fontWeight: 700, color: "#374151" }}>{prefix}</span>}
              <span style={{ fontSize: 32, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                {typeof value === "number"
                  ? <CountUp end={value} duration={1.5} separator="," />
                  : value}
              </span>
              {suffix && <span style={{ fontSize: 14, color: "#6B7280", fontWeight: 500 }}>{suffix}</span>}
            </div>
            {description && (
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{description}</div>
            )}
            {trendLabel && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                <span style={{ color: trendColor, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}>
                  {trendIcon} {Math.abs(trend)}%
                </span>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{trendLabel}</span>
              </div>
            )}
          </div>
          {icon && (
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: gradient || "linear-gradient(135deg, #1CABE2, #374EA2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, color: "white", flexShrink: 0,
              boxShadow: "0 4px 12px rgba(28,171,226,0.3)",
            }}>
              {icon}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
