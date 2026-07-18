/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { LedgerSurface } from "./ledger-surface";

afterEach(cleanup);

describe("LedgerSurface", () => {
  test("posts a balanced multi-line journal", async () => {
    const onPost = vi.fn(async (draft) => ({
      ok: true as const,
      data: {
        ...draft,
        companyId: "company-demo-insaat",
        createdAt: "2026-07-14T10:00:00.000Z",
        createdBy: "user-main",
        debitTotal: 24000,
        id: "ledger-1",
        periodId: "period-2026",
        tenantId: "tenant-noa-demo",
        creditTotal: 24000,
      },
    }));

    render(
      <LedgerSurface
        auditEntries={[]}
        canClosePeriod
        canPost
        entries={[]}
        onClosePeriod={vi.fn()}
        onPost={onPost}
        onReopenPeriod={vi.fn()}
        periodClosed={false}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Fiş no"), { target: { value: "YV-TEST-001" } });
    fireEvent.change(screen.getByLabelText("Satır 1 hesap kodu"), { target: { value: "153" } });
    fireEvent.change(screen.getByLabelText("Satır 1 tutar"), { target: { value: "20000" } });
    fireEvent.change(screen.getByLabelText("Satır 2 tutar"), { target: { value: "24000" } });
    fireEvent.click(screen.getByRole("button", { name: "Satır ekle" }));
    fireEvent.change(screen.getByLabelText("Satır 3 hesap kodu"), { target: { value: "191" } });
    fireEvent.change(screen.getByLabelText("Satır 3 hesap adı"), { target: { value: "İndirilecek KDV" } });
    fireEvent.change(screen.getByLabelText("Satır 3 tutar"), { target: { value: "4000" } });

    fireEvent.click(screen.getByRole("button", { name: "Fişi kaydet" }));

    await waitFor(() => expect(onPost).toHaveBeenCalledWith(expect.objectContaining({
      documentNo: "YV-TEST-001",
      lines: [
        expect.objectContaining({ accountCode: "153", amount: 20000, direction: "debit" }),
        expect.objectContaining({ accountCode: "320", amount: 24000, direction: "credit" }),
        expect.objectContaining({ accountCode: "191", amount: 4000, direction: "debit" }),
      ],
    })));
  });
});
