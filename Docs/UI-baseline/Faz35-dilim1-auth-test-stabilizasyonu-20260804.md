# Faz 35 Dilim 1 — Auth ve Test Stabilizasyonu

Tarih: 04.08.2026

## Uygulanan sınır

- `AppSession` yalnız kullanıcıya açık tenant/firma/dönem kapsam şablonu olarak
  korundu.
- Tarayıcı authentication için 32 byte rastgele base64url kimlikli,
  sekiz saatlik ve iptal edilebilir `AppAuthSession` eklendi.
- Giriş seçilen scope için opak auth session üretir; cookie scope kimliği
  taşımaz.
- Scope değişimi kullanıcı erişimini yeniden doğrular, auth kimliğini atomik
  döndürür ve istemci server görünümünü yeniler.
- Çıkış auth session'ı DB'de iptal eder ve cookie'yi temizler.
- Tenant Server Action kapsam çözümleme eksik/bilinmeyen/expired/revoked
  session'da `/giris` yönlendirmesiyle fail-closed çalışır.
- Demo scope listesi yalnız development/test giriş yüzeyinde kalır; production
  giriş sayfası listeyi döndürmez.
- Arvento filo, araç özeti ve banka entegrasyonu action testleri 02.08.2026
  saatine sabitlendi; 03.08.2026 bitişli aktif abonelik fixture'ı gün geçişinden
  etkilenmez.

## Migration ve geri alma sınırı

- Migration: `20260804210000_add_tenant_auth_sessions`
- Yalnız yeni tablo, index ve iki foreign key ekler; mevcut `AppSession`,
  credential, tenant veya domain verisini değiştirmez.
- Yerel deploy sonucu 65/65 migration günceldir.
- Uygulama rollback'inde tablo bırakılabilir; auth kodu güvenli bir bakım/giriş
  reddi sürümüne döner. Eski öngörülebilir scope-cookie veya demo fallback
  production'a geri alınmaz.
- Tablo silme rollback değildir. Şema geri dönüşü gerekirse veri saklama kararı,
  backup ve ayrı forward migration ile ele alınır.

## Hedefli kabul

- 6 dosyada 48 auth ve tarih regresyon testi geçti.
- Ek AppShell regresyonlarıyla hedefli son paket 4 dosyada 37 test geçti.
- Öngörülebilir `demo-accounting` cookie değeri auth kabul edilmedi.
- Auth/scope kullanıcı uyuşmazlığı ve yabancı scope geçişi reddedildi.
- Başarılı scope değişiminde auth kimliği döndü.

## Canlı browser kabulü

Gerçek yerel PostgreSQL ve Next.js 16.2.9 development sunucusunda:

1. Cookie'siz `/` isteği `/giris` sayfasına yönlendi.
2. `muhasebe@noa.local` ile giriş opak auth session üretti ve dashboard açıldı.
3. Sayfa yenilemesi oturumu ve aktif kapsamı korudu.
4. DEMO İNŞAAT → F15 Filo Kabul Şirketi geçişi auth kimliğini döndürdü;
   banner, dönem ve seçici aynı kapsamı gösterdi.
5. Çıkış `/giris` sayfasına döndü; son auth session `revokedAt` aldı.
6. Dev sunucu hata logu boş kaldı; kabul sekmesi kapatıldı ve port 3000
   durduruldu.

## Tam kalite kapıları

- `npm test`: 337 dosya / 1.827 test PASS
- `npm run type-check`: PASS
- `npm run db:validate`: PASS
- `npm run lint`: PASS
- `npm run build`: 106 route PASS
- `npm run db:generate`: PASS
- `npm run db:migrate`: 65 migration PASS
- `prisma migrate status`: güncel
- `git diff --check`: PASS

Bu kayıt yalnız Dilim 1'i kapatır. Faz 35 veya ürün bütünü henüz
production-ready ilan edilmez; Dilim 2–8 ve external blocker listesi açıktır.
