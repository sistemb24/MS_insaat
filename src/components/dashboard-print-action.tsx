"use client";

import { useState } from "react";

type DashboardPrintActionProps = {
  activityCount: number;
};

export function DashboardPrintAction({
  activityCount,
}: DashboardPrintActionProps) {
  const [notice, setNotice] = useState("");

  function handlePrint() {
    setNotice(`Yazdırma kapsamı hazır: ${activityCount} son hareket.`);
    window.print();
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 text-xs font-semibold"
        onClick={handlePrint}
        type="button"
      >
        Dashboard Özetini Yazdır
      </button>
      {notice ? (
        <p
          className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm font-semibold"
          role="status"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
