import { describe, expect, it } from "vitest";

import {
  authenticateCredentialLogin,
  parseCredentialLoginForm,
  type CredentialLoginRepository,
} from "./credential-login";
import { createPasswordHash } from "./password-hash";

describe("credential login", () => {
  it("parses and normalizes login form values", () => {
    const formData = new FormData();
    formData.set("email", "  MUHASEBE@NOA.LOCAL ");
    formData.set("password", "Demo123!");

    expect(parseCredentialLoginForm(formData)).toEqual({
      email: "muhasebe@noa.local",
      password: "Demo123!",
    });
  });

  it("authenticates a known credential and returns its default session", async () => {
    const repository = createRepository({
      defaultSessionId: "demo-accounting",
      email: "muhasebe@noa.local",
      passwordHash: createPasswordHash("Demo123!", {
        iterations: 1000,
        salt: "demo-salt",
      }),
      userId: "user-main",
    });

    await expect(
      authenticateCredentialLogin({
        email: "muhasebe@noa.local",
        password: "Demo123!",
        repository,
      }),
    ).resolves.toEqual({
      ok: true,
      sessionId: "demo-accounting",
    });
  });

  it("returns a generic error for missing users and wrong passwords", async () => {
    const repository = createRepository({
      defaultSessionId: "demo-accounting",
      email: "muhasebe@noa.local",
      passwordHash: createPasswordHash("Demo123!", {
        iterations: 1000,
        salt: "demo-salt",
      }),
      userId: "user-main",
    });

    await expect(
      authenticateCredentialLogin({
        email: "missing@noa.local",
        password: "Demo123!",
        repository,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["E-posta veya şifre hatalı."],
    });
    await expect(
      authenticateCredentialLogin({
        email: "muhasebe@noa.local",
        password: "wrong",
        repository,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["E-posta veya şifre hatalı."],
    });
  });
});

function createRepository(record: {
  defaultSessionId: string;
  email: string;
  passwordHash: string;
  userId: string;
}): CredentialLoginRepository {
  return {
    async findByEmail(email: string) {
      return email === record.email ? record : null;
    },
  };
}