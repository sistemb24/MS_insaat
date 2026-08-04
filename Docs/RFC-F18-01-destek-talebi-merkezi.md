# RFC-F18-01 — Destek Talebi Merkezi

> Durum: **Tamamlandı — Dilim 5 İzole Gerçek Veri ve Kapanış**
> Tarih: 30.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-moduller-genisletme-plani.md` Bölüm 9.4,
> 9.8 ve 17.3

## 1. Amaç

NOA'ya, kullanıcıların uygulama içinden destek talebi açıp yazışma geçmişini
izleyebileceği; tenant yöneticilerinin talepleri sınıflandırıp kontrollü yaşam
döngüsüyle sonuçlandırabileceği ilk Destek Merkezi dikeyi eklenir.

Bu ilk sürüm, NOA/Parsek platform operatörüyle canlı destek veya dış çağrı
merkezi varmış gibi davranmaz. Mevcut rol modeli değiştirilmeden tenant içi
destek masası kurulur. İleride platform operatörü, e-posta veya harici helpdesk
bağlantısı gerekiyorsa ayrı RFC ile eklenir.

## 2. Mevcut altyapıyla uyum

Çalışma; mevcut `TenantScope`, oturum, kullanıcı, merkezi `AuditLog`, AppShell,
modal/drawer, deep-link ve responsive tablo standartlarını yeniden kullanır.
Yeni kimlik doğrulama sistemi, ayrı bildirim worker'ı veya ikinci doküman
depolama sistemi oluşturulmaz.

| İhtiyaç | Faz 18 ilk karşılığı | Sınır |
|---|---|---|
| Talep açma | Scoped `SupportTicket` | Harici destek sistemine gönderim yok. |
| Yazışma | Append-only `SupportTicketMessage` | E-posta/SMS/chat teslimi yok. |
| Takip | Durum, tür, öncelik, son yanıt zamanı | SLA veya otomatik eskalasyon yok. |
| Yönetim | Tenant admin için durum geçişi | Platform operatörü rolü yok. |
| Görünürlük | Kişinin kendi talepleri; admin için kapsam geneli | Tenantlar arası ortak destek havuzu yok. |

## 3. Önerilen varsayımlar

1. Faz 18 ilk sürümü tenant içi destek talebi yönetimidir; NOA platform
   operatörü, canlı sohbet, telefon desteği veya dış helpdesk bağlantısı
   varmış gibi gösterilmez.
2. Her talep ve mesaj tenant/firma/dönem kapsamı ile requester kullanıcı
   kimliğini taşır; başka tenant veya kapsamdan kayıt okunamaz ve bağlanamaz.
3. `SupportTicket` ve `SupportTicketMessage` additive Prisma modelleriyle
   eklenir; mevcut kullanıcı, bildirim, abonelik, doküman veya audit verisine
   backfill yapılmaz.
4. Tüm doğrulanmış kullanıcılar kendi destek taleplerini açabilir, okuyabilir
   ve açık taleplerine mesaj ekleyebilir. Bu, `viewer` rolünün finans/operasyon
   mutasyon yasağını gevşetmeyen yalnız destek alanına özgü açık istisnadır.
5. Yalnız `admin`, aktif kapsamın tüm taleplerini görebilir ve
   `OPEN → IN_PROGRESS → RESOLVED → CLOSED` ileri durum geçişlerini yönetir.
   `accounting` ve `viewer` yalnız kendi taleplerini görür; başkasının talebini
   yönetemez.
6. Talep türleri ilk sürümde `TECHNICAL`, `ACCOUNT`, `BILLING` ve `SUGGESTION`;
   öncelikler `LOW`, `NORMAL`, `HIGH` olarak sınırlıdır. Acil güvenlik/sağlık
   ihbarı veya hukuki SLA kararı bu modülden verilmez.
7. Talep oluşturma ve mesaj ekleme kullanıcı tarafından üretilen request key
   ile idempotenttir. Mesajlar append-only'dir; düzenleme, silme ve dosya eki
   ilk sürümde yoktur.
8. Merkezi audit yalnız işlem, güvenli durum geçişi, tür/öncelik ve operasyon
   kimliklerini taşır; konu, mesaj gövdesi, e-posta, ek veya hassas destek
   içeriği metadata'ya yazılmaz.
9. UI `/destek-merkezi` altında sayaçlar, arama/durum/tür filtresi, yeni talep
   formu ve `/destek-merkezi?ticket=<id>` detay/yazışma deep-link'i sağlar;
   erişilebilirlik, mobil taşma, tema ve print standartları korunur.
10. İlk gerçek kabul yalnız ayrılmış test tenant/firma/döneminde çalışır;
    Faz 8–17 kabul kayıtları ve sağlayıcı bekleyen Faz 13 sınırı değişmez.

## 4. Veri yaşam döngüsü ve erişim

| Varlık | Temel alanlar | Yaşam döngüsü |
|---|---|---|
| Destek talebi | requester, konu, tür, öncelik, durum, son yanıt | `OPEN → IN_PROGRESS → RESOLVED → CLOSED` |
| Destek mesajı | talep, yazar, gövde, oluşturulma zamanı | append-only |

Talep veya mesaj fiziksel olarak silinmez. `CLOSED` talebe yeni mesaj
eklenemez; yeniden açma ilk sürümde yoktur. Requester kendi talebini
görüntüler; admin aktif scope içindeki tüm talepleri görebilir. Arama ve
listeleme hiçbir koşulda tenant/firma/dönem sınırını genişletmez.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain çekirdeği | DTO, metin/tür/öncelik/durum, izin ve idempotency kuralları | Saf testler; şema/UI/veri değişmez. |
| 2 — Şema ve repository | İki additive model, scoped/owner-aware repository ve migration | Backfill yok; yanlış scope/owner sıfır. |
| 3 — Server Action ve audit | Oturum/rol/owner guard'ları, create/reply/transition ve güvenli audit | İçerik metadata'ya sızmaz; fail-closed. |
| 4 — Destek Merkezi UI | Sayaç, filtre, form, konuşma drawer'ı ve deep-link | Mobil/tema/print; owner/admin sınırı. |
| 5 — İzole gerçek veri ve kapanış | Ayrılmış requester/admin kabulü, audit/idempotency ve tam kapılar | Faz 8–17/F13 değişmez. |

## 6. Kabul kriterleri

- Yanlış tenant/firma/dönem veya requester, talep ve mesajı okuyamaz ya da
  değiştiremez.
- `viewer` kendi destek talebini açabilir ancak finans/operasyon yazma yetkisi
  kazanmaz; başka talep göremez.
- Aynı request key ikinci talep, mesaj veya audit üretmez.
- Geçersiz/geri durum geçişi ve kapalı talebe mesaj yazımı kalıcı değişiklik
  olmadan reddedilir.
- Audit konu veya mesaj içeriği taşımaz.
- UI; boş/yükleniyor/hata durumları, klavye odağı, renkten bağımsız durumlar,
  390 px mobil taşma ve print-safe çıktıyı karşılar.
- Tam kalite kapıları `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 7. Kapsam dışı

NOA platform operatörü konsolu, gerçek zamanlı chat/websocket, e-posta/SMS,
otomatik bildirim, dosya yükleme, Doküman Merkezi eki, SLA/mesai hesabı,
otomatik atama/eskalasyon, yapay zekâ yanıtı, abonelik ücret/iadeleri, dış
Zendesk/Freshdesk/Jira bağlantısı ve tenantlar arası ortak destek havuzu bu
RFC'nin dışındadır.

## 8. Uygulama onayı

Faz 18 uygulamasına geçmek için kullanıcı Bölüm 3'teki on varsayımı onaylar.
Onay sonrası yalnız Dilim 1 Domain çekirdeğiyle başlanır; her sonraki dilim
bağımsız kabulden sonra ilerler.

### Onay ve Dilim 1 kapanış kaydı — 30.07.2026

Kullanıcı Bölüm 3'teki on varsayımı onayladı. `support-ticket` saf domain
sözleşmesi; talep ve append-only mesaj DTO'larını, konu/mesaj/request-key
sınırlarını, tür/öncelik/durum doğrulamasını ve içerik taşımayan deterministic
idempotency anahtarlarını tek kaynakta toplar. Tüm doğrulanmış roller talep
açabilir; `accounting` ve `viewer` yalnız kendi taleplerini, `admin` aktif
kapsamın tamamını görür. Yalnız admin ileri durum geçişi yapabilir; yaşam
döngüsü `OPEN → IN_PROGRESS → RESOLVED → CLOSED` sırasıyla ilerler ve kapalı
talebe yanıt eklenemez. Eksik veya geçersiz durumla yanıt yetkisi fail-closed
reddedilir.

Bu dilimde Prisma şeması, migration, repository, Server Action, audit, UI veya
gerçek veri değiştirilmedi. Sonraki bağımsız dilim **Şema ve Repository**'dir.

### Dilim 2 kapanış kaydı — 30.07.2026

`SupportTicket` ve `SupportTicketMessage` additive Prisma modelleri
`20260730150000_add_support_ticket_center` migration'ıyla eklendi ve yerel
geliştirme veritabanına uygulandı. Her iki model tenant/firma/dönem kapsamını
taşır. Talep ve mesaj request key'leri kapsam içinde tekildir; mesajın bileşik
foreign key'i üst talep ile aynı tenant, firma ve dönemde kalmasını veritabanı
seviyesinde de zorunlu kılar. Mevcut destek veya kullanıcı verisine backfill
yapılmadı.

`support-ticket-prisma-repository`; scope-wide admin ve requester-only
görünürlüğünü ayrı sorgu sözleşmeleriyle uygular. Mesaj okumaları hem kendi
scope alanları hem üst talebin owner koşuluyla filtrelenir. Talep ile ilk mesaj
tek nested create içinde yazılır; eşleşmeyen talep/scope kimliği fail-closed
reddedilir. Mesaj güncelleme veya silme metodu yoktur. Talep güncellemesi yalnız
durum, son mesaj zamanı ve güncelleyen bilgisine açıktır; aktif scope dışında
güncelleme yapılamaz.

Bu dilimde Server Action, audit, UI veya gerçek veri eklenmedi. Sonraki bağımsız
dilim **Server Action ve Audit**'tir.

### Dilim 3 kapanış kaydı — 30.07.2026

`support-ticket-service`; aktif scope doğrulamasını, requester/admin
görünürlüğünü, idempotent talep ve yanıt oluşturmayı, kapalı talep reddini ve
yalnız admin için ileri durum geçişini tek iş akışında toplar. Talep sahibi
kimliği client girdisinden alınmaz; doğrulanmış aktif oturumun kullanıcı
kimliğiyle sunucuda damgalanır. `viewer` dahil tüm doğrulanmış roller yalnız
destek alanında, kapalı dönemde de kendi taleplerini açıp açık taleplerine yanıt
verebilir; bu istisna başka finans veya operasyon mutasyonuna taşınmaz.

`support-ticket-actions`, yerel Next.js 16 güvenlik sözleşmesine uygun olarak
her doğrudan POST çağrısında aktif oturumu ve tenant scope'u yeniden çözer.
Liste/thread okumaları owner-aware repository görünürlüğünü kullanır. Talep ve
ilk mesaj tek nested create, sonraki mesaj ile `lastMessageAt` güncellemesi tek
atomik repository işlemi içinde yazılır. Başarılı mutasyonlar
`/destek-merkezi` ile dinamik module sayfasını revalidate eder.

Merkezi audit yalnız işlem adı, entity/ticket kimliği, tür, öncelik ve güvenli
durum geçişlerini taşır. Konu, mesaj gövdesi ve kullanıcı request key'i
metadata veya entity label'a yazılmaz. İdempotent tekrar ikinci mutation veya
audit üretmez. Bu dilimde UI ve gerçek kabul verisi eklenmedi. Sonraki bağımsız
dilim **Destek Merkezi UI**'dır.

### Dilim 4 kapanış kaydı — 30.07.2026

`/destek-merkezi`, mevcut AppShell ve ortak UI tokenları içinde Faz 18'in
tenant içi destek yüzeyine dönüştürüldü. Sayaçlar, konu/tür/durum araması,
durum ve tür filtreleri, etiketli yeni talep formu, yerel yatay kaydırmalı
tablo ve erişilebilir detay çekmecesi eklendi. Talep ayrıntısı
`/destek-merkezi?ticket=<id>` deep-link'iyle açılır; yazışmalar append-only
gösterilir ve kapalı talepte yanıt formu yerine açıklayıcı kapanış durumu
sunulur.

UI yetki görünürlüğü domain/action kararlarını gevşetmez. Requester kendi
talebini açıp açık talebine yanıt verebilir; yalnız admin sıradaki ileri durum
geçişini görür. Boş, yükleniyor ve hata durumları; klavye ile kapatma, mobil
tek kolon, renkten bağımsız etiketler ve print sözleşmesi uygulandı. Destek
Merkezi AppShell navigasyonuna ve module content kaynağına eklendi.

### Dilim 5 kapanış kaydı — 30.07.2026

Kullanıcının Faz 18'in kalan dilimleri için verdiği kesintisiz onay kapsamında
ayrılmış `company-f18-kabul-20260730` /
`period-f18-kabul-20260730` scope'unda gerçek Prisma kabulü tamamlandı.
Requester ve admin oturumlarıyla oluşturulan iki talep ile dört mesaj, ardışık
çalıştırmalarda aynı kaldı; durumlar `RESOLVED` ve `CLOSED`, audit toplamı 9
oldu. Yanlış scope, başka requester ve kapalı talebe yanıt fail-closed
reddedildi. Audit konu, mesaj veya request key taşımadı; finans, stok, bordro,
puantaj ve yevmiye yan etkileri sıfır kaldı.

Gerçek kabul sırasında nested mesaj yazımında bileşik ilişkinin zaten sağladığı
scope alanlarının tekrar gönderilmesi Prisma tarafından reddedildi. Repository
yalnız ilişki dışı mesaj alanlarını yazacak şekilde düzeltildi ve regresyon
testi eklendi. Yönetici ve requester deep-link'leri; 1440×900 açık/koyu tema,
390×844 mobil, kapalı talep, yerel tablo taşması, print sınıfları ve boş konsol
ile doğrulandı. Faz 8/11/12 ve Faz 14–17 kabul komutları yeniden geçti.

Tam kapılar 260 dosya / 1518 test, type-check, Prisma validate, 50 migration
durumu, lint, 76 sayfalık production build ve `git diff --check` ile yeşildir.
Ayrıntı `Docs/UI-baseline/Faz18-gercek-veri-kapanis-20260730.md` içindedir.
Faz 18 tamamlandı.
