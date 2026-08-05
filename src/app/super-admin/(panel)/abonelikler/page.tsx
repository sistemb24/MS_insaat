import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Abonelik Yönetimi" };
export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const subscriptions = await prisma.tenantSubscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tenant: { select: { name: true } },
      company: { select: { name: true } },
      plan: { select: { id: true, name: true } },
      _count: { select: { invoices: true } },
    },
  });

  const statusColors: Record<string, { bg: string; fg: string }> = {
    ACTIVE: { bg: "var(--ds-success-container)", fg: "var(--ds-success)" },
    TRIAL: { bg: "var(--ds-info-container)", fg: "var(--ds-info)" },
    CANCELLED: { bg: "var(--ds-danger-container)", fg: "var(--ds-danger)" },
    EXPIRED: { bg: "var(--ds-warning-container)", fg: "var(--ds-warning)" },
    PAST_DUE: { bg: "var(--ds-danger-container)", fg: "var(--ds-danger)" },
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ds-on-surface)" }}>
          Abonelik Yönetimi
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
          Tüm tenant abonelik planları ve faturalandırma durumu
        </p>
      </div>

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
                {["Tenant", "Firma", "Plan", "Döngü", "Durum", "Başlangıç", "Bitiş", "Kullanıcı Limiti", "Faturalar"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => {
                const colors = statusColors[sub.status] ?? statusColors.EXPIRED;
                return (
                  <tr key={sub.id} style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--ds-on-surface)" }}>{sub.tenant.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--ds-on-surface-variant)" }}>{sub.company.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--ds-primary-fixed)", color: "var(--ds-on-primary-fixed)" }}>
                        {sub.plan.name ?? sub.planId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: "var(--ds-on-surface)" }}>{sub.billingCycle}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: colors.bg, color: colors.fg }}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--ds-text-muted)" }}>{sub.startsAt.toLocaleDateString("tr-TR")}</td>
                    <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--ds-text-muted)" }}>{sub.endsAt.toLocaleDateString("tr-TR")}</td>
                    <td className="px-4 py-3 text-center tabular-nums" style={{ color: "var(--ds-on-surface)" }}>{sub.userLimit}</td>
                    <td className="px-4 py-3 text-center tabular-nums" style={{ color: "var(--ds-on-surface)" }}>{sub._count.invoices}</td>
                  </tr>
                );
              })}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm" style={{ color: "var(--ds-text-muted)" }}>
                    Henüz abonelik kaydı bulunmuyor.
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
