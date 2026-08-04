import { describe, expect, it } from "vitest";

import { validateProductionEnvironment } from "./production-environment";

describe("production environment", () => {
  it("accepts the minimum explicit production contract", () => {
    expect(
      validateProductionEnvironment({
        APP_BASE_URL: "https://app.noa.example",
        DATABASE_URL: "postgresql://noa:secret@db.noa.example:5432/noa",
        NOA_DOCUMENT_STORAGE_DIR: "D:\\noa-production-documents",
        NOA_TRUST_PROXY: "false",
      }),
    ).toMatchObject({
      APP_BASE_URL: "https://app.noa.example",
      NOA_TRUST_PROXY: "false",
    });
  });

  it("rejects local database, insecure base URL and relative storage", () => {
    expect(() =>
      validateProductionEnvironment({
        APP_BASE_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://postgres:secret@localhost:5432/noa",
        NOA_DOCUMENT_STORAGE_DIR: "storage/documents",
      }),
    ).toThrow(/APP_BASE_URL.*DATABASE_URL.*NOA_DOCUMENT_STORAGE_DIR/);
  });

  it("rejects malformed optional secrets without requiring inactive providers", () => {
    expect(() =>
      validateProductionEnvironment({
        APP_BASE_URL: "https://app.noa.example",
        DATABASE_URL: "postgresql://noa:secret@db.noa.example:5432/noa",
        NOA_DOCUMENT_STORAGE_DIR: "D:\\noa-production-documents",
        NOA_PAYMENT_WEBHOOK_SECRET: "short",
      }),
    ).toThrow(/NOA_PAYMENT_WEBHOOK_SECRET/);
  });

  it("blocks indexing until official legal identity is complete", () => {
    expect(() =>
      validateProductionEnvironment({
        APP_BASE_URL: "https://app.noa.example",
        DATABASE_URL: "postgresql://noa:secret@db.noa.example:5432/noa",
        NOA_DOCUMENT_STORAGE_DIR: "D:\\noa-production-documents",
        NOA_PUBLIC_INDEXING_ENABLED: "true",
      }),
    ).toThrow(/NOA_LEGAL_COMPANY_NAME/);
  });
});
