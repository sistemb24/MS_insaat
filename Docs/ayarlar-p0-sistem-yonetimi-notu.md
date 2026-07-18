# Ayarlar P0 Sistem Yönetimi Notu

Bu not, `/ayarlar` route'unun placeholder yüzeyden çıkarılıp ilk P0 sistem yönetimi ekranına bağlanmasını açıklar. Amaç eski masaüstü pencere görünümünü kopyalamak değil, ayar iş akışındaki firma bağlamı, finans varsayılanları, rol matrisi ve audit kapsamını SaaS kabuğunda görünür kılmaktır.

## Bağlanan Yüzey

İlk çalışan yüzey `src/components/settings-surface.tsx` içindedir. Ekran şu bilgileri gösterir:

- aktif tenant, firma, dönem, kullanıcı ve lisans bağlamı
- P0 finans varsayılanları ve `P0 Finans KDV Detayları`: baz para birimi, varsayılan KDV, KDV modu, KDV dağılımı, çoklu döviz sınırı ve bu alanların işlem davranışı
- P0 rol yönetimi: `admin`, `accounting`, `viewer` rol özeti ve kaynak-aksiyon matrisi
- denetim günlüğü kapsamı: fatura, gider, hakediş, çek, puantaj, maaş tahakkuku ve tanım kartı kritik hareketleri
- P0 salt-okunur aksiyonları: firma bilgisi, finans ayarı, rol matrisi ve audit detayı için düzenleme/inceleme sınır mesajları
- `Ayarlar Özetini Yazdır` aksiyonu: görünen firma, finans, rol matrisi ve audit kapsamını tarayıcı yazdırma akışına gönderir

`/ayarlar` route'u artık generic `ModuleSurface` placeholder'ı yerine `SettingsSurface` render eder.

P0 ayar değerleri UI içinde ayrı ayrı kopyalanmaz. Şirket/lokasyon varsayımları, finans varsayımları, rol özeti, kaynak-aksiyon matrisi, audit kapsamı, toolbar sınır aksiyonları ve yazdırma aksiyonu `src/lib/settings-contract.ts` içinde tek sözleşme olarak tutulur; `SettingsSurface` bu sözleşmeden beslenir.

## İş Akışı Kararı

P0 için Ayarlar modülü salt okunur başlatıldı.

Bu seçim bilinçlidir:

- Ayar yazımı tenant/firma/dönem ve yetki sınırlarını doğrudan etkiler.
- Finans parametresi değişiklikleri fatura, hakediş ve rapor hesaplamalarını etkileyebilir.
- Rol matrisi değişikliği tüm mutasyon yüzeylerinin güvenlik davranışını etkiler.
- Bu dilimde önce sistem yönetimi bilgisinin tek ekranda görünmesi sağlandı; kalıcı parametre yazımı ayrı validasyon, audit ve migration sözleşmesiyle eklenmelidir.

Toolbar'daki düzenleme aksiyonları bu nedenle kayıt formu açmaz. Her aksiyon kullanıcıya P0 sınırını net olarak bildirir:

- `Firma Bilgilerini Düzenle`: kalıcı firma parametresi yazımı ayrı ayar servisinde açılacak.
- `Finans Ayarlarını Düzenle`: fatura ve hakediş hesaplamalarını etkileyen finans parametresi yazımı ayrı dilimde açılacak.
- `Rol Matrisini Düzenle`: yetki değişikliği audit ve güvenlik sözleşmesiyle ayrı dilimde açılacak.
- `Audit Detayını Aç`: P0'da özet kapsam görünür, filtreli denetim günlüğü ayrı ekranda açılacak.

## P0 Lokasyon Varsayımı

NOA inşaat iş akışı şantiye bazlı çalıştığı için P0 şirket ayarı `CompanySettings.locationMode = "multi-location"` olarak sabitlendi. Ayarlar ekranında şu satırlar görünür:

- `Lokasyon Modu`: Çoklu lokasyon / şantiye bazlı
- `Desteklenen Tipler`: Merkez, Şantiye, Şube, Ofis
- `Değişiklik Politikası`: P0'da kilitli

Bu karar eski pencere görünümünü değil, şantiye/firma/dönem ayrımıyla çalışma iş akışını korur. P0 bu değeri görünür ve makine tarafından okunabilir sözleşme olarak taşır; lokasyon modu değiştirme, kullanıcı etkisi uyarısı ve kalıcı firma ayarı yazımı ayrı ayar servisinde açılacaktır.

## P0 Finans Varsayımları

- Baz para birimi: `TRY`
- Varsayılan KDV oranı: `%20`
- KDV modu: `KDV hariç`
- KDV dağılımı: aktif
- Çoklu döviz: P1 için kapalı

`/ayarlar` ekranında bu özetin altında `P0 Finans KDV Detayları` tablosu bulunur. Tablo, `financePolicyRows` sözleşmesinden beslenir ve şu P0 davranışlarını görünür kılar: `defaultVatRate` alış faturası ve hakediş yeni satır varsayımıdır, `vatMode` net tutardan KDV ve genel toplam hesaplanacağını belirtir, `showVatBreakdown` satır/özet KDV ayrımını açık tutar, `multiCurrencyEnabled` ise P0 işlem para birimini `TL` sınırında normalize eder.

Bu değerler mevcut P0 işlem ekranlarının varsayılan hesaplama davranışıyla uyumludur. Alış faturası ve hakediş yeni satır KDV varsayımı artık `getP0DefaultVatRateInputValue()` üzerinden bu sözleşmeden okunur. İki formda da satır gridinin üzerinde `Baz Para: TRY`, `Çoklu Döviz: P1 için kapalı` ve `Varsayılan KDV: %20` bağlamı görünür; kullanıcı satır KDV değerini değiştirebilir, fakat ilk açılış ayar sözleşmesine bağlıdır. Kasa/banka manuel hareket, kasa/banka virman ve çek giriş formlarında da `Baz Para: TRY` ve `Çoklu Döviz: P1 için kapalı` bağlamı görünür; para birimi alanı P0 işlem para birimi olan `TL` olarak kilitlenir. Fatura, hakediş, kasa/banka ve çek domain/servis katmanları doğrudan gelen işlem para birimini de `getP0BaseCurrencyTransactionValue()` üzerinden `TL` değerine normalize eder. Aynı P0 sözleşmesi Prisma okuma ve yazma adapter'larında da uygulanır; veritabanında eski/elle girilmiş `USD` veya `EUR` kayıt bulunsa bile P0 row modeli `TL` döner ve repository'ye doğrudan dövizli row verilse bile create/update payload'ı `TL` olarak kalıcılaştırılır. Sonraki dilimde bu değerler kalıcı şirket parametresine taşınırsa fatura, hakediş, kasa/banka, çek ve rapor servisleri aynı kaynak parametreyi okumalıdır.

Audit metadata da bu sözleşmenin parçasıdır. `ChequeService`, çek audit metadata para birimini satırdaki eski döviz değerinden bağımsız olarak P0 işlem para birimi olan `TL` değerinden üretir. `AuditLogPrismaRepository`, metadata içinde `currency` anahtarı varsa kayda yazarken ve geçmişi okurken değeri aynı `TL` değerine normalize eder. Raporlar ve dashboard ayrı döviz alanı üretmez; normalize edilmiş işlem satırlarını P0 `TL` formatıyla gösterir. `summarizeOperationalReports` çıktısındaki `currency` alanı da aynı P0 işlem para birimi değerinden üretilir ve `/raporlar` ile dashboard üzerinde `Rapor Para Birimi` metriği olarak görünür.

Kasa/banka hareket helper'ları da aynı sınıra bağlıdır. Çek tahsilatı, alış fatura ödemesi, hakediş ödemesi ve hakediş tahsilatı kaynak belge satırında eski döviz değeri bulunsa bile P0 işlem para birimi olan `TL` hareketi üretir.

Bu dilimde teknik kaynak `getP0SettingsContract()` fonksiyonudur. Fonksiyon şu alanları döndürür:

- `finance`: makine tarafından okunabilir P0 finans parametresi
- `financeDisplayRows`: ekranda gösterilen finans ayarı satırları
- `financePolicyRows`: KDV/döviz alanlarının P0 işlem davranışını açıklayan detay tablo satırları
- `roleRows`: P0 rol özeti satırları
- `rolePermissionRows`: P0 kaynak-aksiyon matrisi satırları
- `auditScopes`: Ayarlar yüzeyinde gösterilen audit kapsamı
- `actionRows`: Ayarlar toolbar'ında görünen P0 salt-okunur aksiyonlar ve kullanıcıya verilecek sınır mesajları
- `printAction`: Ayarlar özetini yazdırma etiketi ve kullanıcıya verilecek kapsam mesajı
- `getP0BaseCurrencyDisplayValue()`: form bağlamlarında gösterilecek ISO baz para birimi
- `getP0BaseCurrencyTransactionValue()`: P0 işlem/draft payload'larında kullanılacak uygulama para birimi
- `getP0CurrencyPolicyDisplayValue()`: P0 işlem formlarında gösterilecek çoklu döviz sınırı
- `getP0DefaultVatRateInputValue()`: alış faturası ve hakediş satır formlarında kullanılacak varsayılan KDV input değeri

## Rol Matrisi Başlangıcı

P0 rol matrisi üç rol ile görünür kılındı:

- `admin`: tüm P0 modüllerde ayar, mutasyon, rapor ve audit okuma
- `accounting`: fatura, gider, hakediş, çek, puantaj ve kasa/banka mutasyonları
- `viewer`: liste, rapor ve audit için salt okuma

Bu matristeki amaç yetki modelini kullanıcıya görünür hale getirmektir. Yetki davranışının canlı kararları şimdilik mevcut servis fonksiyonlarında tutulur.

## Audit Kapsamı

Ayarlar ekranı P0 audit kapsamını kullanıcıya gösterir:

- fatura oluşturma, kesinleştirme, iptal ve ödeme
- hakediş oluşturma, kesinleştirme, iptal ve ödeme/tahsilat
- çek oluşturma ve tahsil
- puantaj oluşturma, kesinleştirme ve iptal
- maaş tahakkuku oluşturma, kesinleştirme, iptal ve ödeme
- tanım kartlarında oluşturma, güncelleme ve pasifleştirme

Filtreli, sayfalı, dışa aktarılabilir audit log ekranı bu dilimde yoktur. Bu ekran, audit kapsamını görünür kılan başlangıç yüzeyidir.

## Yazdırma Sözleşmesi

`Ayarlar Özetini Yazdır`, P0 seviyede özel PDF üretmez. Buton etiketi ve kapsam mesajı `getP0SettingsContract().printAction` üzerinden gelir. Kullanıcıya yazdırma kapsamını bildirir ve tarayıcının `window.print()` akışını başlatır. Kapsam şu görünür bölümlerle sınırlıdır:

- firma bilgileri
- finans ayarları
- P0 rol yetki matrisi ve kaynak-aksiyon matrisi
- denetim günlüğü kapsamı

Belge düzeyi PDF, filtreli audit çıktısı ve dışa aktarılabilir ayar raporları sonraki dilimlere bırakıldı.

## Bilinçli Sınırlar

- Lokasyon modu P0'da `multi-location` olarak kilitli; kalıcı firma parametresi kaydı yok
- Finans ayarı düzenleme formu yok
- Rol/izin düzenleme yok
- Kullanıcı yönetimi yok
- Banka entegrasyonu, bildirim ayarları ve filo takip yok
- Audit log filtreleme, CSV/PDF çıktı ve detay ekranı yok
- Belge düzeyi PDF ayar çıktısı yok
- Toolbar aksiyonları P0'da yalnızca sınır mesajı verir; kalıcı veri yazmaz

Bu sınırlar MVP güvenliği için tutuldu. Önce `/ayarlar` rotası boş placeholder olmaktan çıkarıldı ve P0 sistem yönetimi bilgisi aktif oturum bağlamıyla görünür hale getirildi.

## Uygulama Bağlantıları

- `src/components/settings-surface.tsx`: Ayarlar P0 sistem yönetimi yüzeyi.
- `src/components/purchase-invoice-surface.tsx`: alış faturası yeni satır KDV ve baz para varsayımını ayar sözleşmesinden okur, formda görünür bağlam olarak gösterir ve payload para birimini sözleşmeden üretir.
- `src/components/progress-payment-surface.tsx`: hakediş yeni satır KDV ve baz para varsayımını ayar sözleşmesinden okur, formda görünür bağlam olarak gösterir ve payload para birimini sözleşmeden üretir.
- `src/components/cash-bank-surface.tsx`: manuel kasa/banka hareketi ve virman formlarında baz para / çoklu döviz sınırını ayar sözleşmesinden okur, P0 işlem para birimini `TL` olarak kilitli gösterir ve payload para birimini sözleşmeden üretir.
- `src/lib/cash-bank-movement-service.ts`: manuel kasa/banka hareketi ve virman payload para birimini P0 işlem para birimi olan `TL` değerine normalize eder.
- `src/lib/cash-bank-movement-prisma-repository.ts`: kasa/banka hareketi okuma modelinde ve create payload'ında para birimini P0 işlem para birimi olan `TL` değerine normalize eder.
- `src/components/cheque-surface.tsx`: gelen çek formunda baz para / çoklu döviz sınırını ayar sözleşmesinden okur, P0 işlem para birimini `TL` olarak kilitli gösterir ve payload para birimini sözleşmeden üretir.
- `src/lib/cheque-service.ts`: gelen çek payload para birimini P0 işlem para birimi olan `TL` değerine normalize eder.
- `src/lib/cheque-prisma-repository.ts`: çek okuma modelinde ve create/update payload'larında para birimini P0 işlem para birimi olan `TL` değerine normalize eder.
- `src/lib/invoices.ts`: alış faturası draft para birimini P0 işlem para birimi olan `TL` değerine normalize eder.
- `src/lib/purchase-invoice-prisma-repository.ts`: alış faturası okuma modelinde ve create/update payload'larında para birimini P0 işlem para birimi olan `TL` değerine normalize eder.
- `src/lib/progress-payment-service.ts`: hakediş draft para birimini P0 işlem para birimi olan `TL` değerine normalize eder.
- `src/lib/progress-payment-prisma-repository.ts`: hakediş okuma modelinde ve create/update payload'larında para birimini P0 işlem para birimi olan `TL` değerine normalize eder.
- `src/components/settings-surface.test.tsx`: firma/finans/rol matrisi render sözleşmesi.
- `src/lib/settings-contract.ts`: P0 finans, rol, audit, ayar aksiyonları ve yazdırma aksiyonunun tek kaynak sözleşmesi.
- `src/lib/settings-contract.test.ts`: ayar sözleşmesi regresyon testi.
- `src/lib/expense-service.ts`: gider kaydı başarılı olduğunda `expense.create` audit kaydı üretir ve ayar audit kapsamına girer.
- `src/app/[module]/page.tsx`: `/ayarlar` route'unu `SettingsSurface` ile eşler.
- `src/lib/tenant-scope.ts`: aktif tenant/firma/dönem/kullanıcı bağlamı.

## Doğrulama Kapsamı

Eklenen test:

- `src/components/settings-surface.test.tsx`
- `src/lib/settings-contract.test.ts`

Kapsanan davranış:

- `/ayarlar` yüzeyi başlık ve aktif bağlamı gösterir
- aktif tenant, firma, dönem ve kullanıcı rolü görünür
- P0 finans varsayılanları ve `P0 Finans KDV Detayları` tablosu görünür
- alış faturası ve hakediş yeni satır KDV, baz para ve çoklu döviz sınırı ayar sözleşmesinden formatlanır ve form üzerinde görünür
- alış faturası ve hakediş domain helper'ları doğrudan gelen döviz payload'ını P0 işlem para birimi olan `TL` değerine normalize eder
- alış faturası, hakediş, kasa/banka ve çek Prisma okuma/yazma adapter'ları DB'deki veya doğrudan repository'ye gelen döviz değerlerini P0 işlem para birimi olan `TL` değerine normalize eder
- audit metadata okuma/yazma adapter'ı metadata içindeki para birimini P0 işlem para birimi olan `TL` değerine normalize eder
- çek servis katmanı audit metadata para birimini doğrudan P0 işlem para birimi olan `TL` değerinden üretir
- kasa/banka otomatik hareket helper'ları kaynak belge dövizinden bağımsız olarak P0 işlem para birimi olan `TL` hareketi üretir
- rapor summary ve dashboard/rapor yüzeyleri kaynak satır dövizinden bağımsız olarak `Rapor Para Birimi` değerini P0 işlem para birimi olan `TL` üretir ve gösterir
- kasa/banka manuel hareket ve virman formlarında baz para ve çoklu döviz sınırı ayar sözleşmesinden formatlanır, işlem para birimi `TL` olarak kilitlenir
- çek giriş formunda baz para ve çoklu döviz sınırı ayar sözleşmesinden formatlanır, işlem para birimi `TL` olarak kilitlenir
- `admin`, `accounting`, `viewer` rol özeti ve P0 kaynak-aksiyon matrisi görünür
- ayar düzenleme aksiyonları P0 salt-okunur sınır mesajı verir
- `Ayarlar Özetini Yazdır` mevcut P0 ayar özeti kapsamı için tarayıcı yazdırma akışını başlatır
- P0 finans/rol/kaynak-aksiyon/audit/toolbar/yazdırma aksiyon sözleşmesi tek kaynak fonksiyondan okunur
- gider audit kapsamı ve accounting rol yetkisi P0 ayar sözleşmesinde görünür
