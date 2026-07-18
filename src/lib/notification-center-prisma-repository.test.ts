import { describe, expect, test } from "vitest";

import { createNotificationCenterPrismaRepository } from "./notification-center-prisma-repository";
import type {
  NotificationCenterRow,
  NotificationPreferenceRow,
} from "./notification-center-service";
import { defaultTenantScope } from "./tenant-scope";

const notification: NotificationCenterRow = {
  body: "CEK-2026-001 için vade tarihi 3 gün içinde.",
  categoryKey: "vade-bildirimleri",
  createdAt: "2026-07-02T08:30:00.000Z",
  id: "notification-vade-cheque-001",
  priority: "Kritik",
  readAt: null,
  targetHref: "/cek?evrak=CEK-2026-001",
  targetLabel: "CEK-2026-001",
  title: "Çek vadesi yaklaşıyor",
};

const preference: NotificationPreferenceRow = {
  categoryKey: "stok-yonetimi",
  createdAt: "2026-07-02T09:00:00.000Z",
  emailEnabled: false,
  id: "notification-preference-stock",
  inAppEnabled: false,
  pushEnabled: false,
  tenantId: defaultTenantScope.tenantId,
  updatedAt: "2026-07-02T09:00:00.000Z",
  updatedBy: defaultTenantScope.userId,
  userId: defaultTenantScope.userId,
};

describe("notification center prisma repository", () => {
  test("lists scoped notifications and preferences", async () => {
    const repository = createNotificationCenterPrismaRepository({
      notification: {
        async findMany(input) {
          expect(input).toEqual({
            where: {
              tenantId: defaultTenantScope.tenantId,
              companyId: defaultTenantScope.companyId,
              periodId: defaultTenantScope.periodId,
              userId: defaultTenantScope.userId,
            },
            orderBy: [{ createdAt: "desc" }],
          });

          return [
            {
              ...notification,
              category: "vade-bildirimleri",
              companyId: defaultTenantScope.companyId,
              createdAt: new Date(notification.createdAt),
              periodId: defaultTenantScope.periodId,
              priority: "Kritik",
              readAt: null,
              tenantId: defaultTenantScope.tenantId,
              updatedAt: new Date(notification.createdAt),
              userId: defaultTenantScope.userId,
            },
          ];
        },
        async updateMany() {
          throw new Error("not used");
        },
        async findFirst() {
          throw new Error("not used");
        },
        async upsert() {
          throw new Error("not used");
        },
      },
      notificationPreference: {
        async findMany(input) {
          expect(input).toEqual({
            where: {
              tenantId: defaultTenantScope.tenantId,
              userId: defaultTenantScope.userId,
            },
            orderBy: [{ category: "asc" }],
          });

          return [
            {
              ...preference,
              category: "stok-yonetimi",
              createdAt: new Date(preference.createdAt),
              updatedAt: new Date(preference.updatedAt),
            },
          ];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.listNotifications({ scope: defaultTenantScope }),
    ).resolves.toEqual([notification]);
    await expect(
      repository.listPreferences({ scope: defaultTenantScope }),
    ).resolves.toEqual([preference]);
  });

  test("upserts seed notifications and user preferences", async () => {
    const calls: unknown[] = [];
    const repository = createNotificationCenterPrismaRepository({
      notification: {
        async findMany() {
          return [];
        },
        async updateMany() {
          throw new Error("not used");
        },
        async findFirst() {
          throw new Error("not used");
        },
        async upsert(input) {
          calls.push(input);

          return {
            ...input.create,
            category: input.create.category,
            createdAt: input.create.createdAt,
            updatedAt: input.create.updatedAt,
          };
        },
      },
      notificationPreference: {
        async findMany() {
          return [];
        },
        async upsert(input) {
          calls.push(input);

          return {
            ...input.create,
            category: input.create.category,
            createdAt: input.create.createdAt,
            updatedAt: input.create.updatedAt,
          };
        },
      },
    });

    await expect(
      repository.upsertNotification({ notification, scope: defaultTenantScope }),
    ).resolves.toEqual(notification);
    await expect(
      repository.upsertPreference({ preference, scope: defaultTenantScope }),
    ).resolves.toEqual(preference);

    expect(calls).toEqual([
      expect.objectContaining({
        where: { id: notification.id },
        create: expect.objectContaining({
          category: "vade-bildirimleri",
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          targetHref: "/cek?evrak=CEK-2026-001",
          tenantId: defaultTenantScope.tenantId,
          userId: defaultTenantScope.userId,
        }),
      }),
      expect.objectContaining({
        where: {
          tenantId_userId_category: {
            category: "stok-yonetimi",
            tenantId: defaultTenantScope.tenantId,
            userId: defaultTenantScope.userId,
          },
        },
        create: expect.objectContaining({
          category: "stok-yonetimi",
          inAppEnabled: false,
          tenantId: defaultTenantScope.tenantId,
          userId: defaultTenantScope.userId,
        }),
      }),
    ]);
  });

  test("marks only a scoped notification as read", async () => {
    const calls: unknown[] = [];
    const repository = createNotificationCenterPrismaRepository({
      notification: {
        async findMany() {
          return [];
        },
        async updateMany(input) {
          calls.push(input);

          return { count: 1 };
        },
        async findFirst(input) {
          calls.push(input);

          return {
            ...notification,
            category: notification.categoryKey,
            companyId: defaultTenantScope.companyId,
            createdAt: new Date(notification.createdAt),
            periodId: defaultTenantScope.periodId,
            readAt: new Date("2026-07-02T12:00:00.000Z"),
            tenantId: defaultTenantScope.tenantId,
            updatedAt: new Date("2026-07-02T12:00:00.000Z"),
            userId: defaultTenantScope.userId,
          };
        },
        async upsert() {
          throw new Error("not used");
        },
      },
      notificationPreference: {
        async findMany() {
          return [];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.markAsRead({
        notificationId: notification.id,
        readAt: "2026-07-02T12:00:00.000Z",
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      ...notification,
      readAt: "2026-07-02T12:00:00.000Z",
    });
    expect(calls).toEqual([
      {
        where: {
          id: notification.id,
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          userId: defaultTenantScope.userId,
        },
        data: {
          readAt: new Date("2026-07-02T12:00:00.000Z"),
          updatedAt: new Date("2026-07-02T12:00:00.000Z"),
        },
      },
      {
        where: {
          id: notification.id,
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          userId: defaultTenantScope.userId,
        },
      },
    ]);
  });
});
