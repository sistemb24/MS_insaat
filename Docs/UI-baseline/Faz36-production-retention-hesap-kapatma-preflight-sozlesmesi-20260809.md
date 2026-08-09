# Faz 36 Production Retention, Hesap Kapatma ve Legal Hold Preflight Sözleşmesi

Tarih: 09.08.2026
Durum: Sözleşme ve yerel salt-okunur değerlendirme çekirdeği hazır; canlı
preflight, erişim dondurma, purge ve tenant silme kapalı

## Amaç ve sınır

Bu dilim production tenant hesabı kapatılmadan önce gerekli veri envanteri,
saklama kararları, legal hold, export kanıtı, DB/R2 tutarlılığı ve backup silme
tekrarını tek fail-closed değerlendirmede toplar. Bu sözleşme hiçbir tenant,
oturum, DB kaydı, R2 nesnesi veya backup üzerinde yazma/silme yetkisi vermez.

`insaatyonet.com` domainindeki registrar `clientHold` engeli bu çalışmadan
bağımsız olarak beklemededir. Domain, DNS, TLS, yasal sayfa yayını, indexing ve
kullanıcı trafiği değiştirilmez.

## Onaylanan 10 varsayım

1. Hesap kapatma önce erişimi dondurur; aynı anda fiziksel silme yapmaz.
2. İlk sürüm yalnız Süper Admin tarafından başlatılır; self-servis kalıcı silme
   kapalıdır.
3. Başvurular resmi `info@msinsaat.com` kanalından alınır ve en geç 30 gün
   içinde sonuçlandırılır.
4. Silmeden önce tenant kapsamlı veri envanteri ve export kanıtı hazırlanır.
5. Aktif legal hold varken DB, R2 veya backup imhası başlamaz.
6. Finans, personel, fatura ve audit kayıtlarına tek bir genel saklama süresi
   atanmaz; veri kategorisi ve hukuki dayanak bazında ayrıca onaylanır.
7. Aktif DB kayıtları ile R2 binary nesneleri aynı işlem manifesti üzerinden
   temizlenir.
8. Doküman çöpündeki 30 günlük süre korunur; production scheduler ancak sentetik
   prova ve legal-hold kontrolünden sonra açılır.
9. Backup içindeki veri 30 günlük lifecycle ile doğal olarak düşer; restore
   sonrasında önceki silme manifestleri yeniden uygulanır.
10. İmha kanıtları, başka hukuki yükümlülükler saklı olmak üzere en az üç yıl
    tutulur.

## Resmî dayanak ve ürün yorumu

KVKK'nın Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi
Hakkında Yönetmeliği; işleme şartları ortadan kalktığında uygun imhayı, bütün
imha işlemlerinin kaydını, bu kayıtların en az üç yıl saklanmasını, ilgili kişi
talebinin en geç 30 gün içinde sonuçlandırılmasını ve politika kapsamındaki
periyodik imha aralığının en fazla altı ay olmasını düzenler:

- https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK

Bu teknik sözleşme veri kategorilerinin gerçek saklama sürelerini türetmez.
Her karar `decisionId` ile hukuk/veri sahibi tarafından ayrıca onaylanır.

## Mevcut teknik durum

- Prisma `Tenant` ilişkilerinin geniş bölümü `onDelete: Cascade` kullanır;
  doğrudan tenant silmek kapsamlı ve geri döndürülemez veri kaybı doğurabilir.
- Hesabın tamamını donduran, export eden veya koordineli imha eden production
  akışı yoktur.
- Doküman Merkezi metadata çöpü ve 30 günlük scoped purge çekirdeği vardır;
  production scheduler yoktur.
- DB metadata, production R2 binary nesneleri ve backup lifecycle arasında
  tenant kapatma manifesti yoktur.

## Yerel değerlendirme çekirdeği

`src/lib/production-account-closure-preflight.ts` şu kapıları değerlendirir:

- exact production runtime ve `production-account-closure-preflight` onayı;
- güvenli tenant/release kimliği;
- tenant varlığı;
- dokuz zorunlu saklama kategorisinin tekil ve onaylı karar kimlikleri;
- aktif legal hold;
- SHA-256 taşıyan hazır export manifesti;
- DB doküman metadata sayısı ile R2 nesne sayısı eşitliği;
- backup restore sonrasında silme manifestini yeniden uygulama hazırlığı.

Değerlendirme yeşil olsa bile çıktı sabit olarak `readOnly=true`,
`accessFreezeAllowed=false`, `purgeAllowed=false` ve
`destructiveDeleteAllowed=false` döner. Bu, preflight sonucunun canlı işlem
onayı gibi yorumlanmasını engeller.

## Zorunlu saklama karar kategorileri

| Kategori | Karar durumu |
|---|---|
| Kimlik ve iletişim | Hukuk/veri sahibi kararı beklenir |
| Kimlik doğrulama ve erişim | Hukuk/veri sahibi kararı beklenir |
| Audit ve güvenlik | Hukuk/veri sahibi kararı beklenir |
| Finans ve muhasebe | İlgili mevzuat ve hukuk kararı beklenir |
| Personel | İlgili mevzuat ve hukuk kararı beklenir |
| Dokümanlar | İçerik türü bazında karar beklenir |
| Entegrasyon ve webhook kayıtları | Sağlayıcı/veri amacı kararı beklenir |
| Destek ve iletişim kayıtları | Hukuk/veri sahibi kararı beklenir |
| Backuplar | 30 günlük lifecycle onaylı; silme-tekrar prosedürü beklenir |

Bu tablo tamamlanmadan `preflightReady` sonucu yeşil olamaz.

## Yürütme sırası ve ayrı onay kapıları

1. Veri kategorisi/saklama süresi karar tablosu tamamlanır.
2. Hesap dondurma ve legal-hold veri modeli ayrı kod/PR diliminde hazırlanır.
3. Salt-okunur tenant export/envanter adapter'ı hazırlanır.
4. Canlı preflight yalnız exact tenant kimliği ve ayrı açık onayla çalıştırılır.
5. DB/R2 silme manifesti ve idempotent yürütücü ayrı dilimde hazırlanır.
6. Kişisel/production veri içermeyen sentetik tenant ile prova yapılır.
7. Production scheduler ve her gerçek tenant kapatma işlemi için ayrıca açık
   kullanıcı onayı alınır.

## Bu dilimde yapılmayanlar

- Production DB veya R2 okunmadı.
- Export, backup, restore veya silme manifesti oluşturulmadı.
- Oturum iptali, hesap dondurma, legal hold, purge veya tenant delete yapılmadı.
- Workflow/schedule eklenmedi.
- Domain, DNS, TLS, yasal sayfa, indexing, deployment veya trafik değiştirilmedi.

Production Go/No-Go kararı `NO-GO` kalır. Sıradaki ayrı karar kapısı dokuz veri
kategorisinin saklama/imha karar tablosudur.
