import { describe, expect, it } from "vitest";

import {
  approvedRetentionDecisionId,
  PRODUCTION_RETENTION_DECISIONS,
  PRODUCTION_RETENTION_GLOBAL_RULES,
  PRODUCTION_RETENTION_POLICY_VERSION,
  REQUIRED_RETENTION_CATEGORIES,
} from "./production-retention-policy";

describe("production retention policy catalog", () => {
  it("has one versioned decision for every required category", () => {
    expect(PRODUCTION_RETENTION_POLICY_VERSION).toBe("2026-08-09.a");
    expect(Object.keys(PRODUCTION_RETENTION_DECISIONS).sort()).toEqual(
      [...REQUIRED_RETENTION_CATEGORIES].sort(),
    );

    for (const category of REQUIRED_RETENTION_CATEGORIES) {
      const decision = PRODUCTION_RETENTION_DECISIONS[category];
      expect(decision.category).toBe(category);
      expect(decision.decisionId).toBe(approvedRetentionDecisionId(category));
      expect(decision.decisionId).toMatch(/^retention-20260809-[a-z-]+-v1$/);
      expect(decision.rules.length).toBeGreaterThan(0);
    }
  });

  it("records the approved global destruction and request limits", () => {
    expect(PRODUCTION_RETENTION_GLOBAL_RULES).toEqual({
      dataSubjectRequestDeadlineDays: 30,
      destructionEvidenceYears: 3,
      legalHoldBlocksAccessFreeze: false,
      legalHoldBlocksDestruction: true,
      periodicDestructionIntervalDays: 90,
    });
  });

  it("keeps the longest approved finance, personnel and backup rules explicit", () => {
    expect(PRODUCTION_RETENTION_DECISIONS["finance-and-accounting"].rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ durationYears: 10 }),
      ]),
    );
    expect(PRODUCTION_RETENTION_DECISIONS.personnel.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ durationYears: 10 }),
        expect.objectContaining({ durationYears: 15 }),
      ]),
    );
    expect(PRODUCTION_RETENTION_DECISIONS.backups.rules).toEqual([
      expect.objectContaining({ durationDays: 30 }),
    ]);
  });
});
