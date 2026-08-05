"use client";

import { useMemo, useState } from "react";

import type {
  EffectiveSupplierCategory,
  SupplierCategorySaveValues,
  SupplierCategoryStatusValues,
} from "@/lib/supplier-category";
import type { SupplierCategoryResult } from "@/lib/supplier-category-service";

type MutationData = {
  category: EffectiveSupplierCategory;
  idempotent: boolean;
};

export function SupplierCategoryPanel({
  canManage,
  categories: initialCategories,
  onChangeStatus,
  onSave,
}: {
  canManage: boolean;
  categories: EffectiveSupplierCategory[];
  onChangeStatus?: (
    values: SupplierCategoryStatusValues,
  ) => Promise<SupplierCategoryResult<MutationData>>;
  onSave?: (
    values: SupplierCategorySaveValues,
  ) => Promise<SupplierCategoryResult<MutationData>>;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [draft, setDraft] = useState<EffectiveSupplierCategory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return categories.filter((row) =>
      (statusFilter === "ALL" || row.status === statusFilter) &&
      (!normalizedQuery ||
        row.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery) ||
        row.description.toLocaleLowerCase("tr-TR").includes(normalizedQuery)),
    );
  }, [categories, query, statusFilter]);

  function startCreate(source?: EffectiveSupplierCategory) {
    setDraft(source ?? null);
    setIsFormOpen(true);
    setName(source?.name ?? "");
    setDescription(source?.description ?? "");
    setNotice("");
  }

  async function handleSave() {
    if (!canManage || !onSave) return;
    setIsSaving(true);
    const result = await onSave({
      description,
      expectedRevisionNo: draft?.source === "managed" ? draft.revisionNo : 0,
      id: draft?.source === "managed" ? draft.id : undefined,
      name,
      requestKey: createRequestKey("save"),
    });
    setIsSaving(false);
    if (!result.ok) {
      setNotice(result.errors.join(" "));
      return;
    }
    setCategories((current) => upsertManagedCategory(current, result.data.category));
    setIsFormOpen(false);
    setDraft(null);
    setName("");
    setDescription("");
    setNotice(result.data.idempotent ? "Kategori daha önce tamamlanan işlemden okundu." : "Tedarikçi kategorisi kaydedildi.");
  }

  async function handleStatus(row: EffectiveSupplierCategory) {
    if (!canManage || !onChangeStatus || row.source !== "managed") return;
    setIsSaving(true);
    const result = await onChangeStatus({
      expectedRevisionNo: row.revisionNo,
      id: row.id,
      requestKey: createRequestKey("status"),
      status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    });
    setIsSaving(false);
    if (!result.ok) {
      setNotice(result.errors.join(" "));
      return;
    }
    setCategories((current) => upsertManagedCategory(current, result.data.category));
    setNotice("Kategori durumu güncellendi; mevcut tedarikçi kayıtları değiştirilmedi.");
  }

  return (
    <section
      aria-labelledby="supplier-category-title"
      className="rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
            Cari master verisi
          </p>
          <h2 className="mt-1 text-lg font-bold text-content" id="supplier-category-title">
            Tedarikçi Kategori Sözlüğü
          </h2>
          <p className="mt-1 text-sm text-content-subtle">
            Tedarikçi formu ve içe aktarma doğrulamasının ortak kategori kaynağı.
          </p>
        </div>
        {canManage ? (
          <button
            className="rounded-ui-control bg-brand-primary px-4 py-2 text-sm font-bold text-on-brand"
            onClick={() => startCreate()}
            type="button"
          >
            Yeni Kategori
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-content">
          Ara
          <input
            className="mt-1 w-full rounded-ui-control border border-divider bg-surface-muted px-3 py-2 font-normal"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kategori veya açıklama"
            value={query}
          />
        </label>
        <label className="text-sm font-semibold text-content">
          Durum
          <select
            className="mt-1 w-full rounded-ui-control border border-divider bg-surface-muted px-3 py-2 font-normal"
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            value={statusFilter}
          >
            <option value="ALL">Tüm durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
          </select>
        </label>
      </div>

      {canManage && isFormOpen ? (
        <div className="mt-4 grid gap-3 rounded-ui-control border border-divider bg-surface-muted p-4">
          <h3 className="font-bold text-content">
            {draft?.source === "managed" ? "Kategori Düzenle" : "Yeni Kategori"}
          </h3>
          <label className="text-sm font-semibold text-content">
            Kategori adı
            <input
              className="mt-1 w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 font-normal"
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="text-sm font-semibold text-content">
            Açıklama
            <textarea
              className="mt-1 min-h-20 w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 font-normal"
              maxLength={240}
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-ui-control bg-brand-primary px-4 py-2 text-sm font-bold text-on-brand disabled:opacity-50"
              disabled={isSaving || !name.trim() || !onSave}
              onClick={() => void handleSave()}
              type="button"
            >
              {isSaving ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button
              className="rounded-ui-control border border-divider bg-surface-raised px-4 py-2 text-sm font-semibold"
              onClick={() => {
                setDraft(null);
                setIsFormOpen(false);
                setName("");
                setDescription("");
              }}
              type="button"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-ui-control border border-divider">
        <table className="min-w-[720px] w-full text-left text-sm" aria-label="Tedarikçi kategori dizini">
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Kaynak</th>
              <th className="px-3 py-2">Kullanım</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2 print:hidden">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2">
                  <p className="font-semibold text-content">{row.name}</p>
                  {row.description ? <p className="text-xs text-content-subtle">{row.description}</p> : null}
                </td>
                <td className="px-3 py-2 text-content-subtle">
                  {row.source === "managed" ? "Yönetilen" : "Mevcut tedarikçi kaydı"}
                </td>
                <td className="px-3 py-2 font-mono">{row.usageCount}</td>
                <td className="px-3 py-2">{row.status === "ACTIVE" ? "Aktif" : "Pasif"}</td>
                <td className="px-3 py-2 print:hidden">
                  {canManage ? (
                    <div className="flex gap-2">
                      <button
                        className="rounded-ui-control border border-divider px-3 py-1.5 text-xs font-semibold"
                        onClick={() => startCreate(row)}
                        type="button"
                      >
                        {row.source === "managed" ? "Düzenle" : "Yönet"}
                      </button>
                      {row.source === "managed" ? (
                        <button
                          className="rounded-ui-control border border-divider px-3 py-1.5 text-xs font-semibold"
                          disabled={isSaving}
                          onClick={() => void handleStatus(row)}
                          type="button"
                        >
                          {row.status === "ACTIVE" ? "Pasife Al" : "Aktifleştir"}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-content-subtle">Salt okunur</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? (
        <p className="mt-3 text-sm text-content-subtle">Filtrelerle eşleşen kategori bulunmuyor.</p>
      ) : null}
      {notice ? <p className="mt-3 text-sm font-semibold text-content-subtle" role="status">{notice}</p> : null}
    </section>
  );
}

function upsertManagedCategory(
  current: EffectiveSupplierCategory[],
  saved: EffectiveSupplierCategory,
) {
  const currentUsageCount = current.find(
    (row) =>
      row.id === saved.id || row.normalizedName === saved.normalizedName,
  )?.usageCount;
  const savedWithUsage = {
    ...saved,
    usageCount: Math.max(saved.usageCount, currentUsageCount ?? 0),
  };

  return [
    ...current.filter((row) =>
      row.id !== saved.id && row.normalizedName !== saved.normalizedName,
    ),
    savedWithUsage,
  ].sort((left, right) => left.name.localeCompare(right.name, "tr-TR"));
}

function createRequestKey(action: "save" | "status") {
  return `supplier-category-${action}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
