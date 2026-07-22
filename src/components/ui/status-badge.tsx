import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "./class-names";

export type StatusTone = "danger" | "info" | "neutral" | "success" | "warning";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  danger: "border-danger bg-danger-subtle text-danger",
  info: "border-info bg-info-subtle text-info",
  neutral: "border-divider bg-surface-muted text-content-subtle",
  success: "border-success bg-success-subtle text-success",
  warning: "border-warning bg-warning-subtle text-warning",
};

export function StatusBadge({
  children,
  className,
  tone = "neutral",
  ...props
}: StatusBadgeProps) {
  return (
    <span
      {...props}
      className={classNames(
        "inline-flex min-h-6 items-center gap-1.5 rounded-ui-control border px-2 py-0.5 text-xs font-semibold leading-4",
        toneClasses[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
