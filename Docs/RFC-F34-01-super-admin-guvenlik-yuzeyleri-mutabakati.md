# RFC-F34-01 — Süper Admin Güvenlik Yüzeyleri Mutabakatı

> Durum: Onaylandı ve tamamlandı
> Tarih: 03.08.2026
> Ana plan: `Docs/NOA-insaat-yeni-modul-gelistirme-plani.md`
> Teknik girdi: `.kiro/specs/super-admin-authentication`

## 1. Amaç

Faz 33 ile onaylanan tekil ilk kurulum, giriş, DB session ve çıkış dikeyini
koruyarak; çalışma ağacına sonradan eklenen şifre sıfırlama, OTP/TOTP ve
güvenlik durum yüzeylerini üretimde yanlışlıkla etkinleşmeyecek, secret
sızdırmayacak ve ileride gerçek sağlayıcıya bağlanabilecek güvenli bir
sözleşmeye oturtmak.

Bu faz yeni Süper Admin panel operasyonları açmaz. Panel dashboard'u, tenant,
kullanıcı, abonelik, destek, rapor ve ayar sayfaları ayrı bir Faz 35 RFC'sinde
repository, yetki, audit ve veri minimizasyonu bakımından ele alınacaktır.

## 2. Mevcut durum ve zorunlu mutabakat

- Ana plan Faz 33'te kapanmıştır; genişletilmiş auth ve panel sayfaları için
  onaylanmış Faz 34/35 kaydı yoktur.
- `.kiro` görevleri Faz 3–6'yı tamamlandı gösterse de bu dosya ana planın ve
  kullanıcı onayının yerine geçmez.
- Reset servisi ham sıfırlama tokenını, OTP servisi ham kodu loglamaktadır.
- Rate-limit yalnız process belleğindeki `Map` ile tutulur; çoklu instance veya
  restart durumunda güvenlik sınırı değildir.
- Proxy yalnız giriş ve ilk kurulumu public kabul ettiği için şifremi unuttum,
  reset, OTP, 2FA ve kilit sayfalarının önemli bölümü tasarlandığı akıştan
  erişilemez.
- Pending OTP/2FA cookie taslağı credential kimliğini taşıyabilir; opak ve
  sunucuda doğrulanan challenge kaydı yoktur.
- TOTP secret'ı şifresiz saklanır; backup code doğrulaması düz metin kaydı da
  kabul eder.
- Kilit sayfası süre, deneme ve IP bilgisini query parametresinden alır; DB
  gerçeğini doğrulamaz.
- Bakım ekranı DB `MaintenanceConfig` kaydını okumaz ve sahte `#` bağlantıları
  gösterir.
- Hedefli lint şu an OTP effect'i nedeniyle hata, iki kullanılmayan değişken
  nedeniyle uyarı üretmektedir. Type-check geçmektedir; production build'in
  bu incelemedeki başarısızlığı sandbox ağında Google Fonts'a erişememekten
  kaynaklanmıştır ve kod kabulü sayılmamıştır.

## 3. Önerilen 10 varsayım

1. Faz 34 yalnız **genişletilmiş auth güvenlik yüzeylerinin mutabakatı ve
   karantinası**dır. Faz 33'ün tekil bootstrap, giriş, session ve çıkış
   davranışı korunur; Süper Admin panel operasyonları açılmaz.
2. Gerçek e-posta/SMS sağlayıcısı hazır olmadığı için parola sıfırlama ve
   e-posta/SMS OTP akışları runtime'da etkinleştirilmez. Sağlayıcıdan bağımsız
   delivery port'u tanımlanebilir; adapter yoksa token/kod üretilmez ve dış
   çağrı varmış gibi başarı iddiası gösterilmez.
3. Ham parola, reset tokenı, OTP, TOTP secret, backup code, session veya
   challenge kimliği log, audit, hata, query parametresi ya da genel metadata
   içine yazılmaz. Testler yalnız process-içi fake adapter ile plaintext
   round-trip yapabilir.
4. Public route matrisi merkezi ve fail-closed olur. Giriş/ilk kurulum dışındaki
   route yalnız ilgili özellik gerçekten etkin ve gerekli opak challenge
   doğrulanmışsa açılır; prefix benzerliği veya cookie varlığı yetki sayılmaz.
5. Birinci faktör sonrası OTP/2FA geçişi credential ID taşıyan cookie yerine
   kısa ömürlü, tek kullanımlık, DB destekli opak challenge kullanır. Challenge
   amaç, süre, deneme sayısı ve tüketim durumuna bağlı doğrulanır.
6. Parola sıfırlama; hash'li tek kullanımlık token, süre, replay/race reddi,
   password update, token `usedAt` ve tüm Süper Admin session'larını iptal
   etmeyi tek transaction'da tamamlar. E-posta var/yok sonucu dışarıdan ayırt
   edilemez.
7. Rate-limit production'da process belleğine bağlı kalmaz. Reset, OTP resend
   ve doğrulama denemeleri DB tabanlı pencere/bucket ile atomik izlenir;
   in-memory sürüm yalnız unit test fake'i olur.
8. TOTP ancak oturum açmış Süper Admin'in ayrı enrollment akışında etkinleşir.
   Secret uygulama anahtarıyla sürümlü biçimde şifrelenir, backup code'lar
   yalnız hash saklar ve ilk kod doğrulanmadan `is2FAEnabled=true` olmaz.
   Şifreleme anahtarı yoksa enrollment fail-closed kalır.
9. Kilit ve oturum-doldu yüzeyleri query'den güvenlik gerçeği kabul etmez;
   sunucuda DB kaydı/challenge doğrular. IP yalnız maskelenmiş ve gerektiği
   kadar gösterilir. Bakım modu bu fazda public edilmez ve ayrı operasyon
   RFC'sine bırakılır.
10. İzole kabul; secret kaynak taraması, public-route matrisi, challenge
    replay/expiry, reset transaction rollback, DB rate-limit, TOTP enrollment,
    backup code tek kullanımı, session revoke, tenant izolasyonu, 320/390 px,
    açık-koyu tema, klavye, temiz konsol ve tam repo kapılarını doğrular. Gerçek
    dış sağlayıcı çağrısı yapılmaz.

## 4. Mimari kararlar

### 4.1 Kaynak önceliği

Karar sırası: kullanıcı tarafından onaylanacak bu RFC, Faz 33 sözleşmesi,
canlı Prisma/route yapısı, `.kiro` tasarım ve görevleri. `.kiro` içindeki
tamamlandı işaretleri tek başına ürün kabulü değildir.

### 4.2 Runtime özellik matrisi

Auth özellikleri tek server-only sözleşmeden okunur. Delivery adapter ve
şifreleme anahtarı bulunmayan özellikler UI, action ve proxy katmanlarında
birlikte kapalıdır. İstemci ortam değişkeni güvenlik kararı vermez.

### 4.3 Kalıcı challenge ve rate-limit

Gerekli challenge/bucket modelleri mevcut 63 migration'a dokunmadan tek yeni
additive migration ile eklenir. Kimlikler rastgele ve opaktır; credential
ilişkisi yalnız DB'de kalır. Mutation'lar transaction ve koşullu update ile
replay/race'e dayanıklı olur.

### 4.4 Delivery sınırı

Gerçek sağlayıcı bu fazda seçilmez. Port; reset bağlantısı veya OTP teslimini
temsil eder fakat production adapter yoksa domain işlemi secret üretmeden
`unavailable` sonucuna döner. Unit/acceptance fake'i mesajı process belleğinde
tutar ve hiçbir çıktı/log üretmez.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Route ve Secret Karantinası | Merkezi feature/route matrisi, ham logların kaldırılması, sahte aktiflik iddialarının kapanması, lint borçlarının temizliği | Faz 33 login/session davranışı değişmez. |
| 2 — Challenge ve Rate-limit Şeması | Opaque challenge ve kalıcı rate-limit modelleri, additive migration, repository | Eski migration'lar ve tenant auth tabloları değişmez. |
| 3 — Reset/TOTP Domain Güvenliği | Transactional reset sözleşmesi, şifreli TOTP, hash backup code, fake delivery port | Gerçek e-posta/SMS adapter'ı eklenmez. |
| 4 — Action, Proxy ve Güvenlik UI | Server doğrulamalı action'lar, fail-closed proxy/page guard, gerçek duruma bağlı UI | Bakım modu ve panel mutasyonları açılmaz. |
| 5 — İzole Gerçek Veri ve Kapanış | Replay/race, rate-limit, session revoke, izolasyon, UI ve tam kapılar | Dış sağlayıcı çağrısı yapılmaz. |

## 6. Kabul kriterleri

- Repo kaynaklarında ham reset tokenı/OTP/TOTP/backup code logu bulunmaz.
- Delivery/crypto yapılandırması yokken ilgili özellikler fail-closed kalır.
- Public route'lar merkezi sözleşmeyle exact path olarak sınırlandırılır.
- Pending ikinci faktör cookie'si credential ID veya secret taşımaz.
- Challenge yanlış amaç, expiry, replay ve deneme sınırında reddedilir.
- Reset transaction'ı token tüketimi, şifre değişimi ve session revoke'u atomik
  tamamlar; zorlanmış hatada hiçbir kısmi değişiklik kalmaz.
- Rate-limit process restartından bağımsız DB gerçeğidir.
- TOTP secret düz metin saklanmaz; backup code yalnız hash olarak ve tek
  kullanımlık tutulur.
- Kilit ekranı query parametrelerini güvenlik kaynağı olarak kullanmaz.
- Tenant credential/session, finans, ledger ve doküman kayıtları değişmez.
- Tam test, type-check, Prisma validate, lint, build ve diff kapıları yeşildir.

## 7. Kapsam dışı

Gerçek SMTP/e-posta/SMS sağlayıcısı, provider sandbox kurulumu, bakım modu
operasyonu, tenant/firma/kullanıcı/abonelik yönetimi, Süper Admin panel
mutasyonları, impersonation, platform audit merkezi, SSO/SCIM ve public API
bu fazda açılmaz.

## 8. Onay kapısı

Bölüm 3'teki 10 varsayım kullanıcı tarafından onaylandı. Beş uygulama dilimi
03.08.2026 tarihinde tamamlandı. 64. additive migration, merkezi exact public
route matrisi, opak DB challenge, kalıcı rate-limit, adapter'sız reset
karantinası, transaction reset sözleşmesi ve şifreli TOTP domain'i uygulandı.
İzole gerçek veri kabulü `PASS` verdi; gerçek dış sağlayıcı çağrısı yapılmadı.
Ayrıntı `Docs/UI-baseline/Faz34-gercek-veri-kapanis-20260803.md` içindedir.
