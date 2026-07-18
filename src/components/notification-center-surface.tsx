"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  buildNotificationCenterModel,
  listNotificationCategories,
  type NotificationCategoryKey,
  type NotificationCenterRow,
} from "@/lib/notification-center-service";

type NotificationCenterSurfaceProps = {
  initialEnabledCategoryKeys?: NotificationCategoryKey[];
  persistence?: {
    markAsRead?: (notificationId: string) => Promise<unknown> | unknown;
    setPreference?: (input: {
      categoryKey: NotificationCategoryKey;
      inAppEnabled: boolean;
    }) => Promise<unknown> | unknown;
  };
  rows: NotificationCenterRow[];
  today?: string;
};

const priorityClass: Record<string, string> = {
  Düşük: "bg-[var(--surface-container-low)] text-[var(--on-surface-variant)]",
  Normal: "bg-[var(--primary-fixed)] text-[var(--primary)]",
  Yüksek: "bg-[var(--status-process)] text-white",
  Kritik: "bg-[var(--status-cancelled)] text-white",
};

export function NotificationCenterSurface({
  initialEnabledCategoryKeys,
  persistence,
  rows,
  today,
}: NotificationCenterSurfaceProps) {
  const categories = useMemo(() => listNotificationCategories(), []);
  const [localRows, setLocalRows] = useState(rows);
  const [enabledCategoryKeys, setEnabledCategoryKeys] = useState<
    NotificationCategoryKey[]
  >(initialEnabledCategoryKeys ?? categories.map((category) => category.key));
  const model = buildNotificationCenterModel({
    enabledCategoryKeys,
    rows: localRows,
    today,
  });

  function toggleCategory(categoryKey: NotificationCategoryKey) {
    const isCurrentlyEnabled = enabledCategoryKeys.includes(categoryKey);
    const nextEnabled = !isCurrentlyEnabled;

    setEnabledCategoryKeys((current) =>
      isCurrentlyEnabled
        ? current.filter((key) => key !== categoryKey)
        : [...current, categoryKey],
    );
    void persistence?.setPreference?.({
      categoryKey,
      inAppEnabled: nextEnabled,
    });
  }

  function handleMarkAsRead(notificationId: string) {
    void Promise.resolve(persistence?.markAsRead?.(notificationId)).then(() => {
      setLocalRows((current) =>
        current.map((row) =>
          row.id === notificationId
            ? { ...row, readAt: row.readAt ?? new Date().toISOString() }
            : row,
        ),
      );
    });
  }

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          P1 bildirim ve hatırlatma
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Bildirim Merkezi
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
              Vade, stok, sözleşme, masraf ve operasyon uyarıları kategori
              bazında yönetilir; her bildirim ilgili kayıt ekranına bağlanır.
            </p>
          </div>
          <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-[var(--on-surface-variant)]">
            Okunmamış: {model.summary.unreadCount}
          </span>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Toplam Bildirim" value={model.summary.totalCount} />
        <StatCard label="Okunmamış" value={model.summary.unreadCount} />
        <StatCard label="Bugün" value={model.summary.todayCount} />
        <StatCard label="Bu Hafta" value={model.summary.weekCount} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <aside className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
          <div className="border-b border-[var(--grid-border)] px-4 py-3">
            <h2 className="text-sm font-semibold">Bildirim Kategorileri</h2>
          </div>
          <div className="divide-y divide-[var(--grid-border)]">
            {model.categoryStats.map((category) => (
              <label
                className="grid min-h-[var(--data-row-height)] cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-sm transition hover:bg-[var(--primary-fixed)]"
                key={category.key}
              >
                <input
                  checked={category.enabled}
                  className="h-4 w-4 accent-[var(--primary)]"
                  onChange={() => toggleCategory(category.key)}
                  type="checkbox"
                />
                <span className="min-w-0">
                  <span className="block font-semibold">{category.label}</span>
                  <span className="line-clamp-2 text-xs text-[var(--on-surface-variant)]">
                    {category.triggerSummary}
                  </span>
                </span>
                <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-1 font-mono text-xs font-semibold text-[var(--on-surface-variant)]">
                  {category.unreadCount}/{category.totalCount}
                </span>
              </label>
            ))}
          </div>
        </aside>

        <div className="grid gap-4">
          <section className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
            <div className="border-b border-[var(--grid-border)] px-4 py-3">
              <h2 className="text-sm font-semibold">Bildirimler</h2>
            </div>
            {model.rows.length > 0 ? (
              <div className="divide-y divide-[var(--grid-border)]">
                {model.rows.map((row) => (
                  <article
                    className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center"
                    key={row.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{row.title}</h3>
                        <span
                          className={`rounded-[var(--radius-control)] px-2 py-1 text-xs font-semibold ${priorityClass[row.priority]}`}
                        >
                          {row.priority}
                        </span>
                        {row.readAt === null ? (
                          <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-1 text-xs font-semibold text-[var(--primary)]">
                            okunmamış
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
                        {row.body}
                      </p>
                      <p className="mt-2 font-mono text-xs text-[var(--on-surface-variant)]">
                        {formatNotificationDate(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {row.readAt === null ? (
                        <button
                          aria-label={`${row.targetLabel} bildirimini okundu işaretle`}
                          className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold transition hover:bg-[var(--primary-fixed)]"
                          onClick={() => handleMarkAsRead(row.id)}
                          type="button"
                        >
                          Okundu
                        </button>
                      ) : null}
                      <Link
                        aria-label={`${row.targetLabel} kaydına git`}
                        className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold transition hover:bg-[var(--primary-fixed)]"
                        href={row.targetHref}
                      >
                        {row.targetLabel}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-sm font-semibold text-[var(--on-surface-variant)]">
                Seçili kategorilerde bildirim yok.
              </div>
            )}
          </section>

          <section className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
            <div className="border-b border-[var(--grid-border)] px-4 py-3">
              <h2 className="text-sm font-semibold">Öncelik Dağılımı</h2>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-4">
              {model.priorityStats.map((priority) => (
                <article
                  className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-3"
                  key={priority.label}
                >
                  <p className="text-xs font-semibold text-[var(--on-surface-variant)]">
                    {priority.label}
                  </p>
                  <p className="mt-2 font-mono text-xl font-semibold">
                    {priority.count}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article
      aria-label={label}
      className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4"
    >
      <h2 className="text-sm font-semibold text-[var(--on-surface-variant)]">
        {label}
      </h2>
      <p className="mt-3 font-mono text-2xl font-semibold">{value}</p>
    </article>
  );
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
