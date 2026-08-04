import "dotenv/config";

import { createPasswordHash } from "../src/lib/password-hash";
import { prisma } from "../src/lib/prisma";
import { createSuperAdminAuthService } from "../src/lib/super-admin-auth-service";
import { createSuperAdminCredentialPrismaRepository } from "../src/lib/super-admin-credential";
import {
  createSuperAdminSessionPrismaRepository,
  resolveSuperAdminSession,
} from "../src/lib/super-admin-session-repository";

const password = "F33-Kabul-Guv3nli!";
const credentialRepository = createSuperAdminCredentialPrismaRepository(prisma);
const sessionRepository = createSuperAdminSessionPrismaRepository(prisma);
const authService = createSuperAdminAuthService({ credentialRepository, sessionRepository, prisma });

async function main() {
  assert(!(await credentialRepository.existsAny()), "Kabul testi mevcut gerçek Süper Admin hesabı varken çalıştırılmaz.");
  const tenantBefore = await tenantCounts();
  let credentialId: string | undefined;
  try {
    const attempts = await Promise.allSettled([
      credentialRepository.create({ name: "F33 Kabul Bir", email: "f33-one@noa.test", passwordHash: createPasswordHash(password) }),
      credentialRepository.create({ name: "F33 Kabul İki", email: "f33-two@noa.test", passwordHash: createPasswordHash(password) }),
    ]);
    const fulfilled = attempts.filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof credentialRepository.create>>> => item.status === "fulfilled");
    const rejected = attempts.filter((item) => item.status === "rejected");
    assert(fulfilled.length === 1 && rejected.length === 1, "Eşzamanlı bootstrap isteklerinden yalnız biri kabul edilmelidir.");
    credentialId = fulfilled[0].value.id;
    assert((await prisma.superAdminCredential.count()) === 1, "DB singleton yalnız bir credential bırakmalıdır.");
    assert(!fulfilled[0].value.passwordHash.includes(password), "Ham şifre DB kaydında bulunmamalıdır.");

    const now = new Date("2026-08-02T20:00:00.000Z");
    assert((await authService.authenticate({ email: "unknown@noa.test", password, now })).status === "invalid_credentials", "Bilinmeyen e-posta genel hata vermelidir.");
    for (let index = 0; index < 4; index += 1) {
      assert((await authService.authenticate({ email: fulfilled[0].value.email, password: "yanlis", now: new Date(now.getTime() + index) })).status === "invalid_credentials", "Yanlış şifre genel hata vermelidir.");
    }

    const login = await authService.authenticate({ email: fulfilled[0].value.email, password, now: new Date(now.getTime() + 10_000) });
    assert(login.status === "success", "Geçerli kimlik bilgileri oturum oluşturmalıdır.");
    assert((await prisma.superAdminAccountLock.count({ where: { credentialId } })) === 0, "Başarılı giriş hata sayacını temizlemelidir.");
    if (login.status !== "success") throw new Error("Oturum kimliği üretilemedi.");

    const active = await resolveSuperAdminSession(login.sessionId, sessionRepository, new Date(now.getTime() + 20_000));
    assert(active?.credentialId === credentialId, "DB session guard credential bağlantısını doğrulamalıdır.");
    await prisma.superAdminSession.update({ where: { id: login.sessionId }, data: { expiresAt: new Date(now.getTime() - 1) } });
    assert((await resolveSuperAdminSession(login.sessionId, sessionRepository, now)) === null, "Süresi dolmuş oturum reddedilmelidir.");

    for (let index = 0; index < 5; index += 1) {
      await authService.authenticate({ email: fulfilled[0].value.email, password: "yanlis", now: new Date(now.getTime() + 30_000 + index) });
    }
    assert((await authService.authenticate({ email: fulfilled[0].value.email, password, now: new Date(now.getTime() + 40_000) })).status === "account_locked", "Beş hata sonrası giriş kilitlenmelidir.");
    assert(JSON.stringify(await tenantCounts()) === JSON.stringify(tenantBefore), "Tenant credential/session ve operasyon tabloları değişmemelidir.");

    console.log(JSON.stringify({ accountLock: true, bootstrapRace: "1 accepted / 1 rejected", login: true, secretRedaction: true, sessionExpiry: true, status: "PASS", tenantIsolation: true }, null, 2));
  } finally {
    if (credentialId) await prisma.superAdminCredential.deleteMany({ where: { id: credentialId } });
    await prisma.$disconnect();
  }
}

async function tenantCounts() {
  const [credentials, sessions, documents, ledgerMovements] = await Promise.all([
    prisma.appCredential.count(), prisma.appSession.count(), prisma.documentFile.count(), prisma.ledgerEntry.count(),
  ]);
  return { credentials, documents, ledgerMovements, sessions };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Faz 33 kabulü başarısız."); process.exitCode = 1; });
