import { beforeEach, describe, expect, test, vi } from "vitest";

const activeScope = {
  tenantId: "tenant-action",
  tenantName: "Action Tenant",
  companyId: "company-action",
  companyName: "Action Company",
  periodId: "period-action",
  periodLabel: "2026",
  userId: "accounting-action",
  userName: "Action Muhasebe",
  userRole: "accounting" as const,
  licenseLabel: "Kurumsal",
};

const postMock = vi.hoisted(() => vi.fn());
const cancelMock = vi.hoisted(() => vi.fn());
const getActiveTenantScopeMock = vi.hoisted(() => vi.fn());
const ensureTenantScopeMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const periodFindFirstMock = vi.hoisted(() => vi.fn());
const ledgerPostingRepository = vi.hoisted(() => ({ commit: vi.fn() }));
const ledgerPostingService = vi.hoisted(() => ({ post: vi.fn() }));
const createLedgerPostingRepositoryMock = vi.hoisted(() =>
  vi.fn(() => ledgerPostingRepository),
);
const createLedgerPostingServiceMock = vi.hoisted(() =>
  vi.fn(() => ledgerPostingService),
);
const createPurchaseInvoiceServiceMock = vi.hoisted(() =>
  vi.fn(() => ({
    cancel: cancelMock,
    create: vi.fn(),
    list: vi.fn(),
    post: postMock,
    update: vi.fn(),
  })),
);
const payMock = vi.hoisted(() => vi.fn());
const cashBankListMock = vi.hoisted(() => vi.fn());
const purchaseInvoiceListMock = vi.hoisted(() => vi.fn());
const entityListMock = vi.hoisted(() => vi.fn());
const resolveAccountMock = vi.hoisted(() => vi.fn());
const invoiceLedgerPostMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  period: {
    findFirst: periodFindFirstMock,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({
  ensureTenantScope: ensureTenantScopeMock,
}));
vi.mock("@/lib/server-active-scope", () => ({
  getActiveTenantScope: getActiveTenantScopeMock,
}));
vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: vi.fn(() => ({
    listByEntityType: vi.fn(),
    record: vi.fn(),
  })),
}));
vi.mock("@/lib/purchase-invoice-ledger-posting-prisma-repository", () => ({
  createPurchaseInvoiceLedgerPostingPrismaRepository:
    createLedgerPostingRepositoryMock,
}));
vi.mock("@/lib/purchase-invoice-ledger-posting-service", () => ({
  createPurchaseInvoiceLedgerPostingService: createLedgerPostingServiceMock,
}));
vi.mock("@/lib/purchase-invoice-prisma-repository", () => ({
  createPurchaseInvoicePrismaRepository: vi.fn(() => ({
    create: vi.fn(),
    list: purchaseInvoiceListMock,
    update: vi.fn(),
  })),
}));
vi.mock("@/lib/purchase-invoice-service", () => ({
  createPurchaseInvoiceService: createPurchaseInvoiceServiceMock,
  validatePurchaseInvoiceStockCodes: vi.fn(() => []),
}));
vi.mock("@/lib/cash-bank-movement-prisma-repository", () => ({
  createCashBankMovementPrismaRepository: vi.fn(() => ({})),
}));
vi.mock("@/lib/cash-bank-movement-service", () => ({
  createCashBankMovementService: vi.fn(() => ({
    createPurchaseInvoicePayment: payMock,
    list: cashBankListMock,
  })),
}));
vi.mock("@/lib/entity-prisma-repository", () => ({
  createEntityPrismaRepository: vi.fn(() => ({})),
}));
vi.mock("@/lib/entity-crud-service", () => ({
  createEntityCrudService: vi.fn(() => ({ list: entityListMock })),
}));
vi.mock("@/lib/cash-bank-account-selection", () => ({
  resolveActiveCashBankAccountOption: resolveAccountMock,
}));
vi.mock("@/lib/invoice-cash-bank-ledger-posting-service", () => ({
  createInvoiceCashBankLedgerPostingService: vi.fn(() => ({ post: invoiceLedgerPostMock })),
}));

import { cancelPurchaseInvoiceAction, payPurchaseInvoiceAction, postPurchaseInvoiceAction } from "./purchase-invoice-actions";

describe("purchase invoice actions", () => {
  beforeEach(() => {
    postMock.mockReset();
    cancelMock.mockReset();
    getActiveTenantScopeMock.mockReset();
    ensureTenantScopeMock.mockReset();
    revalidatePathMock.mockReset();
    periodFindFirstMock.mockReset();
    payMock.mockReset();
    purchaseInvoiceListMock.mockReset();
    entityListMock.mockReset();
    resolveAccountMock.mockReset();
    invoiceLedgerPostMock.mockReset();
    cashBankListMock.mockReset();
    getActiveTenantScopeMock.mockResolvedValue(activeScope);
    ensureTenantScopeMock.mockResolvedValue(undefined);
    resolveAccountMock.mockImplementation(({ account }: { account?: { code: string; name: string } }) => ({ ok: true, data: { account: account ?? { code: "KASA-0001", name: "MERKEZ KASA" } } }));
    cashBankListMock.mockResolvedValue({ ok: true, data: { rows: [] } });
  });

  test("wires the atomic ledger posting service into the production purchase service", () => {
    expect(createLedgerPostingRepositoryMock).toHaveBeenCalledWith(prismaMock);
    expect(createLedgerPostingServiceMock).toHaveBeenCalledWith({
      now: expect.any(Function),
      repository: ledgerPostingRepository,
    });
    expect(createPurchaseInvoiceServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ ledgerPostingService }),
    );
  });

  test("passes the fully scoped closed-period state and revalidates invoice and ledger surfaces", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: true });
    postMock.mockResolvedValue({
      ok: true,
      data: {
        id: "purchase-invoice-1",
        ledgerDocumentNo: "YVM-AF-001",
      },
    });

    await expect(postPurchaseInvoiceAction("purchase-invoice-1")).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );

    expect(ensureTenantScopeMock).toHaveBeenCalledWith(prismaMock, activeScope);
    expect(periodFindFirstMock).toHaveBeenCalledWith({
      select: {
        isClosed: true,
      },
      where: {
        companyId: activeScope.companyId,
        id: activeScope.periodId,
        tenantId: activeScope.tenantId,
      },
    });
    expect(postMock).toHaveBeenCalledWith({
      id: "purchase-invoice-1",
      scope: { ...activeScope, periodClosed: true },
    });
    expect(revalidatePathMock.mock.calls).toEqual([
      ["/faturalar"],
      ["/ayarlar"],
      ["/[module]", "page"],
    ]);
  });

  test("passes closed-period state to purchase invoice cancellation", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: true });
    cancelMock.mockResolvedValue({ ok: false, errors: ["Kapalı dönemde fatura iptal edilemez."] });

    await expect(cancelPurchaseInvoiceAction("purchase-invoice-1")).resolves.toEqual({
      ok: false,
      errors: ["Kapalı dönemde fatura iptal edilemez."],
    });
    expect(cancelMock).toHaveBeenCalledWith({
      id: "purchase-invoice-1",
      scope: { ...activeScope, periodClosed: true },
    });
  });

  test("revalidates financial surfaces after purchase invoice cancellation", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: false });
    cancelMock.mockResolvedValue({ ok: true, data: { id: "purchase-invoice-1" } });

    await cancelPurchaseInvoiceAction("purchase-invoice-1");

    expect(revalidatePathMock.mock.calls).toEqual([
      ["/"],
      ["/faturalar"],
      ["/kasa-banka"],
      ["/raporlar"],
      ["/ayarlar"],
      ["/[module]", "page"],
    ]);
  });

  test("does not revalidate surfaces when automatic ledger posting is rejected", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: false });
    postMock.mockResolvedValue({
      ok: false,
      errors: ["Muhasebe fişi oluşturulamadı."],
    });

    await expect(postPurchaseInvoiceAction("purchase-invoice-2")).resolves.toEqual({
      ok: false,
      errors: ["Muhasebe fişi oluşturulamadı."],
    });
    expect(postMock).toHaveBeenCalledWith({
      id: "purchase-invoice-2",
      scope: { ...activeScope, periodClosed: false },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("attaches the ledger document to a partial purchase payment movement", async () => {
    const invoice = { id: "purchase-invoice-1", status: "Kaydedildi", documentNo: "AF-001" };
    const movement = {
      id: "movement-purchase-partial-2",
      amount: 5000,
      documentNo: "ODM-AF-001-2",
      movementType: "Fatura Ödemesi",
      sourceType: "purchase-invoice",
      sourceId: "purchase-invoice-1",
    };
    purchaseInvoiceListMock.mockResolvedValue([invoice]);
    entityListMock.mockResolvedValue({ ok: true, data: { rows: [{ code: "KASA-0001", name: "MERKEZ KASA", status: "Aktif" }] } });
    periodFindFirstMock.mockResolvedValue({ isClosed: false });
    payMock.mockResolvedValue({ ok: true, data: movement });
    invoiceLedgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-purchase-partial-2", documentNo: "YVM-ODM-ODM-AF-001-2" } } });

    const result = await payPurchaseInvoiceAction("purchase-invoice-1", { code: "KASA-0001", name: "MERKEZ KASA" }, 5000);

    expect(payMock).toHaveBeenCalledWith(expect.objectContaining({ amount: 5000, purchaseInvoice: invoice }));
    expect(invoiceLedgerPostMock).toHaveBeenCalledWith({ movement, scope: { ...activeScope, periodClosed: false } });
    expect(result).toEqual({ ok: true, data: { ...movement, ledgerEntryId: "ledger-purchase-partial-2", ledgerDocumentNo: "YVM-ODM-ODM-AF-001-2" } });
  });

  test("recovers an existing ledgerless partial purchase payment on retry", async () => {
    const invoice = { id: "purchase-invoice-1", status: "Kaydedildi", documentNo: "AF-001", grandTotal: 16200 };
    const movement = {
      id: "movement-purchase-partial-1",
      accountCode: "KASA-0001",
      amount: 5000,
      documentNo: "ODM-AF-001",
      movementType: "Fatura Ödemesi",
      sourceType: "purchase-invoice",
      sourceId: "purchase-invoice-1",
    };
    purchaseInvoiceListMock.mockResolvedValue([invoice]);
    entityListMock.mockResolvedValue({ ok: true, data: { rows: [{ code: "KASA-0001", name: "MERKEZ KASA", status: "Aktif" }] } });
    cashBankListMock.mockResolvedValue({ ok: true, data: { rows: [movement] } });
    periodFindFirstMock.mockResolvedValue({ isClosed: false });
    invoiceLedgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-purchase-recovered", documentNo: "YVM-ODM-ODM-AF-001" } } });

    const result = await payPurchaseInvoiceAction("purchase-invoice-1", { code: "KASA-0001", name: "MERKEZ KASA" }, 5000);

    expect(payMock).not.toHaveBeenCalled();
    expect(invoiceLedgerPostMock).toHaveBeenCalledWith({ movement, scope: { ...activeScope, periodClosed: false } });
    expect(result).toEqual({ ok: true, data: { ...movement, ledgerEntryId: "ledger-purchase-recovered", ledgerDocumentNo: "YVM-ODM-ODM-AF-001" } });
  });

  test("recovers a ledgerless purchase payment when retry keeps the amount empty", async () => {
    const invoice = { id: "purchase-invoice-1", status: "Kaydedildi", documentNo: "AF-001", grandTotal: 16200 };
    const movement = { id: "movement-purchase-full", accountCode: "KASA-0001", amount: 16200, documentNo: "ODM-AF-001", movementType: "Fatura Ödemesi", sourceType: "purchase-invoice", sourceId: "purchase-invoice-1" };
    purchaseInvoiceListMock.mockResolvedValue([invoice]);
    entityListMock.mockResolvedValue({ ok: true, data: { rows: [{ code: "KASA-0001", name: "MERKEZ KASA", status: "Aktif" }] } });
    cashBankListMock.mockResolvedValue({ ok: true, data: { rows: [movement] } });
    periodFindFirstMock.mockResolvedValue({ isClosed: false });
    invoiceLedgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-purchase-full", documentNo: "YVM-ODM-ODM-AF-001" } } });

    const result = await payPurchaseInvoiceAction("purchase-invoice-1", { code: "KASA-0001", name: "MERKEZ KASA" });

    expect(payMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: { ...movement, ledgerEntryId: "ledger-purchase-full", ledgerDocumentNo: "YVM-ODM-ODM-AF-001" } });
  });
});
