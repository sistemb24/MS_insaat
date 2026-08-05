import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { createSuperAdminPlatformReadModel } from "../src/lib/super-admin-platform-read-model";

const readModel = createSuperAdminPlatformReadModel(prisma);

async function main() {
  const [tenants, users, logs, health] = await Promise.all([
    readModel.listTenants({ page: "1", sort: "created-desc" }),
    readModel.listUsers({ page: "1", sort: "name-asc" }),
    readModel.listAuditLogs({ page: "1", sort: "occurred-desc" }),
    readModel.getHealth(),
  ]);

  assert(tenants.rows.length <= tenants.pageSize, "Tenant sayfalaması sınırlı olmalıdır.");
  assert(users.rows.length <= users.pageSize, "Kullanıcı sayfalaması sınırlı olmalıdır.");
  assert(logs.rows.length <= logs.pageSize, "Log sayfalaması sınırlı olmalıdır.");
  assert(
    users.rows.every((user) => user.email === "—" || user.email.includes("***@")),
    "Kullanıcı e-postaları minimize edilmelidir.",
  );
  assert(
    logs.rows.every(
      (log) =>
        !/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(log.entityLabel) &&
        !/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(log.entityLabel),
    ),
    "Audit DTO e-posta veya IPv4 yayınlamamalıdır.",
  );
  assert(health.database.status === "available", "DB health ölçümü geçmelidir.");
  assert(
    health.externalMonitoring.status === "unavailable",
    "Yapılandırılmamış dış izleme açıkça unavailable kalmalıdır.",
  );

  console.log(
    JSON.stringify({
      health,
      logs: { rows: logs.rows.length, total: logs.total },
      tenants: { rows: tenants.rows.length, total: tenants.total },
      users: { rows: users.rows.length, total: users.total },
    }),
  );
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
