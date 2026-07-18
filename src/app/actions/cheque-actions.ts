"use server";

import { revalidatePath } from "next/cache";

import { createInvoiceCashBankLedgerPostingService } from "@/lib/invoice-cash-bank-ledger-posting-service";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import type { CashBankAccountOption } from "@/lib/cash-bank-movement-service";
import { createCashBankMovementPrismaRepository } from "@/lib/cash-bank-movement-prisma-repository";
import { createCashBankMovementService } from "@/lib/cash-bank-movement-service";
import { createChequePrismaRepository } from "@/lib/cheque-prisma-repository";
import type { ChequeCreateValues } from "@/lib/cheque-service";
import { createChequeService } from "@/lib/cheque-service";
import { createLedgerPrismaRepository, type LedgerPrismaClientLike } from "@/lib/ledger-prisma-repository";
import { prisma } from "@/lib/prisma";

import { getSubscriptionFeatureActionContext } from "./subscription-feature-action-guard";

const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

const cashBankMovementRepository = createCashBankMovementPrismaRepository(prisma);
const ledgerRepository = createLedgerPrismaRepository(
  prisma as unknown as LedgerPrismaClientLike,
);
const chequeCollectionLedgerPostingService = createInvoiceCashBankLedgerPostingService({
  auditLogRepository,
  repository: ledgerRepository,
  now: () => new Date().toISOString(),
});
const cashBankMovementService = createCashBankMovementService({
  now: () => new Date().toISOString(),
  repository: cashBankMovementRepository,
});

const chequeService = createChequeService({
  auditLogRepository,
  cashBankMovementRepository,
  ledgerRepository,
  now: () => new Date().toISOString(),
  repository: createChequePrismaRepository(prisma),
});

export async function listChequesAction() {
  const context = await getChequeActionContext();

  if (!context.ok) {
    return context.result;
  }

  return chequeService.list({
    scope: context.scope,
  });
}

export async function createChequeAction(values: ChequeCreateValues) {
  const context = await getChequeActionContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await chequeService.create({
    scope: context.scope,
    values,
  });

  if (result.ok) {
    revalidatePath("/cek");
  }

  return result;
}

export async function collectChequeAction(
  id: string,
  collectionAccount?: CashBankAccountOption,
) {
  const context = await getChequeActionContext();

  if (!context.ok) {
    return context.result;
  }

  const period = await prisma.period.findFirst({
    select: { isClosed: true },
    where: { id: context.scope.periodId, tenantId: context.scope.tenantId, companyId: context.scope.companyId },
  });
  if (!period || period.isClosed) {
    return { ok: false as const, errors: ["Kapalı veya bulunamayan dönemde çek tahsilatı oluşturulamaz."] };
  }

  const result = await chequeService.collect({
    collectionAccount,
    id,
    scope: context.scope,
  });

  if (result.ok) {
    const movementResult = await cashBankMovementService.list({ scope: context.scope });
    if (!movementResult.ok) return movementResult;
    const movement = movementResult.data.rows.find(
      (row) => row.sourceType === "cheque" && row.sourceId === id && row.movementType === "Çek Tahsilatı",
    );
    if (!movement) {
      return { ok: false as const, errors: ["Çek tahsilat kasa/banka hareketi bulunamadı."] };
    }
    const ledgerResult = await chequeCollectionLedgerPostingService.post({
      movement,
      scope: { ...context.scope, periodClosed: false },
    });
    if (!ledgerResult.ok) return ledgerResult;
    result.data.ledgerDocumentNo = ledgerResult.data.ledgerEntry.documentNo;
    revalidatePath("/cek");
    revalidatePath("/kasa-banka");
    revalidatePath("/");
    revalidatePath("/raporlar");
  }

  return result;
}

export async function listChequeAuditLogsAction() {
  const context = await getChequeActionContext();

  if (!context.ok) {
    return context.result;
  }

  if (!auditLogRepository.listByEntityType) {
    return {
      ok: false as const,
      errors: ["Audit log okuma repository bağlantısı hazır değil."],
    };
  }

  return {
    ok: true as const,
    data: {
      rows: await auditLogRepository.listByEntityType({
        entityType: "cheque",
        limit: 100,
        scope: context.scope,
      }),
    },
  };
}

function getChequeActionContext() {
  return getSubscriptionFeatureActionContext("cheques");
}
