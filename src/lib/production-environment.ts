import { isAbsolute } from "node:path";

import { z } from "zod";

const optionalSecret = z
  .string()
  .trim()
  .min(32, "en az 32 karakter olmalıdır")
  .optional();

const productionEnvironmentSchema = z
  .object({
    APP_BASE_URL: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === "https:", {
        message: "HTTPS kullanmalıdır",
      }),
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol),
        { message: "PostgreSQL bağlantısı olmalıdır" },
      )
      .refine((value) => !isLocalDatabaseUrl(value), {
        message: "localhost veya loopback adresi kullanamaz",
      }),
    NOA_DOCUMENT_STORAGE_DIR: z
      .string()
      .trim()
      .min(1)
      .refine(isAbsolute, { message: "mutlak dizin olmalıdır" }),
    NOA_EFATURA_WEBHOOK_SECRET: optionalSecret,
    NOA_LEGAL_ADDRESS: z.string().trim().min(1).optional(),
    NOA_LEGAL_COMPANY_NAME: z.string().trim().min(1).optional(),
    NOA_LEGAL_CONTACT_EMAIL: z.string().email().optional(),
    NOA_LEGAL_CONTENT_APPROVED_AT: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    NOA_LEGAL_DATA_CONTROLLER: z.string().trim().min(1).optional(),
    NOA_PAYMENT_WEBHOOK_SECRET: optionalSecret,
    NOA_PUBLIC_INDEXING_ENABLED: z.enum(["true", "false"]).default("false"),
    NOA_TRUST_PROXY: z.enum(["true", "false"]).default("false"),
    SUPER_ADMIN_TOTP_ENCRYPTION_KEY: z
      .string()
      .refine(isValidAes256Key, {
        message: "base64 kodlu 32 bayt AES-256 anahtarı olmalıdır",
      })
      .optional(),
  })
  .superRefine((env, context) => {
    if (env.NOA_PUBLIC_INDEXING_ENABLED !== "true") return;

    for (const key of [
      "NOA_LEGAL_ADDRESS",
      "NOA_LEGAL_COMPANY_NAME",
      "NOA_LEGAL_CONTACT_EMAIL",
      "NOA_LEGAL_CONTENT_APPROVED_AT",
      "NOA_LEGAL_DATA_CONTROLLER",
    ] as const) {
      if (!env[key]) {
        context.addIssue({
          code: "custom",
          message: "public indexing için zorunludur",
          path: [key],
        });
      }
    }
  })
  .passthrough();

export type ProductionEnvironment = z.infer<
  typeof productionEnvironmentSchema
>;

export function validateProductionEnvironment(
  env: Readonly<Record<string, string | undefined>>,
): ProductionEnvironment {
  const result = productionEnvironmentSchema.safeParse(env);

  if (result.success) return result.data;

  const details = result.error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("; ");

  throw new Error(`Production environment doğrulaması başarısız: ${details}`);
}

function isLocalDatabaseUrl(value: string) {
  const hostname = new URL(value).hostname.toLowerCase();

  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isValidAes256Key(value: string) {
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}
