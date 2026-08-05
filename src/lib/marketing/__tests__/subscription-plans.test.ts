import { describe, it, expect } from "vitest";
import {
  MARKETING_COMPARISON_FEATURES,
  MARKETING_PLANS,
  TRIAL_DAYS,
} from "../subscription-plans";

describe("MARKETING_PLANS", () => {
  it("dört plan içerir", () => {
    expect(MARKETING_PLANS).toHaveLength(4);
  });

  it("tüm planlar zorunlu alanları içerir", () => {
    for (const plan of MARKETING_PLANS) {
      expect(plan.id).toBeTruthy();
      expect(plan.name).toBeTruthy();
      expect(typeof plan.monthlyPrice).toBe("number");
      expect(plan.monthlyPrice).toBeGreaterThan(0);
      expect(plan.userLimit).toBeGreaterThan(0);
      expect(plan.isActive).toBe(true);
      expect(Array.isArray(plan.includedModules)).toBe(true);
    }
  });

  it("planlar sortOrder'a göre sıralıdır", () => {
    const sorted = [...MARKETING_PLANS].sort((a, b) => a.sortOrder - b.sortOrder);
    expect(MARKETING_PLANS.map((p) => p.id)).toEqual(sorted.map((p) => p.id));
  });

  it("Profesyonel plan apiRequestsPerDay içerir", () => {
    const pro = MARKETING_PLANS.find((p) => p.id === "profesyonel");
    expect(pro?.apiRequestsPerDay).toBeGreaterThan(0);
  });

  it("Plan ID'leri subscription-seed ile uyumludur", () => {
    const expectedIds = ["baslangic", "standart", "profesyonel", "kurumsal"];
    expect(MARKETING_PLANS.map((p) => p.id)).toEqual(expectedIds);
  });

  it("TRIAL_DAYS tanımlıdır", () => {
    expect(TRIAL_DAYS).toBe(14);
  });

  it("karşılaştırma matrisini aynı plan sözleşmesinden ve truthful capability etiketinden üretir", () => {
    const eInvoice = MARKETING_COMPARISON_FEATURES.find((feature) =>
      feature.name.startsWith("E-Fatura"),
    );
    const ai = MARKETING_COMPARISON_FEATURES.find((feature) =>
      feature.name.startsWith("AI Analiz"),
    );

    expect(eInvoice).toMatchObject({
      baslangic: false,
      standart: false,
      profesyonel: true,
      kurumsal: true,
    });
    expect(ai).toMatchObject({
      baslangic: false,
      standart: false,
      profesyonel: false,
      kurumsal: false,
    });
  });
});
