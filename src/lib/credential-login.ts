import { verifyPasswordHash } from "./password-hash";

export type CredentialRecord = {
  defaultSessionId: string;
  email: string;
  passwordHash: string;
  userId: string;
};

export type CredentialLoginRepository = {
  findByEmail(email: string): Promise<CredentialRecord | null>;
};

export type CredentialLoginInput = {
  email: string;
  password: string;
  repository: CredentialLoginRepository;
};

export function parseCredentialLoginForm(formData: FormData) {
  return {
    email: normalizeEmail(String(formData.get("email") ?? "")),
    password: String(formData.get("password") ?? ""),
  };
}

export async function authenticateCredentialLogin({
  email,
  password,
  repository,
}: CredentialLoginInput) {
  const credential = await repository.findByEmail(normalizeEmail(email));

  if (!credential || !verifyPasswordHash(password, credential.passwordHash)) {
    return {
      errors: ["E-posta veya şifre hatalı."],
      ok: false as const,
    };
  }

  return {
    ok: true as const,
    sessionId: credential.defaultSessionId,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}