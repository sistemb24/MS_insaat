import type {
  AuditLogReadRepository,
  AuditLogRepository,
} from "./audit-log";
import type {
  PurchaseInvoiceService,
  PurchaseInvoiceServiceResult,
} from "./purchase-invoice-service";
import type { TenantScope } from "./tenant-scope";

export type SeedDefaultPurchaseInvoicesInput = {
  scope: TenantScope;
  service: PurchaseInvoiceService;
};

export type SeedDefaultPurchaseInvoicesResult = {
  seeded: string[];
  skipped: string[];
  totalRows: number;
};

const defaultPurchaseInvoices = [
  {
    documentNo: "FAT-0006",
    invoiceDate: "2026-06-23",
    dueDate: "2026-07-23",
    counterpartyCode: "TED-0001",
    counterpartyName: "ÖRNEK TEDARİKÇİ",
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    currency: "TL" as const,
    exchangeRate: 1,
    movementGroup: "Malzeme Alımı",
    isOfficial: false,
    description: "NOA alış faturası demo akışı",
    lines: [
      {
        stockCode: "STK-0001",
        stockName: "Çimento Torba",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        unit: "Adet",
        description: "50kg Portland",
        warehouse: "Merkez Depo",
        quantity: 100,
        unitPrice: 150,
        discountRate1: 10,
        discountRate2: 0,
        vatRate: 20,
      },
      {
        stockCode: "HIZ-0001",
        stockName: "Nakliye Hizmeti",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        unit: "Sefer",
        description: "Şantiye teslim nakliye",
        warehouse: "",
        quantity: 2,
        unitPrice: 2500,
        discountRate1: 0,
        discountRate2: 5,
        vatRate: 10,
      },
    ],
  },
  {
    documentNo: "FAT-2026-001",
    invoiceDate: "2026-06-01",
    dueDate: "2026-07-01",
    counterpartyCode: "TED-002",
    counterpartyName: "YAPI MALZEMELERİ A.Ş.",
    siteCode: "SANT-001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    currency: "TL" as const,
    exchangeRate: 1,
    movementGroup: "Malzeme Alımı",
    isOfficial: true,
    description: "Temel betonu ve demir alımı",
    lines: [
      {
        stockCode: "STK-002",
        stockName: "Hazır Beton C30",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        unit: "m3",
        description: "Temel için",
        warehouse: "A Blok",
        quantity: 250,
        unitPrice: 2200,
        discountRate1: 5,
        discountRate2: 0,
        vatRate: 20,
      },
      {
        stockCode: "STK-003",
        stockName: "Nervürlü Demir",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        unit: "Ton",
        description: "Temel donatısı",
        warehouse: "A Blok",
        quantity: 45,
        unitPrice: 24500,
        discountRate1: 2,
        discountRate2: 0,
        vatRate: 20,
      },
    ],
  },
  {
    documentNo: "FAT-2026-002",
    invoiceDate: "2026-06-15",
    dueDate: "2026-07-15",
    counterpartyCode: "TED-003",
    counterpartyName: "GÜVEN NAKLİYAT LTD. ŞTİ.",
    siteCode: "SANT-001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    currency: "TL" as const,
    exchangeRate: 1,
    movementGroup: "Hizmet Alımı",
    isOfficial: true,
    description: "Hafriyat taşıma bedeli",
    lines: [
      {
        stockCode: "HIZ-002",
        stockName: "Hafriyat Nakliyesi",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        unit: "Sefer",
        description: "Döküm sahasına taşıma",
        warehouse: "",
        quantity: 120,
        unitPrice: 1800,
        discountRate1: 0,
        discountRate2: 0,
        vatRate: 20,
      }
    ],
  },
  {
    documentNo: "FAT-2026-003",
    invoiceDate: "2026-06-25",
    dueDate: "2026-07-25",
    counterpartyCode: "TED-004",
    counterpartyName: "ENERJİ ELEKTRİK A.Ş.",
    siteCode: "SANT-001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    currency: "TL" as const,
    exchangeRate: 1,
    movementGroup: "Gider",
    isOfficial: true,
    description: "Şantiye elektrik faturası",
    lines: [
      {
        stockCode: "GDR-001",
        stockName: "Elektrik Gideri",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        unit: "kWh",
        description: "Haziran dönemi şantiye elektriği",
        warehouse: "",
        quantity: 15400,
        unitPrice: 2.85,
        discountRate1: 0,
        discountRate2: 0,
        vatRate: 20,
      }
    ],
  },
];

export async function seedDefaultPurchaseInvoices({
  scope,
  service,
}: SeedDefaultPurchaseInvoicesInput): Promise<SeedDefaultPurchaseInvoicesResult> {
  const existingResult = await service.list({ scope });
  const result: SeedDefaultPurchaseInvoicesResult = {
    seeded: [],
    skipped: [],
    totalRows: existingResult.ok ? existingResult.data.rows.length : 0,
  };

  if (!existingResult.ok) {
    throw new Error(existingResult.errors.join(" "));
  }

  const existingDocumentNumbers = new Set(
    existingResult.data.rows.map((row) => row.documentNo),
  );

  for (const invoice of defaultPurchaseInvoices) {
    if (existingDocumentNumbers.has(invoice.documentNo)) {
      result.skipped.push(invoice.documentNo);
      continue;
    }

    const createResult = await service.create({
      scope,
      values: invoice,
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(" "));
    }

    result.seeded.push(invoice.documentNo);
    result.totalRows += 1;
  }

  return result;
}

export function assertPurchaseInvoiceSeedResult<T>(
  result: PurchaseInvoiceServiceResult<T>,
) {
  if (!result.ok) {
    throw new Error(result.errors.join(" "));
  }

  return result.data;
}
export type SeedDefaultPurchaseInvoiceAuditLogsInput = {
  auditLogRepository: AuditLogRepository & AuditLogReadRepository;
  scope: TenantScope;
  service: PurchaseInvoiceService;
};

export type SeedDefaultPurchaseInvoiceAuditLogsResult = {
  seeded: string[];
  skipped: string[];
};

export async function seedDefaultPurchaseInvoiceAuditLogs({
  auditLogRepository,
  scope,
  service,
}: SeedDefaultPurchaseInvoiceAuditLogsInput): Promise<SeedDefaultPurchaseInvoiceAuditLogsResult> {
  const invoiceResult = await service.list({ scope });

  if (!invoiceResult.ok) {
    throw new Error(invoiceResult.errors.join(" "));
  }

  const existingAuditLogs = await auditLogRepository.listByEntityType({
    entityType: "purchase-invoice",
    scope,
  });
  const result: SeedDefaultPurchaseInvoiceAuditLogsResult = {
    seeded: [],
    skipped: [],
  };

  for (const invoice of defaultPurchaseInvoices) {
    const row = invoiceResult.data.rows.find(
      (current) => current.documentNo === invoice.documentNo,
    );

    if (!row) {
      continue;
    }

    const hasCreateAudit = existingAuditLogs.some(
      (log) =>
        log.entityId === row.id && log.action === "purchase-invoice.create",
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
      action: "purchase-invoice.create",
      entityType: "purchase-invoice",
      entityId: row.id,
      entityLabel: row.documentNo,
      occurredAt: row.createdAt,
      metadata: {
        documentNo: row.documentNo,
        statusTo: row.status,
        counterpartyCode: row.counterpartyCode,
        counterpartyName: row.counterpartyName,
        siteCode: row.siteCode,
        siteName: row.siteName,
        grandTotal: row.grandTotal,
        lineCount: row.lineCount,
      },
    });
    existingAuditLogs.push({
      id: `seeded-${row.id}`,
      tenantId: row.tenantId,
      companyId: row.companyId,
      periodId: row.periodId,
      actorUserId: row.createdBy,
      action: "purchase-invoice.create",
      entityType: "purchase-invoice",
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
