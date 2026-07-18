"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { prisma } from "@/lib/prisma";
import {
  createTenderPrismaRepository,
  type TenderPrismaClientLike,
} from "@/lib/tender-prisma-repository";
import {
  createTenderService,
  type TenderBoqUpdateValues,
  type TenderCreateValues,
  type TenderSiteConversionValues,
  type TenderStatus,
} from "@/lib/tender-service";

import { getSubscriptionFeatureActionContext } from "./subscription-feature-action-guard";

const entityCrudService = createEntityCrudService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
  repository: createEntityPrismaRepository(prisma),
});

const tenderRepository = createTenderPrismaRepository(
  prisma as unknown as TenderPrismaClientLike,
);
const tenderService = createTenderService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
  repository: tenderRepository,
});

export async function listTendersAction() {
  const context = await getTenderActionContext();

  if (!context.ok) {
    return context.result;
  }

  return tenderService.list({ scope: context.scope });
}

export async function createTenderAction(values: TenderCreateValues) {
  const context = await getTenderActionContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await tenderService.create({ scope: context.scope, values });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/");
  revalidatePath("/ihale-yonetimi");

  return result;
}

export async function transitionTenderStatusAction(
  tenderId: string,
  status: TenderStatus,
) {
  const context = await getTenderActionContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await tenderService.transitionStatus({
    scope: context.scope,
    status,
    tenderId,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/");
  revalidatePath("/ihale-yonetimi");

  return result;
}

export async function updateTenderBoqAction(
  tenderId: string,
  values: TenderBoqUpdateValues,
) {
  const context = await getTenderActionContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await tenderService.updateBoq({
    scope: context.scope,
    tenderId,
    values,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/");
  revalidatePath("/ihale-yonetimi");

  return result;
}

export async function convertTenderToSiteAction(
  tenderId: string,
  values: TenderSiteConversionValues,
) {
  const context = await getTenderActionContext();

  if (!context.ok) {
    return context.result;
  }

  const tenders = await tenderService.list({ scope: context.scope });

  if (!tenders.ok) {
    return tenders;
  }

  const tender = tenders.data.rows.find((row) => row.id === tenderId);

  if (!tender) {
    return { ok: false as const, errors: ["İhale kaydı bulunamadı."] };
  }

  if (tender.status !== "Kazanıldı") {
    return {
      ok: false as const,
      errors: ["Yalnız kazanılmış ihaleden şantiye oluşturulabilir."],
    };
  }

  if (tender.convertedSiteCode) {
    return {
      ok: false as const,
      errors: ["Bu ihale zaten şantiye kartına bağlanmış."],
    };
  }

  const siteList = await entityCrudService.list({
    scope: context.scope,
    slug: "santiyeler",
  });

  if (!siteList.ok) {
    return siteList;
  }

  const siteCode = values.siteCode.trim() || siteList.data.nextCode;
  const siteName = values.siteName.trim() || tender.title;
  const siteCreate = await entityCrudService.create({
    scope: context.scope,
    slug: "santiyeler",
    values: {
      balance: "0,00 TL",
      code: siteCode,
      name: siteName,
      projectAmount: formatSiteProjectAmount(
        values.projectAmount && values.projectAmount > 0
          ? values.projectAmount
          : tender.contractValue || tender.bidValue,
      ),
      responsible: values.responsible?.trim() ?? "",
      status: "Aktif",
    },
  });

  if (!siteCreate.ok) {
    return siteCreate;
  }

  const result = await tenderService.convertToSite({
    scope: context.scope,
    tenderId,
    values: {
      ...values,
      siteCode: siteCreate.data.code,
      siteName: siteCreate.data.name,
    },
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/");
  revalidatePath("/ihale-yonetimi");
  revalidatePath("/santiyeler");

  return result;
}

function formatSiteProjectAmount(value: number | undefined) {
  const amount = Number.isFinite(value) ? Number(value) : 0;

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount)} TL`;
}

function getTenderActionContext() {
  return getSubscriptionFeatureActionContext("tender-management");
}
