# Faz 32 — İzole Gerçek Veri ve UI Kapanışı

> Tarih: 02.08.2026
> Kapsam: Yetki profili atama yaşam döngüsü

## Gerçek veri kabulü

`npm run user-profile-lifecycle:acceptance:verify` izole
`company-f32-kabul-20260802 / period-f32-kabul-20260802` kapsamında çalıştı.

Doğrulanan sözleşmeler:

- Profil atanmış viewer kullanıcının accounting ve admin rolüne geçişinde
  scoped atama kaldırıldı.
- Accounting kullanıcının viewer rolüne geçişinde otomatik profil üretilmedi;
  mevcut profilsiz viewer fallback'i korundu.
- Profil atanmış viewer erişimi devre dışı bırakıldığında atama kaldırıldı.
- Temizlenen atamaların bağlı olduğu profil pasifleştirilebilir hale geldi.
- Yabancı firma ve dönem erişimi ile ataması değişmeden kaldı.
- Atama silme hatası zorlandığında erişim güncellemesi ve atama silme aynı
  transaction içinde geri alındı.
- Dört kullanıcı yönetimi audit kaydı yalnız geçiş, atama kimliği ve kaldırma
  nedenini taşıdı; profil içeriği veya gizli veri taşımadı.
- Finans, ledger, doküman ve session kayıtlarında yan etki oluşmadı.

Kabul özeti:

```json
{
  "atomicRollback": true,
  "auditCount": 4,
  "deactivationCleanup": true,
  "documentSideEffects": 0,
  "financialSideEffects": 0,
  "foreignScopePreserved": true,
  "profileDeactivationUnblocked": true,
  "roleCleanup": ["accounting", "admin"],
  "sessionSideEffects": 0,
  "status": "PASS",
  "viewerFallbackPreserved": true
}
```

## Canlı UI kabulü

Yönetici oturumunda `/ayarlar` kullanıcı ve yetki çalışma alanı salt okunur
olarak kontrol edildi:

- Aktif Kullanıcılar ve Özel Yetki Profilleri panelleri birlikte yüklendi.
- Viewer kullanıcının rol denetimi görünür, etkin ve erişilebilir etiketliydi.
- Koyu tema korundu.
- 1280 px masaüstü görünümünde yatay taşma oluşmadı.
- Tarayıcı konsolunda hata oluşmadı.

Demo kullanıcısının rolü veya erişim durumu değiştirilmedi. Başarılı mutasyon
sonrası iki listenin sayfa yenilemeden uzlaştırılması bileşen testleriyle;
kalıcı atomik yazım ise izole gerçek veri kabulüyle doğrulandı.

## Kapsam sınırı

Kullanıcı reaktivasyonu, toplu rol/profil işlemi, atama history tablosu,
admin/accounting profil kısıtlaması, yeni permission veya RBAC tüketicisi,
SSO/SCIM ve dış sağlayıcı açılmadı. Prisma şeması ve migration sayısı
değişmedi.

## Kalite kapıları

- `npm test`: 324 dosya / 1.791 test geçti.
- Faz 32 hedef testleri: 4 dosya / 51 test geçti.
- `npm run type-check`: geçti.
- `npm run db:validate`: geçti.
- `npm run lint`: repo genelinde uyarısız geçti.
- `npm run build`: 93 sayfalık production build uyarısız geçti.
- `git diff --check`: satır sonu uyarılarıyla geçti; whitespace hatası yoktur.
- Uygulanan migration sayısı: 62 (değişmedi).

Kapanış sırasında auth/marketing çalışma ağacındaki React effect, kullanılmayan
import ve `/blog` Server/Client Component form sınırı borçları giderildi.
Next.js 16 deprecation uyarısı için `middleware.ts` konvansiyonu `proxy.ts`
olarak güncellendi ve kök `metadataBase` tanımlandı. FAQ property testi de
üretimdeki `trim` normalizasyonuyla hizalandı. Faz 32 kaynakları, tam test,
type-check, şema, lint, build, gerçek veri ve UI kabulünde yeşildir.
