# Staging Operasyon Politikası Taslağı

Tarih: 04.08.2026
Faz: 36 / Dilim 1 karar desteği
Durum: Onaylandı; 04.08.2026

## 1. Kapsam

Bu politika yalnız onaylanan Aday A staging ortamını kapsar:

- Vercel Node.js Functions `fra1` Frankfurt.
- Neon AWS Europe Frankfurt `eu-central-1`.
- Cloudflare R2 `eu` jurisdiction.
- Sentry DE region.

Production RPO/RTO, SLA, retention veya yayın kararı değildir. Hesap açma,
credential girme, DNS değiştirme ya da deployment yetkisi vermez.

## 2. Ortam izolasyonu

1. Vercel Pro/Enterprise kullanılıyorsa ayrı `staging` Custom Environment;
   kullanılmıyorsa yalnız `staging` branch'e bağlı Preview environment kurulur.
2. Staging'in DB, R2 bucket/namespace, environment variable seti ve domaini
   production'dan ayrıdır; production secret'ı staging'e kopyalanmaz.
3. Staging yalnız seed/demo/sentetik veri kullanır. Production DB dump'ı,
   gerçek müşteri belgesi veya gerçek kişisel veri staging'e taşınmaz.
4. Staging domaini public indexing'e kapalı ve mümkünse erişim kontrollüdür.
5. Aynı release artifact'i ileride production adayı olabilir; staging geçişi
   production deployment veya trafik açma anlamına gelmez.

Vercel Custom Environment, branch rule, domain ve ayrı environment variable
tanımlamayı destekler. Plan bunu sağlayıcı hesabı/planı satın alınmış gibi
varsaymaz; plan seviyesi kaynak oluşturulmadan önce doğrulanır.

## 3. Onaylanan staging hizmet hedefleri

| Politika | Önerilen değer | Açıklama |
|---|---|---|
| RPO | En fazla 24 saat | Son doğrulanmış DB export + binary inventory/checksum noktası |
| RTO | En fazla 8 saat | Yeni izole staging kaynaklarında restore ve smoke tamamlanma hedefi |
| Hizmet taahhüdü | Dış SLA yok | Staging müşteri üretim hizmeti değildir |
| Destek penceresi | Hafta içi 09:00–18:00 Europe/Istanbul | Yalnız iç operasyon hedefi |
| SEV-1 ilk değerlendirme | 1 saat, destek penceresi içinde | Tenant izolasyonu, secret sızıntısı veya veri bütünlüğü riski |
| SEV-2 ilk değerlendirme | 4 saat, destek penceresi içinde | Readiness/deployment/restore aksaması; veri güvenliği etkisi yok |

Bu süreler Murat Saygı tarafından staging için onaylanmıştır ve public SLA
olarak yayımlanmaz.

## 4. Backup ve restore politikası

1. Neon PITR/restore window etkinleştirilir; plan limiti ve gerçek window karar
   kaydında kanıtlanır.
2. Neon scheduled snapshot kullanılabilir, ancak özellik beta olduğundan tek
   backup kanalı kabul edilmez.
3. En az günlük bir bağımsız PostgreSQL custom-format export alınır; checksum ve
   anonim release kimliği kaydedilir.
4. Export, doküman bucket'ından ayrı bir R2 `eu` jurisdiction backup bucket veya
   prefix'inde, en az yetkili ayrı credential ile tutulur.
5. Aynı recovery point için document binary inventory ve checksum manifesti
   DB export ile eşlenir.
6. Backup retention önerisi 14 gündür. Süre dolumu R2 lifecycle ile uygulanır;
   lifecycle davranışı silmenin anlık olacağını varsaymaz.
7. Ayda en az bir kez yeni izole DB/bucket namespace'e restore provası yapılır;
   migration status, kritik tablo sayımı, tenant izolasyonu ve doküman read
   smoke'u geçmeden prova başarılı sayılmaz.

Neon restore window ile bağımsız export birbirinin yerine geçmez. R2 lifecycle
otomatik saklama yönetimidir; kanıtlanmış restore değildir.

## 5. Staging retention

| Veri sınıfı | Önerilen üst sınır | Davranış |
|---|---|---|
| DB ve binary backup | 14 gün | Lifecycle + backup index; aylık restore kanıtı |
| Sentetik staging dokümanı | 30 gün | Test fixture hariç periyodik purge |
| Uygulama/edge logu | 30 gün veya provider planının daha kısa sınırı | Secret/PII redaction zorunlu |
| Sentry event/trace | 30 gün veya provider planının daha kısa sınırı | PII/IP scrubbing ve replay kapalı başlangıç |
| CI artifact ve test kanıtı | 30 gün | Secret içermeyen release evidence |
| Audit ve güvenlik olayı kanıtı | Hukuki karar bekliyor | Toplu/destructive silme yok |

Production retention ve gerçek kişi verisi için bu süreler emsal sayılmaz.

## 6. Secret ve erişim politikası

- Secret değerleri yalnız sağlayıcı environment/secret yüzeyinden enjekte
  edilir; repo, belge, terminal kaydı veya ticket'a yazılmaz.
- Staging ve production secret setleri hiçbir zaman paylaşılmaz.
- En az yetki uygulanır; R2 runtime credential backup bucket'a yazamaz, backup
  credential uygulama doküman bucket'ını yönetemez.
- Planlı rotation hedefi 90 gündür; sızıntı şüphesi, rol değişikliği veya
  erişim kaybında beklemeden rotation yapılır.
- Rotation yeni deployment, health/readiness, eski secret iptali ve redacted
  audit kanıtı olmadan tamamlanmış sayılmaz.

## 7. Incident sınıfları

| Seviye | Örnek | İlk güvenli davranış |
|---|---|---|
| SEV-1 | Cross-tenant erişim, secret sızıntısı, veri bütünlüğü riski | Staging erişimini/trafiğini kapat; secret rotate et; kanıtı redacted tut |
| SEV-2 | Readiness 503, migration/restore/deployment başarısızlığı | Trafiği açma; DB/migration durumunu salt-okunur incele |
| SEV-3 | UI/performans veya gözlemlenebilirlik kusuru | Backlog kaydı; güvenlik etkisi varsa seviyeyi yükselt |

Incident sahibi; etki, tenant scope, release kimliği, timeline, karar ve kapanış
kanıtını kaydeder. Ham cookie, token, auth header, e-posta veya kişisel veri
incident kaydına alınmaz.

## 8. Onaylanan yalın rol modeli

Repo içinde kişisel iletişim bilgisi saklamadan şu rol etiketleri atanabilir:

| Rol etiketi | Sorumluluk | Aynı kişide birleşebilir mi? |
|---|---|---|
| `PROJE_SAHIBI` | Sağlayıcı, bütçe, go/no-go ve politika onayı | Evet; açıkça onaylanır |
| `TEKNIK_OPERASYON` | Release, rollback, Vercel, secret ve incident | Evet |
| `DB_RECOVERY` | Neon migration, backup, restore ve RPO/RTO kanıtı | Evet |
| `VERI_HUKUK` | KVKK, retention, legal hold ve yayın içeriği | Teknik rollerle birleşmesi önerilmez |

Gerçek iletişim bilgileri repo yerine erişimi kontrollü operasyon rehberinde
tutulur. Tek kişi ilk üç rolü üstlenebilir; onaylayan ve uygulayanın aynı kişi
olduğu karar kaydında açıkça gösterilir.

| Rol etiketi | Atanan | Onaylayan | Durum |
|---|---|---|---|
| `PROJE_SAHIBI` | Murat Saygı | Murat Saygı | ONAYLANDI |
| `TEKNIK_OPERASYON` | Murat Saygı | Murat Saygı | ONAYLANDI |
| `DB_RECOVERY` | Murat Saygı | Murat Saygı | ONAYLANDI |
| `VERI_HUKUK` | Murat Saygı | Murat Saygı | ONAYLANDI |

Staging'de yedek insan sorumlu yoktur. Bu tek-sorumlu riski production için
kabul edilmiş sayılmaz; production go/no-go öncesinde yeniden karara bağlanır.

## 9. Staging domain kararı

Domain karar sahibi Murat Saygı'dır. Özel staging DNS adı verilene kadar ayrı
Vercel staging/Preview environment'ın ürettiği geçici `*.vercel.app` hostname
kullanılır. Kesin hostname kaynak oluşturma sırasında karar kaydına yazılır;
production canonical domaini veya production DNS onayı sayılmaz.

## 10. Onay kaydı

Kullanıcı 04.08.2026 tarihinde staging için 24 saat RPO, 8 saat RTO, 14 gün
backup ve 30 gün staging retention taslağını onayladı; dört rolün tamamına
Murat Saygı'yı atadı. Domain alanındaki isim domain karar sahibi olarak
kaydedildi; geçici Vercel hostname tercihi kaynak oluşturulana kadar geçerlidir.

## 11. Resmî kaynaklar

- [Vercel staging environment kurulumu](https://examples.vercel.com/kb/guide/set-up-a-staging-environment-on-vercel)
- [Neon scheduled snapshot ve flexible retention](https://neon.com/docs/changelog/2025-10-31)
- [Cloudflare R2 object lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
- [Cloudflare R2 consistency modeli](https://developers.cloudflare.com/r2/reference/consistency/)
