import { describe, expect, it } from "vitest";

import { createPasswordHash, verifyPasswordHash } from "./password-hash";

describe("password hashing", () => {
  it("verifies a password against a deterministic pbkdf2 hash", () => {
    const hash = createPasswordHash("Demo123!", {
      iterations: 1000,
      salt: "demo-salt",
    });

    expect(hash).toMatch(/^pbkdf2_sha256\$1000\$demo-salt\$/);
    expect(verifyPasswordHash("Demo123!", hash)).toBe(true);
    expect(verifyPasswordHash("wrong-password", hash)).toBe(false);
  });

  it("rejects malformed password hashes safely", () => {
    expect(verifyPasswordHash("Demo123!", "not-a-hash")).toBe(false);
  });
});
