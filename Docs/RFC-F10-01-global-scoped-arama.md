# RFC-F10-01 — Global Scoped Arama

> Tarih: 23.07.2026
> Durum: Tamamlandı — Dilim 1–5 kapandı
> Sınıf: F2-01 — route'lar arası yetkili kayıt arama
> Önceki kapı: Faz 9 ve HTML şablon entegrasyonu tamamlandı

## 1. Karar Özeti

NOA İnşaat kabuğuna, yalnız aktif tenant/firma/dönem kapsamındaki ve kullanıcının
görmeye yetkili olduğu modül ve kayıtları bulan bir global arama önerilir. İlk
sürüm yeni bir genel arama tablosu veya PostgreSQL full-text migration'ı
oluşturmaz. Mevcut domain tablolarını sınırlı ve paralel sorgulayan federatif,
salt-okunur bir read-model kullanır.

Arama sonucu kaynak kaydın kopyası değildir. Yalnız sonuç tipi, güvenli kod,
başlık, kısa açıklama, durum ve mevcut uygulama route'una giden hedefi taşır.
Domain kayıtları tek doğruluk kaynağı olmaya devam eder.

Bu yaklaşımın amacı, veri hacmi ve gerçek sorgu davranışı ölçülmeden çok sayıda
write-through entegrasyonu olan ikinci bir kalıcı indeks üretmemektir. Kabul
edilen performans eşiği aşıldığında ayrı bir indeksleme RFC'si açılır.

## 2. Kullanıcı Hikâyeleri

- Kullanıcı `Ctrl/Cmd + K` ile global aramayı açıp modül veya kayıt kodu
  arayabilmelidir.
- Muhasebe kullanıcısı fatura, çek veya hakediş belge numarasından ilgili
  çalışma alanına geçebilmelidir.
- Yönetici cari, şantiye, personel, stok, ihale, araç ve Hakediş Pro proje
  kayıtlarını tek girişten bulabilmelidir.
- Viewer aynı aramayı salt okunur kullanabilmeli, ancak yetkisiz tenant/firma,
  dönem veya abonelik özelliğine ait sonuç görememelidir.
- Aynı sorgunun geç dönen eski yanıtı yeni sorgu sonucunun üzerine
  yazılmamalıdır.
- Arama sorgusu parola, secret, API anahtarı, storage key veya audit metadata
  içinde çalışmamalıdır.

## 3. Mevcut Altyapı ve Gap

| Mevcut yapı | Sağladığı davranış | Eksik kalan |
|---|---|---|
| `navigationItems` | 22 route'un label, açıklama ve hedefleri | Kayıt sonuçlarıyla birleşik command palette yok |
| `EntityRecord` | Yedi tanım/cari grubunu aktif scope ve slug ile saklar | Route'lar arası ortak sorgu/ranking yok |
| Fatura, çek, ihale, hakediş, araç ve inşaat proje tabloları | Scope indeksleri ve görünür kod/başlık alanları | Tek sonuç sözleşmesine dönüştüren repository yok |
| Modül içi searchbox'lar | Türkçe locale ile client-side filtreleme | Yalnız yüklenmiş modül satırlarını arar |
| `AppShell` | Masaüstü header, mobil drawer, tema ve erişilebilirlik sözleşmesi | Global arama tetikleyicisi/dialog'u bilinçli olarak yok |
| Subscription route guard | Altı route için özellik erişimi | Arama sonucunu abonelik erişimine göre süzme yok |
| Aktif session scope | Tenant/firma/dönem ve rol | Federatif arama action'ında ortak zorunlu guard yok |

## 4. İlk Sürüm Arama Kapsamı

### 4.1 Dahil kaynaklar

| Sonuç grubu | Kaynak | Aranan güvenli alanlar | Hedef |
|---|---|---|---|
| Modüller | `navigationItems` | label, açıklama | İlgili route |
| Şantiye/cari/personel/stok/hesap | `EntityRecord` | code ve tanımdaki görünür metin alanları | İlgili entity route |
| Alış faturası | `PurchaseInvoice` | documentNo, cari kod/ad, şantiye kod/ad, açıklama | `/faturalar` |
| Satış faturası | `SalesInvoice` | documentNo, cari kod/ad, şantiye kod/ad, açıklama | `/faturalar` |
| Çek | `Cheque` | documentNo, checkNo, keşideci, banka, açıklama | `/cek` |
| İhale | `Tender` | tenderNo, IKN, başlık, idare, şehir | `/ihale-yonetimi` |
| Finansal hakediş | `ProgressPayment` | documentNo, cari, şantiye, açıklama | `/hakedis` |
| Hakediş Pro proje | `ConstructionProject` | code, name, site, contractNo, cari | `/hakedis` |
| Araç | `VehicleCard` | plaka, marka/model, şantiye kodu | `/araclar` |

### 4.2 İlk sürüm dışında

- API key değeri/hash'i, webhook secret'ı ve entegrasyon credential'ları.
- Banka external id, ham transaction açıklaması ve recovery metadata'sı.
- Ledger satırı, audit metadata, bildirim içeriği ve kullanıcı e-posta araması.
- Bordro/maaş tutarları ve personel özel verileri.
- Dosya `storageKey` değeri ve silinmiş dokümanlar.
- Tüm firmalar veya tüm dönemler arasında arama.
- İnternet, dış servis veya gerçek entegrasyon üzerinden arama.

Doküman dosya adı araması, klasör `accessLevel` ve rol filtresi ayrı hedefli
dilimde kanıtlandıktan sonra eklenebilir. İlk sürümde sonuç setine alınmaz.

## 5. Domain Sözleşmesi

```ts
type GlobalSearchResult = {
  id: string;
  type: GlobalSearchResultType;
  group: string;
  code: string;
  title: string;
  subtitle?: string;
  status?: string;
  href: string;
  score: number;
};

type GlobalSearchResponse = {
  query: string;
  results: GlobalSearchResult[];
  truncated: boolean;
};
```

Kurallar:

1. Sorgu trim edilir; 2 karakterden kısa veya 80 karakterden uzun sorgu
   repository'ye gönderilmez.
2. Karşılaştırma Türkçe locale uyumlu küçük harf normalizasyonu kullanır.
3. Sonuç metni HTML içermez; highlight render aşamasında güvenli React metni
   üzerinden yapılır.
4. Sonuç toplamı en fazla 24, her kayıt grubu en fazla 4 satırdır.
5. Sonuçlar deterministik `score`, `type`, `code`, `id` sırasıyla döner.
6. Domain tablosundaki kayıt silinmiş/pasif olsa bile yalnız kaynak modülün
   normal read sözleşmesi gösteriyorsa sonuç olabilir; durum açıkça yazılır.

## 6. Ranking

| Öncelik | Eşleşme | Puan |
|---:|---|---:|
| 1 | Kod, belge no, plaka veya IKN tam eşleşmesi | 100 |
| 2 | Kod/belge alanı sorguyla başlıyor | 80 |
| 3 | Başlık/ad tam eşleşmesi | 70 |
| 4 | Başlık/ad sorguyla başlıyor | 55 |
| 5 | Güvenli ikincil metinde parça eşleşmesi | 30 |
| 6 | Modül label/açıklama eşleşmesi | 20–60 |

Tutar, tarih yakınlığı veya kullanıcı davranışı ilk sürümde ranking'i
değiştirmez. Kişiselleştirilmiş geçmiş tutulmaz.

## 7. Repository ve Performans Kararı

İlk sürüm `GlobalSearchRepository` altında mevcut Prisma modellerini paralel
okur. Her alt sorgu zorunlu olarak şu scope'u taşır:

`tenantId + companyId + periodId`

- Her domain sorgusu kendi görünür alanlarını ve en fazla küçük bir aday
  kümesini okur.
- `EntityRecord.data` için yalnız onaylı slug ve kolon anahtarları aranır;
  keyfi JSON serialization sonucu döndürülmez.
- `Promise.allSettled` kullanılmaz: bir kaynak hatası sessizce eksik sonuç
  üretmez. Action güvenli genel hata döndürür ve ham exception istemciye
  sızmaz.
- Başarılı yanıt için sunucu hedefi demo/orta ölçek veri setinde p95 300 ms'dir.
- Scope başına aranabilir kayıt 10.000'i veya p95 300 ms'yi kalıcı biçimde
  aşarsa, PostgreSQL FTS/GIN veya ayrı `ScopedSearchDocument` projection'ı için
  yeni migration RFC'si açılır.

İlk migration'da mevcut tablolara keyfi çok sayıda `contains` indeksi veya
ikinci bir genel arama tablosu eklenmez.

## 8. RBAC, Abonelik ve Güvenlik

- Tüm roller yalnız aktif session scope'u içinde arama yapar.
- `viewer` sonuçları görebilir fakat hedef surface'in mutation kontrolleri
  değişmez.
- Abonelikle kapalı `/araclar`, `/cek`, `/dokuman-merkezi`,
  `/e-fatura-yonetimi`, `/hakedis` ve `/ihale-yonetimi` sonuçları döndürülmez.
- Route erişiminden ayrı, daha geniş bir "arama yetkisi" tanımlanmaz.
- Arama action'ı raw tenant/company/period parametresi kabul etmez; scope aktif
  server session'dan alınır.
- Kullanıcı sorgusu log, audit metadata, URL analytics veya localStorage'a
  yazılmaz.
- Başarılı salt-okunur aramalar audit üretmez. Yetki/scope ihlali güvenli neden
  koduyla kaydedilebilir; sorgu metni audit'e eklenmez.
- Sonuçlar secret, credential, hash, storage key ve ham exception içermez.

## 9. UI ve Erişilebilirlik

- Masaüstü header'da `Global aramayı aç` düğmesi; mobil drawer'da aynı işlevin
  tek tetikleyicisi bulunur.
- `Ctrl/Cmd + K` açar; `Escape` kapatır; kapanınca odak tetikleyiciye döner.
- Dialog semantiği, görünür label, ilk odak ve Tab odak döngüsü zorunludur.
- Sorgu 250 ms debounce edilir; istek sıra numarası eski yanıtın yeni sonucu
  ezmesini engeller.
- Klavyede Yukarı/Aşağı sonuç seçer, Enter güvenli hedefe gider.
- Loading, 2 karakter uyarısı, boş sonuç ve güvenli hata state'leri ayrı
  görünür.
- Sonuç grubu ve toplamı screen reader live region ile kısa biçimde duyurulur.
- Arama dialog'u print görünümünde gizlenir.

İlk deep-link sözleşmesi `href` içinde mevcut route ve güvenli `ara`/`kayit`
query parametrelerini kullanır. Bir surface bu parametreyi henüz desteklemiyorsa
sonuç yalnız route'a gider; çalışmayan sahte detay linki üretilmez.

## 10. Uygulama Dilimleri

### Dilim 1 — Domain çekirdeği

- Result type, query validation/normalization, ranking ve grup limitleri.
- Navigation sonuçları ve saf fonksiyon testleri.
- DB, action ve UI yok.

### Dilim 2 — Federatif repository

- EntityRecord ve onaylı domain adapter'ları.
- Scope/RBAC/subscription filtreleri.
- Repository contract ve izolasyon testleri.
- İlk sürümde migration yok.

### Dilim 3 — Server action ve AppShell UI

- Aktif session scope'lu action.
- Masaüstü/mobil tetikleyici, command dialog ve klavye davranışı.
- Loading/empty/error ve stale-response koruması.

### Dilim 4 — Deep-link ve gerçek veri kabulü

- Seçili surface'lerde `ara`/`kayit` parametresiyle odaklama.
- Admin/accounting/viewer ve abonelik kapalı senaryoları.
- Masaüstü, 390 × 844 mobil, light/dark ve erişilebilirlik kabulü.

### Dilim 5 — Performans kararı ve kapanış

- Scope başına veri hacmi ve sorgu süresi raporu.
- 300 ms p95 hedefi değerlendirmesi.
- Gerekirse indeks/projection için yeni RFC; gerekmiyorsa migration açmadan
  kapanış.

## 11. Test ve Kabul Matrisi

| Alan | Zorunlu kabul |
|---|---|
| Scope | Başka tenant, firma veya dönem sonucu sıfır |
| RBAC | Viewer yalnız okunabilir hedef; mutation yetkisi değişmez |
| Abonelik | Kapalı özellik sonucu yok |
| Query | Min/max, Türkçe harf, boşluk ve güvenli özel karakterler |
| Ranking | Tam kod > prefix > başlık > ikincil metin |
| Limit | Grup 4, toplam 24, deterministik sıra |
| Privacy | Secret/audit/storage/credential alanı yok; sorgu kalıcı değil |
| UI | Ctrl/Cmd+K, Escape, oklar, Enter, focus trap/return |
| Async | Eski yanıt yeni sonucu ezmiyor |
| Responsive | Masaüstü ve 390 × 844 mobil taşmasız |
| Tema/print | Light/dark kontrast; print'te dialog yok |
| Regresyon | Mevcut modül içi aramalar ve AppShell davranışı korunuyor |

Her uygulama diliminde hedefli testlerden sonra:

```powershell
npm test
npm run type-check
npm run db:validate
npm run lint
npm run build
git diff --check
```

## 12. Rollback

- Dilim 1–3 migration içermediği için global tetikleyici ve action kaldırılarak
  geri alınabilir.
- Federatif repository hiçbir domain kaydını yazmaz veya backfill yapmaz.
- Deep-link query parametreleri opsiyoneldir; kaldırılması kayıtları etkilemez.
- İleride indeks migration'ı onaylanırsa ayrı additive migration ve ayrı
  rollback/backfill planı gerekir.

## 13. Önerilen On Varsayım — Onay Kapısı

1. Yeni çalışma **Faz 10**, RFC kodu `RFC-F10-01` olarak yürütülecek.
2. Arama yalnız aktif tenant + firma + dönem kapsamındadır; çapraz kapsam yoktur.
3. İlk kaynaklar modüller, yedi EntityRecord grubu, alış/satış faturası, çek,
   ihale, finansal hakediş, Hakediş Pro proje ve araçtır.
4. Doküman, ledger, audit, banka hareketi, bildirim, bordro ve secret içeren
   sistem kayıtları ilk sürüm aramasına alınmaz.
5. İlk sürüm federatif salt-okunur repository kullanır; yeni DB tablo/migration
   oluşturmaz.
6. Sorgu 2–80 karakter, 250 ms debounce; grup başına 4 ve toplam 24 sonuçtur.
7. Ranking tam kod/belge, prefix, başlık ve ikincil metin sırasıyla
   deterministiktir.
8. Sonuçlar mevcut RBAC ve abonelik route guard'larıyla süzülür; yeni genel
   arama rolü açılmaz.
9. Sorgu metni audit, analytics veya tarayıcı geçmişine yazılmaz; secret ve ham
   exception sonuçlara girmez.
10. Kalıcı arama indeksi ancak 10.000 kayıt/scope veya p95 300 ms eşiği gerçek
    ölçümde aşılırsa ayrı RFC ve migration onayıyla değerlendirilir.

Bu on varsayım 22.07.2026 tarihinde birlikte onaylanmış ve Faz 10 Dilim 1
Domain Çekirdeği aşağıdaki kayıtla uygulanmıştır.

## 14. Onay ve Dilim 1 Uygulama Kaydı

Kullanıcı onayı — 22.07.2026:

> “RFC-F10-01’deki 10 önerilen varsayımı onaylıyorum. Faz 10’un ilk uygulama
> dilimi olan Domain Çekirdeği ile başla.”

`src/lib/global-search-domain.ts` altında result/candidate/response tipleri,
2–80 karakter sorgu doğrulaması, Türkçe locale ve NFKC normalizasyonu, güvenli
düz metin üretimi, RFC ranking puanları, deterministik sıralama, grup başına 4
ve toplam 24 sonuç sınırı uygulandı. Navigasyon adayları mevcut
`navigationItems` kaynağından üretilir; güvenli olmayan dış hedefler sonuçtan
çıkarılır.

Bu dilimde repository, Prisma sorgusu, server action, UI, route, migration ve
gerçek veri değişikliği yoktur. Hedefli paket 1 dosyada 14 test; tam paket 223
dosyada 1.246 test, type-check, Prisma validate, lint, diff denetimi ve 74
sayfalık production build ile geçti. Sıradaki bağımsız dilim **Federatif
Repository**'dir.

## 15. Dilim 2 — Federatif Repository Uygulama Kaydı

`src/lib/global-search-prisma-repository.ts` altında `GlobalSearchRepository`
kontratı ve Prisma adapterı eklendi. Geçerli sorgu; yedi onaylı `EntityRecord`
slug'ını, alış/satış faturası, çek, ihale, finansal hakediş, Hakediş Pro projesi
ve araç kaynaklarını küçük aday limitleriyle paralel okur. Her sorgu zorunlu
`tenantId + companyId + periodId` filtresi ve yalnız güvenli alan `select`'leri
taşır.

Tüm üç rol salt-okunur aramayı kullanabilir. Abonelikle korunan çek, ihale,
hakediş ve araç kaynakları ile navigasyon sonuçları mevcut route-feature
haritasından fail-closed süzülür. Entity JSON sorguları slug bazlı beyaz liste
kullanır; maaş, bakiye, iletişim, secret ve keyfi JSON alanları search term veya
sonuç DTO'suna alınmaz. Kaynaklar `Promise.all` ile çalışır; tek kaynak hatası
kısmi sonuç üretmez.

Repository hedefli paketi 6/6, global arama birleşik paketi 20/20 testle geçti.
Tam pakette 224 dosya/1.252 test, type-check, Prisma validate, lint, diff
denetimi ve 74 sayfalık production build başarılıdır. Prisma şeması, migration,
server action, AppShell UI ve gerçek veri değişmedi. Sıradaki bağımsız dilim
**Server Action ve AppShell UI**'dır.

## 16. Dilim 3 — Server Action ve AppShell UI Uygulama Kaydı

`globalSearchAction`, istemciden yalnız sorgu metnini kabul eder; aktif
oturumu sunucuda yeniden doğrular, tenant/firma/dönem kapsamını ve güncel
abonelik özetini federatif repository'ye kendisi aktarır. Geçersiz sorgular
veri okumadan güvenli hata döndürür; repository exception ayrıntıları istemciye
ve kalıcı audit/analytics kaydına yazılmaz. Kimlik doğrulama redirect'i action
tarafından yutulmaz.

AppShell'e masaüstü ve mobilde aynı command dialog'unu açan global arama
tetikleyicileri eklendi. Ctrl/Cmd+K, Escape, odak tuzağı ve tetikleyiciye odak
dönüşü; 250 ms debounce, minimum sorgu kapısı, eski yanıt koruması, oklarla
seçim ve Enter ile yalnız güvenli iç route navigasyonu uygulanmıştır. Sonuçlar
gruplu ve erişilebilir rollere sahiptir; loading, minimum, boş ve hata durumları
live region ile duyurulur. Mobil tetikleyici dialog açılırken drawer'ı kapatır;
overlay print çıktısında gizlidir.

Hedefli entegrasyon paketi 6 dosyada 57 testle; tam paket 226 dosyada 1.262
test, type-check, Prisma validate, lint, diff denetimi ve 74 sayfalık production
build ile geçti. Prisma şeması, migration, domain kayıtları ve gerçek veri
değişmedi; deep-link query parametreleri bu dilimde eklenmedi. Sıradaki bağımsız
dilim **Deep-link ve gerçek veri kabulü**dür.

## 17. Dilim 4 — Deep-link ve Gerçek Veri Kabulü Uygulama Kaydı

Fatura, çek ve ihale kayıt adayları için güvenli `ara` + `kayit` URL sözleşmesi
uygulandı. Query değerleri domain sınırlarında parse edilir; hedef surface
mevcut arama kontrolünü başlangıç değeriyle doldurur ve yalnız tam record id
eşleşmesini semantic marka vurgusuyla işaretler. Satış faturası sonucu doğru
sekmesini otomatik açar. EntityRecord, Hakediş Pro, finansal hakediş ve araç
yüzeyleri henüz parametre tüketmediğinden RFC gereği route-only kalır.

DEMO İNŞAAT gerçek verisinde Muhasebe rolüyle `212121321` çek sonucu global
aramadan hedefe taşındı; Yönetici rolüyle `FAT-0006` alış faturası ve Salt Okur
rolüyle aynı çek deep-link'i doğrulandı. Viewer mutation kontrolü pasif kaldı.
390 × 844 mobil ile masaüstünde açık/koyu tema, taşma, tek `h1`, satır vurgusu
ve konsol hatası kabulden geçti. Canlı aboneliklerin tümü Kurumsal olduğundan
kapalı paket senaryosu Başlangıç planı repository testinde fail-closed kabul
edildi. Ayrıntı `Docs/UI-baseline/Faz10-deep-link-gercek-veri-kabul-20260723.md`
içindedir.

Hedefli paket 8 dosyada 84 test; tam paket 226 dosyada 1.268 test, type-check,
Prisma validate, lint, diff denetimi ve 74 sayfalık production build ile geçti.
Şema, migration, kalıcı indeks ve gerçek domain verisi değişmedi. Sıradaki
bağımsız dilim **Performans kararı ve kapanış**tır.

## 18. Dilim 5 — Performans Kararı ve Faz 10 Kapanışı

Tekrarlanabilir `search:benchmark` komutu; yedi EntityRecord grubu ve onaylı
domain modellerinin scope içi toplamını sayar, federatif repository'yi sekiz
sorguyla ısınma turlarından sonra ölçer ve RFC eşik kararını üretir. Karar
fonksiyonları nearest-rank p95, 10.000 kayıt ve 300 ms sınırları için regresyon
testine bağlandı.

Üç aktif firma/dönem scope'unda üç bağımsız tur ve toplam 720 zaman örneği
alındı. En yüksek aranabilir hacim DEMO İNŞAAT'ta 55 kayıt; üç turun en kötü
p95'i 18,47 ms ve maksimumu 32,84 ms'dir. Diğer iki turdaki en kötü p95 10,03
ms ve 10,60 ms oldu. Hacim eşiğinin %0,55'i, süre eşiğinin %6,16'sı
kullanıldığından `requiresProjectionRfc=false` kararı çıktı.

Bu ölçümle FTS/GIN, keyfi `contains` indeksi, ayrı `ScopedSearchDocument`
projection'ı veya migration açılmayacaktır. 10.000 kayıt/scope ya da tekrarlı
p95 300 ms eşiği ileride aşılırsa yeni veri modeli/backfill/rollback RFC'si
zorunludur. Ayrıntılı ölçüm
`Docs/Faz10-global-arama-performans-kapanis-20260723.md` içindedir.

Performans hedefli paketi 3 dosyada 27 test; tam paket 227 dosyada 1.273 test,
type-check, Prisma validate, lint, diff denetimi ve 74 sayfalık production build
ile geçti. Şema, migration, gerçek veri ve mutation akışları değişmedi. Bu
kayıtla RFC-F10-01'in beş dilimi, F2-01 ve **Faz 10 Global Scoped Arama
tamamlanmıştır**.
