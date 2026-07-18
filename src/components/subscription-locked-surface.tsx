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
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          Abonelik erişimi
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Paket yükseltme gerekli
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
              {routeLabel} modülünün iş akışı korunur; bu tenant için erişim
              aktif olduğunda aynı SaaS ekranı açılır.
            </p>
          </div>
          <div className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-[var(--on-surface-variant)]">
            Gereken paket: {access.requiredPlan}
          </div>
        </div>
      </header>

      <section className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <h2 className="text-sm font-semibold">{access.label}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
          {access.label} için {access.reason}
        </p>
        <Link
          className="mt-4 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
          href="/abonelik"
        >
          Aboneliği Yönet
        </Link>
      </section>
    </section>
  );
}
