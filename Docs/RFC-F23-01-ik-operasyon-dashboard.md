# RFC-F23-01 — İK Operasyon Dashboard

> Durum: **Tamamlandı — Dilim 1–5**
> Tarih: 30.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-moduller-genisletme-plani.md` Bölüm 13.7,
> 17.2 ve 20.2; tamamlanan Faz 14, 17, 20, 21 ve 22 veri sözleşmeleri

## 1. Amaç

NOA'nın mevcut `/personel` çalışma alanında dağınık duran personel kartı,
izin, avans, transfer, İSG eğitimi ve puantaj verilerini; yeni bir ana model
veya ikinci bir İK uygulaması oluşturmadan, tenant/firma/dönem scoped ve
salt-okunur bir operasyon dashboard'unda birleştirmek.

Dashboard yasal İK bordrosu, SGK bildirimi, izin hak ediş motoru veya çalışan
performans puanı değildir. Mevcut kayıtların güncel operasyon durumunu
özetler ve kullanıcıyı kaynak-doğru iş akışına yönlendirir.

## 2. Mevcut altyapıyla uyum

| İhtiyaç | Faz 23 kaynağı | Sınır |
|---|---|---|
| Personel mevcudu | `EntityRecord`, `slug=personel` | Yeni `Employee` ana modeli veya backfill yok. |
| Şantiye dağılımı | Personel kartındaki `data.site` | Aktif personel kartları; atanmamış ayrı kovadır. |
| Bugün izinli / yaklaşan izin | `EmployeeLeaveRequest` | Yalnız `APPROVED`; yasal hak ediş hesabı yapılmaz. |
| Bekleyen İK işleri | İzin, avans ve transfer durumları | Kaynak kaydı değiştirmez; yalnız deep-link verir. |
| İSG eğitim görünümü | `SafetyTraining` ve attendance sayısı | Hedef kitle modeli olmadığı için “eksik kişi” uydurulmaz. |
| Puantaj görünümü | `Timesheet` | Yalnız mevcut taslaklar; hiç açılmamış puantaj eksik sayılmaz. |
| UI | Mevcut `/personel` çalışma alanı | İkinci AppShell veya ayrı İK uygulaması yok. |

## 3. Önerilen varsayımlar

1. Faz 23 yalnız **salt-okunur İK Operasyon Dashboard** dikeyidir. Personel
   kartı, izin, avans, transfer, eğitim veya puantaj mutation'ı eklemez;
   mevcut kaynak iş akışlarını yeniden üretmez.
2. Tüm okumalar `tenantId + companyId + periodId` kapsamında yapılır.
   `admin`, `accounting` ve `viewer` aynı scoped operasyon özetini görebilir;
   kapsam dışı kayıt hiçbir sayaç, dağılım veya listede yer alamaz.
3. Yeni Prisma modeli, migration veya backfill yapılmaz. Dashboard;
   `EntityRecord(personel)`, `EmployeeLeaveRequest`,
   `EmployeeAdvanceRequest`, `EmployeeTransfer`, `SafetyTraining`,
   `SafetyTrainingAttendance` ve `Timesheet` verilerini federatif,
   salt-okunur repository üzerinden birleştirir.
4. Personel durum özeti mevcut kart sözleşmesine sadık kalır:
   `status=Aktif` aktif kart, `status=Pasif` pasif karttır. “Bugün izinli”,
   aktif kartı bulunan ve bugünü kapsayan `APPROVED` izin kaydıyla ayrıca
   türetilir. Pasif kart “işten ayrılmış” yasal kaydı olarak sunulmaz.
5. Şantiye dağılımı yalnız aktif personel kartındaki normalize edilmiş
   `data.site` değerinden üretilir. Boş değerler **Şantiye atanmamış**
   kovasında gösterilir; ada bakarak yeni şantiye veya kod eşleştirmesi
   oluşturulmaz.
6. “Bugün” ve yaklaşan 30 günlük pencere aktif şirket bağlamında
   `Europe/Istanbul` takvim günüdür. Yaklaşan izinlerde yalnız
   `APPROVED` ve başlangıcı `[bugün, bugün+30 gün]` aralığında olan kayıtlar
   gösterilir; operasyon notu dashboard'a taşınmaz.
7. Bekleyen iş kuyruğu mevcut durumları değiştirmeden gruplar:
   izin `SUBMITTED`; avans `SUBMITTED`, `MANAGER_APPROVED`,
   `FINANCE_APPROVED` ve `PAID`; transfer `SUBMITTED`. Avansta tutar veya
   serbest not yerine yalnız güvenli kayıt/personel/durum/tarih özeti
   gösterilir.
8. İSG eğitim kartı `PLANNED` eğitimleri ve 30 gün içindeki
   `trainingOn/nextTrainingOn` tarihlerini; tamamlanan eğitimlerde yalnız
   attendance sayısını gösterir. Eğitim hedef kitlesi modeli bulunmadığından
   katılım kaydı olmayan her aktif personel “eğitimi eksik” sayılmaz; bu
   genişleme ayrı ürün kararıdır.
9. Puantaj kartı yalnız mevcut `Timesheet.status=Taslak` kayıtlarını
   tamamlanmamış olarak gösterir. Bir şantiye veya ay için hiç puantaj
   bulunmamasından otomatik eksiklik sonucu çıkarılmaz; dönem zorunluluğu
   modeli eklenmeden sahte alarm üretilmez.
10. UI `/personel` içinde üst seviye KPI'lar, şantiye dağılımı, bekleyen iş
    kuyruğu, yaklaşan izin/eğitim ve taslak puantaj bölümlerini sağlar.
    Kaynak kayıtlar mevcut `?leave=`, `?advance=` ve `?transfer=` deep-link
    sözleşmelerine; eğitim `/isg`, puantaj `/puantaj` rotasına gider.
    Dashboard mutation kontrolü içermez; boş/yükleniyor/hata, 390 px mobil,
    açık/koyu tema ve print standartları korunur.

## 4. Read-model sözleşmesi

Önerilen tek DTO aşağıdaki güvenli kümeleri taşır:

- `asOfDate`, `windowEndDate`
- `personnel`: toplam, aktif, bugün izinli, pasif kart
- `siteDistribution[]`: şantiye adı, aktif personel sayısı, toplam içindeki oran
- `workQueue`: bekleyen izin, yönetici/finans/ödeme bekleyen avans, bekleyen transfer
- `upcomingLeaves[]`: kayıt/personel kimliği, tür, başlangıç-bitiş
- `upcomingTrainings[]`: eğitim kimliği/adı/türü/tarih/durum, attendance sayısı
- `draftTimesheets[]`: puantaj kimliği/no, ay/yıl, şantiye, satır sayısı

Serbest operasyon notları, avans tutarı, sağlık ayrıntısı, request key, SGK
bilgisi, telefon, adres veya banka bilgisi DTO'ya girmez.

Repository her kaynak sorgusunu aynı scope filtresiyle sınırlar. Bir kaynağın
boş olması tüm dashboard'u hata durumuna düşürmez; teknik sorgu hatası ise
kısmi ve yanıltıcı sayaç göstermek yerine kontrollü genel hata üretir.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain ve Read-model Çekirdeği | DTO, tarih penceresi, durum grupları, şantiye normalizasyonu ve oran kararları | Saf testler; şema/repository/UI/veri değişmez. |
| 2 — Federatif Repository | Yedi mevcut kaynaktan scoped, sınırlı ve paralel okuma | Migration/backfill yok; yanlış scope sıfır görünürlük. |
| 3 — Server Action ve Erişim | Oturum/scope guard'lı tek salt-okunur action | Okuma audit üretmez; mutation/revalidation yok. |
| 4 — İK Dashboard UI ve Deep-link | KPI, dağılım, kuyruk, yaklaşan işler ve kaynak yönlendirmeleri | Rol DOM eşitliği, mobil/tema/print ve hata/boş durum. |
| 5 — İzole Gerçek Veri ve Kapanış | Ayrılmış scope'ta kaynaklar arası kabul ve tam kapılar | Mevcut Faz 14/17/20/21/22 verileri ve iş akışları korunur. |

## 6. Kabul kriterleri

- Yanlış tenant/firma/dönem kaydı hiçbir aggregate veya listede görünmez.
- Aynı personel, birden fazla veri kaynağı nedeniyle toplam personel
  sayısında çoğalmaz.
- Bugün izinli sayısı yalnız aktif kart + bugünü kapsayan onaylı izin
  kesişiminden oluşur.
- Şantiye dağılımı aktif personel toplamına eşittir; boş `site` kaybolmaz.
- İzin, avans ve transfer bekleyen sayaçları mevcut domain durumlarıyla
  birebir eşleşir.
- Dashboard serbest not, tutar, sağlık, iletişim, banka veya request key
  göstermez.
- Eğitim hedef kitlesi ve hiç açılmamış puantaj için eksik alarm uydurulmaz.
- Kaynak deep-link'leri doğru kayıt/rota açar ve geri dönüşte dashboard
  filtreleri bozulmaz.
- Viewer dahil roller dashboard üzerinden mutation yapamaz; DOM'da dashboard
  mutation kontrolü bulunmaz.
- Dashboard okuması audit, bildirim veya başka domain hareketi üretmez.
- Liste boyutları kontrollü üst sınıra sahiptir; sayaçlar tam scoped kümeden
  hesaplanır.
- UI 390 px mobilde global taşma olmadan, açık/koyu tema ve print-safe çalışır.
- Tam kalite kapıları `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 7. Kapsam dışı

Yeni personel ana modeli, SGK/e-Devlet, işten ayrılış ve özlük dosyası,
disiplin kaydı, performans puanı, organizasyon şeması/yönetici hiyerarşisi,
çalışan self-service, yasal izin hak ediş motoru, eğitim hedef kitlesi/
sertifika matrisi, puantaj zorunluluk takvimi, otomatik bildirim, e-posta/SMS,
Excel export, yeni API endpoint'i ve dış İK sağlayıcısı bu RFC'nin dışındadır.

Faz 13 Open Banking sağlayıcı/ürün ve resmi sandbox bilgisi hazır olana kadar
kuyruk sonunda kalır. “Davet Et & Kazan” gerçek tenant kayıt ve ödül/indirim
politikası tanımlanmadan şirket içi kullanıcı davetiyle birleştirilmez.

## 8. Onay kapısı

Bölüm 3'teki on varsayım ve Faz 23 dilimlerinin tekrar onay alınmadan
kesintisiz tamamlanması kullanıcı tarafından 30.07.2026 tarihinde onaylandı.

## 9. Tamamlanma kaydı

Dilim 1–5 tamamlandı. Saf read-model; yedi kaynaklı scoped federatif repository;
oturum/scope guard'lı salt-okunur server action; responsive, tema ve print-safe
`/personel` dashboard'u; kaynak-doğru deep-link'ler ve izole gerçek veri kabulü
uygulandı. Yeni şema/migration/backfill veya mutation eklenmedi.

İzole `company-f23-kabul-20260730` / `period-f23-kabul-20260730`
snapshot'ı iki okumada değişmedi; yabancı scope boş, audit `0 → 0` kaldı.
Canlı UI'da gerçek KPI/listeler, 390 px taşmasız görünüm, açık/koyu tema ve
izin/avans/transfer ayrıntı deep-link'leri doğrulandı. Tam kapılar 284 dosya/
1.656 test, type-check, Prisma validate, güncel 54 migration, lint, 77 sayfalık
production build ve `git diff --check` ile geçti. Ayrıntı
`Docs/UI-baseline/Faz23-gercek-veri-kapanis-20260730.md` içindedir.

Faz 23 tamamlandı.