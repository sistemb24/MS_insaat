import { describe, expect, it } from "vitest";

import {
  createInvitationAccessProfileAssignment,
  CUSTOM_RBAC_USER_TYPE,
  validateInvitationAccessProfileSelection,
} from "./user-invitation-access-profile";

describe("user invitation access profile domain", () => {
  it("requires a profile only for the custom RBAC user type", () => {
    expect(
      validateInvitationAccessProfileSelection({ role: CUSTOM_RBAC_USER_TYPE }),
    ).toEqual(["Özel kullanıcı daveti için aktif yetki profili seçilmelidir."]);
    expect(
      validateInvitationAccessProfileSelection({
        accessProfileId: "profile-1",
        role: "İSG Uzmanı",
      }),
    ).toEqual([
      "Yetki profili yalnız Özel (RBAC ile Yönetilen) kullanıcı tipinde seçilebilir.",
    ]);
    expect(
      validateInvitationAccessProfileSelection({
        accessProfileId: "profile-1",
        role: CUSTOM_RBAC_USER_TYPE,
      }),
    ).toEqual([]);
  });

  it("creates a deterministic period scoped assignment", () => {
    expect(
      createInvitationAccessProfileAssignment({
        acceptedAt: "2026-07-31T12:00:00.000Z",
        companyId: "company-1",
        periodId: "period-1",
        profileId: "profile-1",
        tenantId: "tenant-1",
        userId: "user-1",
      }),
    ).toMatchObject({
      companyId: "company-1",
      periodId: "period-1",
      profileId: "profile-1",
      revisionNo: 1,
      tenantId: "tenant-1",
      userId: "user-1",
    });
  });
});
