import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "./class-names";

type MetricCardProps = HTMLAttributes<HTMLElement> & {
  detail?: ReactNode;
  label: ReactNode;
  tone?: "brand" | "danger" | "neutral" | "success" | "warning";
  value: ReactNode;
};

const toneClasses = {
  brand: "border-l-brand-primary",
  danger: "border-l-danger",
  neutral: "border-l-divider",
  success: "border-l-success",
  warning: "border-l-warning",
} as const;

export function MetricCard({
  className,
  detail,
  label,
  tone = "brand",
  value,
  ...props
}: MetricCardProps) {
  return (
    <article
      {...props}
      className={classNames(
        "min-w-0 rounded-ui-panel border border-divider border-l-4 bg-surface-raised p-4 shadow-sm",
        toneClasses[tone],
        className,
      )}
      data-ui-metric-card="true"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-content-muted">{label}</p>
      <p className="mt-2 break-words font-mono text-2xl font-bold tabular-nums text-content">{value}</p>
      {detail ? <div className="mt-1 text-xs leading-5 text-content-muted">{detail}</div> : null}
    </article>
  );
}
