# Faz 35 Dilim 3 — Production Güvenlik Tabanı

Tarih: 04.08.2026

## Kapanış sonucu

- Production başlangıç env sözleşmesi fail-closed hale getirildi.
- Global CSP ve browser security header'ları Next.js 16.2.9 yerel
  `next.config` `headers()` sözleşmesiyle eklendi.
- Tenant login brute-force sınırı PostgreSQL'de atomik, çoklu-instance uyumlu
  fixed-window sayaç olarak uygulandı.
- Tenant session politikası sekiz saat absolute, sliding olmayan ve scope
  geçişinde kimliği dönen typed sözleşme olarak sabitlendi.
- Production `db:seed` ve `db:push` komutları resmi npm hattında hard-stop oldu.
- Süper Admin Faz 34 auth, challenge ve rate-limit modeli değiştirilmedi.

## Veri ve güvenlik sınırı

66. additive migration `TenantLoginRateLimitBucket` tablosunu ekler. Kimlik ve
güvenilen proxy IP değeri SHA-256 ile özetlenir; ham e-posta, IP, parola veya
session kimliği bucket'a yazılmaz. Sayaç beş deneme/15 dakika sınırını e-posta
başına ve `NOA_TRUST_PROXY=true` olduğunda geçerli ilk proxy IP'si başına uygular.
Proxy güveni kapalıysa spoof edilebilir forwarding header'ı kullanılmaz.

Production env kapısı HTTPS `APP_BASE_URL`, uzak PostgreSQL URL'si, mutlak yerel
doküman dizini ve açık proxy kararını ister. Provider secret'ları provider'lar
kapalıyken zorunlu değildir; tanımlanırlarsa güvenli biçim doğrulaması geçmek
zorundadır. Yerel doküman dizini tek-instance kabulüdür; object storage seçimi
external blocker olarak açık kalır.

## Kabul kanıtı

- Hedefli test: 6 dosya, 21 test PASS.
- Tam test: 343 dosya, 1.848 test PASS.
- `npm run type-check`: PASS.
- `npm run db:validate`: PASS.
- `npm run lint`: PASS, uyarı yok.
- `npm run build`: PASS, 102 route.
- `npm run db:generate`: PASS.
- `npm run db:migrate`: PASS; 66 migration güncel.
- Production env örnek doğrulaması: PASS.
- Production `db:seed` ve `db:push` negatif kabulü: ikisi de işlem öncesi BLOCK.
- Browser: altıncı hatalı tenant login denemesi
  `/giris?error=rate-limit` ve tek açıklayıcı hata bildirimi ile sonuçlandı.
- HTTP: development yanıtında CSP, `DENY`, `nosniff` ve referrer policy görüldü;
  HSTS yalnız production header setinde test edildi.

## Rollback

Uygulama rollback'inde login action rate-limit çağrısı, env prestart ve header
konfigürasyonu birlikte geri alınır. Additive bucket tablosu eski kodu etkilemez
ve veri kaybı riski olmadan yerinde bırakılabilir; fiziksel drop ayrı onaylı
migration gerektirir. Mevcut migration dosyaları değiştirilmez.
