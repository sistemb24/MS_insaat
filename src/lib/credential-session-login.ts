import { verifyPasswordHash } from "./password-hash";
import { listAccessibleSessionRecordsForUser } from "./session-access-service";
import type { CredentialLoginRepository } from "./credential-login";
import type { SessionScopeRepository } from "./session-scope";
import type { TenantAuthSessionRepository } from "./tenant-auth-session";
import type { TenantLoginRateLimiter } from "./tenant-login-rate-limiter";
import type { UserScopeAccessRepository } from "./user-scope-access";

export type CredentialSessionLoginInput = {
  email: string;
  now: Date;
  password: string;
  clientAddress?: string | null;
  authSessionRepository: TenantAuthSessionRepository;
  rateLimiter: TenantLoginRateLimiter;
  repository: CredentialLoginRepository;
  scopeAccessRepository: UserScopeAccessRepository;
  sessionRepository: SessionScopeRepository;
};

export async function authenticateCredentialSessionLogin({
  authSessionRepository,
  clientAddress,
  email,
  now,
  password,
  rateLimiter,
  repository,
  scopeAccessRepository,
  sessionRepository,
}: CredentialSessionLoginInput) {
  const rateLimit = await rateLimiter.check({ clientAddress, email, now });

  if (!rateLimit.allowed) {
    return {
      errors: ["Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin."],
      ok: false as const,
      reason: "rate_limited" as const,
    };
  }

  const credential = await repository.findByEmail(email.trim().toLowerCase());

  if (!credential || !verifyPasswordHash(password, credential.passwordHash)) {
    return {
      errors: ["E-posta veya şifre hatalı."],
      ok: false as const,
    };
  }

  const accessibleSessions = await listAccessibleSessionRecordsForUser({
    now,
    scopeAccessRepository,
    sessionRepository,
    userId: credential.userId,
  });
  const session =
    accessibleSessions.find((item) => item.id === credential.defaultSessionId) ??
    accessibleSessions[0];

  if (!session) {
    return {
      errors: ["Bu kullanıcı için aktif firma/dönem erişimi bulunamadı."],
      ok: false as const,
    };
  }

  const authSession = await authSessionRepository.create({
    now,
    scopeSessionId: session.id,
    userId: credential.userId,
  });

  return {
    ok: true as const,
    sessionId: authSession.id,
  };
}
