# RFC-F31-01 — Özel Kullanıcı Davetinde Yetki Profili

> Durum: **Tamamlandı — Dilim 1–5**
> Tarih: 31.07.2026
> Kaynak: Faz 30 özel yetki profili çekirdeği, mevcut kullanıcı daveti ve
> davet kabulü akışı

## 1. Amaç

“Özel (RBAC ile Yönetilen)” kullanıcı davet edilirken aktif yetki profilinin
seçilmesini ve davet kabul edildiğinde `viewer` erişimi ile profil atamasının
tek atomik işlemde oluşmasını sağlamak. Böylece adminin kullanıcı kabulünden
sonra Ayarlar ekranına dönüp manuel profil ataması yapması zorunluluğu
kaldırılır.

Bu faz yeni kimlik sağlayıcısı, e-posta sağlayıcısı, global rol modeli veya
Doküman Merkezi dışındaki modüllerde permission enforcement açmaz.

## 2. Neden sıradaki çalışma

- Faz 30 profil tanımı, viewer ataması ve Doküman Merkezi enforcement
  pilotunu tamamladı.
- Mevcut kullanıcı tipi sözleşmesinde “Özel (RBAC ile Yönetilen)” vardır;
  davet kabulü bu tipi güvenli biçimde `viewer` rolüne düşürür.
- Davet DTO'su ve `UserInvitation` modeli profil kimliği taşımaz.
- Admin profil atamasını ancak kullanıcı daveti kabul edip aktif erişim satırı
  oluştuktan sonra ayrı bir işlemle yapabilir.
- Mevcut profil çekirdeğini gerçek kullanıcı onboarding akışına bağlamak,
  yeni modül açmadan küçük ve ölçülebilir bir iş akışı eksikliğini kapatır.

## 3. Önerilen varsayımlar

1. Faz 31 yalnız **özel kullanıcı daveti → profil ataması** dikeyidir;
   Doküman Merkezi dışındaki permission guard'ları profile geçirilmez.
2. `UserInvitation` modeline nullable `accessProfileId` eklenir. Mevcut
   davetler backfill edilmez ve bugünkü davranışlarını korur.
3. Profil seçimi yalnız kullanıcı tipi tam olarak
   `Özel (RBAC ile Yönetilen)` olduğunda zorunludur. Diğer kullanıcı tipleri
   profil taşıyamaz.
4. Seçilen profil davetin `tenantId + companyId` kapsamındaki aktif profil
   olmalıdır; yabancı firma veya pasif profil fail-closed reddedilir.
5. Davet kabulünde temel rol yine `viewer` olur. `AppUser`,
   `AppUserScopeAccess`, `AppSession`, `AppCredential`, davet kabul durumu ve
   `UserAccessProfileAssignment` tek repository transaction'ında yazılır.
6. Admin, accounting veya diğer kullanıcı tiplerinin rol eşlemeleri ve mevcut
   davet kabul davranışı değiştirilmez; admin profil ile kısıtlanamaz.
7. Bekleyen davetin yeniden gönderimi aynı profil kimliğini korur. İptal veya
   süresi dolma profil ataması üretmez; fiziksel profil kopyası oluşturulmaz.
8. Profil davet oluşturulduktan sonra pasife alınmışsa kabul yan etkisiz
   reddedilir. Admin daveti iptal edip aktif profille yeni davet oluşturur;
   bu fazda bekleyen davet düzenleme akışı açılmaz.
9. Davet oluşturma/kabul audit'i profil kimliğini taşıyabilir; profil adı,
   açıklaması, permission listesi, token, şifre ve request key taşımaz.
   Gerçek SMTP/e-posta teslimatı yine ertelenir.
10. İzole kabul; özel/standart kullanıcı tipi ayrımı, zorunlu profil, firma
    izolasyonu, pasif profil, retry, atomiklik, audit redaction, mevcut davet
    geriye uyumu ve sıfır finans/doküman yan etkisini; UI ise tema, 390 px,
    klavye ve temiz konsolu doğrular.

## 4. Sözleşme değişikliği

`UserInvitationCreateValues`:

- `email`
- `role`
- `accessProfileId?: string`

`UserInvitation` additive alanı:

- `accessProfileId String?`
- `accessProfile AccessProfile?`

Özel kullanıcı daveti için:

1. admin aktif profili seçer,
2. server action profil scope/status doğrulamasını yeniden yapar,
3. davet profil kimliğiyle bekleyen duruma yazılır,
4. kabul anında profil yeniden doğrulanır,
5. kullanıcı erişimi `viewer`, profil ataması seçilen profil ile atomik oluşur.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Sözleşmesi | Davet/profil validasyonu ve rol eşleme kuralları | Şema/UI değişmez. |
| 2 — Şema ve Repository | Nullable davet profil FK'si ve atomik kabul transaction'ı | Mevcut davetlere backfill yoktur. |
| 3 — Server Action ve Audit | Firma/aktif profil guard'ı ve redacted audit | Doğrudan action çağrısı UI'ı aşamaz. |
| 4 — Davet UI | Özel tipte zorunlu aktif profil seçimi | Diğer tiplerde alan görünmez ve gönderilmez. |
| 5 — İzole Gerçek Veri ve Kapanış | Onboarding atomikliği ve geriye uyum kabulü | Dış sağlayıcı ve yeni permission pilotu yoktur. |

## 6. Kabul kriterleri

- Özel kullanıcı aktif profil seçilmeden davet edilemez.
- Diğer kullanıcı tipleri profil kimliği taşıyamaz.
- Yabancı firma ve pasif profil davet oluşturma/kabul aşamasında reddedilir.
- Davet kabulünde viewer erişimi ve profil ataması birlikte oluşur.
- Kabulün herhangi bir adımı başarısızsa kullanıcı/session/atama kısmi kalmaz.
- Retry ikinci kullanıcı, atama veya audit üretmez.
- Eski profilsiz davetler mevcut rol eşlemesiyle kabul edilebilir.
- Audit token, şifre, profil içeriği veya e-posta gövdesi taşımaz.
- Finans, ledger ve doküman kayıtları değişmez.
- Tam kalite kapıları yeşildir.

## 7. Kapsam dışı

Bekleyen davet düzenleme, mevcut kullanıcıları toplu profile atama, bir
kullanıcıya birden çok profil, profil inheritance, accounting/admin
kısıtlama, Doküman Merkezi dışı enforcement, SSO/SCIM, gerçek SMTP, public API
ve geçmiş davet backfill'i kapsam dışıdır.

## 8. Onay kapısı

Uygulama, Bölüm 3'teki on varsayım kullanıcı tarafından onaylandıktan sonra
**Faz 31 Dilim 1 — Domain Sözleşmesi** ile başlayacaktır. Onay öncesinde şema,
davet davranışı veya gerçek veri değiştirilmez.

## 9. Uygulama kapanışı

**Tamamlanma tarihi: 31.07.2026**

Kullanıcı onayıyla beş dilim birlikte tamamlandı:

- Özel kullanıcı tipi ve profil seçimi için typed doğrulama sözleşmesi eklendi.
- `UserInvitation.accessProfileId` nullable ilişkisi 62. migration ile
  oluşturuldu; mevcut davetlere backfill uygulanmadı.
- Davet kabulündeki kullanıcı, session, viewer erişimi, credential, davet
  durumu ve profil ataması tek Prisma transaction'ına alındı.
- Oluşturma ve kabul akışlarında aktif profil ile tenant/firma kapsamı yeniden
  doğrulandı; audit yalnız profil kimliğini taşıyacak şekilde sınırlandı.
- Ayarlar davet penceresinde profil seçimi yalnız özel kullanıcı tipinde
  görünür ve zorunlu hale getirildi.

İzole gerçek veri kabulü özel davet, profilsiz eski davet, yabancı/pasif
profil reddi, retry, atomik hata ve redacted audit senaryolarını doğruladı.
Finansal, ledger ve doküman kayıtlarında yan etki oluşmadı. Canlı yönetici
UI'ında masaüstü, dar mobil görünüm, koyu tema, zorunlu seçim ve temiz konsol
kabul edildi. Ayrıntı
`Docs/UI-baseline/Faz31-gercek-veri-kapanis-20260731.md` içindedir.
Tam kapılar 316 test dosyasında 1.752 test, type-check, Prisma validate,
güncel 62 migration, uyarısız lint, 77 sayfalık production build ve
`git diff --check` ile geçti.
