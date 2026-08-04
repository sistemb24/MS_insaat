"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { formatCountdown } from "@/lib/super-admin-maintenance";

type Props = {
  endsAt: Date | null;
};

type UnitBoxProps = {
  value: number;
  label: string;
};

function UnitBox({ value, label }: UnitBoxProps) {
  return (
    <div className="flex min-w-[72px] flex-col items-center gap-1 rounded-ui-control border border-divider bg-[var(--ds-surface-container)] p-4">
      <span className="font-mono text-2xl font-semibold text-brand-primary">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-mono text-xs uppercase text-content-muted">{label}</span>
    </div>
  );
}

export function MaintenanceCountdown({ endsAt }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!endsAt) return;

    const tick = () => {
      const current = new Date();
      setNow(current);
      if (current >= endsAt) {
        router.push("/");
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, router]);

  if (!endsAt) {
    return (
      <p className="text-sm text-content-muted">
        Bitiş saati henüz belirlenmedi.
      </p>
    );
  }

  const { days, hours, minutes, seconds } = formatCountdown(now, endsAt);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-medium uppercase tracking-wider text-content-subtle">
        Tahmini Bitiş Süresi
      </p>
      <div
        aria-live="polite"
        aria-label={`${days} gün, ${hours} saat, ${minutes} dakika, ${seconds} saniye`}
        className="flex items-center gap-2"
      >
        <UnitBox value={days} label="Gün" />
        <span aria-hidden="true" className="mb-4 text-xl font-semibold text-content-muted">:</span>
        <UnitBox value={hours} label="Saat" />
        <span aria-hidden="true" className="mb-4 text-xl font-semibold text-content-muted">:</span>
        <UnitBox value={minutes} label="Dak" />
        <span aria-hidden="true" className="mb-4 text-xl font-semibold text-content-muted">:</span>
        <UnitBox value={seconds} label="San" />
      </div>
    </div>
  );
}
