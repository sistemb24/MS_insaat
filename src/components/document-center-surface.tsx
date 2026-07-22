"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  createDocumentFileDraft,
  createDocumentUserFolder,
  insertDocumentFileIntoFolder,
  summarizeDocumentCenter,
  type DocumentCenterResult,
  type DocumentFileKind,
  type DocumentFileRow,
  type DocumentFolderColor,
  type DocumentFolderRow,
  type DocumentFileMetadataCreateValues,
  type DocumentUserFolderCreateValues,
} from "@/lib/document-center-service";
import { createDocumentStorageKey } from "@/lib/document-storage-key";

type DocumentCenterSurfaceProps = {
  folders: DocumentFolderRow[];
  initialFiles?: DocumentFileRow[];
  initialTrashedFiles?: DocumentFileRow[];
  persistence?: {
    createFile?: (
      formData: FormData,
    ) => Promise<DocumentCenterResult<{ file: DocumentFileRow }>>;
    createFileMetadata?: (
      values: DocumentFileMetadataCreateValues,
      storageKey: string,
    ) => Promise<DocumentCenterResult<{ file: DocumentFileRow }>>;
    createFolder?: (
      values: DocumentUserFolderCreateValues,
    ) => Promise<DocumentCenterResult<{ folder: DocumentFolderRow }>>;
    deleteFolder?: (
      folderId: string,
    ) => Promise<DocumentCenterResult<{ folderId: string }>>;
    renameFolder?: (
      folderId: string,
      name: string,
    ) => Promise<DocumentCenterResult<{ folder: DocumentFolderRow }>>;
    moveFileToTrash?: (
      fileId: string,
    ) => Promise<DocumentCenterResult<{ file: DocumentFileRow }>>;
    restoreFileFromTrash?: (
      fileId: string,
    ) => Promise<DocumentCenterResult<{ file: DocumentFileRow }>>;
    renameFile?: (
      fileId: string,
      name: string,
    ) => Promise<DocumentCenterResult<{ file: DocumentFileRow }>>;
  };
};

const tabs = ["Dosyalarım", "Yıldızlı", "Son Kullanılan", "Çöp Kutusu"];
const fileTypeFilters = ["Tümü", "Resimler", "PDF", "Dökümanlar", "Tablolar"];
const storageVisibilityFilters = ["Tümü", "Yerel Depo", "Metaveri"];
const linkedModuleOptions = [
  { label: "Bağlantı yok", value: "" },
  { label: "Faturalar", value: "faturalar" },
  { label: "Giderler", value: "giderler" },
  { label: "Hakediş", value: "hakedis" },
  { label: "İhale", value: "ihale-yonetimi" },
  { label: "Kasa/Banka", value: "kasa-banka" },
  { label: "Personel", value: "personel" },
  { label: "Puantaj", value: "puantaj" },
  { label: "Şantiyeler", value: "santiyeler" },
];

const folderColorClass: Record<DocumentFolderColor, string> = {
  Gri: "border-divider bg-surface-muted text-content-subtle",
  Kırmızı: "border-danger bg-danger-subtle text-danger",
  Lacivert: "border-info bg-info-subtle text-info",
  Mavi: "border-info bg-brand-primary/5 text-brand-primary",
  Mor: "border-accent-violet bg-accent-violet-subtle text-accent-violet",
  Sarı: "border-warning bg-warning-subtle text-warning",
  Turuncu: "border-accent-orange bg-accent-orange-subtle text-accent-orange",
  Yeşil: "border-success bg-success-subtle text-success",
};

export function DocumentCenterSurface({
  folders,
  initialFiles = [],
  initialTrashedFiles = [],
  persistence,
}: DocumentCenterSurfaceProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [activeFilter, setActiveFilter] = useState(fileTypeFilters[0]);
  const [activeStorageVisibilityFilter, setActiveStorageVisibilityFilter] =
    useState(storageVisibilityFilters[0]);
  const [documentFiles, setDocumentFiles] = useState<DocumentFileRow[]>(() => [
    ...initialFiles,
    ...initialTrashedFiles,
  ]);
  const [folderRows, setFolderRows] = useState(folders);
  const [trashedFileIds, setTrashedFileIds] = useState<Set<string>>(
    () => new Set(initialTrashedFiles.map((file) => file.id)),
  );
  const [folderAccessLevel, setFolderAccessLevel] = useState<
    "public" | "restricted"
  >("public");
  const [folderName, setFolderName] = useState("");
  const [folderNotice, setFolderNotice] = useState("");
  const [folderPanelOpen, setFolderPanelOpen] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState(
    () =>
      folders.find((folder) => folder.name === "Sözleşmeler")?.id ??
      folders[0]?.id ??
      "",
  );
  const [uploadPanelOpen, setUploadPanelOpen] = useState(false);
  const [linkedModule, setLinkedModule] = useState("");
  const [linkedRecordLabel, setLinkedRecordLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const summary = useMemo(
    () => summarizeDocumentCenter(folderRows),
    [folderRows],
  );
  async function handleDeleteFolder(folder: DocumentFolderRow) {
    if (!persistence?.deleteFolder || !folder.canDelete || folder.isSystem) return;
    const result = await persistence.deleteFolder(folder.id);
    if (!result.ok) {
      setFolderNotice(result.errors.join(" "));
      return;
    }
    setFolderRows((rows) => rows.filter((row) => row.id !== folder.id));
    setFolderNotice(`${folder.name} klasörü silindi.`);
  }
  async function handleRenameFolder(folder: DocumentFolderRow) {
    if (!persistence?.renameFolder || !folder.canRename || folder.isSystem) return;
    const nextName = window.prompt("Yeni klasör adı", folder.name)?.trim();
    if (!nextName || nextName === folder.name) return;
    const result = await persistence.renameFolder(folder.id, nextName);
    if (!result.ok) {
      setFolderNotice(result.errors.join(" "));
      return;
    }
    setFolderRows((rows) => rows.map((row) => (row.id === folder.id ? result.data.folder : row)));
    setFolderNotice(`${folder.name} klasörü yeniden adlandırıldı.`);
  }
  const activeTabFiles = useMemo(
    () => filterDocumentFilesByTab(documentFiles, activeTab, trashedFileIds),
    [activeTab, documentFiles, trashedFileIds],
  );
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("tr-TR");
  const visibleFolderRows = useMemo(
    () =>
      normalizedSearchQuery
        ? folderRows.filter((folder) =>
            [folder.name, folder.purpose, folder.createdBy].some((value) =>
              value.toLocaleLowerCase("tr-TR").includes(normalizedSearchQuery),
            ),
          )
        : folderRows,
    [folderRows, normalizedSearchQuery],
  );
  const visibleDocumentFiles = useMemo(() => {
    const filteredFiles = filterDocumentFilesByStorageVisibility(
      filterDocumentFilesByType(activeTabFiles, activeFilter),
      activeStorageVisibilityFilter,
    );

    if (!normalizedSearchQuery) return filteredFiles;

    return filteredFiles.filter((file) => {
      const folderName = folderRows.find((folder) => folder.id === file.folderId)?.name ?? "";

      return [
        file.name,
        file.createdBy,
        file.linkedModule ?? "",
        file.linkedRecordLabel ?? "",
        folderName,
      ].some((value) =>
        value.toLocaleLowerCase("tr-TR").includes(normalizedSearchQuery),
      );
    });
  }, [
    activeFilter,
    activeStorageVisibilityFilter,
    activeTabFiles,
    folderRows,
    normalizedSearchQuery,
  ]);
  const activeFileCount = documentFiles.length - trashedFileIds.size;

  async function handleCreateFolder() {
    const values: DocumentUserFolderCreateValues = {
      accessLevel: folderAccessLevel,
      name: folderName,
    };
    const result = createDocumentUserFolder({
      existingFolders: folderRows,
      values,
    });

    if (!result.ok) {
      setFolderNotice(result.errors.join(" "));
      return;
    }

    const persisted = persistence?.createFolder
      ? await persistence.createFolder(values)
      : undefined;

    if (persisted && !persisted.ok) {
      setFolderNotice(persisted.errors.join(" "));
      return;
    }

    const folder = persisted?.data.folder ?? result.data;

    setFolderRows((currentRows) => [...currentRows, folder]);
    setFolderName("");
    setFolderAccessLevel("public");
    setFolderNotice(`${folder.name} klasörü oluşturuldu.`);
    setFolderPanelOpen(false);
  }

  async function handleUploadFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const fileLike = {
      lastModified: file.lastModified,
      name: file.name,
      size: file.size,
      type: file.type,
    };

    const result = createDocumentFileDraft({
      file: fileLike,
      folderId: targetFolderId,
    });

    if (!result.ok) {
      setFolderNotice(result.errors.join(" "));
      return;
    }

    if (!persistence) {
      appendUploadedFile(result.data);
      return;
    }

    const persisted =
      persistence.createFile !== undefined
        ? await persistence.createFile(createDocumentUploadFormData(file))
        : await persistence.createFileMetadata?.(
            {
              file: fileLike,
              folderId: targetFolderId,
              ...createDocumentFileLinkValues(linkedModule, linkedRecordLabel),
            },
            createDocumentStorageKey({
              fileName: file.name,
              folderId: targetFolderId,
              lastModified: file.lastModified,
            }),
          );

    if (!persisted) {
      setFolderNotice("Dosya yükleme servisi yapılandırılmadı.");
      return;
    }

    if (!persisted.ok) {
      setFolderNotice(persisted.errors.join(" "));
      return;
    }

    appendUploadedFile(persisted.data.file);
  }

  function createDocumentUploadFormData(file: File) {
    const formData = new FormData();

    formData.append("folderId", targetFolderId);
    const linkValues = createDocumentFileLinkValues(linkedModule, linkedRecordLabel);

    if (linkValues.linkedModule) {
      formData.append("linkedModule", linkValues.linkedModule);
      formData.append("linkedRecordId", linkValues.linkedRecordId ?? "");
      formData.append("linkedRecordLabel", linkValues.linkedRecordLabel ?? "");
    }

    formData.append("file", file);

    return formData;
  }

  function appendUploadedFile(file: DocumentFileRow) {
    setDocumentFiles((currentFiles) => [...currentFiles, file]);
    setFolderRows((currentRows) =>
      insertDocumentFileIntoFolder({
        file,
        folders: currentRows,
      }),
    );
    setFolderNotice(`${file.name} dosyası yüklendi.`);
  }

  async function handleMoveFileToTrash(file: DocumentFileRow) {
    const persisted = persistence?.moveFileToTrash
      ? await persistence.moveFileToTrash(file.id)
      : undefined;

    if (persisted && !persisted.ok) {
      setFolderNotice(persisted.errors.join(" "));
      return;
    }

    const trashedFile = persisted?.data.file ?? file;

    setDocumentFiles((currentFiles) =>
      currentFiles.map((currentFile) =>
        currentFile.id === trashedFile.id ? trashedFile : currentFile,
      ),
    );
    setTrashedFileIds((currentIds) => {
      const nextIds = new Set(currentIds);

      nextIds.add(trashedFile.id);

      return nextIds;
    });
    setFolderNotice(`${trashedFile.name} çöp kutusuna taşındı.`);
  }

  async function handleRestoreFileFromTrash(file: DocumentFileRow) {
    const persisted = persistence?.restoreFileFromTrash
      ? await persistence.restoreFileFromTrash(file.id)
      : undefined;

    if (persisted && !persisted.ok) {
      setFolderNotice(persisted.errors.join(" "));
      return;
    }

    const restoredFile = persisted?.ok ? persisted.data.file : file;

    setDocumentFiles((currentFiles) =>
      currentFiles.map((currentFile) =>
        currentFile.id === restoredFile.id ? restoredFile : currentFile,
      ),
    );
    setTrashedFileIds((currentIds) => {
      const nextIds = new Set(currentIds);

      nextIds.delete(restoredFile.id);

      return nextIds;
    });
    setFolderNotice(`${restoredFile.name} çöp kutusundan geri alındı.`);
  }
  async function handleRenameFile(file: DocumentFileRow) {
    if (!persistence?.renameFile) return;
    const nextName = window.prompt("Yeni dosya adı", file.name)?.trim();
    if (!nextName || nextName === file.name) return;
    const result = await persistence.renameFile(file.id, nextName);
    if (!result.ok) {
      setFolderNotice(result.errors.join(" "));
      return;
    }
    setDocumentFiles((files) => files.map((row) => row.id === file.id ? result.data.file : row));
    setFolderNotice(`${file.name} yeniden adlandırıldı.`);
  }

  return (
    <section
      className="mx-auto flex max-w-[1440px] flex-col gap-4"
      data-document-center-workspace="true"
    >
      <header className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="border-b border-divider bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
            Operasyon · Evrak yönetimi
          </p>
          <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-content sm:text-3xl">
              Döküman / Evrak Merkezi
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-content-muted">
              Proje evraklarını sistem klasörleri, kaynak kayıt bağlantıları ve
              güvenli arşiv akışıyla tek merkezden yönetin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="h-10 rounded-ui-control border border-divider bg-surface-raised px-4 text-sm font-semibold text-content shadow-sm hover:border-brand-primary hover:text-brand-primary"
              onClick={() => setFolderPanelOpen((isOpen) => !isOpen)}
              type="button"
            >
              Yeni Klasör
            </button>
            <button
              className="h-10 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand shadow-sm hover:opacity-90"
              onClick={() => setUploadPanelOpen((isOpen) => !isOpen)}
              type="button"
            >
              Dosya Yükle
            </button>
          </div>
        </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-[minmax(260px,1fr)_minmax(280px,1.4fr)] sm:items-center sm:p-6">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-content-muted">
              <span>Depolama alanı</span>
              <span className="font-mono text-content">
                {formatBytes(summary.usedBytes)} / {formatBytes(summary.limitBytes)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                aria-label={`Depolama kullanımı yüzde ${summary.usedPercent}`}
                className="h-full rounded-full bg-brand-primary"
                style={{ width: `${Math.max(summary.usedPercent, summary.usedBytes > 0 ? 1 : 0)}%` }}
              />
            </div>
          </div>
          <label className="relative block">
            <span className="sr-only">Dosya veya klasör ara</span>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-content-muted">⌕</span>
            <input
              aria-label="Dosya veya klasör ara"
              className="h-11 w-full rounded-ui-control border border-divider bg-surface px-9 text-sm text-content outline-none placeholder:text-content-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Dosya, klasör veya bağlı kayıt ara"
              type="search"
              value={searchQuery}
            />
          </label>
        </div>
      </header>

      {folderPanelOpen ? (
        <form
          className="rounded-ui-panel border border-divider bg-surface-raised p-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateFolder();
          }}
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_auto] md:items-end">
            <label className="grid gap-1 text-sm font-semibold">
              <span>Klasör adı</span>
              <input
                className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 text-sm font-medium outline-none focus:border-brand-primary"
                onChange={(event) => setFolderName(event.target.value)}
                value={folderName}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              <span>Erişim</span>
              <select
                className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 text-sm font-medium outline-none focus:border-brand-primary"
                onChange={(event) =>
                  setFolderAccessLevel(
                    event.target.value === "restricted" ? "restricted" : "public",
                  )
                }
                value={folderAccessLevel}
              >
                <option value="public">Herkes</option>
                <option value="restricted">Belirli kullanıcı/rol</option>
              </select>
            </label>
            <button
              className="h-10 rounded-ui-control bg-brand-primary px-3 text-sm font-semibold text-on-brand hover:opacity-90"
              type="submit"
            >
              Klasör Oluştur
            </button>
          </div>
        </form>
      ) : null}

      {uploadPanelOpen ? (
        <form className="rounded-ui-panel border border-divider bg-surface-raised p-4">
          <div className="grid gap-3 lg:grid-cols-[240px_220px_minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
            <label className="grid gap-1 text-sm font-semibold">
              <span>Hedef Klasör</span>
              <select
                className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 text-sm font-medium outline-none focus:border-brand-primary"
                onChange={(event) => setTargetFolderId(event.target.value)}
                value={targetFolderId}
              >
                {folderRows.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              <span>Bağlı Modül</span>
              <select
                className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 text-sm font-medium outline-none focus:border-brand-primary"
                onChange={(event) => setLinkedModule(event.target.value)}
                value={linkedModule}
              >
                {linkedModuleOptions.map((option) => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              <span>Evrak No / Kayıt</span>
              <input
                className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 text-sm font-medium outline-none focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!linkedModule}
                onChange={(event) => setLinkedRecordLabel(event.target.value)}
                placeholder="FAT-0001 - ABC Beton"
                value={linkedRecordLabel}
              />
            </label>
            <label
              aria-label="Dosya sürükle bırak alanı"
              className="grid min-h-24 cursor-pointer place-items-center rounded-ui-panel border border-dashed border-divider bg-surface-muted p-4 text-center text-sm font-semibold text-content-subtle hover:border-brand-primary hover:bg-brand-primary-subtle"
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                void handleUploadFile(event.dataTransfer.files[0]);
              }}
            >
              <span>Dosya Seç veya Buraya Bırak</span>
              <input
                aria-label="Dosya Seç"
                className="sr-only"
                onChange={(event) =>
                  void handleUploadFile(event.currentTarget.files?.[0])
                }
                type="file"
              />
            </label>
          </div>
        </form>
      ) : null}

      {folderNotice ? (
        <div
          className="rounded-ui-panel border border-divider bg-surface-raised p-3 text-sm font-semibold text-content-subtle"
          role="status"
        >
          {folderNotice}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Toplam Klasör" value={String(summary.folderCount)} />
        <Metric
          label="Sistem Klasörü"
          value={String(summary.systemFolderCount)}
        />
        <Metric label="Aktif Dosya" value={String(activeFileCount)} />
        <Metric label="Çöp Kutusu" value={String(trashedFileIds.size)} />
      </div>

      <div className="rounded-ui-panel border border-divider bg-surface-raised p-3">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <SegmentedControl
            activeValue={activeTab}
            ariaLabel="Döküman sekmeleri"
            options={tabs}
            onChange={setActiveTab}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SegmentedControl
              activeValue={activeFilter}
              ariaLabel="Dosya türü filtreleri"
              options={fileTypeFilters}
              onChange={setActiveFilter}
            />
            <SegmentedControl
              activeValue={activeStorageVisibilityFilter}
              ariaLabel="Depo görünürlüğü filtreleri"
              options={storageVisibilityFilters}
              onChange={setActiveStorageVisibilityFilter}
            />
            <div
              aria-label="Klasör görünümü"
              className="inline-flex h-10 overflow-hidden rounded-ui-control border border-divider bg-surface-muted"
            >
              <button
                aria-pressed={viewMode === "grid"}
                className={getSegmentButtonClass(viewMode === "grid")}
                onClick={() => setViewMode("grid")}
                type="button"
              >
                Izgara
              </button>
              <button
                aria-pressed={viewMode === "list"}
                className={getSegmentButtonClass(viewMode === "list")}
                onClick={() => setViewMode("list")}
                type="button"
              >
                Liste
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <FolderGrid folders={visibleFolderRows} onDeleteFolder={handleDeleteFolder} onRenameFolder={handleRenameFolder} />
      ) : (
        <FolderTable folders={visibleFolderRows} onDeleteFolder={handleDeleteFolder} onRenameFolder={handleRenameFolder} />
      )}

      {documentFiles.length > 0 && visibleDocumentFiles.length === 0 ? (
        <div
          className="rounded-ui-panel border border-divider bg-surface-raised p-4 text-sm font-semibold text-content-subtle"
          role="status"
        >
          Arama ve filtrelere uygun evrak bulunamadı.
        </div>
      ) : null}

      {activeTab === "Çöp Kutusu" ? (
        <p className="rounded-ui-panel border border-divider bg-surface-muted px-4 py-3 text-sm font-semibold text-content-subtle">
          Çöp kutusundaki dosyalar 30 gün sonra kalıcı olarak silinir.
        </p>
      ) : null}

      {visibleDocumentFiles.length > 0 ? (
        <UploadedFileTable
          files={visibleDocumentFiles}
          folders={folderRows}
          onMoveToTrash={
            activeTab === "Çöp Kutusu" ? undefined : handleMoveFileToTrash
          }
          onRestoreFromTrash={
            activeTab === "Çöp Kutusu" ? handleRestoreFileFromTrash : undefined
          }
          onRenameFile={activeTab === "Çöp Kutusu" ? undefined : handleRenameFile}
        />
      ) : null}
    </section>
  );
}

function SegmentedControl({
  activeValue,
  ariaLabel,
  onChange,
  options,
}: {
  activeValue: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="inline-flex h-10 overflow-x-auto rounded-ui-control border border-divider bg-surface-muted"
    >
      {options.map((option) => (
        <button
          aria-pressed={activeValue === option}
          className={getSegmentButtonClass(activeValue === option)}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function FolderGrid({ folders, onDeleteFolder, onRenameFolder }: { folders: DocumentFolderRow[]; onDeleteFolder?: (folder: DocumentFolderRow) => void; onRenameFolder?: (folder: DocumentFolderRow) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {folders.map((folder) => (
        <article
          className="rounded-ui-panel border border-divider bg-surface-raised p-4"
          key={folder.id}
        >
          <div className="flex items-start justify-between gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-ui-control border text-xs font-semibold ${folderColorClass[folder.color]}`}
            >
              {folder.name.slice(0, 2).toLocaleUpperCase("tr-TR")}
            </div>
            {folder.isSystem ? <SystemBadge /> : null}
          </div>
          <h2 className="mt-4 truncate text-sm font-semibold">{folder.name}</h2>
          <p className="mt-1 min-h-10 text-sm text-content-subtle">
            {folder.purpose}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-divider pt-3 text-xs text-content-subtle">
            <span>{getAccessLevelLabel(folder.accessLevel)}</span>
            <button
              aria-label={
                folder.isSystem
                  ? `${folder.name} sistem klasörü silinemez`
                  : `${folder.name} klasörünü sil`
              }
              className="rounded-ui-control border border-divider px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!folder.canDelete}
              onClick={() => onDeleteFolder?.(folder)}
              type="button"
            >
              Sil
            </button>
            <button className="rounded-ui-control border border-divider px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55" disabled={!folder.canRename} onClick={() => onRenameFolder?.(folder)} type="button">Adlandır</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function FolderTable({
  folders,
  onDeleteFolder,
  onRenameFolder,
}: {
  folders: DocumentFolderRow[];
  onDeleteFolder?: (folder: DocumentFolderRow) => void;
  onRenameFolder?: (folder: DocumentFolderRow) => void;
}) {
  return (
    <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised">
      <div className="overflow-x-auto">
        <table
          aria-label="Döküman klasör listesi"
          className="min-w-[760px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Ad</th>
              <th className="px-4 py-3 font-semibold">Etiketler</th>
              <th className="px-4 py-3 font-semibold">Boyut</th>
              <th className="px-4 py-3 font-semibold">Tarih</th>
              <th className="px-4 py-3 font-semibold">Oluşturan</th>
              <th className="px-4 py-3 font-semibold">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {folders.map((folder) => (
              <tr className="hover:bg-brand-primary-subtle" key={folder.id}>
                <td className="px-4 py-3 font-semibold">{folder.name}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {folder.isSystem ? <SystemBadge /> : null}
                    <span className="rounded-ui-control border border-divider px-2 py-1 text-xs font-semibold">
                      {getAccessLevelLabel(folder.accessLevel)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono">
                  {formatBytes(folder.sizeBytes)}
                </td>
                <td className="px-4 py-3">{formatDate(folder.createdAt)}</td>
                <td className="px-4 py-3">{folder.createdBy}</td>
                <td className="px-4 py-3">
                  <button
                    aria-label={
                      folder.isSystem
                        ? `${folder.name} sistem klasörü silinemez`
                        : `${folder.name} klasörünü sil`
                    }
                    className="rounded-ui-control border border-divider px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55"
                    disabled={!folder.canDelete}
                    onClick={() => onDeleteFolder?.(folder)}
                    type="button"
                  >
                    Sil
                  </button>
                  <button className="ml-2 rounded-ui-control border border-divider px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55" disabled={!folder.canRename} onClick={() => onRenameFolder?.(folder)} type="button">Adlandır</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function UploadedFileTable({
  files,
  folders,
  onMoveToTrash,
  onRestoreFromTrash,
  onRenameFile,
}: {
  files: DocumentFileRow[];
  folders: DocumentFolderRow[];
  onMoveToTrash?: (file: DocumentFileRow) => Promise<void> | void;
  onRestoreFromTrash?: (file: DocumentFileRow) => Promise<void> | void;
  onRenameFile?: (file: DocumentFileRow) => Promise<void> | void;
}) {
  const showActionColumn =
    files.some((file) => Boolean(file.storageKey)) ||
    Boolean(onMoveToTrash || onRestoreFromTrash);

  return (
    <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised">
      <div className="overflow-x-auto">
        <table
          aria-label="Yüklenen dosya listesi"
          className="min-w-[980px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Dosya</th>
              <th className="px-4 py-3 font-semibold">Tür</th>
              <th className="px-4 py-3 font-semibold">Klasör</th>
              <th className="px-4 py-3 font-semibold">Boyut</th>
              <th className="px-4 py-3 font-semibold">Yükleyen</th>
              <th className="px-4 py-3 font-semibold">Bağlantı</th>
              {showActionColumn ? (
                <th className="px-4 py-3 font-semibold">İşlem</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {files.map((file) => (
              <tr className="hover:bg-brand-primary-subtle" key={file.id}>
                <td className="px-4 py-3">
                  <span className="block font-semibold">{file.name}</span>
                  <span className="mt-1 inline-flex rounded-ui-control border border-divider px-2 py-0.5 text-xs font-semibold text-content-subtle">
                    {file.storageKey ? "Yerel Depo" : "Metaveri"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-ui-control border border-divider px-2 py-1 text-xs font-semibold">
                    {getFileKindLabel(file.kind)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {folders.find((folder) => folder.id === file.folderId)?.name ??
                    "-"}
                </td>
                <td className="px-4 py-3 font-mono">
                  {formatBytes(file.sizeBytes)}
                </td>
                <td className="px-4 py-3">{file.createdBy}</td>
                <td className="px-4 py-3"><DocumentFileLink file={file} /></td>
                {showActionColumn ? (
                  <td className="px-4 py-3">
                    {file.storageKey ? (
                      <a
                        aria-label={`Dosyayı İndir ${file.name}`}
                        className="mr-2 rounded-ui-control border border-divider px-2 py-1 text-xs font-semibold hover:border-brand-primary hover:bg-brand-primary-subtle"
                        href={buildDocumentFileDownloadHref(file.id)}
                        download={file.name}
                      >
                        İndir
                      </a>
                    ) : null}
                    {onMoveToTrash ? (
                      <button
                        aria-label={`${file.name} dosyasını çöp kutusuna taşı`}
                        className="rounded-ui-control border border-divider px-2 py-1 text-xs font-semibold hover:border-brand-primary hover:bg-brand-primary-subtle"
                        onClick={() => onMoveToTrash(file)}
                        type="button"
                      >
                        Sil
                      </button>
                    ) : null}
                    {onRenameFile ? (
                      <button
                        aria-label={`${file.name} dosyasını yeniden adlandır`}
                        className="ml-2 rounded-ui-control border border-divider px-2 py-1 text-xs font-semibold hover:border-brand-primary hover:bg-brand-primary-subtle"
                        onClick={() => onRenameFile(file)}
                        type="button"
                      >
                        Adlandır
                      </button>
                    ) : null}
                    {onRestoreFromTrash ? (
                      <button
                        aria-label={`${file.name} dosyasını çöp kutusundan geri al`}
                        className="rounded-ui-control border border-divider px-2 py-1 text-xs font-semibold hover:border-brand-primary hover:bg-brand-primary-subtle"
                        onClick={() => onRestoreFromTrash(file)}
                        type="button"
                      >
                        Geri Al
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised p-4">
      <p className="text-sm font-semibold text-content-subtle">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
    </article>
  );
}

function SystemBadge() {
  return (
    <span className="rounded-ui-control bg-brand-primary-subtle px-2 py-1 text-xs font-semibold text-brand-primary">
      SİSTEM
    </span>
  );
}

function getAccessLevelLabel(accessLevel: DocumentFolderRow["accessLevel"]) {
  return accessLevel === "public" ? "Herkes" : "Belirli kullanıcı/rol";
}

function createDocumentFileLinkValues(
  linkedModule: string,
  linkedRecordLabel: string,
): Pick<
  DocumentFileMetadataCreateValues,
  "linkedModule" | "linkedRecordId" | "linkedRecordLabel"
> {
  const moduleValue = linkedModule.trim();
  const label = linkedRecordLabel.trim();

  if (!moduleValue || !label) {
    return {};
  }

  return {
    linkedModule: moduleValue,
    linkedRecordId: label,
    linkedRecordLabel: label,
  };
}

function DocumentFileLink({ file }: { file: DocumentFileRow }) {
  if (!file.linkedModule || !file.linkedRecordLabel) {
    return "-";
  }

  const option = linkedModuleOptions.find(
    (moduleOption) => moduleOption.value === file.linkedModule,
  );
  const moduleLabel = option?.label ?? file.linkedModule;
  const searchParams = new URLSearchParams({ evrak: file.linkedRecordLabel });

  return (
    <Link
      className="font-semibold text-brand-primary hover:underline"
      href={`/${file.linkedModule}?${searchParams.toString()}`}
    >
      {moduleLabel} · {file.linkedRecordLabel}
    </Link>
  );
}

function buildDocumentFileDownloadHref(fileId: string) {
  return `/api/dokuman-merkezi/indirme?${new URLSearchParams({ fileId }).toString()}`;
}

function getFileKindLabel(kind: DocumentFileKind) {
  const labels: Record<DocumentFileKind, string> = {
    document: "Döküman",
    image: "Resim",
    other: "Diğer",
    pdf: "PDF",
    spreadsheet: "Tablo",
  };

  return labels[kind];
}

function filterDocumentFilesByTab(
  files: DocumentFileRow[],
  activeTab: string,
  trashedFileIds: Set<string>,
) {
  if (activeTab === "Çöp Kutusu") {
    return files.filter((file) => trashedFileIds.has(file.id));
  }

  return files.filter((file) => !trashedFileIds.has(file.id));
}

function filterDocumentFilesByType(
  files: DocumentFileRow[],
  activeFilter: string,
) {
  const kindByFilter: Partial<Record<string, DocumentFileKind>> = {
    "Dökümanlar": "document",
    PDF: "pdf",
    Resimler: "image",
    Tablolar: "spreadsheet",
  };
  const targetKind = kindByFilter[activeFilter];

  return targetKind
    ? files.filter((file) => file.kind === targetKind)
    : files;
}

function filterDocumentFilesByStorageVisibility(
  files: DocumentFileRow[],
  activeFilter: string,
) {
  if (activeFilter === "Yerel Depo") {
    return files.filter((file) => Boolean(file.storageKey));
  }

  if (activeFilter === "Metaveri") {
    return files.filter((file) => !file.storageKey);
  }

  return files;
}

function getSegmentButtonClass(isActive: boolean) {
  return `shrink-0 px-3 text-sm font-semibold ${
    isActive
      ? "bg-brand-primary text-on-brand"
      : "text-content-subtle hover:bg-brand-primary-subtle hover:text-content"
  }`;
}

function formatBytes(value: number) {
  if (value === 0) {
    return "0 MB";
  }

  const gigabyte = 1024 * 1024 * 1024;
  const megabyte = 1024 * 1024;

  if (value >= gigabyte) {
    return `${Math.round(value / gigabyte)} GB`;
  }

  return `${Math.round(value / megabyte)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR").format(date);
}


