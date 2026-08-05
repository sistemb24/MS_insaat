"use client";

import Link from "next/link";

import { Button } from "./button";
import { SurfaceState } from "./surface-state";

export function RouteErrorState({
  description = "İçerik güvenli biçimde yüklenemedi. İşlemi yeniden deneyebilirsiniz.",
  homeHref = "/landing",
  unstable_retry,
}: {
  description?: string;
  error?: Error & { digest?: string };
  homeHref?: string;
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6" data-route-state="error">
      <SurfaceState
        actions={
          <>
            <Button onClick={unstable_retry}>Tekrar Dene</Button>
            <Link
              className="inline-flex min-h-10 items-center rounded-ui-control border border-divider bg-surface-raised px-4 py-2 text-sm font-semibold text-content"
              href={homeHref}
            >
              Güvenli başlangıca dön
            </Link>
          </>
        }
        description={description}
        kind="error"
        title="Bu bölüm yüklenemedi"
      />
    </div>
  );
}
