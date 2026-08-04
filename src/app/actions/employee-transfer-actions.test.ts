import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const auditRecord = vi.fn();
  const ensureScope = vi.fn();
  const entityList = vi.fn();
  const revalidatePath = vi.fn();
  const sessionState = vi.fn();
  const repository = {
    approve: vi.fn(async ({ row }) => ({
      personnel: {
        code: row.personnelCode,
        site: row.targetSiteName,
        updatedAt: row.updatedAt,
      },
      transfer: row,
    })),
    create: vi.fn(async (row) => row),
    findByCreateKey: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(async () => []),
    listPersonnelTransfers: vi.fn(async () => []),
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
vi.mock("@/lib/employee-transfer-prisma-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/employee-transfer-prisma-repository")
  >("@/lib/employee-transfer-prisma-repository");
  return {
    ...actual,
    createEmployeeTransferPrismaRepository: () => mocks.repository,
  };
});

import {
  approveEmployeeTransferAction,
  createEmployeeTransferAction,
  listEmployeeTransfersAction,
  submitEmployeeTransferAction,
} from "./employee-transfer-actions";

const activeScope = {
  companyId: "company-transfer",
  companyName: "Şirket",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-transfer",
  periodLabel: "2026",
  tenantId: "tenant-transfer",
  tenantName: "Tenant",
  userId: "admin-transfer",
  userName: "İK Yöneticisi",
  userRole: "admin" as const,
};
const values = {
  effectiveDate: "2026-07-30",
  note: "Audit dışı operasyon notu",
  personnelCode: "PER-0003",
  personnelName: "Hasan Çelik",
  requestKey: "create-1",
  sourceSiteCode: "SAN-0001",
  sourceSiteName: "Antalya Konyaaltı 120 Konut Projesi",
  targetSiteCode: "SAN-0002",
  targetSiteName: "İstanbul Kartal İş Merkezi İnşaatı",
};
const personnelUpdatedAt = "2026-07-30T09:00:00.000Z";

function transfer(status: "DRAFT" | "SUBMITTED" = "DRAFT") {
  return {
    approveRequestKey: null,
    approvedAt: null,
    companyId: activeScope.companyId,
    createRequestKey: "admin-transfer::create-1",
    createdAt: "2026-07-30T08:00:00.000Z",
    createdBy: activeScope.userId,
    effectiveDate: values.effectiveDate,
    id: "transfer-1",
    lastUpdateKey: null,
    note: values.note,
    periodId: activeScope.periodId,
    personnelCode: values.personnelCode,
    personnelName: values.personnelName,
    rejectRequestKey: null,
    rejectedAt: null,
    revisionNo: status === "DRAFT" ? 1 : 2,
    sourceSiteCode: values.sourceSiteCode,
    sourceSiteName: values.sourceSiteName,
    status,
    submitRequestKey: status === "SUBMITTED"
      ? "transfer-1::admin-transfer::submit::submit-1"
      : null,
    submittedAt: status === "SUBMITTED" ? "2026-07-30T09:30:00.000Z" : null,
    targetSiteCode: values.targetSiteCode,
    targetSiteName: values.targetSiteName,
    tenantId: activeScope.tenantId,
    updatedAt: "2026-07-30T09:30:00.000Z",
    updatedBy: activeScope.userId,
  };
}

describe("employee transfer actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionState.mockResolvedValue({ scope: activeScope });
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.auditRecord.mockResolvedValue(undefined);
    mocks.entityList.mockImplementation(async ({ slug }: { slug: string }) => ({
      data: {
        rows: slug === "personel"
          ? [{
              code: values.personnelCode,
              name: values.personnelName,
              site: values.sourceSiteName,
              status: "Aktif",
              updatedAt: personnelUpdatedAt,
            }]
          : [
              {
                code: values.sourceSiteCode,
                name: values.sourceSiteName,
                status: "Aktif",
              },
              {
                code: values.targetSiteCode,
                name: values.targetSiteName,
                status: "Aktif",
              },
            ],
      },
      ok: true,
    }));
    mocks.repository.findByCreateKey.mockResolvedValue(null);
    mocks.repository.findById.mockResolvedValue(null);
    mocks.repository.list.mockResolvedValue([]);
    mocks.repository.listPersonnelTransfers.mockResolvedValue([]);
  });

  test("re-resolves scope and creates a fully reference-validated draft", async () => {
    const result = await createEmployeeTransferAction(values);
    expect(result.ok).toBe(true);
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
    expect(mocks.entityList).toHaveBeenCalledWith({
      scope: activeScope,
      slug: "personel",
    });
    expect(mocks.entityList).toHaveBeenCalledWith({
      scope: activeScope,
      slug: "santiyeler",
    });
    expect(JSON.stringify(mocks.auditRecord.mock.calls[0]?.[0]))
      .not.toContain("Audit dışı");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/personel");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[module]", "page");
  });

  test("rejects an inactive or foreign target before repository mutation", async () => {
    mocks.entityList.mockImplementation(async ({ slug }: { slug: string }) => ({
      data: {
        rows: slug === "personel"
          ? [{
              code: values.personnelCode,
              name: values.personnelName,
              site: values.sourceSiteName,
              status: "Aktif",
              updatedAt: personnelUpdatedAt,
            }]
          : [{
              code: values.sourceSiteCode,
              name: values.sourceSiteName,
              status: "Aktif",
            }],
      },
      ok: true,
    }));
    const result = await createEmployeeTransferAction(values);
    expect(result).toEqual({
      errors: ["Aktif hedef şantiye bulunamadı."],
      ok: false,
    });
    expect(mocks.repository.create).not.toHaveBeenCalled();
  });

  test("submits only after re-reading scoped transfer references", async () => {
    mocks.repository.findById.mockResolvedValue(transfer());
    const result = await submitEmployeeTransferAction({
      requestKey: "submit-1",
      transferId: "transfer-1",
    });
    expect(result.ok && result.data.transfer.status).toBe("SUBMITTED");
    expect(mocks.repository.findById).toHaveBeenCalled();
    expect(mocks.repository.transition).toHaveBeenCalled();
  });

  test("passes personnel concurrency snapshot to atomic approval", async () => {
    mocks.repository.findById.mockResolvedValue(transfer("SUBMITTED"));
    const result = await approveEmployeeTransferAction({
      requestKey: "approve-1",
      transferId: "transfer-1",
    });
    expect(result.ok && result.data.transfer.status).toBe("APPROVED");
    expect(mocks.repository.approve).toHaveBeenCalledWith(expect.objectContaining({
      expectedPersonnelUpdatedAt: personnelUpdatedAt,
      expectedRevisionNo: 2,
    }));
  });

  test("rejects accounting approval before repository read", async () => {
    mocks.sessionState.mockResolvedValue({
      scope: {
        ...activeScope,
        userId: "accounting-1",
        userRole: "accounting" as const,
      },
    });
    const result = await approveEmployeeTransferAction({
      requestKey: "approve-1",
      transferId: "transfer-1",
    });
    expect(result.ok).toBe(false);
    expect(mocks.repository.findById).not.toHaveBeenCalled();
  });

  test("lists only after active session scope bootstrap", async () => {
    const result = await listEmployeeTransfersAction();
    expect(result).toEqual({ data: { transfers: [] }, ok: true });
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
  });
});
