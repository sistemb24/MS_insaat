import type { EntityRow } from "./entities";
import type { TenantScope } from "./tenant-scope";

export type PartyKind = "customer" | "subcontractor" | "supplier";
export type PartySlug = "musteriler" | "taseronlar" | "tedarikciler";

export type PartyReference = {
  code: string;
  kind: PartyKind;
  name: string;
  partyKey: string;
  slug: PartySlug;
  taxNumber?: string;
};

export type PartyDiagnosticCode =
  | "ambiguous-name"
  | "duplicate-code"
  | "duplicate-name"
  | "duplicate-tax-number"
  | "invalid-code"
  | "invalid-name"
  | "scope-mismatch"
  | "unresolved-code"
  | "unresolved-name";

export type PartyDiagnostic = {
  code: PartyDiagnosticCode;
  message: string;
  partyKeys: string[];
};

export type PartyReadModel = {
  diagnostics: PartyDiagnostic[];
  parties: PartyReference[];
};

export type PartyStatementReference = {
  counterpartyCode?: string;
  counterpartyKind?: PartyKind;
  counterpartyName: string;
  partyKey?: string;
};

const kindBySlug: Record<PartySlug, PartyKind> = {
  musteriler: "customer",
  taseronlar: "subcontractor",
  tedarikciler: "supplier",
};

const slugByKind: Record<PartyKind, PartySlug> = {
  customer: "musteriler",
  subcontractor: "taseronlar",
  supplier: "tedarikciler",
};

export function isPartySlug(value: string): value is PartySlug {
  return value in kindBySlug;
}

export function partyKindFromSlug(slug: PartySlug) {
  return kindBySlug[slug];
}

export function partySlugFromKind(kind: PartyKind) {
  return slugByKind[kind];
}

export function createPartyKey(kind: PartyKind, code: string) {
  return `${kind}:${normalizePartyCode(code)}`;
}

export function buildPartyReadModel({
  groups,
  scope,
}: {
  groups: Array<{ rows: EntityRow[]; slug: PartySlug }>;
  scope?: Pick<TenantScope, "companyId" | "periodId" | "tenantId">;
}): PartyReadModel {
  const diagnostics: PartyDiagnostic[] = [];
  const parties: PartyReference[] = [];

  for (const group of groups) {
    const kind = partyKindFromSlug(group.slug);

    for (const row of group.rows) {
      const code = normalizePartyCode(row.code);
      const name = normalizePartyName(row.name);
      const provisionalKey = `${kind}:${code || "?"}`;

      if (scope && !rowBelongsToScope(row, scope)) {
        diagnostics.push({
          code: "scope-mismatch",
          message: `${row.code || "Kodsuz cari"} aktif tenant, şirket ve dönem kapsamına ait değil.`,
          partyKeys: [provisionalKey],
        });
        continue;
      }
      if (!code) {
        diagnostics.push({
          code: "invalid-code",
          message: `${name || "Adsız cari"} için cari kodu zorunludur.`,
          partyKeys: [provisionalKey],
        });
        continue;
      }
      if (!name) {
        diagnostics.push({
          code: "invalid-name",
          message: `${code} için cari adı zorunludur.`,
          partyKeys: [provisionalKey],
        });
        continue;
      }

      parties.push({
        code,
        kind,
        name,
        partyKey: createPartyKey(kind, code),
        slug: group.slug,
        ...(normalizeTaxNumber(row.taxNumber)
          ? { taxNumber: normalizeTaxNumber(row.taxNumber) }
          : {}),
      });
    }
  }

  diagnostics.push(
    ...duplicateDiagnostics(parties, "partyKey", "duplicate-code", (value) =>
      `Aynı tür ve cari kodu birden fazla kayıtta kullanılıyor: ${value}`,
    ),
    ...duplicateDiagnostics(
      parties,
      (party) => `${party.kind}:${normalizeLookupText(party.name)}`,
      "duplicate-name",
      (_value, matches) =>
        `Aynı cari türünde aynı ad birden fazla kodla kullanılıyor: ${matches[0]?.name}`,
      true,
    ),
    ...duplicateDiagnostics(
      parties.filter((party) => party.taxNumber),
      (party) => party.taxNumber ?? "",
      "duplicate-tax-number",
      (value) => `Vergi numarası birden fazla cari kimliğine bağlı: ${value}`,
      true,
    ),
  );

  return {
    diagnostics,
    parties: [...parties].sort((left, right) =>
      left.partyKey.localeCompare(right.partyKey, "tr"),
    ),
  };
}

export function linkPartyStatementRows<T extends PartyStatementReference>({
  model,
  rows,
  targetKind,
}: {
  model: PartyReadModel;
  rows: T[];
  targetKind: PartyKind;
}): { diagnostics: PartyDiagnostic[]; rows: Array<T & { partyKey: string }> } {
  const diagnostics: PartyDiagnostic[] = [];
  const linkedRows: Array<T & { partyKey: string }> = [];
  const targetParties = model.parties.filter((party) => party.kind === targetKind);
  const byKey = new Map(targetParties.map((party) => [party.partyKey, party]));
  const byName = groupBy(targetParties, (party) => normalizeLookupText(party.name));

  for (const row of rows) {
    if (row.counterpartyKind && row.counterpartyKind !== targetKind) {
      continue;
    }

    if (row.counterpartyCode) {
      const partyKey = createPartyKey(targetKind, row.counterpartyCode);

      if (byKey.has(partyKey)) {
        linkedRows.push({ ...row, counterpartyKind: targetKind, partyKey });
      } else if (!row.counterpartyKind || row.counterpartyKind === targetKind) {
        diagnostics.push({
          code: "unresolved-code",
          message: `${row.counterpartyCode} kodlu finansal hareket aktif cari kartlarla eşleşmedi.`,
          partyKeys: [partyKey],
        });
      }
      continue;
    }

    const normalizedName = normalizeLookupText(row.counterpartyName);
    const nameMatches = byName.get(normalizedName) ?? [];

    if (nameMatches.length === 1) {
      linkedRows.push({
        ...row,
        counterpartyCode: nameMatches[0].code,
        counterpartyKind: targetKind,
        partyKey: nameMatches[0].partyKey,
      });
    } else if (nameMatches.length > 1) {
      diagnostics.push({
        code: "ambiguous-name",
        message: `${row.counterpartyName} adlı finansal hareket birden fazla cari kartla eşleşiyor.`,
        partyKeys: nameMatches.map((party) => party.partyKey),
      });
    } else if (row.counterpartyKind === targetKind) {
      diagnostics.push({
        code: "unresolved-name",
        message: `${row.counterpartyName} adlı finansal hareket aktif cari kartlarla eşleşmedi.`,
        partyKeys: [],
      });
    }
  }

  return { diagnostics: uniqueDiagnostics(diagnostics), rows: linkedRows };
}

function duplicateDiagnostics(
  parties: PartyReference[],
  selector: keyof PartyReference | ((party: PartyReference) => string),
  code: PartyDiagnosticCode,
  message: (value: string, matches: PartyReference[]) => string,
  requireDifferentKeys = false,
) {
  const grouped = groupBy(parties, (party) =>
    typeof selector === "function" ? selector(party) : String(party[selector]),
  );
  const diagnostics: PartyDiagnostic[] = [];

  for (const [value, matches] of grouped) {
    const partyKeys = [...new Set(matches.map((party) => party.partyKey))];

    if (matches.length < 2 || (requireDifferentKeys && partyKeys.length < 2)) {
      continue;
    }

    diagnostics.push({ code, message: message(value, matches), partyKeys });
  }

  return diagnostics;
}

function groupBy<T>(rows: T[], selector: (row: T) => string) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const key = selector(row);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  return grouped;
}

function uniqueDiagnostics(diagnostics: PartyDiagnostic[]) {
  const seen = new Set<string>();

  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.code}:${diagnostic.message}:${diagnostic.partyKeys.join("|")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rowBelongsToScope(
  row: EntityRow,
  scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">,
) {
  return (
    (!row.tenantId || row.tenantId === scope.tenantId) &&
    (!row.companyId || row.companyId === scope.companyId) &&
    (!row.periodId || row.periodId === scope.periodId)
  );
}

function normalizePartyCode(value: string | undefined) {
  return value?.trim().toLocaleUpperCase("tr-TR") ?? "";
}

function normalizePartyName(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizeLookupText(value: string | undefined) {
  return normalizePartyName(value).toLocaleUpperCase("tr-TR");
}

function normalizeTaxNumber(value: string | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}
