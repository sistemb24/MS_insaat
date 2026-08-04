# Faz 35 Dilim 8 — İzole Gerçek Veri ve Kapanış

Tarih: 04.08.2026
Durum: Yazılım kapsamı tamamlandı; external production blocker'ları açık

## İzolasyon kabulü

- Gerçek PostgreSQL üzerinde geçici ikinci tenant, firma, dönem, kullanıcı ve
  scope oluşturuldu.
- Mevcut tenant kullanıcısının opak auth session'ı ile yabancı tenant scope'una
  geçiş denendi; repository geçişi reddetti ve mevcut auth scope'u değişmedi.
- Kabul auth kaydı ve geçici tenant ilişkileri çıktı üretilmeden önce silindi;
  `finally` temizliği hata durumunda da idempotent güvence sağlar.
- Deep-link/action negatif matrisi cookie yok, tahmin edilebilir scope ID,
  yabancı auth scope, Süper Admin protected `returnTo`, yabancı entity/document/
  ticket/transfer erişimi ve mutation yapılmaması testlerini yeniden geçti.

## Browser kabulü

- Public: `/landing` doğrulanmış başlık ve truthful içerikle açıldı.
- Tenant: `/` oturumsuz durumda `/giris` sınırına kapandı; gerçek geliştirme DB
  kullanıcısı opak DB session ile giriş yaptı ve `DEMO İNŞAAT / 2026` kapsamı
  dashboard'da doğrulandı.
- Süper Admin: `/super-admin/tenantlar` oturumsuz deep-link'i exact
  `/super-admin/giris?returnTo=%2Fsuper-admin%2Ftenantlar` yönlendirmesiyle
  kapandı.
- Browser console uyarı/hatası yoktu; tab ve geliştirme sunucusu kapatıldı.

## Secret ve kalite kapıları

| Kapı | Sonuç |
|---|---|
| `npm test` | PASS — 352 dosya, 1.869 test |
| `npm run type-check` | PASS |
| `npm run db:validate` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — Next.js 16.2.9, 104 static/page-data üretimi; health/readiness route'ları dahil |
| `npm run security:secret-scan` | PASS — 1.336 metin dosyası, 0 yüksek güvenli bulgu |
| `git diff --check` | PASS — yalnız mevcut LF/CRLF bilgilendirmeleri |

Bu kanıt setinde açık P0/P1 yazılım kusuru kalmadı. Bu ifade gerçek provider,
hosting, backup veya hukuki onayın tamamlandığı anlamına gelmez.

## Açık external blocker'lar

1. Hosting, TLS ve secret store provider/sorumlusu atanmadı.
2. PostgreSQL production backup/restore sorumlusu ve staging restore kanıtı yok.
3. Object storage ve DB ile eşzamanlı binary backup çözümü yok; adapter local.
4. Monitoring/alerting ve incident sorumlusu atanmadı.
5. RPO, RTO, SLA ve destek saatleri onaylanmadı.
6. Retention, KVKK, hesap kapanışı ve resmi şirket/yasal yayın girdileri onaysız.
7. GitHub CI workflow'u repo içinde doğrulandı ancak uzak runner'da çalıştırılmadı.

Bu blocker'lar kapanmadan ürün “production-ready”, “yedekli”, “izlenen” veya
indekslenmeye hazır sayılmaz. Yayın kapısı fail-closed kalır.

## Yetki ve çalışma ağacı

Commit, push, PR veya deployment yapılmadı. Dirty çalışma ağacındaki kullanıcı
değişiklikleri, untracked dosyalar ve daha önce silinmiş görünen HTML dosyaları
korundu; reset, checkout, restore veya clean çalıştırılmadı.
