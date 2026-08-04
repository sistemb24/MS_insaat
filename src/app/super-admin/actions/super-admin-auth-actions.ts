"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createPasswordHash } from "@/lib/password-hash";
import { prisma } from "@/lib/prisma";
import { sanitizeSuperAdminReturnTo } from "@/lib/super-admin-auth";
import { SUPER_ADMIN_AUTH_ERROR_MESSAGES, type SuperAdminAuthActionResult } from "@/lib/super-admin-auth-error";
import { createSuperAdminAuthService } from "@/lib/super-admin-auth-service";
import { createSuperAdminCredentialPrismaRepository, doPasswordsMatch, evaluatePasswordStrength, SuperAdminAlreadyExistsError } from "@/lib/super-admin-credential";
import { createSuperAdminPasswordResetService } from "@/lib/super-admin-password-reset-service";
import { createSuperAdminRateLimiter } from "@/lib/super-admin-rate-limiter";
import { createSuperAdminSessionPrismaRepository, SUPER_ADMIN_SESSION_COOKIE, SUPER_ADMIN_SESSION_DURATION_MS } from "@/lib/super-admin-session-repository";

const credentialRepository = createSuperAdminCredentialPrismaRepository(prisma);
const sessionRepository = createSuperAdminSessionPrismaRepository(prisma);
const authService = createSuperAdminAuthService({ credentialRepository, sessionRepository, prisma });
const passwordResetService = createSuperAdminPasswordResetService(prisma);
const rateLimiter = createSuperAdminRateLimiter(prisma);

async function setSessionCookie(sessionId: string): Promise<void> {
  (await cookies()).set({ name: SUPER_ADMIN_SESSION_COOKIE, value: sessionId, httpOnly: true, path: "/super-admin", sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: SUPER_ADMIN_SESSION_DURATION_MS / 1000 });
}

export async function signInSuperAdminAction(formData: FormData): Promise<never> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const returnTo = sanitizeSuperAdminReturnTo(String(formData.get("returnTo") ?? ""));
  if (!email || !password || password.length > 256) redirect("/super-admin/giris?error=credentials");
  const requestHeaders = await headers();
  const result = await authService.authenticate({ email, password, now: new Date(), ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: requestHeaders.get("user-agent") ?? undefined });
  if (result.status === "success") { await setSessionCookie(result.sessionId); redirect(returnTo ?? "/super-admin"); }
  if (result.status === "account_locked") redirect("/super-admin/giris?error=locked");
  if (result.status === "unsupported_second_factor") redirect("/super-admin/giris?error=unsupported-security");
  redirect("/super-admin/giris?error=credentials");
}

export async function signOutSuperAdminAction(): Promise<never> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE)?.value;
  if (sessionId) await sessionRepository.deleteById(sessionId);
  cookieStore.set({ name: SUPER_ADMIN_SESSION_COOKIE, value: "", httpOnly: true, path: "/super-admin", sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 0 });
  redirect("/super-admin/giris");
}

export async function setupSuperAdminAction(formData: FormData): Promise<SuperAdminAuthActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!name || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, errorCode: "INVALID_CREDENTIALS", message: "Ad Soyad ve geçerli e-posta zorunludur." };
  if (password.length > 256 || !evaluatePasswordStrength(password).isValid) return { ok: false, errorCode: "PASSWORD_TOO_WEAK", message: SUPER_ADMIN_AUTH_ERROR_MESSAGES.PASSWORD_TOO_WEAK };
  if (!doPasswordsMatch(password, confirmPassword)) return { ok: false, errorCode: "PASSWORD_MISMATCH", message: SUPER_ADMIN_AUTH_ERROR_MESSAGES.PASSWORD_MISMATCH };
  try { await credentialRepository.create({ name, email, passwordHash: createPasswordHash(password) }); }
  catch (error) { if (error instanceof SuperAdminAlreadyExistsError) redirect("/super-admin/giris"); throw error; }
  return { ok: true };
}

export async function requestPasswordResetAction(formData: FormData): Promise<{ ok: true }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateResult = await rateLimiter.checkPasswordReset({ ipAddress, now: new Date() });
  if (rateResult.allowed) await passwordResetService.requestReset({ email, now: new Date() });
  return { ok: true };
}

const FEATURE_UNAVAILABLE: SuperAdminAuthActionResult = {
  ok: false,
  errorCode: "SESSION_INVALID",
  message: "Bu güvenlik özelliği henüz etkin değildir.",
};

export async function resetPasswordAction(_formData: FormData): Promise<SuperAdminAuthActionResult> {
  void _formData;
  return FEATURE_UNAVAILABLE;
}

export async function verifyOtpAction(_formData: FormData): Promise<SuperAdminAuthActionResult> {
  void _formData;
  return FEATURE_UNAVAILABLE;
}

export async function resendOtpAction(_formData: FormData): Promise<SuperAdminAuthActionResult> {
  void _formData;
  return FEATURE_UNAVAILABLE;
}

export async function verify2FAAction(_formData: FormData): Promise<SuperAdminAuthActionResult> {
  void _formData;
  return FEATURE_UNAVAILABLE;
}
