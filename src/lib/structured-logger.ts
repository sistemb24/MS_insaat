const REDACTED = "[REDACTED]";
const SENSITIVE_KEY =
  /authorization|cookie|password|secret|token|otp|totp|session|api[-_]?key|database[-_]?url/i;

export type StructuredLogLevel = "error" | "info" | "warn";
export type StructuredLogFields = Readonly<Record<string, unknown>>;

export function redactStructuredLogFields(
  fields: StructuredLogFields,
): Record<string, unknown> {
  return redactRecord(fields, 0);
}

export function writeStructuredLog(
  level: StructuredLogLevel,
  event: string,
  fields: StructuredLogFields = {},
) {
  const entry = JSON.stringify({
    event,
    level,
    ...redactStructuredLogFields(fields),
    timestamp: new Date().toISOString(),
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

function redactRecord(
  value: Readonly<Record<string, unknown>>,
  depth: number,
): Record<string, unknown> {
  if (depth >= 5) return { truncated: true };

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redactValue(item, depth + 1),
    ]),
  );
}

function redactValue(value: unknown, depth: number): unknown {
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactValue(item, depth));
  if (value instanceof Error) return { name: value.name };
  if (value && typeof value === "object") {
    return redactRecord(value as Readonly<Record<string, unknown>>, depth);
  }
  if (typeof value === "string") return value.slice(0, 500);
  return value;
}
