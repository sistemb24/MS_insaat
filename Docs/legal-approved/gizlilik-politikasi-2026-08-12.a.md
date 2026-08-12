# Gizlilik Politikası

Belge kimliği: `gizlilik-politikasi`
Sürüm: `2026-08-12.a`
İçerik kabulü: Murat Saygı — platform sahibi ve veri/hukuk karar sahibi
Kabul ve yürürlük tarihi: 12.08.2026
Durum: Production yayın adayı; bağımsız hukuk danışmanı görüşü değildir

## Kapsam

NOA İnşaat Yönetimi, `MS İNŞAAT` ticari adıyla Murat Saygı tarafından işletilen
tenant/firma/dönem kapsamlı B2B inşaat yönetim yazılımıdır. Faaliyet yeri Atakum,
Samsun, Türkiye; iletişim adresi `info@msinsaat.com`dur.

Bu politika platformun gerçek teknik davranışını açıklar. Müşteri tenantların
kendi iş verilerindeki veri sorumluluğu ile platform hesabı, güvenlik ve
operasyon kayıtlarındaki platform sorumluluğu birbirinden ayrıdır.

## İşlenen bilgiler

Kullanılan modüllere göre hesap/e-posta, rol/yetki, oturum, tenant/firma/dönem,
proje, müşteri/tedarikçi, ticari/finansal belge, personel, çalışma/ücret, İSG,
doküman, destek, audit/güvenlik, IP/user-agent ve backup bilgileri işlenebilir.
İSG ve doküman içerikleri özel nitelikli veri içerebilir; bunlar yalnız yetkili
iş akışı, uygun hukuki şart ve ek güvenlik tedbirleriyle işlenmelidir.

Public iletişim formu ve newsletter mevcut sürümde veri kaydetmez. Self-servis
kayıt, public parola sıfırlama teslimatı, pazarlama e-postası/SMS'i, ödeme formu
ve üçüncü taraf reklam/analitik izleyicisi açık değildir.

## Çerezler

Public marketing sayfalarında analitik veya reklam çerezi kullanılmaz. Giriş
gerektiren yüzeylerde yalnız zorunlu oturum çerezleri bulunur:

- `noa-session-id`: tenant oturumu; en fazla 8 saat; HttpOnly, production'da
  Secure ve SameSite=Lax.
- `noa-super-admin-session`: Süper Admin oturumu; en fazla 2 saat; HttpOnly,
  production'da Secure, SameSite=Strict ve `/super-admin` kapsamı.

Yeni analitik, reklam veya tercih çerezi eklenirse politika ve gerektiğinde
tercih/rıza arayüzü veri toplamadan önce güncellenir.

## Kullanım amaçları

Bilgiler hesabı ve erişim kapsamını işletmek, müşteri talimatıyla iş süreçlerini
yürütmek, finans/personel/proje/doküman kayıtlarını saklamak, tenant izolasyonu
ve güvenliği sağlamak, destek vermek, backup/recovery yapmak, yasal
yükümlülükleri yerine getirmek ve hakları korumak için kullanılır. Mevcut ürün,
kişi hakkında hukuki veya benzeri önemli sonuç doğuran otomatik karar/profil
çıkarma yapmaz.

## Sağlayıcılar ve aktarımlar

Teknik sunumda Vercel (`fra1`), Neon (AWS Frankfurt `eu-central-1`), Cloudflare
R2 (EU jurisdiction), Sentry (DE region) ve GitHub Actions kullanılabilir.
Sağlayıcı erişimi; amaç, rol, alt işleyen ve veri kategorisiyle sınırlandırılır.
Yurt dışı erişim veya aktarım için Kanunun 9'uncu maddesindeki geçerli mekanizma
ve sözleşme kanıtı gerçek kullanıcı trafiği öncesinde tamamlanır. Bölge seçimi
tek başına verinin yalnız o ülkede kaldığı garantisi değildir.

Open Banking, Arvento, GİB/e-Fatura, ödeme ve SMTP/SMS sağlayıcıları gerçek
production bağlantısı açılmadıkça aktif veri alıcısı değildir.

## Saklama, güvenlik ve hesap kapanışı

Veriler `2026-08-09.a` karar kataloğundaki kategori bazlı sürelerle tutulur.
Günlük backuplar 30 gün; finans/ticari, personel/İSG ve audit kayıtları ilgili
yasal süreler boyunca saklanabilir. Hesap kapanışı önce erişimin dondurulmasını,
export ve legal hold kontrolünü gerektirebilir. Şartları oluşan veri silinir, yok
edilir veya anonimleştirilir.

Tenant/firma/dönem izolasyonu, rol tabanlı erişim, HttpOnly/Secure oturum,
parola hash'i, private storage, redacted monitoring, audit, şifreli secret
yüzeyleri ve backup/recovery kontrolleri uygulanır. Bunlar riski azaltır; mutlak
güvenlik garantisi oluşturmaz.

## Haklar ve iletişim

KVKK kapsamındaki talepler, NOA sisteminde kayıtlı e-posta adresinden veya
güvenli elektronik/mobil imzalı olarak `info@msinsaat.com` adresine
iletilebilir. Tenantın kontrol ettiği personel/müşteri verilerinde ilk muhatap,
müşteri sözleşmesindeki taraf rolüne göre ilgili tenant olabilir.

Önemli politika değişiklikleri yeni sürüm ve yürürlük tarihiyle yayımlanır. Bu
metnin önceki taslağı `2026-08-11.a-draft`tır.
