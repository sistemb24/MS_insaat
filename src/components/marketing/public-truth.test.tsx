import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import KayitPage from "@/app/(auth)/kayit/page";
import SifreSifirlaPage from "@/app/(auth)/sifre-sifirla/page";
import SifremiUnuttumPage from "@/app/(auth)/sifremi-unuttum/page";
import PrivacyPage from "@/app/(marketing)/gizlilik/page";

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

  it("quarantines legal copy until official identity and channels exist", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);

    expect(html).toContain("Yayına hazır değil");
    expect(html).toContain("hukuki taahhüt");
    expect(html).not.toContain("mailto:");
  });
});
