import type { ProductionPartyZeroApplyConfig } from "./production-party-transition";

export type ProductionPartyZeroApplyPostflightRead = {
  auditCount: number;
  financialCounts: {
    cashBankMovement: number;
    ledgerEntry: number;
    progressPayment: number;
    purchaseInvoice: number;
    salesInvoice: number;
  };
  issueCount: number;
  partyCount: number;
  roleCount: number;
  run: {
    candidateCount: number;
    issueCount: number;
    sourceChecksum: string;
    sourceCount: number;
    status: string;
    version: string;
  } | null;
  runCount: number;
  transactionReadOnly: boolean;
};

export type ProductionPartyZeroApplyPostflightRepository = {
  readExactState(input: {
    actorUserId: string;
    runId: string;
    scope: ProductionPartyZeroApplyConfig["scope"];
  }): Promise<ProductionPartyZeroApplyPostflightRead>;
};

export async function runProductionPartyZeroApplyPostflight(input: {
  config: ProductionPartyZeroApplyConfig;
  repository: ProductionPartyZeroApplyPostflightRepository;
}) {
  const read = await input.repository.readExactState({
    actorUserId: input.config.actorUserId,
    runId: input.config.expectedRunId,
    scope: input.config.scope,
  });
  const blockers: string[] = [];
  if (!read.transactionReadOnly) blockers.push("TRANSACTION_NOT_READ_ONLY");
  if (read.runCount !== 1) blockers.push("RUN_COUNT_MISMATCH");
  if (!read.run) blockers.push("VERIFIED_RUN_NOT_FOUND");
  else {
    if (read.run.status !== "VERIFIED") blockers.push("RUN_NOT_VERIFIED");
    if (read.run.version !== "party-v1") blockers.push("RUN_VERSION_MISMATCH");
    if (read.run.sourceChecksum !== input.config.expectedSourceChecksum) {
      blockers.push("RUN_SOURCE_CHECKSUM_MISMATCH");
    }
    if (read.run.sourceCount !== 0) blockers.push("RUN_SOURCE_COUNT_NOT_ZERO");
    if (read.run.candidateCount !== 0) blockers.push("RUN_CANDIDATE_COUNT_NOT_ZERO");
    if (read.run.issueCount !== 0) blockers.push("RUN_ISSUE_COUNT_NOT_ZERO");
  }
  if (read.partyCount !== 0) blockers.push("PARTY_COUNT_NOT_ZERO");
  if (read.roleCount !== 0) blockers.push("ROLE_COUNT_NOT_ZERO");
  if (read.issueCount !== 0) blockers.push("ISSUE_COUNT_NOT_ZERO");
  if (read.auditCount !== 1) blockers.push("AUDIT_COUNT_MISMATCH");
  if (Object.values(read.financialCounts).some((count) => count !== 0)) {
    blockers.push("FINANCIAL_COUNTS_NOT_ZERO");
  }
  return {
    auditCount: read.auditCount,
    blockers: [...new Set(blockers)].sort(),
    financialCounts: read.financialCounts,
    issueCount: read.issueCount,
    partyCount: read.partyCount,
    ready: blockers.length === 0,
    releaseId: input.config.releaseId,
    roleCount: read.roleCount,
    runCount: read.runCount,
    runId: input.config.expectedRunId,
    transactionReadOnly: read.transactionReadOnly,
  };
}
