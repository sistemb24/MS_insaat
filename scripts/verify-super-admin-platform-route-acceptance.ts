import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import {
  createSuperAdminSessionPrismaRepository,
  SUPER_ADMIN_SESSION_COOKIE,
} from "../src/lib/super-admin-session-repository";

const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";
const sessionRepository = createSuperAdminSessionPrismaRepository(prisma);

async function main() {
  const credential = await prisma.superAdminCredential.findFirst({
    select: { id: true },
  });
  assert(credential, "Route kabulü için mevcut Süper Admin credential gerekir.");

  const session = await sessionRepository.create({
    credentialId: credential.id,
    ipAddress: "127.0.0.1",
    now: new Date(),
    userAgent: "NOA Faz35 read-model acceptance",
  });

  try {
    const routes = [
      ["/super-admin/tenants?q=NOA&sort=name-asc", "Tenant Yönetimi"],
      ["/super-admin/users?q=NOA&sort=name-asc", "Kullanıcı Yönetimi"],
      ["/super-admin/loglar?sort=occurred-desc", "Sistem Logları"],
      ["/super-admin", "Dış İzleme"],
    ] as const;
    const results = [];

    for (const [path, expectedText] of routes) {
      const response = await fetch(new URL(path, baseUrl), {
        headers: { cookie: `${SUPER_ADMIN_SESSION_COOKIE}=${session.id}` },
        redirect: "manual",
      });
      const body = await response.text();
      assert(response.status === 200, `${path} HTTP 200 dönmelidir.`);
      assert(body.includes(expectedText), `${path} beklenen read-model metnini içermelidir.`);
      results.push({ path, status: response.status });
    }

    console.log(JSON.stringify({ routes: results }));
  } finally {
    await sessionRepository.deleteById(session.id);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
