# Faz 12 Dilim 4 — UI ve Deep-link Kabul Kaydı

> Tarih: 23.07.2026
> Kapsam: RFC-F12-01 Kalıcı Import Staging/Geçmişi — yazmasız UI ön kabulü

## Uygulanan Yüzey

Hakediş Pro `Aktarım / Simülasyon` sekmesindeki mevcut tarayıcı içi, yazmasız
CSV önizlemesi korunmuştur. Yetkili kullanıcılar için bunun devamına ayrı
`Metraj Import Merkezi` eklenmiştir. Bu merkez:

- CSV'yi sunucu doğrulamasına gönderir,
- batch özetini, normalize satır/hata tablosunu ve event geçmişini gösterir,
- validate/cancel ve açık onay dialog'lu apply işlemlerini sunar,
- uygulanmış batch'ten oluşan metraj föyüne bağlantı verir,
- proje kapsamındaki geçmiş batch'leri `/hakedis?import=<batch-id>` bağlantısıyla
  açar.

Viewer rolünde kalıcı import paneli ve upload/mutation kontrolleri DOM'a
eklenmez; mevcut yerel yazmasız önizleme görünür kalır.

## Yazmasız Tarayıcı Kabulü

Kabul, `F8-KABUL-20260722 / F8-HAK-001` gerçek read-model'i üzerinde
`accounting` ve `viewer` demo rolleriyle yapıldı. CSV seçilmedi, form
gönderilmedi ve lifecycle mutation'ı çalıştırılmadı.

| Kabul | Sonuç |
|---|---|
| Accounting görünürlüğü | Kalıcı panel ve upload formu görünür |
| Viewer DOM sınırı | Kalıcı panel `0`, upload formu `0`, yerel önizleme `1` |
| 1440 × 900 açık tema | Panel ortak AppShell ve rapor sekmesiyle uyumlu |
| 390 × 844 açık tema | `scrollWidth=375`, `clientWidth=375`; sayfa taşması yok |
| 390 × 844 koyu tema | `scrollWidth=375`, `clientWidth=375`; kontrast/yüzey uyumlu |
| Konsol | Error/warn kaydı `0` |
| Print sözleşmesi | Upload/history/action katmanı gizli; özet ve satır tablosu basılabilir |

## Erişilebilirlik ve Deep-link

- `aria-live` sonuç alanı bulunur.
- Hata özeti ilgili satır `id` değerine bağlantı verir.
- Durumlar renk yanında açık metin etiketi taşır.
- Apply dialog'u ilk odağı onay düğmesine taşır.
- Escape/vazgeç odağı tetikleyiciye; başarılı apply odağı oluşan föy
  bağlantısına döndürür.
- Deep-link tam scoped detail action'ıyla proje ve kaynak hakedişi çözer,
  doğru projeyi genişletir ve `Aktarım / Simülasyon` sekmesini seçer.
- Yetkisiz/yanlış scope deep-link ortak varlık gizleyen hata sözleşmesini
  kullanır.

## Veri Değişmezliği

Kabul sonrasında:

- import batch/row/event sayıları `0/0/0`,
- yanlış scope import sayısı `0`,
- Faz 11 read-only scenario mutabakatı başarılı,
- kaynak hakediş, snapshot ve muhasebe bağlantısı korunmuştur.

Gerçek geçerli/hatalı CSV, lifecycle event/audit sayıları ve idempotent apply
kabulü Faz 12 Dilim 5 — Gerçek Veri ve Kapanış kapsamındadır.
