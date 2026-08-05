import type { TenantUserRole } from "./tenant-scope";

export const SAFETY_CHECKLIST_MAX_ITEM_COUNT = 50;
export const SAFETY_CHECKLIST_MAX_NOTE_LENGTH = 500;
export const SAFETY_CHECKLIST_MAX_TEXT_LENGTH = 300;

export type SafetyChecklistOperation = "create" | "list" | "respond" | "transition";
export type SafetyChecklistResponseStatus = "PASS" | "FAIL" | "NOT_APPLICABLE";
export type SafetyChecklistRunStatus = "DRAFT" | "COMPLETED";
export type SafetyChecklistTemplateStatus = "ACTIVE" | "ARCHIVED";

export type SafetyChecklistTemplateItemInput = {
  category?: string | null;
  title: string;
};

export type SafetyChecklistTemplateDraftInput = {
  description?: string | null;
  items: SafetyChecklistTemplateItemInput[];
  title: string;
};

export type SafetyChecklistTemplateDraft = {
  description: string | null;
  items: Array<{ category: string | null; sortOrder: number; title: string }>;
  status: "ACTIVE";
  title: string;
};

export type SafetyChecklistRunDraftInput = {
  inspectedOn: string;
  inspectorName: string;
  projectId: string;
  requestKey: string;
  templateId: string;
};

export type SafetyChecklistRunDraft = {
  inspectedOn: string;
  inspectorName: string;
  key: string;
  projectId: string;
  status: "DRAFT";
  templateId: string;
};

export type SafetyChecklistResponseDraftInput = {
  checklistItemId: string;
  checklistRunId: string;
  note?: string | null;
  response: SafetyChecklistResponseStatus;
};

export type SafetyChecklistResponseDraft = {
  checklistItemId: string;
  checklistRunId: string;
  key: string;
  note: string | null;
  response: SafetyChecklistResponseStatus;
};

export class MobileSafetyChecklistDomainError extends Error {
  constructor(
    public readonly code:
      | "DUPLICATE_CHECKLIST_ITEM"
      | "INCOMPLETE_CHECKLIST"
      | "INVALID_DATE"
      | "INVALID_INPUT"
      | "INVALID_RESPONSE"
      | "INVALID_TRANSITION"
      | "ITEM_LIMIT_EXCEEDED"
      | "TEXT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "MobileSafetyChecklistDomainError";
  }
}

export function getMobileSafetyChecklistPermission(input: {
  operation: SafetyChecklistOperation;
  periodClosed?: boolean;
  role: TenantUserRole;
}) {
  if (input.operation === "list") return { allowed: true as const };
  if (input.role === "viewer") {
    return { allowed: false as const, reason: "Mobil İSG kontrol listesi için muhasebe veya yönetici yetkisi gereklidir." };
  }
  if (input.periodClosed) {
    return { allowed: false as const, reason: "Kapalı dönemde mobil İSG kontrol listesi değiştirilemez." };
  }
  return { allowed: true as const };
}

export function createSafetyChecklistTemplateDraft(
  input: SafetyChecklistTemplateDraftInput,
): SafetyChecklistTemplateDraft {
  const items = normalizeTemplateItems(input.items);
  return {
    description: normalizeOptionalText(input.description, "Şablon açıklaması"),
    items,
    status: "ACTIVE",
    title: normalizeRequiredText(input.title, "Şablon başlığı"),
  };
}

export function createSafetyChecklistRunDraft(
  input: SafetyChecklistRunDraftInput,
): SafetyChecklistRunDraft {
  const templateId = normalizeRequiredIdentifier(input.templateId, "Kontrol şablonu");
  const projectId = normalizeRequiredIdentifier(input.projectId, "Proje");
  const inspectedOn = normalizeSafetyChecklistDate(input.inspectedOn, "Kontrol tarihi");
  const inspectorName = normalizeRequiredText(input.inspectorName, "Denetleyen");
  return {
    inspectedOn,
    inspectorName,
    key: getSafetyChecklistRunKey({
      inspectedOn,
      projectId,
      requestKey: input.requestKey,
      templateId,
    }),
    projectId,
    status: "DRAFT",
    templateId,
  };
}

export function createSafetyChecklistResponseDraft(
  input: SafetyChecklistResponseDraftInput,
): SafetyChecklistResponseDraft {
  const checklistItemId = normalizeRequiredIdentifier(input.checklistItemId, "Kontrol maddesi");
  const checklistRunId = normalizeRequiredIdentifier(input.checklistRunId, "Kontrol yürütmesi");
  const response = normalizeSafetyChecklistResponse(input.response);
  return {
    checklistItemId,
    checklistRunId,
    key: getSafetyChecklistResponseKey({ checklistItemId, checklistRunId }),
    note: normalizeOptionalText(input.note, "Kontrol notu"),
    response,
  };
}

export function getSafetyChecklistRunKey(input: {
  inspectedOn: string;
  projectId: string;
  requestKey: string;
  templateId: string;
}) {
  return [
    normalizeRequiredIdentifier(input.templateId, "Kontrol şablonu"),
    normalizeRequiredIdentifier(input.projectId, "Proje"),
    normalizeSafetyChecklistDate(input.inspectedOn, "Kontrol tarihi"),
    normalizeRequiredIdentifier(input.requestKey, "İstek anahtarı"),
  ].join("::");
}

export function getSafetyChecklistResponseKey(input: {
  checklistItemId: string;
  checklistRunId: string;
}) {
  return [
    normalizeRequiredIdentifier(input.checklistRunId, "Kontrol yürütmesi"),
    normalizeRequiredIdentifier(input.checklistItemId, "Kontrol maddesi"),
  ].join("::");
}

export function assertSafetyChecklistRunComplete(input: {
  answeredItemIds: string[];
  expectedItemIds: string[];
}) {
  const expected = normalizeIdentifierSet(input.expectedItemIds, "Şablon maddesi");
  const answered = normalizeIdentifierSet(input.answeredItemIds, "Yanıtlanan madde");
  if (expected.length === 0 || expected.length !== answered.length || expected.some((id) => !answered.includes(id))) {
    throw new MobileSafetyChecklistDomainError(
      "INCOMPLETE_CHECKLIST",
      "Kontrol yürütmesi tamamlanmadan önce tüm şablon maddeleri bir kez yanıtlanmalıdır.",
    );
  }
  return { status: "COMPLETED" as const };
}

export function canTransitionSafetyChecklistTemplateStatus(
  from: SafetyChecklistTemplateStatus,
  to: SafetyChecklistTemplateStatus,
) {
  return from === "ACTIVE" && to === "ARCHIVED";
}

export function canTransitionSafetyChecklistRunStatus(
  from: SafetyChecklistRunStatus,
  to: SafetyChecklistRunStatus,
) {
  return from === "DRAFT" && to === "COMPLETED";
}

export function assertSafetyChecklistTransition(allowed: boolean, label: string) {
  if (!allowed) {
    throw new MobileSafetyChecklistDomainError("INVALID_TRANSITION", `${label} için istenen durum geçişi geçersiz.`);
  }
}

export function normalizeSafetyChecklistDate(value: unknown, label: string) {
  const normalized = normalizeSafetyChecklistText(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) {
    throw new MobileSafetyChecklistDomainError("INVALID_DATE", `${label} geçerli bir takvim tarihi olmalıdır.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new MobileSafetyChecklistDomainError("INVALID_DATE", `${label} geçerli bir takvim tarihi olmalıdır.`);
  }
  return normalized;
}

export function normalizeSafetyChecklistText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeTemplateItems(input: SafetyChecklistTemplateItemInput[]) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new MobileSafetyChecklistDomainError("INVALID_INPUT", "Kontrol şablonunda en az bir madde bulunmalıdır.");
  }
  if (input.length > SAFETY_CHECKLIST_MAX_ITEM_COUNT) {
    throw new MobileSafetyChecklistDomainError(
      "ITEM_LIMIT_EXCEEDED",
      `Kontrol şablonu en fazla ${SAFETY_CHECKLIST_MAX_ITEM_COUNT} madde içerebilir.`,
    );
  }
  const itemKeys = new Set<string>();
  return input.map((item, index) => {
    const category = normalizeOptionalText(item.category, "Madde kategorisi");
    const title = normalizeRequiredText(item.title, "Kontrol maddesi");
    const key = `${category?.toLocaleLowerCase("tr-TR") ?? ""}::${title.toLocaleLowerCase("tr-TR")}`;
    if (itemKeys.has(key)) {
      throw new MobileSafetyChecklistDomainError("DUPLICATE_CHECKLIST_ITEM", "Kontrol şablonunda aynı madde tekrar edemez.");
    }
    itemKeys.add(key);
    return { category, sortOrder: index + 1, title };
  });
}

function normalizeIdentifierSet(values: string[], label: string) {
  if (!Array.isArray(values)) {
    throw new MobileSafetyChecklistDomainError("INVALID_INPUT", `${label} listesi geçerli olmalıdır.`);
  }
  const normalized = values.map((value) => normalizeRequiredIdentifier(value, label));
  if (new Set(normalized).size !== normalized.length) {
    throw new MobileSafetyChecklistDomainError("INVALID_INPUT", `${label} listesinde tekrar eden kimlik bulunamaz.`);
  }
  return normalized;
}

function normalizeRequiredIdentifier(value: unknown, label: string) {
  const normalized = normalizeSafetyChecklistText(value);
  if (!normalized) throw new MobileSafetyChecklistDomainError("INVALID_INPUT", `${label} zorunludur.`);
  return normalized;
}

function normalizeRequiredText(value: unknown, label: string) {
  const normalized = normalizeSafetyChecklistText(value);
  if (!normalized) throw new MobileSafetyChecklistDomainError("INVALID_INPUT", `${label} zorunludur.`);
  if (normalized.length > SAFETY_CHECKLIST_MAX_TEXT_LENGTH) {
    throw new MobileSafetyChecklistDomainError("TEXT_LIMIT_EXCEEDED", `${label} en fazla ${SAFETY_CHECKLIST_MAX_TEXT_LENGTH} karakter olabilir.`);
  }
  return normalized;
}

function normalizeOptionalText(value: unknown, label: string) {
  const normalized = normalizeSafetyChecklistText(value);
  if (!normalized) return null;
  const limit = label === "Kontrol notu" ? SAFETY_CHECKLIST_MAX_NOTE_LENGTH : SAFETY_CHECKLIST_MAX_TEXT_LENGTH;
  if (normalized.length > limit) {
    throw new MobileSafetyChecklistDomainError("TEXT_LIMIT_EXCEEDED", `${label} en fazla ${limit} karakter olabilir.`);
  }
  return normalized;
}

function normalizeSafetyChecklistResponse(value: unknown): SafetyChecklistResponseStatus {
  if (value === "PASS" || value === "FAIL" || value === "NOT_APPLICABLE") return value;
  throw new MobileSafetyChecklistDomainError("INVALID_RESPONSE", "Kontrol yanıtı uygun, uygunsuz veya uygulanamaz olmalıdır.");
}
