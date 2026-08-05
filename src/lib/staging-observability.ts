import type { ErrorEvent } from "@sentry/nextjs";

export const STAGING_OBSERVABILITY_SMOKE_CONFIRMATION =
  "staging-observability";

export const STAGING_SENTRY_PROJECT_ID = "4511394440151120";

type StagingObservabilityConfig = {
  dsn?: string;
  enabled: boolean;
  environment: "staging";
  reason: "enabled" | "invalid-dsn" | "missing-dsn" | "not-staging";
  release?: string;
};

export function readStagingObservabilityConfig(
  env: Readonly<Record<string, string | undefined>>,
): StagingObservabilityConfig {
  const environment = "staging" as const;
  if (env.NOA_RUNTIME_ENV !== environment) {
    return { enabled: false, environment, reason: "not-staging" };
  }

  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) {
    return { enabled: false, environment, reason: "missing-dsn" };
  }

  if (!isValidSentryDsn(dsn)) {
    return { enabled: false, environment, reason: "invalid-dsn" };
  }

  return {
    dsn,
    enabled: true,
    environment,
    reason: "enabled",
    release: normalizeRelease(
      env.VERCEL_GIT_COMMIT_SHA ?? env.NOA_RELEASE_ID ?? "",
    ),
  };
}

export function sanitizeStagingSentryEvent(event: ErrorEvent): ErrorEvent {
  const exception = event.exception?.values?.map((value) => ({
    stacktrace: value.stacktrace
      ? {
          frames: value.stacktrace.frames?.map((frame) => ({
            colno: frame.colno,
            filename: frame.filename,
            function: frame.function,
            in_app: frame.in_app,
            lineno: frame.lineno,
            module: frame.module,
            platform: frame.platform,
          })),
        }
      : undefined,
    type: value.type,
    value: value.type || "ApplicationError",
  }));

  return {
    environment: event.environment,
    event_id: event.event_id,
    exception: exception ? { values: exception } : undefined,
    level: event.level,
    platform: event.platform,
    release: event.release,
    sdk: event.sdk,
    tags: Object.fromEntries(
      Object.entries(event.tags ?? {}).filter(([key]) => key.startsWith("noa.")),
    ),
    timestamp: event.timestamp,
    type: undefined,
  };
}

export function isStagingObservabilitySmokeAuthorized(
  env: Readonly<Record<string, string | undefined>>,
  confirmation: string | null,
) {
  return (
    env.NOA_RUNTIME_ENV === "staging" &&
    env.NOA_OBSERVABILITY_SMOKE_ENABLED === "true" &&
    confirmation === STAGING_OBSERVABILITY_SMOKE_CONFIRMATION
  );
}

function isValidSentryDsn(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      Boolean(url.username) &&
      !url.password &&
      /^\/\d+\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function normalizeRelease(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || undefined;
}
