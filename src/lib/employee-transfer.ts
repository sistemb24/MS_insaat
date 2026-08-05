import type { TenantUserRole } from "./tenant-scope";

export const EMPLOYEE_TRANSFER_MAX_NOTE_LENGTH = 500;
export const EMPLOYEE_TRANSFER_MAX_REQUEST_KEY_LENGTH = 200;
export const EMPLOYEE_TRANSFER_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
] as const;

export type EmployeeTransferStatus = (typeof EMPLOYEE_TRANSFER_STATUSES)[number];
export type EmployeeTransferOperation =
  | "approve"
  | "create"
  | "edit"
  | "list"
  | "reject"
  | "submit"
  | "view";

export type EmployeeTransferDraftInput = {
  effectiveDate: string;
  note?: string;
  personnelCode: string;
  personnelName: string;
  requestKey: string;
  sourceSiteCode: string;
  sourceSiteName: string;
  targetSiteCode: string;
  targetSiteName: string;
};

export class EmployeeTransferDomainError extends Error {
  constructor(
    public readonly code:
      | "FUTURE_EFFECTIVE_DATE"
      | "INVALID_DATE"
      | "INVALID_INPUT"
      | "INVALID_REVISION"
      | "INVALID_STATUS"
      | "INVALID_TRANSITION"
      | "PENDING_TRANSFER"
      | "SAME_SITE"
      | "SOURCE_MISMATCH"
      | "TEXT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "EmployeeTransferDomainError";
  }
}

export function createEmployeeTransferDraft(
  input: EmployeeTransferDraftInput & { actorUserId: string },
) {
  const sourceSiteCode = normalizeIdentifier(input.sourceSiteCode, "Kaynak şantiye kodu");
  const sourceSiteName = normalizeIdentifier(input.sourceSiteName, "Kaynak şantiye adı");
  const targetSiteCode = normalizeIdentifier(input.targetSiteCode, "Hedef şantiye kodu");
  const targetSiteName = normalizeIdentifier(input.targetSiteName, "Hedef şantiye adı");
  assertDifferentSites({
    sourceSiteCode,
    sourceSiteName,
    targetSiteCode,
    targetSiteName,
  });

  return {
    createRequestKey: getEmployeeTransferCreateRequestKey({
      actorUserId: input.actorUserId,
      requestKey: input.requestKey,
    }),
    effectiveDate: normalizeDate(input.effectiveDate, "Yürürlük tarihi"),
    note: normalizeNote(input.note),
    personnelCode: normalizeIdentifier(input.personnelCode, "Personel kodu"),
    personnelName: normalizeIdentifier(input.personnelName, "Personel adı"),
    revisionNo: 1 as const,
    sourceSiteCode,
    sourceSiteName,
    status: "DRAFT" as const,
    targetSiteCode,
    targetSiteName,
  };
}

export function normalizeEmployeeTransferDraftUpdate(
  input: EmployeeTransferDraftInput & {
    expectedRevisionNo: number;
    transferId: string;
  },
) {
  const draft = createEmployeeTransferDraft({ ...input, actorUserId: "update" });
  return {
    ...draft,
    expectedRevisionNo: normalizeRevision(input.expectedRevisionNo),
    mutationRequestKey: normalizeRequestKey(input.requestKey),
    transferId: normalizeIdentifier(input.transferId, "Transfer kaydı"),
  };
}

export function getEmployeeTransferPermission(input: {
  operation: EmployeeTransferOperation;
  periodClosed: boolean;
  role: TenantUserRole;
}) {
  if (input.operation === "list" || input.operation === "view") {
    return { allowed: true as const };
  }
  if (input.periodClosed) {
    return {
      allowed: false as const,
      reason: "Kapalı dönemde personel transfer kaydı değiştirilemez.",
    };
  }
  if (input.operation === "approve" || input.operation === "reject") {
    return input.role === "admin"
      ? { allowed: true as const }
      : {
          allowed: false as const,
          reason: "Personel transfer kararını yalnız yönetici verebilir.",
        };
  }
  return input.role === "admin" || input.role === "accounting"
    ? { allowed: true as const }
    : {
        allowed: false as const,
        reason: "Personel transfer kaydını yalnız yönetici veya muhasebe düzenleyebilir.",
      };
}

export function assertEmployeeTransferTransition(
  from: EmployeeTransferStatus,
  to: EmployeeTransferStatus,
) {
  const allowed =
    (from === "DRAFT" && to === "SUBMITTED")
    || (from === "SUBMITTED" && (to === "APPROVED" || to === "REJECTED"));
  if (!allowed) {
    throw new EmployeeTransferDomainError(
      "INVALID_TRANSITION",
      "Personel transferi yalnız Taslak → Gönderildi → Onaylandı/Reddedildi sırasıyla ilerleyebilir.",
    );
  }
  return { from, to };
}

export function assertEmployeeTransferEffectiveDate(input: {
  effectiveDate: string;
  today: string;
}) {
  const effectiveDate = normalizeDate(input.effectiveDate, "Yürürlük tarihi");
  const today = normalizeDate(input.today, "Aktif şirket tarihi");
  if (effectiveDate > today) {
    throw new EmployeeTransferDomainError(
      "FUTURE_EFFECTIVE_DATE",
      "Personel transferi gelecek yürürlük tarihiyle onaylanamaz.",
    );
  }
  return effectiveDate;
}

export function assertEmployeeTransferSourceContinuity(input: {
  currentPersonnelSiteName: string;
  latestApprovedTargetSiteCode?: string | null;
  sourceSiteCode: string;
  sourceSiteName: string;
}) {
  const sourceSiteCode = normalizeIdentifier(input.sourceSiteCode, "Kaynak şantiye kodu");
  const sourceSiteName = normalizeIdentifier(input.sourceSiteName, "Kaynak şantiye adı");
  const currentPersonnelSiteName = normalizeIdentifier(
    input.currentPersonnelSiteName,
    "Personelin güncel şantiyesi",
  );

  if (canonicalText(currentPersonnelSiteName) !== canonicalText(sourceSiteName)) {
    throw new EmployeeTransferDomainError(
      "SOURCE_MISMATCH",
      "Kaynak şantiye personel kartındaki güncel şantiyeyle eşleşmiyor.",
    );
  }

  const latestTargetCode = normalizeOptionalIdentifier(input.latestApprovedTargetSiteCode);
  if (latestTargetCode && canonicalText(latestTargetCode) !== canonicalText(sourceSiteCode)) {
    throw new EmployeeTransferDomainError(
      "SOURCE_MISMATCH",
      "Kaynak şantiye personelin son onaylı transfer hedefiyle eşleşmiyor.",
    );
  }

  return { currentPersonnelSiteName, sourceSiteCode, sourceSiteName };
}

export function assertNoPendingEmployeeTransfer(input: {
  existing: Array<{
    id: string;
    personnelCode: string;
    status: EmployeeTransferStatus;
  }>;
  ignoreId?: string;
  personnelCode: string;
}) {
  const personnelCode = normalizeIdentifier(input.personnelCode, "Personel kodu");
  const hasPending = input.existing.some((row) =>
    row.id !== input.ignoreId
    && row.status === "SUBMITTED"
    && canonicalText(row.personnelCode) === canonicalText(personnelCode));
  if (hasPending) {
    throw new EmployeeTransferDomainError(
      "PENDING_TRANSFER",
      "Personelin sonuçlanmamış gönderilmiş bir transferi bulunuyor.",
    );
  }
}

export function getEmployeeTransferCreateRequestKey(input: {
  actorUserId: string;
  requestKey: string;
}) {
  return joinKey([
    normalizeIdentifier(input.actorUserId, "Aktif kullanıcı"),
    normalizeRequestKey(input.requestKey),
  ]);
}

export function getEmployeeTransferMutationRequestKey(input: {
  actorUserId: string;
  operation: Exclude<EmployeeTransferOperation, "create" | "list" | "view">;
  requestKey: string;
  transferId: string;
}) {
  return joinKey([
    normalizeIdentifier(input.transferId, "Transfer kaydı"),
    normalizeIdentifier(input.actorUserId, "Aktif kullanıcı"),
    input.operation,
    normalizeRequestKey(input.requestKey),
  ]);
}

export function normalizeEmployeeTransferStatus(value: unknown): EmployeeTransferStatus {
  if (
    typeof value === "string"
    && EMPLOYEE_TRANSFER_STATUSES.includes(value as EmployeeTransferStatus)
  ) {
    return value as EmployeeTransferStatus;
  }
  throw new EmployeeTransferDomainError(
    "INVALID_STATUS",
    "Personel transfer durumu geçersizdir.",
  );
}

function assertDifferentSites(input: {
  sourceSiteCode: string;
  sourceSiteName: string;
  targetSiteCode: string;
  targetSiteName: string;
}) {
  if (
    canonicalText(input.sourceSiteCode) === canonicalText(input.targetSiteCode)
    || canonicalText(input.sourceSiteName) === canonicalText(input.targetSiteName)
  ) {
    throw new EmployeeTransferDomainError(
      "SAME_SITE",
      "Kaynak ve hedef şantiye farklı olmalıdır.",
    );
  }
}

function normalizeNote(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (normalized.length > EMPLOYEE_TRANSFER_MAX_NOTE_LENGTH) {
    throw new EmployeeTransferDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `Transfer notu en fazla ${EMPLOYEE_TRANSFER_MAX_NOTE_LENGTH} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeRequestKey(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new EmployeeTransferDomainError("INVALID_INPUT", "İstek anahtarı zorunludur.");
  }
  if (normalized.length > EMPLOYEE_TRANSFER_MAX_REQUEST_KEY_LENGTH) {
    throw new EmployeeTransferDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `İstek anahtarı en fazla ${EMPLOYEE_TRANSFER_MAX_REQUEST_KEY_LENGTH} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeIdentifier(value: unknown, label: string) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new EmployeeTransferDomainError("INVALID_INPUT", `${label} zorunludur.`);
  }
  return normalized;
}

function normalizeOptionalIdentifier(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized || null;
}

function normalizeRevision(value: unknown) {
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 1) {
    throw new EmployeeTransferDomainError(
      "INVALID_REVISION",
      "Personel transfer revizyonu geçersizdir.",
    );
  }
  return revision;
}

function normalizeDate(value: unknown, label: string) {
  const normalized = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new EmployeeTransferDomainError("INVALID_DATE", `${label} geçersizdir.`);
  }
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new EmployeeTransferDomainError("INVALID_DATE", `${label} geçersizdir.`);
  }
  return normalized;
}

function canonicalText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("tr-TR");
}

function joinKey(parts: string[]) {
  return parts.map((part) => encodeURIComponent(part)).join("::");
}
