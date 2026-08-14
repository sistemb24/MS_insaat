import { createHash } from "node:crypto";

import type { PartyKind, PartySlug } from "./party-read-model";
import type { TenantScope } from "./tenant-scope";

export const PARTY_BACKFILL_VERSION = "party-v1";

export type LegacyPartyRecord = {
  code: string;
  companyId: string;
  createdAt: Date | string;
  createdBy: string;
  data: unknown;
  periodId: string;
  slug: string;
  tenantId: string;
  updatedAt: Date | string;
  updatedBy: string;
};

export type ExistingPartyRole = {
  code: string;
  kind: PartyKind;
  legacyCode: string;
  legacySlug: PartySlug;
  normalizedCode: string;
  party: {
    displayName: string;
    email?: string | null;
    normalizedName: string;
    normalizedTaxNumber?: string | null;
    phone?: string | null;
    status: string;
    taxNumber?: string | null;
  };
  status: string;
};

export type PartyBackfillCandidate = {
  checksum: string;
  party: {
    backfillRunId: string;
    companyId: string;
    createdAt: string;
    createdBy: string;
    displayName: string;
    email?: string;
    id: string;
    normalizedName: string;
    normalizedTaxNumber?: string;
    periodId: string;
    phone?: string;
    revisionNo: number;
    sourceType: "ENTITY_RECORD_BACKFILL";
    status: PartyStatus;
    taxNumber?: string;
    tenantId: string;
    updatedAt: string;
    updatedBy: string;
  };
  role: {
    code: string;
    companyId: string;
    createdAt: string;
    createdBy: string;
    id: string;
    kind: PartyKind;
    legacyCode: string;
    legacySlug: PartySlug;
    normalizedCode: string;
    partyId: string;
    periodId: string;
    revisionNo: number;
    status: PartyStatus;
    tenantId: string;
    updatedAt: string;
    updatedBy: string;
  };
};

export type PartyBackfillIssueCode =
  | "DUPLICATE_NORMALIZED_CODE"
  | "DUPLICATE_TAX_NUMBER"
  | "EXISTING_PARTY_MISMATCH"
  | "INVALID_CODE"
  | "INVALID_NAME"
  | "INVALID_STATUS"
  | "SCOPE_MISMATCH"
  | "UNSUPPORTED_SLUG";

export type PartyBackfillIssue = {
  checksum: string;
  details: Record<string, unknown>;
  id: string;
  issueCode: PartyBackfillIssueCode;
  issueKey: string;
  severity: "BLOCKING" | "WARNING";
  sourceRefs: Array<{ code: string; slug: string }>;
};

export type PartyBackfillPlan = {
  candidates: PartyBackfillCandidate[];
  issues: PartyBackfillIssue[];
  run: {
    candidateCount: number;
    id: string;
    issueCount: number;
    sourceChecksum: string;
    sourceCount: number;
    unchangedCount: number;
    version: string;
  };
};

type PartyStatus = "ACTIVE" | "INACTIVE";
type PreparedParty = Omit<PartyBackfillCandidate, "checksum"> & {
  sourceRef: { code: string; slug: PartySlug };
};

const kindBySlug: Record<PartySlug, PartyKind> = {
  musteriler: "customer",
  taseronlar: "subcontractor",
  tedarikciler: "supplier",
};

export function buildPartyBackfillPlan({
  existingRoles = [],
  records,
  scope,
  version = PARTY_BACKFILL_VERSION,
}: {
  existingRoles?: ExistingPartyRole[];
  records: LegacyPartyRecord[];
  scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">;
  version?: string;
}): PartyBackfillPlan {
  const sourceChecksum = checksum(records.map(canonicalLegacyRecord).sort(compareJson));
  const runId = stableId("party-backfill-run", {
    ...scope,
    sourceChecksum,
    version,
  });
  const issues: PartyBackfillIssue[] = [];
  const prepared: PreparedParty[] = [];

  for (const record of records) {
    const result = prepareParty({ record, runId, scope });
    if (result.issue) issues.push(result.issue);
    if (result.party) prepared.push(result.party);
  }

  const byRoleKey = groupBy(prepared, (row) =>
    `${row.role.kind}:${row.role.normalizedCode}`,
  );
  const eligible: PreparedParty[] = [];

  for (const [roleKey, matches] of byRoleKey) {
    if (matches.length === 1) {
      eligible.push(matches[0]);
      continue;
    }
    issues.push(createIssue({
      code: "DUPLICATE_NORMALIZED_CODE",
      details: { matchCount: matches.length, roleKey },
      severity: "BLOCKING",
      sourceRefs: matches.map((match) => match.sourceRef),
    }));
  }

  for (const [taxNumber, matches] of groupBy(
    eligible.filter((row) => row.party.normalizedTaxNumber),
    (row) => row.party.normalizedTaxNumber ?? "",
  )) {
    if (matches.length < 2) continue;
    issues.push(createIssue({
      code: "DUPLICATE_TAX_NUMBER",
      details: { matchCount: matches.length, taxNumberFingerprint: fingerprint(taxNumber) },
      severity: "WARNING",
      sourceRefs: matches.map((match) => match.sourceRef),
    }));
  }

  const existingByRoleKey = new Map(
    existingRoles.map((role) => [
      `${role.kind}:${normalizeCode(role.normalizedCode || role.code)}`,
      role,
    ]),
  );
  const candidates: PartyBackfillCandidate[] = [];
  let unchangedCount = 0;

  for (const row of eligible) {
    const existing = existingByRoleKey.get(
      `${row.role.kind}:${row.role.normalizedCode}`,
    );
    const candidate = toCandidate(row);
    if (!existing) {
      candidates.push(candidate);
      continue;
    }
    if (existingChecksum(existing) === candidate.checksum) {
      unchangedCount += 1;
      continue;
    }
    issues.push(createIssue({
      code: "EXISTING_PARTY_MISMATCH",
      details: {
        differingFields: differingCanonicalFields(existing, candidate),
        roleKey: `${row.role.kind}:${row.role.normalizedCode}`,
      },
      severity: "BLOCKING",
      sourceRefs: [row.sourceRef],
    }));
  }

  const uniqueRunIssues = uniqueIssues(issues)
    .map((issue) => ({
      ...issue,
      id: stableId("party-backfill-issue", {
        issueKey: issue.issueKey,
        runId,
      }),
    }))
    .sort((left, right) => left.issueKey.localeCompare(right.issueKey));

  return {
    candidates: candidates.sort((left, right) => left.role.id.localeCompare(right.role.id)),
    issues: uniqueRunIssues,
    run: {
      candidateCount: candidates.length,
      id: runId,
      issueCount: uniqueRunIssues.length,
      sourceChecksum,
      sourceCount: records.length,
      unchangedCount,
      version,
    },
  };
}

function prepareParty({
  record,
  runId,
  scope,
}: {
  record: LegacyPartyRecord;
  runId: string;
  scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">;
}): { issue?: PartyBackfillIssue; party?: PreparedParty } {
  const sourceRef = { code: record.code, slug: record.slug };
  if (!isPartySlug(record.slug)) {
    return { issue: createIssue({
      code: "UNSUPPORTED_SLUG",
      details: {},
      severity: "BLOCKING",
      sourceRefs: [sourceRef],
    }) };
  }
  if (!belongsToScope(record, scope)) {
    return { issue: createIssue({
      code: "SCOPE_MISMATCH",
      details: {},
      severity: "BLOCKING",
      sourceRefs: [sourceRef],
    }) };
  }

  const data = readJsonObject(record.data);
  const normalizedCode = normalizeCode(record.code);
  const displayName = normalizeName(data.name);
  if (!normalizedCode) {
    return { issue: createIssue({ code: "INVALID_CODE", details: {}, severity: "BLOCKING", sourceRefs: [sourceRef] }) };
  }
  if (!displayName) {
    return { issue: createIssue({ code: "INVALID_NAME", details: {}, severity: "BLOCKING", sourceRefs: [sourceRef] }) };
  }
  const status = normalizeStatus(data.status);
  if (!status) {
    return { issue: createIssue({ code: "INVALID_STATUS", details: {}, severity: "BLOCKING", sourceRefs: [sourceRef] }) };
  }

  const sourceKey = { ...scope, legacySlug: record.slug, normalizedCode };
  const partyId = stableId("party", sourceKey);
  const roleId = stableId("party-role", sourceKey);
  const taxNumber = normalizeOptional(data.taxNumber);
  const normalizedTaxNumber = normalizeTaxNumber(taxNumber);
  const createdAt = toIsoString(record.createdAt);
  const updatedAt = toIsoString(record.updatedAt);

  return {
    party: {
      party: {
        backfillRunId: runId,
        ...scope,
        createdAt,
        createdBy: record.createdBy,
        displayName,
        ...(normalizeOptional(data.email) ? { email: normalizeOptional(data.email) } : {}),
        id: partyId,
        normalizedName: normalizeLookupText(displayName),
        ...(normalizedTaxNumber ? { normalizedTaxNumber } : {}),
        ...(normalizeOptional(data.phone) ? { phone: normalizeOptional(data.phone) } : {}),
        revisionNo: 1,
        sourceType: "ENTITY_RECORD_BACKFILL",
        status,
        ...(taxNumber ? { taxNumber } : {}),
        updatedAt,
        updatedBy: record.updatedBy,
      },
      role: {
        code: record.code.trim(),
        ...scope,
        createdAt,
        createdBy: record.createdBy,
        id: roleId,
        kind: kindBySlug[record.slug],
        legacyCode: record.code,
        legacySlug: record.slug,
        normalizedCode,
        partyId,
        revisionNo: 1,
        status,
        updatedAt,
        updatedBy: record.updatedBy,
      },
      sourceRef: { code: record.code, slug: record.slug },
    },
  };
}

function toCandidate(row: PreparedParty): PartyBackfillCandidate {
  const canonical = canonicalCandidate(row);
  return { checksum: checksum(canonical), party: row.party, role: row.role };
}

function canonicalCandidate(row: Pick<PreparedParty, "party" | "role">) {
  return {
    code: row.role.code.trim(),
    displayName: row.party.displayName,
    email: row.party.email ?? "",
    kind: row.role.kind,
    legacyCode: row.role.legacyCode,
    legacySlug: row.role.legacySlug,
    normalizedCode: row.role.normalizedCode,
    normalizedName: row.party.normalizedName,
    normalizedTaxNumber: row.party.normalizedTaxNumber ?? "",
    phone: row.party.phone ?? "",
    status: row.role.status,
    taxNumber: row.party.taxNumber ?? "",
  };
}

function existingChecksum(role: ExistingPartyRole) {
  return checksum({
    code: role.code.trim(),
    displayName: normalizeName(role.party.displayName),
    email: normalizeOptional(role.party.email) ?? "",
    kind: role.kind,
    legacyCode: role.legacyCode,
    legacySlug: role.legacySlug,
    normalizedCode: normalizeCode(role.normalizedCode),
    normalizedName: normalizeLookupText(role.party.normalizedName),
    normalizedTaxNumber: normalizeTaxNumber(role.party.normalizedTaxNumber) ?? "",
    phone: normalizeOptional(role.party.phone) ?? "",
    status: role.status,
    taxNumber: normalizeOptional(role.party.taxNumber) ?? "",
  });
}

function differingCanonicalFields(existing: ExistingPartyRole, candidate: PartyBackfillCandidate) {
  const left = canonicalExisting(existing);
  const right = canonicalCandidate(candidate);
  return Object.keys(right).filter((key) =>
    left[key as keyof typeof left] !== right[key as keyof typeof right],
  );
}

function canonicalExisting(role: ExistingPartyRole) {
  return {
    code: role.code.trim(),
    displayName: normalizeName(role.party.displayName),
    email: normalizeOptional(role.party.email) ?? "",
    kind: role.kind,
    legacyCode: role.legacyCode,
    legacySlug: role.legacySlug,
    normalizedCode: normalizeCode(role.normalizedCode),
    normalizedName: normalizeLookupText(role.party.normalizedName),
    normalizedTaxNumber: normalizeTaxNumber(role.party.normalizedTaxNumber) ?? "",
    phone: normalizeOptional(role.party.phone) ?? "",
    status: role.status,
    taxNumber: normalizeOptional(role.party.taxNumber) ?? "",
  };
}

function canonicalLegacyRecord(record: LegacyPartyRecord) {
  return {
    code: record.code,
    companyId: record.companyId,
    data: readJsonObject(record.data),
    periodId: record.periodId,
    slug: record.slug,
    tenantId: record.tenantId,
  };
}

function createIssue({
  code,
  details,
  severity,
  sourceRefs,
}: {
  code: PartyBackfillIssueCode;
  details: Record<string, unknown>;
  severity: PartyBackfillIssue["severity"];
  sourceRefs: PartyBackfillIssue["sourceRefs"];
}): PartyBackfillIssue {
  const orderedSourceRefs = [...sourceRefs].sort((left, right) =>
    `${left.slug}:${left.code}`.localeCompare(`${right.slug}:${right.code}`, "tr"),
  );
  const issueKey = stableId("party-backfill-issue-key", {
    code,
    sourceRefs: orderedSourceRefs,
  });
  const issueChecksum = checksum({
    code,
    details,
    severity,
    sourceRefs: orderedSourceRefs,
  });
  return {
    checksum: issueChecksum,
    details,
    id: stableId("party-backfill-issue", { issueChecksum, issueKey }),
    issueCode: code,
    issueKey,
    severity,
    sourceRefs: orderedSourceRefs,
  };
}

function uniqueIssues(issues: PartyBackfillIssue[]) {
  return [...new Map(issues.map((issue) => [issue.issueKey, issue])).values()];
}

function belongsToScope(
  record: LegacyPartyRecord,
  scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">,
) {
  return record.tenantId === scope.tenantId
    && record.companyId === scope.companyId
    && record.periodId === scope.periodId;
}

function isPartySlug(value: string): value is PartySlug {
  return value in kindBySlug;
}

function normalizeCode(value: string | null | undefined) {
  return String(value ?? "").normalize("NFKC").trim().toLocaleUpperCase("tr-TR");
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizeLookupText(value: string | null | undefined) {
  return normalizeName(value).toLocaleUpperCase("tr-TR");
}

function normalizeOptional(value: string | null | undefined) {
  const normalized = normalizeName(value);
  return normalized || undefined;
}

function normalizeTaxNumber(value: string | null | undefined) {
  const normalized = String(value ?? "").replace(/\D/g, "");
  return normalized || undefined;
}

function normalizeStatus(value: string | undefined): PartyStatus | null {
  const normalized = normalizeLookupText(value);
  if (normalized === "ACTIVE" || normalized === "AKTİF") return "ACTIVE";
  if (normalized === "INACTIVE" || normalized === "PASİF") return "INACTIVE";
  return null;
}

function readJsonObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item ?? "")]),
  );
}

function groupBy<T>(rows: T[], selector: (row: T) => string) {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const key = selector(row);
    result.set(key, [...(result.get(key) ?? []), row]);
  }
  return result;
}

function stableId(prefix: string, value: unknown) {
  return `${prefix}_${checksum(value).slice(0, 32)}`;
}

function fingerprint(value: string) {
  return checksum(value).slice(0, 12);
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

function compareJson(left: unknown, right: unknown) {
  return stableJson(left).localeCompare(stableJson(right));
}

function toIsoString(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString();
  return date.toISOString();
}
