import type { PrismaClient } from "@prisma/client";

import {
  isTenantAccessAllowed,
  resolveTenantLifecycleAction,
  type TenantLifecycleRepository,
  type TenantLifecycleStatus,
} from "./tenant-lifecycle";

export function createTenantLifecyclePrismaRepository(
  prisma: PrismaClient,
): TenantLifecycleRepository {
  return {
    async transition(input) {
      return prisma.$transaction(async (tx) => {
        const replay = await tx.tenantLifecycleEvent.findUnique({
          where: { operationId: input.operationId },
        });
        if (replay) {
          return replay.tenantId === input.tenantId &&
            replay.actorCredentialId === input.actorCredentialId &&
            replay.toStatus === input.toStatus
            ? { applied: false, event: replay, replayed: true }
            : { applied: false, reason: "operation-conflict" };
        }

        const tenant = await tx.tenant.findUnique({
          where: { id: input.tenantId },
          select: { lifecycleStatus: true, lifecycleVersion: true },
        });
        if (!tenant) return { applied: false, reason: "tenant-not-found" };
        if (tenant.lifecycleVersion !== input.expectedVersion) {
          return { applied: false, reason: "version-conflict" };
        }

        const fromStatus = normalizeLifecycleStatus(tenant.lifecycleStatus);
        const action = resolveTenantLifecycleAction(fromStatus, input.toStatus);
        const nextVersion = tenant.lifecycleVersion + 1;
        const updated = await tx.tenant.updateMany({
          where: {
            id: input.tenantId,
            lifecycleStatus: fromStatus,
            lifecycleVersion: input.expectedVersion,
          },
          data: {
            frozenAt: input.toStatus === "FROZEN" ? input.occurredAt : null,
            frozenByCredentialId:
              input.toStatus === "FROZEN" ? input.actorCredentialId : null,
            lifecycleStatus: input.toStatus,
            lifecycleVersion: nextVersion,
          },
        });
        if (updated.count !== 1) {
          return { applied: false, reason: "version-conflict" };
        }

        let revokedSessionCount = 0;
        if (!isTenantAccessAllowed(input.toStatus)) {
          const revoked = await tx.appAuthSession.updateMany({
            where: {
              revokedAt: null,
              scopeSession: { tenantId: input.tenantId },
            },
            data: { revokedAt: input.occurredAt },
          });
          revokedSessionCount = revoked.count;
        }

        const event = await tx.tenantLifecycleEvent.create({
          data: {
            action,
            actorCredentialId: input.actorCredentialId,
            fromStatus,
            lifecycleVersion: nextVersion,
            occurredAt: input.occurredAt,
            operationId: input.operationId,
            tenantId: input.tenantId,
            toStatus: input.toStatus,
          },
        });

        return { applied: true, event, replayed: false, revokedSessionCount };
      });
    },

    async placeLegalHold(input) {
      return prisma.$transaction(async (tx) => {
        const replay = await tx.tenantLegalHoldEvent.findUnique({
          where: { operationId: input.operationId },
        });
        if (replay) {
          return replay.tenantId === input.tenantId &&
            replay.actorCredentialId === input.actorCredentialId &&
            replay.action === "PLACE"
            ? { applied: false, event: replay, replayed: true }
            : { applied: false, reason: "operation-conflict" };
        }

        const tenant = await tx.tenant.findUnique({
          where: { id: input.tenantId },
          select: { id: true },
        });
        if (!tenant) return { applied: false, reason: "tenant-not-found" };

        const existing = await tx.tenantLegalHold.findUnique({
          where: {
            tenantId_referenceId: {
              referenceId: input.referenceId,
              tenantId: input.tenantId,
            },
          },
        });
        if (existing) return { applied: false, reason: "reference-conflict" };

        const legalHold = await tx.tenantLegalHold.create({
          data: {
            createdByCredentialId: input.actorCredentialId,
            reasonCode: input.reasonCode,
            referenceId: input.referenceId,
            reviewAt: input.reviewAt,
            startsAt: input.occurredAt,
            status: "ACTIVE",
            tenantId: input.tenantId,
            version: 1,
          },
        });
        const event = await tx.tenantLegalHoldEvent.create({
          data: {
            action: "PLACE",
            actorCredentialId: input.actorCredentialId,
            legalHoldId: legalHold.id,
            legalHoldVersion: 1,
            occurredAt: input.occurredAt,
            operationId: input.operationId,
            status: "ACTIVE",
            tenantId: input.tenantId,
          },
        });

        return { applied: true, event, legalHold, replayed: false };
      });
    },

    async releaseLegalHold(input) {
      return prisma.$transaction(async (tx) => {
        const replay = await tx.tenantLegalHoldEvent.findUnique({
          where: { operationId: input.operationId },
        });
        if (replay) {
          return replay.tenantId === input.tenantId &&
            replay.actorCredentialId === input.actorCredentialId &&
            replay.action === "RELEASE"
            ? { applied: false, event: replay, replayed: true }
            : { applied: false, reason: "operation-conflict" };
        }

        const legalHold = await tx.tenantLegalHold.findUnique({
          where: {
            tenantId_referenceId: {
              referenceId: input.referenceId,
              tenantId: input.tenantId,
            },
          },
        });
        if (!legalHold) return { applied: false, reason: "legal-hold-not-found" };
        if (
          legalHold.status !== "ACTIVE" ||
          legalHold.version !== input.expectedVersion
        ) {
          return { applied: false, reason: "version-conflict" };
        }

        const nextVersion = legalHold.version + 1;
        const updated = await tx.tenantLegalHold.updateMany({
          where: {
            id: legalHold.id,
            status: "ACTIVE",
            version: input.expectedVersion,
          },
          data: {
            releasedAt: input.occurredAt,
            releasedByCredentialId: input.actorCredentialId,
            status: "RELEASED",
            version: nextVersion,
          },
        });
        if (updated.count !== 1) {
          return { applied: false, reason: "version-conflict" };
        }

        const event = await tx.tenantLegalHoldEvent.create({
          data: {
            action: "RELEASE",
            actorCredentialId: input.actorCredentialId,
            legalHoldId: legalHold.id,
            legalHoldVersion: nextVersion,
            occurredAt: input.occurredAt,
            operationId: input.operationId,
            status: "RELEASED",
            tenantId: input.tenantId,
          },
        });

        return { applied: true, event, replayed: false };
      });
    },
  };
}

function normalizeLifecycleStatus(value: string): TenantLifecycleStatus {
  if (
    value === "ACTIVE" ||
    value === "FROZEN" ||
    value === "CLOSURE_PENDING"
  ) {
    return value;
  }

  throw new Error("Tenant yaşam döngüsü durumu bilinmiyor; erişim kapatıldı.");
}
