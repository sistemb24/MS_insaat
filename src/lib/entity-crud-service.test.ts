import { describe, expect, it } from "vitest";

import type { AuditLogEntryInput } from "./audit-log";
import {
  createEntityCrudService,
  createSeededEntityMemoryRepository,
} from "./entity-crud-service";
import { defaultTenantScope } from "./tenant-scope";

describe("server-side entity CRUD service contract", () => {
  it("lists scoped rows and exposes the next code for the selected definition", async () => {
    const service = createEntityCrudService({
      repository: createSeededEntityMemoryRepository({
        seedIso: "2026-06-24T00:00:00.000Z",
      }),
      now: () => "2026-06-25T08:00:00.000Z",
    });

    const result = await service.list({
      scope: defaultTenantScope,
      slug: "santiyeler",
    });

    expect(result.ok).toBe(true);
    expect(result.data?.scopeKey).toBe(
      "tenant-noa-demo::company-demo-insaat::period-2026",
    );
    expect(result.data?.nextCode).toBe("SANT-0006");
    expect(result.data?.rows).toHaveLength(5);
  });

  it("filters repository rows back to the requested tenant scope before listing", async () => {
    const service = createEntityCrudService({
      repository: {
        async read({ scope, definition }) {
          return [
            {
              ...definition.sampleRows[0],
              tenantId: scope.tenantId,
              companyId: scope.companyId,
              periodId: scope.periodId,
              createdBy: scope.userId,
              updatedBy: scope.userId,
              createdAt: "2026-06-24T00:00:00.000Z",
              updatedAt: "2026-06-24T00:00:00.000Z",
            },
            {
              ...definition.sampleRows[0],
              code: `${definition.codePrefix}-9999`,
              name: "BAŞKA TENANT KAYDI",
              tenantId: "tenant-other",
              companyId: scope.companyId,
              periodId: scope.periodId,
              createdBy: scope.userId,
              updatedBy: scope.userId,
              createdAt: "2026-06-24T00:00:00.000Z",
              updatedAt: "2026-06-24T00:00:00.000Z",
            },
          ];
        },
        async replace() {
          throw new Error("Listeleme kayıt yazmamalıdır.");
        },
      },
      now: () => "2026-06-25T08:00:00.000Z",
    });

    const result = await service.list({
      scope: defaultTenantScope,
      slug: "musteriler",
    });

    expect(result.ok).toBe(true);
    expect(result.data?.rows).toEqual([
      expect.objectContaining({
        code: "MUS-0001",
        tenantId: "tenant-noa-demo",
      }),
    ]);
    expect(result.data?.nextCode).toBe("MUS-0002");
  });

  it("creates, updates and deactivates rows without deleting their audit trail", async () => {
    const auditEntries: AuditLogEntryInput[] = [];
    const service = createEntityCrudService({
      repository: createSeededEntityMemoryRepository({
        seedIso: "2026-06-24T00:00:00.000Z",
      }),
      now: () => "2026-06-25T08:30:00.000Z",
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
    });

    const createResult = await service.create({
      scope: defaultTenantScope,
      slug: "tedarikciler",
      values: {
        name: "Yeni Server Tedarikçi",
        taxNumber: "3333333333",
        phone: "0 242 333 33 33",
        balance: "0,00 TL",
      },
    });

    expect(createResult.ok).toBe(true);
    expect(createResult.data).toMatchObject({
      code: "TED-0006",
      name: "Yeni Server Tedarikçi",
      tenantId: "tenant-noa-demo",
      createdAt: "2026-06-25T08:30:00.000Z",
      updatedAt: "2026-06-25T08:30:00.000Z",
    });

    const updateResult = await service.update({
      scope: defaultTenantScope,
      slug: "tedarikciler",
      code: "TED-0006",
      values: {
        name: "Güncel Server Tedarikçi",
        taxNumber: "3333333333",
        phone: "0 242 333 33 34",
        balance: "15.000,00 TL",
      },
    });

    expect(updateResult.ok).toBe(true);
    expect(updateResult.data).toMatchObject({
      code: "TED-0006",
      name: "Güncel Server Tedarikçi",
      createdAt: "2026-06-25T08:30:00.000Z",
      updatedAt: "2026-06-25T08:30:00.000Z",
    });

    const deactivateResult = await service.deactivate({
      scope: defaultTenantScope,
      slug: "tedarikciler",
      code: "TED-0006",
    });

    expect(deactivateResult.ok).toBe(true);
    expect(deactivateResult.data).toMatchObject({
      code: "TED-0006",
      status: "Pasif",
      updatedBy: "user-main",
    });

    const listResult = await service.list({
      scope: defaultTenantScope,
      slug: "tedarikciler",
    });

    expect(listResult.data?.rows.map((row) => row.code)).toEqual([
      "TED-0001",
      "TED-0002",
      "TED-0003",
      "TED-0004",
      "TED-0005",
      "TED-0006",
    ]);
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "entity.create",
        actorUserId: "user-main",
        companyId: "company-demo-insaat",
        entityId: "tedarikciler:TED-0006",
        entityLabel: "TED-0006 / Yeni Server Tedarikçi",
        entityType: "entity-record",
        occurredAt: "2026-06-25T08:30:00.000Z",
        periodId: "period-2026",
        tenantId: "tenant-noa-demo",
        metadata: expect.objectContaining({
          code: "TED-0006",
          name: "Yeni Server Tedarikçi",
          slug: "tedarikciler",
          statusTo: "Aktif",
        }),
      }),
      expect.objectContaining({
        action: "entity.update",
        entityId: "tedarikciler:TED-0006",
        entityLabel: "TED-0006 / Güncel Server Tedarikçi",
        entityType: "entity-record",
        metadata: expect.objectContaining({
          code: "TED-0006",
          name: "Güncel Server Tedarikçi",
          slug: "tedarikciler",
          statusFrom: "Aktif",
          statusTo: "Aktif",
        }),
      }),
      expect.objectContaining({
        action: "entity.delete",
        entityId: "tedarikciler:TED-0006",
        entityLabel: "TED-0006 / Güncel Server Tedarikçi",
        entityType: "entity-record",
        metadata: expect.objectContaining({
          code: "TED-0006",
          name: "Güncel Server Tedarikçi",
          slug: "tedarikciler",
          statusFrom: "Aktif",
          statusTo: "Pasif",
        }),
      }),
    ]);
  });

  it("imports multiple rows in one service operation without partial writes", async () => {
    const auditEntries: AuditLogEntryInput[] = [];
    const service = createEntityCrudService({
      repository: createSeededEntityMemoryRepository({
        seedIso: "2026-06-24T00:00:00.000Z",
      }),
      now: () => "2026-06-25T10:00:00.000Z",
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
    });

    const importResult = await service.importMany({
      scope: defaultTenantScope,
      slug: "musteriler",
      rows: [
        {
          balance: "0,00 TL",
          code: "MUS-0004",
          customerType: "Kurumsal",
          email: "ilk@example.com",
          name: "İlk Toplu Müşteri",
          phone: "0 242 222 22 23",
          status: "Aktif",
          taxNumber: "2222222223",
        },
        {
          balance: "0,00 TL",
          code: "MUS-0005",
          customerType: "Kurumsal",
          email: "ikinci@example.com",
          name: "İkinci Toplu Müşteri",
          phone: "0 242 222 22 24",
          status: "Aktif",
          taxNumber: "2222222224",
        },
      ],
    });

    expect(importResult.ok).toBe(true);
    expect(importResult.data?.importedCount).toBe(2);
    expect(importResult.data?.rows.map((row) => row.code)).toEqual([
      "MUS-0004",
      "MUS-0005",
    ]);
    expect(importResult.data?.rows[0]).toMatchObject({
      tenantId: "tenant-noa-demo",
      companyId: "company-demo-insaat",
      periodId: "period-2026",
      createdAt: "2026-06-25T10:00:00.000Z",
      updatedAt: "2026-06-25T10:00:00.000Z",
    });

    const failedImport = await service.importMany({
      scope: defaultTenantScope,
      slug: "musteriler",
      rows: [
        {
          code: "MUS-0006",
          name: "Kısmi Yazılmamalı",
          status: "Aktif",
        },
        {
          code: "MUS-0006",
          name: "Tekrar Kod",
          status: "Aktif",
        },
      ],
    });

    expect(failedImport).toEqual({
      ok: false,
      errors: ["2. satır: Kod zaten kullanılıyor."],
    });

    const listResult = await service.list({
      scope: defaultTenantScope,
      slug: "musteriler",
    });

    expect(listResult.data?.rows.map((row) => row.code)).toEqual([
      "MUS-0001",
      "MUS-0002",
      "MUS-0003",
      "MUS-0004",
      "MUS-0005",
    ]);
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "entity.create",
        entityId: "musteriler:MUS-0004",
        entityLabel: "MUS-0004 / İlk Toplu Müşteri",
        entityType: "entity-record",
        metadata: expect.objectContaining({
          code: "MUS-0004",
          name: "İlk Toplu Müşteri",
          slug: "musteriler",
          statusTo: "Aktif",
        }),
        occurredAt: "2026-06-25T10:00:00.000Z",
      }),
      expect.objectContaining({
        action: "entity.create",
        entityId: "musteriler:MUS-0005",
        entityLabel: "MUS-0005 / İkinci Toplu Müşteri",
        entityType: "entity-record",
        metadata: expect.objectContaining({
          code: "MUS-0005",
          name: "İkinci Toplu Müşteri",
          slug: "musteriler",
          statusTo: "Aktif",
        }),
        occurredAt: "2026-06-25T10:00:00.000Z",
      }),
    ]);
  });
  it("returns contract errors for missing scope, unknown module and duplicate code", async () => {
    const service = createEntityCrudService({
      repository: createSeededEntityMemoryRepository({
        seedIso: "2026-06-24T00:00:00.000Z",
      }),
      now: () => "2026-06-25T09:00:00.000Z",
    });

    await service.create({
      scope: defaultTenantScope,
      slug: "personel",
      values: {
        code: "PER-0006",
        name: "İlk Personel",
        role: "FORMEN",
        site: "ÖRNEK PROJE",
        salary: "45.000,00 TL",
      },
    });

    const duplicate = await service.create({
      scope: defaultTenantScope,
      slug: "personel",
      values: {
        code: "PER-0006",
        name: "Tekrar Personel",
        role: "FORMEN",
        site: "ÖRNEK PROJE",
        salary: "45.000,00 TL",
      },
    });

    expect(duplicate).toEqual({
      ok: false,
      errors: ["Kod zaten kullanılıyor."],
    });

    await expect(
      service.list({
        scope: { ...defaultTenantScope, tenantId: "" },
        slug: "personel",
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Tenant kapsamı zorunludur."],
    });

    await expect(
      service.list({
        scope: defaultTenantScope,
        slug: "bilinmeyen",
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Tanım modülü bulunamadı: bilinmeyen"],
    });
  });
});
