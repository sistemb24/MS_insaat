import { beforeEach, describe, expect, test, vi } from "vitest";

const scope = {
  tenantId: "tenant-cash-action",
  tenantName: "Tenant",
  companyId: "company-cash-action",
  companyName: "Company",
  periodId: "period-cash-action",
  periodLabel: "2026",
  userId: "accounting",
  userName: "Accounting",
  userRole: "accounting" as const,
  licenseLabel: "Kurumsal",
};
const getScopeMock = vi.hoisted(() => vi.fn());
const ensureMock = vi.hoisted(() => vi.fn());
const periodFindFirstMock = vi.hoisted(() => vi.fn());
const createTransferMock = vi.hoisted(() => vi.fn());
const createManualMock = vi.hoisted(() => vi.fn());
const entityListMock = vi.hoisted(() => vi.fn());
const ledgerPostMock = vi.hoisted(() => vi.fn());
const manualLedgerPostMock = vi.hoisted(() => vi.fn());
const counterpartyLedgerPostMock = vi.hoisted(() => vi.fn());
const revalidateMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { period: { findFirst: periodFindFirstMock } } }));
vi.mock("@/lib/server-active-scope", () => ({ getActiveTenantScope: getScopeMock }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: ensureMock }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({ createAuditLogPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/cash-bank-movement-prisma-repository", () => ({ createCashBankMovementPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/cash-bank-movement-service", () => ({ createCashBankMovementService: vi.fn(() => ({ createManual: createManualMock, createTransfer: createTransferMock })) }));
vi.mock("@/lib/cash-bank-transfer-ledger-posting-service", () => ({ createCashBankTransferLedgerPostingService: vi.fn(() => ({ post: ledgerPostMock })) }));
vi.mock("@/lib/manual-cash-bank-ledger-posting-service", () => ({
  createManualCashBankLedgerPostingService: vi.fn(() => ({ post: manualLedgerPostMock })),
  manualCashBankCounterAccounts: {
    Tahsilat: [{ code: "120", name: "Alıcılar" }, { code: "649", name: "Diğer Olağan Gelir ve Kârlar" }],
    Ödeme: [{ code: "320", name: "Satıcılar" }, { code: "770", name: "Genel Yönetim Giderleri" }],
  },
}));
vi.mock("@/lib/invoice-cash-bank-ledger-posting-service", () => ({ createInvoiceCashBankLedgerPostingService: vi.fn(() => ({ post: counterpartyLedgerPostMock })) }));
vi.mock("@/lib/entity-crud-service", () => ({ createEntityCrudService: vi.fn(() => ({ list: entityListMock })) }));
vi.mock("@/lib/entity-prisma-repository", () => ({ createEntityPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/ledger-prisma-repository", () => ({ createLedgerPrismaRepository: vi.fn(() => ({})) }));

import {
  createCashBankMovementAction,
  createCashBankTransferAction,
  createCounterpartyCashBankMovementAction,
} from "./cash-bank-actions";

describe("cash bank actions", () => {
  beforeEach(() => {
    getScopeMock.mockResolvedValue(scope);
    ensureMock.mockResolvedValue(undefined);
    periodFindFirstMock.mockResolvedValue({ isClosed: false });
    createTransferMock.mockReset();
    createManualMock.mockReset();
    entityListMock.mockReset();
    ledgerPostMock.mockReset();
    manualLedgerPostMock.mockReset();
    counterpartyLedgerPostMock.mockReset();
    revalidateMock.mockReset();
  });

  test("posts transfer ledger and returns its document number on both movements", async () => {
    const rows = [
      { id: "movement-out", direction: "Çıkış", documentNo: "VRM-0001" },
      { id: "movement-in", direction: "Giriş", documentNo: "VRM-0001" },
    ];
    createTransferMock.mockResolvedValue({ ok: true, data: { rows } });
    ledgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-transfer-1", documentNo: "YVM-VRM-VRM-0001" } } });

    const result = await createCashBankTransferAction({ documentNo: "VRM-0001" } as never);

    expect(ledgerPostMock).toHaveBeenCalledWith({ movements: rows, scope: { ...scope, periodClosed: false } });
    expect(result).toEqual({ ok: true, data: { rows: [
      { id: "movement-out", direction: "Çıkış", documentNo: "VRM-0001", ledgerEntryId: "ledger-transfer-1", ledgerDocumentNo: "YVM-VRM-VRM-0001" },
      { id: "movement-in", direction: "Giriş", documentNo: "VRM-0001", ledgerEntryId: "ledger-transfer-1", ledgerDocumentNo: "YVM-VRM-VRM-0001" },
    ] } });
    expect(revalidateMock.mock.calls).toEqual([["/kasa-banka"], ["/"], ["/raporlar"]]);
  });

  test("does not create transfer in a closed period", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: true });

    const result = await createCashBankTransferAction({ documentNo: "VRM-0001" } as never);

    expect(result).toEqual({ ok: false, errors: ["Kapalı veya bulunamayan dönemde kasa/banka virmanı oluşturulamaz."] });
    expect(createTransferMock).not.toHaveBeenCalled();
    expect(ledgerPostMock).not.toHaveBeenCalled();
  });

  test("does not create a manual movement in a closed period", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: true });

    const result = await createCashBankMovementAction({
      counterAccountCode: "120",
      documentNo: "MAN-0001",
      movementType: "Tahsilat",
    } as never);

    expect(result).toEqual({ ok: false, errors: ["Kapalı veya bulunamayan dönemde kasa/banka hareketi oluşturulamaz."] });
    expect(createManualMock).not.toHaveBeenCalled();
  });

  test("posts a manual movement ledger with the selected counter account", async () => {
    const movement = {
      id: "manual-movement-1",
      documentNo: "MAN-0001",
      movementType: "Tahsilat",
    };
    createManualMock.mockResolvedValue({ ok: true, data: movement });
    manualLedgerPostMock.mockResolvedValue({
      ok: true,
      data: {
        ledgerEntry: {
          id: "ledger-manual-1",
          documentNo: "YVM-THS-MAN-MAN-0001",
        },
      },
    });

    const result = await createCashBankMovementAction({
      counterAccountCode: "649",
      documentNo: "MAN-0001",
      movementType: "Tahsilat",
    } as never);

    expect(manualLedgerPostMock).toHaveBeenCalledWith({
      counterAccount: { code: "649", name: "Diğer Olağan Gelir ve Kârlar" },
      movement,
      scope: { ...scope, periodClosed: false },
    });
    expect(result).toEqual({
      ok: true,
      data: {
        ...movement,
        ledgerEntryId: "ledger-manual-1",
        ledgerDocumentNo: "YVM-THS-MAN-MAN-0001",
      },
    });
    expect(revalidateMock.mock.calls).toEqual([
      ["/kasa-banka"],
      ["/"],
      ["/raporlar"],
    ]);
  });

  test("does not create a counterparty movement in a closed period", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: true });

    const result = await createCounterpartyCashBankMovementAction({
      accountCode: "KASA-0001",
      amount: 100,
      counterpartyCode: "MUS-0001",
      counterpartySlug: "musteriler",
      documentNo: "CAR-0001",
      movementDate: "2026-07-15",
      movementType: "Tahsilat",
    } as never);

    expect(result).toEqual({ ok: false, errors: ["Kapalı veya bulunamayan dönemde kasa/banka hareketi oluşturulamaz."] });
    expect(createManualMock).not.toHaveBeenCalled();
  });

  test("posts a counterparty collection ledger and preserves its source metadata", async () => {
    entityListMock.mockImplementation(({ slug }: { slug: string }) => slug === "kasa-banka"
      ? { ok: true, data: { rows: [{ code: "KASA-0001", name: "MERKEZ KASA", status: "Aktif" }] } }
      : { ok: true, data: { rows: [{ code: "MUS-0001", name: "ABC Beton A.Ş.", status: "Aktif" }] } });
    const movement = {
      id: "movement-counterparty-1",
      sourceType: "counterparty-musteriler",
      sourceId: "musteriler-mus-0001-car-0001",
      sourceLabel: "musteriler:MUS-0001",
      documentNo: "CAR-0001",
      movementType: "Tahsilat",
    };
    createManualMock.mockResolvedValue({ ok: true, data: movement });
    counterpartyLedgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-cari-1", documentNo: "YVM-THS-CARI-CAR-0001" } } });

    const result = await createCounterpartyCashBankMovementAction({
      accountCode: "KASA-0001",
      amount: 100,
      counterpartyCode: "MUS-0001",
      counterpartySlug: "musteriler",
      documentNo: "CAR-0001",
      movementDate: "2026-07-15",
      movementType: "Tahsilat",
    } as never);

    expect(createManualMock).toHaveBeenCalledWith({
      scope,
      values: expect.objectContaining({
        sourceId: "musteriler-MUS-0001-CAR-0001",
        sourceLabel: "musteriler:MUS-0001",
        sourceType: "counterparty-musteriler",
      }),
    });
    expect(counterpartyLedgerPostMock).toHaveBeenCalledWith({ movement, scope: { ...scope, periodClosed: false } });
    expect(result).toEqual({ ok: true, data: { ...movement, ledgerEntryId: "ledger-cari-1", ledgerDocumentNo: "YVM-THS-CARI-CAR-0001" } });
    expect(revalidateMock.mock.calls).toEqual([["/kasa-banka"], ["/musteriler"], ["/raporlar"]]);
  });
});
