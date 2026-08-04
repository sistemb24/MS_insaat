# Faz 36 Dilim 2 — Yerel Staging Platform Preflight

Tarih: 04.08.2026
Durum: Yerel preflight tamamlandı; dış staging temeli hazır

## Kapsam

- Vercel Node.js Functions bölgesi kök `vercel.json` içinde yalnız `fra1`
  Frankfurt olarak sabitlendi.
- Route/function override, çoklu/farklı region, onaysız failover ve config içine
  environment değeri yazılması testli preflight ile fail-closed yapıldı.
- `npm run staging:platform:verify`, secret okumadan platform sözleşmesini
  doğrular ve yalnız region/secret-gömülmeme durumunu raporlar.
- Next.js 16.2.9 yerel deployment, environment ve `preferredRegion` belgeleri
  okundu; Edge'e özgü route-level region davranışı Node.js route'larına
  uygulanmadı.

## Değişiklikler

- `vercel.json`
- `src/lib/staging-platform-config.ts`
- `src/lib/staging-platform-config.test.ts`
- `scripts/verify-staging-platform-config.ts`
- `package.json`

## Doğrulama

| Kapı | Sonuç |
|---|---|
| `npm run staging:platform:verify` | `fra1`; environment değeri committed değil |
| Hedefli Vitest | 1 dosya / 3 test geçti |
| `npm test` | 353 dosya / 1.872 test geçti |
| `npm run type-check` | Geçti |
| `npm run db:validate` | Prisma şeması geçerli |
| `npm run lint` | Geçti |
| `npm run build` | Next.js 16.2.9; 104 sayfa üretimi geçti |
| `npm run security:secret-scan` | 1.345 dosya / 0 yüksek güvenli bulgu |
| `git diff --check` | Kapanışta doğrulanır |

## Açık dış kapılar

- Vercel proje ve ayrı staging environment/branch.
- Neon Frankfurt staging DB.
- Cloudflare R2 `eu` jurisdiction bucket/namespace.
- Sentry DE proje ve scrubbing ayarları.
- Kesin geçici Vercel hostname.
- Secret injection ve rotation kanıtı.
- Gerçek staging deploy, migration, health/readiness ve rollback kanıtı.

Bu çalışma dış hesap, ücretli kaynak, credential, DNS, migration veya deployment
oluşturmaz. Dilim 2 ancak dış staging girdileri ve gerçek rehearsal kanıtıyla
tamamlanabilir.

## Dış kaynak hazırlığı — 04.08.2026

- Vercel CLI oturumu açıldı; yeni proje oluşturulmadı.
- Mevcut `murat-saygis-projects/insaat-yonetim` Next.js projesi doğrulandı ve
  yerel çalışma ağacı bu projeye bağlandı.
- Projede `DATABASE_URL` ve `AUTH_SECRET` değerlerinin Production, Preview ve
  Development ortamlarında ortak kapsamlandığı görüldü; değerler okunmadı.
- Ayrı Neon staging DB ve ayrı staging secret üretilmeden mevcut Vercel
  environment değerleri değiştirilmedi.
- Neon, Cloudflare ve Sentry dashboard'ları giriş ekranında kullanıcıya
  bırakıldı. Oturumlar açılmadan kaynak veya credential oluşturulmadı.
- Ödeme yöntemi, plan yükseltmesi veya ücretli kaynak işlemi yapılmadı.

Sıradaki yürütme, üç dashboard oturumu açıldıktan sonra ayrı Neon Frankfurt DB,
R2 `eu` jurisdiction bucket ve Sentry DE proje oluşturmak; ardından yalnız
Preview/staging kapsamındaki Vercel environment değerlerini ayırmaktır.

## Dış staging temeli kapanış eki — 04.08.2026

- Mevcut Vercel projesi `fra1` sözleşmesiyle bağlandı; Preview kapsamındaki
  staging secret seti provider yüzeyinde ayrıldı.
- Neon `noa-insaat-staging` projesi AWS Frankfurt `eu-central-1` bölgesinde
  oluşturuldu.
- Private EU-jurisdiction R2 doküman bucket'ı `noa-insaat-staging-eu` ve ayrı
  backup bucket'ı `noa-insaat-staging-backups-eu` oluşturuldu.
- Sentry DE projesi `MS-INSAAT/noa-insaat-staging` oluşturuldu.
- Secret değerleri repo, belge veya komut çıktısına kalıcı olarak yazılmadı;
  sızıntı şüphesi oluşan ilk R2 tokenı silinip yenisiyle döndürüldü.
- Deployment, migration, geçici hostname kabulü, health/readiness ve rollback
  kanıtı Dilim 6'ya bırakıldı. Bu nedenle bu kayıt release rehearsal değildir.
