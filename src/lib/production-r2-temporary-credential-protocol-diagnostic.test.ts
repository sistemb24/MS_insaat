import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";

import {
  probeProductionR2CredentialWithAws4Fetch,
  PRODUCTION_R2_TEMPORARY_CREDENTIAL_PROTOCOL_DIAGNOSTIC_CONFIRMATION,
  readProductionR2TemporaryCredentialProtocolDiagnosticConfig,
  runProductionR2TemporaryCredentialProtocolDiagnostic,
} from "./production-r2-temporary-credential-protocol-diagnostic";
import type { ProductionR2TemporaryCredentials } from "./production-r2-temporary-credentials";

const releaseId = "5696e44d45441104d4cf25bc6e677f6b9edbe943";
const accountId = "a".repeat(32);
const endpoint = `https://${accountId}.eu.r2.cloudflarestorage.com/`;
const bucket = "noa-insaat-production-deletion-journal-eu";
const credentials: ProductionR2TemporaryCredentials = {
  accessKeyId: "temporary-access-key",
  secretAccessKey: "f".repeat(64),
  sessionToken: Buffer.from("jwt/header.payload.signature").toString("base64"),
};

describe("production R2 temporary credential protocol diagnostic", () => {
  it("requires production main, exact SHA, EU endpoint and the exact confirmation", () => {
    const env = {
      CLOUDFLARE_ACCOUNT_ID: accountId,
      NOA_EXPECTED_RELEASE_SHA: releaseId,
      NOA_PRODUCTION_R2_TEMPORARY_CREDENTIAL_PROTOCOL_DIAGNOSTIC_CONFIRMATION:
        PRODUCTION_R2_TEMPORARY_CREDENTIAL_PROTOCOL_DIAGNOSTIC_CONFIRMATION,
      NOA_RELEASE_ID: releaseId,
      NOA_RUNTIME_ENV: "production",
      NOA_SOURCE_REF: "refs/heads/main",
      PRODUCTION_DELETION_JOURNAL_R2_BUCKET: bucket,
      PRODUCTION_DELETION_JOURNAL_R2_ENDPOINT: endpoint,
      PRODUCTION_DELETION_JOURNAL_R2_PARENT_ACCESS_KEY_ID: "parent-access-key",
      PRODUCTION_DELETION_JOURNAL_R2_PARENT_SECRET_ACCESS_KEY:
        "parent-secret-access-key",
    };

    expect(
      readProductionR2TemporaryCredentialProtocolDiagnosticConfig(env),
    ).toMatchObject({ accountId, bucket, endpoint, releaseId });
    expect(() =>
      readProductionR2TemporaryCredentialProtocolDiagnosticConfig({
        ...env,
        NOA_SOURCE_REF: "refs/heads/feature",
      }),
    ).toThrow(/main/);
    expect(() =>
      readProductionR2TemporaryCredentialProtocolDiagnosticConfig({
        ...env,
        NOA_EXPECTED_RELEASE_SHA: "f".repeat(40),
      }),
    ).toThrow(/exact SHA/);
    expect(() =>
      readProductionR2TemporaryCredentialProtocolDiagnosticConfig({
        ...env,
        PRODUCTION_DELETION_JOURNAL_R2_ENDPOINT:
          `https://${accountId}.r2.cloudflarestorage.com/`,
      }),
    ).toThrow(/EU/);
  });

  it("sends one aws4fetch ListObjectsV2 request and validates the journal prefix", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        "<ListBucketResult><Contents><Key>journal/v1/example.json.enc</Key></Contents></ListBucketResult>",
        { status: 200 },
      ),
    );

    await expect(
      probeProductionR2CredentialWithAws4Fetch({
        bucket,
        client: { fetch },
        endpoint,
      }),
    ).resolves.toEqual({ credentialProbeReady: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBeInstanceOf(URL);
    expect((url as URL).origin).toBe(endpoint.slice(0, -1));
    expect((url as URL).pathname).toBe(`/${bucket}/`);
    expect((url as URL).searchParams.get("list-type")).toBe("2");
    expect((url as URL).searchParams.get("max-keys")).toBe("1");
    expect((url as URL).searchParams.get("prefix")).toBe("journal/");
    expect(init).toEqual({ method: "GET" });
  });

  it("maps aws4fetch provider failures without retaining the response message", async () => {
    await expect(
      probeProductionR2CredentialWithAws4Fetch({
        bucket,
        client: {
          fetch: vi.fn().mockResolvedValue(
            new Response(
              "<Error><Code>InvalidArgument</Code><Message>secret-session-token=must-not-leak</Message></Error>",
              { status: 400 },
            ),
          ),
        },
        endpoint,
      }),
    ).rejects.toMatchObject({
      $metadata: { httpStatusCode: 400 },
      Code: "InvalidArgument",
      message: "R2 protocol tanısı provider isteği başarısız.",
    });
  });

  it("passes the same temporary credential to both clients after the parent gate", async () => {
    const order: string[] = [];
    const aws4fetchProbe = vi.fn(async (received) => {
      order.push("aws4fetch");
      expect(received).toBe(credentials);
    });
    const awsSdkProbe = vi.fn(async (received) => {
      order.push("aws-sdk-v3");
      expect(received).toBe(credentials);
    });

    await expect(
      runProductionR2TemporaryCredentialProtocolDiagnostic({
        async createTemporaryCredentials() {
          order.push("mint");
          return credentials;
        },
        probeAws4FetchTemporaryCredential: aws4fetchProbe,
        probeAwsSdkTemporaryCredential: awsSdkProbe,
        async probeParentCredential() {
          order.push("parent");
        },
        releaseId,
      }),
    ).resolves.toEqual({
      parentCredentialProbeReady: true,
      probes: [
        { client: "aws4fetch", status: "passed" },
        { client: "aws-sdk-v3", status: "passed" },
      ],
      productionBackupDeletionReplayReady: false,
      protocolDiagnosticReady: true,
      releaseId,
    });
    expect(order).toEqual(["parent", "mint", "aws4fetch", "aws-sdk-v3"]);
  });

  it("runs both distinct client probes once and emits only a safe failure matrix", async () => {
    const rawSecret = "secret-session-token=must-not-leak";
    let error: Error | undefined;
    try {
      await runProductionR2TemporaryCredentialProtocolDiagnostic({
        async createTemporaryCredentials() {
          return credentials;
        },
        probeAws4FetchTemporaryCredential: vi.fn().mockRejectedValue(
          Object.assign(new Error(rawSecret), {
            $metadata: { httpStatusCode: 400 },
            Code: "InvalidArgument",
          }),
        ),
        probeAwsSdkTemporaryCredential: vi.fn().mockRejectedValue(
          Object.assign(new Error(rawSecret), {
            $metadata: { httpStatusCode: 403 },
            Code: "AccessDenied",
          }),
        ),
        probeParentCredential: vi.fn().mockResolvedValue(undefined),
        releaseId,
      });
    } catch (caught) {
      error = caught as Error;
    }

    expect(error?.message).toContain(
      "client=aws4fetch status=failed providerCode=InvalidArgument httpStatus=400",
    );
    expect(error?.message).toContain(
      "client=aws-sdk-v3 status=failed providerCode=AccessDenied httpStatus=403",
    );
    expect(error?.message).not.toContain(rawSecret);
  });

  it("stops before minting when the parent credential probe fails", async () => {
    const mint = vi.fn<() => Promise<ProductionR2TemporaryCredentials>>();
    const probeAws4Fetch = vi.fn();
    const probeAwsSdk = vi.fn();

    await expect(
      runProductionR2TemporaryCredentialProtocolDiagnostic({
        createTemporaryCredentials: mint,
        probeAws4FetchTemporaryCredential: probeAws4Fetch,
        probeAwsSdkTemporaryCredential: probeAwsSdk,
        probeParentCredential: vi.fn().mockRejectedValue(
          Object.assign(new Error("must-not-leak"), {
            $metadata: { httpStatusCode: 403 },
            Code: "AccessDenied",
          }),
        ),
        releaseId,
      }),
    ).rejects.toThrow(
      "phase=parent-credential-probe providerCode=AccessDenied httpStatus=403",
    );
    expect(mint).not.toHaveBeenCalled();
    expect(probeAws4Fetch).not.toHaveBeenCalled();
    expect(probeAwsSdk).not.toHaveBeenCalled();
  });

  it("documents the AWS SDK default virtual-host addressing divergence", async () => {
    let capturedRequest:
      | { hostname: string; path: string }
      | undefined;
    const requestHandler = {
      async handle(request: { hostname: string; path: string }) {
        capturedRequest = request;
        return {
          response: {
            body: Buffer.from(
              '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><KeyCount>0</KeyCount><MaxKeys>1</MaxKeys><IsTruncated>false</IsTruncated></ListBucketResult>',
            ),
            headers: { "content-type": "application/xml" },
            statusCode: 200,
          },
        };
      },
    };
    const client = new S3Client({
      credentials,
      endpoint,
      maxAttempts: 1,
      region: "auto",
      requestHandler: requestHandler as never,
    });

    await client.send(
      new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1, Prefix: "journal/" }),
    );

    expect(capturedRequest?.hostname).toBe(
      `${bucket}.${accountId}.eu.r2.cloudflarestorage.com`,
    );
    expect(capturedRequest?.path).toBe("/");
  });

  it("proves AWS SDK v3 preserves and signs the session token byte-for-byte", async () => {
    let capturedRequest:
      | { headers: Record<string, string>; method: string; path: string }
      | undefined;
    const requestHandler = {
      async handle(request: {
        headers: Record<string, string>;
        method: string;
        path: string;
      }) {
        capturedRequest = request;
        return {
          response: {
            body: Buffer.from(
              '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><KeyCount>0</KeyCount><MaxKeys>1</MaxKeys><IsTruncated>false</IsTruncated></ListBucketResult>',
            ),
            headers: { "content-type": "application/xml" },
            statusCode: 200,
          },
        };
      },
    };
    const client = new S3Client({
      credentials,
      endpoint,
      forcePathStyle: true,
      maxAttempts: 1,
      region: "auto",
      requestHandler: requestHandler as never,
    });

    await client.send(
      new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1, Prefix: "journal/" }),
    );

    expect(capturedRequest?.headers["x-amz-security-token"]).toBe(
      credentials.sessionToken,
    );
    expect(capturedRequest?.headers.authorization).toContain(
      "x-amz-security-token",
    );
    expect(capturedRequest?.method).toBe("GET");
    expect(capturedRequest?.path).toBe(`/${bucket}/`);
  });

  it("keeps the diagnostic manual, read-only, no-retry and secret-safe", () => {
    const workflow = readFileSync(
      resolve(
        process.cwd(),
        ".github/workflows/production-r2-temp-credential-protocol-diagnostic.yml",
      ),
      "utf8",
    );
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/lib/production-r2-temporary-credential-protocol-diagnostic.ts",
      ),
      "utf8",
    );
    const script = readFileSync(
      resolve(
        process.cwd(),
        "scripts/diagnose-production-r2-temporary-credential-protocol.ts",
      ),
      "utf8",
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("inputs.expected_sha == github.sha");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(source).toContain("maxAttempts: 1");
    expect(source).toContain("forcePathStyle: true");
    expect(source).toContain("retries: 0");
    expect(source).toContain('service: "s3"');
    expect(source).toContain('url.searchParams.set("max-keys", "1")');
    expect(source).toContain(
      'url.searchParams.set("prefix", PRODUCTION_DELETION_JOURNAL_CREDENTIAL_PROBE_PREFIX)',
    );
    expect(`${workflow}\n${source}\n${script}`).not.toMatch(
      /PutObject|DeleteObject|DeleteObjects|CopyObject|DATABASE_URL|PREFLIGHT_KEK|artifact/,
    );
    expect(`${source}\n${script}`).not.toMatch(/console\.(error|warn)/);
  });
});
