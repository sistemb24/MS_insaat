import { describe, expect, test } from "vitest";

import { createDocumentStorageKey } from "./document-storage-key";

describe("document storage key", () => {
  test("creates a deterministic safe key for Turkish file and folder names", () => {
    expect(
      createDocumentStorageKey({
        fileName: "Hakediş Raporu (Rev 2).PDF",
        folderId: "Sözleşmeler",
        lastModified: 1_782_883_200_000,
      }),
    ).toBe(
      "document-center/sozlesmeler/1782883200000-hakedis-raporu-rev-2-pdf",
    );
  });
});
