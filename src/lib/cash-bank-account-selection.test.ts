import { describe, expect, test } from "vitest";

import type { EntityRow } from "./entities";
import { resolveActiveCashBankAccountOption } from "./cash-bank-account-selection";

describe("resolveActiveCashBankAccountOption", () => {
  test("resolves selected active account with canonical row name", () => {
    const result = resolveActiveCashBankAccountOption({
      account: { code: "BANKA-0002", name: "Client Tarafı Değişmiş Ad" },
      rows: [
        createAccountRow({ code: "KASA-0001", name: "MERKEZ KASA" }),
        createAccountRow({ code: "BANKA-0002", name: "MERKEZ BANKA" }),
      ],
    });

    expect(result).toEqual({
      ok: true,
      data: {
        account: { code: "BANKA-0002", name: "MERKEZ BANKA" },
      },
    });
  });

  test("rejects inactive or unknown selected accounts", () => {
    const inactive = resolveActiveCashBankAccountOption({
      account: { code: "KASA-0002", name: "PASIF KASA" },
      rows: [
        createAccountRow({
          code: "KASA-0002",
          name: "PASIF KASA",
          status: "Pasif",
        }),
      ],
    });
    const unknown = resolveActiveCashBankAccountOption({
      account: { code: "BANKA-9999", name: "BILINMEYEN BANKA" },
      rows: [createAccountRow()],
    });

    expect(inactive).toEqual({
      ok: false,
      errors: ["Ödeme hesabı aktif kasa/banka tanımlarında bulunamadı."],
    });
    expect(unknown).toEqual({
      ok: false,
      errors: ["Ödeme hesabı aktif kasa/banka tanımlarında bulunamadı."],
    });
  });

  test("falls back to active default account when no account is selected", () => {
    const result = resolveActiveCashBankAccountOption({
      rows: [
        createAccountRow({ code: "BANKA-0002", name: "MERKEZ BANKA" }),
        createAccountRow({ code: "KASA-0001", name: "MERKEZ KASA" }),
      ],
    });

    expect(result).toEqual({
      ok: true,
      data: {
        account: { code: "KASA-0001", name: "MERKEZ KASA" },
      },
    });
  });
});

function createAccountRow(overrides: Partial<EntityRow> = {}): EntityRow {
  return {
    code: "KASA-0001",
    name: "MERKEZ KASA",
    status: "Aktif",
    ...overrides,
  };
}
