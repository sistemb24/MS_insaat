"use server";

import {
  createHrDashboardPrismaRepository,
  type HrDashboardPrismaClientLike,
} from "@/lib/hr-dashboard-prisma-repository";
import { buildHrDashboardSnapshot } from "@/lib/hr-dashboard";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { requireActiveSessionState } from "@/lib/server-active-scope";

const repository = createHrDashboardPrismaRepository(
  prisma as unknown as HrDashboardPrismaClientLike,
);

export async function getHrDashboardAction() {
  try {
    const { scope } = await requireActiveSessionState();
    await ensureTenantScope(prisma, scope);
    const sources = await repository.loadSources({ scope });
    return {
      data: buildHrDashboardSnapshot({
        asOfDate: istanbulDateOnly(),
        sources,
      }),
      ok: true as const,
    };
  } catch {
    return {
      errors: ["İK operasyon özeti yüklenemedi."],
      ok: false as const,
    };
  }
}

function istanbulDateOnly(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Istanbul",
    year: "numeric",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}
