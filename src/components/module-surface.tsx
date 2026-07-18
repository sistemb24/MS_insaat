"use client";

import { useState } from "react";

import type { ModuleContent } from "@/lib/module-content";

const statusClass: Record<ModuleContent["metrics"][number]["status"], string> = {
  approved: "bg-[var(--status-approved)] text-white",
  process: "bg-[var(--status-process)] text-white",
  draft: "bg-[var(--status-draft)] text-white",
  cancelled: "bg-[var(--status-cancelled)] text-white",
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
          className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-3 text-sm font-semibold text-[var(--on-surface-variant)]"
          role="status"
        >
          {actionNotice}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        {content.metrics.map((metric) => (
          <article
            className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4"
            key={metric.label}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{metric.label}</h2>
              <span
                className={`rounded-[var(--radius-control)] px-2 py-1 text-xs font-semibold ${statusClass[metric.status]}`}
              >
                {metric.status}
              </span>
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold">
              {metric.value}
            </p>
            <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
              {metric.detail}
            </p>
          </article>
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
    <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
        {content.eyebrow}
      </p>
      <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            {content.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
            {content.summary}
          </p>
        </div>
        <div className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-xs text-[var(--on-surface-variant)]">
          İş akışı korunur · Statik HTML taşınmaz
        </div>
      </div>
    </header>
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
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-2">
      {[...actions, ...defaultActions].map((action) => (
        <button
          className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--primary-fixed)]"
          key={action}
          onClick={() => onAction(action)}
          type="button"
        >
          {action}
        </button>
      ))}
    </div>
  );
}

function TemplatePanel({ sources }: { sources: string[] }) {
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
      <div className="border-b border-[var(--grid-border)] px-4 py-3">
        <h2 className="text-sm font-semibold">HTML şablon kaynakları</h2>
      </div>
      <div className="divide-y divide-[var(--grid-border)]">
        {sources.map((source) => (
          <div
            className="grid min-h-[var(--data-row-height)] grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 text-sm"
            key={source}
          >
            <span className="font-mono text-xs">{source}</span>
            <span className="rounded-[var(--radius-control)] bg-[var(--primary-fixed)] px-2 py-1 text-xs font-semibold text-[var(--primary)]">
              aday
            </span>
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
    <aside className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
      <h2 className="text-sm font-semibold">Hafta 1 kabul kontrolü</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <li className="flex items-center gap-2" key={item}>
            <span className="h-2 w-2 rounded-full bg-[var(--status-process)]" />
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}
