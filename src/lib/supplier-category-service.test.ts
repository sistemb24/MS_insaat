import { describe, expect, it, vi } from "vitest";

import { createSupplierCategoryMemoryRepository, createSupplierCategoryService } from "./supplier-category-service";

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

describe("supplier category service", () => {
  it("creates, retries and changes status with redacted audit", async () => {
    const record = vi.fn();
    const service = createSupplierCategoryService({
      auditLogRepository: { record },
      createId: () => "category-1",
      now: () => "2026-07-31T12:00:00.000Z",
      repository: createSupplierCategoryMemoryRepository(),
    });
    const values = {
      description: "Malzeme alımları",
      expectedRevisionNo: 0,
      name: " Malzeme ",
      requestKey: "create-1",
    };
    const created = await service.save({ scope, values });
    expect(created).toMatchObject({ data: { category: { name: "Malzeme", revisionNo: 1 }, idempotent: false }, ok: true });
    await expect(service.save({ scope, values })).resolves.toMatchObject({ data: { idempotent: true }, ok: true });
    expect(record).toHaveBeenCalledTimes(1);
    await expect(service.changeStatus({
      scope,
      values: { expectedRevisionNo: 1, id: "category-1", requestKey: "status-1", status: "INACTIVE" },
    })).resolves.toMatchObject({ data: { category: { revisionNo: 2, status: "INACTIVE" } }, ok: true });
    expect(JSON.stringify(record.mock.calls)).not.toContain("Malzeme");
    expect(JSON.stringify(record.mock.calls)).not.toContain("create-1");
  });

  it("rejects duplicate normalized names and non-admin mutations", async () => {
    const service = createSupplierCategoryService({
      createId: () => "category-1",
      repository: createSupplierCategoryMemoryRepository(),
    });
    const first = await service.save({
      scope,
      values: { description: "", expectedRevisionNo: 0, name: "İş Makinesi", requestKey: "one" },
    });
    expect(first.ok).toBe(true);
    await expect(service.save({
      scope,
      values: { description: "", expectedRevisionNo: 0, name: " iş  makinesi ", requestKey: "two" },
    })).resolves.toMatchObject({ errors: ["Aynı adlı tedarikçi kategorisi zaten bulunuyor."], ok: false });
    await expect(service.save({
      scope: { ...scope, userRole: "accounting" },
      values: { description: "", expectedRevisionNo: 0, name: "Nakliye", requestKey: "three" },
    })).resolves.toMatchObject({ ok: false });
  });
});
