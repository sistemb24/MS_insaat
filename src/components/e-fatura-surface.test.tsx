/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import type { AuditLogEntry } from "@/lib/audit-log";
import {
  getDefaultEFaturaOverview,
  getDefaultEFaturaProviderPlan,
  getDefaultEFaturaWebhookPlan,
} from "@/lib/e-fatura-service";

import { EFaturaSurface } from "./e-fatura-surface";

afterEach(() => {
  cleanup();
});

describe("e-fatura surface", () => {
  test("shows a planned e-fatura status card alongside the module shell", () => {
    render(
      <EFaturaSurface
        overview={getDefaultEFaturaOverview()}
        providerPlan={getDefaultEFaturaProviderPlan()}
        webhookPlan={getDefaultEFaturaWebhookPlan()}
        content={{
          eyebrow: "P2 e-Fatura API başlangıcı",
          metrics: [
            {
              detail: "e-invoice scope ve durum endpoint'i",
              label: "API",
              status: "process",
              value: "Başladı",
            },
            {
              detail: "Sağlayıcı bağlantısı sonraki dilimde",
              label: "GİB",
              status: "draft",
              value: "Planlı",
            },
            {
              detail: "Durum görünümü ve kapsam kontrolü",
              label: "İşlem",
              status: "approved",
              value: "Hazır",
            },
          ],
          primaryActions: ["Durum", "Entegrasyon", "Gönderim"],
          summary: "E-Fatura / e-Arşiv için durum görünümü",
          templateSources: [
            "e_fatura_yönetimi.html",
            "e_fatura_entegrasyon_ve_ayarlar.html",
            "E-Fatura Yönetimi.png",
          ],
          title: "E-Fatura Yönetimi",
        }}
      />,
    );

    expect(screen.getByText("E-Fatura Yönetimi")).toBeTruthy();
    expect(screen.getByText("E-Fatura başlangıç durumu")).toBeTruthy();
    expect(screen.getByText("/api/e-fatura/durum")).toBeTruthy();
    expect(screen.getByText("Planlı yüzey")).toBeTruthy();

    const infoList = screen.getByText("Planlı yüzey").closest("section");
    expect(infoList).not.toBeNull();
    expect(within(infoList as HTMLElement).getByText("e-invoice")).toBeTruthy();
    expect(within(infoList as HTMLElement).getByText("GİB")).toBeTruthy();
    expect(screen.getByText("Sağlayıcı bağlantı planı")).toBeTruthy();
    expect(screen.getByText("HTTPS/JSON")).toBeTruthy();
    expect(screen.getByText("Fatura gönderimi · gönderim")).toBeTruthy();
    expect(screen.getByText("Durum sorgulama · sorgulama")).toBeTruthy();
    expect(screen.getByText("İptal bildirimi · iptal")).toBeTruthy();
    expect(screen.getByText("Webhook hazırlığı")).toBeTruthy();
    expect(screen.getByText("/api/e-fatura/webhook")).toBeTruthy();
    expect(screen.getByText("NOA_EFATURA_WEBHOOK_SECRET")).toBeTruthy();
    expect(screen.getByText("Fatura gönderimi — e-fatura.invoice.sent")).toBeTruthy();
    expect(
      screen.getByText("Durum güncellemesi — e-fatura.invoice.status.changed"),
    ).toBeTruthy();
    expect(screen.getByText("Son webhook olayları")).toBeTruthy();
    expect(
      screen.getByText("Henüz kabul edilmiş webhook olayı bulunamadı."),
    ).toBeTruthy();
  });

  test("shows the empty webhook audit state without a selected detail panel", () => {
    render(
      <EFaturaSurface
        content={{
          eyebrow: "P2 e-Fatura API başlangıcı",
          metrics: [],
          primaryActions: [],
          summary: "E-Fatura / e-Arşiv için durum görünümü",
          templateSources: [],
          title: "E-Fatura Yönetimi",
        }}
        overview={getDefaultEFaturaOverview()}
        providerPlan={getDefaultEFaturaProviderPlan()}
        webhookAuditEntries={[]}
        webhookPlan={getDefaultEFaturaWebhookPlan()}
      />,
    );

    expect(screen.getByText("Henüz kabul edilmiş webhook olayı bulunamadı.")).toBeTruthy();
    expect(screen.getByText("Son 0 / 0 olay")).toBeTruthy();
    expect(screen.queryByText("Seçili olay detayı")).toBeNull();
  });

  test("shows accepted webhook audit entries with provider context", () => {
    const auditEntry: AuditLogEntry = {
      action: "e-fatura.webhook.accepted",
      actorUserId: "system-webhook",
      companyId: "company-demo-insaat",
      createdAt: "2026-07-11T08:45:00.000Z",
      entityId: "event-001",
      entityLabel: "EFA-2026-0001",
      entityType: "e-fatura-webhook",
      id: "audit-001",
      metadata: {
        providerRef: "gib-ref-001",
        providerStatus: "delivered",
        type: "e-fatura.invoice.sent",
      },
      occurredAt: "2026-07-11T08:45:00.000Z",
      periodId: "period-2026",
      tenantId: "tenant-noa-demo",
    };

    render(
      <EFaturaSurface
        content={{
          eyebrow: "P2 e-Fatura API başlangıcı",
          metrics: [],
          primaryActions: [],
          summary: "E-Fatura / e-Arşiv için durum görünümü",
          templateSources: [],
          title: "E-Fatura Yönetimi",
        }}
        overview={getDefaultEFaturaOverview()}
        providerPlan={getDefaultEFaturaProviderPlan()}
        webhookAuditEntries={[auditEntry]}
        webhookPlan={getDefaultEFaturaWebhookPlan()}
      />,
    );

    const auditTable = screen.getByRole("table", {
      name: "E-Fatura webhook olayları",
    });

    expect(within(auditTable).getByText("EFA-2026-0001")).toBeTruthy();
    expect(within(auditTable).getByText("event-001")).toBeTruthy();
    expect(within(auditTable).getByText("Fatura gönderildi")).toBeTruthy();
    expect(within(auditTable).getByText("İletildi")).toBeTruthy();
    expect(within(auditTable).getByText("Tekrar deneme gerekmez")).toBeTruthy();
    expect(within(auditTable).getByText("gib-ref-001")).toBeTruthy();
    expect(screen.getByText("Seçili olay detayı")).toBeTruthy();
    expect(screen.getByText("Seçili kayıt 1 / 1")).toBeTruthy();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "EFA-2026-0001 · Fatura gönderildi · event-001",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Kullanıcı")).toBeTruthy();
    expect(screen.getAllByText("Tekrar deneme").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Tekrar deneme gerekmez").length).toBeGreaterThanOrEqual(2);
  });

  test("shows unknown provider status codes without hiding retry context", () => {
    const auditEntry: AuditLogEntry = {
      action: "e-fatura.webhook.accepted",
      actorUserId: "system-webhook",
      companyId: "company-demo-insaat",
      createdAt: "2026-07-11T10:15:00.000Z",
      entityId: "event-004",
      entityLabel: "EFA-2026-0004",
      entityType: "e-fatura-webhook",
      id: "audit-004",
      metadata: {
        providerRef: "gib-ref-004",
        providerStatus: "processing",
        type: "e-fatura.invoice.sent",
      },
      occurredAt: "2026-07-11T10:15:00.000Z",
      periodId: "period-2026",
      tenantId: "tenant-noa-demo",
    };

    render(
      <EFaturaSurface
        content={{
          eyebrow: "P2 e-Fatura API başlangıcı",
          metrics: [],
          primaryActions: [],
          summary: "E-Fatura / e-Arşiv için durum görünümü",
          templateSources: [],
          title: "E-Fatura Yönetimi",
        }}
        overview={getDefaultEFaturaOverview()}
        providerPlan={getDefaultEFaturaProviderPlan()}
        webhookAuditEntries={[auditEntry]}
        webhookPlan={getDefaultEFaturaWebhookPlan()}
      />,
    );

    const auditTable = screen.getByRole("table", {
      name: "E-Fatura webhook olayları",
    });

    expect(within(auditTable).getAllByText("processing").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Seçili kayıt 1 / 1")).toBeTruthy();
    expect(screen.getAllByText("processing").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Tekrar deneme gerekebilir")).toBeNull();
    expect(screen.queryByText("Tekrar deneme gerekmez")).toBeNull();
  });

  test("filters webhook audit entries on the client without reloading the surface", () => {
    const firstEntry: AuditLogEntry = {
      action: "e-fatura.webhook.accepted",
      actorUserId: "system-webhook",
      companyId: "company-demo-insaat",
      createdAt: "2026-07-11T08:45:00.000Z",
      entityId: "event-001",
      entityLabel: "EFA-2026-0001",
      entityType: "e-fatura-webhook",
      id: "audit-001",
      metadata: {
        providerRef: "gib-ref-001",
        providerStatus: "delivered",
        type: "e-fatura.invoice.sent",
      },
      occurredAt: "2026-07-11T08:45:00.000Z",
      periodId: "period-2026",
      tenantId: "tenant-noa-demo",
    };
    const secondEntry: AuditLogEntry = {
      action: "e-fatura.webhook.accepted",
      actorUserId: "system-webhook",
      companyId: "company-demo-insaat",
      createdAt: "2026-07-12T09:15:00.000Z",
      entityId: "event-002",
      entityLabel: "EFA-2026-0002",
      entityType: "e-fatura-webhook",
      id: "audit-002",
      metadata: {
        providerRef: "gib-ref-002",
        providerStatus: "approved",
        type: "e-fatura.invoice.status.changed",
      },
      occurredAt: "2026-07-12T09:15:00.000Z",
      periodId: "period-2026",
      tenantId: "tenant-noa-demo",
    };
    const thirdEntry: AuditLogEntry = {
      action: "e-fatura.webhook.accepted",
      actorUserId: "system-webhook",
      companyId: "company-demo-insaat",
      createdAt: "2026-07-12T10:00:00.000Z",
      entityId: "event-003",
      entityLabel: "EFA-2026-0003",
      entityType: "e-fatura-webhook",
      id: "audit-003",
      metadata: {
        providerRef: "gib-ref-003",
        providerStatus: "failed",
        type: "e-fatura.invoice.sent",
      },
      occurredAt: "2026-07-12T10:00:00.000Z",
      periodId: "period-2026",
      tenantId: "tenant-noa-demo",
    };

    render(
      <EFaturaSurface
        content={{
          eyebrow: "P2 e-Fatura API başlangıcı",
          metrics: [],
          primaryActions: [],
          summary: "E-Fatura / e-Arşiv için durum görünümü",
          templateSources: [],
          title: "E-Fatura Yönetimi",
        }}
        overview={getDefaultEFaturaOverview()}
        providerPlan={getDefaultEFaturaProviderPlan()}
        webhookAuditEntries={[firstEntry, secondEntry, thirdEntry]}
        webhookPlan={getDefaultEFaturaWebhookPlan()}
      />,
    );

    const searchInput = screen.getByLabelText("Webhook olaylarında ara");
    const eventTypeSelect = screen.getByLabelText("Webhook olay tipi filtresi");
    const providerStatusSelect = screen.getByLabelText(
      "Webhook sağlayıcı durumu filtresi",
    );
    const retryHintSelect = screen.getByLabelText("Webhook tekrar deneme filtresi");
    const startDateInput = screen.getByLabelText("Webhook başlangıç tarihi");
    const endDateInput = screen.getByLabelText("Webhook bitiş tarihi");
    const auditTable = screen.getByRole("table", {
      name: "E-Fatura webhook olayları",
    });

    const clearFiltersButton = screen.getByRole("button", {
      name: "Filtreleri temizle",
    });

    expect(clearFiltersButton.getAttribute("disabled")).not.toBeNull();
    expect(screen.queryByText(/Aktif filtreler:/)).toBeNull();
    expect(auditTable.getAttribute("aria-describedby")).toBeNull();
    expect(screen.getByText("Tekrar deneme gerekebilir: 1")).toBeTruthy();

    fireEvent.change(searchInput, { target: { value: "event-002" } });

    expect(clearFiltersButton.getAttribute("disabled")).toBeNull();
    expect(screen.getByText("Aktif filtreler: Arama: event-002")).toBeTruthy();
    expect(auditTable.getAttribute("aria-describedby")).toBe(
      "e-fatura-webhook-active-filters",
    );

    expect(screen.queryByText("EFA-2026-0001")).toBeNull();
    expect(screen.getByText("EFA-2026-0002")).toBeTruthy();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "EFA-2026-0002 · Fatura durumu güncellendi · event-002",
      ),
    ).toBeTruthy();

    fireEvent.change(searchInput, { target: { value: "" } });
    fireEvent.change(eventTypeSelect, {
      target: { value: "e-fatura.invoice.sent" },
    });
    fireEvent.change(retryHintSelect, { target: { value: "settled" } });

    expect(screen.getByText("EFA-2026-0001")).toBeTruthy();
    expect(screen.queryByText("EFA-2026-0002")).toBeNull();
    expect(screen.queryByText("Tekrar deneme gerekebilir: 1")).toBeNull();

    fireEvent.change(providerStatusSelect, { target: { value: "approved" } });
    expect(
      screen.getByText("Filtreye uyan webhook olayı bulunamadı."),
    ).toBeTruthy();

    fireEvent.change(startDateInput, { target: { value: "" } });
    fireEvent.change(endDateInput, { target: { value: "" } });
    fireEvent.change(eventTypeSelect, { target: { value: "all" } });
    fireEvent.change(providerStatusSelect, { target: { value: "all" } });
    fireEvent.change(retryHintSelect, { target: { value: "all" } });
    fireEvent.click(screen.getByText("EFA-2026-0002"));

    expect(
      screen
        .getByRole("button", {
          name: "Webhook kaydı EFA-2026-0002 Fatura durumu güncellendi event-002",
        })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "Açık" })).toBeTruthy();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "EFA-2026-0002 · Fatura durumu güncellendi · event-002",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Seçili kayıt 2 / 3")).toBeTruthy();
    expect(screen.getByText("Dönem")).toBeTruthy();

    fireEvent.change(providerStatusSelect, { target: { value: "all" } });
    fireEvent.change(eventTypeSelect, { target: { value: "all" } });
    fireEvent.change(retryHintSelect, { target: { value: "settled" } });
    fireEvent.change(startDateInput, { target: { value: "2026-07-12" } });
    fireEvent.change(endDateInput, { target: { value: "2026-07-12" } });

    expect(screen.queryByText("EFA-2026-0001")).toBeNull();
    expect(screen.getByText("EFA-2026-0002")).toBeTruthy();

    fireEvent.change(startDateInput, { target: { value: "2026-07-13" } });
    expect(screen.getByText("Başlangıç tarihi bitiş tarihinden sonra olamaz.")).toBeTruthy();
    expect(
      screen.getByText("Filtreye uyan webhook olayı bulunamadı."),
    ).toBeTruthy();

    fireEvent.click(clearFiltersButton);

    expect(screen.getByText("EFA-2026-0001")).toBeTruthy();
    expect(screen.getByText("EFA-2026-0002")).toBeTruthy();
    expect(screen.getByText("Tekrar deneme gerekebilir: 1")).toBeTruthy();
    expect(clearFiltersButton.getAttribute("disabled")).not.toBeNull();
    expect(screen.queryByText(/Aktif filtreler:/)).toBeNull();
    expect(auditTable.getAttribute("aria-describedby")).toBeNull();
  });
});
