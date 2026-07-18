# Tenant / Firma / Dönem Kapsam Notu

Bu not, NOA İnşaat Yönetim SaaS uygulamasında her iş kaydının hangi kapsamda tutulacağını tanımlar.

## Temel İlke

Eski NOA iş akışında kullanıcı pratik olarak bir firma ve dönem içinde çalışır. SaaS üründe bu iş akışı korunurken veri sınırı açık hale getirilir:

- `tenantId`: SaaS müşteri/abonelik sınırı.
- `companyId`: tenant altındaki firma sınırı.
- `periodId`: firma içindeki çalışma dönemi.
- `userId`: işlemi yapan kullanıcı.
- `userRole`: kullanıcının işlem yetki seviyesi.

Bu kapsam alanları olmadan kalıcı kayıt oluşturulmaz.

## Aktif Oturum Kapsamı

Uygulama artık sayfa ve server action katmanında doğrudan `defaultTenantScope` kullanmaz. Aktif kapsam `noa-session-id` cookie'sindeki opak oturum kimliğinden ve PostgreSQL'deki `AppSession` kaydından üretilir:

- Cookie adı: `noa-session-id`
- Cookie değeri serbest tenant/firma/rol JSON'u değildir.
- `AppSession` tenant, firma, dönem, kullanıcı, rol, lisans etiketi ve opsiyonel son kullanma tarihini tutar.
- Süresi geçmiş, bilinmeyen veya boş oturum kimliği güvenli demo muhasebe kapsamına düşer.
- `demo-accounting`: panelde `Muhasebe Kullanıcısı` adıyla görünen varsayılan muhasebe kullanıcısı olarak DB'ye seed edilir.
- `demo-viewer`: aynı tenant/firma/dönemde salt-okur demo kullanıcısı olarak DB'ye seed edilir.
- `AppCredential` kullanıcı e-postası, PBKDF2 parola hash'i ve varsayılan `AppSession` bağlantısını tutar.
- `AppUserScopeAccess` kullanıcıların hangi tenant/firma/dönem kapsamında hangi rolle çalışabileceğini kalıcı yetki listesi olarak tutar.
- Üst bar, sadece aktif kullanıcının `AppUserScopeAccess` ile yetkili olduğu firma/dönemlere karşılık gelen `AppSession` seçeneklerini listeler ve server action ile cookie'yi günceller.
- Oturum geçişi aynı sayfaya geri döner; sayfa, shell ve server action scope'u yeni session üzerinden yeniden çözülür.
- Oturum geçiş action'ı hedef session id değerini aktif kullanıcının `AppUserScopeAccess` ile filtrelenmiş session listesine karşı doğrular; access kaydı kaldırılmış firma/dönemlere geçiş cookie yazmadan reddedilir.
- `/giris` sayfası e-posta/şifre ile giriş yapmayı sağlar; başarılı giriş varsayılan `AppSession` id değerini ancak aktif `AppUserScopeAccess` ile destekleniyorsa cookie'ye yazar. Varsayılan session erişimden düşmüşse aynı kullanıcı için ilk erişilebilir firma/dönem session'ı seçilir; erişilebilir kapsam yoksa giriş reddedilir.
- Üst bardaki `Çıkış` aksiyonu session cookie'sini sıfırlar ve kullanıcıyı `/giris` sayfasına döndürür.

Gerçek auth eklendiğinde cookie yine yalnızca opak session id taşımalı; kullanıcı, firma, dönem ve rol kararı session store/auth provider tarafında verilmelidir. Böylece istemciden gelen tenant, firma, dönem veya rol alanlarına doğrudan güvenilmez.

## Firma / Dönem Yetki Kaydı

`AppSession` halen bugünkü kabukta aktif kapsamı taşır; ancak firma/dönem erişiminin kalıcı kaynağı artık ayrıca modellenmiştir:

- `AppUserScopeAccess.id`: yetki satırının sabit kimliği.
- `tenantId`, `companyId`, `periodId`: erişilen çalışma kapsamı.
- `userId`: erişim verilen kullanıcı.
- `role`: o kapsam içindeki rol (`admin`, `accounting`, `viewer`).
- `licenseLabel`: lisans/plan etiketi.
- `isDefault`: kullanıcı giriş yaptığında seçilecek öncelikli kapsam.
- `isActive`: erişim satırını silmeden devre dışı bırakma bayrağı.

Bu ayrım SaaS mimarisi için önemlidir: gerçek ürün aşamasında auth session kullanıcının kimliğini, `AppUserScopeAccess` ise kullanıcının hangi firma/dönemlerde işlem yapabileceğini belirler. Böylece üst bar kapsam değiştirici artık kullanıcının aktif firma/dönem erişimlerine göre filtrelenir; `AppSession` bu aşamada seçilecek kapsamın opak oturum temsilcisi olarak kalır.

Demo seed kayıtları:

- `access-demo-accounting`: `user-main` için DEMO İNŞAAT / 2026, `accounting`, varsayılan ve aktif.
- `access-demo-viewer`: `user-viewer` için DEMO İNŞAAT / 2026, `viewer`, varsayılan ve aktif.
Varsayılan demo kapsamı:

- Tenant: `tenant-noa-demo`
- Firma: `company-demo-insaat`
- Dönem: `period-2026`
- Kullanıcı: `user-main`
- Rol: `accounting`

Ekranda görünen kapsam:

`NOA Demo Tenant / DEMO İNŞAAT / 2026`

Teknik scope anahtarı:

`tenant-noa-demo::company-demo-insaat::period-2026`

## İlk Rol Standardı

Bu aşamada rol modeli bilinçli olarak dar tutuldu:

- `admin`: yönetim ve muhasebe mutasyonlarını yapabilir.
- `accounting`: fatura gibi muhasebe işlem mutasyonlarını yapabilir.
- `viewer`: kayıtları okuyabilir, fakat fatura oluşturma/düzenleme/kesinleştirme/iptal işlemi yapamaz.

`userRole` artık sayfa render'ında, üst bar bağlamında ve server action mutasyonlarında aynı aktif session resolver'dan okunur.

## Tanımlar Modüllerine Etkisi

Şantiye, tedarikçi, taşeron, personel ve kasa/banka kayıtları artık başlangıçta scope metadata'sı ile oluşturulur:

- `tenantId`
- `companyId`
- `periodId`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Bu alanlar liste kolonlarında gösterilmez; iş ekranı eski NOA yoğunluğunu korur. Ancak veri modeli tarafında her satır kapsamlıdır.

## Neden Şimdi?

Veritabanı henüz eklenmeden önce bu sınırı saf domain fonksiyonlarıyla sabitlemek, sonraki Prisma/Postgres veya API route geçişinde davranış değişmesini engeller. Amaç, geçici client state ile gerçek kalıcı veri modeli arasında aynı iş kuralını taşımaktır.

## Teknik Dosyalar

- `src/lib/tenant-scope.ts`: kapsam tipi, varsayılan kapsam, scope key, validasyon ve scoped kayıt yardımcıları.
- `src/lib/session-scope.ts`: opak session id ve repository kaydından tenant/firma/dönem/kullanıcı/rol kapsamı üreten saf resolver.
- `src/lib/session-scope-prisma-repository.ts`: `AppSession` kaydını tenant/company/period/user ilişkileriyle okuyup scope record'a çeviren Prisma adapter.
- `src/lib/session-options.ts`: aktif session kayıtlarını üst bar seçicisinin kullanacağı kompakt seçenek modeline çevirir.
- `src/lib/session-access.ts`: session değiştirme isteğinin aktif kullanıcının access tabanlı izin listesinde olup olmadığını ve session/access kapsam eşleşmesini kontrol eder.
- `src/lib/session-access-service.ts`: aktif kullanıcı için `AppSession` kayıtlarını `AppUserScopeAccess` kayıtlarıyla filtreleyen ortak servis.
- `src/lib/session-switch.ts`: session switch form verisini güvenli session id ve iç redirect path olarak ayrıştırır.
- `src/lib/password-hash.ts`: PBKDF2 parola hash üretimi ve doğrulaması.
- `src/lib/credential-login.ts`: e-posta/şifre giriş formunu ve credential parola doğrulamasını saf şekilde yönetir.
- `src/lib/credential-session-login.ts`: credential doğrulamasını access-backed session seçimiyle birleştirir; varsayılan session erişilebilir değilse ilk erişilebilir session'a düşer.
- `src/lib/credential-prisma-repository.ts`: `AppCredential` kaydını e-posta ile okuyan Prisma adapter.
- `src/lib/credential-seed.ts`: demo kullanıcı credential kayıtlarını idempotent oluşturan seed helper'ı.
- `src/lib/session-seed.ts`: `demo-accounting` ve `demo-viewer` session kayıtlarını idempotent oluşturan seed helper'ı.
- `src/lib/user-scope-access.ts`: kullanıcı-firma/dönem yetki kaydının saf domain tipleri.
- `src/lib/user-scope-access-prisma-repository.ts`: aktif kullanıcı yetkilerini tenant/company/period/user ilişkileriyle okuyan Prisma adapter.
- `src/lib/user-scope-access-seed.ts`: demo firma/dönem yetki kayıtlarını idempotent oluşturan seed helper'ı.
- `src/lib/server-active-scope.ts`: Next.js `cookies()` API'sini okuyup Prisma-backed session resolver'a bağlayan server wrapper.
- `src/app/actions/session-actions.ts`: `noa-session-id` cookie'sini doğrulanmış `AppSession` id değeriyle güncelleyen server action.
- `src/app/giris/page.tsx`: demo `AppSession` kayıtlarını kullanarak giriş yüzeyini açan route.
- `src/components/login-surface.tsx`: gerçek auth provider gelene kadar kullanılan, session seçenekli giriş yüzeyi.
- `src/lib/tenant-scope.test.ts`: kapsam izolasyonu ve audit metadata testleri.
- `src/lib/session-scope.test.ts`: opak session id, DB session kaydı, expired session fallback'i ve savunmalı kopya davranışı testleri.
- `src/lib/session-scope-prisma-repository.test.ts`: Prisma adapter mapping ve include sözleşmesi testleri.
- `src/lib/session-options.test.ts`: shell seçenek etiketi testleri.
- `src/lib/session-access.test.ts`: session değiştirme yetki kontrolü ve access/scope filtreleme testleri.
- `src/lib/session-access-service.test.ts`: session repository ve access repository birleşik filtreleme sözleşmesi testleri.
- `src/lib/session-switch.test.ts`: session switch form parsing ve redirect güvenliği testleri.
- `src/lib/password-hash.test.ts`: PBKDF2 hash ve doğrulama testleri.
- `src/lib/credential-login.test.ts`: e-posta/şifre doğrulama ve genel hata davranışı testleri.
- `src/lib/credential-session-login.test.ts`: credential login sonrası access-backed session seçimi ve erişimsiz kullanıcı hata davranışı testleri.
- `src/lib/credential-prisma-repository.test.ts`: credential repository mapping testleri.
- `src/lib/credential-seed.test.ts`: demo credential seed sözleşmesi testleri.
- `src/lib/session-seed.test.ts`: demo session seed sözleşmesi testleri.
- `src/lib/user-scope-access-prisma-repository.test.ts`: firma/dönem yetki repository mapping, sıralama ve rol normalize testleri.
- `src/lib/user-scope-access-seed.test.ts`: demo access seed sözleşmesi testleri.
- `src/components/app-shell.test.tsx`: üst bar session seçici render testi.
- `src/components/login-surface.test.tsx`: giriş yüzeyi session seçenekleri ve boş durum testi.
- `src/components/entity-list-surface.tsx`: Tanımlar UI başlangıcını scoped satırlardan alır.

## Sonraki Adım

Bu kapsam standardının sonraki mantıklı adımı, `AppSession` tabanlı izin listesini ayrı firma/dönem yetki tablosuna dönüştürmek ve gerçek auth provider entegrasyonuna bağlamaktır.
