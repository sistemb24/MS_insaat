import { companyScopes, defaultTenantScope, type TenantScope } from "./tenant-scope";

export const SESSION_COOKIE_NAME = "noa-session-id";

type CookieStoreLike = {
  get(name: string): { value: string } | undefined;
};

export type SessionScopeRecord = TenantScope & {
  id: string;
  expiresAt: Date | null;
};

export type SessionScopeRepository = {
  findById(sessionId: string): Promise<SessionScopeRecord | null>;
  listActive?(input: { now: Date }): Promise<SessionScopeRecord[]>;
  listActiveForUser?(input: {
    now: Date;
    userId: string;
  }): Promise<SessionScopeRecord[]>;
};

export type ResolveTenantScopeFromSessionStoreInput = {
  now: Date;
  repository: SessionScopeRepository;
  sessionId?: string;
};

export const demoSessionScopes: Record<string, TenantScope> = {
  "demo-accounting": {
    ...defaultTenantScope,
    userName: "Muhasebe Kullanıcısı",
  },
  "demo-viewer": {
    ...defaultTenantScope,
    userId: "user-viewer",
    userName: "Salt Okur",
    userRole: "viewer",
  },
  "demo-ahmet": {
    ...companyScopes[0],
    userId: "user-ahmet",
    userName: "Ahmet Yılmaz",
    userRole: "admin",
  },
  "demo-ayse": {
    ...companyScopes[1],
    userId: "user-ayse",
    userName: "Ayşe Demir",
    userRole: "accounting",
  },
  "demo-mehmet": {
    ...companyScopes[2],
    userId: "user-mehmet",
    userName: "Mehmet Kaya",
    userRole: "accounting",
  },
  // Firma 2 - AKDENİZ İNŞAAT kullanıcıları
  "demo-akdeniz-admin": {
    ...companyScopes[1],
    userId: "user-akdeniz-admin",
    userName: "Zeynep Arslan",
    userRole: "admin",
  },
  "demo-akdeniz-muhasebe": {
    ...companyScopes[1],
    userId: "user-akdeniz-muhasebe",
    userName: "Ali Yıldırım",
    userRole: "accounting",
  },
  "demo-akdeniz-saha": {
    ...companyScopes[1],
    userId: "user-akdeniz-saha",
    userName: "Can Özdemir",
    userRole: "viewer",
  },
  // Firma 3 - ANADOLU YAPI kullanıcıları
  "demo-anadolu-admin": {
    ...companyScopes[2],
    userId: "user-anadolu-admin",
    userName: "Murat Korkmaz",
    userRole: "admin",
  },
  "demo-anadolu-muhasebe": {
    ...companyScopes[2],
    userId: "user-anadolu-muhasebe",
    userName: "Elif Çelik",
    userRole: "accounting",
  },
  "demo-anadolu-saha": {
    ...companyScopes[2],
    userId: "user-anadolu-saha",
    userName: "Serhat Aydın",
    userRole: "viewer",
  },
};

export function resolveTenantScopeFromSessionId(sessionId?: string) {
  return cloneTenantScope(
    sessionId
      ? (demoSessionScopes[sessionId] ?? defaultTenantScope)
      : defaultTenantScope,
  );
}

export function resolveTenantScopeFromCookieStore(cookieStore: CookieStoreLike) {
  return resolveTenantScopeFromSessionId(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );
}

export async function resolveTenantScopeFromSessionStore({
  now,
  repository,
  sessionId,
}: ResolveTenantScopeFromSessionStoreInput) {
  if (!sessionId) {
    return resolveTenantScopeFromSessionId();
  }

  const record = await repository.findById(sessionId);

  if (!record || isExpiredSession(record, now)) {
    return resolveTenantScopeFromSessionId();
  }

  return sessionRecordToTenantScope(record);
}

function cloneTenantScope(scope: TenantScope): TenantScope {
  return { ...scope };
}

function isExpiredSession(record: SessionScopeRecord, now: Date) {
  return record.expiresAt ? record.expiresAt.getTime() <= now.getTime() : false;
}

function sessionRecordToTenantScope(record: SessionScopeRecord): TenantScope {
  return {
    tenantId: record.tenantId,
    tenantName: record.tenantName,
    companyId: record.companyId,
    companyName: record.companyName,
    periodId: record.periodId,
    periodLabel: record.periodLabel,
    userId: record.userId,
    userName: record.userName,
    userRole: record.userRole,
    licenseLabel: record.licenseLabel,
  };
}
