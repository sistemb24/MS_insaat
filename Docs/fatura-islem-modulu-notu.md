# Fatura İşlem Modülü Notu

Bu not, ilk P0 işlem modülü olarak başlatılan `Faturalar` alanının mevcut kapsamını açıklar.

## Kaynak Yorumu

Öncelikli kaynak ekran görüntüsüdür:

- `NOA-insaat-SS görseller/.../06-Hareketler/Tedarikçi/Alış Faturası/Ekran görüntüsü 2026-06-23 215855.png`

Destekleyici HTML kaynakları:

- `stitch_HTML_sablonlar/al_faturasi_ekle.html`
- `stitch_HTML_sablonlar/al_faturasi final.html`

Eski pencerede korunması gereken ana iş akışı şudur:

1. Evrak no, tarih, vade, tedarikçi, şantiye, döviz/kur gibi fatura başlığı girilir.
2. Stok/hizmet satır grid'inde miktar, birim fiyat, iskonto ve KDV oranları girilir.
3. Alt bölümde ara toplam, iskonto, KDV, tevkifat ve genel toplam izlenir.
4. Kaydet, sil, yazdır ve PDF/çıktı aksiyonları aynı işlem bağlamında çalışır.

Yeni SaaS üründe eski pencere görünümü birebir kopyalanmaz; bu başlık-satır-toplam iş akışı korunur.

## Mevcut MVP Kapsamı

Bu dilimde fatura modülü şu seviyeye getirildi:

- `PurchaseInvoice` başlık tablosu eklendi.
- `PurchaseInvoiceLine` satır tablosu eklendi.
- Tenant/firma/dönem kapsamı ve evrak no benzersizliği korundu.
- Alış faturası toplam hesapları testli domain fonksiyonlarına alındı.
- Server-side servis ve Prisma repository adapter eklendi.
- `/faturalar` route'u placeholder yüzeyden çıkarılıp PostgreSQL verisi okuyan ilk işlem yüzeyine bağlandı.
- `pnpm db:seed` örnek `FAT-0006` alış faturasını idempotent şekilde ekler.
- Alış faturası form editörü eklendi.
- Tedarikçi ve şantiye seçimleri Tanımlar verisinden lookup olarak beslenir.
- Çok satırlı stok/hizmet grid'i ile miktar, birim fiyat, iskonto ve KDV girildiğinde toplamlar anlık hesaplanır.
- Satır grid'inde aktif stok kartlarından seçim yapılabilir; kart seçimi stok kodu, stok/hizmet adı, birim ve varsayılan depo alanlarını doldurur.
- Stok kartı seçimi zorunlu değildir; eski NOA iş akışındaki serbest stok/hizmet girişi korunur.
- Satır ekle/sil davranışı eklendi; son satır silinirse boş bir satır korunur.
- Satır açıklaması ve depo alanı payload'a taşınır.
- Satır stok kodu payload'a taşınır; `/stok-depo` okuma modeli kod varsa depo/stok anahtarında bu kodu kullanır.
- `/stok-depo`, `Kaydedildi` durumundaki alış faturalarının depo alanı dolu satırlarından ilk stok/depo okuma modelini üretir.
- `Kaydet` aksiyonu `createPurchaseInvoiceAction` üzerinden gerçek PostgreSQL kaydı oluşturur.
- Hareket listesindeki mevcut alış faturası `Düzenle` aksiyonu ile aynı forma geri alınır.
- Düzenlenen kayıtta `id`, oluşturma audit bilgisi ve durum korunur; başlık, satırlar, `updatedAt/updatedBy` ve toplamlar yeniden yazılır.
- Güncelleme `updatePurchaseInvoiceAction` üzerinden PostgreSQL'e gider; satır grid'i nested update içinde mevcut satırları yenileyerek kaydedilir.
- Hareket listesindeki alış faturası `İptal Et` aksiyonu ile fiziksel silinmeden `İptal` durumuna alınır.
- İptal edilen faturanın başlık/satır/toplam bilgileri audit izi için korunur; `updatedAt/updatedBy` güncellenir.
- İptal kayıt listede görünür kalır, düzenleme ve tekrar iptal aksiyonları kilitlenir.
- Üst metrik toplamları sadece aktif faturaları toplar; `İptal` durumundaki kayıtlar finansal etkiye dahil edilmez.
- `Taslak` faturalar `Kesinleştir` aksiyonu ile `Kaydedildi` durumuna alınır.
- `Kaydedildi` durumundaki fatura düzenlemeye ve tekrar kesinleştirmeye kapatılır; iptal aksiyonu açık kalır.
- `Kaydedildi` çağrısı idempotenttir; aynı kayıt tekrar kesinleştirilmeye çalışılırsa mevcut audit zamanı korunur.
- `İptal` durumundaki kayıtlar tekrar kesinleştirilemez.
- `Kaydedildi` alış faturası için `/faturalar` ekranından tek seferlik `Fatura Ödemesi` kasa/banka çıkış hareketi oluşturulur.
- Ödeme hareketi aktif kasa/banka tanımlarından seçilen hesapla oluşturulur; seçenek okunamazsa geriye dönük varsayılan `KASA-0001 / MERKEZ KASA` korunur.
- Server action, doğrudan POST denemelerinde seçilen ödeme hesabının aktif `kasa-banka` tanımlarında yer aldığını doğrular.
- Fatura listesi, oluşmuş ödeme hareketinin hesabını ve hareket tarihini `Ödeme` kolonunda gösterir.
- Aynı alış faturasından ikinci ödeme hareketi üretimi engellenir.
- Fatura mutasyonları ilk rol kontrolüne bağlandı: `admin` ve `accounting` işlem yapabilir, `viewer` sadece okuyabilir.
- UI aksiyon kilitleri ve server-side servis yetki kontrolü aynı `canMutatePurchaseInvoices` kararından beslenir.
- Fatura sayfası, üst bar bağlamı ve server action çağrıları artık PostgreSQL `AppSession` kaydını okuyan aktif session scope resolver üzerinden tenant/firma/dönem/kullanıcı/rol bilgisi alır.
- `noa-session-id=demo-viewer` gibi opak demo session değerleriyle viewer deneyimi test edilebilir; cookie içinde tenant veya rol JSON'u taşınmaz.
- Fatura create/update/kesinleştir/iptal mutasyonları artık merkezi `AuditLog` altyapısına kayıt yazar.
- Audit kaydı tenant/firma/dönem, işlem yapan kullanıcı, aksiyon, fatura id/evrak no ve JSON metadata alanlarıyla saklanır.
- `Kaydedildi` faturayı tekrar kesinleştirme ve `İptal` faturayı tekrar iptal etme idempotenttir; mevcut kayıt döner ve ikinci audit kaydı üretmez.
- Yetkisiz `viewer` mutasyon denemeleri veri değiştirmediği için audit hareketi üretmez.
- Fatura sayfası `purchase-invoice` audit kayıtlarını server tarafında okur ve fatura bazlı `İşlem Geçmişi` bölümünde gösterir.
- Geçmiş bölümü ilk MVP'de salt okunurdur; canlı güncelleme yerine server render/revalidate akışına dayanır.
- `pnpm db:seed`, `FAT-0006` demo faturası için işlem geçmişi panelinde görünen idempotent `Oluşturuldu` audit hareketini de üretir.
- `Yazdır` toolbar aksiyonu, ekranda görünen alış faturası hareket listesi kapsamını tarayıcı yazdırma akışına gönderir.
- `PDF Önizleme`, `Sil` ve `Yenile` toolbar aksiyonları P0 seviyede sessiz kalmaz; kullanıcıya mevcut sınırı ve doğru işlem yolunu belirten status mesajı gösterir.

Bu yazdırma davranışı P0 seviyede gerçek fatura PDF şablonu üretmez. Amaç eski NOA akışındaki "işlem listesinden çıktı al" alışkanlığını çalışır hale getirmek ve sonraki PDF/önizleme modülü için kapsam sözleşmesini net tutmaktır. Toolbar'daki `Sil` fiziksel silme yapmaz; kayıt yaşam döngüsü hareket satırındaki `İptal Et` aksiyonuyla yönetilir. `Yenile` ise canlı client refetch yerine server render/revalidate akışına bağlıdır.

## Hesaplama Sözleşmesi

Satır hesaplaması:

- `grossTotal = quantity * unitPrice`
- `discountRate1` önce brüt tutara uygulanır.
- `discountRate2` ilk iskonto sonrası kalan tutara uygulanır.
- `netTotal = grossTotal - discountTotal`
- `vatTotal = netTotal * vatRate / 100`
- `grandTotal = netTotal + vatTotal - withholdingTotal`

Bu aşamada `withholdingTotal` sıfırdır. Tevkifat/stopaj kuralları hakediş ve e-fatura kapsamıyla birlikte ayrıca modellenmelidir.

## P0 Para Birimi Sözleşmesi

Alış faturası P0 finans ayar sözleşmesini kullanır:

- Form bağlamında `Baz Para: TRY`, `Çoklu Döviz: P1 için kapalı` ve `Varsayılan KDV: %20` bilgisi görünür.
- Form payload'ı `getP0BaseCurrencyTransactionValue()` ile `TL` üretir.
- `createPurchaseInvoiceDraft()` doğrudan gelen `USD` veya `EUR` payload değerlerini P0 işlem para birimi olan `TL` değerine normalize eder.
- `PurchaseInvoicePrismaRepository` DB'deki eski/elle girilmiş döviz değerlerini okuma modelinde, doğrudan repository'ye gelen dövizli create/update row değerlerini de yazma payload'ında P0 işlem para birimi olan `TL` değerine normalize eder.
- Kur alanı P0'da hesaplamayı değiştiren serbest çoklu döviz alanı değildir; çoklu döviz ve kur yönetimi P1 kapsamına bırakılır.

Fatura ödeme hareketi, fatura başlığındaki ayrı bir ödeme durumu alanından değil kasa/banka hareketinden okunur:

- `sourceType=purchase-invoice`
- `movementType=Fatura Ödemesi`
- `sourceId = PurchaseInvoice.id`
- `direction=Çıkış`
- `documentNo=ODM-{FaturaNo}`

Bu hareket `/kasa-banka` bakiyesine çıkış olarak etki eder. `/raporlar` ve dashboard tarafındaki `Alış Fatura Borcu`, yalnız bu ödeme hareketi olmayan kesinleşmiş faturaların toplamıdır.

Fatura ödeme hareketi üretilirken kasa/banka helper katmanı da P0 para birimi sözleşmesini uygular. Fatura satırı eski/elle girilmiş `USD` veya `EUR` para birimi taşısa bile oluşan `Fatura Ödemesi` hareketi `TL` olarak üretilir.

## Form Editörü Kapsamı

İlk form editörü bilinçli olarak dar tutuldu:

- Başlık alanları: evrak no, fatura tarihi, vade tarihi, tedarikçi, şantiye.
- Satır alanları: stok kartı, stok/hizmet adı, açıklama, depo, birim, miktar, birim fiyat, iskonto 1, iskonto 2, KDV oranı.
- Sabit ilk değerler: TL, kur 1, resmi değil, tevkifat 0.
- Stok kartı seçildiğinde satır adı, birim ve depo karttan önerilir; kullanıcı bu alanları elle değiştirmeye devam edebilir.
- Kart seçmeden kaydedilen satırlar serbest giriş olarak kalır ve stok kodu boş taşınır.
- Domain helper doğrudan gelen fatura para birimini de P0 işlem para birimi olan `TL` değerine normalize eder.
- Prisma okuma/yazma adapter'ı listelenen ve kalıcılaştırılan fatura para birimini P0 işlem para birimi olan `TL` değerine normalize eder.
- Fatura ödeme hareketi helper'ı kaynak faturadaki döviz değerinden bağımsız olarak kasa/banka hareket para birimini `TL` üretir.
- Başarılı kayıttan sonra liste yerel olarak güncellenir ve `/faturalar` route'u revalidate edilir.
- Toolbar yazdırma aksiyonu aynı hareket listesindeki görünür kayıt sayısını kullanıcıya bildirir ve `window.print()` çağırır.
- Toolbar `PDF Önizleme`, `Sil` ve `Yenile` aksiyonları P0 sınır mesajı gösterir, sessiz no-op kalmaz.
- Server-side domain validasyonu halen son karar vericidir.

## Sonraki Dilim

Bir sonraki mantıklı adım audit log altyapısını diğer P0 hareket modüllerine genişletirken fatura kaydının oturum ve raporlama yaşam döngüsünü kontrollü hale getirmektir:

1. `AppSession` zeminini gerçek kullanıcı girişi ve firma/dönem seçici UI ile kullanılır hale getirmek.
2. İptal edilmiş, kaydedilmiş ve ödenmiş kayıtların rapor filtreleri ve belge düzeyi PDF çıktı davranışını netleştirmek.
3. Hareket grubu, resmi belge ve döviz/kur alanlarını kullanıcıya açmak.
4. PDF önizleme ve belge düzeyi yazdırma akışının ayrı çıktı modülü olarak tasarlanması.
5. Stok/depo için başlayan fatura kaynaklı okuma modelini normalize `StockMovement`, çıkış, transfer ve sayım/fire akışlarına genişletmek.



