import { Icon, PageHeader, StatusBadge, type IconName } from "@/components/ui";
import type { CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import type { EntityRow } from "@/lib/entities";
import type { PayrollAccrualRow } from "@/lib/payroll-accrual-service";

type PersonnelWorkspaceHeaderProps = {
  paymentMovements: CashBankMovementRow[];
  payrollAccruals: PayrollAccrualRow[];
  personnelRows: EntityRow[];
  siteRows: EntityRow[];
};

export function PersonnelWorkspaceHeader({
  paymentMovements,
  payrollAccruals,
  personnelRows,
  siteRows,
}: PersonnelWorkspaceHeaderProps) {
  const paidAccruals = payrollAccruals.filter((row) =>
    paymentMovements.some(
      (movement) =>
        movement.sourceType === "payroll-accrual" && movement.sourceId === row.id,
    ),
  );
  const paymentWaitingAccruals = payrollAccruals.filter(
    (row) =>
      row.status === "Kaydedildi" &&
      !paidAccruals.some((paidAccrual) => paidAccrual.id === row.id),
  );
  const activePersonnelCount = personnelRows.filter(
    (row) => row.status !== "Pasif",
  ).length;
  const activeSiteCount = siteRows.filter((row) => row.status === "Aktif").length;

  return (
    <section
      className="mx-auto flex max-w-7xl flex-col gap-4"
      data-personnel-workspace-header
    >
      <PageHeader
        actions={<StatusBadge tone="success"><Icon name="users" size={15} />{activePersonnelCount} aktif personel</StatusBadge>}
        description="Personel kartları, şantiye ekipman zimmetleri ve puantajdan oluşan maaş tahakkuklarını tek çalışma alanında yönetin."
        eyebrow="İnsan kaynakları ve bordro"
        title="Personel Yönetimi"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon="users"
            label="Toplam Personel"
            note={`${activePersonnelCount} aktif kayıt`}
            value={String(personnelRows.length)}
          />
          <Metric
            icon="building"
            label="Aktif Şantiyeler"
            note="Ekipman ve puantaj kapsamı"
            value={String(activeSiteCount)}
          />
          <Metric
            icon="wallet"
            label="Bekleyen Ödemeler"
            note={`${paymentWaitingAccruals.length} kesinleşmiş tahakkuk`}
            value={formatMoney(sumNetTotal(paymentWaitingAccruals))}
          />
          <Metric
            icon="check"
            label="Tamamlanan Ödemeler"
            note={`${paidAccruals.length} ödeme hareketi`}
            value={formatMoney(sumNetTotal(paidAccruals))}
          />
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  note,
  value,
}: {
  icon: IconName;
  label: string;
  note: string;
  value: string;
}) {
  return (
    <article className="rounded-ui-panel border border-divider border-l-4 border-l-brand-primary bg-surface-raised px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-content-muted">
        <Icon className="text-brand-primary" name={icon} size={18} />
        {label}
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-content">
        {value}
      </p>
      <p className="mt-1 text-xs text-content-muted">{note}</p>
    </article>
  );
}

function sumNetTotal(rows: PayrollAccrualRow[]) {
  return rows.reduce((total, row) => total + row.netTotal, 0);
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)} TL`;
}
