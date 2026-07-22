# NOA İnşaat — HTML Şablon / Route / Surface Eşleştirme Matrisi

> Faz: 1 envanteri + Faz 9 nihai kabul
> Tarih: 18.07.2026
> Son güncelleme: 22.07.2026
> Durum: **Nihai route matrisi tamamlandı**
> Kapsam: `stitch_HTML_sablonlar/` altındaki 76 HTML dosyasının tamamı

## 1. Amaç

Bu belge her şablonun projede nereye, hangi sınırla ve hangi işlev sınıfıyla uygulanacağını belirler. Özgün HTML dosyaları çalışma zamanı çıktısı değildir; görsel kompozisyon, bilgi mimarisi ve UX desen kaynağıdır.

Sınıflar:

- **V1:** Yalnız görsel düzen ve tasarım deseni.
- **V2:** Mevcut veriyle uygulanabilen UX iyileştirmesi.
- **F1:** Projede domain/action/model desteği bulunan işlev.
- **F2:** Yeni kalıcı veri veya iş kuralı gerektiren, ayrı mini-RFC ve onay isteyen aday.

Kararlar:

- **Ana:** İlgili yüzeyin temel görsel referansı.
- **Birleştir:** Seçili bölümleri canonical sayfaya alınır.
- **Alt görünüm:** Modal, drawer, sekme veya detay paneli olarak kullanılır.
- **F2 beklet:** Görsel fikir korunur; ayrı onay olmadan işlev açılmaz.

## 2. Envanter Özeti

| Aile | Dosya | Ana hedef |
|---|---:|---|
| NOA İnşaat | 50 | Uygulama kabuğu ve mevcut modül yüzeyleri |
| Hakediş Pro | 26 | `/hakedis` içindeki inşaat hakediş çalışma alanı |
| Toplam | 76 | 22 navigasyon route'u + kök Dashboard + alt görünüm ve akışlar |

Ortak teknik bulgular:

- 76/76 dosya aynı renk, tipografi ve spacing token değerlerini taşıyor.
- 76/76 dosya Tailwind CDN kullanıyor; uygulamaya taşınmayacak.
- 72 dosyada fixed sidebar izi, 53 dosyada sticky header ve 44 dosyada body `overflow-hidden` var; bunlar canonical davranış kabul edilmeyecek.
- 50 dosyada dark utility var; light tema Faz 2–8 boyunca canonical, dark tema Faz 9 kapsamındadır.
- 932 buton, 492 input ve yalnız 7 gerçek form var; görsel kontroller gerçek işlev kanıtı değildir.
- 743 bağlantının tamamı `href="#"`; route hedefleri yalnız proje navigasyonundan alınır.
- Yalnız 4 dosyada `aria-label`, 1 dosyada `role="dialog"`, 0 dosyada reduced-motion ve 0 dosyada print utility bulunuyor.
- 101 dış görsel hotlink'i ve bir Chart.js CDN kullanımı var; hiçbiri doğrudan taşınmayacak.

## 3. NOA İnşaat Şablonları — 50 Dosya

| # | Şablon | Hedef route | Hedef surface | Sınıf | Karar ve sınır |
|---:|---|---|---|---|---|
| 1 | `noa_i_n_aat_abonelik_ve_paketler.html` | `/abonelik` | `SubscriptionSurface` | V1, V2, F1 | Ana; mevcut paket, yenileme, add-on ve ödeme geçmişine bağlanır. Sahte plan/ödeme üretmez. |
| 2 | `noa_i_n_aat_antiye_finans_analiz_panosu.html` | `/santiyeler` | `SiteManagementSurface` | V1, V2, F1 | Alt görünüm; mevcut fatura, gider, hakediş ve hareket read-model'lerinden türetilir. |
| 3 | `noa_i_n_aat_antiyeler.html` | `/santiyeler` | `EntityListSurface`, `SiteManagementSurface` | V1, V2, F1 | Ana; şantiye kartı/listesi ve finans özeti birlikte standardize edilir. |
| 4 | `noa_i_n_aat_api_anahtar_olu_turma.html` | `/api-yonetimi` | `ApiKeyManagementSurface` | V1, V2, F1 | Alt görünüm; mevcut create/reveal-once sözleşmesine drawer/modal olarak bağlanır. |
| 5 | `noa_i_n_aat_api_y_netimi.html` | `/api-yonetimi` | `ApiKeyManagementSurface` | V1, V2, F1 | Ana; mevcut anahtar, scope, revoke ve webhook endpoint yönetimini korur. Yeni endpoint açmaz. |
| 6 | `noa_i_n_aat_ara_bak_m_ve_servis_takvimi.html` | `/araclar` | `VehicleFleetSurface` | V1, V2, F1 | Alt görünüm; mevcut `maintenanceDueDate`, muayene ve sigorta tarihleriyle takvim üretir. |
| 7 | `noa_i_n_aat_ara_filo_takip_operasyon.html` | `/araclar` | `VehicleFleetSurface` | V1, V2, F1 | Ana; aktif/pasif araç, uyarı ve sandbox görünümünü korur. Canlı GPS varsaymaz. |
| 8 | `noa_i_n_aat_ara_ve_filo_y_netimi.html` | `/araclar` | `VehicleFleetSurface` | V1, V2, F1 | Birleştir; kolon, filtre ve araç kartı desenleri Türkçeleştirilir. |
| 9 | `noa_i_n_aat_ayarlar.html` | `/ayarlar` | `SettingsSurface` | V1, V2, F1 | Ana shell-içi ayarlar bilgi mimarisi; mevcut firma, kullanıcı, rol, ledger ve entegrasyon sekmeleri korunur. |
| 10 | `noa_i_n_aat_banka_entegrasyonu_ayarlar.html` | `/ayarlar` | `SettingsSurface` | V1, V2, F1 | Alt görünüm; mevcut sandbox connection ve bank overview'e bağlanır. Gerçek Open Banking açmaz. |
| 11 | `noa_i_n_aat_banka_hareketleri_manuel_e_le_tirme.html` | `/ayarlar` | `SettingsSurface` | V1, V2, F1 | Alt görünüm; mevcut manual match candidate/suggestion/action altyapısını yeniden düzenler. |
| 12 | `noa_i_n_aat_banka_hareketleri_operasyon.html` | `/ayarlar` | `SettingsSurface` | V1, V2, F1 | Birleştir; pending/matched/ignored, parçalı hareket ve recovery görünümünü korur. |
| 13 | `noa_i_n_aat_bildirim_ayarlar.html` | `/bildirimler` | `NotificationCenterSurface` | V1, V2, F1 | Alt görünüm; mevcut `NotificationPreference` kayıtlarına bağlanır. |
| 14 | `noa_i_n_aat_bildirimler.html` | `/bildirimler` | `NotificationCenterSurface` | V1, V2, F1 | Ana; kategori, okunmamış sayaç, okundu işaretleme ve ilgili kayda git davranışı. |
| 15 | `noa_i_n_aat_d_k_man_merkezi_dosya_y_kleme.html` | `/dokuman-merkezi` | `DocumentCenterSurface` | V1, V2, F1 | Alt görünüm; erişilebilir upload drawer/modal, mevcut dosya action'ına bağlanır. |
| 16 | `noa_i_n_aat_d_k_man_merkezi_geni_letilmi.html` | `/dokuman-merkezi` | `DocumentCenterSurface` | V1, V2, F1 | Ana; klasör ağacı, liste/grid, çöp ve detay paneli için canonical içerik düzeni. |
| 17 | `noa_i_n_aat_d_k_man_merkezi.html` | `/dokuman-merkezi` | `DocumentCenterSurface` | V1, V2, F1 | Birleştir; toolbar, dosya kartı ve klasör görselleri alınır. |
| 18 | `noa_i_n_aat_dashboard.html` | `/` | `DashboardSurface` | V1, V2, F1 | AppShell ve Dashboard için ana NOA referansı. Sahte trend/aktivite kullanılmaz. |
| 19 | `noa_i_n_aat_denetim_g_nl.html` | `/ayarlar` | `SettingsSurface` | V1, V2, F1 | Alt görünüm; mevcut `AuditLog` read-model'iyle filtre ve detay paneli. Yeni model yok. |
| 20 | `noa_i_n_aat_e_fatura_y_netimi.html` | `/e-fatura-yonetimi` | `EFaturaSurface` | V1, V2, F1 | Ana görsel referans; mevcut durum/audit görünümü korunur, provider veya yeni webhook açılmaz. |
| 21 | `noa_i_n_aat_ek_y_netimi.html` | `/cek` | `ChequeSurface` | V1, V2, F1 | Ana; çek listesi, tahsilat ve ledger görünürlüğü mevcut guard'larla çalışır. |
| 22 | `noa_i_n_aat_faturalar_ve_i_rsaliyeler.html` | `/faturalar` | `InvoiceManagementSurface`, purchase/sales/delivery surfaces | V1, V2, F1 | Ana; alış/satış/irsaliye sekmeleri, kesinleştirme, ödeme/tahsilat ve ters kayıt korunur. |
| 23 | `noa_i_n_aat_firmalar_dashboard.html` | `/` | `DashboardSurface` | V1, V2, F1 | Alt görünüm; mevcut müşteri/tedarikçi/taşeron dönem filtresi ve firma özetlerine bağlanır. |
| 24 | `noa_i_n_aat_gider_y_netimi.html` | `/giderler` | `ExpenseSurface` | V1, V2, F1 | Ana liste/analiz kompozisyonu; mevcut gider ve hesap lookup verisi. |
| 25 | `noa_i_n_aat_giderler.html` | `/giderler` | `ExpenseSurface` | V1, V2, F1 | Birleştir; gerçek form semantiği ve mevcut create action ile kayıt paneli. |
| 26 | `noa_i_n_aat_hakedi_detay_ta_eron.html` | `/hakedis` | `ProgressPaymentSurface` | V1, V2, F1 | Alt görünüm; taşeron hakediş detay, ödeme/tahsilat, audit ve ledger bilgisi. |
| 27 | `noa_i_n_aat_hakedi_y_netimi.html` | `/hakedis` | `ProgressPaymentSurface` | V1, V2, F1 | Ana NOA hakediş liste/özet görünümü. İnşaat hakediş workspace'iyle karıştırılmaz. |
| 28 | `noa_i_n_aat_i_hale_analiz_panosu.html` | `/ihale-yonetimi` | `TenderManagementSurface` | V1, V2, F1 | Alt görünüm; mevcut durum, tarih, kazanım ve BOQ özetlerinden türetilir. |
| 29 | `noa_i_n_aat_i_hale_karl_l_k_sim_lasyonu.html` | `/ihale-yonetimi` | `TenderManagementSurface` | V1, V2, F1 | Alt görünüm; mevcut `calculateTenderBoqSimulation` ve `TenderBoqLine` altyapısı kullanılır. |
| 30 | `noa_i_n_aat_i_hale_y_netimi.html` | `/ihale-yonetimi` | `TenderManagementSurface` | V1, V2, F1 | Ana liste/Kanban referansı; route ve gerçek durum geçişleri korunur. |
| 31 | `noa_i_n_aat_kasa_banka.html` | `/kasa-banka` | `CashBankSurface` | V1, V2, F1 | Ana; hesap, hareket, virman, kaynak/ters hareket ve ledger görünürlüğü. |
| 32 | `noa_i_n_aat_kullan_c_davet_et.html` | `/ayarlar` | `SettingsSurface` | V1, V2, F1 | Alt görünüm; mevcut `UserInvitation` create/resend/revoke akışına bağlanır. |
| 33 | `noa_i_n_aat_m_teri_hesap_ekstresi.html` | `/musteriler` | `CounterpartyManagementSurface`, `LedgerSurface` | V1, V2, F1 | Alt görünüm; cari hareket ve ledger satırlarını aynı scope'ta gösterir. |
| 34 | `noa_i_n_aat_m_teriler_liste.html` | `/musteriler` | `CounterpartyManagementSurface`, `EntityListSurface` | V1, V2, F1 | Ana yoğun tablo referansı. |
| 35 | `noa_i_n_aat_m_teriler.html` | `/musteriler` | `CounterpartyManagementSurface`, `EntityListSurface` | V1, V2, F1 | Birleştir; filtre/action bar ve detay paneli desenleri. |
| 36 | `noa_i_n_aat_personel_ve_maa_y_netimi.html` | `/personel` | `EntityListSurface`, `PayrollAccrualSurface` | V1, V2, F1 | Ana personel/bordro çalışma alanı; mevcut tahakkuk/post/ödeme guard'ları korunur. |
| 37 | `noa_i_n_aat_personel_y_netimi.html` | `/personel` | `EntityListSurface`, `PersonnelAssetSurface` | V1, V2, F1 | Birleştir; kart, filtre, şantiye ve zimmet görünümü. |
| 38 | `noa_i_n_aat_puantaj_aktar_m_ve_fazla_mesai.html` | `/puantaj` | `TimesheetSurface` | V1, V2, F1/F2 | İçe aktarma UX'i F1; kalıcı import staging/geçmişi istenirse F2 mini-RFC. |
| 39 | `noa_i_n_aat_puantaj_cetveli_detayl.html` | `/puantaj` | `TimesheetSurface` | V1, V2, F1 | Ana yoğun aylık grid referansı. |
| 40 | `noa_i_n_aat_puantaj_cetveli_veri_giri_i.html` | `/puantaj` | `TimesheetSurface` | V1, V2, F1 | Birleştir; veri giriş toolbar'ı ve durum özeti. |
| 41 | `noa_i_n_aat_puantaj_cetveli.html` | `/puantaj` | `TimesheetSurface` | V1, V2, F1 | Alt görünüm; kaydet/kesinleştir ve export desenleri. |
| 42 | `noa_i_n_aat_rapor_merkezi.html` | `/raporlar` | `ReportsSurface` | V1, V2, F1 | Ana; mevcut read-model filtreleri ve gerçek çıktılar. Sahte rapor kartı çalışır gösterilmez. |
| 43 | `noa_i_n_aat_rol_ve_yetki_matrisi.html` | `/ayarlar` | `SettingsSurface` | V1, V2, F1 | Alt görünüm; mevcut kullanıcı/rol erişim modeliyle sınırlı matris. |
| 44 | `noa_i_n_aat_stok_depo_y_netimi.html` | `/stok-depo` | `EntityListSurface`, `StockMovementSurface`, `StockDepotSurface` | V1, V2, F1 | Birleştir; dashboard/özet kartları ve hızlı işlemler. |
| 45 | `noa_i_n_aat_stok_depo.html` | `/stok-depo` | `EntityListSurface`, `StockMovementSurface`, `StockDepotSurface` | V1, V2, F1 | Ana stok kartı, hareket ve minimum stok referansı. |
| 46 | `noa_i_n_aat_ta_eronlar.html` | `/taseronlar` | `CounterpartyManagementSurface`, `EntityListSurface` | V1, V2, F1 | Ana; hakediş/cari bağlantılı taşeron listesi. |
| 47 | `noa_i_n_aat_tedarik_iler.html` | `/tedarikciler` | `CounterpartyManagementSurface`, `EntityListSurface` | V1, V2, F1 | Ana; alış faturası/cari bağlantılı tedarikçi listesi. |
| 48 | `noa_i_n_aat_yeni_i_hale_3_sekmeli_form.html` | `/ihale-yonetimi` | `TenderManagementSurface` | V1, V2, F1 | Yeni ihale için canonical üç aşamalı form; mevcut alan ve BOQ action'larına bağlanır. |
| 49 | `noa_i_n_aat_yeni_i_hale_ekle.html` | `/ihale-yonetimi` | `TenderManagementSurface` | V1, V2, F1 | Birleştir; tek sayfa alan grupları ve yardım metinleri üç sekmeli forma kaynak olur. |
| 50 | `noa_i_n_aat_yeni_m_teri_ekle.html` | `/musteriler` | `EntityListSurface` | V1, V2, F1 | Alt görünüm; mevcut entity create formunun drawer/modal görsel kaynağı. |

## 4. Hakediş Pro Şablonları — 26 Dosya

| # | Şablon | Hedef route | Hedef surface | Sınıf | Karar ve sınır |
|---:|---|---|---|---|---|
| 51 | `hakedi_pro_dashboard.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Hakediş workspace özetinin ana referansı; global AppShell'i değiştirmez. |
| 52 | `hakedi_pro_demir_metraj_veri_giri_i.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Demir metraj föyü ve satır editörü; `sheetType=REBAR`. |
| 53 | `hakedi_pro_demir_metraj.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Demir metraj liste/özet alt görünümü. |
| 54 | `hakedi_pro_genel_metraj_veri_giri_i_g_ncel.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Genel metraj editörü için güncel canonical varyant; NOA Structural markası kullanılmaz. |
| 55 | `hakedi_pro_genel_metraj_veri_giri_i.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Önceki varyant; yalnız yararlı alan/toolbar farkları 54'e birleştirilir. |
| 56 | `hakedi_pro_genel_metraj.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Genel metraj föy listesi ve import aksiyonu. |
| 57 | `hakedi_pro_hakedi_zeti_kapak_1.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Özet/kapak ve yazdırma düzeni için birinci kaynak. |
| 58 | `hakedi_pro_hakedi_zeti_kapak_2.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Birleştir; PDF/print/share alanları yalnız gerçek çıktılarla açılır. |
| 59 | `hakedi_pro_hakedi_zeti.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Hakediş dönem/kümülatif özetinin ana veri düzeni. |
| 60 | `hakedi_pro_i_kalemleri_ve_poz_listesi.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Sözleşme poz listesi için ana yoğun tablo. |
| 61 | `hakedi_pro_i_malat_ar_af_detay.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | İmalat çarşafı detay alt görünümü; mevcut snapshot/report verisi. |
| 62 | `hakedi_pro_i_malat_ar_af.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | İmalat çarşafı liste/rapor görünümü. |
| 63 | `hakedi_pro_kesinti_hesaplama_kurallar.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F2 | F2 beklet; kalıcı kural/şablon modeli ayrı mini-RFC ister. Mevcut hareket modeli değiştirilmez. |
| 64 | `hakedi_pro_kesintiler.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Mevcut `ConstructionDeductionMovement` giriş/liste görünümü. |
| 65 | `hakedi_pro_muhasebe_entegrasyonu.html` | `/hakedis` | `ConstructionProgressPaymentSurface`, `LedgerSurface` | V1, V2, F1 | Mevcut `ConstructionAccountingLink` ve ledger belge görünürlüğü; dış muhasebe sync'i açılmaz. |
| 66 | `hakedi_pro_poz_bazl_metraj_hesap_sim_lasyonu.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1/F2 | Geçici hesap F1; senaryo kaydetme/geçmiş F2 mini-RFC olmadan açılmaz. |
| 67 | `hakedi_pro_poz_detaylar_n_d_zenle.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Poz düzenleme ve birim fiyat revizyonu; geçmiş snapshot yeniden fiyatlanmaz. |
| 68 | `hakedi_pro_proje_bilgileri_ve_s_zle_me_detaylar.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Proje/sözleşme salt-okunur detay görünümü. |
| 69 | `hakedi_pro_proje_bilgileri.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Proje oluşturma/düzenleme form kompozisyonu; mevcut `ConstructionProject` alanlarıyla sınırlı. |
| 70 | `hakedi_pro_rapor_merkezi.html` | `/hakedis`, `/raporlar` | `ConstructionProgressPaymentSurface`, `ReportsSurface` | V1, V2, F1 | Hakediş içi rapor sekmeleri ve ortak rapor merkezi bağlantısı. |
| 71 | `hakedi_pro_toplu_metraj_aktar_m.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1/F2 | Dosya parse/önizleme F1; kalıcı staging/import geçmişi F2 mini-RFC ister. |
| 72 | `hakedi_pro_tutanakl_i_ler.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Mevcut `ConstructionExtraWork` liste/form görünümü. |
| 73 | `hakedi_pro_ye_il_defter_miktar_kontrol_ad_mlar.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Mevcut metraj reconciliation ve snapshot doğrulamasını adımlı UX'e taşır. |
| 74 | `hakedi_pro_ye_il_defter_miktar_kontrol.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Miktar kontrol tablosu ve sapma görünümü. |
| 75 | `hakedi_pro_ye_il_defter.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Yeşil Defter ana rapor sekmesi; mevcut measurement/snapshot verisi. |
| 76 | `hakedi_pro_yeni_poz_ekle_formu_yan_panel.html` | `/hakedis` | `ConstructionProgressPaymentSurface` | V1, V2, F1 | Yeni sözleşme pozu için canonical drawer; mevcut create action ve scope guard'ı. |

## 5. Canonical Birleştirme Kararları

1. Global shell için yalnız `noa_i_n_aat_dashboard.html` temel alınır. Hakediş Pro sidebar'ları global navigasyon olarak taşınmaz.
2. Entity listesinde `noa_i_n_aat_m_teriler_liste.html` yoğun tabloyu, `noa_i_n_aat_m_teriler.html` filtre/action bar'ı, tedarikçi/taşeron şablonları domain farklarını besler.
3. Yeni ihale akışında üç sekmeli form canonical; tek sayfa form yalnız alan gruplama ve yardım metni kaynağıdır.
4. Döküman merkezinde genişletilmiş şablon canonical; dosya yükleme ayrı erişilebilir modal/drawer olur.
5. Araçlarda operasyon şablonu canonical; bakım takvimi ayrı sekme, İngilizce araç listesi yalnız kolon/filtre kaynağıdır.
6. Giderlerde yönetim şablonu liste/analiz, form içeren şablon kayıt paneli kaynağıdır.
7. Stokta `stok_depo.html` operasyon tabanı, `stok_depo_y_netimi.html` özet kartı kaynağıdır.
8. Puantajda detaylı aylık grid canonical; import/fazla mesai ayrı akış, sade cetvel sonuç/çıktı görünümüdür.
9. Hakediş Pro'da global shell tekrar edilmez; 26 dosyanın yalnız içerik alanları tek `/hakedis` workspace'ine sekme/drawer/rapor olarak uyarlanır.
10. Aynı işlevin light/dark veya İngilizce/Türkçe varyantı varsa Türkçe light kompozisyon canonical kabul edilir; dark tema Faz 9'a kalır.

## 6. Eşleştirme Doğrulaması

- NOA satırı: 50/50.
- Hakediş Pro satırı: 26/26.
- Eşleşmemiş HTML: 0.
- Route'u olmayan şablon: 0; content-only şablonlar mevcut route içinde alt görünüm olarak eşlendi.
- Doğrudan yeni Prisma modeli zorunlu bulunan şablon: 0.
- F2 karar kapısına alınan işlev kümeleri: kesinti kuralı, kalıcı simülasyon senaryosu ve kalıcı import staging/geçmişi.

## 7. Faz 9 Nihai Route Matrisi

Bu tablo, Faz 1 envanterindeki 76 kaynak şablonu canlı uygulamadaki 22 korumalı route ile uzlaştırır. `Tamamlandı` durumu; route yüzeyinin standart AppShell, gerçek action akışı, semantic light/dark tema, responsive yerleşim ve erişilebilirlik sözleşmesi altında çalıştığını ifade eder. Print yalnız gerçek çıktı üreten yüzeylerde etkinleştirilir.

| Grup | Route | Canlı surface | Ana kompozisyon | İşlevsel kapsam | Nihai durum |
|---|---|---|---|---|---|
| Genel | `/` | `DashboardSurface` | Dashboard + firmalar dashboard | Gerçek finans/operasyon metrikleri ve üç erişilebilir grafik | Tamamlandı |
| Genel | `/santiyeler` | `SiteManagementSurface` | Şantiyeler + finans panosu | Kart/liste, finans read-model ve kârlılık | Tamamlandı |
| Genel | `/ihale-yonetimi` | `TenderManagementSurface` | İhale liste/Kanban + üç aşamalı form | CRUD, BOQ, durum, analiz, simülasyon ve şantiyeye dönüşüm | Tamamlandı |
| Genel | `/dokuman-merkezi` | `DocumentCenterSurface` | Genişletilmiş doküman merkezi | Klasör, yükleme, taşıma, çöp ve geri yükleme | Tamamlandı |
| Genel | `/bildirimler` | `NotificationCenterSurface` | Bildirim merkezi + tercihler | Liste, okunmamış, okundu ve kategori tercihi | Tamamlandı |
| Finans | `/tedarikciler` | `CounterpartyManagementSurface` | Tedarikçi listesi + ekstre | Cari kart, alış bağlantısı ve scoped ekstre | Tamamlandı |
| Finans | `/musteriler` | `CounterpartyManagementSurface` | Yoğun müşteri tablosu + ekstre | Cari kart, satış bağlantısı ve scoped ekstre | Tamamlandı |
| Finans | `/taseronlar` | `CounterpartyManagementSurface` | Taşeron listesi | Cari kart, hakediş ve ödeme bağlantısı | Tamamlandı |
| Finans | `/kasa-banka` | `CashBankSurface` | Kasa/Banka workspace | Hareket, virman, kaynak/ters kayıt ve ledger | Tamamlandı |
| Finans | `/giderler` | `ExpenseSurface` | Gider yönetimi + kayıt paneli | Gider oluşturma, ödeme aracı ve analiz | Tamamlandı |
| Finans | `/faturalar` | `InvoiceManagementSurface` | Fatura/irsaliye workspace | Alış, satış, irsaliye, kesinleştirme, ödeme/tahsilat ve PDF | Tamamlandı |
| Finans | `/hakedis` | `ProgressPaymentSurface`, `ConstructionProgressPaymentSurface` | NOA Hakediş + 26 Hakediş Pro şablonu | Finansal hakediş ile proje/poz/metraj/onay/kesinti/muhasebe zinciri | Tamamlandı |
| Finans | `/cek` | `ChequeSurface` | Çek yönetimi | Oluşturma, vade, tahsil ve ledger bağlantısı | Tamamlandı |
| Operasyon | `/personel` | Personel, zimmet ve `PayrollAccrualSurface` | Personel/maaş kompozisyonu | Personel kartı, zimmet, tahakkuk ve ödeme | Tamamlandı |
| Operasyon | `/stok-depo` | `StockDepotSurface`, `StockMovementSurface` | Stok/depo operasyonu + özet | Kart, minimum stok, hareket ve transfer | Tamamlandı |
| Operasyon | `/araclar` | `VehicleFleetSurface` | Filo operasyonu + bakım takvimi | Araç kartı, tarih uyarıları ve sandbox görünümü | Tamamlandı |
| Operasyon | `/puantaj` | `TimesheetSurface` | Detaylı puantaj grid | Giriş, liste, kesinleştirme, audit ve bordro hazırlığı | Tamamlandı |
| Operasyon | `/raporlar` | `ReportsSurface` | Rapor merkezi | Gerçek read-model filtreleri ve çalışan çıktılar | Tamamlandı |
| Sistem | `/abonelik` | `SubscriptionSurface` | Abonelik ve paketler | Paket, add-on, yenileme ve ödeme geçmişi | Tamamlandı |
| Sistem | `/api-yonetimi` | `ApiKeyManagementSurface` | API yönetimi + anahtar oluşturma | Admin anahtar/revoke, scope ve webhook endpointleri | Tamamlandı |
| Sistem | `/e-fatura-yonetimi` | `EFaturaSurface` | E-Fatura yönetimi | Plan/durum/audit; gerçek provider iddiası yok | Tamamlandı |
| Sistem | `/ayarlar` | `SettingsSurface`, `LedgerSurface` | Ayarlar + banka/audit/rol alt görünümleri | Firma, kullanıcı, davet, sandbox banka, dönem, yevmiye ve audit | Tamamlandı |

## 8. Ortak Kabul Özeti

| Sözleşme | Sonuç |
|---|---|
| Shell | 22/22 route `data-shell-variant="standard"` |
| Başlık/landmark | 22/22 route tek ana `h1` ve `main` içerik alanı |
| Tema | Semantic light/dark tokenlar; route bazlı ayrı palet yok |
| Kontrast | Light minimum `4.52:1`, dark minimum `7.11:1` |
| Responsive | Masaüstü ve 390 × 844 px mobil yerleşim; belge düzeyinde yatay taşma yok |
| Tablo/form/modal/grafik | Erişilebilir ad, odak ve klavye sözleşmeleri kabul edildi |
| Print | Açık yüksek kontrast palet, gizlenen global shell ve korunan tablo kırılımları |
| Veri güvenliği | Tenant/firma/dönem scope, RBAC, audit, ledger ve idempotency korunuyor |
| Dış entegrasyon | Sandbox/plan sınırı görünür; gerçek bağlantı varmış gibi davranılmıyor |

## 9. Abonelik ve Rol Sınırları

- Abonelikle korunabilen route: `/araclar`, `/cek`, `/dokuman-merkezi`, `/e-fatura-yonetimi`, `/hakedis`, `/ihale-yonetimi`.
- `viewer` yetkili kapsamı salt okunur kullanır.
- `accounting` finansal ve operasyonel kayıt akışlarını yürütür.
- `admin` bunlara ek kullanıcı/rol, dönem, entegrasyon ve API yönetimini yürütür.
- Kesinti kuralı tanımı/revizyonu admin; önizleme ve uygulama admin/accounting rolündedir.

## 10. Kullanıcı Dokümantasyonu ve Kapanış

- Son kullanıcı rehberi: `Docs/NOA-kullanici-rehberi.md`.
- Görsel/semantik kabul raporu: `Docs/UI-baseline/Faz9-route-matrix-kabul-20260722.md`.
- Tasarım sistemi ve yeni yüzey kuralları: `Docs/Template-Standard-v1.md`.
- Kaynak 76 HTML dosyası referans olarak korunur; runtime sayfası veya ikinci uygulama kabuğu değildir.
- 76/76 şablon eşleşmiş, 22/22 canlı route nihai kabulden geçmiştir. Bu kayıtla Faz 9 sayfa matrisi kapanmıştır.
