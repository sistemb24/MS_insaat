# Faz 31 — İzole Gerçek Veri ve UI Kapanışı

> Tarih: 31.07.2026
> Kapsam: Özel kullanıcı davetinde yetki profili

## Gerçek veri kabulü

`npm run invitation-profile:acceptance:verify` izole
`company-f31-kabul-20260731 / period-f31-kabul-20260731` kapsamında çalıştı.

Doğrulanan sözleşmeler:

- Aktif, aynı firma kapsamındaki profil ile özel davet oluşturuldu.
- Kabul tek kullanıcı, session, credential, `viewer` erişimi ve tek profil
  ataması oluşturdu.
- Aynı token ile retry ikinci kimlik, erişim, atama veya kabul audit'i üretmedi.
- Profilsiz standart davet eski rol eşlemesiyle kabul edildi ve profil ataması
  oluşturmadı.
- Davetten sonra pasifleştirilen profil kabul aşamasında yan etkisiz reddedildi.
- Yabancı firma profili davet oluşturma aşamasında reddedildi.
- Beş audit kaydı token, şifre, profil adı, açıklaması ve permission içeriği
  taşımadı.
- Finansal, ledger ve Doküman Merkezi operasyon kayıtları değişmedi.

Kabul özeti:

```json
{
  "atomicFailureSideEffects": 0,
  "auditCount": 5,
  "customAssignmentCount": 1,
  "documentSideEffects": 0,
  "financialSideEffects": 0,
  "legacyCompatibility": true,
  "retrySideEffects": 0,
  "status": "PASS"
}
```

## Canlı UI kabulü

Yönetici oturumunda `/ayarlar` → Kullanıcı Yönetimi → Kullanıcı Davet Et
akışı kontrol edildi:

- Normal kullanıcı tipinde profil alanı gösterilmedi.
- `Özel (RBAC ile Yönetilen)` seçildiğinde “Yetki profili” alanı görünür oldu.
- Aktif profil seçilmeden “Davet Gönder” pasif kaldı.
- Dar mobil görünümde dialog ve profil alanı erişilebilir kaldı; sayfa yatay
  taşma üretmedi.
- Koyu tema davranışı korundu.
- Tarayıcı konsolunda hata veya uyarı oluşmadı.

Demo firmasında aktif profil bulunmadığından canlı kontrolde veri oluşturan
gönderim yapılmadı. Aktif profil seçimi ve action payload'ı bileşen testiyle;
kalıcı yazım ise izole gerçek veri kabulüyle doğrulandı.

## Kapsam sınırı

Gerçek SMTP, bekleyen davet düzenleme, geçmiş davet backfill'i, bir kullanıcıya
çoklu profil, SSO/SCIM ve Doküman Merkezi dışındaki permission enforcement bu
fazda açılmadı.

## Kalite kapıları

- `npm test`: 316 dosya / 1.752 test geçti.
- `npm run type-check`: geçti.
- `npm run db:validate`: geçti.
- `npm run lint`: uyarısız geçti.
- `npm run build`: 77 sayfalık production build geçti.
- `git diff --check`: geçti.
- Uygulanan migration sayısı: 62.
