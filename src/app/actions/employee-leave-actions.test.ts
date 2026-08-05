import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const auditRecord = vi.fn();
  const ensureScope = vi.fn();
  const entityList = vi.fn();
  const documentFindFirst = vi.fn();
  const revalidatePath = vi.fn();
  const sessionState = vi.fn();
  const repository = {
    createLeave: vi.fn(async (row) => row),
    findBalance: vi.fn(),
    findLeaveByCreateKey: vi.fn(),
    findLeaveById: vi.fn(),
    listBalances: vi.fn(),
    listLeaves: vi.fn(),
    listPersonnelLeaves: vi.fn(),
    saveBalance: vi.fn(async ({ row }) => row),
    transition: vi.fn(async ({ balance, row }) => ({
      ...(balance ? { balance: balance.row } : {}),
      leave: row,
    })),
    updateDraft: vi.fn(async ({ row }) => row),
  };
  return {
    auditRecord,
    documentFindFirst,
    ensureScope,
    entityList,
    prisma: { documentFile: { findFirst: documentFindFirst } },
    repository,
    revalidatePath,
    sessionState,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: mocks.ensureScope }));
vi.mock("@/lib/server-active-scope", () => ({
  requireActiveSessionState: mocks.sessionState,
}));
vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: () => ({ record: mocks.auditRecord }),
}));
vi.mock("@/lib/entity-crud-service", () => ({
  createEntityCrudService: () => ({ list: mocks.entityList }),
}));
vi.mock("@/lib/entity-prisma-repository", () => ({
  createEntityPrismaRepository: vi.fn(),
}));
vi.mock("@/lib/employee-leave-prisma-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/employee-leave-prisma-repository")
  >("@/lib/employee-leave-prisma-repository");
  return {
    ...actual,
    createEmployeeLeavePrismaRepository: () => mocks.repository,
  };
});

import {
  approveEmployeeLeaveAction,
  createEmployeeLeaveAction,
  listEmployeeLeavesAction,
  saveEmployeeLeaveBalanceAction,
} from "./employee-leave-actions";

const activeScope = {
  companyId: "company-leave",
  companyName: "Şirket",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-leave",
  periodLabel: "2026",
  tenantId: "tenant-leave",
  tenantName: "Tenant",
  userId: "admin-leave",
  userName: "İK Yöneticisi",
  userRole: "admin" as const,
};
const values = {
  chargeableDays: 2,
  documentFileId: null,
  endDate: "2026-08-11",
  leaveType: "ANNUAL" as const,
  note: "Audit dışı izin açıklaması",
  personnelCode: "PER-0001",
  personnelName: "Ayşe Demir",
  requestKey: "create-1",
  startDate: "2026-08-10",
};

describe("employee leave actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionState.mockResolvedValue({ scope: activeScope });
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.auditRecord.mockResolvedValue(undefined);
    mocks.entityList.mockResolvedValue({
      data: { rows: [{ code: "PER-0001", name: "Ayşe Demir", status: "Aktif" }] },
      ok: true,
    });
    mocks.repository.findBalance.mockResolvedValue(null);
    mocks.repository.findLeaveByCreateKey.mockResolvedValue(null);
    mocks.repository.findLeaveById.mockResolvedValue(null);
    mocks.repository.listBalances.mockResolvedValue([]);
    mocks.repository.listLeaves.mockResolvedValue([]);
    mocks.repository.listPersonnelLeaves.mockResolvedValue([]);
  });

  test("re-resolves scope and creates a personnel-validated draft", async () => {
    const result = await createEmployeeLeaveAction(values);
    expect(result.ok).toBe(true);
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
    expect(mocks.entityList).toHaveBeenCalledWith({ scope: activeScope, slug: "personel" });
    expect(JSON.stringify(mocks.auditRecord.mock.calls[0]?.[0])).not.toContain("Audit dışı");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/personel");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[module]", "page");
  });

  test("rejects a foreign document before repository mutation", async () => {
    mocks.documentFindFirst.mockResolvedValue(null);
    const result = await createEmployeeLeaveAction({
      ...values,
      documentFileId: "foreign-document",
    });
    expect(result).toEqual({
      errors: ["İzin belgesi aktif kapsamda bulunamadı."],
      ok: false,
    });
    expect(mocks.repository.createLeave).not.toHaveBeenCalled();
  });

  test("rejects unknown personnel before balance mutation", async () => {
    mocks.entityList.mockResolvedValue({ data: { rows: [] }, ok: true });
    const result = await saveEmployeeLeaveBalanceAction({
      adjustmentDays: 0,
      openingDays: 14,
      personnelCode: "PER-X",
      personnelName: "Yabancı",
      requestKey: "balance-1",
      year: 2026,
    });
    expect(result.ok).toBe(false);
    expect(mocks.repository.saveBalance).not.toHaveBeenCalled();
  });

  test("rejects viewer approval before repository read", async () => {
    mocks.sessionState.mockResolvedValue({
      scope: { ...activeScope, userId: "viewer-1", userRole: "viewer" as const },
    });
    const result = await approveEmployeeLeaveAction({
      leaveId: "leave-1",
      requestKey: "approve-1",
    });
    expect(result).toEqual({
      errors: ["Bu personel izin işlemini yalnız yönetici yapabilir."],
      ok: false,
    });
    expect(mocks.repository.findLeaveById).not.toHaveBeenCalled();
  });

  test("lists only after active session scope bootstrap", async () => {
    const result = await listEmployeeLeavesAction();
    expect(result).toEqual({ data: { balances: [], leaves: [] }, ok: true });
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
  });
});
