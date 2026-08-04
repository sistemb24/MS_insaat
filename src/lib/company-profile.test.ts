import { describe, expect, it } from "vitest";

import {
  buildEffectiveCompanyProfile,
  createCompanyProfileMutationKey,
  getCompanyProfilePermission,
  normalizeCompanyProfileValues,
} from "./company-profile";
import { defaultTenantScope, type TenantScope } from "./tenant-scope";

function scope(overrides: Partial<TenantScope> = {}): TenantScope {
  return { ...defaultTenantScope, ...overrides };
}

const validValues = {
  addressLine: "Atatürk Cad. No: 10",
  city: "İstanbul",
  district: "Kadıköy",
  email: "bilgi@ornek.com",
  legalName: "Örnek İnşaat A.Ş.",
  mersisNumber: "0123456789012345",
  phone: "+90 (212) 555 00 00",
  postalCode: "34710",
  taxNumber: "1234567890",
  taxOffice: "Kadıköy",
};

describe("company profile domain", () => {
  it("returns company name fallback and allows admin in a closed period", () => {
    expect(
      buildEffectiveCompanyProfile(
        null,
        scope({
          companyName: "DEMO İNŞAAT",
          periodClosed: true,
          userRole: "admin",
        }),
      ),
    ).toMatchObject({
      canManage: true,
      legalName: "DEMO İNŞAAT",
      revisionNo: 0,
      source: "fallback",
    });
  });

  it("normalizes valid values", () => {
    expect(
      normalizeCompanyProfileValues({
        ...validValues,
        email: "  BILGI@ORNEK.COM ",
        legalName: "  Örnek   İnşaat A.Ş. ",
      }),
    ).toMatchObject({
      email: "bilgi@ornek.com",
      legalName: "Örnek İnşaat A.Ş.",
    });
  });

  it.each([
    [{ ...validValues, legalName: "A" }, "en az 2"],
    [{ ...validValues, taxNumber: "123" }, "10 veya 11"],
    [{ ...validValues, mersisNumber: "123" }, "16 rakam"],
    [{ ...validValues, email: "hatalı" }, "Geçerli"],
    [{ ...validValues, addressLine: "<script>" }, "güvenli olmayan"],
  ])("rejects invalid profile values", (values, message) => {
    expect(() => normalizeCompanyProfileValues(values)).toThrow(message);
  });

  it("allows only admins and scopes mutation keys without period", () => {
    expect(getCompanyProfilePermission("admin").allowed).toBe(true);
    expect(getCompanyProfilePermission("accounting").allowed).toBe(false);
    expect(
      createCompanyProfileMutationKey(scope(), "request-1"),
    ).toBe(
      `${defaultTenantScope.tenantId}::${defaultTenantScope.companyId}::${defaultTenantScope.userId}::request-1`,
    );
  });
});
