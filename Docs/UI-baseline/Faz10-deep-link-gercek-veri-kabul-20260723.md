# Faz 10 Deep-link ve Gerçek Veri Kabulü

> Tarih: 23.07.2026
> Kapsam: RFC-F10-01 Dilim 4
> Sonuç: Kabul edildi

## Uygulanan Deep-link Sözleşmesi

- Fatura, çek ve ihale kayıt sonuçları güvenli iç route üzerinde `ara` ve
  `kayit` query parametrelerini taşır.
- `ara` 2–80 karakterlik domain doğrulamasından, `kayit` düz metin ve 128
  karakter sınırından geçer.
- Hedef surface `ara` değerini mevcut arama/odak kontrolüne aktarır ve `kayit`
  ile yalnız tam eşleşen satırı vurgular.
- Henüz parametre tüketmeyen EntityRecord, Hakediş Pro proje, finansal hakediş
  ve araç sonuçları yalnız mevcut route'a gider; sahte detay bağlantısı yoktur.

## Gerçek Veri Kabul Kanıtı

DEMO İNŞAAT / 2026 kapsamındaki mevcut kayıtlar salt-okunur olarak kullanıldı:

| Rol | Kayıt | Kabul |
|---|---|---|
| Muhasebe | Çek `212121321` | Global arama sonucu `ara/kayit` URL'sine gitti; arama alanı doldu, 1/3 satır kaldı ve tam kayıt vurgulandı. |
| Yönetici | Alış faturası `FAT-0006` | Doğrudan deep-link doğru alış faturası sekmesini ve tam kayıt vurgusunu açtı. |
| Salt Okur | Çek `212121321` | Aynı deep-link okundu; vurgulu kayıt görünürken `Tahsil Et` mutation kontrolü pasif kaldı. |

Gerçek demo verisinde yeni kabul kaydı oluşturulmadı ve domain mutation'ı
çalıştırılmadı. Üç canlı tenant/firma aboneliği de Kurumsal olduğundan gerçek
veride kapalı paket örneği yoktur; Başlangıç planında çek/ihale/hakediş/araç
kaynaklarının hiç sorgulanmaması repository testinde fail-closed doğrulandı.

## Görsel ve Erişilebilirlik Kabulü

- Masaüstü ve 390 × 844 mobil görünümde yatay sayfa taşması yoktur.
- Açık ve koyu temada deep-link vurgusu görünür kaldı.
- Ana içerikte tek `h1`, erişilebilir arama label'ı ve tablo satırı semantiği
  korundu.
- Mobil drawer, global arama ve hedef satır akışı birlikte çalıştı.
- Kabul oturumunda tarayıcı konsol hatası oluşmadı.

## Otomatik Doğrulama

- Hedefli paket: 8 dosya / 84 test
- Tam paket: 226 dosya / 1.268 test
- Type-check, Prisma validate, lint ve `git diff --check`: başarılı
- Production build: 74/74 sayfa

Prisma şeması, migration, kalıcı arama indeksi ve gerçek domain kayıtları bu
dilimde değiştirilmedi.
