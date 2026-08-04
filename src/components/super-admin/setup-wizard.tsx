"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { SuperAdminAuthActionResult } from "@/lib/super-admin-auth-error";
import { evaluatePasswordStrength } from "@/lib/super-admin-password-policy";
import { PasswordStrength } from "./password-strength";

type SetupWizardProps = {
  setupAction: (formData: FormData) => Promise<SuperAdminAuthActionResult>;
};

type StepData = { name: string; email: string; password: string; confirmPassword: string };
type FieldErrors = Partial<Record<keyof StepData | "form", string>>;

const initialData: StepData = { name: "", email: "", password: "", confirmPassword: "" };

export function SetupWizard({ setupAction }: SetupWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function change(event: React.ChangeEvent<HTMLInputElement>) {
    setData((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors((current) => ({ ...current, [event.target.name]: undefined, form: undefined }));
  }

  function validateAccount() {
    const next: FieldErrors = {};
    if (!data.name.trim()) next.name = "Ad Soyad zorunludur.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) next.email = "Geçerli bir e-posta girin.";
    if (!evaluatePasswordStrength(data.password).isValid) next.password = "Şifre güvenlik gereksinimlerini karşılamıyor.";
    if (data.password !== data.confirmPassword) next.confirmPassword = "Şifreler eşleşmiyor.";
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) (formRef.current?.elements.namedItem(first) as HTMLElement | null)?.focus();
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.set(key, value));
    try {
      const result = await setupAction(formData);
      if (result.ok) {
        router.replace("/super-admin/giris?setup=complete");
      } else {
        setErrors({ form: result.message });
        setSubmitting(false);
      }
    } catch {
      setErrors({ form: "Kurulum tamamlanamadı. Lütfen tekrar deneyin." });
      setSubmitting(false);
    }
  }

  const stepLabels = ["Hesap", "Güvenlik", "Onay"];

  return (
    <div className="w-full max-w-[800px] mx-auto">
      {/* Warning banner */}
      <p
        className="mb-5 rounded-ui-control border border-[var(--ds-warning)] bg-warning-subtle px-4 py-3 text-sm text-[var(--ds-warning)]"
        role="note"
      >
        Bu ekran yalnızca platformdaki ilk Süper Admin hesabını oluşturur ve işlem tamamlanınca kapanır.
      </p>

      {/* Stepper */}
      <ol
        aria-label="Kurulum adımları"
        className="mb-6 flex items-center justify-center gap-0"
      >
        {stepLabels.map((label, index) => {
          const stepNum = index + 1;
          const isCompleted = step > stepNum;
          const isCurrent = step === stepNum;
          return (
            <li
              key={label}
              aria-current={isCurrent ? "step" : undefined}
              className="flex items-center"
            >
              <div className="flex flex-col items-center gap-1">
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ring-4 ring-[var(--ds-surface)]",
                    isCompleted
                      ? "bg-brand-primary text-on-brand"
                      : isCurrent
                        ? "bg-brand-primary-strong text-on-brand"
                        : "bg-surface-container text-content-muted",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined"
                      style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}
                    >
                      check
                    </span>
                  ) : (
                    stepNum
                  )}
                </span>
                <span className={`text-xs ${isCurrent ? "font-semibold text-content" : "text-content-muted"}`}>
                  {label}
                </span>
              </div>
              {index < stepLabels.length - 1 ? (
                <div
                  aria-hidden="true"
                  className={`mb-5 h-px w-16 ${step > stepNum ? "bg-brand-primary" : "bg-divider"}`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Form error */}
      {errors.form ? (
        <p className="mb-4 text-sm text-[var(--ds-danger)]" role="alert">
          {errors.form}
        </p>
      ) : null}

      {/* Step 1 — Account info */}
      {step === 1 ? (
        <form
          className="space-y-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (validateAccount()) setStep(2);
          }}
          ref={formRef}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SetupField
              error={errors.name}
              id="name"
              label="Ad Soyad"
              onChange={change}
              value={data.name}
            />
            <SetupField
              error={errors.email}
              id="email"
              label="E-posta"
              onChange={change}
              type="email"
              value={data.email}
            />
            <div className="space-y-1">
              <SetupFieldPassword
                error={errors.password}
                id="password"
                label="Şifre"
                onChange={change}
                show={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
                value={data.password}
              />
              <PasswordStrength password={data.password} />
              {/* Security info box */}
              <div className="flex gap-3 rounded-ui-control border border-divider bg-[var(--ds-surface-container)] p-4">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined mt-0.5 flex-shrink-0 text-content-muted"
                  style={{ fontSize: "18px" }}
                >
                  security
                </span>
                <p className="text-xs text-content-muted">
                  Bu hesap, sistem genelindeki tüm yetkilere tam erişime sahip olacaktır.
                  Şifrenizin en az 12 karakterden oluştuğundan ve karmaşık olduğundan emin olun.
                </p>
              </div>
            </div>
            <SetupFieldPassword
              error={errors.confirmPassword}
              id="confirmPassword"
              label="Şifre Tekrar"
              onChange={change}
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword((v) => !v)}
              value={data.confirmPassword}
            />
          </div>

          <button
            className="h-10 w-full rounded-ui-control bg-brand-primary text-sm font-semibold text-on-brand"
            type="submit"
          >
            İleri
          </button>
        </form>
      ) : null}

      {/* Step 2 — Security */}
      {step === 2 ? (
        <div className="space-y-4">
          <h2 className="font-semibold text-content">Bu dilimde etkin güvenlik</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-content-subtle">
            <li>PBKDF2 ile tuzlanmış şifre özeti</li>
            <li>Kademeli hesap kilidi</li>
            <li>HttpOnly, SameSite Strict oturum</li>
            <li>İki saat hareketsizlik sonunda oturum sonlandırma</li>
          </ul>
          <p className="rounded-ui-control bg-surface-container p-3 text-xs text-content-muted">
            2FA, kurtarma e-postası ve parola sıfırlama bu aşamada etkin değildir; sonraki güvenlik
            fazlarında ayrıca uygulanacaktır.
          </p>
          <div className="flex gap-2">
            <button
              className="h-10 flex-1 rounded-ui-control border border-divider"
              onClick={() => setStep(1)}
              type="button"
            >
              Geri
            </button>
            <button
              className="h-10 flex-1 rounded-ui-control bg-brand-primary font-semibold text-on-brand"
              onClick={() => setStep(3)}
              type="button"
            >
              İleri
            </button>
          </div>
        </div>
      ) : null}

      {/* Step 3 — Confirm */}
      {step === 3 ? (
        <form onSubmit={submit}>
          <dl className="mb-5 space-y-3 rounded-ui-control border border-divider p-4 text-sm">
            <div>
              <dt className="text-content-muted">Ad Soyad</dt>
              <dd className="font-medium text-content">{data.name}</dd>
            </div>
            <div>
              <dt className="text-content-muted">E-posta</dt>
              <dd className="font-medium text-content">{data.email}</dd>
            </div>
            <div>
              <dt className="text-content-muted">Şifre</dt>
              <dd className="font-medium text-content">••••••••</dd>
            </div>
          </dl>
          <div className="space-y-2">
            <button
              aria-busy={submitting}
              className="h-10 w-full rounded-ui-control bg-brand-primary font-semibold text-on-brand disabled:opacity-65"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Kuruluyor…" : "Kurulumu Tamamla"}
            </button>
            <button
              className="h-10 w-full rounded-ui-control border border-divider"
              disabled={submitting}
              onClick={() => setStep(2)}
              type="button"
            >
              Geri
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

// ── Simple text / email field ──────────────────────────────────────────────
function SetupField({
  id,
  label,
  error,
  type = "text",
  value,
  onChange,
}: {
  id: keyof StepData;
  label: string;
  error?: string;
  type?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-content" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete={type === "email" ? "email" : undefined}
        className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-sm text-content outline-none focus:border-brand-primary"
        id={id}
        name={id}
        onChange={onChange}
        required
        type={type}
        value={value}
      />
      {error ? (
        <p className="text-xs text-[var(--ds-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ── Password field with visibility toggle ─────────────────────────────────
function SetupFieldPassword({
  id,
  label,
  error,
  value,
  onChange,
  show,
  onToggleShow,
}: {
  id: keyof StepData;
  label: string;
  error?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-content" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          autoComplete="new-password"
          className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 pr-10 text-sm text-content outline-none focus:border-brand-primary"
          id={id}
          name={id}
          onChange={onChange}
          required
          type={show ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-content-subtle transition-colors hover:text-content focus:outline-none"
          onClick={onToggleShow}
          type="button"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined"
            style={{ fontSize: "18px" }}
          >
            {show ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
      {error ? (
        <p className="text-xs text-[var(--ds-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
