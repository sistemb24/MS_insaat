export function createDocumentStorageKey({
  fileName,
  folderId,
  lastModified,
}: {
  fileName: string;
  folderId: string;
  lastModified: number;
}) {
  return `document-center/${slugStorageSegment(folderId)}/${lastModified}-${slugStorageSegment(fileName)}`;
}

function slugStorageSegment(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
