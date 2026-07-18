import { createPasswordHash } from "./password-hash";
import { defaultTenantScope } from "./tenant-scope";

type AppCredentialWrite = {
  defaultSessionId: string;
  email: string;
  passwordHash: string;
  tenantId: string;
  userId: string;
};

type CredentialUpsertInput = {
  where: { email: string };
  create: AppCredentialWrite;
  update: Pick<AppCredentialWrite, "defaultSessionId" | "passwordHash">;
};

type CredentialSeedPrismaClientLike = {
  appCredential: {
    upsert(input: CredentialUpsertInput): Promise<unknown>;
  };
};

type SeedDemoCredentialsInput = {
  hashOptions?: {
    iterations?: number;
    saltPrefix?: string;
  };
  prisma: CredentialSeedPrismaClientLike;
};

const demoCredentials = [
  {
    defaultSessionId: "demo-accounting",
    email: "muhasebe@noa.local",
    password: "Demo123!",
    userId: "user-main",
  },
  {
    defaultSessionId: "demo-viewer",
    email: "viewer@noa.local",
    password: "Demo123!",
    userId: "user-viewer",
  },
  {
    defaultSessionId: "demo-ahmet",
    email: "ahmet.yilmaz@noa.local",
    password: "Ahmet123!",
    userId: "user-ahmet",
  },
  {
    defaultSessionId: "demo-ayse",
    email: "ayse.demir@noa.local",
    password: "Ayse123!",
    userId: "user-ayse",
  },
  {
    defaultSessionId: "demo-mehmet",
    email: "mehmet.kaya@noa.local",
    password: "Mehmet123!",
    userId: "user-mehmet",
  },
  // Firma 2 - AKDENİZ İNŞAAT kullanıcıları
  {
    defaultSessionId: "demo-akdeniz-admin",
    email: "admin@akdeniz-insaat.local",
    password: "Akdeniz123!",
    userId: "user-akdeniz-admin",
  },
  {
    defaultSessionId: "demo-akdeniz-muhasebe",
    email: "muhasebe@akdeniz-insaat.local",
    password: "Akdeniz123!",
    userId: "user-akdeniz-muhasebe",
  },
  {
    defaultSessionId: "demo-akdeniz-saha",
    email: "saha@akdeniz-insaat.local",
    password: "Akdeniz123!",
    userId: "user-akdeniz-saha",
  },
  // Firma 3 - ANADOLU YAPI kullanıcıları
  {
    defaultSessionId: "demo-anadolu-admin",
    email: "admin@anadolu-yapi.local",
    password: "Anadolu123!",
    userId: "user-anadolu-admin",
  },
  {
    defaultSessionId: "demo-anadolu-muhasebe",
    email: "muhasebe@anadolu-yapi.local",
    password: "Anadolu123!",
    userId: "user-anadolu-muhasebe",
  },
  {
    defaultSessionId: "demo-anadolu-saha",
    email: "saha@anadolu-yapi.local",
    password: "Anadolu123!",
    userId: "user-anadolu-saha",
  },
];

export async function seedDemoCredentials({
  hashOptions,
  prisma,
}: SeedDemoCredentialsInput) {
  for (const credential of demoCredentials) {
    const passwordHash = createPasswordHash(credential.password, {
      iterations: hashOptions?.iterations,
      salt: hashOptions?.saltPrefix
        ? `${hashOptions.saltPrefix}-${credential.userId}`
        : undefined,
    });
    const data = {
      defaultSessionId: credential.defaultSessionId,
      email: credential.email,
      passwordHash,
      tenantId: defaultTenantScope.tenantId,
      userId: credential.userId,
    };

    await prisma.appCredential.upsert({
      where: { email: credential.email },
      create: data,
      update: {
        defaultSessionId: data.defaultSessionId,
        passwordHash: data.passwordHash,
      },
    });
  }

  return {
    emails: demoCredentials.map((credential) => credential.email),
    seeded: demoCredentials.length,
  };
}
