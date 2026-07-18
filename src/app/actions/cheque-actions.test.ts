import { beforeEach, describe, expect, test, vi } from "vitest";

const scope = {
  tenantId: "tenant-cheque-action",
  tenantName: "Tenant",
  companyId: "company-cheque-action",
  companyName: "Company",
  periodId: "period-cheque-action",
  periodLabel: "2026",
  userId: "accounting",
  userName: "Accounting",
  userRole: "accounting" as const,
  licenseLabel: "Kurumsal",
};
const collectMock = vi.hoisted(() => vi.fn());
const getContextMock = vi.hoisted(() => vi.fn());
const periodFindFirstMock = vi.hoisted(() => vi.fn());
const movementListMock = vi.hoisted(() => vi.fn());
const ledgerPostMock = vi.hoisted(() => vi.fn());
const revalidateMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { period: { findFirst: periodFindFirstMock } } }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({ createAuditLogPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/cash-bank-movement-prisma-repository", () => ({ createCashBankMovementPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/cash-bank-movement-service", () => ({ createCashBankMovementService: vi.fn(() => ({ list: movementListMock })) }));
vi.mock("@/lib/cheque-prisma-repository", () => ({ createChequePrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/cheque-service", () => ({ createChequeService: vi.fn(() => ({ collect: collectMock })) }));
vi.mock("@/lib/invoice-cash-bank-ledger-posting-service", () => ({ createInvoiceCashBankLedgerPostingService: vi.fn(() => ({ post: ledgerPostMock })) }));
vi.mock("@/lib/ledger-prisma-repository", () => ({ createLedgerPrismaRepository: vi.fn(() => ({})) }));
vi.mock("./subscription-feature-action-guard", () => ({ getSubscriptionFeatureActionContext: getContextMock }));

import { collectChequeAction } from "./cheque-actions";

describe("cheque actions", () => {
  beforeEach(() => {
    collectMock.mockReset();
    getContextMock.mockResolvedValue({ ok: true, scope });
    periodFindFirstMock.mockResolvedValue({ isClosed: false });
    movementListMock.mockResolvedValue({
      ok: true,
      data: {
        rows: [{
          id: "movement-cheque-1",
          sourceType: "cheque",
          sourceId: "cheque-1",
          movementType: "Çek Tahsilatı",
          documentNo: "CEK-0001",
          amount: 125000,
        }],
      },
    });
    ledgerPostMock.mockReset();
    revalidateMock.mockReset();
  });

  test("posts the cheque collection ledger and revalidates financial surfaces", async () => {
    const cheque = { id: "cheque-1", status: "Tahsil Edildi" };
    const movement = (await movementListMock()).data.rows[0];
    collectMock.mockResolvedValue({ ok: true, data: cheque });
    ledgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-cheque-1", documentNo: "YVM-THS-CEK-0001" } } });

    const result = await collectChequeAction("cheque-1", { code: "KASA-0001", name: "MERKEZ KASA" });

    expect(collectMock).toHaveBeenCalledWith({
      collectionAccount: { code: "KASA-0001", name: "MERKEZ KASA" },
      id: "cheque-1",
      scope,
    });
    expect(ledgerPostMock).toHaveBeenCalledWith({ movement, scope: { ...scope, periodClosed: false } });
    expect(result).toEqual({ ok: true, data: { ...cheque, ledgerDocumentNo: "YVM-THS-CEK-0001" } });
    expect(revalidateMock.mock.calls).toEqual([["/cek"], ["/kasa-banka"], ["/"], ["/raporlar"]]);
  });

  test("does not collect a cheque in a closed period", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: true });

    const result = await collectChequeAction("cheque-1");

    expect(result).toEqual({ ok: false, errors: ["Kapalı veya bulunamayan dönemde çek tahsilatı oluşturulamaz."] });
    expect(collectMock).not.toHaveBeenCalled();
    expect(ledgerPostMock).not.toHaveBeenCalled();
  });
});
