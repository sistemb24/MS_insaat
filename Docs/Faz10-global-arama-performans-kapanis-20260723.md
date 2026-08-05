# Faz 10 Global Arama Performans Kararı ve Kapanış

> Tarih: 23.07.2026
> RFC: RFC-F10-01
> Karar: Federatif repository korunur; yeni indeks/projection RFC'si ve
> migration açılmaz.

## Ölçüm Yöntemi

`npm run search:benchmark` komutu üç aktif firma/dönem scope'unu gerçek
PostgreSQL verisiyle ölçer. Her scope için üç ısınma turundan sonra sekiz sorgu
on kez çalıştırılır. Bir tur 240, üç bağımsız tur toplam 720 zaman örneğidir.

Sorgu seti farklı kaynak ve eşleşme biçimlerini kapsar:

`FAT-0006`, `212121321`, `HAK-0001`, `şantiye`, `tedarikçi`, `kamyon`, `DEMO`,
`2026`.

Ölçüm action'ın 250 ms istemci debounce süresini içermez; federatif repository
ve PostgreSQL sorgu/DTO üretim süresini ölçer. Benchmark salt-okunurdur, audit
ve domain mutation üretmez.

## Gerçek Scope Sonuçları

| Scope | Aranabilir kayıt | İlk tur medyan | İlk tur p95 | İlk tur maksimum |
|---|---:|---:|---:|---:|
| DEMO İNŞAAT / 2026 | 55 | 10,68 ms | 18,47 ms | 32,84 ms |
| AKDENİZ İNŞAAT / 2026 | 31 | 7,02 ms | 10,04 ms | 11,38 ms |
| ANADOLU YAPI / 2026 | 31 | 5,51 ms | 8,48 ms | 10,01 ms |

İki tekrar turunda en kötü p95 değerleri 10,03 ms ve 10,60 ms oldu. Üç turun
karar için kullanılan en kötü değeri 18,47 ms, en yüksek kayıt hacmi 55'tir.

## Eşik Kararı

| RFC eşiği | Ölçülen en kötü değer | Kullanım | Sonuç |
|---|---:|---:|---|
| 10.000 kayıt/scope | 55 | %0,55 | Geçti |
| p95 300 ms | 18,47 ms | %6,16 | Geçti |

Her iki eşik de geniş marjla geçtiği için PostgreSQL FTS/GIN, keyfi `contains`
indeksi veya `ScopedSearchDocument` projection'ı eklenmeyecektir. Şema ve
migration değişmeden mevcut federatif repository Faz 10 üretim kararıdır.

Scope başına kayıt hacmi 10.000'i veya tekrarlı ölçümde p95 300 ms'yi aşarsa
bu karar yeniden açılır; veri yaşam döngüsü, backfill, indeks/projection ve
rollback için yeni bir RFC gerekir. Bu yerel gerçek veri ölçümü gelecekteki
production yükünü garanti etmez; eşikler aynı benchmark ile izlenebilir.

## Doğrulama ve Kapanış

- Performans karar paketi: 3 dosya / 27 test
- Tam paket: 227 dosya / 1.273 test
- Type-check, Prisma validate, lint ve `git diff --check`: başarılı
- Production build: 74/74 sayfa
- Şema, migration, gerçek veri ve mevcut mutation akışları değişmedi

Bu kararla RFC-F10-01'in beş dilimi ve Faz 10 Global Scoped Arama tamamlandı.
