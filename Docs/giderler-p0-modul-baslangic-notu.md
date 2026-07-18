# Giderler P0 Modül Başlangıç Notu

Bu not, NOA İnşaat SaaS planındaki `Gider Kaydı` iş akışının P0 ürün yüzeyine alınan dilimini açıklar. İlke değişmedi: eski pencere görünümü değil, iş akışı korunur.

## Kaynak ve Amaç

Plan kaynaklarında gider akışı şu iki ana kanıta dayanır:

- Video 9: `NOA İNŞAAT MUHASEBE PROGRAMI - GİDER KAYDI EĞİTİM VİDEOSU`
- Ekran kanıtı: `06-Hareketler/Şantiye & Proje/Ödeme (Gider)`

Korunacak iş akışı şudur:

1. Kullanıcı şantiye/proje için gider hareketi açar.
2. Şantiye, hareket grubu, ödeme aracı, tarih, evrak no ve tutar girilir.
3. Ödeme P0 içinde aktif kasa/banka hesabıyla yapılır.
4. Kayıt proje maliyetini artıracak gider belgesi olarak saklanır.
5. Aynı işlemde kasa/banka bakiyesi `Çıkış` yönlü azalır.
6. Gider hareket grubu ve şantiye kırılımı sonraki rapor dilimlerine kaynak olur.

## Bu Dilimde Yapılan

Bu dilimde `/giderler` placeholder yüzeyden gerçek P0 işlem yüzeyine taşındı.

Eklenen üretim parçaları:

- `Expense` Prisma modeli ve `202606300001_add_expenses` migration'ı
- `src/lib/expense-service.ts`: tenant/firma/dönem scope, muhasebe yetkisi, validasyon, KDV/toplam hesaplama, audit ve kasa/banka çıkış hareketi üretimi
- `src/lib/expense-prisma-repository.ts`: PostgreSQL adapter
- `src/app/actions/expense-actions.ts`: aktif scope, aktif kasa/banka hesap doğrulaması, create/list action katmanı
- `src/components/expense-surface.tsx`: `/giderler` liste/form yüzeyi
- `src/app/[module]/page.tsx`: `/giderler` route'unun gerçek yüzeye bağlanması
- `CashBankMovement` hareket tipi: `Gider Ödemesi`

Korunan şablon kaynak eşlemesi:

- `gider_ve_masraf_yönetimi.html`
- `yeni_gider_kaydı_ekle.html`
- `gider_analiz_ve_raporlar.html`

## İş Kuralı

Gider kaydı P0 içinde `Kaydedildi` durumunda oluşur ve ayrı bir kesinleştirme adımı beklemez. Bunun nedeni eski NOA akışındaki gider ödeme ekranının doğrudan finansal hareket üretmesidir.

Kayıt başarılı olduğunda:

- `Expense` satırı oluşturulur.
- `CashBankMovement` üzerinde `sourceType=expense`, `movementType=Gider Ödemesi`, `direction=Çıkış` hareketi oluşur.
- Ödeme hesabı yalnız aktif `kasa-banka` tanımlarından kabul edilir.
- Para birimi P0 kapsamında `TL` olarak normalize edilir.
- Audit log `expense.create` aksiyonuyla yazılır.

## Bilinçli Sınırlar

Bu dilimde yapılmayanlar:

- firma çeki veya ciro çekle gider ödeme
- evrak eki/fotoğraf yükleme
- gider iptal ve iade akışı
- gelişmiş gider analiz raporu
- gelişmiş hareket grubu bazlı gider analiz raporu
- çek/ciro çek ile gider ödeme varyantlarının rapor etkisi

Bu sınırlar MVP güvenliği için tutuldu. İlk gerçek dilim, gider belgesini ve kasa/banka etkisini güvenceye alır. Sonraki raporlama diliminde giderler `/raporlar` ve dashboard okuma modeline bağlandı; gelişmiş gider analizi ve çekli ödeme varyantları ayrı TDD dilimleriyle ele alınmalıdır.

## Rapor Entegrasyonu

Giderler artık rapor okuma modelinde ayrı kaynak olarak yer alır:

- `/raporlar` kaynak filtresinde `Gider` seçeneği bulunur.
- `Gider Toplamı` metriği yalnız `Kaydedildi` durumundaki giderlerin `grandTotal` toplamını gösterir.
- Şantiye kârlılık özetinde giderler `Gider Maliyeti` kolonu olarak maliyete eklenir.
- Cari bakiye özetinde gider belgesi ilgili cari için borç etkisi üretir.
- Cari hareket ekstresindeki gider evrak no bağlantısı `/giderler?evrak=...` hedefini açar.
- Giderin oluşturduğu kasa/banka `Gider Ödemesi` hareketi kaynak filtresi `Kasa/Banka` olduğunda nakit çıkışı olarak ayrıca görünür.
- Dashboard aynı okuma modelini kullandığı için `Gider Toplamı`, son hareketlerde gider satırı ve `/giderler` hızlı geçişini gösterir.

## Doğrulama Kapsamı

Eklenen/güncellenen testler:

- `src/lib/expense-service.test.ts`
- `src/lib/expense-prisma-repository.test.ts`
- `src/components/expense-surface.test.tsx`
- `src/lib/cash-bank-movement-service.test.ts`
- `src/lib/cash-bank-movement-prisma-repository.test.ts`

Kapsanan davranış:

- gider kaydı tenant scope ile oluşur
- aynı işlemde kasa/banka `Gider Ödemesi` çıkışı oluşur
- audit metadata belge, şantiye, hareket grubu ve toplamı taşır
- duplicate evrak no reddedilir
- viewer rolü gider yazamaz
- Prisma adapter tarih/decimal/para birimi normalizasyonunu korur
- `/giderler` yüzeyi formdan gider oluşturup ödeme bilgisini listede gösterir
- rapor okuma modeli gider toplamını, şantiye gider maliyetini, cari borç etkisini ve `/giderler` evrak bağlantısını üretir
- `/raporlar` ve dashboard gider toplamını ve gider hareketlerini gösterir
- şantiye kârlılık CSV çıktısı `Gider Maliyeti` kolonunu taşır
