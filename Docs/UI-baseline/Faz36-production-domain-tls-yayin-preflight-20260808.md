# Faz 36 — Production domain, TLS ve yayın preflight sözleşmesi

Tarih: 08.08.2026
Durum: Domain/DNS/TLS kabulü tamam; sahip-onaylı yasal route kodu hazır; indexing kapalı

## Amaç

`insaatyonet.com` domainini kullanıcı trafiğine veya arama motoru indexing'ine
açmadan önce mevcut durumu kanıtlamak ve canlı değişiklikleri küçük, ayrı onaylı
kapılara bölmektir.

## Salt-okunur mevcut durum

| Kanıt | Sonuç |
| --- | --- |
| Domain kararı | Production adayı `insaatyonet.com` onaylı |
| Vercel hesap kaydı | Domain hesapta mevcut; registrar ve nameserver üçüncü taraf |
| Vercel proje bağı | `insaatyonet.com` ve `www.insaatyonet.com`, `insaat-yonetim` projesine bağlı |
| Registry/registrar durumu | Verisign RDAP: `active`; önceki `client hold` kalktı |
| Apex DNS | Cloudflare ve Google resolver'larında Vercel NS + Anycast A çözümü aktif |
| `www` DNS | Cloudflare ve Google resolver'larında Vercel NS + Anycast A çözümü aktif |
| Vercel domain doğrulaması | API: apex ve `www` `verified=true`; `misconfigured=false`; DNS conflict yok |
| HTTPS/TLS | Apex ve `www`, dört public Anycast A hedefinde geçerli TLS ile `200` |
| ACME/sertifika | Manuel üretim açık onayla tamamlandı; auto-renew açık; bitiş 09.11.2026 09:47:51 TSİ |
| Vercel apex önerisi | `A @ 76.76.21.21` |
| Vercel `www` önerisi | `A www 76.76.21.21` |
| Vercel delegasyon alternatifi | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| Production artifact | Ready; `fra1`; custom domain sağlık/readiness kabulünden geçti |
| HTTP/HTTPS ve canonical | HTTP her hostname'in HTTPS karşılığına `308`; apex ve `www` landing, apex canonical üretir |
| Indexing kapısı | `X-Robots-Tag: noindex, nofollow, noarchive`; robots `Disallow: /`; sitemap boş |
| Yasal sayfalar | `2026-08-12.a` sahip-onaylı KVKK, gizlilik ve kullanım koşulları route adayı hazır; PR/merge/deployment yapılmadı |

Custom domain bağı, DNS, TLS ve HTTP/header kabulü tamamlanmıştır. Mevcut
noindex/robots/sitemap kapısı; yasal route değişikliği merge edilip ayrıca
indexing kararı verilene kadar istemsiz arama motoru yayınına karşı fail-closed
sınırdır.

## Ayrı onaylı yürütme sırası

1. Vercel'de `insaatyonet.com` ve `www.insaatyonet.com` yalnız
   `insaat-yonetim` Production projesine bağlandı; provider'ın kesin apex ve
   `www` hedefleri salt-okunur kaydedildi.
2. Registrar tarafındaki `client hold` giderildi; Verisign RDAP `active`
   durumunu döndürdü.
3. DNS yöntemi Vercel nameserver delegasyonu olarak kullanıcı tarafından
   seçildi: `ns1.vercel-dns.com` ve `ns2.vercel-dns.com`.
4. Delegasyon ve apex/`www` çözümleri Cloudflare ile Google public
   resolver'larında salt-okunur doğrulandı.
5. DNS yayılımı ve Vercel domain verification tamamlandı. Otomatik üretim
   gecikince ayrı açık onayla manuel TLS sertifikası üretildi; edge dağıtımı,
   HTTP→HTTPS ve apex/`www` canonical davranışı doğrulandı.
6. Indexing kapalıyken landing, tenant girişi, Süper Admin girişi, health,
   readiness, CSP, HSTS, `X-Robots-Tag`, robots ve sitemap smoke'ları geçti.
7. KVKK, gizlilik ve kullanım koşulları Murat Saygı'nın sahip/veri-hukuk karar
   sahibi kabulüyle `2026-08-12.a` sürümüne getirildi ve ayrı kod diliminde
   taslak bileşeninden çıkarıldı. Bu kayıt bağımsız hukuk danışmanı görüşü iddia
   etmez; değişiklik henüz commit/PR/merge/deployment aşamasına geçmedi.
8. `NOA_PUBLIC_INDEXING_ENABLED=true`, sitemap yayını ve kullanıcı trafiği ancak
   domain/TLS ile yasal içerik kabulünden sonra ayrı açık onayla değerlendirilir.

## Fail-closed durma koşulları

- Vercel domain bağı yanlış projeyi gösterirse.
- DNS hedefi provider çıktısıyla birebir eşleşmezse.
- Apex veya `www` başka bir servise çözülürse ya da kayıt çakışması varsa.
- Vercel verification veya TLS sertifikası Ready değilse.
- HTTP'den HTTPS'e ve apex/`www` canonical yönlendirmesi kararsızsa.
- Legal sayfalar onaylı sürüm/yürürlük bilgisi üretmiyorsa ya da route değişikliği
  merge edilmeden indexing açılırsa.
- Indexing, DNS/TLS ve yasal kabul bitmeden açık görünürse.

## 08.08.2026 tarihli ilk preflight'ta yapılmayanlar

- Vercel project-domain bağı oluşturulmadı.
- DNS kaydı veya nameserver değiştirilmedi.
- TLS sertifikası talep edilmedi veya doğrulanmadı.
- Provider secret, deployment veya Production alias değiştirilmedi.
- Yasal metinler yayınlanmadı.
- Indexing, sitemap yayını veya kullanıcı trafiği açılmadı.

## Sonraki ayrı onay kapısı

Sahip-onaylı üç yasal route değişikliğinin stage, commit, push ve draft PR
olarak yayımlanmasıdır. Merge/deployment bu kapıya dahil değildir. Indexing ile
gerçek kullanıcı trafiği ayrıca; provider yurt dışı aktarım mekanizması ve
sözleşme kanıtı tamamlandıktan sonra ayrı açık onayla değerlendirilebilir.
