export const NOA_STAGING_VERCEL_REGION = "fra1" as const;

type VercelProjectConfig = {
  build?: {
    env?: unknown;
  };
  env?: unknown;
  functionFailoverRegions?: unknown;
  functions?: unknown;
  regions?: unknown;
};

export type StagingPlatformConfigResult = {
  environmentValuesCommitted: false;
  region: typeof NOA_STAGING_VERCEL_REGION;
};

export function validateStagingPlatformConfig(
  config: VercelProjectConfig,
): StagingPlatformConfigResult {
  if (
    !Array.isArray(config.regions) ||
    config.regions.length !== 1 ||
    config.regions[0] !== NOA_STAGING_VERCEL_REGION
  ) {
    throw new Error(
      `Vercel staging region yalnız ${NOA_STAGING_VERCEL_REGION} olmalıdır.`,
    );
  }

  if (config.functions !== undefined) {
    throw new Error(
      "Route/function bazlı Vercel ayarı merkezi staging region kararını ezemez.",
    );
  }

  if (config.functionFailoverRegions !== undefined) {
    throw new Error(
      "Staging failover region ayrı kapasite ve maliyet onayı olmadan açılamaz.",
    );
  }

  if (config.env !== undefined || config.build?.env !== undefined) {
    throw new Error(
      "Environment değerleri vercel.json içine yazılamaz; Vercel staging environment üzerinden enjekte edilmelidir.",
    );
  }

  return {
    environmentValuesCommitted: false,
    region: NOA_STAGING_VERCEL_REGION,
  };
}
