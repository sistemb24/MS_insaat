import type {
  EFaturaWebhookEventRepository,
  EFaturaWebhookPayload,
} from "./e-fatura-webhook";

type EFaturaWebhookEventClient = {
  create(input: {
    data: {
      tenantId: string;
      companyId: string;
      periodId: string;
      eventId: string;
      eventType: string;
      invoiceNo: string;
      providerRef: string;
      providerStatus: string;
      receivedAt: Date;
    };
  }): Promise<unknown>;
  delete(input: {
    where: {
      tenantId_eventId: {
        eventId: string;
        tenantId: string;
      };
    };
  }): Promise<unknown>;
};

export type EFaturaWebhookPrismaClientLike = {
  eFaturaWebhookEvent: EFaturaWebhookEventClient;
};

export function createEFaturaWebhookPrismaRepository(
  prisma: EFaturaWebhookPrismaClientLike,
): EFaturaWebhookEventRepository {
  return {
    async claimEvent({ payload, receivedAt }) {
      try {
        await prisma.eFaturaWebhookEvent.create({
          data: webhookPayloadToCreateData(payload, receivedAt),
        });

        return "claimed";
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return "duplicate";
        }

        throw error;
      }
    },
    async releaseEvent({ payload }) {
      await prisma.eFaturaWebhookEvent.delete({
        where: {
          tenantId_eventId: {
            eventId: payload.eventId,
            tenantId: payload.scope.tenantId,
          },
        },
      });
    },
  };
}

function webhookPayloadToCreateData(
  payload: EFaturaWebhookPayload,
  receivedAt: string,
) {
  return {
    companyId: payload.scope.companyId,
    eventId: payload.eventId,
    eventType: payload.type,
    invoiceNo: payload.data.invoiceNo,
    periodId: payload.scope.periodId,
    providerRef: payload.data.providerRef,
    providerStatus: payload.data.providerStatus,
    receivedAt: new Date(receivedAt),
    tenantId: payload.scope.tenantId,
  };
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002",
  );
}
