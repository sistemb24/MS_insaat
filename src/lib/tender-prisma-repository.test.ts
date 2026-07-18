import { describe, expect, test } from "vitest";

import { createTenderPrismaRepository } from "./tender-prisma-repository";
import type { TenderRow } from "./tender-service";
import { defaultTenantScope } from "./tenant-scope";

const baseTender: TenderRow = {
  authorityName: "Karayolları 1. Bölge Müdürlüğü",
  bidValue: 1650000,
  boqBidTotal: 1000,
  boqLineCount: 1,
  boqLines: [
    {
      description: "Fore kazık imalatı",
      equipmentCost: 25,
      laborCost: 50,
      lineBidTotal: 1000,
      lineCostTotal: 770,
      lineNo: 1,
      materialCost: 100,
      pozNo: "01.001",
      quantity: 2,
      shippingCost: 10,
      subcontractorCost: 200,
      unit: "m",
      unitBid: 500,
      unitCost: 385,
    },
  ],
  city: "İstanbul",
  contractSignDate: "",
  contractValue: 0,
  convertedSiteCode: "",
  convertedSiteName: "",
  convertedToSiteAt: "",
  currency: "TRY",
  description: "Saha keşfi tamamlandı.",
  estimatedValue: 1800000,
  id: "tender-1",
  ikn: "2026/888999",
  noticeDate: "2026-07-01",
  overheadRate: 8,
  profitAmount: 1649230,
  profitRate: 99.95,
  profitMargin: 12,
  procedure: "Açık",
  questionAnswerDeadline: "2026-07-08",
  sessionDate: "2026-07-16T11:00",
  specPurchaseDeadline: "2026-07-07",
  status: "Hazırlanıyor",
  submissionDeadline: "2026-07-15T14:30",
  tenderNo: "IHL-2026-005",
  thresholdValue: 1500000,
  suggestedOffer: 931.39,
  title: "Kavşak düzenleme yapım işi",
  totalCost: 770,
  tenantId: "tenant-noa-demo",
  companyId: "company-demo-insaat",
  periodId: "period-2026",
  createdBy: "user-main",
  updatedBy: "user-main",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
};

describe("tender prisma repository", () => {
  test("creates tender row with nullable optional dates and decimal values", async () => {
    const calls: unknown[] = [];
    const repository = createTenderPrismaRepository({
      tender: {
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            lines: input.data.lines.createMany.data,
          };
        },
        async findMany() {
          return [];
        },
        async update() {
          throw new Error("not used");
        },
      },
    });

    const created = await repository.create(baseTender);

    expect(calls).toEqual([
      {
        include: {
          lines: {
            orderBy: {
              lineNo: "asc",
            },
          },
        },
        data: expect.objectContaining({
          bidValue: 1650000,
          contractSignDate: null,
          estimatedValue: 1800000,
          lines: {
            createMany: {
              data: [
                expect.objectContaining({
                  description: "Fore kazık imalatı",
                  lineBidTotal: 1000,
                  lineCostTotal: 770,
                  lineNo: 1,
                  pozNo: "01.001",
                  unitCost: 385,
                }),
              ],
            },
          },
          noticeDate: new Date("2026-07-01T00:00:00.000Z"),
          sessionDate: new Date("2026-07-16T11:00:00.000Z"),
          status: "Hazırlanıyor",
          tenderNo: "IHL-2026-005",
        }),
      },
    ]);
    expect(created).toEqual(expect.objectContaining(baseTender));
  });

  test("lists tenant scoped tender rows ordered by submission deadline", async () => {
    const repository = createTenderPrismaRepository({
      tender: {
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
            orderBy: [{ submissionDeadline: "asc" }, { createdAt: "desc" }],
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
              ...baseTender,
              bidValue: "1650000",
              companyId: "company-demo-insaat",
              contractValue: "0",
              createdAt: "2026-07-01T10:00:00.000Z",
              createdBy: "user-main",
              currency: "TRY",
              estimatedValue: "1800000",
              overheadRate: "8",
              lines: [
                {
                  description: "Fore kazık imalatı",
                  equipmentCost: "25",
                  laborCost: "50",
                  lineBidTotal: "1000",
                  lineCostTotal: "770",
                  lineNo: 1,
                  materialCost: "100",
                  pozNo: "01.001",
                  quantity: "2",
                  shippingCost: "10",
                  subcontractorCost: "200",
                  unit: "m",
                  unitBid: "500",
                  unitCost: "385",
                },
              ],
              noticeDate: new Date("2026-07-01T00:00:00.000Z"),
              periodId: "period-2026",
              procedure: "Açık",
              profitMargin: "12",
              sessionDate: new Date("2026-07-16T11:00:00.000Z"),
              status: "Hazırlanıyor",
              submissionDeadline: new Date("2026-07-15T14:30:00.000Z"),
              tenantId: "tenant-noa-demo",
              thresholdValue: "1500000",
              updatedAt: "2026-07-01T10:00:00.000Z",
              updatedBy: "user-main",
            },
          ];
        },
        async update() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      baseTender,
    ]);
  });

  test("updates a tender row status and audit fields", async () => {
    const calls: unknown[] = [];
    const repository = createTenderPrismaRepository({
      tender: {
        async create() {
          throw new Error("not used");
        },
        async findMany() {
          return [];
        },
        async update(input) {
          calls.push(input);

          return {
            authorityName: input.data.authorityName,
            bidValue: input.data.bidValue,
            city: input.data.city,
            companyId: "company-demo-insaat",
            contractSignDate: input.data.contractSignDate,
            contractValue: input.data.contractValue,
            createdAt: "2026-07-01T10:00:00.000Z",
            createdBy: "user-main",
            currency: input.data.currency,
            description: input.data.description,
            estimatedValue: input.data.estimatedValue,
            id: "tender-1",
            ikn: input.data.ikn,
            lines: input.data.lines.createMany.data,
            noticeDate: input.data.noticeDate,
            overheadRate: input.data.overheadRate,
            periodId: "period-2026",
            procedure: input.data.procedure,
            profitMargin: input.data.profitMargin,
            questionAnswerDeadline: input.data.questionAnswerDeadline,
            sessionDate: input.data.sessionDate,
            specPurchaseDeadline: input.data.specPurchaseDeadline,
            status: input.data.status,
            submissionDeadline: input.data.submissionDeadline,
            tenderNo: input.data.tenderNo,
            tenantId: "tenant-noa-demo",
            thresholdValue: input.data.thresholdValue,
            title: input.data.title,
            updatedAt: input.data.updatedAt,
            updatedBy: input.data.updatedBy,
          };
        },
      },
    });

    const updated = await repository.update({
      ...baseTender,
      status: "Sunuldu",
      updatedAt: "2026-07-01T11:30:00.000Z",
      updatedBy: "user-main",
    });

    expect(calls).toEqual([
      {
        include: {
          lines: {
            orderBy: {
              lineNo: "asc",
            },
          },
        },
        where: {
          id: "tender-1",
        },
        data: expect.objectContaining({
          status: "Sunuldu",
          updatedAt: new Date("2026-07-01T11:30:00.000Z"),
          updatedBy: "user-main",
        }),
      },
    ]);
    expect(updated).toEqual(
      expect.objectContaining({
        id: "tender-1",
        status: "Sunuldu",
        updatedAt: "2026-07-01T11:30:00.000Z",
      }),
    );
  });
});
