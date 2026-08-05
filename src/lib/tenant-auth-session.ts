import type { TenantScope } from "./tenant-scope";

export const TENANT_AUTH_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
export const TENANT_AUTH_SESSION_POLICY = {
  absoluteDurationMs: TENANT_AUTH_SESSION_DURATION_MS,
  cookiePath: "/",
  cookieSameSite: "lax" as const,
  rotateOnScopeSwitch: true,
  slidingExpiration: false,
} as const;

export type TenantAuthSessionRecord = {
  id: string;
  userId: string;
  scopeSessionId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  scope: TenantScope;
};

export type TenantAuthSessionRepository = {
  create(input: {
    now: Date;
    scopeSessionId: string;
    userId: string;
  }): Promise<{ expiresAt: Date; id: string }>;
  findActiveById(input: {
    id: string;
    now: Date;
  }): Promise<TenantAuthSessionRecord | null>;
  revoke(input: { id: string; revokedAt: Date }): Promise<boolean>;
  switchScope(input: {
    authSessionId: string;
    now: Date;
    scopeSessionId: string;
    userId: string;
  }): Promise<string | null>;
};

export function tenantAuthSessionExpiresAt(now: Date) {
  return new Date(now.getTime() + TENANT_AUTH_SESSION_DURATION_MS);
}
