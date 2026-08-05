import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Bildirim Yönetimi" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [totalNotifications, unreadCount, recentNotifications] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.count({ where: { readAt: null } }),
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        tenant: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ds-on-surface)" }}>
          Bildirim Yönetimi
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
          Platform genelindeki bildirim kayıtları
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-ui-panel border p-4" style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Toplam Bildirim</p>
          <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "var(--ds-on-surface)" }}>{totalNotifications}</p>
        </div>
        <div className="rounded-ui-panel border p-4" style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Okunmamış</p>
          <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "var(--ds-info)" }}>{unreadCount}</p>
        </div>
        <div className="rounded-ui-panel border p-4" style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>Okunmuş</p>
          <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "var(--ds-success)" }}>{totalNotifications - unreadCount}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-ui-panel border" style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                {["Başlık", "Kategori", "Tenant", "Durum", "Tarih"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentNotifications.map((n) => (
                <tr key={n.id} style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                  <td className="max-w-[300px] truncate px-5 py-3.5 font-medium" style={{ color: "var(--ds-on-surface)" }}>{n.title}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--ds-surface-container)", color: "var(--ds-on-surface-variant)" }}>
                      {n.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: "var(--ds-on-surface-variant)" }}>{n.tenant.name}</td>
                  <td className="px-5 py-3.5">
                    {n.readAt ? (
                      <span className="text-xs" style={{ color: "var(--ds-success)" }}>✓ Okundu</span>
                    ) : (
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--ds-info-container)", color: "var(--ds-info)" }}>Yeni</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-xs tabular-nums" style={{ color: "var(--ds-text-muted)" }}>{n.createdAt.toLocaleDateString("tr-TR")}</td>
                </tr>
              ))}
              {recentNotifications.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm" style={{ color: "var(--ds-text-muted)" }}>Henüz bildirim bulunmuyor.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
