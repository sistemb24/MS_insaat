import type { PrismaClient } from "@prisma/client";

import {
  normalizeEmployeeAdvanceStatus,
  type EmployeeAdvanceStatus,
} from "./employee-advance";
import type { TenantScope } from "./tenant-scope";

type ScopeFields = { companyId: string; periodId: string; tenantId: string };
type DateLike = Date | string;
type DecimalLike = { toNumber(): number } | number | string;

export type EmployeeAdvanceRow = ScopeFields & {
  approvedAmount: number | null;
  cancelRequestKey: string | null;
  cancelledAt: string | null;
  createRequestKey: string;
  createdAt: string;
  createdBy: string;
  financeApproveRequestKey: string | null;
  financeApprovedAt: string | null;
  financeRejectRequestKey: string | null;
  financeRejectedAt: string | null;
  id: string;
  lastUpdateKey: string | null;
  managerApproveRequestKey: string | null;
  managerApprovedAt: string | null;
  managerRejectRequestKey: string | null;
  managerRejectedAt: string | null;
  note: string;
  paidAt: string | null;
  paymentAccountCode: string | null;
  paymentAccountName: string | null;
  paymentDate: string | null;
  paymentLedgerEntryId: string | null;
  paymentMovementId: string | null;
  paymentRequestKey: string | null;
  personnelCode: string;
  personnelName: string;
  requestDate: string;
  requestedAmount: number;
  revisionNo: number;
  settledAmount: number;
  status: EmployeeAdvanceStatus;
  submitRequestKey: string | null;
  submittedAt: string | null;
  updatedAt: string;
  updatedBy: string;
};

export type EmployeeAdvanceSettlementRow = ScopeFields & {
  advanceId: string;
  amount: number;
  createdAt: string;
  createdBy: string;
  id: string;
  mutationRequestKey: string;
  payrollAccrualId: string;
  payrollLinePersonCode: string;
  settlementDate: string;
};

export type PayrollAdvanceDeductionRow = {
  allocatedAmount: number;
  availableAmount: number;
  documentNo: string;
  payrollAccrualId: string;
  personnelCode: string;
  personnelName: string;
};

export type EmployeeAdvancePaymentCommitInput = {
  expectedRevisionNo: number;
  movementDocumentNo: string;
  movementId: string;
  ledgerDocumentNo: string;
  ledgerEntryId: string;
  row: EmployeeAdvanceRow;
};

export type EmployeeAdvanceRepository = {
  create(row: EmployeeAdvanceRow): Promise<EmployeeAdvanceRow>;
  findByCreateKey(input: {
    createRequestKey: string;
    scope: TenantScope;
  }): Promise<EmployeeAdvanceRow | null>;
  findById(input: {
    id: string;
    scope: TenantScope;
  }): Promise<EmployeeAdvanceRow | null>;
  findSettlementByKey(input: {
    mutationRequestKey: string;
    scope: TenantScope;
  }): Promise<EmployeeAdvanceSettlementRow | null>;
  list(input: { scope: TenantScope }): Promise<{
    advances: EmployeeAdvanceRow[];
    settlements: EmployeeAdvanceSettlementRow[];
  }>;
  listPayrollDeductions(input: {
    personnelCode?: string;
    scope: TenantScope;
  }): Promise<PayrollAdvanceDeductionRow[]>;
  pay(input: EmployeeAdvancePaymentCommitInput): Promise<EmployeeAdvanceRow>;
  settle(input: {
    expectedRevisionNo: number;
    row: EmployeeAdvanceRow;
    settlement: EmployeeAdvanceSettlementRow;
  }): Promise<{
    advance: EmployeeAdvanceRow;
    settlement: EmployeeAdvanceSettlementRow;
  }>;
  transition(input: {
    expectedRevisionNo: number;
    fromStatus: EmployeeAdvanceStatus;
    row: EmployeeAdvanceRow;
  }): Promise<EmployeeAdvanceRow>;
  updateDraft(input: {
    expectedRevisionNo: number;
    row: EmployeeAdvanceRow;
  }): Promise<EmployeeAdvanceRow>;
};

export class EmployeeAdvanceRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmployeeAdvanceRepositoryError";
  }
}

export function createEmployeeAdvancePrismaRepository(
  prisma: PrismaClient,
): EmployeeAdvanceRepository {
  return {
    async create(row) {
      const created = await prisma.employeeAdvanceRequest.create({
        data: advanceCreateData(row),
      });
      return fromAdvanceRecord(created);
    },

    async findByCreateKey({ createRequestKey, scope }) {
      const record = await prisma.employeeAdvanceRequest.findFirst({
        where: { ...scopeFields(scope), createRequestKey },
      });
      return record ? fromAdvanceRecord(record) : null;
    },

    async findById({ id, scope }) {
      const record = await prisma.employeeAdvanceRequest.findFirst({
        where: { ...scopeFields(scope), id },
      });
      return record ? fromAdvanceRecord(record) : null;
    },

    async findSettlementByKey({ mutationRequestKey, scope }) {
      const record = await prisma.employeeAdvanceSettlement.findFirst({
        where: { ...scopeFields(scope), mutationRequestKey },
      });
      return record ? fromSettlementRecord(record) : null;
    },

    async list({ scope }) {
      const [advances, settlements] = await Promise.all([
        prisma.employeeAdvanceRequest.findMany({
          orderBy: [{ requestDate: "desc" }, { createdAt: "desc" }, { id: "asc" }],
          where: scopeFields(scope),
        }),
        prisma.employeeAdvanceSettlement.findMany({
          orderBy: [{ settlementDate: "desc" }, { createdAt: "desc" }, { id: "asc" }],
          where: scopeFields(scope),
        }),
      ]);
      return {
        advances: advances.map(fromAdvanceRecord),
        settlements: settlements.map(fromSettlementRecord),
      };
    },

    async listPayrollDeductions({ personnelCode, scope }) {
      const rows = await prisma.payrollAccrual.findMany({
        include: { lines: true },
        orderBy: [{ year: "desc" }, { month: "desc" }, { documentNo: "asc" }],
        where: {
          ...scopeFields(scope),
          status: "Kaydedildi",
        },
      });
      const settlements = await prisma.employeeAdvanceSettlement.groupBy({
        _sum: { amount: true },
        by: ["payrollAccrualId", "payrollLinePersonCode"],
        where: {
          ...scopeFields(scope),
          ...(personnelCode ? { payrollLinePersonCode: personnelCode } : {}),
        },
      });
      const allocated = new Map(
        settlements.map((row) => [
          `${row.payrollAccrualId}::${row.payrollLinePersonCode}`,
          decimal(row._sum.amount ?? 0),
        ]),
      );
      return rows.flatMap((payroll) =>
        payroll.lines
          .filter((line) =>
            decimal(line.advanceDeduction) > 0
            && (!personnelCode || line.personCode === personnelCode),
          )
          .map((line) => {
            const allocatedAmount =
              allocated.get(`${payroll.id}::${line.personCode}`) ?? 0;
            return {
              allocatedAmount,
              availableAmount: roundMoney(
                decimal(line.advanceDeduction) - allocatedAmount,
              ),
              documentNo: payroll.documentNo,
              payrollAccrualId: payroll.id,
              personnelCode: line.personCode,
              personnelName: line.personName,
            };
          }),
      );
    },

    async transition({ expectedRevisionNo, fromStatus, row }) {
      await updateAdvance(prisma, { expectedRevisionNo, fromStatus, row });
      return readAdvance(prisma, row);
    },

    async updateDraft({ expectedRevisionNo, row }) {
      await updateAdvance(prisma, {
        expectedRevisionNo,
        fromStatus: "DRAFT",
        row,
      });
      return readAdvance(prisma, row);
    },

    async pay(input) {
      return prisma.$transaction(async (tx) => {
        const existingMovement = await tx.cashBankMovement.findFirst({
          where: {
            ...scopeFields(input.row),
            sourceId: input.row.id,
            sourceType: "employee-advance",
          },
        });
        const existingLedger = await tx.ledgerEntry.findFirst({
          where: {
            ...scopeFields(input.row),
            sourceId: input.row.id,
            sourceType: "employee-advance",
          },
        });
        const movement = existingMovement ?? await tx.cashBankMovement.create({
          data: {
            accountCode: required(input.row.paymentAccountCode, "Ödeme hesap kodu"),
            accountName: required(input.row.paymentAccountName, "Ödeme hesap adı"),
            amount: requiredAmount(input.row.approvedAmount),
            companyId: input.row.companyId,
            counterpartyName: input.row.personnelName,
            createdAt: dateTime(input.row.updatedAt),
            createdBy: input.row.updatedBy,
            currency: "TL",
            description: "Personel avans ödemesi",
            direction: "Çıkış",
            documentNo: input.movementDocumentNo,
            id: input.movementId,
            movementDate: dateOnly(required(input.row.paymentDate, "Ödeme tarihi")),
            movementType: "Avans Ödemesi",
            periodId: input.row.periodId,
            sourceId: input.row.id,
            sourceLabel: `${input.row.personnelName} personel avansı`,
            sourceType: "employee-advance",
            tenantId: input.row.tenantId,
            updatedAt: dateTime(input.row.updatedAt),
            updatedBy: input.row.updatedBy,
          },
        });
        const ledger = existingLedger ?? await tx.ledgerEntry.create({
          data: {
            companyId: input.row.companyId,
            creditTotal: requiredAmount(input.row.approvedAmount),
            createdAt: dateTime(input.row.updatedAt),
            createdBy: input.row.updatedBy,
            currency: "TL",
            debitTotal: requiredAmount(input.row.approvedAmount),
            description: `${input.row.personnelName} personel avans ödemesi`,
            documentNo: input.ledgerDocumentNo,
            entryDate: dateOnly(required(input.row.paymentDate, "Ödeme tarihi")),
            id: input.ledgerEntryId,
            lines: {
              create: [
                {
                  accountCode: "135",
                  accountName: "Personel Avansları",
                  companyId: input.row.companyId,
                  credit: 0,
                  debit: requiredAmount(input.row.approvedAmount),
                  description: "Personel avans alacağı",
                  id: `${input.ledgerEntryId}::line-1`,
                  lineNo: 1,
                  periodId: input.row.periodId,
                  tenantId: input.row.tenantId,
                },
                {
                  accountCode: required(
                    input.row.paymentAccountCode,
                    "Ödeme hesap kodu",
                  ),
                  accountName: required(
                    input.row.paymentAccountName,
                    "Ödeme hesap adı",
                  ),
                  companyId: input.row.companyId,
                  credit: requiredAmount(input.row.approvedAmount),
                  debit: 0,
                  description: "Personel avans ödemesi",
                  id: `${input.ledgerEntryId}::line-2`,
                  lineNo: 2,
                  periodId: input.row.periodId,
                  tenantId: input.row.tenantId,
                },
              ],
            },
            periodId: input.row.periodId,
            sourceId: input.row.id,
            sourceType: "employee-advance",
            status: "posted",
            tenantId: input.row.tenantId,
            updatedAt: dateTime(input.row.updatedAt),
            updatedBy: input.row.updatedBy,
          },
        });
        const row = {
          ...input.row,
          paymentLedgerEntryId: ledger.id,
          paymentMovementId: movement.id,
        };
        await updateAdvance(tx as unknown as PrismaClient, {
          expectedRevisionNo: input.expectedRevisionNo,
          fromStatus: "FINANCE_APPROVED",
          row,
        });
        return readAdvance(tx as unknown as PrismaClient, row);
      });
    },

    async settle({ expectedRevisionNo, row, settlement }) {
      return prisma.$transaction(async (tx) => {
        const created = await tx.employeeAdvanceSettlement.create({
          data: settlementCreateData(settlement),
        });
        await updateAdvance(tx as unknown as PrismaClient, {
          expectedRevisionNo,
          fromStatus: "PAID",
          row,
        });
        return {
          advance: await readAdvance(tx as unknown as PrismaClient, row),
          settlement: fromSettlementRecord(created),
        };
      });
    },
  };
}

async function updateAdvance(
  client: PrismaClient,
  input: {
    expectedRevisionNo: number;
    fromStatus: EmployeeAdvanceStatus;
    row: EmployeeAdvanceRow;
  },
) {
  const result = await client.employeeAdvanceRequest.updateMany({
    data: advanceMutableData(input.row),
    where: {
      ...scopeFields(input.row),
      id: input.row.id,
      revisionNo: input.expectedRevisionNo,
      status: input.fromStatus,
    },
  });
  if (result.count !== 1) {
    throw new EmployeeAdvanceRepositoryError(
      "Avans kaydı aktif kapsamda, beklenen durumda veya revizyonda bulunamadı.",
    );
  }
}

async function readAdvance(client: PrismaClient, row: EmployeeAdvanceRow) {
  const record = await client.employeeAdvanceRequest.findFirst({
    where: { ...scopeFields(row), id: row.id },
  });
  if (!record) {
    throw new EmployeeAdvanceRepositoryError("Güncellenen avans kaydı okunamadı.");
  }
  return fromAdvanceRecord(record);
}

function advanceCreateData(row: EmployeeAdvanceRow) {
  return {
    ...scopeFields(row),
    ...advanceMutableData(row),
    createRequestKey: row.createRequestKey,
    createdAt: dateTime(row.createdAt),
    createdBy: row.createdBy,
    id: row.id,
  };
}

function advanceMutableData(row: EmployeeAdvanceRow) {
  return {
    approvedAmount: row.approvedAmount,
    cancelRequestKey: row.cancelRequestKey,
    cancelledAt: nullableDateTime(row.cancelledAt),
    financeApproveRequestKey: row.financeApproveRequestKey,
    financeApprovedAt: nullableDateTime(row.financeApprovedAt),
    financeRejectRequestKey: row.financeRejectRequestKey,
    financeRejectedAt: nullableDateTime(row.financeRejectedAt),
    lastUpdateKey: row.lastUpdateKey,
    managerApproveRequestKey: row.managerApproveRequestKey,
    managerApprovedAt: nullableDateTime(row.managerApprovedAt),
    managerRejectRequestKey: row.managerRejectRequestKey,
    managerRejectedAt: nullableDateTime(row.managerRejectedAt),
    note: row.note,
    paidAt: nullableDateTime(row.paidAt),
    paymentAccountCode: row.paymentAccountCode,
    paymentAccountName: row.paymentAccountName,
    paymentDate: row.paymentDate ? dateOnly(row.paymentDate) : null,
    paymentLedgerEntryId: row.paymentLedgerEntryId,
    paymentMovementId: row.paymentMovementId,
    paymentRequestKey: row.paymentRequestKey,
    personnelCode: row.personnelCode,
    personnelName: row.personnelName,
    requestDate: dateOnly(row.requestDate),
    requestedAmount: row.requestedAmount,
    revisionNo: row.revisionNo,
    settledAmount: row.settledAmount,
    status: row.status,
    submitRequestKey: row.submitRequestKey,
    submittedAt: nullableDateTime(row.submittedAt),
    updatedAt: dateTime(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function settlementCreateData(row: EmployeeAdvanceSettlementRow) {
  return {
    ...scopeFields(row),
    advanceId: row.advanceId,
    amount: row.amount,
    createdAt: dateTime(row.createdAt),
    createdBy: row.createdBy,
    id: row.id,
    mutationRequestKey: row.mutationRequestKey,
    payrollAccrualId: row.payrollAccrualId,
    payrollLinePersonCode: row.payrollLinePersonCode,
    settlementDate: dateOnly(row.settlementDate),
  };
}

function fromAdvanceRecord(row: {
  approvedAmount: DecimalLike | null;
  cancelRequestKey: string | null;
  cancelledAt: DateLike | null;
  companyId: string;
  createRequestKey: string;
  createdAt: DateLike;
  createdBy: string;
  financeApproveRequestKey: string | null;
  financeApprovedAt: DateLike | null;
  financeRejectRequestKey: string | null;
  financeRejectedAt: DateLike | null;
  id: string;
  lastUpdateKey: string | null;
  managerApproveRequestKey: string | null;
  managerApprovedAt: DateLike | null;
  managerRejectRequestKey: string | null;
  managerRejectedAt: DateLike | null;
  note: string;
  paidAt: DateLike | null;
  paymentAccountCode: string | null;
  paymentAccountName: string | null;
  paymentDate: DateLike | null;
  paymentLedgerEntryId: string | null;
  paymentMovementId: string | null;
  paymentRequestKey: string | null;
  periodId: string;
  personnelCode: string;
  personnelName: string;
  requestDate: DateLike;
  requestedAmount: DecimalLike;
  revisionNo: number;
  settledAmount: DecimalLike;
  status: string;
  submitRequestKey: string | null;
  submittedAt: DateLike | null;
  tenantId: string;
  updatedAt: DateLike;
  updatedBy: string;
}): EmployeeAdvanceRow {
  return {
    ...row,
    approvedAmount: row.approvedAmount === null ? null : decimal(row.approvedAmount),
    cancelledAt: nullableIso(row.cancelledAt),
    createdAt: iso(row.createdAt),
    financeApprovedAt: nullableIso(row.financeApprovedAt),
    financeRejectedAt: nullableIso(row.financeRejectedAt),
    managerApprovedAt: nullableIso(row.managerApprovedAt),
    managerRejectedAt: nullableIso(row.managerRejectedAt),
    paidAt: nullableIso(row.paidAt),
    paymentDate: row.paymentDate ? dateOnlyString(row.paymentDate) : null,
    requestDate: dateOnlyString(row.requestDate),
    requestedAmount: decimal(row.requestedAmount),
    settledAmount: decimal(row.settledAmount),
    status: normalizeEmployeeAdvanceStatus(row.status),
    submittedAt: nullableIso(row.submittedAt),
    updatedAt: iso(row.updatedAt),
  };
}

function fromSettlementRecord(row: {
  advanceId: string;
  amount: DecimalLike;
  companyId: string;
  createdAt: DateLike;
  createdBy: string;
  id: string;
  mutationRequestKey: string;
  payrollAccrualId: string;
  payrollLinePersonCode: string;
  periodId: string;
  settlementDate: DateLike;
  tenantId: string;
}): EmployeeAdvanceSettlementRow {
  return {
    ...row,
    amount: decimal(row.amount),
    createdAt: iso(row.createdAt),
    settlementDate: dateOnlyString(row.settlementDate),
  };
}

function scopeFields(scope: ScopeFields) {
  return {
    companyId: scope.companyId,
    periodId: scope.periodId,
    tenantId: scope.tenantId,
  };
}
function required(value: string | null, label: string) {
  if (!value) throw new EmployeeAdvanceRepositoryError(`${label} bulunamadı.`);
  return value;
}
function requiredAmount(value: number | null) {
  if (value === null || value <= 0) {
    throw new EmployeeAdvanceRepositoryError("Onaylı avans tutarı bulunamadı.");
  }
  return value;
}
function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
function dateTime(value: string) {
  return new Date(value);
}
function nullableDateTime(value: string | null) {
  return value ? dateTime(value) : null;
}
function iso(value: DateLike) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
function nullableIso(value: DateLike | null) {
  return value ? iso(value) : null;
}
function dateOnlyString(value: DateLike) {
  return iso(value).slice(0, 10);
}
function decimal(value: DecimalLike) {
  return typeof value === "object" ? value.toNumber() : Number(value);
}
function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
