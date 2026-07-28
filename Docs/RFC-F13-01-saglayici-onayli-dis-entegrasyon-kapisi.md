# RFC-F13-01 — Sağlayıcı Onaylı Güvenli Dış Entegrasyon Kapısı

> Durum: **Ertelendi — Faz 14 ve iç geliştirmelerden sonra devam edecek**
> Tarih: 28.07.2026
> Kapsam: F2-05 gerçek dış entegrasyonlar için sağlayıcı seçimi, sandbox kabulü ve güvenlik kapısı

## 1. Amaç ve karar sınırı

F2-05, şablonlarda görülen senkronizasyon, eşleştirme ve durum kontrollerinin
gerçek bir dış sağlayıcıyla bağlanabilme ihtiyacını kapsar. Mevcut uygulama,
yanıltıcı bir canlı bağlantı iddiası oluşturmadan sandbox, plan veya simülasyon
sınırlarını görünür tutar.

Bu RFC bir uygulama yetkisi değildir. Sağlayıcı adı, tek ilk operasyon, resmi
sandbox sözleşmesi ve güvenli kimlik bilgisi teslim yöntemi kullanıcı tarafından
onaylanmadan kod, Prisma şeması, dış HTTP çağrısı, credential saklama veya gerçek
veri mutasyonu yapılmaz.

## 2. Mevcut güvenli başlangıç noktası

| Yüzey | Mevcut durum | Bu RFC'nin koruduğu sınır |
|---|---|---|
| Banka / Open Banking | `BankAdapter` ve banka hareketi altyapısı sandbox odaklıdır. | Consent, canlı hesap erişimi ve sağlayıcı çağrısı yoktur. |
| Arvento | Filo görünümü simülasyon/read-model ve credential hazırlık kontrolü kullanır. | Canlı kullanıcı bilgisi, PIN, GPS ya da araç telemetrisi alınmaz. |
| e-Fatura / GİB | Sağlayıcı adapterı yalnız planlanmış durumdadır. | GİB transportu, belge gönderimi ve sorgusu yoktur. |
| Abonelik / ödeme | Yalnız sandbox checkout akışı vardır. | Tahsilat, iade, kart verisi ve ödeme sağlayıcısı çağrısı yoktur. |
| Outbound webhook | Teslim planı ve HMAC taslağı vardır. | Worker, kuyruktan tüketim ve dış HTTP teslimi yoktur. |

Bu sınırlar; tenant/firma/dönem kapsamı, RBAC, `AuditLog`, mevcut demo/E2E
verisi ve tamamlanmış API/e-Fatura/webhook dilimlerinin yeniden açılmaması için
korunur.

## 3. Önerilen uygulama stratejisi

Beş sağlayıcı yüzeyi birlikte etkinleştirilmez. İlk uygulama yalnız **bir
sağlayıcı + bir operasyon + resmi sandbox** kombinasyonudur. Mevcut kodun adapter
ve scoped hareket modeline en yakın başlangıç, resmi sandbox erişimi sağlanırsa
okuma odaklı Open Banking hareket içe aktarımıdır; bu yalnız öneridir ve sağlayıcı
seçimi yerine geçmez.

İlk operasyon; tahsilat, belge gönderimi, araç komutu, canlı webhook teslimi veya
otomatik muhasebe yazımı içermez. Önce idempotent, izlenebilir ve geri alınabilir
bir okuma/önizleme kabulü yapılır. Başarılı kabul sonraki sağlayıcı veya mutasyon
yetkisi anlamına gelmez.

## 4. Onay için önerilen varsayımlar

1. Faz 13, kullanıcı tek bir sağlayıcı ve tek bir ilk operasyon seçmeden başlamaz.
2. İlk kabul yalnız resmi, üretim dışı sandbox/test hesabında yapılır.
3. Sırlar depoya, dokümana, audit kaydına veya düz metin DB alanına yazılmaz; güvenli ortam/secret-store referansı kullanılır.
4. Endpoint, OAuth/consent, imza ve veri sözleşmesi yalnız sağlayıcının resmi güncel dokümanından uygulanır; varsayımsal endpoint üretilmez.
5. İlk bağlantı varsayılan olarak salt-okunur ve idempotenttir; otomatik ledger, abonelik, araç veya belge mutasyonu yapmaz.
6. Her çağrı tenant, firma ve gerekiyorsa dönem kapsamına; rol, feature guard ve açık kullanıcı niyetine bağlanır.
7. Test ve üretim yapılandırması ayrıdır; bir ortamın tokenı, callback'i veya verisi diğer ortama taşınmaz.
8. Audit ve gözlemlenebilirlik yalnız güvenli metadata, sağlayıcı işlem kimliği ve sonuç özeti tutar; token, header ve hassas payload redakte edilir.
9. Outbound webhook worker, GİB transportu, ödeme tahsilatı ve Arvento canlı telemetrisi ayrı seçim/onay olmadan kapsam dışıdır.
10. İlk sürümde kill-switch, elle başlatma ve kontrollü hata raporu zorunludur; canlıya otomatik retry veya otomatik geçiş yapılmaz.

## 5. Kullanıcıdan gerekli girdiler

| Girdi | Neden gerekli |
|---|---|
| Sağlayıcı ve ürün adı | Sözleşme, veri sorumluluğu ve adapter sınırını kesinleştirir. |
| Tek ilk operasyon | Örneğin salt-okunur hareket önizlemesi; kapsamı test edilebilir tutar. |
| Resmi test dokümanı ve sandbox base URL | Endpoint/izin/şema tahmini yapılmasını engeller. |
| Test credential teslim yöntemi | Sırların sohbet, Git ve doküman dışında tutulmasını sağlar. |
| Consent/callback/allowlist gereksinimi | Redirect, IP ve imza akışını doğru tasarlamayı sağlar. |
| Ayrılmış tenant/firma/dönem test kapsamı | Gerçek çalışma verisine temas riskini önler. |
| Sandbox kabul ve gerçek veri yetkisi | Yazmasız test ile ilerideki herhangi bir mutasyon kararını ayırır. |

Credential değeri bu RFC'ye, Git'e, `.env` örneğine veya audit çıktısına
eklenmez. Teslim yöntemi ayrıca kararlaştırılır; test hesabı dahi olsa üretim
secret'i paylaşılmaz.

## 6. Önerilen dar dilimler

| Dilim | Çıktı | Değişiklik sınırı |
|---|---|---|
| 0 — Önkoşul teyidi | Sağlayıcı/operasyon/ortam/onay kaydı | Kod ve şema değişikliği yok. |
| 1 — Domain sözleşmesi | Sağlayıcıdan bağımsız typed request/result, durum ve hata sözleşmesi | Seçilen tek operasyonla sınırlı. |
| 2 — Yapılandırma ve repository | Scoped bağlantı kaydı, secret referansı, feature guard ve audit metadata | Düz metin secret veya ortak canlı credential yok. |
| 3 — Resmi sandbox adapterı | Sağlayıcının doğrulanmış salt-okunur isteği ve safe parser | Canlı endpoint, otomatik retry veya mutasyon yok. |
| 4 — Action ve AppShell UI | Yetkili kullanıcı için açık niyet, durum/sonuç/uyarı ve deep-link | Şablon kontrolü gerçek bağlanmış gibi görünmez. |
| 5 — İzole kabul ve kapanış | Ayrılmış scope, redaksiyon, idempotency, rollback/kill-switch ve tam kalite kapıları | Başka sağlayıcıya genişleme yok. |

Yeni Prisma alanı ancak Dilim 1 sözleşmesi ve Dilim 2 veri yaşam döngüsü
netleştiğinde kararlaştırılır. İlk tercih, secret'in DB'ye yazılması yerine
sağlayıcı yapılandırmasına ait güvenli bir referans tutmaktır.

## 7. Kabul, güvenlik ve geri alma

Kabul için aşağıdakiler birlikte kanıtlanır:

- Resmi sandbox sözleşmesine göre hedefli adapter/repository/action testleri geçer.
- Yanlış tenant/firma/dönem, yetersiz rol, kapalı feature guard ve eksik consent durumları dış çağrı yapmadan reddedilir.
- Tekrar çalıştırma idempotenttir; duplicate hareket, audit veya muhasebe satırı oluşturmaz.
- Hassas token, yetkilendirme header'ı, PIN, kart verisi ve kişisel payload log/audit/UI'a sızmaz.
- Kill-switch etkinleştirildiğinde yeni çağrı başlatılamaz; devam eden sonuç güvenli hata ile sonlanır.
- Tam repo kapıları `npm test`, `npm run type-check`, `npm run db:validate`, `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

Rollback, adapter feature guard'ını kapatmak ve sandbox bağlantı referansını devre dışı
bırakmakla başlar. İlk dilimde otomatik işleyici veya geri dönülmez dış mutasyon
olmadığından, beklenmeyen sonuçta dış sistemde telafi işlemi gerektirecek bir akış
oluşturulmaz.

## 8. Kapsam dışı

Bu RFC; API/e-Fatura/webhook alanlarını genel bir yeniden tasarıma açmaz;
sağlayıcı sayısını çoğaltmaz; gerçek tahsilat, belge gönderimi, GPS toplama,
otomatik muhasebe fişi, canlı webhook worker veya üretim credential geçişi
uygulamaz.

## 9. Uygulama onayı

Uygulamaya geçmek için kullanıcı aşağıdakileri birlikte onaylamalıdır:

1. Bölüm 4'teki on varsayım.
2. Bölüm 5'teki sağlayıcı, tek operasyon, resmi sandbox dokümanı ve ayrılmış test kapsamı.
3. İlk dilimin yalnız resmi sandbox ve salt-okunur kabul olarak kalacağı sınır.

Bu üç onaydan sonra yalnız seçilen sağlayıcı için Dilim 0 ile başlanır; her sonraki
dilim bağımsız kabul ve kalite kapısından sonra ilerler.

### Onay kaydı — 28.07.2026

Kullanıcı, Bölüm 4'teki on varsayımın tamamını onayladı. Bölüm 5'te tanımlı
sağlayıcı/ürün, tek ilk operasyon, resmi sandbox dokümanı ve ayrılmış test
kapsamı henüz seçilmediğinden Dilim 0 başlatılmadı. Bu kayıt dış bağlantı,
credential teslimi, kod, Prisma şeması veya veri değişikliği yetkisi vermez.

### Dilim 0 seçim kaydı — 28.07.2026

Kullanıcı, önerilen başlangıcı onayladı: **Open Banking üzerinden salt-okunur
banka hareketi önizlemesi**. Bu seçim sağlayıcı ailesini ve ilk operasyonu
belirler; henüz bir banka veya Open Banking toplayıcı ürünü seçilmiş sayılmaz.

| Dilim 0 önkoşulu | Durum | Sonraki güvenli adım |
|---|---|---|
| Sağlayıcı ailesi | Onaylandı: Open Banking | Belirli banka/toplayıcı ve ürün adı seçilir. |
| İlk operasyon | Onaylandı: salt-okunur hareket önizlemesi | Sorgu kapsamı ve tarih aralığı resmi sözleşmeye göre netleştirilir. |
| Mevcut proje sınırı | Doğrulandı: `BankAdapter`, scoped repository ve `sandbox` ortam etiketi mevcut | Mevcut sandbox adapterı canlı adapter olarak kullanılmaz. |
| Resmi sandbox sözleşmesi/base URL | Bekliyor | Sağlayıcının güncel resmi dokümanı paylaşılır veya erişime açılır. |
| Test credential teslimi | Bekliyor | Git/doküman dışındaki güvenli teslim yöntemi belirlenir. |
| Ayrılmış tenant/firma/dönem | Bekliyor | Sadece kabul için kullanılacak scope belirtilir. |
| Consent/callback/allowlist | Bekliyor | Sağlayıcı gereksinimine göre uygulanabilirlik kararı verilir. |

Dilim 0, bu açık önkoşullar tamamlanana kadar yalnız mevcut yerel sandbox
sınırının doğrulanması olarak kalır. Dış HTTP çağrısı, schema değişikliği veya
credential işlemi başlatılmaz.

### Öncelik kararı — 28.07.2026

Kullanıcı talebiyle dış sağlayıcı hazırlığı projenin geliştirme kuyruğunun
sonuna alındı. Open Banking salt-okunur önizleme seçimi ve tüm güvenlik
varsayımları korunur; ancak Dilim 0, belirli sağlayıcı/ürün ve resmi sandbox
önkoşulları sağlanana kadar ilerletilmez.
