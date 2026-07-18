import { hashApiKeySecret, resolveApiKeyStatus, type ApiKeyAuthRow, type ApiKeyScope } from "./api-key-service";
import type { ApiKeyAuthRepository } from "./api-key-prisma-repository";
import type { TenantScope } from "./tenant-scope";

export type ApiKeyAuthErrorStatus = 401 | 403 | 429;

export type ApiKeyAuthResult =
  | {
      ok: true;
      data: {
        apiKey: ApiKeyAuthRow;
        bearerToken: string;
      };
    }
  | {
      ok: false;
      errors: string[];
      status: ApiKeyAuthErrorStatus;
    };

export type AuthenticateApiKeyInput = {
  authorizationHeader: string | null;
  requiredScopes?: ApiKeyScope[];
  repository: ApiKeyAuthRepository;
  now?: () => Date;
};

export function authenticateBearerApiKey({
  authorizationHeader,
  now = () => new Date(),
  repository,
  requiredScopes = [],
}: AuthenticateApiKeyInput): Promise<ApiKeyAuthResult> {
  const token = parseBearerToken(authorizationHeader);

  if (!token) {
    return Promise.resolve({
      errors: ["Bearer API anahtarı zorunludur."],
      ok: false,
      status: 401,
    });
  }

  return resolveApiKeyAuthentication({
    bearerToken: token,
    now,
    requiredScopes,
    repository,
  });
}

export function parseBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) return "";

  const [scheme, ...tokenParts] = authorizationHeader.trim().split(/\s+/);

  if (scheme.toLowerCase() !== "bearer") return "";

  return tokenParts.join(" ").trim();
}

export function hasRequiredApiKeyScopes(
  row: Pick<ApiKeyAuthRow, "scopes">,
  requiredScopes: ApiKeyScope[],
) {
  return requiredScopes.every((scope) => row.scopes.includes(scope));
}

export function buildTenantScopeFromApiKey(
  apiKey: Pick<ApiKeyAuthRow, "companyId" | "createdBy" | "periodId" | "tenantId">,
): TenantScope {
  return {
    companyId: apiKey.companyId,
    companyName: "API Company",
    licenseLabel: "API",
    periodId: apiKey.periodId,
    periodLabel: "API",
    tenantId: apiKey.tenantId,
    tenantName: "API Tenant",
    userId: apiKey.createdBy,
    userName: "API Kullanıcısı",
    userRole: "viewer",
  };
}

async function resolveApiKeyAuthentication({
  bearerToken,
  now,
  requiredScopes,
  repository,
}: {
  bearerToken: string;
  now: () => Date;
  requiredScopes: ApiKeyScope[];
  repository: ApiKeyAuthRepository;
}): Promise<ApiKeyAuthResult> {
  const nowDate = now();
  const today = nowDate.toISOString().slice(0, 10);
  const keyHash = hashApiKeySecret(bearerToken);
  const row = await repository.findByKeyHash({ keyHash, today });

  if (!row || resolveApiKeyStatus(row, today) !== "active") {
    return {
      errors: ["API anahtarı geçersiz, süresi dolmuş veya iptal edilmiş."],
      ok: false,
      status: 401,
    };
  }

  if (!hasRequiredApiKeyScopes(row, requiredScopes)) {
    return {
      errors: ["API anahtarı bu kaynak için gerekli kapsamları içermiyor."],
      ok: false,
      status: 403,
    };
  }

  const nowIso = nowDate.toISOString();
  const touched =
    (repository.consumeUsage
      ? await repository.consumeUsage({
          key: row,
          nowIso,
          today,
        })
      : await repository.touchLastUsed({
          id: row.id,
          nowIso,
          today,
        })) ?? null;

  if (!touched) {
    return {
      errors: repository.consumeUsage
        ? ["API anahtarı hız limitini aştı."]
        : ["API anahtarı güncellenemedi."],
      ok: false,
      status: repository.consumeUsage ? 429 : 401,
    };
  }

  return {
    data: {
      apiKey: touched,
      bearerToken,
    },
    ok: true,
  };
}
