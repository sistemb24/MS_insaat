import { describe, expect, it } from "vitest";

import { listAccessibleSessionRecordsForUser } from "./session-access-service";
import type { SessionScopeRecord, SessionScopeRepository } from "./session-scope";
import type {
  UserScopeAccessRecord,
  UserScopeAccessRepository,
} from "./user-scope-access";

describe("session access service", () => {
  it("lists active sessions for a user only when backed by active scope access", async () => {
    const sessionCalls: unknown[] = [];
    const accessCalls: unknown[] = [];
    const now = new Date("2026-06-26T00:00:00.000Z");
    const allowed = createSession({ id: "demo-accounting" });
    const revoked = createSession({
      companyId: "company-revoked",
      id: "demo-revoked",
    });

    const sessions: SessionScopeRepository = {
      async findById() {
        return null;
      },
      async listActiveForUser(input) {
        sessionCalls.push(input);

        return [allowed, revoked];
      },
    };
    const accessRows: UserScopeAccessRepository = {
      async listActiveForUser(input) {
        accessCalls.push(input);

        return [createAccess()];
      },
    };

    await expect(
      listAccessibleSessionRecordsForUser({
        now,
        scopeAccessRepository: accessRows,
        sessionRepository: sessions,
        userId: "user-main",
      }),
    ).resolves.toEqual([allowed]);
    expect(sessionCalls).toEqual([{ now, userId: "user-main" }]);
    expect(accessCalls).toEqual([{ userId: "user-main" }]);
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