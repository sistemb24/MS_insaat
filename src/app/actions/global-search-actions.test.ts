import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultTenantScope } from "@/lib/tenant-scope";

const requireActiveSessionStateMock = vi.hoisted(() => vi.fn());
const globalSearchRepositorySearchMock = vi.hoisted(() => vi.fn());
const subscriptionSnapshotMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/server-active-scope", () => ({
  requireActiveSessionState: requireActiveSessionStateMock,
}));
vi.mock("@/lib/global-search-prisma-repository", () => ({
  createGlobalSearchPrismaRepository: vi.fn(() => ({
    search: globalSearchRepositorySearchMock,
  })),
}));
vi.mock("@/lib/subscription-prisma-repository", () => ({
  createSubscriptionPrismaRepository: vi.fn(() => ({
    getCurrentSnapshot: subscriptionSnapshotMock,
  })),
}));

import { globalSearchAction } from "./global-search-actions";

describe("global search action", () => {
  beforeEach(() => {
    requireActiveSessionStateMock.mockReset();
    globalSearchRepositorySearchMock.mockReset();
    subscriptionSnapshotMock.mockReset();
    requireActiveSessionStateMock.mockResolvedValue({
      scope: defaultTenantScope,
      sessionId: "demo-accounting",
      sessionOptions: [],
    });
    subscriptionSnapshotMock.mockResolvedValue({});
  });

  it("derives scope and subscription access from the authenticated server session", async () => {
    globalSearchRepositorySearchMock.mockResolvedValue({
      query: "Atlas",
      results: [
        {
          id: "entity-atlas",
          type: "entity",
          group: "Şantiyeler",
          code: "SANT-001",
          title: "Atlas Şantiyesi",
          href: "/santiyeler",
          score: 55,
        },
      ],
      truncated: false,
    });

    const result = await globalSearchAction("  Atlas  ");

    expect(requireActiveSessionStateMock).toHaveBeenCalledOnce();
    expect(subscriptionSnapshotMock).toHaveBeenCalledWith({
      scope: defaultTenantScope,
    });
    expect(globalSearchRepositorySearchMock).toHaveBeenCalledWith({
      query: "Atlas",
      scope: defaultTenantScope,
      subscriptionOverview: expect.objectContaining({
        currentSubscription: expect.objectContaining({
          planId: "profesyonel",
        }),
      }),
    });
    expect(result).toEqual({
      data: expect.objectContaining({ query: "Atlas", truncated: false }),
      ok: true,
    });
  });

  it("authenticates but rejects an invalid query before subscription or search reads", async () => {
    await expect(globalSearchAction("a")).resolves.toEqual({
      code: "invalid-query",
      message: "Arama için en az 2 karakter yazın.",
      ok: false,
    });
    expect(requireActiveSessionStateMock).toHaveBeenCalledOnce();
    expect(subscriptionSnapshotMock).not.toHaveBeenCalled();
    expect(globalSearchRepositorySearchMock).not.toHaveBeenCalled();
  });

  it("returns a safe generic error without leaking repository exceptions", async () => {
    globalSearchRepositorySearchMock.mockRejectedValue(
      new Error("password=secret database host failed"),
    );

    const result = await globalSearchAction("atlas");

    expect(result).toEqual({
      code: "search-failed",
      message: "Arama şu anda tamamlanamadı. Lütfen yeniden deneyin.",
      ok: false,
    });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("database host");
  });

  it("does not convert an unauthenticated session redirect into a search error", async () => {
    requireActiveSessionStateMock.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(globalSearchAction("atlas")).rejects.toThrow("NEXT_REDIRECT");
    expect(subscriptionSnapshotMock).not.toHaveBeenCalled();
    expect(globalSearchRepositorySearchMock).not.toHaveBeenCalled();
  });
});
