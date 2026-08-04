import type { TenantScope, TenantUserRole } from "./tenant-scope";

export const COMPANY_LOGO_MAX_BYTES = 512 * 1024;
export const companyLogoMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type CompanyLogoMimeType = (typeof companyLogoMimeTypes)[number];
export type CompanyBrandAssetStatus = "ACTIVE" | "REMOVED";

export type CompanyBrandAssetSnapshot = {
  companyId: string;
  content: Uint8Array | null;
  createdAt: string;
  createdBy: string;
  height: number | null;
  id: string;
  lastMutationKey: string | null;
  mimeType: CompanyLogoMimeType | null;
  originalFileName: string;
  revisionNo: number;
  sha256: string;
  sizeBytes: number;
  status: CompanyBrandAssetStatus;
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
  width: number | null;
};

export type EffectiveCompanyBrandAsset = {
  canManage: boolean;
  dataUrl: string | null;
  height: number | null;
  mimeType: CompanyLogoMimeType | null;
  revisionNo: number;
  sizeBytes: number;
  source: "none" | "persisted";
  updatedAt: string | null;
  updatedBy: string | null;
  width: number | null;
};

export type ValidatedCompanyLogo = {
  content: Uint8Array;
  height: number;
  mimeType: CompanyLogoMimeType;
  originalFileName: string;
  sizeBytes: number;
  width: number;
};

export class CompanyBrandAssetDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyBrandAssetDomainError";
  }
}

export function validateCompanyLogo(input: {
  content: Uint8Array;
  mimeType: string;
  originalFileName: string;
}): ValidatedCompanyLogo {
  if (!companyLogoMimeTypes.includes(input.mimeType as CompanyLogoMimeType)) {
    throw new CompanyBrandAssetDomainError(
      "Logo yalnız PNG, JPEG veya WebP olabilir.",
    );
  }
  if (input.content.byteLength === 0) {
    throw new CompanyBrandAssetDomainError("Logo dosyası boş olamaz.");
  }
  if (input.content.byteLength > COMPANY_LOGO_MAX_BYTES) {
    throw new CompanyBrandAssetDomainError(
      "Logo dosyası 512 KiB sınırını aşamaz.",
    );
  }

  const mimeType = input.mimeType as CompanyLogoMimeType;
  const dimensions = readImageDimensions(input.content, mimeType);
  if (!dimensions) {
    throw new CompanyBrandAssetDomainError(
      "Logo dosya imzası veya görüntü ölçüleri geçersiz.",
    );
  }
  if (
    dimensions.width < 64 ||
    dimensions.width > 1600 ||
    dimensions.height < 64 ||
    dimensions.height > 1600
  ) {
    throw new CompanyBrandAssetDomainError(
      "Logo genişlik ve yüksekliği 64 ile 1600 piksel arasında olmalıdır.",
    );
  }
  const ratio = dimensions.width / dimensions.height;
  if (ratio < 0.25 || ratio > 4) {
    throw new CompanyBrandAssetDomainError(
      "Logo en-boy oranı 1:4 ile 4:1 arasında olmalıdır.",
    );
  }

  return {
    content: input.content,
    height: dimensions.height,
    mimeType,
    originalFileName: sanitizeFileName(input.originalFileName),
    sizeBytes: input.content.byteLength,
    width: dimensions.width,
  };
}

export function getCompanyBrandAssetPermission(role: TenantUserRole) {
  if (role !== "admin") {
    return {
      allowed: false,
      reason: "Firma logosunu yalnız yönetici değiştirebilir.",
    } as const;
  }
  return { allowed: true, reason: "" } as const;
}

export function createCompanyBrandAssetId(
  scope: Pick<TenantScope, "companyId" | "tenantId">,
) {
  return `${scope.tenantId}::${scope.companyId}::brand-logo`;
}

export function createCompanyBrandMutationKey(
  scope: Pick<TenantScope, "companyId" | "tenantId" | "userId">,
  requestKey: string,
) {
  const normalized = requestKey.trim();
  if (!normalized || normalized.length > 120) {
    throw new CompanyBrandAssetDomainError(
      "Geçerli bir işlem anahtarı zorunludur.",
    );
  }
  return [scope.tenantId, scope.companyId, scope.userId, normalized].join("::");
}

function sanitizeFileName(value: string) {
  const safe = value.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
  const normalized = safe.replace(/[<>\u0000-\u001F]/g, "").slice(0, 180);
  return normalized || "firma-logo";
}

function readImageDimensions(
  bytes: Uint8Array,
  mimeType: CompanyLogoMimeType,
) {
  if (mimeType === "image/png") return readPng(bytes);
  if (mimeType === "image/jpeg") return readJpeg(bytes);
  return readWebp(bytes);
}

function readPng(bytes: Uint8Array) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 24 ||
    !signature.every((value, index) => bytes[index] === value) ||
    text(bytes, 12, 16) !== "IHDR"
  ) return null;
  return { width: u32be(bytes, 16), height: u32be(bytes, 20) };
}

function readJpeg(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if (marker === undefined) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: u16be(bytes, offset + 5), width: u16be(bytes, offset + 7) };
    }
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = u16be(bytes, offset + 2);
    if (length < 2) return null;
    offset += length + 2;
  }
  return null;
}

function readWebp(bytes: Uint8Array) {
  if (
    bytes.length < 30 ||
    text(bytes, 0, 4) !== "RIFF" ||
    text(bytes, 8, 12) !== "WEBP"
  ) return null;
  const kind = text(bytes, 12, 16);
  if (kind === "VP8X") {
    return {
      width: 1 + u24le(bytes, 24),
      height: 1 + u24le(bytes, 27),
    };
  }
  if (
    kind === "VP8 " &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return {
      width: u16le(bytes, 26) & 0x3fff,
      height: u16le(bytes, 28) & 0x3fff,
    };
  }
  if (kind === "VP8L" && bytes[20] === 0x2f) {
    const bits =
      (bytes[21] ?? 0) |
      ((bytes[22] ?? 0) << 8) |
      ((bytes[23] ?? 0) << 16) |
      ((bytes[24] ?? 0) << 24);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  return null;
}

function text(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}
function u16be(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}
function u16le(bytes: Uint8Array, offset: number) {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}
function u24le(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16)
  );
}
function u32be(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset] ?? 0) * 0x1000000) +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)
  );
}
