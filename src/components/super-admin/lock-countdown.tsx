"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  /** null = kalıcı kilit */
  lockedUntil: Date | null;
  failedAttempts: number;
  lastFailedIp?: string | null;
};

/** "192.168.1.25" → "192.168.***.***" */
function maskIp(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***. ***`.replace(" ", "");
  }
  // IPv6 or other: mask last 3 segments
  const colonParts = ip.split(":");
  if (colonParts.length > 3) {
    const visible = colonParts.slice(0, colonParts.length - 3);
    return visible.join(":") + ":***:***:***";
  }
  return "***";
}

export function LockCountdown({ lockedUntil, failedAttempts, lastFailedIp }: Props) {
  const router = useRouter();

  const [remaining, setRemaining] = useState<number>(() => {
    if (!lockedUntil) return 0;
    return Math.max(0, lockedUntil.getTime() - Date.now());
  });

  useEffect(() => {
    // Permanent lock — no countdown needed
    if (!lockedUntil) return;

    const tick = () => {
      const ms = Math.max(0, lockedUntil.getTime() - Date.now());
      setRemaining(ms);
      if (ms === 0) {
        router.push("/super-admin/giris");
      }
    };

    tick(); // immediate first tick
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil, router]);

  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const isPermanent = lockedUntil === null;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Lock icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-danger-subtle text-[var(--ds-danger)]">
        <span className="material-symbols-outlined" style={{ fontSize: "48px", fontVariationSettings: "'FILL' 1" }}>
          lock
        </span>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-content md:text-2xl">
          {isPermanent
            ? "Hesabınız Kalıcı Olarak Kilitlendi"
            : "Hesabınız Geçici Olarak Kilitlendi"}
        </h1>
        <p className="text-sm text-content-subtle">
          Çok fazla başarısız giriş denemesi nedeniyle güvenliğiniz için hesabınız kilitlendi.
        </p>
      </div>

      {/* Permanent lock message */}
      {isPermanent ? (
        <div
          className="w-full rounded-ui-panel border border-[var(--ds-danger)] bg-danger-subtle px-4 py-3 text-sm text-[var(--ds-danger)]"
          role="alert"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
            <span>Hesabınız kalıcı olarak kilitlendi. Sistem yöneticinizle iletişime geçin.</span>
          </div>
        </div>
      ) : (
        /* Timer box */
        <div className="w-full rounded-ui-panel border border-divider bg-[var(--ds-surface-container)] p-6">
          <div className="mb-2 flex items-center justify-center gap-2 text-content-subtle">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>timer</span>
            <span className="text-sm font-medium">Kalan Süre</span>
          </div>
          <div
            aria-live="polite"
            aria-label={`${minutes} dakika ${seconds} saniye`}
            className="font-mono text-3xl font-semibold tracking-widest text-[var(--ds-danger)]"
          >
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
          <p className="mt-2 text-xs text-content-muted">
            Kilit {minutes} dakika {seconds} saniye sonra kaldırılacak.
          </p>
        </div>
      )}

      {/* Failed attempts */}
      <div className="flex items-center gap-2 text-sm text-content-subtle">
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>warning</span>
        <span>
          <strong className="text-content">{failedAttempts}</strong> başarısız giriş denemesi yapıldı.
        </span>
      </div>

      {/* Last failed IP */}
      {lastFailedIp ? (
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>device_hub</span>
          <span>Son deneme IP: {maskIp(lastFailedIp)}</span>
        </div>
      ) : null}

      {/* Lock policy summary */}
      <div className="w-full rounded-ui-control border border-divider bg-[var(--ds-surface-container)] p-4 text-left">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined mt-0.5 text-content-muted" style={{ fontSize: "16px" }}>info</span>
          <p className="text-xs text-content-muted">
            5 yanlış denemede 15 dk kilitli, 10 yanlış denemede 1 saat kilitli, 20 yanlış denemede kalıcı kilit.
          </p>
        </div>
      </div>
    </div>
  );
}
