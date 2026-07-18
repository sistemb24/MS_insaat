import { beforeEach, describe, expect, test, vi } from "vitest";

const getSubscriptionFeatureActionContextMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const chequeServiceMock = vi.hoisted(() => ({
  collect: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
}));
const progressPaymentServiceMock = vi.hoisted(() => ({
  cancel: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  post: vi.fn(),
}));
const tenderServiceMock = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  transitionStatus: vi.fn(),
  updateBoq: vi.fn(),
}));
const documentCenterServiceMock = vi.hoisted(() => ({
  createFileMetadata: vi.fn(),
  createUserFolder: vi.fn(),
  ensureSystemFolders: vi.fn(),
  list: vi.fn(),
  moveFileToTrash: vi.fn(),
  restoreFileFromTrash: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/app/actions/subscription-feature-action-guard", () => ({
  getSubscriptionFeatureActionContext: getSubscriptionFeatureActionContextMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: vi.fn(() => ({})),
}));

vi.mock("@/lib/cash-bank-movement-prisma-repository", () => ({
  createCashBankMovementPrismaRepository: vi.fn(() => ({})),
}));

vi.mock("@/lib/cash-bank-movement-service", () => ({
  createCashBankMovementService: vi.fn(() => ({
    createProgressPaymentCollection: vi.fn(),
    createProgressPaymentPayment: vi.fn(),
  })),
}));

vi.mock("@/lib/cheque-prisma-repository", () => ({
  createChequePrismaRepository: vi.fn(() => ({})),
}));

vi.mock("@/lib/cheque-service", () => ({
  createChequeService: vi.fn(() => chequeServiceMock),
}));

vi.mock("@/lib/document-center-prisma-repository", () => ({
  createDocumentCenterPrismaRepository: vi.fn(() => ({})),
}));

vi.mock("@/lib/document-center-service", () => ({
  canMutateDocumentCenter: vi.fn(() => true),
  createDocumentCenterService: vi.fn(() => documentCenterServiceMock),
  createDocumentFileDraft: vi.fn(() => ({
    data: { file: {} },
    ok: true,
  })),
}));

vi.mock("@/lib/document-storage", () => ({
  createLocalDocumentStorage: vi.fn(() => ({
    putObject: vi.fn(),
  })),
}));

vi.mock("@/lib/document-storage-key", () => ({
  createDocumentStorageKey: vi.fn(() => "storage-key"),
}));

vi.mock("@/lib/entity-crud-service", () => ({
  createEntityCrudService: vi.fn(() => ({
    create: vi.fn(),
    list: vi.fn(),
  })),
}));

vi.mock("@/lib/entity-prisma-repository", () => ({
  createEntityPrismaRepository: vi.fn(() => ({})),
}));

vi.mock("@/lib/progress-payment-prisma-repository", () => ({
  createProgressPaymentPrismaRepository: vi.fn(() => ({
    list: vi.fn(),
  })),
}));

vi.mock("@/lib/progress-payment-service", () => ({
  createProgressPaymentService: vi.fn(() => progressPaymentServiceMock),
}));

vi.mock("@/lib/tender-prisma-repository", () => ({
  createTenderPrismaRepository: vi.fn(() => ({})),
}));

vi.mock("@/lib/tender-service", () => ({
  createTenderService: vi.fn(() => tenderServiceMock),
}));

import { createChequeAction } from "./cheque-actions";
import { createDocumentFolderAction } from "./document-center-actions";
import { createProgressPaymentAction } from "./progress-payment-actions";
import { createTenderAction } from "./tender-actions";

const blockedResult = {
  errors: ["Bu modül için paket yükseltme gerekir."],
  featureLabel: "Kilitli Modül",
  ok: false,
  requiredPlan: "Profesyonel",
};

describe("subscription guarded domain actions", () => {
  beforeEach(() => {
    getSubscriptionFeatureActionContextMock.mockReset();
    revalidatePathMock.mockReset();
    chequeServiceMock.collect.mockReset();
    chequeServiceMock.create.mockReset();
    chequeServiceMock.list.mockReset();
    progressPaymentServiceMock.cancel.mockReset();
    progressPaymentServiceMock.create.mockReset();
    progressPaymentServiceMock.list.mockReset();
    progressPaymentServiceMock.post.mockReset();
    tenderServiceMock.create.mockReset();
    tenderServiceMock.list.mockReset();
    tenderServiceMock.transitionStatus.mockReset();
    tenderServiceMock.updateBoq.mockReset();
    documentCenterServiceMock.createFileMetadata.mockReset();
    documentCenterServiceMock.createUserFolder.mockReset();
    documentCenterServiceMock.ensureSystemFolders.mockReset();
    documentCenterServiceMock.list.mockReset();
    documentCenterServiceMock.moveFileToTrash.mockReset();
    documentCenterServiceMock.restoreFileFromTrash.mockReset();

    getSubscriptionFeatureActionContextMock.mockResolvedValue({
      ok: false,
      result: blockedResult,
    });
  });

  test("blocks cheque mutation before touching the cheque service", async () => {
    const result = await createChequeAction({} as never);

    expect(result).toEqual(blockedResult);
    expect(getSubscriptionFeatureActionContextMock).toHaveBeenCalledWith(
      "cheques",
    );
    expect(chequeServiceMock.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("blocks progress payment mutation before touching the progress payment service", async () => {
    const result = await createProgressPaymentAction({} as never);

    expect(result).toEqual(blockedResult);
    expect(getSubscriptionFeatureActionContextMock).toHaveBeenCalledWith(
      "progress-payments",
    );
    expect(progressPaymentServiceMock.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("blocks tender mutation before touching the tender service", async () => {
    const result = await createTenderAction({} as never);

    expect(result).toEqual(blockedResult);
    expect(getSubscriptionFeatureActionContextMock).toHaveBeenCalledWith(
      "tender-management",
    );
    expect(tenderServiceMock.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("blocks document center mutation before ensuring folders", async () => {
    const result = await createDocumentFolderAction({
      accessLevel: "restricted",
      name: "Sözleşmeler",
    });

    expect(result).toEqual(blockedResult);
    expect(getSubscriptionFeatureActionContextMock).toHaveBeenCalledWith(
      "document-center",
    );
    expect(documentCenterServiceMock.ensureSystemFolders).not.toHaveBeenCalled();
    expect(documentCenterServiceMock.createUserFolder).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
