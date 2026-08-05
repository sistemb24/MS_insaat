import { describe, expect, it } from "vitest";

import {
  CONSTRUCTION_SIMULATION_MAX_LINES,
  ConstructionSimulationDomainError,
  calculateConstructionSimulationLine,
  canTransitionConstructionSimulationStatus,
  compareConstructionSimulationRevisions,
  createConstructionSimulationRevisionSnapshot,
  getConstructionSimulationPermission,
  isConstructionSimulationSourceStale,
  normalizeConstructionSimulationScenarioMetadata,
  normalizeConstructionSimulationText,
} from "./construction-simulation-scenario";

const baseLine = {
  contractItemId: "item-1",
  itemCode: "15.150.1001",
  description: "Betonarme betonu",
  unit: "m³",
  contractItemRevisionNo: 2,
  currentCumulative: 10,
  contractQuantity: 100,
  unitPrice: 750.125,
  isActive: true,
};

describe("construction simulation calculation", () => {
  it("calculates and normalizes a direct-quantity snapshot", () => {
    expect(calculateConstructionSimulationLine({
      ...baseLine,
      directQuantity: 2.123456,
    })).toEqual({
      lineNo: 1,
      contractItemId: "item-1",
      itemCode: "15.150.1001",
      description: "Betonarme betonu",
      unit: "m³",
      contractItemRevisionNo: 2,
      inputMode: "DIRECT",
      currentCumulative: 10,
      contractQuantity: 100,
      unitPrice: 750.13,
      directQuantity: 2.1235,
      length: null,
      width: null,
      height: null,
      multiplier: null,
      proposedQuantity: 2.1235,
      projectedCumulative: 12.1235,
      projectedRemaining: 87.8765,
      projectedAmount: 1592.9,
      isOverrun: false,
    });
  });

  it("calculates dimension-based quantities with a four-decimal result", () => {
    const result = calculateConstructionSimulationLine({
      ...baseLine,
      length: 5.12345,
      width: 2,
      height: 0.3,
      multiplier: 4,
    });

    expect(result.inputMode).toBe("DIMENSIONS");
    expect(result.proposedQuantity).toBe(12.2963);
    expect(result.projectedAmount).toBe(9223.82);
    expect(result.projectedAmount).toBe(
      Math.round(result.proposedQuantity * result.unitPrice * 100) / 100,
    );
  });

  it("rejects direct quantity and dimensions used together", () => {
    expect(() => calculateConstructionSimulationLine({
      ...baseLine,
      directQuantity: 2,
      length: 1,
      width: 1,
      height: 1,
      multiplier: 1,
    })).toThrowError(expect.objectContaining({ code: "INVALID_INPUT_MODE" }));
  });

  it("rejects partial, zero, negative and non-finite quantity inputs", () => {
    for (const line of [
      { ...baseLine, length: 2, width: 3 },
      { ...baseLine, directQuantity: 0 },
      { ...baseLine, directQuantity: -1 },
      { ...baseLine, directQuantity: Number.POSITIVE_INFINITY },
    ]) {
      expect(() => calculateConstructionSimulationLine(line)).toThrowError(
        expect.objectContaining({ code: expect.stringMatching(/INVALID_(INPUT_MODE|QUANTITY)/) }),
      );
    }
  });

  it("rejects inactive and invalid contract item snapshots", () => {
    expect(() => calculateConstructionSimulationLine({
      ...baseLine,
      isActive: false,
      directQuantity: 1,
    })).toThrowError(expect.objectContaining({ code: "INACTIVE_CONTRACT_ITEM" }));
    expect(() => calculateConstructionSimulationLine({
      ...baseLine,
      contractItemRevisionNo: 0,
      directQuantity: 1,
    })).toThrowError(expect.objectContaining({ code: "INVALID_CONTRACT_ITEM" }));
    expect(() => calculateConstructionSimulationLine({
      ...baseLine,
      unitPrice: -1,
      directQuantity: 1,
    })).toThrowError(expect.objectContaining({ code: "INVALID_SNAPSHOT_VALUE" }));
  });

  it("preserves an overrun result instead of rejecting it", () => {
    const result = calculateConstructionSimulationLine({
      ...baseLine,
      currentCumulative: 98,
      directQuantity: 3,
    });

    expect(result.projectedCumulative).toBe(101);
    expect(result.projectedRemaining).toBe(-1);
    expect(result.isOverrun).toBe(true);
  });
});

describe("construction simulation revision snapshots", () => {
  it("aggregates immutable calculation values and produces a deterministic opaque hash", () => {
    const input = {
      revisionNo: 1,
      revisionNote: "  <b>İlk</b>   alternatif  ",
      sourceProgressPaymentUpdatedAt: "2026-07-23T10:00:00.000Z",
      sourceSnapshotAt: "2026-07-23T11:00:00.000Z",
      lines: [
        { ...baseLine, directQuantity: 2 },
        {
          ...baseLine,
          contractItemId: "item-2",
          itemCode: "Y.16.050",
          currentCumulative: 99,
          directQuantity: 2,
        },
      ],
    };
    const first = createConstructionSimulationRevisionSnapshot(input);
    const second = createConstructionSimulationRevisionSnapshot(input);

    expect(first.revisionNote).toBe("İlk alternatif");
    expect(first.lineCount).toBe(2);
    expect(first.proposedQuantityTotal).toBe(4);
    expect(first.projectedAmountTotal).toBe(3000.52);
    expect(first.overrunLineCount).toBe(1);
    expect(first.inputHash).toMatch(/^sim-v1-[a-f0-9]{16}$/);
    expect(first.inputHash).toBe(second.inputHash);
    expect(first.inputHash).not.toContain("item-1");
  });

  it("changes the idempotency hash when normalized calculation inputs change", () => {
    const first = createConstructionSimulationRevisionSnapshot({
      revisionNo: 1,
      sourceProgressPaymentUpdatedAt: "2026-07-23T10:00:00.000Z",
      sourceSnapshotAt: "2026-07-23T11:00:00.000Z",
      lines: [{ ...baseLine, directQuantity: 2 }],
    });
    const second = createConstructionSimulationRevisionSnapshot({
      revisionNo: 2,
      sourceProgressPaymentUpdatedAt: "2026-07-23T10:00:00.000Z",
      sourceSnapshotAt: "2026-07-23T12:00:00.000Z",
      lines: [{ ...baseLine, directQuantity: 3 }],
    });

    expect(first.inputHash).not.toBe(second.inputHash);
  });

  it("includes the source version in the idempotency boundary", () => {
    const create = (sourceProgressPaymentUpdatedAt: string) =>
      createConstructionSimulationRevisionSnapshot({
        revisionNo: 1,
        sourceProgressPaymentUpdatedAt,
        sourceSnapshotAt: "2026-07-23T11:00:00.000Z",
        lines: [{ ...baseLine, directQuantity: 2 }],
      });

    expect(create("2026-07-23T10:00:00.000Z").inputHash).not.toBe(
      create("2026-07-23T10:01:00.000Z").inputHash,
    );
  });

  it("rejects empty, duplicate and over-limit revision line sets", () => {
    expect(() => createConstructionSimulationRevisionSnapshot({
      revisionNo: 1,
      sourceProgressPaymentUpdatedAt: "",
      sourceSnapshotAt: "",
      lines: [],
    })).toThrowError(expect.objectContaining({ code: "EMPTY_LINES" }));

    expect(() => createConstructionSimulationRevisionSnapshot({
      revisionNo: 1,
      sourceProgressPaymentUpdatedAt: "",
      sourceSnapshotAt: "",
      lines: [
        { ...baseLine, directQuantity: 1 },
        { ...baseLine, directQuantity: 2 },
      ],
    })).toThrowError(expect.objectContaining({ code: "DUPLICATE_CONTRACT_ITEM" }));

    expect(() => createConstructionSimulationRevisionSnapshot({
      revisionNo: 1,
      sourceProgressPaymentUpdatedAt: "",
      sourceSnapshotAt: "",
      lines: Array.from({ length: CONSTRUCTION_SIMULATION_MAX_LINES + 1 }, (_, index) => ({
        ...baseLine,
        contractItemId: `item-${index}`,
        directQuantity: 1,
      })),
    })).toThrowError(expect.objectContaining({ code: "LINE_LIMIT_EXCEEDED" }));
  });

  it("uses a typed domain error for invalid revision numbers", () => {
    expect(() => createConstructionSimulationRevisionSnapshot({
      revisionNo: 0,
      sourceProgressPaymentUpdatedAt: "",
      sourceSnapshotAt: "",
      lines: [{ ...baseLine, directQuantity: 1 }],
    })).toThrowError(ConstructionSimulationDomainError);
  });
});

describe("construction simulation lifecycle and access", () => {
  it("allows only the approved status transitions", () => {
    expect(canTransitionConstructionSimulationStatus("DRAFT", "APPROVED")).toBe(true);
    expect(canTransitionConstructionSimulationStatus("DRAFT", "ARCHIVED")).toBe(true);
    expect(canTransitionConstructionSimulationStatus("APPROVED", "ARCHIVED")).toBe(true);
    expect(canTransitionConstructionSimulationStatus("APPROVED", "DRAFT")).toBe(false);
    expect(canTransitionConstructionSimulationStatus("ARCHIVED", "DRAFT")).toBe(false);
  });

  it("gives admin full lifecycle access while respecting status", () => {
    expect(getConstructionSimulationPermission({
      role: "admin",
      operation: "approve",
      status: "DRAFT",
    })).toEqual({ allowed: true, reason: "ALLOWED" });
    expect(getConstructionSimulationPermission({
      role: "admin",
      operation: "revise",
      status: "APPROVED",
    })).toEqual({ allowed: false, reason: "INVALID_STATUS" });
  });

  it("allows accounting draft work but denies approval and archive", () => {
    expect(getConstructionSimulationPermission({
      role: "accounting",
      operation: "revise",
      status: "DRAFT",
    }).allowed).toBe(true);
    expect(getConstructionSimulationPermission({
      role: "accounting",
      operation: "approve",
      status: "DRAFT",
    })).toEqual({ allowed: false, reason: "ROLE_FORBIDDEN" });
    expect(getConstructionSimulationPermission({
      role: "accounting",
      operation: "archive",
      status: "DRAFT",
    }).allowed).toBe(false);
  });

  it("limits viewers to approved read and compare operations", () => {
    expect(getConstructionSimulationPermission({
      role: "viewer",
      operation: "read",
      status: "APPROVED",
    }).allowed).toBe(true);
    expect(getConstructionSimulationPermission({
      role: "viewer",
      operation: "compare",
      status: "APPROVED",
    }).allowed).toBe(true);
    expect(getConstructionSimulationPermission({
      role: "viewer",
      operation: "read",
      status: "DRAFT",
    })).toEqual({ allowed: false, reason: "INVALID_STATUS" });
    expect(getConstructionSimulationPermission({
      role: "viewer",
      operation: "create",
    })).toEqual({ allowed: false, reason: "ROLE_FORBIDDEN" });
  });

  it("fails all mutations closed in a closed period but keeps approved reads", () => {
    expect(getConstructionSimulationPermission({
      role: "admin",
      operation: "approve",
      status: "DRAFT",
      periodClosed: true,
    })).toEqual({ allowed: false, reason: "PERIOD_CLOSED" });
    expect(getConstructionSimulationPermission({
      role: "viewer",
      operation: "read",
      status: "APPROVED",
      periodClosed: true,
    })).toEqual({ allowed: true, reason: "ALLOWED" });
  });

  it("allows clones only from draft or approved scenarios", () => {
    expect(getConstructionSimulationPermission({
      role: "admin",
      operation: "clone",
      status: "APPROVED",
    }).allowed).toBe(true);
    expect(getConstructionSimulationPermission({
      role: "admin",
      operation: "clone",
      status: "ARCHIVED",
    })).toEqual({ allowed: false, reason: "INVALID_STATUS" });
  });

  it("detects source snapshot drift without mutating the stored revision", () => {
    expect(isConstructionSimulationSourceStale(
      "2026-07-23T10:00:00.000Z",
      "2026-07-23T10:00:00.000Z",
    )).toBe(false);
    expect(isConstructionSimulationSourceStale(
      "2026-07-23T10:00:00.000Z",
      "2026-07-23T10:01:00.000Z",
    )).toBe(true);
  });
});

describe("construction simulation revision comparison", () => {
  it("compares shared and added items with normalized deltas", () => {
    const left = createConstructionSimulationRevisionSnapshot({
      revisionNo: 1,
      sourceProgressPaymentUpdatedAt: "2026-07-23T10:00:00.000Z",
      sourceSnapshotAt: "2026-07-23T11:00:00.000Z",
      lines: [{ ...baseLine, directQuantity: 2 }],
    });
    const right = createConstructionSimulationRevisionSnapshot({
      revisionNo: 2,
      sourceProgressPaymentUpdatedAt: "2026-07-23T10:00:00.000Z",
      sourceSnapshotAt: "2026-07-23T12:00:00.000Z",
      lines: [
        { ...baseLine, directQuantity: 3 },
        {
          ...baseLine,
          contractItemId: "item-2",
          itemCode: "Y.16.050",
          directQuantity: 1,
        },
      ],
    });

    const comparison = compareConstructionSimulationRevisions(left, right);

    expect(comparison).toEqual(expect.objectContaining({
      leftRevisionNo: 1,
      rightRevisionNo: 2,
      proposedQuantityTotalDelta: 2,
      projectedAmountTotalDelta: 1500.26,
    }));
    expect(comparison.lines).toEqual([
      expect.objectContaining({
        contractItemId: "item-1",
        proposedQuantityDelta: 1,
        projectedAmountDelta: 750.13,
      }),
      expect.objectContaining({
        contractItemId: "item-2",
        leftProposedQuantity: 0,
        rightProposedQuantity: 1,
      }),
    ]);
  });
});

describe("construction simulation text normalization", () => {
  it("stores plain normalized text within the requested bound", () => {
    expect(normalizeConstructionSimulationText(
      "  <script>uyarı</script>\n  Beton   imalatı  ",
      20,
    )).toBe("uyarı Beton imalatı");
    expect(normalizeConstructionSimulationText("ＡＢＣ", 2)).toBe("ＡＢ");
  });

  it("normalizes scenario metadata and enforces its storage bounds", () => {
    expect(normalizeConstructionSimulationScenarioMetadata({
      name: "  <b>A Blok</b>   Alternatifi ",
      description: "  İlk   çalışma ",
    })).toEqual({
      name: "A Blok Alternatifi",
      description: "İlk çalışma",
    });
    expect(() => normalizeConstructionSimulationScenarioMetadata({
      name: "x".repeat(121),
    })).toThrowError(expect.objectContaining({ code: "INVALID_SCENARIO_TEXT" }));
    expect(() => normalizeConstructionSimulationScenarioMetadata({
      name: " ",
    })).toThrowError(expect.objectContaining({ code: "INVALID_SCENARIO_TEXT" }));
  });
});
