import Link from "next/link";

import type { SubscriptionFeatureAccessRow } from "@/lib/subscription-service";

type SubscriptionLockedSurfaceProps = {
  access: SubscriptionFeatureAccessRow;
  routeLabel: string;
};

export function SubscriptionLockedSurface({
  access,
  routeLabel,
}: SubscriptionLockedSurfaceProps) {
  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-ui-panel border border-divider bg-surface-raised p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
          Abonelik erişimi
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Paket yükseltme gerekli
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-content-subtle">
              {routeLabel} modülünün iş akışı korunur; bu tenant için erişim
              aktif olduğunda aynı SaaS ekranı açılır.
            </p>
          </div>
          <div className="rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-xs font-semibold text-content-subtle">
            Gereken paket: {access.requiredPlan}
          </div>
        </div>
      </header>

      <section className="rounded-ui-panel border border-divider bg-surface-raised p-5">
        <h2 className="text-sm font-semibold">{access.label}</h2>
        <p className="mt-2 text-sm leading-6 text-content-subtle">
          {access.label} için {access.reason}
        </p>
        <Link
          className="mt-4 inline-flex h-9 items-center rounded-ui-control bg-brand-primary px-3 text-sm font-semibold text-on-brand transition hover:bg-brand-primary-strong"
          href="/abonelik"
        >
          Aboneliği Yönet
        </Link>
      </section>
    </section>
  );
}
