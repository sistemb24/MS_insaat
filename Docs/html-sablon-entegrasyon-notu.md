# HTML Şablon Entegrasyon Notu

Bu uygulama iskeletinde `stitch_HTML_sablonlar` klasöründeki statik HTML dosyaları doğrudan kopyalanmadı. İlk dilimde üç kaynak şablondan ortak tasarım yönü çıkarıldı:

- `dashboard.html`
- `genel_dashboard.html`
- `puantaj_girişi.html`

Uygulanan kararlar:

- Tailwind tokenları merkezi `src/app/globals.css` içinde tutulur.
- App shell, top bar, sidebar, module header, toolbar ve şablon kaynak paneli React bileşenlerine ayrıldı.
- P0 route'ları placeholder olarak açıldı ve gerçek domain servisleri eklenene kadar iş akışı bağlamı korunacak şekilde metinlendirildi.
- Placeholder modül toolbar aksiyonları sessiz bırakılmadı; gerçek domain işlemi bağlanana kadar kullanıcıya P0 placeholder kapsamı ve sonraki modül diliminde bağlanacağı bilgisi gösterilir.
- CDN Tailwind script'i veya statik HTML örnek verisi uygulama koduna taşınmadı.
