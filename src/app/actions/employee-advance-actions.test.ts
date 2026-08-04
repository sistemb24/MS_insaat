import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const auditRecord = vi.fn();
  const ensureScope = vi.fn();
  const entityList = vi.fn();
  const revalidatePath = vi.fn();
  const sessionState = vi.fn();
  const repository = {
    create: vi.fn(async (row) => row),
    findByCreateKey: vi.fn(),
    findById: vi.fn(),
    findSettlementByKey: vi.fn(),
    list: vi.fn(async () => ({ advances: [], settlements: [] })),
    listPayrollDeductions: vi.fn(async () => []),
    pay: vi.fn(async ({ row }) => ({
      ...row,
      paymentLedgerEntryId: "ledger-1",
      paymentMovementId: "movement-1",
    })),
    settle: vi.fn(async ({ row, settlement }) => ({
      advance: row,
      settlement,
    })),
    transition: vi.fn(async ({ row }) => row),
    updateDraft: vi.fn(async ({ row }) => row),
  };
  return {
    auditRecord,
    ensureScope,
    entityList,
    prisma: {},
    repository,
    revalidatePath,
    sessionState,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({
  ensureTenantScope: mocks.ensureScope,
}));
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
vi.mock("@/lib/employee-advance-prisma-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/employee-advance-prisma-repository")
  >("@/lib/employee-advance-prisma-repository");
  return {
    ...actual,
    createEmployeeAdvancePrismaRepository: () => mocks.repository,
  };
});

import {
  createEmployeeAdvanceAction,
  listEmployeeAdvancesAction,
  managerApproveEmployeeAdvanceAction,
  payEmployeeAdvanceAction,
} from "./employee-advance-actions";

const activeScope = {
  companyId: "company-advance",
  companyName: "Şirket",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-advance",
  periodLabel: "2026",
  tenantId: "tenant-advance",
  tenantName: "Tenant",
  userId: "admin-advance",
  userName: "İK Yöneticisi",
  userRole: "admin" as const,
};
const values = {
  note: "Audit dışı özel açıklama",
  personnelCode: "PER-0001",
  personnelName: "Ayşe Demir",
  requestDate: "2026-08-01",
  requestedAmount: 7500,
  requestKey: "create-1",
};

describe("employee advance actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionState.mockResolvedValue({ scope: activeScope });
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.auditRecord.mockResolvedValue(undefined);
    mocks.entityList.mockImplementation(async ({ slug }: { slug: string }) => ({
      data: {
        rows: slug === "personel"
          ? [{ code: "PER-0001", name: "Ayşe Demir", status: "Aktif" }]
          : [{ code: "KASA-0001", name: "Merkez Kasa", status: "Aktif" }],
      },
      ok: true,
    }));
    mocks.repository.findByCreateKey.mockResolvedValue(null);
    mocks.repository.findById.mockResolvedValue(null);
    mocks.repository.findSettlementByKey.mockResolvedValue(null);
  });

  test("re-resolves scope and creates a personnel-validated draft", async () => {
    const result = await createEmployeeAdvanceAction(values);
    expect(result.ok).toBe(true);
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
    expect(mocks.entityList).toHaveBeenCalledWith({
      scope: activeScope,
      slug: "personel",
    });
    expect(JSON.stringify(mocks.auditRecord.mock.calls[0]?.[0]))
      .not.toContain("Audit dışı");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/personel");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[module]", "page");
  });

  test("rejects unknown personnel before repository mutation", async () => {
    mocks.entityList.mockResolvedValue({ data: { rows: [] }, ok: true });
    const result = await createEmployeeAdvanceAction(values);
    expect(result).toEqual({
      errors: ["Aktif personel kaydı bulunamadı."],
      ok: false,
    });
    expect(mocks.repository.create).not.toHaveBeenCalled();
  });

  test("rejects accounting manager approval before repository read", async () => {
    mocks.sessionState.mockResolvedValue({
      scope: {
        ...activeScope,
        userId: "accounting-1",
        userRole: "accounting" as const,
      },
    });
    const result = await managerApproveEmployeeAdvanceAction({
      advanceId: "advance-1",
      requestKey: "manager-1",
    });
    expect(result.ok).toBe(false);
    expect(mocks.repository.findById).not.toHaveBeenCalled();
  });

  test("rejects an inactive payment account before financial commit", async () => {
    mocks.sessionState.mockResolvedValue({
      scope: {
        ...activeScope,
        userId: "accounting-1",
        userRole: "accounting" as const,
      },
    });
    const result = await payEmployeeAdvanceAction({
      account: { code: "BANK-X", name: "Yabancı" },
      advanceId: "advance-1",
      expectedRevisionNo: 4,
      paymentDate: "2026-08-02",
      requestKey: "pay-1",
    });
    expect(result.ok).toBe(false);
    expect(mocks.repository.pay).not.toHaveBeenCalled();
  });

  test("lists only after active session scope bootstrap", async () => {
    const result = await listEmployeeAdvancesAction();
    expect(result).toEqual({
      data: { advances: [], settlements: [] },
      ok: true,
    });
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
  });
});
