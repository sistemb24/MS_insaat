import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const algorithm = "pbkdf2_sha256";
const defaultIterations = 120_000;
const keyLength = 32;
const digest = "sha256";

type CreatePasswordHashOptions = {
  iterations?: number;
  salt?: string;
};

export function createPasswordHash(
  password: string,
  options: CreatePasswordHashOptions = {},
) {
  const iterations = options.iterations ?? defaultIterations;
  const salt = options.salt ?? randomBytes(16).toString("hex");
  const hash = derivePassword(password, salt, iterations);

  return `${algorithm}$${iterations}$${salt}$${hash}`;
}

export function verifyPasswordHash(password: string, storedHash: string) {
  const parsed = parsePasswordHash(storedHash);

  if (!parsed) {
    return false;
  }

  const candidate = Buffer.from(
    derivePassword(password, parsed.salt, parsed.iterations),
    "hex",
  );
  const expected = Buffer.from(parsed.hash, "hex");

  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

function derivePassword(password: string, salt: string, iterations: number) {
  return pbkdf2Sync(password, salt, iterations, keyLength, digest).toString(
    "hex",
  );
}

function parsePasswordHash(storedHash: string) {
  const [storedAlgorithm, iterations, salt, hash] = storedHash.split("$");
  const iterationCount = Number(iterations);

  if (
    storedAlgorithm !== algorithm ||
    !Number.isInteger(iterationCount) ||
    iterationCount <= 0 ||
    !salt ||
    !hash
  ) {
    return null;
  }

  return {
    hash,
    iterations: iterationCount,
    salt,
  };
}
