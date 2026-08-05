"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import {
  COMPANY_LOGO_MAX_BYTES,
  type EffectiveCompanyBrandAsset,
} from "@/lib/company-brand-asset";
import type { CompanyBrandAssetResult } from "@/lib/company-brand-asset-service";

type MutationResult = CompanyBrandAssetResult<{
  asset: EffectiveCompanyBrandAsset;
  idempotent: boolean;
}>;

export function CompanyBrandAssetPanel({
  asset,
  onRemove,
  onUpload,
}: {
  asset: EffectiveCompanyBrandAsset;
  onRemove?: (values: {
    expectedRevisionNo: number;
    requestKey: string;
  }) => Promise<MutationResult>;
  onUpload?: (formData: FormData) => Promise<MutationResult>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleUpload() {
    if (!asset.canManage || !onUpload) return;
    if (!selectedFile || selectedFile.size === 0) {
      setNotice("Yüklenecek logo dosyasını seçin.");
      return;
    }
    if (selectedFile.size > COMPANY_LOGO_MAX_BYTES) {
      setNotice("Logo dosyası 512 KiB sınırını aşamaz.");
      return;
    }
    const formData = new FormData();
    formData.set("logo", selectedFile);
    formData.set("expectedRevisionNo", String(asset.revisionNo));
    formData.set("requestKey", createRequestKey("upload"));
    setIsSaving(true);
    const result = await onUpload(formData);
    setIsSaving(false);
    if (!result.ok) {
      setNotice(result.errors.join(" "));
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
    setSelectedFile(null);
    setNotice(
      result.data.idempotent
        ? "Firma logosu daha önce tamamlanan işlemden okundu."
        : "Firma logosu kaydedildi ve belge başlıklarına uygulandı.",
    );
  }

  async function handleRemove() {
    if (!asset.canManage || !onRemove || asset.source !== "persisted") return;
    setIsSaving(true);
    const result = await onRemove({
      expectedRevisionNo: asset.revisionNo,
      requestKey: createRequestKey("remove"),
    });
    setIsSaving(false);
    setNotice(
      result.ok
        ? "Firma logosu belge başlıklarından kaldırıldı."
        : result.errors.join(" "),
    );
  }

  return (
    <section
      aria-labelledby="company-brand-title"
      className="rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
            Belge markalaması
          </p>
          <h2 className="mt-1 text-lg font-bold text-content" id="company-brand-title">
            Firma logosu
          </h2>
          <p className="mt-1 text-sm text-content-subtle">
            Fatura ve hakediş belge başlıklarında kullanılan şirket logosu.
          </p>
        </div>
        <span className="rounded-full border border-divider bg-surface-muted px-3 py-1 text-xs font-semibold text-content-subtle">
          Revizyon {asset.revisionNo}
        </span>
      </div>

      <div className="mt-4 flex min-h-28 items-center justify-center rounded-ui-control border border-dashed border-divider bg-surface-muted p-4">
        {asset.dataUrl && asset.width && asset.height ? (
          <Image
            alt="Firma logosu önizlemesi"
            className="max-h-24 w-auto object-contain"
            height={asset.height}
            src={asset.dataUrl}
            unoptimized
            width={asset.width}
          />
        ) : (
          <p className="text-sm font-medium text-content-subtle">
            Henüz firma logosu yüklenmedi.
          </p>
        )}
      </div>

      {asset.source === "persisted" ? (
        <p className="mt-2 text-xs text-content-subtle">
          {asset.width} × {asset.height} px · {Math.ceil(asset.sizeBytes / 1024)} KiB
        </p>
      ) : null}

      {asset.canManage ? (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleUpload();
          }}
        >
          <label className="grid gap-1 text-sm font-semibold text-content">
            Logo dosyası
            <input
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              className="rounded-ui-control border border-divider bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-ui-control file:border-0 file:bg-brand-primary-subtle file:px-3 file:py-1.5 file:font-semibold file:text-brand-primary"
              disabled={isSaving}
              name="logo"
              onChange={(event) =>
                setSelectedFile(event.currentTarget.files?.[0] ?? null)
              }
              ref={inputRef}
              required
              type="file"
            />
          </label>
          <p className="text-xs text-content-subtle">
            PNG, JPEG veya WebP · en fazla 512 KiB · 64–1600 px.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-ui-control bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || !onUpload}
              type="submit"
            >
              {isSaving ? "İşleniyor…" : "Logoyu yükle"}
            </button>
            {asset.source === "persisted" ? (
              <button
                className="rounded-ui-control border border-danger/40 bg-surface px-4 py-2 text-sm font-bold text-danger disabled:opacity-60"
                disabled={isSaving || !onRemove}
                onClick={() => void handleRemove()}
                type="button"
              >
                Logoyu kaldır
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-ui-control border border-divider bg-surface-muted p-3 text-sm text-content-subtle">
          Logo yalnız yönetici rolü tarafından değiştirilebilir.
        </p>
      )}

      {notice ? (
        <p className="mt-3 text-sm font-semibold text-content-subtle" role="status">
          {notice}
        </p>
      ) : null}
    </section>
  );
}

function createRequestKey(action: "remove" | "upload") {
  return `company-brand-${action}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
