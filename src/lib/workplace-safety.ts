import type { TenantUserRole } from "./tenant-scope";

export const SAFETY_MAX_TEXT_LENGTH = 500;
export const SAFETY_MAX_SUMMARY_LENGTH = 2_000;

export type SafetyWorkAccidentStatus = "DRAFT" | "RECORDED" | "CLOSED";
export type SafetyTrainingStatus = "DRAFT" | "PLANNED" | "COMPLETED";
export type SafetyInspectionStatus = "DRAFT" | "COMPLETED";
export type SafetyFindingStatus = "OPEN" | "RESOLVED";
export type SafetyPpeIssuanceStatus = "ISSUED" | "RETURNED";
export type SafetyOperation = "create" | "list" | "transition";

export type SafetyWorkAccidentDraftInput = {
  classification: string;
  occurredOn: string;
  personnelId?: string | null;
  projectId?: string | null;
  summary: string;
};

export type SafetyWorkAccidentDraft = {
  classification: string;
  occurredOn: string;
  personnelId: string | null;
  projectId: string | null;
  status: "DRAFT";
  summary: string;
};

export type SafetyTrainingDraftInput = {
  durationMinutes: number;
  name: string;
  nextTrainingOn?: string | null;
  trainerName: string;
  trainingOn: string;
  type: string;
};

export type SafetyTrainingDraft = {
  durationMinutes: number;
  name: string;
  nextTrainingOn: string | null;
  status: "DRAFT";
  trainerName: string;
  trainingOn: string;
  type: string;
};

export type SafetyInspectionDraftInput = {
  inspectedOn: string;
  inspectorName: string;
  projectId: string;
  summary?: string | null;
};

export type SafetyInspectionDraft = {
  inspectedOn: string;
  inspectorName: string;
  projectId: string;
  status: "DRAFT";
  summary: string | null;
};

export type SafetyFindingDraftInput = {
  category: string;
  dueOn?: string | null;
  inspectionId: string;
  ownerPersonnelId?: string | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
};

export type SafetyFindingDraft = {
  category: string;
  dueOn: string | null;
  inspectionId: string;
  ownerPersonnelId: string | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN";
  summary: string;
};

export type SafetyTrainingAttendanceInput = {
  personnelId: string;
  trainingId: string;
};

export type SafetyPpeIssuanceInput = {
  issuedOn: string;
  personnelId: string;
  ppeCode: string;
  ppeType: string;
  quantity: number;
};

export class WorkplaceSafetyDomainError extends Error {
  constructor(
    public readonly code:
      | "INVALID_DATE"
      | "INVALID_DURATION"
      | "INVALID_INPUT"
      | "INVALID_QUANTITY"
      | "INVALID_TRANSITION"
      | "TEXT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "WorkplaceSafetyDomainError";
  }
}

export function getWorkplaceSafetyPermission(input: {
  operation: SafetyOperation;
  role: TenantUserRole;
  periodClosed?: boolean;
}) {
  if (input.operation === "list") return { allowed: true as const };
  if (input.role === "viewer") {
    return { allowed: false as const, reason: "İSG kaydı için muhasebe veya yönetici yetkisi gereklidir." };
  }
  if (input.periodClosed) {
    return { allowed: false as const, reason: "Kapalı dönemde İSG kaydı değiştirilemez." };
  }
  return { allowed: true as const };
}

export function createSafetyWorkAccidentDraft(
  input: SafetyWorkAccidentDraftInput,
): SafetyWorkAccidentDraft {
  return {
    classification: normalizeRequiredText(input.classification, "Kaza sınıflaması"),
    occurredOn: normalizeSafetyDate(input.occurredOn, "Kaza tarihi"),
    personnelId: normalizeOptionalIdentifier(input.personnelId),
    projectId: normalizeOptionalIdentifier(input.projectId),
    status: "DRAFT",
    summary: normalizeRequiredSummary(input.summary, "Kaza özeti"),
  };
}

export function createSafetyTrainingDraft(input: SafetyTrainingDraftInput): SafetyTrainingDraft {
  const trainingOn = normalizeSafetyDate(input.trainingOn, "Eğitim tarihi");
  const nextTrainingOn = normalizeOptionalDate(input.nextTrainingOn, "Sonraki eğitim tarihi");
  if (nextTrainingOn && nextTrainingOn < trainingOn) {
    throw new WorkplaceSafetyDomainError(
      "INVALID_DATE",
      "Sonraki eğitim tarihi eğitim tarihinden önce olamaz.",
    );
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new WorkplaceSafetyDomainError("INVALID_DURATION", "Eğitim süresi pozitif tam dakika olmalıdır.");
  }
  return {
    durationMinutes: input.durationMinutes,
    name: normalizeRequiredText(input.name, "Eğitim adı"),
    nextTrainingOn,
    status: "DRAFT",
    trainerName: normalizeRequiredText(input.trainerName, "Eğitmen"),
    trainingOn,
    type: normalizeRequiredText(input.type, "Eğitim türü"),
  };
}

export function createSafetyInspectionDraft(input: SafetyInspectionDraftInput): SafetyInspectionDraft {
  return {
    inspectedOn: normalizeSafetyDate(input.inspectedOn, "Denetim tarihi"),
    inspectorName: normalizeRequiredText(input.inspectorName, "Denetleyen"),
    projectId: normalizeRequiredIdentifier(input.projectId, "Proje"),
    status: "DRAFT",
    summary: normalizeOptionalSummary(input.summary, "Denetim özeti"),
  };
}

export function createSafetyFindingDraft(input: SafetyFindingDraftInput): SafetyFindingDraft {
  return {
    category: normalizeRequiredText(input.category, "Bulgu kategorisi"),
    dueOn: normalizeOptionalDate(input.dueOn, "Bulgu hedef tarihi"),
    inspectionId: normalizeRequiredIdentifier(input.inspectionId, "Denetim"),
    ownerPersonnelId: normalizeOptionalIdentifier(input.ownerPersonnelId),
    riskLevel: input.riskLevel,
    status: "OPEN",
    summary: normalizeRequiredSummary(input.summary, "Bulgu özeti"),
  };
}

export function getSafetyTrainingAttendanceKey(input: SafetyTrainingAttendanceInput) {
  return `${normalizeRequiredIdentifier(input.trainingId, "Eğitim")}::${normalizeRequiredIdentifier(input.personnelId, "Personel")}`;
}

export function getSafetyPpeIssuanceKey(input: SafetyPpeIssuanceInput) {
  return [
    normalizeRequiredIdentifier(input.personnelId, "Personel"),
    normalizeRequiredText(input.ppeCode, "KKD kodu"),
    normalizeSafetyDate(input.issuedOn, "Teslim tarihi"),
  ].join("::");
}

export function validateSafetyPpeIssuance(input: SafetyPpeIssuanceInput) {
  const key = getSafetyPpeIssuanceKey(input);
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new WorkplaceSafetyDomainError("INVALID_QUANTITY", "KKD miktarı pozitif tam sayı olmalıdır.");
  }
  return {
    issuedOn: normalizeSafetyDate(input.issuedOn, "Teslim tarihi"),
    key,
    personnelId: normalizeRequiredIdentifier(input.personnelId, "Personel"),
    ppeCode: normalizeRequiredText(input.ppeCode, "KKD kodu"),
    ppeType: normalizeRequiredText(input.ppeType, "KKD tipi"),
    quantity: input.quantity,
    status: "ISSUED" as const,
  };
}

export function canTransitionSafetyWorkAccidentStatus(
  from: SafetyWorkAccidentStatus,
  to: SafetyWorkAccidentStatus,
) {
  return (from === "DRAFT" && to === "RECORDED") || (from === "RECORDED" && to === "CLOSED");
}

export function canTransitionSafetyTrainingStatus(
  from: SafetyTrainingStatus,
  to: SafetyTrainingStatus,
) {
  return (from === "DRAFT" && to === "PLANNED") || (from === "PLANNED" && to === "COMPLETED");
}

export function canTransitionSafetyInspectionStatus(
  from: SafetyInspectionStatus,
  to: SafetyInspectionStatus,
) {
  return from === "DRAFT" && to === "COMPLETED";
}

export function canTransitionSafetyFindingStatus(from: SafetyFindingStatus, to: SafetyFindingStatus) {
  return from === "OPEN" && to === "RESOLVED";
}

export function canTransitionSafetyPpeIssuanceStatus(
  from: SafetyPpeIssuanceStatus,
  to: SafetyPpeIssuanceStatus,
) {
  return from === "ISSUED" && to === "RETURNED";
}

export function assertSafetyTransition(
  allowed: boolean,
  label: string,
) {
  if (!allowed) {
    throw new WorkplaceSafetyDomainError("INVALID_TRANSITION", `${label} için istenen durum geçişi geçersiz.`);
  }
}

function normalizeRequiredText(value: string, label: string) {
  const normalized = normalizeSafetyText(value);
  if (!normalized) {
    throw new WorkplaceSafetyDomainError("INVALID_INPUT", `${label} zorunludur.`);
  }
  if (normalized.length > SAFETY_MAX_TEXT_LENGTH) {
    throw new WorkplaceSafetyDomainError("TEXT_LIMIT_EXCEEDED", `${label} en fazla ${SAFETY_MAX_TEXT_LENGTH} karakter olabilir.`);
  }
  return normalized;
}

function normalizeRequiredSummary(value: string, label: string) {
  const normalized = normalizeSafetyText(value);
  if (!normalized) {
    throw new WorkplaceSafetyDomainError("INVALID_INPUT", `${label} zorunludur.`);
  }
  if (normalized.length > SAFETY_MAX_SUMMARY_LENGTH) {
    throw new WorkplaceSafetyDomainError("TEXT_LIMIT_EXCEEDED", `${label} en fazla ${SAFETY_MAX_SUMMARY_LENGTH} karakter olabilir.`);
  }
  return normalized;
}

function normalizeOptionalSummary(value: string | null | undefined, label: string) {
  if (!value) return null;
  const normalized = normalizeSafetyText(value);
  if (!normalized) return null;
  if (normalized.length > SAFETY_MAX_SUMMARY_LENGTH) {
    throw new WorkplaceSafetyDomainError("TEXT_LIMIT_EXCEEDED", `${label} en fazla ${SAFETY_MAX_SUMMARY_LENGTH} karakter olabilir.`);
  }
  return normalized;
}

function normalizeRequiredIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new WorkplaceSafetyDomainError("INVALID_INPUT", `${label} zorunludur.`);
  }
  return normalized;
}

function normalizeOptionalIdentifier(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function normalizeOptionalDate(value: string | null | undefined, label: string) {
  if (!value?.trim()) return null;
  return normalizeSafetyDate(value, label);
}

export function normalizeSafetyText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeSafetyDate(value: string, label: string) {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new WorkplaceSafetyDomainError("INVALID_DATE", `${label} YYYY-AA-GG biçiminde olmalıdır.`);
  }
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new WorkplaceSafetyDomainError("INVALID_DATE", `${label} geçerli bir takvim günü olmalıdır.`);
  }
  return normalized;
}
