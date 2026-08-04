import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluatePasswordStrength } from "../password-strength";

const FC_CONFIG = { numRuns: 100 };

describe("evaluatePasswordStrength", () => {
  // Feature: noa-landing-marketing-pages, Property 8: Password strength score equals count of met criteria
  it("score met kriter sayısına tam eşit", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 128 }), (password) => {
        const { score, criteria } = evaluatePasswordStrength(password);
        const metCount = criteria.filter((c) => c.met).length;
        expect(score).toBe(metCount);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(4);
      }),
      FC_CONFIG,
    );
  });

  it("güçlü şifre 4 puan alır", () => {
    const { score } = evaluatePasswordStrength("Abc12345!");
    expect(score).toBe(4);
  });

  it("boş şifre 0 puan alır", () => {
    const { score } = evaluatePasswordStrength("");
    expect(score).toBe(0);
  });

  it("her zaman 4 kriter döner", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const { criteria } = evaluatePasswordStrength(password);
        expect(criteria).toHaveLength(4);
      }),
      FC_CONFIG,
    );
  });
});
