# Faz 33 — İzole Gerçek Veri ve Kapanış

Tarih: 02.08.2026
RFC: `Docs/RFC-F33-01-super-admin-giris-ilk-kurulum.md`

## Tamamlanan dikey

- `SuperAdminCredential` için platform singleton anahtarı ve yedi ayrı platform modeli 63. additive migration ile kalıcılaştırıldı.
- İlk kurulum server doğrulaması, PBKDF2 hash, duplicate/race dönüşümü ve tek kullanımlık bootstrap route kapanışı tamamlandı.
- Girişte genel credential hatası, kademeli kilit, başarılı girişte kilit temizliği ve opak DB session üretimi uygulandı.
- `noa-super-admin-session` cookie'si HttpOnly, SameSite Strict, `/super-admin` path, production Secure ve iki saatlik süreyle sınırlandı.
- Server Component guard session/credential bağlantısını ve süreyi DB'den doğrular; geçerli kullanımda kayar süreyi yeniler. Çıkış DB kaydını ve cookie'yi temizler.
- Proxy yalnız hızlı cookie varlığı kontrolü yapar. `returnTo` yalnız `/super-admin` sınırında, auth/bootstrap hedefleri hariç kabul edilir.
- `/super-admin/giris`, `/super-admin/ilk-kurulum` ve korumalı `/super-admin` çalışma alanı responsive ve erişilebilir olarak tamamlandı.
- OTP/TOTP, parola sıfırlama, recovery e-postası, bakım modu ve dış sağlayıcı akışları etkinleştirilmedi; ham secret/OTP logu bulunmaz.

## Gerçek veri kabulü

`npm run super-admin:acceptance:verify` sonucu `PASS`:

- Farklı e-postalarla eşzamanlı bootstrap: 1 kabul, 1 DB singleton reddi.
- Bilinmeyen e-posta ve yanlış şifre: aynı genel sonuç.
- Dört hatadan sonra başarılı giriş: lock kaydı temizlendi.
- Beş hata sonrası yeni giriş: hesap kilitli sonucu.
- Geçerli DB session guard: credential bağlantısı doğrulandı ve süre uzatıldı.
- Süresi geçmiş session: reddedildi ve silindi.
- Tenant credential/session, doküman ve ledger sayıları değişmedi.
- Ham şifre DB kaydı veya kabul çıktısında yer almadı.

Kabul scripti gerçek platform verisini değiştirmemek için mevcut Süper Admin
varsa çalışmayı reddeder ve kendi oluşturduğu kaydı `finally` bloğunda temizler.

## Canlı UI kabulü

- 390 × 844 viewport, koyu tema: kurulum kartı ve çalışma alanında yatay taşma yok.
- Klavye/semantik yüzey: skip-link, label bağlantıları, stepper, status/alert ve başlık hiyerarşisi görünür.
- Gerçek akış: kurulum → giriş → korumalı alan → güvenli çıkış → bootstrap route'un girişe yönlenmesi geçti.
- Tarayıcı warning/error konsolu boş kaldı.
- Canlı kabul için oluşturulan `f33-ui@noa.test` hesabı ve ilişkili session kayıtları kapatırken silindi; DB'de Süper Admin kaydı bırakılmadı.

## Kalite kapıları

- `npm test`: 328 dosya, 1.814 test geçti.
- `npm run type-check`: geçti.
- `npm run db:validate`: geçti.
- `npm run lint -- --max-warnings=0`: geçti.
- `npm run db:migrate` ve `prisma migrate status`: 63 migration, şema güncel.
- `npm run build`: 96 sayfa, production build geçti.
- `git diff --check`: geçti.

Faz 33 tamamlandı. Kapsam dışı güvenlik ve platform operasyonları ayrı RFC ve
onay kapısıyla ele alınmalıdır.
