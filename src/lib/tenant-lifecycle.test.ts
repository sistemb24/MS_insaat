import { describe, expect, it, vi } from "vitest";

import {
  createTenantLifecycleService,
  isTenantAccessAllowed,
  resolveTenantLifecycleAction,
  TENANT_LEGAL_HOLD_REVIEW_DAYS,
  type TenantLifecycleRepository,
} from "./tenant-lifecycle";

function createRepository() {
  return {
    placeLegalHold: vi.fn(async (input) => input),
    releaseLegalHold: vi.fn(async (input) => input),
    transition: vi.fn(async (input) => input),
  } satisfies TenantLifecycleRepository;
}

describe("tenant lifecycle contract", () => {
  it("allows access only for ACTIVE tenants", () => {
    expect(isTenantAccessAllowed("ACTIVE")).toBe(true);
    expect(isTenantAccessAllowed("FROZEN")).toBe(false);
    expect(isTenantAccessAllowed("CLOSURE_PENDING")).toBe(false);
    expect(isTenantAccessAllowed("UNKNOWN")).toBe(false);
  });

  it("maps only explicit lifecycle transitions", () => {
    expect(resolveTenantLifecycleAction("ACTIVE", "FROZEN")).toBe("FREEZE");
    expect(resolveTenantLifecycleAction("FROZEN", "ACTIVE")).toBe("UNFREEZE");
    expect(
      resolveTenantLifecycleAction("ACTIVE", "CLOSURE_PENDING"),
    ).toBe("BEGIN_CLOSURE");
    expect(() => resolveTenantLifecycleAction("ACTIVE", "ACTIVE")).toThrow(
      "geçişine izin verilmiyor",
    );
  });

  it("derives the legal hold review date from the approved retention interval", async () => {
    const repository = createRepository();
    const occurredAt = new Date("2026-08-09T12:00:00.000Z");
    const service = createTenantLifecycleService({
      now: () => occurredAt,
      repository,
    });

    await service.placeLegalHold({
      actorCredentialId: "admin-001",
      operationId: "operation-001",
      reasonCode: "LITIGATION",
      referenceId: "hold-2026-001",
      tenantId: "tenant-001",
    });

    expect(repository.placeLegalHold).toHaveBeenCalledWith(
      expect.objectContaining({
        occurredAt,
        reviewAt: new Date(
          occurredAt.getTime() + TENANT_LEGAL_HOLD_REVIEW_DAYS * 86_400_000,
        ),
      }),
    );
  });

  it("rejects free text reason values and invalid optimistic versions", async () => {
    const service = createTenantLifecycleService({ repository: createRepository() });

    expect(() =>
      service.placeLegalHold({
        actorCredentialId: "admin-001",
        operationId: "operation-001",
        reasonCode: "kişisel açıklama",
        referenceId: "hold-2026-001",
        tenantId: "tenant-001",
      }),
    ).toThrow("neden kodu");

    expect(() =>
      service.transitionTenant({
        actorCredentialId: "admin-001",
        expectedVersion: 0,
        operationId: "operation-002",
        tenantId: "tenant-001",
        toStatus: "FROZEN",
      }),
    ).toThrow("Beklenen sürüm");
  });
});
