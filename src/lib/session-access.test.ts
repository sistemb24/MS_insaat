import { describe, expect, it } from "vitest";

import {
  canSwitchToSession,
  filterSessionsByScopeAccess,
} from "./session-access";
import type { SessionScopeRecord } from "./session-scope";
import type { UserScopeAccessRecord } from "./user-scope-access";

describe("session access", () => {
  it("allows switching only to sessions in the active user's allowed list", () => {
    expect(
      canSwitchToSession({
        allowedSessionIds: ["demo-viewer"],
        targetSessionId: "demo-viewer",
      }),
    ).toBe(true);
    expect(
      canSwitchToSession({
        allowedSessionIds: ["demo-viewer"],
        targetSessionId: "demo-accounting",
      }),
    ).toBe(false);
  });

  it("keeps only sessions backed by an active user scope access row", () => {
    const allowed = createSession({
      companyId: "company-demo-insaat",
      id: "demo-accounting",
      periodId: "period-2026",
    });
    const revoked = createSession({
      companyId: "company-revoked",
      id: "demo-revoked",
      periodId: "period-2026",
    });

    expect(
      filterSessionsByScopeAccess({
        accessRows: [
          createAccess({
            companyId: "company-demo-insaat",
            periodId: "period-2026",
          }),
        ],
        sessions: [allowed, revoked],
      }),
    ).toEqual([allowed]);
  });
});

function createSession(
  override: Partial<SessionScopeRecord> = {},
): SessionScopeRecord {
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
    ...override,
  };
}

function createAccess(
  override: Partial<UserScopeAccessRecord> = {},
): UserScopeAccessRecord {
  return {
    id: "access-demo-accounting",
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
    isDefault: true,
    ...override,
  };
}