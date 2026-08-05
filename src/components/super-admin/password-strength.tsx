"use client";

import { evaluatePasswordStrength } from "@/lib/super-admin-password-policy";

type PasswordStrengthProps = {
  password: string;
};

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const result = evaluatePasswordStrength(password);

  const metCount = [
    result.hasMinLength,
    result.hasUppercase,
    result.hasLowercase,
    result.hasDigitOrSpecial,
  ].filter(Boolean).length;

  // Renk: 0-1 danger, 2-3 warning, 4 success
  const barColor =
    metCount === 4
      ? "bg-[var(--ds-success)]"
      : metCount >= 2
      ? "bg-[var(--ds-warning)]"
      : "bg-[var(--ds-danger)]";

  const criteria = [
    { met: result.hasMinLength, label: "En az 8 karakter" },
    { met: result.hasUppercase, label: "En az bir büyük harf" },
    { met: result.hasLowercase, label: "En az bir küçük harf" },
    { met: result.hasDigitOrSpecial, label: "Rakam veya özel karakter" },
  ];

  if (!password) return null;

  return (
    <div aria-live="polite" className="mt-2 flex flex-col gap-2">
      {/* Progress bar */}
      <div className="flex gap-1 h-1.5 w-full">
        {criteria.map((_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-colors ${
              i < metCount ? barColor : "bg-[var(--ds-surface-container)]"
            }`}
          />
        ))}
      </div>
      {/* Criteria list */}
      <ul className="flex flex-col gap-1">
        {criteria.map(({ met, label }) => (
          <li
            key={label}
            className={`flex items-center gap-1 text-xs ${
              met ? "text-[var(--ds-success)]" : "text-content-muted"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
              {met ? "check" : "close"}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
