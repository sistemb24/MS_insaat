// src/components/super-admin/auth-card.tsx

type SuperAdminAuthCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function SuperAdminAuthCard({
  title,
  description,
  children,
  footer,
}: SuperAdminAuthCardProps) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-ui-control focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-content focus:outline-none focus:ring-2 focus:ring-brand-primary"
      >
        Ana içeriğe geç
      </a>
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-[var(--ds-surface)] px-4 py-10 text-content"
      >
        <div className="w-full max-w-[440px]">
          <section className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised p-6 shadow-sm">
            {/* NOA Brand Mark */}
            <div className="mb-6 flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-ui-panel bg-brand-primary text-sm font-bold text-on-brand"
              >
                NOA
              </div>
              <div>
                <h1 className="text-lg font-semibold text-content">{title}</h1>
                {description ? (
                  <p className="text-sm text-content-subtle">{description}</p>
                ) : null}
              </div>
            </div>
            {children}
          </section>
          {footer ? (
            <div className="mt-4 text-center text-xs text-content-muted">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
