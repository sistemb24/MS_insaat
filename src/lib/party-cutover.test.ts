import { describe, expect, it, vi } from "vitest";

import {
  PartyCutoverError,
  createPartyCutoverService,
  partyCutoverIdentifiers,
  resolvePartyCutoverAction,
  validatePartyCutoverCommand,
  type PartyCutoverEvidence,
  type PartyCutoverTransitionCommand,
} from "./party-cutover";

const evidence: PartyCutoverEvidence = {
  issueChecksum: "1".repeat(64),
  legacyChecksum: "2".repeat(64),
  legacyCount: 0,
  matchedCount: 0,
  parityChecksum: "3".repeat(64),
  partyChecksum: "4".repeat(64),
  partyCount: 0,
  roleCount: 0,
};

describe("Party cutover domain", () => {
  it("allows only LEGACY_ONLY and SHADOW_READ transitions", () => {
    expect(resolvePartyCutoverAction("LEGACY_ONLY", "SHADOW_READ"))
      .toBe("ACTIVATE_SHADOW");
    expect(resolvePartyCutoverAction("SHADOW_READ", "LEGACY_ONLY"))
      .toBe("ROLLBACK_LEGACY");
    expect(() => resolvePartyCutoverAction("LEGACY_ONLY", "LEGACY_ONLY"))
      .toThrowError(expect.objectContaining({ reasonCode: "MODE_UNCHANGED" }));
  });

  it("requires exact parity evidence for SHADOW_READ", () => {
    const command = activationCommand();
    validatePartyCutoverCommand(command);

    expect(() => validatePartyCutoverCommand({
      ...command,
      expectedParity: undefined,
    })).toThrowError(expect.objectContaining({ reasonCode: "INVALID_COMMAND" }));
  });

  it("keeps rollback free of parity evidence", () => {
    const command = {
      ...activationCommand(),
      expectedParity: undefined,
      expectedRevisionNo: 1,
      targetMode: "LEGACY_ONLY" as const,
    };
    validatePartyCutoverCommand(command);

    expect(() => validatePartyCutoverCommand({
      ...command,
      expectedParity: evidence,
    })).toThrowError(/rollback komutu parity kanıtı taşımamalıdır/);
  });

  it("rejects future modes before reaching the repository", () => {
    expect(() => validatePartyCutoverCommand({
      ...activationCommand(),
      targetMode: "DUAL_WRITE_LEGACY_READ",
    } as never)).toThrowError(expect.objectContaining({
      reasonCode: "INVALID_COMMAND",
    }));
  });

  it("creates deterministic non-PII identifiers", () => {
    const command = activationCommand();
    expect(partyCutoverIdentifiers(command)).toEqual(
      partyCutoverIdentifiers(command),
    );
    expect(JSON.stringify(partyCutoverIdentifiers(command)))
      .not.toContain(command.scope.tenantId);
  });

  it("validates before delegating to the repository", async () => {
    const repository = { transition: vi.fn().mockResolvedValue({ status: "ACTIVATED" }) };
    const service = createPartyCutoverService({ repository: repository as never });

    await service.transition(activationCommand());
    expect(repository.transition).toHaveBeenCalledOnce();

    expect(() => service.transition({
      ...activationCommand(),
      operationId: "!",
    })).toThrow(PartyCutoverError);
    expect(repository.transition).toHaveBeenCalledOnce();
  });
});

function activationCommand(): PartyCutoverTransitionCommand {
  return {
    actorUserId: "admin-1",
    expectedParity: evidence,
    expectedRevisionNo: 0,
    operationId: "party-cutover-operation-1",
    reasonCode: "SHADOW_VALIDATION",
    releaseId: "3c90539a7f8ce06cc4c72604782412464731deef",
    scope: {
      companyId: "company-1",
      periodId: "period-1",
      tenantId: "tenant-1",
    },
    targetMode: "SHADOW_READ",
  };
}
