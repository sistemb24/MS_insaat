import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "vitest";

const preflightWorkflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/production-party-cutover-preflight.yml"),
  "utf8",
);

test("production cutover preflight workflow is manual, exact-release and read-only", () => {
  expect(preflightWorkflow).toContain("workflow_dispatch:");
  expect(preflightWorkflow).toContain("github.ref == 'refs/heads/main'");
  expect(preflightWorkflow).toContain("inputs.expected_release_sha == github.sha");
  expect(preflightWorkflow).toContain("production-party-cutover-preflight");
  expect(preflightWorkflow).toContain(
    "secrets.PRODUCTION_TENANT_INVENTORY_DATABASE_URL",
  );
  expect(preflightWorkflow).not.toContain("secrets.PRODUCTION_DATABASE_URL");
  expect(preflightWorkflow).not.toMatch(
    /pnpm db:migrate|shadow-activate|shadow-rollback/,
  );
  expect(preflightWorkflow).toContain("permissions:\n  contents: read");
  expect(preflightWorkflow).toContain("group: noa-production-recovery");
});

test("production cutover migration is exact, backup/restore gated and activation-free", () => {
  const workflow = readFileSync(
    resolve(
      process.cwd(),
      ".github/workflows/production-party-cutover-migration.yml",
    ),
    "utf8",
  );
  const backup = workflow.indexOf("pnpm production:backup:execute");
  const restore = workflow.indexOf("pnpm production:restore:rehearsal");
  const preGate = workflow.indexOf(
    "NOA_PARTY_CUTOVER_MIGRATION_STAGE: PRE_MIGRATION",
  );
  const migrate = workflow.indexOf("pnpm db:migrate");
  const postGate = workflow.indexOf(
    "NOA_PARTY_CUTOVER_MIGRATION_STAGE: POST_MIGRATION",
  );

  expect(workflow).toContain("workflow_dispatch:");
  expect(workflow).toContain("github.ref == 'refs/heads/main'");
  expect(workflow).toContain("inputs.expected_release_sha == github.sha");
  expect(workflow).toContain("production-party-cutover-migration-execute");
  expect(workflow).toContain("production-backup-execute");
  expect(workflow).toContain("production-restore-rehearsal");
  expect(workflow).toContain("environment: production");
  expect(workflow).toContain("permissions:\n  contents: read");
  expect(workflow).toContain("group: noa-production-recovery");
  expect(workflow).toContain("secrets.PRODUCTION_DATABASE_URL");
  expect(workflow).toContain(
    "secrets.PRODUCTION_TENANT_INVENTORY_DATABASE_URL",
  );
  expect(workflow).toContain(
    "NOA_PARTY_CUTOVER_EXPECTED_PREFLIGHT_MANIFEST_CHECKSUM",
  );
  expect(workflow).toContain("NOA_PARTY_CUTOVER_EXPECTED_BUSINESS_CHECKSUM");
  expect(backup).toBeGreaterThan(-1);
  expect(restore).toBeGreaterThan(backup);
  expect(preGate).toBeGreaterThan(restore);
  expect(migrate).toBeGreaterThan(preGate);
  expect(postGate).toBeGreaterThan(migrate);
  expect(workflow.match(/pnpm db:migrate/g)).toHaveLength(1);
  expect(workflow).not.toMatch(/shadow-activate|shadow-rollback|party-cutover:activate/);
});

test("production cutover transition is exact, runtime-gated and rollback-safe", () => {
  const workflow = readFileSync(
    resolve(
      process.cwd(),
      ".github/workflows/production-party-cutover-transition.yml",
    ),
    "utf8",
  );
  const execute = workflow.indexOf("pnpm production:party-cutover:transition");
  const postflight = workflow.indexOf(
    "pnpm production:party-cutover:transition:postflight",
  );
  const readiness = workflow.indexOf(
    "Verify activation runtime readiness before checkout",
  );
  const checkout = workflow.indexOf("actions/checkout@v4");

  expect(workflow).toContain("workflow_dispatch:");
  expect(workflow).toContain("github.ref == 'refs/heads/main'");
  expect(workflow).toContain("inputs.expected_release_sha == github.sha");
  expect(workflow).toContain("environment: production");
  expect(workflow).toContain("permissions:\n  contents: read");
  expect(workflow).toContain("group: noa-production-recovery");
  expect(workflow).toContain("cancel-in-progress: false");
  expect(workflow).toContain("secrets.PRODUCTION_DATABASE_URL");
  expect(workflow).toContain(
    "secrets.PRODUCTION_TENANT_INVENTORY_DATABASE_URL",
  );
  expect(workflow).toContain("production-party-shadow-activate");
  expect(workflow).toContain("production-party-shadow-exact-retry");
  expect(workflow).toContain("production-party-shadow-rollback");
  expect(workflow).toContain("production-party-shadow-rollback-exact-retry");
  expect(workflow).toContain(
    "NOA_PARTY_SHADOW_RUNTIME_READY_RELEASE_SHA: ${{ vars.PRODUCTION_PARTY_SHADOW_RUNTIME_READY_RELEASE_SHA }}",
  );
  expect(workflow).toContain(
    'test "${NOA_PARTY_SHADOW_RUNTIME_READY_RELEASE_SHA:-}" = "${GITHUB_SHA}"',
  );
  expect(readiness).toBeGreaterThan(-1);
  expect(checkout).toBeGreaterThan(readiness);
  expect(execute).toBeGreaterThan(-1);
  expect(postflight).toBeGreaterThan(execute);
  expect(workflow).toContain(".ready == true and .blockers == []");
  expect(workflow).not.toMatch(
    /pnpm db:migrate|prisma migrate deploy|production:backup|production:restore|R2_/,
  );
});
