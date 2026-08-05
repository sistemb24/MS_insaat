import { describe, expect, test, vi } from "vitest";
import { createCompanyBrandAssetMemoryRepository, createCompanyBrandAssetService } from "./company-brand-asset-service";
import type { TenantScope } from "./tenant-scope";

const scope: TenantScope = { companyId:"company-1", companyName:"NOA", licenseLabel:"Kurumsal", periodClosed:true, periodId:"period-1", periodLabel:"2026", tenantId:"tenant-1", tenantName:"NOA", userId:"admin-1", userName:"Admin", userRole:"admin" };
function png() { const bytes=new Uint8Array(24); bytes.set([137,80,78,71,13,10,26,10],0); bytes.set([73,72,68,82],12); new DataView(bytes.buffer).setUint32(16,128); new DataView(bytes.buffer).setUint32(20,64); return bytes; }

describe("company brand asset service", () => {
  test("uploads in closed period, retries once, redacts audit and removes content", async () => {
    const audits: unknown[] = [];
    const service=createCompanyBrandAssetService({ auditLogRepository:{record:vi.fn(async row=>void audits.push(row))}, now:()=> "2026-07-31T01:00:00.000Z", repository:createCompanyBrandAssetMemoryRepository() });
    const values={ content:png(), expectedRevisionNo:0, mimeType:"image/png", originalFileName:"logo.png", requestKey:"upload-1", scope };
    const first=await service.mutate(values);
    expect(first.ok && first.data.asset.source).toBe("persisted");
    const retry=await service.mutate({...values, expectedRevisionNo:1});
    expect(retry.ok && retry.data.idempotent).toBe(true);
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits)).not.toContain("base64");
    const removed=await service.mutate({ expectedRevisionNo:1, remove:true, requestKey:"remove-1", scope });
    expect(removed.ok && removed.data.asset.source).toBe("none");
    expect(audits).toHaveLength(2);
  });
  test("rejects stale and non-admin mutation", async () => {
    const service=createCompanyBrandAssetService({repository:createCompanyBrandAssetMemoryRepository()});
    expect((await service.mutate({content:png(),expectedRevisionNo:1,mimeType:"image/png",originalFileName:"x.png",requestKey:"stale",scope})).ok).toBe(false);
    expect((await service.mutate({content:png(),expectedRevisionNo:0,mimeType:"image/png",originalFileName:"x.png",requestKey:"viewer",scope:{...scope,userRole:"viewer"}})).ok).toBe(false);
  });
});
