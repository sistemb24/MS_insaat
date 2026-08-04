import { describe, expect, test } from "vitest";

import {
  buildCompanyLocationDirectory,
  CompanyLocationDomainError,
  getCompanyLocationPermission,
  normalizeCompanyLocationValues,
} from "./company-location";
import type { TenantScope } from "./tenant-scope";

const scope: TenantScope = {
  companyId: "company-1",
  companyName: "NOA",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-1",
  periodLabel: "2026",
  tenantId: "tenant-1",
  tenantName: "NOA",
  userId: "user-1",
  userName: "Admin",
  userRole: "admin",
};

describe("company location domain", () => {
  test("normalizes a safe company location", () => {
    expect(
      normalizeCompanyLocationValues({
        addressLine: "  Atatürk   Cad.  ",
        city: " Ankara ",
        code: " mrk-01 ",
        district: " Çankaya ",
        email: " MERKEZ@EXAMPLE.COM ",
        name: " Ana Merkez ",
        phone: "+90 312 555 00 00",
        postalCode: "06550",
        responsiblePerson: " Ayşe Demir ",
        status: "ACTIVE",
        type: "HEADQUARTERS",
      }),
    ).toMatchObject({
      addressLine: "Atatürk Cad.",
      city: "Ankara",
      code: "MRK-01",
      email: "merkez@example.com",
      name: "Ana Merkez",
    });
  });

  test("rejects unsafe or invalid fields", () => {
    expect(() =>
      normalizeCompanyLocationValues({
        addressLine: "<script>",
        city: "",
        code: "merkez 1",
        district: "",
        email: "",
        name: "M",
        phone: "",
        postalCode: "",
        responsiblePerson: "",
        status: "ACTIVE",
        type: "HEADQUARTERS",
      }),
    ).toThrow(CompanyLocationDomainError);
  });

  test("allows only admin to manage", () => {
    expect(getCompanyLocationPermission("admin").allowed).toBe(true);
    expect(getCompanyLocationPermission("accounting").allowed).toBe(false);
    expect(getCompanyLocationPermission("viewer").allowed).toBe(false);
  });

  test("combines managed locations and read-only sites", () => {
    const rows = buildCompanyLocationDirectory({
      locations: [{
        addressLine: "",
        city: "",
        code: "MRK-01",
        companyId: scope.companyId,
        createdAt: "2026-07-30T10:00:00.000Z",
        createdBy: scope.userId,
        district: "",
        email: "",
        id: "location-1",
        lastMutationKey: null,
        name: "Ana Merkez",
        phone: "",
        postalCode: "",
        responsiblePerson: "",
        revisionNo: 1,
        status: "ACTIVE",
        tenantId: scope.tenantId,
        type: "HEADQUARTERS",
        updatedAt: "2026-07-30T10:00:00.000Z",
        updatedBy: scope.userId,
      }],
      scope,
      sites: [{
        code: "SANT-0001",
        name: "Kuzey Şantiyesi",
        responsiblePerson: "Ali",
        status: "ACTIVE",
        updatedAt: "2026-07-30T10:00:00.000Z",
      }],
    });

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.type === "SITE")).toMatchObject({
      canManage: false,
      href: "/santiyeler",
      source: "site-record",
    });
  });
});
