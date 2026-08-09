import { describe, expect, it } from "vitest";

import {
  evaluateProductionDeletionJournalProviderPreflight,
  PRODUCTION_DELETION_JOURNAL_APPEND_ACTIONS,
  PRODUCTION_DELETION_JOURNAL_RETENTION_SECONDS,
  type ProductionDeletionJournalProviderSnapshot,
} from "./production-deletion-journal-provider-preflight";
import { PRODUCTION_DELETION_JOURNAL_BUCKET } from "./production-deletion-journal-r2";

function snapshot(
  overrides: Partial<ProductionDeletionJournalProviderSnapshot> = {},
): ProductionDeletionJournalProviderSnapshot {
  return {
    appendCredential: {
      actions: PRODUCTION_DELETION_JOURNAL_APPEND_ACTIONS,
      bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
      prefix: "journal/",
      sessionToken: true,
      ttlSeconds: 3_600,
      type: "temporary-explicit-actions",
    },
    bucket: {
      jurisdiction: "eu",
      name: PRODUCTION_DELETION_JOURNAL_BUCKET,
    },
    bucketConfigCredentialExposedToRuntime: false,
    lifecycleRules: [],
    lockRules: [
      {
        condition: {
          maxAgeSeconds: PRODUCTION_DELETION_JOURNAL_RETENTION_SECONDS,
          type: "Age",
        },
        enabled: true,
        id: "journal-lock-1095d",
        prefix: "journal/",
      },
    ],
    readCredential: {
      bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
      permission: "object-read-only",
      prefix: "journal/",
    },
    ...overrides,
  };
}

describe("production deletion journal provider preflight", () => {
  it("accepts the exact EU bucket, 1095-day lock and least-privilege credentials", () => {
    expect(evaluateProductionDeletionJournalProviderPreflight(snapshot())).toEqual({
      appendActions: PRODUCTION_DELETION_JOURNAL_APPEND_ACTIONS,
      bucketName: PRODUCTION_DELETION_JOURNAL_BUCKET,
      jurisdiction: "eu",
      lifecycleConflictCount: 0,
      lockRuleId: "journal-lock-1095d",
      providerPreflightReady: true,
      retentionSeconds: 94_608_000,
    });
  });

  it("accepts an indefinite exact-prefix lock", () => {
    const input = snapshot({
      lockRules: [
        {
          condition: { type: "Indefinite" },
          enabled: true,
          id: "journal-lock-indefinite",
          prefix: "journal/",
        },
      ],
    });
    expect(
      evaluateProductionDeletionJournalProviderPreflight(input).retentionSeconds,
    ).toBe("indefinite");
  });

  it("rejects wrong jurisdiction, weak lock and lifecycle delete overlap", () => {
    expect(() =>
      evaluateProductionDeletionJournalProviderPreflight(
        snapshot({ bucket: { jurisdiction: "default", name: PRODUCTION_DELETION_JOURNAL_BUCKET } }),
      ),
    ).toThrow(/EU jurisdiction/);
    expect(() =>
      evaluateProductionDeletionJournalProviderPreflight(
        snapshot({
          lockRules: [
            {
              condition: {
                maxAgeSeconds: PRODUCTION_DELETION_JOURNAL_RETENTION_SECONDS - 1,
                type: "Age",
              },
              enabled: true,
              id: "weak-lock",
              prefix: "journal/",
            },
          ],
        }),
      ),
    ).toThrow(/1.095/);
    expect(() =>
      evaluateProductionDeletionJournalProviderPreflight(
        snapshot({
          lifecycleRules: [
            {
              deleteAfterSeconds: 2_592_000,
              enabled: true,
              id: "delete-all-30d",
              prefix: "",
            },
          ],
        }),
      ),
    ).toThrow(/lifecycle delete/);
  });

  it("rejects delete-capable or expanded append actions", () => {
    expect(() =>
      evaluateProductionDeletionJournalProviderPreflight(
        snapshot({
          appendCredential: {
            ...snapshot().appendCredential,
            actions: [...PRODUCTION_DELETION_JOURNAL_APPEND_ACTIONS, "DeleteObject"],
          },
        }),
      ),
    ).toThrow(/exact action allowlist/);
  });

  it("rejects long-lived append, broad read and runtime bucket-config access", () => {
    expect(() =>
      evaluateProductionDeletionJournalProviderPreflight(
        snapshot({
          appendCredential: {
            ...snapshot().appendCredential,
            ttlSeconds: 604_801,
          },
        }),
      ),
    ).toThrow(/kısa ömürlü/);
    expect(() =>
      evaluateProductionDeletionJournalProviderPreflight(
        snapshot({
          readCredential: {
            ...snapshot().readCredential,
            prefix: "",
          },
        }),
      ),
    ).toThrow(/read-only/);
    expect(() =>
      evaluateProductionDeletionJournalProviderPreflight(
        snapshot({ bucketConfigCredentialExposedToRuntime: true }),
      ),
    ).toThrow(/bucket-config/);
  });
});
