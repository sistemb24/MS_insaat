# Faz 30 — Özel Yetki Profilleri Gerçek Veri ve UI Kapanışı

Tarih: 31.07.2026
Durum: Tamamlandı

## Kapsam

- Firma kapsamlı, yeniden kullanılabilir özel yetki profili
- Dönem ve kullanıcı kapsamlı aktif viewer ataması
- Doküman Merkezi için beş sabit permission
- Admin bypass ve atanmamış rol geriye uyumu
- Optimistic revision, idempotency ve redacted audit
- Ayarlar profil matrisi ve kullanıcı atama yüzeyi

## İzole gerçek veri sonucu

`company-f30-kabul-20260731` ve `period-f30-kabul-20260731` kapsamında:

- `Saha Doküman Okuyucu` profili yalnız `document.view` grant'iyle kaydedildi.
- Aynı request key ikinci profil veya audit üretmedi.
- Normalize tekrar, accounting yazımı ve aktif atamalı profil pasifleştirme
  reddedildi.
- Atanmış viewer liste/indirme izni alırken dosya yükleme izni alamadı.
- Admin profil kararından bağımsız tam yetkili kaldı.
- Atanmamış accounting eski Doküman Merkezi rol fallback'ini korudu.
- Atama yabancı firmaya sızmadı.
- İki başarılı mutation iki redacted audit üretti.
- Doküman, gider, ledger ve session yan etkisi sıfır kaldı.

Kabul komutu:

`npm run access-profile:acceptance:verify`

## UI kabulü

- Yönetici Ayarlar sayfasında “Özel Yetki Profilleri” paneli ve “Yeni Profil”
  aksiyonu görünür.
- Permission matrisi ve aktif görüntüleyici atama alanı aynı paneldedir.
- Koyu temada 390 px viewport kontrolünde document genişliği viewport'u
  aşmadı.
- Tarayıcı konsolunda hata oluşmadı.
- Yazdırma görünümünde mevcut `print:hidden` işlem sözleşmesi korunur.

## Korunan sınırlar

- `AppUserScopeAccess.role` ve `AppSession.role` değiştirilmedi.
- Admin/accounting/viewer rol isimleri ve session çözümlemesi korunur.
- Diğer modül guard'ları profile geçirilmedi.
- Klasör/dosya satır bazlı ACL, SSO/SCIM, bulut storage ve dış sağlayıcı
  entegrasyonu açılmadı.

## Kalite kapıları

- `npm test`: 315 dosya / 1.747 test
- `npm run type-check`: geçti
- `npm run db:validate`: geçti
- `npm run lint`: uyarısız geçti
- `npm run build`: 77 sayfalık production build geçti
- `git diff --check`: geçti
- Migration durumu: 61 migration güncel
