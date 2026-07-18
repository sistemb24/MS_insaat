import { beforeEach, describe, expect, test, vi } from "vitest";

const scope = { tenantId: "tenant-payroll-action", tenantName: "Tenant", companyId: "company-payroll-action", companyName: "Company", periodId: "period-payroll-action", periodLabel: "2026", userId: "accounting", userName: "Accounting", userRole: "accounting" as const, licenseLabel: "Kurumsal" };
const postMock = vi.hoisted(() => vi.fn());
const getScopeMock = vi.hoisted(() => vi.fn());
const ensureMock = vi.hoisted(() => vi.fn());
const revalidateMock = vi.hoisted(() => vi.fn());
const periodFindFirstMock = vi.hoisted(() => vi.fn());
const payrollRepositoryListMock = vi.hoisted(() => vi.fn());
const accountListMock = vi.hoisted(() => vi.fn());
const paymentMovementMock = vi.hoisted(() => vi.fn());
const ledgerPostMock = vi.hoisted(() => vi.fn());
const createServiceMock = vi.hoisted(() => vi.fn(() => ({ post: postMock })));

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { period: { findFirst: periodFindFirstMock } } }));
vi.mock("@/lib/server-active-scope", () => ({ getActiveTenantScope: getScopeMock }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: ensureMock }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({ createAuditLogPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/cash-bank-movement-prisma-repository", () => ({ createCashBankMovementPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/cash-bank-movement-service", () => ({ createCashBankMovementService: vi.fn(() => ({ createPayrollAccrualPayment: paymentMovementMock })) }));
vi.mock("@/lib/entity-crud-service", () => ({ createEntityCrudService: vi.fn(() => ({ list: accountListMock })) }));
vi.mock("@/lib/entity-prisma-repository", () => ({ createEntityPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/ledger-prisma-repository", () => ({ createLedgerPrismaRepository: vi.fn(() => ({ list: vi.fn() })) }));
vi.mock("@/lib/invoice-cash-bank-ledger-posting-service", () => ({ createInvoiceCashBankLedgerPostingService: vi.fn(() => ({ post: ledgerPostMock })) }));
vi.mock("@/lib/payroll-accrual-ledger-posting-prisma-repository", () => ({ createPayrollAccrualLedgerPostingPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/payroll-accrual-ledger-posting-service", () => ({ createPayrollAccrualLedgerPostingService: vi.fn(() => ({})) }));
vi.mock("@/lib/payroll-accrual-prisma-repository", () => ({ createPayrollAccrualPrismaRepository: vi.fn(() => ({ list: payrollRepositoryListMock })) }));
vi.mock("@/lib/payroll-accrual-service", () => ({ createPayrollAccrualService: createServiceMock }));
vi.mock("@/lib/timesheet-prisma-repository", () => ({ createTimesheetPrismaRepository: vi.fn(() => ({})) }));

import { postPayrollAccrualAction } from "./payroll-accrual-actions";

describe("payroll accrual actions", () => {
  beforeEach(() => {
    postMock.mockReset();
    periodFindFirstMock.mockResolvedValue({ isClosed: false });
    payrollRepositoryListMock.mockResolvedValue([{ id: "payroll-accrual-1", documentNo: "MAAS-001" }]);
    accountListMock.mockResolvedValue({ ok: true, data: { rows: [{ code: "KASA-0001", name: "MERKEZ KASA", status: "Aktif" }] } });
    paymentMovementMock.mockReset();
    ledgerPostMock.mockReset();
    getScopeMock.mockResolvedValue(scope);
    ensureMock.mockResolvedValue(undefined);
    revalidateMock.mockReset();
  });

  test("revalidates financial surfaces after a successful payroll posting", async () => {
    postMock.mockResolvedValue({ ok: true, data: { id: "payroll-accrual-1" } });
    await postPayrollAccrualAction("payroll-accrual-1");
    expect(postMock).toHaveBeenCalledWith({ id: "payroll-accrual-1", scope });
    expect(revalidateMock.mock.calls).toEqual([["/"], ["/personel"], ["/raporlar"]]);
  });

  test("does not revalidate when payroll posting is rejected", async () => {
    postMock.mockResolvedValue({ ok: false, errors: ["Kapalı dönemde maaş tahakkuku muhasebe fişi oluşturulamaz."] });
    await postPayrollAccrualAction("payroll-accrual-1");
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  test("posts payroll payment movement ledger and returns its document number", async () => {
    const movement = { id: "movement-payroll-1", movementType: "Maaş Ödemesi" };
    paymentMovementMock.mockResolvedValue({ ok: true, data: movement });
    ledgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "ledger-payroll-1", documentNo: "YVM-ODM-ODM-MAAS-001" } } });

    const { payPayrollAccrualAction } = await import("./payroll-accrual-actions");
    const result = await payPayrollAccrualAction("payroll-accrual-1");

    expect(paymentMovementMock).toHaveBeenCalledWith({
      account: { code: "KASA-0001", name: "MERKEZ KASA" },
      payrollAccrual: { id: "payroll-accrual-1", documentNo: "MAAS-001" },
      scope,
    });
    expect(ledgerPostMock).toHaveBeenCalledWith({ movement, scope: { ...scope, periodClosed: false } });
    expect(result).toEqual({ ok: true, data: { ...movement, ledgerEntryId: "ledger-payroll-1", ledgerDocumentNo: "YVM-ODM-ODM-MAAS-001" } });
  });

  test("does not create payroll payment movement in a closed period", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: true });

    const { payPayrollAccrualAction } = await import("./payroll-accrual-actions");
    const result = await payPayrollAccrualAction("payroll-accrual-1");

    expect(result).toEqual({ ok: false, errors: ["Kapalı veya bulunamayan dönemde maaş ödemesi oluşturulamaz."] });
    expect(paymentMovementMock).not.toHaveBeenCalled();
    expect(ledgerPostMock).not.toHaveBeenCalled();
  });
});
