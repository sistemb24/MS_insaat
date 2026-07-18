"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { resolveActiveCashBankAccountOption } from "@/lib/cash-bank-account-selection";
import { createCashBankMovementPrismaRepository } from "@/lib/cash-bank-movement-prisma-repository";
import {
  createCashBankMovementService,
  type CashBankMovementCreateValues,
  type CashBankTransferValues,
  type CounterpartyCashBankMovementCreateValues,
} from "@/lib/cash-bank-movement-service";
import { createCashBankTransferLedgerPostingService } from "@/lib/cash-bank-transfer-ledger-posting-service";
import { createInvoiceCashBankLedgerPostingService } from "@/lib/invoice-cash-bank-ledger-posting-service";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { createLedgerPrismaRepository, type LedgerPrismaClientLike } from "@/lib/ledger-prisma-repository";
import {
  createManualCashBankLedgerPostingService,
  manualCashBankCounterAccounts,
} from "@/lib/manual-cash-bank-ledger-posting-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const cashBankMovementRepository =
  createCashBankMovementPrismaRepository(prisma);
const cashBankMovementService = createCashBankMovementService({
  now: () => new Date().toISOString(),
  repository: cashBankMovementRepository,
});
const transferLedgerPostingService = createCashBankTransferLedgerPostingService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
  repository: createLedgerPrismaRepository(
    prisma as unknown as LedgerPrismaClientLike,
  ),
});
const manualLedgerPostingService = createManualCashBankLedgerPostingService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: createLedgerPrismaRepository(
    prisma as unknown as LedgerPrismaClientLike,
  ),
});
const counterpartyLedgerPostingService = createInvoiceCashBankLedgerPostingService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: createLedgerPrismaRepository(
    prisma as unknown as LedgerPrismaClientLike,
  ),
});
const entityCrudService = createEntityCrudService({
  now: () => new Date().toISOString(),
  repository: createEntityPrismaRepository(prisma),
});

const counterpartySlugs = new Set(["musteriler", "tedarikciler", "taseronlar"]);

export async function listCashBankMovementsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return cashBankMovementService.list({ scope });
}

export async function createCashBankMovementAction(
  values: CashBankMovementCreateValues,
) {
  const counterAccount = resolveManualCounterAccount(values);
  if (!counterAccount) {
    return {
      ok: false as const,
      errors: ["Hareket tipine uygun karşı muhasebe hesabı seçilmelidir."],
    };
  }
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const periodGuard = await getOpenCashBankPeriodGuard(scope);
  if (periodGuard) return periodGuard;

  const result = await cashBankMovementService.createManual({
    scope,
    values,
  });

  if (result.ok) {
    const ledgerResult = await manualLedgerPostingService.post({
      counterAccount,
      movement: result.data,
      scope: { ...scope, periodClosed: false },
    });
    if (!ledgerResult.ok) return ledgerResult;
    result.data.ledgerEntryId = ledgerResult.data.ledgerEntry.id;
    result.data.ledgerDocumentNo = ledgerResult.data.ledgerEntry.documentNo;
    revalidatePath("/kasa-banka");
    revalidatePath("/");
    revalidatePath("/raporlar");
  }

  return result;
}

function resolveManualCounterAccount(values: CashBankMovementCreateValues) {
  const options =
    values.movementType === "Tahsilat"
      ? manualCashBankCounterAccounts.Tahsilat
      : values.movementType === "Ödeme"
        ? manualCashBankCounterAccounts.Ödeme
        : [];

  return options.find(
    (account) => account.code === values.counterAccountCode?.trim(),
  );
}

export async function createCashBankTransferAction(
  values: CashBankTransferValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const period = await prisma.period.findFirst({
    select: { isClosed: true },
    where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId },
  });
  if (!period || period.isClosed) {
    return { ok: false as const, errors: ["Kapalı veya bulunamayan dönemde kasa/banka virmanı oluşturulamaz."] };
  }

  const result = await cashBankMovementService.createTransfer({
    scope,
    values,
  });

  if (result.ok) {
    const ledgerResult = await transferLedgerPostingService.post({
      movements: result.data.rows,
      scope: { ...scope, periodClosed: false },
    });
    if (!ledgerResult.ok) return ledgerResult;
    for (const movement of result.data.rows) {
      movement.ledgerEntryId = ledgerResult.data.ledgerEntry.id;
      movement.ledgerDocumentNo = ledgerResult.data.ledgerEntry.documentNo;
    }
    revalidatePath("/kasa-banka");
    revalidatePath("/");
    revalidatePath("/raporlar");
  }

  return result;
}

export async function createCounterpartyCashBankMovementAction(
  values: CounterpartyCashBankMovementCreateValues,
) {
  if (!values || typeof values !== "object") {
    return { ok: false as const, errors: ["Geçerli bir cari hareket taslağı gönderilmelidir."] };
  }
  if (!counterpartySlugs.has(values.counterpartySlug)) {
    return { ok: false as const, errors: ["Geçerli bir cari kart modülü seçilmelidir."] };
  }
  if (![values.accountCode, values.counterpartyCode, values.documentNo, values.movementDate].every((value) => typeof value === "string" && value.trim())) {
    return { ok: false as const, errors: ["Hesap, cari kart, evrak numarası ve işlem tarihi zorunludur."] };
  }
  if (!Number.isFinite(values.amount) || values.amount <= 0) {
    return { ok: false as const, errors: ["Tutar sıfırdan büyük olmalıdır."] };
  }
  if (values.movementType !== "Tahsilat" && values.movementType !== "Ödeme") {
    return { ok: false as const, errors: ["Geçerli bir cari hareket tipi seçilmelidir."] };
  }
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const periodGuard = await getOpenCashBankPeriodGuard(scope);
  if (periodGuard) return periodGuard;

  const [accountRowsResult, counterpartyRowsResult] = await Promise.all([
    entityCrudService.list({ scope, slug: "kasa-banka" }),
    entityCrudService.list({ scope, slug: values.counterpartySlug }),
  ]);

  if (!accountRowsResult.ok) {
    return accountRowsResult;
  }

  if (!counterpartyRowsResult.ok) {
    return counterpartyRowsResult;
  }

  const selectedCounterparty = counterpartyRowsResult.data.rows.find(
    (row) => row.code === values.counterpartyCode && row.status !== "Pasif",
  );

  if (!selectedCounterparty) {
    return {
      ok: false as const,
      errors: ["Seçilen cari kart aktif kapsamda bulunamadı."],
    };
  }

  const resolvedAccount = resolveActiveCashBankAccountOption({
    account: {
      code: values.accountCode,
      name: "",
    },
    rows: accountRowsResult.data.rows,
  });

  if (!resolvedAccount.ok) {
    return resolvedAccount;
  }

  const account = resolvedAccount.data.account;

  if (!account) {
    return {
      ok: false as const,
      errors: ["Aktif kasa/banka hesabı seçilmelidir."],
    };
  }

  const result = await cashBankMovementService.createManual({
    scope,
    values: {
      accountCode: account.code,
      accountName: account.name,
      amount: values.amount,
      counterpartyName: selectedCounterparty.name,
      currency: "TL",
      description: values.description,
      documentNo: values.documentNo,
      movementDate: values.movementDate,
      movementType: values.movementType,
      sourceId: `${values.counterpartySlug}-${values.counterpartyCode}-${values.documentNo}`,
      sourceLabel: `${values.counterpartySlug}:${values.counterpartyCode}`,
      sourceType: `counterparty-${values.counterpartySlug}`,
    },
  });

  if (result.ok) {
    const ledgerResult = await counterpartyLedgerPostingService.post({
      movement: result.data,
      scope: { ...scope, periodClosed: false },
    });
    if (!ledgerResult.ok) return ledgerResult;
    result.data.ledgerEntryId = ledgerResult.data.ledgerEntry.id;
    result.data.ledgerDocumentNo = ledgerResult.data.ledgerEntry.documentNo;
    revalidatePath("/kasa-banka");
    revalidatePath(`/${values.counterpartySlug}`);
    revalidatePath("/raporlar");
  }

  return result;
}

async function getOpenCashBankPeriodGuard(scope: Awaited<ReturnType<typeof getActiveTenantScope>>) {
  const period = await prisma.period.findFirst({
    select: { isClosed: true },
    where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId },
  });
  return !period || period.isClosed
    ? { ok: false as const, errors: ["Kapalı veya bulunamayan dönemde kasa/banka hareketi oluşturulamaz."] }
    : undefined;
}
