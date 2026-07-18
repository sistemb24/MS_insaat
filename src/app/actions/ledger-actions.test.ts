import { beforeEach, describe, expect, test, vi } from "vitest";

const scope = {
  tenantId: "tenant-ledger-action",
  tenantName: "Tenant",
  companyId: "company-ledger-action",
  companyName: "Company",
  periodId: "period-ledger-action",
  periodLabel: "2026",
  userId: "accounting",
  userName: "Accounting",
  userRole: "accounting" as const,
  licenseLabel: "Kurumsal",
};

const getScopeMock = vi.hoisted(() => vi.fn());
const ensureMock = vi.hoisted(() => vi.fn());
const periodFindFirstMock = vi.hoisted(() => vi.fn());
const periodUpdateMock = vi.hoisted(() => vi.fn());
const ledgerPostMock = vi.hoisted(() => vi.fn());
const ledgerListMock = vi.hoisted(() => vi.fn());
const auditRecordMock = vi.hoisted(() => vi.fn());
const auditListMock = vi.hoisted(() => vi.fn());
const revalidateMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { period: { findFirst: periodFindFirstMock, update: periodUpdateMock } } }));
vi.mock("@/lib/server-active-scope", () => ({ getActiveTenantScope: getScopeMock }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: ensureMock }));
vi.mock("@/lib/ledger-prisma-repository", () => ({ createLedgerPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: vi.fn(() => ({ record: auditRecordMock, listByEntityType: auditListMock })),
}));
vi.mock("@/lib/ledger-service", () => ({
  createLedgerService: vi.fn(() => ({ post: ledgerPostMock, list: ledgerListMock })),
}));

import {
  closeLedgerPeriodAction,
  getLedgerPeriodStatusAction,
  postLedgerJournalAction,
  reopenLedgerPeriodAction,
} from "./ledger-actions";

describe("ledger period actions", () => {
  beforeEach(() => {
    getScopeMock.mockResolvedValue(scope);
    ensureMock.mockResolvedValue(undefined);
    periodFindFirstMock.mockReset();
    periodFindFirstMock.mockResolvedValue({ isClosed: false, label: "2026" });
    periodUpdateMock.mockReset();
    periodUpdateMock.mockResolvedValue({});
    ledgerPostMock.mockReset();
    ledgerListMock.mockReset();
    auditRecordMock.mockReset();
    auditListMock.mockReset();
    revalidateMock.mockReset();
  });

  test("reads period status within the active tenant and company scope", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: true });

    await expect(getLedgerPeriodStatusAction()).resolves.toEqual({ isClosed: true });

    expect(periodFindFirstMock).toHaveBeenCalledWith({
      select: { isClosed: true },
      where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId },
    });
  });

  test("passes scoped period state to journal posting", async () => {
    periodFindFirstMock.mockResolvedValue({ isClosed: true });
    ledgerPostMock.mockResolvedValue({ ok: true, data: { ledgerEntry: { id: "entry-1" } } });

    const result = await postLedgerJournalAction({ lines: [] } as never);

    expect(ledgerPostMock).toHaveBeenCalledWith({ draft: { lines: [] }, scope: { ...scope, periodClosed: true } });
    expect(result).toEqual({ ok: true, data: { ledgerEntry: { id: "entry-1" } } });
    expect(revalidateMock.mock.calls).toEqual([["/ayarlar"], ["/[module]", "page"]]);
  });

  test("rejects period close for non-admin users before reading or updating the period", async () => {
    const result = await closeLedgerPeriodAction();

    expect(result).toEqual({ ok: false, errors: ["Dönem kapatma yetkisi yalnızca admin rolündedir."] });
    expect(periodFindFirstMock).not.toHaveBeenCalled();
    expect(periodUpdateMock).not.toHaveBeenCalled();
  });

  test("closes an open period with a scoped read and audit record", async () => {
    getScopeMock.mockResolvedValue({ ...scope, userRole: "admin" });
    periodFindFirstMock.mockResolvedValue({ isClosed: false, label: "2026/07" });

    const result = await closeLedgerPeriodAction();

    expect(periodFindFirstMock).toHaveBeenCalledWith({
      select: { isClosed: true, label: true },
      where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId },
    });
    expect(periodUpdateMock).toHaveBeenCalledWith({ where: { id: scope.periodId }, data: { isClosed: true } });
    expect(auditRecordMock).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      periodId: scope.periodId,
      action: "ledger.period.close",
      entityLabel: "2026/07",
      metadata: { statusFrom: "open", statusTo: "closed" },
    }));
    expect(revalidateMock).toHaveBeenCalledWith("/ayarlar");
    expect(result).toEqual({ ok: true });
  });

  test("reopens a closed period with a scoped read and audit record", async () => {
    getScopeMock.mockResolvedValue({ ...scope, userRole: "admin" });
    periodFindFirstMock.mockResolvedValue({ isClosed: true, label: "2026/07" });

    const result = await reopenLedgerPeriodAction();

    expect(periodFindFirstMock).toHaveBeenCalledWith({
      select: { isClosed: true, label: true },
      where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId },
    });
    expect(periodUpdateMock).toHaveBeenCalledWith({ where: { id: scope.periodId }, data: { isClosed: false } });
    expect(auditRecordMock).toHaveBeenCalledWith(expect.objectContaining({
      action: "ledger.period.reopen",
      entityLabel: "2026/07",
      metadata: { statusFrom: "closed", statusTo: "open" },
    }));
    expect(revalidateMock).toHaveBeenCalledWith("/ayarlar");
    expect(result).toEqual({ ok: true });
  });
});
