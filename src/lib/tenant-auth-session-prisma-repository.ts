import { randomBytes } from "node:crypto";

import type { SessionScopeRecord } from "./session-scope";
import {
  tenantAuthSessionExpiresAt,
  type TenantAuthSessionRecord,
  type TenantAuthSessionRepository,
} from "./tenant-auth-session";
import type { TenantUserRole } from "./tenant-scope";

type ScopeSessionRow = {
  id: string;
  userId: string;
  role: string;
  licenseLabel: string;
  expiresAt: Date | null;
  tenant: { id: string; lifecycleStatus: string; name: string };
  company: { id: string; name: string };
  period: { id: string; label: string };
  user: { id: string; name: string };
};

type AuthSessionRow = {
  id: string;
  userId: string;
  scopeSessionId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  scopeSession: ScopeSessionRow;
};

export type TenantAuthSessionPrismaClientLike = {
  appAuthSession: {
    create(input: {
      data: {
        id: string;
        userId: string;
        scopeSessionId: string;
        expiresAt: Date;
      };
      select: { expiresAt: true; id: true };
    }): Promise<{ expiresAt: Date; id: string }>;
    findFirst(input: {
      where: {
        id: string;
        revokedAt: null;
        expiresAt: { gt: Date };
        scopeSession: { tenant: { lifecycleStatus: "ACTIVE" } };
      };
      include: {
        scopeSession: {
          include: { company: true; period: true; tenant: true; user: true };
        };
      };
    }): Promise<AuthSessionRow | null>;
    updateMany(input: {
      where: {
        id: string;
        userId?: string;
        revokedAt: null;
        expiresAt?: { gt: Date };
      };
      data: { id?: string; revokedAt?: Date; scopeSessionId?: string };
    }): Promise<{ count: number }>;
  };
  appSession: {
    findFirst(input: {
      where: {
        id: string;
        userId: string;
        OR: [{ expiresAt: null }, { expiresAt: { gt: Date } }];
        tenant: { lifecycleStatus: "ACTIVE" };
      };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
};

export function createTenantAuthSessionPrismaRepository(
  prisma: TenantAuthSessionPrismaClientLike,
): TenantAuthSessionRepository {
  return {
    async create({ now, scopeSessionId, userId }) {
      return prisma.appAuthSession.create({
        data: {
          id: randomBytes(32).toString("base64url"),
          userId,
          scopeSessionId,
          expiresAt: tenantAuthSessionExpiresAt(now),
        },
        select: { expiresAt: true, id: true },
      });
    },

    async findActiveById({ id, now }) {
      const session = await prisma.appAuthSession.findFirst({
        where: {
          id,
          revokedAt: null,
          expiresAt: { gt: now },
          scopeSession: { tenant: { lifecycleStatus: "ACTIVE" } },
        },
        include: {
          scopeSession: {
            include: { company: true, period: true, tenant: true, user: true },
          },
        },
      });

      if (
        !session ||
        session.userId !== session.scopeSession.userId ||
        isExpiredScopeSession(session.scopeSession, now)
      ) {
        return null;
      }

      return authSessionRowToRecord(session);
    },

    async revoke({ id, revokedAt }) {
      const result = await prisma.appAuthSession.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt },
      });

      return result.count === 1;
    },

    async switchScope({ authSessionId, now, scopeSessionId, userId }) {
      const targetScope = await prisma.appSession.findFirst({
        where: {
          id: scopeSessionId,
          userId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          tenant: { lifecycleStatus: "ACTIVE" },
        },
        select: { id: true },
      });

      if (!targetScope) return null;

      const rotatedSessionId = randomBytes(32).toString("base64url");

      const result = await prisma.appAuthSession.updateMany({
        where: {
          id: authSessionId,
          userId,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { id: rotatedSessionId, scopeSessionId: targetScope.id },
      });

      return result.count === 1 ? rotatedSessionId : null;
    },
  };
}

function authSessionRowToRecord(row: AuthSessionRow): TenantAuthSessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    scopeSessionId: row.scopeSessionId,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    scope: sessionRecordToTenantScope(row.scopeSession),
  };
}

function sessionRecordToTenantScope(
  session: ScopeSessionRow,
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
  return role === "admin" || role === "accounting" || role === "viewer"
    ? role
    : "viewer";
}

function isExpiredScopeSession(scope: ScopeSessionRow, now: Date) {
  return scope.expiresAt ? scope.expiresAt.getTime() <= now.getTime() : false;
}
