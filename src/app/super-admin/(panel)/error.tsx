"use client";

import { RouteErrorState } from "@/components/ui/route-error-state";

export default function SuperAdminError(
  props: Parameters<typeof RouteErrorState>[0],
) {
  return <RouteErrorState {...props} homeHref="/super-admin" />;
}
