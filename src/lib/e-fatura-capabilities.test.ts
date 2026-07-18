import { describe, expect, test } from "vitest";

import {
  EFATURA_SUPPORTED_ACTIONS,
  getDefaultEFaturaSupportedActions,
} from "./e-fatura-capabilities";

describe("e-fatura capabilities", () => {
  test("exposes the planned supported actions", () => {
    expect(EFATURA_SUPPORTED_ACTIONS).toEqual([
      "gönderim",
      "sorgulama",
      "iptal",
    ]);
  });

  test("returns a copy of the default supported actions", () => {
    const actions = getDefaultEFaturaSupportedActions();

    expect(actions).toEqual(["gönderim", "sorgulama", "iptal"]);
    expect(actions).not.toBe(EFATURA_SUPPORTED_ACTIONS);
  });
});
