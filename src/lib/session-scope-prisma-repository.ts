import type {
  SessionScopeRecord,
  SessionScopeRepository,
} from "./session-scope";
import type { TenantUserRole } from "./tenant-scope";

type AppSessionRecord = {
  id: string;
  role: string;
  licenseLabel: string;
  expiresAt: Date | null;
  tenant: {
    id: string;
    lifecycleStatus: string;
    name: string;
  };
  company: {
    id: string;
    name: string;
  };
  period: {
    id: string;
    label: string;
  };
  user: {
    id: string;
    name: string;
  };
};

type AppSessionClient = {
  findUnique(input: {
    where: { id: string };
    include: {
      company: true;
      period: true;
      tenant: true;
      user: true;
    };
  }): Promise<AppSessionRecord | null>;
  findMany(input: {
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: Date } }];
      tenant: { lifecycleStatus: "ACTIVE" };
      userId?: string;
    };
    include: {
      company: true;
      period: true;
      tenant: true;
      user: true;
    };
    orderBy:
      | [{ user: { name: "asc" } }, { id: "asc" }]
      | [{ company: { name: "asc" } }, { period: { label: "desc" } }];
  }): Promise<AppSessionRecord[]>;
};

export type SessionScopePrismaClientLike = {
  appSession: AppSessionClient;
};

export function createSessionScopePrismaRepository(
  prisma: SessionScopePrismaClientLike,
): SessionScopeRepository {
  return {
    async findById(sessionId: string) {
      const session = await prisma.appSession.findUnique({
        where: { id: sessionId },
        include: {
          company: true,
          period: true,
          tenant: true,
          user: true,
        },
      });

      return session?.tenant.lifecycleStatus === "ACTIVE"
        ? sessionRecordToScopeRecord(session)
        : null;
    },
    async listActive({ now }: { now: Date }) {
      const sessions = await prisma.appSession.findMany({
        where: activeSessionWhere(now),
        include: sessionInclude,
        orderBy: [{ user: { name: "asc" } }, { id: "asc" }],
      });

      return sessions.map(sessionRecordToScopeRecord);
    },
    async listActiveForUser({
      now,
      userId,
    }: {
      now: Date;
      userId: string;
    }) {
      const sessions = await prisma.appSession.findMany({
        where: {
          ...activeSessionWhere(now),
          userId,
        },
        include: sessionInclude,
        orderBy: [{ company: { name: "asc" } }, { period: { label: "desc" } }],
      });

      return sessions.map(sessionRecordToScopeRecord);
    },
  };
}

const sessionInclude = {
  company: true,
  period: true,
  tenant: true,
  user: true,
} as const;

function activeSessionWhere(now: Date) {
  return {
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    tenant: { lifecycleStatus: "ACTIVE" as const },
  } satisfies {
    OR: [{ expiresAt: null }, { expiresAt: { gt: Date } }];
    tenant: { lifecycleStatus: "ACTIVE" };
  };
}

function sessionRecordToScopeRecord(
  session: AppSessionRecord,
): SessionScopeRecord {
  return {
    id: session.id,
    tenantId: session.tenant.id,
    tenantName: session.tenant.name,
    companyId: session.company.id,
    companyName: session.company.name,
    periodId: session.period.id,
    periodLabel: session.period.label,
    userId: session.user.id,
    userName: session.user.name,
    userRole: normalizeRole(session.role),
    licenseLabel: session.licenseLabel,
    expiresAt: session.expiresAt,
  };
}

function normalizeRole(role: string): TenantUserRole {
  if (role === "admin" || role === "accounting" || role === "viewer") {
    return role;
  }

  return "viewer";
}
