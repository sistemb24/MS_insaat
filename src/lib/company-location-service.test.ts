import { describe, expect, test, vi } from "vitest";

import type { AuditLogEntry } from "./audit-log";
import {
  createCompanyLocationMemoryRepository,
  createCompanyLocationService,
} from "./company-location-service";
import type { TenantScope } from "./tenant-scope";

const scope: TenantScope = {
  companyId: "company-1",
  companyName: "NOA",
  licenseLabel: "Kurumsal",
  periodClosed: true,
  periodId: "period-1",
  periodLabel: "2026",
  tenantId: "tenant-1",
  tenantName: "NOA",
  userId: "user-1",
  userName: "Admin",
  userRole: "admin",
};

const values = {
  addressLine: "Atatürk Bulvarı No: 1",
  city: "Ankara",
  code: "MRK-01",
  district: "Çankaya",
  email: "merkez@example.com",
  expectedRevisionNo: 0,
  name: "Ana Merkez",
  phone: "+90 312 555 00 00",
  postalCode: "06550",
  requestKey: "request-1",
  responsiblePerson: "Ayşe Demir",
  status: "ACTIVE" as const,
  type: "HEADQUARTERS" as const,
};

describe("company location service", () => {
  test("creates in a closed period and keeps retry idempotent", async () => {
    const audits: AuditLogEntry[] = [];
    const service = createCompanyLocationService({
      auditLogRepository: { record: vi.fn(async (row) => void audits.push(row)) },
      now: () => "2026-07-30T12:00:00.000Z",
      repository: createCompanyLocationMemoryRepository(),
    });

    const first = await service.save({ scope, values });
    const second = await service.save({
      scope,
      values: {
        ...values,
        id: first.ok ? first.data.location.id : "",
        expectedRevisionNo: 1,
      },
    });

    expect(first.ok).toBe(true);
    expect(second.ok && second.data.idempotent).toBe(true);
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits[0]?.metadata)).not.toContain(
      "merkez@example.com",
    );
    expect(JSON.stringify(audits[0]?.metadata)).not.toContain("request-1");
  });

  test("rejects second active headquarters and non-admin mutation", async () => {
    const repository = createCompanyLocationMemoryRepository();
    const service = createCompanyLocationService({ repository });
    expect((await service.save({ scope, values })).ok).toBe(true);
    const second = await service.save({
      scope,
      values: { ...values, code: "MRK-02", requestKey: "request-2" },
    });
    expect(second).toEqual({
      errors: ["Bir firmada yalnız bir aktif merkez bulunabilir."],
      ok: false,
    });
    const denied = await service.save({
      scope: { ...scope, userRole: "viewer" },
      values: { ...values, code: "OF-01", requestKey: "request-3", type: "OFFICE" },
    });
    expect(denied.ok).toBe(false);
  });

  test("rejects stale revision and foreign scope lookup", async () => {
    const repository = createCompanyLocationMemoryRepository();
    const service = createCompanyLocationService({ repository });
    const created = await service.save({ scope, values });
    if (!created.ok) throw new Error("setup failed");
    const stale = await service.save({
      scope,
      values: {
        ...values,
        id: created.data.location.id,
        requestKey: "request-stale",
      },
    });
    expect(stale.ok).toBe(false);
    const foreign = await service.list({
      scope: { ...scope, companyId: "company-2" },
    });
    expect(foreign.ok && foreign.data.locations).toHaveLength(0);
  });
});
