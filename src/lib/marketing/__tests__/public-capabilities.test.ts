import { describe, expect, it } from "vitest";

import {
  formatPublicModuleLabel,
  PUBLIC_CAPABILITIES,
} from "../public-capabilities";

describe("public capability truth contract", () => {
  it("keeps provider-dependent public submissions fail-closed", () => {
    expect(Object.values(PUBLIC_CAPABILITIES)).toHaveLength(4);
    expect(
      Object.values(PUBLIC_CAPABILITIES).every(
        (capability) => capability.available === false,
      ),
    ).toBe(true);
  });

  it("states that unavailable forms do not create, send or collect data", () => {
    expect(PUBLIC_CAPABILITIES["self-service-registration"].description).toContain(
      "oluşturmaz",
    );
    expect(PUBLIC_CAPABILITIES["password-recovery"].description).toContain(
      "gönderilmez",
    );
    expect(PUBLIC_CAPABILITIES["contact-delivery"].description).toContain(
      "kaydetmez",
    );
    expect(PUBLIC_CAPABILITIES["newsletter-subscription"].description).toContain(
      "toplanmıyor",
    );
  });

  it("labels inactive and sandbox modules without mutating the plan contract", () => {
    expect(formatPublicModuleLabel("AI Analiz")).toBe("AI Analiz (etkin değil)");
    expect(formatPublicModuleLabel("Banka Entegrasyonu")).toContain("sandbox");
    expect(formatPublicModuleLabel("Şantiye")).toBe("Şantiye");
  });
});
