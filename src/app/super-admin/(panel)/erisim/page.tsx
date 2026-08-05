import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { redactSensitiveText } from "@/lib/super-admin-platform-read-model";

export const metadata: Metadata = { title: "Erişim Kontrol" };
export const dynamic = "force-dynamic";

export default async function AccessControlPage() {
  const [accessProfiles, sessions, saSession] = await Promise.all([
    prisma.accessProfile.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        tenant: { select: { name: true } },
        company: { select: { name: true } },
        _count: { select: { assignments: true } },
      },
    }),
    prisma.appSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        role: true,
        createdAt: true,
        tenant: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.superAdminSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        ipAddress: true,
        lastActiveAt: true,
        userAgent: true,
        credential: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ds-on-surface)" }}>
          Erişim Kontrol
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
          Yetki profilleri, aktif oturumlar ve erişim kayıtları
        </p>
      </div>

      {/* Yetki profilleri */}
      <section className="overflow-hidden rounded-ui-panel border" style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}>
        <header className="px-5 py-4" style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--ds-on-surface)" }}>Yetki Profilleri ({accessProfiles.length})</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                {["Profil Adı", "Tenant", "Firma", "Durum", "Atama Sayısı"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accessProfiles.map((profile) => (
                <tr key={profile.id} style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                  <td className="px-5 py-3 font-medium" style={{ color: "var(--ds-on-surface)" }}>{profile.name}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--ds-on-surface-variant)" }}>{profile.tenant.name}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--ds-on-surface-variant)" }}>{profile.company.name}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{
                      background: profile.status === "ACTIVE" ? "var(--ds-success-container)" : "var(--ds-surface-container)",
                      color: profile.status === "ACTIVE" ? "var(--ds-success)" : "var(--ds-on-surface-variant)",
                    }}>{profile.status}</span>
                  </td>
                  <td className="px-5 py-3 tabular-nums" style={{ color: "var(--ds-on-surface)" }}>{profile._count.assignments}</td>
                </tr>
              ))}
              {accessProfiles.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm" style={{ color: "var(--ds-text-muted)" }}>Yetki profili bulunmuyor.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Aktif SA oturumları */}
      <section className="overflow-hidden rounded-ui-panel border" style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}>
        <header className="px-5 py-4" style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--ds-on-surface)" }}>Süper Admin Oturumları ({saSession.length})</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                {["Admin", "IP Adresi", "User-Agent", "Oluşturulma", "Son Aktif", "Son Kullanım"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {saSession.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                  <td className="px-5 py-3 font-medium" style={{ color: "var(--ds-on-surface)" }}>{s.credential.name}</td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: "var(--ds-text-muted)" }}>{s.ipAddress ? redactSensitiveText(s.ipAddress) : "—"}</td>
                  <td className="max-w-[200px] truncate px-5 py-3 text-xs" style={{ color: "var(--ds-text-muted)" }}>{s.userAgent ? "Kayıtlı (gizlendi)" : "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs tabular-nums" style={{ color: "var(--ds-text-muted)" }}>{s.createdAt.toLocaleString("tr-TR")}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs tabular-nums" style={{ color: "var(--ds-text-muted)" }}>{s.lastActiveAt.toLocaleString("tr-TR")}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs tabular-nums" style={{ color: "var(--ds-text-muted)" }}>{s.expiresAt.toLocaleString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Son kullanıcı oturumları */}
      <section className="overflow-hidden rounded-ui-panel border" style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}>
        <header className="px-5 py-4" style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--ds-on-surface)" }}>Son Kullanıcı Oturumları (son 20)</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                {["Kullanıcı", "Tenant", "Rol", "Oluşturulma"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
                  <td className="px-5 py-3 font-medium" style={{ color: "var(--ds-on-surface)" }}>{s.user.name}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--ds-on-surface-variant)" }}>{s.tenant.name}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--ds-primary-fixed)", color: "var(--ds-on-primary-fixed)" }}>{s.role}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs tabular-nums" style={{ color: "var(--ds-text-muted)" }}>{s.createdAt.toLocaleString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
