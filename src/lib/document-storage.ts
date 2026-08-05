import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize, relative, resolve } from "node:path";

export type DocumentStoragePutInput = {
  content: ArrayBuffer | Uint8Array;
  contentType: string;
  storageKey: string;
};

export type DocumentStorageObject = {
  absolutePath: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
};

export type DocumentStorageReadObject = {
  content: Uint8Array;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
};

export type DocumentStorageDeleteObject = {
  deleted: boolean;
  storageKey: string;
};

export type DocumentStorage = {
  deleteObject(storageKey: string): Promise<DocumentStorageDeleteObject>;
  putObject(input: DocumentStoragePutInput): Promise<DocumentStorageObject>;
  readObject(storageKey: string): Promise<DocumentStorageReadObject>;
};

export type LocalDocumentStorageOptions = {
  rootDir: string;
};

export function createLocalDocumentStorage({
  rootDir,
}: LocalDocumentStorageOptions): DocumentStorage {
  const resolvedRoot = resolve(rootDir);
  const contentTypeByStorageKey = new Map<string, string>();

  return {
    async deleteObject(storageKey) {
      const safeKey = normalizeDocumentStorageKey(storageKey);
      const absolutePath = resolveStoragePath(resolvedRoot, safeKey);

      try {
        await rm(absolutePath, { force: false });
        contentTypeByStorageKey.delete(safeKey);

        return {
          deleted: true,
          storageKey: safeKey,
        };
      } catch (error) {
        if (isNodeErrorWithCode(error, "ENOENT")) {
          contentTypeByStorageKey.delete(safeKey);

          return {
            deleted: false,
            storageKey: safeKey,
          };
        }

        throw error;
      }
    },

    async putObject({ content, contentType, storageKey }) {
      const safeKey = normalizeDocumentStorageKey(storageKey);
      const absolutePath = resolveStoragePath(resolvedRoot, safeKey);
      const bytes =
        content instanceof Uint8Array ? content : new Uint8Array(content);

      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, bytes);
      contentTypeByStorageKey.set(safeKey, contentType);

      return {
        absolutePath,
        contentType,
        sizeBytes: bytes.byteLength,
        storageKey: safeKey,
      };
    },

    async readObject(storageKey) {
      const safeKey = normalizeDocumentStorageKey(storageKey);
      const absolutePath = resolveStoragePath(resolvedRoot, safeKey);
      const content = await readFile(absolutePath);

      return {
        content: new Uint8Array(content),
        contentType: contentTypeByStorageKey.get(safeKey) ?? "application/octet-stream",
        sizeBytes: content.byteLength,
        storageKey: safeKey,
      };
    },
  };
}

export function normalizeDocumentStorageKey(storageKey: string) {
  const normalizedKey = storageKey.replace(/\\/g, "/").trim();

  if (
    !normalizedKey ||
    isAbsolute(normalizedKey) ||
    normalizedKey.includes(":") ||
    normalizedKey.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Storage anahtarı güvenli değil.");
  }

  return normalizedKey;
}

function resolveStoragePath(rootDir: string, storageKey: string) {
  const absolutePath = resolve(
    join(rootDir, normalize(normalizeDocumentStorageKey(storageKey))),
  );
  const relativePath = relative(rootDir, absolutePath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("Storage anahtarı güvenli değil.");
  }

  return absolutePath;
}

function isNodeErrorWithCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}
