# Raporlar P0 Operasyon Özeti Notu

Bu not `/raporlar` modülünün ilk çalışan SaaS dilimini açıklar. Amaç eski masaüstü rapor menüsünü birebir kopyalamak değil, mevcut hareketlerden karar verilebilir P0 özet üretmektir.

## Kapsam

Bu dilimde yeni rapor tablosu, materialized view veya ledger migration açılmadı. `/raporlar`, mevcut normalize hareket kaynaklarını salt okunur şekilde birleştirir:

- `PurchaseInvoice`
- `ProgressPayment`
- `Timesheet`
- `PayrollAccrual`
- `CashBankMovement`
- `Cheque`
- `Expense`

Raporun ilk kapsamı:

- `Rapor Para Birimi`
- `Kaydedildi` ve ödemesi oluşmamış alış faturalarının toplam borcu
- `Kaydedildi` alış faturalarının ödenen toplamı
- `Kaydedildi` alış faturalarının ödeme bekleyen toplamı
- `Kaydedildi` giderlerin toplamı
- `Kaydedildi` hakedişlerin toplamı
- `Kaydedildi` hakedişlerin ödenen toplamı
- `Kaydedildi` hakedişlerin ödeme bekleyen toplamı
- `Kaydedildi` şantiye geliri hakedişlerinin tahsil edilen toplamı
- `Kaydedildi` şantiye geliri hakedişlerinin tahsilat bekleyen toplamı
- `Kaydedildi` puantajların net işçilik toplamı
- `Kaydedildi` maaş tahakkuklarının net toplamı
- `Kaydedildi` maaş tahakkuklarının ödenen toplamı
- `Kaydedildi` maaş tahakkuklarının ödeme bekleyen toplamı
- kasa/banka giriş toplamı
- kasa/banka çıkış toplamı
- kasa/banka net hareketi
- `Portföyde` çek toplamı
- vadesi geçmiş portföy çek toplamı
- şantiye bazlı gelir, alış maliyeti, gider maliyeti, hakediş maliyeti, işçilik ve net kârlılık özeti
- cari bazlı borç, alacak, ödeme, tahsilat ve net bakiye özeti
- cari seçimine göre yürüyen bakiyeli hareket ekstresi
- kaynak filtresi: tüm kaynaklar, fatura, gider, hakediş, puantaj, maaş, kasa/banka, çek
- tarih aralığı filtresi
- ekranda görünen filtreli rapor kapsamını tarayıcı yazdırma akışına gönderme
- son fatura, gider, hakediş, puantaj, maaş tahakkuku, kasa/banka ve çek hareketleri

Aynı okuma modeli ana dashboard tarafından da kullanılır. `/raporlar` filtreli analiz, `/` ise açılış özeti rolündedir.

## P0 Para Birimi Sözleşmesi

Raporlar P0 kapsamında ayrı bir döviz kolonu veya kur dönüşümü üretmez. Operasyon özeti, fatura, hakediş, çek ve kasa/banka satır modellerinde normalize edilmiş tutarları okur; ekran ve CSV çıktıları P0 işlem para birimi olan `TL` formatıyla sunulur.

`summarizeOperationalReports` çıktısı `currency` alanını doğrudan P0 ayar sözleşmesindeki `getP0BaseCurrencyTransactionValue()` değerinden üretir. `/raporlar` yüzeyi bu değeri `Rapor Para Birimi` metriği olarak gösterir. CSV dışa aktarımları da aynı sözleşmeyi `Para Birimi` kolonu ile taşır. Böylece eski/elle girilmiş kaynak satırları `USD` veya `EUR` taşısa bile rapor özetinin ve indirilen dosyanın para birimi sözleşmesi açıkça `TL` kalır.

Eski veya doğrudan repository seviyesinde girilmiş `USD`/`EUR` değerlerinin rapora sızmaması ilgili işlem repository'lerinin okuma/yazma normalizasyonuyla ve audit geçmişi için `AuditLogPrismaRepository` metadata normalizasyonuyla korunur. Çoklu dövizli rapor, kur farkı ve para birimi bazlı bakiye kırılımı P1 kapsamına bırakılmıştır.

## Hesaplama Sözleşmesi

Alış fatura borcu yalnız `Kaydedildi` durumundaki ve bağlı `Fatura Ödemesi` kasa/banka hareketi olmayan faturaların `grandTotal` toplamından üretilir. `Taslak` ve `İptal` faturalar rapor borcuna dahil edilmez.

Gider toplamı yalnız `Kaydedildi` durumundaki giderlerin `grandTotal` toplamından üretilir. Gider belgesi ilgili cari için borç etkisi oluşturur ve şantiye kârlılık özetinde ayrı `Gider Maliyeti` kolonu olarak maliyete eklenir. Gider kaydının oluşturduğu `sourceType=expense`, `movementType=Gider Ödemesi` kasa/banka hareketi ayrıca `Kasa/Banka` kaynak filtresinde nakit çıkışı olarak görünür; `Gider` filtresi seçildiğinde belge satırı ve belge toplamı gösterilir.

Fatura ödeme kırılımı, fatura kaydının kendi durumundan değil, ilişkili kasa/banka hareketinden okunur:

- `sourceType=purchase-invoice` ve `movementType=Fatura Ödemesi` olan kasa/banka hareketi varsa fatura `Ödenen Fatura` toplamına girer
- aynı hareket yoksa kesinleşmiş fatura `Ödeme Bekleyen Fatura` ve `Alış Fatura Borcu` toplamına girer
- ödeme hareketinin kendisi kasa/banka çıkışına dahil olmaya devam eder

Hakediş toplamı yalnız `Kaydedildi` durumundaki hakedişlerin `grandTotal` toplamından üretilir. `Taslak` ve `İptal` hakedişler üst rapora dahil edilmez; bunlar kendi işlem ekranında işlenmeye devam eder.

Hakediş ödeme/tahsilat kırılımı, hakediş kaydının kendi durumundan değil, ilişkili kasa/banka hareketinden okunur:

- `Taşeron Hakedişi` ve `Tedarikçi Hakedişi` için `sourceType=progress-payment` ve `movementType=Hakediş Ödemesi` olan kasa/banka hareketi varsa hakediş `Ödenen Hakediş` toplamına girer
- aynı ödeme hareketi yoksa kesinleşmiş taşeron/tedarikçi hakedişi `Ödeme Bekleyen Hakediş` toplamına girer
- `Şantiye Geliri` için `sourceType=progress-payment` ve `movementType=Hakediş Tahsilatı` olan kasa/banka hareketi varsa hakediş `Tahsil Edilen Hakediş Geliri` toplamına girer
- aynı tahsilat hareketi yoksa kesinleşmiş şantiye geliri hakedişi `Tahsilat Bekleyen Hakediş Geliri` toplamına girer
- ödeme hareketinin kendisi kasa/banka çıkışına, tahsilat hareketinin kendisi kasa/banka girişine dahil olmaya devam eder

Puantaj net toplamı yalnız `Kaydedildi` durumundaki puantajların `netTotal` toplamından üretilir. `Taslak` ve `İptal` puantajlar üst rapora dahil edilmez; bunlar kendi işlem ekranında işlenmeye devam eder.

Maaş tahakkuku toplamı yalnız `Kaydedildi` durumundaki tahakkukların `netTotal` toplamından üretilir. `Taslak` ve `İptal` tahakkuklar üst rapora dahil edilmez; bunlar `/personel` ekranındaki tahakkuk panelinde işlenmeye devam eder.

Maaş ödeme kırılımı, tahakkuk kaydının kendi durumundan değil, ilişkili kasa/banka hareketinden okunur:

- `sourceType=payroll-accrual` ve `movementType=Maaş Ödemesi` olan kasa/banka hareketi varsa tahakkuk `Ödenen Maaş` toplamına girer
- aynı hareket yoksa kesinleşmiş tahakkuk `Ödeme Bekleyen Maaş` toplamına girer
- ödeme hareketinin kendisi kasa/banka çıkışına dahil olmaya devam eder

Kasa/banka net hareketi:

- `Giriş` hareketleri pozitif toplanır
- `Çıkış` hareketleri negatif etki üretir
- net = giriş toplamı - çıkış toplamı
- fatura ödemeleri `Fatura Ödemesi` hareket tipiyle `Çıkış` olarak bu hesaba dahil olur
- hakediş ödemeleri `Hakediş Ödemesi` hareket tipiyle `Çıkış`, hakediş tahsilatları `Hakediş Tahsilatı` hareket tipiyle `Giriş` olarak bu hesaba dahil olur
- maaş tahakkuku ödemeleri `Maaş Ödemesi` hareket tipiyle `Çıkış` olarak bu hesaba dahil olur

Çek raporu yalnız `Portföyde` çekleri dikkate alır. Vadesi geçmiş çek toplamı, `dueDate < today` kuralıyla hesaplanır.

Şantiye kârlılık özeti, yeni bir snapshot veya ledger tablosu açmadan mevcut kesinleşmiş kaynaklardan üretilir:

- gelir = `Şantiye Geliri` tipindeki kesinleşmiş hakedişlerin `grandTotal` toplamı
- alış maliyeti = kesinleşmiş alış faturalarının `grandTotal` toplamı
- hakediş maliyeti = `Taşeron Hakedişi` ve `Tedarikçi Hakedişi` tipindeki kesinleşmiş hakedişlerin `grandTotal` toplamı
- işçilik = kesinleşmiş maaş tahakkuklarının `netTotal` toplamı + maaş tahakkukuna bağlanmamış kesinleşmiş puantajların `netTotal` toplamı
- gider maliyeti = kesinleşmiş giderlerin `grandTotal` toplamı
- toplam maliyet = alış maliyeti + gider maliyeti + hakediş maliyeti + işçilik
- net = gelir - toplam maliyet

Puantajdan maaş tahakkuku üretildiyse aynı işçilik iki kez sayılmaz. Bunun için `PayrollAccrual.sourceTimesheetId` ile ilişkili puantajlar şantiye kârlılık işçilik hesabında ayrıca toplanmaz.

Cari bakiye özeti, detaylı hareket ekstresi açmadan mevcut kesinleşmiş belge ve kasa/banka hareketlerinden üretilir:

- borç belgesi = kesinleşmiş alış faturaları + kesinleşmiş giderler + `Şantiye Geliri` dışındaki kesinleşmiş hakedişler + kesinleşmiş maaş tahakkukları
- alacak belgesi = `Şantiye Geliri` tipindeki kesinleşmiş hakedişler
- ödenen = cari adına yazılmış `Çıkış` yönlü kasa/banka hareketleri
- tahsil edilen = cari adına yazılmış `Giriş` yönlü kasa/banka hareketleri
- net bakiye = alacak belgesi - borç belgesi + ödenen - tahsil edilen

Net bakiye pozitifse ilgili cari için alacak, negatifse ilgili cari için borç yönü okunur. Bu P0 tablo, ayrı bir ledger tablosu açmadan hareket dökümüyle desteklenir; tedarikçi/taşeron cari ekstre ekranları açıldığında aynı formül modül detaylarına taşınmalıdır.

Cari hareket ekstresi, cari bakiye özetindeki formülü satır bazında açıklar:

- alış faturası kesinleştiğinde ilgili cari için `Borç` hareketi ve negatif tutar üretir
- gider kesinleştiğinde ilgili cari için `Borç` hareketi ve negatif tutar üretir
- `Şantiye Geliri` tipindeki hakediş kesinleştiğinde ilgili cari için `Alacak` hareketi ve pozitif tutar üretir
- `Taşeron Hakedişi`, `Tedarikçi Hakedişi` ve maaş tahakkuku kesinleştiğinde ilgili cari için `Borç` hareketi ve negatif tutar üretir
- kasa/banka `Çıkış` hareketi ilgili cari için `Ödeme` hareketi ve pozitif tutar üretir
- kasa/banka `Giriş` hareketi ilgili cari için `Tahsilat` hareketi ve negatif tutar üretir
- yürüyen bakiye, aynı cari içindeki tarih sıralı hareketlerin imzalı tutar toplamıdır

Bu ekstre P0 seviyede rapor ekranında seçimli olarak sunulur. Aynı hareket sözleşmesi tedarikçi ve taşeron kart ekranlarında seçili cari için `Hesap Ekstresi` paneli olarak da kullanılır. Evrak numarası ilgili işlem ekranına `evrak` query değeriyle bağlantı verir. Hedef işlem ekranı eşleşen evrak satırını vurgular. Ekranda görünen cari hareket ekstresi CSV olarak indirilebilir. Şantiye kârlılık özeti, cari bakiye özeti ve son hareketler tabloları da ekranda üretilen satırlara göre CSV çıktısı verir. Tüm P0 rapor CSV çıktıları tutar kolonlarının yanında tek `Para Birimi` kolonu üretir ve bu değer P0 işlem para birimi olan `TL` değeridir. `Yazdır` aksiyonu kaynak ve tarih filtreleriyle üretilen mevcut rapor kapsamını tarayıcı yazdırma akışına gönderir; P0 seviyede ayrı PDF üretmez. Hareket satırı açıklama kırılımı, otomatik form açma, XLSX/PDF çıktısı ve gelişmiş dışa aktarım işleri bu sözleşmenin üzerine eklenmelidir.

Son hareket listesi şu kaynakları tek tabloda gösterir:

- kesinleşmiş alış faturaları
- kesinleşmiş giderler
- kesinleşmiş hakedişler
- kesinleşmiş puantajlar
- kesinleşmiş maaş tahakkukları
- kasa/banka hareketleri
- portföy çekleri

Son hareket satırları kaynak kayıt id'sinden türetilen stabil ctivityRows[].id alanını taşır. Bu alan /raporlar ve ana dashboard tablolarında React liste kimliği olarak kullanılır; aynı kaynak id yinelenirse servis deterministik #2, #3 soneki üretir. Tutar, tarih veya kaynak adı tek başına kimlik kabul edilmez.

Filtreler uygulandığında hem metrikler hem de son hareket listesi aynı kapsamdan yeniden üretilir. Tarih alanı kaynak tipine göre yorumlanır:

- fatura için `invoiceDate`
- gider için `expenseDate`
- hakediş için `issueDate`
- puantaj için ilgili ayın son günü
- maaş tahakkuku için ilgili ayın son günü
- kasa/banka için `movementDate`
- çek için `dueDate`

Başlangıç ve bitiş tarihleri boş bırakılabilir. Sadece dolu olan tarih sınırı uygulanır.

## Bilinçli Sınırlar

- Detaylı şantiye bütçe karşılaştırması henüz yok
- hedef işlem ekranında `evrak` query değerine göre satır vurgusu var; otomatik form açma henüz yok
- stok durum raporu henüz ayrı rapor olarak açılmadı
- cari hareket ekstresi, şantiye kârlılık özeti, cari bakiye özeti ve son hareketler için CSV dışa aktarım başlangıcı ve filtreli kapsamı tarayıcıdan yazdırma aksiyonu var; XLSX/PDF çıktıları yok
- rapor snapshot tablosu yok
- yetki bazlı rapor alan gizleme yok

Bu sınır bilinçli tutuldu. Önce mevcut hareket kaynaklarının aynı ekranda doğru ve testli okunması sağlandı; CSV başlangıcı ve yazdırma aksiyonu ekranda görünen rapor satırlarıyla aynı okuma modeline bağlandı. XLSX/PDF ve detay raporlar bu sözleşmenin üstüne eklenmelidir.

## Doğrulama Kapsamı

Eklenen testler:

- `src/lib/reports-service.test.ts`
- `src/components/reports-surface.test.tsx`

Kapsanan davranış:

- yalnız kesinleşmiş ve ödenmemiş alış faturaları borç toplamına girer
- kesinleşmiş alış faturaları, bağlı `Fatura Ödemesi` kasa/banka hareketine göre ödenen ve ödeme bekleyen toplamlarına ayrılır
- yalnız kesinleşmiş hakedişler hakediş toplamına girer
- kesinleşmiş taşeron/tedarikçi hakedişleri, bağlı `Hakediş Ödemesi` kasa/banka hareketine göre ödenen ve ödeme bekleyen toplamlarına ayrılır
- kesinleşmiş şantiye geliri hakedişleri, bağlı `Hakediş Tahsilatı` kasa/banka hareketine göre tahsil edilen ve tahsilat bekleyen toplamlarına ayrılır
- yalnız kesinleşmiş puantajlar puantaj net toplamına girer
- yalnız kesinleşmiş maaş tahakkukları maaş tahakkuku toplamına girer
- kesinleşmiş maaş tahakkukları, bağlı `Maaş Ödemesi` kasa/banka hareketine göre ödenen ve ödeme bekleyen toplamlarına ayrılır
- kasa/banka giriş, çıkış ve net toplamları hesaplanır
- yalnız portföy çekleri çek toplamına girer
- vadesi geçmiş çek toplamı tarih karşılaştırmasıyla hesaplanır
- rapor summary para birimi kaynak satır dövizlerinden bağımsız olarak P0 işlem para birimi olan `TL` değerinden üretilir
- `/raporlar` yüzeyi operasyon özeti ve son hareketleri gösterir
- `/raporlar` P0 tutarlarını ayrı döviz kırılımı üretmeden `TL` formatıyla gösterir ve `Rapor Para Birimi` metriğini `TL` olarak render eder
- `/raporlar` yüzeyi ödenen fatura ve ödeme bekleyen fatura metriklerini gösterir
- `/raporlar` yüzeyi gider toplamı metriğini ve gider kaynak filtresini gösterir
- `/raporlar` yüzeyi ödenen hakediş ve ödeme bekleyen hakediş metriklerini gösterir
- `/raporlar` yüzeyi tahsil edilen hakediş geliri ve tahsilat bekleyen hakediş geliri metriklerini gösterir
- `/raporlar` yüzeyi şantiye bazlı gelir, alış maliyeti, gider maliyeti, hakediş maliyeti, işçilik ve net kârlılık özetini gösterir
- maaş tahakkukuna bağlanan puantajlar şantiye kârlılık işçilik maliyetinde ikinci kez sayılmaz
- kesinleşmiş belgeler, giderler ve kasa/banka hareketleri cari bazlı net bakiye özetine yansır
- `/raporlar` yüzeyi cari bazlı borç, alacak, ödeme, tahsilat ve net bakiye tablosunu gösterir
- cari hareket ekstresi satırlarında belge, ödeme ve tahsilat hareketleri yürüyen bakiyeyle gösterilir
- `/raporlar` yüzeyi seçilen cariye göre hareket ekstresi tablosunu daraltır
- `/tedarikciler` ve `/taseronlar` yüzeyleri seçili kart için aynı hareket ekstresi sözleşmesini panel olarak gösterir
- ekstre evrak numarası ilgili `/faturalar`, `/giderler`, `/hakedis`, `/kasa-banka` veya `/personel` route'una bağlantı verir
- hedef işlem yüzeyleri `evrak` query değerine göre eşleşen işlem satırını vurgular
- `/raporlar`, `/tedarikciler` ve `/taseronlar` cari hareket ekstresi CSV çıktısı ekranda görünen satırlara göre ve P0 `Para Birimi=TL` kolonu ile üretilir
- `/raporlar` şantiye kârlılık özeti, cari bakiye özeti ve son hareketler CSV çıktıları mevcut filtreli rapor satırlarına göre ve P0 `Para Birimi=TL` kolonu ile üretilir
- `/raporlar` yazdırma aksiyonu mevcut filtreli rapor kapsamı için tarayıcı yazdırma akışını başlatır
- `/raporlar` yüzeyi kaynak ve tarih aralığı filtresiyle metrikleri ve son hareketleri birlikte daraltır
- gider kaynak filtresi yalnız kesinleşmiş gider hareketlerini gösterir
- hakediş kaynak filtresi yalnız kesinleşmiş hakediş hareketlerini gösterir
- puantaj kaynak filtresi yalnız kesinleşmiş puantaj hareketlerini gösterir
- maaş kaynak filtresi yalnız kesinleşmiş maaş tahakkuku hareketlerini gösterir
- `/raporlar` yüzeyi ödenen maaş ve ödeme bekleyen maaş metriklerini gösterir


