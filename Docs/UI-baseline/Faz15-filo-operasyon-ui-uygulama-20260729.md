# Faz 15 — Filo Operasyon UI Uygulama Kaydı

Tarih: 29.07.2026

## Kapsam

`/araclar` altında mevcut araç kartları korunarak Filo Operasyon Merkezi
eklendi. Arayüz; araç ataması, manuel yakıt, bakım planı ve bakım kaydını
tek yüzeyde sunar. Bu kayıt, gerçek operasyon verisi yazılmadan hazırlanmış
uygulama kabulüdür.

## Arayüz sözleşmesi

| Alan | Uygulanan davranış |
|---|---|
| Liste | Arama, tür filtresi, metinli durum işaretleri ve mobil yatay kaydırma kabı. |
| Deep-link | Seçili kayıt `/araclar?fleet=<id>` ile erişilebilir drawer'da açılır. |
| Atama | Aktif atama tamamlama veya aynı araçla proje/sürücü seçerek kontrollü transfer sunar. |
| Formlar | Atama, yakıt, bakım planı ve bakım kaydı; aktif scope araç/proje/personel lookup'larını kullanır. |
| Bakım bağı | Bakım kaydı, serbest plan kimliği yerine aktif bakım planını listeden seçer. |
| Yetki | Viewer/kapalı dönem mutation kontrollerini görmez; action katmanı yeniden guard uygular. |
| Print/erişilebilirlik | Form ve drawer kontrol yüzeyleri print dışında; etiketli alanlar, Escape ile drawer kapatma ve odaklanan kapatma düğmesi bulunur. |

## Otomatik kabul

`vehicle-fleet-operations`, repository, service, action ve component hedefli
paketi 5 dosya / 33 testle geçti. Component testi liste/filtre, deep-link
güncellemesi, seçili atama drawer'ı ve transfer formu, viewer mutation sınırı
ile aktif bakım planı seçicisini kapsar.

## Canlı görsel kabul — 29.07.2026

Dilim 5'teki izole gerçek kabul firma/döneminde accounting yetkili demo
oturumuyla `/araclar` doğrulandı. 1440×900 koyu/açık tema ve 390×844 mobil
görünümde global yatay taşma görülmedi; mobil tablonun yatay kaydırması kendi
kabında kaldı. Aktif atama drawer'ı deep-link ile açılıp kapatıldı; print
sözleşmesinde etkileşimli denetimler gizlenirken tablo korundu. Konsolda hata
veya uyarı yoktu. Ayrıntılı kayıt
`Docs/UI-baseline/Faz15-gercek-veri-kapanis-20260729.md` içindedir.
