import { describe, expect, test } from "vitest";

import type { AuditLogEntryInput } from "./audit-log";
import {
  TENDER_STATUSES,
  calculateTenderBoqSimulation,
  createSeededTenderMemoryRepository,
  createTenderService,
  createTenderDraftFromValues,
  type TenderCreateValues,
  summarizeTenderDashboardAlerts,
  summarizeTenders,
  type TenderRow,
} from "./tender-service";
import { defaultTenantScope } from "./tenant-scope";

describe("tender-service", () => {
  test("summarizes tender status counters, win rate and deadline alerts", () => {
    const rows: TenderRow[] = [
      createTender({
        id: "tender-1",
        status: "Takip",
        estimatedValue: 1200000,
        bidValue: 0,
        contractValue: 0,
        submissionDeadline: "2026-07-03T14:00",
      }),
      createTender({
        id: "tender-2",
        status: "Sunuldu",
        estimatedValue: 2500000,
        bidValue: 2300000,
        contractValue: 0,
        submissionDeadline: "2026-06-28T17:00",
      }),
      createTender({
        id: "tender-3",
        status: "Kazanıldı",
        estimatedValue: 4100000,
        bidValue: 3900000,
        contractValue: 3850000,
        submissionDeadline: "2026-06-20T10:00",
      }),
      createTender({
        id: "tender-4",
        status: "Kaybedildi",
        estimatedValue: 900000,
        bidValue: 880000,
        contractValue: 0,
        submissionDeadline: "2026-06-15T10:00",
      }),
    ];

    const summary = summarizeTenders(rows, "2026-07-01T09:00:00");

    expect(summary.totalCount).toBe(4);
    expect(summary.statusCounts).toEqual({
      Hazırlanıyor: 0,
      Kazanıldı: 1,
      Kaybedildi: 1,
      Sunuldu: 1,
      Takip: 1,
      İptal: 0,
    });
    expect(summary.winRate).toBe(25);
    expect(summary.wonBidTotal).toBe(3900000);
    expect(summary.contractTotal).toBe(3850000);
    expect(summary.estimatedValueTotal).toBe(8700000);
    expect(summary.upcomingDeadlineRows.map((row) => row.id)).toEqual([
      "tender-1",
    ]);
    expect(summary.overdueOpenRows.map((row) => row.id)).toEqual([
      "tender-2",
    ]);
    expect(TENDER_STATUSES).toContain("Hazırlanıyor");
  });

  test("summarizes dashboard tender alerts for upcoming deadlines, result waiting rows and monthly win rate", () => {
    const rows: TenderRow[] = [
      createTender({
        id: "upcoming-sooner",
        status: "Takip",
        submissionDeadline: "2026-07-02T10:00",
        title: "Köprü bakım yapım işi",
      }),
      createTender({
        id: "upcoming-later",
        status: "Hazırlanıyor",
        submissionDeadline: "2026-07-06T12:00",
        title: "Okul güçlendirme yapım işi",
      }),
      createTender({
        id: "result-waiting",
        status: "Sunuldu",
        submissionDeadline: "2026-06-28T17:00",
        title: "Spor salonu ikmal inşaatı",
      }),
      createTender({
        id: "overdue-preparing",
        status: "Hazırlanıyor",
        submissionDeadline: "2026-06-27T17:00",
        title: "Hazırlığı geciken altyapı işi",
      }),
      createTender({
        id: "won-this-month",
        status: "Kazanıldı",
        submissionDeadline: "2026-07-09T11:00",
        title: "Kazanılan arıtma tesisi işi",
      }),
      createTender({
        id: "lost-this-month",
        status: "Kaybedildi",
        submissionDeadline: "2026-07-10T11:00",
        title: "Kaybedilen yol yenileme işi",
      }),
      createTender({
        id: "won-last-month",
        status: "Kazanıldı",
        submissionDeadline: "2026-06-10T11:00",
        title: "Geçen ay kazanılan iş",
      }),
    ];

    const alerts = summarizeTenderDashboardAlerts(
      rows,
      "2026-07-01T09:00:00",
    );

    expect(alerts.upcomingDeadlineRows.map((row) => row.id)).toEqual([
      "upcoming-sooner",
      "upcoming-later",
    ]);
    expect(alerts.resultWaitingRows.map((row) => row.id)).toEqual([
      "result-waiting",
    ]);
    expect(alerts.currentMonthResultCount).toBe(2);
    expect(alerts.currentMonthWinRate).toBe(50);
  });
  test("calculates BOQ totals, suggested offer and profitability", () => {
    const simulation = calculateTenderBoqSimulation({
      lines: [
        {
          description: "Fore kazık imalatı",
          equipmentCost: 25,
          laborCost: 50,
          materialCost: 100,
          pozNo: "01.001",
          quantity: 2,
          shippingCost: 10,
          subcontractorCost: 200,
          unit: "m",
          unitBid: 500,
        },
      ],
      manualBidValue: 1200,
      overheadRate: 10,
      profitMargin: 20,
    });

    expect(simulation).toEqual({
      boqBidTotal: 1000,
      lineCount: 1,
      lines: [
        expect.objectContaining({
          lineBidTotal: 1000,
          lineCostTotal: 770,
          unitCost: 385,
        }),
      ],
      profitAmount: 430,
      profitRate: 35.83,
      suggestedOffer: 1016.4,
      totalCost: 770,
      usedOffer: 1200,
    });
  });

  test("creates a draft tender from step 1 and step 2 form values without BOQ", () => {
    const draft = createTenderDraftFromValues(
      {
        authorityName: "Karayolları 1. Bölge Müdürlüğü",
        bidValue: "1650000",
        city: "İstanbul",
        contractSignDate: "",
        currency: "TRY",
        description: "Saha keşfi tamamlandı, BOQ sonraki adımda girilecek.",
        estimatedValue: "1800000",
        ikn: "2026/888999",
        noticeDate: "2026-07-01",
        overheadRate: "8",
        boqLines: [],
        profitMargin: "12",
        procedure: "Açık",
        questionAnswerDeadline: "2026-07-08",
        sessionDate: "2026-07-16T11:00",
        specPurchaseDeadline: "2026-07-07",
        submissionDeadline: "2026-07-15T14:30",
        tenderNo: "IHL-2026-005",
        thresholdValue: "1500000",
        title: "Kavşak düzenleme yapım işi",
      },
      5,
    );

    expect(draft).toEqual(
      expect.objectContaining({
        authorityName: "Karayolları 1. Bölge Müdürlüğü",
        bidValue: 1650000,
        city: "İstanbul",
        contractValue: 0,
        currency: "TRY",
        estimatedValue: 1800000,
        id: "tender-draft-5",
        ikn: "2026/888999",
          overheadRate: 8,
        profitMargin: 12,
        procedure: "Açık",
        status: "Hazırlanıyor",
        submissionDeadline: "2026-07-15T14:30",
        tenderNo: "IHL-2026-005",
        thresholdValue: 1500000,
          title: "Kavşak düzenleme yapım işi",
      }),
    );
  });

  test("requires a title before creating a draft tender", () => {
    expect(() =>
      createTenderDraftFromValues(
        {
          authorityName: "",
          bidValue: "",
          city: "",
          contractSignDate: "",
          currency: "TRY",
          description: "",
          estimatedValue: "",
          ikn: "",
          noticeDate: "",
          overheadRate: "",
          boqLines: [],
          profitMargin: "",
          procedure: "Açık",
          questionAnswerDeadline: "",
          sessionDate: "",
          specPurchaseDeadline: "",
          submissionDeadline: "",
          tenderNo: "",
          thresholdValue: "",
          title: " ",
        },
        1,
      ),
    ).toThrow("Başlık zorunludur");
  });

  test("creates a tenant scoped tender draft and records audit metadata", async () => {
    const auditEntries: AuditLogEntryInput[] = [];
    const service = createTenderService({
      auditLogRepository: createAuditLogRecorder(auditEntries),
      now: () => "2026-07-01T10:00:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });

    const result = await service.create({
      scope: defaultTenantScope,
      values: validTenderCreateValues,
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        authorityName: "Karayolları 1. Bölge Müdürlüğü",
        bidValue: 1650000,
        city: "İstanbul",
        currency: "TRY",
        estimatedValue: 1800000,
        ikn: "2026/888999",
        status: "Hazırlanıyor",
        tenderNo: "IHL-2026-005",
        title: "Kavşak düzenleme yapım işi",
      }),
    });
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "tender.create",
        entityLabel: "IHL-2026-005",
        entityType: "tender",
        metadata: expect.objectContaining({
          bidValue: 1650000,
          statusTo: "Hazırlanıyor",
          tenderNo: "IHL-2026-005",
        }),
      }),
    ]);
  });

  test("creates a tenant scoped tender draft with persisted BOQ lines and audit totals", async () => {
    const auditEntries: AuditLogEntryInput[] = [];
    const service = createTenderService({
      auditLogRepository: createAuditLogRecorder(auditEntries),
      now: () => "2026-07-01T10:00:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });

    const result = await service.create({
      scope: defaultTenantScope,
      values: {
        ...validTenderCreateValues,
        bidValue: 1200,
        boqLines: [
          {
            description: "Fore kazık imalatı",
            equipmentCost: 25,
            laborCost: 50,
            materialCost: 100,
            pozNo: "01.001",
            quantity: 2,
            shippingCost: 10,
            subcontractorCost: 200,
            unit: "m",
            unitBid: 500,
          },
        ],
        overheadRate: 10,
        profitMargin: 20,
      },
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        boqBidTotal: 1000,
        boqLineCount: 1,
        boqLines: [
          expect.objectContaining({
            lineBidTotal: 1000,
            lineCostTotal: 770,
            lineNo: 1,
            unitCost: 385,
          }),
        ],
        profitAmount: 430,
        profitRate: 35.83,
        suggestedOffer: 1016.4,
        totalCost: 770,
      }),
    });
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "tender.create",
        metadata: expect.objectContaining({
          boqBidTotal: 1000,
          boqLineCount: 1,
          profitAmount: 430,
          profitRate: 35.83,
          totalCost: 770,
        }),
      }),
    ]);
  });

  test("updates tender BOQ lines and records audit totals", async () => {
    const auditEntries: AuditLogEntryInput[] = [];
    const service = createTenderService({
      auditLogRepository: createAuditLogRecorder(auditEntries),
      now: () => "2026-07-01T11:15:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });
    const created = await service.create({
      scope: defaultTenantScope,
      values: {
        ...validTenderCreateValues,
        bidValue: 1200,
        overheadRate: 10,
        profitMargin: 20,
      },
    });

    const updated = await service.updateBoq({
      scope: defaultTenantScope,
      tenderId: created.ok ? created.data.id : "",
      values: {
        boqLines: [
          {
            description: "Başlık kirişi",
            equipmentCost: 30,
            laborCost: 60,
            materialCost: 120,
            pozNo: "02.010",
            quantity: 3,
            shippingCost: 20,
            subcontractorCost: 240,
            unit: "m",
            unitBid: 650,
          },
        ],
      },
    });

    expect(updated).toEqual({
      ok: true,
      data: expect.objectContaining({
        boqBidTotal: 1950,
        boqLineCount: 1,
        boqLines: [
          expect.objectContaining({
            description: "Başlık kirişi",
            lineBidTotal: 1950,
            lineCostTotal: 1410,
            lineNo: 1,
            unitCost: 470,
          }),
        ],
        profitAmount: -210,
        profitRate: -17.5,
        suggestedOffer: 1861.2,
        totalCost: 1410,
        updatedAt: "2026-07-01T11:15:00.000Z",
      }),
    });
    expect(auditEntries.at(-1)).toEqual(
      expect.objectContaining({
        action: "tender.boq.update",
        entityLabel: "IHL-2026-005",
        metadata: expect.objectContaining({
          boqBidTotal: 1950,
          boqLineCount: 1,
          profitAmount: -210,
          profitRate: -17.5,
          totalCost: 1410,
        }),
      }),
    );
  });

  test("updates tender bid value when BOQ total is transferred explicitly", async () => {
    const auditEntries: AuditLogEntryInput[] = [];
    const service = createTenderService({
      auditLogRepository: createAuditLogRecorder(auditEntries),
      now: () => "2026-07-01T11:45:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });
    const created = await service.create({
      scope: defaultTenantScope,
      values: {
        ...validTenderCreateValues,
        bidValue: 1200,
        overheadRate: 10,
        profitMargin: 20,
      },
    });

    const updated = await service.updateBoq({
      scope: defaultTenantScope,
      tenderId: created.ok ? created.data.id : "",
      values: {
        bidValue: 1950,
        boqLines: [
          {
            description: "Başlık kirişi",
            equipmentCost: 30,
            laborCost: 60,
            materialCost: 120,
            pozNo: "02.010",
            quantity: 3,
            shippingCost: 20,
            subcontractorCost: 240,
            unit: "m",
            unitBid: 650,
          },
        ],
      },
    });

    expect(updated).toEqual({
      ok: true,
      data: expect.objectContaining({
        bidValue: 1950,
        boqBidTotal: 1950,
        profitAmount: 540,
        profitRate: 27.69,
        totalCost: 1410,
      }),
    });
    expect(auditEntries.at(-1)).toEqual(
      expect.objectContaining({
        action: "tender.boq.update",
        metadata: expect.objectContaining({
          bidValue: 1950,
          previousBidValue: 1200,
        }),
      }),
    );
  });

  test("converts a won tender to a linked site card", async () => {
    const auditEntries: AuditLogEntryInput[] = [];
    const service = createTenderService({
      auditLogRepository: createAuditLogRecorder(auditEntries),
      now: () => "2026-07-01T12:15:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });
    const created = await service.create({
      scope: defaultTenantScope,
      values: {
        ...validTenderCreateValues,
        bidValue: 3900000,
        contractSignDate: "2026-07-20",
      },
    });
    const submitted = await service.transitionStatus({
      scope: defaultTenantScope,
      status: "Sunuldu",
      tenderId: created.ok ? created.data.id : "",
    });
    const won = await service.transitionStatus({
      scope: defaultTenantScope,
      status: "Kazanıldı",
      tenderId: submitted.ok ? submitted.data.id : "",
    });

    const converted = await service.convertToSite({
      scope: defaultTenantScope,
      tenderId: won.ok ? won.data.id : "",
      values: {
        siteCode: "SANT-0003",
        siteName: "Kavşak düzenleme yapım işi",
      },
    });

    expect(converted).toEqual({
      ok: true,
      data: expect.objectContaining({
        convertedSiteCode: "SANT-0003",
        convertedSiteName: "Kavşak düzenleme yapım işi",
        convertedToSiteAt: "2026-07-01T12:15:00.000Z",
        status: "Kazanıldı",
      }),
    });
    expect(auditEntries.at(-1)).toEqual(
      expect.objectContaining({
        action: "tender.site.convert",
        metadata: expect.objectContaining({
          convertedSiteCode: "SANT-0003",
          convertedSiteName: "Kavşak düzenleme yapım işi",
          statusTo: "Kazanıldı",
        }),
      }),
    );
  });

  test("rejects site conversion before a tender is won", async () => {
    const service = createTenderService({
      now: () => "2026-07-01T12:15:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });
    const created = await service.create({
      scope: defaultTenantScope,
      values: validTenderCreateValues,
    });

    const result = await service.convertToSite({
      scope: defaultTenantScope,
      tenderId: created.ok ? created.data.id : "",
      values: {
        siteCode: "SANT-0003",
        siteName: "Kavşak düzenleme yapım işi",
      },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Yalnız kazanılmış ihaleden şantiye oluşturulabilir."],
    });
  });
  test("rejects tender BOQ updates for read only users", async () => {
    const service = createTenderService({
      now: () => "2026-07-01T11:15:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });
    const created = await service.create({
      scope: defaultTenantScope,
      values: validTenderCreateValues,
    });

    const result = await service.updateBoq({
      scope: { ...defaultTenantScope, userRole: "viewer" },
      tenderId: created.ok ? created.data.id : "",
      values: {
        boqLines: [],
      },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["İhale işlemi için muhasebe veya admin yetkisi gereklidir."],
    });
  });

  test("rejects duplicate tender numbers in the same tenant scope", async () => {
    const service = createTenderService({
      now: () => "2026-07-01T10:00:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });

    await service.create({
      scope: defaultTenantScope,
      values: validTenderCreateValues,
    });
    const duplicate = await service.create({
      scope: defaultTenantScope,
      values: validTenderCreateValues,
    });

    expect(duplicate).toEqual({
      ok: false,
      errors: [
        "İhale no bu dönem için zaten kullanılıyor: IHL-2026-005",
      ],
    });
  });

  test("rejects tender creation for read only users", async () => {
    const service = createTenderService({
      now: () => "2026-07-01T10:00:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });

    const result = await service.create({
      scope: { ...defaultTenantScope, userRole: "viewer" },
      values: validTenderCreateValues,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["İhale işlemi için muhasebe veya admin yetkisi gereklidir."],
    });
  });

  test("transitions a tender forward and records audit metadata", async () => {
    const auditEntries: AuditLogEntryInput[] = [];
    const service = createTenderService({
      auditLogRepository: createAuditLogRecorder(auditEntries),
      now: () => "2026-07-01T11:30:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });

    const created = await service.create({
      scope: defaultTenantScope,
      values: validTenderCreateValues,
    });

    expect(created.ok).toBe(true);

    const transitioned = await service.transitionStatus({
      scope: defaultTenantScope,
      tenderId: created.ok ? created.data.id : "",
      status: "Sunuldu",
    });

    expect(transitioned).toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "Sunuldu",
        updatedAt: "2026-07-01T11:30:00.000Z",
        updatedBy: defaultTenantScope.userId,
      }),
    });
    expect(auditEntries.at(-1)).toEqual(
      expect.objectContaining({
        action: "tender.status.transition",
        entityLabel: "IHL-2026-005",
        entityType: "tender",
        metadata: expect.objectContaining({
          statusFrom: "Hazırlanıyor",
          statusTo: "Sunuldu",
          tenderNo: "IHL-2026-005",
        }),
      }),
    );
  });

  test("rejects tender status transitions that move backwards", async () => {
    const service = createTenderService({
      now: () => "2026-07-01T10:00:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });

    const created = await service.create({
      scope: defaultTenantScope,
      values: validTenderCreateValues,
    });
    const posted = await service.transitionStatus({
      scope: defaultTenantScope,
      tenderId: created.ok ? created.data.id : "",
      status: "Sunuldu",
    });
    const backwards = await service.transitionStatus({
      scope: defaultTenantScope,
      tenderId: posted.ok ? posted.data.id : "",
      status: "Hazırlanıyor",
    });

    expect(backwards).toEqual({
      ok: false,
      errors: [
        "İhale durumu Sunuldu durumundan Hazırlanıyor durumuna geçirilemez.",
      ],
    });
  });

  test("rejects tender status transitions for read only users", async () => {
    const service = createTenderService({
      now: () => "2026-07-01T10:00:00.000Z",
      repository: createSeededTenderMemoryRepository(),
    });

    const created = await service.create({
      scope: defaultTenantScope,
      values: validTenderCreateValues,
    });

    const result = await service.transitionStatus({
      scope: { ...defaultTenantScope, userRole: "viewer" },
      tenderId: created.ok ? created.data.id : "",
      status: "Sunuldu",
    });

    expect(result).toEqual({
      ok: false,
      errors: ["İhale işlemi için muhasebe veya admin yetkisi gereklidir."],
    });
  });
});

const validTenderCreateValues: TenderCreateValues = {
  authorityName: "Karayolları 1. Bölge Müdürlüğü",
  bidValue: 1650000,
  city: "İstanbul",
  contractSignDate: "",
  currency: "TRY",
  description: "Saha keşfi tamamlandı.",
  estimatedValue: 1800000,
  ikn: "2026/888999",
  noticeDate: "2026-07-01",
  overheadRate: 8,
  profitMargin: 12,
  procedure: "Açık",
  questionAnswerDeadline: "2026-07-08",
  sessionDate: "2026-07-16T11:00",
  specPurchaseDeadline: "2026-07-07",
  submissionDeadline: "2026-07-15T14:30",
  tenderNo: "IHL-2026-005",
  thresholdValue: 1500000,
  title: "Kavşak düzenleme yapım işi",
};

function createTender(overrides: Partial<TenderRow>): TenderRow {
  return {
    authorityName: "İstanbul Büyükşehir Belediyesi",
    bidValue: 0,
    contractValue: 0,
    estimatedValue: 0,
    ikn: "2026/100001",
    id: "tender",
    procedure: "Açık",
    submissionDeadline: "2026-07-01T12:00",
    status: "Takip",
    tenderNo: "IHL-0001",
    title: "Altyapı yenileme yapım işi",
    ...overrides,
  };
}

function createAuditLogRecorder(entries: AuditLogEntryInput[]) {
  return {
    async record(input: AuditLogEntryInput) {
      entries.push(input);
    },
  };
}



