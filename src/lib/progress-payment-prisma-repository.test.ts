import { describe, expect, test } from "vitest";

import { createProgressPaymentPrismaRepository } from "./progress-payment-prisma-repository";
import type { ProgressPaymentRow } from "./progress-payment-service";
import { defaultTenantScope } from "./tenant-scope";

const row: ProgressPaymentRow = {
  id: "progress-payment-1",
  tenantId: defaultTenantScope.tenantId,
  companyId: defaultTenantScope.companyId,
  periodId: defaultTenantScope.periodId,
  counterpartyCode: "TAS-0001",
  counterpartyName: "ŞİRKETİN TAŞERONU",
  currency: "TL",
  description: "Haziran hakedişi",
  documentNo: "HAK-0001",
  grossTotal: 10000,
  issueDate: "2026-06-27",
  lineCount: 1,
  lines: [
    {
      description: "Kaba inşaat imalatı",
      quantity: 10,
      unit: "m2",
      unitPrice: 1000,
      vatRate: 20,
    },
  ],
  netTotal: 9500,
  paymentType: "Taşeron Hakedişi",
  retentionRate: 5,
  retentionTotal: 500,
  siteCode: "SANT-0001",
  siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
  status: "Taslak",
  createdBy: defaultTenantScope.userId,
  updatedBy: defaultTenantScope.userId,
  createdAt: "2026-06-27T10:00:00.000Z",
  updatedAt: "2026-06-27T10:00:00.000Z",
  vatTotal: 1900,
  grandTotal: 11400,
};

describe("progress payment prisma repository", () => {
  test("normalizes created progress payment currency to the P0 base transaction currency", async () => {
    const calls: unknown[] = [];
    const repository = createProgressPaymentPrismaRepository({
      progressPayment: {
        async findMany() {
          return [];
        },
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            issueDate: new Date("2026-06-27T00:00:00.000Z"),
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            lines: input.data.lines.createMany.data.map((line) => ({
              id: `line-${line.lineNo}`,
              progressPaymentId: row.id,
              ...line,
            })),
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

  test("normalizes listed progress payment currency to the P0 base transaction currency", async () => {
    const repository = createProgressPaymentPrismaRepository({
      progressPayment: {
        async findMany(input) {
          expect(input).toEqual({
            where: {
              tenantId: defaultTenantScope.tenantId,
              companyId: defaultTenantScope.companyId,
              periodId: defaultTenantScope.periodId,
            },
            orderBy: [{ issueDate: "desc" }, { documentNo: "asc" }],
            include: {
              lines: {
                orderBy: {
                  lineNo: "asc",
                },
              },
            },
          });

          return [
            {
              ...row,
              currency: "EUR",
              issueDate: new Date("2026-06-27T00:00:00.000Z"),
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
              lines: [
                {
                  ...row.lines[0],
                  id: "line-1",
                  progressPaymentId: row.id,
                  lineNo: 1,
                  grossTotal: 10000,
                  vatTotal: 2000,
                },
              ],
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
        documentNo: "HAK-0001",
      }),
    ]);
  });
  test("normalizes updated progress payment currency to the P0 base transaction currency", async () => {
    const calls: unknown[] = [];
    const repository = createProgressPaymentPrismaRepository({
      progressPayment: {
        async findMany() {
          return [];
        },
        async create() {
          throw new Error("not used");
        },
        async update(input) {
          calls.push(input);

          return {
            ...row,
            ...input.data,
            issueDate: new Date("2026-06-27T00:00:00.000Z"),
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            lines: input.data.lines.createMany.data.map((line) => ({
              id: `line-${line.lineNo}`,
              progressPaymentId: row.id,
              ...line,
            })),
          };
        },
      },
    });

    await repository.update({
      ...row,
      currency: "EUR",
    });

    expect(calls).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          currency: "TL",
        }),
      }),
    ]);
  });
});
