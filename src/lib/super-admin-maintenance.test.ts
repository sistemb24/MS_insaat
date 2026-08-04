import { describe, it } from "vitest";
import * as fc from "fast-check";
import { formatCountdown } from "./super-admin-maintenance";

// Feature: super-admin-authentication, Property 9: countdown-format-consistency
// Validates: Requirements 11.4
describe("formatCountdown", () => {
  it("çıktıdaki toplam saniye, Math.floor((endsAt - now) / 1000) ile eşleşmeli", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(0), max: new Date("2100-01-01") }),
        fc.integer({ min: 1, max: 365 * 24 * 3600 }),
        (now, secondsInFuture) => {
          const endsAt = new Date(now.getTime() + secondsInFuture * 1000);
          const parts = formatCountdown(now, endsAt);
          const expected = Math.floor((endsAt.getTime() - now.getTime()) / 1000);
          const actual =
            parts.days * 86400 +
            parts.hours * 3600 +
            parts.minutes * 60 +
            parts.seconds;
          return actual === expected;
        },
      ),
      { numRuns: 500 },
    );
  });
});
