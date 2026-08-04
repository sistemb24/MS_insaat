# RFC-F32-01 — Yetki Profili Atama Yaşam Döngüsü

> Durum: **Onay Bekliyor — Dilim 0**
> Tarih: 02.08.2026
> Kaynak: Faz 30 özel yetki profili, Faz 31 profil bağlı kullanıcı daveti ve
> mevcut kullanıcı rolü/devre dışı bırakma akışları

## 1. Amaç

Profil atanmış görüntüleyici kullanıcının temel rolü değiştirildiğinde veya
kapsam erişimi devre dışı bırakıldığında artık geçerli olmayan profil
atamasını aynı atomik işlem içinde kaldırmak. Böylece eski atamanın yeni rolün
Doküman Merkezi davranışını yanlışlıkla kısıtlaması ve pasif kullanıcı
atamasının profil yaşam döngüsünü bloke etmesi engellenir.

Bu faz yeni permission kodu, yeni rol, kullanıcı reaktivasyonu veya Doküman
Merkezi dışındaki modüllerde enforcement açmaz.

## 2. Neden sıradaki çalışma

- Faz 30, dönem kapsamlı `UserAccessProfileAssignment` ve Doküman Merkezi
  enforcement pilotunu oluşturdu.
- Faz 31, özel davet kabulünde `viewer` erişimi ve profil atamasını atomik
  oluşturdu.
- Mevcut `updateUserAccessRole` yalnız `AppUserScopeAccess.role` alanını
  güncelliyor; viewer kullanıcının profil atamasını koruyor.
- Ataması kalan kullanıcı `accounting` rolüne geçirildiğinde runtime eski
  profili çözerek accounting fallback yetkilerini beklenmedik biçimde
  daraltabiliyor.
- Mevcut `deactivateUserAccess` erişimi pasife alıyor fakat atamayı bırakıyor;
  bu kayıt profil kullanım sayısını artırmaya ve profil pasifleştirmeyi
  engellemeye devam ediyor.
- Sorun mevcut iki yönetim mutasyonunun transaction sınırında çözülebilir;
  yeni tablo veya geniş RBAC yayılımı gerektirmez.

## 3. Önerilen varsayımlar

1. Faz 32 yalnız **kullanıcı rolü/devre dışı bırakma → profil ataması yaşam
   döngüsü** dikeyidir; yeni permission kataloğu veya modül guard'ı eklenmez.
2. Aktif `viewer` kullanıcının rolü `accounting` ya da `admin` yapıldığında
   aynı tenant + firma + dönem + kullanıcı kapsamındaki profil ataması
   kaldırılır.
3. Viewer rolünün viewer olarak kalması ve profilesiz kullanıcıların mevcut
   davranışı değişmez; gereksiz atama/audit yazımı yapılmaz.
4. `admin` veya `accounting` rolünden `viewer` rolüne geçiş otomatik profil
   üretmez. Kullanıcı eski viewer fallback'iyle başlar; admin gerekirse mevcut
   profil atama ekranını kullanır.
5. Kullanıcı kapsam erişimi devre dışı bırakıldığında aynı dönemdeki profil
   ataması da kaldırılır. `AppUser`, credential, session ve diğer firma/dönem
   erişimleri silinmez.
6. Rol güncellemesi veya devre dışı bırakma ile atama kaldırma tek Prisma
   transaction'ında gerçekleşir; herhangi bir adım başarısızsa erişim ve
   atama birlikte eski halinde kalır.
7. Atama fiziksel olarak kaldırılır; yeni history tablosu açılmaz. Mevcut
   audit günlüğü önceki profil kimliğini ve kaldırma nedenini geçmiş kanıtı
   olarak taşır.
8. Audit profil adı, açıklaması, permission listesi, e-posta gövdesi,
   credential/session bilgisi veya request secret taşımaz.
9. Ayarlar ekranı başarılı rol değişikliği/devre dışı bırakma sonrasında aktif
   kullanıcı ve görüntüleyici atama listelerini aynı anda günceller; sayfa
   yenilemeden eski viewer satırı gösterilmez.
10. İzole kabul; viewer→accounting/admin, accounting→viewer, devre dışı
    bırakma, profilesiz geriye uyum, yabancı scope, atomik hata, audit
    redaction, profil pasifleştirme blokajının kalkması ve sıfır
    finans/ledger/doküman/session yan etkisini; UI ise tema, 390 px, klavye ve
    temiz konsolu doğrular.

## 4. Domain ve repository kararı

`UserManagementRepository` rol/deaktivasyon mutasyonları, kaldırılan atamanın
kimliğini sonuçla birlikte döndürecek şekilde additive genişletilir:

- erişim kaydı bulunamazsa mevcut `null` davranışı korunur,
- ilgili kullanıcıda atama yoksa yalnız erişim güncellenir,
- atama varsa erişim güncellemesi ve scoped atama silme transaction içinde
  birlikte çalışır,
- transaction dışından doğrudan assignment silme action'ı açılmaz.

Şema değişikliği beklenmez. Mevcut
`UserAccessProfileAssignment @@unique([tenantId, companyId, periodId,
userId])` kapsamı atomik temizleme için yeterlidir.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Sözleşmesi | Rol/deaktivasyon ile atama temizleme kararları ve sonuç tipleri | Prisma/UI değişmez. |
| 2 — Atomik Repository | Scoped assignment delete + erişim mutation transaction'ı | Yeni tablo/migration yoktur. |
| 3 — Service Action ve Audit | Admin/scope guard'ları, güvenli audit metadata'sı | Doğrudan action çağrısı UI'ı aşamaz. |
| 4 — Ayarlar UI Tutarlılığı | Aktif kullanıcı ve viewer atama listelerinin eşzamanlı güncellenmesi | Yeni kullanıcı yönetim ekranı açılmaz. |
| 5 — İzole Gerçek Veri ve Kapanış | Atomiklik, geriye uyum ve profil blokajı kabulü | Yeni RBAC tüketicisi veya dış sağlayıcı yoktur. |

## 6. Kabul kriterleri

- Profil atanmış viewer, accounting/admin rolüne geçince atama kalmaz.
- Atama silinemiyorsa rol değişmez; rol değişemiyorsa atama silinmez.
- Profil atanmış kullanıcının erişimi pasife alınınca atama kalmaz.
- Pasif kullanıcının eski ataması profil pasifleştirmeyi engellemez.
- Accounting/admin → viewer geçişinde sahte veya varsayılan profil üretilmez.
- Profilsiz ve farklı rol kullanıcılarının mevcut davranışı korunur.
- Yabancı tenant/firma/dönem erişimi veya ataması değiştirilemez.
- UI başarılı işlemden sonra eski viewer atamasını göstermeyi bırakır.
- Audit yalnız kimlik, rol/durum geçişi ve kaldırma nedenini taşır.
- Tam kalite kapıları yeşildir.

## 7. Kapsam dışı

Kullanıcı reaktivasyonu, erişim silme, toplu rol/profil değişikliği, geçmiş
atama tablosu, bir kullanıcıya çoklu profil, admin/accounting profil
kısıtlaması, yeni permission kodları, Doküman Merkezi dışı enforcement,
SSO/SCIM, gerçek SMTP ve public API kapsam dışıdır.

## 8. Onay kapısı

Uygulama, Bölüm 3'teki on varsayım kullanıcı tarafından onaylandıktan sonra
**Faz 32 Dilim 1 — Domain Sözleşmesi** ile başlayacaktır. Onay öncesinde
repository davranışı, şema veya gerçek veri değiştirilmez.

## 9. Uygulama kapanışı

**Tamamlanma durumu — 02.08.2026:** Bölüm 3'teki on varsayım kullanıcı
tarafından onaylandı ve beş dilim tamamlandı.

- Rol ve deaktivasyon kararları ortak domain yaşam döngüsüyle tanımlandı.
- Scoped erişim güncellemesi ile varsa profil atamasının fiziksel silinmesi
  tek Prisma transaction'ında atomik hale getirildi.
- Service ve server action katmanlarında mevcut admin, aktif dönem ve scope
  guard'ları korundu; audit yalnız kaldırılan atama kimliğini ve nedenini
  taşıyacak biçimde genişletildi.
- Ayarlar ekranındaki aktif kullanıcı ve viewer profil listeleri başarılı
  işlemden sonra sayfa yenilemeden aynı kaynağa uzlaştırıldı.
- İzole gerçek veri, atomik rollback ve canlı UI kabulü tamamlandı.

Şema/migration, yeni permission, yeni RBAC tüketicisi, session/credential
silme veya dış sağlayıcı eklenmedi. Kapanış kanıtı
`Docs/UI-baseline/Faz32-gercek-veri-kapanis-20260802.md` içindedir.
