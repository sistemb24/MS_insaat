"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import {
  applyConstructionMeasurementImportBatchAction,
  cancelConstructionMeasurementImportBatchAction,
  getConstructionMeasurementImportBatchAction,
  listConstructionMeasurementImportBatchesAction,
  uploadConstructionMeasurementImportAction,
  validateConstructionMeasurementImportBatchAction,
} from "@/app/actions/construction-measurement-import-actions";

type ImportListData = Extract<
  Awaited<ReturnType<typeof listConstructionMeasurementImportBatchesAction>>,
  { ok: true }
>["data"];
type ImportDetailData = Extract<
  Awaited<ReturnType<typeof getConstructionMeasurementImportBatchAction>>,
  { ok: true }
>["data"];
type ConfirmState = {
  batchId: string;
  label: string;
};

const primaryButton =
  "min-h-10 rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "min-h-10 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition-colors hover:border-outline-strong hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";
const statusLabels: Record<string, string> = {
  DRAFT: "Taslak",
  VALIDATED: "Doğrulandı",
  APPLIED: "Uygulandı",
  CANCELLED: "İptal edildi",
  FAILED: "Başarısız",
};
const eventLabels: Record<string, string> = {
  CREATED: "Taslak oluşturuldu",
  VALIDATED: "Doğrulandı",
  APPLIED: "Metraja uygulandı",
  CANCELLED: "İptal edildi",
  FAILED: "Başarısız oldu",
};
const rowErrorLabels: Record<string, string> = {
  ITEM_CODE_REQUIRED: "Poz numarası zorunludur.",
  ITEM_NOT_FOUND: "Sözleşme pozu bulunamadı.",
  ITEM_INACTIVE: "Sözleşme pozu pasif.",
  QUANTITY_INVALID: "Miktar sıfırdan büyük olmalıdır.",
  DUPLICATE_ITEM_CODE: "Dosyada aynı poz birden fazla kez kullanılmış.",
  UNIT_MISMATCH: "Birim sözleşme pozuyla uyuşmuyor.",
  DESCRIPTION_TOO_LONG: "Açıklama izin verilen uzunluğu aşıyor.",
};

export function ConstructionMeasurementImportWorkspace({
  initialBatchId,
  projectId,
  sourceProgressPaymentId,
}: {
  initialBatchId?: string;
  projectId: string;
  sourceProgressPaymentId: string;
}) {
  const [listData, setListData] = useState<ImportListData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialBatchId ?? null,
  );
  const [detail, setDetail] = useState<ImportDetailData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [pending, startTransition] = useTransition();
  const applyTriggerRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const resultLinkRef = useRef<HTMLAnchorElement | null>(null);
  const applySucceededRef = useRef(false);
  const shouldRestoreFocusRef = useRef(false);

  const loadList = useCallback(async () => {
    const result = await listConstructionMeasurementImportBatchesAction(projectId);
    if (!result.ok) {
      setListData(null);
      setMessage(readErrors(result));
      return;
    }
    setListData(result.data);
    setSelectedId((current) => current ?? initialBatchId ?? result.data.rows[0]?.id ?? null);
  }, [initialBatchId, projectId]);

  const loadDetail = useCallback(async (batchId: string) => {
    const result = await getConstructionMeasurementImportBatchAction(batchId);
    if (!result.ok) {
      setDetail(null);
      setMessage(readErrors(result));
      return;
    }
    setDetail(result.data);
  }, []);

  useEffect(() => {
    let active = true;
    void listConstructionMeasurementImportBatchesAction(projectId).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setListData(null);
        setMessage(readErrors(result));
        return;
      }
      setListData(result.data);
      setSelectedId((current) => current ?? initialBatchId ?? result.data.rows[0]?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [initialBatchId, projectId]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void getConstructionMeasurementImportBatchAction(selectedId).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setDetail(null);
        setMessage(readErrors(result));
        return;
      }
      setDetail(result.data);
    });
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (confirm) {
      confirmButtonRef.current?.focus();
      return;
    }
    if (!pending && shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      if (applySucceededRef.current) {
        applySucceededRef.current = false;
        resultLinkRef.current?.focus();
      } else {
        applyTriggerRef.current?.focus();
      }
    }
  }, [confirm, pending]);

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("measurementCsv");
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : null;
    if (!file) {
      setMessage("Sunucuda doğrulanacak CSV dosyasını seçin.");
      return;
    }
    startTransition(async () => {
      const result = await uploadConstructionMeasurementImportAction({
        projectId,
        sourceProgressPaymentId,
        file,
      });
      if (!result.ok) {
        setMessage(readErrors(result));
        return;
      }
      const batchId = result.data.batch.id;
      setSelectedId(batchId);
      setMessage(
        result.data.kind === "idempotent"
          ? "Aynı dosyaya ait mevcut import batch'i açıldı."
          : "CSV sunucuda doğrulandı ve taslak import oluşturuldu.",
      );
      form.reset();
      await Promise.all([loadList(), loadDetail(batchId)]);
    });
  }

  function mutate(
    operation: "validate" | "cancel",
    batchId: string,
  ) {
    startTransition(async () => {
      const result = operation === "validate"
        ? await validateConstructionMeasurementImportBatchAction(batchId)
        : await cancelConstructionMeasurementImportBatchAction(batchId);
      if (!result.ok) {
        setMessage(readErrors(result));
        return;
      }
      setMessage(
        operation === "validate"
          ? "Import batch'i uygulamaya hazır olarak doğrulandı."
          : "Import batch'i iptal edildi.",
      );
      await Promise.all([loadList(), loadDetail(batchId)]);
    });
  }

  function applyBatch(batchId: string) {
    startTransition(async () => {
      const result = await applyConstructionMeasurementImportBatchAction(batchId);
      if (!result.ok) {
        setMessage(readErrors(result));
      } else {
        applySucceededRef.current = true;
        setMessage(
          result.data.kind === "idempotent"
            ? "Bu import daha önce uygulanmış; mevcut sonuç açıldı."
            : "Import satırları metraj föyüne uygulandı.",
        );
        await Promise.all([loadList(), loadDetail(batchId)]);
      }
      shouldRestoreFocusRef.current = true;
      setConfirm(null);
    });
  }

  function closeConfirm() {
    shouldRestoreFocusRef.current = true;
    setConfirm(null);
  }

  const batch = detail?.batch ?? null;
  const permissions = detail?.permissions;
  const errorRows = batch?.rows.filter((row) => row.status === "ERROR") ?? [];

  return (
    <section
      aria-label="Kalıcı metraj import çalışma alanı"
      className="min-w-0 overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm print:shadow-none"
      data-construction-measurement-import="persistent"
    >
      <div className="border-b border-divider bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
              Faz 12 · Kalıcı ve izlenebilir aktarım
            </p>
            <h5 className="mt-1 text-lg font-bold text-content">
              Metraj Import Merkezi
            </h5>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">
              CSV sunucuda yeniden doğrulanır. Taslak açık onay olmadan metraj
              föyüne uygulanmaz ve orijinal dosya içeriği saklanmaz.
            </p>
          </div>
          <span className="rounded-ui-control border border-info/30 bg-info-subtle px-3 py-2 text-xs font-semibold text-info">
            Sunucu doğrulamalı · audit izli
          </span>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_18rem] sm:p-5 print:block">
        <div className="min-w-0 space-y-4">
          {listData?.canCreate ? (
            <form
              aria-label="Kalıcı metraj CSV yükleme"
              className="rounded-ui-panel border border-divider bg-surface-subtle p-4 print:hidden"
              onSubmit={upload}
            >
              <label className="block text-sm font-semibold text-content" htmlFor="persistent-measurement-csv">
                Sunucuda doğrulanacak CSV dosyası
              </label>
              <p className="mt-1 text-xs leading-5 text-content-muted">
                UTF-8 CSV, en fazla 2 MiB ve 500 veri satırı. Beklenen alanlar:
                poz_no, miktar, isteğe bağlı açıklama ve birim.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  accept=".csv,text/csv"
                  className="min-h-10 min-w-0 flex-1 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content"
                  id="persistent-measurement-csv"
                  name="measurementCsv"
                  required
                  type="file"
                />
                <button className={primaryButton} disabled={pending} type="submit">
                  {pending ? "Gönderiliyor…" : "Sunucuda doğrula"}
                </button>
              </div>
            </form>
          ) : (
            <p className="rounded-ui-control border border-warning/30 bg-warning-subtle p-3 text-sm text-warning print:hidden">
              Kapalı dönem veya mevcut yetki nedeniyle yeni import oluşturulamaz.
            </p>
          )}

          <div aria-live="polite" aria-atomic="true">
            {message ? (
              <p className="rounded-ui-control border border-divider bg-surface-subtle p-3 text-sm text-content">
                {message}
              </p>
            ) : null}
          </div>

          {batch ? (
            <article className="min-w-0 space-y-4" aria-label={`Import IMP-${String(batch.batchNo).padStart(4, "0")} detayı`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold text-brand-primary">
                    IMP-{String(batch.batchNo).padStart(4, "0")}
                  </p>
                  <h6 className="mt-1 break-all text-base font-bold text-content">
                    {batch.originalFileName}
                  </h6>
                  <p className="mt-1 text-xs text-content-muted">
                    {formatDateTime(batch.createdAt)} · {formatBytes(batch.fileSize)}
                  </p>
                </div>
                <span className={statusClass(batch.status)}>
                  {statusLabels[batch.status] ?? batch.status}
                </span>
              </div>

              <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Toplam satır" value={batch.totalRowCount} />
                <Metric label="Hazır" value={batch.validRowCount} success />
                <Metric label="Hatalı" value={batch.errorRowCount} danger={batch.errorRowCount > 0} />
                <Metric label="Mapping" value={batch.mappingVersion} />
              </dl>

              {errorRows.length ? (
                <div className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3">
                  <p className="text-sm font-semibold text-danger">
                    {errorRows.length} satır düzeltilmeden doğrulama yapılamaz.
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                    {errorRows.map((row) => (
                      <li key={row.id}>
                        <a
                          className="font-semibold text-danger underline underline-offset-2"
                          href={`#construction-import-row-${row.id}`}
                        >
                          Satır {row.rowNo}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 print:hidden">
                {permissions?.canValidate ? (
                  <button
                    className={primaryButton}
                    disabled={pending}
                    onClick={() => mutate("validate", batch.id)}
                    type="button"
                  >
                    Batch&apos;i doğrula
                  </button>
                ) : null}
                {permissions?.canApply && batch.status === "VALIDATED" ? (
                  <button
                    className={primaryButton}
                    disabled={pending}
                    onClick={(event) => {
                      applyTriggerRef.current = event.currentTarget;
                      setConfirm({
                        batchId: batch.id,
                        label: `IMP-${String(batch.batchNo).padStart(4, "0")}`,
                      });
                    }}
                    type="button"
                  >
                    Metraj föyüne uygula
                  </button>
                ) : null}
                {permissions?.canCancel ? (
                  <button
                    className={secondaryButton}
                    disabled={pending}
                    onClick={() => mutate("cancel", batch.id)}
                    type="button"
                  >
                    Batch&apos;i iptal et
                  </button>
                ) : null}
                {batch.targetSheetId ? (
                  <a className={secondaryButton} href="#measurement-entry-workspace" ref={resultLinkRef}>
                    Oluşan metraj föyünü aç
                  </a>
                ) : null}
              </div>

              <div className="overflow-x-auto rounded-ui-panel border border-divider">
                <table className="min-w-[760px] w-full text-left text-sm" aria-label="Import satır sonuçları">
                  <thead className="bg-surface-subtle text-xs font-bold uppercase tracking-wide text-content-muted">
                    <tr>
                      <th className="px-3 py-2">Satır</th>
                      <th className="px-3 py-2">Poz</th>
                      <th className="px-3 py-2">Açıklama</th>
                      <th className="px-3 py-2">Birim</th>
                      <th className="px-3 py-2 text-right">Miktar</th>
                      <th className="px-3 py-2">Kontrol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {batch.rows.map((row) => (
                      <tr id={`construction-import-row-${row.id}`} key={row.id}>
                        <td className="px-3 py-2 font-mono text-xs text-content">{row.rowNo}</td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-content">{row.sourceItemCode || "—"}</td>
                        <td className="max-w-sm px-3 py-2 text-content-muted">{row.description || "—"}</td>
                        <td className="px-3 py-2 text-content-muted">{row.resolvedUnit || row.sourceUnit || "—"}</td>
                        <td className="px-3 py-2 text-right font-mono text-content">{row.quantity ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className={row.status === "READY" ? "font-semibold text-success" : "font-semibold text-danger"}>
                            {row.status === "READY"
                              ? "Hazır"
                              : rowErrorLabels[row.errorCode ?? ""] ?? "Kontrol gerekli"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-content-muted">
                  İşlem geçmişi
                </p>
                <ol className="space-y-2">
                  {batch.events.map((event) => (
                    <li className="flex flex-wrap justify-between gap-2 rounded-ui-control border border-divider p-3 text-xs" key={event.id}>
                      <span className="font-semibold text-content">
                        {eventLabels[event.eventType] ?? event.eventType}
                      </span>
                      <span className="text-content-muted">
                        {formatDateTime(event.createdAt)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ) : (
            <p className="rounded-ui-control border border-dashed border-divider p-4 text-sm text-content-muted">
              Kalıcı bir import batch&apos;i seçin veya yeni CSV gönderin.
            </p>
          )}
        </div>

        <aside className="min-w-0 space-y-3 print:hidden" aria-label="Import geçmişi">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-content-muted">
              Geçmiş batch&apos;ler
            </p>
            <p className="mt-1 text-xs text-content-muted">
              Seçim URL üzerinden paylaşılabilir.
            </p>
          </div>
          <div className="space-y-2">
            {(listData?.rows ?? []).map((row) => (
              <a
                aria-current={selectedId === row.id ? "true" : undefined}
                className={
                  selectedId === row.id
                    ? "block rounded-ui-control border border-brand-primary bg-brand-primary/5 p-3"
                    : "block rounded-ui-control border border-divider bg-surface-raised p-3 hover:bg-surface-subtle"
                }
                href={`/hakedis?import=${encodeURIComponent(row.id)}`}
                key={row.id}
                onClick={(event) => {
                  event.preventDefault();
                  window.history.replaceState(null, "", event.currentTarget.href);
                  setSelectedId(row.id);
                }}
              >
                <span className="block font-mono text-xs font-bold text-brand-primary">
                  IMP-{String(row.batchNo).padStart(4, "0")}
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-content">
                  {row.originalFileName}
                </span>
                <span className="mt-1 block text-xs text-content-muted">
                  {statusLabels[row.status] ?? row.status} · {row.totalRowCount} satır
                </span>
              </a>
            ))}
            {!listData?.rows.length ? (
              <p className="rounded-ui-control border border-dashed border-divider p-3 text-xs text-content-muted">
                Bu projede kalıcı import geçmişi yok.
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {confirm ? (
        <div
          aria-labelledby="construction-import-confirm-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 print:hidden"
          onKeyDown={(event) => {
            if (event.key === "Escape" && !pending) closeConfirm();
          }}
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-xl">
            <h6 className="text-lg font-bold text-content" id="construction-import-confirm-title">
              Metraj föyüne uygulamayı onaylayın
            </h6>
            <p className="mt-2 text-sm leading-6 text-content-muted">
              {confirm.label} içindeki doğrulanmış satırlar yeni genel metraj
              föyüne tek transaction ile yazılacak. Bu işlem otomatik olarak
              geri alınmaz.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className={secondaryButton}
                disabled={pending}
                onClick={closeConfirm}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className={primaryButton}
                disabled={pending}
                onClick={() => applyBatch(confirm.batchId)}
                ref={confirmButtonRef}
                type="button"
              >
                {pending ? "Uygulanıyor…" : "Onayla ve uygula"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({
  danger = false,
  label,
  success = false,
  value,
}: {
  danger?: boolean;
  label: string;
  success?: boolean;
  value: number | string;
}) {
  return (
    <div className="rounded-ui-control border border-divider bg-surface-subtle p-3">
      <dt className="text-xs font-semibold text-content-muted">{label}</dt>
      <dd className={danger ? "mt-1 font-mono text-lg font-bold text-danger" : success ? "mt-1 font-mono text-lg font-bold text-success" : "mt-1 font-mono text-lg font-bold text-content"}>
        {value}
      </dd>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "APPLIED") {
    return "rounded-full border border-success/30 bg-success-subtle px-3 py-1 text-xs font-semibold text-success";
  }
  if (status === "FAILED" || status === "CANCELLED") {
    return "rounded-full border border-danger/30 bg-danger-subtle px-3 py-1 text-xs font-semibold text-danger";
  }
  if (status === "VALIDATED") {
    return "rounded-full border border-info/30 bg-info-subtle px-3 py-1 text-xs font-semibold text-info";
  }
  return "rounded-full border border-warning/30 bg-warning-subtle px-3 py-1 text-xs font-semibold text-warning";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(value: number) {
  return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KB`;
}

function readErrors(result: unknown) {
  if (
    result
    && typeof result === "object"
    && "errors" in result
    && Array.isArray(result.errors)
  ) {
    return result.errors.join(" ");
  }
  return "Import işlemi tamamlanamadı.";
}
