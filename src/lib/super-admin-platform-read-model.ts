import type { PrismaClient } from "@prisma/client";

const PAGE_SIZE = 25;

type PlatformReadModelPrisma = Pick<
  PrismaClient,
  "tenant" | "appUser" | "auditLog" | "$queryRawUnsafe"
>;

export type PlatformListInput = {
  page?: string;
  query?: string;
  sort?: string;
};

export function createSuperAdminPlatformReadModel(
  prisma: PlatformReadModelPrisma,
) {
  return {
    async listTenants(input: PlatformListInput) {
      const pagination = parseListInput(input, ["created-desc", "name-asc"]);
      const where = pagination.query
        ? {
            name: {
              contains: pagination.query,
              mode: "insensitive" as const,
            },
          }
        : undefined;
      const [total, rows] = await Promise.all([
        prisma.tenant.count({ where }),
        prisma.tenant.findMany({
          orderBy:
            pagination.sort === "name-asc"
              ? { name: "asc" as const }
              : { createdAt: "desc" as const },
          select: {
            id: true,
            name: true,
            createdAt: true,
            companies: {
              orderBy: { name: "asc" },
              select: { name: true },
              take: 3,
            },
            _count: {
              select: {
                companies: true,
                sessions: true,
                tenantSubscriptions: true,
                users: true,
              },
            },
          },
          skip: pagination.skip,
          take: PAGE_SIZE,
          where,
        }),
      ]);

      return pageResult(
        rows.map((row) => ({
          companyCount: row._count.companies,
          companyNames: row.companies.map((company) => company.name),
          createdAt: row.createdAt,
          id: row.id,
          name: row.name,
          sessionCount: row._count.sessions,
          subscriptionCount: row._count.tenantSubscriptions,
          userCount: row._count.users,
        })),
        total,
        pagination,
      );
    },

    async listUsers(input: PlatformListInput) {
      const pagination = parseListInput(input, ["created-desc", "name-asc"]);
      const where = pagination.query
        ? {
            OR: [
              {
                name: {
                  contains: pagination.query,
                  mode: "insensitive" as const,
                },
              },
              {
                tenant: {
                  name: {
                    contains: pagination.query,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : undefined;
      const [total, rows] = await Promise.all([
        prisma.appUser.count({ where }),
        prisma.appUser.findMany({
          orderBy:
            pagination.sort === "name-asc"
              ? { name: "asc" as const }
              : { createdAt: "desc" as const },
          select: {
            id: true,
            name: true,
            createdAt: true,
            credential: { select: { email: true } },
            tenant: { select: { name: true } },
            userScopeAccesses: {
              select: { role: true },
              where: { isActive: true },
            },
          },
          skip: pagination.skip,
          take: PAGE_SIZE,
          where,
        }),
      ]);

      return pageResult(
        rows.map((row) => ({
          createdAt: row.createdAt,
          email: maskEmail(row.credential?.email),
          id: row.id,
          name: row.name,
          roles: [...new Set(row.userScopeAccesses.map((scope) => scope.role))],
          tenantName: row.tenant.name,
        })),
        total,
        pagination,
      );
    },

    async listAuditLogs(input: PlatformListInput) {
      const pagination = parseListInput(input, ["occurred-desc", "occurred-asc"]);
      const where = pagination.query
        ? {
            OR: [
              {
                action: {
                  contains: pagination.query,
                  mode: "insensitive" as const,
                },
              },
              {
                entityType: {
                  contains: pagination.query,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : undefined;
      const [total, rows] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          orderBy: {
            occurredAt: pagination.sort === "occurred-asc" ? "asc" : "desc",
          },
          select: {
            id: true,
            action: true,
            company: { select: { name: true } },
            entityLabel: true,
            entityType: true,
            occurredAt: true,
            tenant: { select: { name: true } },
          },
          skip: pagination.skip,
          take: PAGE_SIZE,
          where,
        }),
      ]);

      return pageResult(
        rows.map((row) => ({
          action: row.action,
          companyName: row.company.name,
          entityLabel: redactSensitiveText(row.entityLabel),
          entityType: row.entityType,
          id: row.id,
          occurredAt: row.occurredAt,
          tenantName: row.tenant.name,
        })),
        total,
        pagination,
      );
    },

    async getHealth() {
      const startedAt = Date.now();

      try {
        await prisma.$queryRawUnsafe("SELECT 1");
        return {
          application: { status: "available" as const },
          database: {
            latencyMs: Math.max(0, Date.now() - startedAt),
            status: "available" as const,
          },
          externalMonitoring: { status: "unavailable" as const },
        };
      } catch {
        return {
          application: { status: "available" as const },
          database: { latencyMs: null, status: "degraded" as const },
          externalMonitoring: { status: "unavailable" as const },
        };
      }
    },
  };
}

function parseListInput(input: PlatformListInput, allowedSorts: readonly string[]) {
  const page = Math.max(1, Number.parseInt(input.page ?? "1", 10) || 1);
  const query = input.query?.trim().slice(0, 100) ?? "";
  const sort = allowedSorts.includes(input.sort ?? "")
    ? input.sort!
    : allowedSorts[0]!;

  return { page, query, skip: (page - 1) * PAGE_SIZE, sort };
}

function pageResult<Row>(
  rows: Row[],
  total: number,
  input: ReturnType<typeof parseListInput>,
) {
  return {
    page: input.page,
    pageSize: PAGE_SIZE,
    query: input.query,
    rows,
    sort: input.sort,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export function maskEmail(email: string | null | undefined) {
  if (!email) return "—";
  const [local, domain] = email.split("@");

  if (!local || !domain) return "—";

  return `${local.charAt(0)}***@${domain}`;
}

export function redactSensitiveText(value: string) {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[e-posta gizlendi]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP gizlendi]")
    .slice(0, 120);
}
