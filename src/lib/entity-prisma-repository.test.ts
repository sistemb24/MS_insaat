import { describe, expect, it } from "vitest";

import { getEntityDefinition } from "./entities";
import { createEntityPrismaRepository } from "./entity-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

describe("Prisma entity repository adapter", () => {
  it("reads scoped entity records and maps JSON data back to EntityRow", async () => {
    const definition = getEntityDefinition("santiyeler");

    expect(definition).toBeDefined();

    const prisma = createFakePrismaClient([
      {
        tenantId: "tenant-noa-demo",
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        slug: "santiyeler",
        code: "SANT-0001",
        data: {
          name: "DB ŞANTİYESİ",
          responsible: "Ayşe",
          projectAmount: "100.000,00 TL",
          balance: "0,00 TL",
          status: "Aktif",
        },
        createdBy: "user-main",
        updatedBy: "user-main",
        createdAt: new Date("2026-06-25T08:00:00.000Z"),
        updatedAt: new Date("2026-06-25T08:00:00.000Z"),
      },
      {
        tenantId: "tenant-other",
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        slug: "santiyeler",
        code: "SANT-9999",
        data: { name: "Başka Tenant" },
        createdBy: "user-main",
        updatedBy: "user-main",
        createdAt: new Date("2026-06-25T08:00:00.000Z"),
        updatedAt: new Date("2026-06-25T08:00:00.000Z"),
      },
    ]);
    const repository = createEntityPrismaRepository(prisma);

    const rows = await repository.read({
      scope: defaultTenantScope,
      definition: definition!,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        code: "SANT-0001",
        name: "DB ŞANTİYESİ",
        tenantId: "tenant-noa-demo",
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        createdAt: "2026-06-25T08:00:00.000Z",
      }),
    ]);
  });

  it("replaces only rows inside the active scope and module slug", async () => {
    const definition = getEntityDefinition("tedarikciler");

    expect(definition).toBeDefined();

    const prisma = createFakePrismaClient([
      {
        tenantId: "tenant-noa-demo",
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        slug: "tedarikciler",
        code: "TED-0001",
        data: { name: "Eski Tedarikçi", status: "Aktif" },
        createdBy: "user-main",
        updatedBy: "user-main",
        createdAt: new Date("2026-06-25T08:00:00.000Z"),
        updatedAt: new Date("2026-06-25T08:00:00.000Z"),
      },
      {
        tenantId: "tenant-noa-demo",
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        slug: "santiyeler",
        code: "SANT-0001",
        data: { name: "Korunacak Şantiye", status: "Aktif" },
        createdBy: "user-main",
        updatedBy: "user-main",
        createdAt: new Date("2026-06-25T08:00:00.000Z"),
        updatedAt: new Date("2026-06-25T08:00:00.000Z"),
      },
    ]);
    const repository = createEntityPrismaRepository(prisma);

    await repository.replace({
      scope: defaultTenantScope,
      definition: definition!,
      rows: [
        {
          code: "TED-0002",
          name: "Yeni Kalıcı Tedarikçi",
          status: "Aktif",
          tenantId: "tenant-noa-demo",
          companyId: "company-demo-insaat",
          periodId: "period-2026",
          createdBy: "user-main",
          updatedBy: "user-main",
          createdAt: "2026-06-25T09:00:00.000Z",
          updatedAt: "2026-06-25T09:00:00.000Z",
        },
      ],
    });

    expect(prisma.entityRecord.rows).toEqual([
      expect.objectContaining({
        slug: "santiyeler",
        code: "SANT-0001",
      }),
      expect.objectContaining({
        slug: "tedarikciler",
        code: "TED-0002",
        data: expect.objectContaining({ name: "Yeni Kalıcı Tedarikçi" }),
      }),
    ]);
  });
});

type FakeEntityRecord = {
  tenantId: string;
  companyId: string;
  periodId: string;
  slug: string;
  code: string;
  data: Record<string, string>;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

function createFakePrismaClient(initialRows: FakeEntityRecord[]) {
  const entityRecord = {
    rows: [...initialRows],
    async findMany({ where }: { where: Partial<FakeEntityRecord> }) {
      return entityRecord.rows
        .filter((row) =>
          Object.entries(where).every(
            ([key, value]) => row[key as keyof FakeEntityRecord] === value,
          ),
        )
        .sort((left, right) => left.code.localeCompare(right.code));
    },
    async deleteMany({ where }: { where: Partial<FakeEntityRecord> }) {
      entityRecord.rows = entityRecord.rows.filter(
        (row) =>
          !Object.entries(where).every(
            ([key, value]) => row[key as keyof FakeEntityRecord] === value,
          ),
      );
    },
    async createMany({ data }: { data: FakeEntityRecord[] }) {
      entityRecord.rows = [...entityRecord.rows, ...data];
    },
  };

  return { entityRecord };
}
