import { join } from "node:path";

import { describe, expect, test, vi } from "vitest";

import { createDocumentStorageRuntime } from "./document-storage-runtime";

describe("document storage runtime port", () => {
  test("keeps the development adapter explicit", () => {
    const runtime = createDocumentStorageRuntime({});

    expect(runtime.provider).toBe("local");
    expect(runtime.storage).toMatchObject({
      deleteObject: expect.any(Function),
      putObject: expect.any(Function),
      readObject: expect.any(Function),
    });
  });

  test("accepts the validated production directory without claiming cloud storage", () => {
    const runtime = createDocumentStorageRuntime({
      NOA_DOCUMENT_STORAGE_DIR: join(process.cwd(), "runtime-documents"),
    });

    expect(runtime.provider).toBe("local");
  });

  test("fails closed when staging tries to use ephemeral local storage", () => {
    expect(() =>
      createDocumentStorageRuntime({ NOA_RUNTIME_ENV: "staging" }),
    ).toThrow(
      "Staging/production doküman storage sağlayıcısı açıkça r2 olmalıdır",
    );
  });

  test("selects R2 only with the approved EU jurisdiction configuration", () => {
    const storage = {
      deleteObject: vi.fn(),
      putObject: vi.fn(),
      readObject: vi.fn(),
    };
    const createR2Storage = vi.fn(() => storage);
    const runtime = createDocumentStorageRuntime(
      {
        NOA_DOCUMENT_STORAGE_PROVIDER: "r2",
        NOA_RUNTIME_ENV: "staging",
        R2_ACCESS_KEY_ID: "access-key",
        R2_BUCKET: "noa-insaat-staging-eu",
        R2_ENDPOINT: "https://account-id.eu.r2.cloudflarestorage.com",
        R2_SECRET_ACCESS_KEY: "secret-key",
      },
      { createR2Storage },
    );

    expect(runtime).toEqual({ provider: "r2", storage });
    expect(createR2Storage).toHaveBeenCalledWith({
      accessKeyId: "access-key",
      bucket: "noa-insaat-staging-eu",
      endpoint: "https://account-id.eu.r2.cloudflarestorage.com",
      secretAccessKey: "secret-key",
    });
  });

  test("rejects the non-jurisdiction R2 endpoint", () => {
    expect(() =>
      createDocumentStorageRuntime({
        NOA_DOCUMENT_STORAGE_PROVIDER: "r2",
        R2_ACCESS_KEY_ID: "access-key",
        R2_BUCKET: "noa-insaat-staging-eu",
        R2_ENDPOINT: "https://account-id.r2.cloudflarestorage.com",
        R2_SECRET_ACCESS_KEY: "secret-key",
      }),
    ).toThrow("onaylanan EU jurisdiction");
  });
});
