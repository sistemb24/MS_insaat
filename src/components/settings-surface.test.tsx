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
import { afterEach, describe, expect, test, vi } from "vitest";

import type { TenantScope } from "@/lib/tenant-scope";
import type { BankIntegrationOverview } from "@/lib/bank-integration-service";

import { SettingsSurface } from "./settings-surface";

const originalPrint = window.print;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "print", {
    configurable: true,
    value: originalPrint,
  });
});

describe("SettingsSurface", () => {
  test("renders P0 company, finance and role settings from the active scope", () => {
    render(<SettingsSurface context={createTenantScope()} />);

    expect(screen.getByRole("heading", { name: "Ayarlar" })).toBeTruthy();
    expect(document.querySelector('[data-settings-workspace="true"]')).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "Ayarlar çalışma alanı bölümleri" }),
    ).toBeTruthy();
    expect(screen.getByText("NOA Demo Tenant")).toBeTruthy();
    expect(screen.getByText("DEMO İNŞAAT")).toBeTruthy();
    expect(screen.getByText("2026")).toBeTruthy();
    expect(screen.getByText("Aktif Rol: accounting")).toBeTruthy();
    expect(screen.getByText("Lokasyon Modu")).toBeTruthy();
    expect(screen.getByText("Çoklu lokasyon / şantiye bazlı")).toBeTruthy();
    expect(screen.getByText("Merkez, Şantiye, Şube, Ofis")).toBeTruthy();
    expect(screen.getByText("P0'da kilitli")).toBeTruthy();
    expect(
      screen.getByText(
        "İlk bağlantıyı oluşturmak için yukarıdan kullanılabilir bir banka ve rıza numarası seçip bağlantıyı test edin.",
      ),
    ).toBeTruthy();

    const financePanel = screen.getByRole("region", {
      name: "Finans Ayarları",
    });
    expect(within(financePanel).getByText("TRY")).toBeTruthy();
    expect(within(financePanel).getAllByText("%20")).toHaveLength(2);
    expect(within(financePanel).getAllByText("KDV hariç")).toHaveLength(2);
    expect(within(financePanel).getByText("KDV dağılımı aktif")).toBeTruthy();

    const financePolicyTable = screen.getByRole("table", {
      name: "P0 Finans KDV Detayları",
    });
    expect(within(financePolicyTable).getByText("Ayar")).toBeTruthy();
    expect(within(financePolicyTable).getByText("Alan")).toBeTruthy();
    expect(within(financePolicyTable).getByText("P0 Davranışı")).toBeTruthy();
    expect(within(financePolicyTable).getByText("Varsayılan KDV Oranı")).toBeTruthy();
    expect(within(financePolicyTable).getByText("defaultVatRate")).toBeTruthy();
    expect(
      within(financePolicyTable).getByText(
        "Alış faturası ve hakediş yeni satır varsayımı",
      ),
    ).toBeTruthy();

    const roleMatrix = screen.getByRole("table", {
      name: "P0 Rol Yetki Matrisi",
    });
    expect(within(roleMatrix).getByText("admin")).toBeTruthy();
    expect(within(roleMatrix).getByText("accounting")).toBeTruthy();
    expect(within(roleMatrix).getByText("viewer")).toBeTruthy();

    const permissionMatrix = screen.getByRole("table", {
      name: "P0 Kaynak-Aksiyon Matrisi",
    });
    expect(within(permissionMatrix).getByText("Kaynak")).toBeTruthy();
    expect(within(permissionMatrix).getByText("Oluştur")).toBeTruthy();
    expect(within(permissionMatrix).getByText("Sil")).toBeTruthy();
    expect(within(permissionMatrix).getByText("Düzenle")).toBeTruthy();
    expect(within(permissionMatrix).getByText("Görüntüle")).toBeTruthy();
    expect(within(permissionMatrix).getByText("Özel Aksiyonlar")).toBeTruthy();
    expect(within(permissionMatrix).getByText("Giderler")).toBeTruthy();
    expect(within(permissionMatrix).getByText("pay, approve")).toBeTruthy();

    expect(screen.getByText("Gider kaydı oluşturma ve ödeme hareketi")).toBeTruthy();
  });

  test("prints the visible P0 settings summary scope", () => {
    const print = vi.fn();

    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(<SettingsSurface context={createTenantScope()} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Ayarlar Özetini Yazdır" }),
    );

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe(
      "Yazdırma kapsamı hazır: firma, finans, rol matrisi ve audit kapsamı.",
    );
  });

  test("shows read-only P0 boundary messages for settings edit actions", () => {
    render(<SettingsSurface context={createTenantScope()} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Finans Ayarlarını Düzenle" }),
    );

    expect(screen.getByRole("status").textContent).toBe(
      "Finans ayarı düzenleme P0 kapsamında salt okunur; fatura ve hakediş hesaplamalarını etkileyen kalıcı yazım ayrı dilimde açılacaktır.",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Rol Matrisini Düzenle" }),
    );

    expect(screen.getByRole("status").textContent).toBe(
      "Rol matrisi düzenleme P0 kapsamında salt okunur; yetki değişikliği audit ve güvenlik sözleşmesiyle ayrı dilimde açılacaktır.",
    );
  });

  test("shows the P2 Arvento fleet tracking integration starter panel", () => {
    render(<SettingsSurface context={createTenantScope()} />);

    const panel = screen.getByRole("region", {
      name: "Arvento Filo Takip",
    });

    expect(within(panel).getByText("P2 sandbox hazırlığı")).toBeTruthy();
    expect(within(panel).getByText("ws.arvento.com")).toBeTruthy();
    expect(within(panel).getByText("15 dk")).toBeTruthy();
    expect(within(panel).getAllByText("Simülasyon Modu").length).toBeGreaterThanOrEqual(1);
    expect(within(panel).getByText("GPS araç konumu ve son hareket zamanı")).toBeTruthy();
    expect(within(panel).getByText("CANbus/OBD yakıt seviyesi ve ani düşüş alarmı")).toBeTruthy();
    expect(within(panel).getByText("KM / motor saati puantaj ve bakım uyarısı")).toBeTruthy();
    expect(
      within(panel).getByRole("button", {
        name: "Arvento Bağlantısını Test Et",
      }),
    ).toBeTruthy();
  });

  test("locks the Arvento fleet panel when subscription access is disabled", () => {
    render(
      <SettingsSurface
        arventoFleetFeatureAccess={{
          enabled: false,
          key: "arvento-fleet",
          label: "Arvento Filo Takip",
          reason: "Kurumsal pakete yükseltme gerekir.",
          requiredPlan: "Kurumsal",
          source: "upgrade-required",
        }}
        context={createTenantScope()}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "Arvento Filo Takip",
    });

    expect(within(panel).getByText("Kurumsal paket gerekli")).toBeTruthy();
    expect(
      within(panel).getByText(
        "Arvento Filo Takip için Kurumsal pakete yükseltme gerekir.",
      ),
    ).toBeTruthy();
    expect(
      within(panel).queryByRole("button", {
        name: "Arvento Bağlantısını Test Et",
      }),
    ).toBeNull();
  });

  test("tests the Arvento sandbox connection when persistence is provided", async () => {
    const testArventoConnection = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        connection: {
          endpoint: "ws.arvento.com",
          refreshIntervalLabel: "15 dk",
          simulationMode: true,
          statusLabel: "Aktif",
          userName: "NOA-SANDBOX",
        },
      },
    });

    render(
      <SettingsSurface
        context={createTenantScope()}
        persistence={{ testArventoConnection }}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "Arvento Filo Takip",
    });
    const userNameInput = within(panel).getByLabelText(
      "Arvento Kullanıcı Adı",
    ) as HTMLInputElement;
    const pin1Input = within(panel).getByLabelText("PIN1") as HTMLInputElement;
    const pin2Input = within(panel).getByLabelText("PIN2") as HTMLInputElement;

    expect(userNameInput.value).toBe("NOA-SANDBOX");
    expect(pin1Input.type).toBe("password");
    expect(pin2Input.type).toBe("password");
    expect(within(panel).getByText("Eksik bilgi")).toBeTruthy();

    fireEvent.change(userNameInput, { target: { value: " " } });
    fireEvent.change(pin1Input, { target: { value: "111111" } });
    fireEvent.change(pin2Input, { target: { value: "222222" } });
    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Arvento Bağlantısını Test Et",
      }),
    );

    expect(testArventoConnection).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Arvento kullanıcı adı zorunludur.",
    );

    fireEvent.change(userNameInput, { target: { value: " NOA-SANDBOX " } });
    expect(within(panel).getByText("Test için hazır")).toBeTruthy();

    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Arvento Bağlantısını Test Et",
      }),
    );

    await waitFor(() => {
      expect(testArventoConnection).toHaveBeenCalledOnce();
    });
    expect(testArventoConnection).toHaveBeenCalledWith();
    expect(screen.getByRole("status").textContent).toBe(
      "Arvento sandbox bağlantısı doğrulandı: ws.arvento.com / 15 dk.",
    );
  });

  test("shows and tests P2 sandbox bank integration connections", async () => {
    const testBankConnection = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        connection: createBankConnection({
          consentId: "NOA-SANDBOX-002",
          lastTestedAt: "2026-07-03T09:30:00.000Z",
        }),
      },
    });
    const syncBankTransactions = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        preservedStatusCount: 1,
        syncedCount: 2,
        transactions: [
          createBankTransaction({
            amount: 125000,
            description: "Sandbox hakediş tahsilatı",
            direction: "inflow",
            id: "bank-tx-2",
          }),
          createBankTransaction({
            amount: -48500,
            description: "Sandbox tedarikçi ödemesi",
            direction: "outflow",
            id: "bank-tx-3",
          }),
        ],
      },
    });
    const approveBankMatch = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        cashBankMovement: {
          documentNo: "KBN-0001",
          id: "cash-movement-1",
          sourceLabel: "HAK-0001",
        },
        transaction: {
          amount: 125000,
          bankConnectionId: "bank-connection-1",
          bankName: "İş Bankası",
          companyId: "company-demo-insaat",
          currency: "TRY",
          description: "Sandbox hakediş tahsilatı",
          direction: "inflow",
          externalId: "bank-tx-1-external",
          id: "bank-tx-1",
          occurredAt: "2026-07-03T09:00:00.000Z",
          periodId: "period-2026",
          status: "matched",
          tenantId: "tenant-noa-demo",
          updatedAt: "2026-07-03T10:00:00.000Z",
        },
      },
    });
    const reopenBankMatch = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        transaction: {
          amount: 125000,
          bankConnectionId: "bank-connection-1",
          bankName: "İş Bankası",
          companyId: "company-demo-insaat",
          currency: "TRY",
          description: "Sandbox hakediş tahsilatı",
          direction: "inflow",
          externalId: "bank-tx-1-external",
          id: "bank-tx-1",
          occurredAt: "2026-07-03T09:00:00.000Z",
          periodId: "period-2026",
          status: "pending",
          tenantId: "tenant-noa-demo",
          updatedAt: "2026-07-03T10:30:00.000Z",
        },
      },
    });
    const approveManualBankMatch = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        cashBankMovement: {
          documentNo: "KBN-0099",
          id: "cash-movement-manual",
          sourceLabel: "MANUEL-HAK-0099",
        },
        transaction: {
          amount: -48500,
          bankConnectionId: "bank-connection-1",
          bankName: "İş Bankası",
          companyId: "company-demo-insaat",
          currency: "TRY",
          description: "Sandbox tedarikçi ödemesi",
          direction: "outflow",
          externalId: "bank-tx-3-external",
          id: "bank-tx-3",
          occurredAt: "2026-07-03T09:05:00.000Z",
          periodId: "period-2026",
          status: "matched",
          tenantId: "tenant-noa-demo",
          updatedAt: "2026-07-03T11:00:00.000Z",
        },
      },
    });
    const ignoreBankTransaction = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        transaction: {
          amount: -48500,
          bankConnectionId: "bank-connection-1",
          bankName: "İş Bankası",
          companyId: "company-demo-insaat",
          currency: "TRY",
          description: "Sandbox tedarikçi ödemesi",
          direction: "outflow",
          externalId: "bank-tx-3-external",
          id: "bank-tx-3",
          occurredAt: "2026-07-03T09:05:00.000Z",
          periodId: "period-2026",
          status: "ignored",
          tenantId: "tenant-noa-demo",
          updatedAt: "2026-07-03T11:10:00.000Z",
        },
      },
    });
    const reopenIgnoredBankTransaction = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        transaction: {
          amount: -48500,
          bankConnectionId: "bank-connection-1",
          bankName: "İş Bankası",
          companyId: "company-demo-insaat",
          currency: "TRY",
          description: "Sandbox tedarikçi ödemesi",
          direction: "outflow",
          externalId: "bank-tx-3-external",
          id: "bank-tx-3",
          occurredAt: "2026-07-03T09:05:00.000Z",
          periodId: "period-2026",
          status: "pending",
          tenantId: "tenant-noa-demo",
          updatedAt: "2026-07-03T11:15:00.000Z",
        },
      },
    });

    render(
      <SettingsSurface
        bankIntegrationOverview={{
          connections: [
            createBankConnection({
              consentId: "NOA-SANDBOX-001",
              lastTestedAt: "2026-07-03T09:00:00.000Z",
            }),
          ],
          recentTransactions: [
            createBankTransaction({
              amount: 125000,
              description: "Sandbox hakediş tahsilatı",
            }),
          ],
          matchSuggestions: [
            {
              bankTransactionAmount: 125000,
              bankTransactionDescription: "Sandbox hakediş tahsilatı",
              bankTransactionId: "bank-tx-1",
              cashBankMovementDocumentNo: "KBN-0001",
              cashBankMovementId: "cash-movement-1",
              cashBankMovementLabel: "HAK-0001",
              matchedAmount: 125000,
              matchedDate: "2026-07-03",
              score: 95,
              statusLabel: "Öneri",
            },
          ],
          manualMatchCandidates: [
            {
              amount: 48500,
              cashBankMovementDocumentNo: "KBN-0099",
              cashBankMovementId: "cash-movement-manual",
              cashBankMovementLabel: "MANUEL-HAK-0099",
              direction: "Çıkış",
              matchedDate: "2026-07-01",
            },
            {
              amount: 50000,
              cashBankMovementDocumentNo: "KBN-0101",
              cashBankMovementId: "cash-movement-partial",
              cashBankMovementLabel: "PARCA-0101",
              direction: "Çıkış",
              matchedDate: "2026-07-02",
            },
          ],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
            { bankCode: "ziraat", bankName: "Ziraat Bankası", status: "Yakında" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
        persistence={{
          approveBankMatch,
          approveManualBankMatch,
          ignoreBankTransaction,
          reopenBankMatch,
          reopenIgnoredBankTransaction,
          syncBankTransactions,
          testBankConnection,
        }}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "Banka Entegrasyonu",
    });
    expect(within(panel).getByText("Open Banking sandbox")).toBeTruthy();
    expect(within(panel).getAllByText("İş Bankası").length).toBeGreaterThanOrEqual(2);
    expect(within(panel).getByText("NOA-SANDBOX-001")).toBeTruthy();
    expect(within(panel).getByText("Bağlı")).toBeTruthy();
    expect(within(panel).getByText("Bağlı: 1 · Hatalı: 0")).toBeTruthy();
    expect(within(panel).getByText("Sandbox başarılı")).toBeTruthy();
    expect(
      within(panel).getAllByText("Sandbox hakediş tahsilatı").length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      within(panel).getAllByText("125.000,00 TL").length,
    ).toBeGreaterThanOrEqual(2);
    expect(within(panel).getAllByText("Bekliyor").length).toBeGreaterThanOrEqual(1);
    expect(within(panel).getByText("Otomatik Eşleşme Önerileri")).toBeTruthy();
    expect(within(panel).getByText("KBN-0001")).toBeTruthy();
    expect(within(panel).getByText("HAK-0001")).toBeTruthy();
    expect(within(panel).getByText("%95")).toBeTruthy();
    expect(within(panel).getByText("Öneri")).toBeTruthy();
    expect(
      within(panel).getByRole("button", {
        name: "Eşleşmeyi Onayla KBN-0001",
      }),
    ).toBeTruthy();
    expect(within(panel).getByText("Ziraat Bankası")).toBeTruthy();
    expect(within(panel).getByText("Yakında")).toBeTruthy();
    expect(within(panel).getByText("Kullanılabilir: 1 · Yakında: 1")).toBeTruthy();
    expect(
      (
        within(panel).getByRole("option", {
          name: "Ziraat Bankası · Yakında",
        }) as HTMLOptionElement
      ).disabled,
    ).toBe(true);

    fireEvent.change(within(panel).getByLabelText("Banka"), {
      target: { value: "isbank" },
    });
    fireEvent.change(within(panel).getByLabelText("Rıza Numarası"), {
      target: { value: " NOA-SANDBOX-002 " },
    });
    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Sandbox Bağlantıyı Test Et",
      }),
    );

    await waitFor(() => {
      expect(testBankConnection).toHaveBeenCalledWith({
        bankCode: "isbank",
        consentId: "NOA-SANDBOX-002",
      });
    });
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Banka sandbox bağlantısı doğrulandı: İş Bankası / NOA-SANDBOX-002.",
      );
    });
    expect(within(panel).getByText("NOA-SANDBOX-002")).toBeTruthy();

    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Hareketleri Senkronize Et İş Bankası",
      }),
    );

    await waitFor(() => {
      expect(syncBankTransactions).toHaveBeenCalledWith("bank-connection-1");
    });
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Banka hareketleri senkronize edildi: 2 hareket, 1 durum korundu.",
      );
    });
    expect(within(panel).getAllByText("Sandbox tedarikçi ödemesi").length).toBeGreaterThanOrEqual(1);
    expect(within(panel).getAllByText("-48.500,00 TL").length).toBeGreaterThanOrEqual(1);
    expect(within(panel).getByText("Manuel Eşleştirme")).toBeTruthy();
    expect(within(panel).getByText("1 tam eşleşme, 1 kısmi taslak")).toBeTruthy();
    expect(within(panel).getByText("KBN-0099 · MANUEL-HAK-0099")).toBeTruthy();
    expect(
      within(panel).getByText(
        "KBN-0101 · PARCA-0101 · Kısmi taslak · Fark 1.500,00 TL",
      ),
    ).toBeTruthy();
    expect(within(panel).getByText("Yeni Kasa/Banka Hareket Taslakları")).toBeTruthy();
    const cashBankMovementDrafts = within(panel).getByRole("table", {
      name: "P2 Yeni Kasa/Banka Hareket Taslakları",
    });
    expect(within(cashBankMovementDrafts).getAllByText("Sandbox hakediş tahsilatı").length).toBeGreaterThanOrEqual(1);
    expect(within(cashBankMovementDrafts).getAllByText("Tahsilat").length).toBeGreaterThanOrEqual(1);
    expect(within(cashBankMovementDrafts).getAllByText("Banka hareketinden tahsilat: Sandbox hakediş tahsilatı").length).toBeGreaterThanOrEqual(1);
    expect(within(cashBankMovementDrafts).getByText("Sandbox tedarikçi ödemesi")).toBeTruthy();
    expect(within(cashBankMovementDrafts).getByText("Ödeme")).toBeTruthy();
    expect(within(cashBankMovementDrafts).getByText("48.500,00 TL")).toBeTruthy();
    expect(within(cashBankMovementDrafts).getAllByText("Kayıt Taslağı").length).toBeGreaterThanOrEqual(2);
    expect(within(panel).getByText("Kısmi Mutabakat Taslakları")).toBeTruthy();
    const partialDrafts = within(panel).getByRole("table", {
      name: "P2 Kısmi Mutabakat Taslakları",
    });
    expect(within(partialDrafts).getByText("Sandbox tedarikçi ödemesi")).toBeTruthy();
    expect(within(partialDrafts).getByText("KBN-0101")).toBeTruthy();
    expect(within(partialDrafts).getByText("PARCA-0101")).toBeTruthy();
    expect(within(partialDrafts).getByText("50.000,00 TL")).toBeTruthy();
    expect(within(partialDrafts).getByText("1.500,00 TL")).toBeTruthy();
    expect(within(partialDrafts).getByText("Kısmi Taslak")).toBeTruthy();
    expect(within(panel).getByText("Parçalı Yeni Kayıt Taslakları")).toBeTruthy();
    const partialCashBankDrafts = within(panel).getByRole("table", {
      name: "P2 Parçalı Yeni Kasa/Banka Kayıt Taslakları",
    });
    expect(within(partialCashBankDrafts).getByText("Sandbox tedarikçi ödemesi")).toBeTruthy();
    expect(within(partialCashBankDrafts).getByText("KBN-0101")).toBeTruthy();
    expect(within(partialCashBankDrafts).getByText("PARCA-0101")).toBeTruthy();
    expect(within(partialCashBankDrafts).getByText("1.500,00 TL")).toBeTruthy();
    expect(within(partialCashBankDrafts).getByText("Parçalı Kayıt Taslağı")).toBeTruthy();

    fireEvent.change(
      within(panel).getByLabelText("Manuel eşleşme seçimi Sandbox tedarikçi ödemesi"),
      {
        target: { value: "cash-movement-partial" },
      },
    );
    const partialManualMatchButton = within(panel).getByRole("button", {
      name: "Manuel Eşleştir Sandbox tedarikçi ödemesi",
    }) as HTMLButtonElement;
    expect(partialManualMatchButton.disabled).toBe(true);
    fireEvent.click(partialManualMatchButton);
    expect(approveManualBankMatch).not.toHaveBeenCalled();

    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Banka Hareketini Yoksay Sandbox tedarikçi ödemesi",
      }),
    );

    await waitFor(() => {
      expect(ignoreBankTransaction).toHaveBeenCalledWith("bank-tx-3");
    });
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Banka hareketi yoksayıldı: Sandbox tedarikçi ödemesi.",
      );
    });
    expect(within(panel).getByText("Yoksayıldı", { selector: "td" })).toBeTruthy();
    expect(
      within(panel).queryByRole("button", {
        name: "Manuel Eşleştir Sandbox tedarikçi ödemesi",
      }),
    ).toBeNull();

    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Yoksaymayı Geri Al Sandbox tedarikçi ödemesi",
      }),
    );

    await waitFor(() => {
      expect(reopenIgnoredBankTransaction).toHaveBeenCalledWith("bank-tx-3");
    });
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Banka hareketi tekrar beklemeye alındı: Sandbox tedarikçi ödemesi.",
      );
    });
    expect(within(panel).getAllByText("Bekliyor").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Eşleşmeyi Onayla KBN-0001",
      }),
    );

    await waitFor(() => {
      expect(approveBankMatch).toHaveBeenCalledWith({
        cashBankMovementId: "cash-movement-1",
        transactionId: "bank-tx-1",
      });
    });
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Banka hareketi eşleştirildi: KBN-0001 / HAK-0001.",
      );
    });
    expect(
      within(panel).getAllByText("Eşleştirildi").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(panel).getByRole("button", {
        name: "Eşleşmeyi Geri Al Sandbox hakediş tahsilatı",
      }),
    ).toBeTruthy();
    expect(
      within(panel).queryByRole("button", {
        name: "Eşleşmeyi Onayla KBN-0001",
      }),
    ).toBeNull();

    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Eşleşmeyi Geri Al Sandbox hakediş tahsilatı",
      }),
    );

    await waitFor(() => {
      expect(reopenBankMatch).toHaveBeenCalledWith("bank-tx-1");
    });
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Banka eşleşmesi geri alındı: Sandbox hakediş tahsilatı.",
      );
    });
    expect(within(panel).getAllByText("Bekliyor").length).toBeGreaterThanOrEqual(1);
  });

  test("rejects bank transaction sync when the selected date range is reversed", async () => {
    const syncBankTransactions = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        preservedStatusCount: 0,
        syncedCount: 0,
        transactions: [],
      },
    });

    render(
      <SettingsSurface
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          manualMatchCandidates: [],
          matchSuggestions: [],
          recentTransactions: [],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
        persistence={{ syncBankTransactions }}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "Banka Entegrasyonu",
    });
    fireEvent.change(within(panel).getByLabelText("Başlangıç Tarihi"), {
      target: { value: "2026-07-05" },
    });
    fireEvent.change(within(panel).getByLabelText("Bitiş Tarihi"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Hareketleri Senkronize Et İş Bankası",
      }),
    );

    expect(syncBankTransactions).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Banka hareketi başlangıç tarihi bitiş tarihinden sonra olamaz.",
    );
  });

  test("locks the bank integration panel when subscription access is disabled", () => {
    const testBankConnection = vi.fn();
    const syncBankTransactions = vi.fn();

    render(
      <SettingsSurface
        bankIntegrationFeatureAccess={{
          enabled: false,
          key: "bank-integration",
          label: "Banka Entegrasyonu",
          reason: "Kurumsal pakete yükseltme gerekir.",
          requiredPlan: "Kurumsal",
          source: "plan",
        }}
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          manualMatchCandidates: [],
          matchSuggestions: [],
          recentTransactions: [
            createBankTransaction({
              description: "Sandbox hakediş tahsilatı",
            }),
          ],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
        persistence={{
          syncBankTransactions,
          testBankConnection,
        }}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "Banka Entegrasyonu",
    });

    expect(within(panel).getByText("Kurumsal paket gerekli")).toBeTruthy();
    expect(
      within(panel).getByText(
        "Banka Entegrasyonu için Kurumsal pakete yükseltme gerekir.",
      ),
    ).toBeTruthy();
    expect(
      within(panel).queryByRole("button", {
        name: "Sandbox Bağlantıyı Test Et",
      }),
    ).toBeNull();
    expect(
      within(panel).queryByRole("button", {
        name: "Hareketleri Senkronize Et İş Bankası",
      }),
    ).toBeNull();
    expect(testBankConnection).not.toHaveBeenCalled();
    expect(syncBankTransactions).not.toHaveBeenCalled();
  });
  test("syncs bank transactions with the selected date range", async () => {
    const syncBankTransactions = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        preservedStatusCount: 0,
        syncedCount: 1,
        transactions: [
          createBankTransaction({
            description: "Filtreli banka hareketi",
            id: "bank-tx-filtered",
            occurredAt: "2026-07-02T09:00:00.000Z",
          }),
        ],
      },
    });

    render(
      <SettingsSurface
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          manualMatchCandidates: [],
          matchSuggestions: [],
          recentTransactions: [],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
        persistence={{ syncBankTransactions }}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "Banka Entegrasyonu",
    });
    fireEvent.change(within(panel).getByLabelText("Başlangıç Tarihi"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(within(panel).getByLabelText("Bitiş Tarihi"), {
      target: { value: "2026-07-02" },
    });
    expect(
      within(panel).getByText("Senkronizasyon filtresi · 2026-07-01 - 2026-07-02."),
    ).toBeTruthy();
    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Hareketleri Senkronize Et İş Bankası",
      }),
    );

    await waitFor(() => {
      expect(syncBankTransactions).toHaveBeenCalledWith("bank-connection-1", {
        dateFrom: "2026-07-01",
        dateTo: "2026-07-02",
      });
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Banka hareketleri senkronize edildi: 1 hareket · 2026-07-01 - 2026-07-02.",
    );
    expect(within(panel).getAllByText("Filtreli banka hareketi").length).toBeGreaterThanOrEqual(1);
  });

  test("filters recent bank transactions by status chips", () => {
    render(
      <SettingsSurface
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          manualMatchCandidates: [
            {
              amount: 1200,
              cashBankMovementDocumentNo: "KB-001",
              cashBankMovementId: "cash-partial",
              cashBankMovementLabel: "Parçalı kayıt",
              direction: "Giriş",
              matchedDate: "2026-07-02",
              sourceId: "bank-tx-matched::cash-partial",
              sourceType: "bank-transaction-partial",
            },
          ],
          matchSuggestions: [],
          recentTransactions: [
            createBankTransaction({
              description: "Bekleyen hareket",
              id: "bank-tx-pending",
              status: "pending",
              statusLabel: "Bekliyor",
            }),
            createBankTransaction({
              description: "Eşleşen hareket",
              id: "bank-tx-matched",
              status: "matched",
              statusLabel: "Eşleştirildi",
            }),
            createBankTransaction({
              description: "Yoksayılan hareket",
              id: "bank-tx-ignored",
              status: "ignored",
              statusLabel: "Yoksayıldı",
            }),
          ],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "Banka Entegrasyonu",
    });

    expect(
      within(panel).getByText("3 kayıt içinden 3 gösteriliyor."),
    ).toBeTruthy();
    expect(
      within(panel).getByText(
        "Bekliyor: 1 · Eşleştirildi: 1 · Yoksayıldı: 1 · Parçalı kaydedildi: 1",
      ),
    ).toBeTruthy();

    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Eşleştirildi",
      }),
    );

    const transactionsTable = within(panel).getByRole("table", {
      name: "P2 Son Banka Hareketleri",
    });

    expect(
      within(transactionsTable).getByText("Eşleşen hareket"),
    ).toBeTruthy();
    expect(
      within(transactionsTable).queryByText("Bekleyen hareket"),
    ).toBeNull();
    expect(
      within(transactionsTable).queryByText("Yoksayılan hareket"),
    ).toBeNull();
    expect(
      within(panel).getByText("3 kayıt içinden 1 gösteriliyor."),
    ).toBeTruthy();

    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Yoksayıldı",
      }),
    );

    expect(
      within(transactionsTable).getByText("Yoksayılan hareket"),
    ).toBeTruthy();
    expect(
      within(transactionsTable).queryByText("Eşleşen hareket"),
    ).toBeNull();
    expect(
      within(panel).getByText("3 kayıt içinden 1 gösteriliyor."),
    ).toBeTruthy();

    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Parçalı",
      }),
    );
    expect(within(transactionsTable).getByText("Eşleşen hareket")).toBeTruthy();
    expect(within(transactionsTable).queryByText("Yoksayılan hareket")).toBeNull();
  });
  test("renders recent bank ledger traces with readable accounting labels", () => {
    render(
      <SettingsSurface
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          ledgerEntries: [
            {
              amount: 125000,
              bankTransactionId: "bank-tx-1",
              cashBankAccountCode: "102.01",
              cashBankAccountName: "İş Bankası TL",
              cashBankMovementId: "cash-movement-1",
              companyId: "company-demo-insaat",
              createdAt: "2026-07-03T12:00:00.000Z",
              createdBy: "user-main",
              currency: "TRY",
              description: "Sandbox hakediş tahsilatı",
              documentNo: "BNK-20260703-1",
              entryDate: "2026-07-03",
              id: "ledger-entry-1",
              ledgerDirection: "debit",
              periodId: "period-2026",
              status: "active",
              tenantId: "tenant-noa-demo",
              updatedAt: "2026-07-03T12:00:00.000Z",
              updatedBy: "user-main",
            },
            {
              amount: 48500,
              bankTransactionId: "bank-tx-2",
              cashBankAccountCode: "102.09",
              cashBankAccountName: "QNB Şantiye Hesabı",
              cashBankMovementId: "cash-movement-2",
              companyId: "company-demo-insaat",
              createdAt: "2026-07-03T13:00:00.000Z",
              createdBy: "user-main",
              currency: "TRY",
              description: "Geri alınmış tedarikçi ödemesi",
              documentNo: "BNK-20260703-2",
              entryDate: "2026-07-03",
              id: "ledger-entry-2",
              ledgerDirection: "credit",
              periodId: "period-2026",
              status: "voided",
              tenantId: "tenant-noa-demo",
              updatedAt: "2026-07-03T13:00:00.000Z",
              updatedBy: "user-main",
            },
          ],
          ledgerFailureAudits: [
            {
              action: "bank-integration.ledger-write-failed",
              bankTransactionId: "bank-tx-1",
              cashBankMovementId: "cash-movement-1",
              entityLabel: "Sandbox hakediş tahsilatı -> BNK-20260703-1",
              occurredAt: "2026-07-03T14:00:00.000Z",
              recovered: true,
              retryable: true,
              failureTypeLabel: "Eşleştirme",
              statusTransitionLabel: "Bekliyor → Bekliyor",
            },
            {
              action: "bank-integration.cash-bank-ledger-write-failed",
              bankTransactionId: "bank-tx-2",
              cashBankMovementId: "cash-movement-2",
              entityLabel: "Geri alınmış tedarikçi ödemesi -> BNK-20260703-2",
              occurredAt: "2026-07-03T14:05:00.000Z",
              recovered: false,
              retryable: true,
              failureTypeLabel: "Yeni kasa/banka",
              statusTransitionLabel: "Bekliyor → Bekliyor",
            },
          ],
          manualMatchCandidates: [],
          matchSuggestions: [],
          recentTransactions: [],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
      />,
    );

    const panel = screen.getByRole("region", { name: "Banka Entegrasyonu" });
    const ledgerTable = within(panel).getByRole("table", {
      name: "P2 Son Banka Ledger İzleri",
    });

    expect(within(ledgerTable).getByText("BNK-20260703-1")).toBeTruthy();
    expect(within(ledgerTable).getByText("102.01 · İş Bankası TL")).toBeTruthy();
    expect(within(ledgerTable).getByText("Borç")).toBeTruthy();
    expect(within(ledgerTable).getByText("Aktif")).toBeTruthy();
    const recoveryTable = within(panel).getByRole("table", {
      name: "P2 Ledger Recovery İzleri",
    });
    expect(within(recoveryTable).getByText("Eşleştirme")).toBeTruthy();
    expect(
      within(recoveryTable).getAllByText("Bekliyor → Bekliyor"),
    ).toHaveLength(2);
    expect(within(recoveryTable).getByText("Hareket geri alındı")).toBeTruthy();
    expect(within(recoveryTable).getByText("Tekrar denenebilir")).toBeTruthy();
    const recoveryFilterGroup = within(panel).getByRole("group", {
      name: "Ledger recovery durumu filtresi",
    });
    fireEvent.click(
      within(recoveryFilterGroup).getByRole("button", {
        name: "Tekrar denenebilir",
      }),
    );
    expect(within(recoveryTable).getByText("bank-tx-2")).toBeTruthy();
    expect(within(recoveryTable).queryByText("bank-tx-1")).toBeNull();
    expect(within(recoveryFilterGroup).getByText("1 / 2 gösteriliyor.")).toBeTruthy();
    fireEvent.click(
      within(recoveryFilterGroup).getByRole("button", { name: "Tümü" }),
    );
    const recoveryFlowFilterGroup = within(panel).getByRole("group", {
      name: "Ledger recovery akış filtresi",
    });
    fireEvent.click(
      within(recoveryFlowFilterGroup).getByRole("button", {
        name: "Eşleştirme",
      }),
    );
    expect(within(recoveryTable).getByText("bank-tx-1")).toBeTruthy();
    expect(within(recoveryTable).queryByText("bank-tx-2")).toBeNull();
    fireEvent.click(
      within(recoveryFlowFilterGroup).getByRole("button", {
        name: "Yeni kasa/banka",
      }),
    );
    expect(within(recoveryTable).getByText("bank-tx-2")).toBeTruthy();
    expect(within(recoveryTable).queryByText("bank-tx-1")).toBeNull();
    fireEvent.click(
      within(recoveryFlowFilterGroup).getByRole("button", { name: "Tümü" }),
    );
    expect(within(panel).getByText(/Aktif ledger toplamı: Borç/)).toBeTruthy();
    expect(
      within(panel).getByText("Ledger izi: 2 · Aktif: 1 · İptal: 1"),
    ).toBeTruthy();

    fireEvent.click(within(panel).getByRole("button", { name: "İptal" }));
    expect(within(ledgerTable).getByText("BNK-20260703-2")).toBeTruthy();
    expect(within(ledgerTable).queryByText("BNK-20260703-1")).toBeNull();
    expect(within(panel).getAllByText("1 / 2 gösteriliyor.")).toHaveLength(1);

    fireEvent.click(within(panel).getAllByRole("button", { name: "Tümü" }).at(-1)!);
    fireEvent.change(within(panel).getByLabelText("Ledger hesap filtresi"), {
      target: { value: "102.01::İş Bankası TL" },
    });
    expect(within(ledgerTable).getByText("BNK-20260703-1")).toBeTruthy();
    expect(within(ledgerTable).queryByText("BNK-20260703-2")).toBeNull();
    expect(within(panel).getAllByText("1 / 2 gösteriliyor.")).toHaveLength(1);
  });

  test("shows bank ledger reconciliation issues and a healthy empty state", () => {
    const { unmount } = render(
      <SettingsSurface
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          manualMatchCandidates: [],
          matchSuggestions: [],
          recentTransactions: [
            createBankTransaction({
              amount: 125000,
              description: "Ledger izi eksik tahsilat",
              id: "bank-tx-missing-ledger",
              status: "matched",
              statusLabel: "Eşleştirildi",
            }),
            createBankTransaction({
              amount: 5000,
              description: "Tutarı uyuşmayan tahsilat",
              id: "bank-tx-amount-mismatch",
              status: "matched",
              statusLabel: "Eşleştirildi",
            }),
          ],
          ledgerEntries: [
            {
              amount: 4500,
              bankTransactionId: "bank-tx-amount-mismatch",
              cashBankAccountCode: "102.01",
              cashBankAccountName: "İş Bankası TL",
              cashBankMovementId: "cash-movement-amount-mismatch",
              companyId: "company-demo-insaat",
              createdAt: "2026-07-03T12:00:00.000Z",
              createdBy: "user-main",
              currency: "TRY",
              description: "Tutarı uyuşmayan tahsilat",
              documentNo: "BNK-20260703-AMOUNT",
              entryDate: "2026-07-03",
              id: "ledger-entry-amount-mismatch",
              ledgerDirection: "debit",
              periodId: "period-2026",
              status: "active",
              tenantId: "tenant-noa-demo",
              updatedAt: "2026-07-03T12:00:00.000Z",
              updatedBy: "user-main",
            },
            {
              amount: 4500,
              bankTransactionId: "bank-tx-amount-mismatch",
              cashBankAccountCode: "102.01",
              cashBankAccountName: "İş Bankası TL",
              cashBankMovementId: "cash-movement-amount-mismatch",
              companyId: "company-demo-insaat",
              createdAt: "2026-07-03T12:01:00.000Z",
              createdBy: "user-main",
              currency: "TRY",
              description: "Tutarı uyuşmayan tahsilat",
              documentNo: "BNK-20260703-AMOUNT-DUP",
              entryDate: "2026-07-03",
              id: "ledger-entry-amount-mismatch-duplicate",
              ledgerDirection: "debit",
              periodId: "period-2026",
              status: "active",
              tenantId: "tenant-noa-demo",
              updatedAt: "2026-07-03T12:01:00.000Z",
              updatedBy: "user-main",
            },
          ],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
      />,
    );

    const panel = screen.getByRole("region", { name: "Banka Entegrasyonu" });
    const reconciliationTable = within(panel).getByRole("table", {
      name: "P2 Banka Ledger Mutabakat Sorunları",
    });
    expect(within(panel).getByText("Kontrol edilen: 2 · Tutarlı: 0 · Sorun: 3")).toBeTruthy();
    expect(within(reconciliationTable).getByText("Ledger izi eksik tahsilat")).toBeTruthy();
    expect(within(reconciliationTable).getByText("Aktif ledger izi eksik")).toBeTruthy();
    expect(
      within(reconciliationTable).getAllByText("Tutarı uyuşmayan tahsilat"),
    ).toHaveLength(2);
    const reconciliationFilterGroup = within(panel).getByRole("group", {
      name: "Ledger mutabakat sorun filtresi",
    });
    expect(within(reconciliationFilterGroup).getByText("3 / 3 sorun gösteriliyor.")).toBeTruthy();
    fireEvent.click(
      within(reconciliationFilterGroup).getByRole("button", {
        name: "Ledger tutarı uyumsuz",
      }),
    );
    expect(within(reconciliationTable).getByText("Tutarı uyuşmayan tahsilat")).toBeTruthy();
    expect(within(reconciliationTable).queryByText("Ledger izi eksik tahsilat")).toBeNull();
    expect(within(reconciliationFilterGroup).getByText("1 / 3 sorun gösteriliyor.")).toBeTruthy();
    fireEvent.click(
      within(reconciliationFilterGroup).getByRole("button", {
        name: "Aynı kasa/banka bağlantısında yinelenen aktif iz",
      }),
    );
    expect(
      within(reconciliationTable).getByText(
        "Aynı kasa/banka bağlantısında yinelenen aktif iz",
      ),
    ).toBeTruthy();
    expect(within(reconciliationFilterGroup).getByText("1 / 3 sorun gösteriliyor.")).toBeTruthy();

    unmount();
    render(
      <SettingsSurface
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          ledgerEntries: [],
          manualMatchCandidates: [],
          matchSuggestions: [],
          recentTransactions: [],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
      />,
    );

    expect(
      within(
        screen.getByRole("table", {
          name: "P2 Banka Ledger Mutabakat Sorunları",
        }),
      ).getByText("Banka hareketleri ile aktif ledger izleri tutarlı."),
    ).toBeTruthy();
  });

  test("does not show reopened pending partial transactions in the partial filter", () => {
    render(
      <SettingsSurface
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          manualMatchCandidates: [
            {
              amount: 1200,
              cashBankMovementDocumentNo: "KB-001",
              cashBankMovementId: "cash-partial",
              cashBankMovementLabel: "Parçalı kayıt",
              direction: "Giriş",
              matchedDate: "2026-07-02",
              sourceId: "bank-tx-pending::cash-partial",
              sourceType: "bank-transaction-partial",
            },
          ],
          matchSuggestions: [],
          recentTransactions: [
            createBankTransaction({
              description: "Geri açılan parçalı hareket",
              id: "bank-tx-pending",
              status: "pending",
              statusLabel: "Bekliyor",
            }),
          ],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
      />,
    );

    const panel = screen.getByRole("region", { name: "Banka Entegrasyonu" });
    fireEvent.click(within(panel).getByRole("button", { name: "Parçalı" }));

    expect(
      within(panel).getByText("1 kayıt içinden 0 gösteriliyor."),
    ).toBeTruthy();
    expect(
      within(panel).getByText("Seçili filtreye uyan banka hareketi yok."),
    ).toBeTruthy();
  });

  test("shows contextual feedback when bank transaction sync fails", async () => {
    const syncBankTransactions = vi.fn().mockResolvedValue({
      ok: false,
      errors: ["Banka adaptörü senkronizasyon sırasında hata verdi."],
    });

    render(
      <SettingsSurface
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          manualMatchCandidates: [],
          matchSuggestions: [],
          recentTransactions: [],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
        persistence={{ syncBankTransactions }}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "Banka Entegrasyonu",
    });
    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Hareketleri Senkronize Et İş Bankası",
      }),
    );

    await waitFor(() => {
      expect(syncBankTransactions).toHaveBeenCalledWith("bank-connection-1");
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Banka hareketleri senkronize edilemedi: Banka adaptörü senkronizasyon sırasında hata verdi.",
    );
  });

  test("creates a cash bank movement from a bank transaction draft", async () => {
    const createCashBankMovementFromBankTransaction = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        cashBankMovement: {
          accountCode: "102.01",
          accountName: "İş Bankası TL",
          amount: 48500,
          companyId: "company-demo-insaat",
          counterpartyName: "Banka Hareketi",
          createdAt: "2026-07-03T10:00:00.000Z",
          createdBy: "user-main",
          currency: "TL",
          description:
            "Banka hareketinden ödeme: Sandbox tedarikçi ödemesi",
          direction: "Çıkış",
          documentNo: "BNK-20260703-OUTFLOW",
          id: "cash-bank-from-bank-tx-1",
          movementDate: "2026-07-03",
          movementType: "Ödeme",
          periodId: "period-2026",
          sourceId: "bank-tx-3",
          sourceLabel: "isbank-sandbox-2026-07-03-outflow",
          sourceType: "bank-transaction",
          tenantId: "tenant-noa-demo",
          updatedAt: "2026-07-03T10:00:00.000Z",
          updatedBy: "user-main",
        },
        transaction: createBankTransaction({
          amount: -48500,
          description: "Sandbox tedarikçi ödemesi",
          direction: "outflow",
          id: "bank-tx-3",
          status: "matched",
        }),
      },
    });

    render(
      <SettingsSurface
        bankCashBankAccountOptions={[
          { code: "102.01", name: "İş Bankası TL" },
          { code: "102.09", name: "QNB Şantiye Hesabı" },
        ]}
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          manualMatchCandidates: [],
          matchSuggestions: [],
          recentTransactions: [
            createBankTransaction({
              amount: -48500,
              description: "Sandbox tedarikçi ödemesi",
              direction: "outflow",
              id: "bank-tx-3",
            }),
          ],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
        persistence={{ createCashBankMovementFromBankTransaction }}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "Banka Entegrasyonu",
    });
    const drafts = within(panel).getByRole("table", {
      name: "P2 Yeni Kasa/Banka Hareket Taslakları",
    });
    expect(within(drafts).getByText("Sandbox tedarikçi ödemesi")).toBeTruthy();
    fireEvent.change(
      within(drafts).getByLabelText(
        "Kasa/banka hesabı seçimi Sandbox tedarikçi ödemesi",
      ),
      {
        target: { value: "102.09" },
      },
    );

    fireEvent.click(
      within(drafts).getByRole("button", {
        name: "Kasa/Banka Kaydı Oluştur Sandbox tedarikçi ödemesi",
      }),
    );

    await waitFor(() => {
      expect(createCashBankMovementFromBankTransaction).toHaveBeenCalledWith(
        "bank-tx-3",
        {
          code: "102.09",
          name: "QNB Şantiye Hesabı",
        },
      );
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Kasa/banka kaydı oluşturuldu: BNK-20260703-OUTFLOW / Sandbox tedarikçi ödemesi.",
    );
    expect(within(panel).getByText("Eşleştirildi", { selector: "td" })).toBeTruthy();
    expect(within(drafts).getByText("Yeni kasa/banka hareket taslağı yok.")).toBeTruthy();
  });

  test("defaults bank transaction draft account from the consent bank connection", async () => {
    const createCashBankMovementFromBankTransaction = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        cashBankMovement: {
          accountCode: "102.01",
          accountName: "İş Bankası TL",
          amount: 125000,
          companyId: "company-demo-insaat",
          counterpartyName: "Banka Hareketi",
          createdAt: "2026-07-03T10:00:00.000Z",
          createdBy: "user-main",
          currency: "TL",
          description:
            "Banka hareketinden tahsilat: Sandbox hakediş tahsilatı",
          direction: "Giriş",
          documentNo: "BNK-20260703-INFLOW-1ABC23",
          id: "cash-bank-from-bank-tx-1",
          movementDate: "2026-07-03",
          movementType: "Tahsilat",
          periodId: "period-2026",
          sourceId: "bank-tx-1",
          sourceLabel: "isbank-sandbox-2026-07-03-inflow",
          sourceType: "bank-transaction",
          tenantId: "tenant-noa-demo",
          updatedAt: "2026-07-03T10:00:00.000Z",
          updatedBy: "user-main",
        },
        transaction: createBankTransaction({
          id: "bank-tx-1",
          status: "matched",
        }),
      },
    });

    render(
      <SettingsSurface
        bankCashBankAccountOptions={[
          { code: "102.09", name: "QNB Şantiye Hesabı" },
          { code: "102.01", name: "İş Bankası TL" },
        ]}
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          manualMatchCandidates: [],
          matchSuggestions: [],
          recentTransactions: [createBankTransaction()],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
        persistence={{ createCashBankMovementFromBankTransaction }}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "Banka Entegrasyonu",
    });
    const drafts = within(panel).getByRole("table", {
      name: "P2 Yeni Kasa/Banka Hareket Taslakları",
    });
    const accountSelect = within(drafts).getByLabelText(
      "Kasa/banka hesabı seçimi Sandbox hakediş tahsilatı",
    ) as HTMLSelectElement;

    expect(accountSelect.value).toBe("102.01");

    fireEvent.click(
      within(drafts).getByRole("button", {
        name: "Kasa/Banka Kaydı Oluştur Sandbox hakediş tahsilatı",
      }),
    );

    await waitFor(() => {
      expect(createCashBankMovementFromBankTransaction).toHaveBeenCalledWith(
        "bank-tx-1",
        {
          code: "102.01",
          name: "İş Bankası TL",
        },
      );
    });
  });

  test("creates a partial cash bank movement from the remaining draft amount", async () => {
    const createPartialCashBankMovementFromBankTransaction = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        cashBankMovement: {
          accountCode: "102.09",
          accountName: "QNB Şantiye Hesabı",
          amount: 1500,
          companyId: "company-demo-insaat",
          counterpartyName: "Banka Hareketi",
          createdAt: "2026-07-03T12:00:00.000Z",
          createdBy: "user-main",
          currency: "TL",
          description:
            "Banka hareketinden parçalı ödeme farkı: Sandbox tedarikçi ödemesi",
          direction: "Çıkış",
          documentNo: "BNK-20260703-OUTFLOW-1GMFY2-PART-1Q2W3E",
          id: "partial-cash-bank-from-bank-tx-1",
          movementDate: "2026-07-03",
          movementType: "Ödeme",
          periodId: "period-2026",
          sourceId: "bank-tx-3::cash-movement-partial",
          sourceLabel: "isbank-sandbox-2026-07-03-outflow -> KBN-0101",
          sourceType: "bank-transaction-partial",
          tenantId: "tenant-noa-demo",
          updatedAt: "2026-07-03T12:00:00.000Z",
          updatedBy: "user-main",
        },
        transaction: createBankTransaction({
          amount: -48500,
          description: "Sandbox tedarikçi ödemesi",
          direction: "outflow",
          id: "bank-tx-3",
          status: "pending",
        }),
      },
    });

    render(
      <SettingsSurface
        bankCashBankAccountOptions={[
          { code: "102.01", name: "İş Bankası TL" },
          { code: "102.09", name: "QNB Şantiye Hesabı" },
        ]}
        bankIntegrationOverview={{
          connections: [createBankConnection()],
          manualMatchCandidates: [
            {
              amount: 47000,
              cashBankMovementDocumentNo: "KBN-0101",
              cashBankMovementId: "cash-movement-partial",
              cashBankMovementLabel: "PARCA-0101",
              direction: "Çıkış",
              matchedDate: "2026-07-03",
            },
          ],
          matchSuggestions: [],
          recentTransactions: [
            createBankTransaction({
              amount: -48500,
              description: "Sandbox tedarikçi ödemesi",
              direction: "outflow",
              id: "bank-tx-3",
            }),
          ],
          supportedBanks: [
            { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
          ],
        }}
        context={{ ...createTenantScope(), userRole: "admin" }}
        persistence={{ createPartialCashBankMovementFromBankTransaction }}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "Banka Entegrasyonu",
    });
    const partialDrafts = within(panel).getByRole("table", {
      name: "P2 Parçalı Yeni Kasa/Banka Kayıt Taslakları",
    });

    fireEvent.change(
      within(partialDrafts).getByLabelText(
        "Parçalı kasa/banka hesabı seçimi Sandbox tedarikçi ödemesi",
      ),
      {
        target: { value: "102.09" },
      },
    );
    fireEvent.click(
      within(partialDrafts).getByRole("button", {
        name: "Parçalı Kasa/Banka Kaydı Oluştur Sandbox tedarikçi ödemesi KBN-0101",
      }),
    );
    expect(screen.getByRole("dialog", { name: "Parçalı mutabakat onayı" })).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Kısmi Mutabakatı Onayla" }),
    );

    await waitFor(() => {
      expect(createPartialCashBankMovementFromBankTransaction).toHaveBeenCalledWith(
        "bank-tx-3",
        "cash-movement-partial",
        {
          code: "102.09",
          name: "QNB Şantiye Hesabı",
        },
      );
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Parçalı kasa/banka kaydı oluşturuldu: BNK-20260703-OUTFLOW-1GMFY2-PART-1Q2W3E / Sandbox tedarikçi ödemesi.",
    );
    await waitFor(() => {
      expect(within(partialDrafts).queryByText("KBN-0101")).toBeNull();
    });
    expect(
      within(partialDrafts).getByText("Parçalı yeni kayıt taslağı yok."),
    ).toBeTruthy();
  });

  test("opens the P1 user invitation panel with expanded user types", async () => {
    render(<SettingsSurface context={createTenantScope()} />);

    const userManagement = screen.getByRole("region", {
      name: "Kullanıcı Yönetimi",
    });
    const userTypes = within(userManagement).getByRole("table", {
      name: "P1 Kullanıcı Tipleri",
    });

    expect(within(userTypes).getByText("Admin (Tüm Yetkiler)")).toBeTruthy();
    expect(within(userTypes).getByText("Özel (RBAC ile Yönetilen)")).toBeTruthy();
    expect(within(userTypes).getByText("Kullanıcı (Lokasyona Bağlı)")).toBeTruthy();
    expect(within(userTypes).getByText("İSG Uzmanı")).toBeTruthy();
    expect(within(userTypes).getByText("İşyeri Hekimi")).toBeTruthy();
    expect(within(userTypes).getByText("İşveren (Görüntüleme)")).toBeTruthy();

    fireEvent.click(
      within(userManagement).getByRole("button", { name: "Kullanıcı Davet Et" }),
    );

    expect(screen.getByRole("dialog", { name: "Kullanıcı Davet Et" })).toBeTruthy();
    expect(screen.getByText("Davet linki 7 gün geçerlidir")).toBeTruthy();
    expect(screen.getByLabelText("E-posta")).toBeTruthy();
    expect(screen.getByLabelText("Rol")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("E-posta"), {
      target: { value: "isg@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Rol"), {
      target: { value: "İSG Uzmanı" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Davet Gönder" }));

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Davet taslağı hazırlandı: isg@example.com · İSG Uzmanı. Mail gönderimi sonraki server action diliminde açılacaktır.",
      );
    });
  });

  test("persists a user invitation when invite persistence is provided", async () => {
    const createInvitation = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        invitation: {
          email: "isg@example.com",
          expiresAt: "2026-07-09T10:00:00.000Z",
          role: "İSG Uzmanı",
        },
        token: "invite-token",
      },
    });

    render(
      <SettingsSurface
        context={createTenantScope()}
        persistence={{ createInvitation }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kullanıcı Davet Et" }));
    fireEvent.change(screen.getByLabelText("E-posta"), {
      target: { value: "isg@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Rol"), {
      target: { value: "İSG Uzmanı" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Davet Gönder" }));

    await waitFor(() => {
      expect(createInvitation).toHaveBeenCalledWith({
        email: "isg@example.com",
        role: "İSG Uzmanı",
      });
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Davet kaydı oluşturuldu: isg@example.com · İSG Uzmanı. Link 09.07.2026 tarihine kadar geçerli.",
    );
  });

  test("shows active users and invitation history in user management", () => {
    render(
      <SettingsSurface
        context={createTenantScope()}
        userManagementOverview={{
          activeUsers: [
            {
              companyName: "DEMO İNŞAAT",
              email: "isg@example.com",
              fullName: "İSG Kullanıcısı",
              id: "access-1",
              role: "viewer",
              statusLabel: "Aktif",
            },
          ],
          auditLogs: [],
          emailOutboxMessages: [
            {
              createdAt: "2026-07-02T10:00:00.000Z",
              id: "mail-1",
              recipientEmail: "isg@example.com",
              status: "pending",
              statusLabel: "Bekliyor",
              subject: "NOA İnşaat kullanıcı daveti",
              template: "user-invitation-create",
            },
          ],
          invitations: [
            {
              email: "isg@example.com",
              expiresAt: "2026-07-09T10:00:00.000Z",
              id: "invite-1",
              role: "İSG Uzmanı",
              status: "pending",
              statusLabel: "Bekliyor",
            },
          ],
          summary: {
            acceptedInvitationCount: 0,
            activeUserCount: 1,
            pendingInvitationCount: 1,
          },
        }}
      />,
    );

    const activeUsers = screen.getByRole("table", {
      name: "P1 Aktif Kullanıcılar",
    });
    expect(within(activeUsers).getByText("Ad Soyad")).toBeTruthy();
    expect(within(activeUsers).getByText("İSG Kullanıcısı")).toBeTruthy();
    expect(within(activeUsers).getAllByText("isg@example.com")).toHaveLength(1);
    expect(within(activeUsers).getByText("viewer")).toBeTruthy();
    expect(within(activeUsers).getByText("DEMO İNŞAAT")).toBeTruthy();
    expect(
      within(activeUsers).getByRole("button", {
        name: "Devre Dışı Bırak İSG Kullanıcısı",
      }),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Aktif kullanıcılarda ara"), {
      target: { value: "viewer" },
    });
    expect(screen.getByText("1 / 1 kullanıcı")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Aktif kullanıcılarda ara"), {
      target: { value: "olmayan" },
    });
    expect(screen.getByText("Aramaya uyan aktif kullanıcı yok.")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Kullanıcı aramasını temizle" }),
    );
    expect(screen.getByText("1 / 1 kullanıcı")).toBeTruthy();

    const invitations = screen.getByRole("table", {
      name: "P1 Davet Geçmişi",
    });
    expect(within(invitations).getByText("İSG Uzmanı")).toBeTruthy();
    expect(within(invitations).getByText("Bekliyor")).toBeTruthy();
    expect(within(invitations).getByText("09.07.2026")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Davet durumu filtresi"), {
      target: { value: "pending" },
    });
    expect(screen.getByText("1 / 1 davet")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Davet geçmişinde ara"), {
      target: { value: "İSG Uzmanı" },
    });
    expect(screen.getByText("1 / 1 davet")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Davet geçmişinde ara"), {
      target: { value: "olmayan" },
    });
    expect(screen.getByText("Aramaya uyan davet yok.")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Davet filtrelerini temizle" }),
    );
    expect(screen.getByText("1 / 1 davet")).toBeTruthy();
    expect(screen.getByText("Aktif kullanıcı: 1")).toBeTruthy();
    expect(screen.getByText("Rol viewer: 1")).toBeTruthy();
    expect(screen.getByText("Bekleyen davet: 1")).toBeTruthy();
    expect(screen.getByText("Süresi dolmuş davet: 0")).toBeTruthy();
    expect(screen.getByText("İptal edilmiş davet: 0")).toBeTruthy();

    const emailOutbox = screen.getByRole("table", {
      name: "P1 Davet E-posta Kuyruğu",
    });
    expect(within(emailOutbox).getByText("isg@example.com")).toBeTruthy();
    expect(
      within(emailOutbox).getByText("NOA İnşaat kullanıcı daveti"),
    ).toBeTruthy();
    expect(within(emailOutbox).getByText("user-invitation-create")).toBeTruthy();
    expect(
      screen.getByText("Bekliyor: 1 · Gönderildi: 0 · Hatalı: 0"),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Davet e-posta kuyruğunda ara"), {
      target: { value: "pending" },
    });
    expect(screen.getByText(/1 \/ 1 ileti/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Davet e-posta kuyruğunda ara"), {
      target: { value: "olmayan" },
    });
    expect(screen.getByText("Aramaya uyan e-posta kuyruğu kaydı yok.")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "E-posta aramasını temizle" }),
    );
    expect(screen.getByText(/1 \/ 1 ileti/)).toBeTruthy();
    expect(within(emailOutbox).getByText("Bekliyor")).toBeTruthy();
  });

  test("shows user management audit history", () => {
    render(
      <SettingsSurface
        context={createTenantScope()}
        userManagementOverview={{
          activeUsers: [],
          auditLogs: [
            {
              action: "user-management.deactivate",
              detail: "active -> inactive",
              entityLabel: "İSG Kullanıcısı / isg@example.com",
              id: "audit-1",
              occurredAt: "2026-07-03T12:00:00.000Z",
            },
            {
              action: "user-invitation.revoke",
              detail: "pending -> revoked",
              entityLabel: "isg@example.com / İSG Uzmanı",
              id: "audit-2",
              occurredAt: "2026-07-03T12:05:00.000Z",
            },
          ],
          invitations: [],
          summary: {
            acceptedInvitationCount: 0,
            activeUserCount: 0,
            pendingInvitationCount: 0,
          },
        }}
      />,
    );

    const auditHistory = screen.getByRole("table", {
      name: "P1 Kullanıcı Audit Geçmişi",
    });
    expect(within(auditHistory).getAllByText("03.07.2026")).toHaveLength(2);
    expect(
      within(auditHistory).getByText("user-management.deactivate"),
    ).toBeTruthy();
    expect(within(auditHistory).getByText("user-invitation.revoke")).toBeTruthy();
    expect(
      within(auditHistory).getByText("İSG Kullanıcısı / isg@example.com"),
    ).toBeTruthy();
    expect(
      within(auditHistory).getByText("isg@example.com / İSG Uzmanı"),
    ).toBeTruthy();
    expect(within(auditHistory).getByText("active -> inactive")).toBeTruthy();
    expect(within(auditHistory).getByText("pending -> revoked")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Kullanıcı audit geçmişinde ara"), {
      target: { value: "revoked" },
    });
    expect(within(auditHistory).getByText("user-invitation.revoke")).toBeTruthy();
    expect(
      within(auditHistory).queryByText("user-management.deactivate"),
    ).toBeNull();
    expect(screen.getByText("1 / 2 kayıt")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Audit filtrelerini temizle" }),
    );
    expect(screen.getByText("2 / 2 kayıt")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Kullanıcı audit başlangıç tarihi"), {
      target: { value: "2026-07-03" },
    });
    fireEvent.change(screen.getByLabelText("Kullanıcı audit bitiş tarihi"), {
      target: { value: "2026-07-03" },
    });
    expect(screen.getByText("2 / 2 kayıt")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Kullanıcı audit bitiş tarihi"), {
      target: { value: "2026-07-02" },
    });
    expect(
      screen.getByText("Başlangıç tarihi bitiş tarihinden sonra olamaz."),
    ).toBeTruthy();
    expect(screen.getByText("0 / 2 kayıt")).toBeTruthy();
  });

  test("deactivates an active user from the user management table", async () => {
    const deactivateUser = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        deactivatedAccess: {
          email: "isg@example.com",
          id: "access-1",
          userName: "İSG Kullanıcısı",
        },
      },
    });

    render(
      <SettingsSurface
        context={createTenantScope()}
        persistence={{ deactivateUser }}
        userManagementOverview={{
          activeUsers: [
            {
              companyName: "DEMO İNŞAAT",
              email: "isg@example.com",
              fullName: "İSG Kullanıcısı",
              id: "access-1",
              role: "viewer",
              statusLabel: "Aktif",
            },
          ],
          auditLogs: [],
          invitations: [],
          summary: {
            acceptedInvitationCount: 0,
            activeUserCount: 1,
            pendingInvitationCount: 0,
          },
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Devre Dışı Bırak İSG Kullanıcısı",
      }),
    );

    await waitFor(() => {
      expect(deactivateUser).toHaveBeenCalledWith("access-1");
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Kullanıcı devre dışı bırakıldı: İSG Kullanıcısı / isg@example.com.",
    );
    expect(screen.getByText("Aktif kullanıcı: 0")).toBeTruthy();
    expect(
      within(
        screen.getByRole("table", { name: "P1 Aktif Kullanıcılar" }),
      ).queryByText("İSG Kullanıcısı"),
    ).toBeNull();
  });

  test("disables self access deactivation in the user management table", () => {
    render(
      <SettingsSurface
        context={createTenantScope()}
        userManagementOverview={{
          activeUsers: [
            {
              companyName: "DEMO İNŞAAT",
              email: "ana@example.com",
              fullName: "Ana Kullanıcı",
              id: "access-self",
              role: "admin",
              statusLabel: "Aktif",
              userId: "user-main",
            },
          ],
          auditLogs: [],
          invitations: [],
          summary: {
            acceptedInvitationCount: 0,
            activeUserCount: 1,
            pendingInvitationCount: 0,
          },
        }}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Devre Dışı Bırak Ana Kullanıcı",
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.textContent).toContain("Kendi erişiminiz");
  });

  test("revokes a pending invitation from the invitation history table", async () => {
    const revokeInvitation = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        invitation: {
          email: "isg@example.com",
          id: "invite-1",
          revokedAt: "2026-07-03T12:00:00.000Z",
          status: "revoked",
          updatedAt: "2026-07-03T12:00:00.000Z",
        },
      },
    });

    render(
      <SettingsSurface
        context={createTenantScope()}
        persistence={{ revokeInvitation }}
        userManagementOverview={{
          activeUsers: [],
          auditLogs: [],
          invitations: [
            {
              email: "isg@example.com",
              expiresAt: "2026-07-09T10:00:00.000Z",
              id: "invite-1",
              role: "İSG Uzmanı",
              status: "pending",
              statusLabel: "Bekliyor",
            },
          ],
          summary: {
            acceptedInvitationCount: 0,
            activeUserCount: 0,
            pendingInvitationCount: 1,
          },
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Daveti İptal Et isg@example.com",
      }),
    );

    await waitFor(() => {
      expect(revokeInvitation).toHaveBeenCalledWith("invite-1");
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Davet iptal edildi: isg@example.com.",
    );
    expect(screen.getByText("Bekleyen davet: 0")).toBeTruthy();
    expect(screen.getByRole("cell", { name: "İptal Edildi" })).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Daveti İptal Et isg@example.com",
      }),
    ).toBeNull();
  });

  test("shows expired invitations without revoke action", () => {
    render(
      <SettingsSurface
        context={createTenantScope()}
        userManagementOverview={{
          activeUsers: [],
          auditLogs: [],
          invitations: [
            {
              email: "expired@example.com",
              expiresAt: "2026-07-01T10:00:00.000Z",
              id: "invite-expired",
              role: "İSG Uzmanı",
              status: "expired",
              statusLabel: "Süresi Doldu",
            },
          ],
          summary: {
            acceptedInvitationCount: 0,
            activeUserCount: 0,
            pendingInvitationCount: 0,
          },
        }}
      />,
    );

    const invitations = screen.getByRole("table", {
      name: "P1 Davet Geçmişi",
    });
    expect(within(invitations).getByText("expired@example.com")).toBeTruthy();
    expect(within(invitations).getByText("Süresi Doldu")).toBeTruthy();
    expect(screen.getByText("Bekleyen davet: 0")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Daveti İptal Et expired@example.com",
      }),
    ).toBeNull();
  });

  test("resends an expired invitation from the invitation history table", async () => {
    const resendInvitation = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        invitation: {
          email: "expired@example.com",
          expiresAt: "2026-07-17T10:00:00.000Z",
          id: "invite-expired",
          role: "İSG Uzmanı",
          status: "pending",
        },
        token: "resent-token",
      },
    });

    render(
      <SettingsSurface
        context={createTenantScope()}
        persistence={{ resendInvitation }}
        userManagementOverview={{
          activeUsers: [],
          auditLogs: [],
          invitations: [
            {
              email: "expired@example.com",
              expiresAt: "2026-07-01T10:00:00.000Z",
              id: "invite-expired",
              role: "İSG Uzmanı",
              status: "expired",
              statusLabel: "Süresi Doldu",
            },
          ],
          summary: {
            acceptedInvitationCount: 0,
            activeUserCount: 0,
            pendingInvitationCount: 0,
          },
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Daveti Yeniden Gönder expired@example.com",
      }),
    );

    await waitFor(() => {
      expect(resendInvitation).toHaveBeenCalledWith("invite-expired");
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Davet yeniden gönderildi: expired@example.com. Link 17.07.2026 tarihine kadar geçerli.",
    );
    expect(screen.getByText("Bekleyen davet: 1")).toBeTruthy();
    expect(screen.getByText("Bekliyor", { selector: "td" })).toBeTruthy();
    expect(screen.getByText("17.07.2026")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Daveti İptal Et expired@example.com",
      }),
    ).toBeTruthy();
  });
});

function createTenantScope(): TenantScope {
  return {
    companyId: "company-demo-insaat",
    companyName: "DEMO İNŞAAT",
    licenseLabel: "Pilot P0",
    periodId: "period-2026",
    periodLabel: "2026",
    tenantId: "tenant-noa-demo",
    tenantName: "NOA Demo Tenant",
    userId: "user-main",
    userName: "Ana Kullanıcı",
    userRole: "accounting",
  };
}

function createBankConnection(
  overrides: Partial<BankIntegrationOverview["connections"][number]> = {},
): BankIntegrationOverview["connections"][number] {
  return {
    bankCode: "isbank",
    bankName: "İş Bankası",
    consentId: "NOA-SANDBOX-001",
    environmentLabel: "Sandbox",
    id: "bank-connection-1",
    lastTestedAt: "2026-07-03T09:00:00.000Z",
    lastTestMessage: "Sandbox başarılı",
    lastTestStatus: "success",
    status: "connected",
    statusLabel: "Bağlı",
    ...overrides,
  };
}

function createBankTransaction(
  overrides: Partial<BankIntegrationOverview["recentTransactions"][number]> = {},
): BankIntegrationOverview["recentTransactions"][number] {
  return {
    amount: 125000,
    bankName: "İş Bankası",
    currency: "TRY",
    description: "Sandbox hakediş tahsilatı",
    direction: "inflow",
    id: "bank-tx-1",
    occurredAt: "2026-07-03T09:00:00.000Z",
    status: "pending",
    statusLabel: "Bekliyor",
    ...overrides,
  };
}









