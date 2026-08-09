import { PRODUCTION_RETENTION_GLOBAL_RULES } from "./production-retention-policy";

export const TENANT_LIFECYCLE_STATUSES = [
  "ACTIVE",
  "FROZEN",
  "CLOSURE_PENDING",
] as const;

export type TenantLifecycleStatus =
  (typeof TENANT_LIFECYCLE_STATUSES)[number];

export type TenantLifecycleAction =
  | "FREEZE"
  | "UNFREEZE"
  | "BEGIN_CLOSURE"
  | "CANCEL_CLOSURE";

export const TENANT_LEGAL_HOLD_STATUSES = ["ACTIVE", "RELEASED"] as const;
export type TenantLegalHoldStatus =
  (typeof TENANT_LEGAL_HOLD_STATUSES)[number];

export const TENANT_LEGAL_HOLD_REVIEW_DAYS =
  PRODUCTION_RETENTION_GLOBAL_RULES.periodicDestructionIntervalDays;

export type TenantMutationResult = {
  applied: boolean;
  reason?: string;
  replayed?: boolean;
  [key: string]: unknown;
};

export type TenantLifecycleRepository = {
  transition(input: {
    actorCredentialId: string;
    expectedVersion: number;
    occurredAt: Date;
    operationId: string;
    tenantId: string;
    toStatus: TenantLifecycleStatus;
  }): Promise<TenantMutationResult>;
  placeLegalHold(input: {
    actorCredentialId: string;
    occurredAt: Date;
    operationId: string;
    reasonCode: string;
    referenceId: string;
    reviewAt: Date;
    tenantId: string;
  }): Promise<TenantMutationResult>;
  releaseLegalHold(input: {
    actorCredentialId: string;
    expectedVersion: number;
    occurredAt: Date;
    operationId: string;
    referenceId: string;
    tenantId: string;
  }): Promise<TenantMutationResult>;
};

export function isTenantAccessAllowed(status: string) {
  return status === "ACTIVE";
}

export function resolveTenantLifecycleAction(
  fromStatus: TenantLifecycleStatus,
  toStatus: TenantLifecycleStatus,
): TenantLifecycleAction {
  const transition = `${fromStatus}->${toStatus}`;

  switch (transition) {
    case "ACTIVE->FROZEN":
      return "FREEZE";
    case "FROZEN->ACTIVE":
      return "UNFREEZE";
    case "ACTIVE->CLOSURE_PENDING":
    case "FROZEN->CLOSURE_PENDING":
      return "BEGIN_CLOSURE";
    case "CLOSURE_PENDING->ACTIVE":
    case "CLOSURE_PENDING->FROZEN":
      return "CANCEL_CLOSURE";
    default:
      throw new Error("Tenant yaşam döngüsü geçişine izin verilmiyor.");
  }
}

export function createTenantLifecycleService(input: {
  now?: () => Date;
  repository: TenantLifecycleRepository;
}) {
  const now = input.now ?? (() => new Date());

  return {
    transitionTenant(value: {
      actorCredentialId: string;
      expectedVersion: number;
      operationId: string;
      tenantId: string;
      toStatus: TenantLifecycleStatus;
    }) {
      validateCommonMutation(value);
      assertPositiveVersion(value.expectedVersion);
      if (!TENANT_LIFECYCLE_STATUSES.includes(value.toStatus)) {
        throw new Error("Tenant yaşam döngüsü durumu geçerli değil.");
      }

      return input.repository.transition({ ...value, occurredAt: now() });
    },

    placeLegalHold(value: {
      actorCredentialId: string;
      operationId: string;
      reasonCode: string;
      referenceId: string;
      tenantId: string;
    }) {
      validateCommonMutation(value);
      assertSafeReference(value.referenceId, "Legal hold referansı");
      if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(value.reasonCode)) {
        throw new Error("Legal hold neden kodu geçerli değil.");
      }

      const occurredAt = now();
      const reviewAt = new Date(
        occurredAt.getTime() + TENANT_LEGAL_HOLD_REVIEW_DAYS * 86_400_000,
      );

      return input.repository.placeLegalHold({
        ...value,
        occurredAt,
        reviewAt,
      });
    },

    releaseLegalHold(value: {
      actorCredentialId: string;
      expectedVersion: number;
      operationId: string;
      referenceId: string;
      tenantId: string;
    }) {
      validateCommonMutation(value);
      assertPositiveVersion(value.expectedVersion);
      assertSafeReference(value.referenceId, "Legal hold referansı");

      return input.repository.releaseLegalHold({ ...value, occurredAt: now() });
    },
  };
}

function validateCommonMutation(value: {
  actorCredentialId: string;
  operationId: string;
  tenantId: string;
}) {
  assertSafeReference(value.actorCredentialId, "Super Admin kimliği");
  assertSafeReference(value.operationId, "İşlem kimliği");
  assertSafeReference(value.tenantId, "Tenant kimliği");
}

function assertSafeReference(value: string, label: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/.test(value)) {
    throw new Error(`${label} güvenli değil.`);
  }
}

function assertPositiveVersion(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error("Beklenen sürüm geçerli değil.");
  }
}
