# RFC-F25-01 — Kalıcı Firma Profili

> Durum: **Tamamlandı — Dilim 1-5**
> Tarih: 30.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-modul-gelistirme-plani.md` Bölüm 3A,
> 4.3 ve 15.4; mevcut `Company`, aktif scope, settings ve belge yazdırma
> sözleşmeleri

## 1. Amaç

NOA'nın `/ayarlar` çalışma alanında salt-okunur görünen firma bilgilerinin
dar bir hukuki ve iletişim profilini güvenle kalıcılaştırmak; fatura ve
hakediş gibi yazdırılabilir belge başlıklarının aktif tenant/firma profilinden
beslenmesini sağlamak.

Bu faz şirket kapsam kimliği değiştirme, tenant taşıma, lokasyon dönüşümü,
şube/şantiye master veri yönetimi, e-Fatura mükellef doğrulaması veya resmi
sicil servisi entegrasyonu değildir.

## 2. Neden sıradaki çalışma

- Faz 24 ile finans ayarlarının ilk kalıcı ve audit'li yazım dikeyi
  tamamlandı.
- Kategori bazlı bildirim ayarları mevcut `NotificationPreference`,
  `setNotificationPreferenceAction` ve `/bildirimler` yüzeyinde zaten
  kalıcıdır; ikinci bir tercih modeli gerçek eksikliği çözmez.
- Open Banking, gerçek Arvento ve “Davet Et & Kazan” başlıkları sırasıyla
  sağlayıcı erişimi veya ürün/ödül politikası gerektirir.
- `/ayarlar` içindeki “Firma Bilgileri” hâlâ aktif scope etiketi ve statik
  lokasyon sözleşmesinden oluşur; hukuki, vergi ve iletişim bilgileri kalıcı
  bir profile bağlı değildir.
- Bu alanlar dış sağlayıcı olmadan uygulanabilir ve belge sunumunu doğrudan
  iyileştirir.

## 3. Önerilen varsayımlar

1. Faz 25 yalnız **kalıcı firma hukuki/iletişim profili** dikeyidir. İlk alan
   kümesi `legalName`, `taxOffice`, `taxNumber`, `mersisNumber`, `phone`,
   `email`, `addressLine`, `district`, `city` ve `postalCode` olur. Logo,
   banka hesabı, e-Fatura kimliği ve imza yetkilisi bu faza alınmaz.
2. Profil `tenantId + companyId` kapsamında tekildir ve dönemler arasında
   paylaşılır. Okuma/yazma yine aktif kullanıcının seçili tenant/firma
   erişimiyle guard edilir; başka tenant veya firma profili görünmez.
3. Additive, typed `CompanyProfile` Prisma modeli ve migration kullanılır.
   `Company` kapsam ilişkileri değiştirilmez; generic JSON ayar torbası
   oluşturulmaz ve mevcut firmalara backfill yapılmaz.
4. Kayıt yoksa `legalName` için mevcut `Company.name`, diğer alanlar için boş
   değerlerden oluşan `source=fallback` effective profil döner. Persisted
   kayıt `source=persisted` ve revision bilgisi taşır.
5. `legalName` trim edilmiş 2..200 karakter ve zorunludur. Opsiyonel vergi
   numarası 10 veya 11 rakam, MERSİS numarası 16 rakamdır; e-posta geçerli
   biçimde ve en fazla 254 karakterdir. Telefon, adres, ilçe, il ve posta
   kodu kontrollü uzunluklarla normalize edilir; HTML/script içeriği kabul
   edilmez.
6. `Company.id`, `tenantId` ve oturum/AppShell kapsam etiketi olarak kullanılan
   `Company.name` bu fazda değiştirilmez. `locationMode=multi-location` ve
   desteklenen lokasyon tipleri kilitli kalır; merkez/şube/şantiye kayıtları
   taşınmaz veya yeniden sınıflandırılmaz.
7. İlk tüketiciler `/ayarlar` effective profil paneli ile yeni render edilen
   alış/satış faturası ve klasik hakediş yazdırma başlıklarıdır. Profil
   değişikliği finansal tutarları, mevcut belge snapshot'larını, cari kartları
   veya geçmiş audit kayıtlarını yeniden yazmaz.
8. Tüm roller aktif firma profilini okuyabilir. Yalnız `admin` optimistic
   revision ve idempotent request key ile değiştirebilir. Profil
   dönem-bağımsız master veri olduğundan seçili dönemin kapalı olması admin
   yazımını engellemez; tenant/firma erişimi yine fail-closed zorunludur.
9. Başarılı değişiklik tek güvenli audit olayı üretir. Audit değişen alan
   anahtarları ile eski/yeni revision bilgisini taşıyabilir; açık adres,
   telefon, e-posta, vergi/MERSİS değeri ve request key audit metadata'sına
   yazılmaz.
10. `/ayarlar` yüzeyi mevcut AppShell ve tasarım tokenlarını korur; fallback,
    yükleniyor, validasyon, hata, başarı, concurrency, 390 px mobil,
    açık/koyu tema ve print-safe durumları sağlar. İzole gerçek veri kabulü
    scope, rol, retry, stale revision, hassas audit içeriği ve finans/oturum
    yan etkisizliğini doğrular.

## 4. Domain ve veri sözleşmesi

Önerilen profil snapshot'ı:

- `id`
- `tenantId`, `companyId`
- `legalName`
- `taxOffice`, `taxNumber`, `mersisNumber`
- `phone`, `email`
- `addressLine`, `district`, `city`, `postalCode`
- `revisionNo`
- `lastMutationKey`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

Effective okuma her zaman tam profil döndürür. Kayıt yoksa
`source=fallback`, varsa `source=persisted` olur. Hassas alanlar log ve audit
payload'larına kopyalanmaz.

## 5. Tüketici sınırı

İlk tüketiciler:

- Ayarlar: effective profil, kaynak/revision ve admin düzenleme formu,
- Alış/satış faturası: yeni oluşturulan yazdırma/önizleme başlığı,
- Klasik hakediş: yeni oluşturulan yazdırma/önizleme başlığı,
- Ayarlar özeti: print-safe profil sunumu.

AppShell scope etiketi, session seçenekleri, tenant/firma erişim kayıtları,
geçmiş belge satırları, finans hesapları, e-Fatura/webhook/API sözleşmeleri ve
Hakediş Pro hesap motoru değiştirilmez.

## 6. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Çekirdeği | Typed effective profil, fallback, normalizasyon, validasyon, rol, revision ve idempotency kararları | Saf testler; şema/repository/UI değişmez. |
| 2 — Şema ve Repository | Additive model, migration, scoped effective read ve optimistic create/update | Backfill yok; yanlış tenant/firma görünmez. |
| 3 — Server Action ve Audit | Oturum/scope guard'lı okuma/yazma action'ları ve hassas veri içermeyen audit | Admin-only mutation; retry audit çoğaltmaz. |
| 4 — Firma Profili UI ve Belge Başlıkları | `/ayarlar` formu ve server-supplied profil kullanan yeni belge render'ları | AppShell etiketi, geçmiş belge ve finans hesapları değişmez. |
| 5 — İzole Gerçek Veri ve Kapanış | Ayrılmış firma, fallback/persisted, rol, concurrency, hassas audit, belge ve tam kalite kabulü | Komşu domain, session ve finans hareketi yan etkisi yok. |

## 7. Kabul kriterleri

- Profil yokken hukuki unvan mevcut `Company.name` fallback'ini kullanır.
- Persisted profil yalnız aynı tenant/firma erişiminde okunur.
- Admin geçerli profili kaydedebilir; accounting ve viewer yazamaz.
- Kapalı dönem, company-scoped admin profil yazımını tek başına engellemez.
- Aynı request key ikinci mutation veya audit üretmez.
- Eski revision ile yazım reddedilir ve mevcut profil korunur.
- Audit hassas profil değerlerini ve request key'i taşımaz.
- Yeni belge render'ları effective profili kullanır; mevcut kayıtlar
  değiştirilmez.
- AppShell/session firma etiketi ve lokasyon modu değişmez.
- Tam kapılar `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 8. Kapsam dışı

Şirket adı/kapsam kimliği değiştirme, tenant taşıma veya birleştirme, lokasyon
modu dönüşümü, şube/şantiye master verisi, logo/binary yükleme, IBAN/banka
hesabı, e-Fatura mükellef/GB etiketi, KEP, imza yetkilisi, ticaret sicili veya
vergi servisi doğrulaması, dış API, geçmiş belge backfill/recalculation ve
granular RBAC bu RFC'nin dışındadır.

## 9. Kapanış

Bölüm 3'teki on varsayım 30.07.2026 tarihinde kullanıcı tarafından
onaylandı. Beş dilim; typed domain, additive `CompanyProfile` şeması,
tenant/firma scoped repository, admin-only action ve güvenli audit, Ayarlar
formu, fatura/hakediş belge başlıkları ve izole gerçek veri kabulüyle
tamamlandı.

`Company.name`, AppShell oturum etiketi, lokasyon sözleşmesi, mevcut belge
kayıtları ve finansal hareketler değiştirilmedi. Kabul kanıtı
`Docs/UI-baseline/Faz25-gercek-veri-kapanis-20260730.md` içindedir.
