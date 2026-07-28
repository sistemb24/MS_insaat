/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ConstructionProgressPaymentSurface } from "./construction-progress-payment-surface";

const { applyRulesMock, createRuleMock, deactivateRuleMock, detailsMock, getImportMock, listImportMock, listProjectsMock, listRulesMock, listScenariosMock, getScenarioMock, previewRulesMock, reportMock } = vi.hoisted(() => ({
  applyRulesMock: vi.fn(),
  createRuleMock: vi.fn(),
  deactivateRuleMock: vi.fn(),
  detailsMock: vi.fn(),
  getImportMock: vi.fn(),
  listProjectsMock: vi.fn(),
  listImportMock: vi.fn(),
  listRulesMock: vi.fn(),
  listScenariosMock: vi.fn(),
  getScenarioMock: vi.fn(),
  previewRulesMock: vi.fn(),
  reportMock: vi.fn(),
}));

vi.mock("@/app/actions/construction-measurement-import-actions", () => ({
  applyConstructionMeasurementImportBatchAction: vi.fn(),
  cancelConstructionMeasurementImportBatchAction: vi.fn(),
  getConstructionMeasurementImportBatchAction: getImportMock,
  listConstructionMeasurementImportBatchesAction: listImportMock,
  uploadConstructionMeasurementImportAction: vi.fn(),
  validateConstructionMeasurementImportBatchAction: vi.fn(),
}));

vi.mock("@/components/construction-measurement-import-workspace", () => ({
  ConstructionMeasurementImportWorkspace: ({
    initialBatchId,
  }: {
    initialBatchId?: string;
  }) => (
    <section aria-label="Kalıcı metraj import çalışma alanı">
      {initialBatchId ?? "import-seçilmedi"}
    </section>
  ),
}));

vi.mock("@/app/actions/construction-simulation-scenario-actions", () => ({
  approveConstructionSimulationScenarioAction: vi.fn(),
  archiveConstructionSimulationScenarioAction: vi.fn(),
  cloneConstructionSimulationScenarioAction: vi.fn(),
  compareConstructionSimulationScenariosAction: vi.fn(),
  createConstructionSimulationScenarioAction: vi.fn(),
  getConstructionSimulationScenarioAction: getScenarioMock,
  listConstructionSimulationScenariosAction: listScenariosMock,
  reviseConstructionSimulationScenarioAction: vi.fn(),
}));

vi.mock("@/app/actions/construction-deduction-rule-actions", () => ({
  applyConstructionDeductionRulesAction: applyRulesMock,
  createConstructionDeductionRuleRevisionAction: createRuleMock,
  deactivateConstructionDeductionRuleAction: deactivateRuleMock,
  listConstructionDeductionRulesAction: listRulesMock,
  previewConstructionDeductionRulesAction: previewRulesMock,
}));

vi.mock("@/app/actions/construction-progress-payment-actions", () => ({
  approveConstructionProgressPaymentAction: vi.fn(),
  createConstructionContractItemAction: vi.fn(),
  createConstructionProgressPaymentAction: vi.fn(),
  createConstructionProjectAction: vi.fn(),
  finalizeConstructionProgressPaymentAction: vi.fn(),
  listConstructionProjectsAction: listProjectsMock,
  returnConstructionProgressPaymentAction: vi.fn(),
  saveConstructionProgressPaymentDraftAction: vi.fn(),
  submitConstructionProgressPaymentAction: vi.fn(),
}));

vi.mock("@/app/actions/construction-progress-payment-detail-actions", () => ({
  createConstructionContractItemPriceRevisionAction: vi.fn(),
  createConstructionDeductionMovementAction: vi.fn(),
  createConstructionExtraWorkAction: vi.fn(),
  createConstructionFinancialMovementAction: vi.fn(),
  createConstructionMeasurementLineAction: vi.fn(),
  createConstructionMeasurementSheetAction: vi.fn(),
  deleteConstructionProgressPaymentDetailAction: vi.fn(),
  getConstructionProgressPaymentReportAction: reportMock,
  listConstructionProgressPaymentDetailsAction: detailsMock,
}));

afterEach(() => {
  cleanup();
  applyRulesMock.mockReset();
  createRuleMock.mockReset();
  deactivateRuleMock.mockReset();
  detailsMock.mockReset();
  getImportMock.mockReset();
  listProjectsMock.mockReset();
  listImportMock.mockReset();
  listRulesMock.mockReset();
  listScenariosMock.mockReset();
  getScenarioMock.mockReset();
  previewRulesMock.mockReset();
  reportMock.mockReset();
});

beforeEach(() => {
  listRulesMock.mockResolvedValue({ ok: true, data: { canManage: false, rows: [] } });
  listScenariosMock.mockResolvedValue({ ok: true, data: { canApprove: false, canArchive: false, canCreate: false, rows: [] } });
  listImportMock.mockResolvedValue({ ok: true, data: { canCreate: true, rows: [] } });
});

describe("ConstructionProgressPaymentSurface", () => {
  test("renders real project, contract and item data in the Hakediş Pro workspace", async () => {
    listProjectsMock.mockResolvedValue({
      ok: true,
      data: {
        rows: [
          {
            code: "PRJ-001",
            contractAmount: 2_500_000,
            contractItems: [
              {
                contractQuantity: 1_200,
                description: "Betonarme temel imalatı",
                id: "item-1",
                itemCode: "15.001",
                priceRevisions: [],
                revisionNo: 0,
                unit: "m3",
                unitPrice: 1_850,
                vatRate: 20,
              },
            ],
            contractNo: "SZL-2026-001",
            id: "project-1",
            name: "Merkez Şantiye Yapım İşi",
            progressPayments: [],
            siteCode: "SNT-001",
            siteName: "Merkez Şantiye",
            status: "OPEN",
          },
        ],
      },
    });

    render(<ConstructionProgressPaymentSurface />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Hakediş Pro" }),
      ).toBeTruthy();
    });

    expect(
      document.querySelector(
        '[data-hakedis-pro-workspace="project-contract-items"]',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("navigation", {
        name: "Hakediş Pro çalışma alanı bölümleri",
      }),
    ).toBeTruthy();
    expect(screen.getByText("SZL-2026-001")).toBeTruthy();
    expect(screen.getAllByText("2.500.000,00 TL")).toHaveLength(2);

    const itemTable = screen.getByRole("table", {
      name: "PRJ-001 sözleşme poz listesi",
    });
    expect(within(itemTable).getByText("15.001")).toBeTruthy();
    expect(within(itemTable).getByText("Betonarme temel imalatı")).toBeTruthy();
    expect(within(itemTable).getByText("1.200")).toBeTruthy();
    expect(within(itemTable).getByText("2.220.000,00 TL")).toBeTruthy();
  });

  test("resolves an import deep-link to its scoped project, payment and import tab", async () => {
    getImportMock.mockResolvedValue({
      ok: true,
      data: {
        batch: {
          projectId: "project-1",
          sourceProgressPaymentId: "payment-1",
        },
      },
    });
    listProjectsMock.mockResolvedValue({
      ok: true,
      data: {
        rows: [{
          code: "PRJ-001",
          contractAmount: 100_000,
          contractItems: [{
            contractQuantity: 100,
            description: "Betonarme",
            id: "item-1",
            itemCode: "15.001",
            priceRevisions: [],
            revisionNo: 0,
            unit: "m3",
            unitPrice: 1_000,
            vatRate: 20,
          }],
          contractNo: "SZL-1",
          id: "project-1",
          name: "Deep-link Projesi",
          progressPayments: [{
            cumulativeGrossTotal: 10_000,
            documentNo: "HAK-001",
            id: "payment-1",
            kind: "FIRST",
            periodEnd: "2026-07-31T00:00:00.000Z",
            periodGrossTotal: 10_000,
            periodStart: "2026-07-01T00:00:00.000Z",
            progressPaymentId: null,
            sequenceNo: 1,
            snapshots: [],
            status: "DRAFT",
            updatedAt: "2026-07-23T10:00:00.000Z",
          }],
          siteCode: "SNT-1",
          siteName: "Şantiye",
          status: "OPEN",
        }],
      },
    });
    detailsMock.mockResolvedValue({
      ok: true,
      data: {
        canApplyDeductionRules: true,
        deductions: [],
        deductionRuleApplications: [],
        extraWorks: [],
        financialMovements: [],
        measurementSheets: [],
        summary: {
          periodAdditionTotal: 0,
          periodDeductionTotal: 0,
          periodExtraWorkTotal: 0,
          periodPayableTotal: 10_000,
        },
      },
    });
    reportMock.mockResolvedValue({
      ok: true,
      data: {
        accounting: null,
        approvals: [],
        auditLogs: [],
        deductions: [],
        extraWorks: [],
        financialMovements: [],
        greenBook: [],
        header: {
          contractNo: "SZL-1",
          currency: "TRY",
          documentNo: "HAK-001",
          kind: "FIRST",
          periodEnd: "2026-07-31T00:00:00.000Z",
          periodStart: "2026-07-01T00:00:00.000Z",
          progressPaymentId: "payment-1",
          projectCode: "PRJ-001",
          projectId: "project-1",
          projectName: "Deep-link Projesi",
          sequenceNo: 1,
          siteName: "Şantiye",
          status: "DRAFT",
        },
        manufacturingSheet: [{
          contractAmount: 100_000,
          contractItemId: "item-1",
          contractQuantity: 100,
          cumulativeAmount: 10_000,
          cumulativeQuantity: 10,
          cumulativeVatAmount: 2_000,
          description: "Betonarme",
          itemCode: "15.001",
          periodAmount: 10_000,
          periodQuantity: 10,
          periodVatAmount: 2_000,
          previousAmount: 0,
          previousQuantity: 0,
          unit: "m3",
          unitPrice: 1_000,
          vatRate: 20,
        }],
        measurementSheets: [],
        summary: {
          cumulativeAdditionTotal: 0,
          cumulativeDeductionTotal: 0,
          cumulativeExtraWorkTotal: 0,
          cumulativePayableTotal: 10_000,
          cumulativeWorkTotal: 10_000,
          cumulativeWorkVatTotal: 2_000,
          periodAdditionTotal: 0,
          periodDeductionTotal: 0,
          periodExtraWorkTotal: 0,
          periodPayableTotal: 10_000,
          periodWorkTotal: 10_000,
          periodWorkVatTotal: 2_000,
          projectedGrandTotal: 12_000,
          projectedGrossTotal: 10_000,
          projectedNetTotal: 10_000,
          projectedRetentionTotal: 0,
          projectedVatTotal: 2_000,
        },
      },
    });

    render(
      <ConstructionProgressPaymentSurface
        canManageMeasurementImports
        initialImportBatchId="batch-1"
      />,
    );

    expect(await screen.findByText("batch-1")).toBeTruthy();
    expect(getImportMock).toHaveBeenCalledWith("batch-1");
    expect(reportMock).toHaveBeenCalledWith("payment-1");
    expect(
      screen.getByRole("tab", { name: "Aktarım / Simülasyon" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  test("opens report views and keeps finalized supplementary movements read only", async () => {
    detailsMock.mockResolvedValue({ ok: true, data: {
      canApplyDeductionRules: true,
      deductions: [{ amount: 1_500, category: "İmalat/İşçilik", description: "Nefaset kesintisi", documentNo: "KES-001", id: "deduction-1", movementDate: "2026-07-17T00:00:00.000Z", totalAmount: 1_625, vatAmount: 125 }],
      deductionRuleApplications: [],
      extraWorks: [{ description: "İlave kalıp imalatı", documentNo: "TUT-001", id: "extra-1", periodAmount: 12_000, quantity: 10, status: "APPROVED", unit: "m2", unitPrice: 1_200, vatRate: 20, workDate: "2026-07-16T00:00:00.000Z" }],
      financialMovements: [{ amount: 5_000, description: "Teminat kesintisi", direction: "DEDUCTION", id: "financial-1", movementDate: "2026-07-17T00:00:00.000Z", movementType: "RETENTION" }],
      measurementSheets: [],
      summary: { periodAdditionTotal: 0, periodDeductionTotal: 25_000, periodExtraWorkTotal: 12_000, periodPayableTotal: 325_000 },
    } });
    listProjectsMock.mockResolvedValue({
      ok: true,
      data: {
        rows: [{
          code: "PRJ-001",
          contractAmount: 2_500_000,
          contractItems: [{ contractQuantity: 1_000, description: "Betonarme imalatı", id: "item-1", itemCode: "15.001", priceRevisions: [{ createdAt: "2026-07-01T00:00:00.000Z", effectiveFrom: "2026-07-01T00:00:00.000Z", id: "revision-1", reason: "Piyasa rayiç güncellemesi", revisionNo: 1, unitPrice: 2_220 }], revisionNo: 1, unit: "m3", unitPrice: 2_220, vatRate: 20 }],
          contractNo: "SZL-2026-001",
          id: "project-1",
          name: "Merkez Şantiye Yapım İşi",
          progressPayments: [{
            cumulativeGrossTotal: 1_250_000,
            documentNo: "HAK-2026-04",
            id: "payment-1",
            kind: "INTERIM",
            periodEnd: "2026-07-31T00:00:00.000Z",
            periodGrossTotal: 350_000,
            periodStart: "2026-07-01T00:00:00.000Z",
            progressPaymentId: "financial-payment-1",
            sequenceNo: 4,
            snapshots: [],
            status: "FINALIZED",
            updatedAt: "2026-07-19T00:00:00.000Z",
          }],
          siteCode: "SNT-001",
          siteName: "Merkez Şantiye",
          status: "CLOSED",
        }],
      },
    });
    reportMock.mockResolvedValue({
      ok: true,
      data: {
        accounting: { creditTotal: 390_000, currency: "TRY", debitTotal: 390_000, description: "HAK-2026-04 hakediş muhasebe kaydı", entryDate: "2026-07-31T00:00:00.000Z", ledgerDocumentNo: "YVM-HAK-0004", ledgerEntryId: "ledger-1", ledgerStatus: "POSTED", lines: [{ accountCode: "740.01.001", accountName: "Hizmet Üretim Maliyeti", credit: 0, debit: 350_000, description: "Hakediş bedeli", id: "line-1", lineNo: 1 }, { accountCode: "320.01.001", accountName: "Satıcılar", credit: 390_000, debit: 0, description: "Net borç", id: "line-2", lineNo: 2 }], progressPaymentId: "financial-payment-1" },
        approvals: [],
        auditLogs: [],
        deductions: [],
        extraWorks: [],
        financialMovements: [],
        greenBook: [
          { completionRate: 50, contractQuantity: 1_000, cumulativeQuantity: 500, description: "Betonarme imalatı", exceededContract: false, itemCode: "15.001", periodQuantity: 100, previousQuantity: 400, unit: "m3" },
          { completionRate: 110, contractQuantity: 100, cumulativeQuantity: 110, description: "Donatı imalatı", exceededContract: true, itemCode: "15.002", periodQuantity: 20, previousQuantity: 90, unit: "ton" },
        ],
        header: { contractNo: "SZL-2026-001", currency: "TRY", documentNo: "HAK-2026-04", kind: "INTERIM", periodEnd: "2026-07-31T00:00:00.000Z", periodStart: "2026-07-01T00:00:00.000Z", progressPaymentId: "payment-1", projectCode: "PRJ-001", projectId: "project-1", projectName: "Merkez Şantiye Yapım İşi", sequenceNo: 4, siteName: "Merkez Şantiye", status: "FINALIZED" },
        manufacturingSheet: [
          { contractAmount: 2_220_000, contractItemId: "item-1", contractQuantity: 1_000, cumulativeAmount: 1_110_000, cumulativeQuantity: 500, cumulativeVatAmount: 222_000, description: "Betonarme imalatı", itemCode: "15.001", periodAmount: 222_000, periodQuantity: 100, periodVatAmount: 44_400, previousAmount: 888_000, previousQuantity: 400, unit: "m3", unitPrice: 2_220, vatRate: 20 },
          { contractAmount: 185_000, contractItemId: "item-2", contractQuantity: 100, cumulativeAmount: 203_500, cumulativeQuantity: 110, cumulativeVatAmount: 40_700, description: "Donatı imalatı", itemCode: "15.002", periodAmount: 37_000, periodQuantity: 20, periodVatAmount: 7_400, previousAmount: 166_500, previousQuantity: 90, unit: "ton", unitPrice: 1_850, vatRate: 20 },
        ],
        measurementSheets: [],
        summary: { cumulativeAdditionTotal: 0, cumulativeDeductionTotal: 50_000, cumulativeExtraWorkTotal: 0, cumulativePayableTotal: 1_200_000, cumulativeWorkTotal: 1_250_000, cumulativeWorkVatTotal: 250_000, periodAdditionTotal: 0, periodDeductionTotal: 25_000, periodExtraWorkTotal: 0, periodPayableTotal: 325_000, periodWorkTotal: 350_000, periodWorkVatTotal: 70_000, projectedGrandTotal: 390_000, projectedGrossTotal: 350_000, projectedNetTotal: 325_000, projectedRetentionTotal: 25_000, projectedVatTotal: 65_000 },
      },
    });

    render(<ConstructionProgressPaymentSurface />);

    const paymentTable = await screen.findByRole("table", { name: "Hakediş listesi" });
    expect(within(paymentTable).getByText("HAK-2026-04")).toBeTruthy();
    const readOnlyMeasurement = await screen.findByRole("region", { name: "Genel ve demir metraj veri girişi" });
    expect(within(readOnlyMeasurement).getByText("Kesinleşti · salt okunur")).toBeTruthy();
    expect(within(readOnlyMeasurement).queryByRole("button", { name: "Föyü oluştur" })).toBeNull();
    const adjustments = await screen.findByRole("region", { name: "Tutanaklı işler ve kesintiler çalışma alanı" });
    expect(within(adjustments).getByRole("table", { name: "Tutanaklı işler" })).toBeTruthy();
    expect(within(adjustments).getByText("TUT-001")).toBeTruthy();
    expect(within(adjustments).queryByRole("button", { name: "Tutanak ekle" })).toBeNull();
    fireEvent.click(within(adjustments).getByRole("tab", { name: "Kesintiler" }));
    expect(within(adjustments).getByRole("table", { name: "Kesinti kalemleri" })).toBeTruthy();
    expect(within(adjustments).getByText("Nefaset kesintisi")).toBeTruthy();
    fireEvent.click(within(adjustments).getByRole("tab", { name: "Finansal Hareketler" }));
    expect(within(adjustments).getByText("Teminat kesintisi")).toBeTruthy();
    const revisions = screen.getByRole("region", { name: "Fiyat revizyonu çalışma alanı" });
    expect(within(revisions).getByText("Revizyon kapalı")).toBeTruthy();
    expect(within(revisions).getByRole("table", { name: "Poz fiyat revizyonları" })).toBeTruthy();
    expect(within(revisions).queryByRole("button", { name: "Yeni fiyatı kaydet" })).toBeNull();
    fireEvent.click(within(paymentTable).getByRole("button", { name: "Detay ve özet" }));

    const workspace = await screen.findByRole("region", { name: "Hakediş rapor çalışma alanı" });
    expect(within(workspace).getByRole("heading", { name: "Hakediş Özeti" })).toBeTruthy();
    expect(within(workspace).getByText("325.000,00 TRY")).toBeTruthy();

    fireEvent.click(within(workspace).getByRole("tab", { name: "Özet" }));
    expect(within(workspace).getByText("Dönem ödenecek")).toBeTruthy();

    fireEvent.click(within(workspace).getByRole("tab", { name: "Detay" }));
    expect(within(workspace).getByRole("heading", { name: "Yeşil Defter" })).toBeTruthy();
    expect(within(workspace).getByRole("heading", { name: "İmalat Çarşafı" })).toBeTruthy();
    expect(within(workspace).getAllByText("15.001")).toHaveLength(2);

    fireEvent.click(within(workspace).getByRole("tab", { name: "Yeşil Defter" }));
    const greenBook = within(workspace).getByRole("region", { name: "Yeşil Defter çalışma alanı" });
    expect(within(greenBook).getByRole("table", { name: "Yeşil Defter miktar tablosu" })).toBeTruthy();
    expect(within(greenBook).getByText("Sözleşme aşımı")).toBeTruthy();

    fireEvent.click(within(workspace).getByRole("tab", { name: "İmalat Çarşafı" }));
    const manufacturing = within(workspace).getByRole("region", { name: "İmalat Çarşafı çalışma alanı" });
    expect(within(manufacturing).getByRole("table", { name: "İmalat Çarşafı tutar tablosu" })).toBeTruthy();
    expect(within(manufacturing).getByText("Bu dönem")).toBeTruthy();

    fireEvent.click(within(workspace).getByRole("tab", { name: "Miktar Kontrolü" }));
    const quantityControl = within(workspace).getByRole("region", { name: "Miktar Kontrolü çalışma alanı" });
    expect(within(quantityControl).getByText("1 poz sözleşme miktarını aşıyor.")).toBeTruthy();
    expect(within(quantityControl).getByText("-10 ton")).toBeTruthy();

    fireEvent.click(within(workspace).getByRole("tab", { name: "Muhasebe" }));
    const accounting = within(workspace).getByRole("region", { name: "Hakediş muhasebe bağlantısı çalışma alanı" });
    expect(within(accounting).getAllByText("YVM-HAK-0004")).toHaveLength(2);
    expect(within(accounting).getByText("Fiş dengeli")).toBeTruthy();
    expect(within(accounting).getByText("740.01.001")).toBeTruthy();
    expect(within(accounting).queryByRole("button", { name: "Muhasebeye Gönder" })).toBeNull();

    fireEvent.click(within(workspace).getByRole("tab", { name: "Rapor Merkezi" }));
    const reportCenter = within(workspace).getByRole("region", { name: "Hakediş rapor merkezi" });
    expect(within(reportCenter).getByRole("heading", { name: "Rapor Merkezi" })).toBeTruthy();
    expect(within(reportCenter).getByRole("button", { name: "Yeşil Defter raporunu aç" })).toBeTruthy();
    expect(within(reportCenter).queryByRole("button", { name: "Excel" })).toBeNull();
    fireEvent.click(within(reportCenter).getByRole("button", { name: "Yeşil Defter raporunu aç" }));
    expect(within(workspace).getByRole("region", { name: "Yeşil Defter çalışma alanı" })).toBeTruthy();

    fireEvent.click(within(workspace).getByRole("tab", { name: "Aktarım / Simülasyon" }));
    const candidates = within(workspace).getByRole("region", { name: "Toplu aktarım ve poz bazlı simülasyon çalışma alanı" });
    expect(within(candidates).getByText("Yerel önizleme · yazma yok")).toBeTruthy();
    expect(within(candidates).queryByRole("button", { name: "Miktarı Föye Aktar" })).toBeNull();
    const simulationForm = within(candidates).getByRole("form", { name: "Poz bazlı metraj simülasyonu" });
    fireEvent.change(within(simulationForm).getByLabelText("Doğrudan miktar"), { target: { value: "10" } });
    fireEvent.submit(simulationForm);
    expect(within(candidates).getByText("510 m3")).toBeTruthy();
    expect(within(candidates).getByText("490 m3")).toBeTruthy();
    expect(within(candidates).getByText("22.200,00 TL")).toBeTruthy();

    const csvText = "poz_no;miktar;aciklama;birim\n15.001;12,5;Betonarme; m3\n15.999;4;Bilinmeyen; m3";
    const csvFile = new File([csvText], "metraj-onizleme.csv", { type: "text/csv" });
    Object.defineProperty(csvFile, "text", { value: vi.fn().mockResolvedValue(csvText) });
    fireEvent.change(within(candidates).getByLabelText("Metraj CSV dosyası"), { target: { files: [csvFile] } });
    expect(await within(candidates).findByText("Sözleşme pozu bulunamadı")).toBeTruthy();
    expect(within(candidates).getByText("12,5 m3")).toBeTruthy();
    expect(
      within(candidates).queryByRole("region", {
        name: "Kalıcı metraj import çalışma alanı",
      }),
    ).toBeNull();
  });

  test("switches between general and rebar measurement entry using real sheet data", async () => {
    listProjectsMock.mockResolvedValue({
      ok: true,
      data: {
        rows: [{
          code: "PRJ-001",
          contractAmount: 2_500_000,
          contractItems: [{ contractQuantity: 1_200, description: "Betonarme temel imalatı", id: "item-1", itemCode: "15.001", priceRevisions: [], revisionNo: 0, unit: "m3", unitPrice: 1_850, vatRate: 20 }],
          contractNo: "SZL-2026-001",
          id: "project-1",
          name: "Merkez Şantiye Yapım İşi",
          progressPayments: [{ cumulativeGrossTotal: 18_500, documentNo: "HAK-2026-05", id: "payment-1", kind: "INTERIM", periodEnd: "2026-07-31T00:00:00.000Z", periodGrossTotal: 18_500, periodStart: "2026-07-01T00:00:00.000Z", progressPaymentId: null, sequenceNo: 5, snapshots: [], status: "DRAFT", updatedAt: "2026-07-19T00:00:00.000Z" }],
          siteCode: "SNT-001",
          siteName: "Merkez Şantiye",
          status: "OPEN",
        }],
      },
    });
    detailsMock.mockResolvedValue({
      ok: true,
      data: {
        canApplyDeductionRules: true,
        deductions: [],
        deductionRuleApplications: [],
        extraWorks: [],
        financialMovements: [],
        measurementSheets: [
          { id: "sheet-general", lines: [{ description: "Aks A-B temel", height: 0.5, id: "line-general", itemCode: "15.001", itemDescription: "Betonarme temel imalatı", length: 10, lineNo: 1, multiplier: 2, quantity: 30, unit: "m3", width: 3 }], sheetNo: "GM-01", sheetType: "GENERAL", status: "DRAFT", title: "Temel genel metrajı" },
          { id: "sheet-rebar", lines: [{ description: "Zemin kat kolonları", height: null, id: "line-rebar", itemCode: "15.001", itemDescription: "Betonarme temel imalatı", length: 12, lineNo: 1, multiplier: 8, quantity: 96, unit: "m3", width: null }], sheetNo: "DM-01", sheetType: "REBAR", status: "DRAFT", title: "Kolon demir metrajı" },
        ],
        summary: { periodAdditionTotal: 0, periodDeductionTotal: 0, periodExtraWorkTotal: 0, periodPayableTotal: 18_500 },
      },
    });

    render(<ConstructionProgressPaymentSurface />);

    const workspace = await screen.findByRole("region", { name: "Genel ve demir metraj veri girişi" });
    expect(within(workspace).getAllByText("GM-01")).toHaveLength(2);
    expect(within(workspace).getByRole("table", { name: "GM-01 metraj satırları" })).toBeTruthy();
    expect(within(workspace).getByText("30 m3")).toBeTruthy();

    fireEvent.click(within(workspace).getByRole("tab", { name: "Demir Metrajı" }));
    expect(within(workspace).getAllByText("DM-01")).toHaveLength(2);
    expect(within(workspace).getByRole("table", { name: "DM-01 metraj satırları" })).toBeTruthy();
    expect(within(workspace).getByText("96 m3")).toBeTruthy();
    expect(within(workspace).getByPlaceholderText("Boy (m)")).toBeTruthy();
    expect(within(workspace).queryByPlaceholderText("Yükseklik")).toBeNull();
  });

  test("manages project rules and previews payment rule snapshots", async () => {
    const rule = { id: "rule-1", ruleKey: "retention:project-1", code: "TEMINAT", name: "Teminat Kesintisi", category: "TEMINAT", description: "Sözleşme teminatı", revisionNo: 1, calculationType: "RATE", baseType: "PERIOD_NET_PLUS_EXTRAS", rate: 5, fixedAmount: null, minimumAmount: null, maximumAmount: null, taxMode: "NONE", taxRate: 0, priority: 10, effectiveFrom: "2026-01-01T00:00:00.000Z", effectiveTo: null, isActive: true, autoApply: false };
    listRulesMock.mockResolvedValue({ ok: true, data: { canManage: true, rows: [rule] } });
    listProjectsMock.mockResolvedValue({ ok: true, data: { rows: [{ code: "PRJ-001", contractAmount: 100_000, contractItems: [], contractNo: "SZL-1", id: "project-1", name: "Kural Test Projesi", progressPayments: [{ cumulativeGrossTotal: 10_000, documentNo: "HAK-001", id: "payment-1", kind: "FIRST", periodEnd: "2026-07-31T00:00:00.000Z", periodGrossTotal: 10_000, periodStart: "2026-07-01T00:00:00.000Z", progressPaymentId: null, sequenceNo: 1, snapshots: [], status: "DRAFT", updatedAt: "2026-07-22T00:00:00.000Z" }], siteCode: "SNT-1", siteName: "Şantiye", status: "OPEN" }] } });
    detailsMock.mockResolvedValue({ ok: true, data: { canApplyDeductionRules: true, deductions: [{ amount: 500, category: "TEMINAT", description: "Teminat Kesintisi · REV-1", documentNo: null, id: "movement-1", movementDate: "2026-07-31T00:00:00.000Z", ruleApplicationId: "application-1", totalAmount: 500, vatAmount: 0 }], deductionRuleApplications: [{ id: "application-1", ruleKey: rule.ruleKey, ruleCode: rule.code, ruleName: rule.name, ruleRevisionNo: 1, calculationType: "RATE", baseType: "PERIOD_NET_PLUS_EXTRAS", baseAmount: 10_000, rate: 5, fixedAmount: null, minimumAmount: null, maximumAmount: null, taxMode: "NONE", taxRate: 0, taxAmount: 0, netAmount: 500, totalAmount: 500, appliedBy: "accounting-1", appliedAt: "2026-07-22T08:00:00.000Z", updatedAt: "2026-07-22T08:00:00.000Z" }], extraWorks: [], financialMovements: [], measurementSheets: [], summary: { periodAdditionTotal: 0, periodDeductionTotal: 500, periodExtraWorkTotal: 0, periodPayableTotal: 9_500 } } });
    previewRulesMock.mockResolvedValue({ ok: true, data: { paymentId: "payment-1", rows: [{ ruleKey: rule.ruleKey, code: rule.code, name: rule.name, revisionNo: 1, calculationType: "RATE", baseType: "PERIOD_NET_PLUS_EXTRAS", baseAmount: 10_000, rate: 5, fixedAmount: null, minimumAmount: null, maximumAmount: null, taxMode: "NONE", taxRate: 0, taxAmount: 0, netAmount: 500, totalAmount: 500, priority: 10 }], periodPayableBeforeRules: 10_000, periodPayableTotal: 9_500, totalRuleDeduction: 500, createdCount: 0, updatedCount: 0 } });
    applyRulesMock.mockResolvedValue({ ok: true, data: { rows: [], createdCount: 0, updatedCount: 0 } });

    render(<ConstructionProgressPaymentSurface />);

    const ruleTable = await screen.findByRole("table", { name: "Kesinti kural listesi" });
    expect(within(ruleTable).getByText("TEMINAT · R1")).toBeTruthy();
    expect(screen.getByRole("form", { name: "Kesinti kuralı oluştur veya revize et" })).toBeTruthy();

    const adjustments = await screen.findByRole("region", { name: "Tutanaklı işler ve kesintiler çalışma alanı" });
    fireEvent.click(within(adjustments).getByRole("tab", { name: "Kesintiler" }));
    const ruleWorkspace = within(adjustments).getByRole("region", { name: "Hakediş kesinti kuralı önizleme ve uygulama" });
    expect(within(ruleWorkspace).getByRole("table", { name: "Uygulanan kesinti kuralı snapshotları" })).toBeTruthy();
    expect(within(ruleWorkspace).getByText("500,00 / 500,00 TL")).toBeTruthy();
    expect(within(adjustments).getByText("Kural kaydı")).toBeTruthy();
    expect(within(adjustments).queryByRole("button", { name: "Sil" })).toBeNull();

    fireEvent.click(within(ruleWorkspace).getByRole("button", { name: "Kuralları önizle" }));
    expect(await within(ruleWorkspace).findByRole("table", { name: "Kesinti kuralı önizlemesi" })).toBeTruthy();
    const applyButton = within(ruleWorkspace).getByRole("button", { name: "Önizlenen kuralları uygula" }) as HTMLButtonElement;
    await waitFor(() => expect(applyButton.disabled).toBe(false));
    fireEvent.click(applyButton);
    await waitFor(() => expect(applyRulesMock).toHaveBeenCalledWith("payment-1"));
  });
});
