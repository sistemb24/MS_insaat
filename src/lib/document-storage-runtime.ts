import { join } from "node:path";

import {
  createLocalDocumentStorage,
  type DocumentStorage,
} from "./document-storage";
import {
  createR2Client,
  createR2DocumentStorage,
  type R2DocumentStorageConfig,
} from "./document-storage-r2";

export type DocumentStorageRuntime =
  | { provider: "local"; storage: DocumentStorage }
  | { provider: "r2"; storage: DocumentStorage };

type DocumentStorageRuntimeDependencies = {
  createR2Storage?: (config: R2DocumentStorageConfig) => DocumentStorage;
};

export function createDocumentStorageRuntime(
  env: Readonly<Record<string, string | undefined>> = process.env,
  dependencies: DocumentStorageRuntimeDependencies = {},
): DocumentStorageRuntime {
  const provider = env.NOA_DOCUMENT_STORAGE_PROVIDER?.trim().toLowerCase();

  if (provider === "r2") {
    const config = readR2DocumentStorageConfig(env);
    const storage =
      dependencies.createR2Storage?.(config) ??
      createR2DocumentStorage({
        bucket: config.bucket,
        client: createR2Client(config),
      });

    return { provider: "r2", storage };
  }

  if (provider && provider !== "local") {
    throw new Error(`Desteklenmeyen doküman storage sağlayıcısı: ${provider}`);
  }

  if (["staging", "production"].includes(env.NOA_RUNTIME_ENV ?? "")) {
    throw new Error(
      "Staging/production doküman storage sağlayıcısı açıkça r2 olmalıdır.",
    );
  }

  const rootDir =
    env.NOA_DOCUMENT_STORAGE_DIR ??
    join(process.cwd(), ".noa-storage", "documents");

  return {
    provider: "local",
    storage: createLocalDocumentStorage({ rootDir }),
  };
}

export function readR2DocumentStorageConfig(
  env: Readonly<Record<string, string | undefined>>,
): R2DocumentStorageConfig {
  const config = {
    accessKeyId: env.R2_ACCESS_KEY_ID?.trim() ?? "",
    bucket: env.R2_BUCKET?.trim() ?? "",
    endpoint: env.R2_ENDPOINT?.trim() ?? "",
    secretAccessKey: env.R2_SECRET_ACCESS_KEY?.trim() ?? "",
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`R2 doküman storage ayarı eksik: ${missing.join(", ")}`);
  }

  let endpoint: URL;
  try {
    endpoint = new URL(config.endpoint);
  } catch {
    throw new Error("R2 endpoint geçerli bir HTTPS URL olmalıdır.");
  }

  if (
    endpoint.protocol !== "https:" ||
    !endpoint.hostname.endsWith(".eu.r2.cloudflarestorage.com") ||
    endpoint.pathname !== "/"
  ) {
    throw new Error(
      "R2 endpoint onaylanan EU jurisdiction S3 endpoint'i olmalıdır.",
    );
  }

  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(config.bucket)) {
    throw new Error("R2 bucket adı geçerli değil.");
  }

  return config;
}
