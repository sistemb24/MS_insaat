"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import type { SuperAdminAuthActionResult } from "@/lib/super-admin-auth-error";

type Props = {
  verifyAction: (formData: FormData) => Promise<SuperAdminAuthActionResult>;
  resendAction: (formData: FormData) => Promise<SuperAdminAuthActionResult>;
  returnTo?: string;
  error?: string;
};

const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 600; // 10 minutes

export function OtpInput({ verifyAction, resendAction, returnTo, error: initialError }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [serverError, setServerError] = useState<string | null>(initialError ?? null);
  const [isExpired, setIsExpired] = useState(false);
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));

  // Focus the first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const countdownLabel = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  function focusInput(index: number) {
    inputRefs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]?.focus();
  }

  function handleChange(index: number, value: string) {
    const cleaned = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    if (cleaned && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    // Focus the last filled index or the last input
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    focusInput(focusIdx);
    // Auto-submit if all 6 digits pasted
    if (pasted.length === OTP_LENGTH) {
      const code = pasted;
      startTransition(async () => {
        const fd = new FormData();
        fd.set("otp", code);
        if (returnTo) fd.set("returnTo", returnTo);
        const result = await verifyAction(fd);
        if (!result.ok) {
          setServerError(result.message);
          setDigits(Array(OTP_LENGTH).fill(""));
          setTimeout(() => focusInput(0), 0);
        }
      });
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== OTP_LENGTH) return;
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("otp", code);
      if (returnTo) fd.set("returnTo", returnTo);
      const result = await verifyAction(fd);
      if (!result.ok) {
        setServerError(result.message);
        setDigits(Array(OTP_LENGTH).fill(""));
        setTimeout(() => focusInput(0), 0);
      }
    });
  }

  async function handleResend() {
    if (resendCooldown > 0 || isPending) return;
    setResendMessage(null);
    setServerError(null);
    const fd = new FormData();
    const result = await resendAction(fd);
    if (result.ok) {
      // Reset countdown
      setRemaining(COUNTDOWN_SECONDS);
      setIsExpired(false);
      setDigits(Array(OTP_LENGTH).fill(""));
      setResendCooldown(60); // 60-second resend cooldown
      setResendMessage("Yeni kod gönderildi.");
      setTimeout(() => focusInput(0), 0);
    } else {
      setServerError(result.message);
    }
  }

  const codeComplete = digits.every(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {/* Countdown timer */}
      <div className="flex items-center justify-center gap-2">
        <div
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-sm font-medium ${
            isExpired
              ? "border-[var(--ds-danger)] bg-danger-subtle text-[var(--ds-danger)]"
              : "border-divider bg-[var(--ds-surface-container)] text-content-subtle"
          }`}
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined"
            style={{ fontSize: "16px", fontVariationSettings: "'FILL' 0" }}
          >
            timer
          </span>
          <span aria-live="polite" aria-label={`Kalan süre: ${countdownLabel}`}>
            {countdownLabel}
          </span>
        </div>
      </div>

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

      {/* Resend success message */}
      {resendMessage ? (
        <div
          className="rounded-ui-control border border-[var(--ds-success)] bg-success-subtle px-3 py-2 text-sm text-[var(--ds-success)]"
          role="status"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>check_circle</span>
            <span>{resendMessage}</span>
          </div>
        </div>
      ) : null}

      {/* Expired notice */}
      {isExpired ? (
        <div
          className="rounded-ui-control border border-[var(--ds-danger)] bg-danger-subtle px-3 py-2 text-center text-sm text-[var(--ds-danger)]"
          role="alert"
        >
          Kodun süresi doldu. Yeni kod talep edin.
        </div>
      ) : null}

      {/* OTP form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* 6-digit inputs */}
        <div
          className="mx-auto grid max-w-[340px] w-full grid-cols-6 gap-2 sm:gap-3"
          dir="ltr"
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              aria-label={`Doğrulama kodu hanesi ${i + 1}`}
              className="h-12 w-full rounded-ui-control border border-divider bg-surface-raised text-center font-mono text-xl font-semibold text-content outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:opacity-50 sm:h-14"
              disabled={isPending || isExpired}
              inputMode="numeric"
              maxLength={1}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              pattern="[0-9]"
              type="text"
              value={digit}
            />
          ))}
        </div>

        {/* Submit button */}
        <button
          aria-busy={isPending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-ui-control bg-brand-primary text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-65"
          disabled={isPending || !codeComplete || isExpired}
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
            <>
              Doğrula
              <span
                aria-hidden="true"
                className="material-symbols-outlined"
                style={{ fontSize: "18px", fontVariationSettings: "'FILL' 0" }}
              >
                arrow_forward
              </span>
            </>
          )}
        </button>
      </form>

      {/* Actions section */}
      <div className="flex flex-col items-center gap-3 border-t border-divider pt-4 text-center">
        {/* Resend button */}
        <button
          className={`text-sm transition-colors focus:outline-none focus:underline ${
            resendCooldown > 0 || isPending
              ? "cursor-not-allowed text-content-muted"
              : "text-brand-primary hover:underline"
          }`}
          disabled={resendCooldown > 0 || isPending}
          onClick={handleResend}
          type="button"
        >
          {resendCooldown > 0
            ? `Yeniden gönder (${resendCooldown}s)`
            : "Kodu almadınız mı? Yeniden gönder"}
        </button>

        {/* Back link */}
        <Link
          className="flex items-center gap-1 text-sm text-content-subtle transition-colors hover:text-content"
          href="/super-admin/giris"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined"
            style={{ fontSize: "16px", fontVariationSettings: "'FILL' 0" }}
          >
            arrow_back
          </span>
          Önceki adıma dön
        </Link>
      </div>
    </div>
  );
}
