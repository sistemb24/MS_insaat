import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createProductionDeletionJournalTemporaryCredentials,
  PRODUCTION_R2_TEMPORARY_CREDENTIAL_TTL_SECONDS,
} from "./production-r2-temporary-credentials";

const accountId = "a".repeat(32);
const endpoint = `https://${accountId}.eu.r2.cloudflarestorage.com`;
const parentAccessKeyId = "parent-access-key-001";
const parentSecretAccessKey = "parent-secret-access-key-001";

describe("production R2 temporary credential mint", () => {
  it("signs the exact Cloudflare-compatible 15-minute journal scope", async () => {
    const credentials = await createProductionDeletionJournalTemporaryCredentials({
      accountId,
      endpoint,
      issuedAt: new Date("2026-08-09T18:00:00.000Z"),
      parentAccessKeyId,
      parentSecretAccessKey,
    });
    const token = Buffer.from(credentials.sessionToken, "base64").toString("utf8");
    expect(token.startsWith("jwt/")).toBe(true);
    const jwt = token.slice(4);
    const [encodedHeader, encodedPayload, signature] = jwt.split(".");
    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));

    expect(header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(payload).toEqual({
      actions: ["GetObject", "ListObjectsV2", "PutObject"],
      aud: `${accountId}.eu.r2.cloudflarestorage.com`,
      bucket: "noa-insaat-production-deletion-journal-eu",
      exp: 1_786_299_300,
      iat: 1_786_298_400,
      iss: parentAccessKeyId,
      paths: { objectPaths: [], prefixPaths: ["journal/"] },
      scope: "object-read-write",
      sub: accountId,
    });
    expect(signature).toBe(
      createHmac("sha256", parentSecretAccessKey)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64url"),
    );
    expect(credentials).toMatchObject({
      accessKeyId: parentAccessKeyId,
      secretAccessKey: createHash("sha256").update(jwt).digest("hex"),
    });
    expect(PRODUCTION_R2_TEMPORARY_CREDENTIAL_TTL_SECONDS).toBe(900);
  });

  it("rejects account, endpoint, parent credential and time drift", async () => {
    const valid = {
      accountId,
      endpoint,
      issuedAt: new Date("2026-08-09T18:00:00.000Z"),
      parentAccessKeyId,
      parentSecretAccessKey,
    };
    await expect(
      createProductionDeletionJournalTemporaryCredentials({
        ...valid,
        accountId: "wrong",
      }),
    ).rejects.toThrow(/account/);
    await expect(
      createProductionDeletionJournalTemporaryCredentials({
        ...valid,
        endpoint: "https://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.eu.r2.cloudflarestorage.com",
      }),
    ).rejects.toThrow(/eşleşmiyor/);
    await expect(
      createProductionDeletionJournalTemporaryCredentials({
        ...valid,
        parentSecretAccessKey: "short",
      }),
    ).rejects.toThrow(/secret/);
    await expect(
      createProductionDeletionJournalTemporaryCredentials({
        ...valid,
        issuedAt: new Date("invalid"),
      }),
    ).rejects.toThrow(/zamanı/);
  });

  it("contains no delete action, secret logging or alternate JWT dependency", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/production-r2-temporary-credentials.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/DeleteObject|DeleteObjects|CopyObject|console\./);
    expect(source).toMatch(/import \{ SignJWT \} from ["']jose["']/);
    expect(source).not.toMatch(/from ["']aws4fetch["']/);
    expect(source).not.toMatch(/parentSecretAccessKey\s*[:=]\s*["'][^"']+["']/);
  });
});
