import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Destek Masası" };
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      tenant: { select: { name: true } },
      company: { select: { name: true } },
      _count: { select: { messages: true } },
    },
  });

  const statusColors: Record<string, { bg: string; fg: string }> = {
    OPEN: { bg: "var(--ds-info-container)", fg: "var(--ds-info)" },
    IN_PROGRESS: { bg: "var(--ds-warning-container)", fg: "var(--ds-warning)" },
    RESOLVED: { bg: "var(--ds-success-container)", fg: "var(--ds-success)" },
    CLOSED: { bg: "var(--ds-surface-container)", fg: "var(--ds-on-surface-variant)" },
  };

  const priorityColors: Record<string, { bg: string; fg: string }> = {
    LOW: { bg: "var(--ds-surface-container)", fg: "var(--ds-on-surface-variant)" },
    MEDIUM: { bg: "var(--ds-info-container)", fg: "var(--ds-info)" },
    HIGH: { bg: "var(--ds-warning-container)", fg: "var(--ds-warning)" },
    CRITICAL: { bg: "var(--ds-danger-container)", fg: "var(--ds-danger)" },
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ds-on-surface)" }}>
          Destek Masası
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
          Platform genelindeki destek talepleri (son 100)
        </p>
      </div>

      {/* Özet kartları */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Toplam", value: tickets.length, bg: "var(--ds-surface-container)" },
          { label: "Açık", value: tickets.filter((t) => t.status === "OPEN").length, bg: "var(--ds-info-container)" },
          { label: "İşlemde", value: tickets.filter((t) => t.status === "IN_PROGRESS").length, bg: "var(--ds-warning-container)" },
          { label: "Çözüldü", value: tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length, bg: "var(--ds-success-container)" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-ui-panel border p-4 text-center"
            style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}
          >
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "var(--ds-on-surface)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <section
        className="overflow-hidden rounded-ui-panel border"
        style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                {["Konu", "Tenant", "Öncelik", "Durum", "Mesajlar", "Tarih"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const sc = statusColors[ticket.status] ?? statusColors.OPEN;
                const pc = priorityColors[ticket.priority] ?? priorityColors.MEDIUM;
                return (
                  <tr key={ticket.id} style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                    <td className="max-w-[250px] truncate px-5 py-3.5 font-medium" style={{ color: "var(--ds-on-surface)" }}>
                      {ticket.subject}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "var(--ds-on-surface-variant)" }}>{ticket.tenant.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: pc.bg, color: pc.fg }}>{ticket.priority}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: sc.bg, color: sc.fg }}>{ticket.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center tabular-nums" style={{ color: "var(--ds-on-surface)" }}>{ticket._count.messages}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs tabular-nums" style={{ color: "var(--ds-text-muted)" }}>
                      {ticket.createdAt.toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                );
              })}
              {tickets.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: "var(--ds-text-muted)" }}>Henüz destek talebi bulunmuyor.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
