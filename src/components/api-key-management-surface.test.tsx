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

import type { ApiKeyOverview, ApiKeyRow } from "@/lib/api-key-contract";
import type { WebhookEndpointOverview } from "@/lib/webhook-endpoint-service";

import { ApiKeyManagementSurface } from "./api-key-management-surface";

afterEach(cleanup);

const activeRow: ApiKeyRow = {
  createdAt: "2026-07-11T10:00:00.000Z",
  createdBy: "user-admin",
  expiresAt: "2026-12-31",
  id: "api-key-1",
  keyPrefix: "noa_live_1234567",
  lastUsedAt: "2026-07-10T09:30:00.000Z",
  name: "ERP Entegrasyonu",
  rateLimitPerSecond: 10,
  revokedAt: "",
  revokedBy: "",
  scopes: ["invoices", "projects"],
  status: "active",
};

const revokedRow: ApiKeyRow = {
  ...activeRow,
  id: "api-key-2",
  keyPrefix: "noa_live_7654321",
  name: "Mobil Entegrasyon",
  lastUsedAt: "2026-07-11T09:30:00.000Z",
  revokedAt: "2026-07-11T12:30:00.000Z",
  revokedBy: "user-admin",
  scopes: ["webhooks"],
  status: "revoked",
};

const unusedRow: ApiKeyRow = {
  ...activeRow,
  id: "api-key-3",
  keyPrefix: "noa_live_0000000",
  lastUsedAt: "",
  name: "Yedek Entegrasyon",
  revokedAt: "",
  revokedBy: "",
  scopes: ["stock"],
  status: "expired",
};

const webhookEndpointOverview: WebhookEndpointOverview = {
  rows: [
    {
      companyId: "company-1",
      createdAt: "2026-07-12T10:00:00.000Z",
      createdBy: "user-admin",
      eventTypes: ["invoice.created", "bank.transaction.matched"],
      id: "webhook-endpoint-1",
      isActive: true,
      name: "Fatura Bildirimi",
      periodId: "period-1",
      secretPrefix: "noa_whsec_123456",
      tenantId: "tenant-1",
      updatedAt: "2026-07-12T10:00:00.000Z",
      url: "https://hooks.example.com/webhooks/noa",
    },
  ],
  summary: {
    activeCount: 1,
    inactiveCount: 0,
    totalCount: 1,
  },
};

function createOverview(rows: ApiKeyRow[] = [activeRow]): ApiKeyOverview {
  const counts = rows.reduce(
    (accumulator, row) => {
      accumulator[row.status] += 1;
      return accumulator;
    },
    {
      active: 0,
      expired: 0,
      revoked: 0,
    },
  );

  return {
    rows,
    summary: {
      activeCount: counts.active,
      expiredCount: counts.expired,
      revokedCount: counts.revoked,
      totalCount: rows.length,
    },
  };
}

function createPersistence() {
  return {
    createKey: vi.fn(),
    createWebhookEndpoint: vi.fn(),
    deactivateWebhookEndpoint: vi.fn(),
    rotateWebhookEndpointSecret: vi.fn(),
    updateWebhookEndpoint: vi.fn(),
    revokeKey: vi.fn(),
  };
}

describe("ApiKeyManagementSurface", () => {
  test("renders scoped key metadata without exposing a stored secret", () => {
    render(
      <ApiKeyManagementSurface
        overview={createOverview([activeRow, revokedRow])}
        persistence={createPersistence()}
        userRole="admin"
        webhookEndpointOverview={webhookEndpointOverview}
      />,
    );

    const table = screen.getByRole("table", { name: "P2 API Anahtarları" });
    expect(within(table).getByText("ERP Entegrasyonu")).toBeTruthy();
    expect(within(table).getByText("noa_live_1234567...")).toBeTruthy();
    expect(within(table).getByText("Faturalar, Proje / Şantiye")).toBeTruthy();
    expect(within(table).getByText("Mobil Entegrasyon")).toBeTruthy();
    expect(within(table).getByText("Webhook")).toBeTruthy();
    expect(within(table).getByText("10 Tem 2026")).toBeTruthy();
    expect(within(table).getByText("11 Tem 2026")).toBeTruthy();
    expect(screen.getByText("Kullanılan")).toBeTruthy();
    expect(screen.getByText("Kullanılmayan")).toBeTruthy();
    expect(screen.queryByText("noa_live_secret_value")).toBeNull();
    expect(
      screen.getByRole("table", { name: "Webhook endpoint kayıtları" }),
    ).toBeTruthy();
    expect(screen.getByText("Güncelleme")).toBeTruthy();
    expect(screen.getByText("Olay Sayısı")).toBeTruthy();
    expect(screen.getByText("Olay türü").parentElement?.textContent).toContain("2");
    expect(screen.getByText("2 olay")).toBeTruthy();
    expect(screen.getByText("Fatura Bildirimi")).toBeTruthy();
    expect(screen.getByText("12 Tem 2026")).toBeTruthy();
    expect(screen.getByText("https://hooks.example.com/webhooks/noa")).toBeTruthy();
  });

  test("filters keys by search text and status", () => {
    render(
      <ApiKeyManagementSurface
        overview={createOverview([activeRow, revokedRow])}
        persistence={createPersistence()}
        userRole="admin"
        webhookEndpointOverview={webhookEndpointOverview}
      />,
    );

    expect(screen.getByText("Son 2 API anahtarı")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("API anahtarı kapsam filtresi"), {
      target: { value: "webhooks" },
    });

    expect(screen.getByText("Son 1 / 2 API anahtarı")).toBeTruthy();
    expect(screen.queryByText("ERP Entegrasyonu")).toBeNull();
    expect(screen.getByText("Mobil Entegrasyon")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("API anahtarı son kullanım başlangıcı"), {
      target: { value: "2026-07-11" },
    });

    expect(screen.getByText("Son 1 / 2 API anahtarı")).toBeTruthy();
    expect(screen.getByText("Mobil Entegrasyon")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("API anahtarlarında ara"), {
      target: { value: "mobil" },
    });

    expect(screen.getByText("Son 1 / 2 API anahtarı")).toBeTruthy();
    expect(screen.getByText("Mobil Entegrasyon")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("API anahtarı durum filtresi"), {
      target: { value: "revoked" },
    });

    expect(screen.getByText("Son 1 / 2 API anahtarı")).toBeTruthy();
    expect(screen.getByText("Mobil Entegrasyon")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("API anahtarı kapsam filtresi"), {
      target: { value: "invoices" },
    });

    expect(screen.getByText("Filtreye uyan API anahtarı bulunamadı.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("API anahtarı son kullanım başlangıcı"), {
      target: { value: "2026-07-12" },
    });
    fireEvent.change(screen.getByLabelText("API anahtarı son kullanım bitişi"), {
      target: { value: "2026-07-11" },
    });
    expect(
      screen.getByText("Son kullanım başlangıcı bitiş tarihinden sonra olamaz."),
    ).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Filtreleri Temizle" })[1]);

    expect(screen.getByText("Son 2 API anahtarı")).toBeTruthy();
    expect(screen.getByText("ERP Entegrasyonu")).toBeTruthy();
    expect(screen.getByText("Mobil Entegrasyon")).toBeTruthy();
  });

  test("filters keys by last used presence", () => {
    render(
      <ApiKeyManagementSurface
        overview={createOverview([activeRow, unusedRow])}
        persistence={createPersistence()}
        userRole="admin"
        webhookEndpointOverview={webhookEndpointOverview}
      />,
    );

    expect(screen.getByText("Son 2 API anahtarı")).toBeTruthy();
    expect(screen.getByText("Yedek Entegrasyon")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("API anahtarı kullanım filtresi"), {
      target: { value: "used" },
    });

    expect(screen.getByText("Son 1 / 2 API anahtarı")).toBeTruthy();
    expect(screen.getByText("ERP Entegrasyonu")).toBeTruthy();
    expect(screen.queryByText("Yedek Entegrasyon")).toBeNull();

    fireEvent.change(screen.getByLabelText("API anahtarı kullanım filtresi"), {
      target: { value: "unused" },
    });

    expect(screen.getByText("Yedek Entegrasyon")).toBeTruthy();
    expect(screen.queryByText("ERP Entegrasyonu")).toBeNull();
  });

  test("creates a key and reveals its secret only in the creation result", async () => {
    const createKey = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        row: { ...activeRow, id: "api-key-2", name: "Mobil Uygulama" },
        secret: "noa_live_secret_value",
      },
    });
    render(
      <ApiKeyManagementSurface
        overview={createOverview([])}
        persistence={{
          createKey,
          createWebhookEndpoint: vi.fn(),
          deactivateWebhookEndpoint: vi.fn(),
          rotateWebhookEndpointSecret: vi.fn(),
          updateWebhookEndpoint: vi.fn(),
          revokeKey: vi.fn(),
        }}
        userRole="admin"
        webhookEndpointOverview={webhookEndpointOverview}
      />,
    );

    fireEvent.change(screen.getByLabelText("Anahtar Adı"), {
      target: { value: "Mobil Uygulama" },
    });
    fireEvent.click(screen.getByLabelText("Faturalar"));
    fireEvent.click(screen.getByRole("button", { name: "API Anahtarı Oluştur" }));

    await waitFor(() =>
      expect(createKey).toHaveBeenCalledWith({
        expiresAt: "",
        name: "Mobil Uygulama",
        rateLimitPerSecond: 10,
        scopes: ["invoices"],
      }),
    );
    expect(screen.getByRole("status").textContent).toContain("noa_live_secret_value");
    expect(screen.getByRole("table", { name: "P2 API Anahtarları" }).textContent).toContain(
      "Mobil Uygulama",
    );
  });

  test("creates a webhook endpoint and reveals its secret only in the creation result", async () => {
    const createWebhookEndpoint = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        row: {
          ...webhookEndpointOverview.rows[0],
          id: "webhook-endpoint-2",
          name: "Tahsilat Bildirimi",
          eventTypes: ["invoice.created"],
          secretPrefix: "noa_whsec_abcdef",
          url: "https://hooks.example.com/webhooks/tahsilat",
        },
        secret: "noa_whsec_secret_value",
      },
    });

    render(
      <ApiKeyManagementSurface
        overview={createOverview()}
        persistence={{
          createKey: vi.fn(),
          createWebhookEndpoint,
          deactivateWebhookEndpoint: vi.fn(),
          rotateWebhookEndpointSecret: vi.fn(),
          updateWebhookEndpoint: vi.fn(),
          revokeKey: vi.fn(),
        }}
        userRole="admin"
        webhookEndpointOverview={webhookEndpointOverview}
      />,
    );

    fireEvent.change(screen.getByLabelText("Endpoint Adı"), {
      target: { value: "Tahsilat Bildirimi" },
    });
    fireEvent.change(screen.getByLabelText("Endpoint URL"), {
      target: { value: "https://hooks.example.com/webhooks/tahsilat" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Fatura oluşturulduinvoice.created" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Webhook Endpoint Oluştur" }));

    await waitFor(() =>
      expect(createWebhookEndpoint).toHaveBeenCalledWith({
        eventTypes: ["invoice.created"],
        name: "Tahsilat Bildirimi",
        url: "https://hooks.example.com/webhooks/tahsilat",
      }),
    );
    expect(screen.getByRole("status").textContent).toContain("noa_whsec_secret_value");
    expect(
      screen.getByRole("table", { name: "Webhook endpoint kayıtları" }).textContent,
    ).toContain("Tahsilat Bildirimi");
  });

  test("deactivates a webhook endpoint and updates its active state in the table", async () => {
    const deactivateWebhookEndpoint = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        row: {
          ...webhookEndpointOverview.rows[0],
          isActive: false,
          updatedAt: "2026-07-12T11:00:00.000Z",
        },
      },
    });

    render(
      <ApiKeyManagementSurface
        overview={createOverview()}
        persistence={{
          createKey: vi.fn(),
          createWebhookEndpoint: vi.fn(),
          deactivateWebhookEndpoint,
          rotateWebhookEndpointSecret: vi.fn(),
          updateWebhookEndpoint: vi.fn(),
          revokeKey: vi.fn(),
        }}
        userRole="admin"
        webhookEndpointOverview={webhookEndpointOverview}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pasifleştir" }));

    await waitFor(() =>
      expect(deactivateWebhookEndpoint).toHaveBeenCalledWith("webhook-endpoint-1"),
    );
    expect(screen.getByText("Webhook endpoint pasifleştirildi.")).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).getByText(
        "Pasif",
      ),
    ).toBeTruthy();
  });

  test("activates a passive webhook endpoint and updates its active state in the table", async () => {
    const activateWebhookEndpoint = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        row: {
          ...webhookEndpointOverview.rows[0],
          isActive: true,
          updatedAt: "2026-07-12T11:30:00.000Z",
        },
      },
    });

    render(
      <ApiKeyManagementSurface
        overview={createOverview()}
        persistence={{
          activateWebhookEndpoint,
          createKey: vi.fn(),
          createWebhookEndpoint: vi.fn(),
          deactivateWebhookEndpoint: vi.fn(),
          rotateWebhookEndpointSecret: vi.fn(),
          updateWebhookEndpoint: vi.fn(),
          revokeKey: vi.fn(),
        }}
        userRole="admin"
        webhookEndpointOverview={{
          rows: [{ ...webhookEndpointOverview.rows[0], isActive: false }],
          summary: { activeCount: 0, inactiveCount: 1, totalCount: 1 },
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktifleştir" }));

    await waitFor(() =>
      expect(activateWebhookEndpoint).toHaveBeenCalledWith("webhook-endpoint-1"),
    );
    expect(screen.getByText("Webhook endpoint aktifleştirildi.")).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).getByText(
        "Aktif",
      ),
    ).toBeTruthy();
  });

  test("rotates a webhook endpoint secret and reveals the new secret only once", async () => {
    const rotateWebhookEndpointSecret = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        row: {
          ...webhookEndpointOverview.rows[0],
          secretPrefix: "noa_whsec_rotated",
          updatedAt: "2026-07-12T12:30:00.000Z",
        },
        secret: "noa_whsec_rotated_secret_value",
      },
    });

    render(
      <ApiKeyManagementSurface
        overview={createOverview()}
        persistence={{
          createKey: vi.fn(),
          createWebhookEndpoint: vi.fn(),
          deactivateWebhookEndpoint: vi.fn(),
          rotateWebhookEndpointSecret,
          updateWebhookEndpoint: vi.fn(),
          revokeKey: vi.fn(),
        }}
        userRole="admin"
        webhookEndpointOverview={webhookEndpointOverview}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Secret Yenile" }));

    await waitFor(() =>
      expect(rotateWebhookEndpointSecret).toHaveBeenCalledWith("webhook-endpoint-1"),
    );
    expect(screen.getByText("Webhook endpoint secret yenilendi.")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "noa_whsec_rotated_secret_value",
    );
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).getByText(
        "noa_whsec_rotated...",
      ),
    ).toBeTruthy();
  });

  test("filters webhook endpoints by search text and status", () => {
    render(
      <ApiKeyManagementSurface
        overview={createOverview()}
        persistence={createPersistence()}
        userRole="admin"
        webhookEndpointOverview={{
          rows: [
            webhookEndpointOverview.rows[0],
            {
              ...webhookEndpointOverview.rows[0],
              id: "webhook-endpoint-2",
              isActive: false,
              name: "Tahsilat Bildirimi",
              url: "https://hooks.example.com/webhooks/tahsilat",
            },
          ],
          summary: {
            activeCount: 1,
            inactiveCount: 1,
            totalCount: 2,
          },
        }}
      />,
    );

    expect(screen.getByText("Webhook Endpoint Kayıtları")).toBeTruthy();
    expect(screen.getByText("Gösterilen 2 / 2 webhook endpoint")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Filtreleri Temizle" })[0]).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Webhook endpointlerinde ara"), {
      target: { value: "tahsilat" },
    });
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).getByText(
        "Tahsilat Bildirimi",
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).queryByText(
        "Fatura Bildirimi",
      ),
    ).toBeNull();

    fireEvent.change(screen.getByLabelText("Webhook endpoint durum filtresi"), {
      target: { value: "inactive" },
    });

    expect(screen.getByText('Aktif filtreler: ara "tahsilat", durum pasif')).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).getByText(
        "Tahsilat Bildirimi",
      ),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Webhook endpoint olay filtresi"), {
      target: { value: "bank.transaction.matched" },
    });

    expect(
      screen.getByText(
        'Aktif filtreler: ara "tahsilat", durum pasif, olay Banka hareketi eşleştirildi',
      ),
    ).toBeTruthy();
    expect(screen.getByText("Gösterilen 1 / 2 webhook endpoint")).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).queryByText(
        "Fatura Bildirimi",
      ),
    ).toBeNull();
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).queryByText(
        "Mobil Entegrasyon",
      ),
    ).toBeNull();

    fireEvent.change(screen.getByLabelText("Webhook endpointlerinde ara"), {
      target: { value: "yok" },
    });
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).getByText(
        "Filtreye uyan webhook endpoint bulunamadı.",
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).getByText(
        "Filtreleri temizleyerek tüm webhook endpointlerini tekrar görün.",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Filtreleri Temizle" })[0]);

    expect(screen.queryByText('Aktif filtreler: ara "tahsilat", durum pasif')).toBeNull();
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).getByText(
        "Fatura Bildirimi",
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).getByText(
        "Tahsilat Bildirimi",
      ),
    ).toBeTruthy();
  });

  test("shows an onboarding empty state when no webhook endpoints exist", () => {
    render(
      <ApiKeyManagementSurface
        overview={createOverview()}
        persistence={createPersistence()}
        userRole="admin"
        webhookEndpointOverview={{
          rows: [],
          summary: {
            activeCount: 0,
            inactiveCount: 0,
            totalCount: 0,
          },
        }}
      />,
    );

    expect(screen.getByText("Gösterilen 0 / 0 webhook endpoint")).toBeTruthy();
    expect(screen.getByText("Henüz webhook endpoint kaydı yok.")).toBeTruthy();
    expect(
      screen.getByText(
        /İlk endpointi oluşturmak için aşağıdaki formu kullanın; kayıt eklendiğinde bu listede görünür/,
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).getByText(
        "Webhook endpoint kaydı bulunamadı.",
      ),
    ).toBeTruthy();
  });

  test("edits a webhook endpoint and keeps the secret hidden", async () => {
    const updateWebhookEndpoint = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        row: {
          ...webhookEndpointOverview.rows[0],
          name: "Fatura Bildirimi Güncel",
          updatedAt: "2026-07-12T12:00:00.000Z",
          url: "https://hooks.example.com/webhooks/guncel",
        },
      },
    });

    render(
      <ApiKeyManagementSurface
        overview={createOverview()}
        persistence={{
          createKey: vi.fn(),
          createWebhookEndpoint: vi.fn(),
          deactivateWebhookEndpoint: vi.fn(),
          rotateWebhookEndpointSecret: vi.fn(),
          updateWebhookEndpoint,
          revokeKey: vi.fn(),
        }}
        userRole="admin"
        webhookEndpointOverview={webhookEndpointOverview}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Düzenle" }));

    const form = screen.getByRole("form", { name: "Webhook endpoint düzenleme formu" });
    fireEvent.change(within(form).getByLabelText("Endpoint Adı"), {
      target: { value: "Fatura Bildirimi Güncel" },
    });
    fireEvent.change(within(form).getByLabelText("Endpoint URL"), {
      target: { value: "https://hooks.example.com/webhooks/guncel" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Webhook Endpoint Güncelle" }));

    await waitFor(() =>
      expect(updateWebhookEndpoint).toHaveBeenCalledWith("webhook-endpoint-1", {
        eventTypes: ["invoice.created", "bank.transaction.matched"],
        name: "Fatura Bildirimi Güncel",
        url: "https://hooks.example.com/webhooks/guncel",
      }),
    );
    expect(screen.getByText("Webhook endpoint güncellendi.")).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "Webhook endpoint kayıtları" })).getByText(
        "Fatura Bildirimi Güncel",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("noa_whsec_secret_value")).toBeNull();
  });

  test("requires explicit confirmation before revoking an active key", async () => {
    const revokeKey = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        row: {
          ...activeRow,
          revokedAt: "2026-07-11T11:00:00.000Z",
          revokedBy: "user-admin",
          status: "revoked",
        },
      },
    });
    render(
      <ApiKeyManagementSurface
        overview={createOverview()}
        persistence={{
          createKey: vi.fn(),
          createWebhookEndpoint: vi.fn(),
          deactivateWebhookEndpoint: vi.fn(),
          rotateWebhookEndpointSecret: vi.fn(),
          updateWebhookEndpoint: vi.fn(),
          revokeKey,
        }}
        userRole="admin"
        webhookEndpointOverview={webhookEndpointOverview}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "İptal Et" }));
    expect(revokeKey).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "API anahtarını iptal et" });
    fireEvent.click(within(dialog).getByRole("button", { name: "İptal Et" }));

    await waitFor(() => expect(revokeKey).toHaveBeenCalledWith("api-key-1"));
    expect(screen.getByRole("table", { name: "P2 API Anahtarları" }).textContent).toContain("İptal");
  });

  test("keeps mutations closed for non-admin roles", () => {
    render(
      <ApiKeyManagementSurface
        overview={createOverview()}
        persistence={{
          createKey: vi.fn(),
          createWebhookEndpoint: vi.fn(),
          deactivateWebhookEndpoint: vi.fn(),
          rotateWebhookEndpointSecret: vi.fn(),
          updateWebhookEndpoint: vi.fn(),
          revokeKey: vi.fn(),
        }}
        userRole="accounting"
        webhookEndpointOverview={webhookEndpointOverview}
      />,
    );

    expect(
      screen.getByText("API anahtarı oluşturma ve iptal etme işlemleri yalnız admin rolündedir."),
    ).toBeTruthy();
    expect((screen.getByRole("button", { name: "API Anahtarı Oluştur" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "İptal Et" })).toBeNull();
  });
});
