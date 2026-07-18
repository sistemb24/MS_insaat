import type {
  AuditLogReadRepository,
  AuditLogRepository,
} from "./audit-log";
import type { ProgressPaymentService } from "./progress-payment-service";
import type { TenantScope } from "./tenant-scope";

export type SeedDefaultProgressPaymentsInput = {
  scope: TenantScope;
  service: ProgressPaymentService;
};

export type SeedDefaultProgressPaymentsResult = {
  seeded: string[];
  skipped: string[];
  totalRows: number;
};

export type SeedDefaultProgressPaymentAuditLogsInput = {
  auditLogRepository: AuditLogRepository & AuditLogReadRepository;
  scope: TenantScope;
  service: ProgressPaymentService;
};

export type SeedDefaultProgressPaymentAuditLogsResult = {
  seeded: string[];
  skipped: string[];
};

const defaultProgressPayments = [
  {
    counterpartyCode: "TAS-0001",
    counterpartyName: "ŞİRKETİN TAŞERONU",
    currency: "TL" as const,
    description: "NOA hakediş demo akışı",
    documentNo: "HAK-0001",
    issueDate: "2026-06-27",
    lines: [
      {
        description: "Kaba inşaat imalatı",
        quantity: 10,
        unit: "m2",
        unitPrice: 1000,
        vatRate: 20,
      },
      {
        description: "Şantiye ince işçilik",
        quantity: 5,
        unit: "gün",
        unitPrice: 1500,
        vatRate: 20,
      },
    ],
    paymentType: "Taşeron Hakedişi" as const,
    retentionRate: 5,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
  },
  {
    counterpartyCode: "TAS-0002",
    counterpartyName: "DOĞAN YAPI TAŞERONLUK LTD. ŞTİ.",
    currency: "TL" as const,
    description: "Antalya projesi sıva ve boya hakedişi",
    documentNo: "HAK-0002",
    issueDate: "2026-06-30",
    lines: [
      {
        description: "İç cephe sıva imalatı",
        quantity: 1240,
        unit: "m2",
        unitPrice: 320,
        vatRate: 20,
      },
      {
        description: "Dış cephe mantolama",
        quantity: 860,
        unit: "m2",
        unitPrice: 580,
        vatRate: 20,
      },
      {
        description: "İç cephe boya (2 kat astar + 2 kat boya)",
        quantity: 1240,
        unit: "m2",
        unitPrice: 145,
        vatRate: 20,
      },
    ],
    paymentType: "Taşeron Hakedişi" as const,
    retentionRate: 5,
    siteCode: "SANT-0002",
    siteName: "ANTALYA KONYAALTI 120 KONUT PROJESİ",
  },
  {
    counterpartyCode: "TAS-0003",
    counterpartyName: "YILDIZ ELEKTRİK TESİSAT",
    currency: "TL" as const,
    description: "İstanbul iş merkezi elektrik tesisat hakedişi",
    documentNo: "HAK-0003",
    issueDate: "2026-07-01",
    lines: [
      {
        description: "Elektrik tesisat kablo çekimi (NYM 3x2.5)",
        quantity: 4500,
        unit: "mt",
        unitPrice: 85,
        vatRate: 20,
      },
      {
        description: "Pano montajı ve bağlantı",
        quantity: 12,
        unit: "Adet",
        unitPrice: 8500,
        vatRate: 20,
      },
      {
        description: "Aydınlatma armatür montajı",
        quantity: 320,
        unit: "Adet",
        unitPrice: 250,
        vatRate: 20,
      },
      {
        description: "Topraklama ve yıldırımdan korunma",
        quantity: 1,
        unit: "Takım",
        unitPrice: 42000,
        vatRate: 20,
      },
    ],
    paymentType: "Taşeron Hakedişi" as const,
    retentionRate: 10,
    siteCode: "SANT-0003",
    siteName: "İSTANBUL KARTAL İŞ MERKEZİ İNŞAATI",
  },
];

export async function seedDefaultProgressPayments({
  scope,
  service,
}: SeedDefaultProgressPaymentsInput): Promise<SeedDefaultProgressPaymentsResult> {
  const existingResult = await service.list({ scope });

  if (!existingResult.ok) {
    throw new Error(existingResult.errors.join(" "));
  }

  const result: SeedDefaultProgressPaymentsResult = {
    seeded: [],
    skipped: [],
    totalRows: existingResult.data.rows.length,
  };
  const existingDocumentNumbers = new Set(
    existingResult.data.rows.map((row) => row.documentNo),
  );

  for (const progressPayment of defaultProgressPayments) {
    if (existingDocumentNumbers.has(progressPayment.documentNo)) {
      result.skipped.push(progressPayment.documentNo);
      continue;
    }

    const createResult = await service.create({
      scope,
      values: progressPayment,
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(" "));
    }

    result.seeded.push(progressPayment.documentNo);
    result.totalRows += 1;
  }

  return result;
}

export async function seedDefaultProgressPaymentAuditLogs({
  auditLogRepository,
  scope,
  service,
}: SeedDefaultProgressPaymentAuditLogsInput): Promise<SeedDefaultProgressPaymentAuditLogsResult> {
  const progressPaymentResult = await service.list({ scope });

  if (!progressPaymentResult.ok) {
    throw new Error(progressPaymentResult.errors.join(" "));
  }

  const existingAuditLogs = await auditLogRepository.listByEntityType({
    entityType: "progress-payment",
    scope,
  });
  const result: SeedDefaultProgressPaymentAuditLogsResult = {
    seeded: [],
    skipped: [],
  };

  for (const progressPayment of defaultProgressPayments) {
    const row = progressPaymentResult.data.rows.find(
      (current) => current.documentNo === progressPayment.documentNo,
    );

    if (!row) {
      continue;
    }

    const hasCreateAudit = existingAuditLogs.some(
      (log) =>
        log.entityId === row.id && log.action === "progress-payment.create",
    );

    if (hasCreateAudit) {
      result.skipped.push(row.documentNo);
      continue;
    }

    await auditLogRepository.record({
      tenantId: row.tenantId,
      companyId: row.companyId,
      periodId: row.periodId,
      actorUserId: row.createdBy,
      action: "progress-payment.create",
      entityType: "progress-payment",
      entityId: row.id,
      entityLabel: row.documentNo,
      occurredAt: row.createdAt,
      metadata: {
        counterpartyCode: row.counterpartyCode,
        counterpartyName: row.counterpartyName,
        documentNo: row.documentNo,
        grandTotal: row.grandTotal,
        lineCount: row.lineCount,
        paymentType: row.paymentType,
        siteCode: row.siteCode,
        siteName: row.siteName,
        statusTo: row.status,
      },
    });
    existingAuditLogs.push({
      id: `seeded-${row.id}`,
      tenantId: row.tenantId,
      companyId: row.companyId,
      periodId: row.periodId,
      actorUserId: row.createdBy,
      action: "progress-payment.create",
      entityType: "progress-payment",
      entityId: row.id,
      entityLabel: row.documentNo,
      occurredAt: row.createdAt,
      createdAt: row.createdAt,
      metadata: {},
    });
    result.seeded.push(row.documentNo);
  }

  return result;
}
