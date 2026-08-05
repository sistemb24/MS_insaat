import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  normalizeDocumentStorageKey,
  type DocumentStorage,
} from "./document-storage";

export type R2DocumentStorageConfig = {
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  secretAccessKey: string;
};

type R2Command =
  | DeleteObjectCommand
  | GetObjectCommand
  | HeadObjectCommand
  | PutObjectCommand;

export type R2ClientLike = {
  send(command: R2Command): Promise<unknown>;
};

export function createR2Client(config: R2DocumentStorageConfig): S3Client {
  return new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    region: "auto",
  });
}

export function createR2DocumentStorage({
  bucket,
  client,
}: {
  bucket: string;
  client: R2ClientLike;
}): DocumentStorage {
  return {
    async deleteObject(storageKey) {
      const safeKey = normalizeDocumentStorageKey(storageKey);

      try {
        await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: safeKey }),
        );
      } catch (error) {
        if (isMissingObjectError(error)) {
          return { deleted: false, storageKey: safeKey };
        }

        throw error;
      }

      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: safeKey }));

      return { deleted: true, storageKey: safeKey };
    },

    async putObject({ content, contentType, storageKey }) {
      const safeKey = normalizeDocumentStorageKey(storageKey);
      const bytes =
        content instanceof Uint8Array ? content : new Uint8Array(content);

      await client.send(
        new PutObjectCommand({
          Body: bytes,
          Bucket: bucket,
          ContentType: contentType,
          Key: safeKey,
        }),
      );

      return {
        absolutePath: `r2://${bucket}/${safeKey}`,
        contentType,
        sizeBytes: bytes.byteLength,
        storageKey: safeKey,
      };
    },

    async readObject(storageKey) {
      const safeKey = normalizeDocumentStorageKey(storageKey);
      const response = (await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: safeKey }),
      )) as {
        Body?: { transformToByteArray(): Promise<Uint8Array> };
        ContentLength?: number;
        ContentType?: string;
      };

      if (!response.Body) {
        throw new Error("R2 nesne gövdesi alınamadı.");
      }

      const content = await response.Body.transformToByteArray();

      return {
        content,
        contentType: response.ContentType ?? "application/octet-stream",
        sizeBytes: response.ContentLength ?? content.byteLength,
        storageKey: safeKey,
      };
    },
  };
}

function isMissingObjectError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as {
    $metadata?: { httpStatusCode?: number };
    name?: string;
  };

  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.name === "NoSuchKey" ||
    candidate.name === "NotFound"
  );
}
