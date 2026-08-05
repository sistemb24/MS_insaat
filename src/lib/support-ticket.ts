import type { TenantUserRole } from "./tenant-scope";

export const SUPPORT_TICKET_MAX_MESSAGE_LENGTH = 4_000;
export const SUPPORT_TICKET_MAX_REQUEST_KEY_LENGTH = 200;
export const SUPPORT_TICKET_MAX_SUBJECT_LENGTH = 200;

export const SUPPORT_TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;
export const SUPPORT_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export const SUPPORT_TICKET_TYPES = ["TECHNICAL", "ACCOUNT", "BILLING", "SUGGESTION"] as const;

export type SupportTicketOperation = "create" | "list" | "reply" | "transition";
export type SupportTicketPriority = (typeof SUPPORT_TICKET_PRIORITIES)[number];
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];
export type SupportTicketType = (typeof SUPPORT_TICKET_TYPES)[number];
export type SupportTicketVisibility =
  | { mode: "scope" }
  | { mode: "own"; requesterUserId: string };

export type SupportTicketDraftInput = {
  initialMessage: string;
  priority: SupportTicketPriority;
  requestKey: string;
  requesterUserId: string;
  subject: string;
  type: SupportTicketType;
};

export type SupportTicketDraft = {
  initialMessage: string;
  priority: SupportTicketPriority;
  requesterUserId: string;
  status: "OPEN";
  subject: string;
  ticketKey: string;
  type: SupportTicketType;
};

export type SupportTicketMessageDraftInput = {
  authorUserId: string;
  body: string;
  requestKey: string;
  ticketId: string;
};

export type SupportTicketMessageDraft = {
  authorUserId: string;
  body: string;
  messageKey: string;
  ticketId: string;
};

export class SupportTicketDomainError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "INVALID_PRIORITY"
      | "INVALID_STATUS"
      | "INVALID_TRANSITION"
      | "INVALID_TYPE"
      | "TEXT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "SupportTicketDomainError";
  }
}

export function createSupportTicketDraft(input: SupportTicketDraftInput): SupportTicketDraft {
  const requesterUserId = normalizeRequiredIdentifier(input.requesterUserId, "Talep sahibi");
  const requestKey = normalizeRequestKey(input.requestKey);
  return {
    initialMessage: normalizeRequiredMessage(input.initialMessage, "İlk destek mesajı"),
    priority: normalizeSupportTicketPriority(input.priority),
    requesterUserId,
    status: "OPEN",
    subject: normalizeRequiredSubject(input.subject),
    ticketKey: getSupportTicketRequestKey({ requestKey, requesterUserId }),
    type: normalizeSupportTicketType(input.type),
  };
}

export function createSupportTicketMessageDraft(
  input: SupportTicketMessageDraftInput,
): SupportTicketMessageDraft {
  const authorUserId = normalizeRequiredIdentifier(input.authorUserId, "Mesaj yazarı");
  const ticketId = normalizeRequiredIdentifier(input.ticketId, "Destek talebi");
  const requestKey = normalizeRequestKey(input.requestKey);
  return {
    authorUserId,
    body: normalizeRequiredMessage(input.body, "Destek mesajı"),
    messageKey: getSupportTicketMessageRequestKey({ authorUserId, requestKey, ticketId }),
    ticketId,
  };
}

export function getSupportTicketRequestKey(input: {
  requestKey: string;
  requesterUserId: string;
}) {
  return joinKey([
    normalizeRequiredIdentifier(input.requesterUserId, "Talep sahibi"),
    normalizeRequestKey(input.requestKey),
  ]);
}

export function getSupportTicketMessageRequestKey(input: {
  authorUserId: string;
  requestKey: string;
  ticketId: string;
}) {
  return joinKey([
    normalizeRequiredIdentifier(input.ticketId, "Destek talebi"),
    normalizeRequiredIdentifier(input.authorUserId, "Mesaj yazarı"),
    normalizeRequestKey(input.requestKey),
  ]);
}

export function getSupportTicketVisibility(input: {
  actorUserId: string;
  role: TenantUserRole;
}): SupportTicketVisibility {
  const actorUserId = normalizeRequiredIdentifier(input.actorUserId, "Aktif kullanıcı");
  return input.role === "admin"
    ? { mode: "scope" }
    : { mode: "own", requesterUserId: actorUserId };
}

export function getSupportTicketPermission(input: {
  actorUserId: string;
  operation: SupportTicketOperation;
  requesterUserId?: string | null;
  role: TenantUserRole;
  status?: SupportTicketStatus;
}) {
  const actorUserId = normalizeRequiredIdentifier(input.actorUserId, "Aktif kullanıcı");
  if (input.operation === "create" || input.operation === "list") {
    return { allowed: true as const };
  }
  if (input.operation === "transition") {
    return input.role === "admin"
      ? { allowed: true as const }
      : { allowed: false as const, reason: "Destek talebi durumunu yalnız yönetici değiştirebilir." };
  }
  const status = normalizeSupportTicketStatus(input.status);
  if (status === "CLOSED") {
    return { allowed: false as const, reason: "Kapatılmış destek talebine mesaj eklenemez." };
  }
  const requesterUserId = normalizeRequiredIdentifier(input.requesterUserId, "Talep sahibi");
  if (input.role === "admin" || requesterUserId === actorUserId) {
    return { allowed: true as const };
  }
  return { allowed: false as const, reason: "Yalnız kendi destek talebinize mesaj ekleyebilirsiniz." };
}

export function canTransitionSupportTicketStatus(
  from: SupportTicketStatus,
  to: SupportTicketStatus,
) {
  return (
    (from === "OPEN" && to === "IN_PROGRESS")
    || (from === "IN_PROGRESS" && to === "RESOLVED")
    || (from === "RESOLVED" && to === "CLOSED")
  );
}

export function assertSupportTicketTransition(
  from: SupportTicketStatus,
  to: SupportTicketStatus,
) {
  if (!canTransitionSupportTicketStatus(from, to)) {
    throw new SupportTicketDomainError(
      "INVALID_TRANSITION",
      "Destek talebi yalnız Açık → İşlemde → Çözüldü → Kapatıldı sırasıyla ilerleyebilir.",
    );
  }
  return { from, to };
}

export function normalizeSupportTicketStatus(value: unknown): SupportTicketStatus {
  if (isOneOf(value, SUPPORT_TICKET_STATUSES)) return value;
  throw new SupportTicketDomainError("INVALID_STATUS", "Destek talebi durumu geçersizdir.");
}

export function normalizeSupportTicketText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeSupportTicketMessage(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .join("\n")
    .trim();
}

function normalizeRequiredSubject(value: unknown) {
  const normalized = normalizeSupportTicketText(value);
  if (!normalized) {
    throw new SupportTicketDomainError("INVALID_INPUT", "Destek talebi konusu zorunludur.");
  }
  if (normalized.length > SUPPORT_TICKET_MAX_SUBJECT_LENGTH) {
    throw new SupportTicketDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `Destek talebi konusu en fazla ${SUPPORT_TICKET_MAX_SUBJECT_LENGTH} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeRequiredMessage(value: unknown, label: string) {
  const normalized = normalizeSupportTicketMessage(value);
  if (!normalized) {
    throw new SupportTicketDomainError("INVALID_INPUT", `${label} zorunludur.`);
  }
  if (normalized.length > SUPPORT_TICKET_MAX_MESSAGE_LENGTH) {
    throw new SupportTicketDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `${label} en fazla ${SUPPORT_TICKET_MAX_MESSAGE_LENGTH} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeRequestKey(value: unknown) {
  const normalized = normalizeSupportTicketText(value);
  if (!normalized) {
    throw new SupportTicketDomainError("INVALID_INPUT", "İstek anahtarı zorunludur.");
  }
  if (normalized.length > SUPPORT_TICKET_MAX_REQUEST_KEY_LENGTH) {
    throw new SupportTicketDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `İstek anahtarı en fazla ${SUPPORT_TICKET_MAX_REQUEST_KEY_LENGTH} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeRequiredIdentifier(value: unknown, label: string) {
  const normalized = normalizeSupportTicketText(value);
  if (!normalized) {
    throw new SupportTicketDomainError("INVALID_INPUT", `${label} zorunludur.`);
  }
  return normalized;
}

function normalizeSupportTicketPriority(value: unknown): SupportTicketPriority {
  if (isOneOf(value, SUPPORT_TICKET_PRIORITIES)) return value;
  throw new SupportTicketDomainError("INVALID_PRIORITY", "Destek talebi önceliği geçersizdir.");
}

function normalizeSupportTicketType(value: unknown): SupportTicketType {
  if (isOneOf(value, SUPPORT_TICKET_TYPES)) return value;
  throw new SupportTicketDomainError("INVALID_TYPE", "Destek talebi türü geçersizdir.");
}

function joinKey(parts: string[]) {
  return parts.map((part) => encodeURIComponent(part)).join("::");
}

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.includes(value);
}
