import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { defaultTenantScope } from "@/lib/tenant-scope";

const getActiveTenantScopeMock = vi.hoisted(() => vi.fn());
const ensureTenantScopeMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  subscriptionInvoice: {
    findMany: vi.fn(),
  },
  tenantSubscription: {
    findFirst: vi.fn(),
  },
  tenantSubscriptionAddon: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/prisma-scope-bootstrap", () => ({
  ensureTenantScope: ensureTenantScopeMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/server-active-scope", () => ({
  getActiveTenantScope: getActiveTenantScopeMock,
}));

import { testArventoSandboxConnectionAction } from "./arvento-fleet-actions";

const adminScope = {
  ...defaultTenantScope,
  userRole: "admin" as const,
};

describe("arvento fleet actions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T00:00:00.000Z"));
    getActiveTenantScopeMock.mockReset();
    ensureTenantScopeMock.mockReset();
    revalidatePathMock.mockReset();
    prismaMock.subscriptionInvoice.findMany.mockReset();
    prismaMock.tenantSubscription.findFirst.mockReset();
    prismaMock.tenantSubscriptionAddon.findMany.mockReset();

    getActiveTenantScopeMock.mockResolvedValue(adminScope);
    prismaMock.subscriptionInvoice.findMany.mockResolvedValue([]);
    prismaMock.tenantSubscription.findFirst.mockResolvedValue(null);
    prismaMock.tenantSubscriptionAddon.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("blocks sandbox connection when the active subscription lacks Arvento fleet access", async () => {
    const result = await testArventoSandboxConnectionAction();

    expect(result).toEqual({
      errors: ["Arvento Filo Takip için Kurumsal pakete yükseltme gerekir."],
      featureLabel: "Arvento Filo Takip",
      ok: false,
      requiredPlan: "Kurumsal",
    });
    expect(getActiveTenantScopeMock).toHaveBeenCalledOnce();
    expect(ensureTenantScopeMock).toHaveBeenCalledWith(prismaMock, adminScope);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("returns an active sandbox connection when Kurumsal subscription is active", async () => {
    prismaMock.tenantSubscription.findFirst.mockResolvedValue({
      autoRenew: true,
      billingCycle: "monthly",
      endsAt: "2026-08-03T00:00:00.000Z",
      id: "sub-kurumsal",
      plan: {
        id: "kurumsal",
        name: "Kurumsal",
      },
      planId: "kurumsal",
      renewalAmount: 16900,
      startsAt: "2026-07-04T00:00:00.000Z",
      storageLimitGb: 100,
      userLimit: 75,
    });

    const result = await testArventoSandboxConnectionAction();

    expect(result).toEqual({
      ok: true,
      data: {
        connection: {
          endpoint: "ws.arvento.com",
          refreshIntervalLabel: "15 dk",
          simulationMode: true,
          statusLabel: "Aktif",
          userName: "NOA-SANDBOX",
        },
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });
});
