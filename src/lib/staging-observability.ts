import type { ErrorEvent } from "@sentry/nextjs";

export const STAGING_OBSERVABILITY_SMOKE_CONFIRMATION =
  "staging-observability";
export const PRODUCTION_OBSERVABILITY_SMOKE_CONFIRMATION =
  "production-observability";

export const STAGING_SENTRY_PROJECT_ID = "4511854028456016";

type StagingObservabilityConfig = {
  dsn?: string;
  enabled: boolean;
  environment: "staging";
  reason: "enabled" | "invalid-dsn" | "missing-dsn" | "not-staging";
  release?: string;
};

type ServerObservabilityConfig = {
  dsn?: string;
  enabled: boolean;
  environment: "production" | "staging";
  reason:
    | "enabled"
    | "invalid-dsn"
    | "missing-dsn"
    | "missing-expected-project"
    | "not-supported-environment"
    | "unexpected-project";
  release?: string;
};

export function readServerObservabilityConfig(
  env: Readonly<Record<string, string | undefined>>,
): ServerObservabilityConfig {
  const environment = env.NOA_RUNTIME_ENV;
  if (environment !== "staging" && environment !== "production") {
    return {
      enabled: false,
      environment: "staging",
      reason: "not-supported-environment",
    };
  }

  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) {
    return { enabled: false, environment, reason: "missing-dsn" };
  }

  const projectId = readSentryProjectId(dsn);
  if (!projectId) {
    return { enabled: false, environment, reason: "invalid-dsn" };
  }

  if (environment === "production") {
    const expectedProjectId = env.SENTRY_EXPECTED_PROJECT_ID?.trim();
    if (!expectedProjectId) {
      return {
        enabled: false,
        environment,
        reason: "missing-expected-project",
      };
    }
    if (
      projectId !== expectedProjectId ||
      projectId === STAGING_SENTRY_PROJECT_ID
    ) {
      return { enabled: false, environment, reason: "unexpected-project" };
    }
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

export function isProductionObservabilitySmokeAuthorized(
  env: Readonly<Record<string, string | undefined>>,
  confirmation: string | null,
) {
  return (
    env.NOA_RUNTIME_ENV === "production" &&
    env.NOA_OBSERVABILITY_SMOKE_ENABLED === "true" &&
    confirmation === PRODUCTION_OBSERVABILITY_SMOKE_CONFIRMATION &&
    readServerObservabilityConfig(env).enabled
  );
}

function readSentryProjectId(value: string) {
  try {
    const url = new URL(value);
    const valid =
      url.protocol === "https:" &&
      Boolean(url.username) &&
      !url.password &&
      /^\/\d+\/?$/.test(url.pathname);
    return valid ? url.pathname.replaceAll("/", "") : null;
  } catch {
    return null;
  }
}

function isValidSentryDsn(value: string) {
  return readSentryProjectId(value) !== null;
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
