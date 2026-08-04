import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { describe, expect, test, vi } from "vitest";

import {
  createR2DocumentStorage,
  type R2ClientLike,
} from "./document-storage-r2";

describe("R2 document storage adapter", () => {
  test("writes and reads content with the approved storage port", async () => {
    const send = vi.fn(async (command: unknown) => {
      if (command instanceof GetObjectCommand) {
        return {
          Body: {
            transformToByteArray: async () =>
              new TextEncoder().encode("staging document"),
          },
          ContentLength: 16,
          ContentType: "text/plain",
        };
      }

      return {};
    });
    const storage = createR2DocumentStorage({
      bucket: "noa-insaat-staging-eu",
      client: { send } as R2ClientLike,
    });

    await expect(
      storage.putObject({
        content: new TextEncoder().encode("staging document"),
        contentType: "text/plain",
        storageKey: "document-center/contracts/demo.txt",
      }),
    ).resolves.toMatchObject({
      absolutePath:
        "r2://noa-insaat-staging-eu/document-center/contracts/demo.txt",
      sizeBytes: 16,
    });
    await expect(
      storage.readObject("document-center/contracts/demo.txt"),
    ).resolves.toMatchObject({
      contentType: "text/plain",
      sizeBytes: 16,
      storageKey: "document-center/contracts/demo.txt",
    });

    const put = send.mock.calls[0]?.[0];
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect((put as PutObjectCommand).input).toMatchObject({
      Bucket: "noa-insaat-staging-eu",
      ContentType: "text/plain",
      Key: "document-center/contracts/demo.txt",
    });
  });

  test("checks existence before idempotent delete", async () => {
    const send = vi.fn(async (command: unknown) => {
      void command;
      return {};
    });
    const storage = createR2DocumentStorage({
      bucket: "noa-insaat-staging-eu",
      client: { send } as R2ClientLike,
    });

    await expect(
      storage.deleteObject("document-center/contracts/demo.txt"),
    ).resolves.toEqual({
      deleted: true,
      storageKey: "document-center/contracts/demo.txt",
    });
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadObjectCommand);
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(DeleteObjectCommand);
  });

  test("reports a missing object without issuing delete", async () => {
    const send = vi.fn(async () => {
      throw Object.assign(new Error("missing"), {
        $metadata: { httpStatusCode: 404 },
      });
    });
    const storage = createR2DocumentStorage({
      bucket: "noa-insaat-staging-eu",
      client: { send } as R2ClientLike,
    });

    await expect(
      storage.deleteObject("document-center/contracts/missing.txt"),
    ).resolves.toEqual({
      deleted: false,
      storageKey: "document-center/contracts/missing.txt",
    });
    expect(send).toHaveBeenCalledOnce();
  });

  test("rejects unsafe storage keys before network access", async () => {
    const send = vi.fn();
    const storage = createR2DocumentStorage({
      bucket: "noa-insaat-staging-eu",
      client: { send } as R2ClientLike,
    });

    await expect(storage.readObject("../secret.txt")).rejects.toThrow(
      "Storage anahtarı güvenli değil",
    );
    expect(send).not.toHaveBeenCalled();
  });
});
