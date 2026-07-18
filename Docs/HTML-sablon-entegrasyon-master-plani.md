# NOA İnşaat HTML Şablon Entegrasyonu — Master Prompt ve Uygulama Planı

> Durum: **TASLAK — kullanıcı onayı bekliyor**  
> Tarih: 18.07.2026  
> Uygulama sınırı: Bu belge onaylanmadan kaynak kodu, Prisma şeması, migration, veri veya şablon dosyaları değiştirilmeyecektir.

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
| Sürüm kontrolü | `.git` klasöründe yalnız `info/` var; kullanılabilir Git deposu yok | Uygulama öncesi zorunlu geri dönüş checkpoint'i oluşturulacak. |

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

Teslimatlar:

- Bu master planın ve önerilen varsayımların kullanıcı onayı.
- Kullanılabilir Git deposu geri getirilecek veya `backups/` altında tarihli, doğrulanmış kaynak + Prisma checkpoint'i alınacak.
- Mevcut veritabanı migration durumu ve demo/E2E veri kapsamı kayıt altına alınacak.
- Başlangıçta hedefli temel testler ve tam kapılar çalıştırılacak.
- Mevcut ana sayfaların referans ekran görüntüleri alınacak.

Çıkış kriteri: Geri dönüş noktası doğrulanmış ve mevcut hata/warning baseline'ı yazılmış olmalı.

### Faz 1 — Şablon envanteri ve Template Standard v1

Amaç: 76 dosyayı tek tasarım sözleşmesinde uyumlu hale getirmek.

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

Çıkış kriteri: Kart, tablo, form ve finansal yüzey desenleri ortaklaştırılmış ve gerçek veriyle çalışıyor olmalı.

### Faz 5 — Mevcut modüllerin görsel dönüşümü

Önerilen grup sırası:

1. Cari ve operasyon: tedarikçiler, taşeronlar, şantiyeler.
2. Finansal belgeler: faturalar/irsaliye, giderler, çek, raporlar.
3. Stok ve insan kaynakları: stok/depo, personel, puantaj, bordro.
4. Doküman ve bildirim: doküman merkezi, bildirimler.
5. Yönetim: abonelik, araçlar, API yönetimi, e-Fatura, ayarlar.

`Ayarlar`, `Araçlar`, `İhale`, `API Yönetimi` gibi büyük yüzeyler alt sekme/panel bazında küçük dilimlere ayrılır. API ve e-Fatura için yalnız mevcut davranışı koruyan UI dönüşümü yapılır.

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

- Uygulama öncesinde zorunlu checkpoint alınır; mevcut `.git` kullanılabilir bir repository değildir.
- Token geçişinde eski değişkenler pilot bitene kadar alias olarak tutulur.
- AppShell ve sayfa dönüşümü route/variant allowlist ile kademeli açılır.
- Prisma migration ileri uyumlu ve mümkünse additive olur; destructive migration ayrı açık onay ister.
- Backfill gerekiyorsa önce dry-run/read-only rapor, sonra onaylı yazma adımı uygulanır.
- Bir dilim tam kapılardan geçmezse sonraki modüle ilerlenmez.

## 12. Onay İçin Önerilen Varsayılan Kararlar

Plan aşağıdaki varsayımlarla onaya sunulmaktadır:

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

## 13. İlk Onaydan Sonraki Önerilen Başlangıç

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

## Onay İfadesi

Önerilen varsayımlarla devam etmek için:

> **“HTML Şablon Entegrasyonu Master Planı'nı önerilen varsayımlarla onaylıyorum. Faz 0'dan başla.”**

Değişiklik isteniyorsa madde numarası belirtilerek onaydan önce revize edilir.
