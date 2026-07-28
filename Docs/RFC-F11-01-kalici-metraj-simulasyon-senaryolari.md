# RFC-F11-01 — Kalıcı Metraj Simülasyon Senaryoları

> Tarih: 23.07.2026
> Durum: Tamamlandı — Dilim 1–5 kapandı
> Sınıf: F2-03 — kalıcı simülasyon senaryosu ve geçmişi
> Önerilen faz: Faz 11
> Önceki kapı: RFC-F10-01 / F2-01 / Faz 10 tamamlandı

## 1. Karar Özeti

Hakediş Pro içindeki poz bazlı metraj simülasyonu bugün tarayıcıda salt-okunur
hesaplanır ve sayfa kapandığında kaybolur. Faz 11 için; bu hesabın gerçek
hakediş, metraj föyü, ledger veya sözleşme kaydına dönüşmeden kaydedilebildiği,
append-only revizyonlarla karşılaştırılabildiği ve iç onay/arşiv yaşam döngüsü
taşıdığı proje kapsamlı bir senaryo modeli önerilir.

Bu RFC ihale BOQ kârlılık hesabını kapsamaz. İhale BOQ satırları zaten `Tender`
ve `TenderBoqLine` üzerinde gerçek iş kaydı olarak kalıcıdır; iki farklı domain
tek polymorphic senaryo tablosuna sıkıştırılmayacaktır.

## 2. Problem ve Hedef

Mevcut `ImportSimulationWorkspace` şu değerleri anlık hesaplar:

- seçilen sözleşme pozu,
- önerilen doğrudan veya ölçü türevi miktar,
- mevcut ve yeni kümülatif miktar,
- kalan/aşılan sözleşme miktarı,
- snapshot birim fiyatıyla tahmini dönem tutarı.

Bu sonuç hiçbir kayıt veya audit üretmez. Kullanıcı iki alternatifi daha sonra
karşılaştıramaz, ekip içinde aynı senaryoya geri dönemez ve hangi sözleşme/
hakediş snapshot'ıyla hesaplandığını kanıtlayamaz.

Hedef; hesap sonucunu gerçekleşmiş imalat gibi göstermeden:

1. senaryo taslağı kaydetmek,
2. her değişikliği yeni revizyon olarak saklamak,
3. iki revizyonu poz ve toplam bazında karşılaştırmak,
4. yönetici onayıyla değişmez bir referans oluşturmak,
5. eski senaryoyu silmeden arşivlemek,
6. tüm yazmaları merkezi audit'e bağlamaktır.

## 3. Kapsam ve Kapsam Dışı

### Kapsam

- `/hakedis` içindeki poz bazlı metraj simülasyonu.
- Aktif tenant + firma + dönem + Hakediş Pro proje kapsamı.
- Mevcut `ConstructionProject`, `ConstructionContractItem` ve seçili
  `ConstructionProgressPayment` read-model'inden snapshot alma.
- Taslak, onaylı ve arşiv durumları.
- Append-only revizyon, iç karşılaştırma ve audit.
- Masaüstü/mobil, light/dark ve print uyumlu senaryo UI'sı.

### Kapsam dışı

- İhale BOQ senaryoları.
- Simülasyonu otomatik metraj föyüne, hakedişe veya ledgera aktarma.
- Gerçekleşmiş miktarları ya da sözleşme pozlarını güncelleme.
- Dış kullanıcıya açık token/link paylaşımı.
- Yorum, mention, e-posta veya bildirim otomasyonu.
- Genel amaçlı formül dili, serbest JSON hesap motoru veya Excel makrosu.
- CSV/XLSX import staging; bu F2-04 kapısında kalır.

## 4. Önerilen Domain Sözleşmesi

### Durumlar

| Durum | Anlam | İzin verilen sonraki adım |
|---|---|---|
| `DRAFT` | Üzerinde yeni revizyon üretilebilir | `APPROVED`, `ARCHIVED` |
| `APPROVED` | Seçili revizyon değişmez iç referanstır | `ARCHIVED`; değişiklik için klon |
| `ARCHIVED` | Salt-okunur tarihçe | Yok |

Onaylı veya arşivlenmiş senaryo yerinde güncellenmez. Yeni alternatif,
senaryonun mevcut revizyonundan yeni `DRAFT` klon üretilerek başlatılır.

### Hesap kuralları

- Hesap mevcut poz bazlı simülasyonla aynı saf çekirdeği kullanır.
- Önerilen miktar doğrudan miktar veya `boy × en × yükseklik × çarpan`
  biçimindedir; ikisi aynı satırda birlikte kullanılmaz.
- Miktar 4, para 2 ondalıkla normalize edilir.
- Negatif/sıfır miktar, scope dışı/pasif poz ve para birimi uyuşmazlığı
  reddedilir.
- Sözleşme aşımı senaryoyu kaydetmeyi engellemez; satır ve toplamda açık risk
  olarak işaretlenir.
- Kaynak hakediş veya sözleşme daha sonra değişse bile eski revizyon yeniden
  hesaplanmaz; snapshot tarihsel doğruluk kaynağıdır.

## 5. Önerilen Veri Modeli

### `ConstructionSimulationScenario`

- `id`
- `tenantId`, `companyId`, `periodId`
- `projectId`
- `sourceProgressPaymentId`
- `scenarioNo` — proje içinde deterministik/benzersiz
- `name` — en fazla 120 karakter
- `description` — opsiyonel, en fazla 500 karakter
- `status` — `DRAFT | APPROVED | ARCHIVED`
- `currentRevisionNo`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- `approvedBy`, `approvedAt`
- `archivedBy`, `archivedAt`

Önerilen benzersizlik:

`@@unique([projectId, scenarioNo])`

Önerilen scope indeksi:

`@@index([tenantId, companyId, periodId, projectId, status])`

### `ConstructionSimulationRevision`

- `id`, `scenarioId`, `revisionNo`
- `revisionNote`
- `sourceProgressPaymentUpdatedAt`
- `sourceSnapshotAt`
- `lineCount`, `proposedQuantityTotal`, `projectedAmountTotal`
- `overrunLineCount`
- `inputHash` — idempotency/tutarlılık; kullanıcı verisi içermez
- `createdBy`, `createdAt`

Revizyon update/delete edilmez:

`@@unique([scenarioId, revisionNo])`

### `ConstructionSimulationLine`

- `id`, `revisionId`, `lineNo`
- `contractItemId`
- snapshot: `itemCode`, `description`, `unit`, `contractItemRevisionNo`
- snapshot: `currentCumulative`, `contractQuantity`, `unitPrice`
- giriş: `directQuantity`, `length`, `width`, `height`, `multiplier`
- sonuç: `proposedQuantity`, `projectedCumulative`, `projectedRemaining`,
  `projectedAmount`, `isOverrun`

Satırlar normalize kolonlarda tutulur; keyfi JSON payload kullanılmaz.

## 6. Yaşam Döngüsü ve Tutarlılık

1. Kullanıcı proje/hakediş içinde pozları ve miktarları seçer.
2. Sunucu aktif scope'u yeniden doğrular ve bütün pozları aynı proje kapsamında
   tekrar okur.
3. Aynı saf hesap çekirdeğiyle sonuç yeniden üretilir; istemcinin gönderdiği
   toplamlar güvenilmez.
4. Yeni senaryoda scenario + R1 + satırlar tek transaction'da yazılır.
5. Taslak değişikliği R2/R3 olarak append-only eklenir ve
   `currentRevisionNo` optimistic concurrency ile ilerler.
6. Onay, mevcut revizyonu ve kaynak snapshot zamanını kilitler.
7. Kaynak veri değişmişse UI `Kaynak değişti` uyarısı gösterir; eski sonuç
   değiştirilmez, kullanıcı yeni revizyon/klon hesaplar.
8. Silme yoktur; taslak veya onaylı senaryo arşivlenir.

Her revizyon en fazla 500 satır taşır. Aynı `inputHash` ile tekrar gönderim yeni
revizyon üretmeden mevcut sonucu döndürür.

## 7. RBAC, Abonelik ve Dönem Kuralları

| İşlem | Admin | Accounting | Viewer |
|---|---:|---:|---:|
| Onaylı senaryoyu görüntüle/karşılaştır | Evet | Evet | Evet |
| Taslakları görüntüle | Evet | Evet | Hayır |
| Yeni taslak/revizyon/klon | Evet | Evet | Hayır |
| Onayla | Evet | Hayır | Hayır |
| Arşivle | Evet | Hayır | Hayır |

- Tüm server action'lar scope'u aktif session'dan alır; raw tenant/firma/dönem
  kabul etmez.
- `projectId`, `progressPaymentId` ve `contractItemId` aynı scope/proje altında
  sunucuda doğrulanır.
- `/hakedis` abonelik guard'ı fail-closed korunur; kapalı planda repository
  okunmaz/yazılmaz.
- Kapalı dönem yeni taslak, revizyon, klon, onay ve arşivi reddeder; mevcut
  onaylı senaryolar salt-okunur görüntülenebilir.
- Viewer mutation yetkisi kazanmaz.

## 8. Audit ve Gizlilik

Mevcut `AuditLog` kullanılır; yeni audit tablosu açılmaz.

| Action | Asgari metadata |
|---|---|
| `construction-simulation.create` | scenarioNo, projectId, revisionNo, lineCount |
| `construction-simulation.revise` | scenarioNo, from/to revision, inputHash |
| `construction-simulation.clone` | sourceScenarioId, newScenarioNo |
| `construction-simulation.approve` | scenarioNo, revisionNo |
| `construction-simulation.archive` | scenarioNo, previousStatus |

Metadata açıklama metni, kullanıcı sorgusu veya tüm satır payload'ını içermez.
Senaryo yazısı düz metne normalize edilir. Başarılı karşılaştırma salt-okunur
olduğu için audit üretmez.

## 9. UI ve Erişilebilirlik

- Mevcut geçici hesap paneli korunur; `Senaryo olarak kaydet` yalnız yetkili
  rollerde görünür.
- Proje/hakediş içinde `Senaryolar` çalışma alanı: durum, revizyon, oluşturan,
  snapshot tarihi, toplam ve aşım sayısı.
- İki senaryo/revizyon seçilerek poz bazlı miktar/tutar/kalan farkı gösterilir.
- Onay ve arşiv işlemleri açık confirm dialog'u ve odak dönüşü taşır.
- Viewer yalnız onaylı kayıtları görür; yazma kontrolleri DOM'a eklenmez.
- 390 × 844 mobilde karşılaştırma kartları; geniş tabloda kontrollü yatay kaydırma.
- Light/dark ve print çıktısında semantic tokenlar kullanılır.

Public URL paylaşımı yoktur. İç deep-link yalnız `/hakedis?senaryo=<id>`
biçimindedir ve route/scope/RBAC doğrulamasından sonra açılır.

## 10. Migration, Backfill ve Rollback

- Migration additive olarak üç yeni tablo, relation, unique ve scope indeksleri
  ekler.
- Mevcut hakediş, ölçüm, sözleşme ve ledger tabloları değiştirilmez.
- Backfill yoktur; mevcut geçici hesaplar tarihsel senaryoya dönüştürülemez.
- Uygulama geri alınırsa UI/action kapatılabilir; senaryo tabloları korunur.
- Tablolar ancak senaryo verisi dışa aktarıldıktan ve ayrı destructive migration
  onayı alındıktan sonra düşürülebilir.

## 11. Uygulama Dilimleri

### Dilim 1 — Domain çekirdeği

- Saf hesap ve snapshot DTO'ları.
- Status/RBAC/limit/idempotency kuralları.
- Prisma ve UI yok.

### Dilim 2 — Şema ve repository

- Additive migration ve üç model.
- Scope/proje filtreli repository, transaction ve concurrency.
- Repository izolasyon testleri.

### Dilim 3 — Server action ve audit

- Create/revise/clone/approve/archive/list/compare action'ları.
- Session scope, abonelik, dönem, RBAC ve sunucu yeniden hesabı.
- Merkezi audit ve idempotent retry.

### Dilim 4 — Hakediş Pro UI

- Kaydetme, geçmiş, karşılaştırma, onay ve arşiv ekranları.
- İç deep-link, loading/empty/error/concurrency durumları.
- Viewer salt-okunur görünüm.

### Dilim 5 — Gerçek veri ve kapanış

- İzole demo proje/senaryo/revizyon kabulü.
- Admin/accounting/viewer ve kapalı dönem/abonelik senaryoları.
- Masaüstü, 390 × 844 mobil, light/dark, print ve erişilebilirlik.

## 12. Test ve Kabul Matrisi

| Alan | Zorunlu kabul |
|---|---|
| Scope | Başka tenant/firma/dönem/proje kaydı sıfır |
| Snapshot | Kaynak değişse de eski revizyon sonucu değişmez |
| Hesap | İstemci toplamı kullanılmaz; sunucu yeniden hesaplar |
| Revizyon | Append-only ve sıralı; update/delete yok |
| Idempotency | Aynı input hash tekrarında kopya revizyon yok |
| Concurrency | Eski `currentRevisionNo` yazımı güvenli conflict |
| RBAC | Admin onay/arşiv; accounting taslak/revizyon; viewer approved read |
| Guard | Abonelik/kapalı dönem fail-closed |
| Audit | Her mutation tek merkezi audit; compare audit yok |
| İzolasyon | Metraj, hakediş, ledger ve sözleşme kayıtları değişmez |
| UI | Compare, confirm, focus trap/return ve live state |
| Responsive | Masaüstü ve 390 × 844 taşmasız |
| Tema/print | Light/dark kontrast ve kontrollü çıktı |

Her dilimde hedefli testlerden sonra tam kapılar çalıştırılır:

```powershell
npm test
npm run type-check
npm run db:validate
npm run lint
npm run build
git diff --check
```

## 13. Önerilen On Varsayım — Onay Kapısı

1. Yeni çalışma **Faz 11**, RFC kodu `RFC-F11-01` olarak yürütülecek.
2. İlk sürüm yalnız Hakediş Pro poz bazlı metraj simülasyonunu kapsayacak;
   ihale BOQ ve import staging dahil edilmeyecek.
3. Gerçek metraj/hakediş/ledger kayıtlarına otomatik aktarım yapılmayacak.
4. Additive migration ile scenario, revision ve line olmak üzere üç normalize
   tablo eklenecek; JSON hesap payload'ı kullanılmayacak.
5. Revizyonlar append-only snapshot olacak; onaylı kayıt değişmeyecek, değişim
   klon veya yeni revizyonla yürütülecek.
6. Durumlar `DRAFT`, `APPROVED`, `ARCHIVED`; silme olmayacak.
7. Admin onay/arşiv, accounting taslak/revizyon/karşılaştırma, viewer yalnız
   onaylı görüntüleme yetkisine sahip olacak.
8. Scope, proje, hakediş, poz, abonelik ve dönem kontrolleri her action'da
   sunucuda fail-closed uygulanacak.
9. Paylaşım yalnız yetkili iç deep-link olacak; public token/link,
   yorum/bildirim ve dış entegrasyon olmayacak.
10. Mevcut geçici hesaplara backfill yapılmayacak; gerçek veri kabulü izole demo
    senaryosuyla ve mevcut kayıtları değiştirmeden yürütülecek.

Bu on varsayım 23.07.2026 tarihinde kullanıcı tarafından birlikte onaylandı.

Önerilen onay cümlesi:

> “RFC-F11-01’deki 10 önerilen varsayımı onaylıyorum. Faz 11’in ilk uygulama
> dilimi olan Domain Çekirdeği ile başla.”

## 14. Onay ve Dilim 1 Uygulama Kaydı — 23.07.2026

Kullanıcı önerilen on varsayımı onaylayarak Faz 11 Domain Çekirdeği'ni başlattı.
`src/lib/construction-simulation-scenario.ts` içinde Prisma ve UI'dan bağımsız
olarak:

- scenario/revision/line snapshot DTO'ları,
- doğrudan miktar veya boy × en × yükseklik × çarpan hesabı,
- miktarda 4 ve parada 2 ondalık deterministik normalizasyon,
- pasif/tekrarlı poz, geçersiz giriş ve 500 satır sınırı,
- aşımı engellemeden satır ve revizyon toplamında risk işareti,
- kaynak hakediş sürümünü kapsayan kullanıcı verisi taşımayan input hash,
- `DRAFT → APPROVED/ARCHIVED` ve `APPROVED → ARCHIVED` geçişleri,
- admin/accounting/viewer, kapalı dönem ve clone/revise kuralları

uygulandı. 20 hedefli domain testi hesap, snapshot, limit, idempotency, stale
kaynak ve RBAC matrisini doğrular. Prisma şeması, repository, server action, UI,
gerçek hakediş/metraj/ledger verisi ve mevcut geçici simülasyon bu dilimde
değişmedi. Tam kalite paketi 228 dosya/1.293 test, type-check, Prisma validate,
lint, 74 sayfalık production build ve diff denetimiyle geçti. Sıradaki bağımsız
dilim **Şema ve Repository**'dir.

## 15. Dilim 2 Şema ve Repository Uygulama Kaydı — 23.07.2026

`20260723183000_add_construction_simulation_scenarios` additive migration'ı
uygulandı. Backfill veya mevcut tablo kolon değişikliği yapılmadan:

- scope ve yaşam döngüsü taşıyan `ConstructionSimulationScenario`,
- append-only toplam/snapshot taşıyan `ConstructionSimulationRevision`,
- normalize giriş ve hesap sonuçlarını taşıyan `ConstructionSimulationLine`

tabloları eklendi. Proje içinde senaryo numarası, senaryo içinde revizyon
numarası ve input hash, revizyon içinde satır numarası benzersizdir. Scope/proje/
durum, kaynak hakediş ve poz erişimleri için indeksler eklendi. Scenario altı
snapshot ilişkileri cascade; kaynak proje, hakediş ve sözleşme pozu ilişkileri
tarihsel bütünlük için restrict olarak tanımlandı.

`src/lib/construction-simulation-scenario-prisma-repository.ts` yalnız aktif
tenant + firma + dönem scope'uyla okur. Create işlemi scenario + R1 + satırları
tek transaction'da yazar; proje, kaynak hakediş ve bütün aktif pozları aynı
scope/projede tekrar doğrular. Revizyon ekleme:

- yalnız `DRAFT` senaryoda,
- sıralı `revisionNo` ile,
- `currentRevisionNo` koşullu optimistic update sonrasında,
- aynı input hash tekrarında mutation üretmeden

çalışır. Repository update/delete revision API'sı sunmaz. Liste çağrısı yalnız
güncel revizyon özetini, detay çağrısı sıralı tüm snapshot satırlarını yükler.
13 repository testi; scope izolasyonu, referans doğrulaması, transaction,
idempotency, status, concurrency ve persistence invariantlarını doğrular.
Domain ile hedefli paket 2 dosya/33 testtir. Migration geliştirme veritabanına
başarıyla uygulandı; üç yeni tablo read-only kabulünde `0/0/0`, sahte scope
sorgusunda sıfır kayıt döndürdü. Gerçek simülasyon verisi yazılmadı.
Tam kalite paketi 229 dosya/1.306 test, type-check, Prisma validate, lint,
74 sayfalık production build, diff denetimi ve güncel migration status ile
geçti.

Sıradaki bağımsız dilim **Server Action ve Audit**'tir.

## 16. Dilim 3 Server Action ve Audit Uygulama Kaydı — 23.07.2026

Next.js 16.2.9 yerel mutating-data, forms, `use server` ve `revalidatePath`
rehberleri doğrulandı. `construction-simulation-scenario-actions.ts` içinde:

- list ve scope/RBAC kontrollü detail,
- create ve append-only revise,
- mevcut snapshot'tan yeni `DRAFT` clone,
- admin approve ve archive,
- aynı projedeki iki revizyonu salt-okunur compare

action'ları eklendi. Her action `progress-payments` abonelik guard'ından sonra
aktif session scope'unu kullanır; raw tenant/firma/dönem kabul etmez. Viewer
yalnız onaylı kayıtları okuyup karşılaştırabilir; accounting taslak/create/
revise/clone, admin ek olarak approve/archive yapabilir. Kapalı dönem mutation
hem action izninde hem repository transaction'ında fail-closed'dur.

Create/revise action'ları istemciden hesaplanmış miktar, fiyat veya toplam
almaz. Kaynak hakediş snapshot'ı ile aktif sözleşme pozları aynı scope/projede
sunucuda yeniden okunur; kümülatif miktar, sözleşme miktarı, birim fiyat ve
bütün sonuçlar Domain Çekirdeği'nde yeniden hesaplanır. Para birimi P0 temel
para birimiyle eşleşmezse yazma reddedilir.

Create/revise/clone/approve/archive auditleri scenario mutation'ıyla aynı
transaction'da `AuditLog` tablosuna yazılır. Metadata yalnız senaryo/proje/
revizyon/satır/hash referanslarını taşır; açıklama veya satır payload'ı içermez.
Idempotent retry mutation, audit veya ikinci revalidation üretmez. List, detail
ve compare salt-okunurdur ve audit üretmez. Başarılı mutation sonrası yalnız
literal `/hakedis` yolu revalidate edilir.

Domain, repository ve action hedefli paketi 3 dosya/51 testtir. UI, deep-link
ve gerçek simülasyon verisi bu dilimde değiştirilmedi. Tam kalite paketi 230
dosya/1.324 test, type-check, Prisma validate, lint, 74 sayfalık production
build, diff denetimi ve güncel migration status ile geçti; simülasyon tabloları
`0/0/0` kaldı. Sıradaki bağımsız dilim **Hakediş Pro UI**'dır.

## 17. Dilim 4 Hakediş Pro UI Uygulama Kaydı — 23.07.2026

Mevcut `Aktarım / Simülasyon` sekmesinin CSV önizleme ve tarayıcı içi poz bazlı
etki hesabı değişmeden korundu. Aynı sekmeye gerçek action katmanına bağlı
`Simülasyon Senaryo Merkezi` eklendi:

- hesaplanan miktarı scenario + R1 olarak kaydetme,
- taslakta append-only yeni revizyon ve optimistic concurrency hata görünümü,
- snapshot'tan yeni taslak klon,
- iki senaryo ve seçili revizyonları poz bazında karşılaştırma,
- durum/toplam/aşım, güncel satır ve revizyon geçmişi,
- kaynak hakediş değiştiğinde stale-source uyarısı,
- admin onay/arşiv confirm dialog'u, ilk odak ve tetikleyiciye odak dönüşü,
- viewer için mutation kontrollerini DOM'a eklemeyen salt-okunur görünüm,
- `/hakedis?senaryo=<id>` ile scope/RBAC sonrası proje, kaynak hakediş ve
  simülasyon sekmesini açan iç deep-link

tamamlandı. Rapor DTO'su senaryo action'ına güvenli referans verebilmek için
`projectId`, `progressPaymentId` ve `contractItemId` alanlarıyla genişletildi;
istemci miktar/tutar toplamları hâlâ server action tarafından güvenilmez kabul
edilir ve kaynak snapshot'tan yeniden hesaplanır.

Muhasebe demo hesabında gerçek `E2E-HAK-002` raporu açılarak 10 m³ yerel hesap
sonucunun kalıcı kayıt formunu etkinleştirdiği doğrulandı. Kabul DB yazımı
yapmadan masaüstü, 390 × 844 mobil, light/dark, yatay taşma ve konsol
kontrollerini geçti. UI hedefli paket 2 dosya/6 testtir. Tam kalite paketi 231
dosya/1.326 test, type-check, Prisma validate, lint, diff denetimi ve 74
sayfalık production build ile geçti.

Sıradaki bağımsız dilim **Gerçek Veri ve Kapanış**'tır.

## 18. Dilim 5 Gerçek Veri ve Kapanış Kaydı — 23.07.2026

`F8-KABUL-20260722 / F8-HAK-001` gerçek snapshot'ı üzerinde iki izole kabul
senaryosu oluşturuldu. Accounting A senaryosunu 12 m² R1 ve 18 m² R2 ile
kaydetti; A/R2 snapshot'ından B klonunu oluşturup B/R2'yi 25 m² yaptı.
Karşılaştırma `+7 m² / +70.000 TL` fark üretti. Admin A'yı onayladı, B'yi
arşivledi. Salt Okur yalnız A'yı deep-link ile görebildi; create/revise/clone/
approve/archive kontrolleri DOM'a eklenmedi ve arşivli B yetki reddi verdi.

`npm run hakedis:scenario:verify` gerçek DB'de dört revision/line snapshot'ını,
altı tekil mutation auditini, sıfır compare auditini ve yanlış firma/dönem/
proje sorgularında sıfır sonucu doğrular. Kaynak hakediş `updatedAt`, snapshot,
metraj föyü/satırı, kesinti sayısı, muhasebe bağlantısı, dönem ve abonelik
değişmeden kaldı. Kapalı dönem, abonelik ve RBAC fail-closed davranışları hedefli
action/repository paketinde doğrulandı.

Masaüstü koyu, 390 × 844 mobil açık tema, taşma, print sözleşmesi ve konsol
kabulü geçti. Confirm dialog ilk odağı ve transition sonrası tetikleyiciye odak
dönüşü regresyona bağlandı. Ayrıntılı kanıt
`Docs/UI-baseline/Faz11-gercek-veri-kapanis-20260723.md` içindedir.

Bu kayıtla `RFC-F11-01`, F2-03 ve Faz 11 tamamlandı. Sıradaki planlama kapısı
F2-04 için `RFC-F12-01` — Kalıcı Import Staging/Geçmişi'dir.
