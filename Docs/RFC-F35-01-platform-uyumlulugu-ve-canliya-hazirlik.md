# RFC-F35-01 — Platform Uyumluluğu ve Canlıya Hazırlık

> Durum: Tamamlandı — Dilim 1–8; external production blocker'ları açık
> Tarih: 04.08.2026
> Ana plan: `Docs/NOA-insaat-yeni-modul-gelistirme-plani.md`
> Önceki sınırlar: `RFC-F33-01`, `RFC-F34-01`
> İnceleme tabanı: canlı çalışma ağacı, `main@9c2609f`

## 1. Karar özeti

Faz 35 numarası uygundur. Ana plan Faz 34 ile bitiyor; `RFC-F34-01` de Süper
Admin panel dashboard, tenant, kullanıcı, abonelik, destek, rapor ve ayar
yüzeylerini açıkça ayrı Faz 35'e bırakıyor.

Mevcut uygulama yeniden yazılmamalıdır. Tenant SaaS'ın çalışan domain ve
`tenantId + companyId + periodId` kapsam zinciri korunmalıdır. Ancak canlıya
çıkmadan önce dört doğrulanmış P0 sınıfı kapatılmalıdır:

1. Tenant Server Action'larının önemli bir bölümü geçersiz/yok session'ı
   reddetmek yerine demo tenant kapsamına düşebiliyor.
2. Public kayıt, tenant parola sıfırlama ve iletişim formları gerçek işlem
   yapmadan başarı gösterebiliyor; marketing yüzeyi kanıtlanmamış ürün,
   güvenlik, müşteri ve SLA iddiaları içeriyor.
3. Güncel tam test kapısı 22 tarih-bağımlı abonelik testi nedeniyle kırmızı.
4. Tenant session cookie ve production HTTP/environment/operasyon sözleşmesi
   canlı güvenlik tabanını karşılamıyor.

Bu RFC onaylanmadan production kodu, şema, migration, route davranışı veya UI
değiştirilmeyecektir.

## 2. İnceleme yöntemi ve kanıt tabanı

Kaynak önceliği şu sırayla uygulandı:

1. 04.08.2026 tarihli kullanıcı talebi.
2. `Docs/NOA-insaat-yeni-modul-gelistirme-plani.md` ve Faz 33–34 kuyruğu.
3. Onaylı `RFC-F33-01` ve `RFC-F34-01` ile kapanış belgeleri.
4. Canlı App Router kaynakları, Prisma şeması ve 64 migration.
5. Yerel PostgreSQL ve çalışan Next.js 16.2.9 uygulaması.
6. `.kiro/specs/super-admin-authentication` ve HTML/görsel referanslar.

Next.js kararı için yerel 16.2.9 dokümantasyonundaki authentication, Proxy,
cookies, Route Handlers, metadata, CSP ve error-handling rehberleri okundu.
Proxy yalnız optimistic sınır; Server Action ve Route Handler'lar kendi auth ve
authorization kontrolünü yapmak zorundadır.

Çalışma ağacı dirty'dir: inceleme başında `git status --short` 359 girdi
verdi. Modified, untracked ve silinmiş görünen mobil HTML dosyalarının tamamı
kullanıcı değişikliği olarak korundu. Reset, checkout, restore, clean, commit,
push veya PR yapılmadı.

## 3. Güncel doğrulama özeti

| Kapı | 04.08.2026 sonucu | Not |
|---|---|---|
| `npm test` | **FAIL** | 335 dosya; 1.796 geçti, 22 kaldı. Üç dosya abonelik süresini artık dolmuş görüyor. |
| `npm run type-check` | PASS | Hatasız. |
| `npm run db:validate` | PASS | Prisma şeması geçerli. |
| `prisma migrate status` | PASS | 64 migration; DB güncel. |
| `npm run lint -- --max-warnings=0` | PASS | Uyarısız. |
| `npm run build` | PASS | Next.js 16.2.9; 106 route. |
| `git diff --check` | PASS | Yalnız LF/CRLF bilgilendirme uyarıları. |

Yerel DB sayımı salt okunur yapıldı: 1 tenant, 13 tenant kullanıcısı, 6
abonelik, 1 Süper Admin credential ve 2 Süper Admin session kaydı var.

## 4. Mevcut durum ve uyuşmazlık envanteri

### 4.1 Tenant SaaS

Olumlu taban:

- `/` ve 24 `[module]` yüzeyi ortak AppShell ve gerçek action/read-model
  kaynaklarını kullanıyor.
- API GET route'larının büyük çoğunluğu bearer API key, required scope ve API
  key'den türetilen tenant kapsamı kullanıyor.
- Doküman indirme route'u aktif session scope, `document.view` permission,
  scoped repository listesi, `basename` ve `nosniff` ile korunuyor.
- Şema genelinde tenant domain modellerinin çoğunda kapsam indeksleri ve
  ilişkisel foreign key'ler mevcut.
- E-Fatura ve ödeme webhook'ları secret yoksa fail-closed; raw body imzası ve
  idempotent domain servisleri kullanıyor.

Kritik ayrışma:

- `src/lib/server-active-scope.ts:17` içindeki `getActiveTenantScope`,
  `src/lib/session-scope.ts:48-61` üzerinden cookie yoksa, session bulunamazsa
  veya süresi dolarsa `defaultTenantScope` döndürüyor.
- En az 31 action dosyası bu resolver'ı kullanıyor. Bunlar arasında API key,
  entity, fatura, ödeme, ledger, stok, kullanıcı daveti/yönetimi ve webhook
  endpoint mutasyonları da bulunuyor.
- Sayfa render'ı `requireActiveSessionState` ile korunuyor olsa da Server
  Action'lar public POST yüzeyi gibi ele alınmalıdır. Bu nedenle varsayılan demo
  scope davranışı production'da auth değildir ve P0'dır.
- `src/app/actions/session-actions.ts:78-106` tenant cookie'sini `HttpOnly`,
  `SameSite=Lax`, `Path=/` ile yazıyor; `Secure`, explicit expiry/maxAge ve
  merkezi environment politikası yok.
- Tenant credential login'de parola doğrulaması var; Süper Admin'e benzer
  kalıcı rate-limit/account-lock kanıtı yok.

### 4.2 Süper Admin

Olumlu taban:

- Tenant `AppCredential/AppSession` ile `SuperAdminCredential/Session` ayrıdır.
- `src/proxy.ts` yalnız `/super-admin/:path*` için çalışır; public liste exact
  `/super-admin/giris` ve `/super-admin/ilk-kurulum` yollarıdır.
- `(panel)/layout.tsx` her panel sayfasını DB-backed
  `requireSuperAdminSession()` ile korur.
- Faz 34 challenge, reset transaction, DB rate-limit, şifreli TOTP ve hash
  backup code zemini korunmuştur. Kapalı recovery yüzeyleri etkinleştirilmez.

Uyumsuzluklar:

- 11 panel sayfası ortak platform repository/read-model katmanı yerine
  doğrudan `prisma.*` çağırıyor.
- Tenant, kullanıcı ve abonelik listeleri limitsizdir. Destek/loglar `take:100`,
  bildirimler `take:50`, session listeleri `take:20/10` kullanır; cursor,
  pagination ve kullanıcıya görünür truncation bilgisi yoktur.
- Dashboard “Veritabanı bağlantı aktif / Uygulama çalışıyor” durumunu gerçek
  health/readiness sinyali olmadan daima yeşil gösterir.
- Profil tam credential ID, e-posta, session sayısı ve `lastFailedIp` değerini
  maskesiz gösterir. Faz 34 auth ekranındaki maskeli IP yaklaşımıyla çelişir.
- Global tenant audit logları `entityLabel`, actor ve tenant adıyla doğrudan
  sunulur; veri minimizasyonu/retention/export yetkisi tanımlı değildir.
- Yalnız tekil Süper Admin rolü vardır. Bu faz yeni rol ailesi icat etmeyecek;
  ileride operator/read-only ayrımı istenirse ayrı RFC gerekir.
- Sayfalarda segment-level `loading.tsx`, `error.tsx` veya `not-found.tsx` yok;
  yalnız root error/not-found sınırı bulunur.

### 4.3 Landing, marketing ve tenant public auth

Olumlu taban:

- Marketing route'ları ortak navbar/footer ve `--ds-*` tokenlarını kullanıyor.
- Ana marketing sayfalarında metadata/canonical var; blog detayında
  `generateMetadata`, `generateStaticParams` ve `notFound` kullanılıyor.
- Fiyat sabitleri `subscription-seed.ts` ile mevcut durumda aynı ID, fiyat,
  limit ve modül listesini taşıyor; bunun için unit test var.
- İletişim formunda Zod doğrulaması ve KVKK checkbox'ı; responsive nav, skip
  link, label ve focus altyapısı mevcut.

Doğrulanmış uyuşmazlıklar:

- `contact-form.tsx:67-76` 800 ms bekleyip gerçek Server Action/API olmadan
  başarı gösteriyor.
- `/kayit`, `/sifremi-unuttum` ve `/sifre-sifirla` benzer biçimde istemci
  timeout'u ile başarı simüle ediyor. Bunlar production CTA hedefidir.
- Landing 500+ aktif şantiye, 2 milyar TL hakediş, 10.000+ taşeron, %98 NPS ve
  gerçek müşteri referansları gösteriyor; bunları destekleyen veri/provenance
  yok.
- Özellikler/SSS/Hakkımızda; GİB e-Fatura, otomatik banka eşleştirme, AI analiz,
  Logo/Mikro/Zirve çift yönlü entegrasyon, offline mobil uygulama, günlük
  yedekleme, Türkiye data center, TLS 1.3, ISO 27001/SOC2/PCI-DSS, 7/24 destek,
  SLA ve önceden bakım bildirimi iddiaları içeriyor. Bunların önemli bölümü
  canlı provider/operasyon gerçeğiyle kanıtlanmıyor.
- Footer LinkedIn ve X bağlantıları `href="#"`.
- Newsletter formu yalnız `preventDefault()` yapıyor; teslimat ve açık
  “kullanılamıyor” durumu yok.
- Yasal/iletişim metinlerinde `noa.insaat.com.tr`, `noa-insaat.com.tr`,
  `noa.com.tr` alan adları ve farklı destek/KVKK adresleri birlikte kullanılıyor.
  Telefon örnek nitelikte; veri sorumlusu unvanı, adresi, MERSİS/vergi ve resmi
  tebligat kanalı doğrulanmamış.
- `/robots.txt`, `/sitemap.xml`, manifest ve structured-data kaynağı yok.
- Metadata canonical host'u hard-coded; deployment domain sözleşmesi yok.

### 4.4 Ortak UI/UX

| Alan | Tenant SaaS | Marketing | Süper Admin | Karar |
|---|---|---|---|---|
| Tokenlar | `--ds-*` + legacy | `--ds-*`, çok inline style | `--ds-*`, çok inline style | Semantic token tabanı korunur. |
| Shell | AppShell olgun | Public navbar/footer | Ayrı SA shell | Marka ailesi uyumlu; shell'ler güvenlik sınırı nedeniyle ayrı kalır. |
| Primitives | `src/components/ui` mevcut | Yerel card/form ailesi | Yerel stat/activity/table ailesi | Yeni dördüncü aile açılmaz; uygun ortak primitive'lere yakınsama yapılır. |
| Loading/error | Root sınırı; surface state'leri var | Çoğu statik | Segment state yok | Route-segment state sözleşmesi gerekir. |
| Tables | Domain'e özel responsive desenler | Karşılaştırma tablosu | `overflow-x-auto` tablolar | Ortak pagination/empty/error ve mobil sunum sözleşmesi gerekir. |
| Theme/focus/print | Güçlü | Theme toggle/focus var | Theme/focus var | Aynı kabul matrisiyle test edilir. |

Canlı tarayıcı ölçümü:

- `/landing`, `/` ve `/super-admin/giris` 390, 1024 ve 1440 genişliklerinde
  yatay taşma göstermedi.
- Süper Admin giriş 320/390/768/1024/1440 ölçümlerinin tamamında temizdi.
- `/landing` 320 ve 768, tenant Dashboard 320 ölçümünde yatay taşma sinyali
  verdi. Tam kaynak locator'ı uygulama diliminde daraltılmalıdır.
- İncelenen public/auth/AppShell sayfalarında console warning/error yoktu.

## 5. Route / auth / veri kaynağı matrisi

### 5.1 Tenant ve marketing sayfaları

| Route'lar | Yüzey | Auth/rol | Veri kaynağı | Durum ve risk |
|---|---|---|---|---|
| `/` | Tenant Dashboard | DB session; aktif scope | Çoklu Server Action/read-model | Gerçek veri; 320 taşma; action fallback P0. |
| `/santiyeler`, `/tedarikciler`, `/musteriler`, `/taseronlar` | Tenant master data | Session + scope + role | Entity action/service/repository | Gerçek veri; mutation'lar auth fallback auditine dahil. |
| `/ihale-yonetimi`, `/dokuman-merkezi`, `/bildirimler`, `/abonelik` | Tenant operasyon | Session + feature/permission | Typed action/service/repository | Gerçek/sandbox ayrımı sayfa bazında korunmalı. |
| `/araclar`, `/api-yonetimi`, `/destek-merkezi`, `/bilgi-merkezi`, `/e-fatura-yonetimi` | Tenant P2 | Session + plan/rol | Typed action/service/repository | Arvento/provider kapalı; tarih-bağımlı test kırığı var. |
| `/personel`, `/isg`, `/kasa-banka`, `/giderler`, `/stok-depo` | Tenant operasyon/finans | Session + role + dönem | Typed action/service/repository | Gerçek veri; mutation auth P0 auditine dahil. |
| `/faturalar`, `/hakedis`, `/cek`, `/puantaj`, `/raporlar`, `/ayarlar` | Tenant finans/yönetim | Session + role + dönem | Typed action/service/repository | Mevcut tamamlanmış domain korunur; scope regression testleri genişletilir. |
| `/landing`, `/ozellikler`, `/fiyatlandirma`, `/hakkimizda`, `/blog`, `/blog/[slug]`, `/sss`, `/iletisim`, `/gizlilik`, `/kullanim-kosullari`, `/kvkk` | Public marketing | Public | Statik TS içerik; fiyat seed kopyası | SEO kısmi; sahte iddia/form/yasal kimlik P0/P1. |
| `/giris` | Tenant auth | Public | Credential repository + DB session | Gerçek login; rate-limit/cookie hardening eksik. |
| `/davet`, `/eposta-dogrulama` | Tenant onboarding | Token/DB akışı | Invitation/credential repository | Gerçek akış; provider outbox sandbox/adapter durumu açık yazılmalı. |
| `/kayit`, `/sifremi-unuttum`, `/sifre-sifirla` | Public auth taslağı | Public | Client state | Gerçek olmayan başarı P0; kapat veya gerçek server sözleşmesine bağla. |

### 5.2 Süper Admin sayfaları

| Route | Guard | Veri | Tamamlanma / risk |
|---|---|---|---|
| `/super-admin/giris` | Exact public + DB credential | Auth service | Tamamlanmış Faz 33. |
| `/super-admin/ilk-kurulum` | Exact public; singleton DB kontrolü | Bootstrap service | Credential varken kapanır. |
| `/super-admin/sifremi-unuttum`, `/sifre-sifirla`, `/dogrulama-kodu`, `/iki-faktor-dogrulama`, `/hesap-kilitlendi`, `/oturum-suresi-doldu`, `/bakim-modu`, `/yetkisiz-erisim` | Proxy fail-closed; capability/challenge gerekir | Faz 34 güvenlik servisleri | Public değildir; yeniden etkinleştirilmez. |
| `/super-admin` | Panel layout DB session | Global counts + son 10 audit | Gerçek veri; hard-coded health ve direct Prisma P1. |
| `/super-admin/tenants` | Panel layout DB session | Tüm tenant/company/user/session/subscription | Limitsiz; ID minimizasyonu/pagination yok. |
| `/super-admin/users` | Panel layout DB session | AppUser + email + aktif scope rolleri | Limitsiz; email/ID minimizasyonu yok. |
| `/super-admin/abonelikler` | Panel layout DB session | Subscription + plan + invoice count | Limitsiz; plan/provider gerçeği ayrımı görünmüyor. |
| `/super-admin/destek` | Panel layout DB session | Son 100 ticket | Truncation/pagination/filter yok. |
| `/super-admin/bildirimler` | Panel layout DB session | Sayaçlar + son 50 notification | Global PII/content minimizasyonu gerekir. |
| `/super-admin/raporlar` | Panel layout DB session | Global count sorguları | Sayım ekranı; tarih/scope/definition yok. |
| `/super-admin/erisim` | Panel layout DB session | AccessProfile, app ve SA session | Platform ve tenant auth ayrımı var; session minimizasyonu gerekir. |
| `/super-admin/loglar` | Panel layout DB session | Son 100 AuditLog | Export/retention/pagination/redaction yok. |
| `/super-admin/ayarlar` | Panel layout DB session | MaintenanceConfig, SA credential, counts | Salt-okunur; hard-coded sürüm/platform adı var. |
| `/super-admin/profil` | Panel layout + tekrar guard | Credential + account lock | Full ID/e-posta/IP gösterimi; IP maskelenmeli. |

### 5.3 API Route Handlers

Tüm aşağıdaki GET route'lar bearer API key doğrular, required scope'u kontrol
eder ve scope'u API key'den üretir:

| Required scope | Route'lar |
|---|---|
| `subscriptions` | `/api/abonelik` |
| `purchase-invoices`, `invoices` | `/api/alis-faturalari`, `/api/fatura-ozeti`, `/api/faturalar` |
| `api-keys`, `audit` | `/api/api-anahtarlari`, `/api/audit-kayitlari` |
| `vehicles` | `/api/arac-ozeti`, `/api/araclar` |
| `bank-transactions`, `cash-bank` | `/api/banka-hareketleri`, `/api/kasa-banka`, `/api/kasa-banka-ozeti` |
| `notifications` | `/api/bildirim-ozeti`, `/api/bildirimler` |
| `payroll`, `timesheets` | `/api/bordro`, `/api/puantaj`, `/api/puantaj-ozeti` |
| `counterparties` | `/api/cari-hesaplar` |
| `checks` | `/api/cekler`, `/api/cek-ozeti` |
| `documents` | `/api/dokumanlar` |
| `e-invoice`, `integration` | `/api/e-fatura/durum`, `/api/entegrasyon/durum` |
| `expenses` | `/api/giderler`, `/api/gider-ozeti` |
| `progress-payments` | `/api/hakedisler`, `/api/hakedis-ozeti` |
| `tenders` | `/api/ihaleler`, `/api/ihale-ozeti` |
| `user-management`, `ledger` | `/api/kullanici-yonetimi`, `/api/ledger-ozeti` |
| `customers`, `employees`, `projects` | `/api/musteriler`, `/api/musteri-ozeti`, `/api/personel`, `/api/personel-ozeti`, `/api/santiyeler`, `/api/santiye-ozeti` |
| `stock`, `stock-minimums`, `stock-cards` | `/api/stok-depo`, `/api/stok-esikleri`, `/api/stok-kartlari`, `/api/stok-karti-ozeti` |
| `contractors`, `suppliers` | `/api/taseronlar`, `/api/taseron-ozeti`, `/api/tedarikciler`, `/api/tedarikci-ozeti` |
| `webhooks` | `/api/webhook-endpointleri`, `/api/webhooks/durum`; `/api/webhooks/dry-run` kontrollü POST |

Özel route'lar:

- `/api/dokuman-merkezi/indirme`: tenant cookie session + permission + scoped
  repository; local object storage.
- `/api/e-fatura/webhook`: `NOA_EFATURA_WEBHOOK_SECRET` ve imza; secret yoksa
  fail-closed.
- `/api/subscription/webhook`: `NOA_PAYMENT_WEBHOOK_SECRET` ve imza; secret
  yoksa fail-closed.

Tamamlanmış API/e-Fatura/webhook fazları yeniden açılmaz; yalnız kanıtlanmış
P0 auth fallback veya production configuration sınırı ortak altyapıda ele
alınır.

## 6. Güvenlik ve tenant izolasyonu bulguları

| ID | Öncelik | Bulgu | Kanıt / gerekli karar |
|---|---|---|---|
| SEC-01 | P0 | Server Action'larda unauthenticated demo-scope fallback | `server-active-scope.ts`, `session-scope.ts`, 31 action dosyası. Production resolver fail-closed olmalı; test/demo resolver ayrı kalmalı. |
| SEC-02 | P0 | Tenant cookie production sözleşmesi eksik | `session-actions.ts`; Secure/expiry/central policy yok. |
| SEC-03 | P1 | Tenant login brute-force/account-lock yok | `credential-session-login.ts` yalnız credential/password kontrol ediyor. |
| SEC-04 | P0 | Güvenlik header/CSP yok | `next.config.ts` yalnız dev origin + React compiler içeriyor. |
| SEC-05 | P1 | SA profilinde tam IP/ID/e-posta | `(panel)/profil/page.tsx`; minimum gösterim ve mask gerekir. |
| SEC-06 | P1 | Global audit/log retention ve redaction sözleşmesi yok | SA log/dashboard direct Prisma. |
| SEC-07 | P1 | CSRF/origin politikası merkezi değil | SameSite kısmi koruma; Server Action mutation matrisi için Origin/host ve auth testleri gerekir. |
| SEC-08 | P2 | Scoped kayıttan sonra ID-only update örnekleri var | Ön okuma scoped olsa da koşullu `updateMany`/compound key yarış güvenliğini artırır; mevcut davranış yalnız hedefli regresyonla değişir. |

Faz 33–34'ün Super Admin secret, challenge, rate-limit, reset/TOTP ve exact
route kararlarında yeni defect bulunmadı; bu yüzeyler korunur.

## 7. Entegrasyon gerçeklik matrisi

| Entegrasyon | Canlı durum | Production kararı |
|---|---|---|
| E-posta / SMS | Outbox/fake veya adapter bekliyor; gerçek credential yok | External blocker; public başarı gösterilmez. |
| Ödeme / abonelik | Sandbox provider ve signed webhook sözleşmesi | Gerçek PSP, merchant, callback/domain ve operasyon onayı external blocker. |
| Banka / Open Banking | Sandbox/simülasyon; tarih testi kırık | Gerçek provider yok; “otomatik banka” marketing iddiası kapatılır. |
| e-Fatura | Domain/webhook altyapısı; gerçek GİB transportu yok | Tamamlanmış faz açılmaz; marketing “hazır entegrasyon” demez. |
| Outbound webhook | Endpoint/dry-run altyapısı; canlı worker kanıtı yok | Worker/queue/egress external blocker. |
| Arvento/GPS/CANbus | Sandbox/manual araç domaini | Gerçek credential/adapter yok; canlı telemetri iddiası kapalı. |
| Dosya storage | Yerel filesystem (`.noa-storage`) | Tek instance dev kabulü; object storage ve backup external/software blocker. |
| Analytics | Entegre ürün analytics kanıtı yok | Consent/policy/provider kararı external blocker. |
| Error monitoring | Provider yok | Sentry vb. seçim, DPA ve secret external blocker. |

## 8. Production readiness gap analizi

| Alan | Durum | Öncelik |
|---|---|---|
| Environment contract | `.env.example` yalnız `DATABASE_URL`; kullanılan diğer env'ler belgelenmiyor/doğrulanmıyor | P0 |
| Secret yönetimi | Kodda secret yok; deployment secret store ve rotation runbook yok | P1 / external |
| Migration | 64/64 güncel; deploy komutu var; prod approval/backup/rollback prosedürü yok | P1 |
| Seed | Dev seed ve gerçekçi demo data var; production hard-stop kanıtı yok; giriş belgesi `db push` öneriyor | P0 |
| Backup/restore/DR | Kanıt yok | P0 operational blocker |
| Health/readiness | Endpoint yok; SA dashboard sahte yeşil | P1 |
| Logging/observability | Domain audit güçlü; merkezi structured log/error monitoring yok | P1 / external |
| Background jobs | Provider bağımlı işler worker olmadan kapalı | External blocker |
| Multi-instance | SA rate-limit DB-backed; local file storage multi-instance uyumsuz | P1 |
| HTTPS/cookies/headers | SA cookie güçlü; tenant cookie ve HTTP security header eksik | P0 |
| Cache/revalidation | Domain bazlı revalidation var; ortak stale-read test matrisi eksik | P1 |
| SEO | Metadata kısmi; robots/sitemap/structured data/domain contract yok | P1 |
| Accessibility/responsive | Temel iyi; 320/768 taşma ve route bazlı kabul eksik | P1 |
| Legal/KVKK | Placeholder/çelişkili kimlik ve kanıtlanmamış veri işleme iddiaları | P0 / external |
| Tenant onboarding | CTA gerçek olmayan başarı gösterebiliyor | P0 |
| Plan enforcement | Domain var; marketing claim ve tarih determinismi uyumsuz | P0/P1 |
| CI/CD | `.github` pipeline kanıtı yok | P1 |
| Rollback/incident/retention/account closure | Runbook ve politika yok | P1 / external |

## 9. Önceliklendirilmiş risk listesi

### P0 — canlıya çıkışı engeller

1. `SEC-01`: unauthenticated Server Action demo-scope fallback.
2. Kırmızı test kapısı: Arvento/banka abonelik tarih determinizmi.
3. Public form ve auth ekranlarında sahte başarı.
4. Kanıtlanmamış marketing müşteri/entegrasyon/güvenlik/SLA iddiaları.
5. Tenant cookie ile HTTP security header/CSP production tabanının eksikliği.
6. Production env/seed ayrımı ve `db push` yönlendirmesinin güvenli olmaması.
7. Doğrulanmamış yasal kimlik/KVKK iletişim ve veri işleme beyanları.
8. Backup/restore sorumlusu ve doğrulanmış prosedür olmaması.

### P1 — canlı öncesi tamamlanmalı

1. Süper Admin repository/read-model, pagination ve minimizasyon.
2. Gerçek health/readiness ve gözlemlenebilirlik zemini.
3. Tenant login rate-limit/account lock/session expiry/revoke politikası.
4. Local document storage'ın deployment topolojisine uygunlaştırılması.
5. 320/768 responsive taşma, segment loading/error ve ortak table state'leri.
6. Robots, sitemap, structured data, canonical host ve consent/analytics kararı.
7. CI/CD, migrate deploy, rollback, incident ve retention runbook'ları.

### P2 — kontrollü iyileştirme

1. Üç yüzeyin common UI primitive kullanımını düşük churn ile artırmak.
2. ID-only update yarış güvenliği ve geniş kapsamlı mutation property testleri.
3. Süper Admin gelişmiş filtre/rapor/export; ayrı ürün onayıyla.

### External blocker

- Resmi şirket unvanı, adres, vergi/MERSİS, KEP ve iletişim kanalları.
- Production domain, hosting, TLS/CDN/WAF ve deployment topolojisi.
- SMTP/SMS, PSP, Open Banking, GİB, Arvento, object storage, analytics ve error
  monitoring sağlayıcı/credential/DPA kararları.
- Backup hedefi, RPO/RTO, veri retention ve hesap kapatma politikası.
- Destek saatleri, SLA, incident owner ve yasal danışman onayı.

## 10. Önerilen 10 temel varsayım

1. Faz 35 adı ve yolu `Docs/RFC-F35-01-platform-uyumlulugu-ve-canliya-hazirlik.md`
   olarak kalır; Faz 33–34 yeniden açılmaz.
2. İlk uygulama işi `getActiveTenantScope` production fallback'ini kaldıran,
   test/demo resolver'ını ayıran P0 auth stabilizasyonudur.
3. Gerçek provider/credential gelmeden reset, OTP/TOTP, SMTP/SMS, GİB,
   Open Banking, Arvento ve ödeme entegrasyonu etkinleştirilmez.
4. Süper Admin Faz 35'te önce salt-okunur platform repository/read-model ve
   minimizasyon kazanır; yeni panel mutasyonu eklenmez.
5. Tekil Süper Admin rolü korunur. Yeni platform RBAC/impersonation ayrı RFC'dir.
6. Marketing plan/fiyat kaynağı seed ile tek typed sözleşmeden türetilir; aktif
   ürün kabiliyeti olmayan modül “hazır” diye sunulmaz.
7. Resmi yasal kimlik kullanıcı tarafından sağlanana kadar yasal/iletişim
   içerikleri publish-ready kabul edilmez ve örnek bilgi başarı gibi görünmez.
8. Public iletişim/onboarding için provider yoksa kontrollü unavailable durumu
   gösterilir; istenirse ayrı onayla DB-backed inbox/additive migration açılır.
9. Local document storage yalnız tek-instance geliştirme kabulüdür; production
   storage adapter seçimi external blocker olarak görünür kalır.
10. Her bağımsız dilim hedefli test, sonra tam `npm test`, type-check,
    db:validate, lint, build ve diff-check ile; schema değişirse generate,
    migrate deploy/status ve rollback kanıtıyla kapanır.

## 11. Uygulama planı — bağımsız dikey dilimler

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — P0 Auth ve Test Stabilizasyonu | Required tenant session resolver; demo fallback'in test/dev izolasyonu; cookie policy; 22 tarih testinin deterministic clock/fixture düzeltmesi | Domain davranışı ve demo veri silinmez; tam test yeşil. |
| 2 — Public Gerçeklik Karantinası | Sahte kayıt/reset/iletişim/newsletter başarılarının kapatılması; kanıtlanmamış CTA/istatistik/entegrasyon/SLA metinlerinin truthful state'e alınması | Provider eklenmez; form submission varmış gibi davranılmaz. |
| 3 — Production Güvenlik Tabanı | Env schema/startup validation, CSP/security headers, tenant login rate-limit/session policy, production seed/db-push hard-stop | Next.js 16.2.9 yerel dokümana uygun; SA Faz 34 değişmez. |
| 4 — Süper Admin Platform Read-model | Repository/service DTO, explicit select, pagination/filter/sort, PII/IP minimizasyonu, gerçek health state veya kontrollü unavailable | Read-only; tenant domain mutasyonu/impersonation yok. |
| 5 — Marketing/Legal/SEO Sözleşmesi | Tek plan kaynağı, capability matrix, resmi kimlik girdisi, canonical config, robots/sitemap/structured data, draft blog ayrımı | Yasal kimlik external blocker ise publish gate kırmızı kalır. |
| 6 — Ortak UI/UX ve Route State | Ortak table/form/state primitive yakınsaması; segment loading/error; 320/390/768/1024/1440; keyboard/theme/print | AppShell yeniden tasarlanmaz; küçük dikey değişiklikler. |
| 7 — Operasyon ve Deployment Hazırlığı | Health/readiness, structured log boundary, storage port, CI/CD, migrate/backup/restore/rollback/incident/retention runbook | Gerçek hosting/provider yoksa dry-run ve sorumluluk matrisiyle sınırlı. |
| 8 — İzole Gerçek Veri ve Kapanış | Cross-tenant deep-link/action negatif testleri, SA/public/tenant browser kabulü, secret scan ve tam kapılar | P0/P1 yazılım kusuru sıfır; external blocker'lar açık listelenir. |

Her dilim ayrı geri alınabilir değişiklik setidir. Dilim 1–3 tamamlanmadan
marketing genişletmesi veya Süper Admin görsel iyileştirmesi öncelik alamaz.

### Dilim 1 uygulama sonucu — 04.08.2026

Dilim 1 tamamlandı. Tenant kapsam şablonu (`AppSession`) ile tarayıcı kimlik
doğrulaması ayrıldı; 65. additive migration ile sekiz saatlik, opak,
iptal edilebilir ve kapsam değişiminde kimliği dönen `AppAuthSession` eklendi.
Eksik, bilinmeyen, süresi geçmiş veya iptal edilmiş cookie artık production
Server Action'larında demo kapsama düşmez ve `/giris` yönlendirmesiyle kapalı
kalır. Cookie `HttpOnly`, production'da `Secure`, `SameSite=Lax`, kök path ve
sekiz saatlik ömür taşır; çıkış DB kaydını iptal eder. Production giriş sayfası
aktif demo kapsam listesini yayınlamaz.

Üç abonelik action test grubundaki sabit bitiş tarihleri 02.08.2026 saatine
sabitlenerek deterministik hale getirildi. Hedefli güvenlik testleri öngörülebilir
`AppSession` kimliğinin auth olarak kabul edilmediğini, yabancı scope geçişinin
reddedildiğini, kapsam geçişinde auth kimliğinin döndüğünü ve çıkış iptalini
kanıtladı. Canlı browser kabulü yetkisiz redirect, giriş, refresh, firma/dönem
geçişi ve çıkış zincirini gerçek PostgreSQL verisiyle geçti. Ayrıntılı kanıt ve
rollback sınırı
`Docs/UI-baseline/Faz35-dilim1-auth-test-stabilizasyonu-20260804.md` içindedir.

### Dilim 2 uygulama sonucu — 04.08.2026

Dilim 2 tamamlandı. Provider bağımlı self-servis kayıt, tenant parola kurtarma,
public iletişim ve newsletter kabiliyetleri tek typed sözleşmede fail-closed
olarak tanımlandı. İlgili route ve bileşenler form, input, token, hesap veya
teslimat üretmek yerine açık “kontrollü olarak kapalı” durumu gösterir.

Landing'deki kaynaksız müşteri/işlem hacmi/NPS sayaçları ve sahte müşteri
referansları kaldırıldı. Footer'daki `href="#"` sosyal bağlantıları, ücretsiz
deneme/satın alma başarı vaatleri, canlı ERP/GİB/Open Banking, native offline
mobil, production hosting/backup/sertifika, destek saati ve SLA iddiaları
çıkarıldı veya açık `sandbox`, `provider bekliyor`, `etkin değil` durumuna
alındı. Kaynağı doğrulanmayan sektör, mevzuat ve uzman yazıları draft oldu;
public blog yalnız repo kabiliyet durum yazısını üretir. Resmi kimlik ve hukuki
onay bulunmadığından gizlilik, kullanım koşulları ve KVKK sayfaları publish-ready
metin yerine “yayına hazır değil” bildirimi gösterir.

Typed sözleşme ve SSR regresyon testleri public yüzeylerin form/input veya sahte
başarı üretmediğini kanıtladı. Canlı browser kabulünde sekiz kritik route aynı
truthful state'i gösterdi. Ayrıntı
`Docs/UI-baseline/Faz35-dilim2-public-gerceklik-karantinasi-20260804.md`
içindedir.

### Dilim 3 uygulama sonucu — 04.08.2026

Dilim 3 tamamlandı. Production başlangıcı artık `APP_BASE_URL`, uzak PostgreSQL
`DATABASE_URL`, mutlak doküman dizini ve proxy güven kararını Zod sözleşmesiyle
doğrular; etkinleştirilirse webhook secret'ları en az 32 karakter, TOTP anahtarı
base64 kodlu 32 bayt olmak zorundadır. `npm start` bu doğrulamayı `prestart`
kapısında çalıştırır. Resmi `db:seed` ve `db:push` komutları `NODE_ENV` veya
`NOA_RUNTIME_ENV` production olduğunda migration öncesinde durur; production
şema değişimi yalnız `db:migrate` hattına bırakılmıştır.

Next.js 16.2.9 yerel `headers()` kılavuzuna uygun CSP, frame, MIME sniffing,
referrer, permissions, opener/resource ve production HSTS header'ları bütün
route'lara eklendi. Static sayfalar korunduğu için CSP bu dilimde nonce tabanlı
dinamik render'a geçirilmedi; production `unsafe-eval` içermez.

Tenant giriş denemeleri 66. additive migration ile e-posta ve yalnız açıkça
güvenilen proxy IP'sinin SHA-256 hash'leri üzerinden, PostgreSQL atomik upsert
fixed-window sayacıyla beş deneme/15 dakika sınırına alındı. Ham e-posta ve IP
bucket tablosunda tutulmaz; hata mesajı hesap varlığını açıklamaz. Sekiz saatlik
absolute, kaymayan ve scope değişiminde dönen tenant session politikası typed
sözleşme olarak sabitlendi. Süper Admin Faz 34 auth/rate-limit hattı değişmedi.

Canlı browser kabulü altıncı hatalı girişin kontrollü rate-limit durumuna
geçtiğini; HTTP kabulü CSP ve güvenlik header'larının döndüğünü doğruladı.
Ayrıntı
`Docs/UI-baseline/Faz35-dilim3-production-guvenlik-tabani-20260804.md`
içindedir.

### Dilim 4 uygulama sonucu — 04.08.2026

Dilim 4 tamamlandı. Tenant, kullanıcı ve audit listeleri doğrudan geniş Prisma
`include` sonuçlarını UI'ya taşımak yerine tek salt-okunur platform read-model
üzerinden dar `select` ve typed DTO kullanır. Listeler 25 satırla sınırlı;
server-side filtre, sıralama, toplam kayıt ve önceki/sonraki sayfa sözleşmesi
vardır. Tenant ve kullanıcı ham kimlikleri ekrandan çıkarıldı; e-posta maskeli,
audit label içindeki e-posta/IP redacted döner. Erişim ve profil yüzeylerinde
SA IP/user-agent ile credential ID yayını da minimize edildi.

Dashboard'ın sürekli yeşil hard-coded health kartı kaldırıldı. Veritabanı sabit
`SELECT 1` ile ölçülür ve gecikmesi gösterilir; uygulama yalnız işlenmiş isteği
available sayar; gerçek dış izleme provider'ı bulunmadığı için açık
`unavailable` durumundadır. Yeni platform mutasyonu, impersonation veya tenant
domain yazması eklenmedi.

Gerçek PostgreSQL kabulü 1 tenant, 13 kullanıcı ve 282 audit kaydını sınırlı
DTO'larla okudu. Geçici opak SA session ile dört protected route HTTP 200 geçti
ve session silindi; browser oturumsuz deep-link'in exact `returnTo` ile girişe
kapandığını, konsol hatası olmadığını doğruladı. Ayrıntı
`Docs/UI-baseline/Faz35-dilim4-super-admin-platform-read-model-20260804.md`
içindedir.

### Dilim 5 uygulama sonucu — 04.08.2026

Dilim 5 tamamlandı. Metadata base ve canonical URL'ler hard-coded, doğrulanmamış
domain yerine production'da zorunlu `APP_BASE_URL` sözleşmesinden türetilir.
Plan kartları ile modül karşılaştırması artık aynı `MARKETING_PLANS` typed
kataloğundan üretilir; kalıtılan modüller açılır ve AI/provider durum etiketleri
public capability sözleşmesini korur. Draft bloglar sitemap ve static params
dışında kalmaya devam eder.

Yeni resmi yayın kapısı şirket unvanı, adresi, resmi iletişim e-postası, veri
sorumlusu ve hukuki içerik onay tarihini typed env girdisi olarak ister.
Production HTTPS origin, bütün kimlik girdileri ve explicit
`NOA_PUBLIC_INDEXING_ENABLED=true` birlikte yoksa root metadata `noindex`,
`robots.txt` tam `Disallow: /`, sitemap boş ve JSON-LD kapalıdır. Kapılar
tamamlandığında yalnız public marketing route'ları ve yayınlanmış blog yazıları
sitemap'e girer; auth, API, SA ve taslak yasal sayfalar dışarıda kalır.

Next.js 16.2.9 yerel metadata/robots/sitemap/JSON-LD kılavuzları uygulandı.
Canlı HTTP kabulü mevcut eksik resmi kimlik durumunda fail-closed robots, boş
sitemap, localhost canonical ve legal `noindex` üretti. Browser fiyatlandırma
sayfasında dört gerçek plan başlığını, canonical/noindex'i, taşmasız görünümü ve
hatasız konsolu doğruladı. Ayrıntı
`Docs/UI-baseline/Faz35-dilim5-marketing-legal-seo-sozlesmesi-20260804.md`
içindedir.

### Dilim 6 uygulama sonucu — 04.08.2026

Dilim 6 tamamlandı. Süper Admin liste kontrolleri ortak form/button
primitive'lerine yaklaştırıldı; kök, marketing, tenant modül ve Süper Admin
panel segmentleri ortak loading ve bilgi sızdırmayan error state kazandı.
Next.js 16.2.9 sözleşmesine göre tekrar deneme `unstable_retry` kullanır.

Canlı browser kabulü 320/390/768/1024/1440 görünüm, mobil dialog açma/kapatma,
tema `aria-pressed` ve `dark` sınıfı eşleşmesi ile hatasız console'u doğruladı.
Global reduced-motion, focus-visible ve açık renk print override sözleşmesi
regresyon testlerinde kaldı. AppShell veya domain akışı yeniden tasarlanmadı.
Ayrıntı `Docs/UI-baseline/Faz35-dilim6-ortak-ui-route-state-20260804.md`
içindedir.

### Dilim 7 uygulama sonucu — 04.08.2026

Dilim 7 tamamlandı. Bağımlılıksız `/api/health` ile DB probe'lu, fail-closed
`/api/readiness` route'ları; hassas alan redaksiyonlu JSON log sınırı ve local
adapter'ı açıkça adlandıran ortak document-storage runtime portu eklendi.
PostgreSQL servisli CI migration, test, type-check, lint ve build kapılarını
tanımlar; uzak workflow bu çalışma kapsamında çalıştırılmadı.

Migration, backup/restore, rollback, incident, retention ve hesap kapanışı
runbook'u dry-run ve sorumluluk matrisiyle sabitlendi. Hosting, monitoring,
backup, object storage, incident ve hukuki retention sahipleri `ATANMADI`
olduğundan production yayın kapısı kırmızı kalır. Canlı yerel HTTP kabulü health
ve DB-ready yanıtlarını doğruladı. Ayrıntı
`Docs/UI-baseline/Faz35-dilim7-operasyon-deployment-hazirligi-20260804.md`
içindedir.

### Dilim 8 uygulama sonucu — 04.08.2026

Dilim 8 tamamlandı. Gerçek PostgreSQL'de geçici ikinci tenant ve scope ile
yabancı scope geçişi reddedildi, auth scope değişmedi ve bütün geçici kayıtlar
çıktıdan önce temizlendi. Public landing, gerçek tenant girişi/dashboard ve
Süper Admin protected deep-link browser kabulü hatasız console ile geçti.

Tam kapılar 352 test dosyası/1.869 test, type-check, Prisma validate, lint,
Next.js 16.2.9 production build ve diff kontrolünde yeşildir. Yüksek güvenli
secret taraması 1.336 metin dosyasında sıfır bulgu verdi. Açık P0/P1 yazılım
kusuru kalmadı; hosting/TLS/secret store, backup/restore, object storage,
monitoring/incident, RPO/RTO/SLA, retention/KVKK ve resmi yayın girdileri
external blocker olarak açık olduğundan production yayın kapısı kırmızıdır.
Ayrıntı
`Docs/UI-baseline/Faz35-dilim8-izole-gercek-veri-kapanis-20260804.md`
içindedir.

## 12. Açık kapsam dışı

- Yeni dış provider seçmek, credential üretmek veya gerçek gönderim/tahsilat.
- Faz 33–34 reset/OTP/TOTP/bakım/recovery sayfalarını public etmek.
- Tenant SaaS'ı veya AppShell'i baştan yazmak.
- Tamamlanmış API, e-Fatura ve webhook domainlerini defect olmadan yeniden açmak.
- Süper Admin impersonation, yeni platform RBAC, SSO/SCIM veya public admin API.
- Destructive migration, eski migration düzenleme, toplu backfill veya demo/E2E
  verisini sebepsiz silme.
- Kullanıcı onayı olmadan commit, push, PR veya deployment.

## 13. Kabul ve rollback stratejisi

### Kabul

- Auth negatif testleri cookie yok, unknown/expired/revoked session, başka
  tenant deep-link ve doğrudan Server Action POST senaryolarını kapsar.
- Her mutation scope + rol + dönem + idempotency + audit matrisiyle kanıtlanır.
- Süper Admin panelde DB session guard, pagination, redaction ve empty/loading/
  error state kabul edilir.
- Public yüzeyde hiçbir simüle başarı, sahte sosyal link veya kanıtsız capability
  iddiası kalmaz.
- 320/390/768/1024/1440, açık/koyu tema, klavye, refresh/deep-link/logout ve
  console/network kabulü yapılır.
- Tam kalite kapıları yeşil olmadan “tamamlandı” veya “production-ready” denmez.

### Rollback

- Her dilim küçük ve bağımsız tutulur; feature/capability değişikliği
  fail-closed varsayılana döner.
- Additive migration gerekirse eski okuma yolu en az bir release korunur;
  tablo/kolon silme rollback sayılmaz.
- Auth değişikliğinde eski güvensiz demo fallback production'a geri alınmaz;
  yalnız test fixture adapter'ı geri kullanılabilir.
- Marketing rollback'i son doğrulanmış truthful içeriğe döner; sahte iddia geri
  yüklenmez.
- Deployment rollback öncesi DB backup/checksum ve forward-fix kararı runbook'a
  bağlanır.

## 14. Onay kapısı

Kullanıcı Bölüm 10'daki on varsayımı ve Bölüm 11'deki yürütme sırasını açıkça
onaylamadan Dilim 1'e başlanmaz. Onay yalnız bu RFC'nin sınırlarını açar; external
provider, credential, destructive migration, production deployment, commit,
push veya PR yetkisi vermez.
