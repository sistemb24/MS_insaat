import { beforeEach, describe, expect, test, vi } from "vitest";

const revalidatePathMock = vi.hoisted(() => vi.fn());
const createDocumentStorageRuntimeMock = vi.hoisted(() => vi.fn(() => ({
  provider: "local",
  storage: { putObject: vi.fn() },
})));
const createDocumentCenterServiceMock = vi.hoisted(() => vi.fn(() => ({
  createFileMetadata: vi.fn(),
  createUserFolder: vi.fn(),
  ensureSystemFolders: vi.fn(),
  list: vi.fn(),
  moveFileToTrash: vi.fn(),
  restoreFileFromTrash: vi.fn(),
  purgeExpiredTrash: vi.fn(),
})));
const getSubscriptionFeatureActionContextMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/app/actions/subscription-feature-action-guard", () => ({
  getSubscriptionFeatureActionContext: getSubscriptionFeatureActionContextMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: vi.fn(() => ({})),
}));

vi.mock("@/lib/document-center-prisma-repository", () => ({
  createDocumentCenterPrismaRepository: vi.fn(() => ({})),
}));

vi.mock("@/lib/document-center-service", () => ({
  canMutateDocumentCenter: vi.fn(() => true),
  createDocumentCenterService: createDocumentCenterServiceMock,
  createDocumentFileDraft: vi.fn(() => ({
    ok: true,
    data: {
      file: {
        folderId: "folder-1",
        id: "file-1",
        name: "dosya.pdf",
      },
    },
  })),
}));

vi.mock("@/lib/document-storage-runtime", () => ({
  createDocumentStorageRuntime: createDocumentStorageRuntimeMock,
}));

vi.mock("@/lib/document-storage-key", () => ({
  createDocumentStorageKey: vi.fn(() => "document-center/folder-1/123-dosya-pdf"),
}));

describe("document-center-actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.NOA_DOCUMENT_STORAGE_DIR;
  });

  test("uses the shared document storage runtime port", async () => {
    await import("./document-center-actions");

    expect(createDocumentStorageRuntimeMock).toHaveBeenCalledOnce();
  });
});
