# RFC-F12-01 — Kalıcı Import Staging ve Geçmişi

> Tarih: 23.07.2026
> Durum: Onaylandı — Dilim 1–4 tamamlandı
> Sınıf: F2-04 — kalıcı import staging ve geçmişi
> Önerilen faz: Faz 12
> Önceki kapı: RFC-F11-01 / F2-03 / Faz 11 tamamlandı

## 1. Karar Özeti

Hakediş Pro `Aktarım / Simülasyon` alanındaki CSV metraj önizlemesi bugün
dosyayı yalnız tarayıcıda okur; sunucuya dosya, satır, hata veya audit kaydı
göndermez. Faz 12 için bu güvenli önizlemenin yerine değil, devamına; kullanıcı
onayı olmadan gerçek metraj verisi yazmayan kalıcı bir staging ve işlem geçmişi
önerilir.

İlk sürüm yalnız Hakediş Pro metraj CSV aktarımını kapsar. Genel modüllerdeki
mevcut import akışları değiştirilmez ve farklı domainler tek genel amaçlı import
tablosunda birleştirilmez. CSV doğrulandıktan sonra taslak batch olarak
saklanır; kullanıcı açıkça onayladığında mevcut `ConstructionMeasurementSheet`
ve `ConstructionMeasurementLine` iş akışına tek transaction içinde uygulanır.

Bu belge planlama kapısıdır. Onay verilene kadar Prisma şeması, migration,
repository, server action, UI ve gerçek veri değiştirilmeyecektir.

## 2. Mevcut Durum ve Problem

Mevcut Hakediş Pro önizlemesi:

- `.csv` dosyasını tarayıcıda okur,
- `poz_no` ve `miktar` zorunlu başlıklarını denetler,
- isteğe bağlı `aciklama` ve `birim` alanlarını tanır,
- poz, miktar, tekrar ve birim uyuşmazlıklarını gösterir,
- hiçbir kaydı veya audit olayını kalıcılaştırmaz.

Bu sınır güvenlidir ancak ekip aynı doğrulama sonucuna geri dönemez, aktarımı
kimin ve hangi kapsamda hazırladığını kanıtlayamaz, aynı dosyanın tekrar
uygulanmasını deterministik biçimde engelleyemez ve uygulanmış bir batch ile
üretilen metraj satırları arasında kalıcı bağ kuramaz.

Genel entity import altyapısı farklı bir ihtiyacı karşılar: satırları mevcut
CRUD servisine iletir, Hakediş Pro snapshot yeniden hesaplamasını veya kalıcı
staging yaşam döngüsünü modellemez. Bu nedenle F2-04 kapsamında yeniden
kullanılmayacak, davranışı da değiştirilmeyecektir.

## 3. Hedefler

1. CSV içeriğini sunucuda tekrar parse edip doğrulamak.
2. Dosya metadata'sı, hash'i, normalize satırlar ve hata kodlarını kalıcı
   staging kaydı olarak saklamak.
3. Kullanıcıya uygulamadan önce değişmez bir doğrulama özeti sunmak.
4. Açık onayla tüm geçerli satırları tek transaction'da gerçek metraj
   föyü/satırlarına uygulamak.
5. Tekrar yükleme ve tekrar onay isteklerini idempotent kılmak.
6. Batch yaşam döngüsü ve mutation olaylarını merkezi audit ile izlemek.
7. Tenant, firma, dönem, proje ve kaynak hakediş izolasyonunu her okumada ve
   yazmada fail-closed uygulamak.
8. Mevcut snapshot yeniden hesaplama, hakediş ve muhasebe iş akışını korumak.

## 4. Kapsam

- `/hakedis` içindeki metraj CSV import akışı.
- Aktif tenant + firma + dönem + Hakediş Pro proje + kaynak hakediş kapsamı.
- UTF-8 CSV; `poz_no`, `miktar`, isteğe bağlı `aciklama`, `birim`.
- Dosya metadata'sı ve SHA-256 özeti.
- Normalize batch, satır ve olay geçmişi.
- Taslak, doğrulanmış, uygulanmış, iptal edilmiş ve hatalı yaşam döngüsü.
- Accounting ve admin için hazırlama/doğrulama/uygulama/iptal yetkisi.
- Uygulanmış batch ile üretilen metraj föyü ve satırları arasında izlenebilir
  bağ.
- Masaüstü/mobil, light/dark, print ve erişilebilirlik kabulü.
- İç deep-link ile aynı kapsamda batch geçmişine dönüş.

## 5. Kapsam Dışı

- XLSX/XLS/XLSM, makro, formül veya serbest sütun eşleme motoru.
- Genel entity import akışlarının dönüştürülmesi.
- Fatura, stok, personel, ihale veya diğer modüller için ortak import motoru.
- Dosya byte'larını veritabanında veya harici object storage'da saklama.
- Public upload URL'si veya dış kullanıcı paylaşımı.
- Arka plan worker, kuyruk, e-posta veya bildirim otomasyonu.
- Parçalı uygulama; yalnız hatasız satırları yazıp diğerlerini atlama.
- Uygulanmış metrajı otomatik silen veya geri alan rollback.
- Mevcut hakediş, snapshot, muhasebe fişi veya sözleşme pozlarını geriye dönük
  değiştirme.
- Gerçek dış entegrasyon, provider veya kimlik bilgisi varsayımı.

## 6. Önerilen Domain Sözleşmesi

### 6.1 Durumlar

| Durum | Anlam | İzin verilen sonraki adım |
|---|---|---|
| `DRAFT` | Dosya ve satırlar kaydedildi; doğrulama tamamlanmadı | `VALIDATED`, `FAILED`, `CANCELLED` |
| `VALIDATED` | Sunucu doğrulaması geçti; açık kullanıcı onayı bekliyor | `APPLIED`, `FAILED`, `CANCELLED` |
| `APPLIED` | Tüm satırlar tek transaction'da metraja uygulandı | Yok |
| `CANCELLED` | Kullanıcı uygulamadan önce iptal etti | Yok |
| `FAILED` | Parse, doğrulama veya uygulama güvenle tamamlanamadı | Yok; yeni batch yüklenir |

Terminal batch yerinde değiştirilmez. Düzeltme gerekiyorsa kullanıcı yeni bir
dosya/batch oluşturur. Uygulanmış batch satırları, sonradan normal domain
kurallarıyla yapılan metraj düzeltmelerinin geçmişini değiştirmez.

### 6.2 Dosya sınırları

- Yalnız `.csv` ve UTF-8 metin.
- En fazla `2 MiB`.
- Başlık dışında en fazla `500` veri satırı.
- Boş dosya, NUL karakteri, geçersiz UTF-8 ve kapanmamış tırnak reddedilir.
- Ayraç `;` veya `,` olabilir; başlıktan deterministik seçilir.
- Başlık alias'ları sürümlü mapping sözleşmesiyle tanımlanır.
- Formula injection riski taşıyan `=`, `+`, `-`, `@` başlangıçları serbest
  metin alanlarında nötr plain text olarak saklanır; yürütülmez.
- Orijinal dosya adı yalnız güvenli basename, en fazla 180 karakter olarak
  saklanır; istemci yolu kabul edilmez.

### 6.3 Satır doğrulaması

- `poz_no` ve pozitif, en fazla 4 ondalıklı `miktar` zorunludur.
- Poz aktif, aynı tenant/firma/dönem/proje kapsamında ve kaynak hakediş
  snapshot'ında bulunmalıdır.
- Kaynak birim verilmişse sözleşme pozuyla uyuşmalıdır.
- İlk sürümde aynı poz kodu dosya içinde yalnız bir kez bulunabilir.
- Açıklama opsiyoneldir ve 240 karakterle sınırlıdır.
- Normalizasyon sonrası boş veya limit dışı alanlar hata kodu üretir.
- İstemcinin gönderdiği durum, toplam, poz id veya hesap sonucu güven kaynağı
  değildir; sunucu dosya metninden yeniden üretir.

## 7. Önerilen Veri Modeli

Model adları uygulama diliminde Prisma isimlendirme denetimiyle kesinleşir.
Önerilen yapı üç normalize tablodur.

### `ConstructionMeasurementImportBatch`

- `id`
- `tenantId`, `companyId`, `periodId`
- `projectId`, `sourceProgressPaymentId`
- `batchNo` — proje içinde okunur sıra numarası
- `status`
- `originalFileName`, `contentType`, `fileSize`, `fileSha256`
- `mappingVersion`, `delimiter`
- `totalRowCount`, `validRowCount`, `errorRowCount`
- `targetSheetId` — yalnız uygulama sonrası
- `createdBy`, `validatedBy`, `appliedBy`, `cancelledBy`
- `createdAt`, `validatedAt`, `appliedAt`, `cancelledAt`
- `failureCode` — kontrollü enum/kod; ham exception saklanmaz

Önerilen benzersizlik:

`@@unique([tenantId, companyId, periodId, projectId, sourceProgressPaymentId, fileSha256, mappingVersion])`

Önerilen sorgu indeksi:

`@@index([tenantId, companyId, periodId, projectId, status, createdAt])`

### `ConstructionMeasurementImportRow`

- `id`, `batchId`, `rowNo`
- `sourceItemCode`, `contractItemId`
- `description`
- `sourceUnit`, `resolvedUnit`
- `quantity`
- `status` — `READY | ERROR`
- `errorCode` — kontrollü tekincil veya öncelikli kod
- `appliedMeasurementLineId` — yalnız uygulama sonrası
- `createdAt`

Önerilen benzersizlik:

`@@unique([batchId, rowNo])`

Temel alanlar serbest JSON içinde tutulmaz. Çoklu hata gösterimi gerekiyorsa
domain tarafından deterministik sıralanan normalize hata tablosu ayrıca
değerlendirilir; ilk şema diliminde tek `errorCode` yeterliliği test edilir.

### `ConstructionMeasurementImportEvent`

- `id`, `batchId`
- `eventType` — `CREATED | VALIDATED | APPLIED | CANCELLED | FAILED`
- `actorUserId`
- `metadata` — yalnız sayısal özet, mapping sürümü ve güvenli referanslar
- `createdAt`

Event satırları append-only'dir. Batch mutation'ı, event ve merkezi `AuditLog`
aynı transaction'da yazılır.

## 8. Parse, Hash ve İdempotency

1. Action aktif session kapsamını ve abonelik yetkisini çözer.
2. Dosya boyutu ve MIME/uzantı allowlist'i kontrol edilir.
3. Sunucu UTF-8 metni normalize eder; parse sonucu domain DTO'suna çevrilir.
4. SHA-256, normalize içerik byte'ları ve `mappingVersion` üzerinden üretilir.
5. Aynı scope + kaynak hakediş + hash + mapping sürümü daha önce varsa:
   - taslak/doğrulanmış kayıt yeniden döndürülür,
   - uygulanmış kayıt sonucu yeniden döndürülür,
   - yeni batch, satır veya audit üretilmez.
6. İstemci özeti değil sunucu parse sonucu kalıcılaştırılır.

Hash, kullanıcının veya farklı scope'un kayıtlarını keşfetmesine izin veren
global bir lookup olarak kullanılmaz.

## 9. Uygulama Transaction'ı

`VALIDATED → APPLIED` geçişinde repository:

1. batch'i tüm scope alanları ve beklenen durumla kilitli/koşullu okur,
2. dönem ve aboneliğin hâlâ yazılabilir olduğunu doğrular,
3. proje, kaynak hakediş, snapshot ve tüm sözleşme pozlarını yeniden okur,
4. kaynak `updatedAt`/snapshot sürümü değiştiyse batch'i uygulamaz ve yeniden
   doğrulama gerektirir,
5. tek bir `GENERAL` metraj föyü oluşturur,
6. READY satırlarını mevcut metraj satırı kurallarıyla ekler,
7. mevcut sunucu hesaplama yoluyla hakediş snapshot'ını yeniden hesaplar,
8. batch/row bağlantılarını `APPLIED` olarak günceller,
9. event ve merkezi auditi aynı transaction'da yazar.

Bir satır dahi geçersizse hiçbir metraj föyü veya satırı yazılmaz. İstemci
tarafından `measurementSheetId`, `lineId`, toplam veya durum kabul edilmez.

Uygulama sonrası otomatik geri alma yoktur. Hatalı iş kaydı mevcut metraj
domaininin yetkili düzeltme akışıyla ele alınır; toplu destructive rollback
ayrı RFC ve kullanıcı onayı gerektirir.

## 10. RBAC, Scope ve Güvenlik

| İşlem | Viewer | Accounting | Admin |
|---|---:|---:|---:|
| Batch listesi/detayı | Hayır | Evet | Evet |
| Dosya yükleme ve doğrulama | Hayır | Evet | Evet |
| Uygulama | Hayır | Evet | Evet |
| Uygulamadan önce iptal | Hayır | Evet | Evet |
| Terminal geçmişi değiştirme | Hayır | Hayır | Hayır |

- Her action abonelik guard'ını ve aktif tenant/firma/dönem kapsamını kendi
  içinde çözer.
- `projectId` ve `sourceProgressPaymentId` istemciden gelse de aynı scope ve
  birbiriyle ilişki sunucuda doğrulanır.
- Kapalı dönem create/validate/apply/cancel mutation'larını fail-closed
  reddeder.
- Viewer UI kontrolleri yalnız disabled yapılmaz; DOM'a eklenmez.
- Ham dosya byte'ları, istemci yolu, serbest exception veya kullanıcı
  açıklaması audit metadata'sına konmaz.
- CSV hiçbir zaman HTML/JavaScript olarak yorumlanmaz.

## 11. UI ve Erişilebilirlik

Mevcut `Aktarım / Simülasyon` sekmesi korunur. CSV alanı şu adımları gösterir:

1. dosya seçimi ve yerel ön kontrol,
2. sunucuya doğrulama için gönderim,
3. batch özeti ve satır/hata tablosu,
4. açık onay dialog'u,
5. uygulama sonucu ve oluşan metraj föyü bağlantısı,
6. geçmiş batch listesi.

Önerilen iç deep-link: `/hakedis?import=<batch-id>`.

Deep-link yalnız aktif scope içinde çözümlenir. Yetkisiz veya farklı scope'taki
id için kayıt varlığını sızdırmayan ortak hata kullanılır.

Kabul ölçütleri:

- dialog ilk odağı ve kapanışta odak dönüşü,
- status/error için `aria-live`,
- hata özetinden satıra erişilebilir ilişki,
- yalnız renge dayanmayan durum,
- 390 × 844 mobilde sayfa taşması olmaması,
- light/dark kontrast,
- print'te batch özeti ve satır sonuçlarının okunabilir olması,
- dosya input'unun klavye ve görünür label ile kullanılabilmesi.

## 12. Audit ve İzlenebilirlik

Merkezi audit action adları:

- `CONSTRUCTION_MEASUREMENT_IMPORT_CREATED`
- `CONSTRUCTION_MEASUREMENT_IMPORT_VALIDATED`
- `CONSTRUCTION_MEASUREMENT_IMPORT_APPLIED`
- `CONSTRUCTION_MEASUREMENT_IMPORT_CANCELLED`
- `CONSTRUCTION_MEASUREMENT_IMPORT_FAILED`

Audit metadata yalnız `batchId`, proje/hakediş güvenli referansları, satır
sayıları, mapping sürümü ve durum geçişini içerir. Dosya adı, satır açıklaması,
ham hücre, hash veya exception metadata'ya kopyalanmaz.

Salt-okunur list/detail çağrıları audit üretmez. İdempotent tekrar aynı event
veya audit'i çoğaltmaz.

## 13. Migration, Backfill ve Rollback

- Migration additive üç tablo ve ilişkili enum/indekslerden oluşur.
- Mevcut kayıtlar için backfill yoktur; geçmiş yerel önizlemeler geri
  üretilemez.
- Migration öncesi ve sonrası mevcut Hakediş Pro testleri aynen geçmelidir.
- Uygulama feature flag veya route guard ile geri kapatılabilir.
- Kod rollback'i yeni batch oluşumunu durdurabilir; mevcut import geçmişi
  silinmez.
- Tablo/kolon silme, uygulanmış metrajı geri alma veya audit temizleme rollback
  kapsamında değildir.

## 14. Uygulama Dilimleri

### Dilim 1 — Domain Çekirdeği

- CSV byte/text sınırları, parser ve normalize DTO.
- Header mapping sürümü, hata kodları ve lifecycle state machine.
- Hash/idempotency anahtarı ve RBAC/scope kararları.
- Saf domain testleri.

Prisma, repository, action, UI ve gerçek veri değişmez.

### Dilim 2 — Şema ve Repository

- Additive migration ve normalize üç tablo.
- Scoped list/detail/create/validate repository işlemleri.
- Transactional apply ve mevcut metraj yeniden hesaplama bağlantısı.
- Idempotent retry, optimistic status ve yanlış scope testleri.

Gerçek import batch'i oluşturulmaz.

### Dilim 3 — Server Action ve Audit

- Upload/validate, list/detail, apply ve cancel action'ları.
- Abonelik, dönem, rol ve scope guard'ları.
- Aynı transaction'da event + merkezi audit.
- Güvenli hata sözleşmesi ve revalidation.

UI ve gerçek veri değişmez.

### Dilim 4 — UI ve Deep-link

- Mevcut CSV önizlemesinden kalıcı batch akışına kontrollü geçiş.
- Özet, hata tablosu, confirm, geçmiş ve oluşan föy bağlantısı.
- `/hakedis?import=<id>` iç deep-link.
- Viewer DOM sınırı, mobil/tema/print/odak testleri.

Gerçek dosya uygulanmadan yazmasız görsel ön kabul yapılır.

### Dilim 5 — Gerçek Veri ve Kapanış

- İzole demo projesi/hakedişinde bir geçerli ve bir hatalı CSV kabulü.
- Geçerli batch için create → validate → apply; aynı dosyada idempotent retry.
- Hatalı batch'in metraj yazmadığının kanıtı.
- Kaynak ve scope mutabakatı, audit/event sayıları ve cross-scope sıfırları.
- Masaüstü/mobil, light/dark, print ve erişilebilirlik kabulü.
- Tekrarlanabilir read-only doğrulama komutu.
- Tam kalite kapıları ve plan/gap kapanış kayıtları.

## 15. Test ve Kabul Matrisi

| Alan | Asgari kabul |
|---|---|
| Parser | BOM, `;`/`,`, quoted hücre, CRLF, UTF-8, geçersiz tırnak |
| Limit | 2 MiB ve 500 satır sınırlarının iki tarafı |
| Mapping | Alias, eksik zorunlu başlık, bilinmeyen başlık davranışı |
| Satır | Poz, miktar, birim, tekrar, açıklama limiti |
| Güvenlik | Formula başlangıcı, NUL, path filename, ham exception sızıntısı |
| Lifecycle | Geçerli/geçersiz tüm durum geçişleri |
| RBAC | Viewer red; accounting/admin izinleri |
| Scope | Yanlış tenant/firma/dönem/proje/hakediş sonucu sıfır |
| Dönem/abonelik | Kapalı veya özelliksiz durumda fail-closed |
| Idempotency | Aynı dosya ve apply retry'ında tek batch/event/audit |
| Transaction | Bir satır hatasında sıfır metraj yazımı |
| Recalculation | Uygulama sonrası snapshot mevcut servisle tutarlı |
| UI | Deep-link, confirm, odak, hata ilişkisi, viewer DOM sınırı |
| Görsel | Desktop/mobile, light/dark, overflow, print, console |
| Regresyon | Mevcut metraj, hakediş, simülasyon ve genel import testleri |

Her dilimde hedefli testlerden sonra:

```text
npm test
npm run type-check
npm run db:validate
npm run lint
npm run build
git diff --check
```

## 16. Riskler ve Kontroller

| Risk | Kontrol |
|---|---|
| İstemci önizlemesine güvenmek | Sunucuda byte'tan yeniden parse/doğrulama |
| Aynı dosyanın iki kez uygulanması | Scope + kaynak + SHA-256 + mapping sürümü |
| Kısmi metraj yazımı | Tek transaction ve all-or-nothing |
| Kaynak hakedişin arada değişmesi | Apply öncesi source/snapshot sürüm kontrolü |
| Cross-tenant veri sızıntısı | Her sorguda tam scope ve varlık gizleyen hata |
| Büyük dosyanın isteği tüketmesi | 2 MiB / 500 satır hard limit |
| CSV formula/HTML enjeksiyonu | Plain text normalizasyonu ve çıktı escaping |
| PII veya ham dosya birikmesi | Dosya byte'ı saklamama, güvenli metadata |
| Destructive rollback beklentisi | Otomatik geri alma yok; ayrı RFC kapısı |
| Genel import davranışının bozulması | İlk sürüm yalnız Hakediş Pro domaini |

## 17. Onaylanan 10 Varsayım

1. Çalışma **Faz 12 / RFC-F12-01** olarak yürütülecek.
2. İlk sürüm yalnız Hakediş Pro metraj CSV import'unu kapsayacak; genel entity
   import akışları değişmeyecek.
3. İlk sürüm UTF-8 CSV, en fazla 2 MiB ve 500 veri satırıyla sınırlı olacak;
   XLSX ve makro kapsam dışı kalacak.
4. Akış `DRAFT → VALIDATED → APPLIED` olacak; `CANCELLED` ve `FAILED` terminal
   durumları bulunacak, kullanıcı onayı olmadan gerçek yazma yapılmayacak.
5. Dosya metadata'sı, SHA-256, normalize satır/hata/event saklanacak; orijinal
   dosya byte'ları saklanmayacak.
6. Additive ve normalize batch/row/event modelleri kullanılacak; temel satır
   alanları serbest JSON payload'a konmayacak.
7. Viewer erişemeyecek; accounting ve admin tam akışı kullanabilecek. Tüm
   işlemler aktif tenant/firma/dönem/proje/hakediş ve abonelik kapsamında
   fail-closed çalışacak.
8. Apply mevcut metraj föyü/satırı ve sunucu yeniden hesaplama yolunu tek
   transaction'da, all-or-nothing kullanacak. Uygulanmış geçmiş değişmez olacak
   ve otomatik destructive rollback yapılmayacak.
9. Idempotency scope + kaynak hakediş + dosya hash'i + mapping sürümüne
   dayanacak; CSV formula başlangıçları etkisiz plain text olacak ve ham
   exception dışarı verilmeyecek.
10. Public upload, object storage, worker, bildirim ve dış provider entegrasyonu
    açılmayacak; gerçek veri kabulü izole olacak ve kaynak kayıtlar korunacak.

Bu 10 varsayım 23.07.2026 tarihinde kullanıcı tarafından birlikte onaylandı.

## 18. Dilim 1 Uygulama Kaydı — Domain Çekirdeği

Saf `construction-measurement-import` domain modülü eklendi. Bu dilimde:

- ham byte girdisi strict UTF-8 olarak çözülür,
- UTF-8 BOM ve CRLF/CR biçimleri deterministik normalize edilir,
- 2 MiB ve 500 veri satırı hard limitleri uygulanır,
- `;` ve `,` ayraçları, quoted hücre/escaped quote/satır sonu desteklenir,
- sürümlü Türkçe/İngilizce başlık alias'ları eşlenir,
- poz, aktiflik, miktar, 4 ondalık, birim, tekrar ve açıklama limitleri
  kontrollü hata kodlarıyla doğrulanır,
- formula başlangıçları etkisiz plain text'e dönüştürülür; markup ve kontrol
  karakterleri temizlenir,
- normalize içerik için tam SHA-256 üretilir,
- idempotency anahtarı tenant + firma + dönem + proje + kaynak hakediş + dosya
  hash'i + mapping sürümünün opaque özetinden oluşturulur,
- `DRAFT / VALIDATED / APPLIED / CANCELLED / FAILED` durum geçişleri ile
  viewer red, accounting/admin ve kapalı dönem kararları saf fonksiyonlara
  bağlanır.

25 hedefli domain testi parser, dosya sınırı, güvenlik, lifecycle, RBAC,
scope-idempotency ve normalizasyon matrisini kapsar. Prisma şeması, migration,
repository, server action, UI ve gerçek veri bu dilimde değiştirilmedi.
Tam paket 232 dosya/1.351 test, type-check, Prisma validate, lint, diff
denetimi ve 74 sayfalık production build ile geçti. Faz 11 read-only gerçek
veri mutabakatı da değişmeden başarılıdır.
Sıradaki bağımsız dilim **Şema ve Repository**'dir.

## 19. Dilim 2 Uygulama Kaydı — Şema ve Repository

Additive ve backfill'siz migration ile üç normalize tablo eklendi:

- `ConstructionMeasurementImportBatch`,
- `ConstructionMeasurementImportRow`,
- `ConstructionMeasurementImportEvent`.

Batch; tenant, firma, dönem, proje ve kaynak hakediş kapsamını, batch sırasını,
dosya metadata/hash/mapping bilgisini, kaynak hakediş ve snapshot sürümünü,
satır özetlerini ve lifecycle aktör/tarihlerini taşır. Satır temel alanları
normalize kolonlardadır; error code ve uygulanmış metraj satırı bağlantısı
ayrıdır. Event geçmişi append-only tutulur. Uygulanmış föy/satır ilişkileri
`RESTRICT`, batch altındaki row/event geçmişi `CASCADE` ile modellenmiştir.

Scoped Prisma repository:

- proje batch listesi ve detayını tam aktif scope ile okur,
- aynı scope + kaynak + hash + mapping tekrarını idempotent döndürür,
- batch + satırlar + `CREATED` event'ini tek transaction'da yazar,
- kaynak hakediş/snapshot sürümünü ve poz referanslarını yeniden doğrular,
- `DRAFT → VALIDATED`, `VALIDATED → APPLIED` ve uygulanmamış batch iptalini
  optimistic, tam scope'lu update ile yürütür,
- apply sırasında tek `GENERAL` föy ve tüm satırları oluşturur, import satırı
  bağlantılarını kurar ve mevcut snapshot hesap yolunu aynı transaction'da
  çalıştırır,
- bir satır/bağlantı/durum yarışı başarısızsa transaction'ı tamamen geri alır,
- terminal retry'larda yeni föy, satır veya event üretmez.

Mevcut hakediş action'ındaki snapshot/özet hesap helper'ları ortak scoped Prisma
modülüne çıkarıldı; eski action ve import repository aynı hesap yolunu kullanır.
Server Action, merkezi `AuditLog` ve UI henüz eklenmedi.

Migration geliştirme veritabanına uygulandı; 45 migration günceldir. Yeni
batch/row/event tabloları `0/0/0`, yanlış scope sayımı `0` ve gerçek import
batch'i yoktur. 13 repository testi; 25 Domain testi ve mevcut hakediş action
regresyonuyla hedefli paket 3 dosya/39 testtir. Tam paket 233 dosya/1.364 test,
type-check, Prisma validate, lint, diff denetimi ve 74 sayfalık production build
ile geçti. Faz 11 gerçek veri mutabakatı değişmeden başarılıdır.

Sıradaki bağımsız dilim **Server Action ve Audit**'tir.

## 20. Dilim 3 Uygulama Kaydı — Server Action ve Audit

Kalıcı import için yalnız sunucuda çalışan scoped action katmanı eklendi:

- proje kapsamlı batch listeleme ve batch detay okuma,
- CSV upload + sunucuda byte'tan yeniden parse ve normalize staging oluşturma,
- validate, apply ve cancel mutation'ları,
- `progress-payments` abonelik yeteneği, aktif oturum, tenant + firma + dönem +
  proje + kaynak hakediş, rol ve açık dönem kontrolleri,
- kontrollü repository/domain hataları ile ham exception, dosya içeriği, hash
  veya hassas hücre değerini dışarı taşımayan güvenli Türkçe hata sözleşmesi,
- başarılı ve gerçekten durum değiştiren mutation sonrasında `/hakedis`
  revalidation'ı.

Accounting ve admin tam akışı kullanabilir; viewer mutation'a ve detay
okumasına erişemez. Dosya boyutu beyanı gerçek byte uzunluğuyla yeniden
karşılaştırılır. Parser istemci sonucuna güvenmez; normalize satırlar sunucuda
yeniden üretilir. Dosya seviyesindeki hata hiçbir batch yazmaz, satır
seviyesindeki kontrollü hatalar ise kullanıcı düzeltme/inceleme akışı için
`DRAFT` batch içinde saklanabilir. Orijinal dosya byte'ı kalıcılaştırılmaz.

Create, validate, apply ve cancel repository transaction'ları append-only event
ile merkezi `AuditLog` kaydını birlikte yazar. Merkezi action adları sırasıyla:

- `CONSTRUCTION_MEASUREMENT_IMPORT_CREATED`,
- `CONSTRUCTION_MEASUREMENT_IMPORT_VALIDATED`,
- `CONSTRUCTION_MEASUREMENT_IMPORT_APPLIED`,
- `CONSTRUCTION_MEASUREMENT_IMPORT_CANCELLED`.

Audit metadata'sı yalnız güvenli kimlik/durum özetini taşır; filename, hash,
ham satır/hücre veya exception içermez. Terminal idempotent retry yeni event,
audit, metraj veya revalidation üretmez.

11 yeni action testi ve repository/domain/mevcut hakediş regresyonlarıyla
hedefli paket 4 dosya/50 testtir. Tam paket 234 dosya/1.375 test, type-check,
Prisma validate, lint, güncel 45 migration, diff denetimi ve 74 sayfalık
production build ile geçti. Faz 11 read-only kabul komutu başarılıdır. Import
batch/row/event sayıları `0/0/0`, yanlış scope sayımı `0`; UI veya gerçek import
verisi değiştirilmedi.

Sıradaki bağımsız dilim **UI ve Deep-link**'tir.

## 21. Dilim 4 Uygulama Kaydı — UI ve Deep-link

Mevcut tarayıcı içi yazmasız CSV önizlemesi korunarak yetkili kullanıcılar için
ayrı `Metraj Import Merkezi` eklendi. UI; server-side upload, batch özet ve
durumu, satır/hata tablosu, event geçmişi, validate/cancel, açık onay dialog'lu
apply, geçmiş batch listesi ve oluşan metraj föyü bağlantısını tek responsive
yüzeyde toplar.

`/hakedis?import=<batch-id>` deep-link'i scoped detail action üzerinden proje
ve kaynak hakedişi çözer, ilgili projeyi/hakediş raporunu açar ve
`Aktarım / Simülasyon` sekmesini seçer. Yanlış scope veya yetkisiz kimlik kayıt
varlığını sızdırmayan mevcut güvenli hata sözleşmesinde kalır. URL'de import ve
senaryo birlikte verilirse import deep-link'i önceliklidir.

Viewer rolünde kalıcı panel, upload formu ve mutation kontrolleri DOM'a girmez;
yerel yazmasız önizleme korunur. Satır hata özeti ilgili tablo satırına bağlıdır,
durumlar yalnız renge dayanmaz, sonuç alanı `aria-live` kullanır. Apply dialog'u
ilk odağı onay düğmesine taşır; Escape/vazgeç tetikleyiciye, başarılı apply ise
oluşan föy bağlantısına odak döndürür. Upload/geçmiş/action alanları print'te
gizlenirken batch özeti ve sonuç tablosu okunabilir kalır.

4 yeni workspace testi ve bir Hakediş Pro entegrasyon testiyle hedefli paket
4 dosya/33 testtir. Tam paket 235 dosya/1.380 test, type-check, Prisma validate,
lint, güncel 45 migration, diff denetimi ve 74 sayfalık production build ile
geçti. Gerçek tarayıcıda 1440 × 900 light ile 390 × 844 light/dark kabul edildi;
mobilde `scrollWidth=clientWidth=375`, konsol error/warn `0` ve viewer kalıcı
panel/upload DOM sayıları `0/0` olarak doğrulandı.

Görsel kabul boyunca dosya gönderilmedi. Import batch/row/event sayıları
`0/0/0`, yanlış scope `0`; Faz 11 read-only mutabakatı ve kaynak kayıtlar
değişmedi. Ayrıntılı kanıt
`Docs/UI-baseline/Faz12-ui-deep-link-kabul-20260723.md` içindedir.

Sıradaki bağımsız dilim **Gerçek Veri ve Kapanış**'tır.

## 22. Dilim 5 Uygulama Kaydı — Gerçek Veri ve Kapanış

Gerçek kabul, önceki F8/F11 kaynak kayıtlarını değiştirmeden ayrı
`F12-KABUL-20260728` açık projesi ve taslak `F12-HAK-001` kaynağında
tamamlandı. Başlangıçtaki `1 m3` metraja geçerli CSV ile `2.5 m3` eklendi;
uygulama sonrası ortak snapshot yolu `3.5 m3 / 3.500 TL`, iki metraj föyü ve
iki metraj satırı üretti. Geçerli batch `CREATED → VALIDATED → APPLIED`
eventleri ve tek oluşan `IMP-0001` föyüyle kapanmıştır.

Aynı geçerli dosyanın create retry'ı ile apply retry'ı idempotent sonucu verdi;
ilave batch, event, audit, föy veya metraj satırı oluşmadı. Bilinmeyen pozlu
hatalı CSV ayrı bir `DRAFT` batch'te tek `ITEM_NOT_FOUND` satırıyla kaldı;
hedef föy ve applied-line bağı oluşmadı. İki batch için merkezi audit sayısı
dörttür: iki `CREATED`, bir `VALIDATED`, bir `APPLIED`. Audit metadata'sında
dosya adı, SHA-256 veya ham CSV bulunmadığı; yanlış firma/dönem/proje sayılarının
sıfır olduğu doğrulandı.

Tekrarlanabilir salt-okunur mutabakat komutu:

```text
npm run hakedis:import:scenario:verify
```

Kabul betiği `scripts/run-construction-measurement-import-acceptance.ts`
yalnız belirlenmiş F12 fixture'ını oluşturur/yeniden kullanır; kapanış komutu
`scripts/verify-construction-measurement-import-acceptance.ts` ise yazmaz.
Mevcut Faz 11 `npm run hakedis:scenario:verify` mutabakatı da bu işlemden
sonra yeniden başarılıdır; F8 kesinleşmiş kaynak kaydı değişmeden korunmuştur.

Gerçek UI kabulünde accounting oturumunda
`/hakedis?import=<valid-batch-id>` doğrudan F12 projesini, `F12-HAK-001`
raporunu ve `Aktarım / Simülasyon` sekmesini açtı. Uygulanmış batch, hata
batch'i, `IMP-0001` föy bağlantısı, `3.500 TL` toplamı ve satır geçmişi
görüldü. 1440 × 900 light/dark ile 390 × 844 light/dark görünümünde yatay
taşma yoktur; mobilde `scrollWidth=clientWidth`, konsol error/warn `0`'dır.
Upload/geçmiş/action alanlarının üç `print:hidden` sınırı gerçek yüzeyde
bulunur; sonuç özeti ve satır tablosu print dışında kalmaz. Hata/satır,
durum/açıklama, heading/table/region ve odaklanabilir bağlantılar erişilebilir
semantik yüzeyde mevcuttur.

Detaylı kanıt `Docs/UI-baseline/Faz12-gercek-veri-kapanis-20260728.md`
içindedir. Faz 12 / RFC-F12-01 ve F2-04 kapanmıştır.
