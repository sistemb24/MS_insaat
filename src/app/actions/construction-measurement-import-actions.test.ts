import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  contractItemFindMany: vi.fn(),
  listProjectBatches: vi.fn(),
  findBatch: vi.fn(),
  createBatch: vi.fn(),
  validateBatch: vi.fn(),
  applyBatch: vi.fn(),
  cancelBatch: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    constructionContractItem: { findMany: mocks.contractItemFindMany },
  },
}));
vi.mock("./subscription-feature-action-guard", () => ({
  getSubscriptionFeatureActionContext: mocks.context,
}));
vi.mock(
  "@/lib/construction-measurement-import-prisma-repository",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("@/lib/construction-measurement-import-prisma-repository")
    >();
    return {
      ...actual,
      createConstructionMeasurementImportPrismaRepository: () => ({
        listProjectBatches: mocks.listProjectBatches,
        findBatch: mocks.findBatch,
        createBatch: mocks.createBatch,
        validateBatch: mocks.validateBatch,
        applyBatch: mocks.applyBatch,
        cancelBatch: mocks.cancelBatch,
      }),
    };
  },
);

import {
  applyConstructionMeasurementImportBatchAction,
  cancelConstructionMeasurementImportBatchAction,
  getConstructionMeasurementImportBatchAction,
  listConstructionMeasurementImportBatchesAction,
  uploadConstructionMeasurementImportAction,
  validateConstructionMeasurementImportBatchAction,
  type ConstructionMeasurementImportUploadFile,
} from "./construction-measurement-import-actions";
import { ConstructionMeasurementImportRepositoryError } from "@/lib/construction-measurement-import-prisma-repository";

const scope = {
  tenantId: "tenant-construction",
  tenantName: "Tenant",
  companyId: "company-construction",
  companyName: "Company",
  periodId: "period-construction",
  periodLabel: "2026",
  userId: "accounting-user",
  userName: "Accounting",
  userRole: "accounting" as const,
  licenseLabel: "Kurumsal",
  periodClosed: false,
};

function batch(status = "DRAFT") {
  return {
    id: "batch-1",
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    projectId: "project-1",
    sourceProgressPaymentId: "payment-1",
    batchNo: 1,
    status,
    rows: [],
    events: [],
  };
}

function uploadFile(
  text: string,
  overrides: Partial<ConstructionMeasurementImportUploadFile> = {},
): ConstructionMeasurementImportUploadFile {
  const bytes = new TextEncoder().encode(text);
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return {
    name: "metraj.csv",
    type: "text/csv",
    size: bytes.byteLength,
    arrayBuffer: vi.fn().mockResolvedValue(arrayBuffer),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({ ok: true, scope });
  mocks.contractItemFindMany.mockResolvedValue([
    { id: "item-1", itemCode: "15.001", unit: "m³", isActive: true },
  ]);
  mocks.listProjectBatches.mockResolvedValue([batch()]);
  mocks.findBatch.mockResolvedValue(batch());
  mocks.createBatch.mockResolvedValue({ kind: "created", batch: batch() });
  mocks.validateBatch.mockResolvedValue({
    kind: "updated",
    batch: batch("VALIDATED"),
  });
  mocks.applyBatch.mockResolvedValue({
    kind: "updated",
    batch: batch("APPLIED"),
  });
  mocks.cancelBatch.mockResolvedValue({
    kind: "updated",
    batch: batch("CANCELLED"),
  });
});

describe("construction measurement import action reads", () => {
  it("lists scoped batches for accounting and returns create capability", async () => {
    const result = await listConstructionMeasurementImportBatchesAction("project-1");

    expect(result).toEqual({
      ok: true,
      data: { rows: [batch()], canCreate: true },
    });
    expect(mocks.listProjectBatches).toHaveBeenCalledWith({
      scope,
      projectId: "project-1",
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("denies viewer reads before repository access", async () => {
    mocks.context.mockResolvedValue({
      ok: true,
      scope: { ...scope, userRole: "viewer" },
    });

    const result = await getConstructionMeasurementImportBatchAction("batch-1");

    expect(result).toEqual({
      ok: false,
      errors: ["Bu import işlemi için muhasebe veya yönetici yetkisi gereklidir."],
    });
    expect(mocks.findBatch).not.toHaveBeenCalled();
  });

  it("returns safe not-found detail and mutation permissions", async () => {
    const detail = await getConstructionMeasurementImportBatchAction("batch-1");
    expect(detail).toEqual({
      ok: true,
      data: {
        batch: batch(),
        permissions: {
          canValidate: true,
          canApply: false,
          canCancel: true,
        },
      },
    });

    mocks.findBatch.mockResolvedValueOnce(null);
    await expect(getConstructionMeasurementImportBatchAction("other"))
      .resolves.toEqual({
        ok: false,
        errors: ["Import batch'i aktif kapsamda bulunamadı."],
      });
  });
});

describe("construction measurement import upload action", () => {
  it("parses bytes on the server and persists only normalized staging data", async () => {
    const file = uploadFile(
      "poz_no;miktar;aciklama;birim\n15.001;2,5;Beton;m³\n",
    );
    const result = await uploadConstructionMeasurementImportAction({
      projectId: " project-1 ",
      sourceProgressPaymentId: " payment-1 ",
      file,
    });

    expect(result).toEqual({
      ok: true,
      data: { kind: "created", batch: batch() },
    });
    expect(mocks.contractItemFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        projectId: "project-1",
      },
      select: {
        id: true,
        itemCode: true,
        unit: true,
        isActive: true,
      },
    });
    expect(mocks.createBatch).toHaveBeenCalledWith({
      scope,
      projectId: "project-1",
      sourceProgressPaymentId: "payment-1",
      parseResult: expect.objectContaining({
        originalFileName: "metraj.csv",
        fileSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        rows: [expect.objectContaining({
          sourceItemCode: "15.001",
          contractItemId: "item-1",
          quantity: 2.5,
          status: "READY",
        })],
        canValidate: true,
      }),
      nowIso: expect.any(String),
    });
    expect(mocks.createBatch.mock.calls[0][0].parseResult).not.toHaveProperty(
      "bytes",
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/hakedis");
  });

  it("persists row-level validation errors as a draft report", async () => {
    const file = uploadFile("poz_no;miktar\n99.999;1\n");
    await uploadConstructionMeasurementImportAction({
      projectId: "project-1",
      sourceProgressPaymentId: "payment-1",
      file,
    });

    expect(mocks.createBatch).toHaveBeenCalledWith(expect.objectContaining({
      parseResult: expect.objectContaining({
        canValidate: false,
        summary: {
          totalRowCount: 1,
          validRowCount: 0,
          errorRowCount: 1,
        },
        rows: [expect.objectContaining({
          errorCode: "ITEM_NOT_FOUND",
          status: "ERROR",
        })],
      }),
    }));
  });

  it("rejects file-level errors and size mismatch without persistence", async () => {
    const invalidName = uploadFile("poz_no;miktar\n15.001;1\n", {
      name: "metraj.xlsx",
    });
    await expect(uploadConstructionMeasurementImportAction({
      projectId: "project-1",
      sourceProgressPaymentId: "payment-1",
      file: invalidName,
    })).resolves.toEqual({
      ok: false,
      errors: ["Yalnız .csv uzantılı dosyalar kabul edilir."],
    });

    const mismatch = uploadFile("poz_no;miktar\n15.001;1\n");
    mismatch.size += 1;
    await expect(uploadConstructionMeasurementImportAction({
      projectId: "project-1",
      sourceProgressPaymentId: "payment-1",
      file: mismatch,
    })).resolves.toEqual({
      ok: false,
      errors: ["Dosya boyutu doğrulanamadı."],
    });
    expect(mocks.createBatch).not.toHaveBeenCalled();
  });

  it("fails closed on subscription and role guards before reading the file", async () => {
    const file = uploadFile("poz_no;miktar\n15.001;1\n");
    mocks.context.mockResolvedValueOnce({
      ok: false,
      result: { ok: false, errors: ["Paket özelliği kapalı."] },
    });
    await expect(uploadConstructionMeasurementImportAction({
      projectId: "project-1",
      sourceProgressPaymentId: "payment-1",
      file,
    })).resolves.toEqual({ ok: false, errors: ["Paket özelliği kapalı."] });

    mocks.context.mockResolvedValueOnce({
      ok: true,
      scope: { ...scope, userRole: "viewer" },
    });
    await expect(uploadConstructionMeasurementImportAction({
      projectId: "project-1",
      sourceProgressPaymentId: "payment-1",
      file,
    })).resolves.toEqual({
      ok: false,
      errors: ["Bu import işlemi için muhasebe veya yönetici yetkisi gereklidir."],
    });
    expect(file.arrayBuffer).not.toHaveBeenCalled();
    expect(mocks.contractItemFindMany).not.toHaveBeenCalled();
  });
});

describe("construction measurement import mutation actions", () => {
  it("validates, applies and cancels through scoped repository operations", async () => {
    const validated = await validateConstructionMeasurementImportBatchAction("batch-1");
    expect(validated).toEqual(expect.objectContaining({ ok: true }));
    expect(mocks.validateBatch).toHaveBeenCalledWith({
      scope,
      batchId: "batch-1",
      nowIso: expect.any(String),
    });

    mocks.findBatch.mockResolvedValueOnce(batch("VALIDATED"));
    const applied = await applyConstructionMeasurementImportBatchAction("batch-1");
    expect(applied).toEqual(expect.objectContaining({ ok: true }));
    expect(mocks.applyBatch).toHaveBeenCalledWith({
      scope,
      batchId: "batch-1",
      nowIso: expect.any(String),
    });

    mocks.findBatch.mockResolvedValueOnce(batch("VALIDATED"));
    const cancelled = await cancelConstructionMeasurementImportBatchAction("batch-1");
    expect(cancelled).toEqual(expect.objectContaining({ ok: true }));
    expect(mocks.cancelBatch).toHaveBeenCalledWith({
      scope,
      batchId: "batch-1",
      nowIso: expect.any(String),
    });
    expect(mocks.revalidate).toHaveBeenCalledTimes(3);
  });

  it("denies viewer and closed-period mutations before repository writes", async () => {
    mocks.context.mockResolvedValueOnce({
      ok: true,
      scope: { ...scope, userRole: "viewer" },
    });
    await expect(validateConstructionMeasurementImportBatchAction("batch-1"))
      .resolves.toEqual(expect.objectContaining({ ok: false }));
    expect(mocks.findBatch).not.toHaveBeenCalled();

    mocks.context.mockResolvedValueOnce({
      ok: true,
      scope: { ...scope, periodClosed: true },
    });
    mocks.findBatch.mockResolvedValueOnce(batch("VALIDATED"));
    await expect(applyConstructionMeasurementImportBatchAction("batch-1"))
      .resolves.toEqual({
        ok: false,
        errors: ["Kapalı dönemde import işlemi yapılamaz."],
      });
    expect(mocks.applyBatch).not.toHaveBeenCalled();
  });

  it("allows terminal idempotent retries without revalidation", async () => {
    mocks.findBatch.mockResolvedValueOnce(batch("APPLIED"));
    mocks.applyBatch.mockResolvedValueOnce({
      kind: "idempotent",
      batch: batch("APPLIED"),
    });
    const applied = await applyConstructionMeasurementImportBatchAction("batch-1");
    expect(applied).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        kind: "idempotent",
        batch: expect.objectContaining({ status: "APPLIED" }),
      }),
    }));

    mocks.findBatch.mockResolvedValueOnce(batch("CANCELLED"));
    mocks.cancelBatch.mockResolvedValueOnce({
      kind: "idempotent",
      batch: batch("CANCELLED"),
    });
    await expect(cancelConstructionMeasurementImportBatchAction("batch-1"))
      .resolves.toEqual(expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          kind: "idempotent",
          batch: expect.objectContaining({ status: "CANCELLED" }),
        }),
      }));
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("maps repository and unknown failures without leaking raw exceptions", async () => {
    mocks.validateBatch.mockRejectedValueOnce(
      new ConstructionMeasurementImportRepositoryError(
        "SOURCE_STALE",
        "Kaynak hakediş veya snapshot değişti; yeni import batch'i oluşturun.",
      ),
    );
    await expect(validateConstructionMeasurementImportBatchAction("batch-1"))
      .resolves.toEqual({
        ok: false,
        errors: [
          "Kaynak hakediş veya snapshot değişti; yeni import batch'i oluşturun.",
        ],
      });

    mocks.validateBatch.mockRejectedValueOnce(
      new Error("postgresql://secret@host/raw-table"),
    );
    const result = await validateConstructionMeasurementImportBatchAction("batch-1");
    expect(result).toEqual({
      ok: false,
      errors: ["Import işlemi güvenli biçimde tamamlanamadı."],
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
