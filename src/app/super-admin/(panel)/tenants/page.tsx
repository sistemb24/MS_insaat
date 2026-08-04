import type { Metadata } from "next";

import { PlatformListControls } from "@/components/super-admin/platform-list-controls";
import { prisma } from "@/lib/prisma";
import { createSuperAdminPlatformReadModel } from "@/lib/super-admin-platform-read-model";

export const metadata: Metadata = { title: "Tenant Yönetimi" };
export const dynamic = "force-dynamic";

type TenantsPageProps = {
  searchParams?: Promise<{ page?: string; q?: string; sort?: string }>;
};

const readModel = createSuperAdminPlatformReadModel(prisma);

export default async function TenantsPage({ searchParams }: TenantsPageProps) {
  const params = await searchParams;
  const tenants = await readModel.listTenants({
    page: params?.page,
    query: params?.q,
    sort: params?.sort,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ds-on-surface)" }}>
            Tenant Yönetimi
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
            Platform üzerindeki tüm tenant (kiracı) ve firma kayıtları
          </p>
        </div>
        <div
          className="flex h-10 items-center rounded-ui-control border px-4 text-sm font-semibold"
          style={{
            borderColor: "var(--ds-outline-variant)",
            background: "var(--ds-surface-raised)",
            color: "var(--ds-on-surface)",
          }}
        >
          Toplam: {tenants.total} tenant
        </div>
      </div>

      <PlatformListControls
        page={tenants.page}
        path="/super-admin/tenants"
        query={tenants.query}
        sort={tenants.sort}
        sortOptions={[
          { label: "En yeni", value: "created-desc" },
          { label: "Ada göre", value: "name-asc" },
        ]}
        totalPages={tenants.totalPages}
      />

      {/* Tenant tablosu */}
      <section
        className="overflow-hidden rounded-ui-panel border"
        style={{
          borderColor: "var(--ds-outline-variant)",
          background: "var(--ds-surface-raised)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                {["Tenant Adı", "Firmalar", "Kullanıcılar", "Oturumlar", "Abonelikler", "Oluşturulma"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--ds-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.rows.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}
                >
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-semibold" style={{ color: "var(--ds-on-surface)" }}>
                        {tenant.name}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--ds-text-muted)" }}>
                        {tenant.companyCount} firma
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="space-y-0.5">
                      {tenant.companyNames.map((companyName) => (
                        <span
                          key={companyName}
                          className="mr-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: "var(--ds-primary-fixed)",
                            color: "var(--ds-on-primary-fixed)",
                          }}
                        >
                          {companyName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 tabular-nums" style={{ color: "var(--ds-on-surface)" }}>
                    {tenant.userCount}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums" style={{ color: "var(--ds-on-surface)" }}>
                    {tenant.sessionCount}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums" style={{ color: "var(--ds-on-surface)" }}>
                    {tenant.subscriptionCount}
                  </td>
                  <td className="px-5 py-3.5 text-xs tabular-nums" style={{ color: "var(--ds-text-muted)" }}>
                    {tenant.createdAt.toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))}
              {tenants.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: "var(--ds-text-muted)" }}>
                    Henüz tenant kaydı bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
