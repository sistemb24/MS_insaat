"use client";

import Link from "next/link";
import { useState } from "react";

import type { SuperAdminAuthActionResult } from "@/lib/super-admin-auth-error";
import {
  doPasswordsMatch,
  evaluatePasswordStrength,
} from "@/lib/super-admin-credential";
import { PasswordStrength } from "./password-strength";

type Props = {
  token: string | undefined;
  resetAction: (formData: FormData) => Promise<SuperAdminAuthActionResult>;
};

export function ResetPasswordForm({ token, resetAction }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Invalid / missing token guard
  const isTokenInvalid = !token || token.length < 10;

  if (isTokenInvalid) {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="rounded-ui-panel border border-[var(--ds-danger)] bg-danger-subtle px-4 py-3 text-sm"
          role="alert"
        >
          <div className="flex items-center gap-2 text-[var(--ds-danger)]">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
            <span>Geçersiz veya süresi dolmuş bağlantı.</span>
          </div>
        </div>
        <Link
          className="flex items-center justify-center gap-1.5 text-sm text-content-subtle transition-colors hover:text-content"
          href="/super-admin/sifremi-unuttum"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>refresh</span>
          Yeni bağlantı talep et
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="rounded-ui-panel border border-[var(--ds-success)] bg-success-subtle px-4 py-3 text-sm text-[var(--ds-success)]"
          role="status"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
            <span>Şifreniz başarıyla güncellendi.</span>
          </div>
        </div>
        <Link
          className="flex h-10 w-full items-center justify-center gap-2 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
          href="/super-admin/giris"
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  const passwordStrength = evaluatePasswordStrength(password);
  const confirmMismatch =
    confirmPassword.length > 0 && !doPasswordsMatch(password, confirmPassword);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Client-side strength check
    if (!passwordStrength.isValid) return;
    if (!doPasswordsMatch(password, confirmPassword)) return;

    setIsPending(true);
    setServerError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await resetAction(formData);
      if (result.ok) {
        setIsSuccess(true);
      } else {
        setServerError(result.message);
      }
    } catch {
      setServerError("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {/* Hidden token field */}
      <input name="token" type="hidden" value={token} />

      {/* Server error banner */}
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

      {/* New password field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-content-subtle" htmlFor="new-password">
          Yeni Şifre
        </label>
        <div className="relative">
          <input
            autoComplete="new-password"
            className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 pr-16 text-sm text-content outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:opacity-65"
            disabled={isPending}
            id="new-password"
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Yeni şifrenizi girin"
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-content-subtle transition-colors hover:text-content focus:outline-none"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={0}
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              {showPassword ? "visibility" : "visibility_off"}
            </span>
          </button>
        </div>

        {/* Password requirements box */}
        <div className="rounded-ui-control border border-divider bg-surface-muted p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-content-muted">
            Şifre Gereksinimleri
          </p>
          <ul className="flex flex-col gap-1.5">
            {[
              { met: passwordStrength.hasMinLength, label: "En az 8 karakter" },
              { met: passwordStrength.hasUppercase, label: "Büyük harf (A-Z)" },
              { met: passwordStrength.hasLowercase, label: "Küçük harf (a-z)" },
              { met: passwordStrength.hasDigitOrSpecial, label: "Rakam veya özel karakter" },
            ].map(({ met, label }) => (
              <li className="flex items-center gap-2 text-xs" key={label}>
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined flex-shrink-0 ${met ? "text-[var(--ds-success)]" : "text-content-muted"}`}
                  style={{ fontSize: "14px", fontVariationSettings: met ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {met ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span className={met ? "text-content" : "text-content-muted"}>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Password strength indicator */}
        <PasswordStrength password={password} />
      </div>

      {/* Confirm password field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-content-subtle" htmlFor="confirm-password">
          Yeni Şifre Tekrar
        </label>
        <div className="relative">
          <input
            autoComplete="new-password"
            className={`h-10 w-full rounded-ui-control border bg-surface-raised px-3 pr-16 text-sm text-content outline-none transition-colors focus:ring-1 disabled:opacity-65 ${
              confirmMismatch
                ? "border-[var(--ds-danger)] focus:border-[var(--ds-danger)] focus:ring-[var(--ds-danger)]"
                : "border-divider focus:border-brand-primary focus:ring-brand-primary"
            }`}
            disabled={isPending}
            id="confirm-password"
            name="confirmPassword"
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Şifrenizi tekrar girin"
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
          />
          <button
            aria-label={showConfirm ? "Şifreyi gizle" : "Şifreyi göster"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-content-subtle transition-colors hover:text-content focus:outline-none"
            onClick={() => setShowConfirm((v) => !v)}
            tabIndex={0}
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              {showConfirm ? "visibility" : "visibility_off"}
            </span>
          </button>
        </div>

        {confirmMismatch ? (
          <p className="flex items-center gap-1 text-xs text-[var(--ds-danger)]" role="alert">
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>error</span>
            Şifreler eşleşmiyor
          </p>
        ) : null}
      </div>

      {/* Submit button */}
      <button
        aria-busy={isPending}
        className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-65"
        disabled={isPending || !passwordStrength.isValid || confirmMismatch || confirmPassword.length === 0}
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
            Kaydediliyor...
          </>
        ) : (
          "Şifremi Sıfırla"
        )}
      </button>
    </form>
  );
}
