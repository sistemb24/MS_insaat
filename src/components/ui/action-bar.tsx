import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "./class-names";

type ActionBarProps = HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode;
  children?: ReactNode;
  resultSummary?: ReactNode;
};

export function ActionBar({ actions, children, className, resultSummary, ...props }: ActionBarProps) {
  return (
    <div
      {...props}
      className={classNames(
        "flex flex-col gap-3 rounded-ui-panel border border-divider bg-surface-raised p-3 shadow-sm lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
      data-ui-action-bar="true"
    >
      {children ? <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">{children}</div> : null}
      <div className="flex flex-wrap items-center gap-2">
        {resultSummary ? <span className="mr-1 text-xs font-semibold text-content-muted">{resultSummary}</span> : null}
        {actions}
      </div>
    </div>
  );
}
