"use client";

import { useState } from "react";
import { useActionState } from "react";

type LoginFormProps = {
  /** Genel hata mesajı (error query param değeri) */
  error?: string;
  /** `?error=credentials` durumuna kısayol — boolean prop */
  loginError?: boolean;
  /** Kurulum tamamlandı bilgi mesajı */
  setupComplete?: boolean;
  /** Başarılı girişten sonra yönlendirilecek URL */
  returnTo?: string;
  /** Server Action — <form action={loginAction}> */
  loginAction: (formData: FormData) => void | Promise<void>;
};

export function LoginForm({
  error,
  loginError,
  setupComplete,
  returnTo,
  loginAction,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const [, formAction, isPending] = useActionState(
    async (_previous: null, formData: FormData) => {
      await loginAction(formData);
      return null;
    },
    null,
  );

  // loginError prop takes precedence; fall back to error string comparison
  const showCredentialsError = loginError === true || error === "credentials";
  const showLockedError = !loginError && error === "locked";
  const showSessionError = !loginError && error === "session";
  const showUnsupportedError = !loginError && error === "unsupported-security";

  return (
    <form action={formAction} className="space-y-4">
      {/* Hidden fields */}
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}

      {/* Setup complete success banner */}
      {setupComplete ? (
        <p
          className="rounded-ui-control border border-[var(--ds-success)] bg-success-subtle px-3 py-2 text-sm text-[var(--ds-success)]"
          role="status"
        >
          İlk kurulum tamamlandı. Güvenli giriş yapabilirsiniz.
        </p>
      ) : null}

      {/* Error banner */}
      {showCredentialsError || showLockedError || showSessionError || showUnsupportedError ? (
        <p
          className="rounded-ui-control border border-[var(--ds-danger)] bg-danger-subtle px-3 py-2 text-sm font-medium text-[var(--ds-danger)]"
          role="alert"
        >
          {showLockedError
            ? "Hesap geçici olarak kilitlendi. Lütfen daha sonra tekrar deneyin."
            : showSessionError
              ? "Oturumunuz sona erdi. Lütfen yeniden giriş yapın."
              : showUnsupportedError
                ? "Bu hesap için henüz desteklenmeyen bir güvenlik yöntemi etkin."
                : "E-posta veya şifre hatalı."}
        </p>
      ) : null}

      {/* Email field */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-content-subtle" htmlFor="email">
          E-posta
        </label>
        <div className="relative">
          <input
            autoComplete="email"
            className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-sm text-content outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:opacity-65"
            disabled={isPending}
            id="email"
            name="email"
            required
            type="email"
          />
        </div>
      </div>

      {/* Password field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-content-subtle" htmlFor="password">
            Şifre
          </label>
        </div>
        <div className="relative">
          <input
            autoComplete="current-password"
            className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised py-0 pl-3 pr-16 text-sm text-content outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:opacity-65"
            disabled={isPending}
            id="password"
            name="password"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-content-subtle transition-colors hover:text-content focus:outline-none"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={0}
            type="button"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined"
              style={{ fontSize: "18px" }}
            >
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      {/* Submit button */}
      <div className="pt-2">
        <button
          aria-busy={isPending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-65"
          disabled={isPending}
          type="submit"
        >
          {isPending ? (
            <>
              Giriş yapılıyor…
            </>
          ) : (
            <>
              Giriş Yap
            </>
          )}
        </button>
      </div>

      {/* SSL badge */}
      <div className="flex items-center justify-center gap-1.5 border-t border-divider pt-4 text-xs text-content-muted">
        <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: "14px" }}>lock</span>
        <span>SSL Korumalı</span>
      </div>
    </form>
  );
}
