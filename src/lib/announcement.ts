import type { TenantUserRole } from "./tenant-scope";

export const ANNOUNCEMENT_MAX_CONTENT_LENGTH = 8_000;
export const ANNOUNCEMENT_MAX_REQUEST_KEY_LENGTH = 200;
export const ANNOUNCEMENT_MAX_SUMMARY_LENGTH = 500;
export const ANNOUNCEMENT_MAX_TITLE_LENGTH = 180;
export const ANNOUNCEMENT_NEW_BADGE_DAYS = 14;

export const ANNOUNCEMENT_CATEGORIES = [
  "ANNOUNCEMENT",
  "MAINTENANCE",
  "UPDATE",
  "NEWS",
] as const;
export const ANNOUNCEMENT_PRIORITIES = ["NORMAL", "IMPORTANT"] as const;
export const ANNOUNCEMENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];
export type AnnouncementOperation = "archive" | "create" | "list" | "publish" | "update" | "view";
export type AnnouncementVisibility = { mode: "all" } | { mode: "published" };

export type AnnouncementDraftInput = {
  category: AnnouncementCategory;
  content: string;
  priority: AnnouncementPriority;
  requestKey: string;
  summary: string;
  title: string;
};

export type AnnouncementDraft = Omit<AnnouncementDraftInput, "requestKey"> & {
  announcementKey: string;
  revisionNo: 1;
  status: "DRAFT";
};

export type AnnouncementUpdateInput = Omit<AnnouncementDraftInput, "requestKey"> & {
  announcementId: string;
  expectedRevisionNo: number;
  requestKey: string;
};

export class AnnouncementDomainError extends Error {
  constructor(
    public readonly code:
      | "INVALID_CATEGORY"
      | "INVALID_INPUT"
      | "INVALID_PRIORITY"
      | "INVALID_REVISION"
      | "INVALID_STATUS"
      | "INVALID_TRANSITION"
      | "TEXT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "AnnouncementDomainError";
  }
}

export function createAnnouncementDraft(
  input: AnnouncementDraftInput & { actorUserId: string },
): AnnouncementDraft {
  const actorUserId = normalizeIdentifier(input.actorUserId, "Aktif kullanıcı");
  return {
    announcementKey: getAnnouncementCreateRequestKey({
      actorUserId,
      requestKey: input.requestKey,
    }),
    category: normalizeAnnouncementCategory(input.category),
    content: normalizeContent(input.content),
    priority: normalizeAnnouncementPriority(input.priority),
    revisionNo: 1,
    status: "DRAFT",
    summary: normalizeSummary(input.summary),
    title: normalizeTitle(input.title),
  };
}

export function normalizeAnnouncementUpdate(input: AnnouncementUpdateInput) {
  return {
    announcementId: normalizeIdentifier(input.announcementId, "Duyuru"),
    category: normalizeAnnouncementCategory(input.category),
    content: normalizeContent(input.content),
    expectedRevisionNo: normalizeRevision(input.expectedRevisionNo),
    mutationKey: normalizeRequestKey(input.requestKey),
    priority: normalizeAnnouncementPriority(input.priority),
    summary: normalizeSummary(input.summary),
    title: normalizeTitle(input.title),
  };
}

export function getAnnouncementCreateRequestKey(input: {
  actorUserId: string;
  requestKey: string;
}) {
  return joinKey([
    normalizeIdentifier(input.actorUserId, "Aktif kullanıcı"),
    normalizeRequestKey(input.requestKey),
  ]);
}

export function getAnnouncementMutationRequestKey(input: {
  actorUserId: string;
  announcementId: string;
  operation: "archive" | "publish" | "update";
  requestKey: string;
}) {
  return joinKey([
    normalizeIdentifier(input.announcementId, "Duyuru"),
    normalizeIdentifier(input.actorUserId, "Aktif kullanıcı"),
    input.operation,
    normalizeRequestKey(input.requestKey),
  ]);
}

export function getAnnouncementVisibility(role: TenantUserRole): AnnouncementVisibility {
  return role === "admin" ? { mode: "all" } : { mode: "published" };
}

export function getAnnouncementPermission(input: {
  operation: AnnouncementOperation;
  periodClosed: boolean;
  role: TenantUserRole;
}) {
  if (input.operation === "list" || input.operation === "view") {
    return { allowed: true as const };
  }
  if (input.role !== "admin") {
    return {
      allowed: false as const,
      reason: "Bilgi Merkezi duyurularını yalnız yönetici düzenleyebilir.",
    };
  }
  if (input.periodClosed) {
    return {
      allowed: false as const,
      reason: "Kapalı dönemde Bilgi Merkezi duyurusu değiştirilemez.",
    };
  }
  return { allowed: true as const };
}

export function assertAnnouncementTransition(
  from: AnnouncementStatus,
  to: AnnouncementStatus,
) {
  if (
    !(
      (from === "DRAFT" && to === "PUBLISHED")
      || (from === "PUBLISHED" && to === "ARCHIVED")
    )
  ) {
    throw new AnnouncementDomainError(
      "INVALID_TRANSITION",
      "Duyuru yalnız Taslak → Yayımlandı → Arşivlendi sırasıyla ilerleyebilir.",
    );
  }
  return { from, to };
}

export function isAnnouncementNew(input: {
  now: string;
  publishedAt: string | null;
}) {
  if (!input.publishedAt) return false;
  const publishedAt = new Date(input.publishedAt).getTime();
  const now = new Date(input.now).getTime();
  if (!Number.isFinite(publishedAt) || !Number.isFinite(now) || now < publishedAt) return false;
  return now - publishedAt < ANNOUNCEMENT_NEW_BADGE_DAYS * 24 * 60 * 60 * 1_000;
}

export function normalizeAnnouncementStatus(value: unknown): AnnouncementStatus {
  if (isOneOf(value, ANNOUNCEMENT_STATUSES)) return value;
  throw new AnnouncementDomainError("INVALID_STATUS", "Duyuru durumu geçersizdir.");
}

export function normalizeAnnouncementCategory(value: unknown): AnnouncementCategory {
  if (isOneOf(value, ANNOUNCEMENT_CATEGORIES)) return value;
  throw new AnnouncementDomainError("INVALID_CATEGORY", "Duyuru kategorisi geçersizdir.");
}

export function normalizeAnnouncementPriority(value: unknown): AnnouncementPriority {
  if (isOneOf(value, ANNOUNCEMENT_PRIORITIES)) return value;
  throw new AnnouncementDomainError("INVALID_PRIORITY", "Duyuru önceliği geçersizdir.");
}

function normalizeTitle(value: unknown) {
  return normalizeRequiredSingleLine(value, "Duyuru başlığı", ANNOUNCEMENT_MAX_TITLE_LENGTH);
}

function normalizeSummary(value: unknown) {
  return normalizeRequiredSingleLine(value, "Duyuru özeti", ANNOUNCEMENT_MAX_SUMMARY_LENGTH);
}

function normalizeContent(value: unknown) {
  const normalized = String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .join("\n")
    .trim();
  if (!normalized) {
    throw new AnnouncementDomainError("INVALID_INPUT", "Duyuru içeriği zorunludur.");
  }
  if (normalized.length > ANNOUNCEMENT_MAX_CONTENT_LENGTH) {
    throw new AnnouncementDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `Duyuru içeriği en fazla ${ANNOUNCEMENT_MAX_CONTENT_LENGTH} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeRequiredSingleLine(value: unknown, label: string, maxLength: number) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new AnnouncementDomainError("INVALID_INPUT", `${label} zorunludur.`);
  }
  if (normalized.length > maxLength) {
    throw new AnnouncementDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `${label} en fazla ${maxLength} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeRequestKey(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new AnnouncementDomainError("INVALID_INPUT", "İstek anahtarı zorunludur.");
  }
  if (normalized.length > ANNOUNCEMENT_MAX_REQUEST_KEY_LENGTH) {
    throw new AnnouncementDomainError(
      "TEXT_LIMIT_EXCEEDED",
      `İstek anahtarı en fazla ${ANNOUNCEMENT_MAX_REQUEST_KEY_LENGTH} karakter olabilir.`,
    );
  }
  return normalized;
}

function normalizeIdentifier(value: unknown, label: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new AnnouncementDomainError("INVALID_INPUT", `${label} zorunludur.`);
  }
  return normalized;
}

function normalizeRevision(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new AnnouncementDomainError(
      "INVALID_REVISION",
      "Duyuru revizyon numarası geçersizdir.",
    );
  }
  return Number(value);
}

function joinKey(parts: string[]) {
  return parts.map((part) => encodeURIComponent(part)).join("::");
}

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.includes(value);
}
