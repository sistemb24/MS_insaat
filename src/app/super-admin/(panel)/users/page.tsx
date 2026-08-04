import type { Metadata } from "next";

import { PlatformListControls } from "@/components/super-admin/platform-list-controls";
import { prisma } from "@/lib/prisma";
import { createSuperAdminPlatformReadModel } from "@/lib/super-admin-platform-read-model";

export const metadata: Metadata = { title: "Kullanıcı Yönetimi" };
export const dynamic = "force-dynamic";

type UsersPageProps = {
  searchParams?: Promise<{ page?: string; q?: string; sort?: string }>;
};

const readModel = createSuperAdminPlatformReadModel(prisma);

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const users = await readModel.listUsers({
    page: params?.page,
    query: params?.q,
    sort: params?.sort,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ds-on-surface)" }}>
            Kullanıcı Yönetimi
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
            Platform genelindeki tüm kullanıcılar
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
          Toplam: {users.total} kullanıcı
        </div>
      </div>

      <PlatformListControls
        page={users.page}
        path="/super-admin/users"
        query={users.query}
        sort={users.sort}
        sortOptions={[
          { label: "En yeni", value: "created-desc" },
          { label: "Ada göre", value: "name-asc" },
        ]}
        totalPages={users.totalPages}
      />

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
                {["Kullanıcı", "E-Posta", "Tenant", "Roller", "Kayıt Tarihi"].map((h) => (
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
              {users.rows.map((user) => {
                return (
                  <tr
                    key={user.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{
                            background: "var(--ds-primary-fixed)",
                            color: "var(--ds-on-primary-fixed)",
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold" style={{ color: "var(--ds-on-surface)" }}>
                            {user.name}
                          </p>
                          <p className="mt-0.5 text-xs" style={{ color: "var(--ds-text-muted)" }}>
                            Kimlik bilgisi maskelendi
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "var(--ds-on-surface)" }}>
                      {user.email}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "var(--ds-on-surface)" }}>
                      {user.tenantName}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => {
                          const roleColors: Record<string, { bg: string; fg: string }> = {
                            admin: { bg: "var(--ds-primary-fixed)", fg: "var(--ds-on-primary-fixed)" },
                            accounting: { bg: "var(--ds-success-container)", fg: "var(--ds-success)" },
                            viewer: { bg: "var(--ds-surface-container)", fg: "var(--ds-on-surface-variant)" },
                          };
                          const colors = roleColors[role] ?? roleColors.viewer;
                          return (
                            <span
                              key={role}
                              className="rounded-full px-2 py-0.5 text-xs font-semibold"
                              style={{ background: colors.bg, color: colors.fg }}
                            >
                              {role}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs tabular-nums" style={{ color: "var(--ds-text-muted)" }}>
                      {user.createdAt.toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                );
              })}
              {users.rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm" style={{ color: "var(--ds-text-muted)" }}>
                    Henüz kullanıcı kaydı bulunmuyor.
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
