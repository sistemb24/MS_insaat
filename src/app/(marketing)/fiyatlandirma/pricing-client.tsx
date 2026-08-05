"use client";

import { useState } from "react";
import PricingCard from "@/components/marketing/pricing-card";
import { formatPublicModuleLabel } from "@/lib/marketing/public-capabilities";
import { MARKETING_PLANS } from "@/lib/marketing/subscription-plans";
import type { BillingCycle } from "@/components/marketing/pricing-card";

export default function PricingClient() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <>
      {/* Billing toggle */}
      <div
        role="group"
        aria-labelledby="billing-toggle-label"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "48px" }}
      >
        <span
          id="billing-toggle-label"
          className="sr-only"
          style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}
        >
          Faturalama dönemi
        </span>

        <button
          type="button"
          onClick={() => setCycle("monthly")}
          aria-pressed={cycle === "monthly"}
          style={{
            padding: "8px 20px",
            borderRadius: "100px",
            border: "1px solid",
            borderColor: cycle === "monthly" ? "var(--ds-primary)" : "var(--ds-outline-variant)",
            background: cycle === "monthly" ? "var(--ds-primary)" : "transparent",
            color: cycle === "monthly" ? "var(--ds-on-primary)" : "var(--ds-on-surface-variant)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 160ms ease",
          }}
        >
          Aylık
        </button>

        <button
          type="button"
          onClick={() => setCycle("yearly")}
          aria-pressed={cycle === "yearly"}
          style={{
            padding: "8px 20px",
            borderRadius: "100px",
            border: "1px solid",
            borderColor: cycle === "yearly" ? "var(--ds-primary)" : "var(--ds-outline-variant)",
            background: cycle === "yearly" ? "var(--ds-primary)" : "transparent",
            color: cycle === "yearly" ? "var(--ds-on-primary)" : "var(--ds-on-surface-variant)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 160ms ease",
          }}
        >
          Yıllık{" "}
          <span
            style={{
              marginLeft: "6px",
              padding: "2px 8px",
              borderRadius: "100px",
              background: "var(--ds-success-container)",
              color: "var(--ds-success)",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            katalog hesabı
          </span>
        </button>
      </div>

      {/* Plan kartları */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {MARKETING_PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            billingCycle={cycle}
            ctaHref={`/kayit?plan=${plan.id}`}
            ctaLabel="Kayıt Durumunu Gör"
            description={plan.description}
            features={plan.includedModules.map(formatPublicModuleLabel)}
            isPopular={plan.id === "profesyonel"}
            monthlyPrice={plan.monthlyPrice}
            name={plan.name}
            planId={plan.id}
            apiRequestsPerDay={plan.apiRequestsPerDay}
          />
        ))}
      </div>
    </>
  );
}
