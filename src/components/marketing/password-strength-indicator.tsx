"use client";

import { evaluatePasswordStrength } from "@/lib/marketing/password-strength";

type PasswordStrengthIndicatorProps = {
  password: string;
};

export default function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const { score, criteria } = evaluatePasswordStrength(password);

  // Güç etiketi belirleme
  const getStrengthLabel = (score: number): string => {
    if (score <= 1) return "Zayıf";
    if (score === 2) return "Orta";
    return "Güçlü";
  };

  // Renk belirleme
  const getStrengthColor = (score: number): string => {
    if (score <= 1) return "var(--ds-danger)";
    if (score === 2) return "var(--ds-warning)";
    return "var(--ds-success)";
  };

  const strengthColor = getStrengthColor(score);
  const strengthLabel = getStrengthLabel(score);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Renk göstergesi bar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "4px",
            height: "4px",
          }}
        >
          {[0, 1, 2, 3].map((segmentIndex) => (
            <div
              key={segmentIndex}
              style={{
                flex: 1,
                backgroundColor:
                  segmentIndex < score
                    ? strengthColor
                    : "var(--ds-outline-variant)",
                borderRadius: "2px",
                transition: "background-color 200ms ease",
              }}
            />
          ))}
        </div>

        {/* Güç etiketi */}
        <div
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: strengthColor,
            transition: "color 200ms ease",
          }}
        >
          {strengthLabel}
        </div>
      </div>

      {/* Kriterlerin listesi */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {criteria.map((criterion, index) => {
          const isMet = criterion.met;
          const color = isMet
            ? "var(--ds-success)"
            : "var(--ds-on-surface-variant)";

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                color: color,
                transition: "color 200ms ease",
              }}
            >
              {/* İkon */}
              <span
                style={{
                  fontSize: "16px",
                  lineHeight: "1",
                  fontWeight: "bold",
                }}
              >
                {isMet ? "✓" : "○"}
              </span>

              {/* Etiket */}
              <span>{criterion.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
