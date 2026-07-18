# Maaş Tahakkuku İşlem Modülü Notu

Bu not, `Puantaj -> Maaş Tahakkuku` iş akışının ilk çalışan SaaS dilimini açıklar. Amaç eski masaüstü pencere görünümünü taşımak değil, kesinleşmiş puantajdan personel bazlı maaş tahakkuku üretme akışını kalıcı veri modeli, audit izi ve `/personel` yüzeyiyle başlatmaktır.

## Kapsam

Bu dilimde maaş tahakkuku PostgreSQL'e normalize edildi:

- `PayrollAccrual`: tahakkuk başlığı, kaynak puantaj bağlantısı, şantiye/taşeron, ay/yıl, brüt/kesinti/net toplamlar ve durum.
- `PayrollAccrualLine`: personel satırı, çalışma günü, mesai saati, brüt, avans/borç kesintisi ve net tutar.

İlk çalışan yüzey `/personel` route'unda yer alır. Personel tanımları korunur; aynı ekranın altında kesinleşmiş puantajlardan maaş tahakkuku üretme paneli açılır.

## İş Akışı Kararı

NOA planında korunması gereken ana akış `puantaj gir -> puantajı kesinleştir -> maaş tahakkuku üret -> ödeme/bordro adımlarına hazırla` zinciridir.

Bu dilimde:

- yalnız `Kaydedildi` durumundaki puantajlar tahakkuka hazır kabul edilir
- aynı puantajdan ikinci tahakkuk üretimi reddedilir
- tahakkuk belgesi `MAAS-{PuantajNo}` formatında açılır
- tahakkuk ilk durumda `Taslak` olarak oluşur
- tahakkuk `Kesinleştir` işlemiyle `Kaydedildi` durumuna geçer
- tahakkuk `İptal` işlemiyle rapor kapsamından çıkarılır
- kaynak puantaj numarası ve kaynak puantaj id'si saklanır
- başarılı oluşturma, kesinleştirme ve iptal işlemleri audit aksiyonu üretir
- yalnız `Kaydedildi` maaş tahakkukları dashboard ve `/raporlar` operasyon özetine yansır
- `Kaydedildi` tahakkuk için `/personel` ekranından tek seferlik `Maaş Ödemesi` kasa/banka çıkış hareketi oluşturulur
- ödeme hareketi aktif kasa/banka tanımlarından seçilen hesapla oluşturulur; seçenek okunamazsa geriye dönük varsayılan `KASA-0001 / MERKEZ KASA` korunur
- server action, doğrudan POST denemelerinde seçilen ödeme hesabının aktif `kasa-banka` tanımlarında yer aldığını doğrular
- tahakkuk listesi, oluşmuş ödeme hareketinin hesabını ve hareket tarihini `Ödeme` kolonunda gösterir
- üst özet, ödenen ve ödeme bekleyen tahakkuk sayılarını ayrı metrik olarak gösterir
- `/raporlar` operasyon özeti, kesinleşmiş tahakkukları bağlı `Maaş Ödemesi` kasa/banka hareketine göre ödenen ve ödeme bekleyen tutarlar olarak ayırır
- aynı tahakkuktan ikinci ödeme hareketi üretimi engellenir
- `Tahakkukları Yazdır` aksiyonu, maaş tahakkuk listesindeki mevcut görünür kapsamı tarayıcı yazdırma akışına gönderir ve kullanıcıya kapsam mesajı verir

## Hesaplama Sözleşmesi

Tahakkuk satırları, kaynak `TimesheetLine` satırlarından üretilir:

- normal kazanç = `workedDays * dailyWage`
- mesai kazancı = `overtimeHours * overtimeHourlyRate`
- brüt = normal kazanç + mesai kazancı
- kesinti = avans kesintisi + borç kesintisi
- net = brüt - kesinti

Başlık toplamları kaynak puantajın toplamlarıyla aynı kalır. Bu karar, tahakkukun ilk dilimde puantajdan türeyen ön muhasebe hazırlığı olmasını sağlar.

## Bilinçli Sınırlar

- SGK, gelir vergisi, damga vergisi ve resmi bordro hesapları henüz yok
- personel borç/alacak kartı entegrasyonu henüz yok
- PDF bordro veya imza föyü önizlemesi henüz yok
- gün bazlı 1-31 hücre matrisi henüz tahakkuka taşınmaz
- P0 yazdırma davranışı özel PDF üretmez; liste kapsamının hızlı çıktısı için tarayıcı `print` akışını kullanır

Bu sınırlar MVP güvenliği için tutuldu. Önce puantajdan tekil, izlenebilir, tekrar üretimi engellenmiş, rapora yalnız kesinleşince giren ve ödemesi kasa/banka hareketi olarak izlenen tahakkuk belgesi oluşur.

## Audit Sözleşmesi

Maaş tahakkuku modülü şu aksiyonlarda audit kaydı üretir:

- `payroll-accrual.create`
- `payroll-accrual.post`
- `payroll-accrual.cancel`

Bulunamayan kayıt, taslak puantajdan üretim denemesi, mükerrer üretim ve iptal edilmiş tahakkuku yeniden kesinleştirme denemesi audit kaydı üretmez.

Kasa/banka ödeme hareketi ayrı audit aksiyonu üretmez. Kullanıcı aksiyon izi tahakkuk durum audit'inde, finansal sonuç ise `CashBankMovement` kaydında `sourceType=payroll-accrual` ile izlenir. Pasif veya bilinmeyen ödeme hesabı denemesi hareket yazmadan reddedilir.

## Uygulama Bağlantıları

- `src/lib/payroll-accrual-service.ts`: domain üretim kuralı, duplicate kontrolü ve audit sözleşmesi.
- `src/lib/payroll-accrual-prisma-repository.ts`: Prisma adapter.
- `src/app/actions/payroll-accrual-actions.ts`: server action katmanı.
- `src/components/payroll-accrual-surface.tsx`: `/personel` altında tahakkuk listesi ve kaynak puantajdan üretim paneli.
- `src/app/[module]/page.tsx`: personel route'unda tanım listesi ve maaş tahakkuku panelini birlikte açar.
- `src/lib/reports-service.ts`: yalnız `Kaydedildi` maaş tahakkuklarını dashboard ve `/raporlar` operasyon özetine dahil eder; maaş ödeme hareketi oluşan tahakkukları ödenen, hareketi olmayanları ödeme bekleyen toplamına ayırır.
- `src/lib/cash-bank-movement-service.ts`: kesinleşmiş maaş tahakkukundan `Maaş Ödemesi` çıkış hareketi üretir.
- `src/lib/cash-bank-account-selection.ts`: seçilen ödeme hesabını aktif kasa/banka tanımlarına karşı doğrular.
- `src/components/payroll-accrual-surface.tsx`: ödeme hesabı seçimini aktif kasa/banka seçeneklerinden alır ve ödeme action'ına taşır.

## Doğrulama

Eklenen testler:

- `src/lib/payroll-accrual-service.test.ts`
- `src/components/payroll-accrual-surface.test.tsx`

Kapsanan davranış:

- kesinleşmiş puantajdan maaş tahakkuku oluşturulur
- kaynak puantaj satırları personel bazlı tahakkuk satırlarına çevrilir
- taslak puantajdan tahakkuk üretimi reddedilir
- aynı puantajdan ikinci tahakkuk üretimi reddedilir
- başarılı üretim audit kaydı oluşturur
- `/personel` yüzeyi tahakkuk listesi, bekleyen puantaj ve üretim butonunu gösterir
- tahakkuk kesinleştirme ve iptal durum geçişleri çalışır
- yalnız kesinleşmiş tahakkuklar `Maaş Tahakkuku` metriğine ve `Maaş` kaynak filtresine girer
- `/raporlar` yüzeyi kesinleşmiş tahakkukları ödenen maaş ve ödeme bekleyen maaş tutarlarıyla gösterir
- kesinleşmiş tahakkuktan tek kasa/banka ödeme hareketi oluşturulur
- seçilen aktif ödeme hesabı maaş ödeme hareketinin `accountCode/accountName` alanlarına yazılır
- ödenmiş tahakkuk satırında ödeme hesabı ve hareket tarihi görünür
- özet metrikleri ödenen ve ödeme bekleyen tahakkuk sayılarını gösterir
- kullanıcı `Tahakkukları Yazdır` aksiyonuyla mevcut maaş tahakkuk listesi kapsamını yazdırma akışına gönderir
- pasif veya tanımsız ödeme hesabı gönderildiğinde maaş ödeme hareketi oluşturulmaz
- mükerrer maaş ödeme hareketi reddedilir
