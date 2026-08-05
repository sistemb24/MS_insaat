# RFC-F29-01 — Müşteri Tipi Sözlüğü

> Durum: **Tamamlandı — Dilim 1–5**
> Tarih: 31.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-modul-gelistirme-plani.md` Bölüm 3, 6 ve
> 6.5; mevcut `EntityRecord` müşteri kartı, cari CSV/XLSX içe aktarma hattı,
> Faz 28 federatif master veri kalıbı ve şirket kapsam modeli

## 1. Amaç

Müşteri kartındaki serbest metin `customerType` alanını bozmadan; yeni ve
düzenlenen müşteriler için şirket kapsamlı, yönetilebilir ve tekrar
kullanılabilir müşteri tipi sözlüğü sağlamak. Sözlük; müşteri listesi filtresi,
yeni/düzenle formu ve CSV/XLSX önizleme doğrulamasının ortak kaynağı olacaktır.

Bu faz müşteri kartını ayrı tabloya taşımak, mevcut `EntityRecord` payload'ını
yeniden modellemek, müşteri tipine göre vergi/fatura/muhasebe davranışı
üretmek veya genel amaçlı lookup altyapısı kurmak değildir.

## 2. Neden sıradaki çalışma

- Faz 28 ile company-scoped federatif master veri kalıbı, mevcut cari
  payload'ını taşımadan gerçek veri üzerinde doğrulandı.
- Ana plan Bölüm 3 ve 6, müşteri tipini P1 kart alanı olarak taşıyor; ancak
  değer halen serbest metindir.
- Mevcut örnek ve gerçek kayıtlarda `Kurumsal`, `Kamu` ve benzeri değerler
  bulunabilir; yazım/case/boşluk farkları filtre ve raporlamada aynı kavramı
  parçalayabilir.
- Cari CSV/XLSX sheet seçimi, kolon eşleme, satır önizleme, hata raporu ve
  geçerli satırları uygulama zaten çalışır; Faz 29 bunları yeniden yazmaz.
- Gerçek banka, ödeme, e-posta, Arvento veya bulut depolama sağlayıcısı
  gerektirmez.

## 3. Önerilen varsayımlar

1. Faz 29 yalnız **müşteri tipi sözlüğü** dikeyidir. Tedarikçi kategorisi,
   taşeron uzmanlığı, stok grubu, masraf merkezi, lokasyon tipi ve genel lookup
   tasarımcısı bu faza alınmaz.
2. Müşteri tipi `tenantId + companyId` kapsamında ve dönemden bağımsızdır.
   Aynı normalize ad bir şirkette tekil, başka şirkette bağımsızdır.
3. Additive, typed `CustomerType` Prisma modeli ve migration kullanılır.
   Mevcut `EntityRecord.payload.customerType` korunur; müşteri kayıtları
   backfill edilmez veya yeni tabloya taşınmaz.
4. Tip adı 2–80 karakter, açıklama isteğe bağlı en fazla 240 karakter olur.
   Baş/son ve tekrarlı boşluklar normalize edilir; boş, yalnız noktalama
   içeren veya Türkçe case/boşluk normalizasyonuyla tekrar eden ad reddedilir.
5. Effective dizin, yönetilen kayıtlarla şirketin tüm dönemlerindeki mevcut
   müşteri kartlarında kullanılan tip değerlerini federatif birleştirir.
   Yönetilmeyen mevcut değer `existing-record` kaynağıyla görünür; otomatik
   DB kaydı veya backfill oluşturulmaz.
6. Yalnız `admin` oluşturabilir, düzenleyebilir ve aktif/pasif yapabilir.
   Accounting ve viewer okuyabilir. Dönemden bağımsız master veri olduğu için
   kapalı dönem admin mutation'ını engellemez.
7. Optimistic `revisionNo` ve kullanıcı/firma kapsamlı idempotent request key
   uygulanır. Fiziksel silme yapılmaz; pasife alma mevcut müşteri kartlarını
   veya finansal kayıtları değiştirmez.
8. Yeni müşteri oluşturma ve tip değiştirme sırasında yalnız effective aktif
   tipler seçilebilir. Mevcut karttaki pasif veya yalnız keşfedilmiş değer
   görünür kalır ve aynı değerle kaydetme geriye uyumlu olur.
9. CSV/XLSX önizleme ve server-side create/update/import aynı effective
   sözleşmeyi uygular. Geçersiz tip satır hatasıdır; sheet seçimi, kolon
   eşleme, kısmi geçerli satır uygulama ve mevcut entity audit zinciri korunur.
10. Başarılı create/update/status mutation'ı tek redacted audit üretir. İzole
    kabul scope, rol, kapalı dönem, retry, stale revision, normalize duplicate,
    federatif keşif, form/filtre/import tüketimi ve session/finans/ledger/stok
    yan etkisizliğini; UI tema, 390 px, print ve konsol sözleşmesini doğrular.

## 4. Domain ve veri sözleşmesi

Kalıcı `CustomerType`:

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

Yönetilen kayıt aynı normalize ada sahip keşfedilmiş değerin önüne geçer;
mevcut müşteri kartlarından hesaplanan kullanım sayısını korur. Sözlükteki tip
yalnız sınıflandırma metadatasıdır; vergi, fatura, tahsilat, satış hesabı veya
yetki davranışını otomatik değiştirmez.

## 5. İş akışı

### Ayarlar

- müşteri tipi dizini,
- ad/açıklama araması ve aktif/pasif filtresi,
- yeni tip ve yönetilen tipi düzenleme,
- aktif/pasif geçişi,
- kullanım sayısı ve keşfedilmiş salt-okunur kaynak görünürlüğü.

### Müşteriler

- yeni/düzenle formunda active effective tip seçimi,
- mevcut pasif/eski değerin kayıpsız görünmesi,
- liste filtresinin aynı effective adları kullanması,
- filtre, form ve import'ta ortak normalizasyon/doğrulama.

### İçe aktarma

- mevcut CSV/XLSX okuma, sheet seçimi ve kolon eşleme korunur,
- müşteri tipi önizlemede satır bazlı doğrulanır,
- server action istemci sonucuna güvenmeden yeniden doğrular,
- geçerli satırların toplu yazımı ve mevcut entity audit'i korunur.

## 6. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Çekirdeği | Normalizasyon, durum/RBAC/revision/idempotency ve effective federasyon | Saf testler; şema/UI değişmez. |
| 2 — Şema ve Repository | Additive model/migration, company-scoped CRUD ve müşteri tipi keşfi | `EntityRecord` backfill edilmez. |
| 3 — Server Action ve Audit | Liste/create/update/status action'ları, redacted audit ve entity doğrulama köprüsü | Admin-only mutation; retry audit çoğaltmaz. |
| 4 — Ayarlar ve Müşteri UI | Tip yönetimi, liste filtresi, form seçimi ve CSV/XLSX satır doğrulaması | Mevcut cari/import akışı korunur. |
| 5 — İzole Gerçek Veri ve Kapanış | Ayrılmış firma, rol/scope/concurrency, federasyon, import ve tam kalite kabulü | Session, finans, ledger, stok ve cari hareket yan etkisi yoktur. |

## 7. Kabul kriterleri

- Yönetilen kayıt yokken mevcut müşteri tipleri effective dizinde görünür.
- Aynı normalize ad şirket içinde ikinci kez oluşturulamaz.
- Başka şirketin müşteri tipi okunamaz veya değiştirilemez.
- Admin kapalı dönemde yönetebilir; accounting/viewer yazamaz.
- Retry ikinci mutation/audit üretmez; stale revision reddedilir.
- Pasifleştirme mevcut müşteri kartını ve finansal kayıtları değiştirmez.
- Yeni müşteri formu yalnız aktif effective tipleri seçtirir.
- Mevcut pasif/eski değer düzenleme sırasında kaybolmaz.
- CSV/XLSX önizlemesi ve server action geçersiz tipi aynı şekilde reddeder.
- Tam kapılar `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 8. Kapsam dışı

Genel lookup motoru, müşteri tipi hiyerarşisi veya çoklu etiket, tip bazlı
vergi no zorunluluğu, KDV/muhasebe hesabı/fiyatlandırma/abonelik davranışı,
müşteri kartı backfill'i, satış ve tahsilat yaşam döngüsü değişikliği,
otomatik sınıflandırma, dış katalog/CRM entegrasyonu, granular RBAC ve yeni
API endpoint'i kapsam dışıdır.

## 9. Onay kapısı

Bölüm 3'teki on varsayım ve Faz 29'un tüm dilimleri kullanıcı tarafından
31.07.2026 tarihinde onaylandı. Domain, şema/repository, server action/audit,
UI/import ve izole gerçek veri kapanışı tamamlandı. Kabul kanıtı
`Docs/UI-baseline/Faz29-gercek-veri-kapanis-20260731.md` dosyasındadır.
