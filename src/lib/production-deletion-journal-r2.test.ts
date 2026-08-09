import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";

import {
  createProductionDeletionJournalR2Store,
  PRODUCTION_DELETION_JOURNAL_BUCKET,
  readProductionDeletionJournalR2Config,
} from "./production-deletion-journal-r2";

const scopeHash = "a".repeat(64);
const prefix = `journal/v1/${scopeHash}/`;
const firstKey = `${prefix}000000000001-event-first.json.enc`;
const secondKey = `${prefix}000000000002-event-second.json.enc`;

function body(value: string) {
  return {
    transformToString: vi.fn().mockResolvedValue(value),
  };
}

describe("production deletion journal R2 adapter", () => {
  it("requires production, the exact EU bucket/endpoint and an append session token", () => {
    const validEnv = {
      NOA_RUNTIME_ENV: "production",
      PRODUCTION_DELETION_JOURNAL_R2_APPEND_ACCESS_KEY_ID: "append-access",
      PRODUCTION_DELETION_JOURNAL_R2_APPEND_SECRET_ACCESS_KEY: "append-secret",
      PRODUCTION_DELETION_JOURNAL_R2_APPEND_SESSION_TOKEN: "append-session",
      PRODUCTION_DELETION_JOURNAL_R2_BUCKET:
        PRODUCTION_DELETION_JOURNAL_BUCKET,
      PRODUCTION_DELETION_JOURNAL_R2_ENDPOINT:
        "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.eu.r2.cloudflarestorage.com",
      PRODUCTION_DELETION_JOURNAL_R2_READ_ACCESS_KEY_ID: "read-access",
      PRODUCTION_DELETION_JOURNAL_R2_READ_SECRET_ACCESS_KEY: "read-secret",
    };

    expect(readProductionDeletionJournalR2Config(validEnv, "append")).toMatchObject({
      bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
      sessionToken: "append-session",
    });
    expect(readProductionDeletionJournalR2Config(validEnv, "read")).not.toHaveProperty(
      "sessionToken",
    );
    expect(() =>
      readProductionDeletionJournalR2Config(
        { ...validEnv, PRODUCTION_DELETION_JOURNAL_R2_APPEND_SESSION_TOKEN: "" },
        "append",
      ),
    ).toThrow(/session token/);
    expect(() =>
      readProductionDeletionJournalR2Config(
        { ...validEnv, PRODUCTION_DELETION_JOURNAL_R2_BUCKET: "another-bucket" },
        "read",
      ),
    ).toThrow(/bucket adı/);
    expect(() =>
      readProductionDeletionJournalR2Config(
        {
          ...validEnv,
          PRODUCTION_DELETION_JOURNAL_R2_ENDPOINT:
            "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.r2.cloudflarestorage.com",
        },
        "read",
      ),
    ).toThrow(/EU jurisdiction/);
  });

  it("creates objects only with PutObject and If-None-Match=*", async () => {
    const send = vi.fn().mockResolvedValue({});
    const store = createProductionDeletionJournalR2Store({
      bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
      client: { send },
    });

    await expect(
      store.createObject({ body: "encrypted", ifNoneMatch: "*", key: firstKey }),
    ).resolves.toBe("created");
    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toMatchObject({
      Bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
      ContentType: "application/json",
      IfNoneMatch: "*",
      Key: firstKey,
    });
  });

  it("maps only a precondition failure to already-exists", async () => {
    const precondition = Object.assign(new Error("exists"), {
      $metadata: { httpStatusCode: 412 },
    });
    const store = createProductionDeletionJournalR2Store({
      bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
      client: { send: vi.fn().mockRejectedValue(precondition) },
    });
    await expect(
      store.createObject({ body: "encrypted", ifNoneMatch: "*", key: firstKey }),
    ).resolves.toBe("already-exists");

    const denied = new Error("AccessDenied");
    const deniedStore = createProductionDeletionJournalR2Store({
      bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
      client: { send: vi.fn().mockRejectedValue(denied) },
    });
    await expect(
      deniedStore.createObject({ body: "encrypted", ifNoneMatch: "*", key: firstKey }),
    ).rejects.toBe(denied);
  });

  it("paginates exact keys and reads deterministic JSON bodies", async () => {
    const firstBody = "{\"sequence\":1}";
    const secondBody = "{\"sequence\":2}";
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        Contents: [{ Key: secondKey, Size: Buffer.byteLength(secondBody) }],
        IsTruncated: true,
        NextContinuationToken: "page-2",
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: firstKey, Size: Buffer.byteLength(firstBody) }],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({
        Body: body(firstBody),
        ContentLength: Buffer.byteLength(firstBody),
        ContentType: "application/json",
      })
      .mockResolvedValueOnce({
        Body: body(secondBody),
        ContentLength: Buffer.byteLength(secondBody),
        ContentType: "application/json",
      });
    const store = createProductionDeletionJournalR2Store({
      bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
      client: { send },
    });

    await expect(store.listObjects({ prefix })).resolves.toEqual([
      { body: firstBody, key: firstKey },
      { body: secondBody, key: secondKey },
    ]);
    expect(send.mock.calls[0][0]).toBeInstanceOf(ListObjectsV2Command);
    expect(send.mock.calls[1][0]).toBeInstanceOf(ListObjectsV2Command);
    expect((send.mock.calls[1][0] as ListObjectsV2Command).input).toMatchObject({
      ContinuationToken: "page-2",
      Prefix: prefix,
    });
    expect(send.mock.calls[2][0]).toBeInstanceOf(GetObjectCommand);
    expect((send.mock.calls[2][0] as GetObjectCommand).input.Key).toBe(firstKey);
  });

  it("fails closed for duplicate, out-of-prefix and unsafe object metadata", async () => {
    const duplicateStore = createProductionDeletionJournalR2Store({
      bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
      client: {
        send: vi.fn().mockResolvedValue({
          Contents: [
            { Key: firstKey, Size: 10 },
            { Key: firstKey, Size: 10 },
          ],
        }),
      },
    });
    await expect(duplicateStore.listObjects({ prefix })).rejects.toThrow(/tekrar eden/);

    const driftStore = createProductionDeletionJournalR2Store({
      bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
      client: {
        send: vi.fn().mockResolvedValue({
          Contents: [
            {
              Key: `journal/v1/${"b".repeat(64)}/000000000001-event.json.enc`,
              Size: 10,
            },
          ],
        }),
      },
    });
    await expect(driftStore.listObjects({ prefix })).rejects.toThrow(/scope/);

    const metadataStore = createProductionDeletionJournalR2Store({
      bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
      client: {
        send: vi
          .fn()
          .mockResolvedValueOnce({ Contents: [{ Key: firstKey, Size: 9 }] })
          .mockResolvedValueOnce({
            Body: body("encrypted"),
            ContentLength: 9,
            ContentType: "text/plain",
          }),
      },
    });
    await expect(metadataStore.listObjects({ prefix })).rejects.toThrow(/content type/);
  });

  it("contains no delete command, logging or document/backup credential reuse", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/production-deletion-journal-r2.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/DeleteObject|console\.(log|error)/);
    expect(source).not.toMatch(/\bR2_ACCESS_KEY_ID\b|\bR2_BACKUP_/);
  });
});
