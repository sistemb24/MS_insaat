import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import {
  createEFaturaWebhookPrismaRepository,
  type EFaturaWebhookPrismaClientLike,
} from "@/lib/e-fatura-webhook-prisma-repository";
import { processEFaturaWebhook } from "@/lib/e-fatura-webhook";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);
const eventRepository = createEFaturaWebhookPrismaRepository(
  prisma as unknown as EFaturaWebhookPrismaClientLike,
);

export async function POST(request: Request) {
  const secret = process.env.NOA_EFATURA_WEBHOOK_SECRET;

  if (!secret?.trim()) {
    return Response.json(
      {
        ok: false,
        errors: ["E-Fatura webhook secret yapılandırılmamış."],
      },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const result = await processEFaturaWebhook({
    auditLogRepository,
    eventRepository,
    rawBody,
    secret,
    signatureHeader: request.headers.get("x-noa-e-fatura-signature"),
  });

  if (!result.ok) {
    return Response.json(result, { status: result.retryable ? 500 : 400 });
  }

  if (result.data.status !== "duplicate") {
    revalidatePath("/e-fatura-yonetimi");
  }

  return Response.json(result);
}
