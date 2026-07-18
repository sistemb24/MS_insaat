import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, test } from "vitest";

import { createLocalDocumentStorage } from "./document-storage";

const createdRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((root) =>
      rm(root, {
        force: true,
        recursive: true,
      }),
    ),
  );
});

describe("document storage", () => {
  test("writes and reads object content under the configured local root", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "noa-doc-storage-"));
    createdRoots.push(rootDir);
    const storage = createLocalDocumentStorage({ rootDir });

    const written = await storage.putObject({
      content: new TextEncoder().encode("NOA test belge"),
      contentType: "application/pdf",
      storageKey: "document-center/contracts/sozlesme.pdf",
    });

    await expect(readFile(written.absolutePath, "utf8")).resolves.toBe(
      "NOA test belge",
    );
    await expect(storage.readObject(written.storageKey)).resolves.toEqual({
      content: new TextEncoder().encode("NOA test belge"),
      contentType: "application/pdf",
      sizeBytes: 14,
      storageKey: "document-center/contracts/sozlesme.pdf",
    });
  });

  test("deletes object content under the configured local root", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "noa-doc-storage-"));
    createdRoots.push(rootDir);
    const storage = createLocalDocumentStorage({ rootDir });

    const written = await storage.putObject({
      content: new TextEncoder().encode("silinecek belge"),
      contentType: "application/pdf",
      storageKey: "document-center/contracts/silinecek.pdf",
    });

    await expect(storage.deleteObject(written.storageKey)).resolves.toEqual({
      deleted: true,
      storageKey: "document-center/contracts/silinecek.pdf",
    });
    await expect(readFile(written.absolutePath, "utf8")).rejects.toThrow();
    await expect(storage.readObject(written.storageKey)).rejects.toThrow();
  });

  test("delete object is idempotent for missing safe keys", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "noa-doc-storage-"));
    createdRoots.push(rootDir);
    const storage = createLocalDocumentStorage({ rootDir });

    await expect(
      storage.deleteObject("document-center/contracts/yok.pdf"),
    ).resolves.toEqual({
      deleted: false,
      storageKey: "document-center/contracts/yok.pdf",
    });
  });
  test("rejects unsafe storage keys that escape the local root", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "noa-doc-storage-"));
    createdRoots.push(rootDir);
    const storage = createLocalDocumentStorage({ rootDir });

    await expect(
      storage.putObject({
        content: new Uint8Array([1, 2, 3]),
        contentType: "application/pdf",
        storageKey: "../outside.pdf",
      }),
    ).rejects.toThrow("Storage anahtarı güvenli değil.");
  });
});
