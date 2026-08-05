import type { TenantUserRole } from "./tenant-scope";

export const EMPLOYEE_ADVANCE_MAX_NOTE_LENGTH = 500;
export const EMPLOYEE_ADVANCE_MAX_REQUEST_KEY_LENGTH = 200;
export const EMPLOYEE_ADVANCE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "MANAGER_APPROVED",
  "FINANCE_APPROVED",
  "PAID",
  "SETTLED",
  "REJECTED",
  "CANCELLED",
] as const;

export type EmployeeAdvanceStatus = (typeof EMPLOYEE_ADVANCE_STATUSES)[number];
export type EmployeeAdvanceOperation =
  | "cancel"
  | "create"
  | "edit"
  | "finance-approve"
  | "finance-reject"
  | "list"
  | "manager-approve"
  | "manager-reject"
  | "pay"
  | "settle"
  | "submit"
  | "view";

export type EmployeeAdvanceDraftInput = {
  note?: string;
  personnelCode: string;
  personnelName: string;
  requestDate: string;
  requestedAmount: number;
  requestKey: string;
};

export class EmployeeAdvanceDomainError extends Error {
  constructor(
    public readonly code:
      | "INVALID_AMOUNT"
      | "INVALID_DATE"
      | "INVALID_INPUT"
      | "INVALID_REVISION"
      | "INVALID_STATUS"
      | "INVALID_TRANSITION"
      | "TEXT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "EmployeeAdvanceDomainError";
  }
}

export function createEmployeeAdvanceDraft(
  input: EmployeeAdvanceDraftInput & { actorUserId: string },
) {
  return {
    approvedAmount: null,
    createRequestKey: getEmployeeAdvanceCreateRequestKey({
      actorUserId: input.actorUserId,
      requestKey: input.requestKey,
    }),
    note: normalizeNote(input.note),
    personnelCode: normalizeIdentifier(input.personnelCode, "Personel kodu"),
    personnelName: normalizeIdentifier(input.personnelName, "Personel adı"),
    requestDate: normalizeDate(input.requestDate, "Talep tarihi"),
    requestedAmount: normalizePositiveAmount(input.requestedAmount, "Talep tutarı"),
    revisionNo: 1 as const,
    status: "DRAFT" as const,
  };
}

export function normalizeEmployeeAdvanceDraftUpdate(
  input: EmployeeAdvanceDraftInput & {
    advanceId: string;
    expectedRevisionNo: number;
  },
) {
  const draft = createEmployeeAdvanceDraft({ ...input, actorUserId: "update" });
  return {
    ...draft,
    advanceId: normalizeIdentifier(input.advanceId, "Avans kaydı"),
    expectedRevisionNo: normalizeRevision(input.expectedRevisionNo),
    mutationRequestKey: normalizeRequestKey(input.requestKey),
  };
}

export function normalizeEmployeeAdvanceApproval(input: {
  advanceId: string;
  approvedAmount: number;
  expectedRevisionNo: number;
  requestedAmount: number;
  requestKey: string;
}) {
  const requestedAmount = normalizePositiveAmount(input.requestedAmount, "Talep tutarı");
  const approvedAmount = normalizePositiveAmount(input.approvedAmount, "Finans onay tutarı");
  if (approvedAmount > requestedAmount) {
    throw new EmployeeAdvanceDomainError(
      "INVALID_AMOUNT",
      "Finans onay tutarı talep tutarını aşamaz.",
    );
  }
  return {
    advanceId: normalizeIdentifier(input.advanceId, "Avans kaydı"),
    approvedAmount,
    expectedRevisionNo: normalizeRevision(input.expectedRevisionNo),
    mutationRequestKey: normalizeRequestKey(input.requestKey),
  };
}

export function normalizeEmployeeAdvancePayment(input: {
  accountCode: string;
  accountName: string;
  advanceId: string;
  expectedRevisionNo: number;
  paymentDate: string;
  requestKey: string;
}) {
  return {
    accountCode: normalizeIdentifier(input.accountCode, "Kasa/banka hesap kodu"),
    accountName: normalizeIdentifier(input.accountName, "Kasa/banka hesap adı"),
    advanceId: normalizeIdentifier(input.advanceId, "Avans kaydı"),
    expectedRevisionNo: normalizeRevision(input.expectedRevisionNo),
    mutationRequestKey: normalizeRequestKey(input.requestKey),
    paymentDate: normalizeDate(input.paymentDate, "Ödeme tarihi"),
  };
}

export function normalizeEmployeeAdvanceSettlement(input: {
  advanceId: string;
  amount: number;
  payrollAccrualId: string;
  payrollLinePersonCode: string;
  requestKey: string;
  settlementDate: string;
}) {
  return {
    advanceId: normalizeIdentifier(input.advanceId, "Avans kaydı"),
    amount: normalizePositiveAmount(input.amount, "Mahsup tutarı"),
    mutationRequestKey: normalizeRequestKey(input.requestKey),
    payrollAccrualId: normalizeIdentifier(input.payrollAccrualId, "Maaş tahakkuku"),
    payrollLinePersonCode: normalizeIdentifier(
      input.payrollLinePersonCode,
      "Bordro personel kodu",
    ),
    settlementDate: normalizeDate(input.settlementDate, "Mahsup tarihi"),
  };
}

export function getEmployeeAdvancePermission(input: {
  operation: EmployeeAdvanceOperation;
  periodClosed: boolean;
  role: TenantUserRole;
}) {
  if (input.operation === "list" || input.operation === "view") {
    return { allowed: true as const };
  }
  if (input.periodClosed) {
    return {
      allowed: false as const,
      reason: "Kapalı dönemde personel avans kaydı değiştirilemez.",
    };
  }
  if (input.operation === "manager-approve" || input.operation === "manager-reject") {
    return input.role === "admin"
      ? { allowed: true as const }
      : {
          allowed: false as const,
          reason: "Yönetici avans kararını yalnız yönetici verebilir.",
        };
  }
  if (
    input.operation === "finance-approve"
    || input.operation === "finance-reject"
    || input.operation === "cancel"
    || input.operation === "pay"
    || input.operation === "settle"
  ) {
    return input.role === "accounting"
      ? { allowed: true as const }
      : {
          allowed: false as const,
          reason: "Bu avans işlemini yalnız muhasebe rolü yapabilir.",
        };
  }
  return input.role === "admin" || input.role === "accounting"
    ? { allowed: true as const }
    : {
        allowed: false as const,
        reason: "Personel avans kaydını yalnız yönetici veya muhasebe düzenleyebilir.",
      };
}

export function assertEmployeeAdvanceTransition(
  from: EmployeeAdvanceStatus,
  to: EmployeeAdvanceStatus,
) {
  const allowed =
    (from === "DRAFT" && to === "SUBMITTED")
    || (from === "SUBMITTED" && (to === "MANAGER_APPROVED" || to === "REJECTED"))
    || (
      from === "MANAGER_APPROVED"
      && (to === "FINANCE_APPROVED" || to === "REJECTED")
    )
    || (from === "FINANCE_APPROVED" && (to === "PAID" || to === "CANCELLED"))
    || (from === "PAID" && to === "SETTLED");
  if (!allowed) {
    throw new EmployeeAdvanceDomainError(
      "INVALID_TRANSITION",
      "Avans kaydı yalnız tanımlı yönetici, finans, ödeme ve mahsup sırasıyla ilerleyebilir.",
    );
  }
  return { from, to };
}

export function calculateEmployeeAdvanceBalance(input: {
  approvedAmount: number;
  settledAmount: number;
}) {
  const approvedAmount = normalizePositiveAmount(input.approvedAmount, "Onay tutarı");
  const settledAmount = normalizeNonNegativeAmount(input.settledAmount, "Mahsup toplamı");
  if (settledAmount > approvedAmount) {
    throw new EmployeeAdvanceDomainError(
      "INVALID_AMOUNT",
      "Mahsup toplamı onaylı avans tutarını aşamaz.",
    );
  }
  return {
    approvedAmount,
    remainingAmount: roundMoney(approvedAmount - settledAmount),
    settledAmount,
  };
}

export function assertEmployeeAdvanceSettlementCapacity(input: {
  advanceRemainingAmount: number;
  amount: number;
  payrollAlreadyAllocated: number;
  payrollDeduction: number;
}) {
  const amount = normalizePositiveAmount(input.amount, "Mahsup tutarı");
  const remaining = normalizeNonNegativeAmount(
    input.advanceRemainingAmount,
    "Avans kalan tutarı",
  );
  const deduction = normalizeNonNegativeAmount(
    input.payrollDeduction,
    "Bordro avans kesintisi",
  );
  const allocated = normalizeNonNegativeAmount(
    input.payrollAlreadyAllocated,
    "Bordro tahsis toplamı",
  );
  if (amount > remaining) {
    throw new EmployeeAdvanceDomainError(
      "INVALID_AMOUNT",
      "Mahsup tutarı avans kalan tutarını aşamaz.",
    );
  }
  if (roundMoney(allocated + amount) > deduction) {
    throw new EmployeeAdvanceDomainError(
      "INVALID_AMOUNT",
      "Bordro avans kesintisinin tahsis edilebilir tutarı yetersizdir.",
    );
  }
  return { amount, remainingAfter: roundMoney(remaining - amount) };
}

export function getEmployeeAdvanceCreateRequestKey(input: {
  actorUserId: string;
  requestKey: string;
}) {
  return joinKey([
    normalizeIdentifier(input.actorUserId, "Aktif kullanıcı"),
    normalizeRequestKey(input.requestKey),
  ]);
}

export function getEmployeeAdvanceMutationRequestKey(input: {
  actorUserId: string;
  advanceId: string;
  operation: Exclude<EmployeeAdvanceOperation, "create" | "list" | "view">;
  requestKey: string;
}) {
  return joinKey([
    normalizeIdentifier(input.advanceId, "Avans kaydı"),
    normalizeIdentifier(input.actorUserId, "Aktif kullanıcı"),
    input.operation,
    normalizeRequestKey(input.requestKey),
  ]);
}

export function normalizeEmployeeAdvanceStatus(value: unknown): EmployeeAdvanceStatus {
  if (
    typeof value === "string"
    && EMPLOYEE_ADVANCE_STATUSES.includes(value as EmployeeAdvanceStatus)
  ) {
    return value as EmployeeAdvanceStatus;
  }
  throw new EmployeeAdvanceDomainError("INVALID_STATUS", "Avans durumu geçersizdir.");
}

function normalizeNote(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (normalized.length > EMPLOYEE_ADVANCE_MAX_NOTE_LENGTH) {
    throw new EmployeeAdvanceDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `Avans açıklaması en fazla ${EMPLOYEE_ADVANCE_MAX_NOTE_LENGTH} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeRequestKey(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new EmployeeAdvanceDomainError("INVALID_INPUT", "İstek anahtarı zorunludur.");
  }
  if (normalized.length > EMPLOYEE_ADVANCE_MAX_REQUEST_KEY_LENGTH) {
    throw new EmployeeAdvanceDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `İstek anahtarı en fazla ${EMPLOYEE_ADVANCE_MAX_REQUEST_KEY_LENGTH} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeIdentifier(value: unknown, label: string) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new EmployeeAdvanceDomainError("INVALID_INPUT", `${label} zorunludur.`);
  }
  return normalized;
}

function normalizeRevision(value: unknown) {
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 1) {
    throw new EmployeeAdvanceDomainError(
      "INVALID_REVISION",
      "Avans revizyonu geçersizdir.",
    );
  }
  return revision;
}

function normalizeDate(value: unknown, label: string) {
  const normalized = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new EmployeeAdvanceDomainError("INVALID_DATE", `${label} geçersizdir.`);
  }
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new EmployeeAdvanceDomainError("INVALID_DATE", `${label} geçersizdir.`);
  }
  return normalized;
}

function normalizePositiveAmount(value: unknown, label: string) {
  const amount = roundMoney(Number(value));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new EmployeeAdvanceDomainError(
      "INVALID_AMOUNT",
      `${label} sıfırdan büyük olmalıdır.`,
    );
  }
  return amount;
}

function normalizeNonNegativeAmount(value: unknown, label: string) {
  const amount = roundMoney(Number(value));
  if (!Number.isFinite(amount) || amount < 0) {
    throw new EmployeeAdvanceDomainError(
      "INVALID_AMOUNT",
      `${label} sıfırdan küçük olamaz.`,
    );
  }
  return amount;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function joinKey(parts: string[]) {
  return parts.map((part) => encodeURIComponent(part)).join("::");
}
