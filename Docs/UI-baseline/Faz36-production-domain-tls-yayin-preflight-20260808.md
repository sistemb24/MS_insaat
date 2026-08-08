# Faz 36 — Production domain, TLS ve yayın preflight sözleşmesi

Tarih: 08.08.2026
Durum: Preflight tamamlandı; domain/DNS/TLS/yasal yayın/indexing kapalı

## Amaç

`insaatyonet.com` domainini kullanıcı trafiğine veya arama motoru indexing'ine
açmadan önce mevcut durumu kanıtlamak ve canlı değişiklikleri küçük, ayrı onaylı
kapılara bölmektir.

## Salt-okunur mevcut durum

| Kanıt | Sonuç |
| --- | --- |
| Domain kararı | Production adayı `insaatyonet.com` onaylı |
| Vercel hesap kaydı | Domain hesapta mevcut; registrar ve nameserver üçüncü taraf |
| Vercel proje bağı | `insaat-yonetim` Production aliasları arasında custom domain yok |
| Apex DNS | A/AAAA/CNAME/NS çözümü yok |
| `www` DNS | A/AAAA/CNAME/NS çözümü yok |
| HTTPS/TLS | Host çözülemediği için bağlantı ve sertifika kanıtlanamadı |
| Vercel apex önerisi | `A @ 76.76.21.21` |
| Vercel delegasyon alternatifi | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| Production artifact | Ready; `fra1`; kararlı Vercel aliası sağlık/readiness kabulünden geçti |
| Landing canonical | `https://insaatyonet.com/landing` |
| Indexing kapısı | `X-Robots-Tag: noindex, nofollow, noarchive`; robots `Disallow: /`; sitemap boş |
| Yasal sayfalar | KVKK, gizlilik ve kullanım koşulları `200`, fakat “Yayına hazır değil” taslağı |

Canonical origin'in custom domaini göstermesi domainin bağlı, çözülebilir veya
TLS açısından hazır olduğu anlamına gelmez. Mevcut noindex/robots/sitemap kapısı
bu ayrım sırasında istemsiz arama motoru yayınına karşı fail-closed sınırdır.

## Ayrı onaylı yürütme sırası

1. Vercel'de `insaatyonet.com` ve gerekiyorsa `www.insaatyonet.com` yalnız
   `insaat-yonetim` Production projesine bağlanır. Bu adım DNS değiştirmez;
   provider'ın kesin apex ve `www` hedefleri kaydedilir.
2. DNS sağlayıcısı ve uygulanacak yöntem açıkça doğrulanır. Apex için Vercel'in
   doğruladığı A kaydı veya nameserver delegasyonundan yalnız biri seçilir;
   `www` hedefi project-domain bağı sonrasında provider çıktısından alınır.
3. Ayrı DNS değişiklik onayıyla yalnız doğrulanmış kayıtlar uygulanır. Eski veya
   çakışan kayıt varsa silme/değiştirme kapsamı ayrıca gösterilir.
4. DNS yayılımı, Vercel domain verification ve TLS sertifika durumu beklenir;
   apex ile `www` yönlendirme/canonical kararı doğrulanır.
5. Indexing kapalıyken landing, tenant girişi, Süper Admin girişi, health,
   readiness, CSP, HSTS, `X-Robots-Tag`, robots ve sitemap smoke'ları yapılır.
6. KVKK, gizlilik ve kullanım koşulları gerçek, sürümlü ve hukukça onaylı
   metinlerle ayrı kod/PR sürecinde taslaktan çıkarılır. Resmi kimlik girdilerinin
   varlığı tek başına hukuki metin onayı sayılmaz.
7. `NOA_PUBLIC_INDEXING_ENABLED=true`, sitemap yayını ve kullanıcı trafiği ancak
   domain/TLS ile yasal içerik kabulünden sonra ayrı açık onayla değerlendirilir.

## Fail-closed durma koşulları

- Vercel domain bağı yanlış projeyi gösterirse.
- DNS hedefi provider çıktısıyla birebir eşleşmezse.
- Apex veya `www` başka bir servise çözülürse ya da kayıt çakışması varsa.
- Vercel verification veya TLS sertifikası Ready değilse.
- HTTP'den HTTPS'e ve apex/`www` canonical yönlendirmesi kararsızsa.
- Legal sayfalar taslaksa veya onaylı sürüm/yürürlük bilgisi yoksa.
- Indexing, DNS/TLS ve yasal kabul bitmeden açık görünürse.

## Bu preflight'ta yapılmayanlar

- Vercel project-domain bağı oluşturulmadı.
- DNS kaydı veya nameserver değiştirilmedi.
- TLS sertifikası talep edilmedi veya doğrulanmadı.
- Provider secret, deployment veya Production alias değiştirilmedi.
- Yasal metinler yayınlanmadı.
- Indexing, sitemap yayını veya kullanıcı trafiği açılmadı.

## Sonraki ayrı onay kapısı

Yalnız Vercel project-domain bağının oluşturulması ve provider'ın kesin apex/
`www` DNS hedeflerinin alınmasıdır. DNS kaydı uygulaması, TLS kabulü, yasal metin
yayını, indexing ve trafik bu onaya dahil değildir.
