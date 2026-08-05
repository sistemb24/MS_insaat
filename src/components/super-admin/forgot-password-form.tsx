"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  requestAction: (formData: FormData) => Promise<{ ok: true }>;
};

type FormState = "idle" | "success" | "error" | "rate_limited";

function isValidEmail(value: string): boolean {
  const atIndex = value.indexOf("@");
  if (atIndex < 1) return false;
  const domain = value.slice(atIndex + 1);
  return domain.includes(".") && domain.length > 2;
}

export function ForgotPasswordForm({ requestAction }: Props) {
  const [state, setState] = useState<FormState>("idle");
  const [isPending, setIsPending] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Client-side format validation
    if (!isValidEmail(email)) {
      setClientError("Geçerli bir e-posta adresi girin");
      return;
    }

    setClientError(null);
    setIsPending(true);

    try {
      const formData = new FormData(e.currentTarget);
      await requestAction(formData);
      // Anti-enumeration: always show success
      setState("success");
    } catch {
      setState("error");
    } finally {
      setIsPending(false);
    }
  }

  function handleResend() {
    setState("idle");
    setClientError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Atmospheric background blur (optional) */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand-primary opacity-10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-1/2 h-72 w-72 rounded-full bg-[var(--ds-surface-container)] opacity-20 blur-3xl" />

      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-ui-control bg-brand-primary text-on-brand">
          <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>mail</span>
        </div>
        <h1 className="text-xl font-semibold text-content md:text-2xl">Şifremi Unuttum</h1>
        <p className="text-sm text-content-subtle">
          E-posta adresinizi girin, size sıfırlama bağlantısı gönderelim
        </p>
      </div>

      {/* Success state */}
      {state === "success" ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-ui-panel border border-[var(--ds-success)] bg-success-subtle px-4 py-3 text-sm text-[var(--ds-success)]" role="status">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
              <span>E-posta gönderildi. Gelen kutunuzu kontrol edin.</span>
            </div>
          </div>

          <button
            className="flex h-10 w-full items-center justify-center gap-2 rounded-ui-control border border-divider bg-transparent px-4 text-sm font-semibold text-content transition-colors hover:bg-[var(--ds-surface-container)] focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
            onClick={handleResend}
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>refresh</span>
            Yeniden gönder
          </button>

          <Link
            className="flex items-center justify-center gap-1.5 text-sm text-content-subtle transition-colors hover:text-content"
            href="/super-admin/giris"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
            Giriş sayfasına dön
          </Link>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Email field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-content-subtle" htmlFor="email">
              E-posta Adresi
            </label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none"
                style={{ fontSize: "18px" }}
              >
                mail
              </span>
              <input
                autoComplete="email"
                className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised pl-10 pr-4 text-sm text-content outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:opacity-65"
                disabled={isPending}
                id="email"
                name="email"
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (clientError) setClientError(null);
                }}
                placeholder="ornek@noaconstruction.com"
                type="email"
                value={email}
              />
            </div>

            {/* Client-side validation error */}
            {clientError ? (
              <p className="flex items-center gap-1 text-xs text-[var(--ds-danger)]" role="alert">
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>error</span>
                {clientError}
              </p>
            ) : null}
          </div>

          {/* Submit button */}
          <button
            aria-busy={isPending}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-65"
            disabled={isPending}
            type="submit"
          >
            {isPending ? (
              <>
                <span aria-hidden="true" className="material-symbols-outlined animate-spin" style={{ fontSize: "16px" }}>progress_activity</span>
                Gönderiliyor...
              </>
            ) : (
              "Sıfırlama Bağlantısı Gönder"
            )}
          </button>

          {/* Footer note */}
          <p className="text-center text-xs text-content-muted">
            Şifre sıfırlama bağlantısı 30 dakika geçerlidir.
          </p>

          {/* Back link — always visible */}
          <Link
            className="flex items-center justify-center gap-1.5 text-sm text-content-subtle transition-colors hover:text-content"
            href="/super-admin/giris"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
            Giriş sayfasına dön
          </Link>
        </form>
      )}

      {/* Back link in success state — also always visible */}
      {state !== "success" ? null : (
        <p className="text-center text-xs text-content-muted">
          Şifre sıfırlama bağlantısı 30 dakika geçerlidir.
        </p>
      )}
    </div>
  );
}
