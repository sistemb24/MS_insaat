import type {
  CredentialLoginRepository,
  CredentialRecord,
} from "./credential-login";

type AppCredentialClient = {
  findUnique(input: {
    select: {
      defaultSessionId: true;
      email: true;
      passwordHash: true;
      userId: true;
    };
    where: {
      email: string;
    };
  }): Promise<CredentialRecord | null>;
};

export type CredentialPrismaClientLike = {
  appCredential: AppCredentialClient;
};

export function createCredentialPrismaRepository(
  prisma: CredentialPrismaClientLike,
): CredentialLoginRepository {
  return {
    async findByEmail(email: string) {
      return prisma.appCredential.findUnique({
        select: {
          defaultSessionId: true,
          email: true,
          passwordHash: true,
          userId: true,
        },
        where: {
          email: email.trim().toLowerCase(),
        },
      });
    },
  };
}