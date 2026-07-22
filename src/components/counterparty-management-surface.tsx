import Link from "next/link";

import {
  EntityListSurface,
  type EntityListSurfaceProps,
} from "@/components/entity-list-surface";
import { Icon, type IconName } from "@/components/ui";
import { buildCounterpartyOverview } from "@/lib/counterparty-overview";

export function CounterpartyManagementSurface(props: EntityListSurfaceProps) {
  const overview = buildCounterpartyOverview(props.statementRows ?? []);

  if (["musteriler", "tedarikciler", "taseronlar"].includes(props.definition.slug)) {
    const isSupplier = props.definition.slug === "tedarikciler";
    const isSubcontractor = props.definition.slug === "taseronlar";
    const singularLabel = isSubcontractor
      ? "Taşeron"
      : isSupplier
        ? "Tedarikçi"
        : "Müşteri";
    const pluralLabel = isSubcontractor
      ? "Taşeronlar"
      : isSupplier
        ? "Tedarikçiler"
        : "Müşteriler";
    const counterpartyRows = props.initialRows ?? props.definition.sampleRows;
    const totalCounterparties = counterpartyRows.length;
    const activeCounterparties = counterpartyRows.filter(
      (row) => row.status === "Aktif",
    ).length;
    const contractedSubcontractors = counterpartyRows.filter(
      (row) => Boolean(row.contractNo?.trim()),
    ).length;

    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <nav aria-label="İçerik yolu" className="text-xs font-semibold text-content-muted">
              Firmalar / {pluralLabel}
            </nav>
            <h1 className="mt-2 text-3xl font-bold leading-[2.375rem] tracking-[-0.02em] text-content">
              {pluralLabel}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-content-subtle">
              {isSubcontractor
                ? "Alt yüklenici sözleşmelerini, hakediş bağlantılarını, ödemeleri ve hesap ekstrelerini aynı çalışma alanında yönetin."
                : isSupplier
                ? "Malzeme ve hizmet tedarikçisi cari kartlarını, alış faturası bağlantılarını, ödemeleri ve hesap ekstrelerini aynı çalışma alanında yönetin."
                : "Müşteri cari kartlarını, tahsilat hareketlerini ve hesap ekstrelerini aynı çalışma alanında yönetin."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSupplier ? (
              <Link
                className="inline-flex min-h-10 items-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 text-xs font-semibold text-content transition-colors hover:border-brand-primary hover:text-brand-primary"
                href="/faturalar"
              >
                <Icon name="receipt" size={17} />
                Alış faturalarına git
              </Link>
            ) : null}
            {isSubcontractor ? (
              <Link
                className="inline-flex min-h-10 items-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 text-xs font-semibold text-content transition-colors hover:border-brand-primary hover:text-brand-primary"
                href="/hakedis"
              >
                <Icon name="chart" size={17} />
                Hakedişlere git
              </Link>
            ) : null}
            <div className="inline-flex items-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content-subtle shadow-sm">
              <Icon name="users" size={18} />
              {overview.movementCount} cari hareket
            </div>
          </div>
        </header>

        <div
          aria-label={`${singularLabel} özet metrikleri`}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <CounterpartySummaryCard
            icon="users"
            label={`Toplam ${singularLabel}`}
            value={String(totalCounterparties)}
          />
          <CounterpartySummaryCard
            icon="check"
            label={`Aktif ${singularLabel}`}
            tone="success"
            value={String(activeCounterparties)}
          />
          {isSubcontractor ? (
            <CounterpartySummaryCard
              icon="receipt"
              label="Sözleşmeli Taşeron"
              value={String(contractedSubcontractors)}
            />
          ) : (
            <CounterpartySummaryCard
              compact
              icon="chart"
              label="Toplam Alacak"
              tone="success"
              value={formatMoney(overview.receivableTotal)}
            />
          )}
          <CounterpartySummaryCard
            compact
            icon="wallet"
            label="Toplam Borç"
            tone="warning"
            value={formatMoney(overview.payableTotal)}
          />
        </div>

        <EntityListSurface
          {...props}
          visualVariant={
            isSubcontractor
              ? "subcontractor"
              : isSupplier
                ? "supplier"
                : "customer"
          }
        />
      </section>
    );
  }

  const workflow = getWorkflow(props.definition.slug);

  return (
    <div className="grid gap-4">
      <section className="rounded-ui-panel border border-divider bg-surface-raised p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-primary">
              Cari yönetim özeti
            </p>
            <h1 className="mt-1 text-xl font-semibold">
              {props.definition.title} hareket görünümü
            </h1>
          </div>
          {workflow ? (
            <Link
              className="rounded-ui-control border border-divider px-3 py-2 text-xs font-semibold"
              href={workflow.href}
            >
              {workflow.label}
            </Link>
          ) : null}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <LegacyMetric label="Toplam alacak" value={overview.receivableTotal} />
          <LegacyMetric label="Toplam borç" value={overview.payableTotal} />
          <div className="rounded border border-divider p-3">
            <p className="text-xs text-content-subtle">Cari hareket</p>
            <p className="mt-1 text-lg font-semibold">{overview.movementCount}</p>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-divider">
                <th className="px-2 py-2">Cari</th>
                <th className="px-2 py-2 text-right">Hareket</th>
                <th className="px-2 py-2 text-right">Bakiye</th>
                <th className="px-2 py-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {overview.counterparties.map((row) => (
                <tr
                  className="border-b border-divider last:border-0"
                  key={row.counterpartyName}
                >
                  <td className="px-2 py-2 font-semibold">{row.counterpartyName}</td>
                  <td className="px-2 py-2 text-right">{row.movementCount}</td>
                  <td className="px-2 py-2 text-right font-semibold">
                    {formatMoney(Math.abs(row.balance))}
                  </td>
                  <td className="px-2 py-2">
                    {row.balance > 0 ? "Alacak" : row.balance < 0 ? "Borç" : "Kapalı"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!overview.counterparties.length ? (
            <p className="py-3 text-xs text-content-subtle">
              Henüz cari hareket yok.
            </p>
          ) : null}
        </div>
      </section>
      <EntityListSurface {...props} />
    </div>
  );
}

function CounterpartySummaryCard({
  compact = false,
  icon,
  label,
  tone = "brand",
  value,
}: {
  compact?: boolean;
  icon: IconName;
  label: string;
  tone?: "brand" | "success" | "warning";
  value: string;
}) {
  const toneClasses = {
    brand: "bg-brand-primary-subtle text-brand-primary",
    success: "bg-success-subtle text-success",
    warning: "bg-warning-subtle text-warning",
  }[tone];

  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-subtle">
          {label}
        </p>
        <span
          className={
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-control " +
            toneClasses
          }
        >
          <Icon name={icon} size={19} />
        </span>
      </div>
      <p
        className={
          "mt-5 font-mono font-semibold tabular-nums text-content " +
          (compact ? "text-lg leading-7" : "text-2xl")
        }
      >
        {value}
      </p>
    </article>
  );
}

function LegacyMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-divider p-3">
      <p className="text-xs text-content-subtle">{label}</p>
      <p className="mt-1 text-lg font-semibold">{formatMoney(value)}</p>
    </div>
  );
}

function getWorkflow(slug: string) {
  if (slug === "tedarikciler") {
    return { href: "/faturalar", label: "Alış faturalarına git" };
  }

  if (slug === "taseronlar") {
    return { href: "/hakedis", label: "Hakedişlere git" };
  }

  return undefined;
}

function formatMoney(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL";
}
