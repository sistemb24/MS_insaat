import { describe, expect, it } from "vitest";

import { parseSessionSwitchForm } from "./session-switch";

describe("session switch form parsing", () => {
  it("reads session id and safe internal redirect from form data", () => {
    const formData = new FormData();
    formData.set("sessionId", "demo-viewer");
    formData.set("redirectTo", "/faturalar");

    expect(parseSessionSwitchForm(formData)).toEqual({
      redirectTo: "/faturalar",
      sessionId: "demo-viewer",
    });
  });

  it("falls back to root for unsafe redirects and empty session ids", () => {
    const formData = new FormData();
    formData.set("sessionId", "");
    formData.set("redirectTo", "https://example.com");

    expect(parseSessionSwitchForm(formData)).toEqual({
      redirectTo: "/",
      sessionId: "",
    });
  });
});
