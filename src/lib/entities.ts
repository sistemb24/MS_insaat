export type EntityColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

export type EntityRow = Record<string, string>;

export type EntityDraft = {
  mode: "create" | "edit";
  originalCode?: string;
  values: EntityRow;
};

export type EntityDefinition = {
  slug: string;
  title: string;
  description: string;
  codePrefix: string;
  templateSources: string[];
  columns: EntityColumn[];
  sampleRows: EntityRow[];
};

export const standardEntityActions = [
  "İçe Aktar",
  "Yeni",
  "Düzenle",
  "Pasifleştir",
  "Yenile",
  "Şablon",
  "Excel",
  "Yazdır",
] as const;

export const coreEntitySlugs = [
  "santiyeler",
  "tedarikciler",
  "taseronlar",
  "personel",
  "kasa-banka",
  "stok-kartlari",
] as const;

export function generateEntityCode(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

export function getNextEntityCode(
  definition: EntityDefinition,
  rows: EntityRow[],
) {
  const lastSequence = rows.reduce((maxSequence, row) => {
    const match = row.code?.match(new RegExp(`^${definition.codePrefix}-(\\d+)$`));

    if (!match) {
      return maxSequence;
    }

    return Math.max(maxSequence, Number(match[1]));
  }, 0);

  return generateEntityCode(definition.codePrefix, lastSequence + 1);
}

export function createEntityDraft(
  definition: EntityDefinition,
  rows: EntityRow[],
): EntityDraft {
  return {
    mode: "create",
    values: Object.fromEntries(
      definition.columns.map((column) => {
        if (column.key === "code") {
          return [column.key, getNextEntityCode(definition, rows)];
        }

        if (column.key === "status") {
          return [column.key, "Aktif"];
        }

        return [column.key, ""];
      }),
    ),
  };
}

export function createEditDraft(row: EntityRow): EntityDraft {
  return {
    mode: "edit",
    originalCode: row.code,
    values: { ...row },
  };
}

export function validateEntityDraft(
  _definition: EntityDefinition,
  rows: EntityRow[],
  draft: EntityDraft,
): string[] {
  const errors: string[] = [];
  const code = draft.values.code?.trim();
  const name = draft.values.name?.trim();

  if (!code) {
    errors.push("Kod zorunludur.");
  }

  if (!name) {
    errors.push("Tanım zorunludur.");
  }

  const codeBelongsToAnotherRow = rows.some(
    (row) => row.code === code && row.code !== draft.originalCode,
  );

  if (code && codeBelongsToAnotherRow) {
    errors.push("Kod zaten kullanılıyor.");
  }

  return errors;
}

export function saveEntityDraft(
  definition: EntityDefinition,
  rows: EntityRow[],
  draft: EntityDraft,
): EntityRow[] {
  const normalizedRow: EntityRow = Object.fromEntries(
    definition.columns.map((column) => [
      column.key,
      draft.values[column.key]?.trim() ?? "",
    ]),
  );

  if (draft.mode === "create") {
    return [...rows, normalizedRow];
  }

  return rows.map((row) =>
    row.code === draft.originalCode ? normalizedRow : { ...row },
  );
}

export function deactivateEntityRow(
  rows: EntityRow[],
  code: string,
): EntityRow[] {
  return rows.map((row) =>
    row.code === code ? { ...row, status: "Pasif" } : { ...row },
  );
}

export function filterEntityRows(
  definition: EntityDefinition,
  rows: EntityRow[],
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) =>
    definition.columns.some((column) =>
      row[column.key]?.toLocaleLowerCase("tr-TR").includes(normalizedQuery),
    ),
  );
}

const commonStatusColumn: EntityColumn = {
  key: "status",
  label: "Durum",
  align: "center",
};

export const entityDefinitions: EntityDefinition[] = [
  {
    slug: "santiyeler",
    title: "Şantiye Tanımları",
    description:
      "Şantiye/proje kartları, bağlı şantiye, proje tutarı, tahmini maliyet ve cari bakiye görünümü.",
    codePrefix: "SANT",
    templateSources: [
      "Şantiye_proje_listesi_1.html",
      "Şantiye_proje_listesi_2.html",
    ],
    columns: [
      { key: "code", label: "Kodu" },
      { key: "name", label: "Tanımı" },
      { key: "responsible", label: "Yetkili" },
      { key: "projectAmount", label: "Proje Tutarı", align: "right" },
      { key: "balance", label: "Bakiye", align: "right" },
      commonStatusColumn,
    ],
    sampleRows: [
      {
        code: generateEntityCode("SANT", 1),
        name: "ŞİRKET MERKEZ ŞANTİYESİ",
        responsible: "Ana Kullanıcı",
        projectAmount: "0,00 TL",
        balance: "0,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("SANT", 2),
        name: "ANTALYA KONYAALTI 120 KONUT PROJESİ",
        responsible: "Hasan Çelik",
        projectAmount: "45.750.000,00 TL",
        balance: "-12.340.500,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("SANT", 3),
        name: "İSTANBUL KARTAL İŞ MERKEZİ İNŞAATI",
        responsible: "Fatma Özkan",
        projectAmount: "82.500.000,00 TL",
        balance: "-27.680.000,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("SANT", 4),
        name: "ANKARA ÇANKAYA REZİDANS PROJESİ",
        responsible: "Emre Aydın",
        projectAmount: "37.200.000,00 TL",
        balance: "-5.180.000,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("SANT", 5),
        name: "İZMİR BORNOVA KENTSEL DÖNÜŞÜM",
        responsible: "Baran Tekin",
        projectAmount: "63.400.000,00 TL",
        balance: "-18.920.000,00 TL",
        status: "Aktif",
      },
    ],
  },
  {
    slug: "musteriler",
    title: "Müşteri Cari Kartları",
    description:
      "Müşteri cari kartları, satış faturası, tahsilat ve hesap ekstresi akışlarının başlangıcı.",
    codePrefix: "MUS",
    templateSources: ["müşteri_cari_kartı.html", "cari_hesap_ekstresi.html"],
    columns: [
      { key: "code", label: "Kodu" },
      { key: "name", label: "Tanımı" },
      { key: "customerType", label: "Müşteri Tipi" },
      { key: "taxNumber", label: "Vergi No" },
      { key: "phone", label: "Telefon" },
      { key: "email", label: "E-posta" },
      { key: "balance", label: "Bakiye", align: "right" },
      commonStatusColumn,
    ],
    sampleRows: [
      {
        code: generateEntityCode("MUS", 1),
        name: "BAYRAKTAR GAYRİMENKUL YATIRIM A.Ş.",
        customerType: "Kurumsal",
        taxNumber: "6840127593",
        phone: "0 212 340 55 00",
        email: "info@bayraktargyo.com.tr",
        balance: "1.250.000,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("MUS", 2),
        name: "AKDENİZ BELEDİYESİ YAPI İŞLERİ MD.",
        customerType: "Kamu",
        taxNumber: "3920014578",
        phone: "0 242 238 10 00",
        email: "yapiisleri@akdeniz.bel.tr",
        balance: "3.780.000,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("MUS", 3),
        name: "ÖZDEMIR İNŞAAT TAAHHÜt LTD. ŞTİ.",
        customerType: "Kurumsal",
        taxNumber: "5710348926",
        phone: "0 312 442 78 90",
        email: "muhasebe@ozdemirinsaat.com",
        balance: "890.000,00 TL",
        status: "Aktif",
      },
    ],
  },  {
    slug: "tedarikciler",
    title: "Tedarikçi Tanımları",
    description:
      "Malzeme ve hizmet alınan cari hesaplar, alış faturası ve ekstre akışının başlangıcı.",
    codePrefix: "TED",
    templateSources: [
      "tedarikçi_yönetimi.html",
      "tedarikçi_tanımlar_1.html",
      "yeni_tedarikçi_kayıt_formu.html",
    ],
    columns: [
      { key: "code", label: "Kodu" },
      { key: "name", label: "Tanımı" },
      { key: "taxNumber", label: "Vergi No" },
      { key: "phone", label: "Telefon" },
      { key: "category", label: "Kategori" },
      { key: "balance", label: "Bakiye", align: "right" },
      commonStatusColumn,
    ],
    sampleRows: [
      {
        code: generateEntityCode("TED", 1),
        name: "ÖRNEK TEDARİKÇİ",
        taxNumber: "1111111111",
        phone: "0 242 000 00 00",
        category: "Malzeme",
        balance: "0,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("TED", 2),
        name: "YAPI MALZEMELERİ A.Ş.",
        taxNumber: "7230198456",
        phone: "0 212 567 34 00",
        category: "Malzeme",
        balance: "-1.622.250,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("TED", 3),
        name: "GÜVEN NAKLİYAT LTD. ŞTİ.",
        taxNumber: "4580236719",
        phone: "0 242 311 90 00",
        category: "Hizmet",
        balance: "-259.200,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("TED", 4),
        name: "ENERJİ ELEKTRİK A.Ş.",
        taxNumber: "8910567234",
        phone: "0 444 0 186",
        category: "Gider",
        balance: "-52.668,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("TED", 5),
        name: "ANADOLU ÇELİK SANAYİ A.Ş.",
        taxNumber: "3450189276",
        phone: "0 262 751 40 00",
        category: "Malzeme",
        balance: "-890.400,00 TL",
        status: "Aktif",
      },
    ],
  },
  {
    slug: "taseronlar",
    title: "Taşeron Tanımları",
    description:
      "Taşeron kartları, hakediş faturası, ödeme, kesinti ve hesap ekstresi için ortak tanım ekranı.",
    codePrefix: "TAS",
    templateSources: [
      "taşeron_yönetimi.html",
      "taşeron_tanımlar_1.html",
      "taşeron_tanım.html",
    ],
    columns: [
      { key: "code", label: "Kodu" },
      { key: "name", label: "Tanımı" },
      { key: "responsible", label: "Yetkili" },
      { key: "phone", label: "Telefon" },
      { key: "contractNo", label: "Sözleşme No" },
      { key: "contractStartDate", label: "Sözleşme Başlangıç" },
      { key: "contractEndDate", label: "Sözleşme Bitiş" },
      { key: "balance", label: "Bakiye", align: "right" },
      commonStatusColumn,
    ],
    sampleRows: [
      {
        code: generateEntityCode("TAS", 1),
        name: "ŞİRKETİN TAŞERONU",
        responsible: "Ali Koç",
        phone: "0 532 000 00 00",
        contractNo: "SZL-2026-001",
        contractStartDate: "2026-01-01",
        contractEndDate: "2026-12-31",
        balance: "0,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("TAS", 2),
        name: "DOĞAN YAPI TAŞERONLUK LTD. ŞTİ.",
        responsible: "Kemal Doğan",
        phone: "0 533 412 67 80",
        contractNo: "SZL-2026-002",
        contractStartDate: "2026-03-15",
        contractEndDate: "2026-09-30",
        balance: "-145.600,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("TAS", 3),
        name: "YILDIZ ELEKTRİK TESİSAT",
        responsible: "Serkan Yıldız",
        phone: "0 535 890 12 34",
        contractNo: "SZL-2026-003",
        contractStartDate: "2026-02-01",
        contractEndDate: "2026-11-30",
        balance: "-72.300,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("TAS", 4),
        name: "MARMARA BETON SANTRALİ A.Ş.",
        responsible: "Hüseyin Demir",
        phone: "0 262 751 20 00",
        contractNo: "SZL-2026-004",
        contractStartDate: "2026-01-15",
        contractEndDate: "2026-12-31",
        balance: "-215.800,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("TAS", 5),
        name: "EGE ÇATI KAPLAMA LTD. ŞTİ.",
        responsible: "Oğuz Şahin",
        phone: "0 532 456 78 90",
        contractNo: "SZL-2026-005",
        contractStartDate: "2026-04-01",
        contractEndDate: "2026-10-31",
        balance: "-38.500,00 TL",
        status: "Aktif",
      },
    ],
  },
  {
    slug: "personel",
    title: "Personel Tanımları",
    description:
      "Personel kartı, görev, ücret sistemi, çalıştığı şantiyeler, banka ve puantaj bağlantıları.",
    codePrefix: "PER",
    templateSources: [
      "personel_listesi.html",
      "personel_maaş_ve_bordro_yönetimi.html",
    ],
    columns: [
      { key: "code", label: "Kodu" },
      { key: "name", label: "Tanımı" },
      { key: "role", label: "Görevi" },
      { key: "site", label: "Şantiyesi" },
      { key: "salary", label: "Maaş", align: "right" },
      commonStatusColumn,
    ],
    sampleRows: [
      {
        code: generateEntityCode("PER", 1),
        name: "MEHMET YILMAZ",
        role: "KALFA",
        site: "ŞİRKET MERKEZ ŞANTİYESİ",
        salary: "1.000,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("PER", 2),
        name: "AYŞE DEMİR",
        role: "MUHASEBE",
        site: "ŞİRKET MERKEZ ŞANTİYESİ",
        salary: "900,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("PER", 3),
        name: "HASAN ÇELİK",
        role: "SAHA MÜHENDİSİ",
        site: "ANTALYA KONYAALTI 120 KONUT PROJESİ",
        salary: "1.250,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("PER", 4),
        name: "FATMA ÖZKAN",
        role: "PROJE MÜDÜRESİ",
        site: "İSTANBUL KARTAL İŞ MERKEZİ İNŞAATI",
        salary: "1.500,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("PER", 5),
        name: "EMİR AKIN",
        role: "ELEKTRİK TEKNİSYENİ",
        site: "ANKARA ÇANKAYA REZİDANS PROJESİ",
        salary: "850,00 TL",
        status: "Aktif",
      },
    ],
  },
  {
    slug: "kasa-banka",
    title: "Kasa/Banka Hesap Tanımları",
    description:
      "Nakit, banka ve dövizli hesaplar; virman, tahsilat ve ödeme akışlarının hesap temelidir.",
    codePrefix: "KASA",
    templateSources: [
      "kasa_banka_yönetimi.html",
      "banka_kasa_virman_işlemi.html",
    ],
    columns: [
      { key: "code", label: "Kodu" },
      { key: "name", label: "Tanımı" },
      { key: "type", label: "Hesap Tipi" },
      { key: "currency", label: "Döviz" },
      { key: "balance", label: "Bakiye", align: "right" },
      commonStatusColumn,
    ],
    sampleRows: [
      {
        code: generateEntityCode("KASA", 1),
        name: "MERKEZ KASA",
        type: "Kasa",
        currency: "TL",
        balance: "24.350,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("KASA", 2),
        name: "GARANTİ BANKASI TİCARİ HESAP",
        type: "Banka",
        currency: "TL",
        balance: "1.872.640,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("KASA", 3),
        name: "İŞ BANKASI DÖVİZ HESABI",
        type: "Banka",
        currency: "USD",
        balance: "48.200,00 USD",
        status: "Aktif",
      },
      {
        code: generateEntityCode("KASA", 4),
        name: "ŞANTİYE KASA",
        type: "Kasa",
        currency: "TL",
        balance: "8.750,00 TL",
        status: "Aktif",
      },
      {
        code: generateEntityCode("KASA", 5),
        name: "QNB FİNANSBANK EUR HESAP",
        type: "Banka",
        currency: "EUR",
        balance: "32.150,00 EUR",
        status: "Aktif",
      },
    ],
  },
  {
    slug: "stok-kartlari",
    title: "Stok Kartları",
    description:
      "Malzeme, birim, depo ve minimum stok seviyeleri; fatura satırı ve depo takip akışlarının referans kartı.",
    codePrefix: "STK",
    templateSources: [
      "stok_listesi.html",
      "depo_tanımları.html",
      "nite_stok_ve_sat_durumu.html",
    ],
    columns: [
      { key: "code", label: "Kodu" },
      { key: "name", label: "Tanımı" },
      { key: "group", label: "Stok Grubu" },
      { key: "manufacturer", label: "Üretici" },
      { key: "unit", label: "Birim" },
      { key: "defaultWarehouse", label: "Varsayılan Depo" },
      { key: "minimumQuantity", label: "Minimum Miktar", align: "right" },
      commonStatusColumn,
    ],
    sampleRows: [
      {
        code: generateEntityCode("STK", 1),
        name: "Çimento Torba",
        group: "Kaba İnşaat",
        manufacturer: "Akdeniz Çimento",
        unit: "Adet",
        defaultWarehouse: "Merkez Depo",
        minimumQuantity: "120",
        status: "Aktif",
      },
      {
        code: generateEntityCode("STK", 2),
        name: "Demir Çubuk",
        group: "Demir",
        manufacturer: "Anadolu Çelik",
        unit: "Kg",
        defaultWarehouse: "Şantiye Depo",
        minimumQuantity: "250",
        status: "Aktif",
      },
      {
        code: generateEntityCode("STK", 3),
        name: "Gaz Beton",
        group: "Duvar",
        manufacturer: "Yapı Blok",
        unit: "Adet",
        defaultWarehouse: "A Blok",
        minimumQuantity: "50",
        status: "Aktif",
      },
      {
        code: generateEntityCode("STK", 4),
        name: "Seramik Karo",
        group: "İnce İşçilik",
        manufacturer: "Kalebodur",
        unit: "m2",
        defaultWarehouse: "Merkez Depo",
        minimumQuantity: "200",
        status: "Aktif",
      },
      {
        code: generateEntityCode("STK", 5),
        name: "Alüminyum Doğrama",
        group: "Cephe",
        manufacturer: "SCHÜCO",
        unit: "m2",
        defaultWarehouse: "Şantiye Depo",
        minimumQuantity: "80",
        status: "Aktif",
      },
    ],
  },
];

export function getEntityDefinition(slug: string) {
  return entityDefinitions.find((definition) => definition.slug === slug);
}


