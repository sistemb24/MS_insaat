import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { classNames } from "./class-names";

type PanelProps = Omit<ComponentPropsWithoutRef<"section">, "title"> & {
  actions?: ReactNode;
  description?: ReactNode;
  padding?: "md" | "none" | "sm";
  title?: ReactNode;
};

const paddingClasses = {
  md: "p-4 sm:p-5",
  none: "",
  sm: "p-3 sm:p-4",
} as const;

export function Panel({
  actions,
  children,
  className,
  description,
  padding = "md",
  title,
  ...props
}: PanelProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section
      {...props}
      className={classNames(
        "overflow-hidden rounded-ui-panel border border-divider bg-surface-raised text-content shadow-sm",
        className,
      )}
      data-ui-panel="true"
    >
      {hasHeader ? (
        <header className="flex flex-col gap-3 border-b border-divider px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0">
            {title ? <h2 className="text-xl font-semibold leading-7">{title}</h2> : null}
            {description ? (
              <div className="mt-1 text-sm leading-5 text-content-subtle">
                {description}
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={paddingClasses[padding]}>{children}</div>
    </section>
  );
}
