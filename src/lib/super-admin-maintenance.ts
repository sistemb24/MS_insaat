// src/lib/super-admin-maintenance.ts

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function formatCountdown(now: Date, endsAt: Date): CountdownParts {
  const totalSeconds = Math.max(
    0,
    Math.floor((endsAt.getTime() - now.getTime()) / 1000),
  );
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}
