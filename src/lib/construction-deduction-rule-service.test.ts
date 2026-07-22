import { describe, expect, it } from "vitest";

import {
  buildConstructionDeductionApplicationKey,
  evaluateConstructionDeductionRules,
  validateConstructionDeductionRule,
  validateConstructionDeductionRuleRevisionSet,
  type ConstructionDeductionRuleDefinition,
} from "./construction-deduction-rule-service";

function rule(
  override: Partial<ConstructionDeductionRuleDefinition> = {},
): ConstructionDeductionRuleDefinition {
  return {
    ruleKey: "rule-retention",
    code: "TEMINAT",
    name: "Teminat Kesintisi",
    revisionNo: 1,
    calculationType: "RATE",
    baseType: "PERIOD_NET_PLUS_EXTRAS",
    rate: 5,
    fixedAmount: null,
    minimumAmount: null,
    maximumAmount: null,
    taxMode: "NONE",
    taxRate: 0,
    priority: 10,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    isActive: true,
    ...override,
  };
}

describe("construction deduction rule domain", () => {
  it("validates rate and fixed rule contracts", () => {
    expect(validateConstructionDeductionRule(rule())).toEqual([]);
    expect(
      validateConstructionDeductionRule(
        rule({
          ruleKey: "rule-penalty",
          code: "CEZA",
          calculationType: "FIXED",
          baseType: null,
          rate: null,
          fixedAmount: 1_250,
        }),
      ),
    ).toEqual([]);
  });

  it("rejects invalid formulas, limits, tax and dates", () => {
    const errors = validateConstructionDeductionRule(
      rule({
        revisionNo: 0,
        priority: -1,
        rate: 101,
        fixedAmount: 500,
        minimumAmount: 1_000,
        maximumAmount: 500,
        taxMode: "NONE",
        taxRate: 20,
        effectiveFrom: "invalid",
        effectiveTo: "2025-01-01",
      }),
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("revizyon numarası"),
        expect.stringContaining("öncelik"),
        expect.stringContaining("oran 0 ile 100"),
        expect.stringContaining("maktu tutar kullanılamaz"),
        expect.stringContaining("alt sınır üst sınırdan büyük"),
        expect.stringContaining("vergi oranı sıfır"),
        expect.stringContaining("başlangıç tarihi geçersiz"),
      ]),
    );
  });

  it("rejects duplicate and overlapping active revisions", () => {
    const errors = validateConstructionDeductionRuleRevisionSet([
      rule({ effectiveTo: "2026-07-31" }),
      rule({ revisionNo: 2, effectiveFrom: "2026-07-01" }),
      rule({ ruleKey: "different-rule", name: "Başka", revisionNo: 2 }),
    ]);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("aktif revizyon tarihleri çakışamaz"),
        expect.stringContaining("aynı kod ve revizyon"),
      ]),
    );
  });

  it("filters inactive and out-of-period rules and orders by priority then code", () => {
    const result = evaluateConstructionDeductionRules({
      rules: [
        rule({ ruleKey: "rule-z", code: "Z-KURAL", priority: 20 }),
        rule({ ruleKey: "rule-b", code: "B-KURAL", priority: 10 }),
        rule({ ruleKey: "rule-a", code: "A-KURAL", priority: 10 }),
        rule({ ruleKey: "inactive", code: "PASIF", isActive: false }),
        rule({ ruleKey: "future", code: "GELECEK", effectiveFrom: "2027-01-01" }),
      ],
      paymentPeriodEnd: "2026-07-31",
      periodNetTotal: 100_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.rows.map((row) => row.code)).toEqual([
      "A-KURAL",
      "B-KURAL",
      "Z-KURAL",
    ]);
  });

  it("calculates rate and fixed rules with money rounding", () => {
    const result = evaluateConstructionDeductionRules({
      rules: [
        rule({ rate: 3.3333 }),
        rule({
          ruleKey: "rule-fixed",
          code: "MAKTU",
          name: "Maktu kesinti",
          calculationType: "FIXED",
          baseType: null,
          rate: null,
          fixedAmount: 333.335,
          priority: 20,
        }),
      ],
      paymentPeriodEnd: "2026-07-31",
      periodNetTotal: 10_000,
      extraWorkTotal: 500,
      additionTotal: 250,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        rows: [
          expect.objectContaining({ baseAmount: 10_750, netAmount: 358.33, totalAmount: 358.33 }),
          expect.objectContaining({ baseAmount: 0, netAmount: 333.34, totalAmount: 333.34 }),
        ],
        periodPayableBeforeRules: 10_750,
        periodPayableTotal: 10_058.33,
        totalRuleDeduction: 691.67,
      },
    });
  });

  it("applies minimum, maximum and VAT after the raw amount", () => {
    const minimum = evaluateConstructionDeductionRules({
      rules: [rule({ baseType: "PERIOD_NET", rate: 1, minimumAmount: 150, taxMode: "VAT_ADD", taxRate: 20 })],
      paymentPeriodEnd: "2026-07-31",
      periodNetTotal: 10_000,
    });
    const maximum = evaluateConstructionDeductionRules({
      rules: [rule({ baseType: "PERIOD_NET", rate: 10, maximumAmount: 400 })],
      paymentPeriodEnd: "2026-07-31",
      periodNetTotal: 10_000,
    });

    expect(minimum.ok && minimum.data.rows[0]).toEqual(
      expect.objectContaining({ netAmount: 150, taxAmount: 30, totalAmount: 180 }),
    );
    expect(maximum.ok && maximum.data.rows[0]).toEqual(
      expect.objectContaining({ netAmount: 400, taxAmount: 0, totalAmount: 400 }),
    );
  });

  it("uses the running payable base after existing and prior deductions", () => {
    const result = evaluateConstructionDeductionRules({
      rules: [
        rule({ baseType: "PERIOD_NET", rate: 10, priority: 10 }),
        rule({ ruleKey: "rule-running", code: "KALAN", baseType: "PAYABLE_BEFORE_RULE", rate: 10, priority: 20 }),
      ],
      paymentPeriodEnd: "2026-07-31",
      periodNetTotal: 100_000,
      extraWorkTotal: 10_000,
      additionTotal: 5_000,
      existingDeductionTotal: 15_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.periodPayableBeforeRules).toBe(100_000);
    expect(result.data.rows[0]).toEqual(expect.objectContaining({ baseAmount: 100_000, totalAmount: 10_000 }));
    expect(result.data.rows[1]).toEqual(expect.objectContaining({ baseAmount: 90_000, totalAmount: 9_000 }));
    expect(result.data.periodPayableTotal).toBe(81_000);
  });

  it("rejects negative inputs and existing deductions above payable", () => {
    expect(
      evaluateConstructionDeductionRules({
        rules: [],
        paymentPeriodEnd: "invalid",
        periodNetTotal: -1,
      }),
    ).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        "Hakediş dönem bitiş tarihi geçersizdir.",
        "Dönem net tutarı negatif olmayan bir sayı olmalıdır.",
      ]),
    });

    expect(
      evaluateConstructionDeductionRules({
        rules: [],
        paymentPeriodEnd: "2026-07-31",
        periodNetTotal: 100,
        existingDeductionTotal: 101,
      }),
    ).toEqual({
      ok: false,
      errors: ["Mevcut kesintiler dönem ödenecek tutarını negatife indiriyor."],
    });
  });

  it("rejects the whole evaluation when a rule makes payable negative", () => {
    const result = evaluateConstructionDeductionRules({
      rules: [
        rule({
          calculationType: "FIXED",
          baseType: null,
          rate: null,
          fixedAmount: 1_001,
        }),
      ],
      paymentPeriodEnd: "2026-07-31",
      periodNetTotal: 1_000,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["TEMINAT: kural sonucu dönem ödenecek tutarını negatife indiriyor."],
    });
  });

  it("builds a normalized deterministic application key", () => {
    expect(
      buildConstructionDeductionApplicationKey({
        tenantId: " Tenant-NOA ",
        companyId: " COMPANY-01 ",
        periodId: " Period-2026 ",
        progressPaymentId: " HAK-01 ",
        ruleKey: " TEMİNAT ",
      }),
    ).toBe("tenant-noa::company-01::period-2026::hak-01::teminat");

    expect(() =>
      buildConstructionDeductionApplicationKey({
        tenantId: "",
        companyId: "company",
        periodId: "period",
        progressPaymentId: "payment",
        ruleKey: "rule",
      }),
    ).toThrow("tüm kapsam alanları zorunludur");
  });
});
