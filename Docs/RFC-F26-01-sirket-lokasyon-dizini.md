# RFC-F26-01 — Şirket Lokasyon Dizini

> Durum: **Tamamlandı — Dilim 1-5**
> Tarih: 30.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-modul-gelistirme-plani.md` Bölüm 3A ve
> 4.3; mevcut `Company`, `CompanyProfile`, `EntityRecord(santiyeler)`,
> aktif scope ve Ayarlar sözleşmeleri

## 1. Amaç

NOA'nın kilitli `multi-location` kararını değiştirmeden şirketin Merkez,
Şube ve Ofis kayıtlarını dönemden bağımsız, tenant/firma scoped ve audit'li
bir dizinde yönetmek; mevcut Şantiye kartlarını ikinci kez modellemeden aynı
okuma görünümünde birleştirmek.

Bu faz lokasyon bazlı kullanıcı yetkilendirmesi, mevcut finans/operasyon
kayıtlarının lokasyona taşınması, şantiye ana verisinin yeniden modellenmesi
veya `locationMode` değiştirme akışı değildir.

## 2. Neden sıradaki çalışma

- Faz 24 finans ayarlarını, Faz 25 firma hukuki/iletişim profilini
  kalıcılaştırdı.
- Ayarlar sözleşmesi `multi-location` ve `Merkez`, `Şantiye`, `Şube`,
  `Ofis` tiplerini gösteriyor; ancak Şube/Ofis/Merkez için kalıcı yönetim
  akışı bulunmuyor.
- Şantiye kartları mevcut `EntityRecord` hattında gerçek operasyon
  referansı olarak kullanılıyor. İkinci bir şantiye tablosu oluşturmak çift
  doğruluk kaynağı ve kod eşleşme riski doğurur.
- Açık kalan Open Banking, gerçek ödeme sağlayıcısı ve Arvento bağlantıları
  dış ürün/credential gerektirir; lokasyon dizini sağlayıcıdan bağımsızdır.

## 3. Önerilen varsayımlar

1. Faz 26 yalnız **şirket lokasyon dizini** dikeyidir. Kalıcı
   `CompanyLocation` kayıtları `HEADQUARTERS`, `BRANCH` ve `OFFICE`
   tiplerini taşır. `SITE` satırları mevcut `santiyeler` EntityRecord
   kaynağından salt-okunur federatif görünüm olarak gelir; ikinci şantiye
   master'ı oluşturulmaz.
2. Lokasyonlar `tenantId + companyId` kapsamında ve dönemden bağımsızdır.
   Tüm okuma/yazmalar aktif kullanıcının tenant/firma erişimiyle
   fail-closed korunur; dönem yalnız oturum bağlamı olarak kalır.
3. Additive, typed `CompanyLocation` Prisma modeli ve migration kullanılır.
   Mevcut şirket, şantiye, kullanıcı erişimi veya operasyon kayıtlarına
   backfill yapılmaz; generic JSON ayar torbası oluşturulmaz.
4. Kalıcı alan kümesi `code`, `name`, `type`, `responsiblePerson`, `phone`,
   `email`, `addressLine`, `district`, `city`, `postalCode`, `status`,
   `revisionNo` ve mutation/audit alanlarıdır. Koordinat, çalışma saatleri,
   depo, banka hesabı, maliyet merkezi ve resmi sicil bilgisi bu faza
   alınmaz.
5. Kod trim edilip büyük harfe çevrilir ve firma içinde tekildir; 2..30
   karakterlik `A-Z`, `0-9`, tire kuralını izler. Ad 2..160 karakterdir.
   İletişim/adres alanları kontrollü uzunluklarla normalize edilir; HTML ve
   kontrol karakterleri reddedilir.
6. Aynı firmada en fazla bir aktif `HEADQUARTERS` bulunabilir. Sistem
   otomatik merkez yaratmaz ve `CompanyProfile` adresini lokasyon kaydı diye
   kopyalamaz. Merkez yokluğu Ayarlar yüzeyinde uyarı olarak gösterilir.
7. Mevcut şantiye satırlarının kodu, adı ve aktif/pasif durumu federatif
   dizine taşınır; Şantiye düzenleme bağlantısı `/santiyeler` çalışma
   alanına gider. Lokasyon paneli şantiye mutation action'ı üretmez.
8. Tüm roller dizini okuyabilir. Yalnız `admin` Merkez/Şube/Ofis
   oluşturabilir, güncelleyebilir ve pasifleştirebilir. Master veri olduğu
   için kapalı dönem admin yazımını engellemez; silme yerine pasifleştirme,
   optimistic revision ve idempotent request key kullanılır.
9. Başarılı mutation tek güvenli audit olayı üretir. Audit lokasyon kodu,
   tipi, durum/revision geçişi ve değişen alan anahtarlarını taşıyabilir;
   açık adres, telefon, e-posta, sorumlu kişi ve request key taşımaz.
10. `/ayarlar` mevcut AppShell ve tasarım tokenları içinde birleşik lokasyon
    listesi, tip/durum/kaynak filtreleri, form, boş/hata/loading,
    concurrency, 390 px mobil, açık/koyu tema ve print-safe görünüm sağlar.
    İzole kabul; scope, rol, retry, stale revision, tek aktif merkez,
    federatif şantiye ve profil/session/operasyon yan etkisizliğini doğrular.

## 4. Domain ve veri sözleşmesi

Kalıcı lokasyon snapshot'ı:

- `id`
- `tenantId`, `companyId`
- `code`, `name`, `type`
- `responsiblePerson`, `phone`, `email`
- `addressLine`, `district`, `city`, `postalCode`
- `status`
- `revisionNo`, `lastMutationKey`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

Birleşik okuma DTO'su ayrıca:

- `source = company-location | site-record`
- `canManage`
- Şantiye kaynağı için `/santiyeler` hedefi

taşır. Federatif okuma tek liste üretir fakat iki kaynağın yazma
sorumluluğunu birleştirmez.

## 5. Tüketici sınırı

İlk tüketiciler:

- Ayarlar: birleşik lokasyon özeti, filtreler ve Merkez/Şube/Ofis formu,
- Ayarlar özeti/yazdırma: aktif lokasyonların print-safe listesi,
- Şantiye satırları: yalnız görüntüleme ve `/santiyeler` bağlantısı.

AppShell scope etiketi, session seçenekleri, `Company.name`,
`CompanyProfile`, kullanıcı/rol erişimi, mevcut şantiye CRUD'u, personel
transferi, araç/stock/hakediş/finans kayıtları ve API sözleşmeleri
değiştirilmez.

## 6. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Çekirdeği | Typed lokasyon, normalizasyon, validasyon, tek merkez, rol, revision ve idempotency kararları | Saf testler; şema/repository/UI değişmez. |
| 2 — Şema ve Repository | Additive model/migration, scoped CRUD ve federatif şantiye okuması | Backfill ve ikinci şantiye master'ı yoktur. |
| 3 — Server Action ve Audit | Scope guard'lı okuma/yazma action'ları, pasifleştirme ve hassas veri içermeyen audit | Admin-only mutation; retry audit çoğaltmaz. |
| 4 — Lokasyon Dizini UI | `/ayarlar` liste, filtre, form, şantiye bağlantısı ve print görünümü | AppShell, session ve operasyon formları değişmez. |
| 5 — İzole Gerçek Veri ve Kapanış | Ayrılmış firma, rol/scope/concurrency, tek merkez, federatif şantiye ve tam kalite kabulü | Profil, session ve komşu operasyonlarda yan etki yoktur. |

## 7. Kabul kriterleri

- Kayıt yokken dizin boş Merkez/Şube/Ofis ve mevcut scoped Şantiye
  satırlarını doğru birleştirir.
- Başka tenant/firma lokasyonu veya şantiyesi görünmez.
- Admin geçerli lokasyon oluşturabilir, güncelleyebilir ve
  pasifleştirebilir; accounting/viewer yazamaz.
- İkinci aktif merkez reddedilir; mevcut kayıt korunur.
- Kapalı dönem company-scoped admin mutation'ını tek başına engellemez.
- Aynı request key ikinci mutation/audit üretmez.
- Eski revision yazımı reddedilir.
- Audit hassas iletişim/adres değerlerini ve request key'i taşımaz.
- Şantiye kaydı yalnız kendi mevcut CRUD hattından yönetilir.
- Tam kapılar `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 8. Kapsam dışı

`locationMode` değişikliği, kullanıcıya lokasyon atama, granular location
RBAC, operasyon kayıtlarını yeni lokasyona taşıma, şantiye backfill'i veya
yeniden modelleme, depo/maliyet merkezi, harita/koordinat, çalışma saatleri,
fotoğraf/logo, dış adres doğrulaması, toplu import ve yeni API endpoint'i bu
RFC'nin dışındadır.

## 9. Kapanış

Bölüm 3'teki on varsayım 30.07.2026 tarihinde kullanıcı tarafından
onaylandı. Beş dilim; typed domain, additive `CompanyLocation` şeması,
company-scoped repository, dönem-scoped federatif şantiye okuması,
admin-only action ve güvenli audit, Ayarlar UI ve izole gerçek veri
kabulüyle tamamlandı.

`locationMode`, AppShell/session scope'u, kullanıcı lokasyon yetkisi,
operasyon kayıtları ve mevcut şantiye CRUD'u değiştirilmedi. Kabul kanıtı
`Docs/UI-baseline/Faz26-gercek-veri-kapanis-20260730.md` içindedir.
