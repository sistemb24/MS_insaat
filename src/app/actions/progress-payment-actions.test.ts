import { beforeEach, describe, expect, test, vi } from "vitest";

const scope = {
  tenantId: "tenant-hak-action",
  tenantName: "Tenant",
  companyId: "company-hak-action",
  companyName: "Company",
  periodId: "period-hak-action",
  periodLabel: "2026",
  userId: "accounting",
  userName: "Accounting",
  userRole: "accounting" as const,
  licenseLabel: "Kurumsal",
};
const postMock = vi.hoisted(() => vi.fn());
const getContextMock = vi.hoisted(() => vi.fn());
const revalidateMock = vi.hoisted(() => vi.fn());
const periodFindFirstMock = vi.hoisted(() => vi.fn());
const progressRepositoryListMock = vi.hoisted(() => vi.fn());
const accountListMock = vi.hoisted(() => vi.fn());
const paymentMovementMock = vi.hoisted(() => vi.fn());
const collectionMovementMock = vi.hoisted(() => vi.fn());
const ledgerPostMock = vi.hoisted(() => vi.fn());
const progressServiceMock = vi.hoisted(() => vi.fn(() => ({ post: postMock })));

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { period: { findFirst: periodFindFirstMock } } }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({ createAuditLogPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/cash-bank-movement-prisma-repository", () => ({ createCashBankMovementPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/cash-bank-movement-service", () => ({ createCashBankMovementService: vi.fn(() => ({ createProgressPaymentPayment: paymentMovementMock, createProgressPaymentCollection: collectionMovementMock })) }));
vi.mock("@/lib/entity-crud-service", () => ({ createEntityCrudService: vi.fn(() => ({ list: accountListMock })) }));
vi.mock("@/lib/entity-prisma-repository", () => ({ createEntityPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/ledger-prisma-repository", () => ({ createLedgerPrismaRepository: vi.fn(() => ({ list: vi.fn() })) }));
vi.mock("@/lib/invoice-cash-bank-ledger-posting-service", () => ({ createInvoiceCashBankLedgerPostingService: vi.fn(() => ({ post: ledgerPostMock })) }));
vi.mock("@/lib/progress-payment-ledger-posting-prisma-repository", () => ({ createProgressPaymentLedgerPostingPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/progress-payment-ledger-posting-service", () => ({ createProgressPaymentLedgerPostingService: vi.fn(() => ({})) }));
vi.mock("@/lib/progress-payment-prisma-repository", () => ({ createProgressPaymentPrismaRepository: vi.fn(() => ({ list: progressRepositoryListMock })) }));
vi.mock("@/lib/progress-payment-service", () => ({ createProgressPaymentService: progressServiceMock }));
vi.mock("./subscription-feature-action-guard", () => ({ getSubscriptionFeatureActionContext: getContextMock }));

import {
  collectProgressPaymentAction,
  payProgressPaymentAction,
  postProgressPaymentAction,
} from "./progress-payment-actions";

describe("progress payment actions", () => {
  beforeEach(() => {
    postMock.mockReset();
    periodFindFirstMock.mockResolvedValue({ isClosed: false });
    progressRepositoryListMock.mockResolvedValue([{ id: "progress-payment-1", documentNo: "HAK-0001" }]);
    accountListMock.mockResolvedValue({ ok: true, data: { rows: [{ code: "KASA-0001", name: "MERKEZ KASA", status: "Aktif" }] } });
    paymentMovementMock.mockReset();
    collectionMovementMock.mockReset();
    ledgerPostMock.mockReset();
    getContextMock.mockResolvedValue({ ok: true, scope });
    revalidateMock.mockReset();
  });

  test("passes the scoped context to posting and revalidates financial surfaces", async () => {
    postMock.mockResolvedValue({ ok: true, data: { id: "progress-payment-1" } });

    await postProgressPaymentAction("progress-payment-1");

    expect(postMock).toHaveBeenCalledWith({
      id: "progress-payment-1",
      scope,
    });
    expect(revalidateMock.mock.calls).toEqual([
      ["/"],
      ["/hakedis"],
      ["/kasa-banka"],
      ["/raporlar"],
      ["/ayarlar"],
      ["/[module]", "page"],
    ]);
  });

  test("does not revalidate financial surfaces when posting is rejected", async () => {
    postMock.mockResolvedValue({ ok: false, errors: ["Kapalı dönemde hakediş muhasebe fişi oluşturulamaz."] });

    await postProgressPaymentAction("progress-payment-1");

    expect(revalidateMock).not.toHaveBeenCalled();
  });

  test("posts payment movement ledger and returns its document number", async () => {
    const movement = { id: "movement-payment-1", movementType: "Hakediş Ödemesi" };
    paymentMovementMock.mockResolvedValue({ ok: true, data: movement });
    ledgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-payment-1", documentNo: "YVM-ODM-ODM-HAK-0001" } } });

    const result = await payProgressPaymentAction("progress-payment-1");

    expect(paymentMovementMock).toHaveBeenCalledWith({
      account: { code: "KASA-0001", name: "MERKEZ KASA" },
      progressPayment: { id: "progress-payment-1", documentNo: "HAK-0001" },
      scope,
    });
    expect(ledgerPostMock).toHaveBeenCalledWith({ movement, scope: { ...scope, periodClosed: false } });
    expect(result).toEqual({ ok: true, data: { ...movement, ledgerEntryId: "ledger-payment-1", ledgerDocumentNo: "YVM-ODM-ODM-HAK-0001" } });
  });

  test("does not create payment movement in a closed period", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: true });

    const result = await payProgressPaymentAction("progress-payment-1");

    expect(result).toEqual({ ok: false, errors: ["Kapalı veya bulunamayan dönemde hakediş ödemesi oluşturulamaz."] });
    expect(paymentMovementMock).not.toHaveBeenCalled();
    expect(ledgerPostMock).not.toHaveBeenCalled();
  });

  test("posts collection movement ledger and returns its document number", async () => {
    const movement = { id: "movement-collection-1", movementType: "Hakediş Tahsilatı" };
    collectionMovementMock.mockResolvedValue({ ok: true, data: movement });
    ledgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-collection-1", documentNo: "YVM-THS-THS-HAK-0001" } } });

    const result = await collectProgressPaymentAction("progress-payment-1");

    expect(collectionMovementMock).toHaveBeenCalledWith({
      account: { code: "KASA-0001", name: "MERKEZ KASA" },
      progressPayment: { id: "progress-payment-1", documentNo: "HAK-0001" },
      scope,
    });
    expect(ledgerPostMock).toHaveBeenCalledWith({ movement, scope: { ...scope, periodClosed: false } });
    expect(result).toEqual({ ok: true, data: { ...movement, ledgerEntryId: "ledger-collection-1", ledgerDocumentNo: "YVM-THS-THS-HAK-0001" } });
  });
});
