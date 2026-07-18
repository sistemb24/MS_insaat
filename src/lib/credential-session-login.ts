import { verifyPasswordHash } from "./password-hash";
import { listAccessibleSessionRecordsForUser } from "./session-access-service";
import type { CredentialLoginRepository } from "./credential-login";
import type { SessionScopeRepository } from "./session-scope";
import type { UserScopeAccessRepository } from "./user-scope-access";

export type CredentialSessionLoginInput = {
  email: string;
  now: Date;
  password: string;
  repository: CredentialLoginRepository;
  scopeAccessRepository: UserScopeAccessRepository;
  sessionRepository: SessionScopeRepository;
};

export async function authenticateCredentialSessionLogin({
  email,
  now,
  password,
  repository,
  scopeAccessRepository,
  sessionRepository,
}: CredentialSessionLoginInput) {
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

  return {
    ok: true as const,
    sessionId: session.id,
  };
}