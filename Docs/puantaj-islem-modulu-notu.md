# Puantaj İşlem Modülü Notu

Bu not, P0 kapsamındaki `Puantaj` modülünün ilk çalışan SaaS dilimini açıklar. Amaç eski masaüstü grid görünümünü birebir taşımak değil, NOA iş akışındaki aylık şantiye/personel çalışma girişi ve maaş hazırlığına temel olacak veri sözleşmesini kurmaktır.

## Kapsam

Bu dilimde temel puantaj PostgreSQL'e normalize edildi:

- `Timesheet`: puantaj başlığı, şantiye, taşeron, ay, yıl, toplam gün/mesai/tutarlar ve durum.
- `TimesheetLine`: personel satırı, çalışma günü, mesai saati, yevmiye, mesai ücreti, avans/borç kesintileri ve satır toplamları.

İlk çalışan yüzey `/puantaj` route'udur. Ekran:

- puantaj başlığı açar
- şantiye, taşeron, ay ve yıl seçer
- personel satırı için çalışma günü, yevmiye, mesai ve kesinti girer
- toplam çalışma günü, mesai saati, brüt, kesinti ve net ödeme hesaplar
- `Taslak`, `Kaydedildi`, `İptal` durumlarını destekler
- başarılı oluşturma, kesinleştirme ve iptal hareketlerini audit log'a yazar
- audit kayıtlarını belge bazlı `İşlem Geçmişi` bölümünde gösterir
- `Kaydedildi` puantajları dashboard ve `/raporlar` operasyon özetine net işçilik yükü olarak yansıtır
- `Puantajları Yazdır` aksiyonu, mevcut puantaj hareket listesi kapsamını tarayıcı yazdırma akışına gönderir

## İş Akışı Kararı

Plan kaynaklarında puantaj P0 kapsamındadır ve korunacak akış şantiye, taşeron, ay/yıl seçimi ile personel satırlarının gün bazlı girilmesidir.

İlk SaaS diliminde 31 günlük hücre matrisi yerine daha dar bir toplam gün/mesai satırı açıldı. Bu bilinçli bir ara adımdır:

- Veri modeli personel satırını ve ay/yıl bağlamını kalıcı hale getirir.
- Gün bazlı hücre grid'i sonraki dilimde `TimesheetDay` veya satır alt detayı olarak eklenebilir.
- İlk maaş tahakkuku üretimi `/personel` ekranında kesinleşmiş puantajlardan yapılır.
- Personel borç/alacak ve detaylı şantiye işçilik maliyeti aynı normalize kayıttan genişletilebilir.

## Hesaplama Sözleşmesi

Satır toplamları:

- normal kazanç = `workedDays * dailyWage`
- mesai kazancı = `overtimeHours * overtimeHourlyRate`
- brüt = normal kazanç + mesai kazancı
- kesinti = avans kesintisi + borç kesintisi
- net = brüt - kesinti

Başlık toplamları satır toplamlarının toplamından üretilir.

Validasyon:

- puantaj no zorunludur
- şantiye zorunludur
- ay 1-12 arasında olmalıdır
- yıl 2000-2100 arasında olmalıdır
- en az bir personel satırı gerekir
- aynı personel aynı puantaj içinde tekrar edemez
- çalışma günü seçili ayın gün sayısını aşamaz
- ücret, mesai ve kesinti alanları negatif olamaz

## Bilinçli Sınırlar

- 1-31 günlük hücre matrisi henüz yok
- toplu yevmiye girişi henüz yok
- maaş tahakkuku üretiminin ilk dilimi vardır; tahakkuk kesinleştirme, ödeme ve resmi bordro henüz yok
- personel borç/alacak ve zimmet entegrasyonu henüz yok
- detaylı şantiye işçilik maliyet kırılım raporu henüz yok
- PDF önizleme henüz yok
- P0 yazdırma davranışı özel PDF üretmez; puantaj hareket listesindeki mevcut kapsam için tarayıcı `print` akışını kullanır

Bu sınırlar MVP güvenliği için tutuldu. Önce puantaj belgesi kendi normalize tablosunda doğru hesaplanır, audit izli çalışır, route üzerinde kullanılabilir hale gelir ve `Kaydedildi` duruma geçtiğinde dashboard/rapor operasyon özetine girer hale getirildi.

## Audit Sözleşmesi

Puantaj modülü şu aksiyonlarda audit kaydı üretir:

- `timesheet.create`
- `timesheet.post`
- `timesheet.cancel`

Yetki reddi, validasyon hatası, bulunamayan kayıt ve idempotent tekrar çağrılar audit kaydı üretmez.

## Uygulama Bağlantıları

- `src/lib/timesheet-service.ts`: domain hesaplama, validasyon ve durum geçişleri.
- `src/lib/timesheet-prisma-repository.ts`: Prisma adapter.
- `src/app/actions/timesheet-actions.ts`: server action ve audit okuma katmanı.
- `src/components/timesheet-surface.tsx`: `/puantaj` iş ekranı ve işlem geçmişi bölümü.
- `src/lib/payroll-accrual-service.ts`: `Kaydedildi` puantajdan ilk maaş tahakkuku üretim sözleşmesi.
- `src/components/payroll-accrual-surface.tsx`: `/personel` altında tahakkuka hazır puantaj ve maaş tahakkuku listesi.
- `src/lib/reports-service.ts`: `Kaydedildi` puantajları dashboard ve `/raporlar` operasyon özetine dahil eden okuma modeli.
- `src/lib/timesheet-seed.ts`: demo `PNT-2026-06-001` kaydı ve idempotent audit seed'i.

## Doğrulama

Eklenen testler:

- `src/lib/timesheet-service.test.ts`
- `src/components/timesheet-surface.test.tsx`

Kapsanan davranış:

- çalışma günü, mesai, brüt, kesinti ve net toplamları hesaplanır
- mükerrer personel ve ay gün sayısını aşan giriş reddedilir
- tenant/firma/dönem kapsamıyla kayıt oluşturulur
- kesinleştirme ve iptal durum geçişleri uygulanır
- başarılı mutasyonlar audit kaydı üretir
- `/puantaj` yüzeyi liste, metrik, form ve işlem geçmişi akışını gösterir
- kullanıcı `Puantajları Yazdır` aksiyonuyla mevcut hareket listesi kapsamını yazdırma akışına gönderir
- `Kaydedildi` puantajlar rapor/dashboard tarafında `Puantaj Net` metriğine ve son hareketlere girer
