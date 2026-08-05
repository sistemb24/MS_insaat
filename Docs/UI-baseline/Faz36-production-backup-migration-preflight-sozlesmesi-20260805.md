# Faz 36 — Production Backup ve Migration Preflight Sözleşmesi

Tarih: 05.08.2026
Karar: **SÖZLEŞME HAZIR / ÇALIŞTIRMA ONAYI YOK**

## Amaç ve sınır

Production backup ve migration öncesinde hedeflerin doğru ve erişilebilir
olduğunu yazma yapmadan kanıtlayan fail-closed kapı hazırlandı. Bu dilim gerçek
backup oluşturmaz, migration uygulamaz, production tablosu veya R2 nesnesi
değiştirmez.

Workflow yalnız GitHub Actions manuel `workflow_dispatch` ile görünür. Job'un
başlaması için `confirmation=production-backup-preflight` değeri birebir
girilmelidir. Schedule, push veya pull request tetikleyicisi yoktur.

## Salt-okunur kontroller

1. `NOA_RUNTIME_ENV=production` ve tam onay ifadesi zorunludur.
2. `DATABASE_URL` geçerli, uzak PostgreSQL hedefi olmalıdır; localhost ve
   loopback reddedilir.
3. Doküman bucket'ı yalnız `noa-insaat-production-eu`, backup bucket'ı yalnız
   `noa-insaat-production-backups-eu` olabilir.
4. Document-read ve backup-write access key kimlikleri ayrı olmalıdır.
5. Her iki R2 bucket için yalnız `HeadBucket` ve en fazla bir nesnelik `List`
   erişimi denenir; nesne yazılmaz veya silinmez.
6. Yerel migration dizinleri ile production `_prisma_migrations` envanteri
   karşılaştırılır. Bilinmeyen, başarısız, rollback edilmiş, tekrarlı veya
   Prisma tarafından yönetilmeyen mevcut şema fail-closed engellenir.
7. Boş production DB geçerli bir preflight durumudur: tüm migration'lar pending
   raporlanır fakat uygulanmaz.
8. Çıktı yalnız sayım, release kimliği ve `ready/blocked` durumunu içerir;
   connection string, credential, bucket içeriği veya migration SQL'i yazmaz.

## Kod ve workflow yüzeyi

- `.github/workflows/production-backup-migration-preflight.yml`
- `src/lib/production-recovery-preflight.ts`
- `scripts/verify-production-recovery-preflight.ts`
- `pnpm production:recovery:preflight`

Test sözleşmesi workflow içinde `schedule`, `pg_dump`, `db:migrate`,
`prisma migrate deploy` veya R2 `PutObject` bulunmasını reddeder.

## Yerel doğrulama

- Hedefli sözleşme: 1 dosya / 6 test geçti.
- Tam test: 360 dosya / 1.908 test geçti.
- Type-check, Prisma schema validate ve ESLint sıfır uyarıyla geçti.
- Next.js 16.2.9 production build'i 102 sayfa ile geçti.
- `fra1` platform preflight'i ve 1.380 dosyalık secret scan geçti; yüksek
  güvenli bulgu yoktur.
- Workflow çalıştırılmadı; production DB veya R2 içeriği okunmadı.

## Sonraki ayrı onay kapıları

1. Bu read-only workflow'un ilk çalıştırılması ayrıca açık kullanıcı onayı
   ister.
2. Preflight yeşil olsa bile ilk production DB+binary backup/checksum ayrı
   workflow ve ayrı açık onay ister.
3. Backup integrity ile izole restore kanıtı oluşmadan RPO/RTO sağlandı
   denemez.
4. `prisma migrate deploy` ancak doğrulanmış aynı-release backup, değişiklik
   penceresi ve ayrı açık migration onayıyla çalıştırılır.
5. Deployment, DNS/TLS, indexing, PR merge ve trafik açma bu sözleşmenin
   dışında kalır.

Sonuç: production veri veya storage mutasyonu yapmadan sonraki operasyonun
hedef ve migration envanterini denetleyecek sözleşme hazırdır; Production
Go/No-Go kararı **NO-GO** kalır.
