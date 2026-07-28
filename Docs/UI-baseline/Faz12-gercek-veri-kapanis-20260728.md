# Faz 12 Gerçek Veri ve Kapanış Kabulü — 28.07.2026

## Amaç ve izolasyon

Bu kabul yalnız aşağıdaki F12 fixture'ında gerçek veriye yazmıştır:

| Alan | Değer |
|---|---|
| Proje | `F12-KABUL-20260728` |
| Kaynak hakediş | `F12-HAK-001` (`DRAFT`) |
| Poz | `F12-POZ-01` (`m3`, 1.000 TL) |
| Aktör | DEMO İNŞAAT accounting (`user-main`) |

F8/F11 kabul kaynakları değiştirilmemiştir. Bunun kanıtı olarak Faz 11'in
`npm run hakedis:scenario:verify` komutu, F12 kabulünden sonra da başarılıdır.

## Gerçek veri sonucu

Başlangıç genel metrajı `1 m3` olan taslak hakedişe aşağıdaki iki kabul girdisi
uygulandı:

| Batch | Girdi | Sonuç |
|---|---|---|
| `IMP-0001` | `F12-POZ-01`, `2.5 m3` | `APPLIED`; toplam `3.5 m3 / 3.500 TL`; `IMP-0001` föyü ve tek satır |
| `IMP-0002` | bilinmeyen poz, `9 m3` | `DRAFT`; tek `ITEM_NOT_FOUND`; föy veya metraj satırı yok |

Geçerli batch eventleri sırasıyla `CREATED`, `VALIDATED`, `APPLIED`'dır.
Geçerli dosyanın create retry'ı ve uygulanmış batch'in apply retry'ı
idempotent sonuç döndürmüş; batch/event/audit/metraj sayıları artmamıştır.

Merkezi audit toplamı dörttür: iki `CONSTRUCTION_MEASUREMENT_IMPORT_CREATED`,
bir `..._VALIDATED`, bir `..._APPLIED`. Metadata denetiminde dosya adı, SHA-256
ve ham CSV satırı bulunmadı. Yanlış firma, dönem ve proje sayımları sıfırdır.

## Tekrarlanabilir mutabakat

```text
npm run hakedis:import:scenario:verify
npm run hakedis:scenario:verify
```

İlk komut F12 import kabulünü yalnız okur; ikinci komut F8/F11 kaynak
değişmezliğini kontrol eder. F12 fixture'ını oluşturup/yeniden kullanmak için
ayrı ve bilinçli kabul komutu kullanılabilir:

```text
npx tsx scripts/run-construction-measurement-import-acceptance.ts
```

## Gerçek UI kabulü

Accounting oturumunda aşağıdaki deep-link açıldı:

```text
/hakedis?import=1e704fea-132a-4b6b-a0e4-500c598f1e30
```

Doğrulanan görünür sonuçlar:

- F12 projesi, `F12-HAK-001` ve `Aktarım / Simülasyon` sekmesi otomatik açıldı.
- `Metraj Import Merkezi`; uygulanmış `IMP-0001`, satır sonucu, lifecycle
  geçmişi, hata batch'i ve oluşan metraj föyü bağlantısını gösterdi.
- Hakediş ve sözleşme özetleri `3.500,00 TL`, iki föy ve iki metraj satırıyla
  mutabıktır.
- 1440 × 900 light/dark ve 390 × 844 light/dark görünümünde yatay taşma yoktur
  (`scrollWidth=clientWidth`); mobil menü dialog'u erişilebilir açılıp kapanır.
- `print:hidden` üç operasyon alanında bulunur; summary/table print için
  korunur. Konsolda error/warn yoktur.
- Bölge, başlık, tablo, tablist, form, durum metni ve erişilebilir bağlantılar
  DOM semantiğinde mevcuttur; durum yalnız renge dayanmaz.
