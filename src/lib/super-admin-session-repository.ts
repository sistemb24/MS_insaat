import type { PrismaClient } from "@prisma/client";

export const SUPER_ADMIN_SESSION_COOKIE = "noa-super-admin-session";
export const SUPER_ADMIN_SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

export type SuperAdminSessionRecord = {
  id: string;
  credentialId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActiveAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
};

export type SuperAdminSessionWithCredential = SuperAdminSessionRecord & {
  credential: { id: string; email: string; name: string };
};

export type SuperAdminSessionRepository = {
  create(input: { credentialId: string; now: Date; ipAddress?: string; userAgent?: string }): Promise<SuperAdminSessionRecord>;
  findById(id: string): Promise<SuperAdminSessionWithCredential | null>;
  deleteById(id: string): Promise<void>;
  deleteAllForCredential(credentialId: string): Promise<void>;
  touch(id: string, now: Date): Promise<SuperAdminSessionRecord>;
  deleteExpired(now: Date): Promise<void>;
};

export type AuthenticatedSuperAdmin = {
  credentialId: string;
  email: string;
  name: string;
  expiresAt: Date;
};

export async function resolveSuperAdminSession(
  sessionId: string | undefined,
  repository: SuperAdminSessionRepository,
  now = new Date(),
): Promise<AuthenticatedSuperAdmin | null> {
  if (!sessionId) return null;
  const session = await repository.findById(sessionId);
  if (!session) return null;
  if (session.expiresAt <= now) {
    await repository.deleteById(session.id);
    return null;
  }
  const touched = await repository.touch(session.id, now);
  return {
    credentialId: session.credential.id,
    email: session.credential.email,
    name: session.credential.name,
    expiresAt: touched.expiresAt,
  };
}

type SessionPrisma = Pick<PrismaClient, "superAdminSession">;

export function createSuperAdminSessionPrismaRepository(
  prisma: SessionPrisma,
): SuperAdminSessionRepository {
  return {
    async create({ credentialId, now, ipAddress, userAgent }) {
      return prisma.superAdminSession.create({
        data: {
          credentialId,
          createdAt: now,
          expiresAt: new Date(now.getTime() + SUPER_ADMIN_SESSION_DURATION_MS),
          lastActiveAt: now,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });
    },
    async findById(id) {
      return prisma.superAdminSession.findUnique({
        where: { id },
        include: { credential: { select: { id: true, email: true, name: true } } },
      });
    },
    async deleteById(id) {
      await prisma.superAdminSession.deleteMany({ where: { id } });
    },
    async deleteAllForCredential(credentialId) {
      await prisma.superAdminSession.deleteMany({ where: { credentialId } });
    },
    async touch(id, now) {
      return prisma.superAdminSession.update({
        where: { id },
        data: {
          lastActiveAt: now,
          expiresAt: new Date(now.getTime() + SUPER_ADMIN_SESSION_DURATION_MS),
        },
      });
    },
    async deleteExpired(now) {
      await prisma.superAdminSession.deleteMany({ where: { expiresAt: { lte: now } } });
    },
  };
}
