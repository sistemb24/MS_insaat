import type { Metadata } from "next";

import { PlatformListControls } from "@/components/super-admin/platform-list-controls";
import { prisma } from "@/lib/prisma";
import { createSuperAdminPlatformReadModel } from "@/lib/super-admin-platform-read-model";

export const metadata: Metadata = { title: "Sistem Logları" };
export const dynamic = "force-dynamic";

type LogsPageProps = {
  searchParams?: Promise<{ page?: string; q?: string; sort?: string }>;
};

const readModel = createSuperAdminPlatformReadModel(prisma);

export default async function LogsPage({ searchParams }: LogsPageProps) {
  const params = await searchParams;
  const logs = await readModel.listAuditLogs({
    page: params?.page,
    query: params?.q,
    sort: params?.sort,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ds-on-surface)" }}>
          Sistem Logları
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
          Platform genelindeki minimize edilmiş denetim kayıtları ({logs.total} kayıt)
        </p>
      </div>

      <PlatformListControls
        page={logs.page}
        path="/super-admin/loglar"
        query={logs.query}
        sort={logs.sort}
        sortOptions={[
          { label: "En yeni", value: "occurred-desc" },
          { label: "En eski", value: "occurred-asc" },
        ]}
        totalPages={logs.totalPages}
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
                {["Tarih / Saat", "İşlem", "Varlık Tipi", "Varlık", "Tenant", "Firma"].map((h) => (
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
              {logs.rows.map((log) => {
                const actionColors: Record<string, { bg: string; fg: string }> = {
                  CREATE: { bg: "var(--ds-success-container)", fg: "var(--ds-success)" },
                  UPDATE: { bg: "var(--ds-info-container)", fg: "var(--ds-info)" },
                  DELETE: { bg: "var(--ds-danger-container)", fg: "var(--ds-danger)" },
                };
                const actionWord = log.action.split("_")[0] ?? log.action;
                const colors = actionColors[actionWord] ?? {
                  bg: "var(--ds-surface-container)",
                  fg: "var(--ds-on-surface-variant)",
                };
                return (
                  <tr
                    key={log.id}
                    style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs tabular-nums" style={{ color: "var(--ds-text-muted)" }}>
                      {log.occurredAt.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: colors.bg, color: colors.fg }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium" style={{ color: "var(--ds-on-surface)" }}>
                      {log.entityType}
                    </td>
                    <td className="max-w-[200px] truncate px-5 py-3 text-xs" style={{ color: "var(--ds-on-surface)" }}>
                      {log.entityLabel}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--ds-on-surface-variant)" }}>
                      {log.tenantName}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--ds-on-surface-variant)" }}>
                      {log.companyName}
                    </td>
                  </tr>
                );
              })}
              {logs.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: "var(--ds-text-muted)" }}>
                    Henüz log kaydı bulunmuyor.
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
