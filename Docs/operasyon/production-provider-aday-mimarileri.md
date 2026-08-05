# Production Provider Aday Mimarileri

Tarih: 04.08.2026
Faz: 36 / Dilim 1 karar desteği
Durum: Aday A staging için onaylandı; dış kaynak henüz oluşturulmadı

## 1. Değerlendirme ölçütleri

Adaylar aşağıdaki NOA gereksinimlerine göre değerlendirilmiştir:

- Next.js Node.js runtime ve mevcut Prisma/PostgreSQL yapısıyla uyum.
- Staging/production için ayrı DB, storage, secret seti ve domain.
- Uygulama runtime'ı ile DB'nin yakın bölgelerde çalışabilmesi.
- Local document adapter yerine production object storage.
- Redacted monitoring ve test alarmı.
- DB ve binary veriyi birlikte kapsayan, tatbikatı yapılabilir recovery planı.
- Düşük operasyon yükü; tamamlanmış Faz 33–35 davranışlarını yeniden tasarlamama.
- Veri bölgesi, DPA/KVKK ve sorumluluk kararlarının açık kalması.

Fiyatlar, SLA ve sözleşme koşulları sık değiştiği için bu belgede sayı olarak
varsayılmamıştır; satın alma öncesinde hesap/teklif üzerinden doğrulanmalıdır.

## 2. Aday A — Yönetilen çoklu sağlayıcı

| Alan | Koşullu aday | Gerekçe / doğrulanması gereken sınır |
|---|---|---|
| Hosting/runtime | Vercel Node.js Functions, `fra1` | Next.js'e doğrudan uyumlu; Frankfurt `eu-central-1` DB ile aynı bölge |
| PostgreSQL | Neon AWS Europe Frankfurt, `eu-central-1` | PostgreSQL, bölgesel durum görünürlüğü ve restore window/PITR desteği |
| Secret injection | Vercel environment ayrımı | Preview/production ayrımı ve at-rest encryption var; erişim/rotation sahibi ayrıca atanmalıdır |
| Object storage | Cloudflare R2, `eu` jurisdiction | EU jurisdiction konum garantisi için location hint yerine jurisdiction gerekir |
| Monitoring | Sentry, DE region adayı | Server-side scrubbing, IP scrubbing ve gelişmiş privacy açık kabul edilmelidir |
| DNS/TLS | Vercel custom domain veya ayrı DNS sahibi | Domain sahibi ve değişiklik yetkisi karara bağlanmalıdır |
| Backup | Neon restore window + bağımsız `pg_dump`; R2 binary snapshot | PITR tek başına DB+binary ortak recovery point kanıtı değildir |

### Artıları

- Mevcut Next.js uygulamasını en az altyapı koduyla staging'e taşıma olasılığı
  yüksektir.
- Preview/staging/production environment ayrımı sağlayıcı yüzeylerinde doğal
  olarak modellenebilir.
- R2 `eu` jurisdiction, yalnız best-effort `eeur` location hint'e göre veri
  yerleşimi için daha güçlü bir sınır sunar.
- Neon restore window ve snapshot özellikleri DB recovery provasını hızlandırır.

### Eksileri ve zorunlu kontroller

- Dört sağlayıcı için ayrı hesap, erişim rolü, DPA, faturalama ve incident
  koordinasyonu gerekir.
- Vercel'in varsayılan function bölgesi ABD'dir; açık bölge seçimi yapılmadan
  staging kabul edilmez.
- Vercel environment değişikliği önceki deployment'lara uygulanmaz; rotation
  yeni deployment ve eski secret iptal kanıtıyla birlikte yapılmalıdır.
- Neon PITR/snapshot ile bağımsız export ve object storage binary recovery aynı
  tatbikatta doğrulanmalıdır.
- Sentry'ye varsayılan PII gönderimi kapalı tutulmalı; server-side scrubber,
  default scrubbers, IP scrub ve NOA sensitive field listesi test edilmelidir.

## 3. Aday B — AWS üzerinde konsolide mimari

| Alan | Koşullu aday | Gerekçe / doğrulanması gereken sınır |
|---|---|---|
| Hosting/runtime | AWS App Runner, immutable container image | Kaynak veya ECR image'dan managed web service ve manuel deployment desteği |
| PostgreSQL | Amazon RDS for PostgreSQL | Aynı bulut/ağ ve merkezi backup/restore yönetimi adayı |
| Secret store | AWS Secrets Manager | IAM/KMS ile rol bazlı secret saklama ve injection zemini |
| Object storage | Amazon S3 | DB ile aynı bölge/hesapta versioning ve lifecycle tasarımı adayı |
| Monitoring | CloudWatch ve X-Ray | Uygulama/altyapı gözlemlenebilirliğini tek hesapta toplama adayı |
| DNS/TLS | Route 53 + certificate/edge kararı | Domain ve trafik bileşenleri tek hesapta yönetilebilir |
| Backup | RDS backup/export + S3 versioning/copy | Ortak recovery point ve restore provası yine NOA runbook'uyla kanıtlanır |

### Artıları

- Uygulama, DB, secret, storage ve monitoring tek erişim/IAM sınırında
  toplanabilir.
- Provider ve incident koordinasyonu çoklu sağlayıcı adayına göre daha sadedir.
- Container artifact'i staging ve production'da aynı şekilde çalıştırmak daha
  doğrudan kanıtlanabilir.

### Eksileri ve zorunlu kontroller

- İlk kurulum, IAM, ağ, container registry, log redaction ve maliyet kontrolü
  Aday A'ya göre daha fazla operasyon sahipliği gerektirir.
- App Runner kaynak kodu/image deployment davranışı Next.js artifact stratejisi
  olarak ayrıca kanıtlanmalıdır.
- Seçilen AWS bölgesinde gerekli servislerin hesap için erişilebilirliği ve
  hukuki veri konumu satın alma öncesinde doğrulanmalıdır.
- Tek provider kullanmak uygulama seviyesindeki tenant izolasyonu, restore
  tatbikatı veya RPO/RTO kanıtı yerine geçmez.

## 4. Staging için onaylanan aday ve bölge

Kullanıcı **Aday A'yı yalnız staging için 04.08.2026 tarihinde onayladı**.
Bu onay hesap, ücretli kaynak, credential, DNS veya deployment oluşturmaz.

Vercel Node.js runtime bölgesi **`fra1` — Frankfurt, Germany
(`eu-central-1`)** olarak seçildi:

1. Vercel, Function runtime'ın veri kaynağıyla aynı veya mümkün olan en yakın
   bölgede çalıştırılmasını önerir.
2. Neon staging PostgreSQL adayı AWS Europe Frankfurt `eu-central-1` içindedir;
   `fra1` bu DB ile aynı bölge eşleşmesidir.
3. Neon'un bölgesel latency ölçümünde Frankfurt Vercel Function ile Frankfurt
   Neon DB aynı-bölge sorgusu karşılaştırmadaki en düşük gecikmeli eşleşmedir.
4. Frankfurt, Vercel'in Türkiye çevresindeki kullanılabilir compute bölgeleri
   arasında Avrupa veri konumu ve aynı-bölge DB avantajını birlikte sağlar.

Onaylanan staging bileşenleri:

1. Vercel Node.js Functions `fra1` ve Neon AWS Frankfurt `eu-central-1`.
2. R2 bucket yalnız `eu` jurisdiction ile oluşturulur; `eeur` hint veri
   yerleşimi garantisi kabul edilmez.
3. Sentry DE region ve PII/IP scrubbing hukuk/incident sahibi onayından sonra
   açılır.
4. Secret erişimi ve rotation sorumlusu atanmadan credential girilmez.
5. Neon restore window'a ek olarak bağımsız DB export ve R2 binary recovery
   noktası tasarlanır.

Provider seçimi onaylanmış olsa da sorumlular, gerçek staging domaini, hesap
erişimi, RPO/RTO ve retention kararları eksik olduğu için Dilim 1 kabul kapısı
ve dış kaynak oluşturma kapısı `BLOCKER` kalır.

## 5. Resmî kaynaklar

- [Vercel function bölgeleri](https://vercel.com/docs/functions/configuring-functions/region)
- [Vercel global compute bölge listesi](https://vercel.com/docs/regions)
- [Vercel environment değişkenleri ve ortam ayrımı](https://vercel.com/docs/environment-variables)
- [Neon proje ve restore window yönetimi](https://neon.com/docs/manage/projects)
- [Neon bölgesel durum uçları](https://neon.com/docs/introduction/status)
- [Neon bölgesel latency ölçümü](https://neon.com/demos/regional-latency)
- [Cloudflare R2 veri konumu ve EU jurisdiction](https://developers.cloudflare.com/r2/reference/data-location/)
- [Sentry organization privacy ve server-side scrubbing alanları](https://docs.sentry.io/api/organizations/update-an-organization/)
- [Sentry bölgesel API domainleri](https://docs.sentry.io/api/)
- [AWS App Runner mimarisi ve deployment modeli](https://docs.aws.amazon.com/apprunner/latest/dg/architecture.html)
- [AWS App Runner web hosting referans mimarisi](https://docs.aws.amazon.com/pdfs/architecture-diagrams/latest/serverless-web-hosting-aws-app-runner/serverless-web-hosting-aws-app-runner.pdf)

## 6. Kalan karar kapısı

Dilim 1'in sağlayıcı seçimi tamamlandı. Kabul kapısının kapanması için şimdi
operasyon sahipleri ve politika girdileri gereklidir:

- Release/rollback, DB migration/restore, hosting/secret, storage/recovery,
  monitoring/incident ve hukuk/KVKK sorumluları ile onaylayanları.
- Staging domaini ve DNS sahibi.
- RPO, RTO, backup/log/audit/session retention, destek saati ve SLA kararları.

Bu girdiler gelmeden hesap açma, ücretli kaynak oluşturma, credential girme,
DNS değiştirme veya staging deployment başlatılmaz.
