import { Card, Empty, Spin } from "antd";

export default function ChartCard({ title, subtitle, children, loading, extra, height = 300, style }) {
  return (
    <Card
      title={
        <div>
          <div style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>{title}</div>
          {subtitle && <div style={{ fontWeight: 400, color: "#6B7280", fontSize: 12, marginTop: 2 }}>{subtitle}</div>}
        </div>
      }
      extra={extra}
      style={{ borderRadius: 16, border: "1px solid #F3F4F6", ...style }}
      bodyStyle={{ padding: "8px 16px 16px" }}
    >
      <Spin spinning={!!loading}>
        {children
          ? <div style={{ height }}>{children}</div>
          : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" style={{ height, display: "flex", flexDirection: "column", justifyContent: "center" }} />}
      </Spin>
    </Card>
  );
}
