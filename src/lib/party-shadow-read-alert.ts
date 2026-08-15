import * as Sentry from "@sentry/nextjs";

import {
  isPartyShadowRuntimeSafetyStatus,
  type PartyShadowRuntimeSafetyStatus,
} from "./party-shadow-runtime-contract";
import type { PartySlug } from "./party-read-model";
import { readServerObservabilityConfig } from "./staging-observability";

const SAFETY_ALERT_THROTTLE_MS = 5 * 60_000;
const lastAlertAt = new Map<string, number>();

type SafetyAlertContext = {
  tags: Record<string, string>;
};

export type PartyShadowReadSafetyCapture = (
  signal: Error,
  context: SafetyAlertContext,
) => unknown;

export type PartyShadowReadSafetyAlert = {
  releaseId?: string;
  revisionNo?: number;
  scopeFingerprint: string;
  slug: PartySlug;
  status: PartyShadowRuntimeSafetyStatus;
};

export function createPartyShadowReadSafetyAlertWriter(options: {
  capture: PartyShadowReadSafetyCapture;
  env: Readonly<Record<string, string | undefined>>;
  now?: () => number;
}) {
  const throttle = new Map<string, number>();
  const now = options.now ?? Date.now;
  return (alert: PartyShadowReadSafetyAlert) => emitPartyShadowReadSafetyAlert({
    alert,
    capture: options.capture,
    env: options.env,
    now: now(),
    throttle,
  });
}

export function writePartyShadowReadSafetyAlert(
  alert: PartyShadowReadSafetyAlert,
  env: Readonly<Record<string, string | undefined>> = process.env,
  now = Date.now(),
) {
  return emitPartyShadowReadSafetyAlert({
    alert,
    capture: (signal, context) => Sentry.captureException(signal, context),
    env,
    now,
    throttle: lastAlertAt,
  });
}

function emitPartyShadowReadSafetyAlert(input: {
  alert: PartyShadowReadSafetyAlert;
  capture: PartyShadowReadSafetyCapture;
  env: Readonly<Record<string, string | undefined>>;
  now: number;
  throttle: Map<string, number>;
}) {
  const { alert, env, now, throttle } = input;
  if (
    env.NOA_RUNTIME_ENV !== "production"
    || !readServerObservabilityConfig(env).enabled
    || !isPartyShadowRuntimeSafetyStatus(alert.status)
  ) {
    return null;
  }

  const throttleKey = [
    alert.releaseId ?? "unavailable",
    alert.scopeFingerprint,
    alert.slug,
    alert.status,
  ].join(":");
  const previous = throttle.get(throttleKey);
  if (previous !== undefined && now - previous < SAFETY_ALERT_THROTTLE_MS) {
    return null;
  }
  throttle.set(throttleKey, now);

  const signal = new Error();
  signal.name = "PartyShadowReadSafetySignal";
  return input.capture(signal, {
    tags: {
      "noa.party.release": alert.releaseId ?? "unavailable",
      "noa.party.revision": String(alert.revisionNo ?? 0),
      "noa.party.scope": alert.scopeFingerprint,
      "noa.party.slug": alert.slug,
      "noa.party.status": alert.status,
    },
  });
}
