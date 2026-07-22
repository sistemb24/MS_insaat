import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "./class-names";
import { Icon, type IconName } from "./icon";

export type SurfaceStateKind = "empty" | "error" | "loading";

type SurfaceStateProps = HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode;
  description?: ReactNode;
  kind: SurfaceStateKind;
  title: ReactNode;
};

const statePresentation: Record<
  SurfaceStateKind,
  { icon: IconName; iconClassName: string; role: "alert" | "status" }
> = {
  empty: { icon: "empty", iconClassName: "bg-surface-muted text-content-subtle", role: "status" },
  error: { icon: "error", iconClassName: "bg-error-subtle text-error", role: "alert" },
  loading: {
    icon: "loader",
    iconClassName: "bg-brand-primary-subtle text-brand-primary",
    role: "status",
  },
};

export function SurfaceState({
  actions,
  className,
  description,
  kind,
  title,
  ...props
}: SurfaceStateProps) {
  const presentation = statePresentation[kind];

  return (
    <div
      {...props}
      aria-atomic="true"
      aria-busy={kind === "loading" || undefined}
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={classNames(
        "flex min-h-40 flex-col items-center justify-center rounded-ui-panel border border-dashed border-divider bg-surface-raised px-5 py-8 text-center text-content",
        className,
      )}
      role={presentation.role}
    >
      <span
        aria-hidden="true"
        className={classNames(
          "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full",
          presentation.iconClassName,
        )}
      >
        <Icon className={kind === "loading" ? "animate-spin" : undefined} name={presentation.icon} />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <div className="mt-1 max-w-lg text-sm text-content-subtle">{description}</div> : null}
      {actions ? <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
