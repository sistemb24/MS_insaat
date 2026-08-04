import type { TenantUserRole } from "./tenant-scope";

export const EMPLOYEE_LEAVE_MAX_NOTE_LENGTH = 500;
export const EMPLOYEE_LEAVE_MAX_REQUEST_KEY_LENGTH = 200;

export const EMPLOYEE_LEAVE_TYPES = [
  "ANNUAL",
  "EXCUSE",
  "SICK",
  "MATERNITY",
  "PATERNITY",
  "UNPAID",
] as const;
export const EMPLOYEE_LEAVE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export type EmployeeLeaveType = (typeof EMPLOYEE_LEAVE_TYPES)[number];
export type EmployeeLeaveStatus = (typeof EMPLOYEE_LEAVE_STATUSES)[number];
export type EmployeeLeaveOperation =
  | "approve"
  | "balance"
  | "cancel"
  | "create"
  | "edit"
  | "list"
  | "reject"
  | "submit"
  | "view";

export type EmployeeLeaveDraftInput = {
  chargeableDays: number;
  documentFileId?: string | null;
  endDate: string;
  leaveType: EmployeeLeaveType;
  note?: string;
  personnelCode: string;
  personnelName: string;
  requestKey: string;
  startDate: string;
};

export type EmployeeLeaveDraft = {
  chargeableDays: number;
  createRequestKey: string;
  documentFileId: string | null;
  endDate: string;
  leaveType: EmployeeLeaveType;
  note: string;
  personnelCode: string;
  personnelName: string;
  revisionNo: 1;
  startDate: string;
  status: "DRAFT";
};

export class EmployeeLeaveDomainError extends Error {
  constructor(
    public readonly code:
      | "INVALID_DATE"
      | "INVALID_DAYS"
      | "INVALID_INPUT"
      | "INVALID_REVISION"
      | "INVALID_STATUS"
      | "INVALID_TRANSITION"
      | "INVALID_TYPE"
      | "OVERLAPPING_LEAVE"
      | "TEXT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "EmployeeLeaveDomainError";
  }
}

export function createEmployeeLeaveDraft(
  input: EmployeeLeaveDraftInput & { actorUserId: string },
): EmployeeLeaveDraft {
  const dates = normalizeLeaveDates(input);
  return {
    chargeableDays: dates.chargeableDays,
    createRequestKey: getEmployeeLeaveCreateRequestKey({
      actorUserId: input.actorUserId,
      requestKey: input.requestKey,
    }),
    documentFileId: normalizeOptionalIdentifier(input.documentFileId),
    endDate: dates.endDate,
    leaveType: normalizeEmployeeLeaveType(input.leaveType),
    note: normalizeNote(input.note),
    personnelCode: normalizeIdentifier(input.personnelCode, "Personel kodu"),
    personnelName: normalizeIdentifier(input.personnelName, "Personel adı"),
    revisionNo: 1,
    startDate: dates.startDate,
    status: "DRAFT",
  };
}

export function normalizeEmployeeLeaveDraftUpdate(
  input: EmployeeLeaveDraftInput & {
    expectedRevisionNo: number;
    leaveId: string;
  },
) {
  const draft = createEmployeeLeaveDraft({ ...input, actorUserId: "update" });
  return {
    ...draft,
    expectedRevisionNo: normalizeRevision(input.expectedRevisionNo),
    leaveId: normalizeIdentifier(input.leaveId, "İzin kaydı"),
    mutationRequestKey: normalizeRequestKey(input.requestKey),
  };
}

export function normalizeLeaveBalanceInput(input: {
  adjustmentDays: number;
  openingDays: number;
  personnelCode: string;
  personnelName: string;
  requestKey: string;
  year: number;
}) {
  const openingDays = normalizeNonNegativeDays(input.openingDays, "Açılış günü");
  const adjustmentDays = normalizeSignedDays(input.adjustmentDays, "Düzeltme günü");
  if (openingDays + adjustmentDays < 0) {
    throw new EmployeeLeaveDomainError(
      "INVALID_DAYS",
      "Açılış ve düzeltme toplamı sıfırdan küçük olamaz.",
    );
  }
  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new EmployeeLeaveDomainError("INVALID_DATE", "İzin bakiye yılı geçersizdir.");
  }
  return {
    adjustmentDays,
    mutationRequestKey: normalizeRequestKey(input.requestKey),
    openingDays,
    personnelCode: normalizeIdentifier(input.personnelCode, "Personel kodu"),
    personnelName: normalizeIdentifier(input.personnelName, "Personel adı"),
    year,
  };
}

export function getEmployeeLeavePermission(input: {
  operation: EmployeeLeaveOperation;
  periodClosed: boolean;
  role: TenantUserRole;
}) {
  if (input.operation === "list" || input.operation === "view") {
    return { allowed: true as const };
  }
  if (input.periodClosed) {
    return {
      allowed: false as const,
      reason: "Kapalı dönemde personel izin kaydı değiştirilemez.",
    };
  }
  if (input.operation === "approve" || input.operation === "cancel"
    || input.operation === "reject" || input.operation === "balance") {
    return input.role === "admin"
      ? { allowed: true as const }
      : {
          allowed: false as const,
          reason: "Bu personel izin işlemini yalnız yönetici yapabilir.",
        };
  }
  return input.role === "admin" || input.role === "accounting"
    ? { allowed: true as const }
    : {
        allowed: false as const,
        reason: "Personel izin kaydını yalnız yönetici veya muhasebe düzenleyebilir.",
      };
}

export function assertEmployeeLeaveTransition(
  from: EmployeeLeaveStatus,
  to: EmployeeLeaveStatus,
) {
  const allowed =
    (from === "DRAFT" && to === "SUBMITTED")
    || (from === "SUBMITTED" && (to === "APPROVED" || to === "REJECTED"))
    || (from === "APPROVED" && to === "CANCELLED");
  if (!allowed) {
    throw new EmployeeLeaveDomainError(
      "INVALID_TRANSITION",
      "İzin kaydı yalnız Taslak → Gönderildi → Onaylandı/Reddedildi ve Onaylandı → İptal sırasıyla ilerleyebilir.",
    );
  }
  return { from, to };
}

export function assertNoEmployeeLeaveOverlap(input: {
  candidateEndDate: string;
  candidateStartDate: string;
  existing: Array<{
    endDate: string;
    id: string;
    startDate: string;
    status: EmployeeLeaveStatus;
  }>;
  ignoreId?: string;
}) {
  const start = parseDateOnly(input.candidateStartDate, "İzin başlangıç tarihi").getTime();
  const end = parseDateOnly(input.candidateEndDate, "İzin bitiş tarihi").getTime();
  const overlap = input.existing.some((row) => {
    if (row.id === input.ignoreId) return false;
    if (row.status !== "SUBMITTED" && row.status !== "APPROVED") return false;
    return parseDateOnly(row.startDate, "Mevcut izin başlangıcı").getTime() <= end
      && parseDateOnly(row.endDate, "Mevcut izin bitişi").getTime() >= start;
  });
  if (overlap) {
    throw new EmployeeLeaveDomainError(
      "OVERLAPPING_LEAVE",
      "Personelin aynı tarih aralığında gönderilmiş veya onaylanmış izni bulunuyor.",
    );
  }
}

export function calculateLeaveBalance(input: {
  adjustmentDays: number;
  openingDays: number;
  usedDays: number;
}) {
  const availableDays = roundDays(input.openingDays + input.adjustmentDays);
  const usedDays = roundDays(input.usedDays);
  return {
    availableDays,
    remainingDays: roundDays(availableDays - usedDays),
    usedDays,
  };
}

export function getEmployeeLeaveCreateRequestKey(input: {
  actorUserId: string;
  requestKey: string;
}) {
  return joinKey([
    normalizeIdentifier(input.actorUserId, "Aktif kullanıcı"),
    normalizeRequestKey(input.requestKey),
  ]);
}

export function getEmployeeLeaveMutationRequestKey(input: {
  actorUserId: string;
  leaveId: string;
  operation: Exclude<EmployeeLeaveOperation, "create" | "list" | "view">;
  requestKey: string;
}) {
  return joinKey([
    normalizeIdentifier(input.leaveId, "İzin kaydı"),
    normalizeIdentifier(input.actorUserId, "Aktif kullanıcı"),
    input.operation,
    normalizeRequestKey(input.requestKey),
  ]);
}

export function getEmployeeLeaveBalanceMutationRequestKey(input: {
  actorUserId: string;
  personnelCode: string;
  requestKey: string;
  year: number;
}) {
  return joinKey([
    normalizeIdentifier(input.personnelCode, "Personel kodu"),
    String(input.year),
    normalizeIdentifier(input.actorUserId, "Aktif kullanıcı"),
    "balance",
    normalizeRequestKey(input.requestKey),
  ]);
}

export function normalizeEmployeeLeaveType(value: unknown): EmployeeLeaveType {
  if (isOneOf(value, EMPLOYEE_LEAVE_TYPES)) return value;
  throw new EmployeeLeaveDomainError("INVALID_TYPE", "İzin türü geçersizdir.");
}

export function normalizeEmployeeLeaveStatus(value: unknown): EmployeeLeaveStatus {
  if (isOneOf(value, EMPLOYEE_LEAVE_STATUSES)) return value;
  throw new EmployeeLeaveDomainError("INVALID_STATUS", "İzin durumu geçersizdir.");
}

function normalizeLeaveDates(input: {
  chargeableDays: number;
  endDate: string;
  startDate: string;
}) {
  const start = parseDateOnly(input.startDate, "İzin başlangıç tarihi");
  const end = parseDateOnly(input.endDate, "İzin bitiş tarihi");
  if (end.getTime() < start.getTime()) {
    throw new EmployeeLeaveDomainError(
      "INVALID_DATE",
      "İzin bitiş tarihi başlangıç tarihinden önce olamaz.",
    );
  }
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    throw new EmployeeLeaveDomainError(
      "INVALID_DATE",
      "İzin başlangıç ve bitiş tarihi aynı takvim yılında olmalıdır.",
    );
  }
  const calendarDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const chargeableDays = normalizePositiveDays(input.chargeableDays, "İzin gün sayısı");
  if (chargeableDays > calendarDays) {
    throw new EmployeeLeaveDomainError(
      "INVALID_DAYS",
      "İzin gün sayısı seçilen tarih aralığının takvim gününü aşamaz.",
    );
  }
  return {
    chargeableDays,
    endDate: toDateOnly(end),
    startDate: toDateOnly(start),
  };
}

function normalizeNote(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (normalized.length > EMPLOYEE_LEAVE_MAX_NOTE_LENGTH) {
    throw new EmployeeLeaveDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `İzin açıklaması en fazla ${EMPLOYEE_LEAVE_MAX_NOTE_LENGTH} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeRequestKey(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new EmployeeLeaveDomainError("INVALID_INPUT", "İstek anahtarı zorunludur.");
  }
  if (normalized.length > EMPLOYEE_LEAVE_MAX_REQUEST_KEY_LENGTH) {
    throw new EmployeeLeaveDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `İstek anahtarı en fazla ${EMPLOYEE_LEAVE_MAX_REQUEST_KEY_LENGTH} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeIdentifier(value: unknown, label: string) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new EmployeeLeaveDomainError("INVALID_INPUT", `${label} zorunludur.`);
  }
  return normalized;
}

function normalizeOptionalIdentifier(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeRevision(value: unknown) {
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 1) {
    throw new EmployeeLeaveDomainError("INVALID_REVISION", "İzin revizyonu geçersizdir.");
  }
  return revision;
}

function normalizePositiveDays(value: unknown, label: string) {
  const days = roundDays(Number(value));
  if (!Number.isFinite(days) || days <= 0) {
    throw new EmployeeLeaveDomainError("INVALID_DAYS", `${label} sıfırdan büyük olmalıdır.`);
  }
  return days;
}

function normalizeNonNegativeDays(value: unknown, label: string) {
  const days = roundDays(Number(value));
  if (!Number.isFinite(days) || days < 0) {
    throw new EmployeeLeaveDomainError("INVALID_DAYS", `${label} sıfırdan küçük olamaz.`);
  }
  return days;
}

function normalizeSignedDays(value: unknown, label: string) {
  const days = roundDays(Number(value));
  if (!Number.isFinite(days)) {
    throw new EmployeeLeaveDomainError("INVALID_DAYS", `${label} geçersizdir.`);
  }
  return days;
}

function roundDays(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDateOnly(value: unknown, label: string) {
  const normalized = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new EmployeeLeaveDomainError("INVALID_DATE", `${label} geçersizdir.`);
  }
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || toDateOnly(parsed) !== normalized) {
    throw new EmployeeLeaveDomainError("INVALID_DATE", `${label} geçersizdir.`);
  }
  return parsed;
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function joinKey(parts: string[]) {
  return parts.map((part) => encodeURIComponent(part)).join("::");
}

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.includes(value);
}
