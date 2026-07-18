/**
 * @vitest-environment jsdom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { AuditLogEntry } from "@/lib/audit-log";
import type {
  TimesheetCreateValues,
  TimesheetRow,
} from "@/lib/timesheet-service";

import { TimesheetSurface } from "./timesheet-surface";

const originalPrint = window.print;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "print", {
    configurable: true,
    value: originalPrint,
  });
});

describe("TimesheetSurface", () => {
  test("renders timesheet list and totals", () => {
    render(<TimesheetSurface rows={[createTimesheetRow()]} />);

    expect(screen.getByText("Puantaj")).toBeTruthy();
    expect(screen.getByText("Puantaj hareket listesi")).toBeTruthy();
    expect(screen.getByText("PNT-2026-06-001")).toBeTruthy();
    expect(screen.getByText("ŞİRKET MERKEZ ŞANTİYESİ")).toBeTruthy();
    expect(screen.getByText("Çalışma Günü")).toBeTruthy();
    expect(screen.getAllByText("20")).toHaveLength(2);
    expect(screen.getAllByText("20.000,00 TL")).toHaveLength(2);
    expect(screen.getByText("Net Ödeme")).toBeTruthy();
  });

  test("creates timesheet from the form", async () => {
    const createTimesheet = vi.fn(
      async (
        values: TimesheetCreateValues,
      ): Promise<{ ok: true; data: TimesheetRow }> => ({
        ok: true,
        data: createTimesheetRow(values),
      }),
    );

    render(
      <TimesheetSurface
        lookups={{
          personnel: [{ code: "PRS-0001", name: "MEHMET YILMAZ" }],
          sites: [{ code: "SANT-0001", name: "ŞİRKET MERKEZ ŞANTİYESİ" }],
          subcontractors: [{ code: "TAS-0001", name: "ŞİRKETİN TAŞERONU" }],
        }}
        persistence={{ createTimesheet }}
        rows={[]}
        today="2026-06-27"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));
    fireEvent.change(screen.getByLabelText("Puantaj No"), {
      target: { value: "PNT-2026-06-001" },
    });
    fireEvent.change(screen.getByLabelText("Şantiye"), {
      target: { value: "SANT-0001" },
    });
    fireEvent.change(screen.getByLabelText("Taşeron"), {
      target: { value: "TAS-0001" },
    });
    fireEvent.change(screen.getByLabelText("Personel satır 1"), {
      target: { value: "PRS-0001" },
    });
    fireEvent.change(screen.getByLabelText("Çalışma günü satır 1"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Yevmiye satır 1"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => expect(createTimesheet).toHaveBeenCalledOnce());
    expect(createTimesheet.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        contractorCode: "TAS-0001",
        contractorName: "ŞİRKETİN TAŞERONU",
        documentNo: "PNT-2026-06-001",
        month: 6,
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        year: 2026,
      }),
    );
    expect(screen.getByText("PNT-2026-06-001")).toBeTruthy();
  });

  test("renders timesheet audit history grouped by row", () => {
    const row = createTimesheetRow();

    render(
      <TimesheetSurface
        auditLogsByEntityId={{
          [row.id]: [
            createAuditLog({
              action: "timesheet.create",
              entityId: row.id,
              occurredAt: "2026-06-27T10:00:00.000Z",
              statusTo: "Taslak",
            }),
            createAuditLog({
              action: "timesheet.post",
              entityId: row.id,
              occurredAt: "2026-06-27T11:00:00.000Z",
              statusFrom: "Taslak",
              statusTo: "Kaydedildi",
            }),
          ],
        }}
        rows={[row]}
      />,
    );

    expect(screen.getByText("İşlem Geçmişi")).toBeTruthy();
    expect(screen.getByText("Oluşturuldu")).toBeTruthy();
    expect(screen.getByText("Kesinleştirildi")).toBeTruthy();
    expect(screen.getByText("Taslak -> Kaydedildi")).toBeTruthy();
  });

  test("prints the visible timesheet movement list scope", () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(<TimesheetSurface rows={[createTimesheetRow()]} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Puantajları Yazdır" }),
    );

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain(
      "Yazdırma kapsamı hazır: 1 puantaj.",
    );
  });
});

function createTimesheetRow(
  overrides: TimesheetCreateValues = {},
): TimesheetRow {
  return {
    id: "timesheet-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    contractorCode: overrides.contractorCode ?? "TAS-0001",
    contractorName: overrides.contractorName ?? "ŞİRKETİN TAŞERONU",
    createdAt: "2026-06-27T10:00:00.000Z",
    createdBy: "user-main",
    deductionTotal: 0,
    description: overrides.description ?? "Haziran puantajı",
    documentNo: overrides.documentNo ?? "PNT-2026-06-001",
    grossTotal: 20000,
    lineCount: 1,
    lines: overrides.lines ?? [
      {
        advanceDeduction: 0,
        dailyWage: 1000,
        debtDeduction: 0,
        overtimeHourlyRate: 80,
        overtimeHours: 0,
        personCode: "PRS-0001",
        personName: "MEHMET YILMAZ",
        workedDays: 20,
      },
    ],
    month: overrides.month ?? 6,
    netTotal: 20000,
    siteCode: overrides.siteCode ?? "SANT-0001",
    siteName: overrides.siteName ?? "ŞİRKET MERKEZ ŞANTİYESİ",
    status: "Taslak",
    totalOvertimeHours: 0,
    totalWorkedDays: 20,
    updatedAt: "2026-06-27T10:00:00.000Z",
    updatedBy: "user-main",
    year: overrides.year ?? 2026,
  };
}

function createAuditLog({
  action,
  entityId,
  occurredAt,
  statusFrom,
  statusTo,
}: {
  action: string;
  entityId: string;
  occurredAt: string;
  statusFrom?: string;
  statusTo: string;
}): AuditLogEntry {
  return {
    id: `${entityId}-${action}`,
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    actorUserId: "user-main",
    action,
    entityType: "timesheet",
    entityId,
    entityLabel: "PNT-2026-06-001",
    occurredAt,
    createdAt: occurredAt,
    metadata: {
      statusFrom,
      statusTo,
    },
  };
}
