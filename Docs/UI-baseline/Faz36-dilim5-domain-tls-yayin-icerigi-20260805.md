# Faz 36 Dilim 5 — Domain, TLS ve Yayın İçeriği

Tarih: 05.08.2026
Kapsam: Yalnız staging Preview domain/TLS/header ve yayın kapıları
Durum: Tamamlandı — staging Preview domain/TLS/header/yayın kapıları doğrulandı

## Karar sınırı

- Canonical production domaini ve DNS sahibi/zone değişikliği henüz
  onaylanmadı. Production DNS, TLS, deployment ve trafik değişikliği yapılmadı.
- Staging için Murat Saygı'nın onayladığı geçici Vercel hostname'i kullanılır.
- Resmi şirket unvanı, açık adres, resmi iletişim e-postası, veri sorumlusu ve
  onaylı KVKK/yayın tarihi tamamlanmadı. Bu nedenle public indexing kapalıdır.
- Onaylı staging retention üst sınırı 30 gün olarak korunur; bu değer
  production hukuki retention kararı veya yayın metni değildir.

## Uygulanan fail-closed sözleşme

- Staging metadata origin'i açık `APP_BASE_URL` yoksa yalnız
  `VERCEL_BRANCH_URL`, ardından `VERCEL_URL` üzerinden ve yalnız HTTPS
  `*.vercel.app` hostname'i kabul edilerek türetilir. Branch URL önceliği aynı
  dalın güncel Preview adresini kararlı biçimde izler.
- Vercel sistem değişkenleri build ve runtime'da hostname'i protokolsüz verir;
  uygulama HTTPS şemasını açıkça ekler. Kaynak:
  [Vercel System Environment Variables](https://vercel.com/docs/environment-variables/system-environment-variables)
- Vercel kaynaklı staging origin'i hiçbir koşulda production origin onayı
  sayılmaz. Production indexing için birlikte şunlar zorunludur:
  `NOA_RUNTIME_ENV=production`, açık HTTPS `APP_BASE_URL`,
  `NOA_PUBLIC_INDEXING_ENABLED=true` ve beş resmi/yasal kimlik girdisi.
- Bu kapılar geçmedikçe root metadata `noindex, nofollow`, `robots.txt`
  `Disallow: /`, sitemap boş ve JSON-LD kapalı kalır.
- Aynı fail-closed durum tüm rotalara
  `X-Robots-Tag: noindex, nofollow, noarchive` başlığı olarak da uygulanır.
- Production-build sınıfındaki staging Preview'da mevcut CSP ve
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` korunur.
  Geçici Vercel alt alanı için `preload` iddiası eklenmez.

## Yerel doğrulama

- Hedefli public config/SEO/header testleri: 3 dosya / 9 test geçti.
- Tam test kapısı: 359 dosya / 1.902 test geçti.
- Type-check, Prisma validate, lint ve Next.js 16.2.9 build geçti; 102 statik
  sayfa üretildi.
- `staging:platform:verify` sonucu `fra1` ve repo içinde environment değeri
  bulunmadığını doğruladı.
- Secret scan 1.371 dosyada yüksek güvenli bulgu üretmedi.
- `git diff --check` geçti.

## Gerçek Preview kabulü

Commit `e9ba1bc` için Vercel deployment ve kararlı branch aliası:

- Deployment:
  `https://insaat-yonetim-2282yi2x5-murat-saygis-projects.vercel.app`
- Branch aliası:
  `https://insaat-yonetim-git-agent-faz36-sta-14c1d7-murat-saygis-projects.vercel.app`
- Runtime build bölgesi: `fra1`

Yetkili Vercel CLI isteğiyle Deployment Protection giriş sayfası değil gerçek
uygulama yanıtı denetlendi:

- `/landing` → `200`; canonical ve `og:url` branch aliasındaki `/landing`, OG ve
  Twitter image URL'leri aynı HTTPS origin'indeki `/og-landing.png`. Yanıtta
  `localhost` yoktur.
- `/landing`, `/robots.txt` ve `/sitemap.xml` yanıtlarında CSP,
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` ve
  `X-Robots-Tag: noindex, nofollow, noarchive` vardır.
- HTML metadata `noindex, nofollow`; `robots.txt` body `User-Agent: *` ve
  `Disallow: /`; sitemap boş `urlset` döndürür.
- `/api/health` → `200 {"status":"ok"}`; `/api/readiness` →
  `200`, database `ready`; smoke endpoint'ine headersız `POST` →
  `404 {"status":"not_found"}`.
- Vercel deployment check ve GitHub CI run `31021982660` geçti.

Bu kanıtlarla staging'e ait Dilim 5 kapanır. Canonical production domaini,
resmi/yasal yayın girdileri ve production DNS/TLS/trafik yetkisi açık kalır;
bu staging kabulü production yayın yetkisi vermez.
