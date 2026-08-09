# Production Saklama ve İmha Karar Kataloğu v1

Karar tarihi: 09.08.2026
Policy sürümü: `2026-08-09.a`
Karar sahibi/onaylayan: Murat Saygı / Murat Saygı
Durum: ONAYLANDI; canlı scheduler, hesap dondurma ve imha yetkisi vermez

## Kategori kararları

| Kategori | Karar kimliği | Saklama ve imha kararı |
|---|---|---|
| Kimlik ve iletişim | `retention-20260809-identity-contact-v1` | Hesap aktifken saklanır; başka hukuki dayanağı olmayan profil/iletişim verisi kapanıştan sonra en geç 30 gün içinde silinir veya anonimleştirilir. |
| Kimlik doğrulama ve erişim | `retention-20260809-auth-access-v1` | Hesap kapanışında oturumlar derhal iptal edilir; süresi dolan session, davet, challenge ve token kayıtları en fazla 30 gün sonra temizlenir. Güvenlik kanıtı audit kategorisine geçer. |
| Audit ve güvenlik | `retention-20260809-audit-security-v1` | Normal audit ve güvenlik olayları olay tarihinden itibaren 3 yıl kısıtlı erişimle saklanır; legal hold süre dolumunu durdurur. |
| Finans ve muhasebe | `retention-20260809-finance-accounting-v1` | Fatura, defter, ledger, çek ve ticari belgeler ilgili takvim yılının sonundan itibaren 10 yıl kısıtlı erişimle saklanır. |
| Personel ve İSG | `retention-20260809-personnel-v1` | SGK/işyeri kayıtları ilgili yılı takip eden yılbaşından itibaren 10 yıl; çalışan kişisel sağlık dosyaları işten ayrılıştan itibaren en az 15 yıl saklanır. Sağlık verisi ayrı erişim sınıfındadır. |
| Dokümanlar | `retention-20260809-documents-v1` | Genel dokümanlarda 30 günlük çöp süresi uygulanır. Finans/personel/İSG dokümanı kendi kategori süresini miras alır; sınıflandırılmamış doküman purge edilmez. |
| Entegrasyon ve webhook | `retention-20260809-integrations-webhooks-v1` | Ham payload ve teknik teslim kayıtları 90 gün sonra silinir veya anonimleştirilir. Finansal kanıt kendi kategorisine taşınır. |
| Destek ve iletişim | `retention-20260809-support-communications-v1` | Genel kayıtlar ticket kapanışından itibaren 2 yıl saklanır. Ticari uyuşmazlık/sözleşme kanıtı legal hold veya ticari belge kategorisine alınır. |
| Backuplar | `retention-20260809-backups-v1` | Günlük backup 30 gün tutulur. Restore sonrasında daha önce verilmiş silme manifestleri yeniden uygulanır. |

## Genel kurallar

- İlgili kişi talebi en geç 30 gün içinde sonuçlandırılır.
- Periyodik imha 90 günde bir planlanır ve altı aylık üst sınırı aşmaz.
- Legal hold erişim dondurmayı engellemez; purge ve fiziksel imhayı engeller.
- Legal hold kaydı referans, gerekçe, kapsam, başlangıç, gözden geçirme ve bitiş
  alanlarını taşır.
- İmha işlem kanıtı, diğer hukuki yükümlülükler saklı olmak üzere en az 3 yıl
  tutulur.
- Süresi dolan ve başka hukuki dayanağı olmayan kayıt operasyonel kullanıma açık
  bırakılamaz.

## Resmî dayanaklar

- KVKK silme/yok etme/anonimleştirme yönetmeliği:
  https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK
- 6102 sayılı Türk Ticaret Kanunu Madde 82:
  https://cdn.tbmm.gov.tr/KKBSPublicFile/D23/Y2/T1/KanunMetni/38650b69-c78b-48fe-b960-fe5fb6734047.html
- 213 sayılı Vergi Usul Kanunu Madde 253:
  https://ms.hmb.gov.tr/uploads/2019/01/1.4.213.pdf
- SGK işveren kayıt yükümlülükleri:
  https://ankara.sgk.gov.tr/Content/Post/d9d838d8-6585-40f5-bbcc-47bd43c59bb4/Isverenin-Yukumlulukleri-2022-05-15-06-17-29
- Çalışan sağlık dosyası saklama yükümlülüğü:
  https://www.csgb.gov.tr/sikca-sorulan-sorular/is-sagligi-ve-guvenligi-genel-mudurlugu/

## Uygulama sınırı

TypeScript karşılığı `src/lib/production-retention-policy.ts` dosyasındadır.
Account-closure preflight yalnız bu katalogdaki exact karar kimliklerini kabul
eder. Bu katalog tek başına canlı preflight, veri okuma, export, scheduler,
oturum iptali, hesap dondurma, legal hold yazımı, purge veya tenant silme
yetkisi vermez. Bu işlemler ayrı kod dilimi ve açık kullanıcı onayı gerektirir.
