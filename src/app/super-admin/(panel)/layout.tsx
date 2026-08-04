import type { ReactNode } from "react";
import type { Metadata } from "next";

import { requireSuperAdminSession } from "@/lib/super-admin-session";
import { SuperAdminShell } from "@/components/super-admin/shell";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: { template: "%s | NOA Admin Console", default: "NOA Admin Console" },
};

export default async function SuperAdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireSuperAdminSession();

  return (
    <SuperAdminShell admin={admin}>
      {children}
    </SuperAdminShell>
  );
}
