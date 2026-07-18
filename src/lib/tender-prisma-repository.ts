import type {
  TenderBoqLineRow,
  TenderCurrency,
  TenderProcedure,
  TenderRepository,
  TenderRepositoryListInput,
  TenderRow,
  TenderStatus,
} from "./tender-service";
import { buildTenderBoqSummary } from "./tender-service";

type TenderRecord = {
  authorityName: string;
  bidValue: unknown;
  city?: string | null;
  companyId: string;
  contractSignDate?: Date | string | null;
  contractValue: unknown;
  convertedSiteCode?: string | null;
  convertedSiteName?: string | null;
  convertedToSiteAt?: Date | string | null;
  createdAt: Date | string;
  createdBy: string;
  currency: string;
  description?: string | null;
  estimatedValue: unknown;
  id: string;
  ikn: string;
  noticeDate?: Date | string | null;
  overheadRate: unknown;
  periodId: string;
  procedure: string;
  profitMargin: unknown;
  questionAnswerDeadline?: Date | string | null;
  sessionDate?: Date | string | null;
  specPurchaseDeadline?: Date | string | null;
  status: string;
  submissionDeadline: Date | string;
  tenderNo: string;
  tenantId: string;
  thresholdValue: unknown;
  title: string;
  updatedAt: Date | string;
  updatedBy: string;
  lines: TenderBoqLineRecord[];
};

type TenderBoqLineRecord = {
  description?: string;
  equipmentCost?: unknown;
  laborCost?: unknown;
  lineBidTotal?: unknown;
  lineCostTotal?: unknown;
  lineNo: number;
  materialCost?: unknown;
  pozNo?: string;
  quantity?: unknown;
  shippingCost?: unknown;
  subcontractorCost?: unknown;
  unit?: string;
  unitBid?: unknown;
  unitCost?: unknown;
};

type TenderClient = {
  create(input: {
    data: ReturnType<typeof rowToCreateData>;
    include: ReturnType<typeof lineInclude>;
  }): Promise<TenderRecord>;
  findMany(input: {
    where: {
      tenantId: string;
      companyId: string;
      periodId: string;
    };
    orderBy: Array<
      { submissionDeadline: "asc" | "desc" } | { createdAt: "asc" | "desc" }
    >;
    include: ReturnType<typeof lineInclude>;
  }): Promise<TenderRecord[]>;
  update(input: {
    where: {
      id: string;
    };
    data: ReturnType<typeof rowToUpdateData>;
    include: ReturnType<typeof lineInclude>;
  }): Promise<TenderRecord>;
};

export type TenderPrismaClientLike = {
  tender: TenderClient;
};

export function createTenderPrismaRepository(
  prisma: TenderPrismaClientLike,
): TenderRepository {
  return {
    async create(row) {
      const created = await prisma.tender.create({
        data: rowToCreateData(row),
        include: lineInclude(),
      });

      return recordToRow(created);
    },

    async list({ scope }: TenderRepositoryListInput) {
      const rows = await prisma.tender.findMany({
        where: {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          periodId: scope.periodId,
        },
        orderBy: [{ submissionDeadline: "asc" }, { createdAt: "desc" }],
        include: lineInclude(),
      });

      return rows.map(recordToRow);
    },

    async update(row) {
      const updated = await prisma.tender.update({
        where: {
          id: row.id,
        },
        data: rowToUpdateData(row),
        include: lineInclude(),
      });

      return recordToRow(updated);
    },
  };
}

function rowToCreateData(row: TenderRow) {
  return {
    id: row.id,
    tenantId: row.tenantId ?? "",
    companyId: row.companyId ?? "",
    periodId: row.periodId ?? "",
    createdBy: row.createdBy ?? "",
    createdAt: new Date(row.createdAt ?? new Date().toISOString()),
    ...rowToPersistedFields(row),
    lines: {
      createMany: {
        data: rowToLineCreateManyData(row),
      },
    },
  };
}

function rowToUpdateData(row: TenderRow) {
  return {
    ...rowToPersistedFields(row),
    lines: {
      deleteMany: {},
      createMany: {
        data: rowToLineCreateManyData(row),
      },
    },
  };
}

function rowToPersistedFields(row: TenderRow) {
  return {
    authorityName: row.authorityName,
    bidValue: row.bidValue,
    city: row.city || null,
    contractSignDate: parseOptionalDate(row.contractSignDate),
    contractValue: row.contractValue,
    convertedSiteCode: row.convertedSiteCode || null,
    convertedSiteName: row.convertedSiteName || null,
    convertedToSiteAt: parseOptionalIso(row.convertedToSiteAt),
    currency: row.currency ?? "TRY",
    description: row.description || null,
    estimatedValue: row.estimatedValue,
    ikn: row.ikn,
    noticeDate: parseOptionalDate(row.noticeDate),
    overheadRate: row.overheadRate ?? 0,
    procedure: row.procedure,
    profitMargin: row.profitMargin ?? 0,
    questionAnswerDeadline: parseOptionalDate(row.questionAnswerDeadline),
    sessionDate: parseOptionalDateTime(row.sessionDate),
    specPurchaseDeadline: parseOptionalDate(row.specPurchaseDeadline),
    status: row.status,
    submissionDeadline: parseRequiredDateTime(row.submissionDeadline),
    tenderNo: row.tenderNo,
    thresholdValue: row.thresholdValue ?? 0,
    title: row.title,
    updatedAt: new Date(row.updatedAt ?? row.createdAt ?? new Date().toISOString()),
    updatedBy: row.updatedBy ?? "",
  };
}

function recordToRow(record: TenderRecord): TenderRow {
  const boqLines = record.lines.map(recordToBoqLineRow);
  const boqSummary = buildTenderBoqSummary({
    bidValue: numberFromDecimal(record.bidValue),
    boqLines,
    overheadRate: numberFromDecimal(record.overheadRate),
    profitMargin: numberFromDecimal(record.profitMargin),
  });

  return {
    authorityName: record.authorityName,
    bidValue: numberFromDecimal(record.bidValue),
    ...boqSummary,
    city: record.city ?? "",
    companyId: record.companyId,
    contractSignDate: formatOptionalDateOnly(record.contractSignDate),
    contractValue: numberFromDecimal(record.contractValue),
    convertedSiteCode: record.convertedSiteCode ?? "",
    convertedSiteName: record.convertedSiteName ?? "",
    convertedToSiteAt: formatOptionalIso(record.convertedToSiteAt),
    createdAt: formatIso(record.createdAt),
    createdBy: record.createdBy,
    currency: readCurrency(record.currency),
    description: record.description ?? "",
    estimatedValue: numberFromDecimal(record.estimatedValue),
    id: record.id,
    ikn: record.ikn,
    noticeDate: formatOptionalDateOnly(record.noticeDate),
    overheadRate: numberFromDecimal(record.overheadRate),
    periodId: record.periodId,
    procedure: readProcedure(record.procedure),
    profitMargin: numberFromDecimal(record.profitMargin),
    questionAnswerDeadline: formatOptionalDateOnly(record.questionAnswerDeadline),
    sessionDate: formatOptionalDateTime(record.sessionDate),
    specPurchaseDeadline: formatOptionalDateOnly(record.specPurchaseDeadline),
    status: readStatus(record.status),
    submissionDeadline: formatDateTimeLocal(record.submissionDeadline),
    tenderNo: record.tenderNo,
    tenantId: record.tenantId,
    thresholdValue: numberFromDecimal(record.thresholdValue),
    title: record.title,
    updatedAt: formatIso(record.updatedAt),
    updatedBy: record.updatedBy,
  };
}

function rowToLineCreateManyData(row: TenderRow) {
  return (row.boqLines ?? []).map((line) => ({
    lineNo: line.lineNo,
    pozNo: line.pozNo,
    description: line.description,
    unit: line.unit,
    quantity: line.quantity,
    materialCost: line.materialCost,
    laborCost: line.laborCost,
    equipmentCost: line.equipmentCost,
    subcontractorCost: line.subcontractorCost,
    shippingCost: line.shippingCost,
    unitCost: line.unitCost,
    lineCostTotal: line.lineCostTotal,
    unitBid: line.unitBid,
    lineBidTotal: line.lineBidTotal,
  }));
}

function recordToBoqLineRow(record: TenderBoqLineRecord): TenderBoqLineRow {
  return {
    description: record.description ?? "",
    equipmentCost: numberFromDecimal(record.equipmentCost),
    laborCost: numberFromDecimal(record.laborCost),
    lineBidTotal: numberFromDecimal(record.lineBidTotal),
    lineCostTotal: numberFromDecimal(record.lineCostTotal),
    lineNo: record.lineNo,
    materialCost: numberFromDecimal(record.materialCost),
    pozNo: record.pozNo ?? "",
    quantity: numberFromDecimal(record.quantity),
    shippingCost: numberFromDecimal(record.shippingCost),
    subcontractorCost: numberFromDecimal(record.subcontractorCost),
    unit: record.unit ?? "",
    unitBid: numberFromDecimal(record.unitBid),
    unitCost: numberFromDecimal(record.unitCost),
  };
}

function lineInclude() {
  return {
    lines: {
      orderBy: {
        lineNo: "asc" as const,
      },
    },
  };
}

function parseOptionalIso(value: string | undefined) {
  if (!value) {
    return null;
  }

  return new Date(value);
}

function formatOptionalIso(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  return formatIso(value);
}
function parseOptionalDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function parseOptionalDateTime(value: string | undefined) {
  if (!value) {
    return null;
  }

  return parseDateTimeLocal(value);
}

function parseRequiredDateTime(value: string) {
  return parseDateTimeLocal(value);
}

function formatOptionalDateOnly(value: Date | string | null | undefined) {
  return value ? formatIso(value).slice(0, 10) : "";
}

function formatOptionalDateTime(value: Date | string | null | undefined) {
  return value ? formatDateTimeLocal(value) : "";
}

function formatDateTimeLocal(value: Date | string) {
  return formatIso(value).slice(0, 16);
}

function formatIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseDateTimeLocal(value: string) {
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(value)) {
    return new Date(value);
  }

  return new Date(`${value}:00.000Z`);
}

function numberFromDecimal(value: unknown) {
  return Number(value ?? 0);
}

function readCurrency(value: string): TenderCurrency {
  return value === "USD" || value === "EUR" ? value : "TRY";
}

function readProcedure(value: string): TenderProcedure {
  if (value === "Kapalı" || value === "Pazarlık") {
    return value;
  }

  return "Açık";
}

function readStatus(value: string): TenderStatus {
  if (
    value === "Takip" ||
    value === "Sunuldu" ||
    value === "Kazanıldı" ||
    value === "Kaybedildi" ||
    value === "İptal"
  ) {
    return value;
  }

  return "Hazırlanıyor";
}
