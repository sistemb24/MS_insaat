import { describe, expect, it, vi } from "vitest";

import {
  createPartyShadowReadPrismaObserver,
  type PartyShadowReadPrismaClientLike,
} from "./party-shadow-read-prisma-observer";

const scope = { companyId: "company", periodId: "period", tenantId: "tenant" };
const releaseId = "a".repeat(40);

describe("Party shadow-read Prisma observer", () => {
  it("does not query Party in LEGACY_ONLY mode", async () => {
    const fake = createFake({ mode: "LEGACY_ONLY", releaseId, revisionNo: 2 });
    await createPartyShadowReadPrismaObserver(fake.client, {
      log: fake.log,
      runtimeReleaseId: releaseId,
    }).observeRead({ scope, slug: "musteriler" });

    expect(fake.entityRead).not.toHaveBeenCalled();
    expect(fake.roleRead).not.toHaveBeenCalled();
    expect(fake.log).toHaveBeenCalledWith(
      "info",
      "party.shadow_read.parity",
      expect.objectContaining({ status: "LEGACY_ONLY" }),
    );
  });

  it("compares a matched slug in a read-only repeatable-read snapshot", async () => {
    const fake = createFake({ mode: "SHADOW_READ", releaseId, revisionNo: 1 });
    const runtimeScope = {
      ...scope,
      tenantName: "Runtime Tenant",
      userId: "runtime-user",
      userRole: "admin",
    };
    await createPartyShadowReadPrismaObserver(fake.client, {
      log: fake.log,
      runtimeReleaseId: releaseId,
    }).observeRead({ scope: runtimeScope, slug: "musteriler" });

    expect(fake.readOnlySet).toHaveBeenCalledOnce();
    expect(fake.client.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "RepeatableRead", maxWait: 10_000, timeout: 30_000 },
    );
    expect(fake.stateRead).toHaveBeenCalledWith(expect.objectContaining({
      where: scope,
    }));
    expect(fake.entityRead).toHaveBeenCalledWith(expect.objectContaining({
      where: { ...scope, slug: "musteriler" },
    }));
    expect(fake.roleRead).toHaveBeenCalledWith(expect.objectContaining({
      where: { ...scope, legacySlug: "musteriler" },
    }));
    expect(JSON.stringify([
      ...fake.stateRead.mock.calls,
      ...fake.entityRead.mock.calls,
      ...fake.roleRead.mock.calls,
    ])).not.toContain("runtime-user");
    expect(fake.log).toHaveBeenCalledWith(
      "info",
      "party.shadow_read.parity",
      expect.objectContaining({ issueCodes: [], status: "SHADOW_MATCH" }),
    );
    expect(JSON.stringify(fake.log.mock.calls)).not.toContain("Müşteri");
  });

  it("never propagates observer failure to the legacy caller", async () => {
    const log = vi.fn();
    const observer = createPartyShadowReadPrismaObserver({
      $transaction: vi.fn(async () => { throw new TypeError("business-value"); }),
    } as unknown as PartyShadowReadPrismaClientLike, { log, runtimeReleaseId: releaseId });

    await expect(observer.observeRead({ scope, slug: "taseronlar" })).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      "warn",
      "party.shadow_read.parity",
      expect.objectContaining({ errorName: "TypeError", status: "SHADOW_READ_ERROR" }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain("business-value");
  });

  it("warns after a legacy write while shadow mode is active", async () => {
    const fake = createFake({ mode: "SHADOW_READ", releaseId, revisionNo: 1 });
    await createPartyShadowReadPrismaObserver(fake.client, {
      log: fake.log,
      runtimeReleaseId: releaseId,
    }).observeLegacyWrite({ scope, slug: "tedarikciler" });

    expect(fake.log).toHaveBeenCalledWith(
      "warn",
      "party.shadow_read.legacy_write",
      expect.objectContaining({ status: "LEGACY_WRITE_WHILE_SHADOW" }),
    );
  });

  it("keeps an uninitialized scope silent during ordinary legacy writes", async () => {
    const fake = createFake(null);
    await createPartyShadowReadPrismaObserver(fake.client, {
      log: fake.log,
      runtimeReleaseId: releaseId,
    }).observeLegacyWrite({ scope, slug: "musteriler" });

    expect(fake.log).not.toHaveBeenCalled();
  });
});

function createFake(
  state: { mode: string; releaseId: string; revisionNo: number } | null,
) {
  const log = vi.fn();
  const readOnlySet = vi.fn(async () => 0);
  const entityRead = vi.fn(async () => [{
    code: "MUS-1",
    data: { name: "Müşteri", status: "Aktif" },
    slug: "musteriler",
    ...scope,
  }]);
  const roleRead = vi.fn(async () => [{
    code: "MUS-1",
    id: "role-1",
    kind: "customer",
    legacyCode: "MUS-1",
    legacySlug: "musteriler",
    normalizedCode: "MUS-1",
    partyId: "party-1",
    status: "ACTIVE",
    ...scope,
    party: {
      displayName: "Müşteri",
      id: "party-1",
      normalizedName: "MÜŞTERİ",
      status: "ACTIVE",
      ...scope,
    },
  }]);
  const stateRead = vi.fn(async () => state ? [state] : []);
  const transaction = {
    $executeRaw: readOnlySet,
    $queryRaw: vi.fn(async () => [{ read_only: "on" }]),
    entityRecord: { findMany: entityRead },
    partyCutoverState: { findMany: stateRead },
    partyRole: { findMany: roleRead },
  };
  const client = {
    $transaction: vi.fn(async (
      callback: (value: typeof transaction) => Promise<unknown>,
    ) => callback(transaction)),
  };
  return {
    client: client as unknown as PartyShadowReadPrismaClientLike,
    entityRead,
    log,
    readOnlySet,
    roleRead,
    stateRead,
  };
}
