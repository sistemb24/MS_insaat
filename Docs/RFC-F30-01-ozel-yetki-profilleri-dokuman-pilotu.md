# RFC-F30-01 — Özel Yetki Profilleri ve Doküman Merkezi Pilotu

> Durum: **Tamamlandı — Dilim 1–5**
> Tarih: 31.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-modul-gelistirme-plani.md` Bölüm 3A, 4.5 ve
> 10; mevcut `AppUserScopeAccess`, `src/lib/rbac.ts`, Kullanıcı Yönetimi ve
> Doküman Merkezi yetki sınırları

## 1. Amaç

Mevcut `admin | accounting | viewer` rollerini ve çalışan server guard'larını
bozmadan, “Özel (RBAC ile Yönetilen)” kullanıcı tipi için şirket kapsamlı
yeniden kullanılabilir yetki profilleri oluşturmak. İlk gerçek enforcement
pilotu yalnız Doküman Merkezi kaynak–aksiyon izinlerinde uygulanacaktır.

Bu faz tüm uygulamayı tek seferde granüler RBAC'a geçirmek, mevcut rolleri
yeniden adlandırmak, klasör bazlı ACL kurmak veya finansal onay yetkilerini
değiştirmek değildir. Amaç güvenli bir çekirdek ve dar bir gerçek tüketiciyle
ilerideki modül geçişlerinin kalıbını doğrulamaktır.

## 2. Neden sıradaki çalışma

- Faz 29 ile sağlayıcıdan bağımsız cari master veri işleri tamamlandı.
- Ana planın yalın yürütme özeti; gerçek Open Banking, SMTP/e-posta teslimatı
  ve bulut depolama hazır değilken kalan sağlayıcıdan bağımsız backlog olarak
  granüler RBAC'ı işaret eder.
- `src/lib/rbac.ts` halihazırda dört sabit permission anahtarını üç temel role
  bağlar; ancak kullanıcıya atanabilen kalıcı profil yoktur.
- “Özel (RBAC ile Yönetilen)” kullanıcı tipi ayarlarda görünür ve davet kabul
  akışında güvenli `viewer` rolüne düşer; gerçek özel izin ataması yapılamaz.
- Doküman Merkezi `document.manage` guard'ını merkezi kullanır ve finansal
  kayıt üretmez; ilk enforcement pilotu için en düşük riskli gerçek yüzeydir.

## 3. Önerilen varsayımlar

1. Faz 30 yalnız **özel yetki profili çekirdeği ve Doküman Merkezi pilotu**dur.
   Kasa/banka, ledger, fatura, bordro, İSG, API ve diğer modüllerin guard'ları
   bu fazda profile geçirilmez.
2. Yetki profili `tenantId + companyId` kapsamında ve dönemden bağımsızdır.
   Kullanıcı–profil ataması ise mevcut erişim satırı gibi
   `tenantId + companyId + periodId + userId` kapsamında olur.
3. Additive `AccessProfile`, `AccessProfilePermission` ve
   `UserAccessProfileAssignment` modelleri kullanılır. Mevcut
   `AppUserScopeAccess.role`, `AppSession.role` ve üç temel rol backfill
   edilmez, silinmez veya enum genişletmesine zorlanmaz.
4. Pilot permission kataloğu sabittir:
   `document.view`, `document.file.create`, `document.file.rename`,
   `document.file.trash_restore` ve `document.folder.manage`. Kullanıcının
   serbest permission kodu üretmesine izin verilmez.
5. Admin her zaman tam yetkilidir ve profil ile kısıtlanamaz. Profil yönetimi
   ve ataması yalnız admin tarafından yapılır; yönetici kendi admin erişimini
   profile dönüştüremez veya kilitleyemez.
6. İlk pilotta profil yalnız temel rolü `viewer` olan aktif erişime atanabilir.
   Atanmamış admin/accounting/viewer kullanıcıların mevcut davranışı birebir
   korunur; accounting'in Doküman Merkezi yetkileri geriye dönük daralmaz.
7. Profile atanmış viewer için Doküman Merkezi kararları deny-by-default
   çalışır: yalnız açıkça izin verilen aksiyon yapılabilir. Bu karar hem UI
   görünürlüğünde hem server action/service katmanında yeniden uygulanır.
8. Profil adı 2–80, açıklama en fazla 240 karakterdir; normalize ad şirket
   içinde tekildir. Fiziksel silme yoktur; profil aktif/pasif yapılır ve aktif
   ataması bulunan profil pasifleştirilmeden önce kontrollü biçimde reddedilir.
9. Profil ve atama mutation'ları optimistic revision, kullanıcı/firma
   kapsamlı idempotent request key ve redacted audit kullanır. Audit profil
   açıklaması, kullanıcı e-postası/adı veya request key taşımaz; yalnız güvenli
   kimlik, permission kodu, durum ve revizyon geçişlerini taşır.
10. İzole kabul; rol/scope/kapalı dönem, retry, stale revision, duplicate,
    admin bypass, viewer profil grant/deny, atanmamış rol geriye uyumu,
    yabancı firma izolasyonu ve doküman/finans/session yan etkisizliğini;
    UI ise tema, 390 px, print ve temiz konsolu doğrular.

## 4. Domain ve karar sözleşmesi

Kalıcı profil:

- `id`, `tenantId`, `companyId`
- `name`, `normalizedName`, `description`
- `status = ACTIVE | INACTIVE`
- `revisionNo`, `lastMutationKey`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

Profil permission satırı:

- `profileId`
- `permissionCode`
- `allowed`

Kullanıcı ataması:

- `id`, `tenantId`, `companyId`, `periodId`, `userId`
- `profileId`
- `revisionNo`, `lastMutationKey`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

Effective karar sırası:

1. `admin` → izinli,
2. aktif viewer ataması + aktif profil → ilgili permission satırı,
3. atama yok → mevcut `hasRbacPermission(role, permission)` fallback'i,
4. geçersiz/pasif/yanlış scope ataması → fail-closed ve güvenli hata.

## 5. Doküman Merkezi pilot eşlemesi

| İşlem | Permission |
|---|---|
| Liste/önizleme/indirme | `document.view` |
| Dosya yükleme | `document.file.create` |
| Dosya yeniden adlandırma | `document.file.rename` |
| Çöpe taşıma ve geri alma | `document.file.trash_restore` |
| Kullanıcı klasörü oluşturma/yeniden adlandırma/silme | `document.folder.manage` |

Sistem klasörü korumaları, 5 MB dosya limiti, storage adapter, abonelik
guard'ı, soft-delete/purge kuralları ve mevcut audit yaşam döngüsü aynen
korunur. Permission kararı bu kuralların yerine geçmez; ek güvenlik kapısıdır.

## 6. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Çekirdeği | Sabit katalog, profil/atama validasyonu ve effective karar | Saf testler; şema/UI değişmez. |
| 2 — Şema ve Repository | Additive modeller/migration, company profile ve period assignment repository'leri | Mevcut rol/session kayıtları backfill edilmez. |
| 3 — Server Action ve Audit | Profil CRUD/status, permission kaydı, kullanıcı atama/kaldırma | Admin-only, retry güvenli, redacted audit. |
| 4 — Ayarlar UI ve Doküman Pilotu | Profil matrisi, kullanıcı ataması ve document action enforcement | Diğer modül guard'ları değişmez. |
| 5 — İzole Gerçek Veri ve Kapanış | Ayrılmış firma, profil grant/deny, geriye uyum ve tam kalite kabulü | Dış sağlayıcı ve finansal yan etki yoktur. |

## 7. Kabul kriterleri

- Profil tanımı ve ataması tam tenant/firma/dönem sınırında çalışır.
- Aynı normalize profil adı şirket içinde ikinci kez oluşturulamaz.
- Admin profilden bağımsız tam yetkili kalır.
- Atanmamış accounting ve viewer davranışı mevcut role fallback eder.
- Profile atanmış viewer yalnız verilen Doküman izinlerini kullanabilir.
- UI'da gizlenen aksiyon doğrudan server action çağrısıyla aşılamaz.
- Pasif/yanlış scope profil fail-closed davranır.
- Retry ikinci mutation/audit üretmez; stale revision reddedilir.
- Mevcut `AppSession.role`, doküman metadata/binary içeriği ve finansal kayıtlar
  profile yönetimi nedeniyle değişmez.
- Tam kapılar `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 8. Kapsam dışı

Tüm modüllerin toplu RBAC dönüşümü, admin kısıtlama, accounting profil
daraltması, klasör/dosya satır bazlı ACL, lokasyon bazlı veri filtresi,
permission inheritance, koşullu/alan bazlı yetki, SSO/SCIM, dış kimlik
sağlayıcısı, gerçek e-posta teslimatı, bulut storage, yeni public API endpoint'i
ve geçmiş kullanıcı/rol backfill'i kapsam dışıdır.

## 9. Onay kapısı

Uygulama, Bölüm 3'teki on varsayım kullanıcı tarafından onaylandıktan sonra
**Faz 30 Dilim 1 — Domain Çekirdeği** ile başlayacaktır. Onay öncesinde Prisma
şeması, migration, authorization davranışı veya gerçek veri değiştirilmez.

## 10. Uygulama ve kapanış

RFC'deki on varsayım kullanıcı tarafından 31.07.2026 tarihinde onaylandı ve
beş dilim kesintisiz tamamlandı. Sabit permission kataloğu, admin bypass,
atanmış viewer deny-by-default kararı ve atanmamış rol fallback'i saf domain
sözleşmesinde toplandı. Additive `AccessProfile`,
`AccessProfilePermission` ve `UserAccessProfileAssignment` modelleri
`20260731090000_add_access_profiles` migration'ıyla eklendi; mevcut rol ve
session satırlarına backfill yapılmadı.

Profil CRUD/status ve dönem bazlı viewer atama/kaldırma action'ları admin-only,
optimistic revision ve idempotent request key ile çalışır. Audit yalnız güvenli
kimlik, permission kodu, durum ve revizyon bilgisi taşır. Doküman Merkezi
liste/indirme, yükleme, adlandırma, çöp/geri alma ve klasör işlemleri hem UI
capability görünürlüğünde hem service/action sınırında yeniden doğrulanır.
Admin tam yetkili; atanmamış accounting/viewer eski davranışını korur.

İzole PostgreSQL kabulü şirket/dönem izolasyonu, kapalı dönemde firma master
yönetimi, retry, duplicate, stale/aktif atama pasifleştirme reddi, admin
bypass, viewer grant/deny ve redacted audit'i doğruladı. Profil işlemleri
doküman, finans, ledger ve session yan etkisi üretmedi. Canlı yönetici
arayüzünde panel; koyu tema, 390 px taşmasız görünüm ve temiz konsolla kabul
edildi. Ayrıntı
`Docs/UI-baseline/Faz30-gercek-veri-kapanis-20260731.md` içindedir.
