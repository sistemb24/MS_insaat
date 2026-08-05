"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import {
  archiveAnnouncementAction,
  createAnnouncementAction,
  getAnnouncementAction,
  listAnnouncementsAction,
  publishAnnouncementAction,
  updateAnnouncementDraftAction,
} from "@/app/actions/announcement-actions";
import {
  isAnnouncementNew,
  type AnnouncementCategory,
  type AnnouncementPriority,
  type AnnouncementStatus,
} from "@/lib/announcement";
import type { AnnouncementRow } from "@/lib/announcement-prisma-repository";

type AnnouncementList = Extract<
  Awaited<ReturnType<typeof listAnnouncementsAction>>,
  { ok: true }
>["data"]["announcements"];

const inputClass =
  "min-h-11 w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content outline-none transition focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton =
  "min-h-11 rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "min-h-11 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

export function AnnouncementCenterSurface({
  canManage,
  initialAnnouncementId,
  isAdmin,
}: {
  canManage: boolean;
  initialAnnouncementId?: string;
  isAdmin: boolean;
}) {
  const [announcements, setAnnouncements] = useState<AnnouncementList | null>(null);
  const [selected, setSelected] = useState<AnnouncementRow | null>(null);
  const [selectedId, setSelectedId] = useState(initialAnnouncementId ?? "");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const refresh = useCallback(async (announcementId = selectedId) => {
    const listResult = await listAnnouncementsAction();
    if (!listResult.ok) {
      setError(readErrors(listResult));
      return;
    }
    setAnnouncements(listResult.data.announcements);
    if (!announcementId) {
      setSelected(null);
      return;
    }
    const detailResult = await getAnnouncementAction(announcementId);
    if (detailResult.ok) {
      setSelected(detailResult.data.announcement);
    } else {
      setSelected(null);
      setError(readErrors(detailResult));
    }
  }, [selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  useEffect(() => { if (selected) closeRef.current?.focus(); }, [selected]);

  const visible = useMemo(() => {
    const normalized = query.toLocaleLowerCase("tr-TR");
    return (announcements ?? []).filter((row) =>
      (category === "ALL" || row.category === category)
      && (status === "ALL" || row.status === status)
      && `${row.title} ${row.summary} ${categoryLabel(row.category)} ${priorityLabel(row.priority)}`
        .toLocaleLowerCase("tr-TR")
        .includes(normalized));
  }, [announcements, category, query, status]);

  const counts = useMemo(() => ({
    draft: announcements?.filter((row) => row.status === "DRAFT").length ?? 0,
    important: announcements?.filter((row) =>
      row.status === "PUBLISHED" && row.priority === "IMPORTANT").length ?? 0,
    published: announcements?.filter((row) => row.status === "PUBLISHED").length ?? 0,
  }), [announcements]);

  function openDetail(row: AnnouncementRow, opener: HTMLElement) {
    openerRef.current = opener;
    setSelectedId(row.id);
    setSelected(row);
    setError("");
    window.history.replaceState(
      null,
      "",
      `/bilgi-merkezi?announcement=${encodeURIComponent(row.id)}`,
    );
  }

  function closeDetail() {
    setSelectedId("");
    setSelected(null);
    window.history.replaceState(null, "", "/bilgi-merkezi");
    openerRef.current?.focus();
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const editing = dialog === "edit" ? selected : null;
    setError("");
    startTransition(async () => {
      const values = {
        category: value(data, "category") as AnnouncementCategory,
        content: value(data, "content"),
        priority: value(data, "priority") as AnnouncementPriority,
        requestKey: createRequestKey(),
        summary: value(data, "summary"),
        title: value(data, "title"),
      };
      const result = editing
        ? await updateAnnouncementDraftAction({
            ...values,
            announcementId: editing.id,
            expectedRevisionNo: editing.revisionNo,
          })
        : await createAnnouncementAction(values);
      if (!result.ok) {
        setError(readErrors(result));
        return;
      }
      setDialog(null);
      setSelectedId(result.data.announcement.id);
      setNotice(
        result.data.idempotent
          ? "Duyuru işlemi daha önce tamamlanmış."
          : editing
            ? "Duyuru taslağı güncellendi."
            : "Duyuru taslağı oluşturuldu.",
      );
      window.history.replaceState(
        null,
        "",
        `/bilgi-merkezi?announcement=${encodeURIComponent(result.data.announcement.id)}`,
      );
      await refresh(result.data.announcement.id);
    });
  }

  function transition(operation: "archive" | "publish") {
    if (!selected) return;
    setError("");
    startTransition(async () => {
      const input = {
        announcementId: selected.id,
        requestKey: createRequestKey(),
      };
      const result = operation === "publish"
        ? await publishAnnouncementAction(input)
        : await archiveAnnouncementAction(input);
      if (!result.ok) {
        setError(readErrors(result));
        return;
      }
      setNotice(operation === "publish" ? "Duyuru yayımlandı." : "Duyuru arşivlendi.");
      await refresh(selected.id);
    });
  }

  return (
    <section aria-label="Bilgi Merkezi" className="mx-auto grid max-w-7xl gap-4">
      <header className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm print:shadow-none">
        <div className="border-l-4 border-brand-primary p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
                Faz 19 · Şirket duyuruları
              </p>
              <h2 className="mt-1 text-2xl font-bold text-content">Bilgi Merkezi</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">
                Şirket duyurularını, planlı bakımları, güncellemeleri ve haberleri tek akışta izleyin.
              </p>
            </div>
            {canManage ? (
              <button
                className={`${primaryButton} print:hidden`}
                onClick={() => setDialog("create")}
                type="button"
              >
                Yeni duyuru
              </button>
            ) : isAdmin ? (
              <span className="rounded-ui-control border border-warning/30 bg-warning-subtle px-3 py-2 text-xs font-semibold text-warning">
                Kapalı dönemde salt okunur
              </span>
            ) : null}
          </div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            <Metric label="Yayında" value={counts.published} />
            <Metric emphasis="warning" label="Önemli" value={counts.important} />
            {isAdmin ? <Metric label="Taslak" value={counts.draft} /> : <Metric label="Kategoriler" value={4} />}
          </dl>
        </div>
      </header>

      <div aria-atomic="true" aria-live="polite">
        {notice ? (
          <p className="rounded-ui-control border border-success/30 bg-success-subtle p-3 text-sm text-success">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-ui-panel border border-divider bg-surface-raised p-3 shadow-sm sm:grid-cols-[minmax(12rem,1fr)_12rem_12rem] print:hidden">
        <input
          aria-label="Bilgi Merkezi içeriklerinde ara"
          className={inputClass}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Başlık, özet veya kategori ara"
          value={query}
        />
        <select
          aria-label="Kategoriye göre filtrele"
          className={inputClass}
          onChange={(event) => setCategory(event.currentTarget.value)}
          value={category}
        >
          <option value="ALL">Tüm kategoriler</option>
          <option value="ANNOUNCEMENT">Duyurular</option>
          <option value="MAINTENANCE">Bakım</option>
          <option value="UPDATE">Güncellemeler</option>
          <option value="NEWS">Haberler</option>
        </select>
        <select
          aria-label="Duruma göre filtrele"
          className={inputClass}
          disabled={!isAdmin}
          onChange={(event) => setStatus(event.currentTarget.value)}
          value={status}
        >
          <option value="ALL">{isAdmin ? "Tüm durumlar" : "Yayımlanmış"}</option>
          {isAdmin ? <option value="DRAFT">Taslak</option> : null}
          <option value="PUBLISHED">Yayımlandı</option>
          {isAdmin ? <option value="ARCHIVED">Arşivlendi</option> : null}
        </select>
      </div>

      <div aria-busy={!announcements} className="grid min-w-0 gap-3">
        {!announcements ? (
          <p className="rounded-ui-panel border border-divider bg-surface-raised p-8 text-center text-sm text-content-muted">
            Bilgi Merkezi içerikleri yükleniyor…
          </p>
        ) : null}
        {announcements && visible.length === 0 ? (
          <p className="rounded-ui-panel border border-dashed border-divider bg-surface-raised p-8 text-center text-sm text-content-muted">
            Bu filtrede Bilgi Merkezi içeriği bulunmuyor.
          </p>
        ) : null}
        {visible.map((row) => (
          <article
            className={`min-w-0 rounded-ui-panel border bg-surface-raised p-4 shadow-sm transition hover:border-brand-primary/40 sm:p-5 print:break-inside-avoid print:shadow-none ${
              row.priority === "IMPORTANT" ? "border-l-4 border-l-brand-primary" : "border-divider"
            }`}
            key={row.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={row.category} />
                  {row.status === "PUBLISHED" && isAnnouncementNew({
                    now: new Date().toISOString(),
                    publishedAt: row.publishedAt,
                  }) ? <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-xs font-bold text-brand-primary">YENİ</span> : null}
                  <PriorityBadge priority={row.priority} />
                  {isAdmin ? <StatusBadge status={row.status} /> : null}
                </div>
                <h3 className="mt-3 break-words text-lg font-bold text-content">{row.title}</h3>
                <p className="mt-2 break-words text-sm leading-6 text-content-muted">{row.summary}</p>
                <p className="mt-3 flex flex-wrap gap-2 text-xs text-content-muted">
                  <time>{formatDate(row.publishedAt ?? row.updatedAt)}</time>
                  <span aria-hidden="true">•</span>
                  <span>Şirket Duyurusu</span>
                  {isAdmin ? <span>Revizyon {row.revisionNo}</span> : null}
                </p>
              </div>
              <button
                aria-label={`${row.title} duyurusunu aç`}
                className={`${secondaryButton} shrink-0 print:hidden`}
                onClick={(event) => openDetail(row, event.currentTarget)}
                type="button"
              >
                Görüntüle
              </button>
            </div>
          </article>
        ))}
      </div>

      {selected ? (
        <AnnouncementDrawer
          announcement={selected}
          canManage={canManage}
          closeRef={closeRef}
          onArchive={() => transition("archive")}
          onClose={closeDetail}
          onEdit={() => setDialog("edit")}
          onPublish={() => transition("publish")}
          pending={pending}
        />
      ) : null}
      {dialog ? (
        <AnnouncementDialog
          announcement={dialog === "edit" ? selected : null}
          onCancel={() => setDialog(null)}
          onSubmit={submitForm}
          pending={pending}
        />
      ) : null}
    </section>
  );
}

function AnnouncementDrawer({
  announcement,
  canManage,
  closeRef,
  onArchive,
  onClose,
  onEdit,
  onPublish,
  pending,
}: {
  announcement: AnnouncementRow;
  canManage: boolean;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  onArchive: () => void;
  onClose: () => void;
  onEdit: () => void;
  onPublish: () => void;
  pending: boolean;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-content/45 p-0 sm:p-4 print:static print:bg-transparent"
      onKeyDown={(event) => { if (event.key === "Escape" && !pending) onClose(); }}
      role="dialog"
    >
      <article
        aria-labelledby="announcement-detail-title"
        className="h-full w-full overflow-y-auto bg-surface-raised p-4 shadow-xl sm:max-w-2xl sm:rounded-ui-panel sm:border sm:border-divider sm:p-6 print:max-w-none print:shadow-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <CategoryBadge category={announcement.category} />
              <PriorityBadge priority={announcement.priority} />
              <StatusBadge status={announcement.status} />
            </div>
            <h2 className="mt-3 text-2xl font-bold text-content" id="announcement-detail-title">
              {announcement.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-content-muted">{announcement.summary}</p>
          </div>
          <button
            aria-label="Duyuru detayını kapat"
            className={`${secondaryButton} print:hidden`}
            disabled={pending}
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            Kapat
          </button>
        </div>
        <div className="mt-5 border-y border-divider py-4 text-xs text-content-muted">
          {formatDate(announcement.publishedAt ?? announcement.updatedAt)} · Şirket Duyurusu
        </div>
        <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-content">
          {announcement.content}
        </p>
        {canManage ? (
          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-divider pt-4 print:hidden">
            {announcement.status === "DRAFT" ? (
              <>
                <button className={secondaryButton} disabled={pending} onClick={onEdit} type="button">
                  Taslağı düzenle
                </button>
                <button className={primaryButton} disabled={pending} onClick={onPublish} type="button">
                  Duyuruyu yayımla
                </button>
              </>
            ) : null}
            {announcement.status === "PUBLISHED" ? (
              <button className={secondaryButton} disabled={pending} onClick={onArchive} type="button">
                Duyuruyu arşivle
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}

function AnnouncementDialog({
  announcement,
  onCancel,
  onSubmit,
  pending,
}: {
  announcement: AnnouncementRow | null;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] grid place-items-center bg-content/45 p-4 print:hidden"
      role="dialog"
    >
      <form
        aria-labelledby="announcement-form-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-xl"
        onSubmit={onSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-primary">
              {announcement ? "Taslak düzenleme" : "Yeni duyuru"}
            </p>
            <h2 className="mt-1 text-xl font-bold text-content" id="announcement-form-title">
              {announcement ? "Duyuru taslağını düzenle" : "Duyuru taslağı oluştur"}
            </h2>
          </div>
          <button
            aria-label="Duyuru formunu kapat"
            className={secondaryButton}
            disabled={pending}
            onClick={onCancel}
            type="button"
          >
            Kapat
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field full label="Başlık">
            <input
              className={inputClass}
              defaultValue={announcement?.title}
              maxLength={180}
              name="title"
              required
            />
          </Field>
          <Field label="Kategori">
            <select className={inputClass} defaultValue={announcement?.category ?? "ANNOUNCEMENT"} name="category">
              <option value="ANNOUNCEMENT">Duyuru</option>
              <option value="MAINTENANCE">Bakım</option>
              <option value="UPDATE">Güncelleme</option>
              <option value="NEWS">Haber</option>
            </select>
          </Field>
          <Field label="Öncelik">
            <select className={inputClass} defaultValue={announcement?.priority ?? "NORMAL"} name="priority">
              <option value="NORMAL">Normal</option>
              <option value="IMPORTANT">Önemli</option>
            </select>
          </Field>
          <Field full label="Kısa özet">
            <textarea
              className={inputClass}
              defaultValue={announcement?.summary}
              maxLength={500}
              name="summary"
              required
              rows={3}
            />
          </Field>
          <Field full label="İçerik">
            <textarea
              aria-describedby="announcement-content-help"
              className={inputClass}
              defaultValue={announcement?.content}
              maxLength={8000}
              name="content"
              required
              rows={10}
            />
          </Field>
          <p className="text-xs leading-5 text-content-muted sm:col-span-2" id="announcement-content-help">
            Düz metin kullanılır. Dış bağlantı, HTML, dosya eki veya kişisel veri eklemeyin.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className={secondaryButton} disabled={pending} onClick={onCancel} type="button">
            Vazgeç
          </button>
          <button className={primaryButton} disabled={pending} type="submit">
            {pending ? "Kaydediliyor…" : announcement ? "Taslağı güncelle" : "Taslağı oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  children,
  full = false,
  label,
}: {
  children: React.ReactNode;
  full?: boolean;
  label: string;
}) {
  return (
    <label className={`grid gap-1 text-sm font-semibold text-content ${full ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function Metric({
  emphasis,
  label,
  value,
}: {
  emphasis?: "warning";
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-ui-control border border-divider bg-surface-subtle p-3">
      <dt className="text-xs font-semibold text-content-muted">{label}</dt>
      <dd className={`mt-1 font-mono text-lg font-bold ${emphasis === "warning" ? "text-warning" : "text-content"}`}>
        {value}
      </dd>
    </div>
  );
}

function CategoryBadge({ category }: { category: AnnouncementCategory }) {
  return (
    <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-xs font-semibold text-brand-primary">
      {categoryLabel(category)}
    </span>
  );
}
function PriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
      priority === "IMPORTANT" ? "bg-warning-subtle text-warning" : "bg-surface-muted text-content-muted"
    }`}>
      {priorityLabel(priority)}
    </span>
  );
}
function StatusBadge({ status }: { status: AnnouncementStatus }) {
  const styles = status === "PUBLISHED"
    ? "bg-success-subtle text-success"
    : status === "ARCHIVED"
      ? "bg-surface-muted text-content-muted"
      : "bg-warning-subtle text-warning";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles}`}>
      {statusLabel(status)}
    </span>
  );
}

function categoryLabel(category: AnnouncementCategory) {
  return ({
    ANNOUNCEMENT: "Duyuru",
    MAINTENANCE: "Bakım",
    NEWS: "Haber",
    UPDATE: "Güncelleme",
  } as const)[category];
}
function priorityLabel(priority: AnnouncementPriority) {
  return priority === "IMPORTANT" ? "Önemli" : "Normal";
}
function statusLabel(status: AnnouncementStatus) {
  return ({ ARCHIVED: "Arşivlendi", DRAFT: "Taslak", PUBLISHED: "Yayımlandı" } as const)[status];
}
function formatDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(date));
}
function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}
function createRequestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}
function readErrors(result: unknown) {
  return typeof result === "object"
    && result !== null
    && "errors" in result
    && Array.isArray(result.errors)
    ? result.errors.join(" ")
    : "İşlem tamamlanamadı.";
}
