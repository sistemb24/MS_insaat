"use client";

import { useState } from "react";
import { Button, Icon } from "@/components/ui";

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
      <Button
        leadingIcon={<Icon name="file" size={18} />}
        onClick={handlePrint}
        variant="primary"
      >
        Dashboard Özetini Yazdır
      </Button>
      {notice ? (
        <p
          className="max-w-xs rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-sm font-semibold text-content"
          role="status"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
