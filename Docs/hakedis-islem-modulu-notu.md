# Hakediş İşlem Modülü Notu

Bu not, P0 kapsamındaki `Hakediş` modülünün ilk çalışan SaaS dilimini açıklar. Amaç eski masaüstü pencere görünümünü birebir taşımak değil, NOA iş akışındaki hakediş faturası oluşturma, toplam hesaplama ve durum geçişi ihtiyacını korumaktır.

## Kapsam

Bu dilimde temel hakediş faturası PostgreSQL'e normalize edildi:

- `ProgressPayment`: hakediş başlığı, cari, şantiye, tip, kesinti, toplamlar ve durum.
- `ProgressPaymentLine`: hakediş satır açıklaması, miktar, birim, birim fiyat, KDV ve satır toplamları.

İlk çalışan yüzey `/hakedis` route'udur. Ekran:

- hakediş başlığı açar
- taşeron cari ve şantiye seçer
- satır bazlı imalat/hizmet girişi yapar
- brüt, kesinti, net, KDV ve genel toplam hesaplar
- `Taslak`, `Kaydedildi`, `İptal` durumlarını destekler
- liste ve formu aynı iş ekranında gösterir
- başarılı oluşturma, kesinleştirme ve iptal hareketlerini audit log'a yazar
- audit kayıtlarını belge bazlı `İşlem Geçmişi` bölümünde gösterir
- `Kaydedildi` taşeron/tedarikçi hakedişleri için kasa/banka ödeme hareketi oluşturur
- `Kaydedildi` şantiye geliri hakedişleri için kasa/banka tahsilat hareketi oluşturur
- ödeme hareketi oluşan hakedişleri `Ödendi`, tahsilat hareketi oluşan şantiye gelirlerini `Tahsil Edildi`, hareketi olmayan kesinleşmiş satırları ise `Bekliyor` veya `Tahsilat Bekliyor` olarak gösterir
- `Yazdır` toolbar aksiyonu, ekranda görünen hakediş hareket listesi kapsamını tarayıcı yazdırma akışına gönderir
- P0 dışı `PDF Önizleme`, `Onay` ve `Yenile` toolbar aksiyonları sessiz kalmaz; kullanıcıya hangi akışın P0 dışında olduğunu veya hangi çalışan alternatifin kullanılacağını bildirir

## İş Akışı Kararı

P0 için hakediş, şimdilik taşeron ağırlıklı başlatıldı. Cari lookup ilk dilimde `taseronlar`, şantiye lookup'ı `santiyeler` tanımlarından gelir.

Bu seçim bilinçlidir:

- Plan ve ekran kaynaklarında taşeron hakedişi P0 çekirdek akıştır.
- Satış faturası, tedarikçi hakedişi ve çıktı/onay daha sonra aynı model üzerinde genişletilebilir.
- İlk tabloda `paymentType` alanı bırakıldı; böylece `Şantiye Geliri`, `Taşeron Hakedişi`, `Tedarikçi Hakedişi` ayrımı veri modelinde hazırdır.
- Ödeme aksiyonu yalnız `Taşeron Hakedişi` ve `Tedarikçi Hakedişi` tiplerinde açıktır. `Şantiye Geliri` hakedişi kasa/banka çıkış ödemesi olarak kapatılmaz; `Hakediş Tahsilatı` tipinde kasa/banka giriş hareketiyle kapatılır.

## Hesaplama Sözleşmesi

Satır brütü:

- `quantity * unitPrice`

Başlık toplamları:

- brüt toplam = satır brütleri toplamı
- kesinti toplamı = brüt toplam * `retentionRate`
- net toplam = brüt toplam - kesinti toplamı
- KDV toplamı = net toplam * ağırlıklı KDV oranı
- genel toplam = net toplam + KDV toplamı

Bu P0 hesabı, hakediş kesintisinin KDV matrahını düşürdüğü basit ön muhasebe yaklaşımıdır. Tevkifat, stopaj, teminat kesintileri ve mevzuat kırılımları daha sonra ayrı alanlarla genişletilmelidir.

## P0 Para Birimi Sözleşmesi

Hakediş modülü P0 finans ayar sözleşmesini kullanır:

- Form bağlamında `Baz Para: TRY`, `Çoklu Döviz: P1 için kapalı` ve `Varsayılan KDV: %20` bilgisi görünür.
- Form payload'ı `getP0BaseCurrencyTransactionValue()` ile `TL` üretir.
- `createProgressPaymentDraft()` doğrudan gelen `USD` veya `EUR` payload değerlerini P0 işlem para birimi olan `TL` değerine normalize eder.
- `ProgressPaymentPrismaRepository` DB'deki eski/elle girilmiş döviz değerlerini okuma modelinde, doğrudan repository'ye gelen dövizli create/update row değerlerini de yazma payload'ında P0 işlem para birimi olan `TL` değerine normalize eder.
- Çoklu döviz ve kur yönetimi P1 kapsamına bırakılır; P0 hakediş ödeme/tahsilat hareketleri de bu TL sözleşmesiyle kasa/banka tarafına akar.

## Bilinçli Sınırlar

- onay merkezi yok
- PDF önizleme yok
- metraj/ilerleme modülü bağlantısı yok
- cari hesap bakiyesine otomatik yazım yok
- detaylı şantiye gelir/gider kırılım raporuna otomatik yansıma yok
- satış faturası entegrasyonu yok
- belge düzeyi PDF çıktısı yok

Bu sınırlar MVP güvenliği için tutuldu. Önce hakediş belgesi kendi normalize tablosunda doğru hesaplanır, route üzerinde çalışır ve `Kaydedildi` duruma geçtiğinde dashboard/rapor operasyon özetine girer hale getirildi. P0 yazdırma davranışı belge PDF'i üretmez; kullanıcıya ekranda görünen hareket listesi kapsamını bildirir ve tarayıcı yazdırma akışını başlatır. Toolbar seviyesindeki `Onay` eski masaüstü alışkanlığını temsil eder; P0 çalışan karşılığı satır bazlı `Kesinleştir` aksiyonudur. `PDF Önizleme` ve `Yenile` de sessiz no-op bırakılmaz; PDF için mevcut yazdırma kapsamı, yenileme için server render/revalidate yaklaşımı açıkça bildirilir.

## Ödeme Hareketi Sözleşmesi

`Kaydedildi` durumundaki taşeron/tedarikçi hakedişi için `/hakedis` ekranındaki `Ödeme Oluştur` aksiyonu `CashBankMovement` satırı üretir:

- `sourceType=progress-payment`
- `movementType=Hakediş Ödemesi`
- `direction=Çıkış`
- `documentNo=ODM-{HakedişNo}`
- `amount=ProgressPayment.grandTotal`
- `counterpartyName=ProgressPayment.counterpartyName`

Hesap seçimi `/hakedis` listesindeki `Ödeme/Tahsilat hesabı` alanından gelir. Server action, client'tan gelen hesap kodu/adını güvenilir kabul etmez; aktif `kasa-banka` tanımları içinden yeniden çözer. Aynı hakediş için ikinci ödeme hareketi oluşturulmaz.

Hakediş ödeme hareketi üretilirken kasa/banka helper katmanı da P0 para birimi sözleşmesini uygular. Hakediş satırı eski/elle girilmiş `USD` veya `EUR` para birimi taşısa bile oluşan `Hakediş Ödemesi` hareketi `TL` olarak üretilir.

## Tahsilat Hareketi Sözleşmesi

`Kaydedildi` durumundaki `Şantiye Geliri` hakedişi için `/hakedis` ekranındaki `Tahsilat Oluştur` aksiyonu `CashBankMovement` satırı üretir:

- `sourceType=progress-payment`
- `movementType=Hakediş Tahsilatı`
- `direction=Giriş`
- `documentNo=THS-{HakedişNo}`
- `amount=ProgressPayment.grandTotal`
- `counterpartyName=ProgressPayment.counterpartyName`

Aynı şantiye geliri hakedişi için ikinci tahsilat hareketi oluşturulmaz. Taşeron ve tedarikçi hakedişleri bu tahsilat akışına alınmaz; onlar `Hakediş Ödemesi` çıkış hareketiyle kapatılır.

Hakediş tahsilat hareketi de aynı P0 sözleşmesine bağlıdır. Şantiye geliri hakedişi eski/elle girilmiş döviz değeri taşısa bile oluşan `Hakediş Tahsilatı` hareketi `TL` olarak üretilir.

## Audit Sözleşmesi

Hakediş modülü şu aksiyonlarda audit kaydı üretir:

- `progress-payment.create`
- `progress-payment.post`
- `progress-payment.cancel`

Yetki reddi, validasyon hatası, bulunamayan kayıt ve idempotent tekrar çağrılar audit kaydı üretmez.

Audit metadata alanı ilk etapta şu bilgileri taşır:

- `documentNo`
- `statusFrom`, `statusTo`
- `paymentType`
- `counterpartyCode`, `counterpartyName`
- `siteCode`, `siteName`
- `grandTotal`
- `lineCount`

## Uygulama Bağlantıları

- `src/lib/progress-payment-service.ts`: domain hesaplama, validasyon ve durum geçişleri.
- `src/lib/progress-payment-prisma-repository.ts`: Prisma adapter.
- `src/app/actions/progress-payment-actions.ts`: server action ve audit okuma katmanı.
- `src/components/progress-payment-surface.tsx`: `/hakedis` iş ekranı ve işlem geçmişi bölümü.
- `src/lib/reports-service.ts`: `Kaydedildi` hakedişleri dashboard ve `/raporlar` operasyon özetine dahil eden okuma modeli.
- `src/lib/cash-bank-movement-service.ts`: hakediş ödeme/tahsilat hareketi üretimi ve tekillik kuralı.
- `src/lib/progress-payment-seed.ts`: demo `HAK-0001` kaydı ve idempotent audit seed'i.

## Demo Seed

`scripts/seed-default-entities.ts`, mevcut `HAK-0001` demo hakediş kaydı için `progress-payment.create` audit hareketini idempotent olarak oluşturur.

Bu davranış iki nedenle eklendi:

- Yeni kurulumda hakediş `İşlem Geçmişi` paneli boş kalmaz.
- Daha önce audit bağlanmadan seed edilmiş yerel veritabanlarında eksik demo iz güvenli şekilde tamamlanır.

Seed ikinci kez çalıştırıldığında aynı hakediş için ikinci audit kaydı üretmez; sonuç `progressPaymentAuditLogs.skipped` altında raporlanır.

## Doğrulama

Eklenen testler:

- `src/lib/progress-payment-service.test.ts`
- `src/components/progress-payment-surface.test.tsx`

Kapsanan davranış:

- kesinti ve KDV toplamları hesaplanır
- tenant/firma/dönem kapsamıyla kayıt oluşturulur
- hakediş draft para birimi doğrudan gelen döviz payload'ından bağımsız olarak P0 işlem para birimi olan `TL` değerine normalize edilir
- hakediş Prisma okuma/yazma adapter'ı DB'deki veya doğrudan repository'ye gelen döviz değerini P0 işlem para birimi olan `TL` değerine normalize eder
- hakediş ödeme ve tahsilat hareket helper'ları kaynak hakedişteki döviz değerinden bağımsız olarak kasa/banka hareket para birimini `TL` üretir
- mükerrer evrak no reddedilir
- kesinleştirme ve iptal durum geçişleri uygulanır
- başarılı mutasyonlar audit kaydı üretir
- idempotent veya reddedilen mutasyonlar audit kaydı üretmez
- demo `HAK-0001` audit geçmişi seed ile bir kez tamamlanır
- read-only rol mutasyon yapamaz
- `/hakedis` yüzeyi liste, metrik, form ve işlem geçmişi akışını gösterir
- taşeron/tedarikçi hakedişinden tek `Hakediş Ödemesi` çıkış hareketi üretilir
- şantiye geliri hakedişi ödeme hareketi olarak kapatılamaz
- şantiye geliri hakedişinden tek `Hakediş Tahsilatı` giriş hareketi üretilir
- tahsil edilmiş şantiye geliri satırında tahsilat hesabı ve hareket tarihi görünür
- ödenmiş hakediş satırında ödeme hesabı ve hareket tarihi görünür
- `/hakedis` yazdırma aksiyonu mevcut hareket listesi kapsamı için tarayıcı yazdırma akışını başlatır
- `/hakedis` toolbarındaki P0 dışı `PDF Önizleme`, `Onay` ve `Yenile` aksiyonları kullanıcıya görünür sınır mesajı verir


