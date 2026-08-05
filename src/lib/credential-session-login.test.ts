import { describe, expect, it } from "vitest";

import { authenticateCredentialSessionLogin } from "./credential-session-login";
import { createPasswordHash } from "./password-hash";
import type { CredentialLoginRepository } from "./credential-login";
import type { SessionScopeRecord, SessionScopeRepository } from "./session-scope";
import type { TenantAuthSessionRepository } from "./tenant-auth-session";
import type { TenantLoginRateLimiter } from "./tenant-login-rate-limiter";
import type { UserScopeAccessRepository } from "./user-scope-access";

describe("credential session login", () => {
  it("returns the credential default session when it is backed by active scope access", async () => {
    const repository = createCredentialRepository({
      defaultSessionId: "demo-accounting",
      userId: "user-main",
    });

    await expect(
      authenticateCredentialSessionLogin({
        authSessionRepository: createAuthSessionRepository(),
        email: "muhasebe@noa.local",
        now: new Date("2026-06-26T00:00:00.000Z"),
        password: "Demo123!",
        rateLimiter: createRateLimiter(),
        repository,
        scopeAccessRepository: createAccessRepository(),
        sessionRepository: createSessionRepository([
          createSession({ id: "demo-accounting" }),
          createSession({ id: "demo-other" }),
        ]),
      }),
    ).resolves.toEqual({
      ok: true,
      sessionId: "opaque-auth-session",
    });
  });

  it("falls back to the first accessible session when the credential default is no longer accessible", async () => {
    await expect(
      authenticateCredentialSessionLogin({
        authSessionRepository: createAuthSessionRepository(),
        email: "muhasebe@noa.local",
        now: new Date("2026-06-26T00:00:00.000Z"),
        password: "Demo123!",
        rateLimiter: createRateLimiter(),
        repository: createCredentialRepository({
          defaultSessionId: "demo-revoked",
          userId: "user-main",
        }),
        scopeAccessRepository: createAccessRepository(),
        sessionRepository: createSessionRepository([
          createSession({ id: "demo-accessible" }),
          createSession({ companyId: "company-revoked", id: "demo-revoked" }),
        ]),
      }),
    ).resolves.toEqual({
      ok: true,
      sessionId: "opaque-auth-session",
    });
  });

  it("rejects valid credentials when the user has no active accessible sessions", async () => {
    await expect(
      authenticateCredentialSessionLogin({
        authSessionRepository: createAuthSessionRepository(),
        email: "muhasebe@noa.local",
        now: new Date("2026-06-26T00:00:00.000Z"),
        password: "Demo123!",
        rateLimiter: createRateLimiter(),
        repository: createCredentialRepository({
          defaultSessionId: "demo-accounting",
          userId: "user-main",
        }),
        scopeAccessRepository: createAccessRepository({ empty: true }),
        sessionRepository: createSessionRepository([createSession()]),
      }),
    ).resolves.toEqual({
      errors: ["Bu kullanıcı için aktif firma/dönem erişimi bulunamadı."],
      ok: false,
    });
  });

  it("creates an opaque auth session for the selected scope", async () => {
    const createCalls: Array<{ scopeSessionId: string; userId: string }> = [];

    const result = await authenticateCredentialSessionLogin({
      authSessionRepository: createAuthSessionRepository(createCalls),
      email: "muhasebe@noa.local",
      now: new Date("2026-06-26T00:00:00.000Z"),
      password: "Demo123!",
      rateLimiter: createRateLimiter(),
      repository: createCredentialRepository({
        defaultSessionId: "demo-accounting",
        userId: "user-main",
      }),
      scopeAccessRepository: createAccessRepository(),
      sessionRepository: createSessionRepository([createSession()]),
    });

    expect(result).toEqual({ ok: true, sessionId: "opaque-auth-session" });
    expect(createCalls).toEqual([
      { scopeSessionId: "demo-accounting", userId: "user-main" },
    ]);
  });

  it("rejects a rate-limited attempt before credential lookup", async () => {
    const repository = createCredentialRepository({
      defaultSessionId: "demo-accounting",
      userId: "user-main",
    });
    const findByEmail = repository.findByEmail;
    repository.findByEmail = async () => {
      throw new Error("credential lookup should not run");
    };

    await expect(
      authenticateCredentialSessionLogin({
        authSessionRepository: createAuthSessionRepository(),
        email: "muhasebe@noa.local",
        now: new Date("2026-06-26T00:00:00.000Z"),
        password: "Demo123!",
        rateLimiter: createRateLimiter(false),
        repository,
        scopeAccessRepository: createAccessRepository(),
        sessionRepository: createSessionRepository([createSession()]),
      }),
    ).resolves.toMatchObject({ ok: false, reason: "rate_limited" });

    repository.findByEmail = findByEmail;
  });
});

function createRateLimiter(allowed = true): TenantLoginRateLimiter {
  return {
    async check() {
      return allowed
        ? { allowed: true, remaining: 4 }
        : { allowed: false, retryAfterSeconds: 60 };
    },
  };
}

function createAuthSessionRepository(
  createCalls: Array<{ scopeSessionId: string; userId: string }> = [],
): TenantAuthSessionRepository {
  return {
    async create({ scopeSessionId, userId }) {
      createCalls.push({ scopeSessionId, userId });

      return {
        expiresAt: new Date("2026-06-26T08:00:00.000Z"),
        id: "opaque-auth-session",
      };
    },
    async findActiveById() {
      return null;
    },
    async revoke() {
      return false;
    },
    async switchScope() {
      return null;
    },
  };
}

function createCredentialRepository({
  defaultSessionId,
  userId,
}: {
  defaultSessionId: string;
  userId: string;
}): CredentialLoginRepository {
  return {
    async findByEmail(email) {
      return {
        defaultSessionId,
        email,
        passwordHash: createPasswordHash("Demo123!", {
          iterations: 1,
          salt: "test-salt",
        }),
        userId,
      };
    },
  };
}

function createSessionRepository(
  sessions: SessionScopeRecord[],
): SessionScopeRepository {
  return {
    async findById(sessionId) {
      return sessions.find((session) => session.id === sessionId) ?? null;
    },
    async listActiveForUser() {
      return sessions;
    },
  };
}

function createAccessRepository({
  empty = false,
}: {
  empty?: boolean;
} = {}): UserScopeAccessRepository {
  return {
    async listActiveForUser() {
      return empty
        ? []
        : [
            {
              id: "access-demo-accounting",
              tenantId: "tenant-noa-demo",
              tenantName: "NOA Demo Tenant",
              companyId: "company-demo-insaat",
              companyName: "DEMO İNŞAAT",
              periodId: "period-2026",
              periodLabel: "2026",
              userId: "user-main",
              userName: "Ana Kullanıcı",
              userRole: "accounting",
              licenseLabel: "Pilot P0",
              isDefault: true,
            },
          ];
    },
  };
}

function createSession(
  override: Partial<SessionScopeRecord> = {},
): SessionScopeRecord {
  return {
    id: "demo-accounting",
    tenantId: "tenant-noa-demo",
    tenantName: "NOA Demo Tenant",
    companyId: "company-demo-insaat",
    companyName: "DEMO İNŞAAT",
    periodId: "period-2026",
    periodLabel: "2026",
    userId: "user-main",
    userName: "Ana Kullanıcı",
    userRole: "accounting",
    licenseLabel: "Pilot P0",
    expiresAt: null,
    ...override,
  };
}
