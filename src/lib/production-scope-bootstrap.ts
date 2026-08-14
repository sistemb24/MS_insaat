import { createHash } from "node:crypto";

export const PRODUCTION_SCOPE_BOOTSTRAP_CONFIRMATION =
  "production-scope-bootstrap";
export const PRODUCTION_SCOPE_BOOTSTRAP_VERSION =
  "production-scope-bootstrap-v1";
export const PRODUCTION_SCOPE_LICENSE_LABEL = "Production";

export type ProductionScopeBootstrapManifest = {
  admin: {
    name: string;
    userId: string;
  };
  company: {
    companyId: string;
    name: string;
  };
  licenseLabel: string;
  manifestChecksum: string;
  period: {
    endsAt: string;
    label: string;
    periodId: string;
    startsAt: string;
  };
  tenantId: string;
  version: string;
};

export type ProductionScopeBootstrapCommand = {
  databaseUrl: string;
  manifest: ProductionScopeBootstrapManifest;
  releaseId: string;
};

export type ProductionScopeBootstrapSummary = {
  accessId: string;
  auditEntityId: string;
  manifestChecksum: string;
  scopeFingerprints: {
    admin: string;
    company: string;
    period: string;
    tenant: string;
  };
  status: "CREATED" | "UNCHANGED";
  version: string;
};

export type ProductionScopeBootstrapRepository = {
  execute(
    command: ProductionScopeBootstrapCommand,
  ): Promise<ProductionScopeBootstrapSummary>;
};

export class ProductionScopeBootstrapError extends Error {
  constructor(
    public readonly reasonCode:
      | "ACTIVE_TENANT_REQUIRED"
      | "AUDIT_WRITE_FAILED"
      | "DATABASE_NOT_WRITABLE"
      | "PARTIAL_SCOPE_STATE"
      | "SCOPE_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "ProductionScopeBootstrapError";
  }
}

export function readProductionScopeBootstrapConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionScopeBootstrapCommand {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("Production scope bootstrap yalnız production ortamında çalışır.");
  }
  if (env.GITHUB_EVENT_NAME !== "workflow_dispatch") {
    throw new Error("Production scope bootstrap yalnız manuel workflow ile çalışır.");
  }
  if (env.NOA_SOURCE_REF !== "refs/heads/main") {
    throw new Error("Production scope bootstrap yalnız main branch üzerinde çalışır.");
  }
  if (
    env.NOA_PRODUCTION_SCOPE_BOOTSTRAP_CONFIRMATION
    !== PRODUCTION_SCOPE_BOOTSTRAP_CONFIRMATION
  ) {
    throw new Error("Production scope bootstrap açık onayı eksik.");
  }

  const releaseId = normalizeSha(env.NOA_RELEASE_ID ?? "", "Release SHA");
  const expectedReleaseId = normalizeSha(
    env.NOA_EXPECTED_RELEASE_SHA ?? "",
    "Beklenen release SHA",
  );
  const githubSha = normalizeSha(env.GITHUB_SHA ?? "", "GitHub SHA");
  if (releaseId !== expectedReleaseId || releaseId !== githubSha) {
    throw new Error("Production scope bootstrap release SHA değerleri eşleşmiyor.");
  }

  const desiredState = {
    admin: {
      name: normalizeLabel(
        env.NOA_PRODUCTION_SCOPE_ADMIN_NAME ?? "",
        "Admin görünen adı",
      ),
      userId: normalizeIdentifier(
        env.NOA_PRODUCTION_SCOPE_ADMIN_USER_ID ?? "",
        "Admin kullanıcı kimliği",
      ),
    },
    company: {
      companyId: normalizeIdentifier(
        env.NOA_PRODUCTION_SCOPE_COMPANY_ID ?? "",
        "Şirket kimliği",
      ),
      name: normalizeLabel(
        env.NOA_PRODUCTION_SCOPE_COMPANY_NAME ?? "",
        "Şirket adı",
      ),
    },
    licenseLabel: PRODUCTION_SCOPE_LICENSE_LABEL,
    period: {
      endsAt: normalizeDate(
        env.NOA_PRODUCTION_SCOPE_PERIOD_ENDS_ON ?? "",
        "Dönem bitiş tarihi",
      ),
      label: normalizeLabel(
        env.NOA_PRODUCTION_SCOPE_PERIOD_LABEL ?? "",
        "Dönem etiketi",
      ),
      periodId: normalizeIdentifier(
        env.NOA_PRODUCTION_SCOPE_PERIOD_ID ?? "",
        "Dönem kimliği",
      ),
      startsAt: normalizeDate(
        env.NOA_PRODUCTION_SCOPE_PERIOD_STARTS_ON ?? "",
        "Dönem başlangıç tarihi",
      ),
    },
    tenantId: normalizeIdentifier(
      env.NOA_PRODUCTION_SCOPE_TENANT_ID ?? "",
      "Tenant kimliği",
    ),
    version: PRODUCTION_SCOPE_BOOTSTRAP_VERSION,
  };
  if (desiredState.period.startsAt > desiredState.period.endsAt) {
    throw new Error("Production scope bootstrap dönem tarih aralığı geçerli değil.");
  }

  return {
    databaseUrl: readRemotePostgresUrl(env.DATABASE_URL ?? ""),
    manifest: {
      ...desiredState,
      manifestChecksum: checksum(desiredState),
    },
    releaseId,
  };
}

export async function runProductionScopeBootstrap(input: {
  command: ProductionScopeBootstrapCommand;
  repository: ProductionScopeBootstrapRepository;
}) {
  return input.repository.execute(input.command);
}

export function productionScopeBootstrapIdentifiers(
  manifest: ProductionScopeBootstrapManifest,
) {
  const shortChecksum = manifest.manifestChecksum.slice(0, 24);
  return {
    accessId: `production-scope-admin-${shortChecksum}`,
    auditEntityId: `production-scope-bootstrap-${manifest.manifestChecksum}`,
  };
}

export function productionScopeBootstrapFingerprints(
  manifest: ProductionScopeBootstrapManifest,
) {
  return {
    admin: fingerprint(manifest.admin.userId),
    company: fingerprint(manifest.company.companyId),
    period: fingerprint(manifest.period.periodId),
    tenant: fingerprint(manifest.tenantId),
  };
}

function normalizeIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/.test(normalized)) {
    throw new Error(`${label} güvenli değil.`);
  }
  return normalized;
}

function normalizeLabel(value: string, label: string) {
  const normalized = value.trim();
  if (
    normalized.length < 2
    || normalized.length > 160
    || /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error(`${label} güvenli değil.`);
  }
  return normalized;
}

function normalizeDate(value: string, label: string) {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label} YYYY-MM-DD biçiminde olmalıdır.`);
  }
  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (
    Number.isNaN(date.valueOf())
    || date.toISOString().slice(0, 10) !== normalized
  ) {
    throw new Error(`${label} geçerli değil.`);
  }
  return date.toISOString();
}

function normalizeSha(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) {
    throw new Error(`${label} geçerli değil.`);
  }
  return normalized;
}

function readRemotePostgresUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Production scope bootstrap DATABASE_URL geçerli değil.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol)
    || ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
    || !url.pathname
    || url.pathname === "/"
  ) {
    throw new Error("Production scope bootstrap uzak PostgreSQL hedefi gerektirir.");
  }
  return value;
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
