# Faz 25 — İzole Gerçek Veri ve Kapanış

> Tarih: 30.07.2026
> Durum: Tamamlandı
> Kapsam: Kalıcı firma hukuki ve iletişim profili

## Uygulanan dikey

- Typed effective profil; hukuki unvan, vergi dairesi/numarası, MERSİS,
  telefon, e-posta ve adres alanlarını normalize edip doğrular.
- Kayıt yoksa hukuki unvan `Company.name`, diğer alanlar boş değer olacak
  şekilde `fallback` profil döner; mevcut şirketlere backfill yapılmaz.
- Additive `CompanyProfile` modeli ve repository okuma/yazmaları
  `tenantId + companyId` ile scoped ve dönemler arasında ortaktır.
- Yalnız admin optimistic revision ve idempotent request key ile
  değiştirebilir. Profil master veri olduğundan kapalı dönem yazımı tek
  başına engellemez.
- Audit yalnız değişen alan anahtarlarını ve revision geçişini taşır; açık
  adres, telefon, e-posta, vergi/MERSİS değeri ve request key taşımaz.
- `/ayarlar` effective profil, kaynak ve revision'ı gösterir. Alış/satış
  faturası PDF/print başlığı ile klasik hakediş print başlığı server-supplied
  effective profili kullanır.
- AppShell ve oturum etiketi `Company.name` kullanmaya devam eder; geçmiş
  belgeler, finans hesapları ve lokasyon sözleşmesi değiştirilmez.

## İzole gerçek veri kabulü

Kabul betiği yalnız aşağıdaki ayrılmış kapsamı kullanır:

- Firma: `company-f25-kabul-20260730`
- Dönem: `period-f25-kabul-20260730`
- Admin, accounting ve viewer için ayrı scope access/session kayıtları

`npm run company-profile:acceptance:verify` sonucu:

- Kayıt öncesi hukuki unvan şirket adından, kaynak `fallback`
- Admin kaydı sonrası hukuki unvan
  `F25 Kabul İnşaat Sanayi ve Ticaret A.Ş.`, kaynak `persisted`
- Revision `1`; aynı request key retry'ı sonrası değişmedi
- Güvenli audit sayısı `1`; hassas audit değeri ve request key sayısı `0`
- Stale revision, accounting, viewer ve yabancı firma yazımları reddedildi
- Kapalı dönem admin yazımını engellemedi
- `Company.name` değişmedi
- Operasyon ve session yan etkisi `0`

## Görsel ve etkileşimli kabul

In-app browser ile gerçek yerel uygulamada:

- Admin F25 scope'unda `/ayarlar` persisted hukuki/iletişim profilini,
  revision `1` bilgisini ve etkin düzenleme kontrollerini gösterdi.
- Fatura PDF önizlemesi hukuki unvan, VKN, MERSİS, adres, telefon ve
  e-postayı firma belge başlığında gösterdi.
- Klasik hakediş route'u sorunsuz açıldı; mevcut “Yazdır” akışındaki
  print-only firma başlığı bileşen sözleşmesiyle doğrulandı. Mevcut kapsam
  dışı hakediş PDF davranışı değiştirilmedi.
- 390 × 844 mobil görünümde profil formu ve mobil menü kullanılabilir kaldı.
- Koyu tema uygulanıp doğrulandı; ardından sistem temasına geri dönüldü.
- Viewer F25 scope'unda tüm profil alanları ve kayıt eylemi disabled kaldı,
  salt-okur açıklaması gösterildi.
- Test sonunda varsayılan admin/demo oturumu geri yüklendi, viewport
  sıfırlandı ve yerel test sekmesi kapatıldı.

## Doğrulama komutları

```text
npm run company-profile:acceptance:verify
npm test
npm run type-check
npm run db:validate
npx prisma migrate status --schema prisma/schema.prisma
npm run lint
npm run build
git diff --check
```

Tam sonuç: 293 test dosyasında 1.685 test geçti; type-check, Prisma validate,
56/56 migration durumu, lint, 77 sayfalık production build ve diff bütünlüğü
yeşildir.

Faz 25 tamamlanmıştır. Logo/binary yükleme, IBAN, e-Fatura mükellef
doğrulaması, KEP, imza yetkilisi ve dış sicil/vergi servisleri bu dikeye
alınmamıştır.
