# RFC-F16-01 — Filo Lastik Yönetimi

> Durum: **Planlama ve onay bekliyor**
> Tarih: 29.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-moduller-genisletme-plani.md` Bölüm 11.6,
> 11.9 ve 17.3

## 1. Amaç

Faz 15'te tamamlanan araç, atama, yakıt ve bakım operasyonlarının üstüne;
araç bazlı manuel lastik montajı, sökümü, mevsim tipi ve aşınma takibini
eklemek. İlk sürüm, lastiklerin hangi araçta ve hangi konumda kullanıldığını
güvenli şekilde görünür kılar; lastik stok veya satın alma sistemine dönüşmez.

## 2. Mevcut altyapıyla uyum

`Vehicle` mevcut araç kartının tek kanonik kaynağı, F15'in scoped repository,
role/kapalı dönem guard'ları, merkezi audit ve `/araclar` Filo Operasyon
Merkezi korunur. Yeni kayıtlar aktif tenant/firma/dönem kapsamına bağlıdır.
Lastik işlemi yalnız operasyonel kayıttır; mevcut bakım kayıtlarıyla ilişki
kurabilir ancak bakım planını, araç kartını veya başka modülleri otomatik
değiştirmez.

| İhtiyaç | İlk karşılık | Sınır |
|---|---|---|
| Montaj ve konum takibi | `VehicleTireRecord` | Fiziksel lastik stok kartı yok. |
| Mevsim/aşınma görünürlüğü | Tür ve aşınma yüzdesi | Otomatik sensör ölçümü yok. |
| Söküm/geçmiş | Kontrollü durum geçişi | Hurda, depo girişi veya satın alma yok. |

## 3. Önerilen varsayımlar

1. Faz 16 yalnız manuel lastik montaj/söküm ve aşınma takibini kapsar;
   Arvento, GPS, TPMS, CANbus/OBD, dış HTTP, credential ve otomatik kilometre
   beslemesi kapsam dışıdır.
2. `Vehicle` mevcut araç kartı tek kanonik araç kaynağı olarak kalır; mevcut
   araç veya Faz 15 kayıtları için backfill yapılmaz.
3. Her lastik kaydı tenant, firma ve dönem kapsamına bağlıdır; araç yalnız
   aynı kapsamda doğrulanır.
4. İlk additive model `VehicleTireRecord`; araç, konum, montaj tarihi,
   odometre, sezon, marka/model etiketi, aşınma yüzdesi ve durum bilgisini
   taşır. Ayrı lastik envanteri veya depo lokasyonu kurulmaz.
5. Aynı araç-konum için aynı anda tek aktif montaj bulunur; yeni montaj önceki
   aktif kaydı kontrollü sökümle kapatmadan açılamaz.
6. `admin` ve `accounting` kayıt oluşturur veya söküm yapar; `viewer` yalnız
   scope içi kayıtları okur. Kapalı dönemde hiçbir mutation yazılmaz.
7. Montaj odometresi geçerli, negatif olmayan bir tam sayıdır ve mevcut araç
   giriş kilometresi ile aynı lastik konumundaki önceki işlemden geriye düşmez.
8. Lastik işlemi finansal maliyet, kasa/banka, stok, cari, bordro, puantaj,
   hakediş veya ledger hareketi üretmez; satın alma ve stok entegrasyonu ayrı
   RFC'ye bırakılır.
9. Montaj ve söküm merkezi audit üretir; metadata yalnız kimlik, araç, konum,
   tarih, odometre ve durum geçişini taşır; serbest not veya tedarikçi belgesi
   yazılmaz.
10. Gerçek kabul verisi ayrı test firma/döneminde oluşturulur; Faz 8–15 kabul
    fixture'ları ile Faz 13 dış sağlayıcı sınırı korunur.

## 4. Veri yaşam döngüsü ve doğrulamalar

| Varlık | Temel alanlar | Yaşam döngüsü |
|---|---|---|
| `VehicleTireRecord` | araç, konum, montaj tarihi/odometre, sezon, marka-model, aşınma, durum | `ACTIVE` → `REMOVED` |

Konum, sezon ve marka-model etiketi boş/taşan metin olamaz; aşınma yüzdesi
`0–100` aralığındadır. Söküm tarihi montajdan önce, söküm kilometresi montaj
kilometresinden düşük olamaz. Aynı idempotency anahtarıyla tekrar montaj veya
tekrar söküm yeni satır ya da audit üretmez.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain çekirdeği | DTO, doğrulama, durum ve idempotency kuralları | Saf testler; şema/UI/veri değişmez. |
| 2 — Şema ve repository | Additive model, scoped repository ve migration | Backfill yok; yanlış scope sıfır. |
| 3 — Action ve audit | Rol/kapalı dönem guard'ları, montaj/söküm mutation'ları | Finans/stok yan etkisi sıfır. |
| 4 — Filo UI | Liste/filtre/detay/form ve deep-link | Viewer yazamaz; mobil/tema/print kabulü. |
| 5 — İzole gerçek veri ve kapanış | Ayrılmış kabul kaydı, audit/scope/idempotency ve tam kapılar | Faz 8–15/F13 değişmez. |

## 6. Kabul kriterleri

- Yanlış tenant/firma/dönem, kapalı dönem ve yetkisiz rol hiçbir kayıt
  yazmadan reddedilir.
- Aynı araç-konumda ikinci aktif montaj, odometre geriye dönüşü ve tekrar
  söküm denemeleri duplicate satır veya audit üretmez.
- Montaj/söküm hiçbir finansal, stok veya puantaj yan etkisi oluşturmaz.
- UI boş/yükleniyor/hata durumları, klavye odağı, metinli durum işaretleri,
  mobil taşma ve print-safe çıktıyı karşılar.
- Tam kalite kapıları `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 7. Kapsam dışı

Lastik stok kartı/depo, satın alma belgesi, tedarikçi/cari bağlantısı, lastik
maliyeti veya muhasebe fişi, GPS/TPMS telemetrisi, otomatik km, rotasyon
optimizasyonu, basınç alarmı, lastik fotoğrafı/evrakı, otomatik bildirim
worker'ı ve dış kurum/sağlayıcı entegrasyonu bu RFC'nin dışındadır.

## 8. Uygulama onayı

Faz 16 uygulamasına geçmek için kullanıcı Bölüm 3'teki on varsayımı onaylar.
Onay sonrası yalnız Dilim 1 Domain çekirdeğiyle başlanır; sonraki her dilim
bağımsız kabulden sonra ilerler.

### Onay ve Dilim 1 kapanış kaydı — 29.07.2026

Kullanıcı Bölüm 3'teki on varsayımı onayladı.
`src/lib/vehicle-tire-operations.ts`; manuel lastik montajı ve sökümü için
saf DTO/doğrulama sözleşmelerini, tarih/odometre/aşınma/konum sınırlarını,
tek aktif araç-konum korumasını, deterministic montaj anahtarını, yalnız ileri
`ACTIVE → REMOVED` geçişini ve role/kapalı dönem izin kararını içerir. Lastik
işlemi finans, stok, satın alma, UI veya gerçek veri yan etkisi üretmez.
`src/lib/vehicle-tire-operations.test.ts` hedefli paketi 8 testle geçti.

### Dilim 2 kapanış kaydı — 29.07.2026

`VehicleTireRecord` additive Prisma modeli; tenant/firma/dönem ve araç foreign
key'leri, scoped montaj idempotency anahtarı, aktif araç-konum için PostgreSQL
kısmi tekillik indeksi ve operasyonel liste indeksleriyle eklendi.
`20260729230000_add_vehicle_tire_operations` migration'ı yerel
`insaatMuhasebe` geliştirme veritabanına uygulandı; mevcut araç ve Faz 15
kayıtları için backfill yapılmadı. `src/lib/vehicle-tire-prisma-repository.ts`,
yalnız zorunlu aktif scope'ta listeleme, create/update ve UTC date-only
dönüşümü sağlar; bilinmeyen sezon/durum değerlerini güvenli varsayımlara
eşler. Domain/repository hedefli paketi 11 testle, Prisma validate, Prisma
client üretimi, type-check ve lint ile geçti. Server action, audit, UI ve
gerçek lastik kaydı sonraki dilimlere bırakıldı.

### Dilim 3 kapanış kaydı — 29.07.2026

`vehicle-tire-actions`, her doğrudan çağrıda aktif oturum ile tenant/firma/
dönem kapsamını yeniden kurar. Viewer ve kapalı dönem yazımı araç okumasından
önce fail-closed reddedilir; araç yalnız aktif scope ve `Aktif` statüsünde
doğrulanır. Montaj ve söküm mutation'ları ortak service üzerinden merkezi
audit'e gider; idempotency anahtarı kalıcı kayıtta kalır, audit kimliği veya
metadata marka/model taşımaz. Başarılı mutation `/araclar` ve dinamik module
route'unu revalidate eder. Finans, stok, satın alma, bordro, puantaj, cari,
ledger ve hakediş yan etkisi eklenmedi. Domain/repository/service/action
hedefli paketi 19 testle, type-check, Prisma validate ve lint ile geçti; UI ve
gerçek lastik kaydı sonraki dilime bırakıldı.

### Dilim 4 uygulama kaydı — 29.07.2026

`VehicleTireOperationsSurface`, mevcut araç kartı ve Faz 15 operasyon yüzeyini
değiştirmeden `/araclar` altında Filo Lastik Yönetimi'ni ekler. Scoped lastik
kayıtları arama/durum filtresi, montaj formu ve `/araclar?tire=<id>` deep-link
ile erişilebilir detail drawer'ında görünür; aktif montaj yalnız etiketli söküm
formundan kapatılır. Araç seçimi mevcut scope lookup'ındaki aktif araçlarla
sınırlıdır. Viewer veya kapalı dönem kullanıcısında mutation kontrolleri DOM'a
alınmaz; action guard'ı bağımsız kalır. Tablo mobilde kendi yatay kaydırma
kabında, dialog ve filtre/form kontrolleri print dışında; durumlar renk yanında
metinle tanımlıdır. Hedefli paket 5 dosya/25 test, type-check, Prisma validate
ve lint ile geçti. Kimliği doğrulanmış canlı tarayıcı görsel kabulü ile izole
gerçek veri sınırı Dilim 5'te birlikte kapatılacaktır.

### Dilim 5 kapanış kaydı — 29.07.2026

`npm run tire:acceptance:verify`, `tenant-noa-demo` altındaki ayrılmış
`company-f16-kabul-20260729` / `period-f16-kabul-20260729` kabul kapsamını iki
kez çalıştırdı. `F16 KABUL 001` aracının Sol Ön konumundaki tek kaydı
`ACTIVE → REMOVED` yaşam döngüsünü tamamladı; yalnız iki audit aksiyonu
(`vehicle-tire.mount.create`, `vehicle-tire.mount.remove`) oluştu. Yanlış
firma/dönem, kasa/banka, gider, yevmiye, bordro, stok ve puantaj sayıları `0`
kaldı; audit kimliği ve metadata marka/model içermedi. Muhasebe demo
oturumunda gerçek kayıtla 1440×900 koyu/açık tema, 390×844 mobil tablo kabı,
deep-link detail drawer ve print sözleşmesi doğrulandı; global yatay taşma ile
konsol hata/uyarısı görülmedi. Ayrıntı
`Docs/UI-baseline/Faz16-gercek-veri-kapanis-20260729.md` içindedir. Faz 16
tamamlandı.
