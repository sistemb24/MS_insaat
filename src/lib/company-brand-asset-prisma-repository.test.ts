import { describe, expect, test, vi } from "vitest";
import { createCompanyBrandAssetPrismaRepository } from "./company-brand-asset-prisma-repository";

describe("company brand prisma repository",()=>{
  test("scopes read and optimistic update by tenant/company",async()=>{
    const row={id:"brand-1",tenantId:"tenant-1",companyId:"company-1",mimeType:"image/png",originalFileName:"logo.png",sizeBytes:24,width:128,height:64,sha256:"hash",content:new Uint8Array([1]),status:"ACTIVE",revisionNo:2,lastMutationKey:"key",createdBy:"u",updatedBy:"u",createdAt:new Date(),updatedAt:new Date()};
    const delegate={findFirst:vi.fn().mockResolvedValue(row),updateMany:vi.fn().mockResolvedValue({count:1}),create:vi.fn()};
    const repo=createCompanyBrandAssetPrismaRepository({companyBrandAsset:delegate as never});
    await repo.find({tenantId:"tenant-1",companyId:"company-1"});
    await repo.update({expectedRevisionNo:1,row:{...row,createdAt:row.createdAt.toISOString(),mimeType:"image/png",status:"ACTIVE",updatedAt:row.updatedAt.toISOString()}});
    expect(delegate.findFirst).toHaveBeenCalledWith({where:{tenantId:"tenant-1",companyId:"company-1"}});
    expect(delegate.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:{tenantId:"tenant-1",companyId:"company-1",id:"brand-1",revisionNo:1}}));
  });
});
