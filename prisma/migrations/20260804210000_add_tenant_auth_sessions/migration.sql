-- Faz 35: tenant kapsam kayıtlarını tarayıcı oturumlarından ayıran opak,
-- kısa ömürlü ve iptal edilebilir auth session tablosu.
CREATE TABLE "AppAuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopeSessionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppAuthSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppAuthSession_userId_revokedAt_expiresAt_idx"
ON "AppAuthSession"("userId", "revokedAt", "expiresAt");

CREATE INDEX "AppAuthSession_scopeSessionId_idx"
ON "AppAuthSession"("scopeSessionId");

CREATE INDEX "AppAuthSession_expiresAt_idx"
ON "AppAuthSession"("expiresAt");

ALTER TABLE "AppAuthSession"
ADD CONSTRAINT "AppAuthSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppAuthSession"
ADD CONSTRAINT "AppAuthSession_scopeSessionId_fkey"
FOREIGN KEY ("scopeSessionId") REFERENCES "AppSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
