import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Raporlar" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [
    tenantCount,
    companyCount,
    userCount,
    invoiceCount,
    ticketCount,
    subscriptionCount,
    auditLogCount,
    expenseCount,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.company.count(),
    prisma.appUser.count(),
    prisma.purchaseInvoice.count(),
    prisma.supportTicket.count(),
    prisma.tenantSubscription.count(),
    prisma.auditLog.count(),
    prisma.expense.count(),
  ]);

  const reportCards = [
    { title: "Tenant Sayısı", value: tenantCount, icon: "🏢", color: "var(--ds-primary)" },
    { title: "Firma Sayısı", value: companyCount, icon: "🏗️", color: "var(--ds-primary)" },
    { title: "Kullanıcı Sayısı", value: userCount, icon: "👥", color: "var(--ds-info)" },
    { title: "Fatura Sayısı", value: invoiceCount, icon: "📄", color: "var(--ds-success)" },
    { title: "Gider Kaydı", value: expenseCount, icon: "💰", color: "var(--ds-warning)" },
    { title: "Destek Talebi", value: ticketCount, icon: "🎫", color: "var(--ds-accent-orange)" },
    { title: "Abonelik", value: subscriptionCount, icon: "📦", color: "var(--ds-accent-violet)" },
    { title: "Audit Log", value: auditLogCount, icon: "📋", color: "var(--ds-on-surface-variant)" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ds-on-surface)" }}>
          Platform Raporları
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
          Platform genelindeki kayıt sayıları ve istatistikler
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reportCards.map((card) => (
          <article
            key={card.title}
            className="rounded-ui-panel border p-5 transition-shadow hover:shadow-md"
            style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{card.icon}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>
                  {card.title}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums" style={{ color: card.color }}>
                  {card.value.toLocaleString("tr-TR")}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Tenant bazlı dağılım */}
      <section
        className="rounded-ui-panel border"
        style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}
      >
        <header className="px-5 py-4" style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--ds-on-surface)" }}>
            Veri Özeti
          </h2>
        </header>
        <div className="divide-y" style={{ borderColor: "var(--ds-outline-variant)" }}>
          {[
            { label: "Ortalama kullanıcı/tenant", value: tenantCount > 0 ? (userCount / tenantCount).toFixed(1) : "0" },
            { label: "Ortalama firma/tenant", value: tenantCount > 0 ? (companyCount / tenantCount).toFixed(1) : "0" },
            { label: "Toplam fatura", value: invoiceCount.toLocaleString("tr-TR") },
            { label: "Toplam gider kaydı", value: expenseCount.toLocaleString("tr-TR") },
            { label: "Toplam denetim kaydı", value: auditLogCount.toLocaleString("tr-TR") },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm" style={{ color: "var(--ds-on-surface-variant)" }}>{row.label}</span>
              <span className="font-mono text-sm font-bold tabular-nums" style={{ color: "var(--ds-on-surface)" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
