# NOA Production Operasyon Runbook'u

Tarih: 04.08.2026
Durum: Dry-run sözleşmesi; gerçek hosting, backup, object storage ve monitoring
provider'ı seçilmemiştir.

Faz 36 sağlayıcı, ortam ve sorumluluk kararlarının tek güncel kaydı
`Docs/operasyon/production-topoloji-ve-sahiplik-karar-kaydi.md` dosyasıdır.
Bu kayıtta `BLOCKER`, `ATANMADI` veya `KARAR BEKLİYOR` kalan zorunlu satırlar
aşağıdaki yayın kapısını kapalı tutar.

## Yayın ön koşulları

1. CI `test`, `type-check`, `db:validate`, `lint` ve `build` kapılarının tamamını
   geçmelidir.
2. Production environment doğrulaması geçmeli; secret değerleri loga veya
   ticket'a kopyalanmamalıdır.
3. `/api/health` HTTP 200 vermeli. `/api/readiness` yalnız DB probe başarılıysa
   HTTP 200; aksi halde 503 vermelidir.
4. Yayın sorumlusu, DB sorumlusu ve incident sorumlusu isimleri atanmalı;
   aşağıdaki `ATANMADI` satırlarından biri bile kalırsa canlı yayın engellenir.
5. Aynı release adayı için doğrulanmış backup/restore provası ve geri dönüş
   kararı kayda bağlanmalıdır.

## Migration dry-run

Staging veya izole restore DB'sinde:

```powershell
$env:NOA_RUNTIME_ENV = "staging"
pnpm db:validate
pnpm exec prisma migrate status --schema prisma/schema.prisma
pnpm db:migrate
pnpm exec prisma migrate status --schema prisma/schema.prisma
```

Production'da `db push` ve `db seed` yasaktır. `migrate deploy` yalnız backup
kanıtı, değişiklik penceresi ve atanmış DB sorumlusu ile çalıştırılır. Migration
başarısızsa aynı migration dosyası değiştirilmez; additive forward-fix hazırlanır.

## Backup ve restore dry-run

Komutlar provider seçildikten sonra bağlantı değerleri secret store'dan enjekte
edilir; komut satırı, terminal kaydı veya belgeye credential yazılmaz.

1. PostgreSQL custom-format backup al.
2. Dosya boyutu ve SHA-256 checksum kaydet.
3. Yeni, izole bir restore DB oluştur.
4. Backup'ı `pg_restore --clean --if-exists --no-owner` ile izole DB'ye yükle.
5. Migration status, tablo sayımı ve kritik tenant-scope smoke testlerini çalıştır.
6. Restore DB'yi production uygulamasına bağlama; kanıt sonrası kontrollü sil.

Object storage provider'ı yoktur. Mevcut `local` adapter tek-instance sınırıdır;
production backup kapsamı DB ile aynı recovery point'e bağlı doküman dizinini de
içermeden RPO/RTO veya kurtarılabilirlik iddia edilemez.

## Rollback kararı

- Uygulama kodu geriye alınabilir; destructive DB rollback çalıştırılmaz.
- Additive migration uygulandıysa eski kodun yeni şemayla uyumu doğrulanır.
- Uyum yoksa trafik durdurulur ve forward-fix tercih edilir. Restore yalnız veri
  kaybı etkisi, recovery point ve incident sorumlusu onayıyla son çaredir.
- Rollback öncesi yeni backup/checksum alınır; auth güvenlik hardening'i ve
  fail-closed provider sınırları gevşetilmez.

## Incident akışı

1. Alarmı/şikayeti zaman, route, release kimliği ve redacted correlation bilgisi
   ile kaydet; secret, cookie, token, ham auth header veya kişisel veri ekleme.
2. Etkiyi tenant, firma ve dönem kapsamına göre sınıflandır; başka tenant verisini
   inceleme kaydına taşımama.
3. Readiness 503 ise trafiği açma; DB ve migration durumunu salt-okunur kontrol et.
4. Incident sorumlusu rollback/forward-fix/restore kararını ve gerekçesini kaydeder.
5. Kapanışta timeline, etki, kök neden, veri bütünlüğü sonucu ve takip işi yazılır.

Production SLA, destek saati, RPO ve RTO henüz onaylı değildir; belge bunları
varmış gibi göstermez. Staging için onaylanan hedefler ve sahiplik ayrı karar
kaydında tutulur ve production taahhüdü sayılmaz.

## Retention ve hesap kapanışı

- Doküman çöpü uygulama sözleşmesinde 30 gündür; production scheduler henüz
  yoktur ve manuel purge otomatik retention kanıtı sayılmaz.
- Audit, auth session, rate-limit, backup, log ve hesap kapanışı süreleri hukuki
  ve operasyonel sahiplerce onaylanana kadar toplu silme yapılmaz.
- Tenant kapanışı export, legal hold, finansal kayıt, doküman binary ve DB scope
  doğrulaması olmadan destructive delete başlatmaz.

## Sorumluluk matrisi ve yayın kapısı

| Alan | Sorumlu | Onaylayan | Mevcut durum |
|---|---|---|---|
| Uygulama release/rollback | ATANMADI | ATANMADI | External blocker |
| PostgreSQL backup/restore/migration | ATANMADI | ATANMADI | External blocker |
| Hosting, TLS ve secret store | ATANMADI | ATANMADI | External blocker |
| Monitoring ve incident koordinasyonu | ATANMADI | ATANMADI | External blocker |
| Object storage ve binary backup | ATANMADI | ATANMADI | External blocker |
| Retention, KVKK ve hesap kapanışı | ATANMADI | ATANMADI | External blocker |

Bu satırlar atanıp staging kanıtı oluşmadan “production-ready”, “yedekli”,
“izlenen” veya “SLA'lı” ifadesi kullanılamaz.

### Staging monitoring ve incident devri

- Staging monitoring ve incident koordinasyonunun uygulayanı ve onaylayanı
  Murat Saygı'dır; yedek kişi bulunmaması açık tek-sorumlu riskidir.
- Sentry error olayı yalnız redacted server envelope'u ile gönderilir. Ham olay
  user, request, IP, geo, cookie, header, query ve body içermemelidir.
- Yeni bir olayda önce `environment=staging`, release ve `noa.*` etiketleri
  doğrulanır; PII veya request verisi görülürse aktarım kapatılır ve olay veri
  ihlali şüphesiyle Murat Saygı'ya escalate edilir.
- Yüksek öncelikli issue alarmı yalnız `staging` environment'ına bağlıdır;
  Suggested Assignees, bulunamazsa Recently Active Members hedefi her trigger'da
  e-posta dispatch üretir.
- Provider-side provada redacted issue `1` trigger/`1` alert üretmiş, tek Owner
  üyede Issue Alerts `On` ve teslim yöntemi `Email` doğrulanmış, test bildirimi
  çalıştırılmıştır. Kişisel mailbox okunmadığı için insan teslim/alındı onayı
  ile incident masa başı kabulü açık kalır ve Dilim 4 kapanmaz.
