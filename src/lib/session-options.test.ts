import { describe, expect, it } from "vitest";

import { sessionRecordToOption } from "./session-options";
import type { SessionScopeRecord } from "./session-scope";

describe("session options", () => {
  it("creates a compact label for the shell switcher", () => {
    const option = sessionRecordToOption(createRecord());

    expect(option).toEqual({
      companyLabel: "DEMO İNŞAAT / 2026",
      id: "demo-accounting",
      label: "Ana Kullanıcı · DEMO İNŞAAT / 2026",
      roleLabel: "Muhasebe",
      userName: "Ana Kullanıcı",
    });
  });

  it("uses a safe role label for unknown normalized fallbacks", () => {
    const option = sessionRecordToOption({
      ...createRecord(),
      userRole: "viewer",
    });

    expect(option.roleLabel).toBe("Salt Okur");
  });
});

function createRecord(): SessionScopeRecord {
  return {
    id: "demo-accounting",
    tenantId: "tenant-noa-demo",
    tenantName: "NOA Demo Tenant",
    companyId: "company-demo-insaat",
    companyName: "DEMO İNŞAAT",
    periodId: "period-2026",
    periodLabel: "2026",
    userId: "user-main",
    userName: "Ana Kullanıcı",
    userRole: "accounting",
    licenseLabel: "Pilot P0",
    expiresAt: null,
  };
}
