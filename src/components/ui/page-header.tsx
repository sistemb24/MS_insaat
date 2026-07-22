import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "./class-names";

type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  actions?: ReactNode;
  description: ReactNode;
  eyebrow: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
};

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  meta,
  title,
  ...props
}: PageHeaderProps) {
  return (
    <header
      {...props}
      className={classNames(
        "overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm",
        className,
      )}
      data-ui-page-header="true"
    >
      <div className="bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
          {eyebrow}
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-content sm:text-3xl">
              {title}
            </h1>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-content-muted">
              {description}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2" data-ui-page-actions="true">{actions}</div> : null}
        </div>
      </div>
      {meta ? <div className="border-t border-divider bg-surface-muted px-5 py-3 sm:px-6">{meta}</div> : null}
    </header>
  );
}
