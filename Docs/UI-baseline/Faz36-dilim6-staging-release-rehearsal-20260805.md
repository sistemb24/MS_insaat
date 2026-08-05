# Faz 36 Dilim 6 — Staging Release Rehearsal

Tarih: 05.08.2026
Kapsam: Yalnız staging release adayı, migration, smoke, rollback ve restore
Durum: Tamamlandı

## Release kimliği ve artifact kapıları

- Release SHA: `eae8af205fb8fb00372cd25edbc4b658b6a7ae61`
- GitHub CI: run `31022440491`; migration, 359 test dosyası/1.902 test,
  type-check, lint ve build geçti.
- Vercel deployment: `dpl_3ZT6yqeGAhaf2bArqKCSMePSdiRF`
- Deployment URL:
  `https://insaat-yonetim-54obftyl9-murat-saygis-projects.vercel.app`
- Kararlı staging aliası:
  `https://insaat-yonetim-git-agent-faz36-sta-14c1d7-murat-saygis-projects.vercel.app`
- Runtime: Node.js Functions, `fra1`; Vercel Preview check geçti.

GitHub CI ve Vercel Preview aynı commit SHA'sının release adayıdır. Vercel
artifact'ı yeniden build eder; iki sağlayıcı arasında binary-identical artifact
iddiası kurulmaz. Kabul, aynı source SHA, iki yeşil build kapısı ve çalışan
deployment kimliği üzerinden yapılır.

## Fail-closed ilk koşu

[GitHub Actions `31022983039`](https://github.com/sistemb24/MS_insaat/actions/runs/31022983039)
67 migration ve recovery source preflight'ini geçti; ancak daha önce temizlenen
`noa-recovery-f36-binary-smoke-v1.bin` R2 kaynak nesnesi bulunamadığı için
fixture adımında `NoSuchKey` ile durdu. Backup ve restore başlamadı; `always()`
DB cleanup'ı çalıştı. Bu koşu kabul sayılmadı.

Repo içindeki takipli, kişisel ve production verisi içermeyen 144 bayt fixture
dosyası aynı kesin anahtarla geçici olarak private staging document bucket'ına
yüklendi. Yeni token/izin oluşturulmadı; mevcut GitHub read-only document
credential'ı ve ayrı backup read/write credential'ı değiştirilmedi.

## Migration, tenant ve recovery kabulü

[GitHub Actions `31023428795`](https://github.com/sistemb24/MS_insaat/actions/runs/31023428795)
güncel release SHA'sında başarıyla tamamlandı:

- `prisma migrate deploy`: 67 migration bulundu, pending migration yok;
- source preflight: 67/67 migration, 114 public tablo, eksik kritik tablo yok;
- fixture: bir tenant, company, period, document folder ve `DocumentFile`;
- binary: 144 bayt, SHA-256
  `fb1f34e0d6d7898f979ee0e9dcd0396a50694ff808c435eb2603211af7045e95`;
- backup ID:
  `20260805T160434Z-eae8af205fb8fb00372cd25edbc4b658b6a7ae61`;
- backup: 500.201 bayt DB exportu ve bir binary nesne;
- izole restore: 67/67 migration, 114 tablo, bir tenant/company/document;
- tenant sınırı: yabancı scope sonucu `0`, fixture kimliği ve binary checksum
  eşleşti;
- backup yaşı 116 saniye, restore süresi 112 saniye;
- geçici restore DB/namespace cleanup `complete`, kaynak DB fixture silme
  sonucu `deleted=1`.

Geçici kaynak R2 nesnesi kanıt sonrasında kesin anahtarla silindi ve document
bucket yeniden `0 B` doğrulandı. Release backup'ı onaylı 14 günlük backup
retention kapsamında kalır.

## Uygulama smoke ve rollback kabulü

Güncel ve önceki güvenli artifact doğrudan Vercel Deployment Protection bypass
yetkisiyle, credential çıktıya taşınmadan doğrulandı. Her iki artifact'ta:

- `/landing` → 200;
- `/giris` → 200;
- `/super-admin/giris` → 200;
- `/api/health` → 200 `ok`;
- `/api/readiness` → 200, database `ready`.

Rollback hedefi olarak Dilim 5 güvenlik kapılarını içeren önceki artifact
`insaat-yonetim-2282yi2x5-murat-saygis-projects.vercel.app` (`e9ba1bc`)
seçildi. Kararlı staging aliası bu artifact'a geçirildi; beş smoke yeniden
geçti. Destructive DB rollback veya restore çalıştırılmadı.

Alias `finally` güvencesiyle güncel
`insaat-yonetim-54obftyl9-murat-saygis-projects.vercel.app` artifact'ına geri
bağlandı ve aynı beş smoke yeniden geçti. Alias rollback ve geri dönüş çevrimi
35,8 saniye sürdü. Son durumda:

- güncel deployment `Ready` ve kararlı aliasın tek hedefidir;
- landing CSP, bir yıllık HSTS ve
  `X-Robots-Tag: noindex, nofollow, noarchive` taşır;
- kapalı observability smoke endpoint'ine headersız POST → 404 `not_found`.

## Kapanış sınırı

Staging release, migration, tenant/binary recovery, yüzey smoke'u ve uygulama
rollback/forward dönüşü bu release adayı için geçti. Production verisi
kopyalanmadı; production migration, deployment, domain, DNS veya trafik
değişmedi. Bu prova production yayın yetkisi vermez.

GitHub'ın Node.js 20 deprecation uyarısı mevcut action v4 adımlarını runner'da
Node.js 24'e zorlayarak çalıştırdı; koşu yeşildir. Action major yükseltme kararı
production go/no-go paketinde düşük öncelikli operasyon borcu olarak tutulur.
