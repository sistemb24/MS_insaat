import { describe, expect, test } from "vitest";

import type { AuditLogEntryInput, AuditLogRepository } from "./audit-log";
import type { LedgerRepository } from "./ledger-service";
import type {
  CashBankMovementRepository,
  CashBankMovementRow,
} from "./cash-bank-movement-service";
import {
  canMutateCheques,
  createChequeService,
  createSeededChequeMemoryRepository,
  type ChequeRepository,
  type ChequeRow,
} from "./cheque-service";
import { defaultTenantScope, type TenantScope } from "./tenant-scope";

const readOnlyScope: TenantScope = {
  ...defaultTenantScope,
  userId: "viewer-user",
  userName: "Salt Okunur",
  userRole: "viewer",
};

const createValues = {
  amount: 125000,
  bankName: "Garanti BBVA",
  branchName: "Maslak",
  checkNo: "CK-0001",
  currency: "TL" as const,
  documentNo: "CEK-0001",
  drawerName: "ABC Beton A.Ş.",
  dueDate: "2026-08-15",
  issueDate: "2026-06-27",
  description: "Hakediş karşılığı gelen çek",
};

describe("cheque service", () => {
  test("maps tenant role to cheque mutation permission", () => {
    expect(canMutateCheques(defaultTenantScope)).toBe(true);
    expect(canMutateCheques(readOnlyScope)).toBe(false);
  });

  test("creates tenant scoped incoming cheque with portfolio status", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createChequeService({
      auditLogRepository: createMemoryAuditRepository(auditLogs),
      now: () => "2026-06-27T09:00:00.000Z",
      repository: createSeededChequeMemoryRepository(),
    });

    const result = await service.create({
      scope: defaultTenantScope,
      values: createValues,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        amount: 125000,
        bankName: "Garanti BBVA",
        checkNo: "CK-0001",
        companyId: defaultTenantScope.companyId,
        currency: "TL",
        direction: "Gelen",
        documentNo: "CEK-0001",
        drawerName: "ABC Beton A.Ş.",
        periodId: defaultTenantScope.periodId,
        status: "Portföyde",
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      action: "cheque.create",
      entityLabel: "CEK-0001 / CK-0001",
      entityType: "cheque",
      metadata: {
        amount: 125000,
        checkNo: "CK-0001",
        documentNo: "CEK-0001",
        statusTo: "Portföyde",
      },
    });
  });

  test("normalizes cheque currency to the P0 base transaction currency", async () => {
    const service = createChequeService({
      now: () => "2026-06-27T09:00:00.000Z",
      repository: createSeededChequeMemoryRepository(),
    });

    const result = await service.create({
      scope: defaultTenantScope,
      values: {
        ...createValues,
        checkNo: "CK-P0-001",
        currency: "USD",
        documentNo: "CEK-P0-001",
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        checkNo: "CK-P0-001",
        currency: "TL",
        documentNo: "CEK-P0-001",
      },
    });
  });

  test("rejects duplicate document and cheque numbers in same tenant scope", async () => {
    const service = createChequeService({
      now: () => "2026-06-27T09:00:00.000Z",
      repository: createSeededChequeMemoryRepository(),
    });

    await service.create({
      scope: defaultTenantScope,
      values: createValues,
    });

    const duplicate = await service.create({
      scope: defaultTenantScope,
      values: {
        ...createValues,
        drawerName: "Başka Cari",
      },
    });

    expect(duplicate).toEqual({
      ok: false,
      errors: [
        "Evrak no bu dönem için zaten kullanılıyor: CEK-0001",
        "Çek no bu dönem için zaten kullanılıyor: CK-0001",
      ],
    });
  });

  test("collects portfolio cheque once and records audit only for the transition", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createChequeService({
      auditLogRepository: createMemoryAuditRepository(auditLogs),
      now: () => "2026-06-27T09:00:00.000Z",
      repository: createSeededChequeMemoryRepository(),
    });

    const created = await service.create({
      scope: defaultTenantScope,
      values: createValues,
    });
    expect(created.ok).toBe(true);

    const collected = await service.collect({
      id: created.ok ? created.data.id : "",
      scope: defaultTenantScope,
    });
    const collectedAgain = await service.collect({
      id: created.ok ? created.data.id : "",
      scope: defaultTenantScope,
    });

    expect(collected).toMatchObject({
      ok: true,
      data: {
        status: "Tahsil Edildi",
        updatedBy: defaultTenantScope.userId,
      },
    });
    expect(collectedAgain).toMatchObject({
      ok: true,
      data: {
        status: "Tahsil Edildi",
      },
    });
    expect(auditLogs.map((row) => row.action)).toEqual([
      "cheque.create",
      "cheque.collect",
    ]);
    expect(auditLogs[1]).toMatchObject({
      action: "cheque.collect",
      metadata: {
        statusFrom: "Portföyde",
        statusTo: "Tahsil Edildi",
      },
    });
  });

  test("normalizes cheque audit metadata currency to the P0 base transaction currency", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const legacyCheque: ChequeRow = {
      amount: 125000,
      bankName: "Garanti BBVA",
      branchName: "Maslak",
      checkNo: "CK-LEGACY-001",
      companyId: defaultTenantScope.companyId,
      createdAt: "2026-06-27T09:00:00.000Z",
      createdBy: defaultTenantScope.userId,
      currency: "USD",
      description: "Eski dövizli kayıt",
      direction: "Gelen",
      documentNo: "CEK-LEGACY-001",
      drawerName: "ABC Beton A.Ş.",
      dueDate: "2026-08-15",
      id: "legacy-cheque-1",
      issueDate: "2026-06-27",
      periodId: defaultTenantScope.periodId,
      status: "Portföyde",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: "2026-06-27T09:00:00.000Z",
      updatedBy: defaultTenantScope.userId,
    };
    const service = createChequeService({
      auditLogRepository: createMemoryAuditRepository(auditLogs),
      now: () => "2026-06-27T10:00:00.000Z",
      repository: createMemoryChequeRepository([legacyCheque]),
    });

    await service.collect({
      id: legacyCheque.id,
      scope: defaultTenantScope,
    });

    expect(auditLogs).toEqual([
      expect.objectContaining({
        action: "cheque.collect",
        metadata: expect.objectContaining({
          currency: "TL",
          documentNo: "CEK-LEGACY-001",
        }),
      }),
    ]);
  });

  test("creates one cash bank collection movement when cheque is collected", async () => {
    const movements: CashBankMovementRow[] = [];
    const service = createChequeService({
      cashBankMovementRepository: createMemoryCashBankMovementRepository(
        movements,
      ),
      now: () => "2026-06-27T09:00:00.000Z",
      repository: createSeededChequeMemoryRepository(),
    });

    const created = await service.create({
      scope: defaultTenantScope,
      values: createValues,
    });
    expect(created.ok).toBe(true);

    await service.collect({
      id: created.ok ? created.data.id : "",
      scope: defaultTenantScope,
    });
    await service.collect({
      id: created.ok ? created.data.id : "",
      scope: defaultTenantScope,
    });

    expect(movements).toEqual([
      expect.objectContaining({
        accountCode: "KASA-0001",
        accountName: "MERKEZ KASA",
        amount: 125000,
        currency: "TL",
        direction: "Giriş",
        documentNo: "CEK-0001",
        movementDate: "2026-06-27",
        movementType: "Çek Tahsilatı",
        sourceId: created.ok ? created.data.id : "",
        sourceLabel: "CEK-0001 / CK-0001",
        sourceType: "cheque",
      }),
    ]);
  });

  test("hydrates cheque ledger document references when listing", async () => {
    let chequeId = "cheque-1";
    const ledgerRepository = {
      async list() {
        return [{
          id: "ledger-cheque-1",
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          currency: "TL" as const,
          documentNo: "YVM-THS-CEK-0001",
          entryDate: "2026-06-27",
          description: "Çek tahsilat muhasebe fişi",
          lines: [],
          sourceType: "cheque",
          sourceId: chequeId,
          status: "posted" as const,
          debitTotal: 125000,
          creditTotal: 125000,
          createdBy: defaultTenantScope.userId,
          updatedBy: defaultTenantScope.userId,
          createdAt: "2026-06-27T09:00:00.000Z",
          updatedAt: "2026-06-27T09:00:00.000Z",
        }];
      },
    } as unknown as LedgerRepository;
    const service = createChequeService({
      ledgerRepository,
      now: () => "2026-06-27T09:00:00.000Z",
      repository: createSeededChequeMemoryRepository(),
    });

    const created = await service.create({ scope: defaultTenantScope, values: createValues });
    expect(created.ok).toBe(true);
    if (created.ok) chequeId = created.data.id;

    const result = await service.list({ scope: defaultTenantScope });

    expect(result).toMatchObject({ ok: true, data: { rows: [expect.objectContaining({ ledgerDocumentNo: "YVM-THS-CEK-0001" })] } });
  });

  test("uses selected cash bank account when creating cheque collection movement", async () => {
    const movements: CashBankMovementRow[] = [];
    const service = createChequeService({
      cashBankMovementRepository: createMemoryCashBankMovementRepository(
        movements,
      ),
      now: () => "2026-06-27T09:00:00.000Z",
      repository: createSeededChequeMemoryRepository(),
    });

    const created = await service.create({
      scope: defaultTenantScope,
      values: {
        ...createValues,
        checkNo: "CK-0002",
        documentNo: "CEK-0002",
      },
    });
    expect(created.ok).toBe(true);

    await service.collect({
      collectionAccount: {
        code: "BANKA-0002",
        name: "ŞANTİYE TAHSİLAT BANKASI",
      },
      id: created.ok ? created.data.id : "",
      scope: defaultTenantScope,
    });

    expect(movements).toEqual([
      expect.objectContaining({
        accountCode: "BANKA-0002",
        accountName: "ŞANTİYE TAHSİLAT BANKASI",
        documentNo: "CEK-0002",
      }),
    ]);
  });

  test("rejects cheque mutations for read only role", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createChequeService({
      auditLogRepository: createMemoryAuditRepository(auditLogs),
      now: () => "2026-06-27T09:00:00.000Z",
      repository: createSeededChequeMemoryRepository(),
    });

    const createResult = await service.create({
      scope: readOnlyScope,
      values: createValues,
    });
    const collectResult = await service.collect({
      id: "missing",
      scope: readOnlyScope,
    });

    expect(createResult).toEqual({
      ok: false,
      errors: ["Çek işlemi için muhasebe yetkisi gereklidir."],
    });
    expect(collectResult).toEqual({
      ok: false,
      errors: ["Çek işlemi için muhasebe yetkisi gereklidir."],
    });
    expect(auditLogs).toEqual([]);
  });
});

function createMemoryAuditRepository(
  entries: AuditLogEntryInput[],
): AuditLogRepository {
  return {
    async record(input) {
      entries.push(input);
    },
  };
}

function createMemoryChequeRepository(rows: ChequeRow[]): ChequeRepository {
  return {
    async list() {
      return rows.map((row) => ({ ...row }));
    },

    async create(input) {
      rows.push({ ...input });

      return { ...input };
    },

    async update(input) {
      const index = rows.findIndex((row) => row.id === input.id);

      if (index >= 0) {
        rows[index] = { ...input };
      }

      return { ...input };
    },
  };
}

function createMemoryCashBankMovementRepository(
  entries: CashBankMovementRow[],
): CashBankMovementRepository {
  return {
    async list() {
      return entries.map((entry) => ({ ...entry }));
    },

    async create(input) {
      entries.push({ ...input });

      return { ...input };
    },
  };
}
