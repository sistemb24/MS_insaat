# RFC-F27-01 — Firma Belge Markalaması

> Durum: **Tamamlandı — Dilim 1-5**
> Tarih: 31.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-modul-gelistirme-plani.md` Bölüm 3A ve
> 4.3; `Docs/RFC-F25-01-kalici-firma-profili.md`; mevcut
> `CompanyProfileDocumentHeader`, fatura/hakediş print sözleşmeleri ve
> şirket kapsam modeli

## 1. Amaç

NOA'da şirketin küçük raster logosunu güvenli ve dönemden bağımsız biçimde
kalıcılaştırmak; Ayarlar önizlemesi ile yeni oluşturulan fatura ve klasik
hakediş belge başlıklarını hukuki firma profiliyle birlikte markalamak.

Bu faz AppShell ürün markasını değiştirme, tema/renk tasarımcısı, antet
şablonu editörü, geçmiş belge snapshot'larını yeniden yazma veya üretim
object-storage sağlayıcısı kurma çalışması değildir.

## 2. Neden sıradaki çalışma

- Faz 25 hukuki/iletişim profilini, Faz 26 şirket lokasyon dizinini
  kalıcılaştırdı.
- `CompanyProfileDocumentHeader` yeni belge render'larında güvenli firma
  metnini kullanıyor, ancak logo alanı Faz 25'te bilinçli olarak kapsam
  dışında bırakıldı.
- Logo, HTML şablon geçişinin görsel değerini doğrudan artırır ve dış banka,
  ödeme, Arvento veya resmi sicil sağlayıcısı gerektirmez.
- Mevcut Document Center binary adaptörü geliştirme ortamında yereldir;
  şirket logosunu ona bağlamak üretim object storage hazırmış izlenimi
  yaratır. Bu nedenle ilk dikey küçük ve sınırlandırılmış DB binary
  kalıcılığı kullanır.

## 3. Önerilen varsayımlar

1. Faz 27 yalnız **firma belge markalaması** dikeyidir. İlk kapsam tek aktif
   raster logodur. Marka rengi, favicon, AppShell logosu, e-posta şablonu,
   filigran, imza/kaşe ve çoklu antet bu faza alınmaz.
2. Logo `tenantId + companyId` kapsamında tekildir ve dönemler arasında
   paylaşılır. Okuma/yazma aktif kullanıcının tenant/firma erişimiyle
   fail-closed korunur; başka tenant veya firma logosu görünmez.
3. Additive, typed `CompanyBrandAsset` Prisma modeli ve migration kullanılır.
   Binary içerik ilk dikeyde veritabanında tutulur; mevcut Document Center
   local storage'ı, `DocumentFile` kayıtları veya üretim object-storage
   varmış gibi davranılmaz.
4. Yalnız `image/png`, `image/jpeg` ve `image/webp` kabul edilir. SVG, GIF,
   ICO, PDF ve çalıştırılabilir/aktif içerik reddedilir. Dosya en fazla
   `512 KiB`, genişlik/yükseklik `64..1600 px` ve en-boy oranı `1:4..4:1`
   olmalıdır; MIME ile gerçek dosya imzası uyuşmalıdır.
5. Kalıcı alan kümesi `mimeType`, `originalFileName`, `sizeBytes`, `width`,
   `height`, `sha256`, `content`, `status`, `revisionNo` ve mutation/audit
   alanlarıdır. Dosya adı güvenli basename'e indirgenir; istemciden gelen
   boyut, MIME, hash veya ölçü bilgisine güvenilmez.
6. Effective okuma logo yokken `source=none`, varsa güvenli
   `data:<mime>;base64,...` sunum değeri, ölçüler ve revision taşır. Ham
   `Bytes`, storage yolu, mutation key ve audit alanları client DTO'suna
   çıkmaz.
7. Tüm roller aktif logoyu okuyabilir. Yalnız `admin` optimistic revision ve
   idempotent request key ile yükleyebilir/değiştirebilir veya kaldırabilir.
   Dönemden bağımsız master veri olduğundan kapalı dönem admin mutation'ını
   engellemez.
8. Logo değişikliği yalnız yeni render edilen Ayarlar önizlemesi, alış/satış
   faturası PDF/print ve klasik hakediş print başlığında kullanılır.
   AppShell `NOA İnşaat` ürünü, `Company.name`, mevcut belge kayıtları ve
   finansal hesaplar değişmez.
9. Başarılı yükleme/değiştirme/kaldırma tek güvenli audit olayı üretir.
   Audit aksiyon, MIME, boyut, ölçü, status ve revision geçişini taşıyabilir;
   binary/base64 içerik, SHA-256, dosya adı ve request key taşımaz.
10. `/ayarlar` mevcut AppShell ve tasarım tokenları içinde dosya seçme,
    önizleme, değiştirme/kaldırma, validasyon, yükleniyor, hata, başarı,
    concurrency, 390 px mobil, açık/koyu tema ve print-safe görünüm sağlar.
    İzole kabul scope, rol, retry, stale revision, dosya imzası/limitleri,
    audit redaction ve belge/session/operasyon yan etkisizliğini doğrular.

## 4. Domain ve veri sözleşmesi

Kalıcı marka asset snapshot'ı:

- `id`
- `tenantId`, `companyId`
- `mimeType`, `originalFileName`
- `sizeBytes`, `width`, `height`
- `sha256`
- `content`
- `status = ACTIVE | REMOVED`
- `revisionNo`, `lastMutationKey`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

Effective client DTO'su:

- `source = none | persisted`
- `dataUrl`
- `mimeType`, `sizeBytes`, `width`, `height`
- `revisionNo`, `updatedAt`, `updatedBy`
- `canManage`

Binary doğrulama server-side yapılır. Kaldırılan kaydın binary içeriği
tutulmaz; revision/audit izi korunur.

## 5. Tüketici sınırı

İlk tüketiciler:

- Ayarlar: logo durumu, önizleme, yükleme/değiştirme/kaldırma,
- Alış/satış faturası: yeni PDF/print firma başlığı,
- Klasik hakediş: yeni print firma başlığı,
- Ayarlar özeti: print-safe logo ve firma profili sunumu.

AppShell ürün logosu, oturum etiketi, navigation, favicon, geçmiş belge
satırları, Hakediş Pro hesap motoru, e-Fatura/API/webhook sözleşmeleri ve
Document Center dosyaları değiştirilmez.

## 6. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Çekirdeği | MIME/imza/ölçü/limit doğrulaması, effective DTO, rol, revision ve idempotency | Saf testler; şema/repository/UI değişmez. |
| 2 — Şema ve Repository | Additive asset modeli, migration, scoped read ve optimistic upsert/remove | Document Center/local storage değişmez. |
| 3 — Server Action ve Audit | File girişini server-side doğrulayan upload/remove action'ları ve redacted audit | Admin-only mutation; retry audit çoğaltmaz. |
| 4 — Marka UI ve Belge Başlıkları | `/ayarlar` önizleme/formu ve logo kullanan fatura/hakediş render'ları | AppShell ve geçmiş belgeler değişmez. |
| 5 — İzole Gerçek Veri ve Kapanış | Ayrılmış firma, geçerli/geçersiz dosya, rol/scope/concurrency, belge ve tam kalite kabulü | Komşu domain, session ve operasyon yan etkisi yoktur. |

## 7. Kabul kriterleri

- Logo yokken effective okuma `source=none` döner.
- Geçerli PNG/JPEG/WebP yalnız aynı tenant/firma kapsamında okunur.
- Sahte MIME, bozuk imza, limit/ölçü/oran ihlali yan etkisiz reddedilir.
- Admin kapalı dönemde yükleyebilir/değiştirebilir/kaldırabilir;
  accounting/viewer yazamaz.
- Aynı request key ikinci mutation veya audit üretmez.
- Eski revision yazımı reddedilir.
- Audit binary/base64, hash, dosya adı ve request key taşımaz.
- Yeni belge render'ları logo + hukuki profili birlikte kullanır.
- AppShell ürün markası, `Company.name`, Document Center ve geçmiş kayıtlar
  değişmez.
- Tam kapılar `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 8. Kapsam dışı

SVG/GIF/animasyon, sınırsız binary, object-storage sağlayıcısı, CDN veya
imzalı URL, görsel kırpma/döndürme/arka plan silme, ImageGen, marka rengi,
favicon, AppShell/NOA ürün logosu, e-posta/PDF şablon editörü, imza/kaşe,
filigran, çoklu marka, geçmiş belge backfill'i ve yeni API endpoint'i bu
RFC'nin dışındadır.

## 9. Kapanış

Bölüm 3'teki on varsayım kullanıcı tarafından onaylandı ve beş uygulama
dilimi 31.07.2026 tarihinde tamamlandı. `CompanyBrandAsset` domaini,
`20260731060000_add_company_brand_assets` migration'ı, şirket kapsamlı
repository, admin-only optimistic/idempotent mutation, redacted audit ve
`/ayarlar` marka paneli uygulandı. Aktif logo yeni alış/satış faturası PDF ve
print başlığı ile klasik hakediş print başlığına bağlandı.

İzole F27 kabulü revizyon 3'e ulaşan oluşturma-kaldırma-yeniden yükleme
akışını; retry, stale revision, sahte imza, rol/firma/dönem izolasyonu,
audit redaction ve operasyon/session yan etkisizliğini doğruladı. Gerçek
tarayıcı kabulünde yönetici ve salt-okur sınırı, fatura PDF önizlemesi ve
375 px mobil taşmasız görünüm geçti. Tam kapılarda 303 test dosyası ve 1.710
test, type-check, Prisma validate, uyarısız lint, 77 sayfalık üretim derlemesi
ve `git diff --check` doğrulandı. Ayrıntılı kanıt
`Docs/UI-baseline/Faz27-gercek-veri-kapanis-20260731.md` içindedir.
