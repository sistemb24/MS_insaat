# Çek İşlemleri Modülü Notu

Bu not, P0 kapsamındaki `Çek İşlemleri` modülünün ilk çalışan SaaS dilimini açıklar. Amaç NOA demo videolarındaki iş akışını korumak, fakat eski masaüstü pencere görünümünü birebir taşımamaktır.

## Bu Dilimde Bağlanan Akış

İlk çalışan akış `Gelen Çek` portföyüdür:

1. Kullanıcı `Çek İşlemleri` sayfasında `Yeni` ile gelen çek formunu açar.
2. Evrak no, çek no, banka, şube, keşideci/cari, düzenleme tarihi, vade tarihi ve tutar girilir.
3. Para birimi P0 finans sözleşmesine göre `TL` olarak kilitlidir; form başlığında `Baz Para: TRY` ve `Çoklu Döviz: P1 için kapalı` bağlamı görünür.
4. `Kaydet` aksiyonu gerçek PostgreSQL kaydı oluşturur.
5. Kayıt ilk durumda `Portföyde` statüsüne alınır.
6. Kullanıcı `Tahsil Hesabı` alanından aktif kasa/banka hesabını seçer.
7. `Tahsil Et` aksiyonu statüyü `Tahsil Edildi` yapar.
8. Tahsil sırasında seçilen hesapla `CashBankMovement` tablosunda `Çek Tahsilatı` hareketi oluşur.
9. Başarılı oluşturma ve tahsil işlemleri merkezi audit log altyapısına yazılır.
10. `Yazdır` toolbar aksiyonu ekranda görünen çek portföy listesi kapsamını tarayıcı yazdırma akışına gönderir.
11. P0 dışı veya server render'a bağlı toolbar aksiyonları sessiz kalmaz; `Bordro`, `PDF Önizleme` ve `Yenile` kullanıcıya görünür kapsam mesajı verir.

Bu akış, video ve ekran görüntülerindeki çek portföyü mantığını modern SaaS kabuğuna taşımak için seçilen en küçük gerçek işlem yüzeyidir.

## Veri Modeli

`Cheque` tablosu tenant/firma/dönem kapsamında tutulur:

- `tenantId`, `companyId`, `periodId`
- `direction`: `Gelen` veya ileride `Firma`
- `documentNo`
- `checkNo`
- `bankName`, `branchName`
- `drawerName`
- `issueDate`, `dueDate`
- `amount`, `currency`
- `status`: `Portföyde`, `Tahsil Edildi`, `İptal`
- `description`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

Tekil alanlar:

- Aynı tenant/firma/dönem içinde `documentNo` tektir.
- Aynı tenant/firma/dönem içinde `checkNo` tektir.

Sorgu indeksleri:

- Vade listesi için `tenantId/companyId/periodId/dueDate`
- Portföy/tahsil filtreleri için `tenantId/companyId/periodId/status`

## Yetki ve Kapsam

Fatura modülündeki P0 yetki yaklaşımı korunur:

- `admin` ve `accounting` rolleri çek oluşturabilir ve tahsil edebilir.
- `viewer` rolü çek listesini görebilir, mutasyon yapamaz.
- Tüm liste ve mutasyonlar aktif tenant/firma/dönem kapsamından geçer.

## Audit Davranışı

Başarılı işlemler:

- `cheque.create`
- `cheque.collect`

Audit metadata alanı:

- `documentNo`
- `checkNo`
- `direction`
- `bankName`
- `drawerName`
- `dueDate`
- `amount`
- `currency`
- `statusFrom`, `statusTo`

Audit yazılmayan durumlar:

- Yetki reddi
- Validasyon hatası
- Bulunamayan kayıt
- Tahsil edilmiş çek için ikinci `Tahsil Et` çağrısı

## P0 Para Birimi Sözleşmesi

Çek modülü P0 finans ayar sözleşmesini kullanır:

- Yeni çek formu `Baz Para: TRY` ve `Çoklu Döviz: P1 için kapalı` bağlamını gösterir.
- Para birimi alanı `TL` olarak kilitli görünür.
- `ChequeSurface` form payload'ını `getP0BaseCurrencyTransactionValue()` ile `TL` üretir.
- `ChequeService` doğrudan gelen `USD` veya `EUR` payload değerlerini de P0 işlem para birimi olan `TL` değerine normalize eder.
- `ChequeService` çek audit metadata içindeki `currency` değerini de satırdaki eski döviz değerinden bağımsız olarak P0 işlem para birimi olan `TL` değerinden üretir.
- `ChequePrismaRepository` DB'deki eski/elle girilmiş döviz değerlerini okuma modelinde, doğrudan repository'ye gelen dövizli create/update row değerlerini de yazma payload'ında P0 işlem para birimi olan `TL` değerine normalize eder.
- Çek audit metadata içindeki `currency` alanı da `AuditLogPrismaRepository` okuma/yazma sınırında P0 işlem para birimi olan `TL` değerine normalize edilir.
- Çek tahsilinden oluşan `CashBankMovement`, çek satırındaki eski/elle girilmiş döviz değerinden bağımsız olarak `TL` para birimiyle yazılır.

Bu karar eski iş akışındaki çek portföyü/tahsil mantığını korur; çoklu döviz ve kur yönetimi P1 kapsamına bırakılır.

## Kasa/Banka Hareketi

`Tahsil Et` aksiyonu artık çek statüsünü değiştirmekle kalmaz; aynı transaction akışının servis seviyesindeki devamı olarak kasa/banka hareketi üretir.

Oluşan hareket:

- `movementType`: `Çek Tahsilatı`
- `direction`: `Giriş`
- `accountCode`: kullanıcının seçtiği kasa/banka hesap kodu
- `accountName`: kullanıcının seçtiği kasa/banka hesap adı
- `sourceType`: `cheque`
- `sourceId`: tahsil edilen çek id'si
- `sourceLabel`: evrak no ve çek no birleşimi

İkinci kez tahsil çağrısı yapıldığında çek zaten `Tahsil Edildi` durumunda olduğu için yeni kasa/banka hareketi oluşturulmaz. Bu davranış audit log idempotency kuralıyla aynıdır.

`/kasa-banka` ekranındaki `Hesap Bakiye Özeti`, bu tahsil hareketini seçilen kasa/banka hesabının giriş toplamına dahil eder. Böylece çek tahsili sonrası hesap son durumu aynı finansal iş akışında görünür; fakat bu dilimde hesap kartındaki bakiye alanına otomatik yazım yapılmaz.

## UI Davranışı

`/cek` route'u artık placeholder yüzeyden çıkarıldı.

Sayfada şu alanlar bulunur:

- Modül başlığı ve kısa bağlam
- Ortak toolbar: `Yeni`, `Kaydet`, `Bordro`, `Yazdır`, `PDF Önizleme`, `Yenile`
- Gelen çek ekleme formu
- Gelen çek formunda P0 baz para / çoklu döviz sınırı
- `Portföy Toplamı`, `Tahsil Toplamı`, `Portföy Adedi` metrikleri
- Çek portföy listesi
- `Tahsil Hesabı` seçimi
- Satır bazlı `Tahsil Et` aksiyonu
- `İşlem Geçmişi` audit paneli

Toolbar'daki `Yazdır` aksiyonu P0 seviyede görünen çek portföy listesi kapsamını kullanıcıya bildirir ve `window.print()` ile tarayıcı yazdırma akışını başlatır. `Bordro` ve `PDF Önizleme` aksiyonları şimdilik tasarım ve iş akışı sürekliliği için yüzeydedir; tıklandığında gerçek bordro/PDF üretiminin P0 kapsamı dışında olduğunu belirten status mesajı gösterir. `Yenile` aksiyonu client tarafında sessiz refetch yapmaz; çek listesinin server render ve revalidate akışıyla güncellendiğini bildirir. Gerçek çek bordrosu/PDF üretimi sonraki dilimlere bırakıldı.

## Bilinçli Sınırlar

Bu dilimde yapılmayanlar:

- Firma çeki çıkışı
- Ciro işlemi
- Bordro PDF üretimi
- belge düzeyi çek bordrosu/PDF çıktısı
- Çek iptal/karşılıksız/iade durumları
- Vade uyarıları ve rapor filtreleri
- Hesap bakiyesinin otomatik güncellenmesi

Bu alanlar çek iş akışının doğal devamıdır; temel kayıt, portföy ve tahsil zemini hazırlandığı için sonraki dilimlerde aynı servis/repository/audit deseniyle genişletilmelidir.

## Doğrulama Kapsamı

Eklenen testler:

- `src/lib/cheque-service.test.ts`
- `src/lib/cheque-prisma-repository.test.ts`
- `src/components/cheque-surface.test.tsx`

Testlerin kapsadığı davranış:

- Role göre mutasyon yetkisi
- Tenant/firma/dönem scoped kayıt
- Mükerrer evrak no ve çek no reddi
- Portföyden tahsile statü geçişi
- İdempotent ikinci tahsil çağrısı
- Çek tahsilinden tekil kasa/banka hareketi üretimi
- Çek tahsilatı hareket helper'ının kaynak çek satırındaki döviz değerinden bağımsız olarak kasa/banka hareket para birimini `TL` üretmesi
- Seçilen tahsil hesabının kasa/banka hareketine yansıması
- Prisma create/list/update adapter sözleşmesi
- UI form, liste, metrik, tahsil ve audit görünümü
- UI gelen çek formunun P0 baz para ve çoklu döviz sınırını göstermesi, para birimini `TL` olarak kilitlemesi
- Servis katmanının doğrudan gelen çek para birimini P0 işlem para birimi olan `TL` değerine normalize etmesi
- Servis katmanının çek audit metadata para birimini P0 işlem para birimi olan `TL` değerinden üretmesi
- Prisma okuma/yazma adapter'ının DB'deki veya doğrudan repository'ye gelen çek para birimini P0 işlem para birimi olan `TL` değerine normalize etmesi
- Audit metadata okuma/yazma adapter'ının çek geçmişindeki para birimini P0 işlem para birimi olan `TL` değerine normalize etmesi
- `/cek` yazdırma aksiyonu mevcut çek portföy listesi kapsamı için tarayıcı yazdırma akışını başlatır
- `/cek` bordro, PDF önizleme ve yenile aksiyonları P0/server-render sınır mesajı gösterir, sessiz no-op kalmaz
