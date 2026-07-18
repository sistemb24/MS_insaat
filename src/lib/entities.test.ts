import { describe, expect, it } from "vitest";

import {
  createEntityDraft,
  coreEntitySlugs,
  deactivateEntityRow,
  filterEntityRows,
  generateEntityCode,
  getEntityDefinition,
  getNextEntityCode,
  saveEntityDraft,
  standardEntityActions,
  validateEntityDraft,
} from "./entities";

describe("NOA definition entity foundation", () => {
  it("tracks the week 2 core definition modules in implementation order", () => {
    expect(coreEntitySlugs).toEqual([
      "santiyeler",
      "tedarikciler",
      "taseronlar",
      "personel",
      "kasa-banka",
      "stok-kartlari",
    ]);
  });

  it("generates NOA-style padded codes from each entity prefix", () => {
    expect(generateEntityCode("SANT", 1)).toBe("SANT-0001");
    expect(generateEntityCode("TED", 42)).toBe("TED-0042");
    expect(generateEntityCode("PER", 1007)).toBe("PER-1007");
  });

  it("uses the same list actions for all definition pages", () => {
    expect(standardEntityActions).toEqual([
      "İçe Aktar",
      "Yeni",
      "Düzenle",
      "Pasifleştir",
      "Yenile",
      "Şablon",
      "Excel",
      "Yazdır",
    ]);
  });

  it("defines required columns and source templates for every core entity", () => {
    for (const slug of coreEntitySlugs) {
      const definition = getEntityDefinition(slug);

      expect(definition).toBeDefined();
      expect(definition?.columns.map((column) => column.key)).toEqual(
        expect.arrayContaining(["code", "name", "status"]),
      );
      expect(definition?.templateSources.length).toBeGreaterThan(0);
      expect(definition?.sampleRows.length).toBeGreaterThan(0);
    }
  });

  it("defines the P1 customer current account card schema", () => {
    const customerDefinition = getEntityDefinition("musteriler");

    expect(customerDefinition).toBeDefined();
    expect(customerDefinition?.codePrefix).toBe("MUS");
    expect(customerDefinition?.title).toBe("Müşteri Cari Kartları");
    expect(customerDefinition?.columns.map((column) => column.key)).toEqual([
      "code",
      "name",
      "customerType",
      "taxNumber",
      "phone",
      "email",
      "balance",
      "status",
    ]);
    expect(customerDefinition?.templateSources).toEqual([
      "müşteri_cari_kartı.html",
      "cari_hesap_ekstresi.html",
    ]);
    expect(customerDefinition?.sampleRows[0]).toMatchObject({
      code: "MUS-0001",
      customerType: "Kurumsal",
      email: "info@bayraktargyo.com.tr",
      name: "BAYRAKTAR GAYRİMENKUL YATIRIM A.Ş.",
      status: "Aktif",
    });
  });

  it("keeps P0 supplier category and subcontractor contract fields in the card schema", () => {
    const supplierDefinition = getEntityDefinition("tedarikciler");
    const subcontractorDefinition = getEntityDefinition("taseronlar");

    expect(supplierDefinition?.columns.map((column) => column.key)).toEqual(
      expect.arrayContaining(["category"]),
    );
    expect(supplierDefinition?.sampleRows[0]).toMatchObject({
      category: "Malzeme",
    });

    expect(subcontractorDefinition?.columns.map((column) => column.key)).toEqual(
      expect.arrayContaining([
        "contractNo",
        "contractStartDate",
        "contractEndDate",
      ]),
    );
    expect(subcontractorDefinition?.sampleRows[0]).toMatchObject({
      contractNo: "SZL-2026-001",
      contractStartDate: "2026-01-01",
      contractEndDate: "2026-12-31",
    });
  });

  it("defines stock cards with unit warehouse and minimum quantity fields", () => {
    const stockDefinition = getEntityDefinition("stok-kartlari");

    expect(stockDefinition).toBeDefined();
    expect(stockDefinition?.codePrefix).toBe("STK");
    expect(stockDefinition?.title).toBe("Stok Kartları");
    expect(stockDefinition?.columns.map((column) => column.key)).toEqual([
      "code",
      "name",
      "group",
      "manufacturer",
      "unit",
      "defaultWarehouse",
      "minimumQuantity",
      "status",
    ]);
    expect(stockDefinition?.templateSources).toEqual([
      "stok_listesi.html",
      "depo_tanımları.html",
      "nite_stok_ve_sat_durumu.html",
    ]);
    expect(stockDefinition?.sampleRows[0]).toMatchObject({
      code: "STK-0001",
      defaultWarehouse: "Merkez Depo",
      minimumQuantity: "120",
      name: "Çimento Torba",
      status: "Aktif",
      unit: "Adet",
    });
  });

  it("creates a new draft with the next padded code and active status", () => {
    const definition = getEntityDefinition("santiyeler");

    expect(definition).toBeDefined();
    expect(getNextEntityCode(definition!, definition!.sampleRows)).toBe(
      "SANT-0006",
    );
    expect(createEntityDraft(definition!, definition!.sampleRows)).toMatchObject(
      {
        mode: "create",
        values: {
          code: "SANT-0006",
          name: "",
          status: "Aktif",
        },
      },
    );
  });

  it("validates required code, unique code and required name before save", () => {
    const definition = getEntityDefinition("tedarikciler");

    expect(definition).toBeDefined();
    expect(
      validateEntityDraft(definition!, definition!.sampleRows, {
        mode: "create",
        values: { code: "", name: "", status: "Aktif" },
      }),
    ).toEqual(["Kod zorunludur.", "Tanım zorunludur."]);

    expect(
      validateEntityDraft(definition!, definition!.sampleRows, {
        mode: "create",
        values: { code: "TED-0001", name: "Yeni Tedarikçi", status: "Aktif" },
      }),
    ).toEqual(["Kod zaten kullanılıyor."]);
  });

  it("saves create and edit drafts without mutating the original row list", () => {
    const definition = getEntityDefinition("personel");

    expect(definition).toBeDefined();

    const createdRows = saveEntityDraft(definition!, definition!.sampleRows, {
      mode: "create",
      values: {
        code: "PER-0006",
        name: "Yeni Personel",
        role: "FORMEN",
        site: "ÖRNEK PROJE",
        salary: "45.000,00 TL",
        status: "Aktif",
      },
    });

    expect(definition!.sampleRows).toHaveLength(5);
    expect(createdRows).toHaveLength(6);
    expect(createdRows.at(-1)).toMatchObject({ code: "PER-0006" });

    const editedRows = saveEntityDraft(definition!, createdRows, {
      mode: "edit",
      originalCode: "PER-0006",
      values: {
        code: "PER-0006",
        name: "Güncel Personel",
        role: "ŞEF",
        site: "ÖRNEK PROJE",
        salary: "50.000,00 TL",
        status: "Aktif",
      },
    });

    expect(editedRows).toHaveLength(6);
    expect(editedRows.find((row) => row.code === "PER-0006")?.name).toBe(
      "Güncel Personel",
    );
    expect(createdRows.find((row) => row.code === "PER-0006")?.name).toBe(
      "Yeni Personel",
    );
  });

  it("deactivates selected rows and filters by visible field values", () => {
    const definition = getEntityDefinition("kasa-banka");

    expect(definition).toBeDefined();

    const inactiveRows = deactivateEntityRow(
      definition!.sampleRows,
      "KASA-0001",
    );

    expect(inactiveRows.find((row) => row.code === "KASA-0001")?.status).toBe(
      "Pasif",
    );
    expect(definition!.sampleRows.find((row) => row.code === "KASA-0001")?.status)
      .toBe("Aktif");

    expect(filterEntityRows(definition!, inactiveRows, "banka")).toEqual([
      expect.objectContaining({ code: "KASA-0002" }),
      expect.objectContaining({ code: "KASA-0003" }),
      expect.objectContaining({ code: "KASA-0005" }),
    ]);
    expect(filterEntityRows(definition!, inactiveRows, "")).toHaveLength(5);
  });
});


