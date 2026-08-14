import { describe, expect, test, vi } from "vitest";

import {
  PRODUCTION_SCOPE_BOOTSTRAP_CONFIRMATION,
  readProductionScopeBootstrapConfig,
  runProductionScopeBootstrap,
} from "./production-scope-bootstrap";

const sha = "665135fa518fe17b7dbea38a2cb122ed947e0564";

function environment(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    DATABASE_URL: "postgresql://bootstrap:secret@db.example.com/noa",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: sha,
    NOA_EXPECTED_RELEASE_SHA: sha,
    NOA_PRODUCTION_SCOPE_ADMIN_NAME: "Production Bootstrap Admin",
    NOA_PRODUCTION_SCOPE_ADMIN_USER_ID: "user-production-bootstrap",
    NOA_PRODUCTION_SCOPE_BOOTSTRAP_CONFIRMATION:
      PRODUCTION_SCOPE_BOOTSTRAP_CONFIRMATION,
    NOA_PRODUCTION_SCOPE_COMPANY_ID: "company-ms-insaat",
    NOA_PRODUCTION_SCOPE_COMPANY_NAME: "MS İnşaat",
    NOA_PRODUCTION_SCOPE_PERIOD_ENDS_ON: "2026-12-31",
    NOA_PRODUCTION_SCOPE_PERIOD_ID: "period-ms-insaat-2026",
    NOA_PRODUCTION_SCOPE_PERIOD_LABEL: "2026",
    NOA_PRODUCTION_SCOPE_PERIOD_STARTS_ON: "2026-01-01",
    NOA_PRODUCTION_SCOPE_TENANT_ID: "tenant-ms-insaat",
    NOA_RELEASE_ID: sha,
    NOA_RUNTIME_ENV: "production",
    NOA_SOURCE_REF: "refs/heads/main",
    ...overrides,
  };
}

describe("readProductionScopeBootstrapConfig", () => {
  test("builds a deterministic production manifest without credential data", () => {
    const first = readProductionScopeBootstrapConfig(environment());
    const second = readProductionScopeBootstrapConfig(environment());

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      manifest: {
        admin: {
          name: "Production Bootstrap Admin",
          userId: "user-production-bootstrap",
        },
        company: { companyId: "company-ms-insaat", name: "MS İnşaat" },
        licenseLabel: "Production",
        period: {
          endsAt: "2026-12-31T00:00:00.000Z",
          label: "2026",
          periodId: "period-ms-insaat-2026",
          startsAt: "2026-01-01T00:00:00.000Z",
        },
        tenantId: "tenant-ms-insaat",
        version: "production-scope-bootstrap-v1",
      },
      releaseId: sha,
    });
    expect(first.manifest.manifestChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(first)).not.toContain("password");
    expect(JSON.stringify(first)).not.toContain("credential");
  });

  test.each([
    ["NOA_RUNTIME_ENV", "staging", /production ortamında/],
    ["GITHUB_EVENT_NAME", "push", /manuel workflow/],
    ["NOA_SOURCE_REF", "refs/heads/dev", /main branch/],
    ["NOA_PRODUCTION_SCOPE_BOOTSTRAP_CONFIRMATION", "wrong", /açık onayı/],
    ["NOA_EXPECTED_RELEASE_SHA", "a".repeat(40), /SHA değerleri eşleşmiyor/],
    ["NOA_PRODUCTION_SCOPE_COMPANY_ID", "../unsafe", /Şirket kimliği/],
    ["NOA_PRODUCTION_SCOPE_COMPANY_NAME", " ", /Şirket adı/],
    ["NOA_PRODUCTION_SCOPE_PERIOD_STARTS_ON", "2026-02-30", /başlangıç tarihi/],
    ["DATABASE_URL", "postgresql://noa:noa@127.0.0.1:5432/noa", /uzak PostgreSQL/],
  ])("rejects unsafe %s", (key, value, expected) => {
    expect(() => readProductionScopeBootstrapConfig(environment({ [key]: value })))
      .toThrow(expected as RegExp);
  });

  test("rejects an inverted production period", () => {
    expect(() => readProductionScopeBootstrapConfig(environment({
      NOA_PRODUCTION_SCOPE_PERIOD_ENDS_ON: "2026-01-01",
      NOA_PRODUCTION_SCOPE_PERIOD_STARTS_ON: "2026-12-31",
    }))).toThrow(/tarih aralığı/);
  });
});

test("runProductionScopeBootstrap delegates the exact command", async () => {
  const command = readProductionScopeBootstrapConfig(environment());
  const execute = vi.fn().mockResolvedValue({ status: "CREATED" });

  await expect(runProductionScopeBootstrap({ command, repository: { execute } }))
    .resolves.toEqual({ status: "CREATED" });
  expect(execute).toHaveBeenCalledWith(command);
});
