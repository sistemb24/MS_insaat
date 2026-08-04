"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getHrDashboardAction } from "@/app/actions/hr-dashboard-actions";
import { Icon, type IconName } from "@/components/ui";
import type {
  HrDashboardSnapshot,
  HrDashboardWorkItem,
} from "@/lib/hr-dashboard";

export function HrDashboardSurface() {
  const [snapshot, setSnapshot] = useState<HrDashboardSnapshot | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    const result = await getHrDashboardAction();
    if (!result.ok) {
      setSnapshot(null);
      setError(result.errors.join(" "));
      return;
    }
    setSnapshot(result.data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return (
    <section
      aria-label="İK Operasyon Dashboard"
      className="mx-auto grid max-w-7xl gap-4"
      data-hr-dashboard
    >
      <header className="rounded-ui-panel border border-divider bg-surface-raised shadow-sm print:shadow-none">
        <div className="border-l-4 border-brand-primary p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
            Faz 23 · Salt-okunur operasyon görünümü
          </p>
          <h2 className="mt-1 text-2xl font-bold text-content">
            İK Operasyon Dashboard
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">
            Personel dağılımını, yaklaşan İK işlerini, eğitimleri ve taslak
            puantajları kaynak kayıtları değiştirmeden birlikte izleyin.
          </p>
        </div>
      </header>

      {error ? (
        <div
          className="rounded-ui-panel border border-danger/30 bg-danger-subtle p-4 text-sm text-danger"
          role="alert"
        >
          <p>{error}</p>
          <button
            className="mt-3 min-h-11 rounded-ui-control border border-danger/40 px-3 py-2 font-semibold print:hidden"
            onClick={() => { void refresh(); }}
            type="button"
          >
            Yeniden dene
          </button>
        </div>
      ) : !snapshot ? (
        <p
          className="rounded-ui-panel border border-divider bg-surface-raised p-6 text-sm text-content-muted"
          role="status"
        >
          İK operasyon özeti yükleniyor…
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon="users" label="Toplam personel" value={snapshot.personnel.total} note={`${snapshot.personnel.active} aktif kart`} />
            <Metric icon="calendar" label="Bugün izinli" value={snapshot.personnel.onLeaveToday} note={formatDate(snapshot.asOfDate)} />
            <Metric icon="warning" label="Bekleyen işler" value={snapshot.workQueue.total} note="İzin, avans ve transfer" />
            <Metric icon="file" label="Taslak puantaj" value={snapshot.draftTimesheets.length} note="Yalnız mevcut taslaklar" />
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Panel
              description={`${snapshot.personnel.active} aktif personelin kartındaki güncel şantiye bilgisi`}
              icon="building"
              title="Şantiye bazlı personel dağılımı"
            >
              {snapshot.siteDistribution.length ? (
                <div className="grid gap-3">
                  {snapshot.siteDistribution.map((row) => (
                    <div key={row.siteName}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-content">{row.siteName}</span>
                        <span className="font-mono text-content-muted">
                          {row.count} · %{formatPercentage(row.percentage)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          aria-hidden="true"
                          className="h-full rounded-full bg-brand-primary"
                          style={{ width: `${row.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <Empty text="Aktif personel dağılımı bulunmuyor." />}
            </Panel>

            <Panel
              description="Kaynak iş akışına güvenli deep-link ile ilerleyin"
              icon="warning"
              title="Bekleyen iş kuyruğu"
            >
              <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <QueueCount label="İzin" value={snapshot.workQueue.leave} />
                <QueueCount label="Yönetici avans" value={snapshot.workQueue.advanceManager} />
                <QueueCount label="Finans avans" value={snapshot.workQueue.advanceFinance} />
                <QueueCount label="Ödeme" value={snapshot.workQueue.advancePayment} />
                <QueueCount label="Açık alacak" value={snapshot.workQueue.advanceReceivable} />
                <QueueCount label="Transfer" value={snapshot.workQueue.transfer} />
              </dl>
              {snapshot.workItems.length ? (
                <ul className="grid gap-2">
                  {snapshot.workItems.map((row) => (
                    <li key={`${row.kind}-${row.id}`}>
                      <Link
                        className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-ui-control border border-divider bg-surface px-3 py-2 text-sm transition hover:border-brand-primary print:border-0 print:px-0"
                        href={row.href}
                      >
                        <span>
                          <strong className="text-content">{row.personnelName}</strong>
                          <span className="ml-2 text-content-muted">{workKindLabel(row)}</span>
                        </span>
                        <span className="font-mono text-xs text-content-muted">
                          {formatDate(row.date)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <Empty text="Bekleyen İK işi bulunmuyor." />}
            </Panel>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-3">
            <Panel
              description={`${formatDate(snapshot.asOfDate)} – ${formatDate(snapshot.windowEndDate)}`}
              icon="calendar"
              title="Yaklaşan izinler"
            >
              {snapshot.upcomingLeaves.length ? (
                <ul className="grid gap-2">
                  {snapshot.upcomingLeaves.map((row) => (
                    <li key={row.id}>
                      <Link className={linkClass} href={row.href}>
                        <strong className="text-content">{row.personnelName}</strong>
                        <span className="text-xs text-content-muted">
                          {leaveTypeLabel(row.leaveType)} · {formatDate(row.startDate)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <Empty text="30 gün içinde başlayacak onaylı izin yok." />}
            </Panel>

            <Panel
              description="Hedef kitle veya eksik katılım sonucu üretilmez"
              icon="check"
              title="Yaklaşan İSG eğitimleri"
            >
              {snapshot.upcomingTrainings.length ? (
                <ul className="grid gap-2">
                  {snapshot.upcomingTrainings.map((row) => (
                    <li key={row.id}>
                      <Link className={linkClass} href={row.href}>
                        <strong className="text-content">{row.name}</strong>
                        <span className="text-xs text-content-muted">
                          {formatDate(row.date)} · {row.attendanceCount} kayıtlı katılım
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <Empty text="30 günlük pencerede eğitim bulunmuyor." />}
            </Panel>

            <Panel
              description="Hiç açılmamış dönem için eksik alarmı üretilmez"
              icon="file"
              title="Tamamlanmamış puantajlar"
            >
              {snapshot.draftTimesheets.length ? (
                <ul className="grid gap-2">
                  {snapshot.draftTimesheets.map((row) => (
                    <li key={row.id}>
                      <Link className={linkClass} href={row.href}>
                        <strong className="text-content">{row.documentNo}</strong>
                        <span className="text-xs text-content-muted">
                          {monthLabel(row.month)} {row.year} · {row.siteName} · {row.lineCount} satır
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <Empty text="Taslak puantaj bulunmuyor." />}
            </Panel>
          </div>
        </>
      )}
    </section>
  );
}

const linkClass =
  "flex min-h-11 flex-col justify-center rounded-ui-control border border-divider bg-surface px-3 py-2 text-sm transition hover:border-brand-primary print:border-0 print:px-0";

function Metric({ icon, label, note, value }: {
  icon: IconName;
  label: string;
  note: string;
  value: number;
}) {
  return (
    <article className="rounded-ui-panel border border-divider border-l-4 border-l-brand-primary bg-surface-raised px-5 py-4 shadow-sm print:shadow-none">
      <div className="flex items-center gap-2 text-sm font-semibold text-content-muted">
        <Icon className="text-brand-primary" name={icon} size={18} />
        {label}
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold text-content">{value}</p>
      <p className="mt-1 text-xs text-content-muted">{note}</p>
    </article>
  );
}
function Panel({ children, description, icon, title }: {
  children: React.ReactNode;
  description: string;
  icon: IconName;
  title: string;
}) {
  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm print:break-inside-avoid print:shadow-none">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-ui-control bg-brand-primary-soft p-2 text-brand-primary">
          <Icon name={icon} size={18} />
        </span>
        <div>
          <h3 className="font-bold text-content">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-content-muted">{description}</p>
        </div>
      </div>
      {children}
    </article>
  );
}
function QueueCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-ui-control bg-surface-muted px-3 py-2">
      <dt className="text-xs text-content-muted">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold text-content">{value}</dd>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-ui-control border border-dashed border-divider p-4 text-sm text-content-muted">
      {text}
    </p>
  );
}
function workKindLabel(row: HrDashboardWorkItem) {
  if (row.kind === "leave") return "İzin onayı";
  if (row.kind === "transfer") return "Transfer onayı";
  return {
    FINANCE_APPROVED: "Avans ödemesi",
    MANAGER_APPROVED: "Avans finans onayı",
    PAID: "Avans mahsubu",
    SUBMITTED: "Avans yönetici onayı",
  }[row.status] ?? "Avans işlemi";
}
function leaveTypeLabel(value: string) {
  return {
    ANNUAL: "Yıllık izin",
    EXCUSE: "Mazeret",
    MATERNITY: "Doğum",
    PATERNITY: "Babalık",
    SICK: "Hastalık",
    UNPAID: "Ücretsiz",
  }[value] ?? value;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
function formatPercentage(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(value);
}
function monthLabel(month: number) {
  return new Intl.DateTimeFormat("tr-TR", { month: "long" })
    .format(new Date(Date.UTC(2026, month - 1, 1)));
}
