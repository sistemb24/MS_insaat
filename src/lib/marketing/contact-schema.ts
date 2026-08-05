import { z } from "zod";

export const contactFormSchema = z.object({
  /** Ad Soyad: zorunlu, 1–100 karakter */
  name: z
    .string()
    .min(1, { message: "Ad Soyad alanı zorunludur." })
    .max(100, { message: "Ad Soyad en fazla 100 karakter olabilir." }),

  /** E-posta: zorunlu, geçerli e-posta formatı */
  email: z
    .string()
    .email({ message: "Geçerli bir e-posta adresi giriniz." }),

  /** Firma Adı: zorunlu, 1–200 karakter */
  companyName: z
    .string()
    .min(1, { message: "Firma Adı alanı zorunludur." })
    .max(200, { message: "Firma Adı en fazla 200 karakter olabilir." }),

  /** Telefon: opsiyonel, max 30 karakter */
  phone: z
    .string()
    .max(30, { message: "Telefon numarası en fazla 30 karakter olabilir." })
    .optional(),

  /** Konu: enum seçimi */
  subject: z.enum(["demo", "teknik-destek", "fiyat-bilgisi", "diger"], {
    error: () => ({ message: "Lütfen geçerli bir konu seçiniz." }),
  }),

  /** Mesaj: zorunlu, 20–2000 karakter */
  message: z
    .string()
    .min(20, { message: "Mesaj en az 20 karakter olmalıdır." })
    .max(2000, { message: "Mesaj en fazla 2000 karakter olabilir." }),

  /** KVKK onayı: zorunlu olarak true olmalıdır */
  kvkkConsent: z.literal(true, {
    error: () => ({ message: "KVKK onayı zorunludur." }),
  }),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
