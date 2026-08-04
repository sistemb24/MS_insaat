import type { CompanyBrandAssetSnapshot, CompanyBrandAssetStatus, CompanyLogoMimeType } from "./company-brand-asset";
import { CompanyBrandAssetRepositoryError, type CompanyBrandAssetRepository } from "./company-brand-asset-service";
import type { TenantScope } from "./tenant-scope";

type RecordRow = Omit<CompanyBrandAssetSnapshot, "content"|"createdAt"|"updatedAt"> & { content: Uint8Array | null; createdAt: Date|string; updatedAt: Date|string };
type Where = { tenantId:string; companyId:string; id?:string; revisionNo?:number };
type Delegate = {
  create(input:{data:unknown}):Promise<RecordRow>;
  findFirst(input:{where:Where}):Promise<RecordRow|null>;
  updateMany(input:{data:unknown;where:Where}):Promise<{count:number}>;
};
export type CompanyBrandAssetPrismaClientLike={companyBrandAsset:Delegate};

export function createCompanyBrandAssetPrismaRepository(prisma:CompanyBrandAssetPrismaClientLike):CompanyBrandAssetRepository {
  return {
    async create(row) { return fromRecord(await prisma.companyBrandAsset.create({data:{...row,content:row.content,createdAt:new Date(row.createdAt),updatedAt:new Date(row.updatedAt)}})); },
    async find(scope) { const row=await prisma.companyBrandAsset.findFirst({where:scopeFields(scope)}); return row?fromRecord(row):null; },
    async update({expectedRevisionNo,row}) {
      const result=await prisma.companyBrandAsset.updateMany({data:{content:row.content,height:row.height,lastMutationKey:row.lastMutationKey,mimeType:row.mimeType,originalFileName:row.originalFileName,revisionNo:row.revisionNo,sha256:row.sha256,sizeBytes:row.sizeBytes,status:row.status,updatedAt:new Date(row.updatedAt),updatedBy:row.updatedBy,width:row.width},where:{...scopeFields(row),id:row.id,revisionNo:expectedRevisionNo}});
      if(result.count!==1) throw new CompanyBrandAssetRepositoryError("Firma logosu beklenen revizyonda bulunamadı.");
      const saved=await prisma.companyBrandAsset.findFirst({where:{...scopeFields(row),id:row.id}});
      if(!saved) throw new CompanyBrandAssetRepositoryError("Güncellenen firma logosu yeniden okunamadı.");
      return fromRecord(saved);
    }
  };
}
function scopeFields(scope:Pick<TenantScope,"tenantId"|"companyId">){return {tenantId:scope.tenantId,companyId:scope.companyId};}
function fromRecord(row:RecordRow):CompanyBrandAssetSnapshot{return {...row,content:row.content?new Uint8Array(row.content):null,createdAt:new Date(row.createdAt).toISOString(),mimeType:row.mimeType as CompanyLogoMimeType|null,status:row.status as CompanyBrandAssetStatus,updatedAt:new Date(row.updatedAt).toISOString()};}
