/**
 * @vitest-environment jsdom
 */

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { defaultTenantScope } from "@/lib/tenant-scope";

vi.hoisted(() => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/noa_test";
});

const {
  auditLogListByEntityTypeMock,
  createApiKeyActionMock,
  activateWebhookEndpointActionMock,
  createWebhookEndpointActionMock,
  deactivateWebhookEndpointActionMock,
  rotateWebhookEndpointSecretActionMock,
  updateWebhookEndpointActionMock,
  listApiKeyOverviewActionMock,
  listWebhookEndpointOverviewActionMock,
  findSubscriptionRouteAccessRowMock,
  getActiveSessionStateMock,
  getNotificationUnreadCountActionMock,
  listSubscriptionOverviewActionMock,
  revokeApiKeyActionMock,
} = vi.hoisted(() => ({
  auditLogListByEntityTypeMock: vi.fn(),
  createApiKeyActionMock: vi.fn(),
  activateWebhookEndpointActionMock: vi.fn(),
  createWebhookEndpointActionMock: vi.fn(),
  deactivateWebhookEndpointActionMock: vi.fn(),
  rotateWebhookEndpointSecretActionMock: vi.fn(),
  updateWebhookEndpointActionMock: vi.fn(),
  listApiKeyOverviewActionMock: vi.fn(),
  listWebhookEndpointOverviewActionMock: vi.fn(),
  findSubscriptionRouteAccessRowMock: vi.fn(),
  getActiveSessionStateMock: vi.fn(),
  getNotificationUnreadCountActionMock: vi.fn(),
  listSubscriptionOverviewActionMock: vi.fn(),
  revokeApiKeyActionMock: vi.fn(),
}));

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/e-fatura-surface", () => ({
  EFaturaSurface: ({
    webhookAuditEntries = [],
  }: {
    webhookAuditEntries?: unknown[];
  }) => (
    <div data-testid="e-fatura-surface">
      {webhookAuditEntries.length} webhook olay
    </div>
  ),
}));

vi.mock("@/components/api-key-management-surface", () => ({
  ApiKeyManagementSurface: ({
    overview,
    webhookEndpointOverview,
  }: {
    overview: { rows: unknown[] };
    webhookEndpointOverview?: { rows: unknown[]; summary: { totalCount: number } };
  }) => (
    <div data-testid="api-key-management-surface">
      {overview.rows.length} api key
      {webhookEndpointOverview ? ` · ${webhookEndpointOverview.summary.totalCount} webhook endpoint` : ""}
    </div>
  ),
}));

vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: () => ({
    listByEntityType: (...args: unknown[]) =>
      auditLogListByEntityTypeMock(...args),
  }),
}));

vi.mock("@/app/actions/subscription-actions", () => ({
  listSubscriptionOverviewAction: () => listSubscriptionOverviewActionMock(),
}));

vi.mock("@/app/actions/api-key-actions", () => ({
  createApiKeyAction: () => createApiKeyActionMock(),
  listApiKeyOverviewAction: () => listApiKeyOverviewActionMock(),
  revokeApiKeyAction: () => revokeApiKeyActionMock(),
}));

vi.mock("@/app/actions/webhook-endpoint-actions", () => ({
  activateWebhookEndpointAction: () => activateWebhookEndpointActionMock(),
  createWebhookEndpointAction: () => createWebhookEndpointActionMock(),
  deactivateWebhookEndpointAction: () =>
    deactivateWebhookEndpointActionMock(),
  listWebhookEndpointOverviewAction: () =>
    listWebhookEndpointOverviewActionMock(),
  rotateWebhookEndpointSecretAction: () =>
    rotateWebhookEndpointSecretActionMock(),
  updateWebhookEndpointAction: () => updateWebhookEndpointActionMock(),
}));

vi.mock("@/app/actions/notification-center-actions", () => ({
  getNotificationUnreadCountAction: () =>
    getNotificationUnreadCountActionMock(),
}));

vi.mock("@/lib/server-active-scope", () => ({
  getActiveSessionState: () => getActiveSessionStateMock(),
  requireActiveSessionState: () => getActiveSessionStateMock(),
}));

vi.mock("@/lib/subscription-route-guard", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/subscription-route-guard")
  >("@/lib/subscription-route-guard");

  return {
    ...actual,
    findSubscriptionRouteAccessRow: (...args: unknown[]) =>
      findSubscriptionRouteAccessRowMock(...args),
  };
});

import ModulePage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ModulePage", () => {
  test("renders the shared subscription lock for disabled e-Fatura access", async () => {
    listSubscriptionOverviewActionMock.mockResolvedValue({
      data: { overview: {} },
      ok: true,
    });
    getActiveSessionStateMock.mockResolvedValue({
      scope: defaultTenantScope,
      sessionId: "session-demo",
      sessionOptions: [],
    });
    getNotificationUnreadCountActionMock.mockResolvedValue(0);
    findSubscriptionRouteAccessRowMock.mockReturnValue({
      enabled: false,
      key: "e-invoice",
      label: "E-Fatura Yönetimi",
      reason: "Kurumsal pakete yükseltme gerekir.",
      requiredPlan: "Kurumsal",
      source: "upgrade-required",
    });

    const element = await ModulePage({
      params: Promise.resolve({ module: "e-fatura-yonetimi" }),
    });

    render(element);

    expect(
      screen.getByRole("heading", { name: "Paket yükseltme gerekli" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "E-Fatura Yönetimi için Kurumsal pakete yükseltme gerekir.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Gereken paket: Kurumsal")).toBeTruthy();
    expect(screen.queryByTestId("e-fatura-surface")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Aboneliği Yönet" }).getAttribute("href"),
    ).toBe("/abonelik");
    expect(auditLogListByEntityTypeMock).not.toHaveBeenCalled();
  });

  test("loads the last 20 scoped webhook audit entries for enabled e-Fatura access", async () => {
    listSubscriptionOverviewActionMock.mockResolvedValue({
      data: { overview: {} },
      ok: true,
    });
    getActiveSessionStateMock.mockResolvedValue({
      scope: defaultTenantScope,
      sessionId: "session-demo",
      sessionOptions: [],
    });
    getNotificationUnreadCountActionMock.mockResolvedValue(0);
    findSubscriptionRouteAccessRowMock.mockReturnValue({
      enabled: true,
      key: "e-invoice",
      label: "E-Fatura Yönetimi",
      source: "included",
    });
    auditLogListByEntityTypeMock.mockResolvedValue([
      {
        action: "e-fatura.webhook.accepted",
        actorUserId: "system-webhook",
        companyId: defaultTenantScope.companyId,
        createdAt: "2026-07-11T08:45:00.000Z",
        entityId: "event-001",
        entityLabel: "EFA-2026-0001",
        entityType: "e-fatura-webhook",
        id: "audit-001",
        metadata: {},
        occurredAt: "2026-07-11T08:45:00.000Z",
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    ]);

    const element = await ModulePage({
      params: Promise.resolve({ module: "e-fatura-yonetimi" }),
    });

    render(element);

    expect(screen.getByTestId("e-fatura-surface").textContent).toBe(
      "1 webhook olay",
    );
    expect(auditLogListByEntityTypeMock).toHaveBeenCalledWith({
      entityType: "e-fatura-webhook",
      limit: 20,
      scope: defaultTenantScope,
    });
  });

  test("loads webhook endpoint overview for api management", async () => {
    getActiveSessionStateMock.mockResolvedValue({
      scope: defaultTenantScope,
      sessionId: "session-demo",
      sessionOptions: [],
    });
    getNotificationUnreadCountActionMock.mockResolvedValue(0);
    listApiKeyOverviewActionMock.mockResolvedValue({
      ok: true,
      data: { overview: { rows: [] } },
    });
    listWebhookEndpointOverviewActionMock.mockResolvedValue({
      ok: true,
      data: {
        overview: {
          rows: [{ id: "webhook-endpoint-1" }],
          summary: {
            activeCount: 1,
            inactiveCount: 0,
            totalCount: 1,
          },
        },
      },
    });

    const element = await ModulePage({
      params: Promise.resolve({ module: "api-yonetimi" }),
    });

    render(element);

    expect(screen.getByTestId("api-key-management-surface").textContent).toBe(
      "0 api key · 1 webhook endpoint",
    );
    expect(listApiKeyOverviewActionMock).toHaveBeenCalled();
    expect(listWebhookEndpointOverviewActionMock).toHaveBeenCalled();
  });
});
