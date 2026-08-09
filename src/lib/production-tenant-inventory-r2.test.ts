import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, test, vi } from "vitest";

import { createProductionTenantInventoryR2HeadPort } from "./production-tenant-inventory-r2";

describe("production tenant inventory R2 head port", () => {
  test("uses only exact HeadObject requests and preserves safe sizes", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ContentLength: 12 })
      .mockResolvedValueOnce({ ContentLength: 20 });
    const port = createProductionTenantInventoryR2HeadPort({
      bucket: "noa-insaat-production-eu",
      client: { send },
    });

    await expect(
      port.headObjects({
        storageKeys: [
          "document-center/a/one.pdf",
          "document-center/b/two.pdf",
        ],
      }),
    ).resolves.toEqual([
      {
        exists: true,
        sizeBytes: 12,
        storageKey: "document-center/a/one.pdf",
      },
      {
        exists: true,
        sizeBytes: 20,
        storageKey: "document-center/b/two.pdf",
      },
    ]);
    expect(send).toHaveBeenCalledTimes(2);
    for (const [command] of send.mock.calls) {
      expect(command).toBeInstanceOf(HeadObjectCommand);
      expect((command as HeadObjectCommand).input.Bucket).toBe(
        "noa-insaat-production-eu",
      );
    }
  });

  test("reports missing objects without reading their bodies", async () => {
    const send = vi.fn().mockRejectedValue({ name: "NotFound" });
    const port = createProductionTenantInventoryR2HeadPort({
      bucket: "noa-insaat-production-eu",
      client: { send },
    });

    await expect(
      port.headObjects({ storageKeys: ["document-center/a/missing.pdf"] }),
    ).resolves.toEqual([
      {
        exists: false,
        sizeBytes: 0,
        storageKey: "document-center/a/missing.pdf",
      },
    ]);
  });

  test("fails closed for duplicate keys, unsafe keys and invalid size", async () => {
    const send = vi.fn().mockResolvedValue({ ContentLength: undefined });
    const port = createProductionTenantInventoryR2HeadPort({
      bucket: "noa-insaat-production-eu",
      client: { send },
    });

    await expect(
      port.headObjects({
        storageKeys: ["document-center/a/x.pdf", "document-center/a/x.pdf"],
      }),
    ).rejects.toThrow(/tekrar eden/);
    await expect(
      port.headObjects({ storageKeys: ["../secret"] }),
    ).rejects.toThrow();
    await expect(
      port.headObjects({ storageKeys: ["document-center/a/x.pdf"] }),
    ).rejects.toThrow(/boyutu geçerli değil/);
  });
});
