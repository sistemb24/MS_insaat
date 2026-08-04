# Faz 22 — İzole Gerçek Veri ve Kapanış Kabulü

> Tarih: 30.07.2026
> Kapsam: Personel Şantiye Transferi
> Sonuç: **Kabul edildi**

## İzole kapsam

- Tenant: `tenant-noa-demo`
- Firma: `company-f22-kabul-20260730`
- Dönem: `period-f22-kabul-20260730`
- Kabul komutu: `npm run transfer:acceptance:verify`

Kabul scripti gerçek Prisma repository, servis ve merkezi audit yolunu kullanır.
Üç aktif personel ile üç aktif şantiye yalnız bu firma/dönem kapsamında
oluşturuldu. Mevcut demo ve önceki faz kabul kapsamları değiştirilmedi.

## Gerçek veri sonucu

| Senaryo | Son durum | Personel kartı sonucu |
|---|---|---|
| F22 Ayşe Demir, Kuzey → Güney | `APPROVED` | `site` Güney oldu; görev ve telefon korundu. |
| F22 Mehmet Kaya, Kuzey → Doğu | `REJECTED` | `site` Kuzey olarak kaldı. |
| F22 Elif Yılmaz, Doğu → Kuzey | `SUBMITTED` | Gelecek tarih nedeniyle onaylanmadı; `site` Doğu kaldı. |
| F22 Ayşe Demir, Güney → Doğu | `DRAFT` | Son onaylı hedefi kaynak alan zincir taslağı oluştu. |

Script iki ardışık kez çalıştırıldı. Her iki çalışmada dört transfer, dört
farklı yaşam döngüsü durumu ve dokuz audit kaydı değişmeden kaldı. Create,
submit ve approve tekrarları idempotent sonuç verdi; personel kartı veya audit
çoğalmadı.

## İzolasyon ve güvenlik

- Yanlış firma/dönem transfer okuyamadı.
- Viewer transfer oluşturamadı.
- Accounting yönetici onayı veremedi.
- Kapalı dönem mutasyonu reddedildi.
- Gelecek tarihli transfer onaylanmadı.
- Aynı personel için ikinci `SUBMITTED` transfer oluşturulmadı.
- Audit yalnız teknik kimlik, personel/şantiye kodu ve güvenli durum/revizyon
  geçişlerini taşıdı; not, kişi/şantiye adı ve request key taşımadı.
- Avans, izin, kasa/banka, gider, yevmiye, bildirim, bordro, KKD, stok,
  puantaj ve araç atama sayaçları sıfır kaldı.

## UI kabulü

Yerel `/personel` rotası gerçek F22 accounting ve viewer oturumlarıyla
doğrulandı.

- Sayaçlar `1 onay bekleyen / 1 onaylanan / 1 taslak` gösterdi.
- Dört durum kartı, üç şantiye filtresi ve 2026 yıl filtresi gerçek veriyi
  gösterdi.
- Onaylı kayıt
  `/personel?transfer=F22-KABUL-20260730%3A%3Aemployee-transfer%3A%3A001`
  deep-link'iyle açıldı.
- Accounting yüzeyinde yeni transfer kontrolü vardı; viewer DOM'unda hiçbir
  transfer mutation kontrolü yoktu.
- Koyu ve açık temada ayrıntı paneli okunaklıydı.
- 390 × 844 px görünümde `scrollWidth <= innerWidth`; global yatay taşma
  oluşmadı.
- Print-safe sınıfları bileşen sözleşme testiyle doğrulandı.

Admin oturumu mevcut tarayıcı kullanıcısına ait olmadığı için canlı tarayıcı
oturum seçicisinde açılamadı. Admin onay/red davranışı gerçek servis kabulünde,
admin DOM sınırı ise bileşen testinde doğrulandı.

## Kalite kapıları

- Hedefli Faz 22 paketi: 5 dosya / 36 test
- Tam Vitest paketi: 280 dosya / 1.638 test
- `npm run type-check`: geçti
- `npm run db:validate`: geçti
- Migration durumu: 54 migration, veritabanı güncel
- `npm run lint`: geçti
- `npm run build`: geçti, 77 sayfa üretildi
- `git diff --check`: geçti

Faz 22'nin beş uygulama dilimi tamamlandı.
