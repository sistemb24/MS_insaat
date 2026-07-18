/**
 * @vitest-environment jsdom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  listDocumentSystemFolders,
  type DocumentFileRow,
} from "@/lib/document-center-service";

import { DocumentCenterSurface } from "./document-center-surface";

afterEach(() => {
  cleanup();
});

describe("DocumentCenterSurface", () => {
  test("renders the protected system folder workflow from the P1 plan", () => {
    render(<DocumentCenterSurface folders={listDocumentSystemFolders()} />);

    expect(screen.getByText("Döküman / Evrak Merkezi")).toBeTruthy();
    expect(screen.getByText("0 MB / 5 GB")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yeni Klasör" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dosya Yükle" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "+5GB · ₺790/ay" })).toBeTruthy();

    const tabs = screen.getByLabelText("Döküman sekmeleri");
    expect(within(tabs).getByRole("button", { name: "Dosyalarım" })).toBeTruthy();
    expect(within(tabs).getByRole("button", { name: "Yıldızlı" })).toBeTruthy();
    expect(within(tabs).getByRole("button", { name: "Son Kullanılan" })).toBeTruthy();
    expect(within(tabs).getByRole("button", { name: "Çöp Kutusu" })).toBeTruthy();

    const filters = screen.getByLabelText("Dosya türü filtreleri");
    expect(within(filters).getByRole("button", { name: "Tümü" })).toBeTruthy();
    expect(within(filters).getByRole("button", { name: "Resimler" })).toBeTruthy();
    expect(within(filters).getByRole("button", { name: "PDF" })).toBeTruthy();
    expect(within(filters).getByRole("button", { name: "Dökümanlar" })).toBeTruthy();
    expect(within(filters).getByRole("button", { name: "Tablolar" })).toBeTruthy();

    expect(screen.getByText("Sözleşmeler")).toBeTruthy();
    expect(screen.getAllByText("SİSTEM")).toHaveLength(13);
    const protectedDeleteAction = screen.getByRole("button", {
      name: "Sözleşmeler sistem klasörü silinemez",
    }) as HTMLButtonElement;

    expect(protectedDeleteAction.disabled).toBe(true);
  });

  test("switches between grid and list folder views without losing system badges", () => {
    render(<DocumentCenterSurface folders={listDocumentSystemFolders()} />);

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    const table = screen.getByRole("table", { name: "Döküman klasör listesi" });
    expect(within(table).getByText("Ad")).toBeTruthy();
    expect(within(table).getByText("Etiketler")).toBeTruthy();
    expect(within(table).getByText("Boyut")).toBeTruthy();
    expect(within(table).getByText("Tarih")).toBeTruthy();
    expect(within(table).getByText("Oluşturan")).toBeTruthy();
    expect(within(table).getByText("Sözleşmeler")).toBeTruthy();
    expect(within(table).getAllByText("SİSTEM")).toHaveLength(13);
  });

  test("renders list folder dates from persisted ISO timestamps", () => {
    const [firstFolder] = listDocumentSystemFolders();

    render(
      <DocumentCenterSurface
        folders={[
          {
            ...firstFolder!,
            createdAt: "2026-07-01T10:00:00.000Z",
            id: "persisted-folder",
            name: "Kalıcı Evraklar",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    const table = screen.getByRole("table", { name: "Döküman klasör listesi" });

    expect(within(table).getByText("Kalıcı Evraklar")).toBeTruthy();
    expect(within(table).getByText("01.07.2026")).toBeTruthy();
  });

  test("creates a user folder with selected access level from the toolbar", () => {
    render(<DocumentCenterSurface folders={listDocumentSystemFolders()} />);

    fireEvent.click(screen.getByRole("button", { name: "Yeni Klasör" }));
    fireEvent.change(screen.getByLabelText("Klasör adı"), {
      target: { value: "Proje Evrakları" },
    });
    fireEvent.change(screen.getByLabelText("Erişim"), {
      target: { value: "restricted" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Klasör Oluştur" }));

    expect(screen.getByText("Proje Evrakları")).toBeTruthy();
    expect(screen.getByText("Belirli kullanıcı/rol")).toBeTruthy();
    expect(screen.getByText("14")).toBeTruthy();

    const deleteAction = screen.getByRole("button", {
      name: "Proje Evrakları klasörünü sil",
    }) as HTMLButtonElement;

    expect(deleteAction.disabled).toBe(false);
    expect(screen.getByRole("status").textContent).toContain(
      "Proje Evrakları klasörü oluşturuldu.",
    );
  });

  test("persists a user folder when folder persistence is provided", async () => {
    const createFolder = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        folder: {
          ...listDocumentSystemFolders()[0]!,
          accessLevel: "restricted",
          canDelete: true,
          canRename: true,
          createdAt: "2026-07-01T10:00:00.000Z",
          createdBy: "user-main",
          id: "tenant::folder::proje-evraklari",
          isSystem: false,
          name: "Proje Evrakları",
          purpose: "Belirli kullanıcı/rol erişimli kullanıcı klasörü",
          systemKey: undefined,
          updatedAt: "2026-07-01T10:00:00.000Z",
          updatedBy: "user-main",
        },
      },
    });

    render(
      <DocumentCenterSurface
        folders={listDocumentSystemFolders()}
        persistence={{ createFolder }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni Klasör" }));
    fireEvent.change(screen.getByLabelText("Klasör adı"), {
      target: { value: "Proje Evrakları" },
    });
    fireEvent.change(screen.getByLabelText("Erişim"), {
      target: { value: "restricted" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Klasör Oluştur" }));

    await waitFor(() => {
      expect(createFolder).toHaveBeenCalledWith({
        accessLevel: "restricted",
        name: "Proje Evrakları",
      });
    });

    expect(await screen.findByText("Proje Evrakları")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Proje Evrakları klasörü oluşturuldu.",
    );
  });

  test("uploads a file draft with the button flow and updates folder storage counters", () => {
    render(<DocumentCenterSurface folders={listDocumentSystemFolders()} />);

    fireEvent.click(screen.getByRole("button", { name: "Dosya Yükle" }));
    fireEvent.change(screen.getByLabelText("Dosya Seç"), {
      target: {
        files: [
          new File(["hakedis"], "hakediş-raporu.pdf", {
            lastModified: 1_782_883_200_000,
            type: "application/pdf",
          }),
        ],
      },
    });

    expect(screen.getByText("hakediş-raporu.pdf")).toBeTruthy();
    const fileTable = screen.getByRole("table", { name: "Yüklenen dosya listesi" });
    expect(within(fileTable).getByText("PDF")).toBeTruthy();
    expect(within(fileTable).getByText("Metaveri")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "hakediş-raporu.pdf dosyası yüklendi.",
    );
  });

  test("uploads a dropped file through the same document upload flow", async () => {
    render(<DocumentCenterSurface folders={listDocumentSystemFolders()} />);

    fireEvent.click(screen.getByRole("button", { name: "Dosya Yükle" }));
    fireEvent.drop(screen.getByLabelText("Dosya sürükle bırak alanı"), {
      dataTransfer: {
        files: [
          new File(["metraj"], "metraj-tablosu.xlsx", {
            lastModified: 1_782_883_200_000,
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        ],
      },
    });

    expect(await screen.findByText("metraj-tablosu.xlsx")).toBeTruthy();
    const fileTable = screen.getByRole("table", { name: "Yüklenen dosya listesi" });
    expect(within(fileTable).getByText("Tablo")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "metraj-tablosu.xlsx dosyası yüklendi.",
    );
  });

  test("filters uploaded files by selected file type", () => {
    const folders = listDocumentSystemFolders();
    const contractsFolder = folders.find((folder) => folder.name === "Sözleşmeler");
    const materialsFolder = folders.find((folder) => folder.name === "Malzemeler");
    const initialFiles: DocumentFileRow[] = [
      {
        createdAt: "2026-07-01",
        createdBy: "Ana Kullanıcı",
        extension: "pdf",
        folderId: contractsFolder?.id ?? "system-contracts",
        id: "file-hakedis-pdf",
        kind: "pdf",
        lastModified: 1_782_883_200_000,
        mimeType: "application/pdf",
        name: "hakediş-raporu.pdf",
        sizeBytes: 1024,
      },
      {
        createdAt: "2026-07-01",
        createdBy: "Ana Kullanıcı",
        extension: "xlsx",
        folderId: materialsFolder?.id ?? "system-materials",
        id: "file-metraj-xlsx",
        kind: "spreadsheet",
        lastModified: 1_782_883_200_001,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        name: "metraj-tablosu.xlsx",
        sizeBytes: 2048,
      },
    ];

    render(
      <DocumentCenterSurface folders={folders} initialFiles={initialFiles} />,
    );

    expect(screen.getByText("hakediş-raporu.pdf")).toBeTruthy();
    expect(screen.getByText("metraj-tablosu.xlsx")).toBeTruthy();

    const filters = screen.getByLabelText("Dosya türü filtreleri");

    fireEvent.click(within(filters).getByRole("button", { name: "PDF" }));

    expect(screen.getByText("hakediş-raporu.pdf")).toBeTruthy();
    expect(screen.queryByText("metraj-tablosu.xlsx")).toBeNull();

    fireEvent.click(within(filters).getByRole("button", { name: "Tablolar" }));

    expect(screen.queryByText("hakediş-raporu.pdf")).toBeNull();
    expect(screen.getByText("metraj-tablosu.xlsx")).toBeTruthy();
  });

  test("filters uploaded files by storage visibility", () => {
    const folders = listDocumentSystemFolders();
    const contractsFolder = folders.find((folder) => folder.name === "Sözleşmeler");
    const materialsFolder = folders.find((folder) => folder.name === "Malzemeler");
    const initialFiles: DocumentFileRow[] = [
      {
        createdAt: "2026-07-01",
        createdBy: "Ana Kullanıcı",
        extension: "pdf",
        folderId: contractsFolder?.id ?? "system-contracts",
        id: "file-local-pdf",
        kind: "pdf",
        lastModified: 1_782_883_200_000,
        mimeType: "application/pdf",
        name: "yerel-depo-faturasi.pdf",
        sizeBytes: 1024,
        storageKey: "document-center/system-contracts/1782883200000-yerel-depo-faturasi-pdf",
      },
      {
        createdAt: "2026-07-01",
        createdBy: "Ana Kullanıcı",
        extension: "pdf",
        folderId: materialsFolder?.id ?? "system-materials",
        id: "file-meta-pdf",
        kind: "pdf",
        lastModified: 1_782_883_200_001,
        mimeType: "application/pdf",
        name: "metaveri-raporu.pdf",
        sizeBytes: 2048,
      },
    ];

    render(
      <DocumentCenterSurface folders={folders} initialFiles={initialFiles} />,
    );

    const filters = screen.getByLabelText("Depo görünürlüğü filtreleri");

    fireEvent.click(within(filters).getByRole("button", { name: "Yerel Depo" }));

    expect(screen.getByText("yerel-depo-faturasi.pdf")).toBeTruthy();
    expect(screen.queryByText("metaveri-raporu.pdf")).toBeNull();

    fireEvent.click(within(filters).getByRole("button", { name: "Metaveri" }));

    expect(screen.queryByText("yerel-depo-faturasi.pdf")).toBeNull();
    expect(screen.getByText("metaveri-raporu.pdf")).toBeTruthy();
  });

  test("shows an empty state when the selected file type has no matches", () => {
    const folders = listDocumentSystemFolders();
    const contractsFolder = folders.find((folder) => folder.name === "Sözleşmeler");
    const initialFiles: DocumentFileRow[] = [
      {
        createdAt: "2026-07-01",
        createdBy: "Ana Kullanıcı",
        extension: "pdf",
        folderId: contractsFolder?.id ?? "system-contracts",
        id: "file-hakedis-pdf",
        kind: "pdf",
        lastModified: 1_782_883_200_000,
        mimeType: "application/pdf",
        name: "hakediş-raporu.pdf",
        sizeBytes: 1024,
      },
    ];

    render(
      <DocumentCenterSurface folders={folders} initialFiles={initialFiles} />,
    );

    const filters = screen.getByLabelText("Dosya türü filtreleri");

    fireEvent.click(within(filters).getByRole("button", { name: "Resimler" }));

    expect(screen.queryByText("hakediş-raporu.pdf")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain(
      "Seçili filtrelere uygun evrak bulunamadı.",
    );
  });

  test("moves a file to the trash tab from the uploaded file table", () => {
    const folders = listDocumentSystemFolders();
    const contractsFolder = folders.find((folder) => folder.name === "Sözleşmeler");
    const initialFiles: DocumentFileRow[] = [
      {
        createdAt: "2026-07-01",
        createdBy: "Ana Kullanıcı",
        extension: "pdf",
        folderId: contractsFolder?.id ?? "system-contracts",
        id: "file-hakedis-pdf",
        kind: "pdf",
        lastModified: 1_782_883_200_000,
        mimeType: "application/pdf",
        name: "hakediş-raporu.pdf",
        sizeBytes: 1024,
      },
    ];

    render(
      <DocumentCenterSurface folders={folders} initialFiles={initialFiles} />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "hakediş-raporu.pdf dosyasını çöp kutusuna taşı",
      }),
    );

    expect(screen.queryByText("hakediş-raporu.pdf")).toBeNull();
    expect(
      screen
        .getAllByRole("status")
        .map((element) => element.textContent)
        .join(" "),
    ).toContain(
      "hakediş-raporu.pdf çöp kutusuna taşındı.",
    );

    const tabs = screen.getByLabelText("Döküman sekmeleri");

    fireEvent.click(within(tabs).getByRole("button", { name: "Çöp Kutusu" }));

    expect(
      screen.getByText("Çöp kutusundaki dosyalar 30 gün sonra kalıcı olarak silinir."),
    ).toBeTruthy();
    expect(screen.getByText("hakediş-raporu.pdf")).toBeTruthy();
  });


  test("persists a move-to-trash action when persistence is provided", async () => {
    const folders = listDocumentSystemFolders();
    const contractsFolder = folders.find((folder) => folder.name === "Sözleşmeler");
    const initialFiles: DocumentFileRow[] = [
      {
        createdAt: "2026-07-01",
        createdBy: "Ana Kullanıcı",
        extension: "pdf",
        folderId: contractsFolder?.id ?? "system-contracts",
        id: "file-hakedis-pdf",
        kind: "pdf",
        lastModified: 1_782_883_200_000,
        mimeType: "application/pdf",
        name: "hakediş-raporu.pdf",
        sizeBytes: 1024,
      },
    ];
    const moveFileToTrash = vi.fn(async () => ({
      ok: true as const,
      data: {
        file: {
          ...initialFiles[0],
          deletedAt: "2026-07-01T10:15:00.000Z",
        },
      },
    }));

    render(
      <DocumentCenterSurface
        folders={folders}
        initialFiles={initialFiles}
        persistence={{
          moveFileToTrash,
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "hakediş-raporu.pdf dosyasını çöp kutusuna taşı",
      }),
    );

    await waitFor(() => expect(moveFileToTrash).toHaveBeenCalledWith("file-hakedis-pdf"));
    expect(screen.queryByText("hakediş-raporu.pdf")).toBeNull();
  });

  test("renders server-provided trashed files only in the trash tab", () => {
    const folders = listDocumentSystemFolders();
    const contractsFolder = folders.find((folder) => folder.name === "Sözleşmeler");
    const initialTrashedFiles: DocumentFileRow[] = [
      {
        createdAt: "2026-07-01",
        createdBy: "Ana Kullanıcı",
        deletedAt: "2026-07-01T10:15:00.000Z",
        extension: "pdf",
        folderId: contractsFolder?.id ?? "system-contracts",
        id: "file-hakedis-pdf",
        kind: "pdf",
        lastModified: 1_782_883_200_000,
        mimeType: "application/pdf",
        name: "hakediş-raporu.pdf",
        sizeBytes: 1024,
      },
    ];

    render(
      <DocumentCenterSurface
        folders={folders}
        initialTrashedFiles={initialTrashedFiles}
      />,
    );

    expect(screen.queryByText("hakediş-raporu.pdf")).toBeNull();

    const tabs = screen.getByLabelText("Döküman sekmeleri");

    fireEvent.click(within(tabs).getByRole("button", { name: "Çöp Kutusu" }));

    expect(screen.getByText("hakediş-raporu.pdf")).toBeTruthy();
  });

  test("persists a restore action from the trash tab when persistence is provided", async () => {
    const folders = listDocumentSystemFolders();
    const contractsFolder = folders.find((folder) => folder.name === "Sözleşmeler");
    const initialTrashedFiles: DocumentFileRow[] = [
      {
        createdAt: "2026-07-01",
        createdBy: "Ana Kullanıcı",
        deletedAt: "2026-07-01T10:15:00.000Z",
        extension: "pdf",
        folderId: contractsFolder?.id ?? "system-contracts",
        id: "file-hakedis-pdf",
        kind: "pdf",
        lastModified: 1_782_883_200_000,
        mimeType: "application/pdf",
        name: "hakediş-raporu.pdf",
        sizeBytes: 1024,
      },
    ];
    const restoreFileFromTrash = vi.fn(async () => ({
      ok: true as const,
      data: {
        file: {
          ...initialTrashedFiles[0],
          deletedAt: undefined,
          updatedAt: "2026-07-01T10:20:00.000Z",
        },
      },
    }));

    render(
      <DocumentCenterSurface
        folders={folders}
        initialTrashedFiles={initialTrashedFiles}
        persistence={{
          restoreFileFromTrash,
        }}
      />,
    );

    const tabs = screen.getByLabelText("Döküman sekmeleri");

    fireEvent.click(within(tabs).getByRole("button", { name: "Çöp Kutusu" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "hakediş-raporu.pdf dosyasını çöp kutusundan geri al",
      }),
    );

    await waitFor(() =>
      expect(restoreFileFromTrash).toHaveBeenCalledWith("file-hakedis-pdf"),
    );
    expect(screen.queryByText("hakediş-raporu.pdf")).toBeNull();

    fireEvent.click(within(tabs).getByRole("button", { name: "Dosyalarım" }));

    expect(screen.getByText("hakediş-raporu.pdf")).toBeTruthy();
  });
  test("persists selected file metadata through the server action when persistence is provided", async () => {
    const folders = listDocumentSystemFolders();
    const contractsFolder = folders.find((folder) => folder.name === "Sözleşmeler");
    const persistedFile: DocumentFileRow = {
      companyId: "company-demo-insaat",
      createdAt: "2026-07-01T10:00:00.000Z",
      createdBy: "user-main",
      extension: "pdf",
      folderId: contractsFolder?.id ?? "system-contracts",
      id: "persisted-file-1",
      kind: "pdf",
      lastModified: 1_782_883_200_000,
      mimeType: "application/pdf",
      name: "hakediş-raporu.pdf",
      periodId: "period-2026",
      sizeBytes: 7,
      storageKey:
        "document-center/system-contracts/1782883200000-hakedis-raporu-pdf",
      tenantId: "tenant-noa-demo",
      updatedAt: "2026-07-01T10:00:00.000Z",
      updatedBy: "user-main",
    };
    const createFileMetadata = vi.fn(async () => ({
      ok: true as const,
      data: {
        file: persistedFile,
      },
    }));

    render(
      <DocumentCenterSurface
        folders={folders}
        persistence={{
          createFileMetadata,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dosya Yükle" }));
    fireEvent.change(screen.getByLabelText("Dosya Seç"), {
      target: {
        files: [
          new File(["hakedis"], "hakediş-raporu.pdf", {
            lastModified: 1_782_883_200_000,
            type: "application/pdf",
          }),
        ],
      },
    });

    await waitFor(() =>
      expect(createFileMetadata).toHaveBeenCalledWith(
        {
          file: expect.objectContaining({
            name: "hakediş-raporu.pdf",
            size: 7,
            type: "application/pdf",
          }),
          folderId: contractsFolder?.id,
        },
        "document-center/system-contracts/1782883200000-hakedis-raporu-pdf",
      ),
    );
    expect(screen.getByText("hakediş-raporu.pdf")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "hakediş-raporu.pdf dosyası yüklendi.",
    );
  });

  test("sends selected module record link with uploaded file content", async () => {
    const folders = listDocumentSystemFolders();
    const contractsFolder = folders.find((folder) => folder.name === "Sözleşmeler");
    let capturedFormData: FormData | undefined;
    const persistedFile: DocumentFileRow = {
      companyId: "company-demo-insaat",
      createdAt: "2026-07-01T10:00:00.000Z",
      createdBy: "user-main",
      extension: "pdf",
      folderId: contractsFolder?.id ?? "system-contracts",
      id: "persisted-file-1",
      kind: "pdf",
      lastModified: 1_782_883_200_000,
      linkedModule: "faturalar",
      linkedRecordId: "FAT-0001",
      linkedRecordLabel: "FAT-0001 - ABC Beton",
      mimeType: "application/pdf",
      name: "fatura.pdf",
      periodId: "period-2026",
      sizeBytes: 6,
      storageKey: "document-center/system-contracts/1782883200000-fatura-pdf",
      tenantId: "tenant-noa-demo",
      updatedAt: "2026-07-01T10:00:00.000Z",
      updatedBy: "user-main",
    };
    const createFile = vi.fn(async (formData: FormData) => {
      capturedFormData = formData;

      return {
        ok: true as const,
        data: {
          file: persistedFile,
        },
      };
    });

    render(
      <DocumentCenterSurface
        folders={folders}
        persistence={{
          createFile,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dosya Yükle" }));
    fireEvent.change(screen.getByLabelText("Bağlı Modül"), {
      target: { value: "faturalar" },
    });
    fireEvent.change(screen.getByLabelText("Evrak No / Kayıt"), {
      target: { value: "FAT-0001 - ABC Beton" },
    });
    fireEvent.change(screen.getByLabelText("Dosya Seç"), {
      target: {
        files: [
          new File(["fatura"], "fatura.pdf", {
            lastModified: 1_782_883_200_000,
            type: "application/pdf",
          }),
        ],
      },
    });

    await waitFor(() => expect(createFile).toHaveBeenCalledOnce());
    expect(capturedFormData?.get("linkedModule")).toBe("faturalar");
    expect(capturedFormData?.get("linkedRecordLabel")).toBe("FAT-0001 - ABC Beton");
    expect(screen.getByText("Faturalar · FAT-0001 - ABC Beton")).toBeTruthy();
  });

  test("renders uploaded file source record links as navigable module anchors", () => {
    const folders = listDocumentSystemFolders();
    const contractsFolder = folders.find((folder) => folder.name === "Sözleşmeler");
    const initialFiles: DocumentFileRow[] = [
      {
        createdAt: "2026-07-01T10:00:00.000Z",
        createdBy: "user-main",
        extension: "pdf",
        folderId: contractsFolder?.id ?? "system-contracts",
        id: "linked-file-1",
        kind: "pdf",
        lastModified: 1_782_883_200_000,
        linkedModule: "faturalar",
        linkedRecordId: "FAT-0001",
        linkedRecordLabel: "FAT-0001 - ABC Beton",
        mimeType: "application/pdf",
        name: "fatura.pdf",
        sizeBytes: 6,
        storageKey: "document-center/system-contracts/1782883200000-fatura-pdf",
      },
    ];

    render(
      <DocumentCenterSurface folders={folders} initialFiles={initialFiles} />,
    );

    const link = screen.getByRole("link", {
      name: "Faturalar · FAT-0001 - ABC Beton",
    });

    expect(link.getAttribute("href")).toBe(
      "/faturalar?evrak=FAT-0001+-+ABC+Beton",
    );
    expect(
      screen.getByRole("link", { name: "Dosyayı İndir fatura.pdf" }).getAttribute("href"),
    ).toBe("/api/dokuman-merkezi/indirme?fileId=linked-file-1");
    expect(within(screen.getByRole("table", { name: "Yüklenen dosya listesi" })).getByText("Yerel Depo")).toBeTruthy();
  });

  test("persists selected file content through a FormData server action", async () => {
    const folders = listDocumentSystemFolders();
    const contractsFolder = folders.find((folder) => folder.name === "Sözleşmeler");
    let capturedFormData: FormData | undefined;
    const persistedFile: DocumentFileRow = {
      companyId: "company-demo-insaat",
      createdAt: "2026-07-01T10:00:00.000Z",
      createdBy: "user-main",
      extension: "pdf",
      folderId: contractsFolder?.id ?? "system-contracts",
      id: "persisted-file-1",
      kind: "pdf",
      lastModified: 1_782_883_200_000,
      mimeType: "application/pdf",
      name: "hakediş-raporu.pdf",
      periodId: "period-2026",
      sizeBytes: 7,
      storageKey:
        "document-center/system-contracts/1782883200000-hakedis-raporu-pdf",
      tenantId: "tenant-noa-demo",
      updatedAt: "2026-07-01T10:00:00.000Z",
      updatedBy: "user-main",
    };
    const createFile = vi.fn(async (formData: FormData) => {
      capturedFormData = formData;

      return {
        ok: true as const,
        data: {
          file: persistedFile,
        },
      };
    });

    render(
      <DocumentCenterSurface
        folders={folders}
        persistence={{
          createFile,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dosya Yükle" }));
    fireEvent.change(screen.getByLabelText("Dosya Seç"), {
      target: {
        files: [
          new File(["hakedis"], "hakediş-raporu.pdf", {
            lastModified: 1_782_883_200_000,
            type: "application/pdf",
          }),
        ],
      },
    });

    await waitFor(() => expect(createFile).toHaveBeenCalledOnce());
    expect(capturedFormData?.get("folderId")).toBe(contractsFolder?.id);
    const uploadedFile = capturedFormData?.get("file");

    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe("hakediş-raporu.pdf");
    await expect((uploadedFile as File).text()).resolves.toBe("hakedis");
    expect(screen.getByRole("status").textContent).toContain(
      "hakediş-raporu.pdf dosyası yüklendi.",
    );
  });

  test("rejects an uploaded file larger than 5MB", () => {
    render(<DocumentCenterSurface folders={listDocumentSystemFolders()} />);

    fireEvent.click(screen.getByRole("button", { name: "Dosya Yükle" }));
    fireEvent.change(screen.getByLabelText("Dosya Seç"), {
      target: {
        files: [
          new File([new Uint8Array(5 * 1024 * 1024 + 1)], "buyuk-metraj.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        ],
      },
    });

    expect(screen.getByRole("status").textContent).toContain(
      "Dosya boyutu 5MB sınırını aşamaz.",
    );
    expect(screen.queryByText("buyuk-metraj.xlsx")).toBeNull();
  });
});


