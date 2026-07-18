# Kasa/Banka Hareket Altyapı Notu

Bu not, `Kasa/Banka` modülünün tanım ekranından işlem hareketi ekranına doğru ilk genişletmesini açıklar. Ana ilke değişmedi: eski pencere görünümü değil, finansal iş akışı korunur.

## Kapsam

İlk dilimde çek tahsilinden doğan finansal hareketin kalıcı ve okunabilir olması sağlandı. Devam dilimlerinde aynı altyapı manuel `Tahsilat`, `Ödeme` ve kasa/banka `Virman` hareketlerini de kabul edecek şekilde genişletildi.

Bağlanan ilk kaynak:

- `cheque.collect` başarılı olduğunda `CashBankMovement` kaydı oluşur.
- Hareket tipi `Çek Tahsilatı` olur.
- Hareket yönü `Giriş` olur.
- Hareket hesabı, çek tahsili sırasında kullanıcının seçtiği aktif kasa/banka hesabından gelir.

Bağlanan manuel kaynak:

- Kullanıcı `/kasa-banka` ekranında `Yeni Hareket` ile formu açar.
- `Tahsilat` seçilirse hareket yönü `Giriş` olur.
- `Ödeme` seçilirse hareket yönü `Çıkış` olur.
- Hesap, tarih, evrak no, cari, tutar ve açıklama alanları alınır.
- P0 finans sözleşmesine göre manuel hareket para birimi baz işlem para birimi olan `TL` olarak kilitlidir; form başlığında `Baz Para: TRY` ve `Çoklu Döviz: P1 için kapalı` bağlamı görünür. Server servis katmanı da doğrudan gelen manuel hareket para birimini P0 işlem para birimi olan `TL` değerine normalize eder.
- Kayıt `sourceType=manual` ile izlenebilir hale gelir.

Bağlanan virman kaynağı:

- Kullanıcı `/kasa-banka` ekranında `Virman` ile formu açar.
- `Çıkış Hesabı` ve `Giriş Hesabı` farklı aktif kasa/banka hesaplarından seçilir.
- Tek evrak no ile iki `CashBankMovement` satırı oluşur.
- Çıkış hesabı için `Virman / Çıkış` satırı, giriş hesabı için `Virman / Giriş` satırı üretilir.
- P0 finans sözleşmesine göre virman para birimi `TL` olarak kilitlidir; farklı dövizli hesap kartı tanımları P1 çoklu döviz kapsamına kadar hareket para birimini değiştirmez. Server servis katmanı da virman payload'ındaki para birimini aynı P0 işlem para birimine normalize eder.
- İki satır aynı `sourceLabel` değerini taşır, fakat tekillik kuralına uymak için farklı `sourceId` uçlarıyla saklanır.
- Bakiye özeti çıkış hesabında düşüş, giriş hesabında artış gösterir.

Bağlanan maaş tahakkuku kaynağı:

- Kullanıcı `/personel` ekranında `Kaydedildi` maaş tahakkuku için `Ödeme Oluştur` aksiyonunu çalıştırır.
- `CashBankMovement` kaydı `sourceType=payroll-accrual` ve `movementType=Maaş Ödemesi` ile oluşur.
- Hareket yönü `Çıkış` olur.
- Evrak no `ODM-{MaaşTahakkukNo}` formatında üretilir.
- Tutar, tahakkukun `netTotal` değerinden gelir.
- Hesap, `/personel` tahakkuk panelindeki `Ödeme hesabı` seçiminden gelir.
- Server tarafı, seçilen hesabı aktif `kasa-banka` tanımları içinden yeniden çözer; client tarafından değiştirilen hesap adı kullanılmaz.
- Aynı tahakkuk için ikinci maaş ödeme hareketi oluşturulmaz.

Bağlanan alış faturası kaynağı:

- Kullanıcı `/faturalar` ekranında `Kaydedildi` alış faturası için `Ödeme Oluştur` aksiyonunu çalıştırır.
- `CashBankMovement` kaydı `sourceType=purchase-invoice` ve `movementType=Fatura Ödemesi` ile oluşur.
- Hareket yönü `Çıkış` olur.
- Evrak no `ODM-{FaturaNo}` formatında üretilir.
- Tutar, faturanın `grandTotal` değerinden gelir.
- Para birimi, fatura satırındaki eski/elle girilmiş döviz değerinden bağımsız olarak P0 işlem para birimi olan `TL` değerinden üretilir.
- Hesap, `/faturalar` hareket listesindeki `Ödeme hesabı` seçiminden gelir.
- Server tarafı, seçilen hesabı aktif `kasa-banka` tanımları içinden yeniden çözer; client tarafından değiştirilen hesap adı kullanılmaz.
- Aynı alış faturası için ikinci ödeme hareketi oluşturulmaz.

Bağlanan hakediş kaynağı:

- Kullanıcı `/hakedis` ekranında `Kaydedildi` taşeron/tedarikçi hakedişi için `Ödeme Oluştur` aksiyonunu çalıştırır.
- `CashBankMovement` kaydı `sourceType=progress-payment` ve `movementType=Hakediş Ödemesi` ile oluşur.
- Hareket yönü `Çıkış` olur.
- Evrak no `ODM-{HakedişNo}` formatında üretilir.
- Tutar, hakedişin `grandTotal` değerinden gelir.
- Para birimi, hakediş satırındaki eski/elle girilmiş döviz değerinden bağımsız olarak P0 işlem para birimi olan `TL` değerinden üretilir.
- Hesap, `/hakedis` hareket listesindeki `Ödeme/Tahsilat hesabı` seçiminden gelir.
- Server tarafı, seçilen hesabı aktif `kasa-banka` tanımları içinden yeniden çözer; client tarafından değiştirilen hesap adı kullanılmaz.
- Aynı hakediş için ikinci ödeme hareketi oluşturulmaz.
- `Şantiye Geliri` tipindeki hakedişler bu çıkış ödeme akışına alınmaz; `Hakediş Tahsilatı` giriş hareketiyle kapatılır.

Bağlanan şantiye geliri hakedişi kaynağı:

- Kullanıcı `/hakedis` ekranında `Kaydedildi` şantiye geliri hakedişi için `Tahsilat Oluştur` aksiyonunu çalıştırır.
- `CashBankMovement` kaydı `sourceType=progress-payment` ve `movementType=Hakediş Tahsilatı` ile oluşur.
- Hareket yönü `Giriş` olur.
- Evrak no `THS-{HakedişNo}` formatında üretilir.
- Tutar, hakedişin `grandTotal` değerinden gelir.
- Para birimi, şantiye geliri hakediş satırındaki eski/elle girilmiş döviz değerinden bağımsız olarak P0 işlem para birimi olan `TL` değerinden üretilir.
- Hesap, `/hakedis` hareket listesindeki `Ödeme/Tahsilat hesabı` seçiminden gelir.
- Server tarafı, seçilen hesabı aktif `kasa-banka` tanımları içinden yeniden çözer; client tarafından değiştirilen hesap adı kullanılmaz.
- Aynı şantiye geliri hakedişi için ikinci tahsilat hareketi oluşturulmaz.

Eğer hesap seçenekleri okunamazsa uygulama geriye dönük güvenlik ağı olarak `KASA-0001 / MERKEZ KASA` varsayılanını kullanır.

## Veri Modeli

`CashBankMovement` tablosu şu alanları taşır:

- `tenantId`, `companyId`, `periodId`
- `accountCode`, `accountName`
- `movementDate`
- `movementType`
- `direction`
- `documentNo`
- `counterpartyName`
- `amount`, `currency`
- `description`
- `sourceType`, `sourceId`, `sourceLabel`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

Tekillik kuralı:

- Aynı tenant/firma/dönem içinde aynı `sourceType`, `sourceId`, `movementType` birleşimi ikinci kez yazılmaz.

Bu kural çek tahsili, virman, alış faturası ödemesi, hakediş ödemesi, hakediş tahsilatı ve maaş tahakkuku ödeme hareketlerinin idempotent davranışını veritabanı seviyesinde de destekler.

## UI Davranışı

`/kasa-banka` route'u hesap tanımları akışını korur ve üst bölümde otomatik hareketleri gösterir.

`/cek` route'u aktif `kasa-banka` tanımlarını okur ve `Tahsil Hesabı` seçimi olarak kullanıcıya sunar. Tahsil edilen çekten doğan hareket bu seçilen hesapla yazılır.

`/kasa-banka` route'u artık aktif kasa/banka hesabı seçilerek manuel tahsilat ve ödeme hareketi üretir. Bu form doğrudan hesap tanımları CRUD yüzeyinin yerine geçmez; hesap kartları aynı sayfada korunur, finansal hareketler ise üst bölümde işlenir.

Virman formu da aynı finansal hareket alanında çalışır. Manuel hareket ve virman formları P0 ayar sözleşmesinden `Baz Para: TRY` ve `Çoklu Döviz: P1 için kapalı` bilgisini okur; para birimi alanı `TL` olarak kilitli görünür. Bu yaklaşım eski uygulamadaki kasa/banka arası aktarım iş akışını korur; ancak ayrı bir masaüstü pencere düzeni kopyalanmaz.

`/personel` route'u maaş tahakkuku ödeme hareketlerini kendi tahakkuk panelinde `Bekliyor/Ödendi` olarak gösterir. Ödenmiş satırda hareketin hesap adı ve tarihi de aynı `Ödeme` kolonunda görünür; üst özet ise ödenen ve ödeme bekleyen tahakkuk sayılarını ayırır. Aynı panel aktif kasa/banka tanımlarını `Ödeme hesabı` seçimi olarak okur; server action bu seçimi tekrar aktif tanımlara karşı doğrular. Hareketin finansal sonucu seçilen hesapla `/kasa-banka`, dashboard ve `/raporlar` tarafında mevcut kasa/banka okuma modeliyle görünür.

`/faturalar` route'u alış faturası ödeme hareketlerini kendi hareket listesinde `Bekliyor/Ödendi` olarak gösterir. Ödenmiş satırda hareketin hesap adı ve tarihi aynı `Ödeme` kolonunda görünür. Aynı liste aktif kasa/banka tanımlarını `Ödeme hesabı` seçimi olarak okur; server action bu seçimi tekrar aktif tanımlara karşı doğrular. Hareketin finansal sonucu seçilen hesapla `/kasa-banka`, dashboard ve `/raporlar` tarafında mevcut kasa/banka okuma modeliyle görünür.

`/hakedis` route'u taşeron/tedarikçi hakedişi ödeme hareketlerini kendi hareket listesinde `Bekliyor/Ödendi` olarak gösterir. Şantiye geliri hakedişlerini ise `Tahsilat Bekliyor/Tahsil Edildi` olarak kapatır. Ödenmiş veya tahsil edilmiş satırda hareketin hesap adı ve tarihi aynı `Ödeme/Tahsilat` kolonunda görünür. Aynı liste aktif kasa/banka tanımlarını `Ödeme/Tahsilat hesabı` seçimi olarak okur; server action bu seçimi tekrar aktif tanımlara karşı doğrular. Hareketin finansal sonucu seçilen hesapla `/kasa-banka`, dashboard ve `/raporlar` tarafında mevcut kasa/banka okuma modeliyle görünür.

`/raporlar` operasyon özeti, aynı `sourceType=payroll-accrual` ve `movementType=Maaş Ödemesi` izini kullanarak kesinleşmiş maaş tahakkuklarını ödenen ve ödeme bekleyen tutarlara ayırır. Böylece ödeme durumu ayrı bir alanla elle işaretlenmez; finansal hareketin varlığı iş akışının kanıtı olur.

`/raporlar` operasyon özeti, aynı yaklaşımı `sourceType=purchase-invoice` ve `movementType=Fatura Ödemesi` iziyle alış faturalarına uygular. `Alış Fatura Borcu` yalnız ödeme hareketi olmayan kesinleşmiş faturaların toplamıdır.

`/raporlar` operasyon özeti, aynı yaklaşımı `sourceType=progress-payment` ve `movementType=Hakediş Ödemesi` iziyle taşeron/tedarikçi hakedişlerine uygular. `Şantiye Geliri` hakedişleri `movementType=Hakediş Tahsilatı` iziyle `Tahsil Edilen Hakediş Geliri` ve `Tahsilat Bekleyen Hakediş Geliri` tutarlarına ayrılır. Kesinleşmiş hakedişler toplamı korunur.

Sayfada görünen yeni alanlar:

- `Giriş Toplamı`
- `Çıkış Toplamı`
- `Hareket Adedi`
- `Yeni Hareket` ve `Hareket Kaydet` aksiyonları
- `Virman` ve `Virman Kaydet` aksiyonları
- manuel hareket ve virman form başlığında P0 baz para / çoklu döviz sınırı
- `Hareketleri Yazdır` aksiyonu
- `Hesap Bakiye Özeti`
- `Otomatik Hareketler` tablosu

`Hareketleri Yazdır`, üst kasa/banka hareket alanında görünen finansal hareket listesinin kapsamını kullanıcıya bildirir ve tarayıcı yazdırma akışını başlatır. Aynı sayfanın altındaki hesap tanımları panelinde bulunan `Yazdır` aksiyonu ise hesap kartı listesinin kapsamına aittir. Bu iki çıktı kapsamı bilinçli olarak ayrıdır.

`Hesap Bakiye Özeti`, hesap kartındaki açılış bakiyesi ile hareket tablosundaki giriş/çıkış satırlarını birleştirerek anlık okuma modeli üretir. Bu tablo şu bilgileri gösterir:

- Hesap adı ve kodu
- Hesap tipi
- Açılış bakiyesi
- Toplam giriş
- Toplam çıkış
- Güncel hesaplanan bakiye

Bu davranış eski ön muhasebe akışındaki "hesabın son durumunu aynı iş ekranında görme" ihtiyacını korur; ancak MVP güvenliği için hesap kartındaki `balance` alanına otomatik yazım yapmaz.

P0 finans sözleşmesi hareket helper, okuma adapter'ı ve yazma adapter'ında korunur. Çek tahsilatı, alış fatura ödemesi, hakediş ödemesi ve hakediş tahsilatı hareketleri kaynak satırdaki eski/elle girilmiş `USD` veya `EUR` değerinden bağımsız olarak `TL` üretir. `CashBankMovementPrismaRepository`, DB'deki eski/elle girilmiş döviz hareket para birimlerini P0 işlem para birimi olan `TL` değerine normalize ederek row modeline taşır; repository'ye doğrudan dövizli row verilse bile create payload'ı `TL` olarak kalıcılaştırılır. Çoklu dövizli bakiye okuma modeli P1 kapsamına bırakılır.

Hareket tablosu şu kolonları gösterir:

- Tarih
- Evrak No
- Hareket
- Hesap
- Cari
- Tutar
- Yön

Hesap tanımları CRUD yüzeyi aynı sayfada korunur.

## Bilinçli Sınırlar

Bu dilimde yapılmayanlar:

- Hesap bakiyesinin `EntityRecord.balance` alanına otomatik yazılması
- Muhasebe fişi veya çift taraflı yevmiye kaydı
- hareket listesi için ayrı PDF/XLSX çıktı şablonu

Bu sınırlar bilinçlidir; amaç çek iş akışından doğan otomatik finansal iz, alış faturası ödemesi, hakediş ödemesi, maaş tahakkuku ödemesi ve kullanıcı kaynaklı temel tahsilat/ödeme/virman hareketlerini aynı okuma modelinde güvenilir hale getirmekti.

## Doğrulama Kapsamı

Eklenen testler:

- `src/lib/cash-bank-movement-prisma-repository.test.ts`
- `src/components/cash-bank-surface.test.tsx`
- `src/lib/cash-bank-movement-service.test.ts`
- `src/lib/cheque-service.test.ts` içinde çek tahsilinden hareket üretimi testi

Kapsanan davranış:

- Prisma create/list adapter sözleşmesi
- Tenant/firma/dönem scoped hareket listesi
- Çek tahsilinden tek hareket üretimi
- İkinci tahsil çağrısında yeni hareket oluşmaması
- Seçilen çek tahsil hesabının hareket hesabı olarak yazılması
- Çek tahsilatı, alış fatura ödemesi, hakediş ödemesi ve hakediş tahsilatı helper'larının kaynak satırdaki döviz değerinden bağımsız olarak `TL` hareket üretmesi
- Hesap açılış bakiyesi ve hareketlerden güncel bakiye özeti hesaplanması
- Muhasebe yetkisi olan kullanıcının manuel tahsilat/ödeme hareketi oluşturabilmesi
- Manuel kasa/banka hareket formunun P0 baz para ve çoklu döviz sınırını göstermesi, hareket para birimini `TL` olarak kilitlemesi ve servis katmanının doğrudan gelen manuel hareket para birimini `TL` değerine normalize etmesi
- Viewer rolünün manuel kasa/banka hareketi oluşturamaması
- Virman işleminin iki hareket satırı üretmesi
- Virman formunun P0 baz para ve çoklu döviz sınırını göstermesi, virman para birimini `TL` olarak kilitlemesi ve servis katmanının doğrudan gelen virman para birimini `TL` değerine normalize etmesi
- Kasa/banka Prisma okuma/yazma adapter'ının DB'deki veya doğrudan repository'ye gelen hareket para birimini P0 işlem para birimi olan `TL` değerine normalize etmesi
- Virman sonrası çıkış ve giriş hesaplarının bakiye özetinde ters yönlü güncellenmesi
- Alış faturasından tek `Fatura Ödemesi` çıkış hareketi üretmesi
- Alış faturası ödemesinde seçilen aktif hesabın hareket hesabı olarak yazılması
- Ödenmiş alış faturası satırında ödeme hesabı ve hareket tarihinin görünmesi
- `/raporlar` ve dashboard operasyon özetinde alış faturalarının ödenen ve ödeme bekleyen tutarlara ayrılması
- İkinci fatura ödeme çağrısında yeni hareket oluşturmaması
- Hakedişten tek `Hakediş Ödemesi` çıkış hareketi üretmesi
- Hakediş ödemesinde seçilen aktif hesabın hareket hesabı olarak yazılması
- `Şantiye Geliri` tipindeki hakedişin ödeme hareketi olarak reddedilmesi
- Ödenmiş hakediş satırında ödeme hesabı ve hareket tarihinin görünmesi
- `/raporlar` ve dashboard operasyon özetinde hakedişlerin ödenen/ödeme bekleyen ve tahsil edilen/tahsilat bekleyen tutarlara ayrılması
- İkinci hakediş ödeme veya tahsilat çağrısında yeni hareket oluşturmaması
- Maaş tahakkukundan tek `Maaş Ödemesi` çıkış hareketi üretmesi
- Maaş tahakkuku ödemesinde seçilen aktif hesabın hareket hesabı olarak yazılması
- Pasif veya bilinmeyen maaş ödeme hesabının server tarafında reddedilmesi
- Ödenmiş maaş tahakkuku satırında ödeme hesabı ve hareket tarihinin görünmesi
- Maaş tahakkuku özetinde ödenen ve ödeme bekleyen tahakkuk sayılarının görünmesi
- `/raporlar` operasyon özetinde maaş tahakkuklarının ödenen ve ödeme bekleyen tutarlara ayrılması
- İkinci maaş ödeme çağrısında yeni hareket oluşturmaması
- `/kasa-banka` yüzeyinde hareket ve hesap tanımlarının birlikte görünmesi
- `/kasa-banka` hareket yazdırma aksiyonunun hareket listesi kapsamı için tarayıcı yazdırma akışını başlatması


