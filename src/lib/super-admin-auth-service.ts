import type { PrismaClient } from "@prisma/client";
import { verifyPasswordHash } from "./password-hash";
import { computeLockDuration, type SuperAdminCredentialRepository } from "./super-admin-credential";
import type { SuperAdminSessionRepository } from "./super-admin-session-repository";

export type AuthenticateResult =
  | { status: "success"; sessionId: string }
  | { status: "invalid_credentials" }
  | { status: "account_locked"; lockedUntil: Date | null; failedAttempts: number }
  | { status: "unsupported_second_factor" };

export type AccountLockStatus = { isLocked: boolean; lockedUntil: Date | null; failedAttempts: number };
type AccountLockPrisma = Pick<PrismaClient, "superAdminAccountLock">;

export function createSuperAdminAuthService(input: {
  credentialRepository: SuperAdminCredentialRepository;
  sessionRepository: SuperAdminSessionRepository;
  prisma: AccountLockPrisma;
}) {
  const { credentialRepository, sessionRepository, prisma } = input;

  async function checkAccountLock(value: { credentialId: string; now: Date }): Promise<AccountLockStatus> {
    const lock = await prisma.superAdminAccountLock.findUnique({ where: { credentialId: value.credentialId } });
    if (!lock) return { isLocked: false, lockedUntil: null, failedAttempts: 0 };
    const isLocked = (lock.lockedAt !== null && lock.lockedUntil === null) || (lock.lockedUntil !== null && lock.lockedUntil > value.now);
    return { isLocked, lockedUntil: lock.lockedUntil, failedAttempts: lock.failedAttempts };
  }

  async function recordFailedAttempt(value: { credentialId: string; now: Date; ipAddress?: string }): Promise<void> {
    const existing = await prisma.superAdminAccountLock.findUnique({ where: { credentialId: value.credentialId } });
    const failedAttempts = (existing?.failedAttempts ?? 0) + 1;
    const duration = computeLockDuration(failedAttempts);
    const shouldLock = duration === null || duration > 0;
    const lockedUntil = duration && duration > 0 ? new Date(value.now.getTime() + duration * 60_000) : null;
    await prisma.superAdminAccountLock.upsert({
      where: { credentialId: value.credentialId },
      create: { credentialId: value.credentialId, failedAttempts, lastFailedAt: value.now, lastFailedIp: value.ipAddress ?? null, lockedAt: shouldLock ? value.now : null, lockedUntil },
      update: { failedAttempts, lastFailedAt: value.now, lastFailedIp: value.ipAddress ?? null, lockedAt: shouldLock ? value.now : null, lockedUntil },
    });
  }

  return {
    async authenticate(value: { email: string; password: string; now: Date; ipAddress?: string; userAgent?: string }): Promise<AuthenticateResult> {
      const credential = await credentialRepository.findByEmail(value.email);
      if (!credential) return { status: "invalid_credentials" };
      const lock = await checkAccountLock({ credentialId: credential.id, now: value.now });
      if (lock.isLocked) return { status: "account_locked", lockedUntil: lock.lockedUntil, failedAttempts: lock.failedAttempts };
      if (!verifyPasswordHash(value.password, credential.passwordHash)) {
        await recordFailedAttempt({ credentialId: credential.id, now: value.now, ipAddress: value.ipAddress });
        return { status: "invalid_credentials" };
      }
      // Until an encrypted TOTP enrollment and opaque challenge are both
      // configured, an already-marked 2FA account fails closed.
      if (credential.is2FAEnabled) return { status: "unsupported_second_factor" };
      await prisma.superAdminAccountLock.deleteMany({ where: { credentialId: credential.id } });
      const session = await sessionRepository.create({ credentialId: credential.id, now: value.now, ipAddress: value.ipAddress, userAgent: value.userAgent });
      return { status: "success", sessionId: session.id };
    },
    checkAccountLock,
    recordFailedAttempt,
  };
}
