import { describe, expect, test } from "vitest";

import { createPurchaseInvoicePrismaRepository } from "./purchase-invoice-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";
import type { PurchaseInvoiceRow } from "./purchase-invoice-service";

const row: PurchaseInvoiceRow = {
  id: "invoice-1",
  tenantId: defaultTenantScope.tenantId,
  companyId: defaultTenantScope.companyId,
  periodId: defaultTenantScope.periodId,
  documentNo: "FAT-0006",
  invoiceDate: "2026-06-23",
  dueDate: "2026-07-23",
  counterpartyCode: "TED-0001",
  counterpartyName: "ÖRNEK TEDARİKÇİ",
  siteCode: "SANT-0001",
  siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
  currency: "TL",
  exchangeRate: 1,
  movementGroup: "",
  isOfficial: false,
  description: "",
  lines: [
    {
      stockCode: "STK-0001",
      stockName: "Çimento Torba",
      siteName: "",
      unit: "Adet",
      description: "",
      warehouse: "",
      quantity: 100,
      unitPrice: 150,
      discountRate1: 10,
      discountRate2: 0,
      vatRate: 20,
    },
  ],
  status: "Taslak",
  createdBy: defaultTenantScope.userId,
  updatedBy: defaultTenantScope.userId,
  createdAt: "2026-06-25T10:00:00.000Z",
  updatedAt: "2026-06-25T10:00:00.000Z",
  subtotal: 15000,
  discountTotal: 1500,
  netTotal: 13500,
  vatTotal: 2700,
  withholdingTotal: 0,
  grandTotal: 16200,
  lineCount: 1,
};

describe("purchase invoice prisma repository", () => {
  test("creates invoice header with nested line totals", async () => {
    const calls: unknown[] = [];
    const repository = createPurchaseInvoicePrismaRepository({
      purchaseInvoice: {
        async findMany() {
          return [];
        },
        async create(input) {
          calls.push(input);
          return {
            ...input.data,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            lines: input.data.lines.createMany.data.map((line) => ({
              id: `line-${line.lineNo}`,
              purchaseInvoiceId: row.id,
              ...line,
            })),
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
          id: "invoice-1",
          documentNo: "FAT-0006",
          subtotal: 15000,
          grandTotal: 16200,
          lines: {
            createMany: {
              data: [
                expect.objectContaining({
                  lineNo: 1,
                  stockName: "Çimento Torba",
                  grossTotal: 15000,
                  discountTotal: 1500,
                  vatTotal: 2700,
                  grandTotal: 16200,
                }),
              ],
            },
          },
        }),
        include: {
          lines: {
            orderBy: {
              lineNo: "asc",
            },
          },
        },
      },
    ]);
  });

  test("normalizes created invoice currency to the P0 base transaction currency", async () => {
    const calls: unknown[] = [];
    const repository = createPurchaseInvoicePrismaRepository({
      purchaseInvoice: {
        async findMany() {
          return [];
        },
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            lines: input.data.lines.createMany.data.map((line) => ({
              id: `line-${line.lineNo}`,
              purchaseInvoiceId: row.id,
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

  test("lists tenant scoped invoices ordered by newest invoice date", async () => {
    const repository = createPurchaseInvoicePrismaRepository({
      purchaseInvoice: {
        async findMany(input) {
          expect(input).toEqual({
            where: {
              tenantId: defaultTenantScope.tenantId,
              companyId: defaultTenantScope.companyId,
              periodId: defaultTenantScope.periodId,
            },
            orderBy: [{ invoiceDate: "desc" }, { documentNo: "asc" }],
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
              invoiceDate: new Date("2026-06-23T00:00:00.000Z"),
              dueDate: new Date("2026-07-23T00:00:00.000Z"),
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
              lines: [
                {
                  ...row.lines[0],
                  id: "line-1",
                  purchaseInvoiceId: row.id,
                  lineNo: 1,
                  grossTotal: 15000,
                  discountTotal: 1500,
                  netTotal: 13500,
                  vatTotal: 2700,
                  grandTotal: 16200,
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
      row,
    ]);
  });

  test("normalizes listed invoice currency to the P0 base transaction currency", async () => {
    const repository = createPurchaseInvoicePrismaRepository({
      purchaseInvoice: {
        async findMany() {
          return [
            {
              ...row,
              currency: "USD",
              invoiceDate: new Date("2026-06-23T00:00:00.000Z"),
              dueDate: new Date("2026-07-23T00:00:00.000Z"),
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
              lines: [
                {
                  ...row.lines[0],
                  id: "line-1",
                  purchaseInvoiceId: row.id,
                  lineNo: 1,
                  grossTotal: 15000,
                  discountTotal: 1500,
                  netTotal: 13500,
                  vatTotal: 2700,
                  grandTotal: 16200,
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
        documentNo: "FAT-0006",
      }),
    ]);
  });

  test("updates invoice header and replaces nested lines", async () => {
    const calls: unknown[] = [];
    const updatedRow: PurchaseInvoiceRow = {
      ...row,
      documentNo: "FAT-0099",
      updatedAt: "2026-06-25T11:00:00.000Z",
      lines: [
        {
          stockCode: "",
          stockName: "Güncellenen Çimento",
          siteName: "",
          unit: "Adet",
          description: "Düzeltme satırı",
          warehouse: "Merkez Depo",
          quantity: 2,
          unitPrice: 1000,
          discountRate1: 0,
          discountRate2: 0,
          vatRate: 20,
        },
      ],
      subtotal: 2000,
      discountTotal: 0,
      netTotal: 2000,
      vatTotal: 400,
      grandTotal: 2400,
      lineCount: 1,
    };
    const repository = createPurchaseInvoicePrismaRepository({
      purchaseInvoice: {
        async findMany() {
          return [];
        },
        async create() {
          throw new Error("not used");
        },
        async update(input) {
          calls.push(input);
          return {
            ...updatedRow,
            invoiceDate: new Date("2026-06-23T00:00:00.000Z"),
            dueDate: new Date("2026-07-23T00:00:00.000Z"),
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(updatedRow.updatedAt),
            lines: input.data.lines.createMany.data.map((line) => ({
              id: `line-${line.lineNo}`,
              purchaseInvoiceId: row.id,
              ...line,
            })),
          };
        },
      },
    });

    await repository.update({
      ...updatedRow,
      currency: "EUR",
    });

    expect(calls).toEqual([
      {
        where: {
          id: "invoice-1",
        },
        data: expect.objectContaining({
          documentNo: "FAT-0099",
          currency: "TL",
          subtotal: 2000,
          grandTotal: 2400,
          lines: {
            deleteMany: {},
            createMany: {
              data: [
                expect.objectContaining({
                  lineNo: 1,
                  stockName: "Güncellenen Çimento",
                  warehouse: "Merkez Depo",
                  grossTotal: 2000,
                  vatTotal: 400,
                  grandTotal: 2400,
                }),
              ],
            },
          },
        }),
        include: {
          lines: {
            orderBy: {
              lineNo: "asc",
            },
          },
        },
      },
    ]);
  });
});
