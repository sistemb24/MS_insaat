import { describe, expect, it } from "vitest";

import {
  appContext,
  counterpartyStatementRouteSlugs,
  navigationItems,
  plannedRouteSlugs,
} from "./navigation";

describe("NOA navigation foundation", () => {
  it("exposes tenant, company, period, and user context for the shell", () => {
    expect(appContext).toEqual({
      tenantId: "tenant-noa-demo",
      tenantName: "NOA Demo Tenant",
      companyId: "company-demo-insaat",
      companyName: "DEMO İNŞAAT",
      periodId: "period-2026",
      periodLabel: "2026",
      userId: "user-main",
      userName: "Ana Kullanıcı",
      userRole: "accounting",
      licenseLabel: "Pilot P0",
    });
  });

  it("keeps every planned module route visible in the sidebar", () => {
    expect(navigationItems.map((item) => item.href)).toEqual([
      "/",
      "/santiyeler",
      "/tedarikciler",
      "/musteriler",
      "/ihale-yonetimi",
      "/dokuman-merkezi",
      "/bildirimler",
      "/abonelik",
      "/araclar",
      "/api-yonetimi",
      "/e-fatura-yonetimi",
      "/taseronlar",
      "/personel",
      "/kasa-banka",
      "/giderler",
      "/stok-depo",
      "/faturalar",
      "/hakedis",
      "/cek",
      "/puantaj",
      "/raporlar",
      "/ayarlar",
    ]);
  });

  it("declares which card routes load the shared counterparty statement panel", () => {
    expect(counterpartyStatementRouteSlugs).toEqual([
      "tedarikciler",
      "musteriler",
      "taseronlar",
    ]);
  });
  it("uses stable slugs for route smoke checks", () => {
    expect(plannedRouteSlugs).toEqual([
      "santiyeler",
      "tedarikciler",
      "musteriler",
      "ihale-yonetimi",
      "dokuman-merkezi",
      "bildirimler",
      "abonelik",
      "araclar",
      "api-yonetimi",
      "e-fatura-yonetimi",
      "taseronlar",
      "personel",
      "kasa-banka",
      "giderler",
      "stok-depo",
      "faturalar",
      "hakedis",
      "cek",
      "puantaj",
      "raporlar",
      "ayarlar",
    ]);
  });
});




