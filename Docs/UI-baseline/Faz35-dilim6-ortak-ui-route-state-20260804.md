# Faz 35 Dilim 6 — Ortak UI ve Route State Kapanışı

Tarih: 04.08.2026
Durum: Tamamlandı

## Uygulama sınırı

- Süper Admin liste kontrolleri mevcut `Button` ve `FormField` primitive'lerine
  yaklaştırıldı; AppShell veya sayfa bilgi mimarisi yeniden tasarlanmadı.
- Ortak, bilgi sızdırmayan `RouteLoadingState` ve `RouteErrorState` bileşenleri
  eklendi. Next.js 16.2.9 sözleşmesine uygun hata tekrar denemesi
  `unstable_retry` kullanır.
- Kök, marketing, tenant modül ve Süper Admin panel segmentlerine loading/error
  sınırları eklendi. Hata ayrıntısı, stack veya kullanıcı girdisi UI'ya basılmaz.
- Var olan global açık/koyu tema, `focus-visible`, reduced-motion ve print
  sözleşmesi korunup regresyon testleriyle doğrulandı.

## Kabul kanıtı

- Bileşen testleri loading metni, güvenli hata metni, retry davranışı ve teknik
  hata ayrıntısının gizli kalmasını doğruladı.
- Canlı `/landing` kabulünde 320, 390, 768, 1024 ve 1440 görünüm genişlikleri
  kontrol edildi. Dikey kaydırma çubuğunun araç viewport'una ayırdığı 15 px
  dışında gerçek eleman yatay taşması bulunmadı.
- 320 görünümünde mobil menü açma/kapatma, dialog etiketi ve tema düğmesinin
  `aria-pressed` ile kök `dark` sınıfını birlikte değiştirmesi doğrulandı.
- Browser console hata/uyarı üretmedi. Tarayıcı ve geliştirme sunucusu kabul
  sonunda kapatıldı.
- Hedefli kapılar: 3 test dosyası, 35 test; type-check ve lint PASS.

## Rollback sınırı

Bu dilim yalnız ortak state bileşenleri, segment sınırları ve liste kontrolü
primitive yakınsamasıdır. Rollback şema, veri veya auth davranışı gerektirmez;
segment dosyaları ve ortak component refactor'u bağımsız geri alınabilir.

## Sonraki dilim

Faz 35 Dilim 7 — Operasyon ve Deployment Hazırlığı. Gerçek hosting, object
storage veya izleme provider'ı varmış gibi davranılmayacak; hazırlık health,
readiness, log/storage sınırları, CI ve dry-run runbook ile sınırlıdır.
