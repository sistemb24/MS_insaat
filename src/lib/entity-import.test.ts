import { describe, expect, test } from "vitest";

import { getEntityDefinition, type EntityRow } from "./entities";
import { previewEntityImportCsv } from "./entity-import";

describe("entity import preview", () => {
  test("validates semicolon csv rows before importing customer cards", () => {
    const definition = getEntityDefinition("musteriler");
    const existingRows: EntityRow[] = [
      {
        balance: "0,00 TL",
        code: "MUS-0001",
        customerType: "Kurumsal",
        email: "mevcut@example.com",
        name: "MEVCUT MÜŞTERİ",
        phone: "0 242 111 11 11",
        status: "Aktif",
        taxNumber: "1111111111",
      },
    ];

    expect(definition).toBeDefined();

    const preview = previewEntityImportCsv(
      definition!,
      existingRows,
      [
        "Kodu;Tanımı;Müşteri Tipi;Vergi No;Telefon;E-posta;Bakiye;Durum",
        "MUS-0002;Yeni Müşteri;Kurumsal;3333333333;0 242 333 33 33;new@example.com;0,00 TL;Aktif",
        "MUS-0003;;Bireysel;;;;;Aktif",
        "MUS-0002;Tekrar Kod;;;;;;Aktif",
        "MUS-0001;Mevcut Kod;;;;;;Aktif",
      ].join("\r\n"),
    );

    expect(preview.summary).toEqual({
      invalidRows: 3,
      totalRows: 4,
      validRows: 1,
    });
    expect(preview.fileErrors).toEqual([]);
    expect(preview.validRows).toEqual([
      {
        balance: "0,00 TL",
        code: "MUS-0002",
        customerType: "Kurumsal",
        email: "new@example.com",
        name: "Yeni Müşteri",
        phone: "0 242 333 33 33",
        status: "Aktif",
        taxNumber: "3333333333",
      },
    ]);
    expect(preview.rows[1].errors).toContain("Tanım zorunludur.");
    expect(preview.rows[2].errors).toContain("Kod dosya içinde tekrar ediyor.");
    expect(preview.rows[3].errors).toContain("Kod zaten kullanılıyor.");
  });

  test("reports template header mismatches before row validation", () => {
    const definition = getEntityDefinition("tedarikciler");

    expect(definition).toBeDefined();

    const preview = previewEntityImportCsv(
      definition!,
      [],
      [
        "Kodu;Tanımı;Vergi No;Telefon;Durum",
        "TED-0001;ABC Beton;1111111111;0 242 000 00 00;Aktif",
      ].join("\r\n"),
    );

    expect(preview.fileErrors).toEqual([
      "Şablon kolonları tanım ile eşleşmiyor.",
    ]);
    expect(preview.summary).toEqual({
      invalidRows: 0,
      totalRows: 0,
      validRows: 0,
    });
  });

  test("parses quoted semicolon values in import csv cells", () => {
    const definition = getEntityDefinition("tedarikciler");

    expect(definition).toBeDefined();

    const preview = previewEntityImportCsv(
      definition!,
      [],
      [
        "Kodu;Tanımı;Vergi No;Telefon;Kategori;Bakiye;Durum",
        'TED-0002;"ABC Beton; Antalya";1111111111;0 242 000 00 00;Malzeme;0,00 TL;Aktif',
      ].join("\r\n"),
    );

    expect(preview.validRows[0]?.name).toBe("ABC Beton; Antalya");
    expect(preview.summary).toEqual({
      invalidRows: 0,
      totalRows: 1,
      validRows: 1,
    });
  });

  test("rejects a supplier category that is not active in the shared dictionary", () => {
    const definition = getEntityDefinition("tedarikciler");
    expect(definition).toBeDefined();

    const preview = previewEntityImportCsv(
      definition!,
      [],
      [
        "Kodu;Tanımı;Vergi No;Telefon;Kategori;Bakiye;Durum",
        "TED-0003;ABC Beton;1111111111;0 242 000 00 00;Hizmet;0,00 TL;Aktif",
        "TED-0004;XYZ Yapı;2222222222;0 242 111 11 11;Malzeme;0,00 TL;Aktif",
      ].join("\r\n"),
      {
        supplierCategories: [
          {
            canManage: true,
            description: "",
            id: "category-material",
            name: "Malzeme",
            normalizedName: "malzeme",
            revisionNo: 1,
            source: "managed",
            status: "ACTIVE",
            updatedAt: "2026-07-31T00:00:00.000Z",
            updatedBy: "admin",
            usageCount: 1,
          },
          {
            canManage: true,
            description: "",
            id: "category-service",
            name: "Hizmet",
            normalizedName: "hizmet",
            revisionNo: 2,
            source: "managed",
            status: "INACTIVE",
            updatedAt: "2026-07-31T00:00:00.000Z",
            updatedBy: "admin",
            usageCount: 2,
          },
        ],
      },
    );

    expect(preview.summary).toEqual({
      invalidRows: 1,
      totalRows: 2,
      validRows: 1,
    });
    expect(preview.rows[0]?.errors).toContain(
      "Tedarikçi kategorisi aktif sözlükte bulunamadı: Hizmet",
    );
    expect(preview.validRows[0]?.category).toBe("Malzeme");
  });

  test("rejects a customer type that is not active in the shared dictionary", () => {
    const definition = getEntityDefinition("musteriler");
    expect(definition).toBeDefined();

    const preview = previewEntityImportCsv(
      definition!,
      [],
      [
        "Kodu;Tanımı;Müşteri Tipi;Vergi No;Telefon;E-posta;Bakiye;Durum",
        "MUS-0005;Kamu Müşterisi;Kamu;5555555555;0 242 555 55 55;kamu@example.com;0,00 TL;Aktif",
        "MUS-0006;Kurumsal Müşteri;Kurumsal;6666666666;0 242 666 66 66;kurumsal@example.com;0,00 TL;Aktif",
      ].join("\r\n"),
      {
        customerTypes: [
          {
            canManage: true,
            description: "",
            id: "customer-type-corporate",
            name: "Kurumsal",
            normalizedName: "kurumsal",
            revisionNo: 1,
            source: "managed",
            status: "ACTIVE",
            updatedAt: "2026-07-31T00:00:00.000Z",
            updatedBy: "admin",
            usageCount: 0,
          },
          {
            canManage: true,
            description: "",
            id: "customer-type-public",
            name: "Kamu",
            normalizedName: "kamu",
            revisionNo: 1,
            source: "managed",
            status: "INACTIVE",
            updatedAt: "2026-07-31T00:00:00.000Z",
            updatedBy: "admin",
            usageCount: 1,
          },
        ],
      },
    );

    expect(preview.summary).toEqual({
      invalidRows: 1,
      totalRows: 2,
      validRows: 1,
    });
    expect(preview.rows[0]?.errors).toContain(
      "Müşteri tipi aktif sözlükte bulunamadı: Kamu",
    );
    expect(preview.validRows[0]?.customerType).toBe("Kurumsal");
  });
});
