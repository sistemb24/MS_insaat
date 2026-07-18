import { describe, expect, test, vi } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import {
  createWebhookEndpointService,
  hashWebhookEndpointSecret,
  normalizeCreateWebhookEndpointValues,
  type CreateWebhookEndpointValues,
  type WebhookEndpointRepository,
  type WebhookEndpointRow,
} from "./webhook-endpoint-service";

const adminScope = { ...defaultTenantScope, userRole: "admin" as const };
const fixedNow = new Date("2026-07-12T10:00:00.000Z");

function createDependencies() {
  const record = vi.fn();
  const create = vi.fn(async ({ record: input }) =>
    ({
      companyId: input.companyId,
      createdAt: input.createdAt,
      createdBy: input.createdBy,
      eventTypes: input.eventTypes as WebhookEndpointRow["eventTypes"],
      id: input.id,
      isActive: input.isActive,
      name: input.name,
      periodId: input.periodId,
      secretPrefix: input.secretPrefix,
      tenantId: input.tenantId,
      updatedAt: input.createdAt,
      url: input.url,
    } satisfies WebhookEndpointRow),
  );
  const deactivate = vi.fn(async ({ updatedAtIso }: { updatedAtIso: string }) =>
    ({
      companyId: adminScope.companyId,
      createdAt: updatedAtIso,
      createdBy: adminScope.userId,
      eventTypes: ["invoice.created"] as WebhookEndpointRow["eventTypes"],
      id: "webhook-endpoint-1",
      isActive: false,
      name: "Fatura Bildirimi",
      periodId: adminScope.periodId,
      secretPrefix: "noa_whsec_123456",
      tenantId: adminScope.tenantId,
      updatedAt: updatedAtIso,
      url: "https://hooks.example.com/webhooks/noa",
    } satisfies WebhookEndpointRow),
  );
  const activate = vi.fn(async ({ updatedAtIso }: { updatedAtIso: string }) =>
    ({
      companyId: adminScope.companyId,
      createdAt: "2026-07-12T10:00:00.000Z",
      createdBy: adminScope.userId,
      eventTypes: ["invoice.created"] as WebhookEndpointRow["eventTypes"],
      id: "webhook-endpoint-1",
      isActive: true,
      name: "Fatura Bildirimi",
      periodId: adminScope.periodId,
      secretPrefix: "noa_whsec_123456",
      tenantId: adminScope.tenantId,
      updatedAt: updatedAtIso,
      url: "https://hooks.example.com/webhooks/noa",
    } satisfies WebhookEndpointRow),
  );
  const rotateSecret = vi.fn(
    async ({
      secretPrefix,
      updatedAtIso,
    }: {
      secretHash: string;
      secretPrefix: string;
      updatedAtIso: string;
    }) =>
      ({
        companyId: adminScope.companyId,
        createdAt: "2026-07-12T10:00:00.000Z",
        createdBy: adminScope.userId,
        eventTypes: ["invoice.created"] as WebhookEndpointRow["eventTypes"],
        id: "webhook-endpoint-1",
        isActive: true,
        name: "Fatura Bildirimi",
        periodId: adminScope.periodId,
        secretPrefix,
        tenantId: adminScope.tenantId,
        updatedAt: updatedAtIso,
        url: "https://hooks.example.com/webhooks/noa",
      } satisfies WebhookEndpointRow),
  );
  const update = vi.fn(
    async ({
      values,
      updatedAtIso,
    }: {
      values: CreateWebhookEndpointValues;
      updatedAtIso: string;
    }) =>
    ({
      companyId: adminScope.companyId,
      createdAt: "2026-07-12T10:00:00.000Z",
      createdBy: adminScope.userId,
      eventTypes: values.eventTypes as WebhookEndpointRow["eventTypes"],
      id: "webhook-endpoint-1",
      isActive: true,
      name: values.name,
      periodId: adminScope.periodId,
      secretPrefix: "noa_whsec_123456",
      tenantId: adminScope.tenantId,
      updatedAt: updatedAtIso,
      url: values.url,
    } satisfies WebhookEndpointRow),
  );
  const list = vi.fn(async () => [] as WebhookEndpointRow[]);
  const repository = { activate, create, deactivate, list, rotateSecret, update } satisfies WebhookEndpointRepository;

  return {
    create,
    activate,
    deactivate,
    rotateSecret,
    update,
    record,
    repository,
    service: createWebhookEndpointService({
      auditLogRepository: { record },
      generateId: () => "webhook-endpoint-1",
      generateSecret: () => "noa_whsec_1234567890abcdefghijklmnop",
      now: () => fixedNow,
      repository,
    }),
  };
}

describe("webhook endpoint service", () => {
  test("creates a scoped webhook endpoint and audits without the secret", async () => {
    const dependencies = createDependencies();
    const result = await dependencies.service.createEndpoint({
      scope: adminScope,
      values: {
        eventTypes: ["invoice.created", "bank.transaction.matched"],
        name: "  Fatura Bildirimi  ",
        url: "https://hooks.example.com/webhooks/noa",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.secret).toBe("noa_whsec_1234567890abcdefghijklmnop");
    expect(dependencies.create).toHaveBeenCalledWith(
      expect.objectContaining({
        record: expect.objectContaining({
          companyId: adminScope.companyId,
          eventTypes: ["invoice.created", "bank.transaction.matched"],
          name: "Fatura Bildirimi",
          secretHash: hashWebhookEndpointSecret(result.data.secret),
          tenantId: adminScope.tenantId,
          url: "https://hooks.example.com/webhooks/noa",
        }),
      }),
    );
    expect(JSON.stringify(dependencies.record.mock.calls)).not.toContain(result.data.secret);
    expect(dependencies.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "webhook-endpoint.create",
        entityType: "webhook-endpoint",
        metadata: expect.objectContaining({
          eventTypes: ["invoice.created", "bank.transaction.matched"],
          secretPrefix: "noa_whsec_123456",
        }),
      }),
    );
  });

  test("rejects invalid endpoint values before persistence", async () => {
    const dependencies = createDependencies();
    const result = await dependencies.service.createEndpoint({
      scope: adminScope,
      values: {
        eventTypes: ["unknown"],
        name: "x",
        url: "ftp://hooks.example.com/webhooks/noa",
      },
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "Webhook endpoint adı 3 ile 80 karakter arasında olmalıdır.",
        "Webhook URL'si geçerli bir HTTPS adresi olmalıdır.",
        "En az bir webhook olayı seçilmelidir.",
      ],
    });
    expect(dependencies.create).not.toHaveBeenCalled();
    expect(dependencies.record).not.toHaveBeenCalled();
  });

  test("allows only admins to create webhook endpoints", async () => {
    const dependencies = createDependencies();
    const accountingScope = { ...adminScope, userRole: "accounting" as const };

    expect(
      await dependencies.service.createEndpoint({
        scope: accountingScope,
        values: {
          eventTypes: ["invoice.created"],
          name: "Webhook",
          url: "https://hooks.example.com/webhooks/noa",
        },
      }),
    ).toEqual({
      ok: false,
      errors: ["Webhook endpoint oluşturma yetkisi yalnız admin rolündedir."],
    });
  });

  test("deactivates an active webhook endpoint and records the lifecycle audit event", async () => {
    const dependencies = createDependencies();
    const result = await dependencies.service.deactivateEndpoint({
      id: " webhook-endpoint-1 ",
      scope: adminScope,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(dependencies.deactivate).toHaveBeenCalledWith({
      id: "webhook-endpoint-1",
      scope: adminScope,
      updatedAtIso: fixedNow.toISOString(),
    });
    expect(dependencies.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "webhook-endpoint.deactivate",
        entityId: "webhook-endpoint-1",
        entityType: "webhook-endpoint",
      }),
    );
  });

  test("requires admin role and a webhook endpoint id before deactivation", async () => {
    const dependencies = createDependencies();
    const accountingScope = { ...adminScope, userRole: "accounting" as const };

    expect(
      await dependencies.service.deactivateEndpoint({
        id: "webhook-endpoint-1",
        scope: accountingScope,
      }),
    ).toEqual({
      ok: false,
      errors: ["Webhook endpoint pasifleştirme yetkisi yalnız admin rolündedir."],
    });

    expect(
      await dependencies.service.deactivateEndpoint({ id: "  ", scope: adminScope }),
    ).toEqual({
      ok: false,
      errors: ["Webhook endpoint kimliği zorunludur."],
    });
  });

  test("activates a passive webhook endpoint and records the lifecycle audit event", async () => {
    const dependencies = createDependencies();
    const result = await dependencies.service.activateEndpoint({
      id: " webhook-endpoint-1 ",
      scope: adminScope,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(dependencies.activate).toHaveBeenCalledWith({
      id: "webhook-endpoint-1",
      scope: adminScope,
      updatedAtIso: fixedNow.toISOString(),
    });
    expect(dependencies.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "webhook-endpoint.activate",
        entityId: "webhook-endpoint-1",
        entityType: "webhook-endpoint",
      }),
    );
  });

  test("requires admin role and a webhook endpoint id before activation", async () => {
    const dependencies = createDependencies();
    const accountingScope = { ...adminScope, userRole: "accounting" as const };

    await expect(
      dependencies.service.activateEndpoint({
        id: "webhook-endpoint-1",
        scope: accountingScope,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Webhook endpoint aktifleştirme yetkisi yalnız admin rolündedir."],
    });

    await expect(
      dependencies.service.activateEndpoint({ id: " ", scope: adminScope }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Webhook endpoint kimliği zorunludur."],
    });
  });

  test("updates a webhook endpoint and records the lifecycle audit event", async () => {
    const dependencies = createDependencies();
    const result = await dependencies.service.updateEndpoint({
      id: " webhook-endpoint-1 ",
      scope: adminScope,
      values: {
        eventTypes: ["invoice.created"],
        name: "Fatura Bildirimi Güncel",
        url: "https://hooks.example.com/webhooks/guncel",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(dependencies.update).toHaveBeenCalledWith({
      id: "webhook-endpoint-1",
      scope: adminScope,
      values: {
        eventTypes: ["invoice.created"],
        name: "Fatura Bildirimi Güncel",
        url: "https://hooks.example.com/webhooks/guncel",
      },
      updatedAtIso: fixedNow.toISOString(),
    });
    expect(dependencies.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "webhook-endpoint.update",
        entityId: "webhook-endpoint-1",
        entityType: "webhook-endpoint",
      }),
    );
  });

  test("requires admin role and valid endpoint values before update", async () => {
    const dependencies = createDependencies();
    const accountingScope = { ...adminScope, userRole: "accounting" as const };

    expect(
      await dependencies.service.updateEndpoint({
        id: "webhook-endpoint-1",
        scope: accountingScope,
        values: {
          eventTypes: ["invoice.created"],
          name: "Webhook",
          url: "https://hooks.example.com/webhooks/noa",
        },
      }),
    ).toEqual({
      ok: false,
      errors: ["Webhook endpoint düzenleme yetkisi yalnız admin rolündedir."],
    });

    expect(
      await dependencies.service.updateEndpoint({
        id: " ",
        scope: adminScope,
        values: {
          eventTypes: ["invoice.created"],
          name: "Webhook",
          url: "https://hooks.example.com/webhooks/noa",
        },
      }),
    ).toEqual({
      ok: false,
      errors: ["Webhook endpoint kimliği zorunludur."],
    });

    expect(
      await dependencies.service.updateEndpoint({
        id: "webhook-endpoint-1",
        scope: adminScope,
        values: {
          eventTypes: [],
          name: "x",
          url: "http://hooks.example.com/webhooks/noa",
        },
      }),
    ).toEqual({
      ok: false,
      errors: [
        "Webhook endpoint adı 3 ile 80 karakter arasında olmalıdır.",
        "Webhook URL'si geçerli bir HTTPS adresi olmalıdır.",
        "En az bir webhook olayı seçilmelidir.",
      ],
    });
  });

  test("rotates a webhook endpoint secret and records the lifecycle audit event", async () => {
    const dependencies = createDependencies();
    const result = await dependencies.service.rotateSecretEndpoint({
      id: " webhook-endpoint-1 ",
      scope: adminScope,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(dependencies.rotateSecret).toHaveBeenCalledWith({
      id: "webhook-endpoint-1",
      scope: adminScope,
      secretHash: expect.any(String),
      secretPrefix: "noa_whsec_123456",
      updatedAtIso: fixedNow.toISOString(),
    });
    expect(result.data.secret).toBe("noa_whsec_1234567890abcdefghijklmnop");
    expect(dependencies.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "webhook-endpoint.rotate-secret",
        entityId: "webhook-endpoint-1",
        entityType: "webhook-endpoint",
      }),
    );
  });

  test("normalizes event type selections into the planned contract order", () => {
    expect(
      normalizeCreateWebhookEndpointValues({
        eventTypes: [
          "bank.transaction.matched",
          "invoice.created",
          "invoice.created",
        ],
        name: "  Hook  ",
        url: " https://hooks.example.com/webhooks/noa ",
      }),
    ).toEqual({
      eventTypes: ["invoice.created", "bank.transaction.matched"],
      name: "Hook",
      url: "https://hooks.example.com/webhooks/noa",
    });
  });
});
