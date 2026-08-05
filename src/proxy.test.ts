import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { createSuperAdminMiddlewareHandler } from "./proxy";

const handle = createSuperAdminMiddlewareHandler({
  publicPaths: ["/super-admin/giris", "/super-admin/ilk-kurulum"],
  sessionCookieName: "noa-super-admin-session",
  loginPath: "/super-admin/giris",
  dashboardPath: "/super-admin",
});

describe("super admin proxy boundary", () => {
  it("passes public routes without redirect", () => {
    expect(handle(new NextRequest("http://localhost/super-admin/giris"))).toBeNull();
  });

  it("redirects a protected route and preserves only its internal pathname", () => {
    const response = handle(new NextRequest("http://localhost/super-admin/ayarlar?tab=guvenlik"));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("http://localhost/super-admin/giris?returnTo=%2Fsuper-admin%2Fayarlar");
  });

  it("only performs the optimistic cookie-presence check", () => {
    const response = handle(new NextRequest("http://localhost/super-admin", {
      headers: { cookie: "noa-super-admin-session=opaque-id" },
    }));
    expect(response).toBeNull();
  });
});
