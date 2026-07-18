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

const routerRefreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

import { listSubscriptionOverview } from "@/lib/subscription-service";

import { SubscriptionSurface } from "./subscription-surface";

afterEach(() => {
  cleanup();
  routerRefreshMock.mockReset();
});

describe("SubscriptionSurface", () => {
  test("starts and confirms a manual renewal checkout", async () => {
    const createRenewalCheckoutAction = vi.fn().mockResolvedValue({
      ok: true,
      data: { checkout: {
        amount: 9900,
        billingCycle: "monthly",
        currency: "TRY",
        currentPlanId: "profesyonel",
        currentPlanName: "Profesyonel",
        invoiceDraft: { amount: 9900, currency: "TRY", invoiceNo: "REN-20260712-PROFESYONEL-MONTHLY", method: "Ödeme sağlayıcı seçilecek", status: "Bekliyor" },
        status: "provider-pending",
        targetPlanId: "profesyonel",
        targetPlanName: "Profesyonel",
      } },
    });
    const activateRenewalAction = vi.fn().mockResolvedValue({
      ok: true,
      data: { invoice: {}, subscription: { endsAt: "2026-08-30" } },
    });
    render(<SubscriptionSurface activateRenewalAction={activateRenewalAction} createRenewalCheckoutAction={createRenewalCheckoutAction} overview={listSubscriptionOverview()} />);

    fireEvent.click(screen.getByRole("button", { name: "Manuel Yenilemeyi Başlat" }));
    await screen.findByText(/Manuel yenileme taslağı hazır/);
    expect(createRenewalCheckoutAction).toHaveBeenCalledWith({ billingCycle: "yearly" });
    fireEvent.click(screen.getByRole("button", { name: "Sandbox Ödeme Onayla" }));
    await screen.findByText("Profesyonel paketi yenilendi. Yeni bitiş: 2026-08-30");
    expect(activateRenewalAction).toHaveBeenCalledWith(expect.objectContaining({ invoiceNo: "REN-20260712-PROFESYONEL-MONTHLY" }));
    expect(routerRefreshMock).toHaveBeenCalledTimes(2);
  });

  test("shows and submits the renewal sandbox failure action", async () => {
    const createRenewalCheckoutAction = vi.fn().mockResolvedValue({
      ok: true,
      data: { checkout: {
        amount: 98604,
        billingCycle: "yearly",
        currency: "TRY",
        currentPlanId: "profesyonel",
        currentPlanName: "Profesyonel",
        invoiceDraft: { amount: 98604, currency: "TRY", invoiceNo: "REN-20260712-PROFESYONEL-YEARLY", method: "Ödeme sağlayıcı seçilecek", status: "Bekliyor" },
        status: "provider-pending",
        targetPlanId: "profesyonel",
        targetPlanName: "Profesyonel",
      } },
    });
    const failRenewalCheckoutAction = vi.fn().mockResolvedValue({
      ok: true,
      data: { invoice: { invoiceNo: "REN-20260712-PROFESYONEL-YEARLY" } },
    });
    render(<SubscriptionSurface createRenewalCheckoutAction={createRenewalCheckoutAction} failRenewalCheckoutAction={failRenewalCheckoutAction} overview={listSubscriptionOverview()} />);

    fireEvent.click(screen.getByRole("button", { name: "Manuel Yenilemeyi Başlat" }));
    await screen.findByText(/Manuel yenileme taslağı hazır/);
    fireEvent.click(screen.getByRole("button", { name: "Sandbox Ödeme Hatası" }));
    await screen.findByText(/sandbox ödeme başarısız kaydedildi/);
    expect(failRenewalCheckoutAction).toHaveBeenCalledWith(expect.objectContaining({ invoiceNo: "REN-20260712-PROFESYONEL-YEARLY", amount: 98604 }));
  });
  test("renders current package, upgrade packages, add-ons and payment history", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview()}
        today="2026-07-12"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Abonelik ve Paket Yönetimi" }),
    ).toBeTruthy();
    expect(screen.getByText("Mevcut paket")).toBeTruthy();
    expect(screen.getAllByText("Profesyonel").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Otomatik yenileme açık")).toBeTruthy();
    expect(screen.getByText("Yenilemeye 353 gün kaldı")).toBeTruthy();

    const plans = screen.getByRole("region", { name: "Paketleri Yükselt" });

    expect(within(plans).getAllByText("Başlangıç").length).toBeGreaterThanOrEqual(1);
    expect(within(plans).getAllByText("Standart").length).toBeGreaterThanOrEqual(1);
    expect(within(plans).getByRole("heading", { name: "Kurumsal" })).toBeTruthy();
    expect(within(plans).getByText("Banka Entegrasyonu")).toBeTruthy();

    const addons = screen.getByRole("region", { name: "Ek Özellikler" });

    expect(within(addons).getByText("Döküman Yönetimi (+5GB)")).toBeTruthy();
    expect(within(addons).getByText("Arvento Filo Takip")).toBeTruthy();
    expect(within(addons).getByText("Barkod & QR Tarayıcı")).toBeTruthy();

    expect(
      screen.getByRole("table", { name: "Ödeme geçmişi" }),
    ).toBeTruthy();
    expect(screen.getByText("INV-2026-003")).toBeTruthy();

    const accessMatrix = screen.getByRole("table", {
      name: "Abonelik erişim matrisi",
    });

    expect(within(accessMatrix).getByText("Hakediş")).toBeTruthy();
    expect(within(accessMatrix).getByText("Döküman Merkezi")).toBeTruthy();
    expect(within(accessMatrix).getByText("Banka Entegrasyonu")).toBeTruthy();
    expect(within(accessMatrix).getAllByText("Aktif").length).toBeGreaterThanOrEqual(3);
    expect(within(accessMatrix).getAllByText("Yükseltme Gerekli").length).toBeGreaterThanOrEqual(1);
  });

  test("renders recent payment provider webhook events", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          paymentProviderEvents: [
            {
              errorMessage: "Kart sağlayıcı tarafından reddedildi.",
              eventId: "evt_payment_failed_001",
              eventType: "subscription.payment.failed",
              invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
              processedAt: "2026-07-04T11:08:00.000Z",
              providerRef: "provider-payment-failed-001",
              receivedAt: "2026-07-04T11:07:00.000Z",
              resultStatus: "failed",
              status: "processed",
            },
          ],
        })}
      />,
    );

    const events = screen.getByRole("table", {
      name: "Ödeme sağlayıcı olayları",
    });

    expect(within(events).getByText("evt_payment_failed_001")).toBeTruthy();
    expect(within(events).getByText("subscription.payment.failed")).toBeTruthy();
    expect(within(events).getByText("provider-payment-failed-001")).toBeTruthy();
    expect(within(events).getByText("Kart sağlayıcı tarafından reddedildi.")).toBeTruthy();
    expect(within(events).getByText("SUB-20260704-KURUMSAL-MONTHLY")).toBeTruthy();
  });

  test("keeps an unknown payment provider event status visible", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          paymentProviderEvents: [
            {
              errorMessage: null,
              eventId: "evt_queued_001",
              eventType: "subscription.payment.succeeded",
              invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
              processedAt: null,
              providerRef: "provider-queued-001",
              receivedAt: "2026-07-04T11:07:00.000Z",
              resultStatus: null,
              status: "queued" as never,
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("queued")).toBeTruthy();
  });

  test("shows processed provider events without a result as processed", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          paymentProviderEvents: [
            {
              errorMessage: null,
              eventId: "evt_processed_001",
              eventType: "subscription.payment.succeeded",
              invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
              processedAt: "2026-07-04T11:08:00.000Z",
              providerRef: "provider-processed-001",
              receivedAt: "2026-07-04T11:07:00.000Z",
              resultStatus: null,
              status: "processed",
            },
          ],
        })}
      />,
    );

    expect(
      within(
        screen.getByRole("table", { name: "Ödeme sağlayıcı olayları" }),
      ).getByText("İşlendi"),
    ).toBeTruthy();
  });

  test("filters payment provider events by status chips", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          paymentProviderEvents: [
            {
              errorMessage: null,
              eventId: "evt_processing_001",
              eventType: "subscription.payment.succeeded",
              invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
              processedAt: null,
              providerRef: "provider-processing-001",
              receivedAt: "2026-07-04T11:07:00.000Z",
              resultStatus: null,
              status: "processing",
            },
            {
              errorMessage: null,
              eventId: "evt_processed_001",
              eventType: "subscription.payment.succeeded",
              invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
              processedAt: "2026-07-04T11:08:00.000Z",
              providerRef: "provider-processed-001",
              receivedAt: "2026-07-04T11:07:30.000Z",
              resultStatus: "activated",
              status: "processed",
            },
            {
              errorMessage: "Kart sağlayıcı tarafından reddedildi.",
              eventId: "evt_failed_001",
              eventType: "subscription.payment.failed",
              invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
              processedAt: "2026-07-04T11:09:00.000Z",
              providerRef: "provider-failed-001",
              receivedAt: "2026-07-04T11:08:30.000Z",
              resultStatus: "failed",
              status: "failed",
            },
          ],
        })}
      />,
    );

    const eventsPanel = screen
      .getByRole("heading", { name: "Ödeme Sağlayıcı Olayları" })
      .closest("section");
    expect(eventsPanel).toBeTruthy();

    const events = within(eventsPanel!);

    expect(events.getByText("evt_processing_001")).toBeTruthy();
    expect(events.getByText("evt_processed_001")).toBeTruthy();
    expect(events.getByText("evt_failed_001")).toBeTruthy();
    expect(events.getByText("3 kayıt içinden 3 gösteriliyor.")).toBeTruthy();
    expect(events.getByText("İşleniyor: 1 · Hatalı: 1")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Hatalı",
      }),
    );

    expect(events.getByText("evt_failed_001")).toBeTruthy();
    expect(events.queryByText("evt_processing_001")).toBeNull();
    expect(events.queryByText("evt_processed_001")).toBeNull();
    expect(events.getByText("3 kayıt içinden 1 gösteriliyor.")).toBeTruthy();
  });

  test("renders failed subscription invoices in payment history", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          paymentHistory: [
            {
              amount: 16900,
              date: "2026-07-04",
              id: "failed-invoice-2026-007",
              invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
              method: "Ödeme sağlayıcı hata döndü",
              providerRef: "sandbox-failure-001",
              status: "Başarısız",
            },
          ],
        })}
      />,
    );

    const paymentHistory = screen.getByRole("table", {
      name: "Ödeme geçmişi",
    });

    expect(
      within(paymentHistory).getByText("SUB-20260704-KURUMSAL-MONTHLY"),
    ).toBeTruthy();
    expect(
      within(paymentHistory).getByText("Ödeme sağlayıcı hata döndü"),
    ).toBeTruthy();
    expect(within(paymentHistory).getByText("sandbox-failure-001")).toBeTruthy();
    expect(within(paymentHistory).getByText("Başarısız")).toBeTruthy();
  });

  test("renders an empty state when payment history has no rows", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          paymentHistory: [],
        })}
      />,
    );

    const paymentHistory = screen.getByRole("table", {
      name: "Ödeme geçmişi",
    });

    expect(
      within(paymentHistory).getByText("Kayıtlı ödeme geçmişi yok."),
    ).toBeTruthy();
  });

  test("filters payment history by status chips", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          paymentHistory: [
            {
              amount: 16900,
              date: "2026-07-04",
              id: "invoice-paid-001",
              invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
              method: "Sandbox ödeme onayı",
              providerRef: "sandbox-paid-001",
              status: "Ödendi",
            },
            {
              amount: 16900,
              date: "2026-07-05",
              id: "invoice-pending-001",
              invoiceNo: "SUB-20260705-KURUMSAL-MONTHLY",
              method: "Ödeme sağlayıcı seçilecek",
              providerRef: null,
              status: "Bekliyor",
            },
            {
              amount: 16900,
              date: "2026-07-06",
              id: "invoice-failed-001",
              invoiceNo: "SUB-20260706-KURUMSAL-MONTHLY",
              method: "Ödeme sağlayıcı hata döndü",
              providerRef: "sandbox-failed-001",
              status: "Başarısız",
            },
          ],
        })}
      />,
    );

    const paymentHistory = screen.getByRole("table", {
      name: "Ödeme geçmişi",
    });

    expect(
      within(paymentHistory).getByText("SUB-20260704-KURUMSAL-MONTHLY"),
    ).toBeTruthy();
    expect(
      within(paymentHistory).getByText("SUB-20260705-KURUMSAL-MONTHLY"),
    ).toBeTruthy();
    expect(
      within(paymentHistory).getByText("SUB-20260706-KURUMSAL-MONTHLY"),
    ).toBeTruthy();
    expect(screen.getByText("3 kayıt içinden 3 gösteriliyor.")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Başarısız",
      }),
    );

    expect(
      within(paymentHistory).getByText("SUB-20260706-KURUMSAL-MONTHLY"),
    ).toBeTruthy();
    expect(
      within(paymentHistory).queryByText("SUB-20260704-KURUMSAL-MONTHLY"),
    ).toBeNull();
    expect(
      within(paymentHistory).queryByText("SUB-20260705-KURUMSAL-MONTHLY"),
    ).toBeNull();
    expect(screen.getByText("3 kayıt içinden 1 gösteriliyor.")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Bekliyor",
      }),
    );

    expect(
      within(paymentHistory).getByText("SUB-20260705-KURUMSAL-MONTHLY"),
    ).toBeTruthy();
    expect(
      within(paymentHistory).queryByText("SUB-20260706-KURUMSAL-MONTHLY"),
    ).toBeNull();
  });

  test("starts an add-on checkout draft from an available add-on card", async () => {
    const createAddonCheckout = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        checkout: {
          addonName: "Banka Entegrasyonu",
          invoiceDraft: {
            invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          },
          providerSession: {
            expiresAt: "2026-07-05T12:15:00.000Z",
            provider: "sandbox",
            providerRef: "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
            redirectUrl:
              "/abonelik?checkout=ADD-20260705-BANK-INTEGRATION-MONTHLY&provider=sandbox&providerRef=sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
            status: "created",
          },
        },
      },
    });

    render(
      <SubscriptionSurface
        createAddonCheckoutAction={createAddonCheckout}
        overview={listSubscriptionOverview()}
      />,
    );

    const addons = screen.getByRole("region", { name: "Ek Özellikler" });
    const bankAddon = within(addons).getByText("Banka Entegrasyonu").closest("article");

    expect(bankAddon).toBeTruthy();
    fireEvent.click(within(bankAddon!).getByRole("button", { name: "Satın Al" }));

    await waitFor(() => {
      expect(createAddonCheckout).toHaveBeenCalledWith({
        addonId: "bank-integration",
      });
    });
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Banka Entegrasyonu için ek özellik satın alma taslağı hazır: ADD-20260705-BANK-INTEGRATION-MONTHLY",
      );
    });
    expect(
      screen
        .getByRole("link", { name: "Ek Özellik Ödeme Sağlayıcıya Git" })
        .getAttribute("href"),
    ).toBe(
      "/abonelik?checkout=ADD-20260705-BANK-INTEGRATION-MONTHLY&provider=sandbox&providerRef=sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
    );
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  test("renders active add-ons as already enabled", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          activeAddonIds: ["bank-integration"],
        })}
      />,
    );

    const addons = screen.getByRole("region", { name: "Ek Özellikler" });
    const bankAddon = within(addons).getByText("Banka Entegrasyonu").closest("article");

    expect(bankAddon).toBeTruthy();
    expect(within(bankAddon!).getByText("aktif")).toBeTruthy();
    expect(within(bankAddon!).getByRole("button", { name: "Aktif" })).toBeTruthy();
    expect(
      (within(bankAddon!).getByRole("button", { name: "Aktif" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  test("shows an expired subscription warning while keeping feature access locked", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          currentSubscription: {
            autoRenew: false,
            billingCycle: "monthly",
            endsAt: "2026-07-03",
            planId: "kurumsal",
            planName: "Kurumsal",
            renewalAmount: 16900,
            startsAt: "2026-06-04",
            storageLimitGb: 100,
            subscriptionId: "expired-kurumsal-subscription",
            userLimit: 75,
          },
        })}
        today="2026-07-04"
    />,
    );

    expect(screen.getByText("Süresi doldu")).toBeTruthy();
    expect(
      screen.getByText(
        "Abonelik süresi 2026-07-03 tarihinde doldu. Paketi yenilemek gerekir.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Yenilemeye .* gün kaldı/)).toBeNull();

    const accessMatrix = screen.getByRole("table", {
      name: "Abonelik erişim matrisi",
    });

    expect(
      within(accessMatrix).getAllByText("Yükseltme Gerekli").length,
    ).toBeGreaterThanOrEqual(3);
  });

  test("marks the active subscription renewal day without treating it as expired", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          currentSubscription: {
            ...listSubscriptionOverview().currentSubscription,
            endsAt: "2026-07-12",
          },
        })}
        today="2026-07-12"
      />,
    );

    expect(screen.getByText("Yenileme bugün gerekli")).toBeTruthy();
    expect(screen.queryByText("Süresi doldu")).toBeNull();
  });

  test("shows a neutral renewal badge when automatic renewal is disabled", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          currentSubscription: {
            ...listSubscriptionOverview().currentSubscription,
            autoRenew: false,
          },
        })}
      />,
    );

    expect(
      screen.getByText("Otomatik yenileme kapalı").className,
    ).toContain("bg-[var(--status-draft)]");
    expect(
      screen.getByText(
        "Otomatik tahsilat planlanmadı; yenileme manuel başlatılmalıdır.",
      ),
    ).toBeTruthy();
  });

  test("shows the current subscription renewal amount in its selected billing cycle", () => {
    render(
      <SubscriptionSurface
        overview={listSubscriptionOverview({
          currentSubscription: {
            ...listSubscriptionOverview().currentSubscription,
            billingCycle: "monthly",
            renewalAmount: 9900,
          },
        })}
        today="2026-07-12"
      />,
    );

    const renewalAmountRow = screen
      .getByText("Yenileme tutarı")
      .closest("div");

    expect(renewalAmountRow).toBeTruthy();
    expect(within(renewalAmountRow!).getByText("9.900,00 TL / ay")).toBeTruthy();
  });

  test("activates an add-on checkout draft through sandbox confirmation", async () => {
    const createAddonCheckout = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        checkout: {
          addonId: "bank-integration",
          addonName: "Banka Entegrasyonu",
          invoiceDraft: {
            invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          },
          providerSession: {
            expiresAt: "2026-07-05T12:15:00.000Z",
            provider: "sandbox",
            providerRef: "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
            redirectUrl:
              "/abonelik?checkout=ADD-20260705-BANK-INTEGRATION-MONTHLY&provider=sandbox&providerRef=sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
            status: "created",
          },
        },
      },
    });
    const activateAddonCheckout = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        addon: {
          startsAt: "2026-07-05",
        },
        invoice: {
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        },
      },
    });

    render(
      <SubscriptionSurface
        activateAddonCheckoutAction={activateAddonCheckout}
        createAddonCheckoutAction={createAddonCheckout}
        overview={listSubscriptionOverview()}
      />,
    );

    const addons = screen.getByRole("region", { name: "Ek Özellikler" });
    const bankAddon = within(addons).getByText("Banka Entegrasyonu").closest("article");

    expect(bankAddon).toBeTruthy();
    fireEvent.click(within(bankAddon!).getByRole("button", { name: "Satın Al" }));

    await screen.findByRole("button", { name: "Sandbox Ek Özellik Onayla" });
    fireEvent.click(
      screen.getByRole("button", { name: "Sandbox Ek Özellik Onayla" }),
    );

    await waitFor(() => {
      expect(activateAddonCheckout).toHaveBeenCalledWith({
        addonId: "bank-integration",
        invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        paymentProviderRef:
          "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
      });
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Banka Entegrasyonu ek özelliği sandbox ödeme onayıyla aktive edildi. Başlangıç: 2026-07-05",
    );
  });

  test("marks an add-on checkout draft as failed through sandbox failure", async () => {
    const createAddonCheckout = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        checkout: {
          addonId: "bank-integration",
          addonName: "Banka Entegrasyonu",
          amount: 1290,
          invoiceDraft: {
            invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          },
          providerSession: {
            expiresAt: "2026-07-05T12:15:00.000Z",
            provider: "sandbox",
            providerRef: "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
            redirectUrl:
              "/abonelik?checkout=ADD-20260705-BANK-INTEGRATION-MONTHLY&provider=sandbox&providerRef=sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
            status: "created",
          },
        },
      },
    });
    const failAddonCheckout = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        invoice: {
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        },
      },
    });

    render(
      <SubscriptionSurface
        createAddonCheckoutAction={createAddonCheckout}
        failAddonCheckoutAction={failAddonCheckout}
        overview={listSubscriptionOverview()}
      />,
    );

    const addons = screen.getByRole("region", { name: "Ek Özellikler" });
    const bankAddon = within(addons).getByText("Banka Entegrasyonu").closest("article");

    expect(bankAddon).toBeTruthy();
    fireEvent.click(within(bankAddon!).getByRole("button", { name: "Satın Al" }));

    await screen.findByRole("button", { name: "Sandbox Ek Özellik Hatası" });
    fireEvent.click(
      screen.getByRole("button", { name: "Sandbox Ek Özellik Hatası" }),
    );

    await waitFor(() => {
      expect(failAddonCheckout).toHaveBeenCalledWith({
        addonId: "bank-integration",
        amount: 1290,
        invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        paymentProviderRef:
          "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
        reason: "Sandbox ek özellik ödeme sağlayıcı hata simülasyonu",
      });
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Banka Entegrasyonu için sandbox ek özellik ödemesi başarısız kaydedildi: ADD-20260705-BANK-INTEGRATION-MONTHLY",
    );
  });

  test("switches package prices between monthly and yearly renewal periods", () => {
    render(<SubscriptionSurface overview={listSubscriptionOverview()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Aylık" })[0]!);

    expect(screen.getAllByText(hasTextContent("9.900,00 TL / ay")).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Yıllık %17 indirim" })[0]!,
    );

    expect(screen.getAllByText(hasTextContent("98.604,00 TL / yıl")).length).toBeGreaterThanOrEqual(1);
  });

  test("starts a package change checkout draft from an upgrade plan card", async () => {
    const createPlanChangeCheckout = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        checkout: {
          invoiceDraft: {
            invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          },
          providerSession: {
            expiresAt: "2026-07-04T09:45:00.000Z",
            redirectUrl:
              "/abonelik?checkout=SUB-20260704-KURUMSAL-MONTHLY&provider=sandbox&providerRef=sandbox-subscription-SUB-20260704-KURUMSAL-MONTHLY",
          },
          targetPlanName: "Kurumsal",
        },
      },
    });

    render(
      <SubscriptionSurface
        createPlanChangeCheckoutAction={createPlanChangeCheckout}
        overview={listSubscriptionOverview()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Aylık" })[0]!);

    const corporatePlan = screen
      .getByRole("heading", { name: "Kurumsal" })
      .closest("article");

    expect(corporatePlan).toBeTruthy();
    fireEvent.click(
      within(corporatePlan!).getByRole("button", { name: "Yükselt" }),
    );

    await waitFor(() => {
      expect(createPlanChangeCheckout).toHaveBeenCalledWith({
        billingCycle: "monthly",
        targetPlanId: "kurumsal",
      });
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Kurumsal için satın alma taslağı hazır: SUB-20260704-KURUMSAL-MONTHLY",
    );
    expect(
      screen
        .getByRole("link", { name: "Ödeme Sağlayıcıya Git" })
        .getAttribute("href"),
    ).toBe(
      "/abonelik?checkout=SUB-20260704-KURUMSAL-MONTHLY&provider=sandbox&providerRef=sandbox-subscription-SUB-20260704-KURUMSAL-MONTHLY",
    );
    expect(screen.getByText("Geçerli: 4.07.2026 12:45")).toBeTruthy();
  });

  test("activates a sandbox payment after checkout draft is prepared", async () => {
    const createPlanChangeCheckout = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        checkout: {
          billingCycle: "monthly",
          invoiceDraft: {
            invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          },
          providerSession: {
            expiresAt: "2026-07-04T09:45:00.000Z",
            provider: "sandbox",
            providerRef: "sandbox-subscription-SUB-20260704-KURUMSAL-MONTHLY",
            redirectUrl:
              "/abonelik?checkout=SUB-20260704-KURUMSAL-MONTHLY&provider=sandbox&providerRef=sandbox-subscription-SUB-20260704-KURUMSAL-MONTHLY",
            status: "created",
          },
          targetPlanId: "kurumsal",
          targetPlanName: "Kurumsal",
        },
      },
    });
    const activatePlanChange = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        invoice: {
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        },
        subscription: {
          endsAt: "2026-08-03",
          planId: "kurumsal",
        },
      },
    });

    render(
      <SubscriptionSurface
        activatePlanChangeAction={activatePlanChange}
        createPlanChangeCheckoutAction={createPlanChangeCheckout}
        overview={listSubscriptionOverview()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Aylık" })[0]!);
    const corporatePlan = screen
      .getByRole("heading", { name: "Kurumsal" })
      .closest("article");
    fireEvent.click(
      within(corporatePlan!).getByRole("button", { name: "Yükselt" }),
    );

    await screen.findByRole("button", { name: "Sandbox Ödeme Onayla" });
    fireEvent.click(screen.getByRole("button", { name: "Sandbox Ödeme Onayla" }));

    await waitFor(() => {
      expect(activatePlanChange).toHaveBeenCalledWith({
        billingCycle: "monthly",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        paymentProviderRef: "sandbox-subscription-SUB-20260704-KURUMSAL-MONTHLY",
        targetPlanId: "kurumsal",
      });
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Kurumsal paketi sandbox ödeme onayıyla aktive edildi. Bitiş: 2026-08-03",
    );
  });

  test("marks a sandbox payment failure after checkout draft is prepared", async () => {
    const createPlanChangeCheckout = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        checkout: {
          amount: 16900,
          billingCycle: "monthly",
          invoiceDraft: {
            invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          },
          providerSession: {
            expiresAt: "2026-07-04T09:45:00.000Z",
            provider: "sandbox",
            providerRef: "sandbox-subscription-SUB-20260704-KURUMSAL-MONTHLY",
            redirectUrl:
              "/abonelik?checkout=SUB-20260704-KURUMSAL-MONTHLY&provider=sandbox&providerRef=sandbox-subscription-SUB-20260704-KURUMSAL-MONTHLY",
            status: "created",
          },
          targetPlanId: "kurumsal",
          targetPlanName: "Kurumsal",
        },
      },
    });
    const failPlanChangeCheckout = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        invoice: {
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          status: "failed",
        },
      },
    });

    render(
      <SubscriptionSurface
        createPlanChangeCheckoutAction={createPlanChangeCheckout}
        failPlanChangeCheckoutAction={failPlanChangeCheckout}
        overview={listSubscriptionOverview()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Aylık" })[0]!);
    const corporatePlan = screen
      .getByRole("heading", { name: "Kurumsal" })
      .closest("article");
    fireEvent.click(
      within(corporatePlan!).getByRole("button", { name: "Yükselt" }),
    );

    await screen.findByRole("button", { name: "Sandbox Ödeme Hatası" });
    fireEvent.click(screen.getByRole("button", { name: "Sandbox Ödeme Hatası" }));

    await waitFor(() => {
      expect(failPlanChangeCheckout).toHaveBeenCalledWith({
        amount: 16900,
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        paymentProviderRef: "sandbox-subscription-SUB-20260704-KURUMSAL-MONTHLY",
        reason: "Sandbox ödeme sağlayıcı hata simülasyonu",
        targetPlanId: "kurumsal",
      });
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Kurumsal için sandbox ödeme başarısız kaydedildi: SUB-20260704-KURUMSAL-MONTHLY",
    );
  });
});

function hasTextContent(expected: string) {
  return (_content: string, element: Element | null) =>
    element?.textContent === expected;
}




