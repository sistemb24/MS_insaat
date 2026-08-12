# Production Vercel Hobby ve Kapalı Lansman Kararı

Karar tarihi: 12.08.2026
Karar sahibi/onaylayan: Murat Saygı / Murat Saygı
Durum: `HOBBY_CONFIRMED / COMMERCIAL_PRODUCTION_NO_GO`

## Karar

- `murat-saygis-projects` hesabı Vercel Hobby planında kalır.
- Vercel Pro yükseltmesi, ödeme yöntemi ekleme veya ücretli satın alma yapılmaz.
- `insaatyonet.com` üzerindeki mevcut teknik kabul yüzeyi ticari production
  lansmanı sayılmaz.
- Indexing, genel kullanıcı trafiği, müşteri onboarding'i ve gerçek müşteri
  verisi işleme kapalı kalır.

## Gerekçe ve doğrulanan sınır

12.08.2026 tarihinde doğrulanan Vercel Hizmet Şartları, Hobby kullanımını
kişisel veya ticari olmayan kullanımla sınırlar. Vercel'in güncel Veri İşleme
Eki ise müşteri verisinin veri işleyen sıfatıyla işlenmesine ilişkin kapsamını
Pro ve Enterprise müşterileri için kurar. Bu nedenle Hobby planı:

1. NOA İnşaat'ın B2B/ticari production kullanımı için sözleşmesel dayanak
   olarak kabul edilmez;
2. yurt dışı aktarım için gerekli provider sözleşme/DPA kanıtını tamamlamaz;
3. Frankfurt `fra1` seçimi, TLS veya yasal sayfaların yayımlanmış olmasıyla bu
   eksikliği kapatmaz.

Resmî kaynaklar:

- [Vercel Terms of Service — Hobby Plan](https://vercel.com/legal/terms)
- [Vercel Data Processing Addendum](https://vercel.com/legal/dpa)

## Fail-closed teknik ve operasyon sınırı

- Route seviyesindeki ve global `noindex, nofollow, noarchive` koruması
  kaldırılmaz; `robots.txt` genel taramayı engellemeye devam eder ve sitemap
  public URL yayımlamaz.
- Domain ve yasal sayfalar yalnız teknik smoke/inceleme amacıyla erişilebilir
  kalabilir; reklam, satış, self-servis kayıt, sözleşme, ödeme veya müşteri
  daveti başlatılmaz.
- Production DB, R2 ve Sentry kaynaklarına gerçek müşteri verisi alınmaz.
- Bu karar mevcut deployment, provider kaynağı, secret, DNS/TLS veya GitHub
  durumunda değişiklik yetkisi vermez ve böyle bir değişiklik yapmaz.

## Yeniden açma koşulları

Ticari production lansmanı ancak aşağıdakilerin tamamı ayrı kanıt ve açık onayla
tamamlandığında yeniden değerlendirilebilir:

1. Ticari kullanıma izin veren hosting planı/sağlayıcı seçimi;
2. sağlayıcının geçerli sözleşmesi, DPA'sı, rolü, alt işleyenleri ve veri
   kategorilerinin kaydı;
3. 6698 sayılı Kanunun 9'uncu maddesine uygun yurt dışı aktarım mekanizması ile
   gerekiyorsa imza ve Kuruma bildirim kanıtı;
4. production trafik ve indexing için ayrı go/no-go kararı.

Bu koşullar sağlanana kadar sonuç `NO-GO`dur.
