import { describe, expect, it, vi } from "vitest";

import type { AuditLogEntryInput } from "./audit-log";
import {
  createCompanyProfileMemoryRepository,
  createCompanyProfileService,
} from "./company-profile-service";
import { defaultTenantScope, type TenantScope } from "./tenant-scope";

function scope(overrides: Partial<TenantScope> = {}): TenantScope {
  return { ...defaultTenantScope, ...overrides };
}

const values = {
  addressLine: "Atatürk Cad. No: 10",
  city: "İstanbul",
  district: "Kadıköy",
  email: "bilgi@ornek.com",
  expectedRevisionNo: 0,
  legalName: "Örnek İnşaat A.Ş.",
  mersisNumber: "0123456789012345",
  phone: "+90 212 555 00 00",
  postalCode: "34710",
  requestKey: "profile-save-1",
  taxNumber: "1234567890",
  taxOffice: "Kadıköy",
};

describe("company profile service", () => {
  it("persists once, retries idempotently and keeps sensitive values out of audit", async () => {
    const auditRows: AuditLogEntryInput[] = [];
    const service = createCompanyProfileService({
      auditLogRepository: {
        record: vi.fn(async (entry) => {
          auditRows.push(entry);
        }),
      },
      now: () => "2026-07-30T15:00:00.000Z",
      repository: createCompanyProfileMemoryRepository(),
    });
    const adminScope = scope({ userRole: "admin" });

    const saved = await service.save({ scope: adminScope, values });
    const retry = await service.save({ scope: adminScope, values });
    const stale = await service.save({
      scope: adminScope,
      values: { ...values, requestKey: "profile-save-2" },
    });

    expect(saved).toMatchObject({
      data: {
        idempotent: false,
        profile: { revisionNo: 1, source: "persisted" },
      },
      ok: true,
    });
    expect(retry).toMatchObject({ data: { idempotent: true }, ok: true });
    expect(stale).toMatchObject({ ok: false });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.metadata).toEqual({
      changedFields: expect.arrayContaining(["legalName", "taxNumber", "email"]),
      revisionFrom: 0,
      revisionTo: 1,
    });
    expect(JSON.stringify(auditRows[0])).not.toContain(values.taxNumber);
    expect(JSON.stringify(auditRows[0])).not.toContain(values.email);
    expect(JSON.stringify(auditRows[0])).not.toContain(values.requestKey);
  });

  it("fails closed for non-admin but permits closed-period admin", async () => {
    const service = createCompanyProfileService({
      repository: createCompanyProfileMemoryRepository(),
    });
    await expect(
      service.save({ scope: scope({ userRole: "viewer" }), values }),
    ).resolves.toMatchObject({ ok: false });
    await expect(
      service.save({
        scope: scope({ periodClosed: true, userRole: "admin" }),
        values,
      }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("isolates persisted profile by tenant and company, not period", async () => {
    const repository = createCompanyProfileMemoryRepository();
    const service = createCompanyProfileService({ repository });
    const adminScope = scope({ userRole: "admin" });
    await service.save({ scope: adminScope, values });

    await expect(
      service.get({
        scope: scope({
          periodId: "another-period",
          periodLabel: "2027",
          userRole: "admin",
        }),
      }),
    ).resolves.toMatchObject({
      data: { profile: { legalName: values.legalName, source: "persisted" } },
      ok: true,
    });
    await expect(
      service.get({
        scope: scope({
          companyId: "foreign-company",
          companyName: "YABANCI",
          userRole: "admin",
        }),
      }),
    ).resolves.toMatchObject({
      data: { profile: { legalName: "YABANCI", source: "fallback" } },
      ok: true,
    });
  });
});
