import { describe, expect, it } from "vitest";
import { getSuperAdminPublicPaths, getSuperAdminSecurityFeatures, isExactSuperAdminPublicPath } from "./super-admin-security-features";

describe("Super Admin security feature matrix", () => {
  it("delivery özelliklerini fail-closed ve route eşleşmesini exact tutar", () => {
    expect(getSuperAdminSecurityFeatures({} as NodeJS.ProcessEnv)).toEqual({
      passwordResetDelivery: false,
      otpDelivery: false,
      totpCrypto: false,
    });
    const paths = getSuperAdminPublicPaths();
    expect(isExactSuperAdminPublicPath("/super-admin/giris", paths)).toBe(true);
    expect(isExactSuperAdminPublicPath("/super-admin/giris/sahte", paths)).toBe(false);
    expect(isExactSuperAdminPublicPath("/super-admin/sifremi-unuttum", paths)).toBe(false);
  });
});
