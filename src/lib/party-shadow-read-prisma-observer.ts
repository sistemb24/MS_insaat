import { Prisma } from "@prisma/client";

import {
  buildPartyParityReadModel,
  type PartyParityLegacyRecord,
  type PartyParityPartyRecord,
  type PartyParityRoleRecord,
  type PartyParityScope,
} from "./party-parity-read-model";
import type { PartySlug } from "./party-read-model";
import {
  evaluatePartyShadowRead,
  normalizePartyParityScope,
  partyShadowScopeFingerprint,
  type PartyShadowCutoverState,
  type PartyShadowReadObservation,
} from "./party-shadow-read";
import { writeStructuredLog, type StructuredLogFields } from "./structured-logger";

type PartyRoleWithParty = PartyParityRoleRecord & {
  party: PartyParityPartyRecord;
};

type TransactionClient = {
  $executeRaw(query: unknown): Promise<number>;
  $queryRaw<T = unknown>(query: unknown): Promise<T>;
  entityRecord: {
    findMany(input: unknown): Promise<PartyParityLegacyRecord[]>;
  };
  partyCutoverState: {
    findMany(input: unknown): Promise<PartyShadowCutoverState[]>;
  };
  partyRole: {
    findMany(input: unknown): Promise<PartyRoleWithParty[]>;
  };
};

export type PartyShadowReadPrismaClientLike = {
  $transaction<T>(
    callback: (transaction: TransactionClient) => Promise<T>,
    options: { isolationLevel: "RepeatableRead"; maxWait: number; timeout: number },
  ): Promise<T>;
};

export type PartyShadowReadObserver = {
  observeLegacyWrite(input: { scope: PartyParityScope; slug: PartySlug }): Promise<void>;
  observeRead(input: { scope: PartyParityScope; slug: PartySlug }): Promise<void>;
};

type StructuredLogWriter = (
  level: "error" | "info" | "warn",
  event: string,
  fields?: StructuredLogFields,
) => void;

export function createPartyShadowReadPrismaObserver(
  prisma: PartyShadowReadPrismaClientLike,
  options: {
    log?: StructuredLogWriter;
    runtimeReleaseId?: string;
  } = {},
): PartyShadowReadObserver {
  const log = options.log ?? writeStructuredLog;
  const runtimeReleaseId = normalizeReleaseId(
    options.runtimeReleaseId
      ?? process.env.VERCEL_GIT_COMMIT_SHA
      ?? process.env.NOA_RELEASE_ID
      ?? "",
  );

  return {
    async observeRead({ scope, slug }) {
      const parityScope = normalizePartyParityScope(scope);
      const startedAt = Date.now();
      try {
        const observation = await readObservation({
          prisma,
          runtimeReleaseId,
          scope: parityScope,
          slug,
        });
        log(observationLevel(observation), "party.shadow_read.parity", {
          ...observation,
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        log("warn", "party.shadow_read.parity", {
          durationMs: Date.now() - startedAt,
          errorName: error instanceof Error ? error.name : "UnknownError",
          scopeFingerprint: partyShadowScopeFingerprint(parityScope),
          slug,
          status: "SHADOW_READ_ERROR",
        });
      }
    },

    async observeLegacyWrite({ scope, slug }) {
      const parityScope = normalizePartyParityScope(scope);
      try {
        const { state, stateCount } = await readState(prisma, parityScope);
        if (stateCount === 0 && !state) return;
        if (stateCount !== 1 || !state) {
          log("warn", "party.shadow_read.legacy_write", {
            scopeFingerprint: partyShadowScopeFingerprint(parityScope),
            slug,
            stateCount,
            status: "INVALID_CUTOVER_STATE",
          });
          return;
        }
        if (state.mode !== "SHADOW_READ") return;

        log("warn", "party.shadow_read.legacy_write", {
          mode: state.mode,
          releaseId: state.releaseId,
          revisionNo: state.revisionNo,
          scopeFingerprint: partyShadowScopeFingerprint(parityScope),
          slug,
          status: "LEGACY_WRITE_WHILE_SHADOW",
        });
      } catch (error) {
        log("warn", "party.shadow_read.legacy_write", {
          errorName: error instanceof Error ? error.name : "UnknownError",
          scopeFingerprint: partyShadowScopeFingerprint(parityScope),
          slug,
          status: "SHADOW_READ_ERROR",
        });
      }
    },
  };
}

export function createPartyShadowReadObserverIfSupported(
  value: unknown,
): PartyShadowReadObserver | null {
  if (!value || typeof value !== "object" || !("$transaction" in value)) return null;
  if (typeof (value as { $transaction?: unknown }).$transaction !== "function") return null;
  return createPartyShadowReadPrismaObserver(
    value as PartyShadowReadPrismaClientLike,
  );
}

async function readObservation(input: {
  prisma: PartyShadowReadPrismaClientLike;
  runtimeReleaseId: string;
  scope: PartyParityScope;
  slug: PartySlug;
}) {
  return input.prisma.$transaction(async (transaction) => {
    await requireReadOnly(transaction);
    const states = await readStates(transaction, input.scope);
    const state = states[0] ?? null;
    const preliminary = evaluatePartyShadowRead({
      runtimeReleaseId: input.runtimeReleaseId,
      scope: input.scope,
      slug: input.slug,
      state,
      stateCount: states.length,
    });
    if (states.length !== 1 || !state || state.mode !== "SHADOW_READ") {
      return preliminary;
    }
    if (state.revisionNo !== 1) return preliminary;
    if (preliminary.status === "RELEASE_MISMATCH") return preliminary;

    const legacyRecords = await transaction.entityRecord.findMany({
      orderBy: { code: "asc" },
      select: {
        code: true,
        companyId: true,
        data: true,
        periodId: true,
        slug: true,
        tenantId: true,
      },
      where: { ...input.scope, slug: input.slug },
    });
    const roleRows = await transaction.partyRole.findMany({
      include: { party: true },
      orderBy: { normalizedCode: "asc" },
      where: { ...input.scope, legacySlug: input.slug },
    });
    const parties = uniqueParties(roleRows.map((row) => row.party));
    const roles = roleRows.map((row) => ({
      code: row.code,
      companyId: row.companyId,
      id: row.id,
      kind: row.kind,
      legacyCode: row.legacyCode,
      legacySlug: row.legacySlug,
      normalizedCode: row.normalizedCode,
      partyId: row.partyId,
      periodId: row.periodId,
      status: row.status,
      tenantId: row.tenantId,
    }));
    const parity = buildPartyParityReadModel({
      scope: input.scope,
      snapshot: { legacyRecords, parties, roles },
    });

    return evaluatePartyShadowRead({
      parity,
      runtimeReleaseId: input.runtimeReleaseId,
      scope: input.scope,
      slug: input.slug,
      state,
      stateCount: states.length,
    });
  }, transactionOptions());
}

async function readState(
  prisma: PartyShadowReadPrismaClientLike,
  scope: PartyParityScope,
) {
  return prisma.$transaction(async (transaction) => {
    await requireReadOnly(transaction);
    const states = await readStates(transaction, scope);
    return { state: states[0] ?? null, stateCount: states.length };
  }, transactionOptions());
}

async function requireReadOnly(transaction: TransactionClient) {
  await transaction.$executeRaw(Prisma.sql`SET TRANSACTION READ ONLY`);
  const rows = await transaction.$queryRaw<Array<{ read_only: string }>>(Prisma.sql`
    SELECT current_setting('transaction_read_only')::text AS read_only
  `);
  if (rows.length !== 1 || rows[0]?.read_only !== "on") {
    throw new Error("Party shadow-read transaction salt-okunur moda alınamadı.");
  }
}

function readStates(transaction: TransactionClient, scope: PartyParityScope) {
  return transaction.partyCutoverState.findMany({
    orderBy: { id: "asc" },
    select: { mode: true, releaseId: true, revisionNo: true },
    where: scope,
  });
}

function uniqueParties(rows: PartyParityPartyRecord[]) {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

function observationLevel(observation: PartyShadowReadObservation) {
  return observation.status === "LEGACY_ONLY" || observation.status === "SHADOW_MATCH"
    ? "info" as const
    : "warn" as const;
}

function normalizeReleaseId(value: string) {
  return value.trim().toLowerCase();
}

function transactionOptions() {
  return {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    maxWait: 10_000,
    timeout: 30_000,
  } as const;
}
