import type { DocumentStorage } from "./document-storage";

export type DocumentStorageCleanupResult = {
  deletedCount: number;
  deletedStorageKeys: string[];
  failed: Array<{
    error: string;
    storageKey: string;
  }>;
  missingStorageKeys: string[];
};

export async function cleanupDocumentStorageObjects(
  storage: DocumentStorage,
  storageKeys: string[],
): Promise<DocumentStorageCleanupResult> {
  const deletedStorageKeys: string[] = [];
  const failed: DocumentStorageCleanupResult["failed"] = [];
  const missingStorageKeys: string[] = [];

  for (const storageKey of storageKeys) {
    try {
      const result = await storage.deleteObject(storageKey);

      if (result.deleted) {
        deletedStorageKeys.push(result.storageKey);
      } else {
        missingStorageKeys.push(result.storageKey);
      }
    } catch (error) {
      failed.push({
        error: error instanceof Error ? error.message : "Bilinmeyen storage hatası",
        storageKey,
      });
    }
  }

  return {
    deletedCount: deletedStorageKeys.length,
    deletedStorageKeys,
    failed,
    missingStorageKeys,
  };
}