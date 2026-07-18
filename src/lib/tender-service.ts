import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";

export const TENDER_STATUSES = [
  "Takip",
  "Hazırlanıyor",
  "Sunuldu",
  "Kazanıldı",
  "Kaybedildi",
  "İptal",
] as const;

export type TenderStatus = (typeof TENDER_STATUSES)[number];

export type TenderProcedure = "Açık" | "Kapalı" | "Pazarlık";

export type TenderCurrency = "TRY" | "USD" | "EUR";

export type TenderBoqLineFormValues = {
  description: string;
  equipmentCost: string;
  laborCost: string;
  materialCost: string;
  pozNo: string;
  quantity: string;
  shippingCost: string;
  subcontractorCost: string;
  unit: string;
  unitBid: string;
};

export type TenderBoqLineValues = {
  description: string;
  equipmentCost: number;
  laborCost: number;
  materialCost: number;
  pozNo: string;
  quantity: number;
  shippingCost: number;
  subcontractorCost: number;
  unit: string;
  unitBid: number;
};

export type TenderBoqSimulationInput = {
  lines: TenderBoqLineValues[];
  manualBidValue?: number;
  overheadRate?: number;
  profitMargin?: number;
};

export type TenderBoqSimulationLine = TenderBoqLineValues & {
  lineBidTotal: number;
  lineCostTotal: number;
  unitCost: number;
};

export type TenderBoqLineRow = TenderBoqSimulationLine & {
  lineNo: number;
};

export type TenderBoqSimulation = {
  boqBidTotal: number;
  lineCount: number;
  lines: TenderBoqSimulationLine[];
  profitAmount: number;
  profitRate: number;
  suggestedOffer: number;
  totalCost: number;
  usedOffer: number;
};

export type TenderDraftFormValues = {
  authorityName: string;
  bidValue: string;
  boqLines: TenderBoqLineFormValues[];
  city: string;
  contractSignDate: string;
  currency: TenderCurrency;
  description: string;
  estimatedValue: string;
  ikn: string;
  noticeDate: string;
  overheadRate: string;
  profitMargin: string;
  procedure: TenderProcedure;
  questionAnswerDeadline: string;
  sessionDate: string;
  specPurchaseDeadline: string;
  submissionDeadline: string;
  tenderNo: string;
  thresholdValue: string;
  title: string;
};

export type TenderRow = {
  authorityName: string;
  bidValue: number;
  boqBidTotal?: number;
  boqLineCount?: number;
  boqLines?: TenderBoqLineRow[];
  city?: string;
  contractValue: number;
  contractSignDate?: string;
  convertedSiteCode?: string;
  convertedSiteName?: string;
  convertedToSiteAt?: string;
  currency?: TenderCurrency;
  description?: string;
  estimatedValue: number;
  id: string;
  ikn: string;
  noticeDate?: string;
  overheadRate?: number;
  profitMargin?: number;
  profitAmount?: number;
  profitRate?: number;
  procedure: TenderProcedure;
  questionAnswerDeadline?: string;
  sessionDate?: string;
  status: TenderStatus;
  specPurchaseDeadline?: string;
  submissionDeadline: string;
  tenderNo: string;
  thresholdValue?: number;
  title: string;
  suggestedOffer?: number;
  totalCost?: number;
  tenantId?: string;
  companyId?: string;
  periodId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TenderCreateValues = {
  authorityName: string;
  bidValue: number;
  boqLines?: TenderBoqLineValues[];
  city?: string;
  contractSignDate?: string;
  currency: TenderCurrency;
  description?: string;
  estimatedValue: number;
  ikn?: string;
  noticeDate?: string;
  overheadRate?: number;
  profitMargin?: number;
  procedure: TenderProcedure;
  questionAnswerDeadline?: string;
  sessionDate?: string;
  specPurchaseDeadline?: string;
  submissionDeadline?: string;
  tenderNo?: string;
  thresholdValue?: number;
  title: string;
};

export type TenderBoqUpdateValues = {
  bidValue?: number;
  boqLines: TenderBoqLineValues[];
};

export type TenderSiteConversionValues = {
  projectAmount?: number;
  responsible?: string;
  siteCode: string;
  siteName: string;
};

export type TenderRepositoryListInput = {
  scope: TenantScope;
};

export type TenderRepository = {
  create(input: TenderRow): Promise<TenderRow>;
  list(input: TenderRepositoryListInput): Promise<TenderRow[]>;
  update(input: TenderRow): Promise<TenderRow>;
};

export type TenderServiceResult<T> =
  | { ok: true; data: T; errors?: never }
  | { ok: false; errors: string[]; data?: never };

export type TenderListData = {
  rows: TenderRow[];
};

export type TenderCreateInput = {
  scope: TenantScope;
  values: TenderCreateValues;
};

export type TenderStatusTransitionInput = {
  scope: TenantScope;
  status: TenderStatus;
  tenderId: string;
};

export type TenderBoqUpdateInput = {
  scope: TenantScope;
  tenderId: string;
  values: TenderBoqUpdateValues;
};

export type TenderSiteConversionInput = {
  scope: TenantScope;
  tenderId: string;
  values: TenderSiteConversionValues;
};

export type TenderService = {
  create(input: TenderCreateInput): Promise<TenderServiceResult<TenderRow>>;
  list(input: { scope: TenantScope }): Promise<TenderServiceResult<TenderListData>>;
  transitionStatus(
    input: TenderStatusTransitionInput,
  ): Promise<TenderServiceResult<TenderRow>>;
  updateBoq(input: TenderBoqUpdateInput): Promise<TenderServiceResult<TenderRow>>;
  convertToSite(
    input: TenderSiteConversionInput,
  ): Promise<TenderServiceResult<TenderRow>>;
};

export type TenderServiceOptions = {
  auditLogRepository?: AuditLogRepository;
  now: () => string;
  repository: TenderRepository;
};

export type TenderSummary = {
  contractTotal: number;
  estimatedValueTotal: number;
  overdueOpenRows: TenderRow[];
  statusCounts: Record<TenderStatus, number>;
  totalCount: number;
  upcomingDeadlineRows: TenderRow[];
  winRate: number;
  wonBidTotal: number;
};

export type TenderDashboardAlerts = {
  currentMonthResultCount: number;
  currentMonthWinRate: number;
  resultWaitingRows: TenderRow[];
  upcomingDeadlineRows: TenderRow[];
};

const openTenderStatuses: TenderStatus[] = ["Takip", "Hazırlanıyor", "Sunuldu"];

const allowedTenderStatusTransitions: Record<TenderStatus, TenderStatus[]> = {
  Hazırlanıyor: ["Sunuldu", "İptal"],
  Kazanıldı: [],
  Kaybedildi: [],
  Sunuldu: ["Kazanıldı", "Kaybedildi", "İptal"],
  Takip: ["Hazırlanıyor", "İptal"],
  İptal: [],
};

const demoTenderRows: TenderRow[] = [
  {
    authorityName: "İstanbul Büyükşehir Belediyesi",
    bidValue: 0,
    contractValue: 0,
    estimatedValue: 1250000,
    id: "tender-demo-1",
    ikn: "2026/123456",
    procedure: "Açık",
    status: "Takip",
    submissionDeadline: "2026-07-03T14:00",
    tenderNo: "IHL-2026-001",
    title: "Kuzey Aksı altyapı yapım işi",
  },
  {
    authorityName: "Ankara İl Milli Eğitim Müdürlüğü",
    bidValue: 2300000,
    contractValue: 0,
    estimatedValue: 2500000,
    id: "tender-demo-2",
    ikn: "2026/654321",
    procedure: "Açık",
    status: "Sunuldu",
    submissionDeadline: "2026-06-28T17:00",
    tenderNo: "IHL-2026-002",
    title: "Okul güçlendirme inşaatı",
  },
  {
    authorityName: "Sağlık Yatırımları Genel Müdürlüğü",
    bidValue: 3900000,
    contractValue: 3850000,
    estimatedValue: 4100000,
    id: "tender-demo-3",
    ikn: "2026/777001",
    procedure: "Pazarlık",
    status: "Kazanıldı",
    submissionDeadline: "2026-06-20T10:00",
    tenderNo: "IHL-2026-003",
    title: "Hastane ek bina yapım işi",
  },
  {
    authorityName: "İzmir Su ve Kanalizasyon İdaresi",
    bidValue: 880000,
    contractValue: 0,
    estimatedValue: 900000,
    id: "tender-demo-4",
    ikn: "2026/334455",
    procedure: "Kapalı",
    status: "Kaybedildi",
    submissionDeadline: "2026-06-15T10:00",
    tenderNo: "IHL-2026-004",
    title: "Atık su terfi merkezi yenileme işi",
  },
];

export function listTenderRows(): TenderRow[] {
  return demoTenderRows.map((row) => ({ ...row }));
}

export function createTenderService({
  auditLogRepository,
  now,
  repository,
}: TenderServiceOptions): TenderService {
  async function resolveRows(scope: TenantScope) {
    const errors = validateTenantScope(scope);

    if (errors.length > 0) {
      return { ok: false as const, errors };
    }

    return { ok: true as const, rows: await repository.list({ scope }) };
  }

  return {
    async list({ scope }) {
      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      return {
        ok: true,
        data: {
          rows: resolved.rows,
        },
      };
    },

    async create({ scope, values }) {
      const permissionErrors = validateTenderMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const draft = normalizeTenderCreateValues(values);
      const errors = validateTenderCreateDraft(draft);
      const duplicateTenderNo = draft.tenderNo
        ? resolved.rows.find((row) => row.tenderNo === draft.tenderNo)
        : undefined;

      if (duplicateTenderNo) {
        errors.push(
          `İhale no bu dönem için zaten kullanılıyor: ${draft.tenderNo}`,
        );
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const createdAt = now();
      const draftFields = omitTenderCreateBoqLines(draft);
      const tenderNo =
        draft.tenderNo ||
        `IHL-TASLAK-${String(resolved.rows.length + 1).padStart(4, "0")}`;
      const row: TenderRow = {
        ...draftFields,
        ...buildTenderBoqSummary(draft),
        contractValue: 0,
        id: createTenderId(scope, tenderNo),
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        ikn: draft.ikn ?? "",
        status: "Hazırlanıyor",
        submissionDeadline: draft.submissionDeadline || createdAt.slice(0, 16),
        tenderNo,
        createdBy: scope.userId,
        updatedBy: scope.userId,
        createdAt,
        updatedAt: createdAt,
      };

      const created = await repository.create(row);
      await recordTenderAudit(auditLogRepository, {
        occurredAt: created.updatedAt ?? createdAt,
        row: created,
        scope,
        statusTo: "Hazırlanıyor",
      });

      return {
        ok: true,
        data: created,
      };
    },

    async transitionStatus({ scope, status, tenderId }) {
      const permissionErrors = validateTenderMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === tenderId);

      if (!existing) {
        return { ok: false, errors: ["İhale kaydı bulunamadı."] };
      }

      if (existing.status === status) {
        return { ok: true, data: existing };
      }

      if (!getNextTenderStatuses(existing.status).includes(status)) {
        return {
          ok: false,
          errors: [
            `İhale durumu ${existing.status} durumundan ${status} durumuna geçirilemez.`,
          ],
        };
      }

      const updated = await repository.update({
        ...existing,
        status,
        updatedAt: now(),
        updatedBy: scope.userId,
      });

      await recordTenderAudit(auditLogRepository, {
        action: "tender.status.transition",
        occurredAt: updated.updatedAt ?? now(),
        row: updated,
        scope,
        statusFrom: existing.status,
        statusTo: updated.status,
      });

      return {
        ok: true,
        data: updated,
      };
    },

    async convertToSite({ scope, tenderId, values }) {
      const permissionErrors = validateTenderMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === tenderId);

      if (!existing) {
        return { ok: false, errors: ["İhale kaydı bulunamadı."] };
      }

      if (existing.status !== "Kazanıldı") {
        return {
          ok: false,
          errors: ["Yalnız kazanılmış ihaleden şantiye oluşturulabilir."],
        };
      }

      if (existing.convertedSiteCode) {
        return {
          ok: false,
          errors: ["Bu ihale zaten şantiye kartına bağlanmış."],
        };
      }

      const siteCode = values.siteCode.trim();
      const siteName = values.siteName.trim();
      const validationErrors: string[] = [];

      if (!siteCode) {
        validationErrors.push("Şantiye kodu zorunludur.");
      }

      if (!siteName) {
        validationErrors.push("Şantiye adı zorunludur.");
      }

      if (validationErrors.length > 0) {
        return { ok: false, errors: validationErrors };
      }

      const updated = await repository.update({
        ...existing,
        convertedSiteCode: siteCode,
        convertedSiteName: siteName,
        convertedToSiteAt: now(),
        updatedAt: now(),
        updatedBy: scope.userId,
      });

      await recordTenderAudit(auditLogRepository, {
        action: "tender.site.convert",
        occurredAt: updated.updatedAt ?? now(),
        row: updated,
        scope,
        statusTo: updated.status,
      });

      return {
        ok: true,
        data: updated,
      };
    },
    async updateBoq({ scope, tenderId, values }) {
      const permissionErrors = validateTenderMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === tenderId);

      if (!existing) {
        return { ok: false, errors: ["İhale kaydı bulunamadı."] };
      }

      const bidValue =
        values.bidValue !== undefined &&
        Number.isFinite(values.bidValue) &&
        values.bidValue >= 0
          ? Number(values.bidValue)
          : existing.bidValue;
      const updated = await repository.update({
        ...existing,
        bidValue,
        ...buildTenderBoqSummary({
          bidValue,
          boqLines: values.boqLines,
          overheadRate: existing.overheadRate,
          profitMargin: existing.profitMargin,
        }),
        updatedAt: now(),
        updatedBy: scope.userId,
      });

      await recordTenderAudit(auditLogRepository, {
        action: "tender.boq.update",
        occurredAt: updated.updatedAt ?? now(),
        previousBidValue: existing.bidValue,
        row: updated,
        scope,
        statusTo: updated.status,
      });

      return {
        ok: true,
        data: updated,
      };
    },
  };
}

export function canMutateTenders(scope: TenantScope) {
  return scope.userRole === "admin" || scope.userRole === "accounting";
}

export function getNextTenderStatuses(status: TenderStatus): TenderStatus[] {
  return [...allowedTenderStatusTransitions[status]];
}

export function createSeededTenderMemoryRepository(): TenderRepository {
  const store = new Map<string, TenderRow[]>();

  return {
    async create(row) {
      const key = `${row.tenantId ?? ""}::${row.companyId ?? ""}::${
        row.periodId ?? ""
      }`;
      const rows = store.get(key) ?? [];
      const persisted = { ...row };

      store.set(key, [persisted, ...rows]);

      return persisted;
    },
    async list({ scope }) {
      return (store.get(buildTenantScopeKey(scope)) ?? []).map((row) => ({
        ...row,
      }));
    },
    async update(row) {
      const key = `${row.tenantId ?? ""}::${row.companyId ?? ""}::${
        row.periodId ?? ""
      }`;
      const rows = store.get(key) ?? [];
      const persisted = { ...row };

      store.set(
        key,
        rows.map((currentRow) =>
          currentRow.id === persisted.id ? persisted : currentRow,
        ),
      );

      return persisted;
    },
  };
}

export function createTenderDraftFromValues(
  values: TenderDraftFormValues,
  sequence: number,
): TenderRow {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Başlık zorunludur");
  }

  return {
    authorityName: values.authorityName.trim(),
    bidValue: parseTenderNumber(values.bidValue),
    ...buildTenderBoqSummary({
      bidValue: parseTenderNumber(values.bidValue),
      boqLines: values.boqLines.map(tenderBoqLineFormToValues),
      overheadRate: parseTenderNumber(values.overheadRate),
      profitMargin: parseTenderNumber(values.profitMargin),
    }),
    city: values.city.trim(),
    contractSignDate: values.contractSignDate,
    contractValue: 0,
    currency: values.currency,
    description: values.description.trim(),
    estimatedValue: parseTenderNumber(values.estimatedValue),
    id: `tender-draft-${sequence}`,
    ikn: values.ikn.trim(),
    noticeDate: values.noticeDate,
    overheadRate: parseTenderNumber(values.overheadRate),
    profitMargin: parseTenderNumber(values.profitMargin),
    procedure: values.procedure,
    questionAnswerDeadline: values.questionAnswerDeadline,
    sessionDate: values.sessionDate,
    specPurchaseDeadline: values.specPurchaseDeadline,
    status: "Hazırlanıyor",
    submissionDeadline: values.submissionDeadline || new Date().toISOString(),
    tenderNo: values.tenderNo.trim() || `IHL-TASLAK-${sequence}`,
    thresholdValue: parseTenderNumber(values.thresholdValue),
    title,
  };
}

export function calculateTenderBoqSimulation({
  lines,
  manualBidValue,
  overheadRate,
  profitMargin,
}: TenderBoqSimulationInput): TenderBoqSimulation {
  const calculatedLines = lines.map((line) => {
    const quantity = normalizeTenderQuantity(line.quantity);
    const unitCost = roundMoney(
      line.materialCost +
        line.laborCost +
        line.equipmentCost +
        line.subcontractorCost +
        line.shippingCost,
    );

    return {
      ...line,
      quantity,
      lineBidTotal: roundMoney(quantity * line.unitBid),
      lineCostTotal: roundMoney(quantity * unitCost),
      unitCost,
    };
  });
  const totalCost = roundMoney(
    sumBy(calculatedLines, (line) => line.lineCostTotal),
  );
  const boqBidTotal = roundMoney(
    sumBy(calculatedLines, (line) => line.lineBidTotal),
  );
  const suggestedOffer = roundMoney(
    totalCost *
      (1 + normalizeTenderRate(overheadRate) / 100) *
      (1 + normalizeTenderRate(profitMargin) / 100),
  );
  const normalizedManualBidValue =
    Number.isFinite(manualBidValue) && Number(manualBidValue) > 0
      ? Number(manualBidValue)
      : 0;
  const usedOffer = roundMoney(
    normalizedManualBidValue > 0 ? normalizedManualBidValue : boqBidTotal,
  );
  const profitAmount = roundMoney(usedOffer - totalCost);
  const profitRate =
    usedOffer > 0 ? roundMoney((profitAmount / usedOffer) * 100) : 0;

  return {
    boqBidTotal,
    lineCount: calculatedLines.length,
    lines: calculatedLines,
    profitAmount,
    profitRate,
    suggestedOffer,
    totalCost,
    usedOffer,
  };
}

export function buildTenderBoqSummary({
  bidValue,
  boqLines,
  overheadRate,
  profitMargin,
}: Pick<
  TenderCreateValues,
  "bidValue" | "boqLines" | "overheadRate" | "profitMargin"
>): Pick<
  TenderRow,
  | "boqBidTotal"
  | "boqLineCount"
  | "boqLines"
  | "profitAmount"
  | "profitRate"
  | "suggestedOffer"
  | "totalCost"
> {
  const simulation = calculateTenderBoqSimulation({
    lines: normalizeTenderBoqLines(boqLines ?? []),
    manualBidValue: bidValue,
    overheadRate,
    profitMargin,
  });

  return {
    boqBidTotal: simulation.boqBidTotal,
    boqLineCount: simulation.lineCount,
    boqLines: simulation.lines.map((line, index) => ({
      ...line,
      lineNo: index + 1,
    })),
    profitAmount: simulation.profitAmount,
    profitRate: simulation.profitRate,
    suggestedOffer: simulation.suggestedOffer,
    totalCost: simulation.totalCost,
  };
}

export function summarizeTenders(
  rows: TenderRow[],
  today = new Date().toISOString(),
): TenderSummary {
  const statusCounts = TENDER_STATUSES.reduce(
    (counts, status) => ({ ...counts, [status]: 0 }),
    {} as Record<TenderStatus, number>,
  );

  for (const row of rows) {
    statusCounts[row.status] += 1;
  }

  const wonRows = rows.filter((row) => row.status === "Kazanıldı");
  const totalCount = rows.length;
  const upcomingDeadlineRows = rows
    .filter((row) => isTenderDeadlineUpcoming(row, today))
    .sort(compareTenderDeadline);
  const overdueOpenRows = rows
    .filter((row) => isTenderDeadlineOverdue(row, today))
    .sort(compareTenderDeadline);

  return {
    contractTotal: sumBy(wonRows, (row) => row.contractValue),
    estimatedValueTotal: sumBy(rows, (row) => row.estimatedValue),
    overdueOpenRows,
    statusCounts,
    totalCount,
    upcomingDeadlineRows,
    winRate: totalCount > 0 ? Math.round((wonRows.length / totalCount) * 100) : 0,
    wonBidTotal: sumBy(wonRows, (row) => row.bidValue),
  };
}

export function summarizeTenderDashboardAlerts(
  rows: TenderRow[],
  today = new Date().toISOString(),
): TenderDashboardAlerts {
  const summary = summarizeTenders(rows, today);
  const currentMonthKey = today.slice(0, 7);
  const currentMonthResultRows = rows.filter(
    (row) =>
      (row.status === "Kazanıldı" || row.status === "Kaybedildi") &&
      row.submissionDeadline.slice(0, 7) === currentMonthKey,
  );
  const currentMonthWonRows = currentMonthResultRows.filter(
    (row) => row.status === "Kazanıldı",
  );

  return {
    currentMonthResultCount: currentMonthResultRows.length,
    currentMonthWinRate:
      currentMonthResultRows.length > 0
        ? Math.round(
            (currentMonthWonRows.length / currentMonthResultRows.length) * 100,
          )
        : 0,
    resultWaitingRows: summary.overdueOpenRows.filter(
      (row) => row.status === "Sunuldu",
    ),
    upcomingDeadlineRows: summary.upcomingDeadlineRows,
  };
}
export function isTenderDeadlineOverdue(
  row: TenderRow,
  today = new Date().toISOString(),
) {
  return (
    openTenderStatuses.includes(row.status) &&
    new Date(row.submissionDeadline).getTime() < new Date(today).getTime()
  );
}

export function isTenderDeadlineUpcoming(
  row: TenderRow,
  today = new Date().toISOString(),
) {
  if (!openTenderStatuses.includes(row.status)) {
    return false;
  }

  const todayTime = new Date(today).getTime();
  const deadlineTime = new Date(row.submissionDeadline).getTime();
  const dayInMilliseconds = 24 * 60 * 60 * 1000;

  return (
    deadlineTime >= todayTime &&
    deadlineTime - todayTime <= 7 * dayInMilliseconds
  );
}

function compareTenderDeadline(first: TenderRow, second: TenderRow) {
  return (
    new Date(first.submissionDeadline).getTime() -
    new Date(second.submissionDeadline).getTime()
  );
}

function sumBy<Row>(rows: Row[], selector: (row: Row) => number) {
  return rows.reduce((total, row) => total + selector(row), 0);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeTenderQuantity(value: number) {
  return Number.isFinite(value) && value > 0 ? Number(value) : 0;
}

function normalizeTenderMoney(value: number) {
  return Number.isFinite(value) && value > 0 ? Number(value) : 0;
}

function parseTenderNumber(value: string) {
  const normalizedValue = value.trim().replace(",", ".");
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function validateTenderMutationPermission(scope: TenantScope) {
  return canMutateTenders(scope)
    ? []
    : ["İhale işlemi için muhasebe veya admin yetkisi gereklidir."];
}

function normalizeTenderCreateValues(
  values: TenderCreateValues,
): TenderCreateValues {
  return {
    authorityName: values.authorityName.trim(),
    bidValue: Number(values.bidValue ?? 0),
    boqLines: normalizeTenderBoqLines(values.boqLines ?? []),
    city: values.city?.trim() ?? "",
    contractSignDate: values.contractSignDate?.trim() ?? "",
    currency: values.currency,
    description: values.description?.trim() ?? "",
    estimatedValue: Number(values.estimatedValue ?? 0),
    ikn: values.ikn?.trim() ?? "",
    noticeDate: values.noticeDate?.trim() ?? "",
    overheadRate: normalizeTenderRate(values.overheadRate),
    profitMargin: normalizeTenderRate(values.profitMargin),
    procedure: values.procedure,
    questionAnswerDeadline: values.questionAnswerDeadline?.trim() ?? "",
    sessionDate: values.sessionDate?.trim() ?? "",
    specPurchaseDeadline: values.specPurchaseDeadline?.trim() ?? "",
    submissionDeadline: values.submissionDeadline?.trim() ?? "",
    tenderNo: values.tenderNo?.trim() ?? "",
    thresholdValue: Number(values.thresholdValue ?? 0),
    title: values.title.trim(),
  };
}

function omitTenderCreateBoqLines(
  values: TenderCreateValues,
): Omit<TenderCreateValues, "boqLines"> {
  const { boqLines, ...fields } = values;

  void boqLines;

  return fields;
}

function tenderBoqLineFormToValues(
  line: TenderBoqLineFormValues,
): TenderBoqLineValues {
  return {
    description: line.description.trim(),
    equipmentCost: parseTenderNumber(line.equipmentCost),
    laborCost: parseTenderNumber(line.laborCost),
    materialCost: parseTenderNumber(line.materialCost),
    pozNo: line.pozNo.trim(),
    quantity: parseTenderNumber(line.quantity),
    shippingCost: parseTenderNumber(line.shippingCost),
    subcontractorCost: parseTenderNumber(line.subcontractorCost),
    unit: line.unit.trim(),
    unitBid: parseTenderNumber(line.unitBid),
  };
}

function normalizeTenderBoqLines(lines: TenderBoqLineValues[]) {
  return lines
    .map((line) => ({
      description: line.description.trim(),
      equipmentCost: normalizeTenderMoney(line.equipmentCost),
      laborCost: normalizeTenderMoney(line.laborCost),
      materialCost: normalizeTenderMoney(line.materialCost),
      pozNo: line.pozNo.trim(),
      quantity: normalizeTenderQuantity(line.quantity),
      shippingCost: normalizeTenderMoney(line.shippingCost),
      subcontractorCost: normalizeTenderMoney(line.subcontractorCost),
      unit: line.unit.trim(),
      unitBid: normalizeTenderMoney(line.unitBid),
    }))
    .filter(
      (line) =>
        line.pozNo ||
        line.description ||
        line.unit ||
        line.quantity > 0 ||
        line.unitBid > 0 ||
        line.materialCost > 0 ||
        line.laborCost > 0 ||
        line.equipmentCost > 0 ||
        line.subcontractorCost > 0 ||
        line.shippingCost > 0,
    );
}

function validateTenderCreateDraft(draft: TenderCreateValues) {
  const errors: string[] = [];

  if (!draft.title) {
    errors.push("Başlık zorunludur");
  }

  if (draft.submissionDeadline && !isDateTimeLike(draft.submissionDeadline)) {
    errors.push("Son teklif tarihi geçerli olmalıdır.");
  }

  if (!Number.isFinite(draft.estimatedValue) || draft.estimatedValue < 0) {
    errors.push("İdare yaklaşık maliyeti negatif olamaz.");
  }

  if (!Number.isFinite(draft.bidValue) || draft.bidValue < 0) {
    errors.push("Bizim teklif bedeli negatif olamaz.");
  }

  return errors;
}

type TenderAuditInput = {
  action?:
    | "tender.boq.update"
    | "tender.create"
    | "tender.site.convert"
    | "tender.status.transition";
  occurredAt: string;
  previousBidValue?: number;
  row: TenderRow;
  scope: TenantScope;
  statusFrom?: TenderStatus;
  statusTo: TenderStatus;
};

async function recordTenderAudit(
  auditLogRepository: AuditLogRepository | undefined,
  input: TenderAuditInput,
) {
  if (!auditLogRepository) {
    return;
  }

  await auditLogRepository.record(
    createAuditLogEntry(input.scope, {
      action: input.action ?? "tender.create",
      entityType: "tender",
      entityId: input.row.id,
      entityLabel: input.row.tenderNo,
      occurredAt: input.occurredAt,
      metadata: {
        authorityName: input.row.authorityName,
        bidValue: input.row.bidValue,
        boqBidTotal: input.row.boqBidTotal ?? 0,
        boqLineCount: input.row.boqLineCount ?? 0,
        estimatedValue: input.row.estimatedValue,
        ikn: input.row.ikn,
        convertedSiteCode: input.row.convertedSiteCode ?? "",
        convertedSiteName: input.row.convertedSiteName ?? "",
        convertedToSiteAt: input.row.convertedToSiteAt ?? "",
        previousBidValue: input.previousBidValue,
        profitAmount: input.row.profitAmount ?? 0,
        profitRate: input.row.profitRate ?? 0,
        statusFrom: input.statusFrom,
        statusTo: input.statusTo,
        tenderNo: input.row.tenderNo,
        totalCost: input.row.totalCost ?? 0,
      },
    }),
  );
}

function createTenderId(scope: TenantScope, tenderNo: string) {
  return `${buildTenantScopeKey(scope)}::tender::${normalizeIdentifier(tenderNo)}`;
}

function normalizeIdentifier(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeTenderRate(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Number(value);
}

function isDateTimeLike(value: string) {
  return !Number.isNaN(Date.parse(value));
}

