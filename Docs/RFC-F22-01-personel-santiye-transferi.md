# RFC-F22-01 — Personel Şantiye Transferi

> Durum: **Tamamlandı — Dilim 1–5**
> Tarih: 30.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-moduller-genisletme-plani.md` Bölüm 13.3,
> 13.6, 13.7, 13.8 ve 17.2; mevcut `/personel`, `EntityRecord`,
> `StockMovement`, `VehicleAssignment`, AppShell ve merkezi audit sözleşmeleri

## 1. Amaç

NOA'nın mevcut personel kartı, puantaj, bordro, izin ve avans akışlarını
bozmadan; personelin bir şantiyeden diğerine kontrollü biçimde atanmasını,
yönetici onayını ve değiştirilemez transfer geçmişini sağlayan kalıcı bir
dikey eklenir.

Bu faz genel amaçlı bir transfer motoru değildir. Malzeme transferi mevcut
`StockMovement`, araç transferi mevcut `VehicleAssignment` akışının
sorumluluğundadır. Bu iki akış yeniden üretilmez, ortak bir üst tabloya
kopyalanmaz ve personel transferi nedeniyle hareket oluşturmaz.

## 2. Mevcut altyapıyla uyum

Çalışma mevcut `personel` ve `santiyeler` `EntityRecord` kayıtlarını yeniden
kullanır. Personel veya şantiye kartları yeni ana modellere taşınmaz ve
backfill edilmez. Onaylanan transfer personel kartındaki güncel `site`
değerini kontrollü biçimde değiştirirken, geçmiş additive
`EmployeeTransfer` kaydında korunur.

| İhtiyaç | Faz 22 ilk karşılığı | Sınır |
|---|---|---|
| Personel | Mevcut aktif `personel` kaydı | Yeni `Employee` ana modeli yok. |
| Kaynak/hedef şantiye | Mevcut aktif `santiyeler` kayıtları | Yeni proje veya lokasyon modeli yok. |
| Talep ve onay | Scoped `EmployeeTransfer` | Çok kademeli organizasyon akışı yok. |
| Güncel görev yeri | Onayda mevcut personel kartının `site` alanı | Personel kartının diğer alanları değişmez. |
| Malzeme transferi | Mevcut `StockMovement` | Faz 22 yeni stok hareketi üretmez. |
| Araç transferi | Mevcut `VehicleAssignment.transferAssignment` | Faz 22 araç atamasını değiştirmez. |
| UI | `/personel` içinde Şantiye Transferleri yüzeyi | Ayrı transfer uygulaması veya ikinci AppShell yok. |

## 3. Önerilen varsayımlar

1. Faz 22 yalnız tenant içi **Personel Şantiye Transferi** dikeyidir.
   Malzeme, araç, zimmet, SGK, e-Devlet, seyahat/harcırah, konaklama veya dış
   İK sağlayıcısı bu fazda otomatik işlenmez.
2. Her transfer `tenantId + companyId + periodId` kapsamını taşır. Personel,
   kaynak/hedef şantiye ve işlem yapan kullanıcı aktif scope içinde yeniden
   doğrulanır; kapsam dışı kayıt okunamaz veya değiştirilemez.
3. Mevcut `personel` ve `santiyeler` `EntityRecord` verileri korunur.
   Additive `EmployeeTransfer` modeli eklenir; mevcut kayıtlar için backfill,
   toplu veri taşıma veya yeni `Employee`/`Project` ana modeli oluşturulmaz.
4. Transfer; personel, kaynak şantiye, hedef şantiye, yürürlük tarihi ve kısa
   operasyon notu taşır. Kaynak ile hedef farklı ve aktif olmalıdır. Onay
   anında yürürlük tarihi gelecek olamaz; zaman dilimi aktif şirket bağlamında
   `Europe/Istanbul` takvim günü olarak değerlendirilir.
5. Yaşam döngüsü `DRAFT → SUBMITTED → APPROVED | REJECTED` biçiminde yalnız
   ileri ilerler. Fiziksel silme, yeniden açma, adım atlama ve onaylanmış
   transferi düzenleme/iptal yoktur. Hatalı onay yeni bir ters transferle
   izlenebilir biçimde düzeltilir.
6. `admin` ve `accounting` taslak oluşturup düzenleyebilir ve gönderebilir;
   yalnız `admin` onaylar veya reddeder. `viewer` salt okunurdur.
   Personel–AppUser ve yönetici hiyerarşisi bulunmadığı için çalışan
   self-service veya kişiye özel yönetici onayı ilk sürümde yoktur.
7. Taslak oluşturulurken kaynak şantiye personel kartındaki güncel `site`
   değeriyle eşleşmelidir. Aynı personel için en fazla bir `SUBMITTED` transfer
   bulunabilir. Önceden onaylı geçmiş varsa yeni kaynağın son onaylı hedefle
   eşleşmesi zorunludur; böylece transfer zinciri sessizce koparılamaz.
8. Onay, optimistic revision kontrolüyle tek transaction içinde transferi
   `APPROVED` yapar ve personel kartındaki yalnız `site` değerini hedef şantiye
   adıyla günceller. Eşzamanlı kart/transfer değişikliği veya güncel kaynak
   uyuşmazlığı işlemi fail-closed reddeder; kısmi güncelleme oluşmaz.
9. Oluşturma, düzenleme, gönderme, onay ve red request key ile idempotent ve
   revision kontrollüdür. Audit yalnız işlem/entity kimliği, personel kodu,
   kaynak/hedef şantiye kodları ve güvenli durum geçişini taşır; operasyon
   notu, şantiye/personel adı veya request key metadata'ya yazılmaz.
10. UI `/personel` içinde sayaçlar, arama, durum/şantiye/tarih filtresi,
    taslak formu, transfer geçmişi ve `?transfer=<id>` detay deep-link'i
    sağlar. Rol dışı mutation kontrolleri DOM'a eklenmez; boş/yükleniyor/hata,
    390 px mobil, açık/koyu tema ve print standartları korunur. Onay otomatik
    bildirim, puantaj, bordro, izin, avans, zimmet, stok, araç veya finans
    hareketi üretmez.

## 4. Veri ve yaşam döngüsü

| Durum | Değişebilir alanlar | Personel kartı etkisi | İzinli işlem |
|---|---|---|---|
| `DRAFT` | Personel, kaynak/hedef, tarih, kısa not | Yok | Düzenle, gönder |
| `SUBMITTED` | Yok | Yok | Onayla veya reddet |
| `APPROVED` | Yok | `site` hedef şantiye olur | Salt okunur |
| `REJECTED` | Yok | Yok | Salt okunur |

`EmployeeTransfer`; personel kodu, kaynak/hedef şantiye kod ve ad
snapshot'ları, yürürlük tarihi, kısa operasyon notu, durum, revision,
idempotency alanları ile oluşturan/gönderen/karar veren kullanıcı ve zaman
bilgilerini taşır.

Personel kartının güncel görev yeri mevcut `site` alanı olmaya devam eder.
Transfer listesi tarihçeyi `EmployeeTransfer` üzerinden gösterir. Onay
transaction'ı, personel kartının kaynak şantiyesi hâlâ beklenen değer değilse
transferi de onaylamaz.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Çekirdeği | DTO, durum/tarih, rol, zincir ve geçiş kararları | Saf testler; şema/UI/veri değişmez. |
| 2 — Şema ve Repository | Additive transfer modeli, migration, scoped repository ve atomik personel-site güncellemesi | Backfill yok; optimistic revision ve transaction. |
| 3 — Server Action ve Audit | Oturum/scope/rol/dönem guard'ları, idempotent yaşam döngüsü | Serbest içerik audit'e sızmaz; çift onay yok. |
| 4 — Personel Transfer UI | Sayaç, liste, form, filtre ve detay deep-link'i | Mobil/tema/print ve rol DOM sınırı. |
| 5 — İzole Gerçek Veri ve Kapanış | Ayrılmış admin/accounting/viewer kabulü ve tam kapılar | Önceki fazlar ile stok/araç/personel alt akışları korunur. |

## 6. Kabul kriterleri

- Yanlış tenant/firma/dönem personel, şantiye veya transfer referansına
  erişemez.
- Pasif personel/şantiye, aynı kaynak-hedef, gelecek yürürlük tarihi ve güncel
  personel kartıyla uyuşmayan kaynak reddedilir.
- Viewer mutation yapamaz; accounting onay veya red yapamaz.
- Kapalı dönemde okuma sürer; tüm transfer mutasyonları fail-closed
  reddedilir.
- Gönderilmiş/onaylanmış kayıt düzenlenemez; yaşam döngüsü geri alınamaz veya
  atlanamaz.
- Bir personelin ikinci bekleyen transferi ve son onaylı hedefi izlemeyen
  transfer zinciri reddedilir.
- Aynı request key ikinci kayıt, durum geçişi, personel kartı değişikliği veya
  audit üretmez.
- Onay ile personel `site` güncellemesi atomiktir; concurrency uyuşmazlığında
  iki kayıt da değişmeden kalır.
- Audit operasyon notu, kişi/şantiye adı veya request key taşımaz.
- Personel transferi stok, araç, zimmet, izin, puantaj, bordro, avans,
  bildirim, kasa/banka veya yevmiye hareketi üretmez.
- UI 390 px mobilde global taşma olmadan ve print-safe çalışır.
- Tam kalite kapıları `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 7. Kapsam dışı

Malzeme/araç transferlerini ortak tabloda birleştirme, toplu transfer, çalışan
self-service, yönetici hiyerarşisi, çok kademeli onay, ileri tarihli
zamanlayıcı, vardiya/puantaj üretimi, bordro veya maliyet merkezi etkisi,
zimmet devri, ulaşım/konaklama/harcırah, SGK/e-Devlet, e-posta/SMS/push,
otomatik bildirim, Excel içe aktarma ve dış İK sağlayıcısı bu RFC'nin
dışındadır.

## 8. Kuyruk kararı ve uygulama onayı

Faz 13 Open Banking sağlayıcı/ürün ve resmi sandbox bilgisi hazır olana kadar
kuyruk sonunda bekler. “Davet Et & Kazan” da yeni tenant kayıt akışı ile
gerçek ödül/indirim politikası tanımlanana kadar ürün kararı kuyruğunda
tutulur; mevcut şirket içi kullanıcı davetiyle karıştırılmaz.

Malzeme transferi mevcut Stok/Depo, araç transferi mevcut Filo Operasyon
yüzeyinin kaynak-doğru akışı olarak korunur. Faz 22 yalnız eksik kalan
`EmployeeTransfer` dikeyini tamamlar.

Kullanıcı 30.07.2026 tarihinde Bölüm 3'teki on önerilen varsayımı onayladı.

- **Dilim 1 — Domain Çekirdeği:** `employee-transfer` saf sözleşmesi; taslak
  normalizasyonu, kaynak/hedef ayrımı, onay tarih sınırı, admin/accounting/
  viewer rol kararları, kapalı dönem reddi, yalnız ileri yaşam döngüsü,
  personel kartı ve son onaylı hedef kaynak sürekliliği, tek bekleyen transfer,
  optimistic revision ve içeriksiz idempotency anahtarlarını tek yerde
  topladı. On saf domain testi geçti. Şema, migration, repository, UI ve gerçek
  veri değiştirilmedi. Tam kapılar 276 dosya/1.612 test, type-check, Prisma
  validate, lint, 77 sayfalık production build ve `git diff --check` ile
  geçti.
- **Dilim 2 — Şema ve Repository:** Additive `EmployeeTransfer` modeli ve
  `20260731020000_add_employee_transfer_management` migration'ı eklendi.
  Tenant/firma/dönem scope'u, create request key tekilliği, durum/tarih ve
  personel/şantiye sorgu indeksleri ile optimistic status/revision koşulları
  korundu. Onay transaction'ı personel kartını scope ve `updatedAt` koşuluyla
  okuyup diğer JSON alanlarını koruyarak yalnız `site` değerini hedef şantiyeye
  taşır; kaynak veya concurrency uyuşmazlığında fail-closed geri alınır.
  Backfill yapılmadı. Hedefli 17 test ve tam kapılar 277 dosya/1.619 test,
  type-check, Prisma validate, 54/54 migration, lint, 77 sayfalık production
  build ve `git diff --check` ile geçti.
- **Dilim 3 — Server Action ve Audit:** Her action aktif oturum ve
  tenant/firma/dönem scope'unu yeniden çözer; rol/kapalı dönem izni, aktif
  personel ile kaynak/hedef şantiye referansları mutation öncesi doğrulanır.
  Servis; create/update/submit/approve/reject yaşam döngüsü, kaynak zinciri,
  tek bekleyen transfer, optimistic revision ve idempotency kararlarını
  uygular. Onay, Europe/Istanbul şirket gününü ve personel `updatedAt`
  snapshot'ını atomik repository işlemine taşır. Audit yalnız personel,
  kaynak/hedef şantiye kodları ile güvenli revision/durum geçişini içerir;
  not, ad ve request key taşımaz. Başarılı mutation `/personel` ile dinamik
  modül sayfasını revalidate eder. Hedefli 30 test ve tam kapılar 279
  dosya/1.632 test, type-check, Prisma validate, lint, 77 sayfalık production
  build ve `git diff --check` ile geçti.
- **Dilim 4 — Personel Transfer UI:** `/personel` çalışma alanına bekleyen,
  onaylanan ve taslak sayaçları; arama, durum, şantiye ve yıl filtreleri;
  responsive transfer kartları ve `?transfer=<id>` ayrıntı deep-link'i
  eklendi. Taslak form kaynak şantiyeyi personel kartından türetir ve yalnız
  farklı aktif hedefleri seçtirir. Admin onay/red dahil tüm kontrolleri,
  accounting taslak/gönderim kontrollerini görür; viewer ve kapalı dönem
  DOM'unda mutation kontrolleri bulunmaz. Boş, yükleniyor ve hata durumları
  ile mobil, açık/koyu tema ve print sözleşmeleri uygulandı. Hedefli UI paketi
  6 test; tam paket 280 dosya/1.638 test, type-check, Prisma validate, lint,
  77 sayfalık production build ve `git diff --check` ile geçti. Yerel
  in-app browser oturumu sekme bağlama hatası verdiği için etkileşimli ekran
  görüntüsü kabulü Dilim 5'e bırakıldı; UI davranışı bileşen sözleşmeleriyle
  doğrulandı.
- **Dilim 5 — İzole Gerçek Veri ve Kapanış:** Yalnız
  `company-f22-kabul-20260730` / `period-f22-kabul-20260730` kapsamında dört
  transfer `APPROVED`/`REJECTED`/`SUBMITTED`/`DRAFT` durumlarında iki ardışık
  çalıştırmada idempotent kaldı. Onay yalnız personel `site` alanını Kuzey'den
  Güney'e taşıdı; görev ve telefon korundu, red/bekleyen/taslak personel
  kartını değiştirmedi. Dokuz içeriksiz audit sabit kaldı; yanlış scope,
  viewer/accounting rol ihlali, kapalı dönem, gelecek tarih ve ikinci bekleyen
  transfer reddedildi. Avans, izin, finans, bildirim, bordro, KKD, stok,
  puantaj ve araç yan etkileri sıfırdır. Gerçek accounting/viewer UI'ında
  sayaçlar, dört kart, filtreler ve deep-link; koyu/açık tema ile 390 px
  taşmasız görünüm doğrulandı. Hedefli paket 5 dosya/36 test; tam kapılar 280
  dosya/1.638 test, type-check, Prisma validate, güncel 54 migration, lint,
  77 sayfalık production build ve `git diff --check` ile geçti. Ayrıntı
  `Docs/UI-baseline/Faz22-gercek-veri-kapanis-20260730.md` içindedir.

Faz 22 tamamlandı.
