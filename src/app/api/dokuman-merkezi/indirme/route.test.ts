import { beforeEach, describe, expect, test, vi } from "vitest";

const getActiveTenantScopeMock = vi.hoisted(() => vi.fn());
const listFilesMock = vi.hoisted(() => vi.fn());
const readObjectMock = vi.hoisted(() => vi.fn());
const createDocumentCenterPrismaRepositoryMock = vi.hoisted(() =>
  vi.fn(() => ({
    listFiles: listFilesMock,
  })),
);
const createLocalDocumentStorageMock = vi.hoisted(() =>
  vi.fn(() => ({
    readObject: readObjectMock,
  })),
);

vi.mock("@/lib/server-active-scope", () => ({
  getActiveTenantScope: getActiveTenantScopeMock,
}));

vi.mock("@/lib/document-center-prisma-repository", () => ({
  createDocumentCenterPrismaRepository:
    createDocumentCenterPrismaRepositoryMock,
}));

vi.mock("@/lib/document-storage", () => ({
  createLocalDocumentStorage: createLocalDocumentStorageMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

describe("document download route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getActiveTenantScopeMock.mockResolvedValue({
      companyId: "company-demo-insaat",
      companyName: "NOA İnşaat",
      licenseLabel: "Kurumsal",
      periodId: "period-2026",
      periodLabel: "2026",
      tenantId: "tenant-noa-demo",
      tenantName: "NOA Demo",
      userId: "user-main",
      userName: "Ana Kullanıcı",
      userRole: "admin",
    });
  });

  test("streams a stored document as an attachment download", async () => {
    listFilesMock.mockResolvedValue([
      {
        createdAt: "2026-07-01T10:00:00.000Z",
        createdBy: "user-main",
        extension: "pdf",
        folderId: "system-contracts",
        id: "file-1",
        kind: "pdf",
        lastModified: 1_782_883_200_000,
        mimeType: "application/pdf",
        name: "fatura.pdf",
        sizeBytes: 6,
        storageKey: "document-center/system-contracts/1782883200000-fatura-pdf",
      },
    ]);
    readObjectMock.mockResolvedValue({
      content: new TextEncoder().encode("fatura"),
      contentType: "application/pdf",
      sizeBytes: 6,
      storageKey: "document-center/system-contracts/1782883200000-fatura-pdf",
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/dokuman-merkezi/indirme?fileId=file-1"),
    );

    expect(getActiveTenantScopeMock).toHaveBeenCalledOnce();
    expect(listFilesMock).toHaveBeenCalledWith({
      scope: expect.objectContaining({ tenantId: "tenant-noa-demo" }),
    });
    expect(readObjectMock).toHaveBeenCalledWith(
      "document-center/system-contracts/1782883200000-fatura-pdf",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="fatura.pdf"',
    );
    await expect(response.text()).resolves.toBe("fatura");
  });

  test("rejects missing file identifiers", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/dokuman-merkezi/indirme"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errors: ["Dosya seçimi zorunludur."],
      ok: false,
    });
  });
});
