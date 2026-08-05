/**
 * @vitest-environment jsdom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ConstructionMeasurementImportWorkspace } from "./construction-measurement-import-workspace";

const {
  applyMock,
  cancelMock,
  detailMock,
  listMock,
  uploadMock,
  validateMock,
} = vi.hoisted(() => ({
  applyMock: vi.fn(),
  cancelMock: vi.fn(),
  detailMock: vi.fn(),
  listMock: vi.fn(),
  uploadMock: vi.fn(),
  validateMock: vi.fn(),
}));

vi.mock("@/app/actions/construction-measurement-import-actions", () => ({
  applyConstructionMeasurementImportBatchAction: applyMock,
  cancelConstructionMeasurementImportBatchAction: cancelMock,
  getConstructionMeasurementImportBatchAction: detailMock,
  listConstructionMeasurementImportBatchesAction: listMock,
  uploadConstructionMeasurementImportAction: uploadMock,
  validateConstructionMeasurementImportBatchAction: validateMock,
}));

const readyRow = {
  appliedMeasurementLineId: null,
  contractItemId: "item-1",
  createdAt: "2026-07-23T18:00:00.000Z",
  description: "Betonarme temel",
  errorCode: null,
  id: "row-ready",
  quantity: 12.5,
  resolvedUnit: "m3",
  rowNo: 2,
  sourceItemCode: "15.001",
  sourceUnit: "m3",
  status: "READY" as const,
};

function batch(
  status: "DRAFT" | "VALIDATED" | "APPLIED" | "CANCELLED" = "DRAFT",
  withError = false,
) {
  const rows = withError
    ? [
        readyRow,
        {
          ...readyRow,
          contractItemId: null,
          errorCode: "ITEM_NOT_FOUND" as const,
          id: "row-error",
          quantity: 4,
          rowNo: 3,
          sourceItemCode: "15.999",
          status: "ERROR" as const,
        },
      ]
    : [readyRow];
  return {
    appliedAt: status === "APPLIED" ? "2026-07-23T18:10:00.000Z" : null,
    appliedBy: status === "APPLIED" ? "accounting-1" : null,
    batchNo: 7,
    cancelledAt: status === "CANCELLED" ? "2026-07-23T18:10:00.000Z" : null,
    cancelledBy: status === "CANCELLED" ? "accounting-1" : null,
    companyId: "company-1",
    contentType: "text/csv",
    createdAt: "2026-07-23T18:00:00.000Z",
    createdBy: "accounting-1",
    delimiter: ";" as const,
    errorRowCount: withError ? 1 : 0,
    events: [{
      actorUserId: "accounting-1",
      createdAt: "2026-07-23T18:00:00.000Z",
      eventType: "CREATED" as const,
      id: "event-1",
      metadata: {},
    }],
    failureCode: null,
    fileSha256: "hidden-hash",
    fileSize: 128,
    id: "batch-1",
    mappingVersion: "measurement-csv-v1",
    originalFileName: "metraj.csv",
    periodId: "period-1",
    projectId: "project-1",
    rows,
    sourceProgressPaymentId: "payment-1",
    sourceProgressPaymentUpdatedAt: "2026-07-23T17:00:00.000Z",
    sourceSnapshotAt: "2026-07-23T17:00:00.000Z",
    status,
    targetSheetId: status === "APPLIED" ? "sheet-import-1" : null,
    tenantId: "tenant-1",
    totalRowCount: rows.length,
    updatedAt: "2026-07-23T18:00:00.000Z",
    validRowCount: 1,
    validatedAt: status === "VALIDATED" || status === "APPLIED"
      ? "2026-07-23T18:05:00.000Z"
      : null,
    validatedBy: status === "VALIDATED" || status === "APPLIED"
      ? "accounting-1"
      : null,
  };
}

function summary(value = batch()) {
  const { events: _events, rows: _rows, ...row } = value;
  void _events;
  void _rows;
  return row;
}

function listResult(value = batch(), canCreate = true) {
  return {
    data: {
      canCreate,
      rows: [summary(value)],
    },
    ok: true as const,
  };
}

function detailResult(value = batch()) {
  return {
    data: {
      batch: value,
      permissions: {
        canApply: value.status === "VALIDATED" || value.status === "APPLIED",
        canCancel: value.status === "DRAFT" || value.status === "VALIDATED",
        canValidate: value.status === "DRAFT" && value.errorRowCount === 0,
      },
    },
    ok: true as const,
  };
}

beforeEach(() => {
  listMock.mockResolvedValue(listResult());
  detailMock.mockResolvedValue(detailResult());
  uploadMock.mockResolvedValue({
    data: { batch: batch(), kind: "created" },
    ok: true,
  });
  validateMock.mockResolvedValue({
    data: { batch: batch("VALIDATED"), kind: "updated" },
    ok: true,
  });
  applyMock.mockResolvedValue({
    data: { batch: batch("APPLIED"), kind: "updated" },
    ok: true,
  });
  cancelMock.mockResolvedValue({
    data: { batch: batch("CANCELLED"), kind: "updated" },
    ok: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ConstructionMeasurementImportWorkspace", () => {
  test("renders deep-linkable history, summary, row errors and non-color status", async () => {
    const errored = batch("DRAFT", true);
    listMock.mockResolvedValue(listResult(errored));
    detailMock.mockResolvedValue(detailResult(errored));

    render(
      <ConstructionMeasurementImportWorkspace
        initialBatchId="batch-1"
        projectId="project-1"
        sourceProgressPaymentId="payment-1"
      />,
    );

    const workspace = await screen.findByRole("region", {
      name: "Kalıcı metraj import çalışma alanı",
    });
    expect(within(workspace).getAllByText("IMP-0007")).toHaveLength(2);
    expect(within(workspace).getByText("Taslak")).toBeTruthy();
    expect(within(workspace).getByText("1 satır düzeltilmeden doğrulama yapılamaz.")).toBeTruthy();
    expect(within(workspace).getByRole("link", { name: "Satır 3" }).getAttribute("href"))
      .toBe("#construction-import-row-row-error");
    expect(within(workspace).getByText("Sözleşme pozu bulunamadı.")).toBeTruthy();
    expect(within(workspace).queryByRole("button", { name: "Batch'i doğrula" })).toBeNull();
    expect(within(workspace).getByRole("link", { name: /IMP-0007/ }).getAttribute("href"))
      .toBe("/hakedis?import=batch-1");
    expect(workspace.className).toContain("print:shadow-none");
    expect(
      within(workspace).getByRole("form", {
        name: "Kalıcı metraj CSV yükleme",
      }).className,
    ).toContain("print:hidden");
    expect(within(workspace).getByRole("table", {
      name: "Import satır sonuçları",
    })).toBeTruthy();
  });

  test("uploads the selected file to server validation and opens its batch", async () => {
    listMock.mockResolvedValueOnce({ ok: true, data: { canCreate: true, rows: [] } });
    detailMock.mockResolvedValue(detailResult());

    render(
      <ConstructionMeasurementImportWorkspace
        projectId="project-1"
        sourceProgressPaymentId="payment-1"
      />,
    );

    const form = await screen.findByRole("form", {
      name: "Kalıcı metraj CSV yükleme",
    });
    const file = new File(
      ["poz_no;miktar\n15.001;12.5"],
      "metraj.csv",
      { type: "text/csv" },
    );
    fireEvent.change(within(form).getByLabelText("Sunucuda doğrulanacak CSV dosyası"), {
      target: { files: [file] },
    });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalledWith({
        file,
        projectId: "project-1",
        sourceProgressPaymentId: "payment-1",
      });
    });
    expect(await screen.findByText("CSV sunucuda doğrulandı ve taslak import oluşturuldu."))
      .toBeTruthy();
    expect(detailMock).toHaveBeenCalledWith("batch-1");
  });

  test("requires explicit apply confirmation and restores focus after escape and apply", async () => {
    const validated = batch("VALIDATED");
    const applied = batch("APPLIED");
    listMock.mockResolvedValue(listResult(validated));
    detailMock
      .mockResolvedValueOnce(detailResult(validated))
      .mockResolvedValue(detailResult(applied));

    render(
      <ConstructionMeasurementImportWorkspace
        initialBatchId="batch-1"
        projectId="project-1"
        sourceProgressPaymentId="payment-1"
      />,
    );

    const applyButton = await screen.findByRole("button", {
      name: "Metraj föyüne uygula",
    });
    fireEvent.click(applyButton);
    const dialog = screen.getByRole("dialog", {
      name: "Metraj föyüne uygulamayı onaylayın",
    });
    const confirmButton = within(dialog).getByRole("button", {
      name: "Onayla ve uygula",
    });
    await waitFor(() => expect(document.activeElement).toBe(confirmButton));

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(applyButton));

    fireEvent.click(applyButton);
    fireEvent.click(screen.getByRole("button", { name: "Onayla ve uygula" }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith("batch-1"));
    expect(await screen.findByText("Import satırları metraj föyüne uygulandı."))
      .toBeTruthy();
    const resultLink = await screen.findByRole("link", {
      name: "Oluşan metraj föyünü aç",
    });
    expect(resultLink.getAttribute("href")).toBe("#measurement-entry-workspace");
    await waitFor(() => expect(document.activeElement).toBe(resultLink));
  });

  test("keeps create controls out of the DOM when the scoped action closes creation", async () => {
    listMock.mockResolvedValue(listResult(batch(), false));

    render(
      <ConstructionMeasurementImportWorkspace
        projectId="project-1"
        sourceProgressPaymentId="payment-1"
      />,
    );

    expect(await screen.findByText(/Kapalı dönem veya mevcut yetki/)).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Kalıcı metraj CSV yükleme" })).toBeNull();
  });
});
