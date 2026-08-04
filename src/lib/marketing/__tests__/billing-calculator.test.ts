import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { calculateYearlyBilling } from "../billing-calculator";

const FC_CONFIG = { numRuns: 100 };

describe("calculateYearlyBilling", () => {
  // Feature: noa-landing-marketing-pages, Property 1: Yearly billing produces effective monthly cost < monthly price and savings > 0
  it("yıllık faturalama: effectiveMonthly < monthlyPrice ve annualSaving > 0", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(99_000), noNaN: true }),
        (monthlyPrice) => {
          const result = calculateYearlyBilling(monthlyPrice);
          expect(result.effectiveMonthly).toBeLessThan(monthlyPrice);
          expect(result.annualSaving).toBeGreaterThan(0);
          expect(result.yearlyTotal).toBeGreaterThan(0);
        },
      ),
      FC_CONFIG,
    );
  });

  it("₺0 plan için tüm değerler sıfır döner", () => {
    const result = calculateYearlyBilling(0);
    expect(result.effectiveMonthly).toBe(0);
    expect(result.yearlyTotal).toBe(0);
    expect(result.annualSaving).toBe(0);
  });

  it("negatif fiyat için tüm değerler sıfır döner", () => {
    const result = calculateYearlyBilling(-100);
    expect(result.effectiveMonthly).toBe(0);
    expect(result.yearlyTotal).toBe(0);
    expect(result.annualSaving).toBe(0);
  });
});
