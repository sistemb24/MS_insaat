# Faz 9 Route Matrisi Kabul Raporu

> Tarih: 22.07.2026
> Kapsam: kontrast, tablo, form, modal, grafik, print ve responsive kabulü

## Kapsanan rotalar

- `/`
- `/santiyeler`
- `/ihale-yonetimi`
- `/dokuman-merkezi`
- `/bildirimler`
- `/tedarikciler`
- `/musteriler`
- `/taseronlar`
- `/kasa-banka`
- `/giderler`
- `/faturalar`
- `/hakedis`
- `/cek`
- `/personel`
- `/stok-depo`
- `/araclar`
- `/puantaj`
- `/raporlar`
- `/abonelik`
- `/api-yonetimi`
- `/e-fatura-yonetimi`
- `/ayarlar`

## Kabul sonuçları

- 22 korumalı rotanın tamamı standart AppShell, tek ana `h1`, `main` landmark ve yatay taşma açısından tarandı.
- Light ve dark semantic renk çiftleri WCAG AA normal metin eşiği olan `4.5:1` altında kalmayacak şekilde otomatik teste bağlandı. Ölçülen en düşük oran light temada `4.52:1`, dark temada `7.11:1` oldu.
- Ana veri tabloları erişilebilir ad sözleşmesine alındı. Yevmiye, mizan, puantaj, hakediş ve fatura tabloları rol/ad sorgusuyla bulunabilir.
- Yevmiye manuel girişindeki fiş numarası, tarih ve açıklama alanları açık erişilebilir adlara sahiptir; mevcut satır hesap/yön/tutar adlandırmaları korunur.
- Alış faturası PDF önizlemesi `dialog` ve `aria-modal` sözleşmesi, ilk odak, Tab döngüsü, Escape ile kapanma ve tetikleyiciye odak dönüşüyle kabul edildi.
- Dashboard üzerindeki üç grafik erişilebilir grafik adlarıyla koyu temada doğrulandı.
- Print CSS koyu temadan bağımsız açık semantic palete döner; global header/sidebar, sayfa aksiyonları ve interaktif düğmeler gizlenir. Tablo başlık/altlık grupları ve satır kırılma kuralları korunur.
- `/faturalar` modalı, Dashboard koyu tema, `/ayarlar` yoğun tablo alanı ve `/puantaj` adlandırılmış tablo yüzeyi gerçek demo verisiyle üretim sunucusunda doğrulandı.
- DB şeması, domain kuralları, server action, RBAC, scope, audit ve ledger iş akışları değiştirilmedi.

## Otomatik koruma

- Semantic kontrast ve print sözleşmeleri `src/app/globals.test.ts` içindedir.
- Kabuk print gizleme sözleşmesi `src/components/app-shell.test.tsx` ile korunur.
- Modal, tablo ve form erişilebilirlik regresyonları ilgili surface testlerinde korunur.
- Kabul kapıları: tam test paketi, type-check, Prisma validate, lint, production build ve `git diff --check`.

## Sonraki dilim

Nihai sayfa matrisi `Docs/HTML-template-page-matrix.md` içinde, kullanıcı rehberi `Docs/NOA-kullanici-rehberi.md` içinde tamamlandı. Faz 9 kabul zinciri kapanmıştır.
