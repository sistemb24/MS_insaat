import { describe, expect, it, vi } from "vitest";

import type { AuditLogEntryInput } from "./audit-log";
import {
  createFinanceSettingsMemoryRepository,
  createFinanceSettingsService,
} from "./finance-settings-service";
import { defaultTenantScope, type TenantScope } from "./tenant-scope";

function createTenantScope(overrides: Partial<TenantScope> = {}): TenantScope {
  return { ...defaultTenantScope, ...overrides };
}

describe("finance settings service", () => {
  it("persists once, retries idempotently and rejects stale revisions", async () => {
    const auditRows: AuditLogEntryInput[] = [];
    const service = createFinanceSettingsService({
      auditLogRepository: {
        record: vi.fn(async (entry) => {
          auditRows.push(entry);
        }),
      },
      now: () => "2026-07-30T12:00:00.000Z",
      repository: createFinanceSettingsMemoryRepository(),
    });
    const scope = createTenantScope({ userRole: "admin" });
    const values = {
      defaultVatRate: 18,
      expectedRevisionNo: 0,
      requestKey: "finance-save-1",
      showVatBreakdown: false,
    };

    const saved = await service.save({ scope, values });
    const retry = await service.save({ scope, values });
    const stale = await service.save({
      scope,
      values: { ...values, requestKey: "finance-save-2" },
    });

    expect(saved).toMatchObject({
      data: { idempotent: false, settings: { revisionNo: 1, source: "persisted" } },
      ok: true,
    });
    expect(retry).toMatchObject({ data: { idempotent: true }, ok: true });
    expect(stale).toEqual({
      errors: [
        "Finans ayarları başka bir işlemle güncellendi; güncel kaydı yeniden açın.",
      ],
      ok: false,
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.metadata).not.toHaveProperty("requestKey");
  });

  it("fails closed for non-admin and closed-period writes", async () => {
    const service = createFinanceSettingsService({
      repository: createFinanceSettingsMemoryRepository(),
    });
    const values = {
      defaultVatRate: 10,
      expectedRevisionNo: 0,
      requestKey: "save",
      showVatBreakdown: true,
    };

    await expect(
      service.save({
        scope: createTenantScope({ userRole: "viewer" }),
        values,
      }),
    ).resolves.toMatchObject({ ok: false });
    await expect(
      service.save({
        scope: createTenantScope({ periodClosed: true, userRole: "admin" }),
        values,
      }),
    ).resolves.toMatchObject({ ok: false });
  });

  it("isolates persisted values by full tenant scope", async () => {
    const repository = createFinanceSettingsMemoryRepository();
    const service = createFinanceSettingsService({ repository });
    const scope = createTenantScope({ userRole: "admin" });
    await service.save({
      scope,
      values: {
        defaultVatRate: 8,
        expectedRevisionNo: 0,
        requestKey: "scope-save",
        showVatBreakdown: false,
      },
    });

    const foreign = await service.get({
      scope: createTenantScope({
        companyId: "company-foreign",
        periodId: "period-foreign",
        userRole: "admin",
      }),
    });
    expect(foreign).toMatchObject({
      data: { settings: { defaultVatRate: 20, source: "fallback" } },
      ok: true,
    });
  });
});
