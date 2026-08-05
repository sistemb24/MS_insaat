"use server";

import {
  createGlobalSearchPrismaRepository,
  type GlobalSearchPrismaClientLike,
} from "@/lib/global-search-prisma-repository";
import { prepareGlobalSearchQuery, type GlobalSearchResponse } from "@/lib/global-search-domain";
import { prisma } from "@/lib/prisma";
import { requireActiveSessionState } from "@/lib/server-active-scope";
import {
  createSubscriptionPrismaRepository,
  type SubscriptionPrismaClientLike,
} from "@/lib/subscription-prisma-repository";
import { listSubscriptionOverview } from "@/lib/subscription-service";

export type GlobalSearchActionResult =
  | {
      data: GlobalSearchResponse;
      ok: true;
    }
  | {
      code: "invalid-query" | "search-failed";
      message: string;
      ok: false;
    };

export type GlobalSearchAction = (
  query: string,
) => Promise<GlobalSearchActionResult>;

const globalSearchRepository = createGlobalSearchPrismaRepository(
  prisma as unknown as GlobalSearchPrismaClientLike,
);
const subscriptionRepository = createSubscriptionPrismaRepository(
  prisma as unknown as SubscriptionPrismaClientLike,
);

export async function globalSearchAction(
  query: string,
): Promise<GlobalSearchActionResult> {
  const activeSession = await requireActiveSessionState();
  const validation = prepareGlobalSearchQuery(query);

  if (!validation.valid) {
    return {
      code: "invalid-query",
      message:
        validation.reason === "too-short"
          ? "Arama için en az 2 karakter yazın."
          : "Arama en fazla 80 karakter olabilir.",
      ok: false,
    };
  }

  try {
    const snapshot = await subscriptionRepository.getCurrentSnapshot({
      scope: activeSession.scope,
    });
    const result = await globalSearchRepository.search({
      query: validation.query,
      scope: activeSession.scope,
      subscriptionOverview: listSubscriptionOverview(snapshot),
    });

    if ("valid" in result) {
      return {
        code: "invalid-query",
        message: "Arama sorgusu geçerli değil.",
        ok: false,
      };
    }

    return {
      data: result,
      ok: true,
    };
  } catch {
    return {
      code: "search-failed",
      message: "Arama şu anda tamamlanamadı. Lütfen yeniden deneyin.",
      ok: false,
    };
  }
}
