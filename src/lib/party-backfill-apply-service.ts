import {
  PARTY_BACKFILL_VERSION,
  type PartyBackfillPlan,
} from "./party-backfill";
import type { TenantScope } from "./tenant-scope";

export const PARTY_BACKFILL_APPLY_CONFIRMATION = "party-backfill-apply";

export type PartyBackfillApplyCommand = {
  actorUserId: string;
  approvedSourceCountLimit: number;
  expectedSourceChecksum: string;
  scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">;
  version: string;
};

export type PartyBackfillApplySummary = {
  blockingIssueCount: number;
  candidateCount: number;
  issueCount: number;
  reused: boolean;
  runId: string;
  sourceChecksum: string;
  sourceCount: number;
  status: "BLOCKED" | "VERIFIED";
  warningIssueCount: number;
};

export type PartyBackfillExecutionRepository = {
  applyAtomically(command: PartyBackfillApplyCommand): Promise<PartyBackfillApplySummary>;
  previewConsistently(input: {
    scope: PartyBackfillApplyCommand["scope"];
    version: string;
  }): Promise<PartyBackfillPlan>;
};

export type PartyBackfillApplyResult =
  | { data: PartyBackfillApplySummary; errors: []; ok: true }
  | { data: null; errors: string[]; ok: false };

export class PartyBackfillExecutionError extends Error {}

export function createPartyBackfillApplyService({
  repository,
  runtimeEnvironment,
}: {
  repository: PartyBackfillExecutionRepository;
  runtimeEnvironment: string | undefined;
}) {
  return {
    async preview({
      scope,
      version = PARTY_BACKFILL_VERSION,
    }: {
      scope: PartyBackfillApplyCommand["scope"];
      version?: string;
    }) {
      validateScope(scope);
      validateVersion(version);
      return repository.previewConsistently({ scope, version });
    },

    async apply(input: {
      actorUserId: string;
      approvedSourceCountLimit: number;
      confirmation: string;
      expectedSourceChecksum: string;
      scope: PartyBackfillApplyCommand["scope"];
      version?: string;
    }): Promise<PartyBackfillApplyResult> {
      try {
        assertNonProduction(runtimeEnvironment);
        validateScope(input.scope);
        validateActor(input.actorUserId);
        validateVersion(input.version ?? PARTY_BACKFILL_VERSION);
        validateChecksum(input.expectedSourceChecksum);
        validateSourceCountLimit(input.approvedSourceCountLimit);
        if (input.confirmation !== PARTY_BACKFILL_APPLY_CONFIRMATION) {
          throw new PartyBackfillExecutionError(
            "Party backfill açık onay ifadesi eksik veya hatalı.",
          );
        }

        const data = await repository.applyAtomically({
          actorUserId: input.actorUserId.trim(),
          approvedSourceCountLimit: input.approvedSourceCountLimit,
          expectedSourceChecksum: input.expectedSourceChecksum,
          scope: input.scope,
          version: input.version ?? PARTY_BACKFILL_VERSION,
        });
        return { data, errors: [], ok: true };
      } catch (error) {
        return {
          data: null,
          errors: [
            error instanceof PartyBackfillExecutionError
              ? error.message
              : "Party backfill güvenli biçimde uygulanamadı.",
          ],
          ok: false,
        };
      }
    },
  };
}

function assertNonProduction(runtimeEnvironment: string | undefined) {
  const normalized = runtimeEnvironment?.trim().toLowerCase();
  if (normalized === "prod" || normalized === "production") {
    throw new PartyBackfillExecutionError(
      "Party backfill apply bu dilimde production ortamında kapalıdır.",
    );
  }
  if (!normalized || !["development", "local", "preview", "staging", "test"].includes(normalized)) {
    throw new PartyBackfillExecutionError(
      "Party backfill apply çalışma ortamı doğrulanamadığı için kapalıdır.",
    );
  }
}

function validateScope(scope: PartyBackfillApplyCommand["scope"]) {
  for (const [key, value] of Object.entries(scope)) {
    if (!value.trim()) {
      throw new PartyBackfillExecutionError(`Party backfill ${key} kapsamı zorunludur.`);
    }
  }
}

function validateActor(actorUserId: string) {
  if (!actorUserId.trim()) {
    throw new PartyBackfillExecutionError("Party backfill actor kullanıcı kimliği zorunludur.");
  }
}

function validateVersion(version: string) {
  if (!/^[a-z0-9][a-z0-9._-]{2,49}$/i.test(version.trim())) {
    throw new PartyBackfillExecutionError("Party backfill sürümü güvenli değil.");
  }
}

function validateChecksum(checksum: string) {
  if (!/^[a-f0-9]{64}$/.test(checksum)) {
    throw new PartyBackfillExecutionError("Party backfill kaynak checksum değeri geçerli değil.");
  }
}

function validateSourceCountLimit(limit: number) {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new PartyBackfillExecutionError(
      "Party backfill onaylı kaynak satır limiti geçerli değil.",
    );
  }
}
