import type { TenantUserRole } from "./tenant-scope";

export const CONSTRUCTION_SIMULATION_MAX_LINES = 500;
export const CONSTRUCTION_SIMULATION_NAME_MAX_LENGTH = 120;
export const CONSTRUCTION_SIMULATION_DESCRIPTION_MAX_LENGTH = 500;
export const CONSTRUCTION_SIMULATION_REVISION_NOTE_MAX_LENGTH = 500;

export type ConstructionSimulationStatus = "DRAFT" | "APPROVED" | "ARCHIVED";
export type ConstructionSimulationInputMode = "DIRECT" | "DIMENSIONS";
export type ConstructionSimulationOperation =
  | "read"
  | "compare"
  | "create"
  | "revise"
  | "clone"
  | "approve"
  | "archive";

export type ConstructionSimulationLineInput = {
  contractItemId: string;
  itemCode: string;
  description: string;
  unit: string;
  contractItemRevisionNo: number;
  currentCumulative: number;
  contractQuantity: number;
  unitPrice: number;
  isActive?: boolean;
  directQuantity?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  multiplier?: number | null;
};

export type ConstructionSimulationLineSnapshot = {
  lineNo: number;
  contractItemId: string;
  itemCode: string;
  description: string;
  unit: string;
  contractItemRevisionNo: number;
  inputMode: ConstructionSimulationInputMode;
  currentCumulative: number;
  contractQuantity: number;
  unitPrice: number;
  directQuantity: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  multiplier: number | null;
  proposedQuantity: number;
  projectedCumulative: number;
  projectedRemaining: number;
  projectedAmount: number;
  isOverrun: boolean;
};

export type ConstructionSimulationRevisionSnapshot = {
  revisionNo: number;
  revisionNote: string | null;
  sourceProgressPaymentUpdatedAt: string;
  sourceSnapshotAt: string;
  lineCount: number;
  proposedQuantityTotal: number;
  projectedAmountTotal: number;
  overrunLineCount: number;
  inputHash: string;
  lines: ConstructionSimulationLineSnapshot[];
};

export type ConstructionSimulationScenarioSnapshot = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  projectId: string;
  sourceProgressPaymentId: string;
  scenarioNo: string;
  name: string;
  description: string | null;
  status: ConstructionSimulationStatus;
  currentRevisionNo: number;
  currentRevision: ConstructionSimulationRevisionSnapshot;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  archivedBy: string | null;
  archivedAt: string | null;
};

export type ConstructionSimulationComparisonLine = {
  contractItemId: string;
  itemCode: string;
  description: string;
  unit: string;
  leftProposedQuantity: number;
  rightProposedQuantity: number;
  proposedQuantityDelta: number;
  leftProjectedRemaining: number;
  rightProjectedRemaining: number;
  projectedRemainingDelta: number;
  leftProjectedAmount: number;
  rightProjectedAmount: number;
  projectedAmountDelta: number;
  isOverrun: boolean;
};

export type ConstructionSimulationComparison = {
  leftRevisionNo: number;
  rightRevisionNo: number;
  proposedQuantityTotalDelta: number;
  projectedAmountTotalDelta: number;
  overrunLineCountDelta: number;
  lines: ConstructionSimulationComparisonLine[];
};

export type ConstructionSimulationPermission = {
  allowed: boolean;
  reason:
    | "ALLOWED"
    | "ROLE_FORBIDDEN"
    | "PERIOD_CLOSED"
    | "INVALID_STATUS";
};

export type ConstructionSimulationScenarioMetadata = {
  name: string;
  description: string | null;
};

export class ConstructionSimulationDomainError extends Error {
  constructor(
    public readonly code:
      | "EMPTY_LINES"
      | "LINE_LIMIT_EXCEEDED"
      | "DUPLICATE_CONTRACT_ITEM"
      | "INVALID_CONTRACT_ITEM"
      | "INACTIVE_CONTRACT_ITEM"
      | "INVALID_INPUT_MODE"
      | "INVALID_QUANTITY"
      | "INVALID_SNAPSHOT_VALUE"
      | "INVALID_REVISION"
      | "INVALID_SCENARIO_TEXT",
    message: string,
  ) {
    super(message);
    this.name = "ConstructionSimulationDomainError";
  }
}

export function normalizeConstructionSimulationText(value: string, maxLength: number) {
  const normalizedCharacters = Array.from(value.normalize("NFC"), (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? " " : character;
  }).join("");

  return normalizedCharacters
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeConstructionSimulationQuantity(value: number) {
  return roundTo(value, 4);
}

export function normalizeConstructionSimulationMoney(value: number) {
  return roundTo(value, 2);
}

export function normalizeConstructionSimulationScenarioMetadata(input: {
  name: string;
  description?: string | null;
}): ConstructionSimulationScenarioMetadata {
  const name = normalizeConstructionSimulationText(
    input.name,
    CONSTRUCTION_SIMULATION_NAME_MAX_LENGTH + 1,
  );
  const description = normalizeConstructionSimulationText(
    input.description ?? "",
    CONSTRUCTION_SIMULATION_DESCRIPTION_MAX_LENGTH + 1,
  );

  if (!name || name.length > CONSTRUCTION_SIMULATION_NAME_MAX_LENGTH) {
    throw new ConstructionSimulationDomainError(
      "INVALID_SCENARIO_TEXT",
      `Senaryo adı 1-${CONSTRUCTION_SIMULATION_NAME_MAX_LENGTH} karakter olmalıdır.`,
    );
  }
  if (description.length > CONSTRUCTION_SIMULATION_DESCRIPTION_MAX_LENGTH) {
    throw new ConstructionSimulationDomainError(
      "INVALID_SCENARIO_TEXT",
      `Senaryo açıklaması en fazla ${CONSTRUCTION_SIMULATION_DESCRIPTION_MAX_LENGTH} karakter olmalıdır.`,
    );
  }

  return { name, description: description || null };
}

export function calculateConstructionSimulationLine(
  input: ConstructionSimulationLineInput,
  lineNo = 1,
): ConstructionSimulationLineSnapshot {
  validateLineIdentity(input, lineNo);

  const directProvided = input.directQuantity !== null
    && input.directQuantity !== undefined;
  const dimensionValues = [input.length, input.width, input.height, input.multiplier];
  const anyDimensionProvided = dimensionValues.some(
    (value) => value !== null && value !== undefined,
  );

  if (directProvided === anyDimensionProvided) {
    throw new ConstructionSimulationDomainError(
      "INVALID_INPUT_MODE",
      `${lineNo}. satır doğrudan miktar veya dört ölçü değerinden yalnız birini kullanmalıdır.`,
    );
  }

  const inputMode: ConstructionSimulationInputMode = directProvided
    ? "DIRECT"
    : "DIMENSIONS";
  let proposedQuantity: number;

  if (inputMode === "DIRECT") {
    proposedQuantity = requirePositiveFinite(
      input.directQuantity,
      "INVALID_QUANTITY",
      `${lineNo}. satır doğrudan miktarı sıfırdan büyük olmalıdır.`,
    );
  } else {
    const [length, width, height, multiplier] = dimensionValues.map((value) =>
      requirePositiveFinite(
        value,
        "INVALID_QUANTITY",
        `${lineNo}. satırın bütün ölçü ve çarpan değerleri sıfırdan büyük olmalıdır.`,
      ));
    proposedQuantity = length * width * height * multiplier;
  }

  const currentCumulative = requireNonNegativeFinite(
    input.currentCumulative,
    `${lineNo}. satır mevcut kümülatif miktarı geçersiz.`,
  );
  const contractQuantity = requireNonNegativeFinite(
    input.contractQuantity,
    `${lineNo}. satır sözleşme miktarı geçersiz.`,
  );
  const unitPrice = requireNonNegativeFinite(
    input.unitPrice,
    `${lineNo}. satır birim fiyatı geçersiz.`,
  );
  const normalizedProposedQuantity = normalizeConstructionSimulationQuantity(proposedQuantity);
  const normalizedUnitPrice = normalizeConstructionSimulationMoney(unitPrice);
  const projectedCumulative = normalizeConstructionSimulationQuantity(
    currentCumulative + normalizedProposedQuantity,
  );
  const projectedRemaining = normalizeConstructionSimulationQuantity(
    contractQuantity - projectedCumulative,
  );

  return {
    lineNo,
    contractItemId: input.contractItemId.trim(),
    itemCode: normalizeConstructionSimulationText(input.itemCode, 100),
    description: normalizeConstructionSimulationText(input.description, 500),
    unit: normalizeConstructionSimulationText(input.unit, 30),
    contractItemRevisionNo: input.contractItemRevisionNo,
    inputMode,
    currentCumulative: normalizeConstructionSimulationQuantity(currentCumulative),
    contractQuantity: normalizeConstructionSimulationQuantity(contractQuantity),
    unitPrice: normalizedUnitPrice,
    directQuantity: inputMode === "DIRECT"
      ? normalizeConstructionSimulationQuantity(proposedQuantity)
      : null,
    length: inputMode === "DIMENSIONS"
      ? normalizeConstructionSimulationQuantity(input.length as number)
      : null,
    width: inputMode === "DIMENSIONS"
      ? normalizeConstructionSimulationQuantity(input.width as number)
      : null,
    height: inputMode === "DIMENSIONS"
      ? normalizeConstructionSimulationQuantity(input.height as number)
      : null,
    multiplier: inputMode === "DIMENSIONS"
      ? normalizeConstructionSimulationQuantity(input.multiplier as number)
      : null,
    proposedQuantity: normalizedProposedQuantity,
    projectedCumulative,
    projectedRemaining,
    projectedAmount: normalizeConstructionSimulationMoney(
      normalizedProposedQuantity * normalizedUnitPrice,
    ),
    isOverrun: projectedRemaining < 0,
  };
}

export function createConstructionSimulationRevisionSnapshot(input: {
  revisionNo: number;
  revisionNote?: string | null;
  sourceProgressPaymentUpdatedAt: string;
  sourceSnapshotAt: string;
  lines: ConstructionSimulationLineInput[];
}): ConstructionSimulationRevisionSnapshot {
  if (!Number.isInteger(input.revisionNo) || input.revisionNo < 1) {
    throw new ConstructionSimulationDomainError(
      "INVALID_REVISION",
      "Revizyon numarası pozitif tam sayı olmalıdır.",
    );
  }
  if (input.lines.length === 0) {
    throw new ConstructionSimulationDomainError(
      "EMPTY_LINES",
      "Simülasyon revizyonu en az bir satır içermelidir.",
    );
  }
  if (input.lines.length > CONSTRUCTION_SIMULATION_MAX_LINES) {
    throw new ConstructionSimulationDomainError(
      "LINE_LIMIT_EXCEEDED",
      `Simülasyon revizyonu en fazla ${CONSTRUCTION_SIMULATION_MAX_LINES} satır içerebilir.`,
    );
  }

  const contractItemIds = new Set<string>();
  const lines = input.lines.map((line, index) => {
    const contractItemId = line.contractItemId.trim();
    if (contractItemIds.has(contractItemId)) {
      throw new ConstructionSimulationDomainError(
        "DUPLICATE_CONTRACT_ITEM",
        `${contractItemId} sözleşme pozu aynı revizyonda birden fazla kullanılamaz.`,
      );
    }
    contractItemIds.add(contractItemId);
    return calculateConstructionSimulationLine(line, index + 1);
  });
  const revisionNote = normalizeConstructionSimulationText(
    input.revisionNote ?? "",
    CONSTRUCTION_SIMULATION_REVISION_NOTE_MAX_LENGTH,
  ) || null;

  return {
    revisionNo: input.revisionNo,
    revisionNote,
    sourceProgressPaymentUpdatedAt: input.sourceProgressPaymentUpdatedAt,
    sourceSnapshotAt: input.sourceSnapshotAt,
    lineCount: lines.length,
    proposedQuantityTotal: normalizeConstructionSimulationQuantity(
      lines.reduce((total, line) => total + line.proposedQuantity, 0),
    ),
    projectedAmountTotal: normalizeConstructionSimulationMoney(
      lines.reduce((total, line) => total + line.projectedAmount, 0),
    ),
    overrunLineCount: lines.filter((line) => line.isOverrun).length,
    inputHash: createConstructionSimulationInputHash(
      lines,
      input.sourceProgressPaymentUpdatedAt,
    ),
    lines,
  };
}

export function createConstructionSimulationInputHash(
  lines: readonly ConstructionSimulationLineSnapshot[],
  sourceProgressPaymentUpdatedAt: string,
) {
  const canonicalInput = JSON.stringify({
    sourceProgressPaymentUpdatedAt,
    lines: lines.map((line) => [
      line.lineNo,
      line.contractItemId,
      line.contractItemRevisionNo,
      line.currentCumulative,
      line.contractQuantity,
      line.unitPrice,
      line.inputMode,
      line.directQuantity,
      line.length,
      line.width,
      line.height,
      line.multiplier,
    ]),
  });

  return `sim-v1-${fnv1a(canonicalInput, 0x811c9dc5)}${fnv1a(canonicalInput, 0x9e3779b9)}`;
}

export function canTransitionConstructionSimulationStatus(
  current: ConstructionSimulationStatus,
  next: ConstructionSimulationStatus,
) {
  return (current === "DRAFT" && (next === "APPROVED" || next === "ARCHIVED"))
    || (current === "APPROVED" && next === "ARCHIVED");
}

export function getConstructionSimulationPermission(input: {
  role: TenantUserRole;
  operation: ConstructionSimulationOperation;
  status?: ConstructionSimulationStatus;
  periodClosed?: boolean;
}): ConstructionSimulationPermission {
  const mutation = !["read", "compare"].includes(input.operation);
  if (mutation && input.periodClosed) {
    return { allowed: false, reason: "PERIOD_CLOSED" };
  }

  if (!roleAllowsOperation(input.role, input.operation)) {
    return { allowed: false, reason: "ROLE_FORBIDDEN" };
  }

  if (!statusAllowsOperation(input.status, input.operation, input.role)) {
    return { allowed: false, reason: "INVALID_STATUS" };
  }

  return { allowed: true, reason: "ALLOWED" };
}

export function isConstructionSimulationSourceStale(
  snapshotUpdatedAt: string | Date,
  currentUpdatedAt: string | Date,
) {
  return new Date(snapshotUpdatedAt).getTime() !== new Date(currentUpdatedAt).getTime();
}

export function compareConstructionSimulationRevisions(
  left: ConstructionSimulationRevisionSnapshot,
  right: ConstructionSimulationRevisionSnapshot,
): ConstructionSimulationComparison {
  const leftByItem = new Map(left.lines.map((line) => [line.contractItemId, line]));
  const rightByItem = new Map(right.lines.map((line) => [line.contractItemId, line]));
  const contractItemIds = [...new Set([
    ...leftByItem.keys(),
    ...rightByItem.keys(),
  ])];

  const lines = contractItemIds.map((contractItemId) => {
    const leftLine = leftByItem.get(contractItemId);
    const rightLine = rightByItem.get(contractItemId);
    const reference = rightLine ?? leftLine;
    if (!reference) {
      throw new ConstructionSimulationDomainError(
        "INVALID_CONTRACT_ITEM",
        "Karşılaştırma satırı sözleşme pozu içermiyor.",
      );
    }
    const leftProposedQuantity = leftLine?.proposedQuantity ?? 0;
    const rightProposedQuantity = rightLine?.proposedQuantity ?? 0;
    const leftProjectedRemaining = leftLine?.projectedRemaining ?? 0;
    const rightProjectedRemaining = rightLine?.projectedRemaining ?? 0;
    const leftProjectedAmount = leftLine?.projectedAmount ?? 0;
    const rightProjectedAmount = rightLine?.projectedAmount ?? 0;
    return {
      contractItemId,
      itemCode: reference.itemCode,
      description: reference.description,
      unit: reference.unit,
      leftProposedQuantity,
      rightProposedQuantity,
      proposedQuantityDelta: normalizeConstructionSimulationQuantity(
        rightProposedQuantity - leftProposedQuantity,
      ),
      leftProjectedRemaining,
      rightProjectedRemaining,
      projectedRemainingDelta: normalizeConstructionSimulationQuantity(
        rightProjectedRemaining - leftProjectedRemaining,
      ),
      leftProjectedAmount,
      rightProjectedAmount,
      projectedAmountDelta: normalizeConstructionSimulationMoney(
        rightProjectedAmount - leftProjectedAmount,
      ),
      isOverrun: Boolean(leftLine?.isOverrun || rightLine?.isOverrun),
    };
  }).sort((first, second) =>
    first.itemCode.localeCompare(second.itemCode, "tr-TR")
    || first.contractItemId.localeCompare(second.contractItemId));

  return {
    leftRevisionNo: left.revisionNo,
    rightRevisionNo: right.revisionNo,
    proposedQuantityTotalDelta: normalizeConstructionSimulationQuantity(
      right.proposedQuantityTotal - left.proposedQuantityTotal,
    ),
    projectedAmountTotalDelta: normalizeConstructionSimulationMoney(
      right.projectedAmountTotal - left.projectedAmountTotal,
    ),
    overrunLineCountDelta: right.overrunLineCount - left.overrunLineCount,
    lines,
  };
}

function validateLineIdentity(input: ConstructionSimulationLineInput, lineNo: number) {
  if (
    !input.contractItemId.trim()
    || !normalizeConstructionSimulationText(input.itemCode, 100)
    || !normalizeConstructionSimulationText(input.description, 500)
    || !normalizeConstructionSimulationText(input.unit, 30)
    || !Number.isInteger(input.contractItemRevisionNo)
    || input.contractItemRevisionNo < 1
  ) {
    throw new ConstructionSimulationDomainError(
      "INVALID_CONTRACT_ITEM",
      `${lineNo}. satır sözleşme pozu snapshot bilgileri geçersiz.`,
    );
  }
  if (input.isActive === false) {
    throw new ConstructionSimulationDomainError(
      "INACTIVE_CONTRACT_ITEM",
      `${lineNo}. satır pasif sözleşme pozu kullanıyor.`,
    );
  }
}

function requirePositiveFinite(
  value: number | null | undefined,
  code: "INVALID_QUANTITY",
  message: string,
) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new ConstructionSimulationDomainError(code, message);
  }
  return value;
}

function requireNonNegativeFinite(value: number, message: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConstructionSimulationDomainError("INVALID_SNAPSHOT_VALUE", message);
  }
  return value;
}

function roundTo(value: number, digits: number) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function roleAllowsOperation(
  role: TenantUserRole,
  operation: ConstructionSimulationOperation,
) {
  if (role === "admin") return true;
  if (role === "accounting") {
    return ["read", "compare", "create", "revise", "clone"].includes(operation);
  }
  return operation === "read" || operation === "compare";
}

function statusAllowsOperation(
  status: ConstructionSimulationStatus | undefined,
  operation: ConstructionSimulationOperation,
  role: TenantUserRole,
) {
  if (operation === "create") return status === undefined;
  if (!status) return false;
  if (operation === "read") {
    return role === "viewer" ? status === "APPROVED" : true;
  }
  if (operation === "compare") {
    return role === "viewer" ? status === "APPROVED" : true;
  }
  if (operation === "revise" || operation === "approve") return status === "DRAFT";
  if (operation === "clone") return status === "DRAFT" || status === "APPROVED";
  if (operation === "archive") return status === "DRAFT" || status === "APPROVED";
  return false;
}

function fnv1a(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
