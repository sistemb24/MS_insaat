import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, test } from "vitest";

import { cleanupDocumentStorageObjects } from "./document-storage-cleanup";
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

describe("document storage cleanup", () => {
  test("deletes all purged storage keys and reports missing objects", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "noa-doc-storage-cleanup-"));
    createdRoots.push(rootDir);
    const storage = createLocalDocumentStorage({ rootDir });
    const written = await storage.putObject({
      content: new TextEncoder().encode("purge object"),
      contentType: "application/pdf",
      storageKey: "document-center/contracts/purge.pdf",
    });

    await expect(
      cleanupDocumentStorageObjects(storage, [
        written.storageKey,
        "document-center/contracts/missing.pdf",
      ]),
    ).resolves.toEqual({
      deletedCount: 1,
      deletedStorageKeys: ["document-center/contracts/purge.pdf"],
      failed: [],
      missingStorageKeys: ["document-center/contracts/missing.pdf"],
    });
    await expect(readFile(written.absolutePath, "utf8")).rejects.toThrow();
  });
});