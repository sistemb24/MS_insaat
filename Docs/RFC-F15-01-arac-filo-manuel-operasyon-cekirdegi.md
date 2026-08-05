# RFC-F15-01 — Araç/Filo Manuel Operasyon Çekirdeği

> Durum: **Faz 15 tamamlandı — veri, iş akışı ve görsel kabul kapandı**
> Tarih: 28.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-moduller-genisletme-plani.md` Bölüm 11, 17.3 ve 20.2

## 1. Amaç

Mevcut scoped `Vehicle` kartı ve `/araclar` çalışma alanının üstüne, dış
sağlayıcıya bağlı olmayan araç atama, manuel yakıt ve bakım planı/kaydı
operasyonlarını eklemek. İlk sürüm filonun gerçek işletim maliyetini ve yaklaşan
bakımını izler; GPS, telemetri ve Arvento bağlantısı açmaz.

## 2. Mevcut altyapıyla uyum

`Vehicle` kartı, mevcut araç action/service/repository ve `/araclar` AppShell
yüzeyi korunur. Yeni satırlar aynı `TenantScope`, aktif dönem, subscription
guard ve merkezi `AuditLog` ilkelerini kullanır. Proje bağlantısı yalnız scope
içindeki `ConstructionProject`, sürücü bağlantısı yalnız scope içindeki aktif
personel kaynağıyla doğrulanır. Yeni bir finansal hareket motoru veya dosya
saklama sistemi kurulmaz.

| İhtiyaç | İlk karşılık | Sınır |
|---|---|---|
| Araç–proje/sürücü ataması | `VehicleAssignment` | Konum/GPS geçmişi yok. |
| Manuel yakıt girişi | `VehicleFuelRecord` | Kasa/banka veya stok hareketi üretmez. |
| Periyodik bakım planı | `VehicleMaintenancePlan` | Otomatik bildirim worker'ı yok. |
| Bakım/arıza kaydı | `VehicleMaintenanceRecord` | Muhasebe fişi veya satın alma belgesi üretmez. |

## 3. Önerilen varsayımlar

1. Faz 15 yalnız manuel araç/filo operasyon kayıtlarını kapsar; Arvento,
   GPS, CANbus/OBD, SOAP, credential, dış HTTP ve canlı konum bu fazın
   dışındadır.
2. Mevcut `Vehicle` kartı tek kanonik araç kaynağı olarak kalır; geriye dönük
   kart alanı dönüşümü veya mevcut araç verisi backfill'i yapılmaz.
3. Tüm yeni satırlar tenant, firma ve dönem kapsamına bağlıdır; araç, proje ve
   personel referansları yalnız aynı kapsamda doğrulanır.
4. İlk additive modeller araç ataması, manuel yakıt kaydı, bakım planı ve
   bakım kaydıdır; lastik yönetimi ve telemetri logu sonraki RFC'ye bırakılır.
5. `admin` ve `accounting` oluşturma, tamamlama ve kapatma yapar; `viewer`
   yalnız scope içi kayıtları okur. Kapalı dönemde hiçbir mutation yazılmaz.
6. Bir araç için aynı anda tek açık atama bulunur; transfer önceki atamayı
   kontrollü kapatır ve yeni atamayı audit altında açar.
7. Yakıt ve bakım maliyeti ilk sürümde operasyonel tutardır; otomatik
   kasa/banka, stok, bordro, cari, hakediş veya ledger kaydı üretmez.
8. Bakım planı kilometre veya tarih eşiğiyle izlenir; planlı bakım kaydı
   tamamlanınca yalnız ilgili planın son bakım/sonraki hedef bilgisi güncellenir.
9. Her create, atama transferi, plan durumu ve bakım kapanışı merkezi audit
   üretir; serbest servis notu, plaka dışı hassas belge içeriği veya kişisel
   sürücü ayrıntısı audit metadata'ya yazılmaz.
10. İlk gerçek kabul ayrı test firma/dönem kapsamına yazılır; mevcut araç
    kartları, Faz 8–14 kabul fixture'ları ve Faz 13 sağlayıcı sınırı korunur.

## 4. Veri yaşam döngüsü ve sınırlar

| Varlık | Temel alanlar | İlk yaşam döngüsü |
|---|---|---|
| `VehicleAssignment` | araç, proje, sürücü, başlangıç/bitiş, durum | aktif → transfer edildi/tamamlandı |
| `VehicleFuelRecord` | araç, tarih, litre, birim/toplam tutar, odometre, istasyon | kayıtlı; silme yerine iptal gerekçesi |
| `VehicleMaintenancePlan` | araç, tip, kilometre/tarih eşiği, son bakım, sonraki hedef | aktif → tamamlandı/iptal |
| `VehicleMaintenanceRecord` | araç, plan, tarih, odometre, maliyet, servis, tür | taslak → tamamlandı |

Negatif litre/tutar/odometre, geçersiz tarih ve araç kartı başlangıç
kilometresinin altındaki kayıtlar reddedilir. Aynı aracın odometre geri dönüşü
ve aynı planın tekrar tamamlanması idempotent/çatışma sözleşmesiyle ele alınır.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain çekirdeği | DTO, doğrulama, yaşam döngüsü, maliyet ve odometre kuralları | Saf testler; şema/UI/veri değişmez. |
| 2 — Şema ve repository | Dört additive model, scoped repository ve migration | Backfill yok; yanlış scope sıfır. |
| 3 — Action ve audit | Rol/kapalı dönem guard'ları, transfer ve bakım mutation'ları | Finans/stok/puantaj yan etkisi sıfır. |
| 4 — Filo operasyon UI | Liste/filtre/detay/form, plan uyarısı ve deep-link | Viewer yazamaz; mobil/tema/print kabulü. |
| 5 — İzole gerçek veri ve kapanış | Ayrılmış kabul kaydı, audit/scope/idempotency ve tam kapılar | Faz 8–14/F13 değişmez. |

## 6. Kabul kriterleri

- Yanlış tenant/firma/dönem, kapalı dönem ve yetkisiz rol hiçbir kayıt
  yazmadan reddedilir.
- Tek açık atama, kilometre geriye dönüşü ve tekrar bakım tamamlama denemeleri
  duplicate satır veya audit üretmez.
- Yakıt/bakım tutarları herhangi bir finansal, stok veya puantaj yan etkisi
  üretmez; bu bağlantılar ayrı RFC ile kararlaştırılır.
- UI boş/yükleniyor/hata durumları, klavye odağı, metinli durum işaretleri,
  mobil taşma ve print-safe çıktıyı karşılar.
- Tam kalite kapıları `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 7. Kapsam dışı

Arvento bağlantısı, GPS/telemetri, otomatik puantaj, otomatik yakıt, hırsızlık
alarmı, lastik yönetimi, otomatik bildirim worker'ı, belge/fatura eşleştirme,
gider fişi, stok düşümü, cari/ledger/hakediş maliyet yansıtması ve kurum veya
sağlayıcı entegrasyonu bu RFC'nin dışındadır.

## 8. Uygulama onayı

Faz 15 uygulamasına geçmek için kullanıcı Bölüm 3'teki on varsayımı onaylar.
Onay sonrası yalnız Dilim 1 Domain çekirdeğiyle başlanır; sonraki her dilim
bağımsız kabulden sonra ilerler.

### Onay ve Dilim 1 kapanış kaydı — 28.07.2026

Kullanıcı Bölüm 3'teki on varsayımı onayladı.
`src/lib/vehicle-fleet-operations.ts`; araç ataması, manuel yakıt kaydı,
bakım planı ve bakım kaydı için saf DTO/doğrulama sözleşmelerini; geçerli
takvim tarihi, metin/tutar/odometre sınırlarını, tek açık atama ve bakım
yaşam döngüsü geçişlerini, yakıt/atama idempotency anahtarlarını ve
role/kapalı dönem izin kararını içerir. Yakıt tutarı yalnız hesaplanan
operasyonel değerdir; Prisma şeması, action, UI, finansal/stok/puantaj yan
etkisi ve gerçek veri bu dilimde değişmedi.
`src/lib/vehicle-fleet-operations.test.ts` hedefli paketi 12 testle geçti.

### Dilim 2 kapanış kaydı — 28.07.2026

`VehicleAssignment`, `VehicleFuelRecord`, `VehicleMaintenancePlan` ve
`VehicleMaintenanceRecord` additive Prisma modelleri; tenant/firma/dönem
foreign key'leri, araç foreign key'leri, scope indeksleri ile atama/yakıt ve
bakım tamamlama idempotency anahtarlarıyla eklendi.
`20260728230000_add_vehicle_fleet_operations` migration'ı yerel
`insaatMuhasebe` geliştirme veritabanına başarıyla uygulandı; dört yeni tablo
`0/0/0/0` kaldı, backfill veya mevcut araç kartı değişikliği yapılmadı.
`src/lib/vehicle-fleet-prisma-repository.ts`, dört yüzeyde zorunlu scope ile
overview okuması ve create/update sözleşmesini sağlar; para alanları date-only
ve decimal dönüşümleriyle taşınır. Domain/repository hedefli paketi 15 testle,
Prisma validate ve type-check ile geçti. Server action, audit, UI ve gerçek
araç operasyon kaydı sonraki dilimlere bırakıldı.

### Dilim 3 kapanış kaydı — 29.07.2026

`src/app/actions/vehicle-fleet-actions.ts`, her çağrıda aktif oturum
kapsamını yeniden kurar ve `ensureTenantScope` ile tenant/firma/dönem
önkoşulunu uygular. Yazma aksiyonları viewer ve kapalı dönemi araç/proje/
personel okumalarından önce fail-closed reddeder; araç, proje ve aktif personel
referansları yalnız aktif kapsamda doğrulanır. Araç ataması, kontrollü transfer,
yakıt oluşturma/iptal, bakım planı oluşturma/kapanış ve bakım kaydı
oluşturma/tamamlama ortak service üzerinden merkezi audit'e gider.

Audit metadata yalnız araç/plan/operasyon kimliği, miktar ve durum geçişlerini
taşır; serbest atama/bakım notu, servis ayrıntısı veya finansal belge bilgisi
yazılmaz. Başarılı mutation sonrası `/araclar` ve dinamik module route'u
revalidate edilir. Kasa/banka, stok, bordro, puantaj, cari, ledger ve hakediş
yan etkisi eklenmedi. Domain/repository/service/action hedefli paketi 4 dosya/
25 testle ve type-check ile geçti; UI ve gerçek araç operasyon kaydı sonraki
dilime bırakıldı.

### Dilim 4 uygulama kaydı — 29.07.2026

`src/components/vehicle-fleet-operations-surface.tsx`, mevcut araç kartı
arayüzünü değiştirmeden `/araclar` altında Filo Operasyon Merkezi'ni ekler.
Atama, yakıt, bakım planı ve bakım kaydı ortak liste/arama/tür filtresinde
görünür; her kayıt `/araclar?fleet=<id>` deep-link'i ile erişilebilir
drawer'da açılır. Aktif atama drawer'ı tamamla veya proje/sürücü seçerek
transfer et akışını; diğer uygun kayıtlar yaşam döngüsü aksiyonlarını sunar.

Accounting/admin için etiketli oluşturma formları, aktif scope lookup'ları ve
aktif bakım planını serbest kimlik yerine seçme kontrolü eklendi. Viewer veya
kapalı dönem kullanıcılarında mutation kontrolleri DOM'a alınmaz; sunucu
action guard'ı bağımsız kalır. Tablo mobilde kendi yatay kaydırma kabında,
form/drawer kontrolleri print dışında ve durumlar renk yanında metinle
tanımlıdır. `src/components/vehicle-fleet-operations-surface.test.tsx`,
liste/filtre/deep-link, drawer/transfer, viewer sınırı ve bakım planı seçimini
kapsar; hedefli beş dosya 33 testle, type-check ve lint ile geçti.

Yerel canlı rota oturum gerektirdiğinden tarayıcı kabulü giriş ekranında
durdu; gerçek kayıt, audit veya çapraz modül hareketi yazılmadı. Kimliği
doğrulanmış demo oturumuyla masaüstü/mobil/tema/print görsel kabulü ve izole
gerçek veri sınırı Dilim 5'te birlikte kapatılacaktır.

### Dilim 5 veri kapanış kaydı — 29.07.2026

`tenant-noa-demo` altında ayrılmış `company-f15-kabul-20260729` /
`period-f15-kabul-20260729` kapsamına tek araç, proje ve personel referansıyla
gerçek araç atama transferi, yakıt iptali, bakım planı ve bakım tamamlama
service/repository/audit yolundan işlendi. Son durumda iki atama (`TRANSFERRED`
ve tek `ACTIVE`), bir `CANCELLED` yakıt, bir `COMPLETED` bakım planı ve bir
`COMPLETED` bakım kaydı bulunur; dokuz beklenen merkezi audit aksiyonu vardır.

Atama/yakıt create retry'ları idempotent kaldı; tamamlanmış bakımın tekrar
tamamlanması satır veya audit üretmeden reddedildi. Yanlış firma/dönem/proje
sayımı ile kasa/banka, gider, ledger, bordro, stok ve puantaj yan etkileri
`0` doğrulandı. `npm run fleet:acceptance:verify` ikinci çalışmada aynı sonucu
verir; Faz 11 ve Faz 12 kabul mutabakatları da korundu. Ayrıntı
`Docs/UI-baseline/Faz15-gercek-veri-kapanis-20260729.md` içindedir.

Kimliği doğrulanmış accounting demo oturumunda izole kabul firma/dönemiyle
masaüstü koyu/açık tema, mobil, deep-link drawer ve print sözleşmesi de
doğrulandı. Kabul görünümünde teknik araç kimliği yerine plaka; proje ve
personel için kod-ad etiketleri kullanıldı. Fixture araç kartı uygulamanın
yerleşik `Aktif` statüsüyle yazılır; böylece scope lookup'ına tutarlı biçimde
katılır. Bu kabul ile Faz 15'in görsel kapanışı da tamamlanmıştır.
