# Faz 34 — İzole Gerçek Veri ve Kapanış

> Tarih: 03.08.2026
> RFC: `Docs/RFC-F34-01-super-admin-guvenlik-yuzeyleri-mutabakati.md`

## Sonuç

Faz 34'ün beş dilimi tamamlandı. Faz 33 giriş/session hattı korunurken,
onaysız genişletilmiş auth yüzeyleri güvenli capability sınırına alındı.
Gerçek e-posta/SMS adapter'ı ve geçerli TOTP encryption key bulunmadığında
reset, OTP ve enrollment secret üretmeden fail-closed kalır.

## Uygulanan güvenlik sınırları

- Public route matrisi exact path ve merkezi sözleşmedir; yalnız giriş ile
  tekil ilk kurulum ağ sınırında public'tir.
- Credential ID taşıyan pending OTP/2FA cookie akışları kaldırıldı.
- DB destekli opak, amaç/süre/deneme/tüketim kontrollü challenge eklendi.
- Reset/OTP/ikinci faktör denemeleri için process restartından bağımsız DB
  fixed-window bucket altyapısı eklendi; `Map` yalnız test fake'inde kaldı.
- Reset tokenı yalnız hash saklar; uygulama işlemi token tüketimi, şifre
  değişimi ve tüm Süper Admin session iptalini tek transaction'da yapar.
- TOTP secret AES-256-GCM ile `v1` ciphertext olarak saklanır. Backup kodları
  yalnız SHA-256 hash'tir ve tek kullanımlıdır; key yoksa enrollment açılmaz.
- Bakım/kilit/reset/OTP/TOTP taslak sayfaları capability yokken 404 verir;
  query parametreleri güvenlik gerçeği olarak kullanılmaz.
- Ham reset tokenı, OTP, TOTP secret, backup code veya challenge kimliği loglanmaz.

## Migration ve gerçek veri kabulü

- Migration: `20260803230000_super_admin_security_hardening` (64. migration)
- Eklenen modeller: `SuperAdminAuthChallenge`, `SuperAdminRateLimitBucket`
- TOTP alanları additive biçimde genişletildi; legacy plaintext alan nullable
  bırakıldı ancak yeni servis hiçbir zaman bu alana secret yazmaz.
- Yerel PostgreSQL kabulü; challenge wrong-purpose/expiry/replay, altıncı
  reset denemesinde DB rate-limit, adapter yokken sıfır token üretimi, yanlış
  crypto key ile sıfır TOTP kaydı ve tenant tablo izolasyonunu `PASS` verdi.
- Kabulün oluşturduğu challenge/bucket ve gerekirse geçici credential temizlendi.

## Kapsam dışı kalanlar

Gerçek SMTP/SMS sağlayıcısı, public recovery rotaları, TOTP enrollment UI,
bakım modu operasyonu ve Süper Admin panel mutasyonları açılmadı. Bu durum
eksiklik değil, RFC-F34-01'in fail-closed teslim kararıdır.
