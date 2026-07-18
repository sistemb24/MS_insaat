import "dotenv/config";
import process from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const execute = process.argv.includes("--execute");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL tanımlı değil.");
const sourceUrl = process.env.HAKEDIS_SOURCE_DATABASE_URL || deriveSourceUrl(databaseUrl);
const source = new pg.Pool({ connectionString: sourceUrl });

try {
  const tables = await discoverTables(source);
  const projectsTable = requireTable(tables, "Projects");
  const sheetsTable = requireTable(tables, "ImalatCarsafiSatirs");
  const projects = await query(source, `SELECT * FROM ${quote(projectsTable)} ORDER BY "createdAt", "id"`);
  const sheets = await query(source, `SELECT * FROM ${quote(sheetsTable)} ORDER BY "projectId", "pozNo", "id"`);
  const sheetsByProject = groupBy(sheets, "projectId");
  const report = projects.map((project) => buildOpeningBalance(project, sheetsByProject.get(String(project.id)) ?? []));

  console.log(`[hakedis-import] mode=${execute ? "execute" : "dry-run"}`);
  console.log(`[hakedis-import] projects=${report.length} contractItems=${report.reduce((sum, row) => sum + row.items.length, 0)}`);
  for (const row of report) console.log(`[hakedis-import] ${row.sourceId} | ${row.code} | hakedis=${row.sequenceNo} | items=${row.items.length} | cumulative=${money(row.cumulativeAmount)} | ${row.ready ? "READY" : `SKIP: ${row.errors.join("; ")}`}`);

  if (!execute) {
    console.log("[hakedis-import] no database mutation performed; pass --execute with explicit scope arguments after reviewing this reconciliation");
  } else {
    const scope = requiredScope(process.argv);
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    try {
      await validateTargetScope(prisma, scope);
      const results = [];
      for (const row of report.filter((entry) => entry.ready)) results.push(await importOpeningBalance(prisma, scope, row));
      await verifyImportedOpeningBalances(prisma, scope, report.filter((entry) => entry.ready));
      console.log(`[hakedis-import] imported=${results.filter((entry) => entry.created).length} existing=${results.filter((entry) => !entry.created).length} skipped=${report.filter((entry) => !entry.ready).length}`);
    } finally {
      await prisma.$disconnect();
    }
  }
} finally {
  await source.end();
}

function buildOpeningBalance(project, sheets) {
  const sourceId = String(project.id);
  const dateStart = parseDate(project.hakedisDonemiBaslangic || project.hakedisTarihi);
  const dateEnd = parseDate(project.hakedisDonemiSon || project.hakedisTarihi);
  const sequenceNo = positiveInteger(project.hakedisNo, 1);
  const errors = [];
  if (!dateStart || !dateEnd) errors.push("kaynak hakediş tarihi eksik");
  if (sheets.length === 0) errors.push("imalat çarşafı satırı yok");
  const vatRate = number(project.kdvOrani);
  const items = sheets.map((sheet, index) => {
    const quantity = number(sheet.D);
    const unitPrice = number(sheet.A);
    const cumulativeAmount = roundMoney(quantity * unitPrice);
    return { id: deterministicId("item", sourceId, sheet.id || index + 1), itemCode: text(sheet.pozNo) || `LEGACY-${index + 1}`, description: text(sheet.pozTanimi) || text(sheet.pozNo) || "Geçmiş hakediş pozu", unit: text(sheet.birim) || "br", contractQuantity: number(sheet.B), unitPrice, vatRate, cumulativeQuantity: quantity, cumulativeAmount, cumulativeVatAmount: roundMoney(cumulativeAmount * vatRate / 100) };
  });
  return {
    sourceId,
    projectId: deterministicId("project", sourceId),
    paymentId: deterministicId("opening", sourceId),
    code: `LEGACY-${slug(text(project.kisaIsmi) || sourceId.slice(0, 8))}`,
    name: text(project.isinGenel) || text(project.kisaIsmi) || `Geçmiş Hakediş ${sourceId.slice(0, 8)}`,
    siteName: text(project.kisaIsmi) || text(project.isinGenel) || "Geçmiş Şantiye",
    contractNo: text(project.sozlesmeNo) || null,
    contractAmount: number(project.sozlesmeBedeli),
    counterpartyName: text(project.altYukTaseron) || text(project.anaYukIsveren) || "Geçmiş Cari",
    sequenceNo,
    documentNo: `OPENING-${slug(text(project.kisaIsmi) || sourceId.slice(0, 8))}-${sequenceNo}`,
    periodStart: dateStart,
    periodEnd: dateEnd,
    cumulativeAmount: roundMoney(items.reduce((sum, item) => sum + item.cumulativeAmount, 0)),
    cumulativeVatAmount: roundMoney(items.reduce((sum, item) => sum + item.cumulativeVatAmount, 0)),
    items,
    errors,
    ready: errors.length === 0,
  };
}

async function importOpeningBalance(prisma, scope, row) {
  return prisma.$transaction(async (transaction) => {
    const existingOpening = await transaction.constructionProgressPayment.findUnique({ where: { id: row.paymentId }, include: { snapshots: true } });
    if (existingOpening) {
      assertScoped(existingOpening, scope, `Açılış hakedişi ${row.documentNo}`);
      if (existingOpening.projectId !== row.projectId || existingOpening.documentNo !== row.documentNo || existingOpening.sequenceNo !== row.sequenceNo || Number(existingOpening.cumulativeGrossTotal) !== row.cumulativeAmount || Number(existingOpening.cumulativeVatTotal) !== row.cumulativeVatAmount || existingOpening.snapshots.length !== row.items.length) throw new Error(`Mevcut açılış hakedişi kaynak mutabakatıyla eşleşmiyor: ${row.documentNo}`);
      return { created: false, paymentId: existingOpening.id };
    }
    const existingProject = await transaction.constructionProject.findUnique({ where: { id: row.projectId } });
    if (existingProject) assertScoped(existingProject, scope, `Proje ${row.code}`);
    await transaction.constructionProject.upsert({
      where: { id: row.projectId },
      create: { id: row.projectId, tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, code: row.code, name: row.name, siteCode: row.code, siteName: row.siteName, contractNo: row.contractNo, contractAmount: row.contractAmount, paymentType: "Taşeron Hakedişi", counterpartyCode: `LEGACY-${row.sourceId.slice(0, 8)}`, counterpartyName: row.counterpartyName, status: "OPEN", createdBy: scope.userId, updatedBy: scope.userId },
      update: { name: row.name, siteName: row.siteName, contractNo: row.contractNo, contractAmount: row.contractAmount, counterpartyName: row.counterpartyName, updatedBy: scope.userId },
    });
    for (const item of row.items) {
      const existingItem = await transaction.constructionContractItem.findUnique({ where: { id: item.id } });
      if (existingItem) {
        assertScoped(existingItem, scope, `Poz ${item.itemCode}`);
        if (existingItem.projectId !== row.projectId) throw new Error(`Poz farklı bir construction projesine bağlı: ${item.itemCode}`);
      }
      await transaction.constructionContractItem.upsert({
        where: { id: item.id },
        create: { id: item.id, tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, projectId: row.projectId, itemCode: item.itemCode, description: item.description, unit: item.unit, contractQuantity: item.contractQuantity, unitPrice: item.unitPrice, vatRate: item.vatRate, createdBy: scope.userId, updatedBy: scope.userId },
        update: { description: item.description, unit: item.unit, contractQuantity: item.contractQuantity, unitPrice: item.unitPrice, vatRate: item.vatRate, updatedBy: scope.userId },
      });
    }
    await transaction.constructionProgressPayment.create({ data: {
        id: row.paymentId, tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, projectId: row.projectId, sequenceNo: row.sequenceNo, kind: "OPENING_BALANCE", status: "APPROVED", periodStart: row.periodStart, periodEnd: row.periodEnd, paymentDate: row.periodEnd, documentNo: row.documentNo, description: `Eski Hakedis uygulamasından kontrollü açılış bakiyesi (${row.sourceId})`, periodGrossTotal: 0, periodVatTotal: 0, periodNetTotal: 0, cumulativeGrossTotal: row.cumulativeAmount, cumulativeVatTotal: row.cumulativeVatAmount, cumulativeNetTotal: row.cumulativeAmount, periodPayableTotal: 0, cumulativePayableTotal: row.cumulativeAmount, createdBy: scope.userId, updatedBy: scope.userId, approvedBy: scope.userId, approvedAt: new Date(),
        snapshots: { create: row.items.map((item) => ({ tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, contractItemId: item.id, previousQuantity: item.cumulativeQuantity, periodQuantity: 0, cumulativeQuantity: item.cumulativeQuantity, unitPrice: item.unitPrice, vatRate: item.vatRate, previousAmount: item.cumulativeAmount, periodAmount: 0, cumulativeAmount: item.cumulativeAmount, previousVatAmount: item.cumulativeVatAmount, periodVatAmount: 0, cumulativeVatAmount: item.cumulativeVatAmount, contractQuantity: item.contractQuantity, exceededContract: item.cumulativeQuantity > item.contractQuantity, calculationVersion: "legacy-opening-balance-v1" })) },
        approvals: { create: { tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, statusFrom: null, statusTo: "APPROVED", actorUserId: scope.userId, reason: "LEGACY_OPENING_BALANCE", metadata: { sourceSystem: "Hakedis_projesi", sourceProjectId: row.sourceId } } },
      } });
    await transaction.auditLog.create({ data: { tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, actorUserId: scope.userId, action: "construction-progress-payment.opening-balance-imported", entityType: "construction-progress-payment", entityId: row.paymentId, entityLabel: row.documentNo, occurredAt: new Date(), metadata: { sourceSystem: "Hakedis_projesi", sourceProjectId: row.sourceId, projectId: row.projectId, sequenceNo: row.sequenceNo, cumulativeGrossTotal: row.cumulativeAmount, cumulativeVatTotal: row.cumulativeVatAmount, itemCount: row.items.length } } });
    return { created: true, paymentId: row.paymentId };
  });
}

async function validateTargetScope(prisma, scope) {
  const period = await prisma.period.findFirst({ where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId }, select: { isClosed: true } });
  if (!period) throw new Error("Hedef tenant/firma/dönem kapsamı bulunamadı.");
  if (period.isClosed) throw new Error("Kapalı muhasebe dönemine açılış bakiyesi aktarılamaz.");
  const access = await prisma.appUserScopeAccess.findFirst({ where: { tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, userId: scope.userId, isActive: true, role: { in: ["admin", "accounting"] } }, select: { id: true } });
  if (!access) throw new Error("Hedef kullanıcı bu tenant/firma/dönemde aktif admin veya muhasebe yetkisine sahip değil.");
}

async function verifyImportedOpeningBalances(prisma, scope, rows) {
  for (const row of rows) {
    const payment = await prisma.constructionProgressPayment.findFirst({ where: { id: row.paymentId, tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId }, include: { snapshots: true } });
    if (!payment || Number(payment.cumulativeGrossTotal) !== row.cumulativeAmount || Number(payment.cumulativeVatTotal) !== row.cumulativeVatAmount || payment.snapshots.length !== row.items.length) throw new Error(`Aktarım sonrası mutabakat başarısız: ${row.documentNo}`);
    console.log(`[hakedis-import] reconciled=${row.documentNo} cumulative=${money(Number(payment.cumulativeGrossTotal))} vat=${money(Number(payment.cumulativeVatTotal))} items=${payment.snapshots.length}`);
  }
}

function assertScoped(record, scope, label) {
  if (record.tenantId !== scope.tenantId || record.companyId !== scope.companyId || record.periodId !== scope.periodId) throw new Error(`${label} deterministik kimliği farklı tenant/firma/dönem kapsamında mevcut.`);
}

function requiredScope(args) {
  const scope = { tenantId: argument(args, "--tenant-id"), companyId: argument(args, "--company-id"), periodId: argument(args, "--period-id"), userId: argument(args, "--user-id") };
  if (Object.values(scope).some((value) => !value)) throw new Error("--execute için --tenant-id, --company-id, --period-id ve --user-id zorunludur.");
  return scope;
}

async function discoverTables(pool) { const rows = await query(pool, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"); return new Map(rows.map((row) => [String(row.table_name).toLowerCase(), String(row.table_name)])); }
function requireTable(tables, name) { const table = tables.get(name.toLowerCase()); if (!table) throw new Error(`Kaynak tablo bulunamadı: ${name}`); return table; }
async function query(pool, sql) { const result = await pool.query(sql); return result.rows; }
function groupBy(rows, key) { const map = new Map(); for (const row of rows) { const value = String(row[key]); map.set(value, [...(map.get(value) ?? []), row]); } return map; }
function deriveSourceUrl(targetUrl) { const url = new URL(targetUrl); url.pathname = "/Hakedis_projesi"; return url.toString(); }
function argument(args, name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : ""; }
function quote(identifier) { return `"${identifier.replaceAll('"', '""')}"`; }
function deterministicId(type, ...parts) { return `legacy-hakedis::${type}::${parts.map(String).join("::")}`; }
function text(value) { return value == null ? "" : String(value).trim(); }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function positiveInteger(value, fallback) { const parsed = Math.trunc(number(value)); return parsed > 0 ? parsed : fallback; }
function roundMoney(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function parseDate(value) { const source = text(value); if (!source) return null; const direct = new Date(source); if (!Number.isNaN(direct.getTime())) return direct; const match = source.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/); if (!match) return null; const parsed = new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z`); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function slug(value) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase() || "PROJECT"; }
function money(value) { return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
