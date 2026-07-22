/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

    expect(screen.getByLabelText("Yevmiye fişi tarihi")).toBeTruthy();
    expect(screen.getByLabelText("Yevmiye fiş numarası")).toBeTruthy();
    expect(screen.getByLabelText("Yevmiye fişi açıklaması")).toBeTruthy();
    expect(
      screen.getByRole("table", { name: "Yevmiye fişleri" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("table", { name: "Hesap bazlı mizan özeti" }),
    ).toBeTruthy();
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

  test("filters audit records by metadata, action and date range", () => {
    renderLedgerWithAuditEntries();

    fireEvent.change(screen.getByLabelText("Ledger audit araması"), {
      target: { value: "GDR-001" },
    });
    expect(screen.getByText("YV-001")).toBeTruthy();
    expect(screen.queryByText("Temmuz 2026")).toBeNull();
    expect(screen.getByText("1 / 2 kayıt")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Temizle" }));
    fireEvent.change(screen.getByLabelText("Ledger audit işlem filtresi"), {
      target: { value: "ledger.period.close" },
    });
    fireEvent.change(screen.getByLabelText("Ledger audit başlangıç tarihi"), {
      target: { value: "2026-07-16" },
    });
    fireEvent.change(screen.getByLabelText("Ledger audit bitiş tarihi"), {
      target: { value: "2026-07-20" },
    });

    expect(screen.queryByText("YV-001")).toBeNull();
    expect(screen.getByText("Temmuz 2026")).toBeTruthy();
  });

  test("shows scoped audit identity and metadata details", () => {
    renderLedgerWithAuditEntries();

    fireEvent.change(screen.getByLabelText("Ledger audit araması"), {
      target: { value: "YV-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Detay" }));

    const detail = screen.getByRole("complementary", { name: "YV-001 audit detayı" });
    expect(within(detail).getByText("ledger-entry-1")).toBeTruthy();
    expect(within(detail).getByText("GDR-001")).toBeTruthy();
    expect(within(detail).getByText("24500")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Kapat" }).getAttribute("aria-expanded"),
    ).toBe("true");
  });
});

function renderLedgerWithAuditEntries() {
  render(
    <LedgerSurface
      auditEntries={[
        {
          action: "ledger.entry.post",
          actorUserId: "user-accounting",
          companyId: "company-demo-insaat",
          createdAt: "2026-07-14T10:00:01.000Z",
          entityId: "ledger-entry-1",
          entityLabel: "YV-001",
          entityType: "ledger-entry",
          id: "audit-1",
          metadata: { amount: 24500, sourceDocumentNo: "GDR-001" },
          occurredAt: "2026-07-14T10:00:00.000Z",
          periodId: "period-2026",
          tenantId: "tenant-noa-demo",
        },
        {
          action: "ledger.period.close",
          actorUserId: "user-admin",
          companyId: "company-demo-insaat",
          createdAt: "2026-07-18T15:30:01.000Z",
          entityId: "period-2026",
          entityLabel: "Temmuz 2026",
          entityType: "ledger-period",
          id: "audit-2",
          metadata: { status: "closed" },
          occurredAt: "2026-07-18T15:30:00.000Z",
          periodId: "period-2026",
          tenantId: "tenant-noa-demo",
        },
      ]}
      canClosePeriod
      canPost
      entries={[]}
      onClosePeriod={vi.fn()}
      onPost={vi.fn()}
      onReopenPeriod={vi.fn()}
      periodClosed={false}
    />,
  );
}
