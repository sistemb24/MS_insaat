import { describe, expect, it, vi } from "vitest";

import {
  parseConstructionMeasurementImportCsv,
  type ConstructionMeasurementImportParseResult,
} from "./construction-measurement-import";
import {
  ConstructionMeasurementImportRepositoryError,
  createConstructionMeasurementImportPrismaRepository,
  type ConstructionMeasurementImportPrismaClientLike,
} from "./construction-measurement-import-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const encoder = new TextEncoder();
const firstTimestamp = "2026-07-23T20:00:00.000Z";
const secondTimestamp = "2026-07-23T21:00:00.000Z";
const sourceTimestamp = "2026-07-23T19:00:00.000Z";
const snapshotTimestamp = "2026-07-23T19:30:00.000Z";

function parseResult(
  text = "poz_no;miktar;aciklama;birim\n15.001;2,5;Beton;m³\n",
) {
  return parseConstructionMeasurementImportCsv({
    bytes: encoder.encode(text),
    fileName: "metraj.csv",
    contentType: "text/csv",
    contractItems: [
      { id: "item-1", itemCode: "15.001", unit: "m³", isActive: true },
      { id: "item-2", itemCode: "Y.16.050", unit: "kg", isActive: true },
    ],
  });
}

function decimal(value: number) {
  return { toNumber: () => value };
}

function rowRecord(
  row = parseResult().rows[0],
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "row-1",
    batchId: "batch-1",
    ...row,
    quantity: row.quantity === null ? null : decimal(row.quantity),
    appliedMeasurementLineId: null,
    createdAt: new Date(firstTimestamp),
    ...overrides,
  };
}

function eventRecord(
  eventType = "CREATED",
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `event-${eventType.toLocaleLowerCase("en-US")}`,
    batchId: "batch-1",
    eventType,
    actorUserId: defaultTenantScope.userId,
    metadata: { totalRowCount: 1 },
    createdAt: new Date(firstTimestamp),
    ...overrides,
  };
}

function batchRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "batch-1",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    projectId: "project-1",
    sourceProgressPaymentId: "payment-1",
    batchNo: 1,
    status: "DRAFT",
    originalFileName: "metraj.csv",
    contentType: "text/csv",
    fileSize: 58,
    fileSha256: "a".repeat(64),
    mappingVersion: "measurement-csv-v1",
    delimiter: ";",
    totalRowCount: 1,
    validRowCount: 1,
    errorRowCount: 0,
    sourceProgressPaymentUpdatedAt: new Date(sourceTimestamp),
    sourceSnapshotAt: new Date(snapshotTimestamp),
    targetSheetId: null,
    failureCode: null,
    createdBy: defaultTenantScope.userId,
    validatedBy: null,
    appliedBy: null,
    cancelledBy: null,
    createdAt: new Date(firstTimestamp),
    updatedAt: new Date(firstTimestamp),
    validatedAt: null,
    appliedAt: null,
    cancelledAt: null,
    rows: [rowRecord()],
    events: [eventRecord()],
    ...overrides,
  };
}

function setup(input: {
  existing?: ReturnType<typeof batchRecord> | null;
  list?: ReturnType<typeof batchRecord>[];
  latestBatchNo?: number | null;
  period?: { isClosed: boolean } | null;
  project?: Record<string, unknown> | null;
  payment?: Record<string, unknown> | null;
  contractItemCount?: number;
  updateCount?: number;
  lineCreateCount?: number;
} = {}) {
  let current = input.existing === undefined ? batchRecord() : input.existing;
  const constructionMeasurementImportBatch = {
    findMany: vi.fn().mockResolvedValue(input.list ?? [batchRecord()]),
    findFirst: vi.fn(async (args: Record<string, unknown>) => {
      if ("orderBy" in args && "select" in args) {
        return input.latestBatchNo === null
          ? null
          : { batchNo: input.latestBatchNo ?? 0 };
      }
      return current;
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const nestedRows = data.rows as {
        createMany: { data: Array<Record<string, unknown>> };
      };
      const nestedEvents = data.events as {
        create: Record<string, unknown>;
      };
      const createdRows = nestedRows.createMany.data.map((row) => ({
          batchId: String(data.id),
          appliedMeasurementLineId: null,
          ...row,
        })) as ReturnType<typeof rowRecord>[];
      const createdEvents = [{
          batchId: String(data.id),
          ...nestedEvents.create,
        }] as ReturnType<typeof eventRecord>[];
      current = batchRecord({
        ...data,
        rows: createdRows,
        events: createdEvents,
      });
      return current;
    }),
    updateMany: vi.fn(async ({ data }: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      const count = input.updateCount ?? 1;
      if (count && current) current = { ...current, ...data };
      return { count };
    }),
  };
  const constructionMeasurementImportEvent = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      if (current) {
        const createdEvent = {
          ...data,
          batchId: current.id,
        } as ReturnType<typeof eventRecord>;
        current = {
          ...current,
          events: [...current.events, createdEvent],
        };
      }
      return data;
    }),
  };
  const constructionMeasurementImportRow = {
    updateMany: vi.fn(async ({ where, data }: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      if (current) current = {
        ...current,
        rows: current.rows.map((row) =>
          row.id === where.id ? { ...row, ...data } : row),
      };
      return { count: 1 };
    }),
  };
  const constructionProject = {
    findFirst: vi.fn().mockResolvedValue(
      input.project === undefined ? { id: "project-1" } : input.project,
    ),
  };
  const constructionProgressPayment = {
    findFirst: vi.fn().mockResolvedValue(
      input.payment === undefined
        ? {
            id: "payment-1",
            projectId: "project-1",
            status: "DRAFT",
            updatedAt: new Date(sourceTimestamp),
            snapshots: [{ createdAt: new Date(snapshotTimestamp) }],
          }
        : input.payment,
    ),
    update: vi.fn().mockResolvedValue({}),
  };
  const constructionContractItem = {
    count: vi.fn().mockResolvedValue(input.contractItemCount ?? 1),
  };
  const constructionMeasurementSheet = {
    create: vi.fn().mockResolvedValue({ id: "sheet-1" }),
  };
  const constructionMeasurementLine = {
    createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({
      count: input.lineCreateCount ?? data.length,
    })),
  };
  const constructionPaymentItemSnapshot = {
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const period = {
    findFirst: vi.fn().mockResolvedValue(
      input.period === undefined ? { isClosed: false } : input.period,
    ),
  };
  const auditLog = {
    create: vi.fn().mockResolvedValue({}),
  };
  const transaction = {
    constructionMeasurementImportBatch,
    constructionMeasurementImportRow,
    constructionMeasurementImportEvent,
    constructionProject,
    constructionProgressPayment,
    constructionContractItem,
    constructionMeasurementSheet,
    constructionMeasurementLine,
    constructionPaymentItemSnapshot,
    period,
    auditLog,
  };
  const $transaction = vi.fn(async (
    callback: (client: typeof transaction) => Promise<unknown>,
  ) => callback(transaction));
  const recalculateSnapshots = vi.fn().mockResolvedValue(undefined);
  let sequence = 0;
  const repository = createConstructionMeasurementImportPrismaRepository(
    { ...transaction, $transaction } as unknown as ConstructionMeasurementImportPrismaClientLike,
    {
      createId: () => `generated-${++sequence}`,
      recalculateSnapshots,
    },
  );
  return {
    repository,
    $transaction,
    constructionMeasurementImportBatch,
    constructionMeasurementImportRow,
    constructionMeasurementImportEvent,
    constructionProject,
    constructionProgressPayment,
    constructionContractItem,
    constructionMeasurementSheet,
    constructionMeasurementLine,
    period,
    auditLog,
    recalculateSnapshots,
  };
}

function createInput(result: ConstructionMeasurementImportParseResult = parseResult()) {
  return {
    scope: defaultTenantScope,
    projectId: "project-1",
    sourceProgressPaymentId: "payment-1",
    parseResult: result,
    nowIso: firstTimestamp,
  };
}

describe("construction measurement import repository reads", () => {
  it("lists only batches inside tenant, company, period and project scope", async () => {
    const { repository, constructionMeasurementImportBatch } = setup();
    const rows = await repository.listProjectBatches({
      scope: defaultTenantScope,
      projectId: "project-1",
      statuses: ["DRAFT", "VALIDATED"],
    });

    expect(constructionMeasurementImportBatch.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "project-1",
        status: { in: ["DRAFT", "VALIDATED"] },
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      orderBy: [{ createdAt: "desc" }, { batchNo: "desc" }],
    });
    expect(rows[0]).not.toHaveProperty("rows");
    expect(rows[0]).not.toHaveProperty("events");
  });

  it("loads ordered row/event detail through the full active scope", async () => {
    const { repository, constructionMeasurementImportBatch } = setup();
    const batch = await repository.findBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
    });

    expect(constructionMeasurementImportBatch.findFirst).toHaveBeenCalledWith({
      where: {
        id: "batch-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      include: {
        rows: { orderBy: { rowNo: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
      },
    });
    expect(batch).toEqual(expect.objectContaining({
      id: "batch-1",
      rows: [expect.objectContaining({ quantity: 2.5 })],
    }));
  });

  it("returns null instead of leaking a batch outside scope", async () => {
    const { repository } = setup({ existing: null });
    await expect(repository.findBatch({
      scope: { ...defaultTenantScope, companyId: "other-company" },
      batchId: "batch-1",
    })).resolves.toBeNull();
  });
});

describe("construction measurement import repository create and validate", () => {
  it("creates normalized batch, rows and CREATED event in one transaction", async () => {
    const {
      repository,
      $transaction,
      constructionMeasurementImportBatch,
      constructionProject,
      constructionProgressPayment,
      constructionContractItem,
      auditLog,
    } = setup({ existing: null, latestBatchNo: 3 });

    const result = await repository.createBatch(createInput());

    expect(result.kind).toBe("created");
    expect($transaction).toHaveBeenCalledTimes(1);
    expect(constructionProject.findFirst).toHaveBeenCalledWith({
      where: {
        id: "project-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      select: { id: true },
    });
    expect(constructionProgressPayment.findFirst).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        projectId: "project-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      select: expect.objectContaining({
        id: true,
        projectId: true,
        updatedAt: true,
      }),
    });
    expect(constructionContractItem.count).toHaveBeenCalledWith({
      where: {
        id: { in: ["item-1"] },
        projectId: "project-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
    });
    expect(constructionMeasurementImportBatch.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "generated-1",
        batchNo: 4,
        status: "DRAFT",
        sourceProgressPaymentUpdatedAt: new Date(sourceTimestamp),
        sourceSnapshotAt: new Date(snapshotTimestamp),
        rows: {
          createMany: {
            data: [expect.objectContaining({
              id: "generated-2",
              contractItemId: "item-1",
              quantity: 2.5,
            })],
          },
        },
        events: {
          create: expect.objectContaining({
            id: "generated-3",
            eventType: "CREATED",
            metadata: {
              mappingVersion: "measurement-csv-v1",
              totalRowCount: 1,
              validRowCount: 1,
              errorRowCount: 0,
            },
          }),
        },
      }),
      include: expect.any(Object),
    });
    expect(auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        actorUserId: defaultTenantScope.userId,
        action: "CONSTRUCTION_MEASUREMENT_IMPORT_CREATED",
        entityType: "construction-measurement-import",
        entityId: "generated-1",
        entityLabel: "IMP-0004",
        occurredAt: new Date(firstTimestamp),
        metadata: {
          batchId: "generated-1",
          projectId: "project-1",
          sourceProgressPaymentId: "payment-1",
          mappingVersion: "measurement-csv-v1",
          totalRowCount: 1,
          validRowCount: 1,
          errorRowCount: 0,
          statusFrom: null,
          statusTo: "DRAFT",
        },
      },
    });
  });

  it("returns the existing scoped batch for an idempotent file retry", async () => {
    const { repository, constructionMeasurementImportBatch, period, auditLog } = setup();
    const result = await repository.createBatch(createInput());

    expect(result.kind).toBe("idempotent");
    expect(constructionMeasurementImportBatch.create).not.toHaveBeenCalled();
    expect(period.findFirst).not.toHaveBeenCalled();
    expect(auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects malformed staging summaries before opening a transaction", async () => {
    const { repository, $transaction } = setup({ existing: null });
    const invalid = {
      ...parseResult(),
      fileSha256: "invalid",
    };

    await expect(repository.createBatch(createInput(invalid))).rejects.toEqual(
      expect.objectContaining({ code: "INVALID_STAGING_DATA" }),
    );
    expect($transaction).not.toHaveBeenCalled();
  });

  it("fails closed for closed period or mismatched source references", async () => {
    for (const setupInput of [
      { period: { isClosed: true } },
      { project: null },
      { payment: null },
      { contractItemCount: 0 },
    ]) {
      const { repository, constructionMeasurementImportBatch } = setup({
        existing: null,
        ...setupInput,
      });
      await expect(repository.createBatch(createInput())).rejects.toBeInstanceOf(
        ConstructionMeasurementImportRepositoryError,
      );
      expect(constructionMeasurementImportBatch.create).not.toHaveBeenCalled();
    }
  });

  it("validates a ready draft with an optimistic scoped update and event", async () => {
    const {
      repository,
      constructionMeasurementImportBatch,
      constructionMeasurementImportEvent,
      constructionContractItem,
      auditLog,
    } = setup();
    const result = await repository.validateBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
      nowIso: secondTimestamp,
    });

    expect(result).toEqual(expect.objectContaining({
      kind: "updated",
      batch: expect.objectContaining({ status: "VALIDATED" }),
    }));
    expect(constructionContractItem.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: { in: ["item-1"] },
        projectId: "project-1",
        isActive: true,
      }),
    });
    expect(constructionMeasurementImportBatch.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "batch-1",
        status: "DRAFT",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      }),
      data: {
        status: "VALIDATED",
        validatedBy: defaultTenantScope.userId,
        validatedAt: new Date(secondTimestamp),
        updatedAt: new Date(secondTimestamp),
      },
    });
    expect(constructionMeasurementImportEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "VALIDATED",
        actorUserId: defaultTenantScope.userId,
      }),
    });
    expect(auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CONSTRUCTION_MEASUREMENT_IMPORT_VALIDATED",
        entityId: "batch-1",
        metadata: expect.objectContaining({
          statusFrom: "DRAFT",
          statusTo: "VALIDATED",
        }),
      }),
    });
  });

  it("rejects invalid rows, stale source and a lost optimistic update", async () => {
    const invalidBatch = batchRecord({
      validRowCount: 0,
      errorRowCount: 1,
      rows: [rowRecord(parseResult().rows[0], {
        status: "ERROR",
        errorCode: "UNIT_MISMATCH",
      })],
    });
    await expect(setup({ existing: invalidBatch }).repository.validateBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
      nowIso: secondTimestamp,
    })).rejects.toEqual(expect.objectContaining({ code: "INVALID_STAGING_DATA" }));

    await expect(setup({
      payment: {
        id: "payment-1",
        projectId: "project-1",
        status: "DRAFT",
        updatedAt: new Date(secondTimestamp),
        snapshots: [{ createdAt: new Date(snapshotTimestamp) }],
      },
    }).repository.validateBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
      nowIso: secondTimestamp,
    })).rejects.toEqual(expect.objectContaining({ code: "SOURCE_STALE" }));

    await expect(setup({ updateCount: 0 }).repository.validateBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
      nowIso: secondTimestamp,
    })).rejects.toEqual(expect.objectContaining({ code: "CONCURRENCY_CONFLICT" }));
  });
});

describe("construction measurement import repository apply and cancel", () => {
  it("applies all rows, links history and recalculates snapshots atomically", async () => {
    const existing = batchRecord({
      status: "VALIDATED",
      validatedBy: defaultTenantScope.userId,
      validatedAt: new Date(firstTimestamp),
    });
    const {
      repository,
      constructionMeasurementSheet,
      constructionMeasurementLine,
      constructionMeasurementImportRow,
      constructionMeasurementImportBatch,
      constructionMeasurementImportEvent,
      auditLog,
      recalculateSnapshots,
    } = setup({ existing });

    const result = await repository.applyBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
      nowIso: secondTimestamp,
    });

    expect(result).toEqual(expect.objectContaining({
      kind: "updated",
      batch: expect.objectContaining({
        status: "APPLIED",
        targetSheetId: "generated-1",
      }),
    }));
    expect(constructionMeasurementSheet.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "generated-1",
        progressPaymentId: "payment-1",
        sheetNo: "IMP-0001",
        sheetType: "GENERAL",
      }),
    });
    expect(constructionMeasurementLine.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        id: "generated-2",
        measurementSheetId: "generated-1",
        contractItemId: "item-1",
        lineNo: 1,
        quantity: 2.5,
        multiplier: 1,
      })],
    });
    expect(constructionMeasurementImportRow.updateMany).toHaveBeenCalledWith({
      where: {
        id: "row-1",
        batchId: "batch-1",
        appliedMeasurementLineId: null,
      },
      data: { appliedMeasurementLineId: "generated-2" },
    });
    expect(recalculateSnapshots).toHaveBeenCalledWith(
      expect.any(Object),
      "payment-1",
      defaultTenantScope,
    );
    expect(constructionMeasurementImportBatch.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "batch-1",
        status: "VALIDATED",
        targetSheetId: null,
      }),
      data: expect.objectContaining({
        status: "APPLIED",
        targetSheetId: "generated-1",
      }),
    });
    expect(constructionMeasurementImportEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "generated-3",
        eventType: "APPLIED",
        metadata: expect.objectContaining({
          targetSheetId: "generated-1",
          sheetNo: "IMP-0001",
        }),
      }),
    });
    expect(auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CONSTRUCTION_MEASUREMENT_IMPORT_APPLIED",
        metadata: expect.objectContaining({
          statusFrom: "VALIDATED",
          statusTo: "APPLIED",
          targetSheetId: "generated-1",
        }),
      }),
    });
  });

  it("returns applied retries without creating duplicate sheets or events", async () => {
    const {
      repository,
      constructionMeasurementSheet,
      constructionMeasurementImportEvent,
      auditLog,
    } =
      setup({
        existing: batchRecord({
          status: "APPLIED",
          targetSheetId: "sheet-1",
          appliedBy: defaultTenantScope.userId,
          appliedAt: new Date(secondTimestamp),
        }),
      });

    const result = await repository.applyBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
      nowIso: secondTimestamp,
    });

    expect(result.kind).toBe("idempotent");
    expect(constructionMeasurementSheet.create).not.toHaveBeenCalled();
    expect(constructionMeasurementImportEvent.create).not.toHaveBeenCalled();
    expect(auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects stale/non-editable sources and partial line persistence", async () => {
    const validated = batchRecord({ status: "VALIDATED" });
    const cases = [
      setup({
        existing: validated,
        payment: {
          id: "payment-1",
          projectId: "project-1",
          status: "DRAFT",
          updatedAt: new Date(secondTimestamp),
          snapshots: [{ createdAt: new Date(snapshotTimestamp) }],
        },
      }),
      setup({
        existing: validated,
        payment: {
          id: "payment-1",
          projectId: "project-1",
          status: "FINALIZED",
          updatedAt: new Date(sourceTimestamp),
          snapshots: [{ createdAt: new Date(snapshotTimestamp) }],
        },
      }),
      setup({ existing: validated, lineCreateCount: 0 }),
    ];

    await expect(cases[0].repository.applyBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
      nowIso: secondTimestamp,
    })).rejects.toEqual(expect.objectContaining({ code: "SOURCE_STALE" }));
    await expect(cases[1].repository.applyBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
      nowIso: secondTimestamp,
    })).rejects.toEqual(expect.objectContaining({ code: "INVALID_STATUS" }));
    await expect(cases[2].repository.applyBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
      nowIso: secondTimestamp,
    })).rejects.toEqual(expect.objectContaining({ code: "PERSISTENCE_INVARIANT" }));
  });

  it("cancels only draft/validated batches and makes retries idempotent", async () => {
    const first = setup();
    const cancelled = await first.repository.cancelBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
      nowIso: secondTimestamp,
    });
    expect(cancelled.batch.status).toBe("CANCELLED");
    expect(first.constructionMeasurementImportEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "CANCELLED",
        metadata: { previousStatus: "DRAFT" },
      }),
    });
    expect(first.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CONSTRUCTION_MEASUREMENT_IMPORT_CANCELLED",
        metadata: expect.objectContaining({
          statusFrom: "DRAFT",
          statusTo: "CANCELLED",
        }),
      }),
    });

    const retry = setup({ existing: batchRecord({ status: "CANCELLED" }) });
    await expect(retry.repository.cancelBatch({
      scope: defaultTenantScope,
      batchId: "batch-1",
      nowIso: secondTimestamp,
    })).resolves.toEqual(expect.objectContaining({ kind: "idempotent" }));
    expect(retry.constructionMeasurementImportEvent.create).not.toHaveBeenCalled();
    expect(retry.auditLog.create).not.toHaveBeenCalled();

    await expect(setup({ existing: batchRecord({ status: "APPLIED" }) })
      .repository.cancelBatch({
        scope: defaultTenantScope,
        batchId: "batch-1",
        nowIso: secondTimestamp,
      })).rejects.toEqual(expect.objectContaining({ code: "INVALID_STATUS" }));
  });
});
