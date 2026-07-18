import { describe, expect, test } from "vitest";

import {
  buildNotificationCenterModel,
  createNotificationCenterService,
  createOperationalNotificationRows,
  createSeededNotificationMemoryRepository,
  createSeedNotificationRows,
  getUnreadNotificationCount,
  listNotificationCategories,
  type NotificationCenterRow,
} from "./notification-center-service";
import type { ChequeRow } from "./cheque-service";
import type { VehicleCardRow } from "./vehicle-service";
import { defaultTenantScope } from "./tenant-scope";

const rows: NotificationCenterRow[] = [
  {
    id: "notification-due-cheque",
    categoryKey: "vade-bildirimleri",
    title: "Çek vadesi yaklaşıyor",
    body: "CEK-2026-001 için vade tarihi 3 gün içinde.",
    createdAt: "2026-07-02T08:30:00.000Z",
    priority: "Kritik",
    readAt: null,
    targetHref: "/cek?evrak=CEK-2026-001",
    targetLabel: "CEK-2026-001",
  },
  {
    id: "notification-stock-minimum",
    categoryKey: "stok-yonetimi",
    title: "Minimum stok seviyesi aşıldı",
    body: "C30 beton stoğu şantiye minimumunun altında.",
    createdAt: "2026-06-29T09:00:00.000Z",
    priority: "Yüksek",
    readAt: "2026-07-01T10:00:00.000Z",
    targetHref: "/stok-depo?evrak=STK-C30",
    targetLabel: "STK-C30",
  },
  {
    id: "notification-expense-approval",
    categoryKey: "masraf-yonetimi",
    title: "Masraf talebi onay bekliyor",
    body: "GDR-2026-004 saha masrafı onay bekliyor.",
    createdAt: "2026-06-21T12:00:00.000Z",
    priority: "Normal",
    readAt: null,
    targetHref: "/giderler?evrak=GDR-2026-004",
    targetLabel: "GDR-2026-004",
  },
];

describe("notification-center-service", () => {
  test("lists the 13 notification categories from the P1 settings plan", () => {
    const categories = listNotificationCategories();

    expect(categories).toHaveLength(13);
    expect(categories.map((category) => category.label)).toContain("Masraf Yönetimi");
    expect(categories.map((category) => category.label)).toContain("Destek Sistemi");
    expect(new Set(categories.map((category) => category.key)).size).toBe(13);
  });

  test("filters disabled categories and calculates notification statistics", () => {
    const model = buildNotificationCenterModel({
      enabledCategoryKeys: ["vade-bildirimleri", "stok-yonetimi"],
      rows,
      today: "2026-07-02",
    });

    expect(model.rows.map((row) => row.id)).toEqual([
      "notification-due-cheque",
      "notification-stock-minimum",
    ]);
    expect(model.summary).toMatchObject({
      totalCount: 2,
      unreadCount: 1,
      todayCount: 1,
      weekCount: 2,
    });
    expect(model.priorityStats).toEqual([
      { label: "Düşük", count: 0 },
      { label: "Normal", count: 0 },
      { label: "Yüksek", count: 1 },
      { label: "Kritik", count: 1 },
    ]);
    expect(
      model.categoryStats.find((category) => category.key === "masraf-yonetimi"),
    ).toMatchObject({ enabled: false, totalCount: 1, unreadCount: 1 });
  });

  test("counts unread notifications for the top bar using enabled categories", () => {
    expect(
      getUnreadNotificationCount(rows, ["vade-bildirimleri", "stok-yonetimi"]),
    ).toBe(1);
    expect(getUnreadNotificationCount(rows)).toBe(2);
  });

  test("lists persisted notifications with user category preferences", async () => {
    const service = createNotificationCenterService({
      now: () => "2026-07-02T12:00:00.000Z",
      repository: createSeededNotificationMemoryRepository({
        notifications: rows,
        preferences: [
          {
            categoryKey: "masraf-yonetimi",
            createdAt: "2026-07-02T09:00:00.000Z",
            emailEnabled: false,
            id: "preference-masraf",
            inAppEnabled: false,
            pushEnabled: false,
            tenantId: defaultTenantScope.tenantId,
            updatedAt: "2026-07-02T09:00:00.000Z",
            updatedBy: defaultTenantScope.userId,
            userId: defaultTenantScope.userId,
          },
        ],
      }),
    });

    await expect(
      service.list({ scope: defaultTenantScope, today: "2026-07-02" }),
    ).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        enabledCategoryKeys: expect.not.arrayContaining(["masraf-yonetimi"]),
        model: expect.objectContaining({
          rows: [
            expect.objectContaining({ id: "notification-due-cheque" }),
            expect.objectContaining({ id: "notification-stock-minimum" }),
          ],
          summary: expect.objectContaining({
            totalCount: 2,
            unreadCount: 1,
          }),
        }),
        rows,
      }),
    });
  });

  test("persists user category preference changes", async () => {
    const service = createNotificationCenterService({
      now: () => "2026-07-02T12:00:00.000Z",
      repository: createSeededNotificationMemoryRepository({
        notifications: rows,
      }),
    });

    await expect(
      service.setPreference({
        categoryKey: "stok-yonetimi",
        inAppEnabled: false,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        preference: expect.objectContaining({
          categoryKey: "stok-yonetimi",
          inAppEnabled: false,
          tenantId: defaultTenantScope.tenantId,
          userId: defaultTenantScope.userId,
        }),
      },
    });

    const listed = await service.list({
      scope: defaultTenantScope,
      today: "2026-07-02",
    });

    expect(listed.ok).toBe(true);
    if (!listed.ok) {
      return;
    }
    expect(listed.data.enabledCategoryKeys).not.toContain("stok-yonetimi");
    expect(listed.data.model.rows.map((row) => row.id)).not.toContain(
      "notification-stock-minimum",
    );
  });

  test("marks a scoped notification as read", async () => {
    const service = createNotificationCenterService({
      now: () => "2026-07-02T12:00:00.000Z",
      repository: createSeededNotificationMemoryRepository({
        notifications: createSeedNotificationRows(),
      }),
    });

    await expect(
      service.markAsRead({
        notificationId: "notification-vade-cheque-001",
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        notification: expect.objectContaining({
          id: "notification-vade-cheque-001",
          readAt: "2026-07-02T12:00:00.000Z",
        }),
      },
    });

    const listed = await service.list({
      scope: defaultTenantScope,
      today: "2026-07-02",
    });

    expect(listed.ok).toBe(true);
    if (!listed.ok) {
      return;
    }
    expect(listed.data.model.summary.unreadCount).toBe(2);
  });

  test("rejects invalid preference categories", async () => {
    const service = createNotificationCenterService({
      repository: createSeededNotificationMemoryRepository(),
    });

    await expect(
      service.setPreference({
        categoryKey: "gecersiz-kategori",
        inAppEnabled: false,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Geçersiz bildirim kategorisi."],
    });
  });

  test("generates domain notifications from due cheques, contract endings and stock minimums", () => {
    const generated = createOperationalNotificationRows({
      cheques: [
        createCheque({
          checkNo: "CK-2026-001",
          documentNo: "CEK-2026-001",
          dueDate: "2026-07-04",
          status: "Portföyde",
        }),
        createCheque({
          checkNo: "CK-2026-002",
          documentNo: "CEK-2026-002",
          dueDate: "2026-07-03",
          status: "Tahsil Edildi",
        }),
      ],
      subcontractorRows: [
        {
          code: "TAS-0001",
          contractEndDate: "2026-07-10",
          contractNo: "SZL-2026-001",
          name: "ABC Beton Taşeron",
          status: "Aktif",
        },
        {
          code: "TAS-0002",
          contractEndDate: "2026-09-30",
          contractNo: "SZL-2026-002",
          name: "Uzak Tarihli Taşeron",
          status: "Aktif",
        },
      ],
      stockMinimums: [
        {
          minimumQuantity: 10,
          stockCode: "STK-0001",
          warehouse: "Merkez Depo",
        },
      ],
      stockSummaryRows: [
        {
          balanceQuantity: 4,
          incomingQuantity: 14,
          outgoingQuantity: 10,
          netTotal: 12_000,
          stockCode: "STK-0001",
          stockName: "Çimento Torba",
          unit: "Adet",
          warehouse: "Merkez Depo",
        },
      ],
      today: "2026-07-02",
    });

    expect(generated.map((row) => row.id)).toEqual([
      "notification-domain-cheque-CEK-2026-001",
      "notification-domain-contract-TAS-0001",
      "notification-domain-stock-Merkez-Depo-STK-0001",
    ]);
    expect(generated).toEqual([
      expect.objectContaining({
        body: "CK-2026-001 numaralı çekin vadesine 2 gün kaldı.",
        categoryKey: "vade-bildirimleri",
        priority: "Kritik",
        targetHref: "/cek?evrak=CEK-2026-001",
        targetLabel: "CEK-2026-001",
        title: "Çek vadesi yaklaşıyor",
      }),
      expect.objectContaining({
        body: "ABC Beton Taşeron sözleşmesi 8 gün içinde sona eriyor.",
        categoryKey: "sozlesme-yonetimi",
        priority: "Yüksek",
        targetHref: "/taseronlar?evrak=TAS-0001",
        targetLabel: "SZL-2026-001",
      }),
      expect.objectContaining({
        body: "Merkez Depo deposunda Çimento Torba stoğu 4 Adet, minimum 10 Adet.",
        categoryKey: "stok-yonetimi",
        priority: "Yüksek",
        targetHref: "/stok-depo?evrak=STK-0001",
        targetLabel: "STK-0001",
      }),
    ]);
  });

  test("generates active vehicle compliance notifications", () => {
    const vehicle: VehicleCardRow = {
      id: "vehicle-notification-1",
      plate: "34 NOA 707",
      insuranceEndDate: "2026-07-20",
      inspectionEndDate: "2026-06-30",
      maintenanceDueDate: "2026-08-01",
      status: "Aktif",
    } as VehicleCardRow;

    const generated = createOperationalNotificationRows({
      today: "2026-07-14",
      vehicleCards: [vehicle],
    });

    expect(generated).toHaveLength(3);
    expect(generated).toContainEqual(expect.objectContaining({
      body: "34 NOA 707 muayene süresi 2026-06-30 tarihinde doldu.",
      categoryKey: "arac-yonetimi",
      id: "notification-domain-vehicle-vehicle-notification-1-muayene",
      priority: "Kritik",
      targetHref: "/araclar?plaka=34%20NOA%20707",
      title: "Muayene süresi yaklaşıyor",
    }));
    expect(generated).toContainEqual(expect.objectContaining({
      categoryKey: "arac-yonetimi",
      title: "Sigorta süresi yaklaşıyor",
    }));
  });

  test("upserts generated domain notifications without replacing read state", async () => {
    const repository = createSeededNotificationMemoryRepository({
      notifications: [],
    });
    const service = createNotificationCenterService({
      now: () => "2026-07-02T12:00:00.000Z",
      repository,
    });
    const generated = createOperationalNotificationRows({
      cheques: [
        createCheque({
          documentNo: "CEK-2026-001",
          dueDate: "2026-07-04",
        }),
      ],
      today: "2026-07-02",
    });

    await expect(
      service.ensureGeneratedNotifications({
        notifications: generated,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      ok: true,
      data: { rows: generated },
    });

    await service.markAsRead({
      notificationId: "notification-domain-cheque-CEK-2026-001",
      scope: defaultTenantScope,
    });
    await service.ensureGeneratedNotifications({
      notifications: generated,
      scope: defaultTenantScope,
    });

    const listed = await service.list({
      scope: defaultTenantScope,
      today: "2026-07-02",
    });

    expect(listed.ok).toBe(true);
    if (!listed.ok) {
      return;
    }
    expect(listed.data.rows).toEqual([
      expect.objectContaining({
        id: "notification-domain-cheque-CEK-2026-001",
        readAt: "2026-07-02T12:00:00.000Z",
      }),
    ]);
  });
});

function createCheque(values: Partial<ChequeRow> = {}): ChequeRow {
  return {
    amount: 25_000,
    bankName: "Garanti",
    branchName: "Merkez",
    checkNo: "CK-2026-001",
    companyId: defaultTenantScope.companyId,
    createdAt: "2026-07-01T09:00:00.000Z",
    createdBy: defaultTenantScope.userId,
    currency: "TL",
    description: "",
    direction: "Gelen",
    documentNo: "CEK-2026-001",
    drawerName: "ABC Beton",
    dueDate: "2026-07-04",
    id: "cheque-1",
    issueDate: "2026-06-01",
    periodId: defaultTenantScope.periodId,
    status: "Portföyde",
    tenantId: defaultTenantScope.tenantId,
    updatedAt: "2026-07-01T09:00:00.000Z",
    updatedBy: defaultTenantScope.userId,
    ...values,
  };
}
