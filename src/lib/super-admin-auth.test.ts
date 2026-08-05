import { describe, expect, it } from "vitest";

import { sanitizeSuperAdminReturnTo } from "./super-admin-auth";

describe("super admin returnTo policy", () => {
  it.each([
    ["/super-admin", "/super-admin"],
    ["/super-admin/oturumlar?tab=aktif", "/super-admin/oturumlar?tab=aktif"],
    ["https://evil.example/super-admin", null],
    ["//evil.example/super-admin", null],
    ["/super-administrator", null],
    ["/super-admin\\evil", null],
    ["/super-admin/giris", null],
    ["/super-admin/ilk-kurulum", null],
  ])("sanitizes %s", (input, expected) => {
    expect(sanitizeSuperAdminReturnTo(input)).toBe(expected);
  });
});
