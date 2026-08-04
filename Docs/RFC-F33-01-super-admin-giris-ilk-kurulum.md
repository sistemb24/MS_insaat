# RFC-F33-01 — Süper Admin Giriş ve Tekil İlk Kurulum

> Durum: Tamamlandı — 02.08.2026
> Tarih: 02.08.2026
> Ana plan: `Docs/NOA-insaat-yeni-modul-gelistirme-plani.md`
> Teknik girdi: `.kiro/specs/super-admin-authentication`

## 1. Amaç

Tenant kullanıcı kimliğine ve mevcut `/giris` akışına dokunmadan, platform
düzeyindeki tek Süper Admin hesabı için güvenli ilk kurulum, giriş, DB destekli
oturum, çıkış ve korumalı minimal çalışma alanı dikeyini tamamlamak.

Bu RFC, geniş Süper Admin authentication belgesinin yalnız giriş ve ilk
kurulum bağımlılık zincirini kapsar. Sonraki şifre sıfırlama, OTP/TOTP, güvenlik
durumu ve bakım modu fazları için çalışır fakat sahte olmayan bir temel bırakır.

## 2. Mevcut durum ve neden sıradaki çalışma

- Faz 32 ile tenant kullanıcı erişimi ve profil yaşam döngüsü tamamlandı; repo
  test, tip, şema, lint ve production build kapıları yeşildir.
- `.kiro/specs/super-admin-authentication/tasks.md` Faz 1'i tamamlandı olarak
  işaretler; canlı kodda ayrı credential/session servisleri, auth kartı,
  `proxy.ts`, giriş formu, şifre gücü ve setup wizard taslakları vardır.
- Prisma şemasında yedi `SuperAdmin*`/platform modeli bulunur fakat bunları
  oluşturan migration yoktur. Mevcut migration sayısı 62'dir.
- `/super-admin/giris`, `/super-admin/ilk-kurulum` ve başarılı giriş hedefi
  `/super-admin` route sayfaları henüz yoktur.
- Gereksinim belgesindeki tenant `AppCredential` kullanımı ile teknik tasarımın
  ayrı `SuperAdminCredential` kararı çelişir. Canlı kod ayrı modeli seçmiştir.
- Setup wizard 2FA'yı “Etkin” gösterebilir ancak TOTP kurulumu bu dilimde
  mevcut değildir; bu durum kullanıcıyı kilitleyebilecek sahte güvenlik
  vaadidir.
- OTP taslağında ham kodun loglanması gibi ileride etkinleşmeden önce
  kapatılması gereken güvenlik borcu vardır.

Bu nedenle yeni fonksiyon eklemekten önce mevcut zemini mutabık ve gerçekten
çalışan küçük bir dikeye dönüştürmek en düşük riskli sıradaki iştir.

## 3. Önerilen varsayımlar

1. Faz 33 yalnız **Süper Admin tekil ilk kurulum → giriş → korumalı minimal
   çalışma alanı → çıkış** dikeyidir; tenant yönetim fonksiyonları açılmaz.
2. Süper Admin kimliği `SuperAdminCredential` ve `SuperAdminSession` başta
   olmak üzere ayrı platform tablolarında kalır. `AppCredential`, `AppSession`,
   `AppUserScopeAccess`, `/giris` ve `noa-session-id` değiştirilmez.
3. Şemadaki mevcut yedi platform modeli, gerekli tekillik alanlarıyla birlikte
   tek additive migration'a alınır. Mevcut 62 migration değiştirilmez veya
   yeniden yazılmaz.
4. Faz 33 sonunda platformda en fazla bir Süper Admin credential bulunabilir.
   Eşzamanlı iki ilk kurulum isteği farklı e-postalarla gelse dahi DB tekilliği
   ikinci kaydı atomik olarak reddeder; yalnız `existsAny()` kontrolüne
   güvenilmez.
5. İlk kurulum ad, normalize e-posta ve güçlü şifreyi server tarafında yeniden
   doğrular; şifre yalnız mevcut PBKDF2 helper'ıyla hash'lenir. Ham şifre,
   session ID, OTP/TOTP secret veya recovery verisi log/audit/URL'de taşınmaz.
6. Başarılı giriş opak `SuperAdminSession.id` değerini
   `noa-super-admin-session` adlı HttpOnly, SameSite=Strict,
   `Path=/super-admin`, production'da Secure cookie'ye yazar. İki saatlik
   hareketsizlik DB kaydıyla doğrulanır; çıkış hem DB session'ını siler hem
   cookie'yi temizler.
7. `proxy.ts` yalnız public path ve cookie varlığı için hızlı ağ sınırıdır.
   Korumalı Server Component ve her korumalı Server Action session'ı DB'den,
   süre ve credential bağlantısıyla yeniden doğrular; proxy tek güvenlik katmanı
   sayılmaz.
8. `returnTo` yalnız tam `/super-admin` veya `/super-admin/...` iç path'lerini
   kabul eder. Protokol, host, `//`, benzer prefix ve auth/bootstrap route'larına
   yönlendirme reddedilir; varsayılan hedef `/super-admin` olur.
9. OTP, TOTP/2FA, şifre sıfırlama, recovery e-posta teslimatı ve bakım modu bu
   fazda etkinleştirilmez. Setup UI bunları etkinmiş gibi göstermez; ham OTP
   loglama kaldırılır. Bu akışlar sonraki bağımsız RFC'lere bırakılır.
10. İzole kabul; ilk kurulum tekilliği, duplicate/race reddi, geçersiz ve
    geçerli giriş, kademeli hesap kilidi, güvenli cookie, süresi dolmuş session,
    çıkış, `returnTo` saldırıları, tenant tablo izolasyonu, secret redaction,
    masaüstü/390 px, açık-koyu tema, klavye ve temiz konsolu doğrular. Gerçek
    e-posta veya dış sağlayıcı çağrısı yapılmaz.

## 4. Mimari kararlar

### 4.1 Kaynak önceliği

Bu dikeyde karar önceliği:

1. Kullanıcı tarafından onaylanan bu RFC,
2. canlı Prisma şeması ve çalışan tenant izolasyon sözleşmeleri,
3. `.kiro/specs/super-admin-authentication/design.md`,
4. çelişmeyen gereksinim ve görev maddeleri

şeklindedir. Tenant `AppCredential/AppSession` kullanımı öneren eski maddeler
uygulanmaz; ayrı platform modeli kararı korunur.

### 4.2 Tekil bootstrap

`SuperAdminCredential` yalnız e-posta tekilliğine değil platform singleton
anahtarına da sahip olur. İlk kurulum repository'si tek transaction içinde
tekillik ihlalini güvenli domain sonucuna dönüştürür. Başarısız yarışta kısmi
credential, session veya güvenlik kaydı kalmaz.

### 4.3 Oturum ve koruma

Cookie yalnız opak kimlik taşır. Korumalı `/super-admin` sayfası session'ı DB
kaynağından doğrular, süresi dolmuş/geçersiz kaydı temizler ve girişe güvenli
`returnTo` ile yönlendirir. Başarılı doğrulama `lastActiveAt` ve kayar
`expiresAt` davranışını tek repository sözleşmesiyle günceller.

### 4.4 İlk çalışma alanı

Başarılı girişin 404'e düşmemesi için `/super-admin` altında yalnız kimlik,
oturum süresi ve çıkış aksiyonunu gösteren minimal korumalı çalışma alanı açılır.
Tenant listeleme, firma değiştirme, bakım yönetimi veya kullanıcı impersonation
eklenmez.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Şema ve Mevcut Zemin Mutabakatı | Ayrı platform modelleri, singleton kararı, additive migration ve çelişen taslakların güvenli kapatılması | Tenant auth modelleri ve eski migration'lar değişmez. |
| 2 — Repository ve Auth Service | Atomik bootstrap, credential/session doğrulama, kilit sıfırlama/tırmanma ve secret redaction | OTP/TOTP veya e-posta teslimatı açılmaz. |
| 3 — Server Action, Session ve Proxy | Giriş/çıkış/setup action'ları, DB session guard'ı, güvenli cookie ve sıkı `returnTo` | Proxy tek başına yetkilendirme yapmaz. |
| 4 — Giriş, Kurulum ve Minimal UI | `/super-admin/giris`, `/super-admin/ilk-kurulum`, `/super-admin` deep-link ve erişilebilir responsive yüzey | Tenant yönetim dashboard'u eklenmez. |
| 5 — İzole Gerçek Veri ve Kapanış | Tekillik/race, login/session/logout, izolasyon, güvenlik ve canlı UI kabulü | Gerçek dış sağlayıcı kullanılmaz. |

## 6. Kabul kriterleri

- Migration boş veritabanında ve mevcut NOA veritabanında uygulanabilir.
- İkinci Süper Admin farklı e-posta ile dahi oluşturulamaz.
- Kurulum tamamlandıktan sonra bootstrap route'u giriş sayfasına yönlenir.
- Bilinmeyen e-posta ve yanlış şifre aynı genel kullanıcı mesajını üretir.
- Başarısız denemeler kilit politikasına uyar; başarılı giriş aktif sayacı
  güvenli biçimde sıfırlar.
- Cookie değeri dışında hassas kimlik verisi istemciye taşınmaz.
- Süresi dolmuş, silinmiş veya başka credential'a bağlı session kabul edilmez.
- Çıkıştan sonra eski cookie/session ile korumalı sayfa açılamaz.
- Kötü niyetli `returnTo` değeri harici veya benzer-prefix route'a gidemez.
- Tenant credential, session, erişim, finans, ledger ve doküman kayıtları
  değişmez.
- UI 320–2560 px aralığında taşmasız; açık/koyu tema, klavye, hata duyurusu ve
  temiz konsol kabulünü geçer.
- Tam kalite kapıları yeşildir.

## 7. Kapsam dışı

Şifre sıfırlama, gerçek e-posta/SMTP, OTP teslimatı, TOTP/2FA kurulumu, yedek
kodlar, recovery e-posta işlemi, bakım modu, tenant/firma yönetimi, kullanıcı
impersonation, global platform audit merkezi, SSO/SCIM, public API ve dış
sağlayıcı entegrasyonu kapsam dışıdır.

## 8. Onay kapısı

Uygulama, Bölüm 3'teki on varsayım kullanıcı tarafından onaylandıktan sonra
**Faz 33 Dilim 1 — Şema ve Mevcut Zemin Mutabakatı** ile başlayacaktır. Onay
öncesinde Prisma şeması, migration, super-admin gerçek verisi veya auth
davranışı değiştirilmez.

## 9. Kapanış kaydı

Kullanıcı on varsayımı ve Faz 33'ün bütün dilimlerini 02.08.2026 tarihinde
onayladı. Beş dilim tamamlandı; ayrıntılı gerçek veri, güvenlik ve UI kanıtı
`Docs/UI-baseline/Faz33-gercek-veri-kapanis-20260802.md` dosyasındadır.
