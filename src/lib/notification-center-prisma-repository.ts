import type {
  NotificationCenterRepository,
  NotificationCenterRow,
  NotificationPreferenceRow,
  NotificationPriority,
} from "./notification-center-service";
import type { TenantScope } from "./tenant-scope";

type NotificationRecord = {
  body: string;
  category: string;
  companyId: string;
  createdAt: Date | string;
  id: string;
  periodId: string;
  priority: string;
  readAt?: Date | string | null;
  targetHref: string;
  targetLabel: string;
  tenantId: string;
  title: string;
  updatedAt: Date | string;
  userId: string;
};

type NotificationPreferenceRecord = {
  category: string;
  createdAt: Date | string;
  emailEnabled: boolean;
  id: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  tenantId: string;
  updatedAt: Date | string;
  updatedBy: string;
  userId: string;
};

type NotificationClient = {
  findFirst(input: {
    where: ReturnType<typeof notificationScopeWhere> & { id: string };
  }): Promise<NotificationRecord | null>;
  findMany(input: {
    where: ReturnType<typeof notificationScopeWhere>;
    orderBy: Array<{ createdAt: "asc" | "desc" }>;
  }): Promise<NotificationRecord[]>;
  updateMany(input: {
    where: ReturnType<typeof notificationScopeWhere> & { id: string };
    data: {
      readAt: Date;
      updatedAt: Date;
    };
  }): Promise<{ count: number }>;
  upsert(input: {
    where: { id: string };
    create: ReturnType<typeof notificationRowToCreateData>;
    update: ReturnType<typeof notificationRowToUpdateData>;
  }): Promise<NotificationRecord>;
};

type NotificationPreferenceClient = {
  findMany(input: {
    where: {
      tenantId: string;
      userId: string;
    };
    orderBy: Array<{ category: "asc" | "desc" }>;
  }): Promise<NotificationPreferenceRecord[]>;
  upsert(input: {
    where: {
      tenantId_userId_category: {
        category: string;
        tenantId: string;
        userId: string;
      };
    };
    create: ReturnType<typeof preferenceRowToCreateData>;
    update: ReturnType<typeof preferenceRowToUpdateData>;
  }): Promise<NotificationPreferenceRecord>;
};

export type NotificationCenterPrismaClientLike = {
  notification: NotificationClient;
  notificationPreference: NotificationPreferenceClient;
};

export function createNotificationCenterPrismaRepository(
  prisma: NotificationCenterPrismaClientLike,
): NotificationCenterRepository {
  return {
    async listNotifications({ scope }) {
      const rows = await prisma.notification.findMany({
        where: notificationScopeWhere(scope),
        orderBy: [{ createdAt: "desc" }],
      });

      return rows.map(notificationRecordToRow);
    },

    async listPreferences({ scope }) {
      const rows = await prisma.notificationPreference.findMany({
        where: {
          tenantId: scope.tenantId,
          userId: scope.userId,
        },
        orderBy: [{ category: "asc" }],
      });

      return rows.map(preferenceRecordToRow);
    },

    async markAsRead({ notificationId, readAt, scope }) {
      const where = {
        ...notificationScopeWhere(scope),
        id: notificationId,
      };
      const updated = await prisma.notification.updateMany({
        where,
        data: {
          readAt: new Date(readAt),
          updatedAt: new Date(readAt),
        },
      });

      if (updated.count === 0) {
        return undefined;
      }

      const row = await prisma.notification.findFirst({ where });

      return row ? notificationRecordToRow(row) : undefined;
    },

    async upsertNotification({ notification, scope }) {
      const row = await prisma.notification.upsert({
        where: { id: notification.id },
        create: notificationRowToCreateData(notification, scope),
        update: notificationRowToUpdateData(notification),
      });

      return notificationRecordToRow(row);
    },

    async upsertPreference({ preference }) {
      const row = await prisma.notificationPreference.upsert({
        where: {
          tenantId_userId_category: {
            category: preference.categoryKey,
            tenantId: preference.tenantId,
            userId: preference.userId,
          },
        },
        create: preferenceRowToCreateData(preference),
        update: preferenceRowToUpdateData(preference),
      });

      return preferenceRecordToRow(row);
    },
  };
}

function notificationScopeWhere(scope: TenantScope) {
  return {
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    userId: scope.userId,
  };
}

function notificationRowToCreateData(
  row: NotificationCenterRow,
  scope: TenantScope,
) {
  return {
    body: row.body,
    category: row.categoryKey,
    companyId: scope.companyId,
    createdAt: new Date(row.createdAt),
    id: row.id,
    periodId: scope.periodId,
    priority: row.priority,
    readAt: row.readAt ? new Date(row.readAt) : null,
    targetHref: row.targetHref,
    targetLabel: row.targetLabel,
    tenantId: scope.tenantId,
    title: row.title,
    updatedAt: new Date(row.createdAt),
    userId: scope.userId,
  };
}

function notificationRowToUpdateData(row: NotificationCenterRow) {
  return {
    body: row.body,
    category: row.categoryKey,
    priority: row.priority,
    targetHref: row.targetHref,
    targetLabel: row.targetLabel,
    title: row.title,
  };
}

function preferenceRowToCreateData(row: NotificationPreferenceRow) {
  return {
    category: row.categoryKey,
    createdAt: new Date(row.createdAt),
    emailEnabled: row.emailEnabled,
    id: row.id,
    inAppEnabled: row.inAppEnabled,
    pushEnabled: row.pushEnabled,
    tenantId: row.tenantId,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
    userId: row.userId,
  };
}

function preferenceRowToUpdateData(row: NotificationPreferenceRow) {
  return {
    emailEnabled: row.emailEnabled,
    inAppEnabled: row.inAppEnabled,
    pushEnabled: row.pushEnabled,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function notificationRecordToRow(row: NotificationRecord): NotificationCenterRow {
  return {
    body: row.body,
    categoryKey: row.category as NotificationCenterRow["categoryKey"],
    createdAt: toIsoString(row.createdAt),
    id: row.id,
    priority: row.priority as NotificationPriority,
    readAt: row.readAt ? toIsoString(row.readAt) : null,
    targetHref: row.targetHref,
    targetLabel: row.targetLabel,
    title: row.title,
  };
}

function preferenceRecordToRow(
  row: NotificationPreferenceRecord,
): NotificationPreferenceRow {
  return {
    categoryKey: row.category as NotificationPreferenceRow["categoryKey"],
    createdAt: toIsoString(row.createdAt),
    emailEnabled: row.emailEnabled,
    id: row.id,
    inAppEnabled: row.inAppEnabled,
    pushEnabled: row.pushEnabled,
    tenantId: row.tenantId,
    updatedAt: toIsoString(row.updatedAt),
    updatedBy: row.updatedBy,
    userId: row.userId,
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
