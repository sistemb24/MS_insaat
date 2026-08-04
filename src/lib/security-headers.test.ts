import { describe, expect, it } from "vitest";

import { createSecurityHeaders } from "../../next.config";

describe("security headers", () => {
  it("sets a production CSP and browser hardening headers", () => {
    const headers = new Map(
      createSecurityHeaders(true).map(({ key, value }) => [key, value]),
    );
    const csp = headers.get("Content-Security-Policy");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });

  it("allows the Next.js development websocket without emitting HSTS", () => {
    const headers = new Map(
      createSecurityHeaders(false).map(({ key, value }) => [key, value]),
    );

    expect(headers.get("Content-Security-Policy")).toContain("ws:");
    expect(headers.get("Content-Security-Policy")).toContain("'unsafe-eval'");
    expect(headers.has("Strict-Transport-Security")).toBe(false);
  });
});
