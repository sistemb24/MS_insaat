import { describe, expect, it } from "vitest";

import {
  buildEffectiveFinanceSettings,
  FINANCE_SETTINGS_FALLBACK,
  getFinanceSettingsPermission,
  normalizeFinanceSettingsValues,
} from "./finance-settings";
import { defaultTenantScope, type TenantScope } from "./tenant-scope";

function createTenantScope(overrides: Partial<TenantScope> = {}): TenantScope {
  return { ...defaultTenantScope, ...overrides };
}

describe("finance settings domain", () => {
  it("returns documented fallback without a persisted row", () => {
    expect(
      buildEffectiveFinanceSettings(null, createTenantScope({ userRole: "admin" })),
    ).toMatchObject({
      ...FINANCE_SETTINGS_FALLBACK,
      canManage: true,
      revisionNo: 0,
      source: "fallback",
    });
  });

  it("normalizes valid VAT values and rejects excess precision", () => {
    expect(
      normalizeFinanceSettingsValues({
        defaultVatRate: 18.25,
        showVatBreakdown: false,
      }),
    ).toEqual({ defaultVatRate: 18.25, showVatBreakdown: false });
    expect(() =>
      normalizeFinanceSettingsValues({
        defaultVatRate: 18.255,
        showVatBreakdown: true,
      }),
    ).toThrow("en fazla 2 ondalık");
  });

  it("allows only admins in an open period to manage settings", () => {
    expect(getFinanceSettingsPermission({ role: "admin" }).allowed).toBe(true);
    expect(getFinanceSettingsPermission({ role: "accounting" }).allowed).toBe(false);
    expect(
      getFinanceSettingsPermission({ periodClosed: true, role: "admin" }).allowed,
    ).toBe(false);
  });
});
