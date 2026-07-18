"use client";

import { useMemo, useState } from "react";

import {
  API_KEY_SCOPES,
  type ApiKeyOverview,
  type ApiKeyRow,
  type ApiKeyScope,
  type ApiKeyStatus,
  type CreateApiKeyValues,
} from "@/lib/api-key-contract";
import type { WebhookEndpointOverview } from "@/lib/webhook-endpoint-service";
import {
  WEBHOOK_DELIVERY_EVENT_TYPES,
  formatWebhookDeliveryEventType,
} from "@/lib/webhook-delivery-events";
import type { TenantUserRole } from "@/lib/tenant-scope";

type ApiKeyActionResult =
  | { ok: false; errors: string[] }
  | { ok: true; data: { row: ApiKeyRow; secret: string } };

type RevokeApiKeyActionResult =
  | { ok: false; errors: string[] }
  | { ok: true; data: { row: ApiKeyRow } };

type ApiKeyManagementSurfaceProps = {
  overview: ApiKeyOverview;
  webhookEndpointOverview?: WebhookEndpointOverview;
  userRole: TenantUserRole;
  persistence: {
    createKey(values: CreateApiKeyValues): Promise<ApiKeyActionResult>;
    createWebhookEndpoint(values: {
      eventTypes: string[];
      name: string;
      url: string;
    }): Promise<
      | { ok: false; errors: string[] }
      | { ok: true; data: { row: WebhookEndpointOverview["rows"][number]; secret: string } }
    >;
    updateWebhookEndpoint(
      id: string,
      values: {
        eventTypes: string[];
        name: string;
        url: string;
      },
    ): Promise<
      | { ok: false; errors: string[] }
      | { ok: true; data: { row: WebhookEndpointOverview["rows"][number] } }
    >;
    deactivateWebhookEndpoint(id: string): Promise<
      | { ok: false; errors: string[] }
      | { ok: true; data: { row: WebhookEndpointOverview["rows"][number] } }
    >;
    activateWebhookEndpoint?(id: string): Promise<
      | { ok: false; errors: string[] }
      | { ok: true; data: { row: WebhookEndpointOverview["rows"][number] } }
    >;
    rotateWebhookEndpointSecret(id: string): Promise<
      | { ok: false; errors: string[] }
      | { ok: true; data: { row: WebhookEndpointOverview["rows"][number]; secret: string } }
    >;
    revokeKey(id: string): Promise<RevokeApiKeyActionResult>;
  };
};

export function ApiKeyManagementSurface({
  overview,
  persistence,
  webhookEndpointOverview,
  userRole,
}: ApiKeyManagementSurfaceProps) {
  const [rows, setRows] = useState(overview.rows);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [rateLimit, setRateLimit] = useState("10");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [revealedSecret, setRevealedSecret] = useState("");
  const [pending, setPending] = useState(false);
  const [webhookEndpointRows, setWebhookEndpointRows] = useState(
    webhookEndpointOverview?.rows ?? [],
  );
  const [endpointName, setEndpointName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [endpointErrors, setEndpointErrors] = useState<string[]>([]);
  const [endpointMessage, setEndpointMessage] = useState("");
  const [revealedEndpointSecret, setRevealedEndpointSecret] = useState("");
  const [endpointPending, setEndpointPending] = useState(false);
  const [editingWebhookEndpointId, setEditingWebhookEndpointId] = useState("");
  const [editingEndpointName, setEditingEndpointName] = useState("");
  const [editingEndpointUrl, setEditingEndpointUrl] = useState("");
  const [editingSelectedEventTypes, setEditingSelectedEventTypes] = useState<string[]>([]);
  const [editingEndpointErrors, setEditingEndpointErrors] = useState<string[]>([]);
  const [editingEndpointMessage, setEditingEndpointMessage] = useState("");
  const [editingEndpointPending, setEditingEndpointPending] = useState(false);
  const [deactivatePendingId, setDeactivatePendingId] = useState("");
  const [activatePendingId, setActivatePendingId] = useState("");
  const [rotatePendingId, setRotatePendingId] = useState("");
  const [revokeCandidate, setRevokeCandidate] = useState<ApiKeyRow | null>(null);
  const [webhookEndpointSearchText, setWebhookEndpointSearchText] = useState("");
  const [webhookEndpointStatusFilter, setWebhookEndpointStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [webhookEndpointEventTypeFilter, setWebhookEndpointEventTypeFilter] = useState<
    "all" | (typeof WEBHOOK_DELIVERY_EVENT_TYPES)[number]["type"]
  >("all");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApiKeyStatus | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<ApiKeyScope | "all">("all");
  const [usageFilter, setUsageFilter] = useState<"all" | "used" | "unused">("all");
  const [lastUsedStartDate, setLastUsedStartDate] = useState("");
  const [lastUsedEndDate, setLastUsedEndDate] = useState("");
  const hasInvalidLastUsedDateRange = Boolean(
    lastUsedStartDate && lastUsedEndDate && lastUsedStartDate > lastUsedEndDate,
  );
  const canManage = userRole === "admin";
  const summary = useMemo(
    () => ({
      activeCount: rows.filter((row) => row.status === "active").length,
      expiredCount: rows.filter((row) => row.status === "expired").length,
      revokedCount: rows.filter((row) => row.status === "revoked").length,
      totalCount: rows.length,
    }),
    [rows],
  );
  const usageSummary = useMemo(
    () => ({
      usedCount: rows.filter((row) => Boolean(row.lastUsedAt)).length,
      unusedCount: rows.filter((row) => !row.lastUsedAt).length,
    }),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const normalizedSearchText = searchText.trim().toLocaleLowerCase("tr-TR");

    return rows.filter((row) => {
      const searchableText = [
        row.name,
        row.keyPrefix,
        row.createdBy,
        row.lastUsedAt,
        row.status,
        formatScopeLabels(row.scopes),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch =
        normalizedSearchText.length === 0 ||
        searchableText.includes(normalizedSearchText);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesScope =
        scopeFilter === "all" || row.scopes.includes(scopeFilter);
      const matchesUsage =
        usageFilter === "all" ||
        (usageFilter === "used" && Boolean(row.lastUsedAt)) ||
        (usageFilter === "unused" && !row.lastUsedAt);
      const rowLastUsedDate = row.lastUsedAt ? getApiKeyLocalDateKey(row.lastUsedAt) : "";
      const matchesLastUsedDateRange =
        !hasInvalidLastUsedDateRange &&
        (!lastUsedStartDate || rowLastUsedDate >= lastUsedStartDate) &&
        (!lastUsedEndDate || rowLastUsedDate <= lastUsedEndDate);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesScope &&
        matchesUsage &&
        matchesLastUsedDateRange
      );
    });
  }, [hasInvalidLastUsedDateRange, lastUsedEndDate, lastUsedStartDate, rows, scopeFilter, searchText, statusFilter, usageFilter]);
  const hasActiveFilters = Boolean(
    searchText.trim() ||
      statusFilter !== "all" ||
      scopeFilter !== "all" ||
      usageFilter !== "all" ||
      lastUsedStartDate ||
      lastUsedEndDate,
  );
  const webhookEndpointSummary = useMemo(
    () => ({
      activeCount: webhookEndpointRows.filter((row) => row.isActive).length,
      inactiveCount: webhookEndpointRows.filter((row) => !row.isActive).length,
      eventTypeCount: new Set(
        webhookEndpointRows.flatMap((row) => row.eventTypes),
      ).size,
      totalCount: webhookEndpointRows.length,
    }),
    [webhookEndpointRows],
  );
  const filteredWebhookEndpointRows = useMemo(() => {
    const normalizedSearchText = webhookEndpointSearchText.trim().toLocaleLowerCase("tr-TR");

    return webhookEndpointRows.filter((row) => {
      const searchableText = [
        row.name,
        row.url,
        row.createdBy,
        row.isActive ? "aktif" : "pasif",
        row.eventTypes.map((eventType) => formatWebhookDeliveryEventType(eventType)).join(" "),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch =
        normalizedSearchText.length === 0 ||
        searchableText.includes(normalizedSearchText);
      const matchesStatus =
        webhookEndpointStatusFilter === "all" ||
        (webhookEndpointStatusFilter === "active" && row.isActive) ||
        (webhookEndpointStatusFilter === "inactive" && !row.isActive);
      const matchesEventType =
        webhookEndpointEventTypeFilter === "all" ||
        row.eventTypes.includes(webhookEndpointEventTypeFilter);

      return matchesSearch && matchesStatus && matchesEventType;
    });
  }, [
    webhookEndpointEventTypeFilter,
    webhookEndpointRows,
    webhookEndpointSearchText,
    webhookEndpointStatusFilter,
  ]);
  const hasActiveWebhookEndpointFilters = Boolean(
    webhookEndpointSearchText.trim() ||
      webhookEndpointStatusFilter !== "all" ||
      webhookEndpointEventTypeFilter !== "all",
  );

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors([]);
    setMessage("");
    setRevealedSecret("");

    const result = await persistence.createKey({
      expiresAt,
      name,
      rateLimitPerSecond: Number(rateLimit),
      scopes,
    });

    if (!result.ok) {
      setErrors(result.errors);
      setPending(false);
      return;
    }

    setRows((current) => [result.data.row, ...current]);
    setRevealedSecret(result.data.secret);
    setMessage("API anahtarı oluşturuldu. Açık değeri şimdi güvenli bir yere kaydedin.");
    setName("");
    setScopes([]);
    setRateLimit("10");
    setExpiresAt("");
    setPending(false);
  }

  async function handleCreateWebhookEndpoint(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setEndpointPending(true);
    setEndpointErrors([]);
    setEndpointMessage("");
    setRevealedEndpointSecret("");

    const result = await persistence.createWebhookEndpoint({
      eventTypes: selectedEventTypes,
      name: endpointName,
      url: endpointUrl,
    });

    if (!result.ok) {
      setEndpointErrors(result.errors);
      setEndpointPending(false);
      return;
    }

    setWebhookEndpointRows((current) => [result.data.row, ...current]);
    setEndpointMessage("Webhook endpoint kaydı oluşturuldu.");
    setRevealedEndpointSecret(result.data.secret);
    setEndpointName("");
    setEndpointUrl("");
    setSelectedEventTypes([]);
    setEndpointPending(false);
  }

  function startEditingWebhookEndpoint(
    row: WebhookEndpointOverview["rows"][number],
  ) {
    setEditingWebhookEndpointId(row.id);
    setEditingEndpointName(row.name);
    setEditingEndpointUrl(row.url);
    setEditingSelectedEventTypes(row.eventTypes);
    setEditingEndpointErrors([]);
    setEditingEndpointMessage("");
    setEndpointErrors([]);
    setEndpointMessage("");
    setRevealedEndpointSecret("");
  }

  function cancelEditingWebhookEndpoint() {
    setEditingWebhookEndpointId("");
    setEditingEndpointName("");
    setEditingEndpointUrl("");
    setEditingSelectedEventTypes([]);
    setEditingEndpointErrors([]);
    setEditingEndpointMessage("");
    setEditingEndpointPending(false);
  }

  async function handleUpdateWebhookEndpoint(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingWebhookEndpointId) {
      return;
    }

    setEditingEndpointPending(true);
    setEditingEndpointErrors([]);
    setEditingEndpointMessage("");
    setEndpointErrors([]);
    setEndpointMessage("");

    const result = await persistence.updateWebhookEndpoint(editingWebhookEndpointId, {
      eventTypes: editingSelectedEventTypes,
      name: editingEndpointName,
      url: editingEndpointUrl,
    });

    if (!result.ok) {
      setEditingEndpointErrors(result.errors);
      setEditingEndpointPending(false);
      return;
    }

    setWebhookEndpointRows((current) =>
      current.map((row) => (row.id === result.data.row.id ? result.data.row : row)),
    );
    setEditingEndpointMessage("Webhook endpoint güncellendi.");
    setEndpointMessage("Webhook endpoint güncellendi.");
    cancelEditingWebhookEndpoint();
  }

  async function handleDeactivateWebhookEndpoint(id: string) {
    setDeactivatePendingId(id);
    setEndpointErrors([]);
    setEndpointMessage("");

    const result = await persistence.deactivateWebhookEndpoint(id);

    if (!result.ok) {
      setEndpointErrors(result.errors);
      setDeactivatePendingId("");
      return;
    }

    setWebhookEndpointRows((current) =>
      current.map((row) => (row.id === result.data.row.id ? result.data.row : row)),
    );
    setEndpointMessage("Webhook endpoint pasifleştirildi.");
    setDeactivatePendingId("");
  }

  async function handleActivateWebhookEndpoint(id: string) {
    if (!persistence.activateWebhookEndpoint) {
      setEndpointErrors(["Webhook endpoint aktifleştirme işlemi şu anda kullanılamıyor."]);
      return;
    }

    setActivatePendingId(id);
    setEndpointErrors([]);
    setEndpointMessage("");

    const result = await persistence.activateWebhookEndpoint(id);

    if (!result.ok) {
      setEndpointErrors(result.errors);
      setActivatePendingId("");
      return;
    }

    setWebhookEndpointRows((current) =>
      current.map((row) => (row.id === result.data.row.id ? result.data.row : row)),
    );
    setEndpointMessage("Webhook endpoint aktifleştirildi.");
    setActivatePendingId("");
  }

  async function handleRotateWebhookEndpointSecret(id: string) {
    setRotatePendingId(id);
    setEndpointErrors([]);
    setEndpointMessage("");
    setRevealedEndpointSecret("");

    const result = await persistence.rotateWebhookEndpointSecret(id);

    if (!result.ok) {
      setEndpointErrors(result.errors);
      setRotatePendingId("");
      return;
    }

    setWebhookEndpointRows((current) =>
      current.map((row) => (row.id === result.data.row.id ? result.data.row : row)),
    );
    setEndpointMessage("Webhook endpoint secret yenilendi.");
    setRevealedEndpointSecret(result.data.secret);
    setRotatePendingId("");
  }

  async function handleRevoke() {
    if (!revokeCandidate) return;
    setPending(true);
    setErrors([]);
    const result = await persistence.revokeKey(revokeCandidate.id);

    if (!result.ok) {
      setErrors(result.errors);
      setPending(false);
      return;
    }

    setRows((current) =>
      current.map((row) => (row.id === result.data.row.id ? result.data.row : row)),
    );
    setMessage(`${result.data.row.name} API anahtarı iptal edildi.`);
    setRevokeCandidate(null);
    setPending(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">P2-S4 API altyapısı</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">API Anahtar Yönetimi</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Entegrasyon anahtarlarını kapsam, son kullanım tarihi ve saniyelik istek limitiyle yönetin.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-6">
            <Metric label="Toplam" value={summary.totalCount} />
            <Metric label="Aktif" value={summary.activeCount} />
            <Metric label="Süresi dolan" value={summary.expiredCount} />
            <Metric label="İptal" value={summary.revokedCount} />
            <Metric label="Kullanılan" value={usageSummary.usedCount} />
            <Metric label="Kullanılmayan" value={usageSummary.unusedCount} />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
              P2-S4 webhook kayıtları
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              Webhook Endpoint Kayıtları
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Tenant, firma ve dönem kapsamındaki outbound webhook endpointleri burada listelenecek.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Metric label="Toplam" value={webhookEndpointSummary.totalCount} />
            <Metric label="Aktif" value={webhookEndpointSummary.activeCount} />
            <Metric label="Pasif" value={webhookEndpointSummary.inactiveCount} />
            <Metric label="Olay türü" value={webhookEndpointSummary.eventTypeCount} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Arama
            <input
              aria-label="Webhook endpointlerinde ara"
              className="min-h-9 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950"
              onChange={(event) => setWebhookEndpointSearchText(event.target.value)}
              placeholder="Ad, URL, olay, kullanıcı"
              value={webhookEndpointSearchText}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Durum
            <select
              aria-label="Webhook endpoint durum filtresi"
              className="min-h-9 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950"
              onChange={(event) =>
                setWebhookEndpointStatusFilter(
                  event.target.value as "all" | "active" | "inactive",
                )
              }
              value={webhookEndpointStatusFilter}
            >
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Olay
            <select
              aria-label="Webhook endpoint olay filtresi"
              className="min-h-9 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950"
              onChange={(event) =>
                setWebhookEndpointEventTypeFilter(
                  event.target.value as "all" | (typeof WEBHOOK_DELIVERY_EVENT_TYPES)[number]["type"],
                )
              }
              value={webhookEndpointEventTypeFilter}
            >
              <option value="all">Tümü</option>
              {WEBHOOK_DELIVERY_EVENT_TYPES.map((eventType) => (
                <option key={eventType.type} value={eventType.type}>
                  {eventType.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="min-h-9 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasActiveWebhookEndpointFilters}
            onClick={() => {
              setWebhookEndpointSearchText("");
              setWebhookEndpointStatusFilter("all");
              setWebhookEndpointEventTypeFilter("all");
            }}
            type="button"
          >
            Filtreleri Temizle
          </button>
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-600">
          Gösterilen {filteredWebhookEndpointRows.length} / {webhookEndpointRows.length} webhook endpoint
        </p>

        {webhookEndpointRows.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <p className="font-semibold">Henüz webhook endpoint kaydı yok.</p>
            <p className="mt-1">
              İlk endpointi oluşturmak için aşağıdaki formu kullanın; kayıt eklendiğinde bu listede
              görünür ve filtrelerle yönetilebilir.
            </p>
          </div>
        ) : null}

        {hasActiveWebhookEndpointFilters ? (
          <p className="mt-3 text-xs font-semibold text-slate-600">
            Aktif filtreler:{" "}
              {[
                webhookEndpointSearchText.trim() ? `ara "${webhookEndpointSearchText.trim()}"` : "",
                webhookEndpointStatusFilter !== "all"
                  ? `durum ${webhookEndpointStatusFilter === "active" ? "aktif" : "pasif"}`
                  : "",
                webhookEndpointEventTypeFilter !== "all"
                  ? `olay ${formatWebhookDeliveryEventType(webhookEndpointEventTypeFilter)}`
                  : "",
              ]
                .filter(Boolean)
                .join(", ")}
          </p>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
          <table className="w-full text-left text-sm" aria-label="Webhook endpoint kayıtları">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Ad</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Olaylar</th>
                <th className="px-4 py-3">Olay Sayısı</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Güncelleme</th>
                <th className="px-4 py-3">Secret</th>
                <th className="px-4 py-3">Oluşturan</th>
                <th className="px-4 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {webhookEndpointRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-sm text-slate-500" colSpan={9}>
                    Webhook endpoint kaydı bulunamadı.
                  </td>
                </tr>
              ) : filteredWebhookEndpointRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-sm text-slate-500" colSpan={9}>
                    <p>Filtreye uyan webhook endpoint bulunamadı.</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Filtreleri temizleyerek tüm webhook endpointlerini tekrar görün.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredWebhookEndpointRows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-4 font-semibold text-slate-950">{row.name}</td>
                    <td className="px-4 py-4 text-slate-600">{row.url}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {row.eventTypes
                        .map((eventType) => formatWebhookDeliveryEventType(eventType))
                        .join(", ")}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{`${row.eventTypes.length} olay`}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {row.isActive ? "Aktif" : "Pasif"}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDateCell(row.updatedAt)}</td>
                    <td className="px-4 py-4 text-slate-600">{`${row.secretPrefix}...`}</td>
                    <td className="px-4 py-4 text-slate-600">{row.createdBy}</td>
                    <td className="px-4 py-4">
                      {canManage ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700"
                            onClick={() => startEditingWebhookEndpoint(row)}
                            type="button"
                          >
                            Düzenle
                          </button>
                          <button
                            className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={rotatePendingId === row.id}
                            onClick={() => handleRotateWebhookEndpointSecret(row.id)}
                            type="button"
                          >
                            {rotatePendingId === row.id ? "İşleniyor..." : "Secret Yenile"}
                          </button>
                          {row.isActive ? (
                            <button
                              className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={deactivatePendingId === row.id}
                              onClick={() => handleDeactivateWebhookEndpoint(row.id)}
                              type="button"
                            >
                              {deactivatePendingId === row.id ? "İşleniyor..." : "Pasifleştir"}
                            </button>
                          ) : null}
                          {!row.isActive ? (
                            <button
                              className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={activatePendingId === row.id}
                              onClick={() => handleActivateWebhookEndpoint(row.id)}
                              type="button"
                            >
                              {activatePendingId === row.id ? "İşleniyor..." : "Aktifleştir"}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
              Yeni webhook kaydı
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              Webhook Endpoint Oluştur
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Tenant, firma ve dönem kapsamı için yeni bir outbound endpoint tanımlayın.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
            Secret yalnızca bir kez gösterilir.
          </div>
        </div>
        {!canManage ? (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Webhook endpoint oluşturma işlemleri yalnız admin rolündedir.
          </p>
        ) : null}
        <form className="mt-5 grid gap-5" onSubmit={handleCreateWebhookEndpoint}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Endpoint Adı
              <input
                className="rounded-xl border border-slate-300 px-3 py-2 text-slate-950"
                disabled={!canManage || endpointPending}
                maxLength={80}
                minLength={3}
                onChange={(event) => setEndpointName(event.target.value)}
                required
                value={endpointName}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Endpoint URL
              <input
                className="rounded-xl border border-slate-300 px-3 py-2 text-slate-950"
                disabled={!canManage || endpointPending}
                onChange={(event) => setEndpointUrl(event.target.value)}
                placeholder="https://hooks.example.com/webhooks/noa"
                required
                type="url"
                value={endpointUrl}
              />
            </label>
          </div>

          <fieldset disabled={!canManage || endpointPending}>
            <legend className="text-sm font-semibold text-slate-800">
              Desteklenen Olaylar
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WEBHOOK_DELIVERY_EVENT_TYPES.map((eventType) => (
                <label
                  className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"
                  key={eventType.type}
                >
                  <input
                    checked={selectedEventTypes.includes(eventType.type)}
                    onChange={(event) =>
                      setSelectedEventTypes((current) =>
                        event.target.checked
                          ? [...current, eventType.type]
                          : current.filter((item) => item !== eventType.type),
                      )
                    }
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-medium text-slate-900">
                      {eventType.label}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {eventType.type}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {endpointErrors.length > 0 ? (
            <div
              aria-live="polite"
              className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800"
              role="alert"
            >
              {endpointErrors.join(" ")}
            </div>
          ) : null}
          {endpointMessage ? (
            <p aria-live="polite" className="text-sm font-medium text-emerald-700">
              {endpointMessage}
            </p>
          ) : null}
          {revealedEndpointSecret ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4" role="status">
              <p className="text-sm font-semibold text-amber-950">
                Bu webhook secret yalnız bir kez gösterilir.
              </p>
              <code className="mt-2 block break-all rounded-xl bg-slate-950 px-3 py-3 text-sm text-white">
                {revealedEndpointSecret}
              </code>
            </div>
          ) : null}

          <div>
            <button
              className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canManage || endpointPending}
              type="submit"
            >
              {endpointPending ? "İşleniyor..." : "Webhook Endpoint Oluştur"}
            </button>
          </div>
        </form>
      </section>

      {editingWebhookEndpointId ? (
        <section className="rounded-[28px] border border-sky-200 bg-sky-50/60 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
                Webhook düzenleme
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">
                Webhook Endpoint Düzenle
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Endpoint adı, URL ve olay seçimlerini güncelleyin. Secret değeri korunur.
              </p>
            </div>
            <button
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={cancelEditingWebhookEndpoint}
              type="button"
            >
              Düzenlemeyi Kapat
            </button>
          </div>

          <form
            aria-label="Webhook endpoint düzenleme formu"
            className="mt-5 grid gap-5"
            onSubmit={handleUpdateWebhookEndpoint}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Endpoint Adı
                <input
                  className="rounded-xl border border-slate-300 px-3 py-2 text-slate-950"
                  disabled={!canManage || editingEndpointPending}
                  maxLength={80}
                  minLength={3}
                  onChange={(event) => setEditingEndpointName(event.target.value)}
                  required
                  value={editingEndpointName}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Endpoint URL
                <input
                  className="rounded-xl border border-slate-300 px-3 py-2 text-slate-950"
                  disabled={!canManage || editingEndpointPending}
                  onChange={(event) => setEditingEndpointUrl(event.target.value)}
                  placeholder="https://hooks.example.com/webhooks/noa"
                  required
                  type="url"
                  value={editingEndpointUrl}
                />
              </label>
            </div>

            <fieldset disabled={!canManage || editingEndpointPending}>
              <legend className="text-sm font-semibold text-slate-800">
                Desteklenen Olaylar
              </legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {WEBHOOK_DELIVERY_EVENT_TYPES.map((eventType) => (
                  <label
                    className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"
                    key={eventType.type}
                  >
                    <input
                      checked={editingSelectedEventTypes.includes(eventType.type)}
                      onChange={(event) =>
                        setEditingSelectedEventTypes((current) =>
                          event.target.checked
                            ? [...current, eventType.type]
                            : current.filter((item) => item !== eventType.type),
                        )
                      }
                      type="checkbox"
                    />
                    <span>
                      <span className="block font-medium text-slate-900">
                        {eventType.label}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {eventType.type}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {editingEndpointErrors.length > 0 ? (
              <div
                aria-live="polite"
                className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800"
                role="alert"
              >
                {editingEndpointErrors.join(" ")}
              </div>
            ) : null}
            {editingEndpointMessage ? (
              <p aria-live="polite" className="text-sm font-medium text-emerald-700">
                {editingEndpointMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canManage || editingEndpointPending}
                type="submit"
              >
                {editingEndpointPending ? "İşleniyor..." : "Webhook Endpoint Güncelle"}
              </button>
              <button
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                disabled={editingEndpointPending}
                onClick={cancelEditingWebhookEndpoint}
                type="button"
              >
                İptal
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Yeni API Anahtarı</h2>
        {!canManage ? (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            API anahtarı oluşturma ve iptal etme işlemleri yalnız admin rolündedir.
          </p>
        ) : null}
        <form className="mt-5 grid gap-5" onSubmit={handleCreate}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Anahtar Adı
              <input
                className="rounded-xl border border-slate-300 px-3 py-2 text-slate-950"
                disabled={!canManage || pending}
                maxLength={80}
                minLength={3}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Hız Limiti (istek/sn)
              <input
                className="rounded-xl border border-slate-300 px-3 py-2 text-slate-950"
                disabled={!canManage || pending}
                max={100}
                min={1}
                onChange={(event) => setRateLimit(event.target.value)}
                required
                type="number"
                value={rateLimit}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Son Kullanım Tarihi
              <input
                className="rounded-xl border border-slate-300 px-3 py-2 text-slate-950"
                disabled={!canManage || pending}
                onChange={(event) => setExpiresAt(event.target.value)}
                type="date"
                value={expiresAt}
              />
            </label>
          </div>

          <fieldset disabled={!canManage || pending}>
            <legend className="text-sm font-semibold text-slate-800">API Kapsamları</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {API_KEY_SCOPES.map((scope) => (
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700" key={scope.key}>
                  <input
                    checked={scopes.includes(scope.key)}
                    onChange={(event) =>
                      setScopes((current) =>
                        event.target.checked
                          ? [...current, scope.key]
                          : current.filter((item) => item !== scope.key),
                      )
                    }
                    type="checkbox"
                  />
                  {scope.label}
                </label>
              ))}
            </div>
          </fieldset>

          {errors.length > 0 ? (
            <div aria-live="polite" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              {errors.join(" ")}
            </div>
          ) : null}
          {message ? <p aria-live="polite" className="text-sm font-medium text-emerald-700">{message}</p> : null}
          {revealedSecret ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4" role="status">
              <p className="text-sm font-semibold text-amber-950">Bu anahtar yalnız bir kez gösterilir.</p>
              <code className="mt-2 block break-all rounded-xl bg-slate-950 px-3 py-3 text-sm text-white">{revealedSecret}</code>
            </div>
          ) : null}

          <div>
            <button className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!canManage || pending} type="submit">
              {pending ? "İşleniyor..." : "API Anahtarı Oluştur"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">API Anahtarları</h2>
              <p className="mt-1 text-sm text-slate-600">
                Anahtarları ad, önek, kapsam, son kullanım ve durumla ayıklayın.
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-600">
              {hasActiveFilters
                ? `Son ${filteredRows.length} / ${rows.length} API anahtarı`
                : `Son ${rows.length} API anahtarı`}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Arama
                <input
                  aria-label="API anahtarlarında ara"
                  className="min-h-9 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950"
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Ad, önek, kapsam, kullanıcı"
                  value={searchText}
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Durum
                <select
                  aria-label="API anahtarı durum filtresi"
                  className="min-h-9 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950"
                  onChange={(event) =>
                    setStatusFilter(event.target.value as ApiKeyStatus | "all")
                  }
                  value={statusFilter}
                >
                  <option value="all">Tümü</option>
                  <option value="active">Aktif</option>
                  <option value="expired">Süresi Doldu</option>
                  <option value="revoked">İptal</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Kapsam
                <select
                  aria-label="API anahtarı kapsam filtresi"
                  className="min-h-9 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950"
                  onChange={(event) =>
                    setScopeFilter(event.target.value as ApiKeyScope | "all")
                  }
                  value={scopeFilter}
                >
                  <option value="all">Tümü</option>
                  {API_KEY_SCOPES.map((scope) => (
                    <option key={scope.key} value={scope.key}>
                      {scope.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Kullanım
                <select
                  aria-label="API anahtarı kullanım filtresi"
                  className="min-h-9 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950"
                  onChange={(event) =>
                    setUsageFilter(event.target.value as "all" | "used" | "unused")
                  }
                  value={usageFilter}
                >
                  <option value="all">Tümü</option>
                  <option value="used">Kullanıldı</option>
                  <option value="unused">Kullanılmadı</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Son kullanım başlangıcı
                <input
                  aria-label="API anahtarı son kullanım başlangıcı"
                  className="min-h-9 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950"
                  onChange={(event) => setLastUsedStartDate(event.target.value)}
                  type="date"
                  value={lastUsedStartDate}
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Son kullanım bitişi
                <input
                  aria-label="API anahtarı son kullanım bitişi"
                  className="min-h-9 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950"
                  onChange={(event) => setLastUsedEndDate(event.target.value)}
                  type="date"
                  value={lastUsedEndDate}
                />
              </label>
              <button
                className="min-h-9 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setSearchText("");
                  setStatusFilter("all");
                  setScopeFilter("all");
                  setUsageFilter("all");
                  setLastUsedStartDate("");
                  setLastUsedEndDate("");
                }}
                type="button"
              >
                Filtreleri Temizle
              </button>
            </div>
            {hasInvalidLastUsedDateRange ? (
              <p className="text-xs font-semibold text-rose-700">
                Son kullanım başlangıcı bitiş tarihinden sonra olamaz.
              </p>
            ) : null}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table aria-label="P2 API Anahtarları" className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Ad</th>
                <th className="px-5 py-3">Önek</th>
                <th className="px-5 py-3">Kapsamlar</th>
                <th className="px-5 py-3">Limit</th>
                <th className="px-5 py-3">Son Kullanım</th>
                <th className="px-5 py-3">Durum</th>
                <th className="px-5 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr><td className="px-5 py-8 text-center text-slate-500" colSpan={7}>API anahtarı bulunamadı.</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td className="px-5 py-8 text-center text-slate-500" colSpan={7}>Filtreye uyan API anahtarı bulunamadı.</td></tr>
              ) : filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-4 font-semibold text-slate-900">{row.name}</td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-700">{row.keyPrefix}...</td>
                  <td className="px-5 py-4 text-slate-600">{formatScopeLabels(row.scopes)}</td>
                  <td className="px-5 py-4 text-slate-600">{row.rateLimitPerSecond}/sn</td>
                  <td className="px-5 py-4 text-slate-600">{formatDateCell(row.lastUsedAt)}</td>
                  <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                  <td className="px-5 py-4">
                    {row.status === "active" && canManage ? (
                      <button className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700" onClick={() => setRevokeCandidate(row)} type="button">İptal Et</button>
                    ) : <span className="text-slate-400">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {revokeCandidate ? (
        <div aria-labelledby="api-key-revoke-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-950" id="api-key-revoke-title">API anahtarını iptal et</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              <strong>{revokeCandidate.name}</strong> anahtarı iptal edildiğinde bu anahtarı kullanan entegrasyonlar hemen erişimini kaybeder.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" disabled={pending} onClick={() => setRevokeCandidate(null)} type="button">Vazgeç</button>
              <button className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white" disabled={pending} onClick={handleRevoke} type="button">İptal Et</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="min-w-24 rounded-2xl bg-slate-50 px-3 py-2"><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-semibold text-slate-950">{value}</p></div>;
}

function StatusBadge({ status }: { status: ApiKeyRow["status"] }) {
  const label = status === "active" ? "Aktif" : status === "expired" ? "Süresi Doldu" : "İptal";
  const className = status === "active" ? "bg-emerald-50 text-emerald-700" : status === "expired" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function getApiKeyLocalDateKey(value: string) {
  return new Date(value).toLocaleDateString("en-CA");
}

function formatDateCell(value: string) {
  if (!value) {
    return "Hiç kullanılmadı";
  }

  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatScopeLabels(scopes: ApiKeyRow["scopes"]) {
  return scopes.map((key) => API_KEY_SCOPES.find((scope) => scope.key === key)?.label ?? key).join(", ");
}
