import { describe, expect, test, vi } from "vitest";

import {
  createEmployeeTransferService,
  type EmployeeTransferDraftUpdateInput,
} from "./employee-transfer-service";
import type {
  EmployeeTransferRepository,
  EmployeeTransferRow,
} from "./employee-transfer-prisma-repository";
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
  effectiveDate: "2026-07-30",
  note: "Audit dışı özel operasyon notu",
  personnelCode: "PER-0003",
  personnelName: "Hasan Çelik",
  requestKey: "create-1",
  sourceSiteCode: "SAN-0001",
  sourceSiteName: "Antalya Konyaaltı 120 Konut Projesi",
  targetSiteCode: "SAN-0002",
  targetSiteName: "İstanbul Kartal İş Merkezi İnşaatı",
};

function setup(seed?: {
  role?: TenantScope["userRole"];
  transfers?: EmployeeTransferRow[];
}) {
  const transfers = [...(seed?.transfers ?? [])];
  const audits: Array<{ action: string; metadata: Record<string, unknown> }> = [];
  const personnel = {
    code: values.personnelCode,
    site: values.sourceSiteName,
    updatedAt: "2026-07-30T09:00:00.000Z",
  };
  const repository: EmployeeTransferRepository = {
    async approve({ row }) {
      const index = transfers.findIndex((item) => item.id === row.id);
      transfers[index] = row;
      personnel.site = row.targetSiteName;
      personnel.updatedAt = row.updatedAt;
      return { personnel: { ...personnel }, transfer: row };
    },
    async create(row) {
      transfers.push(row);
      return row;
    },
    async findByCreateKey({ createRequestKey }) {
      return transfers.find((row) => row.createRequestKey === createRequestKey) ?? null;
    },
    async findById({ id }) {
      return transfers.find((row) => row.id === id) ?? null;
    },
    async list() {
      return [...transfers];
    },
    async listPersonnelTransfers({ personnelCode }) {
      return transfers.filter((row) => row.personnelCode === personnelCode);
    },
    async transition({ row }) {
      transfers[transfers.findIndex((item) => item.id === row.id)] = row;
      return row;
    },
    async updateDraft({ row }) {
      transfers[transfers.findIndex((item) => item.id === row.id)] = row;
      return row;
    },
  };
  const activeScope = { ...scope, ...(seed?.role ? { userRole: seed.role } : {}) };
  const service = createEmployeeTransferService({
    auditLogRepository: {
      record: vi.fn(async (entry) => {
        audits.push({ action: entry.action, metadata: entry.metadata });
      }),
    },
    createId: () => `transfer-${transfers.length + 1}`,
    now: () => "2026-07-30T10:00:00.000Z",
    repository,
  });
  return { activeScope, audits, personnel, service, transfers };
}

async function createTransfer(
  context: ReturnType<typeof setup>,
  requestKey = "create-1",
) {
  return context.service.create({
    currentPersonnelSiteName: context.personnel.site,
    scope: context.activeScope,
    values: { ...values, requestKey },
  });
}

describe("employee transfer service", () => {
  test("creates an idempotent draft with content-free audit metadata", async () => {
    const context = setup();
    const first = await createTransfer(context);
    const second = await createTransfer(context);
    expect(first.ok && first.data.idempotent).toBe(false);
    expect(second.ok && second.data.idempotent).toBe(true);
    expect(context.transfers).toHaveLength(1);
    expect(context.audits).toHaveLength(1);
    expect(JSON.stringify(context.audits[0]?.metadata)).not.toContain("özel");
    expect(JSON.stringify(context.audits[0])).not.toContain(values.sourceSiteName);
  });

  test("rejects viewer writes and every closed-period mutation", async () => {
    const viewer = setup({ role: "viewer" });
    expect((await createTransfer(viewer)).ok).toBe(false);
    const closed = setup();
    const result = await closed.service.create({
      currentPersonnelSiteName: closed.personnel.site,
      scope: { ...closed.activeScope, periodClosed: true },
      values,
    });
    expect(result).toEqual({
      errors: ["Kapalı dönemde personel transfer kaydı değiştirilemez."],
      ok: false,
    });
  });

  test("rejects a mismatched source and a second submitted transfer", async () => {
    const mismatch = setup();
    expect((await mismatch.service.create({
      currentPersonnelSiteName: "Başka Şantiye",
      scope: mismatch.activeScope,
      values,
    })).ok).toBe(false);

    const pending = setup();
    const first = await createTransfer(pending);
    if (!first.ok) throw new Error(first.errors.join(","));
    await pending.service.submit({
      currentPersonnelSiteName: pending.personnel.site,
      requestKey: "submit-1",
      scope: pending.activeScope,
      transferId: first.data.transfer.id,
    });
    const second = await createTransfer(pending, "create-2");
    expect(!second.ok && second.errors[0]).toContain("sonuçlanmamış");
  });

  test("submits then atomically approves and changes personnel site", async () => {
    const context = setup();
    const created = await createTransfer(context);
    if (!created.ok) throw new Error(created.errors.join(","));
    const submitted = await context.service.submit({
      currentPersonnelSiteName: context.personnel.site,
      requestKey: "submit-1",
      scope: context.activeScope,
      transferId: created.data.transfer.id,
    });
    expect(submitted.ok && submitted.data.transfer.status).toBe("SUBMITTED");
    const approved = await context.service.approve({
      currentPersonnelSiteName: context.personnel.site,
      expectedPersonnelUpdatedAt: context.personnel.updatedAt,
      requestKey: "approve-1",
      scope: context.activeScope,
      today: "2026-07-30",
      transferId: created.data.transfer.id,
    });
    expect(approved.ok && approved.data.transfer.status).toBe("APPROVED");
    expect(context.personnel.site).toBe(values.targetSiteName);
    expect(context.audits.map((entry) => entry.action)).toEqual([
      "employee-transfer.create",
      "employee-transfer.submit",
      "employee-transfer.approve",
    ]);
  });

  test("keeps transition retries idempotent after a later approval", async () => {
    const context = setup();
    const created = await createTransfer(context);
    if (!created.ok) throw new Error(created.errors.join(","));
    await context.service.submit({
      currentPersonnelSiteName: context.personnel.site,
      requestKey: "submit-1",
      scope: context.activeScope,
      transferId: created.data.transfer.id,
    });
    await context.service.approve({
      currentPersonnelSiteName: context.personnel.site,
      expectedPersonnelUpdatedAt: context.personnel.updatedAt,
      requestKey: "approve-1",
      scope: context.activeScope,
      today: "2026-07-30",
      transferId: created.data.transfer.id,
    });
    const replay = await context.service.submit({
      currentPersonnelSiteName: values.targetSiteName,
      requestKey: "submit-1",
      scope: context.activeScope,
      transferId: created.data.transfer.id,
    });
    expect(replay.ok && replay.data.idempotent).toBe(true);
    expect(context.audits).toHaveLength(3);
  });

  test("blocks future approval and reserves decisions for admin", async () => {
    const context = setup();
    const created = await context.service.create({
      currentPersonnelSiteName: context.personnel.site,
      scope: context.activeScope,
      values: { ...values, effectiveDate: "2026-07-31" },
    });
    if (!created.ok) throw new Error(created.errors.join(","));
    await context.service.submit({
      currentPersonnelSiteName: context.personnel.site,
      requestKey: "submit-1",
      scope: context.activeScope,
      transferId: created.data.transfer.id,
    });
    const future = await context.service.approve({
      currentPersonnelSiteName: context.personnel.site,
      expectedPersonnelUpdatedAt: context.personnel.updatedAt,
      requestKey: "approve-1",
      scope: context.activeScope,
      today: "2026-07-30",
      transferId: created.data.transfer.id,
    });
    expect(!future.ok && future.errors[0]).toContain("gelecek");

    const accounting = setup({ role: "accounting" });
    const accountingCreated = await createTransfer(accounting);
    if (!accountingCreated.ok) throw new Error(accountingCreated.errors.join(","));
    await accounting.service.submit({
      currentPersonnelSiteName: accounting.personnel.site,
      requestKey: "submit-1",
      scope: accounting.activeScope,
      transferId: accountingCreated.data.transfer.id,
    });
    expect((await accounting.service.approve({
      currentPersonnelSiteName: accounting.personnel.site,
      expectedPersonnelUpdatedAt: accounting.personnel.updatedAt,
      requestKey: "approve-1",
      scope: accounting.activeScope,
      today: "2026-07-30",
      transferId: accountingCreated.data.transfer.id,
    })).ok).toBe(false);
  });

  test("updates only a current draft with optimistic revision", async () => {
    const context = setup();
    const created = await createTransfer(context);
    if (!created.ok) throw new Error(created.errors.join(","));
    const update: EmployeeTransferDraftUpdateInput = {
      ...values,
      expectedRevisionNo: created.data.transfer.revisionNo,
      note: "Yeni kısa not",
      requestKey: "update-1",
      transferId: created.data.transfer.id,
    };
    const result = await context.service.updateDraft({
      currentPersonnelSiteName: context.personnel.site,
      scope: context.activeScope,
      values: update,
    });
    expect(result.ok && result.data.transfer.revisionNo).toBe(2);
    expect(result.ok && result.data.transfer.note).toBe("Yeni kısa not");
    expect((await context.service.updateDraft({
      currentPersonnelSiteName: context.personnel.site,
      scope: context.activeScope,
      values: { ...update, requestKey: "update-stale" },
    })).ok).toBe(false);
  });
});
