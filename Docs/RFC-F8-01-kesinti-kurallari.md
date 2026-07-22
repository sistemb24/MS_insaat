# RFC-F8-01 — Hakediş Kesinti Kuralları ve Otomatik Uygulama

> Tarih: 22.07.2026
> Durum: Onaylandı — Dilim 2 Şema ve Repository tamamlandı
> Sınıf: F2 — yeni kalıcı veri modeli ve iş kuralı
> Kaynak şablon: `stitch_HTML_sablonlar/hakedi_pro_kesinti_hesaplama_kurallar.html`

## 1. Karar özeti

Hakediş kesintileri için proje kapsamlı, revizyonlu bir kural modeli ve her
hakedişte kullanılan değerleri donduran ayrı bir uygulama snapshot modeli
önerilir. Mevcut manuel `ConstructionDeductionMovement` kayıtları korunur;
kural sonucu da bu hareket modeline bağlanarak mevcut özet, rapor ve
muhasebeleştirme zincirine katılır.

İlk migration mevcut `ConstructionProject.retentionRate` alanını silmez ve
kesinleşmiş hakedişleri yeniden hesaplamaz. Teminat kuralına geçiş yalnız taslak
veya iade edilmiş hakedişte, tek transaction içinde ve çift sayımı engelleyen
bir cutover ile yapılır.

## 2. Kullanıcı hikâyeleri

- Proje yöneticisi veya admin; teminat, avans, stopaj ya da maktu ceza gibi
  kesinti kurallarını proje bazında tanımlayabilmelidir.
- Muhasebe kullanıcısı, taslak hakedişte uygulanacak kuralları ve hesaplama
  matrahlarını kaydetmeden önce görebilmelidir.
- Yetkili kullanıcı kuralları bir kez uyguladığında aynı isteğin tekrarı ikinci
  bir kesinti oluşturmamalıdır.
- Kural sonradan değişse bile gönderilmiş, onaylanmış veya kesinleşmiş
  hakedişin hesaplama dayanağı değişmemelidir.
- Manuel belge kesintileri ile kural kaynaklı kesintiler aynı raporda görünmeli,
  ancak birbirine dönüşmemelidir.

## 3. Mevcut altyapı ve neden yetmediği

| Mevcut yapı | Sağladığı davranış | Eksik kalan |
|---|---|---|
| `ConstructionDeductionMovement` | Hakedişe bağlanan gerçekleşmiş matrah, KDV ve toplam hareketi | Tekrar kullanılabilir formül, oran, matrah, sıra ve revizyon yok |
| `ConstructionFinancialMovement` | İlave/kesinti yönlü finansal hareket | Kural veya hesaplama snapshot'ı değil |
| `ConstructionProject.retentionRate` | Net + ilave tabanı üzerinden tek otomatik teminat kesintisi | Tek oranla sınırlı; revizyon, tarih, tavan/taban ve kaynak izi yok |
| `calculateConstructionSupplementarySummary` | Manuel ve otomatik kesintileri toplam ödenecek tutara katar | Birden çok sıralı kuralı değerlendirmez |
| Hakediş durum zinciri | Yalnız `DRAFT` ve `RETURNED` ayrıntı mutasyonuna izin verir | Kural önizleme/uygulama sözleşmesi yok |
| `AuditLog` | Tenant/firma/dönem kapsamlı merkezi iz | Kural yönetimi ve uygulama aksiyonları henüz yazılmıyor |

Sonuç: mevcut hareket modeline yalnız yeni alanlar eklemek, kural tanımı ile
gerçekleşmiş finansal hareketi aynı yaşam döngüsüne sıkıştıracağı için uygun
değildir.

## 4. Önerilen veri modeli

### 4.1 `ConstructionDeductionRule`

Her satır değiştirilebilir tek kayıt değil, belirli bir kuralın revizyonudur.

| Alan | Tip | Karar |
|---|---|---|
| `id` | `String @id @default(cuid())` | Revizyon kimliği |
| `tenantId`, `companyId`, `periodId` | `String` | Zorunlu aktif kapsam |
| `projectId` | `String` | İlk sürümde kural kapsamı proje/sözleşmedir |
| `ruleKey` | `String` | Revizyonlar arasında değişmeyen mantıksal kimlik |
| `code` | `String` | Proje içinde kullanıcıya görünen benzersiz kod |
| `name`, `category`, `description` | `String` | Görünür kural bilgisi |
| `revisionNo` | `Int` | 1'den başlayan artan revizyon |
| `calculationType` | `String` | `RATE` veya `FIXED` |
| `baseType` | `String?` | Oransal kurallarda hesap tabanı |
| `rate` | `Decimal(9,4)?` | Oran; `0–100` |
| `fixedAmount` | `Decimal(18,2)?` | Maktu kural tutarı |
| `minimumAmount`, `maximumAmount` | `Decimal(18,2)?` | İsteğe bağlı alt/üst sınır |
| `taxMode` | `String` | İlk sürüm: `NONE` veya `VAT_ADD` |
| `taxRate` | `Decimal(5,2)` | `VAT_ADD` için `0–100` |
| `priority` | `Int` | Küçük değer önce uygulanır |
| `effectiveFrom`, `effectiveTo` | `DateTime`, `DateTime?` | Hakediş dönem sonuna göre geçerlilik |
| `isActive`, `autoApply` | `Boolean` | Kullanılabilirlik ve otomatik uygulama tercihi |
| `supersedesRuleId` | `String?` | Önceki revizyona izlenebilir bağlantı |
| `createdBy`, `createdAt` | standart | Revizyonlar fiziksel olarak güncellenmez |

Önerilen kısıtlar:

- `@@unique([projectId, ruleKey, revisionNo])`
- `@@unique([projectId, code, revisionNo])`
- `@@index([tenantId, companyId, periodId, projectId, isActive])`
- `@@index([projectId, effectiveFrom, effectiveTo])`

Bir kural değiştirilirken mevcut satır güncellenmez; yeni `revisionNo`
oluşturulur ve önceki revizyon pasif hale getirilir. Kullanılmış revizyonlar
silinmez.

### 4.2 `ConstructionDeductionRuleApplication`

Hakedişte gerçekten kullanılan hesaplama değerlerini dondurur ve kural
revizyonu ile finansal hareket arasındaki köprüdür.

| Alan | Tip | Karar |
|---|---|---|
| scope alanları | `String` | Tenant/firma/dönem izolasyonu |
| `progressPaymentId` | `String` | Uygulanan hakediş |
| `deductionRuleId` | `String` | Kullanılan kesin revizyon |
| `deductionMovementId` | `String @unique` | Üretilen mevcut kesinti hareketi |
| `ruleKey`, `ruleCode`, `ruleName`, `ruleRevisionNo` | snapshot | Sonradan değişmeyen görünür kaynak |
| `calculationType`, `baseType` | snapshot | Formül sözleşmesi |
| `baseAmount`, `rate`, `fixedAmount` | snapshot | Hesap girdileri |
| `minimumAmount`, `maximumAmount` | snapshot | Uygulanan sınırlar |
| `taxMode`, `taxRate`, `taxAmount` | snapshot | Vergi etkisi |
| `netAmount`, `totalAmount` | `Decimal(18,2)` | Sonuç |
| `applicationKey` | `String @unique` | Tekrarlanabilir isteğin sabit anahtarı |
| `appliedBy`, `appliedAt`, `updatedAt` | standart | Uygulama izi |

Ek kısıt:

- `@@unique([progressPaymentId, ruleKey])`
- `@@index([tenantId, companyId, periodId, progressPaymentId])`

Bu unique yapı sayesinde bir kural aynı hakedişte ikinci kez hareket üretmez.
Taslakta açıkça yeniden hesaplama istendiğinde aynı application ve bağlı
hareket transaction içinde güncellenir; önce/sonra değerleri `AuditLog`
metadata'sında tutulur.

## 5. Hesaplama sözleşmesi

İlk sürümde desteklenen tabanlar:

| `baseType` | Formül |
|---|---|
| `PERIOD_NET` | Hakediş `periodNetTotal` |
| `PERIOD_NET_PLUS_EXTRAS` | Net + tutanaklı işler + ilave hareketler |
| `PAYABLE_BEFORE_RULE` | Bir önceki önceliğe kadar kalan dönem ödenecek tutar |

`CONTRACT_AMOUNT` ve `LABOR_AMOUNT` ilk sürüme alınmaz. Sözleşme toplamının her
hakedişte tekrar kesilmesi finansal hata riski taşır; Hakediş Pro tarafında
güvenilir, aynı kapsamda bir işçilik matrahı henüz yoktur.

Hesap sırası:

1. Geçerli kurallar `priority`, `code` ile deterministik sıralanır.
2. `RATE`: `raw = baseAmount × rate / 100`; `FIXED`: `raw = fixedAmount`.
3. Alt/üst sınırlar uygulanır.
4. Her ara değer mevcut `roundMoney` ile iki haneye yuvarlanır.
5. `VAT_ADD` ise `taxAmount = netAmount × taxRate / 100` hesaplanır.
6. `totalAmount = netAmount + taxAmount` olarak mevcut harekete yazılır.
7. Toplam kesinti ödenecek tutarı negatife indiriyorsa uygulama sessizce
   kırpılmaz; tüm transaction reddedilir ve önizlemede hata gösterilir.

Negatif oran/tutar, yüzde 100'ü aşan oran, minimumun maksimumdan büyük olması,
oransal kuralda eksik taban/oran ve maktu kuralda eksik tutar reddedilir.

## 6. Mevcut teminat oranıyla geçiş

`ConstructionProject.retentionRate` ilk migration'da korunur.

1. Oranı sıfırdan büyük projeler için `TEMINAT` kodlu, `RATE`,
   `PERIOD_NET_PLUS_EXTRAS` tabanlı ve `autoApply=false` bir revizyon backfill
   edilir.
2. Migration mevcut hakediş toplamlarını ve kesinleşmiş kayıtları değiştirmez.
3. Taslak/iade hakedişte kullanıcı ilk kez kuralı uyguladığında aynı
   transaction içinde teminat application/hareketi oluşturulur ve özet
   hesabındaki legacy `automaticDeductionAmount` yalnız bu hakediş için `0`
   kabul edilir. Böylece teminat iki kez sayılmaz.
4. Henüz application bulunmayan hakedişler legacy `retentionRate` hesabını
   kullanmaya devam eder.
5. `retentionRate` alanının kaldırılması ayrı, sonraki bir migration kararıdır;
   bu RFC kapsamında silinmez.

## 7. Yaşam döngüsü ve değişmezlik

- Kural tanımı yalnız açık proje ve açık dönemde oluşturulur/revize edilir.
- Önizleme salt okunurdur ve hakediş toplamını değiştirmez.
- Uygulama/yeniden hesaplama yalnız `DRAFT` veya `RETURNED` hakedişte yapılır.
- `SUBMITTED`, `APPROVED` ve `FINALIZED` hakedişlerde application snapshot ve
  hareket salt okunurdur.
- Kural revizyonu eski application'ları geriye dönük değiştirmez.
- Manuel kesinti hareketi kural application'ına dönüştürülmez.
- Kural silme yerine pasifleştirme kullanılır; kullanılmış revizyon fiziksel
  olarak silinmez.

## 8. RBAC, scope, audit ve idempotency

### RBAC

- `admin`: kural oluşturma, revize etme, pasifleştirme ve otomatik uygulama
  ayarını değiştirme.
- `admin` ve `accounting`: önizleme, taslak hakedişe uygulama ve açıkça yeniden
  hesaplama.
- `viewer`: yalnız kural, formül ve uygulama snapshot'ını okuma.

Tüm sorgu ve mutation'lar `tenantId + companyId + periodId + projectId`
kapsamını doğrular. `scope.periodClosed` ise tüm kural ve application
mutation'ları reddedilir.

### Audit aksiyonları

- `construction-deduction-rule.created`
- `construction-deduction-rule.revised`
- `construction-deduction-rule.deactivated`
- `construction-deduction-rule.auto-apply-changed`
- `construction-deduction-rule.previewed` yalnız başarısız/uyuşmaz önizlemede
- `construction-deduction-rule.applied`
- `construction-deduction-rule.recalculated`

Audit metadata; proje, hakediş, kural/revizyon, matrah, oran/maktu tutar,
önceki/yeni sonuç ve `applicationKey` değerlerini içerir.

### Idempotency

`applicationKey` şu mantıksal bileşenlerden deterministik üretilir:

`tenant + company + period + progressPaymentId + ruleKey`

Application, bağlı hareket, hakediş özeti ve audit aynı DB transaction'ında
yazılır. Aynı istek tekrarlandığında yeni hareket oluşturulmaz. `Tümünü
uygula` akışı tüm kuralları tek transaction'da ya tamamlar ya hiç yazmaz.

## 9. UI kapsamı

Hakediş Pro içindeki Kesintiler sekmesi genişletilir:

- Proje kuralları: kod, ad, hesap tipi, taban, oran/maktu tutar, geçerlilik,
  sıra ve aktif/otomatik durumu.
- Admin için yeni kural ve revizyon paneli.
- Muhasebe için `Kuralları önizle` ve `Kuralları uygula` aksiyonları.
- Önizlemede matrah, formül, vergi, sınır, sonuç ve hata/uyarı satırları.
- Uygulanan hareketlerde `Manuel` veya `Kural · REV-n` kaynak rozeti.
- Kilitli hakedişte yalnız snapshot ve hesap izi.

Şablondaki `SSK / işçilik oranı`, güvenilir işçilik matrahı eklenene kadar
çalışıyor gibi gösterilmez. Gerçek dış mevzuat oranı seed edilmez; yalnız mevcut
projenin `retentionRate` değeri teminat kuralına taşınır.

## 10. Migration, backfill ve rollback

### Migration

1. İki yeni tablo, ilişkiler, unique ve scope indexleri eklenir.
2. `ConstructionDeductionMovement` şeması bozulmaz; application'dan 1:1 ilişki
   kurulur.
3. Oranı pozitif projelere pasif-otomatik `TEMINAT` revizyonu idempotent SQL ile
   eklenir.
4. Kesinleşmiş hakedişe application veya hareket backfill edilmez.

Nullable alanlara zorunlu backfill yapılmadan `NOT NULL` geçişi uygulanmaz.
Seed/demo için yalnız mevcut retention değerlerinden deterministik kural
üretilir.

### Rollback

- Kod rollback'inde application bulunmayan hakedişler legacy retention hesabına
  devam eder.
- Taslak application/hareketler açıkça geri alma transaction'ıyla kaldırılıp
  özet legacy hesaba döndürülebilir.
- Gönderilmiş/onaylanmış/kesinleşmiş application snapshot'ları silinmez.
- İlk sürümde `retentionRate` korunacağı için geri dönüş veri kaybı üretmez.

## 11. Uygulama dilimleri

1. **Domain çekirdeği:** saf doğrulama, sıralama ve hesaplama servisi; tablo yok.
2. **Şema ve repository:** migration, retention backfill, scoped repository.
3. **Önizleme ve uygulama:** RBAC, açık dönem/durum guard'ları, transaction,
   idempotency ve audit.
4. **Hakediş Pro UI:** kural yönetimi, önizleme, uygulama ve snapshot görünümü.
5. **Görsel/doğrulama:** gerçek demo taslağı, responsive baseline ve tam kalite
   kapıları.

Her dilim ayrı hedefli testten sonra ilerler; şema diliminden itibaren
`npm test`, `npm run type-check`, `npm run db:validate`, `npm run lint` ve
`npm run build` zorunludur.

## 12. Zorunlu test matrisi

- `RATE` ve `FIXED` formülleri, yuvarlama, min/max ve vergi.
- Öncelik ve `PAYABLE_BEFORE_RULE` sıralaması.
- Negatif ödenecek, geçersiz tarih/oran/tutar ve çakışan revizyon reddi.
- Tenant/firma/dönem/proje scope sızıntısı yokluğu.
- Viewer reddi; admin yönetimi; accounting önizleme/uygulama yetkisi.
- Kapalı dönem ve kilitli hakedişte mutation reddi.
- Aynı uygulamanın tekrarında hareket/audit çoğalmaması.
- Transaction hatasında application, hareket ve özet için tam rollback.
- Legacy teminat ile kural teminatının hiçbir aşamada çift sayılmaması.
- Kural revizyonunun eski kesinleşmiş snapshot'ı değiştirmemesi.
- Manuel kesintilerin aynen korunması.
- Finalization/projection/ledger toplamlarının kural hareketini bir kez içermesi.

## 13. Kapsam dışı

- Mevzuat oranlarını otomatik güncelleyen dış servis.
- SSK/işçilik tabanı için yeni bordro–hakediş entegrasyonu.
- Kuralın birden fazla projeye merkezi şablon olarak dağıtılması.
- Çok para birimli kural dönüşümü.
- Kesinti iadesi/çözülmesi için ayrı finansal yaşam döngüsü.
- Kesinleşmiş hakedişlerin toplu geriye dönük yeniden hesaplanması.

Bu ihtiyaçlar ayrıca kanıtlanırsa yeni F2 mini-RFC ister.

## 14. Onay paketi

Önerilen varsayımlar:

1. İlk kapsam proje/sözleşme bazlıdır; global kural şablonu yoktur.
2. Kural revizyonları append-only tutulur.
3. Gerçekleşen hesap ayrı application snapshot'ında saklanır.
4. İlk tabanlar `PERIOD_NET`, `PERIOD_NET_PLUS_EXTRAS` ve
   `PAYABLE_BEFORE_RULE` ile sınırlıdır.
5. İlk vergi davranışı yalnız `NONE` ve `VAT_ADD` olur.
6. Negatif ödenecek sessizce kırpılmaz; işlem reddedilir.
7. Kural yönetimi admin, uygulama admin/accounting yetkisindedir.
8. Legacy `retentionRate` ilk migration'da korunur ve çift sayım engellenir.
9. Kesinleşmiş hakedişler backfill/recalculation görmez.
10. Uygulama beş küçük dikey dilimde yürütülür.

Bu on varsayım açıkça onaylanmadan Prisma şeması ve uygulama kodu
değiştirilmeyecektir.

## 15. Onay ve uygulama kaydı

Kullanıcı 22.07.2026 tarihinde on varsayımın tamamını onayladı ve Domain
Çekirdeği diliminin başlatılmasını istedi.

### Dilim 1 — Domain Çekirdeği: Tamamlandı

`src/lib/construction-deduction-rule-service.ts` ile aşağıdaki saf, kalıcı veri
bağımsız sözleşmeler eklendi:

- `RATE` ve `FIXED` kural doğrulaması.
- `PERIOD_NET`, `PERIOD_NET_PLUS_EXTRAS` ve `PAYABLE_BEFORE_RULE` matrahları.
- Öncelik + kod sıralaması, geçerlilik tarihi ve aktif revizyon seçimi.
- İki haneli para yuvarlama, alt/üst sınır, `NONE`/`VAT_ADD` vergi hesabı.
- Çakışan/tekrarlanan revizyon, hatalı formül ve negatif girdi reddi.
- Negatif ödenecek üreten kuralda tüm değerlendirmeyi reddetme.
- Tenant/firma/dönem/hakediş/kural bileşenli deterministik application key.

Yeni domain test dosyasındaki 10 test ve mevcut hakediş hesap testleriyle
hedefli paket 2 dosya/22 test olarak geçti. Tam paket 217 dosya/1.206 test,
Prisma validate, type-check, lint, diff denetimi ve 74 sayfalık production build
hatasız tamamlandı. Bu dilimde Prisma, migration, action, UI ve uygulama verisi
değiştirilmedi.

Dilim 1 kapanışında planlanan sonraki çalışma **Şema ve Repository** olarak
kaydedildi; aşağıdaki Dilim 2 kaydıyla tamamlandı.

### Dilim 2 — Şema ve Repository: Tamamlandı

Prisma şemasına revizyonlu `ConstructionDeductionRule` ve gerçekleşen hesap
değerlerini donduracak `ConstructionDeductionRuleApplication` modelleri;
tenant/firma/dönem, proje, hakediş, kural, kesinti hareketi ve self-revision
ilişkileriyle eklendi. RFC'deki unique ve scope indexleri uygulandı.

`20260722113000_add_construction_deduction_rules` migration'ı yerel PostgreSQL
veritabanına başarıyla uygulandı. Migration öncesi ve sonrası kontrolünde:

- Pozitif retention oranlı proje: `1`
- Kümülatif hakediş: `5 → 5`
- Manuel kesinti hareketi: `0 → 0`
- Backfill edilen `TEMINAT` kuralı: `0 → 1`
- Kural application kaydı: `0 → 0`

Backfill edilen kural `RATE`, `PERIOD_NET_PLUS_EXTRAS`, `%5`, aktif ve
`autoApply=false` durumundadır. Dolayısıyla migration hakediş toplamı veya
finansal hareket üretmemiştir. `retentionRate` alanı korunmuştur.

`construction-deduction-rule-prisma-repository.ts`; proje kural listesi,
hakediş dönem sonunda geçerli aktif kurallar, application listesi/anahtar
araması, revizyon oluşturma ve kapsamlı pasifleştirme sözleşmelerini sağlar.
Tüm repository sorguları `tenantId + companyId + periodId` ile sınırlandırılır.

Hedefli paket 3 dosya/27 test; tam paket 218 dosya/1.211 test, Prisma Client
generate, schema validate, migration deploy/status, type-check, lint, diff
denetimi ve 74 sayfalık production build ile doğrulandı.

Sıradaki uygulama dilimi: **Önizleme ve Uygulama** — RBAC/açık dönem/hakediş
durumu guard'ları, transaction, idempotent application + hareket yazımı,
legacy teminat cutover'ı ve merkezi audit. UI bu sonraki dilimde de açılmaz.

### Dilim 3 — Önizleme ve Uygulama: Tamamlandı

Salt-okunur önizleme ile atomik uygulama akışları ayrı server action'lar olarak
açıldı. Her iki akış da `progress-payments` paket guard'ını, admin/accounting
RBAC'ini ve tenant/firma/dönem kapsamını kullanır; uygulama ayrıca veritabanından
açık dönem doğrulaması yapar. Yalnız `DRAFT` ve `RETURNED` hakedişler
değerlendirilebilir.

Uygulama; geçerli proje kurallarını aynı Prisma transaction'ında değerlendirir,
`ConstructionDeductionMovement` ve değişmez application snapshot'ını birlikte
yazar, özet toplamlarını yeniler ve merkezi `applied`/`recalculated` audit izi
üretir. Deterministik application key ve mevcut snapshot karşılaştırması aynı
isteğin tekrarında yeni hareket, application veya audit oluşmasını engeller.
Artık geçerli olmayan mevcut application sessizce silinmez; ilerideki ters kayıt
yaşam döngüsüne bırakılarak işlem kontrollü biçimde reddedilir.

İlk `TEMINAT` application kaydı oluştuğu anda legacy `retentionRate` otomatik
kesintisi sıfırlanır; kuralın ürettiği kesinti hareketi tek kaynak olur. Taslak
metraj ve ayrıntı yeniden hesaplama yolları da bu cutover guard'ını kullanır;
manuel kesintiler korunur. UI bu dilimde açılmadı.

Hedefli paket 5 dosya/35 test; tam paket 220 dosya/1.219 test, type-check,
Prisma validate, lint, diff denetimi ve 74 sayfalık production build ile
doğrulandı. İlk tam paket koşusundaki bağımsız UI zamanlama testi tekil koşuda
13/13 geçti; tam paket tekrarı 1.219/1.219 tamamlandı.

Sıradaki uygulama dilimi: **Hakediş Pro UI** — kural yönetimi, hakediş bazlı
önizleme/uygulama kontrolü ve application snapshot görünümü.

### Dilim 4 — Hakediş Pro UI: Tamamlandı

`/hakedis` içindeki proje çalışma kartına gerçek `ConstructionDeductionRule`
verisini kullanan Kesinti Kuralları paneli eklendi. Panel:

- Kural kodu, ad, kategori, formül, taban, alt/üst sınır, vergi, öncelik ve
  geçerlilik tarihini gösterir.
- Yalnız admin rolünde yeni kural, append-only revizyon ve pasifleştirme
  işlemlerini açar.
- Revizyonda önceki kaydı silmez; önceki geçerlilik aralığını yeni başlangıçtan
  hemen önce kapatır ve yeni revision + merkezi audit kaydını aynı transaction'da
  üretir.
- Accounting/viewer rollerinde yönetim alanını salt okunur tutar. `autoApply`
  davranışı açılmadığı için arayüz açıkça “manuel uygulama” etiketi taşır.

Hakedişin Kesintiler sekmesinde salt-okunur kural önizlemesi, toplam karşılaştırma
metrikleri ve atomik uygulama kontrolü açıldı. Uygulanmış application kayıtları;
kural/revizyon, matrah, formül, vergi, net/toplam, uygulayan kullanıcı ve tarih
bilgileriyle tarihsel snapshot tablosunda gösterilir. Kural kaynaklı kesinti
hareketi manuel hareketten ayrılır; UI silme düğmesi göstermez ve doğrudan server
action çağrısı da bu hareketi ters kayıt yaşam döngüsü olmadan silemez.

Hedefli paket 4 dosya/15 test; tam paket 221 dosya/1.224 test, type-check,
Prisma validate, lint, diff denetimi ve 74 sayfalık production build ile
doğrulandı. Yerel gerçek veri üzerinde muhasebe rolüyle masaüstü ve 390 px mobil
tarayıcı kontrolü yapıldı; sayfa yatay taşma üretmedi, yönetim yetkisi doğru
biçimde salt okunur kaldı. Test sunucusu doğrulama sonrası kapatıldı; gerçek demo
verisine yeni kural/application yazılmadı.

Sıradaki uygulama dilimi: **Görsel ve Gerçek Veri Kabulü** — admin rolüyle
kontrollü demo taslağında kural/revizyon/önizleme/uygulama akışının uçtan uca
kanıtlanması, snapshot/finalization toplam mutabakatı ve responsive baseline.

### Dilim 5 — Görsel ve Gerçek Veri Kabulü: Tamamlandı

DEMO İNŞAAT kapsamında yalnız bu kabul için ayrılan `F8-KABUL-20260722`
projesi, `F8-POZ-01` sözleşme pozu ve `F8-HAK-001` ilk hakedişi native
`/hakedis` arayüzünden gerçek PostgreSQL verisine oluşturuldu. Mevcut E2E ve
legacy kayıtları değiştirilmedi veya silinmedi.

Yönetici rolü `F8-TEM` teminat kuralının 01.07.2026 başlangıçlı `%5` R1
revizyonunu ve 01.08.2026 başlangıçlı `%6` R2 revizyonunu append-only olarak
oluşturdu; R1 geçerliliği 31.07.2026 sonunda tarihsel olarak kapandı. Aynı
projede 01.07.2026 başlangıçlı `F8-DAMGA` R1 maktu 250 TL kuralı da tanımlandı.
31.07.2026 dönem sonlu hakediş önizlemesi güncel R2 yerine tarihte geçerli R1'i
seçti: 100.000 TL matrah üzerinden 5.000 TL teminat ve 250 TL maktu kesinti,
toplam 5.250 TL; kural sonrası ödenecek 94.750 TL olarak mutabık kaldı.

İlk uygulama iki application snapshot'ı, iki bağlı kesinti hareketi ve iki
`construction-deduction-rule.applied` audit kaydı üretti. Yönetici ve muhasebe
rollerinden yapılan tekrar uygulamaları yeni kayıt veya audit üretmedi;
application snapshot'larında ilk uygulayan `user-ahmet` ve R1 tarihsel tanımı
değişmeden korundu. Muhasebe rolünde kural yönetim formu açılmadı, buna karşın
önizleme/uygulama ve gönderme yetkileri çalıştı; onay ve kesinleştirme arayüzü
yönetici rolünde tamamlandı.

Kesinleşen construction toplamları 100.000 TL brüt, 5.250 TL kesinti ve
94.750 TL ödenebilir tutardır. Finansal projection 100.000 TL brüt, 5.250 TL
kesinti, 94.750 TL net, 18.950 TL KDV ve 113.700 TL genel toplam üretti.
`YVM-HAK-F8-HAK-001` fişi `740=94.750` ve `191=18.950` borç ile
`320=113.700` alacak toplamında dengelidir. Finalization retry `created=false`
döndürdü; finansal hakediş, ledger fişi, accounting link ve finalized audit
sayaçları `1/1/1/1` kaldı.

Masaüstü ve 390 × 844 px mobil görünümde proje kartı, kesinti sekmesi, kilitli
snapshot ve kesinleşmiş durum tarayıcıdan doğrulandı. Mobil görünüm kart ve
sekme düzenine indi; yatay taşma veya kırpılmış ana kontrol görülmedi. Böylece
RFC-F8-01'in planlanan beş uygulama dilimi gerçek veri kabulüyle tamamlandı.
Hedefli F8 paketi 5 dosya/29 test; tam paket 221 dosya/1.224 test, type-check,
Prisma validate, lint, diff denetimi ve 74 sayfalık production build ile geçti.
