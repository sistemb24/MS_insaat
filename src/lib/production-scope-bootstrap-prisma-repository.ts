import { Prisma, type PrismaClient } from "@prisma/client";

import {
  ProductionScopeBootstrapError,
  productionScopeBootstrapFingerprints,
  productionScopeBootstrapIdentifiers,
  type ProductionScopeBootstrapCommand,
  type ProductionScopeBootstrapManifest,
  type ProductionScopeBootstrapRepository,
} from "./production-scope-bootstrap";

type CompanyRecord = { id: string; name: string; tenantId: string };
type PeriodRecord = {
  companyId: string;
  endsAt: Date | null;
  id: string;
  isClosed: boolean;
  label: string;
  startsAt: Date | null;
  tenantId: string;
};
type UserRecord = { email: string | null; id: string; name: string; tenantId: string };
type AccessRecord = {
  companyId: string;
  id: string;
  isActive: boolean;
  isDefault: boolean;
  licenseLabel: string;
  periodId: string;
  role: string;
  tenantId: string;
  userId: string;
};
type AuditRecord = { id: string; metadata: unknown };

type TransactionClient = {
  $queryRaw<T = unknown>(query: unknown): Promise<T>;
  appUser: {
    create(input: unknown): Promise<unknown>;
    findUnique(input: unknown): Promise<UserRecord | null>;
  };
  appUserScopeAccess: {
    create(input: unknown): Promise<unknown>;
    findFirst(input: unknown): Promise<AccessRecord | null>;
  };
  auditLog: {
    create(input: unknown): Promise<unknown>;
    findFirst(input: unknown): Promise<AuditRecord | null>;
  };
  company: {
    create(input: unknown): Promise<unknown>;
    findUnique(input: unknown): Promise<CompanyRecord | null>;
  };
  period: {
    create(input: unknown): Promise<unknown>;
    findUnique(input: unknown): Promise<PeriodRecord | null>;
  };
  tenant: {
    findUnique(input: unknown): Promise<{ lifecycleStatus: string } | null>;
  };
};

export type ProductionScopeBootstrapPrismaClientLike = {
  $transaction<T>(
    callback: (transaction: TransactionClient) => Promise<T>,
    options: {
      isolationLevel: "Serializable";
      maxWait: number;
      timeout: number;
    },
  ): Promise<T>;
};

export function createProductionScopeBootstrapPrismaRepository(
  prisma: ProductionScopeBootstrapPrismaClientLike,
  now: () => Date = () => new Date(),
): ProductionScopeBootstrapRepository {
  return {
    async execute(command) {
      return prisma.$transaction(
        async (transaction) => executeInTransaction(transaction, command, now()),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10_000,
          timeout: 120_000,
        },
      );
    },
  };
}

async function executeInTransaction(
  transaction: TransactionClient,
  command: ProductionScopeBootstrapCommand,
  occurredAt: Date,
) {
  const writeRows = await transaction.$queryRaw<Array<{ read_only: string }>>(
    Prisma.sql`
      SELECT current_setting('transaction_read_only')::text AS read_only
    `,
  );
  if (writeRows.length !== 1 || writeRows[0]?.read_only !== "off") {
    throw new ProductionScopeBootstrapError(
      "DATABASE_NOT_WRITABLE",
      "Production scope bootstrap DB transaction yazılabilir değil.",
    );
  }

  await transaction.$queryRaw<Array<{ lock_result: string }>>(
    Prisma.sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${command.manifest.tenantId}, 0)
      )::text AS lock_result
    `,
  );

  const tenant = await transaction.tenant.findUnique({
    select: { lifecycleStatus: true },
    where: { id: command.manifest.tenantId },
  });
  if (!tenant || tenant.lifecycleStatus !== "ACTIVE") {
    throw new ProductionScopeBootstrapError(
      "ACTIVE_TENANT_REQUIRED",
      "Production scope bootstrap için aktif tenant bulunamadı.",
    );
  }

  const { accessId, auditEntityId } = productionScopeBootstrapIdentifiers(
    command.manifest,
  );
  const company = await transaction.company.findUnique({
    where: { id: command.manifest.company.companyId },
  });
  const period = await transaction.period.findUnique({
    where: { id: command.manifest.period.periodId },
  });
  const user = await transaction.appUser.findUnique({
    where: { id: command.manifest.admin.userId },
  });
  const access = await transaction.appUserScopeAccess.findFirst({
    where: {
      companyId: command.manifest.company.companyId,
      periodId: command.manifest.period.periodId,
      userId: command.manifest.admin.userId,
    },
  });
  const audit = await transaction.auditLog.findFirst({
    where: {
      action: "production-scope.bootstrap",
      companyId: command.manifest.company.companyId,
      entityId: auditEntityId,
      entityType: "production-scope",
      periodId: command.manifest.period.periodId,
      tenantId: command.manifest.tenantId,
    },
  });

  const rows = [company, period, user, access, audit];
  const existingCount = rows.filter(Boolean).length;
  if (existingCount > 0 && existingCount < rows.length) {
    throw new ProductionScopeBootstrapError(
      "PARTIAL_SCOPE_STATE",
      "Production scope bootstrap kısmi kayıt durumu buldu; otomatik tamamlama kapalıdır.",
    );
  }

  if (existingCount === rows.length) {
    assertExactExistingState({
      access: access!,
      audit: audit!,
      company: company!,
      manifest: command.manifest,
      period: period!,
      user: user!,
    });
    return summary(command.manifest, "UNCHANGED");
  }

  await transaction.company.create({
    data: {
      id: command.manifest.company.companyId,
      name: command.manifest.company.name,
      tenantId: command.manifest.tenantId,
    },
  });
  await transaction.period.create({
    data: {
      companyId: command.manifest.company.companyId,
      endsAt: new Date(command.manifest.period.endsAt),
      id: command.manifest.period.periodId,
      isClosed: false,
      label: command.manifest.period.label,
      startsAt: new Date(command.manifest.period.startsAt),
      tenantId: command.manifest.tenantId,
    },
  });
  await transaction.appUser.create({
    data: {
      email: null,
      id: command.manifest.admin.userId,
      name: command.manifest.admin.name,
      tenantId: command.manifest.tenantId,
    },
  });
  await transaction.appUserScopeAccess.create({
    data: {
      companyId: command.manifest.company.companyId,
      id: accessId,
      isActive: true,
      isDefault: true,
      licenseLabel: command.manifest.licenseLabel,
      periodId: command.manifest.period.periodId,
      role: "admin",
      tenantId: command.manifest.tenantId,
      userId: command.manifest.admin.userId,
    },
  });
  try {
    await transaction.auditLog.create({
      data: {
        action: "production-scope.bootstrap",
        actorUserId: command.manifest.admin.userId,
        companyId: command.manifest.company.companyId,
        entityId: auditEntityId,
        entityLabel: command.manifest.version,
        entityType: "production-scope",
        metadata: {
          manifestChecksum: command.manifest.manifestChecksum,
          releaseId: command.releaseId,
          scopeFingerprints: productionScopeBootstrapFingerprints(command.manifest),
          status: "CREATED",
          version: command.manifest.version,
        },
        occurredAt,
        periodId: command.manifest.period.periodId,
        tenantId: command.manifest.tenantId,
      },
    });
  } catch (error) {
    throw new ProductionScopeBootstrapError(
      "AUDIT_WRITE_FAILED",
      `Production scope bootstrap audit kaydı yazılamadı: ${errorMessage(error)}`,
    );
  }

  return summary(command.manifest, "CREATED");
}

function assertExactExistingState(input: {
  access: AccessRecord;
  audit: AuditRecord;
  company: CompanyRecord;
  manifest: ProductionScopeBootstrapManifest;
  period: PeriodRecord;
  user: UserRecord;
}) {
  const metadata = readMetadata(input.audit.metadata);
  const exact =
    input.company.tenantId === input.manifest.tenantId
    && input.company.name === input.manifest.company.name
    && input.period.tenantId === input.manifest.tenantId
    && input.period.companyId === input.manifest.company.companyId
    && input.period.label === input.manifest.period.label
    && iso(input.period.startsAt) === input.manifest.period.startsAt
    && iso(input.period.endsAt) === input.manifest.period.endsAt
    && !input.period.isClosed
    && input.user.tenantId === input.manifest.tenantId
    && input.user.name === input.manifest.admin.name
    && input.access.tenantId === input.manifest.tenantId
    && input.access.companyId === input.manifest.company.companyId
    && input.access.periodId === input.manifest.period.periodId
    && input.access.userId === input.manifest.admin.userId
    && input.access.role === "admin"
    && input.access.licenseLabel === input.manifest.licenseLabel
    && input.access.isActive
    && input.access.isDefault
    && metadata.manifestChecksum === input.manifest.manifestChecksum
    && metadata.version === input.manifest.version;
  if (!exact) {
    throw new ProductionScopeBootstrapError(
      "SCOPE_CONFLICT",
      "Production scope bootstrap mevcut kayıtları exact manifest ile eşleşmiyor.",
    );
  }
}

function summary(
  manifest: ProductionScopeBootstrapManifest,
  status: "CREATED" | "UNCHANGED",
) {
  const { accessId, auditEntityId } = productionScopeBootstrapIdentifiers(manifest);
  return {
    accessId,
    auditEntityId,
    manifestChecksum: manifest.manifestChecksum,
    scopeFingerprints: productionScopeBootstrapFingerprints(manifest),
    status,
    version: manifest.version,
  };
}

function readMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function iso(value: Date | null) {
  return value?.toISOString() ?? null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "bilinmeyen hata";
}

export function asProductionScopeBootstrapPrismaClient(
  prisma: PrismaClient,
): ProductionScopeBootstrapPrismaClientLike {
  return prisma as unknown as ProductionScopeBootstrapPrismaClientLike;
}
