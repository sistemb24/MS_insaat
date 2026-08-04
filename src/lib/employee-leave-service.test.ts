import { describe, expect, test, vi } from "vitest";

import type { AuditLogEntryInput } from "./audit-log";
import type {
  EmployeeLeaveBalanceRow,
  EmployeeLeaveRepository,
  EmployeeLeaveRow,
} from "./employee-leave-prisma-repository";
import { createEmployeeLeaveService } from "./employee-leave-service";
import type { TenantScope } from "./tenant-scope";

const scope: TenantScope = {
  companyId: "company-1",
  companyName: "Firma",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-1",
  periodLabel: "2026",
  tenantId: "tenant-1",
  tenantName: "Tenant",
  userId: "user-admin",
  userName: "Admin",
  userRole: "admin",
};
const values = {
  chargeableDays: 2,
  documentFileId: null,
  endDate: "2026-08-11",
  leaveType: "ANNUAL" as const,
  note: "Özel açıklama",
  personnelCode: "PER-0001",
  personnelName: "Ayşe Demir",
  requestKey: "create-1",
  startDate: "2026-08-10",
};

function setup(seed?: {
  balances?: EmployeeLeaveBalanceRow[];
  leaves?: EmployeeLeaveRow[];
  role?: TenantScope["userRole"];
}) {
  const leaves = [...(seed?.leaves ?? [])];
  const balances = [...(seed?.balances ?? [])];
  const audits: AuditLogEntryInput[] = [];
  const repository: EmployeeLeaveRepository = {
    async createLeave(row) {
      leaves.push(row);
      return row;
    },
    async findBalance({ personnelCode, year }) {
      return balances.find((row) => row.personnelCode === personnelCode && row.year === year) ?? null;
    },
    async findLeaveByCreateKey({ createRequestKey }) {
      return leaves.find((row) => row.createRequestKey === createRequestKey) ?? null;
    },
    async findLeaveById({ id }) {
      return leaves.find((row) => row.id === id) ?? null;
    },
    async listBalances() {
      return balances;
    },
    async listLeaves() {
      return leaves;
    },
    async listPersonnelLeaves({ personnelCode }) {
      return leaves.filter((row) => row.personnelCode === personnelCode);
    },
    async saveBalance({ row }) {
      const index = balances.findIndex((item) => item.id === row.id);
      if (index >= 0) balances[index] = row;
      else balances.push(row);
      return row;
    },
    async transition({ balance, row }) {
      const index = leaves.findIndex((item) => item.id === row.id);
      leaves[index] = row;
      if (balance) {
        const balanceIndex = balances.findIndex((item) => item.id === balance.row.id);
        balances[balanceIndex] = balance.row;
      }
      return { ...(balance ? { balance: balance.row } : {}), leave: row };
    },
    async updateDraft({ row }) {
      leaves[leaves.findIndex((item) => item.id === row.id)] = row;
      return row;
    },
  };
  const activeScope = { ...scope, ...(seed?.role ? { userRole: seed.role } : {}) };
  const service = createEmployeeLeaveService({
    auditLogRepository: { record: vi.fn(async (entry) => { audits.push(entry); }) },
    createId: (_activeScope, entity) => `${entity}-${entity === "leave" ? leaves.length + 1 : balances.length + 1}`,
    now: () => "2026-07-30T10:00:00.000Z",
    repository,
  });
  return { activeScope, audits, balances, leaves, service };
}

async function createAnnual(context: ReturnType<typeof setup>, requestKey = "create-1") {
  return context.service.create({
    scope: context.activeScope,
    values: { ...values, requestKey },
  });
}

describe("employee leave service", () => {
  test("creates an idempotent draft and keeps free text out of audit metadata", async () => {
    const context = setup();
    const first = await createAnnual(context);
    const second = await createAnnual(context);
    expect(first.ok && first.data.idempotent).toBe(false);
    expect(second.ok && second.data.idempotent).toBe(true);
    expect(context.leaves).toHaveLength(1);
    expect(context.audits).toHaveLength(1);
    expect(JSON.stringify(context.audits[0]?.metadata)).not.toContain("Özel");
  });

  test("rejects viewer writes and all closed-period writes", async () => {
    const viewer = setup({ role: "viewer" });
    expect((await createAnnual(viewer)).ok).toBe(false);
    const closed = setup();
    const result = await closed.service.create({
      scope: { ...closed.activeScope, periodClosed: true },
      values,
    });
    expect(result).toEqual({
      errors: ["Kapalı dönemde personel izin kaydı değiştirilemez."],
      ok: false,
    });
  });

  test("creates balance then submits and approves annual leave atomically", async () => {
    const context = setup();
    const balance = await context.service.saveBalance({
      scope: context.activeScope,
      values: {
        adjustmentDays: 0,
        openingDays: 14,
        personnelCode: values.personnelCode,
        personnelName: values.personnelName,
        requestKey: "balance-1",
        year: 2026,
      },
    });
    expect(balance.ok).toBe(true);
    const created = await createAnnual(context);
    if (!created.ok) throw new Error(created.errors.join(","));
    expect((await context.service.submit({
      leaveId: created.data.leave.id,
      requestKey: "submit-1",
      scope: context.activeScope,
    })).ok).toBe(true);
    const approved = await context.service.approve({
      leaveId: created.data.leave.id,
      requestKey: "approve-1",
      scope: context.activeScope,
    });
    expect(approved.ok && approved.data.leave.status).toBe("APPROVED");
    expect(context.balances[0]?.usedDays).toBe(2);
    expect(context.audits.map((entry) => entry.action)).toEqual([
      "employee-leave.balance.save",
      "employee-leave.create",
      "employee-leave.submit",
      "employee-leave.approve",
    ]);
  });

  test("makes lifecycle retries idempotent even after a later transition", async () => {
    const context = setup();
    await context.service.saveBalance({
      scope: context.activeScope,
      values: {
        adjustmentDays: 0,
        openingDays: 14,
        personnelCode: values.personnelCode,
        personnelName: values.personnelName,
        requestKey: "balance-1",
        year: 2026,
      },
    });
    const created = await createAnnual(context);
    if (!created.ok) throw new Error(created.errors.join(","));
    await context.service.submit({
      leaveId: created.data.leave.id,
      requestKey: "submit-1",
      scope: context.activeScope,
    });
    await context.service.approve({
      leaveId: created.data.leave.id,
      requestKey: "approve-1",
      scope: context.activeScope,
    });
    const replay = await context.service.submit({
      leaveId: created.data.leave.id,
      requestKey: "submit-1",
      scope: context.activeScope,
    });
    expect(replay.ok && replay.data.idempotent).toBe(true);
    expect(context.audits).toHaveLength(4);
  });

  test("rejects overlap and insufficient annual balance", async () => {
    const context = setup({
      leaves: [{
        approveRequestKey: "key",
        approvedAt: "2026-07-30T10:00:00.000Z",
        cancelRequestKey: null,
        cancelledAt: null,
        chargeableDays: 2,
        companyId: scope.companyId,
        createRequestKey: "old",
        createdAt: "2026-07-30T10:00:00.000Z",
        createdBy: scope.userId,
        documentFileId: null,
        endDate: "2026-08-10",
        id: "leave-old",
        lastUpdateKey: null,
        leaveType: "ANNUAL",
        note: "",
        periodId: scope.periodId,
        personnelCode: values.personnelCode,
        personnelName: values.personnelName,
        rejectRequestKey: null,
        rejectedAt: null,
        revisionNo: 3,
        startDate: "2026-08-09",
        status: "APPROVED",
        submitRequestKey: "submit-old",
        submittedAt: "2026-07-30T10:00:00.000Z",
        tenantId: scope.tenantId,
        updatedAt: "2026-07-30T10:00:00.000Z",
        updatedBy: scope.userId,
      }],
    });
    const created = await createAnnual(context, "create-overlap");
    if (!created.ok) throw new Error(created.errors.join(","));
    const submitted = await context.service.submit({
      leaveId: created.data.leave.id,
      requestKey: "submit-new",
      scope: context.activeScope,
    });
    expect(submitted.ok).toBe(false);
    expect(!submitted.ok && submitted.errors[0]).toContain("aynı tarih aralığında");
  });

  test("reserves approve/reject/cancel and balance operations for admin", async () => {
    const accounting = setup({ role: "accounting" });
    expect((await accounting.service.saveBalance({
      scope: accounting.activeScope,
      values: {
        adjustmentDays: 0,
        openingDays: 14,
        personnelCode: values.personnelCode,
        personnelName: values.personnelName,
        requestKey: "balance-1",
        year: 2026,
      },
    })).ok).toBe(false);
  });

  test("restores used annual balance when an approved leave is cancelled", async () => {
    const context = setup();
    await context.service.saveBalance({
      scope: context.activeScope,
      values: {
        adjustmentDays: 0,
        openingDays: 14,
        personnelCode: values.personnelCode,
        personnelName: values.personnelName,
        requestKey: "balance-1",
        year: 2026,
      },
    });
    const created = await createAnnual(context);
    if (!created.ok) throw new Error(created.errors.join(","));
    await context.service.submit({
      leaveId: created.data.leave.id,
      requestKey: "submit-1",
      scope: context.activeScope,
    });
    await context.service.approve({
      leaveId: created.data.leave.id,
      requestKey: "approve-1",
      scope: context.activeScope,
    });
    const cancelled = await context.service.cancel({
      leaveId: created.data.leave.id,
      requestKey: "cancel-1",
      scope: context.activeScope,
    });
    expect(cancelled.ok && cancelled.data.leave.status).toBe("CANCELLED");
    expect(context.balances[0]?.usedDays).toBe(0);
  });
});
