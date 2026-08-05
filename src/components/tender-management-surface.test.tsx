/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import type { TenderRow } from "@/lib/tender-service";

import { TenderManagementSurface } from "./tender-management-surface";

afterEach(() => {
  cleanup();
});

describe("TenderManagementSurface", () => {
  test("renders the tender analysis summary, status tabs and list columns", () => {
    render(
      <TenderManagementSurface
        rows={[
          createTender({
            id: "tender-1",
            status: "Takip",
            tenderNo: "IHL-2026-001",
            ikn: "2026/123456",
            title: "Kuzey Aksı altyapı yapım işi",
            submissionDeadline: "2026-07-03T14:00",
          }),
          createTender({
            id: "tender-2",
            status: "Sunuldu",
            tenderNo: "IHL-2026-002",
            ikn: "2026/654321",
            title: "Okul güçlendirme inşaatı",
            bidValue: 2300000,
            submissionDeadline: "2026-06-28T17:00",
          }),
          createTender({
            id: "tender-3",
            status: "Kazanıldı",
            tenderNo: "IHL-2026-003",
            ikn: "2026/777001",
            title: "Hastane ek bina yapım işi",
            bidValue: 3900000,
            contractValue: 3850000,
            submissionDeadline: "2026-06-20T10:00",
          }),
        ]}
        today="2026-07-01T09:00:00"
      />,
    );

    expect(screen.getByRole("heading", { name: "İhale Yönetimi" })).toBeTruthy();
    expect(screen.getByText("Kazanma Oranı")).toBeTruthy();
    expect(screen.getByText("Toplam İhale")).toBeTruthy();
    expect(screen.getByText("Kazanılan Değer")).toBeTruthy();
    expect(screen.getByText("Sözleşme Bedeli")).toBeTruthy();

    const statusTabs = screen.getByRole("list", {
      name: "İhale durum sayaçları",
    });
    expect(within(statusTabs).getByText("Takip")).toBeTruthy();
    expect(within(statusTabs).getByText("Hazırlanıyor")).toBeTruthy();
    expect(within(statusTabs).getByText("Sunuldu")).toBeTruthy();
    expect(within(statusTabs).getByText("Kazanıldı")).toBeTruthy();
    expect(within(statusTabs).getByText("Kaybedildi")).toBeTruthy();
    expect(within(statusTabs).getByText("İptal")).toBeTruthy();

    expect(screen.getByRole("columnheader", { name: "NO / İKN" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "BAŞLIK" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "İHALE MAKAMI" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "SON TEKLİF" })).toBeTruthy();
    expect(
      screen.getAllByText("Kuzey Aksı altyapı yapım işi").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Süre doldu")).toBeTruthy();
    expect(screen.getByText("Yaklaşan son teklif")).toBeTruthy();
  });

  test("filters the real tender rows, exports the filtered list and renders Kanban", () => {
    render(
      <TenderManagementSurface
        rows={[
          createTender({
            id: "tender-road",
            status: "Takip",
            tenderNo: "IHL-ROAD",
            title: "Kuzey aksı yol yapım işi",
          }),
          createTender({
            authorityName: "İl Milli Eğitim Müdürlüğü",
            id: "tender-school",
            status: "Sunuldu",
            tenderNo: "IHL-SCHOOL",
            title: "Okul güçlendirme inşaatı",
          }),
        ]}
        today="2026-07-01T09:00:00"
      />,
    );

    const search = screen.getByRole("searchbox", { name: "İhale ara" });
    fireEvent.change(search, { target: { value: "milli eğitim" } });

    const table = screen.getByRole("table", { name: "İhale listesi tablosu" });
    expect(within(table).getByText("Okul güçlendirme inşaatı")).toBeTruthy();
    expect(within(table).queryByText("Kuzey aksı yol yapım işi")).toBeNull();

    const csvLink = screen.getByRole("link", { name: "CSV" });
    expect(csvLink.getAttribute("download")).toBe("ihale-listesi.csv");
    expect(decodeURIComponent(csvLink.getAttribute("href") ?? "")).toContain(
      "IHL-SCHOOL",
    );
    expect(decodeURIComponent(csvLink.getAttribute("href") ?? "")).not.toContain(
      "IHL-ROAD",
    );

    fireEvent.click(screen.getByRole("button", { name: "Kanban" }));

    const kanban = screen.getByLabelText("İhale Kanban panosu");
    expect(within(kanban).getByText("Okul güçlendirme inşaatı")).toBeTruthy();
    expect(within(kanban).queryByText("Kuzey aksı yol yapım işi")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Kanban" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  test("applies the global search deep-link query and highlights its tender", () => {
    render(
      <TenderManagementSurface
        highlightedRecordId="tender-school"
        initialSearchQuery="IHL-SCHOOL"
        rows={[
          createTender({ id: "tender-road", tenderNo: "IHL-ROAD" }),
          createTender({ id: "tender-school", tenderNo: "IHL-SCHOOL" }),
        ]}
      />,
    );

    expect(
      screen.getByRole("searchbox", { name: "İhale ara" }).getAttribute("value"),
    ).toBe("IHL-SCHOOL");
    const table = screen.getByRole("table", { name: "İhale listesi tablosu" });
    expect(within(table).queryByText("IHL-ROAD")).toBeNull();
    expect(
      within(table)
        .getByRole("row", { name: /IHL-SCHOOL/i })
        .getAttribute("data-highlighted"),
    ).toBe("true");
  });

  test("opens, focuses and dismisses the canonical three-tab tender form", () => {
    render(<TenderManagementSurface rows={[]} today="2026-07-01T09:00:00" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Yeni İhale" }));

    expect(screen.getByLabelText("Yeni ihale formu")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Başlık"));
    expect(screen.getAllByRole("tab")).toHaveLength(3);

    fireEvent.click(
      screen.getByRole("button", { name: "Yeni ihale formunu kapat" }),
    );

    expect(screen.queryByLabelText("Yeni ihale formu")).toBeNull();
  });

  test("opens the new tender form and saves a draft from step 1 and step 2", () => {
    render(
      <TenderManagementSurface
        rows={[
          createTender({
            id: "tender-1",
            status: "Takip",
            tenderNo: "IHL-2026-001",
            title: "Kuzey Aksı altyapı yapım işi",
          }),
        ]}
        today="2026-07-01T09:00:00"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Yeni İhale" }));

    expect(screen.getByRole("heading", { name: "Yeni İhale" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Genel & Takvim" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Maliyet & Teklif" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "BOQ / Poz" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Başlık"), {
      target: { value: "Kavşak düzenleme yapım işi" },
    });
    fireEvent.change(screen.getByLabelText("İhale No"), {
      target: { value: "IHL-2026-005" },
    });
    fireEvent.change(screen.getByLabelText("EKAP / İKN"), {
      target: { value: "2026/888999" },
    });
    fireEvent.change(screen.getByLabelText("İhale Makamı"), {
      target: { value: "Karayolları 1. Bölge Müdürlüğü" },
    });
    fireEvent.change(screen.getByLabelText("Son Teklif Tarihi"), {
      target: { value: "2026-07-15T14:30" },
    });
    fireEvent.change(screen.getByLabelText("Yer / İl"), {
      target: { value: "İstanbul" },
    });

    fireEvent.click(screen.getByRole("tab", { name: "Maliyet & Teklif" }));
    fireEvent.change(screen.getByLabelText("İdare Yaklaşık Maliyeti"), {
      target: { value: "1800000" },
    });
    fireEvent.change(screen.getByLabelText("Genel Gider (Overhead) %"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("Kâr Marjı %"), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText("Bizim Teklif Bedeli"), {
      target: { value: "1650000" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));

    expect(screen.getByText("İhale taslağı listeye eklendi.")).toBeTruthy();
    expect(
      screen.getAllByText("Kavşak düzenleme yapım işi").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Hazırlanıyor").length).toBeGreaterThan(0);
    expect(screen.getByText("2")).toBeTruthy();
  });

  test("shows a validation message when the draft title is empty", () => {
    render(<TenderManagementSurface rows={[]} today="2026-07-01T09:00:00" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Yeni İhale" }));
    fireEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));

    expect(screen.getByRole("alert").textContent).toContain("Başlık zorunludur");
  });

  test("edits BOQ lines and updates profitability simulation", () => {
    render(<TenderManagementSurface rows={[]} today="2026-07-01T09:00:00" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Yeni İhale" }));
    fireEvent.change(screen.getByLabelText("Başlık"), {
      target: { value: "Köprü bakım yapım işi" },
    });

    fireEvent.click(screen.getByRole("tab", { name: "Maliyet & Teklif" }));
    fireEvent.change(screen.getByLabelText("Genel Gider (Overhead) %"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Kâr Marjı %"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Bizim Teklif Bedeli"), {
      target: { value: "1200" },
    });

    fireEvent.click(screen.getByRole("tab", { name: "BOQ / Poz" }));

    expect(screen.getByRole("heading", { name: "BOQ / Poz Cetveli" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Poz"), {
      target: { value: "01.001" },
    });
    fireEvent.change(screen.getByLabelText("İş Kalemi"), {
      target: { value: "Fore kazık imalatı" },
    });
    fireEvent.change(screen.getByLabelText("Birim"), {
      target: { value: "m" },
    });
    fireEvent.change(screen.getByLabelText("Miktar"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Malzeme"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("İşçilik"), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText("Ekipman"), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText("Taşeron"), {
      target: { value: "200" },
    });
    fireEvent.change(screen.getByLabelText("Nakliye"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Birim Teklif"), {
      target: { value: "500" },
    });

    expect(screen.getByText("Toplam Maliyet")).toBeTruthy();
    expect(screen.getByText("770,00 TL")).toBeTruthy();
    expect(screen.getByText("BOQ Teklif Toplamı")).toBeTruthy();
    expect(screen.getByText("1.000,00 TL")).toBeTruthy();
    expect(screen.getByText("Önerilen Teklif")).toBeTruthy();
    expect(screen.getByText("1.016,40 TL")).toBeTruthy();
    expect(screen.getByText("Kâr")).toBeTruthy();
    expect(screen.getByText("430,00 TL")).toBeTruthy();
    expect(screen.getByText("Kâr Oranı")).toBeTruthy();
    expect(screen.getByText("%35,83")).toBeTruthy();
  });

  test("transfers BOQ bid total to the draft bid value on demand", () => {
    render(<TenderManagementSurface rows={[]} today="2026-07-01T09:00:00" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Yeni İhale" }));
    fireEvent.change(screen.getByLabelText("Başlık"), {
      target: { value: "Köprü bakım yapım işi" },
    });

    fireEvent.click(screen.getByRole("tab", { name: "Maliyet & Teklif" }));
    fireEvent.change(screen.getByLabelText("Bizim Teklif Bedeli"), {
      target: { value: "1200" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "BOQ / Poz" }));
    fireEvent.change(screen.getByLabelText("Miktar"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Birim Teklif"), {
      target: { value: "500" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "BOQ Toplamını Teklife Aktar" }),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Maliyet & Teklif" }));

    expect(
      (screen.getByLabelText("Bizim Teklif Bedeli") as HTMLInputElement).value,
    ).toBe("1000");
  });

  test("uses persistence when creating a tender draft from the form", async () => {
    const receivedValues: unknown[] = [];

    render(
      <TenderManagementSurface
        persistence={{
          async createTender(values) {
            receivedValues.push(values);

            return {
              ok: true,
              data: createTender({
                bidValue: values.bidValue,
                id: "persisted-tender-1",
                status: "Hazırlanıyor",
                tenderNo: "IHL-2026-006",
                title: "Köprü bakım yapım işi",
              }),
            };
          },
        }}
        rows={[]}
        today="2026-07-01T09:00:00"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Yeni İhale" }));
    fireEvent.change(screen.getByLabelText("Başlık"), {
      target: { value: "Köprü bakım yapım işi" },
    });
    fireEvent.change(screen.getByLabelText("İhale No"), {
      target: { value: "IHL-2026-006" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Maliyet & Teklif" }));
    fireEvent.change(screen.getByLabelText("Bizim Teklif Bedeli"), {
      target: { value: "2750000" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "BOQ / Poz" }));
    fireEvent.change(screen.getByLabelText("Poz"), {
      target: { value: "01.001" },
    });
    fireEvent.change(screen.getByLabelText("İş Kalemi"), {
      target: { value: "Fore kazık imalatı" },
    });
    fireEvent.change(screen.getByLabelText("Birim"), {
      target: { value: "m" },
    });
    fireEvent.change(screen.getByLabelText("Miktar"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Malzeme"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("İşçilik"), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText("Ekipman"), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText("Taşeron"), {
      target: { value: "200" },
    });
    fireEvent.change(screen.getByLabelText("Nakliye"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Birim Teklif"), {
      target: { value: "500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));

    expect(await screen.findByText("İhale taslağı kalıcı kaynağa eklendi.")).toBeTruthy();
    expect(receivedValues).toEqual([
      expect.objectContaining({
        bidValue: 2750000,
        boqLines: [
          expect.objectContaining({
            description: "Fore kazık imalatı",
            equipmentCost: 25,
            laborCost: 50,
            materialCost: 100,
            pozNo: "01.001",
            quantity: 2,
            shippingCost: 10,
            subcontractorCost: 200,
            unit: "m",
            unitBid: 500,
          }),
        ],
        currency: "TRY",
        tenderNo: "IHL-2026-006",
        title: "Köprü bakım yapım işi",
      }),
    ]);
    expect(screen.getAllByText("Köprü bakım yapım işi").length).toBeGreaterThan(0);
  });

  test("transitions a tender status from the list through persistence", async () => {
    const receivedTransitions: unknown[] = [];

    render(
      <TenderManagementSurface
        persistence={{
          async transitionTenderStatus(tenderId, status) {
            receivedTransitions.push({ status, tenderId });

            return {
              ok: true,
              data: createTender({
                id: tenderId,
                status,
                tenderNo: "IHL-2026-010",
                title: "Yol bakım ihalesi",
              }),
            };
          },
        }}
        rows={[
          createTender({
            id: "tender-10",
            status: "Hazırlanıyor",
            tenderNo: "IHL-2026-010",
            title: "Yol bakım ihalesi",
          }),
        ]}
        today="2026-07-01T09:00:00"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sunuldu yap" }));

    expect(await screen.findByText("İhale durumu Sunuldu olarak güncellendi.")).toBeTruthy();
    expect(receivedTransitions).toEqual([
      {
        status: "Sunuldu",
        tenderId: "tender-10",
      },
    ]);
    expect(screen.getAllByText("Sunuldu").length).toBeGreaterThan(0);
  });

  test("opens an existing tender BOQ editor and persists copied and deleted lines", async () => {
    const receivedUpdates: unknown[] = [];

    render(
      <TenderManagementSurface
        persistence={{
          async updateTenderBoq(tenderId, values) {
            receivedUpdates.push({ tenderId, values });

            return {
              ok: true,
              data: createTender({
                bidValue: 1200,
                boqBidTotal: 1950,
                boqLineCount: 1,
                boqLines: [
                  {
                    description: "Başlık kirişi",
                    equipmentCost: 25,
                    laborCost: 50,
                    lineBidTotal: 1950,
                    lineCostTotal: 1155,
                    lineNo: 1,
                    materialCost: 100,
                    pozNo: "01.001",
                    quantity: 3,
                    shippingCost: 10,
                    subcontractorCost: 200,
                    unit: "m",
                    unitBid: 650,
                    unitCost: 385,
                  },
                ],
                id: "tender-20",
                status: "Hazırlanıyor",
                tenderNo: "IHL-2026-020",
                title: "Köprü bakım yapım işi",
              }),
            };
          },
        }}
        rows={[
          createTender({
            bidValue: 1200,
            boqBidTotal: 1000,
            boqLineCount: 1,
            boqLines: [
              {
                description: "Fore kazık imalatı",
                equipmentCost: 25,
                laborCost: 50,
                lineBidTotal: 1000,
                lineCostTotal: 770,
                lineNo: 1,
                materialCost: 100,
                pozNo: "01.001",
                quantity: 2,
                shippingCost: 10,
                subcontractorCost: 200,
                unit: "m",
                unitBid: 500,
                unitCost: 385,
              },
            ],
            id: "tender-20",
            overheadRate: 10,
            profitMargin: 20,
            status: "Hazırlanıyor",
            tenderNo: "IHL-2026-020",
            title: "Köprü bakım yapım işi",
          }),
        ]}
        today="2026-07-01T09:00:00"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "BOQ Düzenle IHL-2026-020" }),
    );

    expect(screen.getByRole("heading", { name: "BOQ Düzenle" })).toBeTruthy();
    expect(screen.getByDisplayValue("Fore kazık imalatı")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Satır Kopyala 1" }));
    fireEvent.change(screen.getAllByLabelText("İş Kalemi")[1], {
      target: { value: "Başlık kirişi" },
    });
    fireEvent.change(screen.getAllByLabelText("Miktar")[1], {
      target: { value: "3" },
    });
    fireEvent.change(screen.getAllByLabelText("Birim Teklif")[1], {
      target: { value: "650" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Satır Sil 1" }));
    fireEvent.click(screen.getByRole("button", { name: "BOQ Kaydet" }));

    expect(await screen.findByText("BOQ satırları güncellendi.")).toBeTruthy();
    expect(receivedUpdates).toEqual([
      {
        tenderId: "tender-20",
        values: {
          bidValue: 1200,
          boqLines: [
            expect.objectContaining({
              description: "Başlık kirişi",
              pozNo: "01.001",
              quantity: 3,
              unitBid: 650,
            }),
          ],
        },
      },
    ]);
    expect(screen.getByText("1.950,00 TL")).toBeTruthy();
  });

  test("persists BOQ total transfer from an existing tender editor", async () => {
    const receivedUpdates: unknown[] = [];

    render(
      <TenderManagementSurface
        persistence={{
          async updateTenderBoq(tenderId, values) {
            receivedUpdates.push({ tenderId, values });

            return {
              ok: true,
              data: createTender({
                bidValue: 1000,
                boqBidTotal: 1000,
                boqLineCount: 1,
                id: "tender-21",
                status: "Hazırlanıyor",
                tenderNo: "IHL-2026-021",
                title: "Köprü bakım yapım işi",
              }),
            };
          },
        }}
        rows={[
          createTender({
            bidValue: 1200,
            boqBidTotal: 1000,
            boqLineCount: 1,
            boqLines: [
              {
                description: "Fore kazık imalatı",
                equipmentCost: 25,
                laborCost: 50,
                lineBidTotal: 1000,
                lineCostTotal: 770,
                lineNo: 1,
                materialCost: 100,
                pozNo: "01.001",
                quantity: 2,
                shippingCost: 10,
                subcontractorCost: 200,
                unit: "m",
                unitBid: 500,
                unitCost: 385,
              },
            ],
            id: "tender-21",
            overheadRate: 10,
            profitMargin: 20,
            status: "Hazırlanıyor",
            tenderNo: "IHL-2026-021",
            title: "Köprü bakım yapım işi",
          }),
        ]}
        today="2026-07-01T09:00:00"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "BOQ Düzenle IHL-2026-021" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "BOQ Toplamını Teklife Aktar" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "BOQ Kaydet" }));

    expect(await screen.findByText("BOQ satırları güncellendi.")).toBeTruthy();
    expect(receivedUpdates).toEqual([
      {
        tenderId: "tender-21",
        values: expect.objectContaining({
          bidValue: 1000,
          boqLines: [
            expect.objectContaining({
              quantity: 2,
              unitBid: 500,
            }),
          ],
        }),
      },
    ]);
  });

  test("opens a site conversion wizard for a won tender", async () => {
    const receivedConversions: unknown[] = [];

    render(
      <TenderManagementSurface
        persistence={{
          async convertTenderToSite(tenderId, values) {
            receivedConversions.push({ tenderId, values });

            return {
              ok: true,
              data: createTender({
                convertedSiteCode: values.siteCode,
                convertedSiteName: values.siteName,
                convertedToSiteAt: "2026-07-01T12:15:00.000Z",
                id: "tender-30",
                status: "Kazanıldı",
                tenderNo: "IHL-2026-030",
                title: "Kavşak düzenleme yapım işi",
              }),
            };
          },
        }}
        rows={[
          createTender({
            bidValue: 3900000,
            contractValue: 3850000,
            id: "tender-30",
            status: "Kazanıldı",
            tenderNo: "IHL-2026-030",
            title: "Kavşak düzenleme yapım işi",
          }),
        ]}
        today="2026-07-01T09:00:00"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Şantiye Aç IHL-2026-030" }),
    );

    expect(
      screen.getByRole("heading", { name: "İhaleden Şantiye Oluştur" }),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Şantiye Adı") as HTMLInputElement).value,
    ).toBe("Kavşak düzenleme yapım işi");
    expect(
      (screen.getByLabelText("Proje Tutarı") as HTMLInputElement).value,
    ).toBe("3850000");

    fireEvent.change(screen.getByLabelText("Şantiye Kodu"), {
      target: { value: "SANT-0003" },
    });
    fireEvent.change(screen.getByLabelText("Yetkili"), {
      target: { value: "Murat" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Şantiye Oluştur" }));

    expect(await screen.findByText("Şantiye kartı oluşturuldu.")).toBeTruthy();
    expect(receivedConversions).toEqual([
      {
        tenderId: "tender-30",
        values: {
          projectAmount: 3850000,
          responsible: "Murat",
          siteCode: "SANT-0003",
          siteName: "Kavşak düzenleme yapım işi",
        },
      },
    ]);
    expect(screen.getByText("SANT-0003")).toBeTruthy();
  });
  test("filters the tender list by clicking a status counter", () => {
    render(
      <TenderManagementSurface
        rows={[
          createTender({
            id: "tender-1",
            status: "Takip",
            tenderNo: "IHL-2026-001",
            title: "Kuzey Aksı altyapı yapım işi",
          }),
          createTender({
            id: "tender-2",
            status: "Sunuldu",
            tenderNo: "IHL-2026-002",
            title: "Okul güçlendirme inşaatı",
          }),
          createTender({
            id: "tender-3",
            status: "Kazanıldı",
            tenderNo: "IHL-2026-003",
            title: "Hastane ek bina yapım işi",
          }),
        ]}
        today="2026-07-01T09:00:00"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sunuldu 1" }));

    const table = screen.getByRole("table");

    expect(within(table).getByText("Okul güçlendirme inşaatı")).toBeTruthy();
    expect(within(table).queryByText("Kuzey Aksı altyapı yapım işi")).toBeNull();
    expect(within(table).queryByText("Hastane ek bina yapım işi")).toBeNull();
    expect(screen.getByText("3 kayıt içinden 1 gösteriliyor.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sunuldu 1" }));

    expect(within(table).getByText("Kuzey Aksı altyapı yapım işi")).toBeTruthy();
    expect(within(table).getByText("Hastane ek bina yapım işi")).toBeTruthy();
  });

  test("filters the tender list by clicking a deadline filter", () => {
    render(
      <TenderManagementSurface
        rows={[
          createTender({
            id: "tender-1",
            status: "Sunuldu",
            submissionDeadline: "2026-06-28T17:00",
            tenderNo: "IHL-2026-001",
            title: "Süre dolan yol yapım işi",
          }),
          createTender({
            id: "tender-2",
            status: "Takip",
            submissionDeadline: "2026-07-03T12:00",
            tenderNo: "IHL-2026-002",
            title: "Yaklaşan okul güçlendirme işi",
          }),
          createTender({
            id: "tender-3",
            status: "Kazanıldı",
            submissionDeadline: "2026-06-20T10:00",
            tenderNo: "IHL-2026-003",
            title: "Kapanmış hastane ek bina işi",
          }),
        ]}
        today="2026-07-01T09:00:00"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Süre Doldu" }));

    const table = screen.getByRole("table");

    expect(within(table).getByText("Süre dolan yol yapım işi")).toBeTruthy();
    expect(within(table).queryByText("Yaklaşan okul güçlendirme işi")).toBeNull();
    expect(within(table).queryByText("Kapanmış hastane ek bina işi")).toBeNull();
    expect(screen.getByText("3 kayıt içinden 1 gösteriliyor.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Süre Doldu" }));

    expect(within(table).getByText("Yaklaşan okul güçlendirme işi")).toBeTruthy();
    expect(within(table).getByText("Süre dolan yol yapım işi")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Yaklaşıyor" }));

    expect(within(table).getByText("Yaklaşan okul güçlendirme işi")).toBeTruthy();
    expect(within(table).queryByText("Süre dolan yol yapım işi")).toBeNull();
    expect(within(table).queryByText("Kapanmış hastane ek bina işi")).toBeNull();
  });

  test("toggles between the tender list and analysis board", () => {
    render(
      <TenderManagementSurface
        rows={[
          createTender({
            authorityName: "İstanbul Büyükşehir Belediyesi",
            id: "tender-1",
            status: "Takip",
            tenderNo: "IHL-2026-001",
            title: "Kuzey Aksı altyapı yapım işi",
          }),
          createTender({
            authorityName: "İstanbul Büyükşehir Belediyesi",
            id: "tender-2",
            status: "Kazanıldı",
            tenderNo: "IHL-2026-002",
            title: "Okul güçlendirme inşaatı",
          }),
          createTender({
            authorityName: "Karayolları 1. Bölge Müdürlüğü",
            id: "tender-3",
            status: "Sunuldu",
            tenderNo: "IHL-2026-003",
            title: "Köprü bakım yapım işi",
          }),
        ]}
        today="2026-07-01T09:00:00"
      />,
    );

    expect(screen.getByRole("table")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Analiz Panosu" }));

    expect(
      screen.getByRole("heading", { name: "İhale Analiz Panosu" }),
    ).toBeTruthy();
    expect(screen.getByText("En Çok İhale Açan Kurumlar")).toBeTruthy();
    expect(screen.getByText("İstanbul Büyükşehir Belediyesi")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("button", { name: "Listeye Dön" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Listeye Dön" }));

    expect(screen.getByRole("table")).toBeTruthy();
  });
});

function createTender(overrides: Partial<TenderRow>): TenderRow {
  return {
    authorityName: "İstanbul Büyükşehir Belediyesi",
    bidValue: 0,
    contractValue: 0,
    estimatedValue: 1250000,
    ikn: "2026/100001",
    id: "tender",
    procedure: "Açık",
    submissionDeadline: "2026-07-01T12:00",
    status: "Takip",
    tenderNo: "IHL-0001",
    title: "Altyapı yenileme yapım işi",
    ...overrides,
  };
}
