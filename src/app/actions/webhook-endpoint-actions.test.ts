import { beforeEach, describe, expect, test, vi } from "vitest";

const ensureTenantScopeMock = vi.hoisted(() => vi.fn());
const getActiveTenantScopeMock = vi.hoisted(() => vi.fn());
const listOverviewMock = vi.hoisted(() => vi.fn());
const createEndpointMock = vi.hoisted(() => vi.fn());
const activateEndpointMock = vi.hoisted(() => vi.fn());
const deactivateEndpointMock = vi.hoisted(() => vi.fn());
const rotateSecretEndpointMock = vi.hoisted(() => vi.fn());
const updateEndpointMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({
  ensureTenantScope: ensureTenantScopeMock,
}));
vi.mock("@/lib/server-active-scope", () => ({
  getActiveTenantScope: getActiveTenantScopeMock,
}));
vi.mock("@/lib/webhook-endpoint-prisma-repository", () => ({
  createWebhookEndpointPrismaRepository: vi.fn(() => ({})),
}));
vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: vi.fn(() => ({})),
}));
vi.mock("@/lib/webhook-endpoint-service", () => ({
  createWebhookEndpointService: vi.fn(() => ({
    activateEndpoint: activateEndpointMock,
    createEndpoint: createEndpointMock,
    deactivateEndpoint: deactivateEndpointMock,
    listOverview: listOverviewMock,
    rotateSecretEndpoint: rotateSecretEndpointMock,
    updateEndpoint: updateEndpointMock,
  })),
}));

import {
  activateWebhookEndpointAction,
  createWebhookEndpointAction,
  deactivateWebhookEndpointAction,
  listWebhookEndpointOverviewAction,
  rotateWebhookEndpointSecretAction,
  updateWebhookEndpointAction,
} from "./webhook-endpoint-actions";

beforeEach(() => {
  vi.clearAllMocks();
  getActiveTenantScopeMock.mockResolvedValue({
    companyId: "company-1",
    companyName: "Demo",
    licenseLabel: "Pilot",
    periodId: "period-1",
    periodLabel: "2026",
    tenantId: "tenant-1",
    tenantName: "Tenant",
    userId: "user-1",
    userName: "User",
    userRole: "admin",
  });
});

describe("webhook endpoint actions", () => {
  test("lists webhook endpoint overview for the active scope", async () => {
    listOverviewMock.mockResolvedValue({
      ok: true,
      data: { overview: { rows: [], summary: { activeCount: 0, inactiveCount: 0, totalCount: 0 } } },
    });

    const result = await listWebhookEndpointOverviewAction();

    expect(result.ok).toBe(true);
    expect(ensureTenantScopeMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: "tenant-1" }),
    );
    expect(listOverviewMock).toHaveBeenCalledWith({
      scope: expect.objectContaining({ userRole: "admin" }),
    });
  });

  test("creates webhook endpoints and revalidates the api management route on success", async () => {
    createEndpointMock.mockResolvedValue({
      ok: true,
      data: {
        row: {
          companyId: "company-1",
          createdAt: "2026-07-12T10:00:00.000Z",
          createdBy: "user-1",
          eventTypes: ["invoice.created"],
          id: "webhook-endpoint-1",
          isActive: true,
          name: "Webhook",
          periodId: "period-1",
          secretPrefix: "noa_whsec_123456",
          tenantId: "tenant-1",
          updatedAt: "2026-07-12T10:00:00.000Z",
          url: "https://hooks.example.com/webhooks/noa",
        },
        secret: "noa_whsec_secret_value",
      },
    });

    const result = await createWebhookEndpointAction({
      eventTypes: ["invoice.created"],
      name: "Webhook",
      url: "https://hooks.example.com/webhooks/noa",
    });

    expect(result.ok).toBe(true);
    expect(createEndpointMock).toHaveBeenCalledWith({
      scope: expect.objectContaining({ tenantId: "tenant-1" }),
      values: {
        eventTypes: ["invoice.created"],
        name: "Webhook",
        url: "https://hooks.example.com/webhooks/noa",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/api-yonetimi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("deactivates webhook endpoints and revalidates the api management route on success", async () => {
    deactivateEndpointMock.mockResolvedValue({
      ok: true,
      data: {
        row: {
          companyId: "company-1",
          createdAt: "2026-07-12T10:00:00.000Z",
          createdBy: "user-1",
          eventTypes: ["invoice.created"],
          id: "webhook-endpoint-1",
          isActive: false,
          name: "Webhook",
          periodId: "period-1",
          secretPrefix: "noa_whsec_123456",
          tenantId: "tenant-1",
          updatedAt: "2026-07-12T11:00:00.000Z",
          url: "https://hooks.example.com/webhooks/noa",
        },
      },
    });

    const result = await deactivateWebhookEndpointAction("webhook-endpoint-1");

    expect(result).toEqual({
      ok: true,
      data: {
        row: expect.objectContaining({
          id: "webhook-endpoint-1",
          isActive: false,
        }),
      },
    });
    expect(deactivateEndpointMock).toHaveBeenCalledWith({
      id: "webhook-endpoint-1",
      scope: expect.objectContaining({ tenantId: "tenant-1" }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/api-yonetimi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("activates webhook endpoints and revalidates the api management route on success", async () => {
    activateEndpointMock.mockResolvedValue({
      ok: true,
      data: {
        row: {
          companyId: "company-1",
          createdAt: "2026-07-12T10:00:00.000Z",
          createdBy: "user-1",
          eventTypes: ["invoice.created"],
          id: "webhook-endpoint-1",
          isActive: true,
          name: "Webhook",
          periodId: "period-1",
          secretPrefix: "noa_whsec_123456",
          tenantId: "tenant-1",
          updatedAt: "2026-07-12T11:30:00.000Z",
          url: "https://hooks.example.com/webhooks/noa",
        },
      },
    });

    const result = await activateWebhookEndpointAction("webhook-endpoint-1");

    expect(result.ok).toBe(true);
    expect(activateEndpointMock).toHaveBeenCalledWith({
      id: "webhook-endpoint-1",
      scope: expect.objectContaining({ tenantId: "tenant-1" }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/api-yonetimi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("rotates webhook endpoint secrets and revalidates the api management route on success", async () => {
    rotateSecretEndpointMock.mockResolvedValue({
      ok: true,
      data: {
        row: {
          companyId: "company-1",
          createdAt: "2026-07-12T10:00:00.000Z",
          createdBy: "user-1",
          eventTypes: ["invoice.created"],
          id: "webhook-endpoint-1",
          isActive: true,
          name: "Webhook",
          periodId: "period-1",
          secretPrefix: "noa_whsec_rotated",
          tenantId: "tenant-1",
          updatedAt: "2026-07-12T11:00:00.000Z",
          url: "https://hooks.example.com/webhooks/noa",
        },
        secret: "noa_whsec_rotated_secret_value",
      },
    });

    const result = await rotateWebhookEndpointSecretAction("webhook-endpoint-1");

    expect(result.ok).toBe(true);
    expect(rotateSecretEndpointMock).toHaveBeenCalledWith({
      id: "webhook-endpoint-1",
      scope: expect.objectContaining({ tenantId: "tenant-1" }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/api-yonetimi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("updates webhook endpoints and revalidates the api management route on success", async () => {
    updateEndpointMock.mockResolvedValue({
      ok: true,
      data: {
        row: {
          companyId: "company-1",
          createdAt: "2026-07-12T10:00:00.000Z",
          createdBy: "user-1",
          eventTypes: ["invoice.created"],
          id: "webhook-endpoint-1",
          isActive: true,
          name: "Webhook",
          periodId: "period-1",
          secretPrefix: "noa_whsec_123456",
          tenantId: "tenant-1",
          updatedAt: "2026-07-12T11:00:00.000Z",
          url: "https://hooks.example.com/webhooks/noa",
        },
      },
    });

    const result = await updateWebhookEndpointAction("webhook-endpoint-1", {
      eventTypes: ["invoice.created"],
      name: "Webhook",
      url: "https://hooks.example.com/webhooks/noa",
    });

    expect(result.ok).toBe(true);
    expect(updateEndpointMock).toHaveBeenCalledWith({
      id: "webhook-endpoint-1",
      scope: expect.objectContaining({ tenantId: "tenant-1" }),
      values: {
        eventTypes: ["invoice.created"],
        name: "Webhook",
        url: "https://hooks.example.com/webhooks/noa",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/api-yonetimi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });
});
