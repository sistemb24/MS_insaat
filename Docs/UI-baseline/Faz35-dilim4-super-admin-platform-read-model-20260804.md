# Faz 35 Dilim 4 — Süper Admin Platform Read-model

Tarih: 04.08.2026

## Kapanış sonucu

- Tenant, kullanıcı ve audit listeleri tek typed, salt-okunur platform
  read-model üzerinden sunulur.
- Prisma sorguları explicit `select`, en fazla 25 satır, server-side filtre,
  sıralama ve sayfalama uygular.
- UI ham tenant/user ID göstermez; e-posta maskeli, audit e-posta/IP alanları
  redacted döner.
- Erişim/profil yüzeyinde SA IP, user-agent ve credential ID görünürlüğü
  minimize edildi.
- Dashboard DB probe'u gerçek gecikme ölçer; provider'sız dış izleme
  `unavailable` gösterilir.
- Yeni SA veya tenant mutasyonu, platform RBAC ya da impersonation eklenmedi.

## Kabul kanıtı

- Hedefli read-model testi: 1 dosya, 3 test PASS.
- Gerçek DB kabulü: 1 tenant, 13 kullanıcı, 282 audit; liste başına en fazla 25
  satır, maskeli e-posta ve redacted audit DTO PASS.
- Protected route kabulü: `/super-admin/tenants`, `/users`, `/loglar` ve
  dashboard geçici opak SA session ile HTTP 200; session `finally` içinde
  silindi.
- Browser: oturumsuz `/super-admin/tenants` deep-link'i exact `returnTo` ile
  girişe yönlendi; console error/warning yok.
- Tam test: 344 dosya, 1.851 test PASS.
- `npm run type-check`: PASS.
- `npm run db:validate`: PASS.
- `npm run lint`: PASS, uyarı yok.
- `npm run build`: PASS, 102 route.
- `git diff --check`: PASS.

## Rollback

Sayfalar önceki doğrudan Prisma okumalarına geri dönebilir; read-model yalnız
okuma yaptığı için veri rollback'i yoktur. Route kabul scriptinin oluşturduğu
SA session başarı/başarısızlıkta silinir. Bu dilimde schema veya migration
değişikliği yapılmadı.
