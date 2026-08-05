# Faz 35 Dilim 5 — Marketing/Legal/SEO Sözleşmesi

Tarih: 04.08.2026

## Kapanış sonucu

- Plan kartları ve karşılaştırma matrisi tek `MARKETING_PLANS` typed kaynağından
  türetilir; ikinci, elle yazılmış plan matrisi kaldırıldı.
- Canonical origin production `APP_BASE_URL` girdisinden gelir; doğrulanmamış
  domain sabiti kaldırıldı.
- Resmi unvan, adres, iletişim, veri sorumlusu ve hukuki onay tarihi public
  indexing için zorunlu typed env girdileridir.
- Eksik kapıda root `noindex`, tam robots disallow, boş sitemap ve kapalı JSON-LD
  uygulanır.
- Açık kapıda sitemap yalnız public marketing route'larını ve `isDraft=false`
  blogları içerir; auth/API/SA/yasal taslak route'ları dahil etmez.
- Auth, SA ve yasal taslak layout/page metadata'sı her durumda `noindex`tir.
- Provider, resmi kimlik veya hukuki içerik uydurulmadı.

## Kabul kanıtı

- Hedefli test: 5 dosya, 18 test PASS.
- Tam test: 346 dosya, 1.857 test PASS.
- `npm run type-check`: PASS.
- `npm run db:validate`: PASS.
- `npm run lint`: PASS, uyarı yok.
- `npm run build`: PASS, robots/sitemap dahil 104 route.
- HTTP: robots `Disallow: /`, sitemap URL kaydı yok, landing canonical local
  fallback, landing ve legal sayfa `noindex` PASS.
- Browser: dört plan başlığı, canonical/noindex, yatay taşma yok ve console
  error/warning yok.
- `git diff --check`: PASS.

## Açık external blocker

Production domain, resmi şirket/veri sorumlusu kimliği ve hukuk danışmanı
onaylı içerik henüz sağlanmadı. Bu nedenle indexing mevcut çalışma ortamında
bilinçli olarak kapalıdır; belge sayfaları publish-ready değildir.

## Rollback

Robots/sitemap special files ve public site config kaldırılabilir; bu yalnız SEO
yayınını etkiler. Plan karşılaştırma türeticisi kaldırılırsa kart ve tablo aynı
commit sınırında önceki kaynağa döndürülmelidir. Veri/schema rollback'i yoktur.
