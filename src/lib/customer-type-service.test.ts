import { describe, expect, it, vi } from "vitest";

import {
  createCustomerTypeMemoryRepository,
  createCustomerTypeService,
} from "./customer-type-service";

const scope = {
  companyId: "company",
  companyName: "Şirket",
  licenseLabel: "Kurumsal",
  periodClosed: true,
  periodId: "period",
  periodLabel: "2026",
  tenantId: "tenant",
  tenantName: "Tenant",
  userId: "admin",
  userName: "Yönetici",
  userRole: "admin" as const,
};

describe("customer type service", () => {
  it("creates, retries and changes status with redacted audit", async () => {
    const record = vi.fn();
    const service = createCustomerTypeService({
      auditLogRepository: { record },
      createId: () => "type-1",
      now: () => "2026-07-31T12:00:00.000Z",
      repository: createCustomerTypeMemoryRepository(),
    });
    const values = {
      description: "Tüzel kişiler",
      expectedRevisionNo: 0,
      name: " Kurumsal ",
      requestKey: "create-1",
    };
    await expect(service.save({ scope, values })).resolves.toMatchObject({
      data: {
        customerType: { name: "Kurumsal", revisionNo: 1 },
        idempotent: false,
      },
      ok: true,
    });
    await expect(service.save({ scope, values })).resolves.toMatchObject({
      data: { idempotent: true },
      ok: true,
    });
    expect(record).toHaveBeenCalledTimes(1);
    await expect(service.changeStatus({
      scope,
      values: {
        expectedRevisionNo: 1,
        id: "type-1",
        requestKey: "status-1",
        status: "INACTIVE",
      },
    })).resolves.toMatchObject({
      data: { customerType: { revisionNo: 2, status: "INACTIVE" } },
      ok: true,
    });
    expect(JSON.stringify(record.mock.calls)).not.toContain("Kurumsal");
    expect(JSON.stringify(record.mock.calls)).not.toContain("create-1");
  });

  it("rejects duplicate normalized names and non-admin mutations", async () => {
    const service = createCustomerTypeService({
      createId: () => "type-1",
      repository: createCustomerTypeMemoryRepository(),
    });
    await expect(service.save({
      scope,
      values: {
        description: "",
        expectedRevisionNo: 0,
        name: "Kamu İştiraki",
        requestKey: "one",
      },
    })).resolves.toMatchObject({ ok: true });
    await expect(service.save({
      scope,
      values: {
        description: "",
        expectedRevisionNo: 0,
        name: " kamu  iştiraki ",
        requestKey: "two",
      },
    })).resolves.toMatchObject({
      errors: ["Aynı adlı müşteri tipi zaten bulunuyor."],
      ok: false,
    });
    await expect(service.save({
      scope: { ...scope, userRole: "accounting" },
      values: {
        description: "",
        expectedRevisionNo: 0,
        name: "Bireysel",
        requestKey: "three",
      },
    })).resolves.toMatchObject({ ok: false });
  });
});
