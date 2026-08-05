"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import type { SuperAdminAuthActionResult } from "@/lib/super-admin-auth-error";

type Props = {
  verifyAction: (formData: FormData) => Promise<SuperAdminAuthActionResult>;
};

export function TwoFaForm({ verifyAction }: Props) {
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [showBackup, setShowBackup] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTotpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
    setTotpCode(value);
    if (serverError) setServerError(null);

    // Cancel any pending auto-submit
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);

    // Auto-submit after 300ms when 6 digits entered
    if (value.length === 6) {
      autoSubmitTimerRef.current = setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 300);
    }
  }

  function handleBackupChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBackupCode(e.target.value.slice(0, 8));
    if (serverError) setServerError(null);
  }

  function handleTotpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("totp_code", totpCode);
      const result = await verifyAction(fd);
      if (!result.ok) {
        setServerError(result.message);
        setTotpCode("");
      }
    });
  }

  function handleBackupSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (backupCode.length !== 8) return;
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("backup_code", backupCode);
      const result = await verifyAction(fd);
      if (!result.ok) {
        setServerError(result.message);
        setBackupCode("");
      }
    });
  }

  return (
    <div className="relative flex flex-col gap-6">
      {/* Top accent line */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 h-1 -mt-6 bg-brand-primary"
        style={{ marginLeft: "-1.5rem", marginRight: "-1.5rem", width: "calc(100% + 3rem)" }}
      />

      {/* Error alert */}
      {serverError ? (
        <div
          className="rounded-ui-control border border-[var(--ds-danger)] bg-danger-subtle px-3 py-2 text-sm text-[var(--ds-danger)]"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>error</span>
            <span>{serverError}</span>
          </div>
        </div>
      ) : null}

      {/* TOTP form */}
      <form onSubmit={handleTotpSubmit} className="flex flex-col gap-4" ref={formRef}>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-content-subtle" htmlFor="totp-code">
            Doğrulama Kodu
          </label>
          <input
            autoComplete="one-time-code"
            autoFocus
            className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-center font-mono text-lg font-semibold text-content tracking-[0.5em] outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
            disabled={isPending}
            id="totp-code"
            inputMode="numeric"
            maxLength={6}
            onChange={handleTotpChange}
            placeholder="000000"
            type="text"
            value={totpCode}
          />
          {/* Context hint */}
          <p className="text-xs text-content-muted">
            Kodunuz 30 saniyede bir yenilenir.
          </p>
        </div>

        <button
          aria-busy={isPending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-ui-control bg-brand-primary text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-65"
          disabled={isPending || totpCode.length !== 6}
          type="submit"
        >
          {isPending ? (
            <>
              <span
                aria-hidden="true"
                className="material-symbols-outlined animate-spin"
                style={{ fontSize: "16px" }}
              >
                progress_activity
              </span>
              Doğrulanıyor...
            </>
          ) : (
            "Doğrula"
          )}
        </button>
      </form>

      {/* Collapsible backup code section */}
      <div className="border-t border-divider pt-4">
        <button
          className="flex w-full items-center justify-between text-sm font-medium text-content-subtle transition-colors hover:text-content focus:outline-none"
          onClick={() => setShowBackup((v) => !v)}
          type="button"
          aria-expanded={showBackup}
        >
          <span>Yedek kod kullan</span>
          <span
            aria-hidden="true"
            className="material-symbols-outlined transition-transform duration-200"
            style={{
              fontSize: "20px",
              transform: showBackup ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            keyboard_arrow_down
          </span>
        </button>

        {showBackup ? (
          <form onSubmit={handleBackupSubmit} className="mt-4 flex flex-col gap-3">
            <p className="text-xs text-content-subtle">
              Uygulamanıza erişemiyorsanız 8 haneli yedek kodunuzu kullanabilirsiniz.
            </p>
            <div className="relative">
              <input
                className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 pr-10 font-mono text-sm text-content outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
                disabled={isPending}
                maxLength={8}
                onChange={handleBackupChange}
                placeholder="Yedek Kod"
                type="text"
                value={backupCode}
              />
              <span
                aria-hidden="true"
                className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-subtle"
                style={{ fontSize: "18px" }}
              >
                key
              </span>
            </div>
            <button
              aria-busy={isPending}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-ui-control border border-divider bg-transparent text-sm font-medium text-content transition-colors hover:bg-[var(--ds-surface-container)] focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-65"
              disabled={isPending || backupCode.length !== 8}
              type="submit"
            >
              {isPending ? (
                <>
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined animate-spin"
                    style={{ fontSize: "16px" }}
                  >
                    progress_activity
                  </span>
                  Doğrulanıyor...
                </>
              ) : (
                "Yedek Kod ile Doğrula"
              )}
            </button>
          </form>
        ) : null}
      </div>

      {/* Back link */}
      <Link
        className="flex items-center justify-center gap-1 text-sm text-content-subtle transition-colors hover:text-content"
        href="/super-admin/giris"
      >
        <span
          aria-hidden="true"
          className="material-symbols-outlined"
          style={{ fontSize: "16px" }}
        >
          arrow_back
        </span>
        Farklı bir hesapla giriş yap
      </Link>
    </div>
  );
}
