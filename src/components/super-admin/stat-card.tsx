import type { ReactNode } from "react";

type StatCardProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  trend?: { direction: "up" | "down" | "neutral"; text: string };
};

export function StatCard({ icon, label, value, detail, trend }: StatCardProps) {
  const trendColor =
    trend?.direction === "up"
      ? "var(--ds-success)"
      : trend?.direction === "down"
        ? "var(--ds-danger)"
        : "var(--ds-text-muted)";

  return (
    <article
      className="flex gap-4 rounded-ui-panel border p-5 transition-shadow hover:shadow-md"
      style={{
        borderColor: "var(--ds-outline-variant)",
        background: "var(--ds-surface-raised)",
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-ui-panel"
        style={{
          background: "var(--ds-primary-fixed)",
          color: "var(--ds-on-primary-fixed)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--ds-text-muted)" }}
        >
          {label}
        </p>
        <p
          className="mt-1 text-2xl font-bold tabular-nums"
          style={{ color: "var(--ds-on-surface)" }}
        >
          {value}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span className="text-xs font-semibold" style={{ color: trendColor }}>
              {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"}{" "}
              {trend.text}
            </span>
          )}
          {detail && (
            <span className="text-xs" style={{ color: "var(--ds-text-muted)" }}>
              {detail}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
