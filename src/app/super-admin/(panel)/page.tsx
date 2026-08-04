import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/super-admin-session";
import { createSuperAdminPlatformReadModel } from "@/lib/super-admin-platform-read-model";
import { StatCard } from "@/components/super-admin/stat-card";
import { ActivityFeed, type ActivityItem } from "@/components/super-admin/activity-feed";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const platformReadModel = createSuperAdminPlatformReadModel(prisma);

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Az önce";
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} sa önce`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} gün önce`;
  return date.toLocaleDateString("tr-TR");
}

export default async function SuperAdminDashboardPage() {
  const admin = await requireSuperAdminSession();
  const health = await platformReadModel.getHealth();

  // Gerçek Prisma sorguları — read-only
  const [
    tenantCount,
    companyCount,
    userCount,
    activeSessionCount,
    recentAuditLogs,
    subscriptionCount,
    supportTicketCount,
    openTicketCount,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.company.count(),
    prisma.appUser.count(),
    prisma.appSession.count(),
    prisma.auditLog.findMany({
      orderBy: { occurredAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityLabel: true,
        actorUserId: true,
        occurredAt: true,
        tenant: { select: { name: true } },
      },
    }),
    prisma.tenantSubscription.count(),
    prisma.supportTicket.count(),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
  ]);

  // Audit log'ları ActivityItem'e dönüştür
  const activities: ActivityItem[] = recentAuditLogs.map((log) => {
    const actionIcons: Record<string, string> = {
      CREATE: "➕",
      UPDATE: "✏️",
      DELETE: "🗑️",
      APPROVE: "✅",
      REJECT: "❌",
    };
    const actionTones: Record<string, "brand" | "success" | "warning" | "danger" | "neutral"> = {
      CREATE: "success",
      UPDATE: "brand",
      DELETE: "danger",
      APPROVE: "success",
      REJECT: "warning",
    };
    const actionWord = log.action.split("_")[0] ?? log.action;
    return {
      id: log.id,
      icon: actionIcons[actionWord] ?? "📋",
      title: `${log.entityType}: ${log.entityLabel}`,
      description: `${log.action} — ${log.tenant.name}`,
      time: formatRelativeTime(log.occurredAt),
      tone: actionTones[actionWord] ?? "neutral",
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Sayfa başlığı */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ds-on-surface)" }}>
          Platform Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
          Hoş geldiniz, {admin.name}. Platform genel bakış.
        </p>
      </div>

      {/* KPI Kartları */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<span className="text-base font-bold">🏢</span>}
          label="Toplam Tenant"
          value={tenantCount}
          detail={`${companyCount} firma`}
        />
        <StatCard
          icon={<span className="text-base font-bold">👥</span>}
          label="Toplam Kullanıcı"
          value={userCount}
          detail={`${activeSessionCount} aktif oturum`}
        />
        <StatCard
          icon={<span className="text-base font-bold">📦</span>}
          label="Abonelikler"
          value={subscriptionCount}
        />
        <StatCard
          icon={<span className="text-base font-bold">🎫</span>}
          label="Destek Talepleri"
          value={supportTicketCount}
          detail={openTicketCount > 0 ? `${openTicketCount} açık` : "Tümü kapalı"}
          trend={
            openTicketCount > 5
              ? { direction: "up", text: "Yüksek" }
              : openTicketCount > 0
                ? { direction: "neutral", text: "Normal" }
                : { direction: "down", text: "Harika" }
          }
        />
      </div>

      {/* İki sütun: Hızlı Erişim + Son Aktiviteler */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Hızlı Erişim */}
        <section
          className="rounded-ui-panel border lg:col-span-2"
          style={{
            borderColor: "var(--ds-outline-variant)",
            background: "var(--ds-surface-raised)",
          }}
        >
          <header
            className="px-5 py-4"
            style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}
          >
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--ds-on-surface)" }}
            >
              Hızlı Erişim
            </h2>
          </header>
          <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-1">
            {[
              { href: "/super-admin/tenants", label: "Tenant Yönetimi", icon: "🏢", desc: "Firma ve tenant işlemleri" },
              { href: "/super-admin/users", label: "Kullanıcılar", icon: "👥", desc: "Platform kullanıcıları" },
              { href: "/super-admin/abonelikler", label: "Abonelikler", icon: "📦", desc: "Paket ve faturalandırma" },
              { href: "/super-admin/destek", label: "Destek Masası", icon: "🎫", desc: "Destek talepleri" },
              { href: "/super-admin/loglar", label: "Sistem Logları", icon: "📋", desc: "Audit log ve güvenlik" },
              { href: "/super-admin/ayarlar", label: "Sistem Ayarları", icon: "⚙️", desc: "Platform yapılandırma" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-ui-control p-3 transition-colors"
                style={{
                  textDecoration: "none",
                  border: "1px solid var(--ds-outline-variant)",
                  color: "var(--ds-on-surface)",
                }}
              >
                <span className="text-lg">{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs" style={{ color: "var(--ds-text-muted)" }}>
                    {item.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Son Aktiviteler */}
        <div className="lg:col-span-3">
          <ActivityFeed items={activities} />
        </div>
      </div>

      {/* Sistem Durumu */}
      <section
        className="rounded-ui-panel border"
        style={{
          borderColor: "var(--ds-outline-variant)",
          background: "var(--ds-surface-raised)",
        }}
      >
        <header
          className="px-5 py-4"
          style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--ds-on-surface)" }}
          >
            Sistem Durumu
          </h2>
        </header>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <HealthIndicator status={health.database.status} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--ds-on-surface)" }}>
                Veritabanı
              </p>
              <p className="text-xs" style={{ color: "var(--ds-text-muted)" }}>
                {health.database.status === "available"
                  ? `Ölçüldü · ${health.database.latencyMs} ms`
                  : "Bağlantı doğrulanamadı"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HealthIndicator status={health.application.status} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--ds-on-surface)" }}>
                Uygulama
              </p>
              <p className="text-xs" style={{ color: "var(--ds-text-muted)" }}>İstek başarıyla işlendi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HealthIndicator status={health.externalMonitoring.status} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--ds-on-surface)" }}>
                Dış İzleme
              </p>
              <p className="text-xs" style={{ color: "var(--ds-text-muted)" }}>
                Provider yapılandırılmadı
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HealthIndicator({
  status,
}: {
  status: "available" | "degraded" | "unavailable";
}) {
  const color =
    status === "available"
      ? "var(--ds-success)"
      : status === "degraded"
        ? "var(--ds-warning)"
        : "var(--ds-text-muted)";

  return <span className="h-3 w-3 rounded-full" style={{ background: color }} />;
}
