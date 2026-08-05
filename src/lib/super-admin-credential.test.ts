import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  evaluatePasswordStrength,
  doPasswordsMatch,
  computeLockDuration,
} from "./super-admin-credential";

// Feature: super-admin-authentication, Property 1: password-strength-consistency
// Validates: Requirements 4.7
describe("evaluatePasswordStrength", () => {
  it("isValid her zaman dört kriterin mantıksal çarpımına eşit olmalı", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = evaluatePasswordStrength(password);
        const expected =
          result.hasMinLength &&
          result.hasUppercase &&
          result.hasLowercase &&
          result.hasDigitOrSpecial;
        return result.isValid === expected;
      }),
      { numRuns: 1000 },
    );
  });
});

// Feature: super-admin-authentication, Property 2: password-match-detection
// Validates: Requirements 4.8
describe("doPasswordsMatch", () => {
  it("aynı string için true döner", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        return doPasswordsMatch(s, s) === true;
      }),
      { numRuns: 1000 },
    );
  });

  it("farklı stringler için false döner", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        fc.pre(a !== b);
        return doPasswordsMatch(a, b) === false;
      }),
      { numRuns: 1000 },
    );
  });
});

// Feature: super-admin-authentication, Property 6: lock-escalation-policy
// Validates: Requirements 7.4, 7.10
describe("computeLockDuration", () => {
  it("kilitleme süresi tırmanma politikasına uygun olmalı", () => {
    fc.assert(
      fc.property(fc.nat(50), (n) => {
        const duration = computeLockDuration(n);
        if (n < 5) return duration === 0;
        if (n < 10) return duration === 15;
        if (n < 20) return duration === 60;
        return duration === null;
      }),
      { numRuns: 500 },
    );
  });

  it("sınır değerlerini doğru sınıflandırmalı", () => {
    expect(computeLockDuration(4)).toBe(0);
    expect(computeLockDuration(5)).toBe(15);
    expect(computeLockDuration(9)).toBe(15);
    expect(computeLockDuration(10)).toBe(60);
    expect(computeLockDuration(19)).toBe(60);
    expect(computeLockDuration(20)).toBeNull();
  });
});
