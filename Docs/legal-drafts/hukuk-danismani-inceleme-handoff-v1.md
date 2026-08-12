# Hukuk Danışmanı İnceleme Handoff'u v1

Handoff kimliği: `legal-review-handoff-2026-08-11.a`
Tarih: 11.08.2026
Durum: Kullanıcı/sahip exact kararları tamamladı; bağımsız danışman onayı iddia edilmez

Teslim kanıtı:

- Alıcı: `sistemb24@gmail.com`
- Konu: `NOA İnşaat Yönetimi — KVKK, Gizlilik ve Kullanım Koşulları hukuk incelemesi`
- Gmail mesaj/thread kimliği: `19ff13ba7beee88e`
- Ek: `NOA-legal-review-bundle-20260811.zip`; 21.300 byte
- Bundle SHA-256: `38C1B1A4C92CB01970BEE51ABBE260818C433E1BA310A13F1F7989D4E2E24CFF`
- Gönderim sonrası okuma: alıcı, konu ve ZIP eki doğrulandı
- İlk danışman yanıtı: mesaj `19ff141dbe01ce81`; yalnız “onaylıyorum”
- Kabul değerlendirmesi: exact belge kararları, nihai tam metin, sürüm,
  onaylayan rolü, onay/yürürlük tarihleri ve işaretli kararlar eksik
- Netleştirme mesajı: `19ff1426c87924f2`; aynı thread'de exact yanıt formatı
  yeniden istendi
- Süreç kararı: Kullanıcı 12.08.2026 tarihinde cevapları tamamlanmış kabul etme
  veya asistanın düzenlemesi yetkisini verdi
- Sahip kabul kaydı:
  `Docs/operasyon/production-yasal-yayin-sahip-kabul-karari-20260812.md`
- Kabul edilen içerikler: `Docs/legal-approved/` altında `2026-08-12.a`

## İnceleme amacı

NOA İnşaat Yönetimi için hazırlanan üç bağlayıcı olmayan taslağın gerçek veri
işleme faaliyetleri, taraf rolleri, provider aktarımları ve ticari modelle
uyumlu nihai metinlere dönüştürülmesi beklenmektedir:

1. `Docs/legal-drafts/kvkk-aydinlatma-metni-hukuk-inceleme-taslagi-v1.md`
2. `Docs/legal-drafts/gizlilik-politikasi-hukuk-inceleme-taslagi-v1.md`
3. `Docs/legal-drafts/kullanim-kosullari-hukuk-inceleme-taslagi-v1.md`

Teknik ve hukuki girdi matrisi:

- `Docs/operasyon/production-yasal-yayin-icerik-onay-paketi-v1.md`

Taslakların tamamı `2026-08-11.a-draft` sürümündedir. İnceleme tamamlanmadan
production route'larına kopyalanamaz, kullanıcı kabulüne sunulamaz ve hukukça
onaylı içerik olarak adlandırılamaz.

## Danışmandan beklenen kararlar

### A. Kurumsal kimlik ve başvuru

- [ ] Tam hukuki unvan ve gerçek kişi/şahıs işletmesi/tüzel kişi türü
- [ ] MERSİS ve/veya VKN'nin yayımlanma kararı
- [ ] Tam açık posta/tebligat adresi
- [ ] Veri sorumlusu ile varsa temsilcinin exact kimliği
- [ ] KEP adresi veya desteklenecek diğer KVKK başvuru yöntemleri
- [ ] `info@msinsaat.com` adresinin hangi koşulda geçerli başvuru kanalı olduğu
- [ ] Kimlik doğrulama, vekâlet, güvenli cevap ve en geç 30 günlük yanıt prosedürü

### B. Veri işleme ve taraf rolleri

- [ ] Platform hesabı, güvenlik, billing ve audit için veri sorumlusu rolü
- [ ] Tenantın personel/müşteri/tedarikçi/proje verileri için veri işleyen rolü
- [ ] Ortak veya bağımsız veri sorumluluğu doğuran istisnalar
- [ ] İlgili kişi grubu + veri kategorisi + amaç + toplama yöntemi eşlemesi
- [ ] Her faaliyet için Kanunun 5 veya 6'ncı maddesindeki exact hukuki sebep
- [ ] İSG/iş kazası/doküman içeriğindeki özel nitelikli veri sınırı ve ek tedbirler
- [ ] Üçüncü kişiden elde edilen veride aydınlatma zamanı ve sorumlusu

### C. Provider ve yurt dışına aktarım

Aşağıdaki sağlayıcıların her biri için rol, ülke, veri kategorisi, alt işleyen,
aktarım amacı ve 6698 sayılı Kanunun 9'uncu maddesindeki exact mekanizma
belgelendirilmelidir:

- [ ] Vercel — runtime/hosting, `fra1`
- [ ] Neon — PostgreSQL, AWS Frankfurt `eu-central-1`
- [ ] Cloudflare R2 — private runtime ve backup storage, EU jurisdiction
- [ ] Sentry — redacted monitoring/incident, DE region
- [ ] GitHub Actions — CI, yetkili backup/recovery ve alarm workflow'ları

Standart sözleşme kullanılacaksa doğru taraf tipi, imza tarihi, ekler, alt
işleyenler ve Kuruma beş iş günü içinde bildirim kanıtı ayrıca doğrulanmalıdır.
Yalnız bölge seçilmiş olması uygun aktarım güvencesi kabul edilmemelidir.

### D. Saklama, imha ve hesap kapanışı

- [ ] `2026-08-09.a` kategori/süre kararlarının hukuki dayanak kontrolü
- [ ] Finans, ticari, personel, İSG/sağlık, audit ve destek sürelerinin kabulü
- [ ] Legal hold'un kapsamı, yetkilisi, gözden geçirme ve kaldırma prosedürü
- [ ] İlgili kişi talebi, üçüncü kişiye bildirim ve backup silme-tekrar davranışı
- [ ] Export, erişim dondurma ve fiziksel imha sırasının müşteri sözleşmesi karşılığı

### E. Kullanım koşulları ticari kararları

- [ ] Yalnız B2B/tacir kapsamı veya tüketici olasılığı
- [ ] Sözleşmenin kurulma şekli ve belge önceliği
- [ ] Plan/ücret/vergi/fatura/ödeme/gecikme hükümleri
- [ ] Süre, yenileme, fiyat değişikliği, iptal ve iade
- [ ] Destek/SLA, bakım, service credit ve provider kesintileri
- [ ] Müşteri verisi lisansı, export ve hesap kapanışı
- [ ] Askıya alma, fesih ve giderim süresi
- [ ] Fikrî mülkiyet ve geri bildirim/anonim istatistik kullanımı
- [ ] Garanti, sorumluluk tavanı, istisnalar ve emredici hukuk
- [ ] Uygulanacak hukuk, yetkili mahkeme ve uyuşmazlık yöntemi
- [ ] Değişiklik bildirimi, itiraz ve yürürlük süreci

## Mevcut ürün gerçekliği — değiştirilemez inceleme girdileri

Nihai metinler aşağıdaki kapalı kabiliyetleri çalışır veya taahhüt edilmiş gibi
gösteremez:

- public iletişim formu mesaj veya kişisel veri kaydetmez;
- newsletter aboneliği ve self-servis public kayıt kapalıdır;
- gerçek public parola sıfırlama/e-posta teslimatı kapalıdır;
- Open Banking, Arvento, GİB/e-Fatura, ödeme ve SMTP/SMS provider'ları canlı
  production hizmeti değildir;
- public analitik/reklam izleyicisi bulunmaz;
- mevcut çerezler yalnız tenant ve Süper Admin zorunlu oturumlarıdır;
- indexing, sitemap yayını ve kullanıcı trafiği ayrı teknik onaya tabidir.

## Danışman yanıt formatı

Danışmanın her belge için aşağıdaki exact formatta yanıt vermesi önerilir:

```text
Belge kimliği: kvkk-aydinlatma | gizlilik-politikasi | kullanim-kosullari
İncelenen taslak: 2026-08-11.a-draft
Karar: APPROVED | CHANGES_REQUIRED | REJECTED
Nihai sürüm: YYYY-MM-DD.x
Onaylayan: Ad Soyad / rol / kuruluş
Onay tarihi: YYYY-MM-DD
Yürürlük tarihi: YYYY-MM-DD
Onaylı resmi iletişim ve başvuru kanalı: ...
Değişiklik listesi: ...
Nihai tam metin: ...
```

`APPROVED` kararı yalnız nihai tam metin, sürüm, onaylayan, onay ve yürürlük
tarihi birlikte sağlanırsa teknik uygulama kapısını açar. Sözlü onay, yalnız
kimlik girdisi veya kısmi paragraf kabulü yeterli değildir.

## Hazır e-posta/mesaj gövdesi

Konu: `NOA İnşaat Yönetimi — KVKK, Gizlilik ve Kullanım Koşulları hukuk incelemesi`

```text
Merhaba,

NOA İnşaat Yönetimi için hazırlanan bağlayıcı olmayan KVKK Aydınlatma Metni,
Gizlilik Politikası ve Kullanım Koşulları taslaklarını incelemenize sunuyoruz.

Lütfen ekli handoff içindeki A–E karar listelerini, özellikle tam taraf kimliği,
tenant–platform veri rolleri, faaliyet bazlı hukuki sebepler, özel nitelikli
veriler, provider/yurt dışı aktarım mekanizmaları, KVKK başvuru kanalı ve ticari
sözleşme hükümleri bakımından değerlendiriniz.

Her belge için APPROVED / CHANGES_REQUIRED / REJECTED kararıyla birlikte nihai
tam metni, sürümü, onaylayan kişiyi, onay ve yürürlük tarihini iletmenizi rica
ederiz. Taslaklar bu bilgiler tamamlanmadan yayımlanmayacaktır.

Teşekkürler.
```

Bu hazır gövde 11.08.2026 tarihinde yukarıdaki Gmail teslim kanıtıyla
gönderilmiştir; başka alıcı, CC veya BCC eklenmemiştir.

## Teknik kabul sonrası sıra

1. Danışman yanıtı exact formatta kaydedilir ve üç nihai gövdenin checksum'ı
   alınır.
2. Onaylı metinler ayrı kod/PR diliminde sürümlü, tipli statik legal document
   kaynağına aktarılır.
3. Üç route taslak bileşeninden onaylı içeriğe geçirilir; sayfa bazlı `noindex`
   korunur.
4. Hedefli render/metadata testleri ve tam repository kalite kapıları çalışır.
5. Staging görsel/içerik kabulü yapılır.
6. Production legal içerik yayını ayrı açık onayla yapılır.
7. Global indexing ve kullanıcı trafiği bundan sonra yine ayrı açık onay ister.

## Fail-closed karar

Bağımsız danışman exact yanıtı alınmamıştır ve alınmış gibi gösterilemez.
Kullanıcı/platform sahibi risk ayrımını kabul ederek üç metni teknik yayın adayı
olarak tamamlamıştır. Sıradaki kapı onaylı içeriklerin ayrı kod/PR diliminde
legal route'lara aktarılmasıdır; deployment, indexing ve trafik buna dahil
değildir.
