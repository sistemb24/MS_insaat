import { createHash, randomBytes, randomUUID } from "node:crypto";

import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  WEBHOOK_DELIVERY_EVENT_TYPES,
  type WebhookDeliveryEventType,
} from "./webhook-delivery-events";
import type { TenantScope } from "./tenant-scope";

export type WebhookEndpointRow = {
  companyId: string;
  createdAt: string;
  createdBy: string;
  eventTypes: WebhookDeliveryEventType[];
  id: string;
  isActive: boolean;
  name: string;
  periodId: string;
  secretPrefix: string;
  tenantId: string;
  updatedAt: string;
  url: string;
};

export type WebhookEndpointRecord = Omit<WebhookEndpointRow, "updatedAt"> & {
  secretHash: string;
};

export type CreateWebhookEndpointValues = {
  eventTypes: string[];
  name: string;
  url: string;
};

export type UpdateWebhookEndpointValues = CreateWebhookEndpointValues;

export type WebhookEndpointRepository = {
  countByScope?(input: { scope: TenantScope }): Promise<number>;
  create(input: { record: WebhookEndpointRecord }): Promise<WebhookEndpointRow>;
  deactivate(input: {
    id: string;
    scope: TenantScope;
    updatedAtIso: string;
  }): Promise<WebhookEndpointRow | null>;
  activate(input: {
    id: string;
    scope: TenantScope;
    updatedAtIso: string;
  }): Promise<WebhookEndpointRow | null>;
  rotateSecret(input: {
    id: string;
    scope: TenantScope;
    secretHash: string;
    secretPrefix: string;
    updatedAtIso: string;
  }): Promise<WebhookEndpointRow | null>;
  update(input: {
    id: string;
    scope: TenantScope;
    values: UpdateWebhookEndpointValues;
    updatedAtIso: string;
  }): Promise<WebhookEndpointRow | null>;
  list(input: { scope: TenantScope }): Promise<WebhookEndpointRow[]>;
};

export type WebhookEndpointOverview = {
  rows: WebhookEndpointRow[];
  summary: {
    activeCount: number;
    inactiveCount: number;
    totalCount: number;
  };
};

type WebhookEndpointServiceDependencies = {
  auditLogRepository: AuditLogRepository;
  generateId?: () => string;
  generateSecret?: () => string;
  now?: () => Date;
  repository: WebhookEndpointRepository;
};

const allowedEventTypeSet = new Set<string>(
  WEBHOOK_DELIVERY_EVENT_TYPES.map((eventType) => eventType.type),
);

export function createWebhookEndpointService({
  auditLogRepository,
  generateId = randomUUID,
  generateSecret = generateWebhookEndpointSecret,
  now = () => new Date(),
  repository,
}: WebhookEndpointServiceDependencies) {
  return {
    async listOverview(input: { scope: TenantScope }) {
      const rows = await repository.list({ scope: input.scope });

      return {
        ok: true as const,
        data: {
          overview: {
            rows,
            summary: {
              activeCount: rows.filter((row) => row.isActive).length,
              inactiveCount: rows.filter((row) => !row.isActive).length,
              totalCount: rows.length,
            },
          } satisfies WebhookEndpointOverview,
        },
      };
    },

    async createEndpoint(input: {
      scope: TenantScope;
      values: CreateWebhookEndpointValues;
    }) {
      if (input.scope.userRole !== "admin") {
        return {
          ok: false as const,
          errors: ["Webhook endpoint oluşturma yetkisi yalnız admin rolündedir."],
        };
      }

      const normalized = normalizeCreateWebhookEndpointValues(input.values);
      const nowDate = now();
      const errors = validateCreateWebhookEndpointValues(normalized);

      if (errors.length > 0) {
        return { ok: false as const, errors };
      }

      const secret = generateSecret();
      const nowIso = nowDate.toISOString();

      try {
        const row = await repository.create({
          record: {
            companyId: input.scope.companyId,
            createdAt: nowIso,
            createdBy: input.scope.userId,
            eventTypes: normalized.eventTypes,
            id: generateId(),
            isActive: true,
            name: normalized.name,
            periodId: input.scope.periodId,
            secretHash: hashWebhookEndpointSecret(secret),
            secretPrefix: getWebhookEndpointSecretPrefix(secret),
            tenantId: input.scope.tenantId,
            url: normalized.url,
          },
        });

        await auditLogRepository.record(
          createAuditLogEntry(input.scope, {
            action: "webhook-endpoint.create",
            entityId: row.id,
            entityLabel: row.name,
            entityType: "webhook-endpoint",
            metadata: {
              eventTypes: row.eventTypes,
              isActive: row.isActive,
              secretPrefix: row.secretPrefix,
              url: row.url,
            },
            occurredAt: nowIso,
          }),
        );

        return {
          ok: true as const,
          data: { row, secret },
        };
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return {
            ok: false as const,
            errors: ["Webhook endpoint adı bu kapsamda zaten kullanılıyor."],
          };
        }

        throw error;
      }
    },

    async deactivateEndpoint(input: { id: string; scope: TenantScope }) {
      if (input.scope.userRole !== "admin") {
        return {
          ok: false as const,
          errors: ["Webhook endpoint pasifleştirme yetkisi yalnız admin rolündedir."],
        };
      }

      const id = input.id.trim();

      if (!id) {
        return {
          ok: false as const,
          errors: ["Webhook endpoint kimliği zorunludur."],
        };
      }

      const nowIso = now().toISOString();
      const row = await repository.deactivate({
        id,
        scope: input.scope,
        updatedAtIso: nowIso,
      });

      if (!row) {
        return {
          ok: false as const,
          errors: ["Aktif webhook endpoint bulunamadı."],
        };
      }

      await auditLogRepository.record(
        createAuditLogEntry(input.scope, {
          action: "webhook-endpoint.deactivate",
          entityId: row.id,
          entityLabel: row.name,
          entityType: "webhook-endpoint",
          metadata: {
            eventTypes: row.eventTypes,
            isActive: row.isActive,
            secretPrefix: row.secretPrefix,
            url: row.url,
          },
          occurredAt: nowIso,
        }),
      );

      return {
        ok: true as const,
        data: { row },
      };
    },

    async activateEndpoint(input: { id: string; scope: TenantScope }) {
      if (input.scope.userRole !== "admin") {
        return {
          ok: false as const,
          errors: ["Webhook endpoint aktifleştirme yetkisi yalnız admin rolündedir."],
        };
      }

      const id = input.id.trim();

      if (!id) {
        return {
          ok: false as const,
          errors: ["Webhook endpoint kimliği zorunludur."],
        };
      }

      const nowIso = now().toISOString();
      const row = await repository.activate({
        id,
        scope: input.scope,
        updatedAtIso: nowIso,
      });

      if (!row) {
        return {
          ok: false as const,
          errors: ["Pasif webhook endpoint bulunamadı."],
        };
      }

      await auditLogRepository.record(
        createAuditLogEntry(input.scope, {
          action: "webhook-endpoint.activate",
          entityId: row.id,
          entityLabel: row.name,
          entityType: "webhook-endpoint",
          metadata: {
            eventTypes: row.eventTypes,
            isActive: row.isActive,
            secretPrefix: row.secretPrefix,
            url: row.url,
          },
          occurredAt: nowIso,
        }),
      );

      return {
        ok: true as const,
        data: { row },
      };
    },

    async rotateSecretEndpoint(input: { id: string; scope: TenantScope }) {
      if (input.scope.userRole !== "admin") {
        return {
          ok: false as const,
          errors: ["Webhook endpoint secret yenileme yetkisi yalnız admin rolündedir."],
        };
      }

      const id = input.id.trim();

      if (!id) {
        return {
          ok: false as const,
          errors: ["Webhook endpoint kimliği zorunludur."],
        };
      }

      const secret = generateSecret();
      const nowIso = now().toISOString();

      const row = await repository.rotateSecret({
        id,
        scope: input.scope,
        secretHash: hashWebhookEndpointSecret(secret),
        secretPrefix: getWebhookEndpointSecretPrefix(secret),
        updatedAtIso: nowIso,
      });

      if (!row) {
        return {
          ok: false as const,
          errors: ["Webhook endpoint bulunamadı."],
        };
      }

      await auditLogRepository.record(
        createAuditLogEntry(input.scope, {
          action: "webhook-endpoint.rotate-secret",
          entityId: row.id,
          entityLabel: row.name,
          entityType: "webhook-endpoint",
          metadata: {
            eventTypes: row.eventTypes,
            isActive: row.isActive,
            secretPrefix: row.secretPrefix,
            url: row.url,
          },
          occurredAt: nowIso,
        }),
      );

      return {
        ok: true as const,
        data: { row, secret },
      };
    },

    async updateEndpoint(input: {
      id: string;
      scope: TenantScope;
      values: UpdateWebhookEndpointValues;
    }) {
      if (input.scope.userRole !== "admin") {
        return {
          ok: false as const,
          errors: ["Webhook endpoint düzenleme yetkisi yalnız admin rolündedir."],
        };
      }

      const id = input.id.trim();

      if (!id) {
        return {
          ok: false as const,
          errors: ["Webhook endpoint kimliği zorunludur."],
        };
      }

      const normalized = normalizeCreateWebhookEndpointValues(input.values);
      const errors = validateCreateWebhookEndpointValues(normalized);

      if (errors.length > 0) {
        return { ok: false as const, errors };
      }

      const nowIso = now().toISOString();

      try {
        const row = await repository.update({
          id,
          scope: input.scope,
          values: normalized,
          updatedAtIso: nowIso,
        });

        if (!row) {
          return {
            ok: false as const,
            errors: ["Webhook endpoint bulunamadı."],
          };
        }

        await auditLogRepository.record(
          createAuditLogEntry(input.scope, {
            action: "webhook-endpoint.update",
            entityId: row.id,
            entityLabel: row.name,
            entityType: "webhook-endpoint",
            metadata: {
              eventTypes: row.eventTypes,
              isActive: row.isActive,
              secretPrefix: row.secretPrefix,
              url: row.url,
            },
            occurredAt: nowIso,
          }),
        );

        return {
          ok: true as const,
          data: { row },
        };
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return {
            ok: false as const,
            errors: ["Webhook endpoint adı bu kapsamda zaten kullanılıyor."],
          };
        }

        throw error;
      }
    },
  };
}

export function normalizeCreateWebhookEndpointValues(
  values: CreateWebhookEndpointValues,
): CreateWebhookEndpointValues & { eventTypes: WebhookDeliveryEventType[] } {
  const uniqueEventTypes = new Set(
    values.eventTypes.map((eventType) => eventType.trim()).filter(Boolean),
  );

  return {
    eventTypes: WEBHOOK_DELIVERY_EVENT_TYPES.map((eventType) => eventType.type).filter(
      (eventType) => uniqueEventTypes.has(eventType),
    ),
    name: values.name.trim().replace(/\s+/g, " "),
    url: values.url.trim(),
  };
}

export function validateCreateWebhookEndpointValues(
  values: ReturnType<typeof normalizeCreateWebhookEndpointValues>,
) {
  const errors: string[] = [];

  if (values.name.length < 3 || values.name.length > 80) {
    errors.push("Webhook endpoint adı 3 ile 80 karakter arasında olmalıdır.");
  }

  if (!isValidWebhookEndpointUrl(values.url)) {
    errors.push("Webhook URL'si geçerli bir HTTPS adresi olmalıdır.");
  }

  if (values.eventTypes.length === 0) {
    errors.push("En az bir webhook olayı seçilmelidir.");
  }

  if (values.eventTypes.some((eventType) => !allowedEventTypeSet.has(eventType))) {
    errors.push("Geçersiz webhook olayı seçildi.");
  }

  return errors;
}

export function hashWebhookEndpointSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function getWebhookEndpointSecretPrefix(secret: string) {
  return secret.slice(0, 16);
}

export function generateWebhookEndpointSecret() {
  return `noa_whsec_${randomBytes(24).toString("base64url")}`;
}

function isValidWebhookEndpointUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol === "https:") {
      return true;
    }

    if (url.protocol === "http:") {
      return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    }

    return false;
  } catch {
    return false;
  }
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002",
  );
}
