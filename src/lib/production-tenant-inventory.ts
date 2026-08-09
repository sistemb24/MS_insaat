import { createHash } from "node:crypto";

import {
  PRODUCTION_RETENTION_POLICY_VERSION,
  REQUIRED_RETENTION_CATEGORIES,
  approvedRetentionDecisionId,
  type RetentionCategory,
} from "./production-retention-policy";
import type { TenantLifecycleStatus } from "./tenant-lifecycle";

export const PRODUCTION_TENANT_INVENTORY_SCHEMA_VERSION = 1;

export const PRODUCTION_TENANT_NON_DIRECT_MODEL_ALLOWLIST = {
  AccessProfilePermission: "tenant-scoped-parent",
  AppAuthSession: "tenant-scoped-parent",
  ConstructionMeasurementImportEvent: "tenant-scoped-parent",
  ConstructionMeasurementImportRow: "tenant-scoped-parent",
  ConstructionSimulationLine: "tenant-scoped-parent",
  ConstructionSimulationRevision: "tenant-scoped-parent",
  DeliveryNoteLine: "tenant-scoped-parent",
  MaintenanceConfig: "platform-global",
  PayrollAccrualLine: "tenant-scoped-parent",
  ProgressPaymentLine: "tenant-scoped-parent",
  PurchaseInvoiceLine: "tenant-scoped-parent",
  SalesInvoiceLine: "tenant-scoped-parent",
  SubscriptionAddon: "platform-global",
  SubscriptionPlan: "platform-global",
  SuperAdminAccountLock: "platform-global",
  SuperAdminAuthChallenge: "platform-global",
  SuperAdminCredential: "platform-global",
  SuperAdminOtpCode: "platform-global",
  SuperAdminPasswordResetToken: "platform-global",
  SuperAdminRateLimitBucket: "platform-global",
  SuperAdminSession: "platform-global",
  SuperAdminTotpSecret: "platform-global",
  Tenant: "tenant-root-snapshot",
  TenantLoginRateLimitBucket: "non-reversible-hash-scope",
  TenderBoqLine: "tenant-scoped-parent",
  TimesheetLine: "tenant-scoped-parent",
} as const satisfies Record<
  string,
  | "non-reversible-hash-scope"
  | "platform-global"
  | "tenant-root-snapshot"
  | "tenant-scoped-parent"
>;

export const PRODUCTION_TENANT_MODEL_GROUPS = {
  "identity-and-contact": [
    "AppUser",
    "Company",
    "CompanyLocation",
    "CompanyProfile",
    "CustomerType",
  ],
  "authentication-and-access": [
    "AccessProfile",
    "ApiKey",
    "AppCredential",
    "AppSession",
    "AppUserScopeAccess",
    "UserAccessProfileAssignment",
    "UserInvitation",
  ],
  "audit-and-security": [
    "AuditLog",
    "TenantLegalHold",
    "TenantLegalHoldEvent",
    "TenantLifecycleEvent",
  ],
  "finance-and-accounting": [
    "BankLedgerEntry",
    "BankTransaction",
    "CashBankMovement",
    "Cheque",
    "ConstructionAccountingLink",
    "ConstructionApprovalEvent",
    "ConstructionContractItem",
    "ConstructionContractItemPriceRevision",
    "ConstructionDeductionMovement",
    "ConstructionDeductionRule",
    "ConstructionDeductionRuleApplication",
    "ConstructionExtraWork",
    "ConstructionFinancialMovement",
    "ConstructionMeasurementImportBatch",
    "ConstructionMeasurementLine",
    "ConstructionMeasurementSheet",
    "ConstructionPaymentItemSnapshot",
    "ConstructionProgressPayment",
    "ConstructionProject",
    "ConstructionSimulationScenario",
    "DeliveryNote",
    "Expense",
    "FinanceSetting",
    "LedgerEntry",
    "LedgerLine",
    "Period",
    "ProgressPayment",
    "PurchaseInvoice",
    "SalesInvoice",
    "StockMinimumSetting",
    "StockMovement",
    "SubscriptionInvoice",
    "SupplierCategory",
    "TenantSubscription",
    "TenantSubscriptionAddon",
    "Tender",
    "Vehicle",
    "VehicleFuelRecord",
    "VehicleMaintenancePlan",
    "VehicleMaintenanceRecord",
    "VehicleTireRecord",
  ],
  personnel: [
    "EmployeeAdvanceRequest",
    "EmployeeAdvanceSettlement",
    "EmployeeLeaveBalance",
    "EmployeeLeaveRequest",
    "EmployeeTransfer",
    "PayrollAccrual",
    "PersonnelAssetAssignment",
    "SafetyChecklistResponse",
    "SafetyChecklistRun",
    "SafetyChecklistTemplate",
    "SafetyChecklistTemplateItem",
    "SafetyFinding",
    "SafetyInspection",
    "SafetyPpeIssuance",
    "SafetyTraining",
    "SafetyTrainingAttendance",
    "SafetyWorkAccident",
    "Timesheet",
    "VehicleAssignment",
  ],
  documents: [
    "CompanyBrandAsset",
    "DocumentFile",
    "DocumentFolder",
    "EntityRecord",
  ],
  "integrations-and-webhooks": [
    "BankIntegrationConnection",
    "EFaturaWebhookEvent",
    "SubscriptionPaymentWebhookEvent",
    "WebhookEndpoint",
  ],
  "support-and-communications": [
    "Announcement",
    "EmailOutbox",
    "Notification",
    "NotificationPreference",
    "SupportTicket",
    "SupportTicketMessage",
  ],
  backups: [],
} as const satisfies Record<RetentionCategory, readonly string[]>;

export type ProductionTenantModel =
  (typeof PRODUCTION_TENANT_MODEL_GROUPS)[RetentionCategory][number];

export const PRODUCTION_TENANT_MODEL_CATEGORIES = Object.freeze(
  Object.fromEntries(
    REQUIRED_RETENTION_CATEGORIES.flatMap((category) =>
      PRODUCTION_TENANT_MODEL_GROUPS[category].map((model) => [model, category]),
    ),
  ) as Record<ProductionTenantModel, RetentionCategory>,
);

export const PRODUCTION_TENANT_MODELS = Object.freeze(
  Object.keys(PRODUCTION_TENANT_MODEL_CATEGORIES).sort() as ProductionTenantModel[],
);

export type ProductionTenantModelCount = {
  count: number;
  model: ProductionTenantModel;
};

export type ProductionTenantInventorySnapshot = {
  activeLegalHoldCount: number;
  activeSessionCount: number;
  lifecycleStatus: TenantLifecycleStatus;
  lifecycleVersion: number;
};

export type ProductionTenantDocumentInventory = {
  metadataCount: number;
  objectHeadVerifiedCount: number;
  storageKeyCount: number;
  totalSizeBytes: number;
};

export type ProductionTenantDocumentMetadata = {
  sizeBytes: number;
  storageKey: string;
};

export type ProductionTenantInventoryDatabaseRead = {
  documents: readonly ProductionTenantDocumentMetadata[];
  modelCounts: readonly ProductionTenantModelCount[];
  tenant: ProductionTenantInventorySnapshot | null;
};

export type ProductionTenantInventoryRepositoryPort = {
  readTenantInventory(input: {
    activeAt: Date;
    models: readonly ProductionTenantModel[];
    tenantId: string;
  }): Promise<ProductionTenantInventoryDatabaseRead>;
};

export type ProductionTenantObjectHeadPort = {
  headObjects(input: {
    storageKeys: readonly string[];
  }): Promise<readonly { exists: boolean; sizeBytes: number; storageKey: string }[]>;
};

export function buildProductionTenantInventoryManifest(input: {
  documents: ProductionTenantDocumentInventory;
  generatedAt: Date;
  modelCounts: readonly ProductionTenantModelCount[];
  releaseId: string;
  tenant: ProductionTenantInventorySnapshot;
  tenantId: string;
}) {
  const tenantId = normalizeIdentifier(input.tenantId, "Tenant kimliği");
  const releaseId = normalizeIdentifier(input.releaseId, "Release kimliği");
  const generatedAt = normalizeDate(input.generatedAt);
  validateSnapshot(input.tenant);
  validateDocuments(input.documents);

  const counts = normalizeModelCounts(input.modelCounts);
  const documentFileCount = counts.get("DocumentFile") ?? 0;
  if (input.documents.metadataCount !== documentFileCount) {
    throw new Error("Doküman metadata sayısı DocumentFile envanteriyle eşleşmiyor.");
  }

  const models = PRODUCTION_TENANT_MODELS.map((model) => ({
    category: PRODUCTION_TENANT_MODEL_CATEGORIES[model],
    count: counts.get(model) ?? 0,
    model,
  }));
  const categories = REQUIRED_RETENTION_CATEGORIES.map((category) => {
    const categoryModels = models.filter((entry) => entry.category === category);
    return {
      category,
      decisionId: approvedRetentionDecisionId(category),
      modelCount: categoryModels.length,
      recordCount: sumSafe(categoryModels.map((entry) => entry.count)),
    };
  });

  const payload = {
    categories,
    documents: { ...input.documents },
    generatedAt,
    models,
    readOnly: true as const,
    releaseId,
    retentionPolicyVersion: PRODUCTION_RETENTION_POLICY_VERSION,
    schemaVersion: PRODUCTION_TENANT_INVENTORY_SCHEMA_VERSION,
    tenant: { ...input.tenant },
    tenantId,
  };
  const canonicalJson = JSON.stringify(payload);

  return {
    ...payload,
    checksum: createHash("sha256").update(canonicalJson).digest("hex"),
  };
}

function normalizeModelCounts(rows: readonly ProductionTenantModelCount[]) {
  const counts = new Map<ProductionTenantModel, number>();

  for (const row of rows) {
    if (!Object.hasOwn(PRODUCTION_TENANT_MODEL_CATEGORIES, row.model)) {
      throw new Error("Tenant model envanteri bilinmeyen model içeriyor.");
    }
    if (counts.has(row.model)) {
      throw new Error("Tenant model envanteri tekrar eden model içeriyor.");
    }
    assertNonNegativeInteger(row.count, `${row.model} kayıt sayısı`);
    counts.set(row.model, row.count);
  }

  const missing = PRODUCTION_TENANT_MODELS.filter((model) => !counts.has(model));
  if (missing.length > 0) {
    throw new Error(`Tenant model envanteri eksik: ${missing.join(", ")}`);
  }

  return counts;
}

function validateSnapshot(snapshot: ProductionTenantInventorySnapshot) {
  if (!(["ACTIVE", "FROZEN", "CLOSURE_PENDING"] as const).includes(snapshot.lifecycleStatus)) {
    throw new Error("Tenant yaşam döngüsü durumu geçerli değil.");
  }
  assertPositiveInteger(snapshot.lifecycleVersion, "Tenant yaşam döngüsü sürümü");
  assertNonNegativeInteger(snapshot.activeSessionCount, "Aktif oturum sayısı");
  assertNonNegativeInteger(snapshot.activeLegalHoldCount, "Aktif legal hold sayısı");
}

function validateDocuments(documents: ProductionTenantDocumentInventory) {
  assertNonNegativeInteger(documents.metadataCount, "Doküman metadata sayısı");
  assertNonNegativeInteger(documents.storageKeyCount, "Doküman storage key sayısı");
  assertNonNegativeInteger(
    documents.objectHeadVerifiedCount,
    "Doğrulanan doküman nesnesi sayısı",
  );
  assertNonNegativeInteger(documents.totalSizeBytes, "Doküman toplam byte değeri");

  if (
    documents.metadataCount !== documents.storageKeyCount ||
    documents.storageKeyCount !== documents.objectHeadVerifiedCount
  ) {
    throw new Error("Doküman metadata/storage/head envanteri eşleşmiyor.");
  }
}

function normalizeIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/.test(normalized)) {
    throw new Error(`${label} güvenli değil.`);
  }
  return normalized;
}

function normalizeDate(value: Date) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("Envanter üretim zamanı geçerli değil.");
  }
  return value.toISOString();
}

function assertNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} geçerli değil.`);
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} geçerli değil.`);
  }
}

function sumSafe(values: readonly number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total)) {
    throw new Error("Tenant envanter toplamı güvenli tam sayı sınırını aşıyor.");
  }
  return total;
}
