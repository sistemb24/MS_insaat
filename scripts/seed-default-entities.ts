import "dotenv/config";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import { seedDemoCredentials } from "../src/lib/credential-seed";
import { createEntityPrismaRepository } from "../src/lib/entity-prisma-repository";
import { seedDefaultEntityRecords } from "../src/lib/entity-seed";
import { prisma } from "../src/lib/prisma";
import { ensureTenantScope } from "../src/lib/prisma-scope-bootstrap";
import { createProgressPaymentPrismaRepository } from "../src/lib/progress-payment-prisma-repository";
import {
  seedDefaultProgressPaymentAuditLogs,
  seedDefaultProgressPayments,
} from "../src/lib/progress-payment-seed";
import { createProgressPaymentService } from "../src/lib/progress-payment-service";
import { createPurchaseInvoicePrismaRepository } from "../src/lib/purchase-invoice-prisma-repository";
import { createPurchaseInvoiceService } from "../src/lib/purchase-invoice-service";
import {
  seedDefaultPurchaseInvoiceAuditLogs,
  seedDefaultPurchaseInvoices,
} from "../src/lib/purchase-invoice-seed";
import { seedDemoAppSessions } from "../src/lib/session-seed";
import {
  seedSubscriptionPlans,
  seedTenantSubscriptions,
} from "../src/lib/subscription-seed";
import { allTenantScopes } from "../src/lib/tenant-scope";
import { createTimesheetPrismaRepository } from "../src/lib/timesheet-prisma-repository";
import {
  seedDefaultTimesheetAuditLogs,
  seedDefaultTimesheets,
} from "../src/lib/timesheet-seed";
import { createTimesheetService } from "../src/lib/timesheet-service";
import { seedDemoUserScopeAccesses } from "../src/lib/user-scope-access-seed";
import { assertNonProductionDatabaseCommand } from "../src/lib/database-command-safety";

async function main() {
  assertNonProductionDatabaseCommand("db:seed", process.env);

  for (const scope of allTenantScopes) {
    await ensureTenantScope(prisma, scope);
  }

  const sessionResult = await seedDemoAppSessions({
    prisma,
  });
  const scopeAccessResult = await seedDemoUserScopeAccesses({
    prisma,
  });
  const credentialResult = await seedDemoCredentials({
    prisma,
  });

  const planResult = await seedSubscriptionPlans({ prisma });
  const subscriptionResult = await seedTenantSubscriptions({
    prisma,
    scopes: allTenantScopes,
  });

  const allResults: Record<string, unknown> = {};

  for (const scope of allTenantScopes) {
    const scopeKey = scope.companyId;
    const nowIso = new Date().toISOString();

    const entityResult = await seedDefaultEntityRecords({
      nowIso,
      repository: createEntityPrismaRepository(prisma),
      scope,
    });
    const auditLogRepository = createAuditLogPrismaRepository(
      prisma as unknown as AuditLogPrismaClientLike,
    );
    const purchaseInvoiceService = createPurchaseInvoiceService({
      repository: createPurchaseInvoicePrismaRepository(prisma),
      auditLogRepository,
      now: () => nowIso,
    });
    const purchaseInvoiceResult = await seedDefaultPurchaseInvoices({
      scope,
      service: purchaseInvoiceService,
    });
    const purchaseInvoiceAuditResult = await seedDefaultPurchaseInvoiceAuditLogs({
      auditLogRepository,
      scope,
      service: purchaseInvoiceService,
    });
    const progressPaymentService = createProgressPaymentService({
      repository: createProgressPaymentPrismaRepository(prisma),
      now: () => nowIso,
    });
    const progressPaymentResult = await seedDefaultProgressPayments({
      scope,
      service: progressPaymentService,
    });
    const progressPaymentAuditResult = await seedDefaultProgressPaymentAuditLogs({
      auditLogRepository,
      scope,
      service: progressPaymentService,
    });
    const timesheetService = createTimesheetService({
      repository: createTimesheetPrismaRepository(prisma),
      auditLogRepository,
      now: () => nowIso,
    });
    const timesheetResult = await seedDefaultTimesheets({
      scope,
      service: timesheetService,
    });
    const timesheetAuditResult = await seedDefaultTimesheetAuditLogs({
      auditLogRepository,
      scope,
      service: timesheetService,
    });

    allResults[scopeKey] = {
      companyName: scope.companyName,
      entities: {
        seeded: entityResult.seeded,
        skipped: entityResult.skipped,
        totalRows: entityResult.totalRows,
      },
      purchaseInvoices: {
        seeded: purchaseInvoiceResult.seeded,
        skipped: purchaseInvoiceResult.skipped,
        totalRows: purchaseInvoiceResult.totalRows,
      },
      purchaseInvoiceAuditLogs: {
        seeded: purchaseInvoiceAuditResult.seeded,
        skipped: purchaseInvoiceAuditResult.skipped,
      },
      progressPayments: {
        seeded: progressPaymentResult.seeded,
        skipped: progressPaymentResult.skipped,
        totalRows: progressPaymentResult.totalRows,
      },
      progressPaymentAuditLogs: {
        seeded: progressPaymentAuditResult.seeded,
        skipped: progressPaymentAuditResult.skipped,
      },
      timesheets: {
        seeded: timesheetResult.seeded,
        skipped: timesheetResult.skipped,
        totalRows: timesheetResult.totalRows,
      },
      timesheetAuditLogs: {
        seeded: timesheetAuditResult.seeded,
        skipped: timesheetAuditResult.skipped,
      },
    };
  }

  console.log(
    JSON.stringify(
      {
        companies: allResults,
        sessions: {
          seeded: sessionResult.seeded,
          sessionIds: sessionResult.sessionIds,
        },
        scopeAccesses: {
          seeded: scopeAccessResult.seeded,
          accessIds: scopeAccessResult.accessIds,
        },
        credentials: {
          seeded: credentialResult.seeded,
          emails: credentialResult.emails,
        },
        subscriptionPlans: {
          seeded: planResult.seeded,
          planIds: planResult.planIds,
        },
        tenantSubscriptions: {
          seeded: subscriptionResult.seeded,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
