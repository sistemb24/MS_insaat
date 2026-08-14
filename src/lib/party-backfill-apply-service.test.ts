import { describe, expect, it, vi } from "vitest";

import {
  PARTY_BACKFILL_APPLY_CONFIRMATION,
  createPartyBackfillApplyService,
} from "./party-backfill-apply-service";

const scope = {
  companyId: "company-1",
  periodId: "period-1",
  tenantId: "tenant-1",
};
const checksum = "a".repeat(64);

describe("party backfill apply service", () => {
  it("keeps preview read-only and delegates exact scope", async () => {
    const plan = { candidates: [], issues: [], run: { candidateCount: 0 } };
    const repository = {
      applyAtomically: vi.fn(),
      previewConsistently: vi.fn().mockResolvedValue(plan),
    };
    const service = createPartyBackfillApplyService({
      repository: repository as never,
      runtimeEnvironment: "test",
    });

    await expect(service.preview({ scope })).resolves.toBe(plan);
    expect(repository.previewConsistently).toHaveBeenCalledWith({
      scope,
      version: "party-v1",
    });
    expect(repository.applyAtomically).not.toHaveBeenCalled();
  });

  it("rejects production before invoking the mutation port", async () => {
    const repository = { applyAtomically: vi.fn(), previewConsistently: vi.fn() };
    const service = createPartyBackfillApplyService({
      repository: repository as never,
      runtimeEnvironment: "production",
    });

    const result = await service.apply(validInput());

    expect(result).toEqual({
      data: null,
      errors: ["Party backfill apply bu dilimde production ortamında kapalıdır."],
      ok: false,
    });
    expect(repository.applyAtomically).not.toHaveBeenCalled();
  });

  it("fails closed when the runtime environment cannot be proven", async () => {
    const repository = { applyAtomically: vi.fn(), previewConsistently: vi.fn() };
    const service = createPartyBackfillApplyService({
      repository: repository as never,
      runtimeEnvironment: undefined,
    });

    await expect(service.apply(validInput())).resolves.toMatchObject({
      errors: [expect.stringMatching(/ortamı doğrulanamadığı/)],
      ok: false,
    });
    expect(repository.applyAtomically).not.toHaveBeenCalled();
  });

  it("requires exact confirmation, checksum, actor and approved row limit", async () => {
    const repository = { applyAtomically: vi.fn(), previewConsistently: vi.fn() };
    const service = createPartyBackfillApplyService({
      repository: repository as never,
      runtimeEnvironment: "staging",
    });

    await expect(service.apply({ ...validInput(), confirmation: "yes" }))
      .resolves.toMatchObject({ ok: false, errors: [expect.stringMatching(/onay/)] });
    await expect(service.apply({ ...validInput(), expectedSourceChecksum: "bad" }))
      .resolves.toMatchObject({ ok: false, errors: [expect.stringMatching(/checksum/)] });
    await expect(service.apply({ ...validInput(), actorUserId: " " }))
      .resolves.toMatchObject({ ok: false, errors: [expect.stringMatching(/kullanıcı/)] });
    await expect(service.apply({ ...validInput(), approvedSourceCountLimit: -1 }))
      .resolves.toMatchObject({ ok: false, errors: [expect.stringMatching(/limit/)] });
    expect(repository.applyAtomically).not.toHaveBeenCalled();
  });

  it("passes only normalized approved execution input to the repository", async () => {
    const summary = {
      blockingIssueCount: 0,
      candidateCount: 1,
      issueCount: 0,
      reused: false,
      runId: "run-1",
      sourceChecksum: checksum,
      sourceCount: 1,
      status: "VERIFIED",
      warningIssueCount: 0,
    };
    const repository = {
      applyAtomically: vi.fn().mockResolvedValue(summary),
      previewConsistently: vi.fn(),
    };
    const service = createPartyBackfillApplyService({
      repository: repository as never,
      runtimeEnvironment: "staging",
    });

    await expect(service.apply(validInput())).resolves.toEqual({
      data: summary,
      errors: [],
      ok: true,
    });
    expect(repository.applyAtomically).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      approvedSourceCountLimit: 5,
      expectedSourceChecksum: checksum,
      scope,
      version: "party-v1",
    });
  });
});

function validInput() {
  return {
    actorUserId: " admin-1 ",
    approvedSourceCountLimit: 5,
    confirmation: PARTY_BACKFILL_APPLY_CONFIRMATION,
    expectedSourceChecksum: checksum,
    scope,
  };
}
