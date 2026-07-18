# Tanımlar CRUD Davranış Notu

Bu not, P0 Tanımlar modülleri için ilk ortak CRUD davranışını kayıt altına alır.

## Kapsam

İlk uygulanan standart şu modüller için geçerlidir:

- Şantiyeler
- Tedarikçiler
- Taşeronlar
- Personel
- Kasa/Banka
- Müşteri Cari Kartları (P1 başlangıç)

## Korunan İş Akışı

Eski NOA ekranlarında görülen temel masaüstü alışkanlığı korunur:

- kullanıcı liste ekranına gelir,
- mevcut kayıtları tablo yoğunluğunda görür,
- kayıt seçer,
- İçe Aktar, Yeni, Düzenle, Pasifleştir, Yenile, Şablon, Excel, Yazdır aksiyonlarını aynı toolbar düzeninden kullanır,
- yeni kayıtta kod otomatik sıradaki numaradan oluşur,
- zorunlu alanlar tamamlanmadan kayıt yapılmaz,
- pasifleştirme kayıt silmek yerine durum değiştirir.

## Modern SaaS Yorumu

İlk aşamada amaç iş akışı standardını ve UI davranışını sabitlemekti. Güncel durumda Tanımlar satırları Prisma/PostgreSQL üzerinden tenant/firma/dönem bağlamıyla kalıcı çalışır; UI aynı yoğun liste ve toolbar alışkanlığını korur.

Güncel durumda Tanımlar satırları tenant/firma/dönem metadata'sı ile başlatılır. Bu metadata liste kolonlarında görünmez; kullanıcı eski NOA ekranlarındaki pratik yoğunluğu görürken veri modeli SaaS kapsamına hazırlanır.

Mevcut davranış:

- `Tedarikçiler`: kategori alanı kart, liste, arama ve CSV sözleşmesine dahildir.
- `Taşeronlar`: sözleşme no, sözleşme başlangıç ve sözleşme bitiş alanları kart, liste, arama ve CSV sözleşmesine dahildir.
- `Müşteriler`: müşteri tipi, vergi no, telefon, e-posta ve bakiye alanları kart, liste, arama ve CSV sözleşmesine dahildir; bakiye görünümü seçili cari ekstre hareketlerinin son yürüyen bakiyesinden beslenir.
- `İçe Aktar`: CSV veya temel XLSX şablon içeriğini önizleme panelinde doğrular; geçerli satırları hatalı satırlardan ayırır.
- `Yeni`: sıradaki kod ile form açar.
- `Düzenle`: seçili kaydı forma taşır.
- `Pasifleştir`: seçili kaydın durumunu `Pasif` yapar.
- `Yenile`: örnek kaynak kayıtlarına döner.
- `Şablon`: ilgili tanım kolonlarından native XLSX içe aktar şablonu indirir; workbook veri ve açıklamalar sayfalarını içerir.
- `Excel`: ekranda filtrelenmiş görünen satırları CSV dosyası olarak indirir.
- `Yazdır`: ekranda filtrelenmiş görünen liste kapsamını tarayıcı yazdırma akışına gönderir.
- `Arama`: görünür kolon değerlerinde filtreleme yapar.
- `Kaydet`: kod ve tanım zorunluluğunu, kod benzersizliğini kontrol eder.
- Server action bağlı modda işlem sürerken kullanıcıya durum mesajı gösterilir; server hatası form validasyonundan ayrı panelde sunulur.

## Teknik Dayanak

Firmalar Dashboard başlangıç bandı `src/components/dashboard-surface.tsx` içinde ortak dashboard yüzeyine eklendi. Ana sayfa `src/app/page.tsx`, `listEntityRowsAction` ile `musteriler`, `tedarikciler` ve `taseronlar` satırlarını aynı server-side tenant/firma/dönem kapsamından toplar; sayaçlar bu satırların canlı uzunluklarından hesaplanır ve ilgili liste rotalarına geçiş verir. Bu adım eski masaüstü pencere görünümünü taşımadan, firmalar ailesinin birleşik analiz iş akışını modern dashboard düzenine yerleştirir.

Finansal metrikler de aynı dashboard bandında mevcut operasyon raporu hesaplarından beslenir: `progressPaymentCollectedTotal` müşteri tahsilatı, `purchaseInvoicePaidTotal` tedarikçi ödemeleri, `progressPaymentPaidTotal` taşeron ödemeleri ve `cashNetTotal` net nakit akışı olarak gösterilir. Bu ilk P1-S2 analitik dilimi yeni muhasebe tablosu açmaz; P0 rapor servisindeki onaylı/kaydedilmiş hareket mantığını yeniden kullanır.

Dağılım ve liste metrikleri de aynı veri kontratını kullanır. Firma tipi dağılımı müşteri/tedarikçi/taşeron satır sayılarından yüzde üretir. En aktif firmalar `counterpartyStatementDetailRows` üzerinden işlem sayısına göre sıralanır; son eklenen firmalar Tanımlar satırlarının tenant kapsamıyla basılan `createdAt` alanına göre gösterilir. Aylık yeni firma trendi de ek tablo açmadan aynı `createdAt` değerlerini son 6 ay için ay bazında gruplayarak üretir. Firmalar Dashboard dönem filtresi URL üzerindeki `period=day|week|month|year` değeriyle çalışır; finansal firma metrikleri ve en aktif firma hesabı `summarizeOperationalReports` tarih aralığı filtresiyle seçili döneme daraltılır, geçersiz query değeri `Bu Ay` varsayımına düşer. Görsel analitik katmanda firma tipi dağılımı erişilebilir donut grafikle, aylık yeni firma trendi erişilebilir kolon grafikle gösterilir; grafikler yeni tablo veya client-side grafik bağımlılığı açmadan mevcut metin/yüzde/sayı özetlerini destekler.

Domain kuralları `src/lib/entities.ts` içinde saf fonksiyonlar olarak tutulur. UI bu fonksiyonları kullanır; böylece aynı davranış ileride API, server action veya form kütüphanesine taşınırken iş kuralı tekrar yazılmaz. Tedarikçi kategori, taşeron sözleşme ve müşteri cari kartı alanları da aynı `EntityDefinition.columns` sözleşmesinden beslendiği için liste, form, filtre, CSV ve Prisma JSON payload hattında ayrı taşıma kodu gerektirmez.

`stok-kartlari` tanımı da aynı sözleşmeye eklendi. Kart; stok kodu, tanım, grup, üretici, birim, varsayılan depo, minimum miktar ve durum alanlarını taşır. `/stok-depo` ekranı bu tanımı aynı Tanımlar CRUD yüzeyiyle gösterir; Bildirim Merkezi düşük stok eşikleri de bu kartlardaki minimum miktar alanından varsayılan olarak beslenir.

Kapsam kuralları `src/lib/tenant-scope.ts` içinde tutulur. Tanımlar CRUD davranışı kayıtları aktif tenant/firma/dönem içinde değerlendirir. `src/lib/entity-prisma-repository.ts` veritabanı sorgularını tenant/firma/dönem/slug ile sınırlar; `src/lib/entity-crud-service.ts` de repository çıktısını tekrar `filterRowsByTenantScope` ile süzerek başka tenant kaydının liste, next-code ve mutasyon akışına sızmasını engeller.

Audit kuralları aynı servis katmanına bağlıdır. `src/lib/entity-crud-service.ts` başarılı `create`, `importMany`, `update` ve `deactivate` işlemlerinde sırasıyla `entity.create`, `entity.create`, `entity.update` ve `entity.delete` audit kayıtları üretir. Toplu içe aktarmada repository yazımı başarılı olduktan sonra her eklenen satır için ayrı create audit kaydı oluşur; validasyon hatasıyla dönen import denemeleri audit yazmaz. `src/app/actions/entity-actions.ts` bu hattı `createAuditLogPrismaRepository` ile gerçek veritabanı audit tablosuna bağlar; kayıtlar tenant/firma/dönem, actor user, `entity-record` tipi, `slug:code` kimliği ve status geçiş metadata bilgisini taşır.

Cari bakiye görünümü `src/components/entity-list-surface.tsx` içinde ortak Tanımlar yüzeyinde hesaplanır. `statementRows` verisi geldiğinde ve tanım kolonları içinde `balance` alanı varsa, satırın kayıtlı demo bakiyesi yerine aynı cari adının son `balanceAfter` değeri gösterilir. Bu davranış veritabanındaki cari kart kaydını zorla güncellemeden, hareket defteri ve hesap ekstresi iş akışını liste/Excel görünümüne taşır.

CSV dışa aktarım `src/lib/entity-export.ts` içinde tutulur. XLSX içe aktar şablonu `src/lib/entity-xlsx-export.ts` içinde üretilir; workbook veri sayfasında ilgili `EntityDefinition.columns` başlıklarını, açıklamalar sayfasında kolon bazlı zorunlu/opsiyonel yönergeleri taşır. `Şablon` aksiyonu kod, zorunlu tanım ve durum örnekleriyle native `.xlsx` import iskeleti indirir. Satır exportu ekrandaki arama filtresinden sonra görünen `filteredRows` kapsamından CSV olarak üretilir. Böylece Excel aksiyonu, ayrı bir veri sözleşmesi yaratmadan kullanıcının ekranda gördüğü listeyi indirir.

CSV içe aktarım önizleme/doğrulama çekirdeği `src/lib/entity-import.ts` içinde tutulur. Servis noktalı virgül ayracını, tırnaklı hücreleri ve CRLF satırlarını ayrıştırır; kolon başlıklarını tanım sözleşmesiyle eşleştirir; kod/tanım zorunluluğunu, mevcut kayıtla kod çakışmasını, dosya içi kod tekrarını ve durum değerini doğrular. UI kullanıcıya hem CSV metni yapıştırma hem de `.csv` dosyası seçerek metin alanına yükleme imkanı verir; bu servisin çıktısıyla geçerli satırları persistence bağlı ekranda `importEntityRowsAction` ve `EntityCrudService.importMany` hattından tek servis operasyonuyla kalıcı kaynağa ekler. Bulk action verilmeyen demo modda lokal listeye ekler. Servis tüm satırlar geçerli değilse repository replace yapmadan hata döner. Önizleme aşamasında UI satır durum tablosu üretir; geçerli satırlar yeşil onay sınıfıyla, hatalı satırlar kırmızı uyarı sınıfıyla ayrılır. Hatalı satır varsa `Önizleme hata raporu CSV indir` bağlantısıyla satır no, kod, tanım ve hata açıklamalarını indirilebilir rapora dönüştürür. Başarılı CSV uygulamasından sonra UI `İçe aktarım sonucu` panelinde eklenen kayıt ve atlanan hatalı satır sayılarını gösterir; hatalı satır varsa `Hata raporu CSV indir` bağlantısı aynı raporu sonuç panelinde de erişilebilir tutar.

XLSX içe aktarım adaptörü `src/lib/entity-xlsx-import.ts` içinde tutulur. Adaptör `.xlsx` dosyasının ilk çalışma sayfasını okur, satırları aynı CSV doğrulama sözleşmesine aktarır ve başlık satırı `EntityDefinition.columns` etiketleriyle eşleşmeden satır validasyonuna geçmez. Başlık adları tam eşleşiyorsa kolon sırası farklı olan workbook satırlarını tanım kolon sırasına göre hizalar. UI 3 adımlı sihirbaz hazırlığını gösterir, `.xlsx` uzantısı ve 15 MB sınırını kontrol eder, input ile dosya seçme veya sürükle-bırak yoluyla gelen workbook'u aynı önizleme hattına bağlar, temel workbook önizlemesini geçerli/hatalı satır sayılarıyla gösterir ve geçerli satırları aynı `Geçerli Satırları Uygula` akışıyla kalıcı kaynağa gönderebilir. Kullanıcı kontrollü gelişmiş kolon eşleme ve server-side workbook işleme sonraki P1 kapsamındadır.

Yazdırma akışı aynı `filteredRows` kapsamını kullanıcıya bildirir ve tarayıcının `window.print()` davranışını çağırır. Bu P0 adımı gerçek PDF şablonu üretmez; ancak eski NOA toolbar alışkanlığındaki "görünen listeyi yazdır" davranışını çalışır hale getirir.

Test kapsamı:

- `src/lib/entities.test.ts`
- `src/lib/entity-export.test.ts`
- `src/lib/entity-import.test.ts`
- `src/lib/tenant-scope.test.ts`
- `src/components/entity-list-surface.test.tsx`
- `src/components/dashboard-surface.test.tsx`

## Sonraki Adım

Tanımlar için sıradaki teknik adım:

1. Kalan modül bazlı alan şemalarının P0/P1 ayrımıyla genişletilmesi.
2. PDF aksiyonlarının aynı liste kapsamı ve çıktı şablonu mantığıyla bağlanması.
3. Silme yerine pasifleştirme ve audit log standardının tüm tanım değişiklikleri için derinleştirilmesi.
4. Rol bazlı alan/aksiyon görünürlüğünün tenant kapsamıyla birlikte uygulanması.



