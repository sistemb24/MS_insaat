import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Sistem Ayarları" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [maintenanceConfig, saCredential, tenantCount, userCount] = await Promise.all([
    prisma.maintenanceConfig.findFirst(),
    prisma.superAdminCredential.findFirst({
      select: { email: true, name: true, is2FAEnabled: true, createdAt: true, updatedAt: true },
    }),
    prisma.tenant.count(),
    prisma.appUser.count(),
  ]);

  const settingSections = [
    {
      title: "Platform Bilgileri",
      icon: "🏗️",
      items: [
        { label: "Platform Adı", value: "NOA İnşaat Yönetim" },
        { label: "Sürüm", value: "v0.1.0" },
        { label: "Toplam Tenant", value: String(tenantCount) },
        { label: "Toplam Kullanıcı", value: String(userCount) },
      ],
    },
    {
      title: "Süper Admin Hesabı",
      icon: "🔐",
      items: [
        { label: "Ad Soyad", value: saCredential?.name ?? "—" },
        { label: "E-Posta", value: saCredential?.email ?? "—" },
        { label: "2FA Durumu", value: saCredential?.is2FAEnabled ? "Aktif" : "Pasif" },
        { label: "Oluşturulma", value: saCredential?.createdAt.toLocaleDateString("tr-TR") ?? "—" },
        { label: "Son Güncelleme", value: saCredential?.updatedAt.toLocaleDateString("tr-TR") ?? "—" },
      ],
    },
    {
      title: "Bakım Modu",
      icon: "🔧",
      items: [
        { label: "Durum", value: maintenanceConfig?.isActive ? "AKTİF" : "Pasif" },
        { label: "Mesaj", value: maintenanceConfig?.message ?? "Ayarlanmamış" },
        { label: "Bitiş", value: maintenanceConfig?.endsAt?.toLocaleString("tr-TR") ?? "—" },
        { label: "Durum URL", value: maintenanceConfig?.statusUrl ?? "—" },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ds-on-surface)" }}>
          Sistem Ayarları
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
          Platform yapılandırma ve genel ayarlar
        </p>
      </div>

      {settingSections.map((section) => (
        <section
          key={section.title}
          className="rounded-ui-panel border"
          style={{
            borderColor: "var(--ds-outline-variant)",
            background: "var(--ds-surface-raised)",
          }}
        >
          <header
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}
          >
            <span className="text-lg">{section.icon}</span>
            <h2 className="text-base font-semibold" style={{ color: "var(--ds-on-surface)" }}>
              {section.title}
            </h2>
          </header>
          <div className="divide-y" style={{ borderColor: "var(--ds-outline-variant)" }}>
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm font-medium" style={{ color: "var(--ds-on-surface-variant)" }}>
                  {item.label}
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: "var(--ds-on-surface)" }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
