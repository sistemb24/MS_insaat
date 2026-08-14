import { createHash } from "node:crypto";

import type { PartyKind, PartySlug } from "./party-read-model";
import type { TenantScope } from "./tenant-scope";

export type PartyParityScope = Pick<
  TenantScope,
  "companyId" | "periodId" | "tenantId"
>;

export type PartyParityLegacyRecord = {
  code: string;
  companyId: string;
  data: unknown;
  periodId: string;
  slug: string;
  tenantId: string;
};

export type PartyParityPartyRecord = {
  companyId: string;
  displayName: string;
  email?: string | null;
  id: string;
  normalizedName: string;
  normalizedTaxNumber?: string | null;
  periodId: string;
  phone?: string | null;
  status: string;
  taxNumber?: string | null;
  tenantId: string;
};

export type PartyParityRoleRecord = {
  code: string;
  companyId: string;
  id: string;
  kind: string;
  legacyCode: string;
  legacySlug: string;
  normalizedCode: string;
  partyId: string;
  periodId: string;
  status: string;
  tenantId: string;
};

export type PartyParitySnapshot = {
  legacyRecords: PartyParityLegacyRecord[];
  parties: PartyParityPartyRecord[];
  roles: PartyParityRoleRecord[];
};

export type PartyParityIssueCode =
  | "CANONICAL_FIELD_MISMATCH"
  | "DUPLICATE_LEGACY_ROLE_KEY"
  | "DUPLICATE_PARTY_ROLE_KEY"
  | "INVALID_LEGACY_RECORD"
  | "INVALID_PARTY_RECORD"
  | "INVALID_PARTY_ROLE"
  | "LEGACY_SCOPE_MISMATCH"
  | "ORPHAN_PARTY_ROLE"
  | "PARTY_SCOPE_MISMATCH"
  | "ROLE_SCOPE_MISMATCH"
  | "UNMATCHED_LEGACY_RECORD"
  | "UNMATCHED_PARTY_ROLE"
  | "UNREFERENCED_PARTY";

export type PartyParityIssue = {
  checksum: string;
  code: PartyParityIssueCode;
  differingFields: string[];
  partyFingerprints: string[];
  roleKeyFingerprints: string[];
};

export type PartyParityReadModel = {
  issueChecksum: string;
  issues: PartyParityIssue[];
  legacyChecksum: string;
  legacyCount: number;
  matchedCount: number;
  parityChecksum: string;
  partyChecksum: string;
  partyCount: number;
  ready: boolean;
  roleCount: number;
  scopeFingerprint: string;
};

export type PartyParityReadRepository = {
  readScope(input: { scope: PartyParityScope }): Promise<PartyParitySnapshot>;
};

type CanonicalRole = {
  code: string;
  displayName: string;
  email: string;
  kind: PartyKind;
  legacyCode: string;
  legacySlug: PartySlug;
  normalizedCode: string;
  normalizedName: string;
  normalizedTaxNumber: string;
  partyStatus: "ACTIVE" | "INACTIVE";
  phone: string;
  roleStatus: "ACTIVE" | "INACTIVE";
  taxNumber: string;
};

const canonicalFields: Array<keyof CanonicalRole> = [
  "code",
  "displayName",
  "email",
  "kind",
  "legacyCode",
  "legacySlug",
  "normalizedCode",
  "normalizedName",
  "normalizedTaxNumber",
  "partyStatus",
  "phone",
  "roleStatus",
  "taxNumber",
];

const kindBySlug: Record<PartySlug, PartyKind> = {
  musteriler: "customer",
  taseronlar: "subcontractor",
  tedarikciler: "supplier",
};

export async function readPartyParityReadModel({
  repository,
  scope,
}: {
  repository: PartyParityReadRepository;
  scope: PartyParityScope;
}) {
  return buildPartyParityReadModel({
    scope,
    snapshot: await repository.readScope({ scope }),
  });
}

export function buildPartyParityReadModel({
  scope,
  snapshot,
}: {
  scope: PartyParityScope;
  snapshot: PartyParitySnapshot;
}): PartyParityReadModel {
  const issues: PartyParityIssue[] = [];
  const canonicalLegacy: Array<{ roleKey: string; value: CanonicalRole }> = [];
  const canonicalRoles: Array<{
    partyId: string;
    roleKey: string;
    value: CanonicalRole;
  }> = [];
  const partiesById = new Map<string, PartyParityPartyRecord>();
  const referencedPartyIds = new Set<string>();

  for (const party of snapshot.parties) {
    if (!belongsToScope(party, scope)) {
      issues.push(createIssue("PARTY_SCOPE_MISMATCH", [], [party.id]));
      continue;
    }
    if (
      !party.id.trim()
      || !normalizeName(party.displayName)
      || !normalizePartyStatus(party.status)
    ) {
      issues.push(createIssue("INVALID_PARTY_RECORD", [], [party.id]));
      continue;
    }
    if (partiesById.has(party.id)) {
      issues.push(createIssue("INVALID_PARTY_RECORD", [], [party.id]));
      continue;
    }
    partiesById.set(party.id, party);
  }

  for (const record of snapshot.legacyRecords) {
    if (!belongsToScope(record, scope)) {
      issues.push(createIssue("LEGACY_SCOPE_MISMATCH", [legacyRoleKey(record)], []));
      continue;
    }
    const canonical = canonicalizeLegacy(record);
    if (!canonical) {
      issues.push(createIssue("INVALID_LEGACY_RECORD", [legacyRoleKey(record)], []));
      continue;
    }
    canonicalLegacy.push(canonical);
  }

  for (const role of snapshot.roles) {
    const provisionalRoleKey = partyRoleKey(role.kind, role.normalizedCode || role.code);
    if (!belongsToScope(role, scope)) {
      issues.push(createIssue("ROLE_SCOPE_MISMATCH", [provisionalRoleKey], [role.partyId]));
      continue;
    }
    const party = partiesById.get(role.partyId);
    if (!party) {
      issues.push(createIssue("ORPHAN_PARTY_ROLE", [provisionalRoleKey], [role.partyId]));
      continue;
    }
    referencedPartyIds.add(party.id);
    const canonical = canonicalizeRole(role, party);
    if (!canonical) {
      issues.push(createIssue("INVALID_PARTY_ROLE", [provisionalRoleKey], [party.id]));
      continue;
    }
    canonicalRoles.push({ ...canonical, partyId: party.id });
  }

  for (const partyId of partiesById.keys()) {
    if (!referencedPartyIds.has(partyId)) {
      issues.push(createIssue("UNREFERENCED_PARTY", [], [partyId]));
    }
  }

  const uniqueLegacy = uniqueByRoleKey(
    canonicalLegacy,
    "DUPLICATE_LEGACY_ROLE_KEY",
    issues,
  );
  const uniqueRoles = uniqueByRoleKey(
    canonicalRoles,
    "DUPLICATE_PARTY_ROLE_KEY",
    issues,
  );
  const roleByKey = new Map(uniqueRoles.map((row) => [row.roleKey, row]));
  let matchedCount = 0;

  for (const legacy of uniqueLegacy) {
    const role = roleByKey.get(legacy.roleKey);
    if (!role) {
      issues.push(createIssue("UNMATCHED_LEGACY_RECORD", [legacy.roleKey], []));
      continue;
    }
    roleByKey.delete(legacy.roleKey);
    const differingFields = canonicalFields.filter(
      (field) => legacy.value[field] !== role.value[field],
    );
    if (differingFields.length > 0) {
      issues.push(createIssue(
        "CANONICAL_FIELD_MISMATCH",
        [legacy.roleKey],
        [role.partyId],
        differingFields,
      ));
      continue;
    }
    matchedCount += 1;
  }

  for (const role of roleByKey.values()) {
    issues.push(createIssue("UNMATCHED_PARTY_ROLE", [role.roleKey], [role.partyId]));
  }

  const orderedIssues = uniqueIssues(issues).sort(compareIssues);
  const legacyChecksum = checksum(
    [...canonicalLegacy]
      .sort((left, right) => left.roleKey.localeCompare(right.roleKey, "tr"))
      .map((row) => ({ roleKey: row.roleKey, ...row.value })),
  );
  const partyChecksum = checksum({
    parties: [...partiesById.values()]
      .map(canonicalizePartyRecord)
      .sort(compareJson),
    roles: [...canonicalRoles]
      .sort((left, right) => left.roleKey.localeCompare(right.roleKey, "tr"))
      .map((row) => ({ partyId: row.partyId, roleKey: row.roleKey, ...row.value })),
  });
  const issueChecksum = checksum(orderedIssues);

  return {
    issueChecksum,
    issues: orderedIssues,
    legacyChecksum,
    legacyCount: snapshot.legacyRecords.length,
    matchedCount,
    parityChecksum: checksum({ issueChecksum, legacyChecksum, partyChecksum, scope }),
    partyChecksum,
    partyCount: snapshot.parties.length,
    ready: orderedIssues.length === 0,
    roleCount: snapshot.roles.length,
    scopeFingerprint: fingerprint(scope),
  };
}

function canonicalizeLegacy(record: PartyParityLegacyRecord) {
  if (!isPartySlug(record.slug)) return null;
  const data = readJsonObject(record.data);
  const normalizedCode = normalizeCode(record.code);
  const displayName = normalizeName(data.name);
  const status = normalizeLegacyStatus(data.status);
  if (!normalizedCode || !displayName || !status) return null;

  return {
    roleKey: partyRoleKey(kindBySlug[record.slug], normalizedCode),
    value: {
      code: record.code.trim(),
      displayName,
      email: normalizeOptional(data.email),
      kind: kindBySlug[record.slug],
      legacyCode: record.code,
      legacySlug: record.slug,
      normalizedCode,
      normalizedName: normalizeLookupText(displayName),
      normalizedTaxNumber: normalizeTaxNumber(data.taxNumber),
      partyStatus: status,
      phone: normalizeOptional(data.phone),
      roleStatus: status,
      taxNumber: normalizeOptional(data.taxNumber),
    },
  };
}

function canonicalizeRole(
  role: PartyParityRoleRecord,
  party: PartyParityPartyRecord,
) {
  if (!isPartyKind(role.kind) || !isPartySlug(role.legacySlug)) return null;
  if (kindBySlug[role.legacySlug] !== role.kind) return null;
  const normalizedCode = normalizeCode(role.normalizedCode || role.code);
  const displayName = normalizeName(party.displayName);
  const roleStatus = normalizePartyStatus(role.status);
  const partyStatus = normalizePartyStatus(party.status);
  if (!normalizedCode || !displayName || !roleStatus || !partyStatus) return null;

  return {
    roleKey: partyRoleKey(role.kind, normalizedCode),
    value: {
      code: role.code.trim(),
      displayName,
      email: normalizeOptional(party.email),
      kind: role.kind,
      legacyCode: role.legacyCode,
      legacySlug: role.legacySlug,
      normalizedCode,
      normalizedName: normalizeLookupText(party.normalizedName),
      normalizedTaxNumber: normalizeTaxNumber(party.normalizedTaxNumber),
      partyStatus,
      phone: normalizeOptional(party.phone),
      roleStatus,
      taxNumber: normalizeOptional(party.taxNumber),
    },
  };
}

function canonicalizePartyRecord(party: PartyParityPartyRecord) {
  return {
    displayName: normalizeName(party.displayName),
    email: normalizeOptional(party.email),
    id: party.id,
    normalizedName: normalizeLookupText(party.normalizedName),
    normalizedTaxNumber: normalizeTaxNumber(party.normalizedTaxNumber),
    phone: normalizeOptional(party.phone),
    status: normalizePartyStatus(party.status) ?? "INVALID",
    taxNumber: normalizeOptional(party.taxNumber),
  };
}

function uniqueByRoleKey<T extends { partyId?: string; roleKey: string }>(
  rows: T[],
  code: "DUPLICATE_LEGACY_ROLE_KEY" | "DUPLICATE_PARTY_ROLE_KEY",
  issues: PartyParityIssue[],
) {
  const grouped = groupBy(rows, (row) => row.roleKey);
  const unique: T[] = [];
  for (const [roleKey, matches] of grouped) {
    if (matches.length === 1) {
      unique.push(matches[0]);
      continue;
    }
    issues.push(createIssue(
      code,
      [roleKey],
      matches.flatMap((match) => match.partyId ? [match.partyId] : []),
    ));
  }
  return unique;
}

function createIssue(
  code: PartyParityIssueCode,
  roleKeys: string[],
  partyIds: string[],
  differingFields: string[] = [],
): PartyParityIssue {
  const value = {
    code,
    differingFields: [...new Set(differingFields)].sort(),
    partyFingerprints: [...new Set(partyIds.map(fingerprint))].sort(),
    roleKeyFingerprints: [...new Set(roleKeys.map(fingerprint))].sort(),
  };
  return { ...value, checksum: checksum(value) };
}

function uniqueIssues(issues: PartyParityIssue[]) {
  return [...new Map(issues.map((issue) => [issue.checksum, issue])).values()];
}

function compareIssues(left: PartyParityIssue, right: PartyParityIssue) {
  return `${left.code}:${left.roleKeyFingerprints.join("|")}:${left.partyFingerprints.join("|")}`
    .localeCompare(
      `${right.code}:${right.roleKeyFingerprints.join("|")}:${right.partyFingerprints.join("|")}`,
      "tr",
    );
}

function belongsToScope(
  row: { companyId: string; periodId: string; tenantId: string },
  scope: PartyParityScope,
) {
  return row.tenantId === scope.tenantId
    && row.companyId === scope.companyId
    && row.periodId === scope.periodId;
}

function legacyRoleKey(record: PartyParityLegacyRecord) {
  const kind = isPartySlug(record.slug) ? kindBySlug[record.slug] : "invalid";
  return partyRoleKey(kind, record.code);
}

function partyRoleKey(kind: string, code: string) {
  return `${kind}:${normalizeCode(code) || "?"}`;
}

function isPartyKind(value: string): value is PartyKind {
  return value === "customer" || value === "subcontractor" || value === "supplier";
}

function isPartySlug(value: string): value is PartySlug {
  return value === "musteriler" || value === "taseronlar" || value === "tedarikciler";
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
  return normalizeName(value);
}

function normalizeTaxNumber(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeLegacyStatus(value: string | undefined) {
  const normalized = normalizeLookupText(value);
  if (normalized === "ACTIVE" || normalized === "AKTİF") return "ACTIVE" as const;
  if (normalized === "INACTIVE" || normalized === "PASİF") return "INACTIVE" as const;
  return null;
}

function normalizePartyStatus(value: string | undefined) {
  if (value === "ACTIVE") return "ACTIVE" as const;
  if (value === "INACTIVE") return "INACTIVE" as const;
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
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const key = selector(row);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function fingerprint(value: unknown) {
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
