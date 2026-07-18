import { describe, expect, test } from "vitest";

import { createChequePrismaRepository } from "./cheque-prisma-repository";
import type { ChequeRow } from "./cheque-service";
import { defaultTenantScope } from "./tenant-scope";

const row: ChequeRow = {
  id: "cheque-1",
  tenantId: defaultTenantScope.tenantId,
  companyId: defaultTenantScope.companyId,
  periodId: defaultTenantScope.periodId,
  direction: "Gelen",
  documentNo: "CEK-0001",
  checkNo: "CK-0001",
  bankName: "Garanti BBVA",
  branchName: "Maslak",
  drawerName: "ABC Beton A.Ş.",
  issueDate: "2026-06-27",
  dueDate: "2026-08-15",
  amount: 125000,
  currency: "TL",
  status: "Portföyde",
  description: "Hakediş karşılığı gelen çek",
  createdBy: defaultTenantScope.userId,
  updatedBy: defaultTenantScope.userId,
  createdAt: "2026-06-27T09:00:00.000Z",
  updatedAt: "2026-06-27T09:00:00.000Z",
};

describe("cheque prisma repository", () => {
  test("creates cheque movement row", async () => {
    const calls: unknown[] = [];
    const repository = createChequePrismaRepository({
      cheque: {
        async findMany() {
          return [];
        },
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            createdAt: new Date(row.createdAt),
            dueDate: new Date("2026-08-15T00:00:00.000Z"),
            issueDate: new Date("2026-06-27T00:00:00.000Z"),
            updatedAt: new Date(row.updatedAt),
          };
        },
        async update() {
          throw new Error("not used");
        },
      },
    });

    await repository.create(row);

    expect(calls).toEqual([
      {
        data: expect.objectContaining({
          amount: 125000,
          bankName: "Garanti BBVA",
          checkNo: "CK-0001",
          documentNo: "CEK-0001",
          dueDate: new Date("2026-08-15T00:00:00.000Z"),
          issueDate: new Date("2026-06-27T00:00:00.000Z"),
          status: "Portföyde",
        }),
      },
    ]);
  });

  test("normalizes created cheque currency to the P0 base transaction currency", async () => {
    const calls: unknown[] = [];
    const repository = createChequePrismaRepository({
      cheque: {
        async findMany() {
          return [];
        },
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            createdAt: new Date(row.createdAt),
            dueDate: new Date("2026-08-15T00:00:00.000Z"),
            issueDate: new Date("2026-06-27T00:00:00.000Z"),
            updatedAt: new Date(row.updatedAt),
          };
        },
        async update() {
          throw new Error("not used");
        },
      },
    });

    await repository.create({
      ...row,
      currency: "USD",
    });

    expect(calls).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          currency: "TL",
        }),
      }),
    ]);
  });

  test("lists tenant scoped cheques ordered by due date", async () => {
    const repository = createChequePrismaRepository({
      cheque: {
        async findMany(input) {
          expect(input).toEqual({
            where: {
              tenantId: defaultTenantScope.tenantId,
              companyId: defaultTenantScope.companyId,
              periodId: defaultTenantScope.periodId,
            },
            orderBy: [{ dueDate: "asc" }, { documentNo: "asc" }],
          });

          return [
            {
              ...row,
              amount: "125000",
              createdAt: new Date(row.createdAt),
              dueDate: new Date("2026-08-15T00:00:00.000Z"),
              issueDate: new Date("2026-06-27T00:00:00.000Z"),
              updatedAt: new Date(row.updatedAt),
            },
          ];
        },
        async create() {
          throw new Error("not used");
        },
        async update() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      row,
    ]);
  });

  test("normalizes listed cheque currency to the P0 base transaction currency", async () => {
    const repository = createChequePrismaRepository({
      cheque: {
        async findMany() {
          return [
            {
              ...row,
              amount: "125000",
              currency: "USD",
              createdAt: new Date(row.createdAt),
              dueDate: new Date("2026-08-15T00:00:00.000Z"),
              issueDate: new Date("2026-06-27T00:00:00.000Z"),
              updatedAt: new Date(row.updatedAt),
            },
          ];
        },
        async create() {
          throw new Error("not used");
        },
        async update() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({
        currency: "TL",
        documentNo: "CEK-0001",
      }),
    ]);
  });

  test("updates cheque status fields", async () => {
    const calls: unknown[] = [];
    const collected: ChequeRow = {
      ...row,
      status: "Tahsil Edildi",
      updatedAt: "2026-06-27T10:00:00.000Z",
    };
    const repository = createChequePrismaRepository({
      cheque: {
        async findMany() {
          return [];
        },
        async create() {
          throw new Error("not used");
        },
        async update(input) {
          calls.push(input);

          return {
            ...collected,
            createdAt: new Date(row.createdAt),
            dueDate: new Date("2026-08-15T00:00:00.000Z"),
            issueDate: new Date("2026-06-27T00:00:00.000Z"),
            updatedAt: new Date(collected.updatedAt),
          };
        },
      },
    });

    await repository.update({
      ...collected,
      currency: "EUR",
    });

    expect(calls).toEqual([
      {
        where: {
          id: "cheque-1",
        },
        data: expect.objectContaining({
          currency: "TL",
          status: "Tahsil Edildi",
          updatedAt: new Date("2026-06-27T10:00:00.000Z"),
        }),
      },
    ]);
  });
});
