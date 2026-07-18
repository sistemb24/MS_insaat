import { describe, expect, test } from "vitest";

import { createExpensePrismaRepository } from "./expense-prisma-repository";
import type { ExpenseRow } from "./expense-service";
import { defaultTenantScope } from "./tenant-scope";

const baseExpense: ExpenseRow = {
  id: "expense-1",
  tenantId: "tenant-noa-demo",
  companyId: "company-demo-insaat",
  periodId: "period-2026",
  accountCode: "KASA-0001",
  accountName: "MERKEZ KASA",
  amount: 12500,
  counterpartyName: "ABC Beton A.Ş.",
  currency: "TL",
  description: "Şantiye nakliye gideri",
  documentNo: "GDR-0001",
  expenseDate: "2026-06-30",
  grandTotal: 15000,
  movementGroup: "Nakliye",
  siteCode: "SANT-0001",
  siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
  status: "Kaydedildi",
  vatRate: 20,
  vatTotal: 2500,
  createdBy: "user-main",
  updatedBy: "user-main",
  createdAt: "2026-06-30T13:00:00.000Z",
  updatedAt: "2026-06-30T13:00:00.000Z",
};

describe("expense prisma repository", () => {
  test("creates expense row with P0 TL currency normalization", async () => {
    const calls: unknown[] = [];
    const repository = createExpensePrismaRepository({
      expense: {
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            expenseDate: input.data.expenseDate,
            createdAt: input.data.createdAt,
            updatedAt: input.data.updatedAt,
          };
        },
        async findMany() {
          return [];
        },
      },
    });

    const created = await repository.create({ ...baseExpense, currency: "USD" });

    expect(calls).toEqual([
      {
        data: expect.objectContaining({
          currency: "TL",
          documentNo: "GDR-0001",
          expenseDate: new Date("2026-06-30T00:00:00.000Z"),
          grandTotal: 15000,
          vatTotal: 2500,
        }),
      },
    ]);
    expect(created).toEqual(
      expect.objectContaining({
        currency: "TL",
        documentNo: "GDR-0001",
        expenseDate: "2026-06-30",
      }),
    );
  });

  test("lists tenant scoped expense rows ordered by expense date", async () => {
    const repository = createExpensePrismaRepository({
      expense: {
        async create() {
          throw new Error("not used");
        },
        async findMany(input) {
          expect(input).toEqual({
            where: {
              tenantId: defaultTenantScope.tenantId,
              companyId: defaultTenantScope.companyId,
              periodId: defaultTenantScope.periodId,
            },
            orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
          });

          return [
            {
              ...baseExpense,
              amount: "12500",
              expenseDate: new Date("2026-06-30T00:00:00.000Z"),
              grandTotal: "15000",
              vatRate: "20",
              vatTotal: "2500",
            },
          ];
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      baseExpense,
    ]);
  });
});
