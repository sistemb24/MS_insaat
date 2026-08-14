import { beforeEach, describe, expect, test, vi } from "vitest";

const scope = { tenantId: "tenant-payroll-action", tenantName: "Tenant", companyId: "company-payroll-action", companyName: "Company", periodId: "period-payroll-action", periodLabel: "2026", userId: "accounting", userName: "Accounting", userRole: "accounting" as const, licenseLabel: "Kurumsal" };
const postMock = vi.hoisted(() => vi.fn());
const getScopeMock = vi.hoisted(() => vi.fn());
const ensureMock = vi.hoisted(() => vi.fn());
const revalidateMock = vi.hoisted(() => vi.fn());
const payrollRepositoryListMock = vi.hoisted(() => vi.fn());
const accountListMock = vi.hoisted(() => vi.fn());
const paymentPostMock = vi.hoisted(() => vi.fn());
const reverseMock = vi.hoisted(() => vi.fn());
const createServiceMock = vi.hoisted(() => vi.fn(() => ({ post: postMock })));

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server-active-scope", () => ({ getActiveTenantScope: getScopeMock }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: ensureMock }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({ createAuditLogPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/entity-crud-service", () => ({ createEntityCrudService: vi.fn(() => ({ list: accountListMock })) }));
vi.mock("@/lib/entity-prisma-repository", () => ({ createEntityPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/ledger-prisma-repository", () => ({ createLedgerPrismaRepository: vi.fn(() => ({ list: vi.fn() })) }));
vi.mock("@/lib/payroll-accrual-ledger-posting-prisma-repository", () => ({ createPayrollAccrualLedgerPostingPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/payroll-accrual-ledger-posting-service", () => ({ createPayrollAccrualLedgerPostingService: vi.fn(() => ({})) }));
vi.mock("@/lib/payroll-payment-posting-prisma-repository", () => ({ createPayrollPaymentPostingPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/payroll-payment-posting-service", () => ({ createPayrollPaymentPostingService: vi.fn(() => ({ post: paymentPostMock })) }));
vi.mock("@/lib/payroll-accrual-reversal-prisma-repository", () => ({ createPayrollAccrualReversalPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/payroll-accrual-reversal-service", () => ({ createPayrollAccrualReversalService: vi.fn(() => ({ reverse: reverseMock })) }));
vi.mock("@/lib/payroll-accrual-prisma-repository", () => ({ createPayrollAccrualPrismaRepository: vi.fn(() => ({ list: payrollRepositoryListMock })) }));
vi.mock("@/lib/payroll-accrual-service", () => ({ createPayrollAccrualService: createServiceMock }));
vi.mock("@/lib/timesheet-prisma-repository", () => ({ createTimesheetPrismaRepository: vi.fn(() => ({})) }));

import { postPayrollAccrualAction } from "./payroll-accrual-actions";

describe("payroll accrual actions", () => {
  beforeEach(() => {
    postMock.mockReset();
    payrollRepositoryListMock.mockResolvedValue([{ id: "payroll-accrual-1", documentNo: "MAAS-001" }]);
    accountListMock.mockResolvedValue({ ok: true, data: { rows: [{ code: "KASA-0001", name: "MERKEZ KASA", status: "Aktif" }] } });
    paymentPostMock.mockReset();
    reverseMock.mockReset();
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
    const movement = { id: "movement-payroll-1", movementType: "Maaş Ödemesi", ledgerEntryId: "ledger-payroll-1", ledgerDocumentNo: "YVM-ODM-ODM-MAAS-001" };
    paymentPostMock.mockResolvedValue({ ok: true, data: { created: true, movement, ledgerEntry: { id: "ledger-payroll-1", documentNo: "YVM-ODM-ODM-MAAS-001" } } });

    const { payPayrollAccrualAction } = await import("./payroll-accrual-actions");
    const result = await payPayrollAccrualAction("payroll-accrual-1");

    expect(paymentPostMock).toHaveBeenCalledWith({
      account: { code: "KASA-0001", name: "MERKEZ KASA" },
      payrollAccrual: { id: "payroll-accrual-1", documentNo: "MAAS-001" },
      scope,
    });
    expect(result).toEqual({ ok: true, data: movement });
  });

  test("does not revalidate when atomic payroll payment is rejected", async () => {
    paymentPostMock.mockResolvedValue({ ok: false, errors: ["Kapalı veya bulunamayan dönemde maaş ödemesi oluşturulamaz."], reasonCode: "persistence-failed" });

    const { payPayrollAccrualAction } = await import("./payroll-accrual-actions");
    const result = await payPayrollAccrualAction("payroll-accrual-1");

    expect(result).toEqual({ ok: false, errors: ["Kapalı veya bulunamayan dönemde maaş ödemesi oluşturulamaz."] });
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  test("reverses a posted payroll chain and revalidates financial surfaces", async () => {
    const adminScope = { ...scope, userRole: "admin" as const };
    getScopeMock.mockResolvedValue(adminScope);
    reverseMock.mockResolvedValue({
      ok: true,
      data: {
        created: true,
        payrollAccrual: { id: "payroll-accrual-1", status: "İptal" },
        reversal: {},
      },
    });

    const { reversePayrollAccrualAction } = await import("./payroll-accrual-actions");
    const result = await reversePayrollAccrualAction("payroll-accrual-1");

    expect(reverseMock).toHaveBeenCalledWith({
      payrollAccrualId: "payroll-accrual-1",
      scope: adminScope,
    });
    expect(result).toEqual({
      ok: true,
      data: { id: "payroll-accrual-1", status: "İptal" },
    });
    expect(revalidateMock.mock.calls).toEqual([
      ["/"],
      ["/kasa-banka"],
      ["/personel"],
      ["/raporlar"],
    ]);
  });

  test("does not revalidate when payroll reversal is rejected", async () => {
    reverseMock.mockResolvedValue({
      ok: false,
      errors: ["Maaş tahakkuku ters kaydı yalnız yönetici tarafından oluşturulabilir."],
      reasonCode: "permission-denied",
    });

    const { reversePayrollAccrualAction } = await import("./payroll-accrual-actions");
    const result = await reversePayrollAccrualAction("payroll-accrual-1");

    expect(result.ok).toBe(false);
    expect(revalidateMock).not.toHaveBeenCalled();
  });
});
