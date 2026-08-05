"use client";

import { useMemo, useState } from "react";

import type {
  CompanyLocationDirectoryRow,
  CompanyLocationSaveInput,
  CompanyLocationStatus,
  CompanyLocationType,
  EffectiveCompanyLocationType,
} from "@/lib/company-location";

type Draft = Omit<
  CompanyLocationSaveInput,
  "expectedRevisionNo" | "requestKey"
>;

const emptyDraft: Draft = {
  addressLine: "",
  city: "",
  code: "",
  district: "",
  email: "",
  name: "",
  phone: "",
  postalCode: "",
  responsiblePerson: "",
  status: "ACTIVE",
  type: "BRANCH",
};

const typeLabels: Record<EffectiveCompanyLocationType, string> = {
  BRANCH: "Şube",
  HEADQUARTERS: "Merkez",
  OFFICE: "Ofis",
  SITE: "Şantiye",
};

export function CompanyLocationDirectoryPanel({
  canManage,
  locations,
  onSave,
}: {
  canManage: boolean;
  locations: CompanyLocationDirectoryRow[];
  onSave: (values: CompanyLocationSaveInput) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [selected, setSelected] = useState<CompanyLocationDirectoryRow | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"ALL" | EffectiveCompanyLocationType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CompanyLocationStatus>("ALL");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | CompanyLocationDirectoryRow["source"]>("ALL");

  const filtered = useMemo(
    () =>
      locations.filter(
        (row) =>
          (typeFilter === "ALL" || row.type === typeFilter) &&
          (statusFilter === "ALL" || row.status === statusFilter) &&
          (sourceFilter === "ALL" || row.source === sourceFilter),
      ),
    [locations, sourceFilter, statusFilter, typeFilter],
  );
  const activeHeadquarters = locations.filter(
    (row) =>
      row.source === "company-location" &&
      row.type === "HEADQUARTERS" &&
      row.status === "ACTIVE",
  ).length;

  function startCreate() {
    setSelected(null);
    setDraft(emptyDraft);
  }

  function startEdit(row: CompanyLocationDirectoryRow) {
    if (row.source !== "company-location" || !canManage) return;
    setSelected(row);
    setDraft({
      addressLine: row.addressLine,
      city: row.city,
      code: row.code,
      district: row.district,
      email: row.email,
      id: row.id,
      name: row.name,
      phone: row.phone,
      postalCode: row.postalCode,
      responsiblePerson: row.responsiblePerson,
      status: row.status,
      type: row.type as CompanyLocationType,
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const saved = await onSave({
      ...draft,
      expectedRevisionNo: selected?.revisionNo ?? 0,
      requestKey: `company-location-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    });
    setIsSaving(false);
    if (saved) startCreate();
  }

  async function deactivate(row: CompanyLocationDirectoryRow) {
    if (row.source !== "company-location" || !canManage) return;
    setIsSaving(true);
    await onSave({
      addressLine: row.addressLine,
      city: row.city,
      code: row.code,
      district: row.district,
      email: row.email,
      expectedRevisionNo: row.revisionNo,
      id: row.id,
      name: row.name,
      phone: row.phone,
      postalCode: row.postalCode,
      requestKey: `company-location-deactivate-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      responsiblePerson: row.responsiblePerson,
      status: "INACTIVE",
      type: row.type as CompanyLocationType,
    });
    setIsSaving(false);
  }

  return (
    <section
      aria-label="Şirket Lokasyon Dizini"
      className="rounded-ui-panel border border-divider bg-surface-raised print:border-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-divider px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Şirket Lokasyon Dizini</h2>
          <p className="mt-1 text-xs text-content-subtle">
            Merkez, şube ve ofisler burada; şantiyeler mevcut kart kaynağından
            salt okunur gösterilir.
          </p>
        </div>
        {canManage ? (
          <button
            className="rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-sm font-semibold print:hidden"
            onClick={startCreate}
            type="button"
          >
            Yeni Lokasyon
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 border-b border-divider p-4 sm:grid-cols-3">
        <Metric label="Toplam lokasyon" value={locations.length} />
        <Metric
          label="Aktif lokasyon"
          value={locations.filter((row) => row.status === "ACTIVE").length}
        />
        <Metric
          label="Şantiye kaynağı"
          value={locations.filter((row) => row.source === "site-record").length}
        />
      </div>

      {activeHeadquarters === 0 ? (
        <p className="mx-4 mt-4 rounded-ui-control border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-sm font-medium">
          Aktif merkez tanımlı değil. Sistem otomatik merkez kaydı oluşturmaz.
        </p>
      ) : null}

      <div className="grid gap-3 p-4 print:hidden sm:grid-cols-3">
        <Filter label="Tip" value={typeFilter} onChange={setTypeFilter}>
          <option value="ALL">Tüm tipler</option>
          {Object.entries(typeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Filter>
        <Filter label="Durum" value={statusFilter} onChange={setStatusFilter}>
          <option value="ALL">Tüm durumlar</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Pasif</option>
        </Filter>
        <Filter label="Kaynak" value={sourceFilter} onChange={setSourceFilter}>
          <option value="ALL">Tüm kaynaklar</option>
          <option value="company-location">Şirket lokasyonu</option>
          <option value="site-record">Şantiye kartı</option>
        </Filter>
      </div>

      <div className="grid gap-3 px-4 pb-4 lg:grid-cols-2">
        {filtered.length === 0 ? (
          <p className="col-span-full rounded-ui-control border border-dashed border-divider p-4 text-sm text-content-subtle">
            Seçili filtrelerde lokasyon bulunamadı.
          </p>
        ) : (
          filtered.map((row) => (
            <article
              className="rounded-ui-control border border-divider bg-surface-muted p-3"
              key={`${row.source}:${row.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-content-subtle">
                    {row.code} · {typeLabels[row.type]}
                  </p>
                  <h3 className="mt-1 font-semibold">{row.name}</h3>
                </div>
                <span className="rounded-full border border-divider px-2 py-1 text-xs font-semibold">
                  {row.status === "ACTIVE" ? "Aktif" : "Pasif"}
                </span>
              </div>
              <p className="mt-2 text-sm text-content-subtle">
                {row.responsiblePerson || "Sorumlu kişi tanımlı değil"}
              </p>
              <p className="mt-1 text-xs text-content-subtle">
                {[row.addressLine, row.district, row.city]
                  .filter(Boolean)
                  .join(" · ") || "Adres bilgisi yok"}
              </p>
              <p className="mt-2 text-xs font-medium text-content-subtle">
                {row.source === "site-record"
                  ? "Kaynak: Şantiye kartları"
                  : `Kaynak: Şirket lokasyonu · Revizyon ${row.revisionNo}`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                {row.href ? (
                  <a className="rounded-ui-control border border-divider px-3 py-1.5 text-xs font-semibold" href={row.href}>
                    Şantiyelerde Aç
                  </a>
                ) : null}
                {canManage && row.source === "company-location" ? (
                  <button className="rounded-ui-control border border-divider px-3 py-1.5 text-xs font-semibold" onClick={() => startEdit(row)} type="button">
                    Düzenle
                  </button>
                ) : null}
                {canManage && row.source === "company-location" && row.status === "ACTIVE" ? (
                  <button
                    className="rounded-ui-control border border-divider px-3 py-1.5 text-xs font-semibold"
                    disabled={isSaving}
                    onClick={() => void deactivate(row)}
                    type="button"
                  >
                    Pasifleştir
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      {canManage ? (
        <form
          aria-label="Şirket lokasyonu formu"
          className="grid gap-3 border-t border-divider p-4 print:hidden sm:grid-cols-2"
          onSubmit={submit}
        >
          <h3 className="sm:col-span-2 text-sm font-semibold">
            {selected ? `${selected.code} lokasyonunu düzenle` : "Yeni merkez, şube veya ofis"}
          </h3>
          <Field label="Kod">
            <input className={controlClass} disabled={Boolean(selected)} maxLength={30} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} required value={draft.code} />
          </Field>
          <Field label="Ad">
            <input className={controlClass} maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required value={draft.name} />
          </Field>
          <Field label="Tip">
            <select className={controlClass} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as CompanyLocationType }))} value={draft.type}>
              <option value="HEADQUARTERS">Merkez</option>
              <option value="BRANCH">Şube</option>
              <option value="OFFICE">Ofis</option>
            </select>
          </Field>
          <Field label="Sorumlu kişi">
            <input className={controlClass} maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, responsiblePerson: event.target.value }))} value={draft.responsiblePerson} />
          </Field>
          <Field label="Telefon">
            <input className={controlClass} maxLength={30} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} value={draft.phone} />
          </Field>
          <Field label="E-posta">
            <input className={controlClass} maxLength={254} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} type="email" value={draft.email} />
          </Field>
          <Field label="Adres" wide>
            <input className={controlClass} maxLength={300} onChange={(event) => setDraft((current) => ({ ...current, addressLine: event.target.value }))} value={draft.addressLine} />
          </Field>
          <Field label="İlçe">
            <input className={controlClass} maxLength={100} onChange={(event) => setDraft((current) => ({ ...current, district: event.target.value }))} value={draft.district} />
          </Field>
          <Field label="İl">
            <input className={controlClass} maxLength={100} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} value={draft.city} />
          </Field>
          <Field label="Posta kodu">
            <input className={controlClass} maxLength={10} onChange={(event) => setDraft((current) => ({ ...current, postalCode: event.target.value }))} value={draft.postalCode} />
          </Field>
          <div className="flex items-end gap-2">
            <button className="min-h-10 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving} type="submit">
              {isSaving ? "Kaydediliyor…" : "Lokasyonu Kaydet"}
            </button>
            {selected ? (
              <button className="min-h-10 rounded-ui-control border border-divider px-4 text-sm font-semibold" onClick={startCreate} type="button">Vazgeç</button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="border-t border-divider px-4 py-3 text-sm text-content-subtle">
          Bu kapsamda lokasyon dizini salt okunur.
        </p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-ui-control bg-surface-muted p-3"><p className="text-xs text-content-subtle">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></article>;
}

function Filter<T extends string>({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onChange: (value: T) => void;
  value: T;
}) {
  return <label className="grid gap-1 text-xs font-semibold text-content-subtle">{label}<select className={controlClass} onChange={(event) => onChange(event.target.value as T)} value={value}>{children}</select></label>;
}

function Field({ children, label, wide = false }: { children: React.ReactNode; label: string; wide?: boolean }) {
  return <label className={`grid gap-1 text-sm font-semibold ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>;
}

const controlClass =
  "min-h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-sm outline-none focus:border-brand-primary disabled:opacity-60";
