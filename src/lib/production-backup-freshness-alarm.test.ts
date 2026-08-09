import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const readWorkflow = (name: string) =>
  readFileSync(resolve(process.cwd(), ".github/workflows", name), "utf8");

describe("production backup freshness alarm contract", () => {
  test("keeps the rehearsal credential-free and explicitly gated", () => {
    const workflow = readWorkflow(
      "production-backup-freshness-alarm-rehearsal.yml",
    );

    expect(workflow).toContain(
      "production-backup-freshness-alarm-rehearsal",
    );
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("exit 1");
    expect(workflow).not.toMatch(
      /schedule:|actions\/checkout|secrets\.|DATABASE_URL|R2_|pg_dump|db:migrate|PutObject|DeleteObject/,
    );
  });

  test("isolates issue write permission in the workflow-run notifier", () => {
    const workflow = readWorkflow("production-backup-freshness-alarm.yml");

    expect(workflow).toContain("workflow_run:");
    expect(workflow).toContain("Production Backup Freshness");
    expect(workflow).toContain(
      "Production Backup Freshness Alarm Rehearsal",
    );
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("issues: write");
    expect(workflow).toContain("conclusion == 'failure'");
    expect(workflow).toContain(
      "head_branch == github.event.repository.default_branch",
    );
    expect(workflow).toContain("workflow_run.event == 'schedule'");
    expect(workflow).toContain("workflow_run.event == 'workflow_dispatch'");
    expect(workflow).toContain("[PRODUCTION] Backup freshness alarmı");
    expect(workflow).toContain("ops:backup-freshness");
    expect(workflow).toContain("gh issue list");
    expect(workflow).toContain("gh issue comment");
    expect(workflow).toContain("gh issue create");
    expect(workflow).not.toMatch(
      /secrets\.|DATABASE_URL|R2_|pg_dump|db:migrate|PutObject|DeleteObject/,
    );
  });

  test("does not grant issue write permission to the freshness reader", () => {
    const workflow = readWorkflow("production-backup-freshness.yml");

    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).not.toContain("issues: write");
  });
});
