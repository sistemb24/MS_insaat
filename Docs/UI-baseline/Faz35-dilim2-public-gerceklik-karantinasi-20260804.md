# Faz 35 Dilim 2 — Public Gerçeklik Karantinası

Tarih: 04.08.2026

## Uygulanan sınır

- `self-service-registration`, `password-recovery`, `contact-delivery` ve
  `newsletter-subscription` typed public capability sözleşmesinde unavailable
  durumuna alındı.
- `/kayit`, `/sifremi-unuttum`, `/sifre-sifirla` ve `/iletisim`; form/input,
  token, hesap veya teslimat üretmez.
- Newsletter e-posta toplamaz; public footer doğrulanmamış sosyal link üretmez.
- Landing müşteri sayısı, işlem hacmi, NPS ve müşteri referansı göstermez.
- Plan ve özellik yüzeyleri dış sistemleri `sandbox`, `provider bekliyor` veya
  `etkin değil` olarak etiketler; plan domain sabitleri değiştirilmedi.
- FAQ ve ürün metinlerinden doğrulanmamış ERP/GİB/Open Banking, native offline
  mobil, hosting/veri bölgesi, backup, sertifika, 2FA, destek saati ve SLA
  taahhütleri kaldırıldı.
- Dış uzman, mevzuat ve sektör tahmini içerikleri draft oldu. Public build yalnız
  kaynak sahibi ürün ekibi kabiliyet durum yazısını üretir.
- Resmi şirket/veri sorumlusu kimliği ve hukuk onayı bulunmayan gizlilik,
  kullanım koşulları ve KVKK sayfaları “yayına hazır değil” bildirimi gösterir.

## Hedefli kabul

- Public capability ve SSR truth testleri dahil 4 dosyada 20 test geçti.
- Beş provider bağımlı yüzeyin render çıktısında `<form>` ve `<input>` yoktur.
- Legal draft çıktısı resmi olmayan e-posta/`mailto:` kanalı içermez.
- Plan sabitleri korunurken public modül etiketleri ayrı formatter ile truthful
  duruma çevrilir.

## Canlı browser kabulü

`/kayit`, `/sifremi-unuttum`, `/sifre-sifirla?token=fake`, `/iletisim`,
`/gizlilik`, `/landing`, `/fiyatlandirma` ve `/blog` gerçek Next.js sunucusunda
kontrol edildi:

- İlk beş submission/legal route'unda form ve input sayısı sıfırdır.
- Kayıt, reset, iletişim ve newsletter açık unavailable başlığı gösterir.
- Landing kaynaksız sayaç/referans yerine doğrulanmış ürün durumu gösterir.
- Fiyatlandırma self-servis tahsilatın kapalı olduğunu; provider bağımlı
  modüllerin sandbox/bekliyor durumunu gösterir.
- Blog yalnız bir doğrulanmış ürün yazısı ve kapalı newsletter durumu gösterir.
- İletişim ve blog başlık hiyerarşisi `h1 → h2 → h3` olarak doğrulandı.
- Dev server error logu boş kaldı; test sekmesi ve port 3000 kapatıldı.

## Kalite kapıları

- `npm test`: 339 dosya / 1.836 test PASS
- `npm run type-check`: PASS
- `npm run db:validate`: PASS
- `npm run lint`: PASS
- `npm run build`: 102 route PASS; yalnız 1 public blog slug üretilir
- `git diff --check`: PASS

## Rollback

Rollback son truthful içeriğe döner; sahte başarı, kaynaksız istatistik,
doğrulanmamış legal kimlik veya provider iddiası geri yüklenmez. Public
submission ancak gerçek adapter, environment sözleşmesi, rate-limit/audit ve
ayrı ürün onayıyla yeniden açılabilir.

Bu kayıt yalnız Dilim 2'yi kapatır. Faz 35 veya ürün bütünü henüz
production-ready değildir; Dilim 3–8 ve external blocker listesi açıktır.
