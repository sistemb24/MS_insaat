import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { prisma } from "@/lib/prisma";
import {
  processSubscriptionPaymentWebhook,
  type SubscriptionPaymentWebhookRepository,
} from "@/lib/subscription-payment-webhook";
import {
  createSubscriptionPrismaRepository,
  type SubscriptionPrismaClientLike,
} from "@/lib/subscription-prisma-repository";

export const runtime = "nodejs";

const subscriptionRepository = createSubscriptionPrismaRepository(
  prisma as unknown as SubscriptionPrismaClientLike,
);
const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

export async function POST(request: Request) {
  const secret = process.env.NOA_PAYMENT_WEBHOOK_SECRET;

  if (!secret?.trim()) {
    return Response.json(
      {
        ok: false,
        errors: ["Ödeme sağlayıcı webhook secret yapılandırılmamış."],
      },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const result = await processSubscriptionPaymentWebhook({
    auditLogRepository,
    rawBody,
    repository: subscriptionRepository as SubscriptionPaymentWebhookRepository,
    secret,
    signatureHeader: request.headers.get("x-noa-payment-signature"),
  });

  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }

  if (result.data.status !== "duplicate") {
    revalidateSubscriptionSurfaces();
  }

  return Response.json(result);
}

function revalidateSubscriptionSurfaces() {
  revalidatePath("/abonelik");
  revalidatePath("/ayarlar");
  revalidatePath("/[module]", "page");
}
