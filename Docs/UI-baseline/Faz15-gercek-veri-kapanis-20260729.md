# Faz 15 İzole Gerçek Veri ve Kapanış Kabulü — 29.07.2026

## Amaç ve izolasyon

Bu kabul, mevcut demo tenant'ında yalnız aşağıdaki yeni firma/dönem kapsamına
kalıcı veri yazmıştır. Önceki fazların kabul fixture'ları ile Faz 13 dış
sağlayıcı sınırı değiştirilmemiştir.

| Alan | Değer |
|---|---|
| Tenant | `tenant-noa-demo` |
| Firma | `company-f15-kabul-20260729` — F15 Filo Kabul Şirketi |
| Dönem | `period-f15-kabul-20260729` — F15 Kabul 2026 |
| Proje | `F15-KABUL-20260729` (`OPEN`) |
| Personel | `PER-F15-KABUL-001` |
| Araç | `vehicle-f15-kabul-20260729` — `F15 KABUL 001` |
| Aktör | DEMO İNŞAAT accounting (`user-main`) |

## Gerçek veri sonucu

Ortak filo service/repository/audit yoluyla aşağıdaki sonuçlar oluştu:

| Kayıt | Kabul sonucu |
|---|---|
| Araç ataması | İlk atama `TRANSFERRED`; aynı araç için ikinci atama `ACTIVE` |
| Yakıt | Tek manuel kayıt `RECORDED → CANCELLED` |
| Bakım planı | `ACTIVE → COMPLETED`, son bakım tarihi `2026-07-31` |
| Bakım kaydı | `DRAFT → COMPLETED` |

Merkezi audit'te 9 aksiyon vardır: iki atama oluşturma, bir transfer, yakıt
oluşturma/iptal, bakım planı oluşturma/tamamlama ve bakım kaydı
oluşturma/tamamlama. Audit metadata serbest atama/bakım notu veya servis
ayrıntısı taşımaz.

Atama ve yakıt create retry'ları idempotent sonuç verdi; tamamlanmış bakımın
tekrar tamamlanması reddedildi ve audit sayısını artırmadı. Aynı kabul ikinci
kez çalıştırıldığında kayıt, audit ve yan etki sayıları değişmedi.

## İzolasyon ve regresyon

- Yanlış firma, dönem ve proje sayımları `0` kaldı.
- Kabul scope'unda kasa/banka hareketi, gider, ledger, bordro tahakkuku, stok
  hareketi ve puantaj sayıları `0` kaldı.
- Faz 11 `npm run hakedis:scenario:verify` ve Faz 12
  `npm run hakedis:import:scenario:verify` kabulden sonra başarılı geçti.

## Tekrarlanabilir mutabakat

```text
npm run fleet:acceptance:verify
npm run hakedis:scenario:verify
npm run hakedis:import:scenario:verify
```

İlk komut fixture'ı oluşturur veya güvenle yeniden kullanır; yaşam döngüsü,
idempotency, audit ve izolasyon koşullarını birlikte denetler.

## Kimliği doğrulanmış görsel kabul — 29.07.2026

İzole kabul firma/döneminde accounting yetkili demo oturumuyla `/araclar`
rotası doğrulandı. Yerel `kurumsal` abonelik fixture'ı yalnız bu kabul
oturumunun scope erişimini sağlar; dış ödeme veya sağlayıcı entegrasyonu
kullanılmaz.

- 1440×900 masaüstünde koyu ve açık tema, global yatay taşma olmadan; beş
  gerçek kabul kaydı ve kullanıcı dostu plaka/proje/personel etiketleriyle
  görüntülendi.
- 390×844 mobil görünümde global yatay taşma yoktur; geniş operasyon tablosu
  kendi yatay kaydırma kabında kalır.
- Aktif atama detay drawer'ı hem satır aksiyonuyla hem de
  `/araclar?fleet=F15-KABUL-20260729::assignment::vehicle-f15-kabul-20260729::2026-07-30`
  deep-link'i ile açılıp güvenle kapatıldı.
- Print sözleşmesinde etkileşimli kontroller `print:hidden`, operasyon tablosu
  ise yazdırılabilir kaldı. Tarayıcı konsolunda hata veya uyarı gözlenmedi.

Bu kabul ile Faz 15'in veri, iş akışı ve görsel kapanışı tamamlanmıştır.
