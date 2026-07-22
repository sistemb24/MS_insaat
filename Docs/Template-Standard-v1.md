# NOA İnşaat — Template Standard v1

> Sürüm: 1.0
> Tarih: 18.07.2026
> Durum: Faz 1 kararı; Faz 2 uygulama girdisi
> Tema kapsamı: Light canonical; dark tema Faz 9

## 1. Standardın Rolü

`Template Standard v1`, 76 HTML dosyasının ortak tokenlarını ve en iyi içerik desenlerini tek uygulama sözleşmesine dönüştürür. Bu belge CSS/React uygulaması değildir; Faz 2–9 boyunca kod ve görsel kabul kararlarının kaynağıdır.

Temel ilke:

> Şablon görsel hiyerarşiyi tanımlar; proje gerçek davranışı, veriyi ve güvenlik sınırını tanımlar.

Öncelik sırası:

1. Scope, RBAC, audit, dönem ve finansal bütünlük.
2. Mevcut action/service/repository ve gerçek veri.
3. Bu standardın canonical kararları.
4. Şablonun içerik kompozisyonu.
5. Şablondaki örnek metin, statik kontrol ve dekorasyon.

## 2. Kaynak Kanıtı

| Bulgu | Sonuç |
|---|---|
| 76/76 aynı token değerleri | Renk/type/spacing için tek tema kaynağı güvenlidir. |
| Shell yapısı dosyalar arasında değişiyor | Tek AppShell zorunludur; sayfa shell'leri taşınmaz. |
| Dark utility yalnız 50 dosyada | Light tema canonical, dark ayrı tamamlanmış fazdır. |
| 932 buton ve 492 input, yalnız 7 form | Statik kontrol davranış kanıtı değildir. |
| 743 placeholder link | Route yalnız proje navigasyonundan alınır. |
| 4 dosyada aria-label, 1 dialog semantiği | Erişilebilirlik şablondan değil bu standarttan uygulanır. |
| Reduced motion ve print standardı yok | Her ikisi uygulama standardına ayrıca eklenir. |
| 101 dış görsel ve Tailwind/Chart CDN | Runtime CDN/hotlink yasaktır. |

## 3. Marka ve Dil

- Ürün adı global shell'de **NOA İnşaat**.
- Alt tanım: **İnşaat Yönetim SaaS** veya dar alanlarda **İnşaat ERP**.
- `Hakediş Pro`, `/hakedis` içindeki çalışma alanı etiketi olabilir; ayrı global ürün/shell değildir.
- `NOA Structural`, `Vehicles`, `Reports Center`, `Progress Payments`, `New Project` gibi İngilizce şablon metinleri doğrudan kullanılmaz.
- Arayüz, durum ve doğrulama metinleri Türkçedir; kod/domain enum değerleri mevcut sözleşmesini korur.
- Para birimi kullanıcıya `TL`/`₺` olarak tutarlı gösterilir; depolanan currency alanı değiştirilmez.

## 4. Renk Sistemi

### 4.1 Ana marka

| Token | Değer | Kullanım |
|---|---|---|
| `primary` | `#3525cd` | Ana aksiyon, aktif navigasyon metni, odak vurgusu |
| `primary-container` | `#4f46e5` | Güçlü dolu aksiyon ve marka yüzeyi |
| `on-primary` | `#ffffff` | Primary üstü içerik |
| `on-primary-container` | `#dad7ff` | Koyu primary-container üstü yardımcı içerik |
| `primary-fixed` | `#e2dfff` | Açık aktif/selected arka plan |
| `primary-fixed-dim` | `#c3c0ff` | Hover/ikincil vurgu |
| `on-primary-fixed` | `#0f0069` | Açık primary yüzey üstü güçlü metin |
| `on-primary-fixed-variant` | `#3323cc` | Açık primary yüzey üstü ikincil metin |
| `inverse-primary` | `#c3c0ff` | Koyu yüzeyde primary karşılığı; Faz 9 |
| `surface-tint` | `#4d44e3` | Kontrollü yüzey tint'i; geniş arka plan olarak kullanılmaz |

Eski `#00288e` Faz 2 pilotunda `legacy-primary` alias'ı olarak tutulur; yeni bileşen doğrudan bu renge bağlanmaz.

### 4.2 İkincil ve üçüncül

| Token | Değer | Kullanım |
|---|---|---|
| `secondary` | `#565e74` | İkincil metin/ikon |
| `secondary-container` | `#dae2fd` | Seçili nav, hafif bilgi yüzeyi |
| `on-secondary` | `#ffffff` | Dolu secondary üstü |
| `on-secondary-container` | `#5c647a` | Secondary container üstü |
| `secondary-fixed` | `#dae2fd` | Sabit açık secondary |
| `secondary-fixed-dim` | `#bec6e0` | Hover/disabled varyant |
| `on-secondary-fixed` | `#131b2e` | Açık secondary üstü güçlü metin |
| `on-secondary-fixed-variant` | `#3f465c` | Açık secondary üstü ikincil metin |
| `tertiary` | `#7e3000` | Kontrollü finansal/operasyonel vurgu |
| `tertiary-container` | `#a44100` | Dolu tertiary yüzey |
| `on-tertiary` | `#ffffff` | Tertiary üstü |
| `on-tertiary-container` | `#ffd2be` | Tertiary container üstü |
| `tertiary-fixed` | `#ffdbcc` | Açık uyarı/vurgu yüzeyi |
| `tertiary-fixed-dim` | `#ffb695` | Açık vurgu hover |
| `on-tertiary-fixed` | `#351000` | Tertiary fixed üstü |
| `on-tertiary-fixed-variant` | `#7b2f00` | Tertiary fixed ikincil metin |

### 4.3 Surface ve metin

| Token | Değer | Kullanım |
|---|---|---|
| `background` / `surface` / `surface-bright` | `#f7f9fb` | Uygulama arka planı |
| `surface-container-lowest` / `surface-white` | `#ffffff` | Panel, kart, drawer, modal |
| `surface-container-low` | `#f2f4f6` | Toolbar, table header, hafif grup |
| `surface-container` | `#eceef0` | Secondary panel/hover |
| `surface-container-high` | `#e6e8ea` | Seçili/disabled yüzey |
| `surface-container-highest` / `surface-variant` | `#e0e3e5` | Güçlü ayırıcı yüzey |
| `surface-dim` | `#d8dadc` | Disabled/overlay yardımcı yüzey |
| `on-surface` / `on-background` | `#191c1e` | Ana metin |
| `on-surface-variant` | `#464555` | Yardımcı metin |
| `text-muted` | `#64748B` | Metadata; kontrast kontrolü zorunlu |
| `outline` | `#777587` | Güçlü form/ayırıcı |
| `outline-variant` | `#c7c4d8` | Standart border |
| `border-slate` | `#E2E8F0` | Yoğun tablo grid çizgisi |
| `inverse-surface` | `#2d3133` | Koyu yüzey; Faz 9 |
| `inverse-on-surface` | `#eff1f3` | Koyu yüzey metni; Faz 9 |

### 4.4 Durum renkleri

| Semantik | Token/değer | Kural |
|---|---|---|
| Başarı/onaylı | `success-emerald #10B981` | Metin/ikon/etiket ile birlikte |
| Uyarı/bekleyen | `warning-amber #F59E0B` | “Bekliyor” ve attention durumları |
| Tehlike/iptal | `danger-rose #E11D48` | Destructive action ve iptal |
| Sistem hatası | `error #ba1a1a` | Form/işlem hatası |
| Hata container | `error-container #ffdad6` | Hata mesajı arka planı |
| Hata metni | `on-error-container #93000a` | Container üstü metin |
| Dolu hata üstü | `on-error #ffffff` | Dolu error buton/etiket |

Renk tek başına durum taşımaz. Her durumda Türkçe metin ve gerektiğinde ikon bulunur. Finansal pozitif/negatif renkleri kayıt statüsüyle karıştırılmaz.

`decorative-navy #000080` ve `decorative-purple #800080` yalnız veri serisi/dekorasyon adayıdır; action veya status semantiği olarak kullanılmaz.

## 5. Tipografi

### 5.1 Font aileleri

- UI: Inter, `400/500/600/700`.
- Sayısal/veri: JetBrains Mono, `500`; tablo belge no, tutar, miktar, kod ve teknik kimlik.
- Icon: lisansı doğrulanmış yerel Material Symbols veya yerel SVG registry.
- Font yüklenemezse sistem sans/mono fallback; layout kayması kabul ölçüsünde kalmalıdır.

### 5.2 Type scale

| Stil | Boyut / satır | Ağırlık | Kullanım |
|---|---|---:|---|
| `body-sm` | 13 / 18 px | 400 | Yardımcı tablo/metin |
| `body-md` | 14 / 20 px | 400 | Varsayılan UI |
| `body-lg` | 16 / 24 px | 400 | Açıklama/özet |
| `label-caps` | 12 / 16 px | 700 | Eyebrow, küçük bölüm etiketi; 0.05em |
| `data-mono` | 13 / 16 px | 500 | Kod, tarih, para, miktar |
| `headline-sm` | 20 / 28 px | 600 | Panel/bölüm başlığı |
| `headline-md` | 24 / 32 px | 600 | Sayfa başlığı; -0.01em |
| `headline-lg-mobile` | 24 / 32 px | 700 | Mobil hero/sayfa başlığı üst sınırı |
| `headline-lg` | 30 / 38 px | 700 | Dashboard üst başlığı; -0.02em |

Kurallar:

- Bir sayfada tek `h1`.
- Başlık seviyesi görsel boyuttan değil DOM hiyerarşisinden türetilir.
- Tüm büyük harf yalnız kısa label/eyebrow için.
- Sayısal kolonlar sağa hizalı ve tabular/mono.

## 6. Spacing, Ölçü ve Radius

### 6.1 Spacing ritmi

Canonical ölçek: 4, 8, 12, 16, 24, 32, 40, 48 px.

| Kullanım | Değer |
|---|---:|
| Küçük inline gap | 4–8 px |
| Control iç padding | 8 px dikey, 12 px yatay |
| Toolbar/control gap | 8–12 px |
| Kart iç padding | 16 px; özet/hero 20–24 px |
| Panel aralığı | 16–24 px |
| Ana içerik padding | Mobil 16 px, tablet 20 px, desktop 24 px |
| Container gap | 24 px (`1.5rem`) |
| Data cell | 8 px dikey, 12 px yatay |

### 6.2 Radius

| Rol | Değer |
|---|---:|
| Dense control/cell badge | 4 px |
| Button/input/tab | 8 px |
| Panel/card/drawer section | 12 px |
| Avatar/status dot | Full |

Yeni yüzeylerde 16–24 px rastgele radius kullanılmaz. Modal/drawer dış yüzeyi en fazla 12 px; mobil full-screen drawer radius kullanmayabilir.

### 6.3 Shell ölçüleri

| Token | Değer |
|---|---:|
| Header | 64 px |
| Sidebar desktop | 260 px |
| Sidebar collapsed | 80 px |
| Minimum control | 36 px |
| Önerilen normal control | 40 px |
| Dense data row | 36–40 px |
| Normal data row | 44–48 px |

## 7. AppShell Sözleşmesi

### 7.1 Desktop

- Sol sidebar 260 px; marka, modül grupları, scroll alanı ve alt Ayarlar bölümü.
- Header 64 px; firma/dönem/oturum, bildirim, kullanıcı/rol ve çıkış.
- İçerik `min-width: 0`; kendi yatay taşmasını tablo paneli yönetir.
- Sidebar ve header tek kez `AppShell` tarafından render edilir.
- Hakediş Pro ve content-only şablonlar ikinci sidebar/header üretmez.
- Aktif route `aria-current="page"`, renk + ikon + yüzey ile görünür.

### 7.2 Tablet ve mobil

- 1024 px altında sidebar off-canvas drawer olur; içerik sütununu daraltmaz.
- Header ana işlemleri menü/overflow içine kontrollü taşır.
- Firma/dönem bağlamı kaybolmaz; kısa özet veya context drawer içinde görünür.
- Mobil menü açıldığında focus drawer'a taşınır, Escape kapatır ve focus tetikleyiciye döner.
- Dashboard/card grid tek sütuna; iki sütun ancak minimum 360 px kart genişliği sağlanırsa.

### 7.3 Global arama

- Faz 2/3'te görsel placeholder olarak gösterilmez.
- Gerçek scoped arama F2 mini-RFC ile onaylanana kadar header arama alanı yoktur.

## 8. Sayfa Kompozisyonu

Canonical light sayfa sırası:

1. `PageHeader`: eyebrow/breadcrumb, tek `h1`, kısa açıklama, primary ve secondary actions.
2. `Context/FilterBar`: yalnız sayfanın gerçek filtreleri.
3. `SummaryGrid`: gerçek metrik varsa 2–4 kart; boş metrik kartı üretilmez.
4. `PrimaryWorkspace`: tablo, form, Kanban, takvim veya rapor.
5. `SecondaryPanel`: aktivite/audit/yardım; gerekliyse drawer.
6. `StateFeedback`: loading, empty, error ve success bağlama yakın.

ERP sayfalarında gereksiz `max-width` uygulanmaz. Dashboard açıklama alanı okunabilirlik için sınırlanabilir; tablo workspace'i kullanılabilir genişliği alır.

## 9. Ortak Bileşen Anatomileri

### 9.1 PageHeader

- Breadcrumb veya eyebrow.
- Tek `h1` ve en fazla iki satır özet.
- Sağda en fazla bir primary action ve iki secondary action; fazlası overflow menu.
- Viewer/kapalı dönem gibi global engel bağlama yakın ve görünür.

### 9.2 ActionBar ve filtre

- Arama, birincil filtreler, görünüm seçimi ve export ayrışır.
- Filtre etiketi görünür; yalnız ikonlu belirsiz control kullanılmaz.
- Aktif filtre özeti ve “Temizle” gerçek state ile çalışır.
- Filtre sonucu sayacı `Gösterilen X / Y` biçiminde önerilir.

### 9.3 DataTable

- `caption` veya erişilebilir isim.
- `thead/th` semantiği; sortable kolonlarda button + `aria-sort`.
- Para/miktar sağa, kod/tarih mono, durum metinli badge.
- Satır aksiyonları klavye ile erişilebilir.
- Yatay scroll yalnız tablo container'ında.
- Empty, filtered-empty, loading ve error ayrı durumlardır.
- Sticky header ancak scroll container ve z-index doğrulanırsa.

### 9.4 Form

- Gerçek `<form>` ve submit davranışı.
- Her control görünür `label`, yardımcı metin ve hata ilişkisine sahip.
- Required göstergesi yalnız renk değildir.
- Server action/loading ve client validation mesajları ayrılır.
- Destructive aksiyon formun primary action'ı yapılmaz.
- Çok adımlı form state kaybı, geri dönüş ve doğrulama davranışını açıklar.

### 9.5 Modal ve drawer

- `role="dialog"`, `aria-modal`, başlık ilişkisi.
- Focus trap, ilk anlamlı focus, Escape ve tetikleyiciye dönüş.
- Backdrop click veri kaybı oluşturacaksa kapatmaz veya onay ister.
- Mobilde full-screen/alt sheet; desktop'ta drawer en fazla 560–640 px.

### 9.6 StatCard

- Etiket, ana değer, yardımcı bağlam ve gerekiyorsa trend.
- Trend yalnız gerçek karşılaştırma dönemi varsa.
- Dekoratif gradient içeriğin kontrastını düşürmez.
- Kartın tamamı link ise tek erişilebilir link; iç içe button/link yok.

### 9.7 StatusBadge

- Domain enum → tek Türkçe label helper.
- Badge rengi domain anlamına göre merkezi mapping.
- Bilinmeyen değer saklanmaz; güvenli ham label veya “Bilinmeyen” politikası domain'e göre belirlenir.

## 10. Etkileşim Durumları

Her interactive control şu durumları tanımlar:

- Rest.
- Hover.
- Focus-visible: en az 2 px primary ring + yeterli offset.
- Active: hafif scale yalnız pointer için; layout kayması yok.
- Disabled: düşük kontrastın yanında `disabled` semantiği ve gerekirse açıklama.
- Pending/loading: control kilidi + görünür durum mesajı.
- Success: bağlama yakın ve kısa.
- Error: insan okunur mesaj; ham exception/secret yok.

Animasyon:

- 150–200 ms color/opacity/transform.
- Chart giriş animasyonu en fazla 600–1000 ms ve yalnız ilk render.
- `prefers-reduced-motion: reduce` altında scale/chart/scroll animasyonu kapalı.
- Kritik veri/durum yalnız animasyonla anlatılmaz.

## 11. Responsive Sözleşme

| Kontrol viewport'u | Beklenti |
|---:|---|
| 320 px | Temel akış kullanılabilir; menü/drawer, form ve primary action erişilebilir |
| 375/390 px | Ana mobil kabul görüntüsü |
| 768 px | Tablet; iki sütun yalnız içerik izin verirse |
| 1024 px | Shell geçiş sınırı; sidebar davranışı doğrulanır |
| 1440 px | Ana desktop görsel kabul |
| 1920 px | Geniş ERP workspace; aşırı boşluk veya kontrolsüz satır uzunluğu yok |

Tablo mobil stratejisi domain bazında seçilir:

1. Kontrollü yatay scroll,
2. Öncelikli kolon + detay drawer,
3. Kart görünümü.

Finansal tabloda kolon gizlemek toplam/bağlam kaybı yaratıyorsa yatay scroll tercih edilir.

## 12. Erişilebilirlik

- Hedef: WCAG 2.2 AA.
- Klavye ile tüm aksiyonlar ve route'lar erişilebilir.
- Her sayfada mantıklı landmark: banner/navigation/main/complementary.
- `aria-label` görünür label yerine kullanılmaz; ikon-only control için zorunlu.
- Canlı işlem mesajları uygun `role=status` veya `role=alert` kullanır.
- Focus sırası görsel sırayı izler.
- 200% zoom altında işlev kaybı olmaz.
- Dokunma hedefi normal yüzeyde yaklaşık 44 px; yoğun desktop grid'inde daha küçük control yalnız yeterli spacing/focus ile.
- Grafikler metinsel özet veya erişilebilir tablo sağlar.

## 13. Veri Gösterim Standardı

- Para: `tr-TR`, iki ondalık; eksi işareti ve para birimi görünür.
- Miktar: domain hassasiyetini korur; gereksiz sıfırlar kontrollü.
- Tarih: UI'da `dd.MM.yyyy`; input/transport ISO sözleşmesini korur.
- Tarih-saat: kullanıcı timezone'u `Europe/Istanbul`; audit için saat görünür.
- Belge no, IKN, plaka, hesap kodu, event id: mono.
- Boş değer: `—`; sıfır ile boş birbirine karıştırılmaz.
- Büyük değer taşması: wrap veya tabular alignment; metrik kartını yatay taşırmaz.

## 14. Asset ve İkon

- Tailwind CDN, Chart.js CDN ve Googleusercontent hotlink kullanılmaz.
- Runtime font/ikon CDN'i yok.
- Material ikon adı navigation modelinde anlamlı enum/string olarak tutulabilir; render yerel asset/font üzerinden yapılır.
- Kullanıcı/avatar görseli yoksa baş harf avatarı; DB alanı açılmaz.
- Dekoratif fotoğraf gerçek kullanıcı, şantiye veya araç verisi gibi sunulmaz.
- Görsel asset'e lisans/kaynak kaydı gerekir.

## 15. Print ve Export

- Tarayıcı print görünümü yalnız gerçek rapor/belge yüzeylerinde açılır.
- Sidebar, header, hover action ve interaktif filtreler print'te gizlenir.
- Başlık, firma/dönem, oluşturma zamanı ve sayfa kırılımları korunur.
- “PDF/Excel” butonu ancak gerçek çıktı davranışı varsa görünür.
- Şablondaki statik export butonu placeholder olarak taşınmaz.

## 16. Z-Index Katmanları

| Katman | Değer | Kullanım |
|---|---:|---|
| Base | 0 | Sayfa içeriği |
| Sticky content | 10 | Tablo header/filter bar |
| App header | 30 | Global header |
| Sidebar/drawer | 40 | Mobil navigasyon |
| Backdrop | 50 | Modal/drawer backdrop |
| Dialog/toast | 60 | Modal ve kritik toast |

Sayfa bileşenleri keyfi `z-50` kullanmaz; portal/stacking context Faz 2'de merkezi çözülür.

## 17. Canonical Referans Kompozisyonları

| Desen | Canonical kaynak |
|---|---|
| Global shell + Dashboard | `noa_i_n_aat_dashboard.html` |
| Yoğun entity tablosu | `noa_i_n_aat_m_teriler_liste.html` |
| Entity filter/action bar | `noa_i_n_aat_m_teriler.html` |
| Üç aşamalı form | `noa_i_n_aat_yeni_i_hale_3_sekmeli_form.html` |
| Doküman workspace | `noa_i_n_aat_d_k_man_merkezi_geni_letilmi.html` |
| Finansal hareket workspace | `noa_i_n_aat_kasa_banka.html` |
| Aylık yoğun grid | `noa_i_n_aat_puantaj_cetveli_detayl.html` |
| Stok operasyonu | `noa_i_n_aat_stok_depo.html` |
| Hakediş workspace | `hakedi_pro_dashboard.html` içerik alanı |
| Genel metraj editörü | `hakedi_pro_genel_metraj_veri_giri_i_g_ncel.html` |
| Hakediş rapor/özet | `hakedi_pro_hakedi_zeti.html` + kapak varyantları |

## 18. Faz 2 Uygulama Sınırı

Faz 2 bu standardı şu dar kapsamla kodlayacaktır:

1. Semantic token ve legacy alias katmanı.
2. Yerel font/ikon kararı.
3. Pilot için gerekli en küçük `Panel`, `Button`, `StatusBadge`, `FormField`, `DataTable` iskeleti.
4. Reduced-motion ve temel print temeli.
5. Ortak bileşen testleri.

Faz 2'de tüm sayfaların class'ları topluca değiştirilmez; AppShell dönüşümü Faz 3'tür.

## 19. Kabul Kontrol Listesi

- [x] 76 dosyanın ortak tokenları canonical değerlere bağlandı.
- [x] Marka, dil ve shell kararı tekilleştirildi.
- [x] Light tema kapsamı ve dark ertelemesi açık.
- [x] Typography, spacing, radius ve data density tanımlı.
- [x] Ortak bileşen anatomileri ve state davranışları tanımlı.
- [x] Responsive, erişilebilirlik, reduced-motion ve print kuralları tanımlı.
- [x] Asset/CDN/hotlink politikası tanımlı.
- [x] Faz 2 uygulama sınırı küçük ve geri alınabilir.

## 20. Kapsamlı UI/UX Standardizasyon Kabulü — 22.07.2026

- Tüm uygulama rotaları `TemplateAppShellV2` tabanlı ortak kabukta birleştirildi; API ve e-Fatura yüzeylerinin ayrı legacy kabuk kullanımı kaldırıldı.
- Sayfa başlığı, metrik özeti ve filtre/aksiyon alanı için ortak `PageHeader`, `MetricCard` ve `ActionBar` bileşenleri oluşturuldu.
- Çalışma alanlarında form kontrolleri 40 px yüksekliğe, kontrol/panel yarıçapları 8/12 px ayrımına, sayısal veriler tabular hizalamaya ve durum metinleri güvenli taşma davranışına bağlandı.
- Legacy renk, yüzey, radius ve birincil aksiyon sınıfları semantic tokenlara geçirildi; mevcut server action, RBAC, scope, audit, ledger ve gerçek veri akışları değiştirilmedi.
- Dashboard, API, Puantaj, Personel ve Hakediş rotalarında masaüstü kabuk, tek `h1`, landmark ve skip-link kabulü yapıldı. Mobil drawer odak aktarımı, Escape ile kapanma ve tetikleyiciye odak dönüşü otomatik testle korunuyor.
- Yeni yüzeyler aynı ortak bileşenleri ve semantic tokenları kullanacak; sayfaya özel yeni bir kabuk, renk paleti veya keyfi radius ailesi eklenmeyecek.

## 21. Faz 9 Dark Tema Temeli — 22.07.2026

- Tema tercihi `Sistem`, `Açık` ve `Koyu` seçenekleriyle uygulama kabuğunda erişilebilir bir kontrol olarak sunulur.
- Tercih tarayıcıda `noa-theme` anahtarıyla saklanır; tenant/firma/dönem verisine veya kullanıcı DB modeline yazılmaz.
- Root layout bootstrap betiği kayıtlı tercih veya işletim sistemi tercihini React hydration öncesinde uygular; ilk boyamada açık/koyu tema sıçraması önlenir.
- Koyu tema yalnız `.dark` kök sınıfı üzerinden semantic tokenları değiştirir. Component seviyesinde ikinci bir renk paleti veya route bazlı tema varyantı oluşturulmaz.
- İşletim sistemi tercihi yalnız `Sistem` seçiliyken canlı izlenir; açık/koyu kullanıcı tercihi sistem değişiminden etkilenmez.
- Print görünümü tema tercihinden bağımsız olarak açık zemin ve yüksek kontrastlı metin tokenlarına döner.
- Dashboard ve Hakediş Pro masaüstü görünümü ile Hakediş Pro 390 × 844 px mobil görünümü kabul edildi; mobil drawer tema kontrolü çalıştı ve yatay taşma oluşmadı.

## 22. Faz 9 Semantic Renk ve Shell Temizliği — 22.07.2026

- Uygulama kabuğu route bazlı `v2-*-pilot` varyantlarından arındırıldı; tüm korumalı rotalar tek `data-shell-variant="standard"` sözleşmesini kullanır.
- Ulaşılamayan legacy header/sidebar kabuğu ve geçici pilot adlandırmaları kaldırıldı; navigasyon, oturum, bildirim ve tema davranışları standart kabukta korunur.
- Component yüzeylerindeki sabit Tailwind palet sınıfları ile doğrudan hex/RGB grafik renkleri semantic `info`, `success`, `warning`, `danger`, vurgu ve inverse tokenlarına taşındı.
- Geçiş dönemi legacy CSS alias'ları kaldırıldı; yeni yüzeyler yalnız `--ds-*` kaynak tokenlarını ve bunların Tailwind semantic karşılıklarını kullanır.
- Dashboard, Döküman Merkezi ve Ayarlar gerçek veriyle koyu temada kabul edildi; tek `h1`, standart shell ve çalışma anında sabit palet sınıfı bulunmaması doğrulandı.
- Bu temizlik domain iş akışını, server action'ları, RBAC/scope/audit/ledger kurallarını veya Prisma şemasını değiştirmez.

## 23. Faz 9 Route Matrisi ve Çıktı Kabulü — 22.07.2026

- 22 korumalı route standart shell, tek ana başlık, yatay taşma ve ana içerik semantiği açısından tarandı.
- Light/dark semantic renk çiftleri WCAG AA `4.5:1` eşiğine bağlandı; minimum oranlar light `4.52:1`, dark `7.11:1` olarak doğrulandı.
- Yevmiye, mizan, puantaj, hakediş ve fatura tabloları erişilebilir ad taşır; manuel yevmiye üst alanları açık form adlarına sahiptir.
- Fatura PDF modalı ilk odak, odak döngüsü, Escape ile kapanma ve tetikleyiciye odak dönüşü sözleşmesini uygular.
- Dashboard grafikleri erişilebilir ad taşır; koyu temada gerçek veriyle kabul edildi.
- Print görünümü koyu tema seçimini açık semantic palete sıfırlar, global shell ve interaktif aksiyonları gizler, tablo başlıkları ile sayfa kırılma davranışını korur.
- Ayrıntılı matris ve kanıt `Docs/UI-baseline/Faz9-route-matrix-kabul-20260722.md` içindedir.
- Domain, DB, RBAC, scope, audit ve ledger davranışları değiştirilmedi.
