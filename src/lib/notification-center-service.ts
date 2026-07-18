import type { TenantScope } from "./tenant-scope";
import type { ChequeRow } from "./cheque-service";
import type { EntityRow } from "./entities";
import type { StockDepotSummaryRow } from "./stock-depot-service";
import type { VehicleCardRow } from "./vehicle-service";

export type NotificationCategoryKey =
  | "masraf-yonetimi"
  | "avans-yonetimi"
  | "transfer-islemleri"
  | "stok-yonetimi"
  | "arac-yonetimi"
  | "risk-limitleri"
  | "vade-bildirimleri"
  | "sozlesme-yonetimi"
  | "board-gorevler"
  | "tedarik-satin-alma"
  | "butce-yonetimi"
  | "insan-kaynaklari"
  | "destek-sistemi";

export type NotificationPriority = "Düşük" | "Normal" | "Yüksek" | "Kritik";

export type NotificationCategory = {
  key: NotificationCategoryKey;
  label: string;
  triggerSummary: string;
};

export type NotificationCenterRow = {
  id: string;
  categoryKey: NotificationCategoryKey;
  title: string;
  body: string;
  createdAt: string;
  priority: NotificationPriority;
  readAt: string | null;
  targetHref: string;
  targetLabel: string;
};

export type NotificationPreferenceRow = {
  id: string;
  tenantId: string;
  userId: string;
  categoryKey: NotificationCategoryKey;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

export type NotificationCenterResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export type NotificationCenterRepository = {
  listNotifications(input: {
    scope: TenantScope;
  }): Promise<NotificationCenterRow[]>;
  listPreferences(input: {
    scope: TenantScope;
  }): Promise<NotificationPreferenceRow[]>;
  markAsRead(input: {
    notificationId: string;
    readAt: string;
    scope: TenantScope;
  }): Promise<NotificationCenterRow | undefined>;
  upsertNotification(input: {
    notification: NotificationCenterRow;
    scope: TenantScope;
  }): Promise<NotificationCenterRow>;
  upsertPreference(input: {
    preference: NotificationPreferenceRow;
    scope: TenantScope;
  }): Promise<NotificationPreferenceRow>;
};

export type StockMinimumThreshold = {
  minimumQuantity: number;
  stockCode?: string;
  stockName?: string;
  warehouse: string;
};

export type NotificationSummary = {
  totalCount: number;
  unreadCount: number;
  todayCount: number;
  weekCount: number;
};

export type NotificationCategoryStat = NotificationCategory & {
  enabled: boolean;
  totalCount: number;
  unreadCount: number;
};

export type NotificationPriorityStat = {
  label: NotificationPriority;
  count: number;
};

export type NotificationCenterModel = {
  categories: NotificationCategory[];
  categoryStats: NotificationCategoryStat[];
  priorityStats: NotificationPriorityStat[];
  rows: NotificationCenterRow[];
  summary: NotificationSummary;
};

const notificationCategories: NotificationCategory[] = [
  {
    key: "masraf-yonetimi",
    label: "Masraf Yönetimi",
    triggerSummary: "Yeni masraf talebi, onay/ret",
  },
  {
    key: "avans-yonetimi",
    label: "Avans Yönetimi",
    triggerSummary: "Avans ödeme tarihi, geri ödeme hatırlatması",
  },
  {
    key: "transfer-islemleri",
    label: "Transfer İşlemleri",
    triggerSummary: "Personel, malzeme ve araç transferleri",
  },
  {
    key: "stok-yonetimi",
    label: "Stok Yönetimi",
    triggerSummary: "Düşük stok uyarısı, minimum seviye aşımı",
  },
  {
    key: "arac-yonetimi",
    label: "Araç Yönetimi",
    triggerSummary: "Sigorta, muayene, bakım hatırlatmaları",
  },
  {
    key: "risk-limitleri",
    label: "Risk Limitleri",
    triggerSummary: "Cari hesap risk limiti aşımı",
  },
  {
    key: "vade-bildirimleri",
    label: "Vade Bildirimleri",
    triggerSummary: "Çek, senet, ödeme vadesi yaklaşan",
  },
  {
    key: "sozlesme-yonetimi",
    label: "Sözleşme Yönetimi",
    triggerSummary: "Sözleşme yenileme tarihi, ceza bildirimi",
  },
  {
    key: "board-gorevler",
    label: "Board & Görevler",
    triggerSummary: "Görev ataması, deadline uyarısı",
  },
  {
    key: "tedarik-satin-alma",
    label: "Tedarik & Satın Alma",
    triggerSummary: "Satın alma talebi, sipariş onayı",
  },
  {
    key: "butce-yonetimi",
    label: "Bütçe Yönetimi",
    triggerSummary: "Yemek ve şantiye bütçe aşımı",
  },
  {
    key: "insan-kaynaklari",
    label: "İnsan Kaynakları",
    triggerSummary: "Puantaj ve bordro bildirimleri",
  },
  {
    key: "destek-sistemi",
    label: "Destek Sistemi",
    triggerSummary: "Destek talebi yanıtı",
  },
];

const notificationPriorities: NotificationPriority[] = [
  "Düşük",
  "Normal",
  "Yüksek",
  "Kritik",
];

export function listNotificationCategories() {
  return notificationCategories;
}

export function createNotificationCenterService({
  now = () => new Date().toISOString(),
  repository,
}: {
  now?: () => string;
  repository: NotificationCenterRepository;
}) {
  return {
    async ensureSeedNotifications({
      scope,
    }: {
      scope: TenantScope;
    }): Promise<NotificationCenterResult<{ rows: NotificationCenterRow[] }>> {
      return this.ensureGeneratedNotifications({
        notifications: createSeedNotificationRows(),
        scope,
      });
    },

    async ensureGeneratedNotifications({
      notifications,
      scope,
    }: {
      notifications: NotificationCenterRow[];
      scope: TenantScope;
    }): Promise<NotificationCenterResult<{ rows: NotificationCenterRow[] }>> {
      const rows = [];

      for (const notification of notifications) {
        rows.push(
          await repository.upsertNotification({
            notification,
            scope,
          }),
        );
      }

      return {
        ok: true,
        data: { rows },
      };
    },

    async list({
      scope,
      today,
    }: {
      scope: TenantScope;
      today?: string;
    }): Promise<
      NotificationCenterResult<{
        enabledCategoryKeys: NotificationCategoryKey[];
        model: NotificationCenterModel;
        preferences: NotificationPreferenceRow[];
        rows: NotificationCenterRow[];
      }>
    > {
      const [rows, preferences] = await Promise.all([
        repository.listNotifications({ scope }),
        repository.listPreferences({ scope }),
      ]);
      const enabledCategoryKeys = getEnabledNotificationCategoryKeys(preferences);

      return {
        ok: true,
        data: {
          enabledCategoryKeys,
          model: buildNotificationCenterModel({
            enabledCategoryKeys,
            rows,
            today,
          }),
          preferences,
          rows,
        },
      };
    },

    async markAsRead({
      notificationId,
      scope,
    }: {
      notificationId: string;
      scope: TenantScope;
    }): Promise<
      NotificationCenterResult<{ notification: NotificationCenterRow }>
    > {
      const notification = await repository.markAsRead({
        notificationId,
        readAt: now(),
        scope,
      });

      if (!notification) {
        return {
          ok: false,
          errors: ["Bildirim bulunamadı."],
        };
      }

      return {
        ok: true,
        data: { notification },
      };
    },

    async setPreference({
      categoryKey,
      inAppEnabled,
      scope,
    }: {
      categoryKey: string;
      inAppEnabled: boolean;
      scope: TenantScope;
    }): Promise<
      NotificationCenterResult<{ preference: NotificationPreferenceRow }>
    > {
      if (!isNotificationCategoryKey(categoryKey)) {
        return {
          ok: false,
          errors: ["Geçersiz bildirim kategorisi."],
        };
      }

      const updatedAt = now();
      const preference: NotificationPreferenceRow = {
        categoryKey,
        createdAt: updatedAt,
        emailEnabled: false,
        id: createNotificationPreferenceId(scope, categoryKey),
        inAppEnabled,
        pushEnabled: false,
        tenantId: scope.tenantId,
        updatedAt,
        updatedBy: scope.userId,
        userId: scope.userId,
      };

      return {
        ok: true,
        data: {
          preference: await repository.upsertPreference({
            preference,
            scope,
          }),
        },
      };
    },
  };
}

export function buildNotificationCenterModel({
  enabledCategoryKeys,
  rows,
  today = new Date().toISOString().slice(0, 10),
}: {
  enabledCategoryKeys?: NotificationCategoryKey[];
  rows: NotificationCenterRow[];
  today?: string;
}): NotificationCenterModel {
  const enabledKeySet = createEnabledCategorySet(enabledCategoryKeys);
  const visibleRows = rows
    .filter((row) => enabledKeySet.has(row.categoryKey))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    categories: notificationCategories,
    categoryStats: notificationCategories.map((category) => {
      const categoryRows = rows.filter((row) => row.categoryKey === category.key);

      return {
        ...category,
        enabled: enabledKeySet.has(category.key),
        totalCount: categoryRows.length,
        unreadCount: categoryRows.filter(isUnreadNotification).length,
      };
    }),
    priorityStats: notificationPriorities.map((priority) => ({
      label: priority,
      count: visibleRows.filter((row) => row.priority === priority).length,
    })),
    rows: visibleRows,
    summary: {
      totalCount: visibleRows.length,
      unreadCount: visibleRows.filter(isUnreadNotification).length,
      todayCount: visibleRows.filter((row) => isSameDate(row.createdAt, today)).length,
      weekCount: visibleRows.filter((row) => isWithinCurrentWeek(row.createdAt, today)).length,
    },
  };
}

export function getUnreadNotificationCount(
  rows: NotificationCenterRow[],
  enabledCategoryKeys?: NotificationCategoryKey[],
) {
  const enabledKeySet = createEnabledCategorySet(enabledCategoryKeys);

  return rows.filter(
    (row) => enabledKeySet.has(row.categoryKey) && isUnreadNotification(row),
  ).length;
}

export function createOperationalNotificationRows({
  cheques = [],
  contractWarningDays = 30,
  dueWarningDays = 7,
  stockMinimums = [],
  stockSummaryRows = [],
  subcontractorRows = [],
  vehicleCards = [],
  today,
}: {
  cheques?: ChequeRow[];
  contractWarningDays?: number;
  dueWarningDays?: number;
  stockMinimums?: StockMinimumThreshold[];
  stockSummaryRows?: StockDepotSummaryRow[];
  subcontractorRows?: EntityRow[];
  vehicleCards?: VehicleCardRow[];
  today: string;
}): NotificationCenterRow[] {
  const createdAt = `${today}T08:00:00.000Z`;
  const chequeNotifications = cheques.flatMap((cheque) => {
    if (cheque.status !== "Portföyde") {
      return [];
    }

    const dayDiff = getDateDiffInDays(cheque.dueDate, today);

    if (dayDiff < 0 || dayDiff > dueWarningDays) {
      return [];
    }

    return [
      {
        body: `${cheque.checkNo} numaralı çekin vadesine ${dayDiff} gün kaldı.`,
        categoryKey: "vade-bildirimleri" as const,
        createdAt,
        id: `notification-domain-cheque-${normalizeNotificationIdPart(
          cheque.documentNo,
        )}`,
        priority: dayDiff <= 3 ? "Kritik" as const : "Yüksek" as const,
        readAt: null,
        targetHref: `/cek?evrak=${encodeURIComponent(cheque.documentNo)}`,
        targetLabel: cheque.documentNo,
        title: "Çek vadesi yaklaşıyor",
      },
    ];
  });
  const contractNotifications = subcontractorRows.flatMap((row) => {
    if (row.status && row.status !== "Aktif") {
      return [];
    }

    const contractEndDate = row.contractEndDate?.trim();

    if (!contractEndDate) {
      return [];
    }

    const dayDiff = getDateDiffInDays(contractEndDate, today);

    if (dayDiff < 0 || dayDiff > contractWarningDays) {
      return [];
    }

    const code = row.code?.trim() || row.contractNo?.trim() || row.name?.trim();

    if (!code) {
      return [];
    }

    return [
      {
        body: `${row.name || code} sözleşmesi ${dayDiff} gün içinde sona eriyor.`,
        categoryKey: "sozlesme-yonetimi" as const,
        createdAt,
        id: `notification-domain-contract-${normalizeNotificationIdPart(code)}`,
        priority: dayDiff <= 7 ? "Kritik" as const : "Yüksek" as const,
        readAt: null,
        targetHref: `/taseronlar?evrak=${encodeURIComponent(code)}`,
        targetLabel: row.contractNo?.trim() || code,
        title: "Taşeron sözleşmesi yaklaşıyor",
      },
    ];
  });
  const stockNotifications = stockMinimums.flatMap((threshold) => {
    const row = stockSummaryRows.find((summary) =>
      matchesStockMinimum(summary, threshold),
    );

    if (!row || row.balanceQuantity >= threshold.minimumQuantity) {
      return [];
    }

    const stockIdentifier = row.stockCode || row.stockName;

    return [
      {
        body: `${row.warehouse} deposunda ${row.stockName} stoğu ${formatQuantity(
          row.balanceQuantity,
        )} ${row.unit}, minimum ${formatQuantity(
          threshold.minimumQuantity,
        )} ${row.unit}.`,
        categoryKey: "stok-yonetimi" as const,
        createdAt,
        id: `notification-domain-stock-${normalizeNotificationIdPart(
          row.warehouse,
        )}-${normalizeNotificationIdPart(stockIdentifier)}`,
        priority: "Yüksek" as const,
        readAt: null,
        targetHref: `/stok-depo?evrak=${encodeURIComponent(stockIdentifier)}`,
        targetLabel: stockIdentifier,
        title: "Minimum stok seviyesi aşıldı",
      },
    ];
  });
  const vehicleNotifications = vehicleCards.flatMap((vehicle) => {
    if (vehicle.status !== "Aktif") return [];
    return [
      { date: vehicle.insuranceEndDate, label: "Sigorta", title: "Sigorta süresi yaklaşıyor" },
      { date: vehicle.inspectionEndDate, label: "Muayene", title: "Muayene süresi yaklaşıyor" },
      { date: vehicle.maintenanceDueDate, label: "Bakım", title: "Yaklaşan bakım" },
    ].flatMap((item) => {
      if (!item.date) return [];
      const dayDiff = getDateDiffInDays(item.date, today);
      if (dayDiff < -30 || dayDiff > 30) return [];
      const expired = dayDiff < 0;
      const notificationId = `notification-domain-vehicle-${normalizeNotificationIdPart(vehicle.id)}-${item.label.toLowerCase()}`;
      return [{
        body: expired
          ? `${vehicle.plate} ${item.label.toLowerCase()} süresi ${item.date} tarihinde doldu.`
          : `${vehicle.plate} ${item.label.toLowerCase()} süresi ${item.date} tarihinde doluyor (${dayDiff} gün).`,
        categoryKey: "arac-yonetimi" as const,
        createdAt,
        id: notificationId,
        priority: expired || dayDiff <= 7 ? "Kritik" as const : "Yüksek" as const,
        readAt: null,
        targetHref: `/araclar?plaka=${encodeURIComponent(vehicle.plate)}`,
        targetLabel: vehicle.plate,
        title: item.title,
      }];
    });
  });

  return [
    ...chequeNotifications,
    ...contractNotifications,
    ...stockNotifications,
    ...vehicleNotifications,
  ];
}

export function getEnabledNotificationCategoryKeys(
  preferences: NotificationPreferenceRow[],
): NotificationCategoryKey[] {
  const preferenceByCategory = new Map(
    preferences.map((preference) => [preference.categoryKey, preference]),
  );

  return notificationCategories
    .filter((category) => preferenceByCategory.get(category.key)?.inAppEnabled !== false)
    .map((category) => category.key);
}

export function createSeededNotificationMemoryRepository({
  notifications = createSeedNotificationRows(),
  preferences = [],
}: {
  notifications?: NotificationCenterRow[];
  preferences?: NotificationPreferenceRow[];
} = {}): NotificationCenterRepository {
  const notificationRows = [...notifications];
  const preferenceRows = [...preferences];

  return {
    async listNotifications() {
      return [...notificationRows];
    },

    async listPreferences({ scope }) {
      return preferenceRows.filter(
        (preference) =>
          preference.tenantId === scope.tenantId &&
          preference.userId === scope.userId,
      );
    },

    async markAsRead({ notificationId, readAt }) {
      const index = notificationRows.findIndex((row) => row.id === notificationId);

      if (index === -1) {
        return undefined;
      }

      notificationRows[index] = {
        ...notificationRows[index],
        readAt,
      };

      return notificationRows[index];
    },

    async upsertNotification({ notification }) {
      const index = notificationRows.findIndex((row) => row.id === notification.id);

      if (index === -1) {
        notificationRows.push(notification);

        return notification;
      }

      notificationRows[index] = {
        ...notification,
        readAt: notificationRows[index].readAt ?? notification.readAt,
      };

      return notification;
    },

    async upsertPreference({ preference, scope }) {
      const index = preferenceRows.findIndex(
        (row) =>
          row.tenantId === scope.tenantId &&
          row.userId === scope.userId &&
          row.categoryKey === preference.categoryKey,
      );

      if (index === -1) {
        preferenceRows.push(preference);

        return preference;
      }

      preferenceRows[index] = {
        ...preferenceRows[index],
        emailEnabled: preference.emailEnabled,
        inAppEnabled: preference.inAppEnabled,
        pushEnabled: preference.pushEnabled,
        updatedAt: preference.updatedAt,
        updatedBy: preference.updatedBy,
      };

      return preferenceRows[index];
    },
  };
}

export function createSeedNotificationRows(): NotificationCenterRow[] {
  return [
    {
      id: "notification-vade-cheque-001",
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
      id: "notification-stock-minimum-001",
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
      id: "notification-expense-approval-001",
      categoryKey: "masraf-yonetimi",
      title: "Masraf talebi onay bekliyor",
      body: "GDR-2026-004 saha masrafı onay bekliyor.",
      createdAt: "2026-06-21T12:00:00.000Z",
      priority: "Normal",
      readAt: null,
      targetHref: "/giderler?evrak=GDR-2026-004",
      targetLabel: "GDR-2026-004",
    },
    {
      id: "notification-contract-renewal-001",
      categoryKey: "sozlesme-yonetimi",
      title: "Taşeron sözleşmesi yenileme tarihi",
      body: "TSR-2026-014 sözleşme bitiş tarihi bu ay içinde.",
      createdAt: "2026-07-01T13:15:00.000Z",
      priority: "Yüksek",
      readAt: null,
      targetHref: "/taseronlar?evrak=TSR-2026-014",
      targetLabel: "TSR-2026-014",
    },
  ];
}

function createEnabledCategorySet(enabledCategoryKeys?: NotificationCategoryKey[]) {
  return new Set(enabledCategoryKeys?.length ? enabledCategoryKeys : notificationCategories.map((category) => category.key));
}

function createNotificationPreferenceId(
  scope: TenantScope,
  categoryKey: NotificationCategoryKey,
) {
  return `${scope.tenantId}::${scope.userId}::notification-preference::${categoryKey}`;
}

function isNotificationCategoryKey(value: string): value is NotificationCategoryKey {
  return notificationCategories.some((category) => category.key === value);
}

function isUnreadNotification(row: NotificationCenterRow) {
  return row.readAt === null;
}

function isSameDate(value: string, today: string) {
  return value.slice(0, 10) === today;
}

function isWithinCurrentWeek(value: string, today: string) {
  const start = Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);
  const end = Date.parse(`${today}T00:00:00.000Z`);
  const dayDiff = Math.floor((end - start) / 86_400_000);

  return dayDiff >= 0 && dayDiff <= 6;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(value);
}

function getDateDiffInDays(targetDate: string, today: string) {
  const target = Date.parse(`${targetDate.slice(0, 10)}T00:00:00.000Z`);
  const base = Date.parse(`${today.slice(0, 10)}T00:00:00.000Z`);

  return Math.floor((target - base) / 86_400_000);
}

function matchesStockMinimum(
  row: StockDepotSummaryRow,
  threshold: StockMinimumThreshold,
) {
  const thresholdStock = threshold.stockCode || threshold.stockName || "";
  const rowStock = row.stockCode || row.stockName;

  return row.warehouse === threshold.warehouse && rowStock === thresholdStock;
}

function normalizeNotificationIdPart(value: string) {
  return (
    value
      .trim()
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "G")
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "O")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "U")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "kayit"
  );
}
