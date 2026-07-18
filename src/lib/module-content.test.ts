import { describe, expect, test } from "vitest";

import { getModuleContent } from "./module-content";

describe("module content", () => {
  test("keeps the NOA gider workflow visible as a P0 module shell", () => {
    const content = getModuleContent("giderler");

    expect(content).toBeDefined();
    expect(content?.title).toBe("Giderler");
    expect(content?.summary.toLocaleLowerCase("tr-TR")).toContain("şantiye/proje gider hareketleri");
    expect(content?.templateSources).toEqual([
      "gider_ve_masraf_yönetimi.html",
      "yeni_gider_kaydı_ekle.html",
      "gider_analiz_ve_raporlar.html",
    ]);
    expect(content?.primaryActions).toEqual([
      "Yeni Gider",
      "Ödeme Aracı",
      "Gider Raporu",
    ]);
  });

  test("keeps the P1 customer current account workflow visible as a planned module", () => {
    const content = getModuleContent("musteriler");

    expect(content).toBeDefined();
    expect(content?.title).toBe("Müşteri Cari Kartları");
    expect(content?.summary.toLocaleLowerCase("tr-TR")).toContain("satış faturası");
    expect(content?.templateSources).toEqual([
      "müşteri_cari_kartı.html",
      "cari_hesap_ekstresi.html",
    ]);
    expect(content?.primaryActions).toEqual([
      "Yeni Müşteri",
      "Satış Faturası",
      "Ekstre",
    ]);
  });

  test("keeps the P1 document center workflow visible as a planned module", () => {
    const content = getModuleContent("dokuman-merkezi");

    expect(content).toBeDefined();
    expect(content?.title).toBe("Döküman / Evrak Merkezi");
    expect(content?.summary.toLocaleLowerCase("tr-TR")).toContain(
      "sistem klasörleri",
    );
    expect(content?.templateSources).toEqual([
      "Döküman Yönetimi-01.png",
      "Döküman Yönetimi-02.png",
      "Döküman Yönetimi-06.png",
    ]);
    expect(content?.primaryActions).toEqual([
      "Yeni Klasör",
      "Dosya Yükle",
      "Liste",
      "Izgara",
    ]);
  });

  test("keeps the P2 subscription package workflow visible as a planned module", () => {
    const content = getModuleContent("abonelik");

    expect(content).toBeDefined();
    expect(content?.title).toBe("Abonelik ve Paket Yönetimi");
    expect(content?.summary.toLocaleLowerCase("tr-TR")).toContain(
      "mevcut paket özeti",
    );
    expect(content?.templateSources).toEqual([
      "Parsek-Mevcut Paketiniz-01.png",
      "Parsek-Mevcut Paketiniz-05.png",
      "Parsek-Destek Merkezi-01.png",
      "Parsek-Davet Et & Kazan.png",
    ]);
    expect(content?.primaryActions).toEqual([
      "Paketleri İncele",
      "Yenileme Sepeti",
      "Ek Özellik",
      "Ödeme Geçmişi",
    ]);
  });

  test("keeps the P2 vehicle fleet workflow visible as a planned module", () => {
    const content = getModuleContent("araclar");

    expect(content).toBeDefined();
    expect(content?.title).toBe("Araç / Filo Yönetimi");
    expect(content?.summary.toLocaleLowerCase("tr-TR")).toContain(
      "gps konumu",
    );
    expect(content?.templateSources).toEqual([
      "Araçlar P2 plan",
      "Ayarlar-Arvento Filo Takip-01.png",
      "Ayarlar-Arvento Filo Takip-02.png",
    ]);
    expect(content?.primaryActions).toEqual([
      "Araç Kartı",
      "GPS Durumu",
      "Bakım Takvimi",
    ]);
  });

  test("keeps the P2 API key workflow visible as a planned module", () => {
    const content = getModuleContent("api-yonetimi");

    expect(content).toBeDefined();
    expect(content?.title).toBe("API Yönetimi");
    expect(content?.summary).toContain("API anahtarları");
    expect(content?.primaryActions).toEqual([
      "Yeni Anahtar",
      "Kapsam Seç",
      "Anahtarı İptal Et",
    ]);
  });

  test("keeps the P2 e-fatura workflow visible as a planned module", () => {
    const content = getModuleContent("e-fatura-yonetimi");

    expect(content).toBeDefined();
    expect(content?.title).toBe("E-Fatura Yönetimi");
    expect(content?.summary.toLocaleLowerCase("tr-TR")).toContain(
      "e-fatura / e-arşiv",
    );
    expect(content?.templateSources).toEqual([
      "e_fatura_yönetimi.html",
      "e_fatura_entegrasyon_ve_ayarlar.html",
      "E-Fatura Yönetimi.png",
    ]);
    expect(content?.primaryActions).toEqual([
      "Durum",
      "Entegrasyon",
      "Gönderim",
    ]);
  });
});
