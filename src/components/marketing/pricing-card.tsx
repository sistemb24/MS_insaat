"use client";

import Link from "next/link";

import { calculateYearlyBilling } from "@/lib/marketing/billing-calculator";
import { formatCurrency } from "@/lib/marketing/formatters";

type BillingCycle = "monthly" | "yearly";

export type { BillingCycle };

type PricingCardProps = {
  billingCycle: BillingCycle;
  ctaHref: string; // "/kayit?plan=<planId>"
  ctaLabel: string;
  description: string;
  features: string[];
  isPopular?: boolean; // "En Popüler" badge
  monthlyPrice: number; // 0 = ücretsiz
  name: string;
  planId: string;
  apiRequestsPerDay?: number; // varsa listele
};

export default function PricingCard({
  billingCycle,
  ctaHref,
  ctaLabel,
  description,
  features,
  isPopular = false,
  monthlyPrice,
  name,
  planId,
  apiRequestsPerDay,
}: PricingCardProps) {
  // Yıllık faturalandırma hesaplama
  const yearlyResult =
    billingCycle === "yearly" && monthlyPrice > 0
      ? calculateYearlyBilling(monthlyPrice)
      : null;

  // Features listesine API istek limitini ekle
  const allFeatures = [...features];
  if (apiRequestsPerDay) {
    allFeatures.push(`${apiRequestsPerDay.toLocaleString("tr-TR")} istek/gün`);
  }

  return (
    <article
      className="pricing-card"
      data-plan-id={planId}
      style={{
        position: "relative",
        border: isPopular
          ? "none"
          : "1px solid var(--ds-outline-variant)",
        borderRadius: "var(--ds-radius-panel)",
        padding: "24px",
        background: isPopular
          ? "var(--ds-primary)"
          : "var(--ds-surface-raised)",
        color: isPopular ? "var(--ds-on-primary)" : "var(--ds-on-surface)",
        transition: "transform 0.2s ease-in-out",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
      onMouseEnter={(e) => {
        const scale = isPopular ? 1.04 : 1.02;
        e.currentTarget.style.transform = `scale(${scale})`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {/* En Popüler Badge */}
      {isPopular && (
        <div
          style={{
            position: "absolute",
            top: "-12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ds-primary)",
            color: "var(--ds-on-primary)",
            padding: "6px 16px",
            borderRadius: "var(--ds-radius-full)",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: "2px solid var(--ds-surface)",
            whiteSpace: "nowrap",
          }}
        >
          En Popüler
        </div>
      )}

      {/* Plan Başlığı */}
      <div style={{ marginBottom: "16px", marginTop: isPopular ? "8px" : "0" }}>
        <h3
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "8px",
            color: isPopular ? "var(--ds-on-primary)" : "var(--ds-on-surface)",
          }}
        >
          {name}
        </h3>
        <p
          style={{
            fontSize: "0.875rem",
            color: isPopular
              ? "color-mix(in srgb, var(--ds-on-primary) 85%, transparent)"
              : "var(--ds-on-surface-variant)",
            lineHeight: "1.5",
          }}
        >
          {description}
        </p>
      </div>

      {/* Fiyatlandırma */}
      <div style={{ marginBottom: "24px" }}>
        {monthlyPrice === 0 ? (
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: 700,
              color: isPopular
                ? "var(--ds-on-primary)"
                : "var(--ds-on-surface)",
            }}
          >
            Ücretsiz
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  color: isPopular
                    ? "var(--ds-on-primary)"
                    : "var(--ds-on-surface)",
                }}
              >
                {billingCycle === "yearly" && yearlyResult
                  ? formatCurrency(yearlyResult.effectiveMonthly)
                  : formatCurrency(monthlyPrice)}
              </span>
              <span
                style={{
                  fontSize: "1rem",
                  color: isPopular
                    ? "color-mix(in srgb, var(--ds-on-primary) 85%, transparent)"
                    : "var(--ds-on-surface-variant)",
                }}
              >
                /ay
              </span>
            </div>

            {/* Yıllık tasarruf gösterimi */}
            {billingCycle === "yearly" && yearlyResult && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "0.875rem",
                  color: isPopular
                    ? "color-mix(in srgb, var(--ds-on-primary) 90%, transparent)"
                    : "var(--ds-on-surface-variant)",
                }}
              >
                <div>
                  Yıllık: {formatCurrency(yearlyResult.yearlyTotal)}
                </div>
                <div style={{ fontWeight: 600, marginTop: "4px" }}>
                  {formatCurrency(yearlyResult.annualSaving)} tasarruf
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Features Listesi */}
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          marginBottom: "24px",
          flex: 1,
        }}
      >
        {allFeatures.map((feature, index) => (
          <li
            key={index}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              marginBottom: "12px",
              fontSize: "0.875rem",
              lineHeight: "1.5",
              color: isPopular
                ? "var(--ds-on-primary)"
                : "var(--ds-on-surface)",
            }}
          >
            <span
              style={{
                flexShrink: 0,
                fontSize: "1.125rem",
                fontWeight: 700,
                color: isPopular
                  ? "var(--ds-on-primary)"
                  : "var(--ds-primary)",
              }}
              aria-hidden="true"
            >
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Link
        href={ctaHref}
        style={{
          display: "block",
          width: "100%",
          padding: "12px 24px",
          borderRadius: "var(--ds-radius-button)",
          fontSize: "1rem",
          fontWeight: 600,
          textAlign: "center",
          textDecoration: "none",
          background: isPopular
            ? "var(--ds-on-primary)"
            : "var(--ds-primary)",
          color: isPopular ? "var(--ds-primary)" : "var(--ds-on-primary)",
          border: isPopular
            ? "2px solid var(--ds-on-primary)"
            : "2px solid var(--ds-primary)",
          transition: "all 0.2s ease-in-out",
        }}
        onMouseEnter={(e) => {
          if (isPopular) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--ds-on-primary)";
          } else {
            e.currentTarget.style.opacity = "0.9";
          }
        }}
        onMouseLeave={(e) => {
          if (isPopular) {
            e.currentTarget.style.background = "var(--ds-on-primary)";
            e.currentTarget.style.color = "var(--ds-primary)";
          } else {
            e.currentTarget.style.opacity = "1";
          }
        }}
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
