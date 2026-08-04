# Faz 26 — İzole Gerçek Veri ve Kapanış

> Tarih: 30.07.2026
> Durum: Tamamlandı
> Kapsam: Şirket lokasyon dizini

## Uygulanan dikey

- Typed lokasyon domaini Merkez, Şube ve Ofis kod/ad/tip/iletişim/adres
  alanlarını normalize edip doğrular.
- Additive `CompanyLocation` modeli dönemden bağımsız
  `tenantId + companyId` kapsamında çalışır; mevcut kayıtlara backfill
  yapılmaz.
- Aynı firmada en fazla bir aktif Merkez bulunabilir. Kod firma içinde
  tekildir; silme yerine pasifleştirme kullanılır.
- Mevcut aktif dönem `santiyeler` EntityRecord satırları salt-okunur
  `SITE` projeksiyonu olarak aynı dizinde gösterilir. İkinci şantiye master'ı
  veya mutation action'ı oluşturulmaz.
- Yalnız admin optimistic revision ve idempotent request key ile yönetebilir.
  Master veri olduğu için kapalı dönem tek başına yazımı engellemez.
- Audit yalnız kod, tip, durum/revision geçişi ve değişen alan anahtarlarını
  taşır; açık adres, telefon, e-posta, sorumlu kişi ve request key taşımaz.
- `/ayarlar` özet metrikleri, tip/durum/kaynak filtreleri, responsive
  kartlar, Merkez/Şube/Ofis formu, pasifleştirme, şantiye bağlantısı ve
  print-safe görünüm sunar.

## İzole gerçek veri kabulü

Kabul betiği yalnız aşağıdaki ayrılmış kapsamı kullanır:

- Firma: `company-f26-kabul-20260730`
- Dönem: `period-f26-kabul-20260730`
- Admin, accounting ve viewer için ayrı scope access/session kayıtları
- Şantiye: `SANT-0026`

`npm run company-location:acceptance:verify` sonucu:

- İki yönetilen lokasyon ve bir federatif şantiye, toplam `3` dizin satırı
- Başarılı iki mutation için audit sayısı `2`
- Aynı request key retry'ı ikinci revision/audit üretmedi
- İkinci aktif merkez, stale revision, accounting/viewer ve yabancı scope
  yazımları reddedildi
- Kapalı dönem admin yazımını engellemedi
- Yönetilen lokasyonlar başka dönemde okundu; şantiye yalnız aktif dönemden
  geldi
- Hassas audit değeri, şantiye master çoğaltması, operasyon, firma profili
  ve session yan etkisi `0`

## Görsel ve etkileşimli kabul

In-app browser ile gerçek yerel uygulamada:

- Admin F26 scope'unda `/ayarlar` iki yönetilen lokasyon ve bir federatif
  şantiyeyi doğru tip, kaynak, durum ve revision ile gösterdi.
- Merkez/Şube satırlarında Düzenle/Pasifleştir, şantiye satırında yalnız
  `Şantiyelerde Aç` bağlantısı bulunuyor.
- Yeni lokasyon formu yalnız Merkez, Şube ve Ofis tiplerini sunuyor.
- 390 × 844 mobil görünümde kartlar, filtreler ve form kullanılabilir kaldı.
- Koyu tema uygulanıp doğrulandı; ardından sistem temasına geri dönüldü.
- Viewer F26 scope'unda tüm dizin okundu; form ve mutasyon kontrolleri DOM'da
  bulunmadı, salt-okur açıklaması gösterildi.
- Test sonunda varsayılan admin/demo oturumu geri yüklendi, viewport
  sıfırlandı ve yerel test sekmesi kapatıldı.

## Doğrulama komutları

```text
npm run company-location:acceptance:verify
npm test
npm run type-check
npm run db:validate
npx prisma migrate status --schema prisma/schema.prisma
npm run lint
npm run build
git diff --check
```

Tam sonuç: 298 test dosyasında 1.699 test geçti; type-check, Prisma validate,
57/57 migration durumu, lint, 77 sayfalık production build ve diff bütünlüğü
yeşildir.

Faz 26 tamamlanmıştır. `locationMode` değişikliği, kullanıcıya lokasyon
atama, granular location RBAC, operasyonel kayıt taşıma, harita/koordinat,
toplu import ve yeni API endpoint'i bu dikeye alınmamıştır.
