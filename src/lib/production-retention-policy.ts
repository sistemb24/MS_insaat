export const PRODUCTION_RETENTION_POLICY_VERSION = "2026-08-09.a";

export const REQUIRED_RETENTION_CATEGORIES = [
  "identity-and-contact",
  "authentication-and-access",
  "audit-and-security",
  "finance-and-accounting",
  "personnel",
  "documents",
  "integrations-and-webhooks",
  "support-and-communications",
  "backups",
] as const;

export type RetentionCategory =
  (typeof REQUIRED_RETENTION_CATEGORIES)[number];

type RetentionAction =
  | "classify-before-destruction"
  | "erase-or-anonymize"
  | "expire-and-replay-deletions"
  | "revoke-access"
  | "retain-restricted";

type RetentionRule = {
  action: RetentionAction;
  durationDays?: number;
  durationYears?: number;
  ruleId: string;
  startsFrom:
    | "account-closure"
    | "calendar-year-end"
    | "employment-end"
    | "event-time"
    | "expiry-time"
    | "ticket-closure";
};

type RetentionDecision = {
  category: RetentionCategory;
  decisionId: string;
  rules: readonly RetentionRule[];
};

export const PRODUCTION_RETENTION_GLOBAL_RULES = {
  dataSubjectRequestDeadlineDays: 30,
  destructionEvidenceYears: 3,
  legalHoldBlocksDestruction: true,
  legalHoldBlocksAccessFreeze: false,
  periodicDestructionIntervalDays: 90,
} as const;

export const PRODUCTION_RETENTION_DECISIONS = {
  "identity-and-contact": {
    category: "identity-and-contact",
    decisionId: "retention-20260809-identity-contact-v1",
    rules: [
      {
        action: "erase-or-anonymize",
        durationDays: 30,
        ruleId: "identity-after-account-closure",
        startsFrom: "account-closure",
      },
    ],
  },
  "authentication-and-access": {
    category: "authentication-and-access",
    decisionId: "retention-20260809-auth-access-v1",
    rules: [
      {
        action: "revoke-access",
        durationDays: 0,
        ruleId: "sessions-at-account-closure",
        startsFrom: "account-closure",
      },
      {
        action: "erase-or-anonymize",
        durationDays: 30,
        ruleId: "expired-auth-artifacts",
        startsFrom: "expiry-time",
      },
    ],
  },
  "audit-and-security": {
    category: "audit-and-security",
    decisionId: "retention-20260809-audit-security-v1",
    rules: [
      {
        action: "retain-restricted",
        durationYears: 3,
        ruleId: "audit-and-security-events",
        startsFrom: "event-time",
      },
    ],
  },
  "finance-and-accounting": {
    category: "finance-and-accounting",
    decisionId: "retention-20260809-finance-accounting-v1",
    rules: [
      {
        action: "retain-restricted",
        durationYears: 10,
        ruleId: "commercial-and-accounting-records",
        startsFrom: "calendar-year-end",
      },
    ],
  },
  personnel: {
    category: "personnel",
    decisionId: "retention-20260809-personnel-v1",
    rules: [
      {
        action: "retain-restricted",
        durationYears: 10,
        ruleId: "workplace-and-social-security-records",
        startsFrom: "calendar-year-end",
      },
      {
        action: "retain-restricted",
        durationYears: 15,
        ruleId: "employee-health-files",
        startsFrom: "employment-end",
      },
    ],
  },
  documents: {
    category: "documents",
    decisionId: "retention-20260809-documents-v1",
    rules: [
      {
        action: "classify-before-destruction",
        durationDays: 30,
        ruleId: "document-trash-and-category-inheritance",
        startsFrom: "event-time",
      },
    ],
  },
  "integrations-and-webhooks": {
    category: "integrations-and-webhooks",
    decisionId: "retention-20260809-integrations-webhooks-v1",
    rules: [
      {
        action: "erase-or-anonymize",
        durationDays: 90,
        ruleId: "raw-integration-delivery-records",
        startsFrom: "event-time",
      },
    ],
  },
  "support-and-communications": {
    category: "support-and-communications",
    decisionId: "retention-20260809-support-communications-v1",
    rules: [
      {
        action: "erase-or-anonymize",
        durationYears: 2,
        ruleId: "general-support-records",
        startsFrom: "ticket-closure",
      },
    ],
  },
  backups: {
    category: "backups",
    decisionId: "retention-20260809-backups-v1",
    rules: [
      {
        action: "expire-and-replay-deletions",
        durationDays: 30,
        ruleId: "production-backup-lifecycle",
        startsFrom: "event-time",
      },
    ],
  },
} as const satisfies Record<RetentionCategory, RetentionDecision>;

export function approvedRetentionDecisionId(category: RetentionCategory) {
  return PRODUCTION_RETENTION_DECISIONS[category].decisionId;
}
