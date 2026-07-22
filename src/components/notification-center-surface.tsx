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
  Düşük: "bg-surface-muted text-content-muted",
  Normal: "bg-brand-primary-subtle text-brand-primary",
  Yüksek: "bg-warning-subtle text-warning",
  Kritik: "bg-danger-subtle text-danger",
};

const readFilters = ["Tümü", "Okunmamış", "Okundu"] as const;

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
  const [readFilter, setReadFilter] = useState<(typeof readFilters)[number]>("Tümü");
  const [searchQuery, setSearchQuery] = useState("");
  const baseModel = buildNotificationCenterModel({
    enabledCategoryKeys,
    rows: localRows,
    today,
  });
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("tr-TR");
  const filteredRows = baseModel.rows.filter((row) => {
    const matchesReadFilter =
      readFilter === "Tümü" ||
      (readFilter === "Okunmamış" ? row.readAt === null : row.readAt !== null);
    const matchesSearch =
      !normalizedSearchQuery ||
      [row.title, row.body, row.targetLabel, row.priority].some((value) =>
        value.toLocaleLowerCase("tr-TR").includes(normalizedSearchQuery),
      );

    return matchesReadFilter && matchesSearch;
  });
  const model = buildNotificationCenterModel({
    enabledCategoryKeys,
    rows: filteredRows,
    today,
  });
  const unreadRows = model.rows.filter((row) => row.readAt === null);
  const readRows = model.rows.filter((row) => row.readAt !== null);

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

  async function handleMarkAllVisibleAsRead() {
    await Promise.all(
      unreadRows.map((row) =>
        Promise.resolve(persistence?.markAsRead?.(row.id)),
      ),
    );
    const visibleUnreadIds = new Set(unreadRows.map((row) => row.id));

    setLocalRows((current) =>
      current.map((row) =>
        visibleUnreadIds.has(row.id)
          ? { ...row, readAt: row.readAt ?? new Date().toISOString() }
          : row,
      ),
    );
  }

  return (
    <section
      className="mx-auto flex max-w-[1440px] flex-col gap-4"
      data-notification-center-workspace="true"
    >
      <header className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
          Operasyon · Uyarı ve hatırlatma
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-content sm:text-3xl">
              Bildirim Merkezi
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-content-muted">
              Vade, stok, sözleşme, masraf ve operasyon uyarıları kategori
              bazında yönetilir; her bildirim ilgili kayıt ekranına bağlanır.
            </p>
          </div>
          <button
            className="h-10 rounded-ui-control border border-divider bg-surface-raised px-4 text-sm font-semibold text-brand-primary shadow-sm transition hover:border-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={unreadRows.length === 0}
            onClick={() => void handleMarkAllVisibleAsRead()}
            type="button"
          >
            Tümünü Okundu İşaretle
          </button>
        </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Toplam Bildirim" value={model.summary.totalCount} />
        <StatCard label="Okunmamış" value={model.summary.unreadCount} />
        <StatCard label="Bugün" value={model.summary.todayCount} />
        <StatCard label="Bu Hafta" value={model.summary.weekCount} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="self-start rounded-ui-panel border border-divider bg-surface-raised shadow-sm xl:sticky xl:top-[calc(var(--ds-app-header-height)+1.5rem)]">
          <div className="border-b border-divider px-4 py-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">Bildirim Kategorileri</h2>
            <p className="mt-1 text-xs text-content-muted">Uygulama içi tercihlerinizi yönetin.</p>
          </div>
          <div className="divide-y divide-divider">
            {baseModel.categoryStats.map((category) => (
              <label
                className="grid min-h-[var(--ds-data-row-height)] cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-sm transition hover:bg-surface-muted"
                key={category.key}
              >
                <input
                  checked={category.enabled}
                  className="h-4 w-4 accent-brand-primary"
                  onChange={() => toggleCategory(category.key)}
                  type="checkbox"
                />
                <span className="min-w-0">
                  <span className="block font-semibold">{category.label}</span>
                  <span className="line-clamp-2 text-xs text-content-muted">
                    {category.triggerSummary}
                  </span>
                </span>
                <span className="rounded-ui-control border border-divider px-2 py-1 font-mono text-xs font-semibold text-content-muted">
                  {category.unreadCount}/{category.totalCount}
                </span>
              </label>
            ))}
          </div>
        </aside>

        <div className="min-w-0 grid gap-4">
          <section className="rounded-ui-panel border border-divider bg-surface-raised p-3 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-center">
              <label className="relative block">
                <span className="sr-only">Bildirimlerde ara</span>
                <input
                  aria-label="Bildirimlerde ara"
                  className="h-10 w-full rounded-ui-control border border-divider bg-surface px-3 text-sm text-content outline-none placeholder:text-content-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Başlık, içerik veya kayıt no ara"
                  type="search"
                  value={searchQuery}
                />
              </label>
              <div aria-label="Okunma durumu filtreleri" className="inline-flex h-10 overflow-hidden rounded-ui-control border border-divider bg-surface-muted">
                {readFilters.map((filter) => (
                  <button
                    aria-pressed={readFilter === filter}
                    className={`px-3 text-sm font-semibold ${readFilter === filter ? "bg-brand-primary text-on-brand" : "text-content-muted hover:bg-brand-primary-subtle hover:text-brand-primary"}`}
                    key={filter}
                    onClick={() => setReadFilter(filter)}
                    type="button"
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {model.rows.length > 0 ? (
            <>
              <NotificationGroup
                onMarkAsRead={handleMarkAsRead}
                rows={unreadRows}
                title="Yeni Bildirimler"
              />
              <NotificationGroup
                onMarkAsRead={handleMarkAsRead}
                rows={readRows}
                title="Önceki Bildirimler"
              />
            </>
          ) : (
            <div className="rounded-ui-panel border border-divider bg-surface-raised px-4 py-10 text-center text-sm font-semibold text-content-muted shadow-sm" role="status">
              Arama ve filtrelere uygun bildirim yok.
            </div>
          )}

          <section className="rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
            <div className="border-b border-divider px-4 py-3">
              <h2 className="text-sm font-semibold">Öncelik Dağılımı</h2>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-4">
              {model.priorityStats.map((priority) => (
                <article
                  className="rounded-ui-control border border-divider bg-surface-muted p-3"
                  key={priority.label}
                >
                  <p className="text-xs font-semibold text-content-subtle">
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

function NotificationGroup({
  onMarkAsRead,
  rows,
  title,
}: {
  onMarkAsRead: (notificationId: string) => void;
  rows: NotificationCenterRow[];
  title: string;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
      <div className="flex items-center justify-between border-b border-divider px-4 py-3">
        <h2 className="text-sm font-bold text-content">{title}</h2>
        <span className="rounded-full bg-surface-muted px-2.5 py-1 font-mono text-xs font-semibold text-content-muted">{rows.length}</span>
      </div>
      <div className="divide-y divide-divider">
        {rows.map((row) => (
          <article
            className={`grid gap-3 border-l-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${row.readAt === null ? "border-l-brand-primary bg-brand-primary-subtle/30" : "border-l-transparent"}`}
            key={row.id}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-content">{row.title}</h3>
                <span className={`rounded-ui-control px-2 py-1 text-xs font-semibold ${priorityClass[row.priority]}`}>{row.priority}</span>
                {row.readAt === null ? (
                  <span className="inline-flex items-center" title="Okunmamış">
                    <span className="h-2 w-2 rounded-full bg-brand-primary" />
                    <span className="sr-only">okunmamış</span>
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-content-muted">{row.body}</p>
              <p className="mt-2 font-mono text-xs text-content-muted">{formatNotificationDate(row.createdAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {row.readAt === null ? (
                <button
                  aria-label={`${row.targetLabel} bildirimini okundu işaretle`}
                  className="inline-flex h-9 items-center justify-center rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content transition hover:border-brand-primary hover:text-brand-primary"
                  onClick={() => onMarkAsRead(row.id)}
                  type="button"
                >
                  Okundu
                </button>
              ) : null}
              <Link
                aria-label={`${row.targetLabel} kaydına git`}
                className="inline-flex h-9 items-center justify-center rounded-ui-control bg-brand-primary px-3 text-sm font-semibold text-on-brand transition hover:opacity-90"
                href={row.targetHref}
              >
                {row.targetLabel}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article
      aria-label={label}
      className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-content-muted">
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
