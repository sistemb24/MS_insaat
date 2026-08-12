import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import KayitPage from "@/app/(auth)/kayit/page";
import SifreSifirlaPage from "@/app/(auth)/sifre-sifirla/page";
import SifremiUnuttumPage from "@/app/(auth)/sifremi-unuttum/page";
import PrivacyPage from "@/app/(marketing)/gizlilik/page";
import TermsPage from "@/app/(marketing)/kullanim-kosullari/page";
import KvkkPage from "@/app/(marketing)/kvkk/page";
import { LEGAL_DOCUMENT_VERSION } from "@/lib/marketing/legal-documents";

import ContactForm from "./contact-form";
import NewsletterForm from "./newsletter-form";

describe("public truth quarantine", () => {
  it.each([
    ["registration", <KayitPage key="registration" />, "hesap veya deneme aboneliği oluşturmaz"],
    ["forgot password", <SifremiUnuttumPage key="forgot" />, "token üretilmez"],
    ["reset password", <SifreSifirlaPage key="reset" />, "token üretilmez"],
    ["contact", <ContactForm key="contact" />, "mesaj veya kişisel veri kaydetmez"],
    ["newsletter", <NewsletterForm key="newsletter" />, "E-posta adresi toplanmıyor"],
  ])("renders %s as unavailable without a submission form", (_name, node, copy) => {
    const html = renderToStaticMarkup(node);

    expect(html).toContain(copy);
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
  });

  it.each([
    ["privacy", <PrivacyPage key="privacy" />, "Gizlilik Politikası"],
    ["terms", <TermsPage key="terms" />, "Kullanım Koşulları"],
    ["kvkk", <KvkkPage key="kvkk" />, "KVKK Aydınlatma Metni"],
  ])("renders approved %s copy with version and official contact", (_name, node, title) => {
    const html = renderToStaticMarkup(node);

    expect(html).toContain(title);
    expect(html).toContain(LEGAL_DOCUMENT_VERSION);
    expect(html).toContain("12.08.2026");
    expect(html).toContain("mailto:info@msinsaat.com");
    expect(html).not.toContain("Yayına hazır değil");
    expect(html).not.toContain("HUKUK KARARI");
  });
});
