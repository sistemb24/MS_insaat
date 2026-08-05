import { type NextRequest, NextResponse } from "next/server";
import { sanitizeSuperAdminReturnTo } from "@/lib/super-admin-auth";
import { getSuperAdminPublicPaths, isExactSuperAdminPublicPath } from "@/lib/super-admin-security-features";
import { SUPER_ADMIN_SESSION_COOKIE } from "@/lib/super-admin-session-repository";

export type SuperAdminMiddlewareConfig = {
  publicPaths: readonly string[];
  sessionCookieName: string;
  loginPath: string;
  dashboardPath: string;
};

const isSuperAdminPath = (pathname: string) => pathname === "/super-admin" || pathname.startsWith("/super-admin/");
const isSafeReturnTo = (value: string) => sanitizeSuperAdminReturnTo(value) !== null;

export function createSuperAdminMiddlewareHandler(config: SuperAdminMiddlewareConfig) {
  return function handle(request: NextRequest): NextResponse | null {
    const { pathname } = request.nextUrl;
    if (!isSuperAdminPath(pathname)) return null;
    if (isExactSuperAdminPublicPath(pathname, config.publicPaths)) return null;
    if (request.cookies.get(config.sessionCookieName)?.value) return null;
    const loginUrl = new URL(config.loginPath, request.url);
    if (isSafeReturnTo(pathname)) loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  };
}

const handler = createSuperAdminMiddlewareHandler({
  publicPaths: getSuperAdminPublicPaths(),
  sessionCookieName: SUPER_ADMIN_SESSION_COOKIE,
  loginPath: "/super-admin/giris",
  dashboardPath: "/super-admin",
});

export function proxy(request: NextRequest): NextResponse {
  return handler(request) ?? NextResponse.next();
}

export const config = { matcher: ["/super-admin/:path*"] };
