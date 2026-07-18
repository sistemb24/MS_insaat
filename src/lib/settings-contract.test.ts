import { describe, expect, test } from "vitest";

import {
  getP0BaseCurrencyDisplayValue,
  getP0BaseCurrencyTransactionValue,
  getP0CurrencyPolicyDisplayValue,
  getP0DefaultVatRateInputValue,
  getP0SettingsContract,
} from "./settings-contract";

describe("settings contract", () => {
  test("exposes P0 finance defaults, role matrix and audit scopes from one source", () => {
    const contract = getP0SettingsContract();

    expect(contract.company).toEqual({
      locationMode: "multi-location",
      supportedLocationTypes: ["Merkez", "Şantiye", "Şube", "Ofis"],
    });
    expect(contract.companyDisplayRows).toEqual([
      { label: "Lokasyon Modu", value: "Çoklu lokasyon / şantiye bazlı" },
      { label: "Desteklenen Tipler", value: "Merkez, Şantiye, Şube, Ofis" },
      { label: "Değişiklik Politikası", value: "P0'da kilitli" },
    ]);

    expect(contract.finance).toEqual({
      baseCurrency: "TRY",
      defaultVatRate: 20,
      multiCurrencyEnabled: false,
      showVatBreakdown: true,
      vatMode: "excluded",
    });
    expect(contract.financeDisplayRows).toEqual([
      { label: "Baz Para Birimi", value: "TRY" },
      { label: "Varsayılan KDV", value: "%20" },
      { label: "KDV Modu", value: "KDV hariç" },
      { label: "KDV Dağılımı", value: "KDV dağılımı aktif" },
      { label: "Çoklu Döviz", value: "P1 için kapalı" },
    ]);
    expect(contract.financePolicyRows).toEqual([
      {
        field: "defaultVatRate",
        p0Behavior: "Alış faturası ve hakediş yeni satır varsayımı",
        setting: "Varsayılan KDV Oranı",
        value: "%20",
      },
      {
        field: "vatMode",
        p0Behavior: "Net tutardan KDV ve genel toplam hesaplanır",
        setting: "KDV Modu",
        value: "KDV hariç",
      },
      {
        field: "showVatBreakdown",
        p0Behavior: "Satır ve özet alanlarında KDV ayrı gösterilir",
        setting: "KDV Dağılımı",
        value: "Aktif",
      },
      {
        field: "multiCurrencyEnabled",
        p0Behavior: "P0 işlem para birimi TL olarak normalize edilir",
        setting: "Çoklu Döviz",
        value: "P1 için kapalı",
      },
    ]);
    expect(contract.roleRows.map((row) => row.role)).toEqual([
      "admin",
      "accounting",
      "viewer",
    ]);
    expect(contract.rolePermissionRows).toEqual([
      {
        canCreate: true,
        canDelete: true,
        canUpdate: true,
        canView: true,
        resource: "Ayarlar",
        role: "admin",
        specialActions: "audit, users",
      },
      {
        canCreate: true,
        canDelete: false,
        canUpdate: true,
        canView: true,
        resource: "Giderler",
        role: "accounting",
        specialActions: "pay, approve",
      },
      {
        canCreate: false,
        canDelete: false,
        canUpdate: false,
        canView: true,
        resource: "Raporlar",
        role: "viewer",
        specialActions: "-",
      },
    ]);
    expect(
      contract.roleRows.find((row) => row.role === "accounting")?.permissions,
    ).toContain("gider");
    expect(contract.auditScopes).toContain(
      "Fatura oluşturma, kesinleştirme, iptal ve ödeme",
    );
    expect(contract.auditScopes).toContain(
      "Gider kaydı oluşturma ve ödeme hareketi",
    );
    expect(contract.auditScopes).toContain(
      "Tanım kartlarında oluşturma, güncelleme ve pasifleştirme",
    );
    expect(contract.actionRows).toEqual([
      {
        label: "Firma Bilgilerini Düzenle",
        message:
          "Firma bilgileri düzenleme P0 kapsamında salt okunur; kalıcı firma parametresi yazımı ayrı ayar servisinde açılacaktır.",
      },
      {
        label: "Finans Ayarlarını Düzenle",
        message:
          "Finans ayarı düzenleme P0 kapsamında salt okunur; fatura ve hakediş hesaplamalarını etkileyen kalıcı yazım ayrı dilimde açılacaktır.",
      },
      {
        label: "Rol Matrisini Düzenle",
        message:
          "Rol matrisi düzenleme P0 kapsamında salt okunur; yetki değişikliği audit ve güvenlik sözleşmesiyle ayrı dilimde açılacaktır.",
      },
      {
        label: "Audit Detayını Aç",
        message:
          "Audit detayı P0 kapsamında özet görünür; filtreli denetim günlüğü ayrı ekranda açılacaktır.",
      },
    ]);
    expect(contract.printAction).toEqual({
      label: "Ayarlar Özetini Yazdır",
      message:
        "Yazdırma kapsamı hazır: firma, finans, rol matrisi ve audit kapsamı.",
    });
  });

  test("formats the P0 default VAT rate for form line inputs", () => {
    expect(getP0DefaultVatRateInputValue()).toBe("20");
  });

  test("formats the P0 base currency for forms and transaction payloads", () => {
    expect(getP0BaseCurrencyDisplayValue()).toBe("TRY");
    expect(getP0BaseCurrencyTransactionValue()).toBe("TL");
  });

  test("formats the P0 currency policy for transaction forms", () => {
    expect(getP0CurrencyPolicyDisplayValue()).toBe("Çoklu Döviz: P1 için kapalı");
  });

  test("exposes the P1 expanded user type and invite policy read model", () => {
    const contract = getP0SettingsContract();

    expect(contract.userTypeRows).toEqual([
      {
        description: "Tüm modüller, sistem ayarları",
        permissionLevel: "Tam",
        type: "Admin (Tüm Yetkiler)",
      },
      {
        description: "Rol ekranında elle tanımlanmış izinler",
        permissionLevel: "Granüler",
        type: "Özel (RBAC ile Yönetilen)",
      },
      {
        description: "Atandığı lokasyona ait kayıtlar",
        permissionLevel: "Lokasyon bazlı",
        type: "Kullanıcı (Lokasyona Bağlı)",
      },
      {
        description: "Yalnızca İSG modülü",
        permissionLevel: "Modül bazlı",
        type: "İSG Uzmanı",
      },
      {
        description: "Yalnızca sağlık ve iş kazası kayıtları",
        permissionLevel: "Modül bazlı",
        type: "İşyeri Hekimi",
      },
      {
        description: "Salt okunur, finansal raporlar",
        permissionLevel: "Salt okunur",
        type: "İşveren (Görüntüleme)",
      },
    ]);
    expect(contract.userInvitePolicy).toEqual({
      buttonLabel: "Kullanıcı Davet Et",
      expiresInDays: 7,
      helperText: "Davet linki 7 gün geçerlidir",
      requiredFields: ["E-posta", "Rol"],
    });
  });
});

