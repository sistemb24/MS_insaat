import { beforeEach, describe, expect, test, vi } from "vitest";

const scope = {
  tenantId: "tenant-sales-action", tenantName: "Tenant", companyId: "company-sales-action",
  companyName: "Company", periodId: "period-sales-action", periodLabel: "2026",
  userId: "accounting", userName: "Accounting", userRole: "accounting" as const, licenseLabel: "Kurumsal",
};
const postMock = vi.hoisted(() => vi.fn());
const cancelMock = vi.hoisted(() => vi.fn());
const getScopeMock = vi.hoisted(() => vi.fn());
const ensureMock = vi.hoisted(() => vi.fn());
const revalidateMock = vi.hoisted(() => vi.fn());
const periodMock = vi.hoisted(() => vi.fn());
const createPostingRepositoryMock = vi.hoisted(() => vi.fn(() => ({ commit: vi.fn() })));
const createPostingServiceMock = vi.hoisted(() => vi.fn(() => ({ post: vi.fn() })));
const invoiceLedgerPostMock = vi.hoisted(() => vi.fn());
const createSalesServiceMock = vi.hoisted(() => vi.fn(() => ({ post: postMock, cancel: cancelMock })));
const collectMock = vi.hoisted(() => vi.fn());
const cashBankListMock = vi.hoisted(() => vi.fn());
const salesInvoiceListMock = vi.hoisted(() => vi.fn());
const entityListMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({ period: { findFirst: periodMock } }));

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/server-active-scope", () => ({ getActiveTenantScope: getScopeMock }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: ensureMock }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({ createAuditLogPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/entity-prisma-repository", () => ({ createEntityPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/entity-crud-service", () => ({ createEntityCrudService: vi.fn(() => ({ list: entityListMock })) }));
vi.mock("@/lib/sales-invoice-prisma-repository", () => ({ createSalesInvoicePrismaRepository: vi.fn(() => ({ list: salesInvoiceListMock })) }));
vi.mock("@/lib/cash-bank-movement-prisma-repository", () => ({ createCashBankMovementPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/cash-bank-movement-service", () => ({ createCashBankMovementService: vi.fn(() => ({ createSalesInvoiceCollection: collectMock, list: cashBankListMock })) }));
vi.mock("@/lib/cash-bank-account-selection", () => ({ resolveActiveCashBankAccountOption: vi.fn(({ account }) => ({ ok: true, data: { account: account ?? { code: "KASA-0001", name: "MERKEZ KASA" } } })) }));
vi.mock("@/lib/purchase-invoice-ledger-posting-prisma-repository", () => ({ createPurchaseInvoiceLedgerPostingPrismaRepository: createPostingRepositoryMock }));
vi.mock("@/lib/purchase-invoice-ledger-posting-service", () => ({ createSalesInvoiceLedgerPostingService: createPostingServiceMock }));
vi.mock("@/lib/invoice-cash-bank-ledger-posting-service", () => ({ createInvoiceCashBankLedgerPostingService: vi.fn(() => ({ post: invoiceLedgerPostMock })) }));
vi.mock("@/lib/ledger-prisma-repository", () => ({ createLedgerPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/sales-invoice-service", () => ({ createSalesInvoiceService: createSalesServiceMock, validateSalesInvoiceStockCodes: vi.fn(() => []) }));

import { cancelSalesInvoiceAction, collectSalesInvoiceAction, postSalesInvoiceAction } from "./sales-invoice-actions";

describe("sales invoice actions", () => {
  beforeEach(() => {
    postMock.mockReset(); cancelMock.mockReset(); getScopeMock.mockResolvedValue(scope); ensureMock.mockResolvedValue(undefined);
    periodMock.mockReset(); periodMock.mockResolvedValue({ isClosed: false }); revalidateMock.mockReset();
    collectMock.mockReset(); cashBankListMock.mockReset(); salesInvoiceListMock.mockReset(); entityListMock.mockReset(); invoiceLedgerPostMock.mockReset();
    cashBankListMock.mockResolvedValue({ ok: true, data: { rows: [] } });
  });

  test("passes scoped period state to sales posting and revalidates ledger surfaces", async () => {
    periodMock.mockResolvedValue({ isClosed: true });
    postMock.mockResolvedValue({ ok: true, data: { id: "sales-1" } });
    await postSalesInvoiceAction("sales-1");
    expect(periodMock).toHaveBeenCalledWith({
      select: { isClosed: true },
      where: { tenantId: scope.tenantId, companyId: scope.companyId, id: scope.periodId },
    });
    expect(postMock).toHaveBeenCalledWith({ id: "sales-1", scope: { ...scope, periodClosed: true } });
    expect(revalidateMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidateMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("passes closed-period state to sales invoice cancellation", async () => {
    periodMock.mockResolvedValue({ isClosed: true });
    cancelMock.mockResolvedValue({ ok: false, errors: ["Kapalı dönemde fatura iptal edilemez."] });

    await expect(cancelSalesInvoiceAction("sales-invoice-1")).resolves.toEqual({
      ok: false,
      errors: ["Kapalı dönemde fatura iptal edilemez."],
    });
    expect(cancelMock).toHaveBeenCalledWith({
      id: "sales-invoice-1",
      scope: { ...scope, periodClosed: true },
    });
  });

  test("revalidates financial surfaces after sales invoice cancellation", async () => {
    periodMock.mockResolvedValue({ isClosed: false });
    cancelMock.mockResolvedValue({ ok: true, data: { id: "sales-invoice-1" } });

    await cancelSalesInvoiceAction("sales-invoice-1");

    expect(revalidateMock.mock.calls).toContainEqual(["/kasa-banka"]);
    expect(revalidateMock.mock.calls).toContainEqual(["/faturalar"]);
    expect(revalidateMock.mock.calls).toContainEqual(["/ayarlar"]);
    expect(revalidateMock.mock.calls).toContainEqual(["/[module]", "page"]);
  });

  test("collects a scoped posted sales invoice through the selected cash account", async () => {
    const invoice = { id: "sales-1", status: "Kaydedildi", documentNo: "SF-001" };
    salesInvoiceListMock.mockResolvedValue([invoice]);
    entityListMock.mockResolvedValue({ ok: true, data: { rows: [{ code: "KASA-0001", name: "MERKEZ KASA", status: "Aktif" }] } });
    collectMock.mockResolvedValue({ ok: true, data: { id: "movement-1" } });
    invoiceLedgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-1", documentNo: "YVM-THS-THS-001" } } });
    await collectSalesInvoiceAction("sales-1", { code: "KASA-0001", name: "MERKEZ KASA" }, 5000);
    expect(collectMock).toHaveBeenCalledWith(expect.objectContaining({ salesInvoice: invoice, scope, amount: 5000 }));
    expect(revalidateMock).toHaveBeenCalledWith("/musteriler");
  });

  test("attaches the ledger document to a partial sales collection movement", async () => {
    const invoice = { id: "sales-1", status: "Kaydedildi", documentNo: "SF-001" };
    const movement = {
      id: "movement-sales-partial-2",
      amount: 5000,
      documentNo: "THS-SF-001-2",
      movementType: "Tahsilat",
      sourceType: "sales-invoice",
      sourceId: "sales-1",
    };
    salesInvoiceListMock.mockResolvedValue([invoice]);
    entityListMock.mockResolvedValue({ ok: true, data: { rows: [{ code: "KASA-0001", name: "MERKEZ KASA", status: "Aktif" }] } });
    collectMock.mockResolvedValue({ ok: true, data: movement });
    invoiceLedgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-sales-partial-2", documentNo: "YVM-THS-THS-SF-001-2" } } });

    const result = await collectSalesInvoiceAction("sales-1", { code: "KASA-0001", name: "MERKEZ KASA" }, 5000);

    expect(collectMock).toHaveBeenCalledWith(expect.objectContaining({ amount: 5000, salesInvoice: invoice }));
    expect(invoiceLedgerPostMock).toHaveBeenCalledWith({ movement, scope: { ...scope, periodClosed: false } });
    expect(result).toEqual({ ok: true, data: { ...movement, ledgerEntryId: "ledger-sales-partial-2", ledgerDocumentNo: "YVM-THS-THS-SF-001-2" } });
  });

  test("recovers an existing ledgerless partial sales collection on retry", async () => {
    const invoice = { id: "sales-1", status: "Kaydedildi", documentNo: "SF-001", grandTotal: 16200 };
    const movement = {
      id: "movement-sales-partial-1",
      accountCode: "KASA-0001",
      amount: 5000,
      documentNo: "THS-SF-001",
      movementType: "Tahsilat",
      sourceType: "sales-invoice",
      sourceId: "sales-1",
    };
    salesInvoiceListMock.mockResolvedValue([invoice]);
    entityListMock.mockResolvedValue({ ok: true, data: { rows: [{ code: "KASA-0001", name: "MERKEZ KASA", status: "Aktif" }] } });
    cashBankListMock.mockResolvedValue({ ok: true, data: { rows: [movement] } });
    invoiceLedgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-sales-recovered", documentNo: "YVM-THS-THS-SF-001" } } });

    const result = await collectSalesInvoiceAction("sales-1", { code: "KASA-0001", name: "MERKEZ KASA" }, 5000);

    expect(collectMock).not.toHaveBeenCalled();
    expect(invoiceLedgerPostMock).toHaveBeenCalledWith({ movement, scope: { ...scope, periodClosed: false } });
    expect(result).toEqual({ ok: true, data: { ...movement, ledgerEntryId: "ledger-sales-recovered", ledgerDocumentNo: "YVM-THS-THS-SF-001" } });
  });

  test("recovers a ledgerless sales collection when retry keeps the amount empty", async () => {
    const invoice = { id: "sales-1", status: "Kaydedildi", documentNo: "SF-001", grandTotal: 16200 };
    const movement = { id: "movement-sales-full", accountCode: "KASA-0001", amount: 16200, documentNo: "THS-SF-001", movementType: "Tahsilat", sourceType: "sales-invoice", sourceId: "sales-1" };
    salesInvoiceListMock.mockResolvedValue([invoice]);
    entityListMock.mockResolvedValue({ ok: true, data: { rows: [{ code: "KASA-0001", name: "MERKEZ KASA", status: "Aktif" }] } });
    cashBankListMock.mockResolvedValue({ ok: true, data: { rows: [movement] } });
    invoiceLedgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-sales-full", documentNo: "YVM-THS-THS-SF-001" } } });

    const result = await collectSalesInvoiceAction("sales-1", { code: "KASA-0001", name: "MERKEZ KASA" });

    expect(collectMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: { ...movement, ledgerEntryId: "ledger-sales-full", ledgerDocumentNo: "YVM-THS-THS-SF-001" } });
  });
});
