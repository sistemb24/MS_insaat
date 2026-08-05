import { describe, expect, it } from "vitest";

import {
  canUseDocumentPermission,
  createAccessProfileMutationKey,
  type EffectiveDocumentAccess,
  validateAccessProfileValues,
} from "./access-profile";

describe("access profile domain", () => {
  it("normalizes profile input and removes duplicate permissions", () => {
    expect(
      validateAccessProfileValues({
        description: "  Saha ekibi  ",
        expectedRevisionNo: 0,
        name: "  Saha   Doküman  ",
        permissions: ["document.view", "document.view"],
        requestKey: "req-1",
      }),
    ).toEqual({
      description: "Saha ekibi",
      name: "Saha Doküman",
      normalizedName: "saha doküman",
      permissions: ["document.view"],
    });
  });

  it("keeps admin unrestricted and applies assigned viewer deny-by-default", () => {
    const assigned: EffectiveDocumentAccess = {
      assigned: true,
      permissions: ["document.view"],
      profileId: "profile-1",
      profileStatus: "ACTIVE" as const,
    };
    expect(canUseDocumentPermission("admin", assigned, "document.file.create")).toBe(true);
    expect(canUseDocumentPermission("viewer", assigned, "document.view")).toBe(true);
    expect(canUseDocumentPermission("viewer", assigned, "document.file.create")).toBe(false);
  });

  it("preserves legacy fallback when no profile is assigned", () => {
    expect(canUseDocumentPermission("viewer", undefined, "document.view")).toBe(true);
    expect(canUseDocumentPermission("viewer", undefined, "document.file.rename")).toBe(false);
    expect(canUseDocumentPermission("accounting", undefined, "document.file.rename")).toBe(true);
  });

  it("scopes mutation keys to tenant, company, period and actor", () => {
    expect(
      createAccessProfileMutationKey(
        {
          companyId: "company",
          periodId: "period",
          tenantId: "tenant",
          userId: "admin",
        },
        "req",
      ),
    ).toBe("tenant::company::period::admin::req");
  });
});
