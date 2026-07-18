# HTML Şablon Entegrasyon Planı — NOA İnşaat Yönetim

## Amaç

`stitch_HTML_sablonlar/` klasöründeki **66 statik HTML şablon dosyasının** tasarım dilini ve işlevsel özelliklerini, mevcut **Next.js 16 + Tailwind v4 + Prisma 7** projesine entegre etmek. Projenin iş mantığını koruyarak görsel ve işlevsel kaliteyi şablon seviyesine taşımak.

---

## Mevcut Durum Analizi

### Proje (Şu Anki)
| Özellik | Mevcut Durum |
|---|---|
| **Renk paleti** | ~15 CSS variable (`--primary: #00288e`, `--surface: #f7f9fb`, vb.) |
| **Tipografi** | Sadece Inter font tanımı, type scale yok |
| **Sidebar** | Text kısaltmaları (DS, ŞP, TD…), `248px` genişlik |
| **Header** | Düz arka plan, pill-style context bilgileri |
| **İkonlar** | Yok (metin kısaltmaları kullanılıyor) |
| **Kartlar** | Düz border, minimal gölge |
| **Animasyonlar** | Yok |
| **Dark mode** | CSS `prefers-color-scheme` ile kısmi |

### Şablonlar (Hedef)
| Özellik | Şablon Durumu |
|---|---|
| **Renk paleti** | 50+ Material Design 3 rengi (surface, primary, secondary, tertiary, error, success, warning, danger) |
| **Tipografi** | Tam type scale: `body-sm/md/lg`, `headline-sm/md/lg`, `label-caps`, `data-mono` |
| **Sidebar** | Material Symbols ikonlar, `260px`, aktif vurgu animasyonu, `active:scale-95` |
| **Header** | Glassmorphic (`backdrop-blur-md`), arama kutusu, avatar, bildirim badge |
| **İkonlar** | Google Material Symbols Outlined (filled/outlined variants) |
| **Kartlar** | `rounded-xl`, dekoratif köşe gradyentleri, `group-hover:scale-110`, gölge |
| **Animasyonlar** | Chart `growUp` keyframe, geçiş animasyonları, grid pattern arka plan |
| **Dark mode** | `darkMode: "class"` desteği (HTML class ile toggle) |

---

## User Review Required

> [!IMPORTANT]
> **Tailwind v4 uyumluluğu**: Proje Tailwind v4 kullanıyor (`@import "tailwindcss"` syntax). Şablonlar ise Tailwind CDN (v3 config syntax) kullanıyor. Renk/tipografi/spacing tokenlarını Tailwind v4'ün `@theme` direktifine taşıyacağız — **CDN script'i kullanılmayacak**.

> [!WARNING]
> **Primary renk değişikliği**: Mevcut `--primary: #00288e` (koyu lacivert) → Şablon `primary: #3525cd` (indigo/mor). Bu değişiklik tüm butonlar, badge'ler ve vurgulama renklerini etkileyecek. Onaylıyor musunuz?

> [!IMPORTANT]
> **Material Symbols font yüklemesi**: Google Fonts CDN üzerinden Material Symbols Outlined font'u layout.tsx'e eklenecek. Bu dış bağımlılık kabul edilebilir mi?

---

## Open Questions

1. **Sidebar navigasyonu Türkçe mi İngilizce mi olmalı?** Şablonlarda İngilizce (Dashboard, Firms, Tender Management…), mevcut projede Türkçe (Dashboard, Şantiyeler, Tedarikçiler…). **Önerim: Türkçe kalmalı** (mevcut gibi).

2. **Header'daki kullanıcı avatarı**: Şablonda profil resmi var. Projede kullanıcı fotoğrafı desteği henüz yok. Avatar yerine baş harfler kullanalım mı, yoksa profil resmi desteğini DB'ye de ekleyelim mi?

3. **Arama kutusu**: Şablon header'ında global arama var. Bu özelliği aktif mi yapmalıyız yoksa görsel olarak placeholder mı bırakmalıyız?

---

## Proposed Changes

### Faz 0 — Tasarım Sistemi Temeli

Şablon tasarım tokenlarını projenin CSS ve Tailwind yapısına entegre eder. Diğer tüm fazların önkoşuludur.

---

#### [MODIFY] [globals.css](file:///D:/Projeler/NOA-InsaatYonetim/src/app/globals.css)

Mevcut ~15 CSS variable'ı, şablonun 50+ Material Design 3 renk paletine genişletilecek:

```css
:root {
  /* Şablondan gelen tam renk paleti */
  --primary: #3525cd;
  --primary-container: #4f46e5;
  --on-primary: #ffffff;
  --on-primary-container: #dad7ff;
  --primary-fixed: #e2dfff;
  --primary-fixed-dim: #c3c0ff;
  --secondary: #565e74;
  --secondary-container: #dae2fd;
  --tertiary: #7e3000;
  --tertiary-container: #a44100;
  --surface: #f7f9fb;
  --surface-bright: #f7f9fb;
  --surface-dim: #d8dadc;
  --surface-container: #eceef0;
  --surface-container-low: #f2f4f6;
  --surface-container-high: #e6e8ea;
  --surface-container-highest: #e0e3e5;
  --surface-container-lowest: #ffffff;
  --surface-white: #ffffff;
  --surface-variant: #e0e3e5;
  --on-surface: #191c1e;
  --on-surface-variant: #464555;
  --outline: #777587;
  --outline-variant: #c7c4d8;
  --error: #ba1a1a;
  --success-emerald: #10B981;
  --warning-amber: #F59E0B;
  --danger-rose: #E11D48;
  --border-slate: #E2E8F0;
  --text-muted: #64748B;
  /* ... diğer tüm renk tokenları */
  
  /* Tipografi scale */
  --font-body-sm: 13px/18px;
  --font-body-md: 14px/20px;
  --font-body-lg: 16px/24px;
  --font-headline-sm: 20px/28px;
  --font-headline-md: 24px/32px;
  --font-headline-lg: 30px/38px;
  --font-label-caps: 12px/16px;
  --font-data-mono: 13px/16px;

  /* Spacing */
  --app-header-height: 64px;        /* 56px → 64px */
  --app-sidebar-width: 260px;       /* 248px → 260px */
  --sidebar-collapsed: 80px;
  --container-gap: 1.5rem;
}
```

Tailwind v4 `@theme` bloğu güncellenerek tüm custom tokenlar erişilebilir hale getirilecek.

---

#### [MODIFY] [layout.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/app/layout.tsx)

- Google Fonts'tan `Material Symbols Outlined` ve `Inter` (400–700) + `JetBrains Mono` (500) ekleme
- `className` attribute'una dark mode toggle desteği ekleme

---

#### [NEW] `src/app/template-animations.css`

Şablonlardaki animasyon keyframe'leri ve utility class'ları:
- `growUp` chart animasyonu
- `bg-grid-pattern` radial gradient arka plan
- Material Symbols font-variation-settings utility'leri
- Card hover scale transition'ları

---

### Faz 1 — AppShell Dönüşümü (Sidebar + Header)

Tüm sayfalar tarafından paylaşılan AppShell bileşenini şablon tasarımına dönüştürür.

---

#### [MODIFY] [app-shell.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/app-shell.tsx)

**SidebarNav:**
- Metin kısaltmaları (`DS`, `ŞP`) → Material Symbols ikonları (`dashboard`, `construction`, `gavel`…)
- Phase badge'ler korunacak
- Aktif durum: `bg-secondary-container text-primary rounded-lg font-semibold`
- Hover: `hover:bg-surface-container-low transition-all duration-200 active:scale-95`
- Alt kısım: Ayarlar linki `border-t` ile ayrılacak
- Brand header: NOA İnşaat logosu + "Construction ERP" alt yazı

**TopBar:**
- Arka plan: `bg-surface-white/80 backdrop-blur-md` (glassmorphic)
- Sol: Global arama kutusu (`search` ikonu + input)
- Sağ: Bildirim butonu (kırmızı dot badge), separator, kullanıcı avatar + isim + rol dropdown
- Mevcut context pill'ler ve oturum seçici korunacak ama şablon stiline uyarlanacak

---

#### [MODIFY] [navigation.ts](file:///D:/Projeler/NOA-InsaatYonetim/src/lib/navigation.ts)

`NavigationItem` tipine `materialIcon: string` alanı ekleme:
```typescript
export type NavigationItem = {
  label: string;
  href: string;
  icon: string;           // eski text kısaltması (geriye uyumluluk)
  materialIcon: string;   // YENİ: Material Symbols ikon adı
  description: string;
  phase: "P0" | "P1" | "P2";
};
```

İkon eşleştirmesi:
| Modül | Material Icon |
|---|---|
| Dashboard | `dashboard` |
| Şantiyeler | `construction` |
| Tedarikçiler | `local_shipping` |
| Müşteriler | `groups` |
| İhale Yönetimi | `gavel` |
| Döküman Merkezi | `description` |
| Bildirimler | `notifications` |
| Abonelik | `card_membership` |
| Araçlar | `directions_car` |
| API Yönetimi | `api` |
| E-Fatura | `receipt_long` |
| Taşeronlar | `engineering` |
| Personel | `group` |
| Kasa/Banka | `account_balance` |
| Giderler | `payments` |
| Stok/Depo | `inventory_2` |
| Faturalar | `receipt` |
| Hakediş | `request_quote` |
| Çek | `price_check` |
| Puantaj | `calendar_month` |
| Raporlar | `analytics` |
| Ayarlar | `settings` |

---

### Faz 2 — Çekirdek Sayfa Dönüşümü (5 Ana Bileşen)

En yoğun kullanılan 5 sayfanın şablon görselliğine dönüştürülmesi.

---

#### [MODIFY] [dashboard-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/dashboard-surface.tsx)
**Şablon**: `noa_i_n_aat_dashboard.html`

Değişiklikler:
- **Header section**: "Hoş geldin, Admin" + dönem özeti + "Rapor" / "Yeni İşlem" butonları
- **4 Özet kartı**: `rounded-xl`, dekoratif köşe gradyentleri, trend ikonları (`trending_up`/`trending_down`), yüzde değişim badge'leri
- **Chart alanı (2/3 genişlik)**: Aylık Gelir-Gider bar chart (`growUp` animasyonu ile)
- **Sağ panel (1/3 genişlik)**: Yaklaşan Ödemeler listesi + Son Aktiviteler timeline
- Mevcut `DashboardSurfaceProps` ve tüm veri bağlantıları korunacak

---

#### [MODIFY] [entity-list-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/entity-list-surface.tsx)
**Şablonlar**: `noa_i_n_aat_m_teriler.html`, `noa_i_n_aat_ta_eronlar.html`, `noa_i_n_aat_tedarik_iler.html`

Değişiklikler:
- Tablo stilleri: `rounded-xl` kart içinde, header `bg-surface-container-low`, satır hover efekti
- Filtre toolbar: Şablon stilinde arama + dropdown filtreler
- Aksiyon butonları: Material ikonlarla, şablon renk paletinde
- Toplu işlem toolbar'ı (seçili satırlar için)
- Durum badge'leri: Şablon stilinde (renkli pill'ler)

---

#### [MODIFY] [tender-management-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/tender-management-surface.tsx)
**Şablonlar**: `noa_i_n_aat_i_hale_y_netimi.html`, `noa_i_n_aat_yeni_i_hale_ekle.html`, `noa_i_n_aat_yeni_i_hale_3_sekmeli_form.html`

Değişiklikler:
- İhale listesi: Kart görünümü + tablo görünümü toggle
- Yeni ihale form: 3 sekmeli form (şablondan birebir)
- Toolbar: Şablon stilinde filtre ve sıralama
- Durum göstergeleri: Renkli tag'ler

---

#### [MODIFY] [progress-payment-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/progress-payment-surface.tsx)
**Şablonlar**: `noa_i_n_aat_hakedi_y_netimi.html`, `noa_i_n_aat_hakedi_detay_ta_eron.html`

---

#### [MODIFY] [settings-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/settings-surface.tsx)
**Şablon**: `noa_i_n_aat_ayarlar.html`

---

### Faz 3 — Kalan Sayfa Dönüşümleri

Geri kalan tüm surface bileşenlerinin şablon stiline dönüştürülmesi.

---

| Bileşen | Şablon Referans(lar)ı |
|---|---|
| [cash-bank-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/cash-bank-surface.tsx) | `noa_i_n_aat_kasa_banka.html`, `noa_i_n_aat_banka_hareketleri_operasyon.html` |
| [vehicle-fleet-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/vehicle-fleet-surface.tsx) | `noa_i_n_aat_ara_ve_filo_y_netimi.html`, `noa_i_n_aat_ara_filo_takip_operasyon.html`, `noa_i_n_aat_ara_bak_m_ve_servis_takvimi.html` |
| [timesheet-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/timesheet-surface.tsx) | `noa_i_n_aat_puantaj_cetveli.html`, `noa_i_n_aat_puantaj_cetveli_detayl.html`, `noa_i_n_aat_puantaj_cetveli_veri_giri_i.html` |
| [personnel-asset-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/personnel-asset-surface.tsx) | `noa_i_n_aat_personel_y_netimi.html`, `noa_i_n_aat_personel_ve_maa_y_netimi.html` |
| [payroll-accrual-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/payroll-accrual-surface.tsx) | `noa_i_n_aat_personel_ve_maa_y_netimi.html` |
| [stock-depot-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/stock-depot-surface.tsx) | `noa_i_n_aat_stok_depo.html`, `noa_i_n_aat_stok_depo_y_netimi.html` |
| [purchase-invoice-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/purchase-invoice-surface.tsx) | `noa_i_n_aat_faturalar_ve_i_rsaliyeler.html` |
| [e-fatura-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/e-fatura-surface.tsx) | `noa_i_n_aat_e_fatura_y_netimi.html` |
| [expense-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/expense-surface.tsx) | `noa_i_n_aat_giderler.html`, `noa_i_n_aat_gider_y_netimi.html` |
| [notification-center-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/notification-center-surface.tsx) | `noa_i_n_aat_bildirimler.html`, `noa_i_n_aat_bildirim_ayarlar.html` |
| [document-center-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/document-center-surface.tsx) | `noa_i_n_aat_d_k_man_merkezi.html`, `noa_i_n_aat_d_k_man_merkezi_geni_letilmi.html` |
| [reports-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/reports-surface.tsx) | `noa_i_n_aat_rapor_merkezi.html` |
| [subscription-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/subscription-surface.tsx) | `noa_i_n_aat_abonelik_ve_paketler.html` |
| [api-key-management-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/api-key-management-surface.tsx) | `noa_i_n_aat_api_y_netimi.html`, `noa_i_n_aat_api_anahtar_olu_turma.html` |
| [ledger-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/ledger-surface.tsx) | `noa_i_n_aat_m_teri_hesap_ekstresi.html` |
| [cheque-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/cheque-surface.tsx) | `noa_i_n_aat_ek_y_netimi.html` |
| [site-management-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/site-management-surface.tsx) | `noa_i_n_aat_antiyeler.html` |
| [construction-progress-payment-surface.tsx](file:///D:/Projeler/NOA-InsaatYonetim/src/components/construction-progress-payment-surface.tsx) | `hakedi_pro_*` (17 dosya) |

Her bileşen için uygulama prensibi aynı:
1. Şablon HTML'ini oku → şablondaki card/table/form/toolbar yapısını anla
2. Mevcut bileşenin `props` ve iş mantığını koru
3. JSX'teki CSS class'larını şablon class'larına dönüştür
4. Şablondaki yeni UI elemanlarını (varsa) ekle

---

### Faz 4 — Yeni İşlevsel Özellikler

Şablonlarda olup projede henüz bulunmayan yeni sayfa/özellik entegrasyonları. **Gerektiğinde yeni Prisma modelleri ve API endpoint'leri eklenecek.**

---

#### [NEW] Firma Dashboard Sayfası
**Şablon**: `noa_i_n_aat_firmalar_dashboard.html`
- Firmalar arası karşılaştırmalı dashboard
- Firma bazlı gelir/gider/kâr analiz kartları
- Mevcut entity sistemine entegre edilecek

#### [NEW] Şantiye Finans Analiz Panosu
**Şablon**: `noa_i_n_aat_antiye_finans_analiz_panosu.html`
- Şantiye bazlı gelir/gider/kârlılık analizi
- Bütçe vs gerçekleşme karşılaştırma
- `site-management-surface.tsx`'e yeni sekme olarak eklenebilir

#### [NEW] İhale Karlılık Simülasyonu
**Şablon**: `noa_i_n_aat_i_hale_karl_l_k_sim_lasyonu.html`
- İhale fiyatlandırma ve karlılık simülasyonu aracı
- Tender management'a modal/sekme olarak entegre

#### [NEW] Poz Bazlı Metraj Hesap Simülasyonu
**Şablon**: `hakedi_pro_poz_bazl_metraj_hesap_sim_lasyonu.html`
- Hakediş modülüne entegre edilecek gelişmiş hesaplama aracı

#### [NEW] Yeşil Defter Miktar Kontrol Adımları
**Şablon**: `hakedi_pro_ye_il_defter_miktar_kontrol_ad_mlar.html`
- Adım adım miktar doğrulama iş akışı
- Construction progress payment'a entegre

#### [NEW] Kesinti Hesaplama Kuralları
**Şablon**: `hakedi_pro_kesinti_hesaplama_kurallar.html`
- Kesinti kural tanımları ve otomatik hesaplama
- Prisma şemasına `DeductionRule` modeli eklenebilir

#### [NEW] Muhasebe Entegrasyonu Paneli
**Şablon**: `hakedi_pro_muhasebe_entegrasyonu.html`
- Hakediş ↔ muhasebe entegrasyon durumu ve eşleştirme

#### [NEW] Denetim Günlüğü Detay Sayfası
**Şablon**: `noa_i_n_aat_denetim_g_nl.html`
- Mevcut audit-log altyapısı var, UI'ı şablona göre tasarlanacak
- Settings içinde yeni bir sekme olarak

#### [NEW] Banka Hareketleri Manuel Eşleştirme
**Şablon**: `noa_i_n_aat_banka_hareketleri_manuel_e_le_tirme.html`
- Banka hareketi ↔ fatura/gider eşleştirme UI'ı
- Cash-bank modülüne yeni bir görünüm olarak

#### [NEW] Toplu Metraj Aktarımı
**Şablon**: `hakedi_pro_toplu_metraj_aktar_m.html`
- Excel/CSV'den toplu metraj veri aktarımı

---

### Faz 5 — Doğrulama ve Tutarlılık Kontrolü

---

#### Otomatik Testler
```bash
npm run type-check    # TypeScript derlemesi
npm run test          # Vitest testleri
npm run lint          # ESLint
npm run build         # Next.js production build
```

#### Görsel Tutarlılık
- Tüm sayfaların aynı renk paleti, tipografi ve spacing tokenlarını kullandığını doğrula
- Sidebar ve header'ın her sayfada tutarlı göründüğünü kontrol et
- Responsive davranışı (`sm`, `md`, `lg` breakpoint'lerde) test et

#### İş Mantığı Doğrulama
- Mevcut tüm CRUD operasyonlarının çalıştığını doğrula
- Prisma migration'ların temiz uygulandığını kontrol et
- Dashboard veri bağlantılarının (summary cards, charts) doğru çalıştığını test et

---

## Uygulama Öncelik Sırası

```
Faz 0 (Tasarım Temeli)           →  1 iterasyon (tüm diğerleri buna bağlı)
Faz 1 (AppShell Dönüşümü)        →  1 iterasyon  
Faz 2 (5 Çekirdek Sayfa)         →  5 iterasyon (her sayfa ayrı)
Faz 3 (Kalan 15+ Sayfa)          →  3-5 iterasyon (gruplandırılarak)
Faz 4 (Yeni İşlevler)            →  5+ iterasyon (DB değişiklikleri dahil)
Faz 5 (Doğrulama)                →  1 iterasyon (her faz sonunda da yapılacak)
```

> [!TIP]
> Bu plan çok büyük kapsamlı olduğundan, **fazlar halinde onayınızla** ilerleyeceğiz. Her faz tamamlandığında ara doğrulama yapılacak. Başlamak için **Faz 0 + Faz 1** ile başlamamı öneriyorum — böylece tüm sayfalar hemen yeni tasarım dilini devralır.
