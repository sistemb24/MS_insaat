# Faz 14 İzole Gerçek Veri ve Kapanış Kabulü — 28.07.2026

## Amaç ve izolasyon

Bu kabul, mevcut demo tenant'ında yalnız aşağıdaki yeni firma/dönem kapsamına
kalıcı veri yazmıştır. Faz 8–12 kabul fixture'ları ve Faz 13 dış sağlayıcı
sınırı değiştirilmemiştir.

| Alan | Değer |
|---|---|
| Tenant | `tenant-noa-demo` |
| Firma | `company-f14-kabul-20260728` — F14 İSG Kabul Şirketi |
| Dönem | `period-f14-kabul-20260728` — F14 Kabul 2026 |
| Proje | `F14-KABUL-20260728` (`OPEN`) |
| Personel | `PER-F14-KABUL-001` |
| Aktör | DEMO İNŞAAT accounting (`user-main`) |

## Gerçek veri sonucu

Ortak İSG service/repository/audit yoluyla aşağıdaki operasyon kayıtları
oluşturuldu ve kontrollü yaşam döngüsü geçişleri tamamlandı:

| Kayıt | Kabul sonucu |
|---|---|
| İş kazası | `draft → recorded → CLOSED` |
| Eğitim | `draft → planned → COMPLETED` |
| Eğitim katılımı | Aynı eğitim-personel çifti için tek satır |
| Saha denetimi | `draft → COMPLETED` |
| Denetim bulgusu | `open → RESOLVED` |
| KKD zimmeti | `ISSUED → RETURNED` |

Merkezi audit'te 13 beklenen aksiyon vardır: iş kazası için üç, eğitim için
üç, katılım için bir, denetim için iki, bulgu için iki ve KKD için iki. Audit
metadata denetiminde hassas serbest özet veya checklist metni yoktur.

Katılım create retry'ı ile iade edilmiş KKD teslim retry'ı idempotent sonuç
döndürdü; ikinci kabul çalışmasında satır, audit veya yan etki sayısı artmadı.

## İzolasyon ve regresyon

- Yanlış firma, dönem ve proje sayımları `0` kaldı.
- Bu kabul scope'unda kasa/banka hareketi, bordro tahakkuku, stok hareketi ve
  puantaj satırı sayıları `0` kaldı.
- Faz 11'in `npm run hakedis:scenario:verify` ve Faz 12'nin
  `npm run hakedis:import:scenario:verify` komutları kabulden sonra da başarılı
  geçti.

## Tekrarlanabilir mutabakat

```text
npm run isg:acceptance:verify
npm run hakedis:scenario:verify
npm run hakedis:import:scenario:verify
```

İlk komut fixture'ı oluşturur veya güvenle yeniden kullanır; aynı kabulü,
idempotency ve izolasyon koşullarını birlikte denetler. Diğer iki komut, önceki
Faz 11 ve Faz 12 kabul kaynaklarının değişmediğini doğrular.
