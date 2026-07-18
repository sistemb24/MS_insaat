import type { EFaturaProviderPlan } from "./e-fatura-service";

export type EFaturaProviderAdapter = {
  getPlan(): EFaturaProviderPlan;
};

export function createPlannedEFaturaProviderAdapter(): EFaturaProviderAdapter {
  return {
    getPlan() {
      return {
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
      };
    },
  };
}
