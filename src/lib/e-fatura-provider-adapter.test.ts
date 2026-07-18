import { describe, expect, test } from "vitest";

import { createPlannedEFaturaProviderAdapter } from "./e-fatura-provider-adapter";

describe("e-fatura provider adapter", () => {
  test("exposes the planned GİB provider contract", () => {
    expect(createPlannedEFaturaProviderAdapter().getPlan()).toEqual({
      connectionStatus: "planned",
      connectionStatusLabel: "Planlı bağlantı",
      nextStep: "GİB sağlayıcı adaptörü sonraki P2-S4 diliminde bağlanacak.",
      providerLabel: "GİB",
      supportedOperations: [
        {
          label: "Fatura gönderimi",
          type: "gönderim",
        },
        {
          label: "Durum sorgulama",
          type: "sorgulama",
        },
        {
          label: "İptal bildirimi",
          type: "iptal",
        },
      ],
      transport: "HTTPS/JSON",
    });
  });
});
