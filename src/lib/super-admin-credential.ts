import { Prisma, type PrismaClient } from "@prisma/client";

export {
  doPasswordsMatch,
  evaluatePasswordStrength,
  type PasswordStrengthResult,
} from "./super-admin-password-policy";

export const SUPER_ADMIN_SINGLETON_KEY = "platform";

export type SuperAdminCredentialRecord = {
  id: string;
  singletonKey: string;
  email: string;
  passwordHash: string;
  name: string;
  is2FAEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSuperAdminCredentialInput = {
  email: string;
  passwordHash: string;
  name: string;
};

export type SuperAdminCredentialRepository = {
  findByEmail(email: string): Promise<SuperAdminCredentialRecord | null>;
  findById(id: string): Promise<SuperAdminCredentialRecord | null>;
  create(input: CreateSuperAdminCredentialInput): Promise<SuperAdminCredentialRecord>;
  updatePasswordHash(input: { id: string; passwordHash: string }): Promise<SuperAdminCredentialRecord>;
  existsAny(): Promise<boolean>;
};

export class SuperAdminAlreadyExistsError extends Error {
  constructor() {
    super("Süper Admin hesabı zaten oluşturulmuş.");
    this.name = "SuperAdminAlreadyExistsError";
  }
}

/** 0 = kilit yok, 15/60 = dakika, null = kalıcı kilit. */
export function computeLockDuration(failedAttempts: number): number | null {
  if (failedAttempts >= 20) return null;
  if (failedAttempts >= 10) return 60;
  if (failedAttempts >= 5) return 15;
  return 0;
}

type CredentialPrisma = Pick<PrismaClient, "superAdminCredential">;

export function createSuperAdminCredentialPrismaRepository(
  prisma: CredentialPrisma,
): SuperAdminCredentialRepository {
  return {
    async findByEmail(email) {
      return prisma.superAdminCredential.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
    },
    async findById(id) {
      return prisma.superAdminCredential.findUnique({ where: { id } });
    },
    async create(input) {
      try {
        return await prisma.superAdminCredential.create({
          data: {
            singletonKey: SUPER_ADMIN_SINGLETON_KEY,
            email: input.email.trim().toLowerCase(),
            passwordHash: input.passwordHash,
            name: input.name.trim(),
            is2FAEnabled: false,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new SuperAdminAlreadyExistsError();
        }
        throw error;
      }
    },
    async updatePasswordHash({ id, passwordHash }) {
      return prisma.superAdminCredential.update({ where: { id }, data: { passwordHash } });
    },
    async existsAny() {
      return (await prisma.superAdminCredential.count()) > 0;
    },
  };
}
