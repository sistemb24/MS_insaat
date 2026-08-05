import {
  createAccessProfilePrismaRepository,
  type AccessProfilePrismaClientLike,
} from "./access-profile-prisma-repository";
import { createAccessProfileService } from "./access-profile-service";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "./audit-log-prisma-repository";
import { prisma } from "./prisma";

export const accessProfileRepository = createAccessProfilePrismaRepository(
  prisma as unknown as AccessProfilePrismaClientLike,
);

export const accessProfileService = createAccessProfileService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: accessProfileRepository,
});
