import * as Sentry from "@sentry/nextjs";

import {
  readServerObservabilityConfig,
  sanitizeStagingSentryEvent,
} from "@/lib/staging-observability";

const config = readServerObservabilityConfig(process.env);

Sentry.init({
  beforeSend: sanitizeStagingSentryEvent,
  dataCollection: {
    cookies: false,
    databaseQueryData: false,
    frameContextLines: 0,
    genAI: { inputs: false, outputs: false },
    graphQL: { document: false, variables: false },
    httpBodies: [],
    httpHeaders: { request: false, response: false },
    stackFrameVariables: false,
    urlQueryParams: false,
    userInfo: false,
  },
  defaultIntegrations: false,
  dsn: config.dsn,
  enableLogs: false,
  enabled: config.enabled,
  environment: config.environment,
  initialScope: {
    tags: {
      "noa.runtime": config.environment,
      "noa.telemetry": "redacted-errors-only",
    },
  },
  maxValueLength: 200,
  normalizeDepth: 2,
  release: config.release,
  sampleRate: 1,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});
