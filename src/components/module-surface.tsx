"use client";

import { useState } from "react";

import { ActionBar, Button, MetricCard, PageHeader, StatusBadge, type StatusTone } from "@/components/ui";
import type { ModuleContent } from "@/lib/module-content";

const statusTone: Record<ModuleContent["metrics"][number]["status"], StatusTone> = {
  approved: "success",
  process: "info",
  draft: "neutral",
  cancelled: "danger",
};

type ModuleSurfaceProps = {
  content: ModuleContent;
};

export function ModuleSurface({ content }: ModuleSurfaceProps) {
  const [actionNotice, setActionNotice] = useState("");

  function handlePlaceholderAction(action: string) {
    setActionNotice(
      `${action} aksiyonu planlı placeholder kapsamındadır; gerçek domain işlemi ilgili modül diliminde bağlanacaktır.`,
    );
  }

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <ModuleHeader content={content} />
      <ActionToolbar
        actions={content.primaryActions}
        onAction={handlePlaceholderAction}
      />
      {actionNotice ? (
        <div
          className="rounded-ui-panel border border-divider bg-surface-raised p-3 text-sm font-semibold text-content-subtle"
          role="status"
        >
          {actionNotice}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        {content.metrics.map((metric) => (
          <MetricCard
            detail={metric.detail}
            key={metric.label}
            label={<span className="flex items-center justify-between gap-3"><span>{metric.label}</span><StatusBadge tone={statusTone[metric.status]}>{metric.status}</StatusBadge></span>}
            tone={metric.status === "cancelled" ? "danger" : metric.status === "approved" ? "success" : "brand"}
            value={metric.value}
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <TemplatePanel sources={content.templateSources} />
        <ReadinessPanel />
      </div>
    </section>
  );
}

function ModuleHeader({ content }: ModuleSurfaceProps) {
  return (
    <PageHeader
      actions={<StatusBadge tone="info">İş akışı korunur · Statik HTML taşınmaz</StatusBadge>}
      description={content.summary}
      eyebrow={content.eyebrow}
      title={content.title}
    />
  );
}

function ActionToolbar({
  actions,
  onAction,
}: {
  actions: string[];
  onAction: (action: string) => void;
}) {
  const defaultActions = ["Yeni", "Düzenle", "Yenile", "Excel", "Yazdır"];

  return (
    <ActionBar actions={[...actions, ...defaultActions].map((action, index) => (
        <Button
          key={`${action}-${index}`}
          onClick={() => onAction(action)}
          size="sm"
          variant={index === 0 ? "primary" : "secondary"}
        >
          {action}
        </Button>
      ))} />
  );
}

function TemplatePanel({ sources }: { sources: string[] }) {
  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">HTML şablon kaynakları</h2>
      </div>
      <div className="divide-y divide-divider">
        {sources.map((source) => (
          <div
            className="grid min-h-[var(--ds-data-row-height)] grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 text-sm"
            key={source}
          >
            <span className="font-mono text-xs">{source}</span>
            <StatusBadge tone="info">Aday</StatusBadge>
          </div>
        ))}
      </div>
    </article>
  );
}

function ReadinessPanel() {
  const items = [
    "Tenant/company scope",
    "Ortak toolbar",
    "Design token standardı",
    "Örnek veri temizliği",
    "CDN Tailwind yok",
  ];

  return (
    <aside className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Hafta 1 kabul kontrolü</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <li className="flex items-center gap-2" key={item}>
            <span className="h-2 w-2 rounded-full bg-brand-primary" />
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}
