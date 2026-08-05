# RFC-F28-01 — Tedarikçi Kategori Sözlüğü

> Durum: **Tamamlandı — Dilim 1–5**
> Tarih: 31.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-modul-gelistirme-plani.md` Bölüm 4.2 ve
> 6.5; mevcut `EntityRecord` tedarikçi kartı, cari XLSX içe aktarma hattı,
> Ayarlar master veri kalıpları ve şirket kapsam modeli

## 1. Amaç

Tedarikçi kartındaki serbest metin `category` alanını bozmadan, yeni ve
düzenlenen tedarikçiler için şirket kapsamlı, yönetilebilir ve tekrar
kullanılabilir kategori sözlüğü sağlamak. Kategori sözlüğü cari liste
filtresi, tedarikçi formu ve XLSX/CSV önizleme doğrulaması tarafından ortak
kaynak olarak kullanılacaktır.

Bu faz tedarikçi kartını ayrı tabloya taşımak, mevcut `EntityRecord`
payload'ını yeniden modellemek, satın alma onay akışı, stok muhasebe hesabı
otomasyonu veya yapay zekâ ile kategori tahmini çalışması değildir.

## 2. Neden sıradaki çalışma

- Faz 27 ile sağlayıcıdan bağımsız şirket ayarları ve belge kimliği hattı
  tamamlandı.
- Ana plan Bölüm 4.2, tedarikçi kategorisini P0 kart alanı olarak uyguladı
  fakat lookup sözlüğünü P1'e bıraktı.
- Mevcut kategori filtresi yalnız tedarikçi satırlarında yazılmış serbest
  metinlerden türetiliyor; yazım farkları aynı kavramı birden fazla kategori
  gibi gösterebilir.
- XLSX çalışma sayfası seçimi ve kullanıcı kontrollü bire bir kolon eşleme
  zaten kodda/testlerde mevcut olduğundan Faz 28 aynı özelliği yeniden
  uygulamayacaktır.
- Gerçek banka, ödeme, e-posta, Arvento veya bulut depolama sağlayıcısı
  gerektirmez.

## 3. Önerilen varsayımlar

1. Faz 28 yalnız **tedarikçi kategori sözlüğü** dikeyidir. Müşteri tipi,
   taşeron uzmanlık alanı, stok grubu, masraf merkezi ve genel amaçlı lookup
   tasarımcısı bu faza alınmaz.
2. Kategori `tenantId + companyId` kapsamında ve dönemden bağımsızdır. Aynı
   normalize kategori adı bir şirkette tekil, başka şirkette bağımsızdır.
3. Additive, typed `SupplierCategory` Prisma modeli ve migration kullanılır.
   Mevcut `EntityRecord.payload.category` alanı korunur; tedarikçi kayıtları
   backfill edilmez veya yeni tabloya taşınmaz.
4. Kategori adı 2–80 karakter, açıklama isteğe bağlı en fazla 240 karakter
   olur. Baş/son boşluklar temizlenir; boş, yalnız noktalama içeren veya
   case/boşluk normalizasyonuyla tekrar eden ad reddedilir.
5. Effective dizin, yönetilen kategori kayıtları ile mevcut scoped tedarikçi
   kartlarında kullanılan kategori değerlerini federatif biçimde birleştirir.
   Henüz yönetilen kaydı olmayan mevcut değerler `existing-record` kaynağıyla
   görünür; otomatik DB kaydı veya backfill oluşturulmaz.
6. Yalnız `admin` kategori oluşturabilir, düzenleyebilir ve
   aktif/pasif yapabilir. Accounting ve viewer okuyabilir. Bu dönemden
   bağımsız master veri olduğundan kapalı dönem admin mutation'ını engellemez.
7. Optimistic `revisionNo` ve kullanıcı/firma kapsamlı idempotent request key
   uygulanır. Fiziksel silme yapılmaz; pasife alınan kategori mevcut
   tedarikçi kartlarındaki değeri değiştirmez.
8. Yeni tedarikçi oluşturma ve kategori değiştirme sırasında yalnız effective
   aktif kategoriler seçilebilir. Mevcut kartta pasif veya yalnız keşfedilmiş
   kategori varsa değer görünür kalır; kullanıcı başka aktif kategori
   seçmeden kayıt sessizce bozulmaz.
9. CSV/XLSX önizleme ve server-side `importMany` aynı effective kategori
   sözleşmesini uygular. Geçersiz kategori satır bazlı hata olur; geçerli
   satırları uygulama davranışı, kolon eşleme, sheet seçimi ve mevcut import
   audit'i korunur.
10. Başarılı kategori create/update/status mutation'ı tek redacted audit
    üretir. İzole kabul scope, rol, kapalı dönem, retry, stale revision,
    duplicate normalizasyon, federatif keşif, import/form tüketimi ve
    session/finans/ledger/stok yan etkisizliğini; UI 390 px, tema ve print
    sözleşmelerini doğrular.

## 4. Domain ve veri sözleşmesi

Kalıcı `SupplierCategory`:

- `id`
- `tenantId`, `companyId`
- `name`, `normalizedName`, `description`
- `status = ACTIVE | INACTIVE`
- `revisionNo`, `lastMutationKey`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

Effective dizin satırı:

- `id`
- `name`, `description`
- `status`
- `source = managed | existing-record`
- `usageCount`
- `revisionNo`
- `canManage`

`existing-record` satırları salt okunur sanal kayıtlardır. Aynı adın yönetilen
kaydı varsa iki satır üretilmez; yönetilen kayıt kaynak ve durum açısından
önceliklidir, kullanım sayısı mevcut tedarikçi kartlarından hesaplanır.

## 5. İş akışı

### Ayarlar

- kategori dizini,
- aktif/pasif ve kaynak filtresi,
- ad/açıklama araması,
- yeni kategori,
- yönetilen kategoriyi düzenleme,
- aktif/pasif geçişi,
- kullanım sayısı ve salt-okunur keşfedilmiş kategori durumu.

### Tedarikçiler

- yeni/düzenle formunda effective aktif kategori seçimi,
- mevcut pasif/eski değerin kayıpsız görünmesi,
- liste filtresinin aynı dizin adlarını kullanması,
- form ve import'ta aynı kategori doğrulaması.

### İçe aktarma

- XLSX/CSV dosya okuma, sheet seçimi ve kolon eşleme istemci akışı korunur,
- kategori doğrulaması önizlemede satır hatası üretir,
- server action istemci önizlemesine güvenmeden kategoriyi yeniden doğrular,
- geçerli satırların toplu yazımı ve mevcut `entity.create` audit zinciri
  korunur.

## 6. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Çekirdeği | Ad normalizasyonu, durum/RBAC/revision/idempotency ve effective federasyon | Saf testler; şema/UI değişmez. |
| 2 — Şema ve Repository | Additive model/migration, company-scoped CRUD ve mevcut tedarikçi kategori keşfi | `EntityRecord` backfill edilmez. |
| 3 — Server Action ve Audit | Liste/create/update/status action'ları, redacted audit ve import doğrulama köprüsü | Admin-only mutation; retry audit çoğaltmaz. |
| 4 — Ayarlar ve Tedarikçi UI | Kategori yönetimi, form seçimi, filtre ve CSV/XLSX satır doğrulaması | Mevcut sheet/mapping/import akışı korunur. |
| 5 — İzole Gerçek Veri ve Kapanış | Ayrılmış firma, rol/scope/concurrency, federasyon, import ve tam kalite kabulü | Session, finans, ledger, stok ve cari hareket yan etkisi yoktur. |

## 7. Kabul kriterleri

- Yönetilen kayıt yokken mevcut tedarikçi kategorileri salt okunur effective
  dizinde görünür.
- Aynı normalize ad şirket içinde ikinci kez oluşturulamaz.
- Başka şirket kategorisi okunamaz veya değiştirilemez.
- Admin kapalı dönemde yönetebilir; accounting/viewer yazamaz.
- Retry ikinci mutation/audit üretmez; stale revision reddedilir.
- Pasifleştirme mevcut tedarikçi kartını değiştirmez.
- Yeni form yalnız aktif effective kategori seçtirir.
- Import önizlemesi ve server action geçersiz kategoriyi aynı şekilde
  reddeder.
- Sheet seçimi, kolon eşleme ve geçerli satırları uygulama davranışı
  regresyona uğramaz.
- Tam kapılar `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 8. Kapsam dışı

Genel amaçlı lookup motoru, müşteri/taşeron/stok sınıflandırmaları, kategori
hiyerarşisi, çoklu kategori etiketi, satın alma onayı, muhasebe hesabı veya
vergi kuralı bağlama, otomatik kategori tahmini, dış katalog entegrasyonu,
mevcut tedarikçi backfill'i ve yeni API endpoint'i kapsam dışıdır.

## 9. Onay kapısı

On varsayım ve Faz 28 dilimlerinin kesintisiz uygulanması kullanıcı tarafından
31.07.2026 tarihinde onaylandı. Domain, şema/repository, server action/audit,
Ayarlar ve Tedarikçi UI ile izole gerçek veri/kapanış dilimleri tamamlandı.
Ayrıntılı kabul kaydı
`Docs/UI-baseline/Faz28-gercek-veri-kapanis-20260731.md` içindedir.
