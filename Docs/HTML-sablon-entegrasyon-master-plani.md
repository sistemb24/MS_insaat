# NOA İnşaat HTML Şablon Entegrasyonu — Master Prompt ve Uygulama Planı

> Durum: **ONAYLANDI — Faz 0–9 tamamlandı**
> Tarih: 22.07.2026
> Onay kaydı: Kullanıcı, önerilen 11 varsayımın tamamını onaylayarak Faz 0'ın başlatılmasını istedi.
> Aktif uygulama sınırı: Faz 0–9 uygulama, gerçek veri/görsel kabul, nihai 22 route matrisi ve kullanıcı dokümantasyonu tamamlandı. Bekleyen global arama, kalıcı simülasyon, kalıcı import staging/geçmişi ve gerçek dış entegrasyonlar ayrı mini-RFC/onay kapısını korur.

## 1. Yeniden Düzenlenmiş Ana Prompt

Aşağıdaki metin, çalışmanın ana talimatı olarak kullanılacaktır:

```text
D:\Projeler\NOA-InsaatYonetim\stitch_HTML_sablonlar klasöründeki HTML şablonlarını,
D:\Projeler\NOA-InsaatYonetim projesinin mevcut sayfalarına yüksek görsel sadakatle entegre et.

Ana hedef; projenin mevcut iş akışını, gerçek verisini, tenant/firma/dönem kapsamını,
yetkilendirme kurallarını, server action/service/repository yapısını, muhasebe bütünlüğünü
ve test sözleşmelerini bozmadan tüm uygulamayı ortak, kullanıcı dostu ve profesyonel bir
tasarım sistemine taşımaktır.

Önce 76 HTML şablonunun tamamını incele ve şablonlar arası ortak standardı oluştur:
renkler, tipografi, ölçüler, boşluklar, grid, sidebar, header, sayfa başlığı, kart, tablo,
form, filtre, sekme, modal/drawer, durum etiketi, boş/yükleniyor/hata durumları,
responsive davranış, ikon kullanımı, animasyon ve erişilebilirlik.

Şablonların birbiriyle çelişen kabuklarını doğrudan kopyalama. Ortak Template Standard v1
sözleşmesini çıkar; özgün HTML dosyalarını referans olarak koru ve uygulama içinde tek bir
ortak AppShell ile yeniden üret. Sayfa içeriğinde, proje iş akışıyla çelişmeyen şablonların
görsel kompozisyonunu mümkün olan en yüksek düzeyde koru.

"Birebir kullanım" şu anlama gelir:
- Görsel hiyerarşi, renk, ölçü, boşluk, kart/tablo/form düzeni ve etkileşim hissi yüksek
  sadakatle korunur.
- Statik HTML, Tailwind CDN, href="#", sahte veri, çalışmayan buton, inline demo JavaScript,
  dış görsel hotlink'i veya var olmayan entegrasyon doğrudan uygulamaya taşınmaz.
- HTML; Next.js 16, React 19 ve Tailwind v4 yapısına uygun, yeniden kullanılabilir React
  bileşenleri olarak uygulanır.
- Mevcut gerçek props, server action, service, repository, Prisma ve audit akışları korunur.

Şablonda projede bulunmayan fakat faydalı bir özellik tespit edilirse önce gap analizi yap:
1. Özelliğin kullanıcı değeri ve hangi gerçek iş akışını tamamladığı,
2. Mevcut kod/veri modeliyle karşılanıp karşılanmadığı,
3. Gerekli UI, domain, RBAC, audit, Prisma alan/model ve migration değişiklikleri,
4. Geriye uyumluluk, veri taşıma/backfill ve rollback planı,
5. Hedefli testler ve kabul kriterleri.

Yeni DB alanı/modeli yalnız gerçek ve kalıcı bir iş ihtiyacı varsa ekle. Sırf şablonda bir
input, avatar, grafik veya buton bulunduğu için şema genişletme. Mevcut alan veya türetilmiş
read-model yeterliyse onu kullan. Yeni alanlarda tenantId/companyId/periodId kapsamını,
unique/index kurallarını, RBAC ve audit izini açıkça tasarla.

API fazı tamamlanmıştır. Gerçek bir hata veya onaylı yeni iş gereksinimi olmadıkça yeni API
endpoint'i ekleme; e-Fatura, genel webhook ve dış entegrasyon domainlerini yeniden açma.
Canlı Open Banking, Arvento, GİB, ödeme sağlayıcısı veya başka dış erişim varmış gibi davranma.
Bu modüllerde yalnız mevcut davranışı koruyan görsel/UX uyarlaması yapılabilir.

Her sayfayı tek seferde topluca dönüştürme. Küçük, geri alınabilir dikey dilimler kullan:
önce tasarım sözleşmesi ve ortak bileşenler, sonra pilot sayfalar, ardından modül grupları,
en son onaylı işlevsel genişletmeler. Her dilimde önce ilgili node_modules/next/dist/docs
Next.js 16 rehberini oku; hedefli testleri çalıştır; ardından npm test,
npm run type-check, npm run db:validate, npm run lint ve npm run build kapılarının tamamını
geçmeden dilimi tamamlanmış sayma.

Şablon karşılığı olmayan bir sayfa için, işlev ve bilgi mimarisi bakımından en yakın ve en
başarılı şablonu baz al; aynı design token ve ortak bileşen sistemini kullanarak yeni sayfayı
tasarla. Türkçe içerik ve mevcut domain terminolojisi korunmalıdır.

Her dilim sonunda şunları raporla:
- kullanılan şablon(lar),
- korunan mevcut iş akışları,
- eklenen/değişen görsel ve işlevsel unsurlar,
- varsa veri modeli/migration etkisi,
- test ve görsel doğrulama sonuçları,
- kalan riskler ve sıradaki küçük dilim.

Bu master plan kullanıcı tarafından onaylanmadan uygulamaya başlama.
```

## 2. İnceleme Sonucu ve Eski Plana Göre Düzeltmeler

`Docs/HTML sablon_plan.md` yararlı bir başlangıçtır; ancak güncel envanter ve canlı proje yapısı nedeniyle aşağıdaki düzeltmeler gereklidir:

| Konu | Güncel bulgu | Plan kararı |
|---|---:|---|
| HTML dosya sayısı | 76 | 50 NOA + 26 Hakediş Pro dosyasının tamamı kapsanacak. |
| Ortak tokenlar | 76/76 | Renk, tipografi ve ölçüler tek `Template Standard v1` kaynağına alınacak. |
| Tailwind kullanımı | 76/76 CDN | Uygulamaya CDN script'i taşınmayacak; Tailwind v4 ve merkezi CSS tokenları kullanılacak. |
| Sidebar/kabuk | Yalnız 44 dosyada belirgin | Her HTML kabuğu kopyalanmayacak; tek ortak responsive AppShell üretilecek. |
| Dark sınıfları | 50/76 | Önce eksiksiz light tema; dark tema ayrı kabul dilimi olacak. |
| Şablon etkileşimleri | 932 buton, 492 input, yalnız 7 form | Kontroller işlevsel kabul edilmeyecek; gerçek proje aksiyonlarına tek tek eşlenecek. |
| Şablon linkleri | 743 linkin tamamı `href="#"` | Gerçek Next.js route sözleşmesi korunacak. |
| Dış görseller | 101 kullanım, 96 benzersiz Google URL'si | Hotlink yapılmayacak; gerekli varlıklar onaylı ve yerel asset olarak yönetilecek. |
| Ek script | 1 sayfada Chart.js | Yeni runtime CDN bağımlılığı eklenmeyecek; önce CSS/SVG/React çözümü değerlendirilecek. |
| Proje yüzeyleri | 30 surface bileşeni | Tek seferde toplu class dönüşümü yerine temsilî dikey dilimler uygulanacak. |
| Karmaşıklık | Bazı surface'ler 1.000–3.600+ satır | Davranış koruyan küçük ayrıştırmalar ve hedefli regresyon testleri zorunlu olacak. |
| Veri modeli | 1.657 satırlık Prisma şeması ve mevcut gelişmiş domain modelleri | Yeni model eklemeden önce mevcut model/read-model tekrar kullanılacak. |
| Sürüm kontrolü | Git deposu ve GitHub `origin/main` doğrulandı | Faz 0 checkpoint'i `af42701aa764adccb818f84fde42bccf5d3cfe93`; dilimler temiz çalışma ağacından ilerleyecek. |

## 3. Kaynak Önceliği ve Çelişki Çözümü

Bir şablon ile proje davranışı çelişirse aşağıdaki sıra uygulanır:

1. Finansal doğruluk, tenant/firma/dönem izolasyonu, RBAC, audit ve veri bütünlüğü.
2. Mevcut gerçek domain iş akışı, server action/service/repository sözleşmesi ve gerçek E2E verisi.
3. Bu master plan ve onaylanmış faz kararları.
4. HTML şablonunun bilgi mimarisi ve görsel kompozisyonu.
5. Şablondaki örnek metin, örnek veri, sahte kontrol ve dekoratif içerik.

Bu sıra, “görsel sadakat” ile “iş akışını koruma” arasındaki temel sözleşmedir.

## 4. Değişmez Uygulama İlkeleri

- Özgün 76 HTML dosyası referans olarak korunur; doğrudan uygulama çıktısı yapılmaz.
- Statik HTML kopyala-yapıştır yerine React bileşenleri ve mevcut Next.js App Router yapısı kullanılır.
- Mevcut server/client component sınırları gereksiz yere değiştirilmez.
- Mevcut gerçek CRUD, ödeme/tahsilat, ledger, ters kayıt, hakediş, stok ve audit davranışları korunur.
- API/e-Fatura/webhook fazları yalnız görsel uyarlama görebilir; açık onay veya gerçek hata olmadan domain genişletilmez.
- Var olmayan dış servis, kimlik bilgisi, canlı sync veya teslimat worker'ı taklit edilmez.
- Türkçe modül adları, alan etiketleri ve muhasebe terminolojisi korunur.
- Placeholder global arama veya sahte çalışan aksiyon gösterilmez. Arayüzde görünen kontrol ya çalışır ya da açıkça devre dışı/açıklamalı olur.
- Veritabanı değişikliği yalnız migration, geriye uyumluluk, scope, RBAC, audit, test ve rollback planıyla yapılır.
- Gerçek demo/E2E kayıtları silinmez, yeniden yazılmaz veya tasarım uğruna backfill edilmez.
- Bir dilimin kapsamı büyür ve test/type churn üretirse daha küçük bir dikey dilime bölünür.

## 5. “Template Standard v1” Tasarım Sözleşmesi

İlk teknik çıktı, aşağıdaki tekil standart olacaktır.

### 5.1 Temel tokenlar

- Ana şablon rengi: `#3525cd`; container: `#4f46e5`.
- Surface ailesi: `#f7f9fb`, `#f2f4f6`, `#eceef0`, `#e6e8ea`, `#e0e3e5`, `#ffffff`.
- Metin: `#191c1e`; ikincil metin: `#464555`.
- Başarı/uyarı/hata: `#10B981`, `#F59E0B`, `#E11D48`/`#ba1a1a`.
- Tipografi: Inter; sayısal/veri alanlarında JetBrains Mono.
- Type scale: body 13/14/16; başlık 20/24/30; caps 12; data 13.
- Shell ölçüleri: header 64 px; sidebar 260 px; collapsed 80 px.
- Köşeler: control 4 px, orta 8 px, panel/kart 12 px, pill full.
- Ortak spacing: 8/12/16/24/32 tabanlı ritim.

Eski `--primary: #00288e` doğrudan silinmeyecek; pilot aşamasında legacy alias ile kontrollü geçiş yapılacaktır.

### 5.2 Ortak kabuk

- Desktop sidebar, tablet/mobile drawer ve erişilebilir menü düğmesi.
- Aktif route görünürlüğü; yalnız hover'a bağlı olmayan durum.
- Marka, tenant/firma/dönem, oturum seçici, bildirim, kullanıcı/rol ve çıkış akışları korunur.
- Header yüksekliği ve içerik başlangıç çizgisi tüm sayfalarda aynıdır.
- Sidebar taşması kendi içinde scroll olur; ana içerik ile yarışmaz.
- Global arama yalnız gerçek arama kapsamı tanımlandıktan sonra açılır.
- Avatar için ilk aşamada güvenli baş harf kullanılır; sırf görsel için DB alanı eklenmez.

### 5.3 Ortak UI parçaları

- `PageHeader`, `Breadcrumbs`, `ActionBar`, `StatCard`, `Panel`.
- `DataTable`, `TableToolbar`, `SearchField`, `FilterSelect`, `Pagination`.
- `FormField`, `FieldGroup`, `Tabs`, `Drawer`, `Modal`, `ConfirmDialog`.
- `StatusBadge`, `EmptyState`, `LoadingState`, `ErrorState`, `InlineNotice`.
- `Money`, `Quantity`, `Date`, `DocumentNo` görünüm yardımcıları.
- İkonlu butonlarda görünür metin veya erişilebilir ad.

Bu bileşenler tek seferde spekülatif olarak üretilmeyecek; ilk gerçek sayfa dilimlerinde kanıtlanan tekrarlar ortaklaştırılacaktır.

### 5.4 Responsive ve erişilebilirlik

- Kontrol genişlikleri ve tablolar 320/375, 768, 1024, 1440 ve 1920 px görünümde doğrulanır.
- Geniş veri tabloları kontrollü yatay scroll, sabit bağlam ve okunabilir kolon önceliği kullanır.
- Klavye odağı, tab sırası, modal focus trap/escape, `aria-*`, label ve canlı durum mesajları korunur.
- Renk tek başına anlam taşımaz; ikon/metin/durum etiketiyle desteklenir.
- `prefers-reduced-motion` altında dekoratif animasyonlar kapatılır.
- WCAG AA kontrast hedeflenir.

### 5.5 Asset ve bağımlılık politikası

- Tailwind CDN ve Chart.js CDN uygulamaya taşınmaz.
- Googleusercontent görselleri hotlink edilmez.
- Material Symbols için önerilen varsayım: lisansı doğrulanmış yerel font/asset; mümkün değilse küçük, yerel SVG ikon kaydı.
- Dekoratif stok fotoğrafları gerçek iş verisi gibi gösterilmez.
- Yeni npm bağımlılığı ancak mevcut araçlarla makul biçimde çözülemeyen ihtiyaç için eklenir.

## 6. Şablonların Fonksiyonel Sınıflandırması

Her şablon elemanı aşağıdaki dört sınıftan birine atanacaktır:

| Sınıf | Tanım | Uygulama biçimi |
|---|---|---|
| V1 — Görsel | Renk, grid, kart, tablo, ikon, tipografi | Mevcut veri/aksiyon değişmeden uygulanır. |
| V2 — UX | Filtre, sekme, drawer, boş durum, kolon seçimi | Mevcut read-model ile çalışıyorsa eklenir ve UI testi yazılır. |
| F1 — Mevcut domain işlevi | Şablonda yeni görünür, projede altyapısı zaten var | Yeni model/endpoint açmadan mevcut service/action'a bağlanır. |
| F2 — Yeni domain ihtiyacı | Kalıcı veri veya yeni iş kuralı gerektirir | Ayrı mini-RFC, kullanıcı onayı ve migration dilimi gerektirir. |

Örnekler:

- Denetim günlüğü: F1; `AuditLog` zaten var, yeni model gerektirmez.
- Banka manuel eşleştirme: Önce F1; mevcut `BankTransaction`, `BankLedgerEntry` ve action'lar tekrar kullanılmalıdır.
- Firma/şantiye finans panosu: Önce F1 read-model; mevcut fatura, gider, hakediş ve hareketlerden türetilmeye çalışılır.
- Hakediş muhasebe paneli: Önce F1; `ConstructionAccountingLink` ve ledger modelleri değerlendirilir.
- Kesinti kuralları: Olası F2; mevcut `ConstructionDeductionMovement` yetmiyorsa kural modeli önerilir.
- Profil resmi: İlk aşamada V1; baş harf avatarı yeterli olduğundan DB alanı açılmaz.
- Global arama: F2 olabilir; kapsam, yetki ve indeksleme kararı olmadan görsel input eklenmez.

## 7. Sayfa Ailesi ve Referans Eşleştirmesi

| Proje alanı | Ana şablon ailesi | Yaklaşım |
|---|---|---|
| AppShell/Dashboard | `noa_i_n_aat_dashboard.html`, `hakedi_pro_dashboard.html` | NOA kabuğu ana; Hakediş Pro yalnız modül içi desen kaynağı. |
| Cari kartlar | müşteri liste/detay/yeni, tedarikçi, taşeron, hesap ekstresi | Tek entity/cari standardı; role göre doğru aksiyonlar. |
| Şantiye/İhale | şantiyeler, finans panosu, ihale liste/analiz/kârlılık/form | Liste + analiz + form desenleri; mevcut ihale akışı korunur. |
| Finans | kasa-banka, banka operasyon/eşleştirme/ayarlar, giderler, çek | Ledger ve dönem kuralları tasarımdan üstündür. |
| Fatura/İrsaliye | faturalar ve irsaliyeler, e-Fatura | Mevcut kesinleştirme, ödeme/tahsilat ve ters kayıt akışları korunur. |
| Stok/Depo | iki stok/depo şablonu | Kart, hareket ve minimum stok görünümleri tek çalışma alanında. |
| Personel/Puantaj | personel/maaş ve dört puantaj şablonu | Grid/form ergonomisi; bordro ve RBAC davranışı korunur. |
| Doküman/Bildirim | üç doküman ve iki bildirim şablonu | Upload, klasör, çöp, tercih ve okunma davranışlarına bağlanır. |
| Yönetim | ayarlar, rol/yetki, audit, davet, abonelik, API | 3.600+ satırlık Settings en sona yakın, küçük alt dilimlerle ele alınır. |
| Araç/Filo | üç araç şablonu | Mevcut sandbox sınırı ve gerçek entegrasyon yokluğu görünür kalır. |
| Hakediş | iki NOA hakediş + 26 Hakediş Pro şablonu | Ayrı alt program; mevcut `Construction*` modelleri önceliklidir. |
| Raporlar | NOA ve Hakediş Pro rapor merkezi | Aynı filtre/çıktı dili; sahte grafik/veri kullanılmaz. |

Şablon karşılığı olmayan yüzeyler için yukarıdaki ailelerden işlevsel olarak en yakın olanın layout ve component desenleri kullanılacaktır.

## 8. Aşamalı Uygulama Planı

### Faz 0 — Onay, güvenli checkpoint ve başlangıç doğrulaması

Amaç: Uygulama başlamadan geri dönüş ve mevcut sağlık durumunu kanıtlamak.

Durum (18.07.2026): **Tamamlandı.** Plan onayı alındı; yerel `main`, GitHub `origin/main` ve `af42701aa764adccb818f84fde42bccf5d3cfe93` commit'i eşleşti. `npm test` ile 210 dosyada 1.142 test, `npm run type-check`, `npm run db:validate`, `npm run lint` ve `npm run build` hatasız geçti; production build 74 sayfayı üretti. Gerçek demo oturumuyla Dashboard, Müşteriler, İhale Yönetimi, Kasa/Banka ve Hakediş desktop baseline'ları ile Dashboard 390 px mobil baseline'ı `Docs/UI-baseline/2026-07-18/` altında kaydedildi. Mobil kontrolde DOM seviyesinde yatay taşma saptanmadı. Tasarım kodu, Prisma şeması, migration, uygulama verisi ve özgün HTML şablonları değiştirilmedi.

Teslimatlar:

- Bu master planın ve önerilen varsayımların kullanıcı onayı.
- Kullanılabilir Git deposu geri getirilecek veya `backups/` altında tarihli, doğrulanmış kaynak + Prisma checkpoint'i alınacak.
- Mevcut veritabanı migration durumu ve demo/E2E veri kapsamı kayıt altına alınacak.
- Başlangıçta hedefli temel testler ve tam kapılar çalıştırılacak.
- Mevcut ana sayfaların referans ekran görüntüleri alınacak.

Çıkış kriteri: Geri dönüş noktası doğrulanmış ve mevcut hata/warning baseline'ı yazılmış olmalı.

### Faz 1 — Şablon envanteri ve Template Standard v1

Amaç: 76 dosyayı tek tasarım sözleşmesinde uyumlu hale getirmek.

Durum (18.07.2026): **Tamamlandı.** `stitch_HTML_sablonlar` altındaki 76/76 HTML dosyası eksiksiz ve tekrarsız biçimde proje route/surface'lerine eşleştirildi. Ortak görsel, yapısal, responsive ve erişilebilirlik sözleşmesi [`Template-Standard-v1.md`](./Template-Standard-v1.md) içinde; dosya bazlı eşleştirme ve canonical kararlar [`HTML-template-page-matrix.md`](./HTML-template-page-matrix.md) içinde; 54 önemli işlevin V1/V2/F1/F2 sınıflandırması ile F2 onay kapıları [`HTML-template-feature-gap-register.md`](./HTML-template-feature-gap-register.md) içinde kaydedildi. Mevcut domain yapısının hakediş, ihale simülasyonu, banka eşleştirme, davet/audit ve araç bakım senaryolarının çoğunu zaten desteklediği doğrulandı; bu fazda yeni Prisma alanı veya migration gerektiren onaylı bir değişiklik oluşmadı. Tasarım kodu, uygulama verisi ve özgün HTML şablonları değiştirilmedi. Faz 2 sıradadır.

Teslimatlar:

- Dosya → proje route/surface → referans parça eşleştirme matrisi.
- Canonical shell, token, type scale, spacing, radius, icon ve state sözleşmesi.
- Şablonlardaki her önemli özellik için V1/V2/F1/F2 sınıfı.
- Çelişkili şablon desenlerinde hangi varyantın canonical olduğuna dair karar kaydı.
- Light tema referans sayfası ve responsive kabul ölçüleri.

Not: Özgün HTML dosyaları topluca yeniden yazılmayacak. Uyumluluk, ortak sözleşme ve uygulama bileşenleri üzerinden sağlanacak.

Çıkış kriteri: Hiçbir sayfa dönüşümü başlamadan bütün şablonlar matriste karşılık bulmalı.

### Faz 2 — Tasarım sistemi temeli ve ortak primitifler

Amaç: Mevcut sayfaları bozmadan yeni tasarım dilinin teknik temelini kurmak.

Durum (18.07.2026): **Tamamlandı.** `src/app/globals.css` içinde Template Standard v1 değerlerini taşıyan ayrı `--ds-*` semantic token katmanı ve Tailwind v4 tema alias'ları kuruldu; eski sayfaların kullandığı `--primary`, `--radius-*`, shell ölçüleri ve durum tokenları legacy sözleşme olarak korundu. Inter ile JetBrains Mono `next/font` üzerinden self-host edildi ve production çıktısında 13 yerel font dosyası doğrulandı; runtime font/ikon CDN'i bulunmuyor. Küçük yerel SVG ikon kaydı ile `Panel`, `Button`, `StatusBadge`, `FormField`, generic `DataTable` ve empty/loading/error state primitifleri `src/components/ui/` altında eklendi. Global focus-visible, reduced-motion ve temel print kuralları tanımlandı. Hedefli 10 testin ardından tam kapılarda 212 dosyada 1.152 test, type-check, Prisma validate, lint ve 74 sayfalık production build hatasız geçti. Prisma şeması, migration, AppShell, mevcut proje surface'leri, uygulama verisi ve özgün HTML şablonları değiştirilmedi. Faz 3 sıradadır.

Teslimatlar:

- Tailwind v4 uyumlu token ve semantic alias katmanı.
- Font/ikon/asset çözümü.
- Kanıtlanmış ortak `Panel`, `Button`, `StatusBadge`, `FormField`, `DataTable` ve state bileşenleri.
- Legacy tokenlarla geçici uyumluluk.
- Reduced-motion ve temel print kuralları.
- Ortak bileşen testleri.

Çıkış kriteri: Pilot bileşenler eski sayfaları etkilemeden render/test edilebilmeli.

### Faz 3 — AppShell v2 pilotu

Amaç: Sidebar, header, mobil menü ve sayfa içerik çerçevesini standardize etmek.

Durum (18.07.2026): **Tamamlandı.** `AppShell`, yalnız `currentPath="/"` için `v2-dashboard-pilot` varyantını; diğer 21 modül route'u için mevcut legacy varyantı render edecek şekilde sınırlandı. Dashboard shell'i 64 px header, 260 px gruplanmış sidebar, 22 gerçek route, `aria-current`, yerel SVG ikonlar, firma/dönem/oturum/bildirim/kullanıcı/lisans/çıkış bağlamı ve ana içeriğe geç bağlantısıyla Template Standard v1'e taşındı; F2 onayı olmayan global arama eklenmedi. Mobil drawer ayrı küçük Client Component olarak kuruldu; açılış odağı, focus trap, Escape, backdrop/link ile kapanma, body scroll kilidi ve tetikleyiciye focus dönüşü sağlandı. Gerçek demo oturumuyla 1440 × 1000 desktop, 390 × 844 mobil ve açık drawer baseline'ları `Docs/UI-baseline/2026-07-18/phase-3/` altında kaydedildi; desktop/mobil DOM ölçümünde yatay taşma `0`, drawer yüksekliği 844 px ve açılış odağı `Menüyü kapat` olarak doğrulandı. Hedefli 17 testin ardından tam kapılarda 212 dosyada 1.155 test, type-check, Prisma validate, lint ve 74 sayfalık production build hatasız geçti. Prisma şeması, migration, mevcut proje surface'leri, uygulama verisi ve özgün HTML şablonları değiştirilmedi. Faz 4 sıradadır.

Yöntem:

- Mevcut AppShell davranışları korunarak geçici bir v2/variant yolu oluşturulur.
- İlk pilot Dashboard'da açılır; kabul edilmeden tüm route'lara yayılmaz.
- Oturum seçici, tenant/firma/dönem, bildirim, viewer uyarısı ve çıkış akışı regresyon testleriyle kilitlenir.
- Global arama bu fazda yalnız gerçek işlev hazırsa görünür.

Çıkış kriteri: Desktop + mobil shell, klavye kullanımı ve mevcut session/RBAC testleri geçmeli.

### Faz 4 — Temsilî pilot sayfalar

Amaç: Ortak desenleri düşük riskle kanıtlamak.

Önerilen sıra:

1. Dashboard: kart, grafik, aktivite, dönem filtresi ve responsive grid.
2. Müşteriler: arama, filtre, tablo, seçim, CRUD paneli ve cari ekstre.
3. İhale Yönetimi: karmaşık form/sekme/analiz deseni.
4. Kasa/Banka: finansal tablo, durum ve ledger görünürlüğü.

Her sayfa ayrı dilimdir. Bir sonraki sayfaya geçmeden görsel onay ve tam kapılar alınır.

Durum — Dashboard dilimi (18.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının “devam et” kararı bu dilimin görsel
kabul kaydıdır. Dashboard içeriği `noa_i_n_aat_dashboard.html` kompozisyonundaki
sayfa başlığı, aksiyonlar, dört özet kartı, 2/3–1/3 ana çalışma alanı, sağ uyarı
paneli ve responsive grid düzenine taşındı. Şablondaki statik tutar, tahmini
yüzde ve sahte projeksiyonlar kullanılmadı; `summarizeOperationalReports`,
mevcut firma kayıtları ve ihale uyarı servisi korunarak seçili dönemin gerçek
kesinleşmiş verileri gösterildi. Dönem filtresi Dashboard bağlam çubuğuna
alındı; finansal akış grafiği, firma dağılımı/yeni firma grafikleri, ihale
uyarıları, operasyon metrikleri, son hareketler, yazdırma ve gerçek route
bağlantıları korundu. Ortak `Panel`, `Button`, `Icon` ve
`StatusBadge` primitive'leri kullanıldı. Gerçek demo oturumuyla 1440 × 1200
desktop, 390 × 1200 mobil üst görünüm ve mobil akış/ihale baseline'ları
`Docs/UI-baseline/2026-07-18/phase-4/dashboard/` altında kaydedildi;
desktop ve mobilde yatay taşma `0`, tek `h1`, dört yönetici kartı ve
aktif `Bu Ay` filtresi doğrulandı. Hedefli 16 testin ardından tam kapılarda
212 dosyada 1.155 test, type-check, Prisma validate, lint ve 74 sayfalık
production build hatasız geçti. Prisma şeması, migration, uygulama verisi,
mevcut servis/action sözleşmeleri ve özgün HTML şablonları değiştirilmedi.

Durum — Müşteriler dilimi (18.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının İhale Yönetimi ile devam etme kararı
bu dilimin görsel kabul kaydıdır. AppShell v2 yalnız Dashboard'a ek olarak `/musteriler` route'una
`v2-customer-pilot` varyantıyla genişletildi. Sayfa kompozisyonu
`noa_i_n_aat_m_teriler_liste.html`, `noa_i_n_aat_yeni_m_teri_ekle.html` ve
`noa_i_n_aat_m_teri_hesap_ekstresi.html` desenleriyle ortak başlık, gerçek
özet kartları, aksiyon araç çubuğu, çalışan Tümü/Aktif/Pasif filtresi, arama,
yoğun cari kart tablosu, seçim, CRUD paneli, tahsilat/ödeme ve hesap ekstresi
alanlarına taşındı. Mevcut `EntityListSurface` davranışı, server action
sözleşmeleri, gerçek kasa/banka hareketi, CSV/XLSX içe/dışa aktarma, cari
ekstre bağlantıları, tenant/firma/dönem kapsamı ve veri korunmuştur. Gerçek
demo oturumuyla 1440 × 1200 masaüstü liste, yeni kayıt paneli ve hesap ekstresi
ile 390 × 1200 mobil üst/liste baseline'ları
`Docs/UI-baseline/2026-07-18/phase-4/customers/` altında kaydedildi; iki
viewport'ta yatay belge taşması `0`, tek `h1`, aktif route, üç müşteri satırı,
iki ekstre hareketi ve gerçek React etkileşimiyle açılan yeni kayıt paneli
doğrulandı. Hedefli 29 testin ardından tam kapılarda 213 dosyada 1.158 test,
type-check, Prisma validate, lint ve 74 sayfalık production build hatasız geçti.
Prisma şeması, migration, veri, servis/action sözleşmeleri ve özgün HTML
şablonları değiştirilmedi.

Durum — İhale Yönetimi dilimi (18.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının Kasa/Banka ile devam etme kararı bu
dilimin görsel kabul kaydıdır. AppShell v2 `/ihale-yonetimi` route'una `v2-tender-pilot`
varyantıyla genişletildi. Sayfa kompozisyonu
`noa_i_n_aat_i_hale_y_netimi.html`,
`noa_i_n_aat_i_hale_analiz_panosu.html`,
`noa_i_n_aat_i_hale_karl_l_k_sim_lasyonu.html`,
`noa_i_n_aat_yeni_i_hale_3_sekmeli_form.html` ve
`noa_i_n_aat_yeni_i_hale_ekle.html` desenleriyle ortak başlık, gerçek özet
kartları, durum/son teklif sayaçları, çalışan arama, Liste–Kanban–Analiz
görünümleri, filtrelenmiş CSV çıktısı, yazdırma/PDF, üç sekmeli yeni ihale
formu, BOQ kârlılık simülasyonu ve kazanılan ihaleden şantiye açma akışına
taşındı. Kanban, analiz ve liste aynı gerçek ihale satır setini kullanır;
durum geçişleri mevcut `getNextTenderStatuses` sözleşmesine bağlıdır. Görsel
olarak çalışmayan Ara/Excel/PDF kontrolleri bırakılmadı. Gerçek demo
oturumuyla 1440 × 1200 masaüstü liste, Kanban, analiz ve form ile 390 × 1200
mobil üst/liste baseline'ları `Docs/UI-baseline/2026-07-18/phase-4/tenders/`
altında production build üzerinden kaydedildi; iki viewport'ta yatay belge
taşması `0`, tek `h1`, dört gerçek özet kartı, altı Kanban kolonu, dört gerçek
Kanban kartı, üç form sekmesi ve Başlık alanı odağı doğrulandı. Hedefli 22
testin ardından tam kapılarda 213 dosyada 1.161 test, type-check, Prisma
validate, lint ve 74 sayfalık production build hatasız geçti. Prisma şeması,
migration, uygulama verisi, mevcut ihale server action/service sözleşmeleri ve
özgün HTML şablonları değiştirilmedi.

Durum — Kasa/Banka dilimi (18.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının Faz 5 ile devam etme kararı bu
dilimin görsel kabul kaydıdır. AppShell v2 `/kasa-banka` route'una `v2-cash-bank-pilot`
varyantıyla genişletildi. Sayfa kompozisyonu
`noa_i_n_aat_kasa_banka.html` içindeki başlık, gerçek bakiye kartları, hızlı
işlemler ve hesap tablosu desenleriyle; mevcut `CashBankSurface` hareket,
manuel tahsilat/ödeme, virman ve ledger görünürlüğü sözleşmelerini birleştiren
tek finans çalışma alanına taşındı. Şablondaki statik kredi borcu ve tahmini
trendler kullanılmadı. TL güncel bakiye, giriş, çıkış ve muhasebeleşen hareket
özetleri gerçek hesap/hareket satırlarından türetildi; çalışan evrak/fiş/hesap/
cari araması ile Tümü, Giriş, Çıkış, Muhasebeleşen ve Ters Kayıtlar filtreleri
eklendi. Manuel hareket ve çift taraflı virman formları mevcut server action,
aktif hesap, P0 baz para, yetki ve dönem guard'larını korur. Hesap tanımları
aynı route içinde create/update/pasifleştirme/import/export davranışlarıyla
korundu; ikinci sayfa başlığı kaldırıldı. Gerçek demo oturumuyla 1440 × 1200
masaüstü üst görünüm, manuel hareket, virman ve hareket tablosu ile 390 × 1200
mobil üst/hareket baseline'ları
`Docs/UI-baseline/2026-07-18/phase-4/cash-bank/` altında production build
üzerinden kaydedildi. İki viewport'ta yatay belge taşması `0`, tek `h1`, dört
gerçek özet kartı, 19 gerçek hareket, iki aktif hesap, manuel form odağı ve
kilitli TL para birimi doğrulandı. Hedefli 40 testin ardından tam kapılarda
213 dosyada 1.163 test, type-check, Prisma validate, lint ve 74 sayfalık
production build hatasız geçti. Prisma şeması, migration, uygulama verisi,
mevcut finans server action/service sözleşmeleri ve özgün HTML şablonları
değiştirilmedi.

Çıkış kriteri: Kart, tablo, form ve finansal yüzey desenleri ortaklaştırılmış ve gerçek veriyle çalışıyor olmalı.

### Faz 5 — Mevcut modüllerin görsel dönüşümü

Önerilen grup sırası:

1. Cari ve operasyon: tedarikçiler, taşeronlar, şantiyeler.
2. Finansal belgeler: faturalar/irsaliye, giderler, çek, raporlar.
3. Stok ve insan kaynakları: stok/depo, personel, puantaj, bordro.
4. Doküman ve bildirim: doküman merkezi, bildirimler.
5. Yönetim: abonelik, araçlar, API yönetimi, e-Fatura, ayarlar.

`Ayarlar`, `Araçlar`, `İhale`, `API Yönetimi` gibi büyük yüzeyler alt sekme/panel bazında küçük dilimlere ayrılır. API ve e-Fatura için yalnız mevcut davranışı koruyan UI dönüşümü yapılır.

Durum — Tedarikçiler dilimi (18.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının Taşeronlar dilimiyle devam etme
kararı bu dilimin görsel kabul kaydıdır. AppShell v2 `/tedarikciler` route'una `v2-supplier-pilot`
varyantıyla genişletildi. Sayfa kompozisyonu
`noa_i_n_aat_tedarik_iler.html` içindeki başlık, aksiyon çubuğu, kategori/
durum filtresi ve yoğun tedarikçi tablosu desenleriyle; Müşteriler pilotunda
kanıtlanan ortak cari kart, CRUD, import/export, tahsilat/ödeme ve hesap
ekstresi yapısına taşındı. Toplam/aktif tedarikçi, toplam alacak ve toplam borç
kartları gerçek scoped tedarikçi ve cari hareket satırlarından türetilir.
Kategori filtresi mevcut `category` alanıyla, arama ve durum filtresi aynı
gerçek satır setiyle çalışır; `/faturalar` bağlantısı gerçek alış faturası
route'una gider. Yeni tedarikçi formu mevcut yedi alanı, server action'ları,
tenant/firma/dönem kapsamını ve yetki guard'larını korur. Gerçek demo oturumuyla
1440 × 1200 masaüstü üst görünüm, yeni kayıt paneli ve hesap ekstresi ile
390 × 1200 mobil üst/liste baseline'ları
`Docs/UI-baseline/2026-07-18/phase-5/suppliers/` altında production build
üzerinden kaydedildi. İki viewport'ta yatay belge taşması `0`, tek `h1`, dört
gerçek özet kartı, beş gerçek tedarikçi, 33 cari hareket, yedi form alanı ve
`Kodu` ilk alan odağı doğrulandı. Hedefli 33 testin ardından tam kapılarda
213 dosyada 1.165 test, type-check, Prisma validate, lint ve 74 sayfalık
production build hatasız geçti. Prisma şeması, migration, uygulama verisi,
mevcut cari/finans action-service sözleşmeleri ve özgün HTML şablonları
değiştirilmedi.

Durum — Taşeronlar dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının Şantiyeler dilimiyle devam etme
kararı bu dilimin görsel kabul kaydıdır. AppShell v2 `/taseronlar` route'una `v2-subcontractor-pilot`
varyantıyla genişletildi. Sayfa kompozisyonu
`noa_i_n_aat_ta_eronlar.html` içindeki alt yüklenici sözleşme/hakediş odağı,
başlık, aksiyon çubuğu, filtre ve yoğun tablo desenleriyle; ortak cari kart,
CRUD, import/export, tahsilat/ödeme ve hesap ekstresi yapısına taşındı.
Toplam/aktif/sözleşmeli taşeron ile toplam borç kartları gerçek scoped taşeron
ve cari hareket satırlarından türetilir. Yeni sözleşmeli/sözleşmesiz filtresi
mevcut `contractNo` alanını kullanır; durum filtresi ve arama aynı gerçek satır
setinde çalışır. `/hakedis` bağlantısı mevcut gerçek hakediş route'una gider.
Yeni taşeron formu mevcut dokuz alanı, server action'ları, hakediş ve finans
bağlantılarını, tenant/firma/dönem kapsamını ve yetki guard'larını korur. Gerçek
demo oturumuyla 1440 × 1200 masaüstü üst görünüm, yeni kayıt paneli ve ödeme/
hesap ekstresi ile 390 × 1200 mobil üst/liste baseline'ları
`Docs/UI-baseline/2026-07-19/phase-5/subcontractors/` altında production build
üzerinden kaydedildi. İki viewport'ta yatay belge taşması `0`, tek `h1`, dört
gerçek özet kartı, dört gerçek taşeron, 33 cari hareket, dokuz form alanı ve
`Kodu` ilk alan odağı doğrulandı. Hedefli 35 testin ardından tam kapılarda
213 dosyada 1.167 test, type-check, Prisma validate, lint ve 74 sayfalık
production build hatasız geçti. Prisma şeması, migration, uygulama verisi,
mevcut hakediş/cari/finans action-service sözleşmeleri ve özgün HTML şablonları
değiştirilmedi.

Durum — Şantiyeler dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının Faturalar/İrsaliye dilimiyle devam
etme kararı bu dilimin görsel kabul kaydıdır. AppShell v2 `/santiyeler` route'una `v2-site-pilot` varyantıyla
genişletildi. `noa_i_n_aat_antiyeler.html` ile
`noa_i_n_aat_antiye_finans_analiz_panosu.html` içindeki proje yönetimi, özet
kartları ve finans tablosu desenleri mevcut `SiteManagementSurface` ile
birleştirildi. Aktif şantiye, toplam gelir, toplam maliyet ve net sonuç kartları
gerçek scoped şantiye, satış faturası, gider, alış faturası ve hakediş
satırlarından türetilir; iptal kayıtlarını dışlayan mevcut finans read-model'i
korunur. Finans tablosu gelir, gider, alış, taşeron hakedişi ve net sonucu
şantiye kodunda gösterir; negatif/pozitif durumlar ayrıştırılır. `/hakedis` ve
`/giderler` bağlantıları gerçek route'lara gider. Ortak şantiye kart alanında
CRUD, import/export, arama, Tümü/Aktif/Pasif filtreleri ve altı mevcut form alanı
server action, tenant/firma/dönem ve yetki sözleşmeleriyle korunur. Gerçek demo
oturumuyla 1440 × 1200 masaüstü üst görünüm, kart listesi ve yeni kayıt paneli
ile 390 × 1200 mobil üst/kart baseline'ları
`Docs/UI-baseline/2026-07-19/phase-5/sites/` altında production build üzerinden
kaydedildi. İki viewport'ta yatay belge taşması `0`, tek `h1`, yedi gerçek
şantiye kartı, sekiz hareketli finans satırı, altı form alanı ve `Kodu` ilk alan
odağı doğrulandı. Hedefli 35 testin ardından tam kapılarda 214 dosyada 1.169
test, type-check, Prisma validate, lint ve 74 sayfalık production build hatasız
geçti. Prisma şeması, migration, uygulama verisi, mevcut şantiye/finans
action-service sözleşmeleri ve özgün HTML şablonları değiştirilmedi. Görsel
kabul sonrası sıradaki bağımsız Faz 5 dilimi Faturalar/İrsaliye'dir.

Durum — Faturalar/İrsaliye dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının Giderler dilimiyle devam etme kararı bu dilimin görsel kabul kaydıdır. AppShell v2 `/faturalar` route'una `v2-invoice-pilot`
varyantıyla genişletildi. `noa_i_n_aat_faturalar_ve_i_rsaliyeler.html`
şablonundaki tek başlık, belge özet kartları ve masaüstünde dikey/mobilde
yatay sekme deseni, mevcut `InvoiceManagementSurface` üzerinde uygulandı.
Alış hacmi, satış hacmi, taslak belge ve kesinleşmiş alış irsaliyelerinden gelen
depo giriş miktarı yalnız gerçek scoped belge satırlarından türetilir; iptal
faturalar finansal hacimlere dahil edilmez. Alış faturası, satış faturası ve
alış irsaliyesi alt yüzeyleri aynı gerçek Yeni/Kaydet/Kesinleştir/İptal,
ödeme-tahsilat, PDF önizleme, stok girişi, audit ve ledger akışlarıyla korunur;
yalnız v2 çalışma alanı içinde yinelenen başlık ve metrikleri gizlenir. Gerçek
muhasebe demo oturumuyla 1440 × 1200 alış, satış, irsaliye ve yeni alış faturası
formu ile 390 × 1200 mobil alış/irsaliye baseline'ları
`Docs/UI-baseline/2026-07-19/phase-5/invoices-delivery-notes/` altında
production build üzerinden kaydedildi. İki viewport'ta tek `h1`, üç belge
sekmesi ve belge düzeyinde yatay taşma `0` doğrulandı; görseller sırasında
mutasyon gönderilmedi. Hedefli 37 testin ardından tam kapılarda iki-worker
Vitest koşumunda 214 dosyada 1.171 test, type-check, Prisma validate, lint ve
74 sayfalık production build hatasız geçti. Prisma şeması, migration, uygulama
verisi, mevcut fatura/irsaliye action-service sözleşmeleri ve özgün HTML
şablonları değiştirilmedi. Görsel kabul sonrası sıradaki bağımsız Faz 5 dilimi
Giderler'dir.
Durum — Giderler dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından görsel olarak kabul edildi.** Kullanıcının Çek dilimiyle devam etme kararı bu dilimin görsel kabul kaydıdır.
AppShell v2 `/giderler` route'una `v2-expense-pilot` varyantıyla genişletildi.
`noa_i_n_aat_gider_y_netimi.html` şablonundaki yönetim başlığı, hızlı giriş,
son giderler, filtre ve dağılım desenleri; mevcut `ExpenseSurface` ile
birleştirildi. Toplam gider, bu ay, KDV ve ödeme bağlantısı kartları yalnız
iptal edilmemiş gerçek scoped gider ve kasa/banka hareketlerinden türetilir.
Arama ve hareket grubu filtresi gerçek belge, şantiye, cari, açıklama ve
`movementGroup` verisi üzerinde çalışır; gider dağılımı da aynı gerçek grupların
tutar/oran görünümüdür. Yeni gider kaydı; mevcut şantiye, ödeme hesabı, KDV,
kasa/banka çıkışı ve ledger fişi akışını aynen korur. Gerçek muhasebe demo
oturumuyla 1440 × 1200 üst görünüm, yeni gider formu ve gider dağılımı ile
390 × 1200 mobil baseline'ları `Docs/UI-baseline/2026-07-19/phase-5/expenses/`
altında production build üzerinden kaydedildi. İki viewport'ta tek `h1`, dört
özet kartı ve belge düzeyinde yatay taşma `0` doğrulandı; görseller sırasında
mutasyon gönderilmedi. Hedefli 15 testin ardından tam kapılarda iki-worker
Vitest koşumunda 214 dosyada 1.173 test, type-check, Prisma validate, lint ve
74 sayfalık production build hatasız geçti. Prisma şeması, migration, uygulama
verisi, mevcut gider action-service sözleşmeleri ve özgün HTML şablonları
değiştirilmedi. Görsel kabul sonrası sıradaki bağımsız Faz 5 dilimi Çek'tir.

Durum — Çek dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından görsel olarak kabul edildi.** Kullanıcının Raporlar dilimiyle devam etme kararı bu dilimin görsel kabul kaydıdır.
AppShell v2 `/cek` route'una `v2-cheque-pilot` varyantıyla genişletildi. Doğrudan
bir çek şablonu bulunmadığından, planın finans ailesi kararı uyarınca
`noa_i_n_aat_kasa_banka.html` ve `noa_i_n_aat_gider_y_netimi.html` içindeki
çalışma alanı, özet kartı, filtre ve yoğun tablo desenleri mevcut
`ChequeSurface` üzerinde uygulandı. Portföy toplamı, tahsil toplamı, portföy
adedi ve 30 gün içindeki vade kartı yalnız gerçek scoped çek satırlarından
türetilir. Evrak/çek no/banka/cari araması ile durum filtresi aynı gerçek satır
seti üzerinde çalışır; yazdırma bildirimi de filtrelenmiş görünür listeyi esas
alır. Yeni çek, seçili kasa/banka hesabına tahsil, kasa/banka hareketi, ledger
fişi, audit geçmişi, yetki ve tenant/firma/dönem sözleşmeleri korunmuştur.
Gerçek muhasebe demo oturumuyla 1440 × 1200 masaüstü üst görünüm ve yeni çek
formu ile 390 × 1200 mobil baseline'ları
`Docs/UI-baseline/2026-07-19/phase-5/cheques/` altında production build
üzerinden kaydedildi. İki viewport'ta tek `h1`, v2 kabuk ve belge düzeyinde
yatay taşma `0` doğrulandı; görseller sırasında mutasyon gönderilmedi.
Hedefli 25 test ile tam test paketi, Prisma validate, type-check, lint ve
production build hatasız geçti. Prisma şeması, migration, uygulama verisi,
mevcut çek action/service sözleşmeleri ve özgün HTML şablonları değiştirilmedi.
Görsel kabul sonrası sıradaki bağımsız Faz 5 dilimi Raporlar'dır.

Durum — Raporlar dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından görsel olarak kabul edildi.** Kullanıcının Stok/Depo dilimiyle devam etme kararı bu dilimin görsel kabul kaydıdır.
AppShell v2 `/raporlar` route'una `v2-reports-pilot` varyantıyla genişletildi.
`noa_i_n_aat_rapor_merkezi.html` içindeki Rapor Merkezi başlığı, filtre çalışma
alanı, finans/operasyon rapor kartları ve çıktı yönlendirme desenleri mevcut
`ReportsSurface` üzerinde uygulandı. Kartlar; şantiye kârlılık, nakit akış
özeti, cari ekstre ile hakediş/işçilik özetinin mevcut canlı bölümlerine
erişilebilir bağlantılar verir. Kaynak, tarih aralığı ve cari filtreleri;
operasyon özeti, tablolar, CSV indirmeleri ve yazdırma kapsamında ortak gerçek
satır kümesini kullanmaya devam eder. Kasa/banka, çek, fatura, gider, hakediş,
puantaj ve maaş read-model hesapları, scoped route verisi ve mevcut CSV/yazdırma
davranışı korunmuştur; sahte projeksiyon, PDF/Excel entegrasyonu veya yeni veri
modeli eklenmemiştir. Gerçek muhasebe demo oturumuyla 1440 × 1200 masaüstü,
Gider kaynak filtresi ve 390 × 1200 mobil baseline'ları
`Docs/UI-baseline/2026-07-19/phase-5/reports/` altında production build
üzerinden kaydedildi. İki viewport'ta tek `h1`, v2 kabuk, dört çalışan rapor
kısayolu ve belge düzeyinde yatay taşma `0` doğrulandı; görseller sırasında
mutasyon gönderilmedi. Hedefli 32 test ile tam test paketi, Prisma validate,
type-check, lint ve production build hatasız geçti. Prisma şeması, migration,
uygulama verisi, rapor service/export sözleşmeleri ve özgün HTML şablonları
değiştirilmedi. Görsel kabul sonrası sıradaki bağımsız Faz 5 dilimi Stok/Depo'dur.

Durum — Stok/Depo dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının Personel dilimiyle devam etme kararı
bu dilimin görsel kabul kaydıdır.
AppShell v2 `/stok-depo` route'una `v2-stock-depot-pilot` varyantıyla genişletildi.
`noa_i_n_aat_stok_depo.html` ile `noa_i_n_aat_stok_depo_y_netimi.html`
şablonlarındaki yönetim başlığı, dört özet kartı, filtre çalışma alanı,
stok/depo tablosu ve hareket odaklı düzen; mevcut depo read-modeli üzerinde
uygulandı. Depolu kalem, mevcut miktar, stok değeri ve minimum altı kartları
yalnız filtrelenmiş gerçek hareket ve minimum eşiklerinden türetilir. Arama,
tarih ve depo filtresi; özet, hareket tablosu, CSV ve yazdırma kapsamına
birlikte uygulanır. Route içindeki depo özeti üst çalışma alanına alındı;
stok kartı yüzeyinin başlığı gizlenerek tek `h1` standardı sağlandı. Stok kartı
CRUD/import/export, transfer/şantiye çıkışı taslak-kesinleştirme-iptal-audit
yaşam döngüsü, minimum ayarı ve scoped veriler korunmuştur. Gerçek muhasebe
demo oturumuyla 1440 × 1200 üst görünüm, gerçek arama filtresi, transfer formu
ve 390 × 1200 mobil baseline'ları
`Docs/UI-baseline/2026-07-19/phase-5/stock-depot/` altında production build
üzerinden kaydedildi. İki viewport'ta tek `h1`, dört özet kartı ve belge
düzeyinde yatay taşma `0` doğrulandı; görseller sırasında mutasyon gönderilmedi.
Hedefli stok/kabuk testleri ile tam test paketi, Prisma validate, type-check,
lint ve production build hatasız geçti. Prisma şeması, migration, uygulama
verisi, stok/depo service-action sözleşmeleri ve özgün HTML şablonları
değiştirilmedi.

Durum — Personel dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının Puantaj dilimiyle devam etme kararı
bu dilimin görsel kabul kaydıdır.
AppShell v2 `/personel` route'una `v2-personnel-pilot` varyantıyla genişletildi.
`noa_i_n_aat_personel_y_netimi.html` ile
`noa_i_n_aat_personel_ve_maa_y_netimi.html` şablonlarındaki insan kaynakları
başlığı, çalışan özeti ve maaş ödeme kartları; mevcut personel kartı, zimmet ve
maaş tahakkuku yüzeylerini koruyan tek çalışma alanında uygulandı. Toplam/aktif
personel, aktif şantiye, bekleyen ödeme ve tamamlanan ödeme metrikleri yalnız
tenant/firma/dönem kapsamında yüklenen gerçek personel, şantiye, tahakkuk ve
kasa/banka hareketlerinden türetilir. Kesinleşmemiş veya iptal tahakkuklar
bekleyen ödeme toplamına alınmaz; ödeme hareketi yalnız ilgili tahakkukun gerçek
`payroll-accrual` kaynağıyla eşleşirse tamamlanmış sayılır. Personel kartı CRUD,
import/export, zimmet yaşam döngüsü, puantajdan tahakkuk oluşturma, kesinleştirme,
iptal, maaş ödeme, audit ve ledger sözleşmeleri değiştirilmedi. Personel kartı
listesinin eski başlığı gizlenerek tek `h1` standardı sağlandı. Gerçek muhasebe
demo oturumuyla 1440 × 1100 masaüstü ve 390 × 844 mobil baseline'ları
`Docs/UI-baseline/2026-07-19/phase-5/personnel/` altında production build
üzerinden kaydedildi. İki viewport'ta v2 kabuk, tek `h1`, dört gerçek özet kartı
ve belge düzeyinde yatay taşma `0` doğrulandı; görsel kontrol sırasında mutasyon
gönderilmedi. Hedefli bileşen/kabuk testleri ve tam test paketi (215 dosya,
1.179 test), Prisma validate, type-check, lint, diff denetimi ve production
build hatasız geçti. Prisma şeması, migration, uygulama verisi, mevcut personel,
zimmet, tahakkuk ve ödeme action/service sözleşmeleri ile özgün HTML şablonları
değiştirilmedi.

Durum — Puantaj dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının Bordro dilimiyle devam etme kararı
bu dilimin görsel kabul kaydıdır.
AppShell v2 `/puantaj` route'una `v2-timesheet-pilot` varyantıyla genişletildi.
`noa_i_n_aat_puantaj_cetveli.html`,
`noa_i_n_aat_puantaj_cetveli_veri_giri_i.html` ve
`noa_i_n_aat_puantaj_aktar_m_ve_fazla_mesai.html` şablonlarındaki aylık cetvel
başlığı, çalışma günü/mesai/net ödeme özetleri, kayıt araması ve durum filtreleri
mevcut `TimesheetSurface` üzerinde uygulandı. Arama; puantaj no, şantiye,
taşeron ve gerçek satırlardaki personel kodu/adını kapsar. Tümü, Taslak,
Kaydedildi ve İptal filtreleri; üst sayaç, dört özet kartı, hareket listesi ve
yazdırma kapsamında aynı görünür scoped kayıt kümesini kullanır. Yeni puantaj
girişi, gerçek hesap önizlemesi, kaydetme, kesinleştirme, iptal, RBAC, audit ve
Personel içindeki maaş tahakkuku kaynak bağlantısı korunmuştur; şablondaki
kalıcı fazla mesai kuralı/aktarım ayarları için yeni veri modeli oluşturulmadı.
Gerçek muhasebe demo oturumuyla 1440 × 1100 masaüstü, kesinleşen filtre sonucu
ve 390 × 844 mobil baseline'ları
`Docs/UI-baseline/2026-07-19/phase-5/timesheets/` altında production build
üzerinden kaydedildi. İki viewport'ta v2 kabuk, tek `h1`, dört gerçek özet
kartı ve belge düzeyinde yatay taşma `0` doğrulandı; görsel kontrol sırasında
mutasyon gönderilmedi. Hedefli puantaj/kabuk testleri ve tam test paketi (215
dosya, 1.181 test), Prisma validate, type-check, lint, diff denetimi ve
production build hatasız geçti. Prisma şeması, migration, uygulama verisi,
mevcut puantaj action/service sözleşmeleri ve özgün HTML şablonları
değiştirilmedi.

Durum — Bordro dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** Kullanıcının Doküman Merkezi dilimiyle devam etme
kararı bu dilimin görsel kabul kaydıdır.
`/personel` içindeki mevcut `PayrollAccrualSurface`,
`noa_i_n_aat_personel_ve_maa_y_netimi.html` şablonunun maaş tahakkuk özeti,
kesinti ve ödeme yönetimi düzeniyle bordro çalışma alanına dönüştürüldü. Net
bordro ve kesinti özetleri ile tahakkuk, taslak, ödenen, ödeme bekleyen ve
bekleyen puantaj kartları yalnız görünür gerçek kayıt kümesinden türetilir.
Tahakkuk/puantaj/şantiye/personel araması ile Tümü, Taslak, Ödeme Bekleyenler,
Ödenmiş ve İptal Kayıtları filtreleri; bordro özeti, tahakkuk listesi ve yazdırma
kapsamını birlikte değiştirir. Ödendi durumu yalnız gerçek
`payroll-accrual` kaynaklı `Maaş Ödemesi` hareketiyle belirlenir; seçili ödeme
hesabı, kesinleştirme, iptal, ödeme oluşturma, ledger fişi ve audit görünürlüğü
korunmuştur. Şablondaki SGK/vergi kuralları, resmi bordro üretimi ve yeni fazla
mesai kural modeli mevcut altyapıda olmadığı için sahte olarak eklenmedi.
Gerçek muhasebe demo oturumuyla 1440 × 1100 masaüstü, Ödenmiş filtre sonucu ve
390 × 844 mobil baseline'ları
`Docs/UI-baseline/2026-07-19/phase-5/payroll/` altında production build
üzerinden kaydedildi. İki viewport'ta v2 kabuk, tek `h1`, bordro çalışma alanı
ve belge düzeyinde yatay taşma `0` doğrulandı; görsel kontrol sırasında mutasyon
gönderilmedi. Hedefli bordro testleri ve tam test paketi (215 dosya, 1.182
test), Prisma validate, type-check, lint, diff denetimi ve production build
hatasız geçti. Prisma şeması, migration, uygulama verisi, mevcut tahakkuk/ödeme
action-service sözleşmeleri ve özgün HTML şablonları değiştirilmedi. Görsel
kabul sonrası sıradaki bağımsız Faz 5 dilimi Doküman Merkezi'dir.

Durum — Doküman Merkezi dilimi (19.07.2026): **Tamamlandı ve kullanıcı
tarafından görsel olarak kabul edildi.** Kullanıcının Bildirimler dilimiyle
devam etme kararı bu dilimin görsel kabul kaydıdır. AppShell v2
`/dokuman-merkezi` route'una
`v2-document-center-pilot` varyantıyla genişletildi.
`noa_i_n_aat_d_k_man_merkezi_dosya_y_kleme.html` ve mobil Doküman Merkezi
şablonlarındaki depolama özeti, sistem klasörleri, son dosya erişimi ve belirgin
yükleme düzeni; mevcut `DocumentCenterSurface` üzerinde tek çalışma alanına
uyarlandı. Birleşik arama dosya adı, klasör, yükleyen ve bağlı modül kayıt
bilgisini kapsar; tür, depo görünürlüğü, sekme ve ızgara/liste kontrolleri gerçek
görünür kayıt kümesini değiştirir. Aktif dosya ve çöp sayaçları gerçek yüklenen
kayıtlardan türetilir. Dosya yükleme/indirme, modül kaydı bağlantısı, klasör
oluşturma/adlandırma/silme, dosya adlandırma, 30 günlük çöp ve geri alma akışları
ile tenant/firma/dönem kapsamı, RBAC ve audit sözleşmeleri korunmuştur. Şablondaki
bulut paket satın alma ve gerçek altyapısı bulunmayan paylaşım işlevleri sahte
olarak eklenmedi. Gerçek muhasebe demo oturumuyla 1440 × 1000 masaüstü, PDF
filtre durumu ve 390 × 844 mobil baz çizgileri
`Docs/UI-baseline/2026-07-19/phase-5/document-center/` altında production build
üzerinden kaydedilip görsel olarak doğrulandı; doğrulama sırasında mutasyon
gönderilmedi. Hedefli Doküman Merkezi/kabuk testleri (39 test) ile tam test
paketi (215 dosya, 1.184 test), Prisma validate, type-check, lint, diff denetimi
ve production build hatasız geçti. Prisma şeması, migration, uygulama verisi,
mevcut Doküman Merkezi action/service sözleşmeleri ve özgün HTML şablonları
değiştirilmedi. Görsel kabul sonrası sıradaki bağımsız Faz 5 dilimi
Bildirimler'dir.

Durum — Bildirimler dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.** AppShell v2 `/bildirimler` route'una
`v2-notification-center-pilot` varyantıyla genişletildi.
`noa_i_n_aat_bildirimler.html` ve `noa_i_n_aat_bildirim_ayarlar.html`
şablonlarındaki kategori paneli, yeni/önceki bildirim ayrımı, okunma filtresi,
öncelik görünürlüğü ve tercih düzeni; mevcut `NotificationCenterSurface`
üzerinde tek çalışma alanına uyarlandı. Birleşik arama başlık, içerik, öncelik
ve kaynak kayıt numarasını kapsar; Tümü, Okunmamış ve Okundu filtreleri ile
kategori tercihleri listeyi ve dört özet sayacını aynı gerçek görünür kayıt
kümesinden üretir. Tümünü okundu işaretleme eylemi yalnız görünür okunmamış
kayıtlar için mevcut scoped tekil sunucu eylemlerini kullanır. Tekil okunma,
kategori tercihi, tenant/firma/dönem kapsamı, RBAC, audit ve gerçek kaynak kayıt
bağlantıları korunmuştur. Şablondaki e-posta/push kanal testleri ve altyapısı
olmayan cihaz bildirimleri sahte olarak eklenmedi. Gerçek muhasebe demo
oturumuyla 1440 × 1000 masaüstü, Okunmamış filtre durumu ve 390 × 844 mobil baz
çizgileri `Docs/UI-baseline/2026-07-19/phase-5/notifications/` altında production
build üzerinden kaydedildi. V2 kabuk, tek `h1` ve mobil belge düzeyinde yatay
taşma `0` doğrulandı; görsel doğrulama sırasında mutasyon gönderilmedi. Hedefli
Bildirim Merkezi/kabuk testleri (27 test) ile tam test paketi (215 dosya, 1.187
test), Prisma validate, type-check, lint, diff denetimi ve production build
hatasız geçti. Prisma şeması, migration, uygulama verisi, mevcut bildirim
action/service sözleşmeleri ve özgün HTML şablonları değiştirilmedi. Görsel
kabul sonrası sıradaki bağımsız Faz 5 dilimi Abonelik/Paketler'dir.

Durum — Abonelik/Paketler dilimi (19.07.2026): **Tamamlandı ve kullanıcının
Araçlar dilimine geçiş kararıyla görsel olarak kabul edildi.** AppShell v2
`/abonelik` route'una `v2-subscription-pilot` varyantıyla genişletildi.
`noa_i_n_aat_abonelik_ve_paketler.html` şablonundaki paket karşılaştırma,
mevcut plan, yenileme özeti, özellik erişim matrisi, eklenti ve ödeme geçmişi
düzeni; mevcut `SubscriptionSurface` üzerinde tek çalışma alanına uyarlandı.
Paket ve fatura dönemi seçimi, yenileme, eklenti yönetimi, erişim matrisi,
fatura/ödeme sağlayıcı olayları, tenant/firma/dönem kapsamı, RBAC, audit ve
kalıcılık sözleşmeleri korundu. Gerçek tahsilat entegrasyonu bulunmadığı için
çalışma alanında `Sandbox ödeme akışı · gerçek tahsilat yok` sınırı açıkça
gösterildi; sahte ödeme başarısı üretilmedi. Gerçek muhasebe demo oturumuyla
1440 × 1000 masaüstü, aylık plan seçimi ve 390 × 844 mobil baz çizgileri
`Docs/UI-baseline/2026-07-19/phase-5/subscription/` altında production build
üzerinden kaydedildi. V2 kabuk, tek `h1`, dört paket kartı ve belge düzeyinde
yatay taşma `0` doğrulandı; görsel doğrulama sırasında mutasyon gönderilmedi.
Hedefli Abonelik/Paketler ve kabuk testleri (43 test) ile tam test paketi (215
dosya, 1.188 test), Prisma validate, type-check, lint, diff denetimi ve
production build hatasız geçti. Prisma şeması, migration, uygulama verisi,
mevcut abonelik action/service sözleşmeleri ve özgün HTML şablonu
değiştirilmedi. Sıradaki bağımsız Faz 5 dilimi Araçlar'dır.

Durum — Araçlar dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.**
AppShell v2 `/araclar` route'una `v2-vehicle-fleet-pilot` varyantıyla
genişletildi. `noa_i_n_aat_ara_ve_filo_y_netimi.html`,
`noa_i_n_aat_ara_filo_takip_operasyon.html`,
`noa_i_n_aat_ara_bak_m_ve_servis_takvimi.html` ve mobil araç şablonundaki
filo özeti, bakım/servis uyarıları, operasyon takibi ve bölüm kısayolları;
mevcut `VehicleFleetSurface` üzerinde tek çalışma alanına uyarlandı. Araç kartı
oluşturma/güncelleme, iyimser eşzamanlılık çakışması, aktif/pasif yaşam döngüsü,
saha ve sürücü atamaları, uyarı/araç aramaları, bakım filtresi, audit geçmişi ve
CSV dışa aktarımı korunmuştur. Tenant/firma/dönem kapsamı, RBAC, audit,
kalıcılık ve mevcut action/service sözleşmeleri değiştirilmedi. Arvento verisi
sandbox read-model sınırında tutuldu; çalışma alanında `Arvento sandbox · canlı
GPS bağlantısı yok` ifadesi açıkça gösterildi ve gerçek telemetri entegrasyonu
varmış gibi davranılmadı. Gerçek muhasebe demo oturumuyla 1440 × 1000 masaüstü,
bakım filtresi ve 390 × 844 mobil baz çizgileri
`Docs/UI-baseline/2026-07-19/phase-5/vehicles/` altında production build
üzerinden kaydedildi. V2 kabuk, tek `h1`, üç bölüm kısayolu ve masaüstü/mobil
belge düzeyinde yatay taşma `0` doğrulandı; görsel doğrulama sırasında mutasyon
gönderilmedi. Hedefli Araçlar/kabuk testleri (49 test) ile tam test paketi (215
dosya, 1.189 test), Prisma validate, type-check, lint, diff denetimi ve
production build hatasız geçti. Prisma şeması, migration, uygulama verisi,
mevcut araç/Arvento action-service sözleşmeleri ve özgün HTML şablonları
değiştirilmedi. API Yönetimi ve e-Fatura daha önce tamamlanan kapsam olarak
yeniden açılmayacağından, görsel kabul sonrası sıradaki bağımsız Faz 5 dilimi
Ayarlar'dır.

Durum — Ayarlar dilimi (19.07.2026): **Tamamlandı ve kullanıcı tarafından
görsel olarak kabul edildi.**
AppShell v2 `/ayarlar` route'una `v2-settings-pilot` varyantıyla genişletildi.
`noa_i_n_aat_ayarlar.html` ve mobil Ayarlar şablonundaki yönetim merkezi,
firma bilgileri, finans tercihleri ve mobil hiyerarşi; mevcut `SettingsSurface`
üzerinde Firma/Finans, Kullanıcı/Yetki, Sandbox Bağlantıları ve Denetim
bölümlerine uyarlandı. Hızlı işlem sözleşmeleri, firma/finans salt okunur
politikaları, kullanıcı daveti ve yaşam döngüsü, RBAC matrisi, audit görünümü,
ledger kontrolü, banka mutabakatı ve Arvento bağlantı testi davranışları
korundu. Banka ve Arvento alanları açık sandbox sınırında tutuldu; gerçek dış
servis bağlantısı varmış gibi davranılmadı. Daha önce tamamlanan API Yönetimi
ve e-Fatura yüzeyleri değiştirilmedi. Gerçek muhasebe demo oturumuyla 1440 ×
1000 masaüstü, aktif kullanıcı araması ve 390 × 844 mobil baz çizgileri
`Docs/UI-baseline/2026-07-19/phase-5/settings/` altında production build
üzerinden kaydedildi. V2 kabuk, tek `h1`, dört bölüm kısayolu ve masaüstü/mobil
belge düzeyinde yatay taşma `0` doğrulandı; görsel doğrulama sırasında ayar,
kullanıcı, rol, banka, Arvento veya ledger mutasyonu gönderilmedi. Hedefli
Ayarlar/kabuk testleri (50 test) ile tam test paketi (215 dosya, 1.190 test),
Prisma validate, type-check, lint, diff denetimi ve production build hatasız
geçti. Prisma şeması, migration, uygulama verisi, mevcut ayar/entegrasyon/
kullanıcı/ledger action-service sözleşmeleri ve özgün HTML şablonları
değiştirilmedi. Ayarlar görsel kabulü Faz 5'i kapatacaktır; sıradaki planlı
çalışma Faz 6 Hakediş Pro alt programıdır.

Çıkış kriteri: Navigasyondaki tüm route'lar Template Standard v1 kullanmalı; eski rastgele surface stilleri kalmamalı.

### Faz 6 — Hakediş Pro alt programı

Amaç: 26 Hakediş Pro şablonunu mevcut inşaat hakediş domainine kontrollü biçimde uyarlamak.

Önerilen alt sıra:

1. Proje bilgileri ve sözleşme/poz listesi.
2. Hakediş listesi, detay, özet ve kapak.
3. Genel/demir metraj veri girişi.
4. İmalat çarşafı, yeşil defter ve miktar kontrolü.
5. Kesinti, tutanaklı işler ve fiyat revizyonu.
6. Muhasebe bağlantısı ve rapor merkezi.
7. Toplu aktarım ve simülasyon adayları.

Önce mevcut `ConstructionProject`, `ConstructionContractItem`, `ConstructionProgressPayment`, `ConstructionMeasurement*`, `ConstructionDeductionMovement`, `ConstructionFinancialMovement`, `ConstructionAccountingLink` ve diğer `Construction*` modelleri kullanılacaktır.

Çıkış kriteri: Mevcut hakediş hesapları, snapshot/idempotency/ledger davranışı ve gerçek kayıtlar korunmuş olmalı.

Durum — Faz 6 proje/sözleşme/poz dilimi (19.07.2026): **Tamamlandı ve kullanıcı
tarafından görsel olarak kabul edildi.** Kullanıcının hakediş listesi, detay,
özet ve kapak dilimine geçme kararı bu dilimin görsel kabul kaydıdır. AppShell v2 `/hakedis` route'una
`v2-progress-payment-pilot` varyantıyla genişletildi.
`hakedi_pro_proje_bilgileri.html`, proje/sözleşme detay, iş kalemleri/poz
listesi, yeni poz yan paneli ve mobil proje şablonlarındaki proje künyesi,
sözleşme özetleri, KPI dizilimi ve yoğun poz tablosu; mevcut
`ConstructionProgressPaymentSurface` üzerinde gerçek `ConstructionProject` ve
`ConstructionContractItem` kayıtlarına bağlandı. İlk proje otomatik açılır;
sözleşme numarası/bedeli, hesaplanan poz toplamı, son kümülatif tutar, poz
miktarı, birim fiyatı, toplamı ve revizyon numarası aynı çalışma alanında
görünür. Mevcut proje/poz oluşturma, hakediş taslağı, fiyat revizyonu, onay,
snapshot/idempotency, ledger, tenant/firma/dönem ve RBAC davranışları korundu.
Şablondaki mevcut modelde karşılığı olmayan idare ve sözleşme tarih alanları
uydurulmadı; yeni DB modeli açılmadı. Gerçek muhasebe demo oturumuyla 1440 ×
1000 genel görünüm, odaklı sözleşme/poz görünümü ve 390 × 844 mobil baz çizgisi
`Docs/UI-baseline/2026-07-19/phase-6/project-contract-items/` altında production
build üzerinden kaydedildi. Production verisinde 5 proje, 4 açık proje, 13 poz
ve 48.400.000,00 TL sözleşme toplamı doğrulandı. V2 kabuk, tek `h1`, iki bölüm
kısayolu ve masaüstü/mobil belge düzeyinde yatay taşma `0` doğrulandı; görsel
doğrulama sırasında proje, poz, fiyat revizyonu veya hakediş mutasyonu
gönderilmedi. Hedefli Hakediş Pro/hakediş/kabuk testleri (38 test) ile tam test
paketi (216 dosya, 1.192 test), Prisma validate, type-check, lint, diff denetimi
ve production build hatasız geçti. Prisma şeması, migration, uygulama verisi,
mevcut Construction action-service/repository sözleşmeleri ve özgün HTML
şablonları değiştirilmedi. Görsel kabul sonrası sıradaki bağımsız Faz 6 dilimi
Hakediş listesi, detay, özet ve kapaktır.

Durum — Faz 6 hakediş liste/detay/özet/kapak dilimi (19.07.2026): **Tamamlandı
ve kullanıcı tarafından görsel olarak kabul edildi.** Kullanıcının genel/demir
metraj veri girişi dilimine geçme kararı bu dilimin görsel kabul kaydıdır.
`hakedi_pro_hakedi_zeti.html`, iki masaüstü kapak
varyantı ve mobil hakediş özeti şablonlarının yoğun tablo, rapor seti, mali
icmal ve kapak kompozisyonu mevcut `ConstructionProgressPaymentSurface`
üzerine uyarlandı. Proje içindeki hakediş zinciri; belge, dönem, durum, cari
dönem ve kümülatif tutarlarla erişilebilir bir gerçek kayıt listesine dönüştü.
Seçili hakediş aynı `getConstructionProgressPaymentReportAction` read-model'i
üzerinden Kapak, Özet, Detay ve Rapor/Audit sekmelerini açar. Kapak; proje,
şantiye, sözleşme, dönem, durum, gerçek sözleşme poz toplamı ve dönem/kümülatif
tutarları; Özet mali icmal ve ek hareketleri; Detay ise Yeşil Defter ile İmalat
Çarşafı tablolarını gösterir. Yazdırma aksiyonu korundu; şablonlardaki gerçek
çıktı karşılığı bulunmayan PDF/paylaş aksiyonları eklenmedi. Onay, iade,
kesinleştirme, snapshot/idempotency, muhasebe bağlantısı, ledger,
tenant/firma/dönem ve RBAC davranışları değiştirilmedi; yeni DB alanı veya
migration açılmadı. Gerçek muhasebe demo oturumunda 5 proje, 4 açık proje, 13
poz ve 48.400.000,00 TL sözleşme toplamı; E2E hakedişinde 32.500,00 TL dönem,
97.500,00 TL kümülatif ve 30.875,00 TL net ödenecek tutar doğrulandı. 1440 ×
1000 liste/kapak/özet/detay ve 390 × 844 mobil kapak baz çizgileri
`Docs/UI-baseline/2026-07-19/phase-6/payment-list-detail-summary-cover/`
altında production build üzerinden kaydedildi. Tek `h1`, masaüstü ve mobil
belge düzeyinde yatay taşma `0` ve tarayıcı konsol hatası bulunmadığı
doğrulandı; görsel kontrolde yalnız salt-okunur rapor sekmeleri açıldı, hiçbir
hakediş mutasyonu gönderilmedi. Hedefli Hakediş Pro/hakediş/kabuk testleri (39
test) ile tam test paketi (216 dosya, 1.193 test), Prisma validate, type-check,
lint, diff denetimi ve production build hatasız geçti. Prisma şeması,
migration, action-service-repository sözleşmeleri, uygulama verisi ve özgün
HTML şablonları değiştirilmedi. Görsel kabul sonrası sıradaki bağımsız Faz 6
dilimi genel/demir metraj veri girişidir.

Durum — Faz 6 genel/demir metraj veri girişi dilimi (19.07.2026): **Tamamlandı
ve kullanıcı tarafından görsel olarak kabul edildi.** Kullanıcının imalat
çarşafı, yeşil defter ve miktar kontrolü dilimine geçme kararı bu dilimin
görsel kabul kaydıdır. Genel ve demir metraj şablonlarının sekmeli çalışma
alanı, ölçüm föyü listesi, özet metrikleri ve yoğun satır tablosu mevcut
`ConstructionProgressPaymentSurface` üzerine uyarlandı. Çalışma alanı gerçek
`ConstructionMeasurementSheet` ve `ConstructionMeasurementLine` verisini
kullanır; genel metrajda doğrudan miktar veya boy × en × yükseklik × çarpan,
demir metrajında doğrudan miktar veya boy × adet/çarpan alanları görünür.
Mevcut modelde bulunmayan çap ve birim ağırlık alanları uydurulmadı. Taslak ve
iade edilmiş hakedişlerde mevcut action/service akışıyla föy oluşturma, silme
ve satır düzenleme korunurken onaylı/kesinleşmiş hakedişlerde aynı alan
salt-okunur inceleme görünümü olarak açılır. Snapshot hesapları, durum
guard'ları, idempotency, ledger, tenant/firma/dönem ve RBAC davranışları
değiştirilmedi; Prisma şeması, migration, action, service veya repository
sözleşmesi açılmadı. Gerçek muhasebe demo oturumundaki kesinleşmiş E2E
hakedişinde `GEN-1` föyü, 2 satır ve toplam 6 metraj doğrulandı; production
verisinde demir föyü bulunmadığı için onun gerçek boş durumu kaydedildi. 1440 ×
1000 masaüstü ve 390 × 844 mobil genel/demir görselleri
`Docs/UI-baseline/2026-07-19/phase-6/general-rebar-measurement-entry/` altında
production build üzerinden kaydedildi. Tek `h1`, belge düzeyinde yatay taşma
`0` ve tarayıcı konsol hatası bulunmadığı doğrulandı; görsel kontrolde hiçbir
hakediş veya metraj mutasyonu gönderilmedi. Düzenlenebilir genel/demir sekme ve
satır davranışı hedefli bileşen testiyle; kesinleşmiş salt-okunur davranış ise
regresyon testiyle güvenceye alındı. Hedefli Hakediş Pro/hakediş/kabuk testleri
(40 test) ile tam test paketi (216 dosya, 1.194 test), Prisma validate,
type-check, lint, diff denetimi ve production build hatasız geçti. Uygulama verisi ve özgün HTML
şablonları değiştirilmedi. Görsel kabul sonrası sıradaki bağımsız Faz 6 dilimi
imalat çarşafı, yeşil defter ve miktar kontrolüdür.

Durum — Faz 6 imalat çarşafı/yeşil defter/miktar kontrolü dilimi (19.07.2026):
**Tamamlandı ve kullanıcı tarafından görsel olarak kabul edildi.** Kullanıcının
kesinti, tutanaklı işler ve fiyat revizyonu dilimine geçme kararı bu dilimin
görsel kabul kaydıdır. `hakedi_pro_i_malat_ar_af.html`,
`hakedi_pro_i_malat_ar_af_detay.html`, `hakedi_pro_ye_il_defter.html` ve iki
miktar kontrol şablonunun yoğun tablo, özet metrik, cari dönem vurgusu,
kümülatif ilerleme ve sözleşme bakiye kompozisyonları mevcut Hakediş Pro rapor
setine uyarlandı. Önceki Kapak/Özet/Detay/Rapor-Audit sekmeleri korunarak Yeşil
Defter, İmalat Çarşafı ve Miktar Kontrolü bağımsız erişilebilir sekmeler olarak
eklendi. Yeşil Defter sözleşme, önceki, cari, kümülatif ve kalan miktarı;
İmalat Çarşafı snapshot birim fiyatı, miktar ve önceki/cari/kümülatif tutarları;
Miktar Kontrolü ise aşım, tamamlanan, devam eden ve başlamayan pozları mevcut
`greenBook` ve `manufacturingSheet` read-model'lerinden türetiyor. Aşım uyarısı
ve negatif bakiye davranışı regresyon testiyle güvenceye alındı; şablonlardaki
kalıcı kontrol tamamlama, filtre ve dışa aktar aksiyonları gerçek domain
karşılığı olmadan eklenmedi. Snapshot/idempotency, durum guard'ları, ledger,
tenant/firma/dönem ve RBAC davranışları değiştirilmedi; Prisma şeması,
migration, action, service, repository veya API sözleşmesi açılmadı. Gerçek
muhasebe demo oturumundaki kesinleşmiş `E2E-HAK-002` belgesinde 2 poz, 18
kümülatif miktar, 97.500,00 TL kümülatif imalat ve 552.500,00 TL sözleşme
bakiyesi doğrulandı; sözleşme aşımı bulunmadığı için temiz kontrol durumu
kaydedildi. Üç görünümün 1440 × 1000 masaüstü ve 390 × 844 mobil baz çizgileri
`Docs/UI-baseline/2026-07-19/phase-6/manufacturing-green-book-quantity-control/`
altında production build üzerinden kaydedildi. Tek `h1`, masaüstü/mobil belge
düzeyinde yatay taşma `0` ve tarayıcı konsol hatası bulunmadığı doğrulandı;
görsel kontrolde hiçbir hakediş veya metraj mutasyonu gönderilmedi. Hedefli
Hakediş Pro paketi (6 dosya, 25 test) ile tam test paketi (216 dosya, 1.194
test), Prisma validate, type-check, lint, diff denetimi ve production build
hatasız geçti. Uygulama verisi ve özgün HTML
şablonları değiştirilmedi. Görsel kabul sonrası sıradaki bağımsız Faz 6 dilimi
kesinti, tutanaklı işler ve fiyat revizyonudur.

Durum — Faz 6 kesinti/tutanaklı işler/fiyat revizyonu dilimi (22.07.2026):
**Tamamlandı ve kullanıcı tarafından görsel olarak kabul edildi.** Kullanıcının
muhasebe bağlantısı ve rapor merkezi dilimine geçme kararı bu dilimin görsel
kabul kaydıdır. `hakedi_pro_kesintiler.html`,
`hakedi_pro_kesinti_hesaplama_kurallar.html`, `hakedi_pro_tutanakl_i_ler.html`,
`hakedi_pro_poz_detaylar_n_d_zenle.html` ve mobil kesinti kuralları şablonlarının
kart, sekme, yoğun tablo, durum ve özet kompozisyonları mevcut
`ConstructionProgressPaymentSurface` üzerine uyarlandı. Kesinleşmiş/onaylı
hakedişlerde salt-okunur, taslak/iade edilmiş hakedişlerde mevcut action akışını
kullanan düzenlenebilir Tutanaklı İşler, Kesintiler ve Finansal Hareketler
sekmeleri eklendi. Fiyat Revizyonu çalışma alanı; gerçek sözleşme pozlarını,
revizyon numarasını, güncel fiyatı ve fiyat geçmişini gösterir; proje kapalıyken
veya aktif hakediş tamamlanmamışken yeni revizyonu mevcut guard'larla kapatır.
Şablondaki otomatik kesinti kuralı/toggle yüzeyi için kalıcı kural modeli
bulunmadığından sahte kontrol eklenmedi; görünüm, hesaplanmış hakediş özeti ile
kaydedilmiş `ConstructionExtraWork`, `ConstructionDeductionMovement` ve
`ConstructionFinancialMovement` alt kayıtlarını birbirinden ayırır. Prisma
şeması, migration, action, service, repository veya API sözleşmesi
değiştirilmedi; snapshot/idempotency, ledger, tenant/firma/dönem ve RBAC
davranışları korundu. Gerçek muhasebe demo oturumundaki kapalı
`E2E-KUM-20260717-01` projesinin kesinleşmiş `E2E-HAK-002` belgesinde 1.625,00
TL hakediş özeti kesintisi, boş belgeli ek hareket alt listeleri, 2 sözleşme
pozu, 0 ek fiyat revizyonu ve 650.000,00 TL güncel poz toplamı doğrulandı.
1440 × 1000 masaüstü ile 390 × 844 mobil Tutanaklı İşler, Kesintiler ve Fiyat
Revizyonu baz çizgileri
`Docs/UI-baseline/2026-07-22/phase-6/deductions-extra-works-price-revision/`
altında production build üzerinden kaydedildi. Mobil grid çocuklarına eklenen
`min-w-0` sınırıyla paneller viewport içine alındı; tek `h1`, masaüstü/mobil
belge düzeyinde yatay taşma `0` ve tarayıcı konsol hatası bulunmadığı
doğrulandı. Görsel kontrolde sekme geçişleri dışında hiçbir hakediş, ek iş,
kesinti, finansal hareket veya fiyat revizyonu mutasyonu gönderilmedi. Hedefli
Hakediş Pro paketi (6 dosya, 25 test) ile tam test paketi (216 dosya, 1.194
test), Prisma validate, type-check, lint, diff denetimi ve production build
hatasız geçti. Uygulama verisi ve özgün HTML şablonları değiştirilmedi. Görsel
kabul sonrası sıradaki bağımsız Faz 6 dilimi muhasebe bağlantısı ve rapor
merkezidir.

Durum — Faz 6 muhasebe bağlantısı/rapor merkezi dilimi (22.07.2026):
**Tamamlandı ve kullanıcı tarafından görsel olarak kabul edildi.** Kullanıcının
toplu aktarım ve simülasyon adayları dilimine geçme kararı bu dilimin görsel
kabul kaydıdır.
`hakedi_pro_muhasebe_entegrasyonu.html`, `hakedi_pro_rapor_merkezi.html` ve
mobil muhasebe entegrasyonu şablonlarının yevmiye özetleri, hesap dağılımı,
durum kartları ve rapor kataloğu kompozisyonları mevcut
`ConstructionProgressPaymentSurface` üzerine uyarlandı. Muhasebe sekmesi,
kesinleştirme sırasında oluşturulmuş gerçek `ConstructionAccountingLink`
bağlantısını ve tenant/firma/dönem kapsamında bulunan `LedgerEntry` ile
`LedgerLine` kayıtlarını salt okunur gösterir; borç/alacak toplamı ve denge
farkı gerçek yevmiye satırlarından sunulur. Şablondaki hesap planı eşleştirme,
senkronizasyon ve “Muhasebeye Gönder” kontrolleri için kalıcı model ve iş akışı
bulunmadığından sahte aksiyon eklenmedi.

Rapor Merkezi; Kapak ve Özet, Mali İcmal, Genel/Demir Metraj, Yeşil Defter,
İmalat Çarşafı ve Miktar Kontrolü read-model'lerini altı durum kartında
toplar. Her `Aç` aksiyonu mevcut gerçek rapor sekmesine gider. Dosya üretim
altyapısı bulunmadığından çalışmayan Excel/PDF butonları eklenmedi. Prisma
şeması, migration, mutation action, service, repository ve API sözleşmesi
değiştirilmedi; snapshot/idempotency, ledger, tenant/firma/dönem ve RBAC
davranışları korundu. Gerçek muhasebe demo oturumundaki kapalı
`E2E-KUM-20260717-01` projesinin kesinleşmiş `E2E-HAK-002` belgesinde
`YVM-HAK-E2E-HAK-002` fişi, 3 yevmiye satırı, 37.050,00 TL borç/alacak toplamı,
0,00 TL denge farkı ve altı hazır rapor doğrulandı. 1440 × 1000 masaüstü ile
390 × 844 mobil Muhasebe ve Rapor Merkezi baz çizgileri
`Docs/UI-baseline/2026-07-22/phase-6/accounting-link-report-center/` altında
production build üzerinden kaydedildi. Tek `h1`, masaüstü/mobil belge düzeyinde
yatay taşma `0` ve tarayıcı konsol hatası bulunmadığı doğrulandı; görsel
kontrolde yalnız salt okunur sekme ve rapor geçişleri kullanıldı. Uygulama
Hedefli Hakediş Pro paketi (6 dosya, 25 test) ile tam test paketi (216 dosya,
1.194 test), Prisma validate, type-check, lint, diff denetimi ve production
build hatasız geçti. Uygulama verisi ve özgün HTML şablonları değiştirilmedi.
Görsel kabul sonrası sıradaki
bağımsız Faz 6 dilimi toplu aktarım ve simülasyon adaylarıdır; veri modeli
gerektiren adaylar ayrı F2 mini-RFC ve kullanıcı onayı olmadan uygulanmayacaktır.

Durum — Faz 6 toplu aktarım/simülasyon adayları dilimi (22.07.2026):
**Tamamlandı ve kullanıcı tarafından görsel olarak kabul edildi.**
`hakedi_pro_toplu_metraj_aktar_m.html`, mobil toplu metraj aktarımı ve
`hakedi_pro_poz_bazl_metraj_hesap_sim_lasyonu.html` şablonlarındaki dosya
doğrulama, durum özeti, poz seçimi ve etki hesabı kompozisyonları mevcut
Hakediş Pro rapor setine `Aktarım / Simülasyon` sekmesi olarak uyarlandı.
Tarayıcı içindeki CSV önizleme; `poz_no`, `miktar`, isteğe bağlı `aciklama` ve
`birim` sütunlarını okur, poz kodunu mevcut hakediş read-model'iyle eşleştirir,
yerelleştirilmiş sayıları çözer, tekrarlı/eksik/bilinmeyen pozları ve birim
uyuşmazlıklarını satır bazında gösterir. Dosya sunucuya gönderilmez ve hiçbir
DB yazımı veya audit olayı oluşmaz.

Poz bazlı simülasyon; doğrudan miktar ya da boy × en × yükseklik × çarpan
sonucunu mevcut `manufacturingSheet` snapshot'ındaki kümülatif miktar,
sözleşme miktarı ve birim fiyatla birleştirerek yeni kümülatif, kalan sözleşme,
aşım durumu ve tahmini dönem tutarını hesaplar. Sonuç metraj föyüne aktarılmaz
ve kaydedilmez. Şablondaki XLSX ayrıştırma, kalıcı sütun eşleme, toplu DB yazımı,
audit, idempotency ve rollback özellikleri mevcut action sözleşmesinde
bulunmadığından sahte aksiyon eklenmedi; bu başlıklar ayrı F2 mini-RFC ve
kullanıcı onayı sınırında bırakıldı. Prisma şeması, migration, server action,
service, repository ve API sözleşmesi değiştirilmedi.

Gerçek muhasebe demo oturumundaki kesinleşmiş `E2E-HAK-002` belgesinde örnek
CSV'nin bir hazır ve bir bilinmeyen poz satırı doğru ayrıldı. `BETON-C30` için
10 m³ öneri; 15 m³ mevcut kümülatiften 25 m³ yeni kümülatif, 75 m³ sözleşme
bakiyesi ve 15.000,00 TL tahmini dönem tutarı üretti. 1440 × 1000 masaüstü ile
390 × 844 mobil önizleme ve simülasyon baz çizgileri
`Docs/UI-baseline/2026-07-22/phase-6/bulk-import-simulation/` altında production
build üzerinden kaydedildi. Tek `h1`, masaüstü/mobil belge düzeyinde yatay
taşma `0` ve tarayıcı konsol hatası bulunmadığı doğrulandı. Görsel kontrolde
yalnız yerel CSV seçimi ve salt okunur hesaplama yapıldı; uygulama verisi ile
özgün HTML şablonları değiştirilmedi. Hedefli Hakediş Pro paketi (6 dosya, 25
test) ile tam test paketi (216 dosya, 1.194 test), Prisma validate, type-check,
lint, diff denetimi ve production build hatasız geçti. Görsel kabul sonrası
Faz 6 kapanacak ve
sıradaki planlı çalışma Faz 7 — F1 işlevsel iyileştirmeler olacaktır.

### Faz 7 — F1 işlevsel iyileştirmeler

Amaç: Şablonlarda güçlü olup projede altyapısı bulunan işlevleri yeni DB modeli açmadan görünür kılmak.

Adaylar:

- Audit günlüğü gelişmiş filtre ve detay görünümü.
- Mevcut banka hareketleri manuel eşleştirme UX'i.
- Firma ve şantiye finans read-model panoları.
- Hakediş muhasebe bağlantı görünürlüğü.
- Mevcut bildirim tercihleri, rol/yetki ve davet akışlarının gelişmiş UI'ı.
- Var olan veriyle üretilebilen kârlılık ve durum analizleri.

Her aday için “mevcut altyapı kanıtı + eksik UI + test” notu hazırlanır.

Durum — Faz 7 audit günlüğü gelişmiş filtre ve detay dilimi (22.07.2026):
**Tamamlandı ve kullanıcı tarafından görsel olarak kabul edildi.** Kullanıcının
firma ve şantiye finans read-model panolarıyla devam etme kararı bu dilimin
görsel kabul kaydıdır.

Mevcut altyapı kanıtı: `listLedgerAuditLogsAction`, scoped
`AuditLogEntry` read-model'i ve Prisma audit repository'si ledger-entry ile
ledger-period kayıtlarını aktif tenant, firma ve dönem kapsamında zaten
getiriyordu. Eksik UI yalnız fiş etiketi araması yapıyor; işlem, kullanıcı,
metadata, tarih aralığı, sonuç sayısı ve kayıt ayrıntısını görünür kılmıyordu.

`LedgerSurface` üzerinde serbest arama; işlem, başlangıç ve bitiş tarihi
filtreleri; filtre temizleme; sonuç sayacı; filtrelenmiş CSV ve açılır audit
detayı eklendi. Detay görünümü varlık tipi/ID, kullanıcı, zaman ve tüm metadata
anahtarlarını mevcut kayıt üzerinden gösterir. Mobilde ledger kapsayıcısı
küçülebilir hale getirildi; fiş satırı kontrolleri tek sütuna iner ve üst
aksiyonlar satır kırar. Prisma şeması, migration, server action, service,
repository, API, RBAC ve kalıcı veri değiştirilmedi.

Gerçek muhasebe demo oturumunda 20 scoped ledger audit kaydı yüklendi;
`E2E-HAK-002` araması sonucu 1 kayda indi ve
`YVM-HAK-E2E-HAK-002` detayında posted/TL, 3 satır, 37.050 TL borç/alacak ve
progress-payment kaynak metadata'sı doğrulandı. 1440 × 1000 masaüstü ile
390 × 844 mobil baz çizgileri
`Docs/UI-baseline/2026-07-22/phase-7/audit-log-advanced-filter-detail/`
altında production build üzerinden kaydedildi. Tek `h1`, belge düzeyinde ve
mobil ledger kapsayıcısında yatay taşma `0`, tarayıcı konsol hatası `0` olarak
ölçüldü. Hedefli Ayarlar/Ledger paketi (2 dosya, 30 test) ile tam test paketi
(216 dosya, 1.196 test), Prisma validate, type-check, lint, diff denetimi ve
production build hatasız geçti.

Durum — Faz 7 şantiye finans read-model panosu dilimi (22.07.2026):
**Tamamlandı ve kullanıcı tarafından görsel olarak kabul edildi.** Kullanıcının
Faz 7 kapanış adımıyla devam etme kararı bu dilimin görsel kabul kaydıdır.

Mevcut altyapı kanıtı: `summarizeOperationalReports` şantiye kârlılığını
kesinleşmiş alış/satış faturaları, giderler, hakedişler, bordro ve puantaj
kayıtları üzerinden zaten hesaplıyordu. `SiteManagementSurface` ise ayrı bir
hesaplama kullanıyor, taslakları dışlamıyor ve işçilik maliyetini göstermiyordu.
Bu nedenle aynı tenant/firma/dönem verisi Raporlar ve Şantiyeler ekranlarında
farklı sonuç üretebiliyordu.

Rapor servisindeki kârlılık satırı üreticisi ortak read-model fonksiyonu olarak
dışa açıldı ve şantiye finans özeti bu tek hesaplama kaynağına bağlandı. Yalnız
`Kaydedildi` durumundaki hareketler hesaba katılır; bordroya kaynak olmuş
puantajlar ikinci kez sayılmaz. Finans tablosuna `İşçilik` sütunu, toplam
maliyete işçilik katkısı, sıfır net sonuç için `Başa baş` durumu ve
`/raporlar#santiye-karlilik` bağlantısı eklendi. Prisma şeması, migration, API,
server action, mutation, RBAC ve kalıcı veri değiştirilmedi.

Gerçek muhasebe demo oturumunda 7 kayıtlı ve 6 finansal hareketli şantiye;
360.000 TL gelir, 1.650.325 TL maliyet ve -1.290.325 TL net sonuç doğrulandı.
İşçilik değerleri ilgili şantiye satırlarında görünür ve bordro/puantaj
mükerrerlik kuralıyla uyumludur. 1440 × 1000 masaüstü ve 390 × 844 mobil baz
çizgileri `Docs/UI-baseline/2026-07-22/phase-7/site-finance-read-model/`
altında production build üzerinden kaydedildi. Tek `h1`, belge ve finans bölümü
yatay taşması `0`, tarayıcı konsol hatası `0` olarak ölçüldü. Hedefli paket
(4 dosya, 23 test) ile tam test paketi (216 dosya, 1.196 test), Prisma validate,
type-check, lint, diff denetimi ve 74 sayfalık production build hatasız geçti.
Görsel kabul sonrası kalan Faz 7 adaylarının altyapı/UI/test kapanış matrisi
hazırlanmıştır.

Durum — Faz 7 F1 kapanış matrisi (22.07.2026): **Tamamlandı.**

| F1 adayı | Canlı altyapı ve UI kanıtı | Regresyon kanıtı | Sonuç |
|---|---|---|---|
| Audit günlüğü gelişmiş filtre/detay | `LedgerSurface`, `listLedgerAuditLogsAction`, scoped audit read-model | `ledger-surface.test.tsx` | Faz 7 diliminde tamamlandı |
| Banka hareketleri manuel eşleştirme | `SettingsSurface`; otomatik/manuel/kısmi aday, onay, yeniden açma ve recovery akışları | `settings-surface.test.tsx`, `bank-integration-service.test.ts` | Mevcut F1 kapsamı eksiksiz; yeniden açılmadı |
| Firma finans read-model panosu | `DashboardSurface`; dönem filtreli müşteri tahsilatı, tedarikçi/taşeron ödemesi ve net nakit akışı | `dashboard-surface.test.tsx` | Faz 4'te tamamlanmış mevcut UI doğrulandı |
| Şantiye finans read-model panosu | Ortak `buildOperationalSiteProfitRows`, `SiteManagementSurface` işçilik ve kârlılık görünümü | `site-finance-summary.test.ts`, `site-management-surface.test.tsx` | Faz 7 diliminde tamamlandı |
| Hakediş muhasebe bağlantısı | `ConstructionProgressPaymentSurface` Muhasebe sekmesi; gerçek yevmiye fişi, satırlar ve denge görünümü | `construction-progress-payment-surface.test.tsx` | Faz 6'da tamamlanmış mevcut UI doğrulandı |
| Bildirim tercihleri | `NotificationCenterSurface`, `setNotificationPreferenceAction` | `notification-center-surface.test.tsx` | Faz 5'te tamamlanmış mevcut UI doğrulandı |
| Rol/yetki ve davet akışları | `SettingsSurface`; rol güncelleme, davet oluşturma/yenileme/iptal ve durum filtreleri | `settings-surface.test.tsx` | Faz 5'te tamamlanmış mevcut UI doğrulandı |
| Kârlılık ve durum analizleri | `ReportsSurface`, ihale analiz/simülasyon yüzeyi ve ortak şantiye kârlılık read-model'i | `reports-surface.test.tsx`, `dashboard-surface.test.tsx`, `site-management-surface.test.tsx` | Var olan gerçek veriden üretilen kapsam tamamlandı |

Kapanışta yedi yüzey regresyon dosyası ve 74 test yeniden çalıştırılarak geçti.
Bir önceki şantiye finans diliminin aynı çalışma ağacındaki tam kalite kapıları
(216 dosya, 1.196 test, Prisma validate, type-check, lint, diff denetimi ve
74 sayfalık production build) yeşil kalmıştır. Kapanış matrisi yalnız belge
değişikliğidir; Prisma, migration, API, action, RBAC ve uygulama verisi
değiştirilmemiştir. Faz 7 tamamlanmıştır.

### Faz 8 — F2 veri modeli ve yeni iş kuralı adayları

Amaç: Yalnız gerçek değer üreten yeni özellikleri kontrollü eklemek.

Olası adaylar:

- Kesinti kural tanımları ve otomatik hesaplama.
- Toplu metraj import staging/doğrulama geçmişi.
- Kalıcı simülasyon senaryoları gerekiyorsa ihale/metraj senaryo modeli.
- Global arama için yetkili ve scoped indeks/read-model.

Her aday ayrı mini-RFC ve ayrı kullanıcı onayı gerektirir. Mini-RFC şunları içerir:

- Kullanıcı hikâyesi ve kabul kriterleri.
- Mevcut modelin neden yetmediği.
- Prisma diff, unique/index/scope ve relation kararı.
- Migration, nullable/default/backfill ve rollback yaklaşımı.
- RBAC, audit, idempotency ve period-state kuralları.
- Seed/E2E etkisi ve hedefli test listesi.

Durum — RFC-F8-01 Kesinti Kuralları (22.07.2026): **Onaylandı; Dilim 1 Domain
Çekirdeği tamamlandı.** Mevcut manuel kesinti hareketi, tek otomatik
`retentionRate` hesabı, hakediş durum zinciri, finalization/projection ve audit
altyapısı incelendi. Revizyonlu `ConstructionDeductionRule` ile gerçekleşen
değerleri donduran `ConstructionDeductionRuleApplication` modelleri önerildi.
Legacy teminat oranını ilk migration'da koruyan, kesinleşmiş hakedişi geriye
dönük değiştirmeyen ve çift sayımı engelleyen kademeli cutover tanımlandı.
RBAC, scope, açık dönem, idempotency, audit, migration/backfill/rollback, UI ve
zorunlu test matrisi `Docs/RFC-F8-01-kesinti-kurallari.md` belgesindedir. Bu
mini-RFC'si kullanıcı tarafından onaylandı. `construction-deduction-rule-service`
ile oran/maktu doğrulama, üç matrah tipi, deterministik sıralama, geçerlilik ve
revizyon çakışması, min/max, KDV, negatif ödenecek reddi ve application key
hesabı saf domain katmanında uygulandı. Hedefli paket 2 dosya/22 test, tam paket
217 dosya/1.206 test, Prisma validate, type-check, lint, diff denetimi ve 74
sayfalık production build ile doğrulandı. Bu dilimde şema, migration, action,
UI ve veri değiştirilmedi.

Durum — RFC-F8-01 Dilim 2 Şema ve Repository (22.07.2026): **Tamamlandı.**
İki yeni Prisma modeli, revizyon/application ilişkileri, unique ve scope
indexleri ile scoped repository eklendi. Migration mevcut pozitif retention
oranından aktif, `autoApply=false` bir `TEMINAT` revizyonu üretir; hakediş veya
kesinti hareketi oluşturmaz. Yerel DB doğrulamasında 1 kural ve 0 application
oluştu; hakediş sayısı 5, manuel kesinti sayısı 0 olarak değişmeden kaldı.
Hedefli paket 3 dosya/27 test, tam paket 218 dosya/1.211 test, Prisma generate,
validate, migrate deploy/status, type-check, lint, diff denetimi ve 74 sayfalık
production build geçti. Sıradaki dilim Önizleme ve Uygulama'dır.

### Faz 9 — Dark tema, son görsel kalite ve temizlik

Amaç: Light tema parity tamamlandıktan sonra tutarlı dark tema ve son kalite kapıları.

Teslimatlar:

- Class tabanlı tema tercihi ve flash önleme yaklaşımı.
- Tüm semantic tokenların dark karşılıkları.
- Kontrast, grafik, tablo, form, modal ve print doğrulaması.
- Geçici v2 flag/legacy alias ve kullanılmayan stillerin güvenli kaldırılması.
- Nihai sayfa matrisi ve kullanıcı dokümantasyonu.

## 9. Her Dikey Dilimin Uygulama Akışı

1. İlgili master plan ve sayfa matrisini oku.
2. İlgili HTML şablon(lar)ını ve canlı surface/action/service/testleri incele.
3. Kod değişecekse ilgili `node_modules/next/dist/docs/` rehberini tamamen oku.
4. Korunacak iş akışlarını ve görsel kabul görüntüsünü yaz.
5. Gerekli hedefli regresyon testini önce veya değişiklikle birlikte ekle.
6. Küçük UI/domain değişikliğini uygula.
7. Gerçek veriyle route smoke ve responsive/görsel kontrol yap.
8. Hedefli testleri çalıştır.
9. Tam kapıları çalıştır.
10. Tek, yalın durum kaydıyla planı güncelle ve sonraki dilimi belirt.

## 10. Doğrulama ve Kabul Kapıları

### 10.1 Her dilimde otomatik kapılar

```powershell
npm test
npm run type-check
npm run db:validate
npm run lint
npm run build
```

DB değişikliği varsa ayrıca migration uygulama/yeniden uygulama ve veri koruma doğrulaması yapılır. Kullanılabilir Git geri getirildiyse `git diff --check` de çalıştırılır.

### 10.2 Görsel kabul

- Kaynak HTML ile uygulama ekranı aynı viewport'ta yan yana karşılaştırılır.
- Shell, başlık, grid, kart, tablo, form, renk, spacing, radius, ikon ve state farkları kayıt altına alınır.
- Desktop ve mobile görüntü alınır; kritik form/tablolarda tablet de eklenir.
- Empty/loading/error/disabled/viewer durumları ayrıca doğrulanır.
- Görsel olarak benzeyen fakat çalışmayan kontrol kabul edilmez.

### 10.3 İş mantığı kabul

- Tenant/firma/dönem dışına veri sızıntısı yok.
- Viewer ve rol kısıtları korunuyor.
- Finansal toplamlar, ledger dengesi, belge durumu ve idempotency değişmiyor.
- Kesinleşmiş/iptal/kapalı dönem guard'ları korunuyor.
- Gerçek kayıtlar yenilemeden sonra görünür kalıyor.
- Yeni audit beklenen yerde oluşuyor; secret/ham exception audit'e sızmıyor.

### 10.4 Erişilebilirlik ve performans

- Klavye ve odak akışı.
- Label/aria/live region ve modal semantics.
- Kontrast ve reduced motion.
- Gereksiz client component, büyük görsel, font veya runtime CDN yok.
- Büyük tabloların render/scroll davranışında belirgin gerileme yok.

## 11. Rollback ve Değişiklik Güvenliği

- Faz 0 geri dönüş checkpoint'i, yerel ve uzak `main` üzerinde doğrulanan `af42701aa764adccb818f84fde42bccf5d3cfe93` commit'idir.
- Her dikey dilim temiz çalışma ağacından başlar; kullanıcıya ait ilişkisiz değişiklikler korunur ve kapsam dışında bırakılır.
- Tasarım dilimleri ayrı, küçük commit'lerle ilerler; tamamlanmış bir dilim sonraki geniş değişiklikle karıştırılmaz.
- Token geçişinde eski değişkenler pilot bitene kadar alias olarak tutulur.
- AppShell ve sayfa dönüşümü route/variant allowlist ile kademeli açılır.
- Prisma migration ileri uyumlu ve mümkünse additive olur; destructive migration ayrı açık onay ister.
- Backfill gerekiyorsa önce dry-run/read-only rapor, sonra onaylı yazma adımı uygulanır.
- Bir dilim tam kapılardan geçmezse sonraki modüle ilerlenmez.

## 12. Onaylanan Varsayılan Kararlar

Kullanıcı 18.07.2026 tarihinde aşağıdaki varsayımların tamamını onaylamıştır:

1. UI dili Türkçe kalır.
2. Şablonun `#3525cd` ana rengi kabul edilir; geçiş legacy alias ile yapılır.
3. Özgün HTML'ler değişmeden referans kalır; standardizasyon React tasarım sistemi üzerinden yapılır.
4. Light tema önce tamamlanır; dark tema sonradan ayrı fazda uygulanır.
5. Material ikonları runtime CDN yerine yerel asset/font olarak kullanılır.
6. Profil fotoğrafı alanı eklenmez; baş harf avatarı kullanılır.
7. Global arama gerçek scoped arama tasarlanana kadar gösterilmez.
8. API/e-Fatura/webhook ve gerçek dış entegrasyon kapsamı yeniden açılmaz.
9. Her sayfa/modül ayrı küçük dilim ve görsel onay kapısıyla ilerler.
10. Yeni DB modeli/alanı F2 mini-RFC ve ayrı onay olmadan eklenmez.
11. Uygulama Faz 0 ile başlar; checkpoint ve baseline tamamlanmadan UI kodu değişmez.

## 13. Onay Sonrası Başlangıç Paketi

İlk uygulama paketi yalnız şunları kapsamalıdır:

1. Faz 0 checkpoint + baseline doğrulama.
2. Faz 1 dosya/route/surface matrisi ve Template Standard v1.
3. Faz 2'nin küçük bir token + primitive iskeleti.
4. AppShell v2 ve Dashboard için görsel pilot; diğer sayfalara yayılım yok.

Bu pilot kullanıcı tarafından görsel ve davranışsal olarak kabul edildikten sonra Müşteriler dilimine geçilir.

## 14. Nihai Tamamlanma Tanımı

Çalışma ancak aşağıdaki koşulların tamamı sağlandığında bitmiş sayılır:

- Navigasyondaki ve gerçek akışlardaki tüm sayfalar ortak Template Standard v1 kullanıyor.
- Şablon karşılığı olmayan sayfalar aynı tasarım ailesinde yeniden tasarlanmış.
- Statik/sahte HTML kontrolü uygulamada işlev varmış gibi görünmüyor.
- Tüm gerçek iş akışları, scope/RBAC/audit/ledger kuralları ve demo/E2E verisi korunmuş.
- Onaylanan F1/F2 özellikleri gerçek veri ve testlerle tamamlanmış.
- CDN/hotlink ve geçici legacy/v2 kodu temizlenmiş.
- Responsive, erişilebilirlik, görsel kabul ve tam otomatik kapılar yeşil.
- Master planın sayfa matrisi ve durum kayıtları güncel.

---

## Onay Kaydı

Kullanıcı onayı:

> **“HTML Şablon Entegrasyonu Master Planı'nı önerilen varsayımlarla onaylıyorum. Faz 0'dan başla.”**

Sonraki kapsam değişiklikleri bu onayı otomatik olarak genişletmez; F2 veri modeli adayları kendi mini-RFC ve ayrı onay kapılarını korur.

**Uygulama durumu — 22.07.2026 kapsamlı UI/UX standardizasyonu:** Uygulamanın tüm rotaları Template Standard v1 uyumlu ortak AppShell v2 kabuğunda birleştirildi; API/e-Fatura legacy kabuk ayrımı kaldırıldı. Ortak `PageHeader`, `MetricCard` ve `ActionBar` bileşenleri eklendi; legacy renk, yüzey, radius ve kontrol sınıfları semantic tokenlara geçirildi. 40 px form kontrolleri, 8/12 px radius ayrımı, tabular sayısal hizalama, mobil aksiyon yerleşimi ve erişilebilir status taşması merkezi çalışma alanı kuralları oldu. İş akışları, server action'lar, RBAC, scope, audit, ledger ve veri modeli değiştirilmedi.

**Uygulama durumu — 22.07.2026 Faz 9 dark tema temeli:** `.dark` kök sınıfına bağlı semantic koyu tema tokenları, `Sistem/Açık/Koyu` kabuk kontrolü ve `noa-theme` tarayıcı tercihi eklendi. Root layout bootstrap betiği tercihi hydration öncesinde uygulayarak ilk boyama tema sıçramasını önler; işletim sistemi değişimi yalnız Sistem modunda izlenir. Mobil drawer aynı tercih kontrolünü paylaşır, iki kontrol açıkken durum senkron kalır ve print tokenları açık/kontrastlı çıktıya döner. Dashboard ile Hakediş masaüstü, Hakediş 390 × 844 px mobil kabulünde tercih kalıcılığı ve taşmasız görünüm doğrulandı. İş akışı, DB ve dış entegrasyon değişmedi. Hedefli paket 3 dosya/31 test; tam paket 222 dosya/1.229 test, type-check, Prisma validate, lint, diff denetimi ve 74 sayfalık production build ile geçti.

**Uygulama durumu — 22.07.2026 Faz 9 semantic renk ve shell temizliği:** Route bazlı `v2-*-pilot` kabuk haritası, ulaşılamayan legacy shell ve geçici pilot adlandırmaları kaldırılarak tüm korumalı rotalar tek `standard` kabuk sözleşmesine alındı. Sabit Tailwind palet sınıfları ve doğrudan hex/RGB grafik renkleri semantic durum/vurgu/inverse tokenlarına geçirildi; legacy CSS alias katmanı kaldırıldı. Dashboard, Döküman Merkezi ve Ayarlar gerçek veriyle koyu temada görsel olarak kabul edildi; tek `h1`, standart shell ve çalışma anında sabit palet sınıfı bulunmaması doğrulandı. Domain, DB ve dış entegrasyon değişmedi. Hedefli paket 18 dosya/227 test; tam paket 222 dosya/1.229 test, type-check, Prisma validate, lint ve 74 sayfalık production build ile geçti. Faz 9'un sıradaki bağımsız dilimi route matrisi genelinde kontrast, tablo/form/modal/grafik ve print kabulüdür.
**Uygulama durumu — 22.07.2026 Faz 9 route matrisi kontrast ve çıktı kabulü:** 22 korumalı route standart shell, tek ana başlık, taşma ve ana içerik semantiği açısından tarandı. Light/dark semantic renk çiftleri WCAG AA eşiğine otomatik testle bağlandı; minimum oranlar light 4.52:1 ve dark 7.11:1 oldu. Yevmiye, mizan, puantaj, hakediş ve fatura tabloları erişilebilir adlara; manuel yevmiye alanları açık form adlarına kavuştu. Fatura PDF modalı ilk odak, odak döngüsü, Escape ve odak dönüşüyle; Dashboard grafikleri koyu temada gerçek veriyle kabul edildi. Print görünümü açık semantic palete dönüyor, global shell/interaktif aksiyonları gizliyor ve tablo sayfa kırılmalarını koruyor. Domain, DB ve iş akışları değişmedi. Hedefli paket 8 dosya/97 test; tam paket 222 dosya/1.232 test, type-check, Prisma validate, lint, diff denetimi ve 74 sayfalık production build ile geçti. Ayrıntılı kabul raporu `Docs/UI-baseline/Faz9-route-matrix-kabul-20260722.md` içindedir. Sıradaki Faz 9 dilimi nihai sayfa matrisi ve kullanıcı dokümantasyonudur.

**Uygulama durumu — 22.07.2026 Faz 9 nihai sayfa matrisi ve kullanıcı dokümantasyonu:** Faz 1 kaynak eşleştirmesi canlı 22 route ile uzlaştırıldı; 76/76 HTML şablonun hedefi ve 22/22 uygulama routeunun nihai surface, işlev, tema, responsive, erişilebilirlik ve çıktı durumu `Docs/HTML-template-page-matrix.md` içinde kapatıldı. Rol ve abonelik sınırları gerçek navigation/subscription guard kaynaklarıyla doğrulandı. `Docs/NOA-kullanici-rehberi.md` giriş, bağlam seçimi, 22 sayfanın amacı, temel finans/ihale/hakediş/personel/stok akışları, ayarlar, print/mobil/erişilebilirlik, sandbox sınırları ve sorun gidermeyi tek kullanıcı belgesinde toplar. F2-02 RFC-F8-01 sınırında tamamlandı; global arama, kalıcı simülasyon, kalıcı import geçmişi ve gerçek dış entegrasyonlar ayrı onay kapısında kalır. Kod, DB ve gerçek veri değiştirilmedi. Route/matris/rehber eşleştirmesi 22/22 doğrulandı; tam paket 222 dosya/1.232 test, type-check, Prisma validate, lint, diff denetimi ve 74 sayfalık production build ile geçti. Bu kayıtla Faz 9 ve HTML şablon entegrasyonu master planı kapanmıştır.
