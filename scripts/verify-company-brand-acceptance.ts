import "dotenv/config";

import { deflateSync } from "node:zlib";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import {
  createCompanyBrandAssetPrismaRepository,
  type CompanyBrandAssetPrismaClientLike,
} from "../src/lib/company-brand-asset-prisma-repository";
import { createCompanyBrandAssetService } from "../src/lib/company-brand-asset-service";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  companyId: "company-f27-kabul-20260731",
  companyName: "F27 Belge Markalama Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: true,
  periodId: "period-f27-kabul-20260731",
  periodLabel: "F27 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "F27 Marka Yöneticisi",
  userRole: "admin",
};
const accountingScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "F27 Muhasebe Kullanıcısı",
  userRole: "accounting",
};
const viewerScope: TenantScope = {
  ...base,
  userId: "user-viewer",
  userName: "F27 Salt Okur",
  userRole: "viewer",
};
const logo = createPng(128, 64);
const timestamp = "2026-07-31T21:00:00.000Z";
const service = createCompanyBrandAssetService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => timestamp,
  repository: createCompanyBrandAssetPrismaRepository(
    prisma as unknown as CompanyBrandAssetPrismaClientLike,
  ),
});

async function main() {
  await ensureScope();
  await prisma.auditLog.deleteMany({
    where: { ...periodScopeFields(), entityType: "company-brand-asset" },
  });
  await prisma.companyBrandAsset.deleteMany({ where: companyScopeFields() });

  const operationsBefore = await operationalCounts();
  const sessionsBefore = await sessionSnapshot();

  const empty = unwrap(await service.get({ scope: adminScope })).asset;
  assert(empty.source === "none" && empty.revisionNo === 0, "İlk logo okuması boş olmalıdır.");

  const created = unwrap(
    await service.mutate({
      content: logo,
      expectedRevisionNo: 0,
      mimeType: "image/png",
      originalFileName: "f27-gizli-dosya-adi.png",
      requestKey: "F27-BRAND-CREATE-1",
      scope: adminScope,
    }),
  );
  assert(!created.idempotent, "İlk logo yazımı idempotent olmamalıdır.");
  assert(created.asset.revisionNo === 1, "İlk logo revizyonu 1 olmalıdır.");
  assert(created.asset.width === 128 && created.asset.height === 64, "Logo ölçüleri korunmalıdır.");

  const retry = unwrap(
    await service.mutate({
      content: logo,
      expectedRevisionNo: 0,
      mimeType: "image/png",
      originalFileName: "f27-gizli-dosya-adi.png",
      requestKey: "F27-BRAND-CREATE-1",
      scope: adminScope,
    }),
  );
  assert(retry.idempotent, "Aynı işlem anahtarı idempotent olmalıdır.");
  assert((await auditCount()) === 1, "Retry ikinci audit üretmemelidir.");

  assert(
    !(await service.mutate({
      content: logo,
      expectedRevisionNo: 0,
      mimeType: "image/png",
      originalFileName: "stale.png",
      requestKey: "F27-STALE",
      scope: adminScope,
    })).ok,
    "Eski revizyon reddedilmelidir.",
  );
  for (const scope of [accountingScope, viewerScope]) {
    assert(
      !(await service.mutate({
        content: logo,
        expectedRevisionNo: 1,
        mimeType: "image/png",
        originalFileName: "denied.png",
        requestKey: `F27-DENIED-${scope.userRole}`,
        scope,
      })).ok,
      `${scope.userRole} rolü logo değiştirememelidir.`,
    );
  }
  assert(
    !(await service.mutate({
      content: new Uint8Array([1, 2, 3, 4]),
      expectedRevisionNo: 1,
      mimeType: "image/png",
      originalFileName: "invalid.png",
      requestKey: "F27-INVALID",
      scope: adminScope,
    })).ok,
    "Sahte PNG imzası reddedilmelidir.",
  );

  const removed = unwrap(
    await service.mutate({
      expectedRevisionNo: 1,
      remove: true,
      requestKey: "F27-BRAND-REMOVE-1",
      scope: adminScope,
    }),
  );
  assert(removed.asset.source === "none" && removed.asset.revisionNo === 2, "Logo kaldırma revizyonu korunmalıdır.");

  const finalAsset = unwrap(
    await service.mutate({
      content: logo,
      expectedRevisionNo: 2,
      mimeType: "image/png",
      originalFileName: "f27-kabul-logo.png",
      requestKey: "F27-BRAND-FINAL-1",
      scope: adminScope,
    }),
  ).asset;
  assert(finalAsset.source === "persisted" && finalAsset.revisionNo === 3, "Tarayıcı kabul logosu kalıcı olmalıdır.");

  const anotherPeriod = unwrap(
    await service.get({
      scope: { ...adminScope, periodId: "period-f27-another", periodLabel: "F27 2027" },
    }),
  ).asset;
  assert(anotherPeriod.revisionNo === 3, "Logo şirket dönemleri arasında ortak okunmalıdır.");

  const foreign = unwrap(
    await service.get({
      scope: { ...adminScope, companyId: "company-demo-insaat", companyName: "DEMO İNŞAAT" },
    }),
  ).asset;
  assert(foreign.source === "none" || foreign.dataUrl !== finalAsset.dataUrl, "Logo yabancı şirkete sızmamalıdır.");

  const audits = await prisma.auditLog.findMany({
    where: { ...periodScopeFields(), entityType: "company-brand-asset" },
  });
  const auditJson = JSON.stringify(audits.map((row) => row.metadata));
  for (const sensitive of [
    "F27-BRAND-CREATE-1",
    "F27-BRAND-REMOVE-1",
    "F27-BRAND-FINAL-1",
    "f27-gizli-dosya-adi.png",
    "data:image",
    Buffer.from(logo).toString("base64").slice(0, 32),
  ]) {
    assert(!auditJson.includes(sensitive), "Audit logo içeriği veya hassas mutasyon verisi içeriyor.");
  }
  assert(JSON.stringify(await operationalCounts()) === JSON.stringify(operationsBefore), "Logo işlemi operasyonel kayıtlarda yan etki üretmemelidir.");
  assert(JSON.stringify(await sessionSnapshot()) === JSON.stringify(sessionsBefore), "Logo işlemi session kayıtlarını değiştirmemelidir.");

  console.log(JSON.stringify({
    auditCount: audits.length,
    companyId: base.companyId,
    finalRevisionNo: finalAsset.revisionNo,
    dimensions: `${finalAsset.width}x${finalAsset.height}`,
    operationalSideEffects: 0,
    periodIndependent: true,
    roleIsolation: true,
    sensitiveAuditValues: 0,
    sessionSideEffects: 0,
    status: "PASS",
  }, null, 2));
}

async function ensureScope() {
  const tenant = await prisma.tenant.findUnique({ select: { id: true }, where: { id: base.tenantId } });
  assert(tenant, "F27 kabul tenant'ı bulunamadı.");
  await prisma.company.upsert({
    create: { id: base.companyId, name: base.companyName, tenantId: base.tenantId },
    update: { name: base.companyName },
    where: { id: base.companyId },
  });
  await prisma.period.upsert({
    create: { companyId: base.companyId, id: base.periodId, isClosed: true, label: base.periodLabel, tenantId: base.tenantId },
    update: { isClosed: true, label: base.periodLabel },
    where: { id: base.periodId },
  });
  for (const [scope, suffix] of [
    [adminScope, "admin"],
    [accountingScope, "accounting"],
    [viewerScope, "viewer"],
  ] as const) {
    await prisma.appUserScopeAccess.upsert({
      create: { ...periodScopeFields(), id: `scope-f27-kabul-${suffix}-20260731`, isActive: true, isDefault: false, licenseLabel: scope.licenseLabel, role: scope.userRole, userId: scope.userId },
      update: { isActive: true, licenseLabel: scope.licenseLabel, role: scope.userRole },
      where: { userId_companyId_periodId: { companyId: scope.companyId, periodId: scope.periodId, userId: scope.userId } },
    });
    await prisma.appSession.upsert({
      create: { ...periodScopeFields(), id: `session-f27-kabul-${suffix}-20260731`, licenseLabel: scope.licenseLabel, role: scope.userRole, userId: scope.userId },
      update: { expiresAt: null, licenseLabel: scope.licenseLabel, role: scope.userRole, userId: scope.userId },
      where: { id: `session-f27-kabul-${suffix}-20260731` },
    });
  }
}

function createPng(width: number, height: number) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let row = 0; row < height; row += 1) {
    const offset = row * (1 + width * 4);
    for (let column = 0; column < width; column += 1) {
      const pixel = offset + 1 + column * 4;
      raw.set([15, 118, 110, 255], pixel);
    }
  }
  return new Uint8Array(Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]));
}

function pngChunk(type: string, data: Buffer) {
  const typeBytes = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBytes, data]);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  body.copy(output, 4);
  output.writeUInt32BE(crc32(body), 8 + data.length);
  return output;
}

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function operationalCounts() {
  return Promise.all([
    prisma.expense.count({ where: periodScopeFields() }),
    prisma.purchaseInvoice.count({ where: periodScopeFields() }),
    prisma.salesInvoice.count({ where: periodScopeFields() }),
    prisma.progressPayment.count({ where: periodScopeFields() }),
    prisma.cashBankMovement.count({ where: periodScopeFields() }),
    prisma.ledgerEntry.count({ where: periodScopeFields() }),
  ]);
}
function sessionSnapshot() {
  return prisma.appSession.findMany({ orderBy: { id: "asc" }, select: { companyId: true, id: true, periodId: true, role: true, userId: true }, where: periodScopeFields() });
}
function auditCount() {
  return prisma.auditLog.count({ where: { ...periodScopeFields(), entityType: "company-brand-asset" } });
}
function companyScopeFields() {
  return { companyId: base.companyId, tenantId: base.tenantId };
}
function periodScopeFields() {
  return { ...companyScopeFields(), periodId: base.periodId };
}
function unwrap<T>(result: { data: T; ok: true } | { errors: string[]; ok: false }) {
  if (!result.ok) throw new Error(result.errors.join(" "));
  return result.data;
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
