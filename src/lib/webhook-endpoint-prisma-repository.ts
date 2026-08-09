import type {
  WebhookEndpointRecord,
  WebhookEndpointRepository,
  WebhookEndpointRow,
} from "./webhook-endpoint-service";

type WebhookEndpointPrismaRecord = {
  companyId: string;
  createdAt: Date | string;
  createdBy: string;
  eventTypes: unknown;
  id: string;
  isActive: boolean;
  name: string;
  periodId: string;
  secretPrefix: string;
  tenantId: string;
  updatedAt: Date | string;
  url: string;
};

type WebhookEndpointClient = {
  count(input: {
    where: { companyId: string; isActive?: boolean; periodId: string; tenantId: string; tenant?: { lifecycleStatus: "ACTIVE" } };
  }): Promise<number>;
  create(input: { data: Record<string, unknown> }): Promise<WebhookEndpointPrismaRecord>;
  findFirst(input: {
    where: {
      companyId?: string;
      id?: string;
      isActive?: boolean;
      periodId?: string;
      tenantId?: string;
      tenant?: { lifecycleStatus: "ACTIVE" };
    };
  }): Promise<WebhookEndpointPrismaRecord | null>;
  update(input: {
    data: Record<string, unknown>;
    where: { companyId?: string; id: string; periodId?: string; tenantId?: string };
  }): Promise<WebhookEndpointPrismaRecord>;
  findMany(input: {
    orderBy: Array<{ createdAt: "asc" | "desc" }>;
    where: { companyId: string; periodId: string; tenantId: string; tenant?: { lifecycleStatus: "ACTIVE" } };
  }): Promise<WebhookEndpointPrismaRecord[]>;
};

export type WebhookEndpointPrismaClientLike = {
  webhookEndpoint: WebhookEndpointClient;
};

export function createWebhookEndpointPrismaRepository(
  prisma: WebhookEndpointPrismaClientLike,
): WebhookEndpointRepository {
  return {
    async countByScope({ scope }) {
      return prisma.webhookEndpoint.count({
        where: {
          companyId: scope.companyId,
          isActive: true,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
          tenant: { lifecycleStatus: "ACTIVE" },
        },
      });
    },

    async create({ record }) {
      const created = await prisma.webhookEndpoint.create({
        data: recordToCreateData(record),
      });

      return recordToRow(created);
    },

    async deactivate({ id, scope, updatedAtIso }) {
      const existing = await prisma.webhookEndpoint.findFirst({
        where: {
          companyId: scope.companyId,
          id,
          isActive: true,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
          tenant: { lifecycleStatus: "ACTIVE" },
        },
      });

      if (!existing) {
        return null;
      }

      const updated = await prisma.webhookEndpoint.update({
        data: {
          isActive: false,
          updatedAt: new Date(updatedAtIso),
        },
        where: {
          companyId: scope.companyId,
          id: existing.id,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });

      return recordToRow(updated);
    },

    async activate({ id, scope, updatedAtIso }) {
      const existing = await prisma.webhookEndpoint.findFirst({
        where: {
          companyId: scope.companyId,
          id,
          isActive: false,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
          tenant: { lifecycleStatus: "ACTIVE" },
        },
      });

      if (!existing) {
        return null;
      }

      const updated = await prisma.webhookEndpoint.update({
        data: {
          isActive: true,
          updatedAt: new Date(updatedAtIso),
        },
        where: {
          companyId: scope.companyId,
          id: existing.id,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });

      return recordToRow(updated);
    },

    async rotateSecret({ id, scope, secretHash, secretPrefix, updatedAtIso }) {
      const existing = await prisma.webhookEndpoint.findFirst({
        where: {
          companyId: scope.companyId,
          id,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
          tenant: { lifecycleStatus: "ACTIVE" },
        },
      });

      if (!existing) {
        return null;
      }

      const updated = await prisma.webhookEndpoint.update({
        data: {
          secretHash,
          secretPrefix,
          updatedAt: new Date(updatedAtIso),
        },
        where: {
          companyId: scope.companyId,
          id: existing.id,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });

      return recordToRow(updated);
    },

    async update({ id, scope, values, updatedAtIso }) {
      const existing = await prisma.webhookEndpoint.findFirst({
        where: {
          companyId: scope.companyId,
          id,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
          tenant: { lifecycleStatus: "ACTIVE" },
        },
      });

      if (!existing) {
        return null;
      }

      const updated = await prisma.webhookEndpoint.update({
        data: {
          eventTypes: values.eventTypes,
          name: values.name,
          updatedAt: new Date(updatedAtIso),
          url: values.url,
        },
        where: {
          companyId: scope.companyId,
          id: existing.id,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });

      return recordToRow(updated);
    },

    async list({ scope }) {
      const records = await prisma.webhookEndpoint.findMany({
        orderBy: [{ createdAt: "desc" }],
        where: {
          companyId: scope.companyId,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
          tenant: { lifecycleStatus: "ACTIVE" },
        },
      });

      return records.map(recordToRow);
    },
  };
}

function recordToCreateData(record: WebhookEndpointRecord) {
  return {
    companyId: record.companyId,
    createdAt: new Date(record.createdAt),
    createdBy: record.createdBy,
    eventTypes: record.eventTypes,
    id: record.id,
    isActive: record.isActive,
    name: record.name,
    periodId: record.periodId,
    secretHash: record.secretHash,
    secretPrefix: record.secretPrefix,
    tenantId: record.tenantId,
    url: record.url,
  };
}

function recordToRow(record: WebhookEndpointPrismaRecord): WebhookEndpointRow {
  return {
    companyId: record.companyId,
    createdAt: toIsoDateTime(record.createdAt),
    createdBy: record.createdBy,
    eventTypes: Array.isArray(record.eventTypes)
      ? record.eventTypes.filter((value): value is WebhookEndpointRow["eventTypes"][number] =>
          typeof value === "string",
        )
      : [],
    id: record.id,
    isActive: record.isActive,
    name: record.name,
    periodId: record.periodId,
    secretPrefix: record.secretPrefix,
    tenantId: record.tenantId,
    updatedAt: toIsoDateTime(record.updatedAt),
    url: record.url,
  };
}

function toIsoDateTime(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
