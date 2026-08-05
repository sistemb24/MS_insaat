# Faz 14 — İSG Merkezi UI Kabul Kaydı

Tarih: 28.07.2026

## Kapsam

`/isg` çalışma alanı, aktif demo muhasebe oturumunda gerçek İSG verisi
oluşturmadan doğrulandı. Kalıcı ekran; liste/arama/tür filtresi, oluşturma
formu, deep-link drawer, yaşam döngüsü aksiyonları ve eğitim katılımı için
sunucu action sözleşmesini kullanır.

## Kabul özeti

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| Masaüstü light | Geçti | 1440 × 900; body yatay taşma yok, boş durum ve yardımcı panel okunur. |
| Masaüstü dark | Geçti | 1440 × 900; yüzey/kontrast, metinli durum işaretleri ve form kontrolleri okunur. |
| Mobil dark | Geçti | 390 × 844; body yatay taşma yok, tablolar kendi yatay kaydırma kabında. |
| Form/dialog | Geçti | Yeni iş kazası formu açıldı, alan etiketleri ve kapsam içi proje/personel seçenekleri göründü, klavyeden kapatılabilir. |
| Deep-link | Geçti | Seçili kayıt için `/isg?isg=<id>` sözleşmesi UI ve component testinde doğrulandı. |
| Viewer sınırı | Geçti | Component testi viewer'da yeni kayıt ve tür seçimi kontrollerinin DOM'a alınmadığını doğrular. |
| Print | Geçti | Liste ve detay yüzeyleri print-safe; kontrol/form/drawer akışları `print:hidden`, tablo ise kendi scroll kabında kalır. |
| Konsol | Geçti | Yeniden başlatılmış geliştirme sunucusunda İSG ekranının güncel yüklemesinde yeni hata görülmedi. |

## Veri ve sınır

Kabul sırasında İSG kaydı, audit kaydı veya çapraz modül hareketi yazılmadı.
İlk ekranın sıfır kayıt göstermesi beklenen durumdur. Resmi kurum bildirimi,
sağlık dokümanı, stok düşümü, bordro/puantaj etkisi ve F13 dış sağlayıcı akışı
değişmedi.
