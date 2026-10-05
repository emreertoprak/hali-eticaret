// Ortak tasarım dili: tüm ekran prompt'larına eklenir ki Stitch tutarlı bir sistem üretsin.
export const DESIGN_SYSTEM = `
Turkish-language e-commerce website for a rug/carpet store called "HALI EVİ".
Visual style (keep identical on every screen):
- Very top: thin red (#C8102E) line, then a light gray (#E9E9E9) announcement bar with left/right chevron arrows and centered rotating text "Halı tanıtımları YouTube kanalımızda 🔔 Göz At".
- Below it a warm yellow (#FFC94D) promo bar with small white text "Vade Farksız Taksit Fırsatı: 10.000 TL Üzerine 3, 15.000 TL Üzerine 5 Taksit!".
- Header on cream background (#F3F1EC): outlined geometric wordmark logo "HALI EVİ" on the left, centered nav links "Ana Sayfa, Tüm Ürünler, Siparişler, Koleksiyonlar, Yakında" in dark gray, right side: "TRY / TR" selector with a small flag dot, search icon, user icon, shopping bag icon (thin line icons).
- Under header a light gray (#E4E4E4) full-width bar with centered uppercase text "TÜM HALILAR İÇİN TIKLAYINIZ".
- Font: Nunito / Open Sans style rounded sans-serif, dark text #222, generous whitespace, white page background.
- Primary call-to-action buttons: yellow #FFC94D pill shaped, dark text.
- Floating green WhatsApp circle button bottom right.
- Prices in Turkish Lira format like "4.250,00 TL", strike-through old price in gray, discount badge in red.
- Footer: dark charcoal (#1F1F1F) with columns (Kurumsal, Müşteri Hizmetleri, Kategoriler, İletişim), newsletter input, payment logos row.
`;

export const SCREENS = [
  {
    key: 'home',
    deviceType: 'DESKTOP',
    prompt: `Home page.
After the header and "TÜM HALILAR İÇİN TIKLAYINIZ" bar: small breadcrumb "Anasayfa".
Then an Instagram-stories-like horizontal row of ~20 circular category thumbnails (rug photos) with purple-to-orange gradient rings and labels under them: Afgan Halı, Akrilik Halı, Asimetrik Halı, Asitane Serisi, Banyo Paspası, Bohem Halı, Bukle Halı, Düz Renk Halı, Göbekli Halı, Jüt Hasır Halı, Kilimler, Klasik Halı, Limitli Seri Halılar, Microfiber Halı, Peluş Halı, Seri Sonu Fırsatı, Shaggy Halı, Sisal Halı, Soyut Abstract, Vintage Halı, and a last empty circle with "+" labelled "Tümünü Gör".
Then a full-width hero slider (about 560px tall) showing a luxurious hand-woven red/purple/gold rug photo with big golden serif text "HAND-WOVEN COLLECTION", a yellow pill "Tümünü Gör" button and dot pagination.
Then section "Yeni Gelenler" with a 4-column product card grid (square rug photo, product name, size range "80x150 - 200x290", price, old price, "Sepete Ekle" on hover).
Then section "Koleksiyonlar" with 3 large image tiles with overlay titles (Hand-Woven, Vintage, Modern Soyut).
Then a features strip with icons: Ücretsiz Kargo, 14 Gün İade, Güvenli Ödeme, Vade Farksız Taksit.
Then footer.`
  },
  {
    key: 'category',
    deviceType: 'DESKTOP',
    prompt: `Category listing page for "Shaggy Halı".
Breadcrumb "Anasayfa / Kategoriler / Shaggy Halı", page title with product count "48 ürün".
Left sidebar filters: Ebat (checkbox list 80x150, 120x180, 160x230, 200x290, Yolluk 80x300), Fiyat Aralığı (min/max inputs + slider), Renk swatches, Malzeme (Polyester, Akrilik, Pamuk, Yün), Hav Yüksekliği. "Filtreleri Uygula" yellow pill button.
Top right: sort dropdown "Sıralama: Önerilen / Fiyat artan / Fiyat azalan / En yeni".
Main area: 3-column grid of rug product cards (photo, name, size range, price with old price, discount badge) and numbered pagination at bottom.`
  },
  {
    key: 'product',
    deviceType: 'DESKTOP',
    prompt: `Product detail page for "Vintage Eskitme Halı - Bordo 3021".
Breadcrumb. Left: large image gallery with vertical thumbnails. Right: product name, SKU, star rating, price "4.250,00 TL" with old price "5.900,00 TL" and red "-28%" badge, info box "10.000 TL üzeri 3, 15.000 TL üzeri 5 vade farksız taksit".
Size selector as selectable chips: 80x150, 120x180, 160x230, 200x290, 80x300 (one selected with dark border, one disabled "Tükendi").
Quantity stepper and big yellow pill "Sepete Ekle" button plus outlined "Hemen Al" button, WhatsApp "Sipariş için yazın" link.
Trust icons row (Ücretsiz Kargo, 14 Gün İade, Güvenli Ödeme).
Below: tabs "Ürün Açıklaması / Özellikler / Bakım / Kargo & İade" with a specs table (Malzeme, Hav Yüksekliği, Taban, Üretim Yeri).
Then "Benzer Ürünler" 4-column product card row.`
  },
  {
    key: 'cart',
    deviceType: 'DESKTOP',
    prompt: `Shopping cart page "Sepetim".
Left: list of cart items (rug thumbnail, name, selected size "160x230", unit price, quantity stepper, line total, remove trash icon).
Right: sticky order summary card: Ara Toplam, Kargo "Ücretsiz", Toplam, installment info line, coupon code input, big yellow pill "Siparişi Tamamla" button, small secure payment text and payment logos.
Below: "Alışverişe Devam Et" link.`
  },
  {
    key: 'checkout',
    deviceType: 'DESKTOP',
    prompt: `Checkout page "Ödeme".
Step indicator: Adres → Ödeme → Onay.
Left: delivery address form (Ad, Soyad, Telefon, İl, İlçe, Açık Adres) and saved address cards selectable; payment section with card form (Kart Üzerindeki İsim, Kart Numarası, SKT, CVV) and installment option radio table (Tek Çekim, 3 Taksit, 5 Taksit with amounts).
Right: order summary with item thumbnails, totals and yellow pill "Ödemeyi Tamamla" button, checkbox for agreements (Mesafeli Satış Sözleşmesi).`
  },
  {
    key: 'login',
    deviceType: 'DESKTOP',
    prompt: `Account page with two side-by-side cards: "Giriş Yap" (E-posta, Şifre, "Şifremi unuttum" link, yellow pill "Giriş Yap" button) and "Üye Ol" (Ad, Soyad, E-posta, Telefon, Şifre, KVKK consent checkbox, dark outlined "Üye Ol" button). Keep header and footer.`
  },
  {
    key: 'home-mobile',
    deviceType: 'MOBILE',
    prompt: `Mobile home page. Announcement bar and yellow promo bar on top, cream header with hamburger menu left, centered "HALI EVİ" logo, search and bag icons right. Horizontally scrollable story-style circular category row with gradient rings. Hero slider with "HAND-WOVEN COLLECTION" text and yellow pill "Tümünü Gör" button. 2-column product grid "Yeni Gelenler". Floating WhatsApp button.`
  }
];
