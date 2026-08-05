import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { contactFormSchema } from "../contact-schema";

const FC_CONFIG = { numRuns: 100 };

describe("contactFormSchema", () => {
  // Feature: noa-landing-marketing-pages, Property 3: Invalid contact form fields produce field-specific errors
  it("boş zorunlu alanlar field-specific hata üretir", () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.constant(""),
          email: fc.emailAddress(),
          companyName: fc.constant(""),
          subject: fc.constantFrom("demo" as const, "teknik-destek" as const, "fiyat-bilgisi" as const, "diger" as const),
          message: fc.string({ minLength: 1, maxLength: 10 }), // min 20 altında
          kvkkConsent: fc.constant(false as const),
        }),
        (data) => {
          const result = contactFormSchema.safeParse(data);
          expect(result.success).toBe(false);
          if (!result.success) {
            const errorFields = result.error.issues.map((i) => String(i.path[0]));
            expect(errorFields).toContain("name");
            expect(errorFields).toContain("companyName");
          }
        },
      ),
      FC_CONFIG,
    );
  });

  it("geçerli veri başarılı parse edilir", () => {
    const result = contactFormSchema.safeParse({
      name: "Ahmet Yılmaz",
      email: "ahmet@firma.com",
      companyName: "Yılmaz İnşaat A.Ş.",
      phone: "+90 555 123 45 67",
      subject: "demo",
      message: "Ürününüzü yakından tanımak istiyorum, demo ayarlayabilir miyiz?",
      kvkkConsent: true,
    });
    expect(result.success).toBe(true);
  });

  it("geçersiz e-posta formatı hata verir", () => {
    const result = contactFormSchema.safeParse({
      name: "Test Kişi",
      email: "gecersiz-email",
      companyName: "Test Firma",
      subject: "demo",
      message: "Bu bir test mesajıdır, yeterince uzun.",
      kvkkConsent: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => String(i.path[0]));
      expect(fields).toContain("email");
    }
  });

  it("kvkkConsent false olduğunda hata verir", () => {
    const result = contactFormSchema.safeParse({
      name: "Test",
      email: "test@test.com",
      companyName: "Firma",
      subject: "diger",
      message: "Mesaj metni en az yirmi karakter olmalı.",
      kvkkConsent: false,
    });
    expect(result.success).toBe(false);
  });
});
