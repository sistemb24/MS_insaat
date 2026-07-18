import { describe, expect, test } from "vitest";

import { planWebhookDeliveries } from "./webhook-delivery-planner";
import type { WebhookEndpointRow } from "./webhook-endpoint-service";

const endpoints: WebhookEndpointRow[] = [
  {
    companyId: "company-1",
    createdAt: "2026-07-12T10:00:00.000Z",
    createdBy: "user-1",
    eventTypes: ["invoice.created", "bank.transaction.matched"],
    id: "endpoint-1",
    isActive: true,
    name: "Fatura",
    periodId: "period-1",
    secretPrefix: "whsec_one",
    tenantId: "tenant-1",
    updatedAt: "2026-07-12T10:00:00.000Z",
    url: "https://hooks.example.com/fatura",
  },
  {
    companyId: "company-1",
    createdAt: "2026-07-12T11:00:00.000Z",
    createdBy: "user-1",
    eventTypes: ["invoice.created"],
    id: "endpoint-2",
    isActive: false,
    name: "Pasif",
    periodId: "period-1",
    secretPrefix: "whsec_two",
    tenantId: "tenant-1",
    updatedAt: "2026-07-12T11:00:00.000Z",
    url: "https://hooks.example.com/pasif",
  },
  {
    companyId: "company-1",
    createdAt: "2026-07-12T12:00:00.000Z",
    createdBy: "user-1",
    eventTypes: ["invoice.created"],
    id: "endpoint-3",
    isActive: true,
    name: "Son",
    periodId: "period-1",
    secretPrefix: "whsec_three",
    tenantId: "tenant-1",
    updatedAt: "2026-07-12T12:00:00.000Z",
    url: "https://hooks.example.com/son",
  },
];

describe("webhook delivery planner", () => {
  test("selects only active matching endpoints in newest-first order", () => {
    expect(
      planWebhookDeliveries({
        endpoints,
        eventType: "invoice.created",
      }),
    ).toEqual({
      deliverable: true,
      eventType: "invoice.created",
      matchingEndpointCount: 2,
      targets: [
        {
          createdAt: "2026-07-12T12:00:00.000Z",
          endpointId: "endpoint-3",
          endpointName: "Son",
          endpointUrl: "https://hooks.example.com/son",
          eventTypes: ["invoice.created"],
          secretPrefix: "whsec_three",
        },
        {
          createdAt: "2026-07-12T10:00:00.000Z",
          endpointId: "endpoint-1",
          endpointName: "Fatura",
          endpointUrl: "https://hooks.example.com/fatura",
          eventTypes: ["invoice.created", "bank.transaction.matched"],
          secretPrefix: "whsec_one",
        },
      ],
      unroutableReason: null,
    });
  });

  test("returns a readable reason when nothing can be delivered", () => {
    expect(
      planWebhookDeliveries({
        endpoints,
        eventType: "invoice.status.changed",
      }),
    ).toEqual({
      deliverable: false,
      eventType: "invoice.status.changed",
      matchingEndpointCount: 0,
      targets: [],
      unroutableReason: "Bu event türü için etkin webhook endpoint bulunamadı.",
    });
  });
});
