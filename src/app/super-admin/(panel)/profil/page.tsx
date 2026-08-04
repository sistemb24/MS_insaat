import type { Metadata } from "next";

import { requireSuperAdminSession } from "@/lib/super-admin-session";
import { prisma } from "@/lib/prisma";
import { redactSensitiveText } from "@/lib/super-admin-platform-read-model";

export const metadata: Metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const admin = await requireSuperAdminSession();

  const credential = await prisma.superAdminCredential.findFirst({
    select: {
      id: true,
      email: true,
      name: true,
      is2FAEnabled: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { sessions: true } },
    },
  });

  const accountLock = await prisma.superAdminAccountLock.findFirst({
    select: {
      failedAttempts: true,
      lastFailedAt: true,
      lastFailedIp: true,
      lockedAt: true,
      lockedUntil: true,
    },
    where: { credentialId: credential?.id ?? "" },
  });
  const isLocked = Boolean(
    accountLock?.lockedAt && accountLock.lockedUntil,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ds-on-surface)" }}>
          Profil Ayarları
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
          Süper Admin hesap bilgileri ve güvenlik durumu
        </p>
      </div>

      {/* Profil kartı */}
      <section className="rounded-ui-panel border" style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}>
        <div className="flex items-center gap-5 p-6">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold"
            style={{ background: "var(--ds-primary)", color: "var(--ds-on-primary)" }}
          >
            {admin.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--ds-on-surface)" }}>{admin.name}</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>{admin.email}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--ds-text-muted)" }}>
              Oturum süresi: {admin.expiresAt.toLocaleString("tr-TR")}
            </p>
          </div>
        </div>
      </section>

      {/* Hesap Bilgileri */}
      <section className="rounded-ui-panel border" style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}>
        <header className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
          <span className="text-lg">🔐</span>
          <h2 className="text-base font-semibold" style={{ color: "var(--ds-on-surface)" }}>Hesap Bilgileri</h2>
        </header>
        <div className="divide-y" style={{ borderColor: "var(--ds-outline-variant)" }}>
          {[
            { label: "E-Posta", value: credential?.email ?? "—" },
            { label: "Ad Soyad", value: credential?.name ?? "—" },
            { label: "Oluşturulma", value: credential?.createdAt.toLocaleString("tr-TR") ?? "—" },
            { label: "Son Güncelleme", value: credential?.updatedAt.toLocaleString("tr-TR") ?? "—" },
            { label: "Aktif Oturum Sayısı", value: String(credential?._count.sessions ?? 0) },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm" style={{ color: "var(--ds-on-surface-variant)" }}>{item.label}</span>
              <span className="font-mono text-sm tabular-nums" style={{ color: "var(--ds-on-surface)" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Güvenlik Durumu */}
      <section className="rounded-ui-panel border" style={{ borderColor: "var(--ds-outline-variant)", background: "var(--ds-surface-raised)" }}>
        <header className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
          <span className="text-lg">🛡️</span>
          <h2 className="text-base font-semibold" style={{ color: "var(--ds-on-surface)" }}>Güvenlik Durumu</h2>
        </header>
        <div className="divide-y" style={{ borderColor: "var(--ds-outline-variant)" }}>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm" style={{ color: "var(--ds-on-surface-variant)" }}>İki Faktörlü Doğrulama (2FA)</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: credential?.is2FAEnabled ? "var(--ds-success-container)" : "var(--ds-warning-container)",
                color: credential?.is2FAEnabled ? "var(--ds-success)" : "var(--ds-warning)",
              }}
            >
              {credential?.is2FAEnabled ? "Aktif" : "Pasif"}
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm" style={{ color: "var(--ds-on-surface-variant)" }}>Hesap Kilidi</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: isLocked ? "var(--ds-danger-container)" : "var(--ds-success-container)",
                color: isLocked ? "var(--ds-danger)" : "var(--ds-success)",
              }}
            >
              {isLocked ? `Kilitli (${accountLock?.failedAttempts ?? 0} başarısız deneme)` : "Kilit yok"}
            </span>
          </div>
          {accountLock?.lastFailedAt && (
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm" style={{ color: "var(--ds-on-surface-variant)" }}>Son Başarısız Deneme</span>
              <span className="font-mono text-xs tabular-nums" style={{ color: "var(--ds-danger)" }}>
                {accountLock.lastFailedAt.toLocaleString("tr-TR")} — IP: {accountLock.lastFailedIp ? redactSensitiveText(accountLock.lastFailedIp) : "bilinmiyor"}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
