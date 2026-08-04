# Faz 24 — İzole Gerçek Veri ve Kapanış

> Tarih: 30.07.2026
> Durum: Tamamlandı
> Kapsam: Kalıcı finans ayarları

## Uygulanan dikey

- Typed `FinanceSetting` modeli yalnız `defaultVatRate` ve
  `showVatBreakdown` alanlarını kalıcılaştırır.
- Kayıt bulunmadığında geriye uyumlu `%20` ve KDV dağılımı açık fallback'i
  kullanılır; mevcut dönemlere backfill yapılmaz.
- Effective ayar okuması ve optimistic yazım
  `tenantId + companyId + periodId` ile tam scoped çalışır.
- Yalnız admin açık dönemde yazabilir. Accounting, viewer ve kapalı dönem
  yazımı fail-closed reddedilir.
- İdempotent retry ikinci revision veya audit üretmez. Audit eski/yeni
  değerler ile revision geçişini içerir; request key içermez.
- `/ayarlar` kaynağı (`fallback`/`persisted`) ve revision'ı gösterir. Yeni
  gider, alış/satış faturası ve klasik hakediş satırları aktif scope'un
  server-supplied KDV varsayılanını alır.
- Kullanıcının açıkça verdiği oranlar ile mevcut/geçmiş kayıtlar değişmez.
  Çoklu döviz, KDV dahil hesaplama ve geçmiş kayıt yeniden hesaplaması
  açılmaz.

## İzole gerçek veri kabulü

Kabul betiği yalnız aşağıdaki ayrılmış kapsamı kullanır:

- Firma: `company-f24-kabul-20260730`
- Dönem: `period-f24-kabul-20260730`
- Admin, accounting ve viewer için ayrı scope access/session kayıtları

`npm run finance-settings:acceptance:verify` sonucu:

- Kayıt öncesi effective oran `%20`, kaynak `fallback`
- Admin kaydı sonrası oran `%18`, KDV dağılımı kapalı, kaynak `persisted`
- Revision `1`; aynı request key retry'ı sonrası değişmedi
- Güvenli audit sayısı `1`; request key audit içeriğinde yok
- Stale revision, accounting, viewer, kapalı dönem ve yabancı scope yazımları
  reddedildi
- Gider, alış faturası, satış faturası, klasik hakediş, kasa/banka ve yevmiye
  operasyon yan etkisi `0`

## Görsel ve etkileşimli kabul

In-app browser ile gerçek yerel uygulamada:

- Admin F24 scope'unda `/ayarlar` persisted `%18`, kapalı KDV dağılımı,
  revision ve etkin düzenleme kontrollerini gösterdi.
- `/giderler` yeni kayıt formu `%18` varsayılanıyla açıldı ve dağılım kapalı
  olduğunda KDV özet metriği gösterilmedi.
- 390 × 844 mobil görünümde ana içerik viewport genişliğini aşmadı; mobil
  menü ve form kullanılabilir kaldı.
- Koyu tema uygulanıp DOM tema işareti doğrulandı; ardından sistem temasına
  geri dönüldü.
- Viewer F24 scope'unda sayı, checkbox ve kaydet kontrolleri disabled kaldı
  ve salt-okur açıklaması gösterildi.
- Test sonunda varsayılan admin/demo oturumu geri yüklendi, viewport
  sıfırlandı ve yerel test sekmesi kapatıldı.

## Doğrulama komutları

```text
npm run finance-settings:acceptance:verify
npm test
npm run type-check
npm run db:validate
npm run lint
npm run build
git diff --check
```

Tam sonuç: 288 test dosyasında 1.667 test geçti; type-check, Prisma validate,
55/55 migration durumu, lint, 77 sayfalık production build ve diff bütünlüğü
yeşildir.

Faz 24 tamamlanmıştır. Dış sağlayıcı, yeni API endpoint'i, kur/çoklu döviz,
KDV dahil fiyat motoru ve geçmiş finansal kayıtların yeniden hesaplanması bu
dikey kapsamına alınmamıştır.
