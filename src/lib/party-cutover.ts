import { createHash } from "node:crypto";

import type { PartyParityReadModel, PartyParityScope } from "./party-parity-read-model";

export const PARTY_CUTOVER_MODES = ["LEGACY_ONLY", "SHADOW_READ"] as const;
export type PartyCutoverMode = (typeof PARTY_CUTOVER_MODES)[number];

export type PartyCutoverEvidence = Pick<
  PartyParityReadModel,
  | "issueChecksum"
  | "legacyChecksum"
  | "legacyCount"
  | "matchedCount"
  | "parityChecksum"
  | "partyChecksum"
  | "partyCount"
  | "roleCount"
>;

export type PartyCutoverTransitionCommand = {
  actorUserId: string;
  expectedParity?: PartyCutoverEvidence;
  expectedRevisionNo: number;
  operationId: string;
  reasonCode: string;
  releaseId: string;
  scope: PartyParityScope;
  targetMode: PartyCutoverMode;
};

export type PartyCutoverTransitionResult = {
  mode: PartyCutoverMode;
  parityChecksum: string;
  replayed: boolean;
  revisionNo: number;
  scopeFingerprint: string;
  status: "ACTIVATED" | "ROLLED_BACK" | "UNCHANGED";
};

export type PartyCutoverRepository = {
  transition(
    command: PartyCutoverTransitionCommand,
  ): Promise<PartyCutoverTransitionResult>;
};

export type PartyCutoverErrorCode =
  | "ACTIVE_ADMIN_REQUIRED"
  | "ACTIVE_TENANT_REQUIRED"
  | "AUDIT_WRITE_FAILED"
  | "DATABASE_NOT_WRITABLE"
  | "EVENT_WRITE_FAILED"
  | "INVALID_COMMAND"
  | "INVALID_STORED_MODE"
  | "MODE_UNCHANGED"
  | "OPERATION_CONFLICT"
  | "OPERATION_STALE"
  | "PARITY_DRIFT"
  | "PARITY_NOT_READY"
  | "REVISION_CONFLICT"
  | "SCOPE_NOT_FOUND"
  | "TRANSITION_NOT_ALLOWED";

export class PartyCutoverError extends Error {
  constructor(
    public readonly reasonCode: PartyCutoverErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PartyCutoverError";
  }
}

export function createPartyCutoverService(input: {
  repository: PartyCutoverRepository;
}) {
  return {
    transition(command: PartyCutoverTransitionCommand) {
      validatePartyCutoverCommand(command);
      return input.repository.transition(command);
    },
  };
}

export function validatePartyCutoverCommand(
  command: PartyCutoverTransitionCommand,
) {
  for (const [label, value] of Object.entries({
    "Actor kullanıcı kimliği": command.actorUserId,
    "Şirket kimliği": command.scope.companyId,
    "Dönem kimliği": command.scope.periodId,
    "Tenant kimliği": command.scope.tenantId,
  })) {
    assertIdentifier(value, label);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/.test(command.operationId)) {
    invalid("Party cutover işlem kimliği güvenli değil.");
  }
  if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(command.reasonCode)) {
    invalid("Party cutover neden kodu güvenli değil.");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{6,63}$/.test(command.releaseId)) {
    invalid("Party cutover release kimliği güvenli değil.");
  }
  if (
    !Number.isSafeInteger(command.expectedRevisionNo)
    || command.expectedRevisionNo < 0
  ) {
    invalid("Party cutover beklenen revizyonu geçerli değil.");
  }
  if (!PARTY_CUTOVER_MODES.includes(command.targetMode)) {
    invalid("Party cutover hedef modu allowlist dışında.");
  }
  if (command.targetMode === "SHADOW_READ") {
    if (!command.expectedParity) {
      invalid("SHADOW_READ aktivasyonu için parity kanıtı zorunludur.");
    }
    validateEvidence(command.expectedParity);
  } else if (command.expectedParity) {
    invalid("LEGACY_ONLY rollback komutu parity kanıtı taşımamalıdır.");
  }
}

export function resolvePartyCutoverAction(
  fromMode: PartyCutoverMode,
  toMode: PartyCutoverMode,
) {
  if (fromMode === "LEGACY_ONLY" && toMode === "SHADOW_READ") {
    return "ACTIVATE_SHADOW" as const;
  }
  if (fromMode === "SHADOW_READ" && toMode === "LEGACY_ONLY") {
    return "ROLLBACK_LEGACY" as const;
  }
  if (fromMode === toMode) {
    throw new PartyCutoverError(
      "MODE_UNCHANGED",
      "Party cutover kapsamı zaten hedef moddadır.",
    );
  }
  throw new PartyCutoverError(
    "TRANSITION_NOT_ALLOWED",
    "Party cutover durum geçişine izin verilmiyor.",
  );
}

export function normalizePartyCutoverMode(value: string): PartyCutoverMode {
  if (value === "LEGACY_ONLY" || value === "SHADOW_READ") return value;
  throw new PartyCutoverError(
    "INVALID_STORED_MODE",
    "Party cutover kayıtlı modu bilinmiyor; geçiş kapatıldı.",
  );
}

export function partyCutoverIdentifiers(input: {
  operationId: string;
  scope: PartyParityScope;
}) {
  return {
    eventId: `party-cutover-event_${checksum(input.operationId).slice(0, 32)}`,
    stateId: `party-cutover-state_${checksum(input.scope).slice(0, 32)}`,
  };
}

export function partyCutoverScopeFingerprint(scope: PartyParityScope) {
  return checksum(scope).slice(0, 12);
}

export function samePartyCutoverEvidence(
  left: PartyCutoverEvidence,
  right: PartyCutoverEvidence,
) {
  return checksum(left) === checksum(right);
}

function validateEvidence(evidence: PartyCutoverEvidence) {
  for (const [label, value] of Object.entries({
    "Issue checksum": evidence.issueChecksum,
    "Legacy checksum": evidence.legacyChecksum,
    "Parity checksum": evidence.parityChecksum,
    "Party checksum": evidence.partyChecksum,
  })) {
    if (!/^[a-f0-9]{64}$/.test(value)) {
      invalid(`${label} geçerli değil.`);
    }
  }
  for (const [label, value] of Object.entries({
    "Legacy sayımı": evidence.legacyCount,
    "Mutabık sayım": evidence.matchedCount,
    "Party sayımı": evidence.partyCount,
    "Rol sayımı": evidence.roleCount,
  })) {
    if (!Number.isSafeInteger(value) || value < 0) {
      invalid(`${label} geçerli değil.`);
    }
  }
  if (
    evidence.matchedCount > evidence.legacyCount
    || evidence.matchedCount > evidence.roleCount
  ) {
    invalid("Party cutover mutabık sayımı kaynak sayımlarını aşamaz.");
  }
}

function assertIdentifier(value: string, label: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/.test(value)) {
    invalid(`${label} güvenli değil.`);
  }
}

function invalid(message: string): never {
  throw new PartyCutoverError("INVALID_COMMAND", message);
}

function checksum(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
