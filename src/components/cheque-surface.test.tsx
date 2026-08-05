/**
 * @vitest-environment jsdom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { AuditLogEntry } from "@/lib/audit-log";
import type { ChequeRow } from "@/lib/cheque-service";
import {
  getP0BaseCurrencyDisplayValue,
  getP0CurrencyPolicyDisplayValue,
} from "@/lib/settings-contract";

import { ChequeSurface } from "./cheque-surface";

const originalPrint = window.print;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "print", {
    configurable: true,
    value: originalPrint,
  });
});

const cheque: ChequeRow = {
  id: "cheque-1",
  tenantId: "tenant-noa-demo",
  companyId: "company-demo-insaat",
  periodId: "period-2026",
  direction: "Gelen",
  documentNo: "CEK-0001",
  checkNo: "CK-0001",
  bankName: "Garanti BBVA",
  branchName: "Maslak",
  drawerName: "ABC Beton A.Ş.",
  issueDate: "2026-06-27",
  dueDate: "2026-08-15",
  amount: 125000,
  currency: "TL",
  status: "Portföyde",
  description: "Hakediş karşılığı gelen çek",
  createdBy: "user-main",
  updatedBy: "user-main",
  createdAt: "2026-06-27T09:00:00.000Z",
  updatedAt: "2026-06-27T09:00:00.000Z",
};

describe("ChequeSurface", () => {
  test("renders cheque portfolio workflow with totals and columns", () => {
    render(<ChequeSurface rows={[cheque]} />);

    expect(screen.getByRole("heading", { level: 1, name: "Çek Yönetimi" })).toBeTruthy();
    expect(screen.getByText("Portföy Toplamı")).toBeTruthy();
    expect(screen.getByText("CEK-0001")).toBeTruthy();
    expect(screen.getByText("CK-0001")).toBeTruthy();
    expect(screen.getByText("ABC Beton A.Ş.")).toBeTruthy();
  });

  test("filters the portfolio with real status and search values", () => {
    render(
      <ChequeSurface
        rows={[
          cheque,
          {
            ...cheque,
            id: "cheque-2",
            documentNo: "CEK-0002",
            checkNo: "CK-0002",
            drawerName: "Delta Yapı A.Ş.",
            status: "Tahsil Edildi",
          },
        ]}
        today="2026-08-01"
      />,
    );

    expect(screen.getByText("30 Gün İçinde Vade")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Çek durum filtresi"), {
      target: { value: "Tahsil Edildi" },
    });
    expect(screen.getByText("CEK-0002")).toBeTruthy();
    expect(screen.queryByText("CEK-0001")).toBeNull();

    fireEvent.change(screen.getByLabelText("Çek ara"), {
      target: { value: "delta" },
    });
    expect(screen.getByText("Delta Yapı A.Ş.")).toBeTruthy();
  });

  test("applies the global search deep-link query and highlights its record", () => {
    render(
      <ChequeSurface
        highlightedRecordId="cheque-1"
        initialSearchQuery="CEK-0001"
        permissions={{ canMutateCheques: false }}
        rows={[
          cheque,
          { ...cheque, id: "cheque-2", documentNo: "CEK-0002" },
        ]}
      />,
    );

    expect(screen.getByLabelText("Çek ara").getAttribute("value")).toBe("CEK-0001");
    expect(screen.queryByText("CEK-0002")).toBeNull();
    const highlightedRow = screen.getByRole("row", { name: /CEK-0001/i });
    expect(highlightedRow.getAttribute("data-highlighted")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Tahsil Et CEK-0001" }).hasAttribute(
        "disabled",
      ),
    ).toBe(true);
  });

  test("shows the linked ledger document for a collected cheque", () => {
    render(
      <ChequeSurface
        rows={[{ ...cheque, ledgerDocumentNo: "YVM-THS-CEK-0001", status: "Tahsil Edildi" }]}
      />,
    );

    expect(screen.getByText("Fiş: YVM-THS-CEK-0001")).toBeTruthy();
  });

  test("prints the visible cheque portfolio list scope", () => {
    const print = vi.fn();

    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(<ChequeSurface rows={[cheque]} />);

    fireEvent.click(screen.getByRole("button", { name: "Yazdır" }));

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe(
      "Yazdırma kapsamı hazır: 1 çek.",
    );
  });

  test("shows P0 boundary messages for passive cheque toolbar actions", () => {
    const print = vi.fn();

    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(<ChequeSurface rows={[cheque]} />);

    fireEvent.click(screen.getByRole("button", { name: "PDF Önizleme" }));
    expect(print).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "PDF önizleme P0 kapsamı dışında; görünen çek listesi için Yazdır kullanılabilir.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Bordro" }));
    expect(print).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Çek bordrosu P0 kapsamı dışında; görünen çek listesi için Yazdır kullanılabilir.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Yenile" }));
    expect(print).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Çek listesi server render ve revalidate akışıyla güncellenir.",
    );
  });

  test("creates incoming cheque from compact form", async () => {
    const createCheque = vi.fn(async () => ({
      ok: true as const,
      data: {
        ...cheque,
        id: "cheque-2",
        documentNo: "CEK-0002",
        checkNo: "CK-0002",
      },
    }));

    render(
      <ChequeSurface
        persistence={{ createCheque }}
        rows={[]}
        today="2026-06-27"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));
    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "CEK-0002" },
    });
    fireEvent.change(screen.getByLabelText("Çek No"), {
      target: { value: "CK-0002" },
    });
    fireEvent.change(screen.getByLabelText("Banka"), {
      target: { value: "Garanti BBVA" },
    });
    fireEvent.change(screen.getByLabelText("Şube"), {
      target: { value: "Maslak" },
    });
    fireEvent.change(screen.getByLabelText("Keşideci/Cari"), {
      target: { value: "ABC Beton A.Ş." },
    });
    fireEvent.change(screen.getByLabelText("Vade Tarihi"), {
      target: { value: "2026-08-15" },
    });
    fireEvent.change(screen.getByLabelText("Tutar"), {
      target: { value: "125000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => {
      expect(createCheque).toHaveBeenCalledWith({
        amount: 125000,
        bankName: "Garanti BBVA",
        branchName: "Maslak",
        checkNo: "CK-0002",
        currency: "TL",
        description: "",
        direction: "Gelen",
        documentNo: "CEK-0002",
        drawerName: "ABC Beton A.Ş.",
        dueDate: "2026-08-15",
        issueDate: "2026-06-27",
      });
    });
    expect(screen.getByText("CEK-0002")).toBeTruthy();
  });

  test("keeps cheque currency on the P0 base currency context", async () => {
    const createCheque = vi.fn(async () => ({
      ok: true as const,
      data: {
        ...cheque,
        id: "cheque-p0-currency",
        documentNo: "CEK-P0-001",
        checkNo: "CK-P0-001",
      },
    }));

    render(
      <ChequeSurface
        persistence={{ createCheque }}
        rows={[]}
        today="2026-06-27"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));

    expect(
      screen.getByText(`Baz Para: ${getP0BaseCurrencyDisplayValue()}`),
    ).toBeTruthy();
    expect(screen.getByText(getP0CurrencyPolicyDisplayValue())).toBeTruthy();

    const currencyInput = screen.getByLabelText(
      "Para Birimi",
    ) as HTMLSelectElement;
    expect(currencyInput.value).toBe("TL");
    expect(currencyInput.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "CEK-P0-001" },
    });
    fireEvent.change(screen.getByLabelText("Çek No"), {
      target: { value: "CK-P0-001" },
    });
    fireEvent.change(screen.getByLabelText("Banka"), {
      target: { value: "Garanti BBVA" },
    });
    fireEvent.change(screen.getByLabelText("Keşideci/Cari"), {
      target: { value: "P0 Cari" },
    });
    fireEvent.change(screen.getByLabelText("Tutar"), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => {
      expect(createCheque).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: "TL",
          documentNo: "CEK-P0-001",
        }),
      );
    });
  });

  test("collects portfolio cheque and disables collected row action", async () => {
    const collectCheque = vi.fn(async () => ({
      ok: true as const,
      data: {
        ...cheque,
        status: "Tahsil Edildi" as const,
      },
    }));

    render(
      <ChequeSurface
        persistence={{ collectCheque, createCheque: vi.fn() }}
        rows={[cheque]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tahsil Et CEK-0001" }));

    await waitFor(() => {
      expect(collectCheque).toHaveBeenCalledWith("cheque-1", {
        code: "KASA-0001",
        name: "MERKEZ KASA",
      });
    });
    expect(screen.getByText("Tahsil Edildi")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Tahsil Et CEK-0001" }),
    ).toHaveProperty("disabled", true);
  });

  test("sends selected cash bank account when collecting cheque", async () => {
    const collectCheque = vi.fn(async () => ({
      ok: true as const,
      data: {
        ...cheque,
        status: "Tahsil Edildi" as const,
      },
    }));

    render(
      <ChequeSurface
        accountOptions={[
          { code: "KASA-0001", name: "MERKEZ KASA" },
          { code: "BANKA-0002", name: "ŞANTİYE TAHSİLAT BANKASI" },
        ]}
        persistence={{ collectCheque, createCheque: vi.fn() }}
        rows={[cheque]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tahsil Hesabı"), {
      target: { value: "BANKA-0002" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tahsil Et CEK-0001" }));

    await waitFor(() => {
      expect(collectCheque).toHaveBeenCalledWith("cheque-1", {
        code: "BANKA-0002",
        name: "ŞANTİYE TAHSİLAT BANKASI",
      });
    });
  });

  test("renders cheque audit history", () => {
    const auditLog: AuditLogEntry = {
      id: "audit-1",
      tenantId: cheque.tenantId,
      companyId: cheque.companyId,
      periodId: cheque.periodId,
      actorUserId: "user-main",
      action: "cheque.collect",
      entityType: "cheque",
      entityId: cheque.id,
      entityLabel: "CEK-0001 / CK-0001",
      occurredAt: "2026-06-27T10:00:00.000Z",
      createdAt: "2026-06-27T10:00:00.000Z",
      metadata: {
        statusFrom: "Portföyde",
        statusTo: "Tahsil Edildi",
      },
    };

    render(
      <ChequeSurface
        auditLogsByEntityId={{ [cheque.id]: [auditLog] }}
        rows={[cheque]}
      />,
    );

    expect(screen.getByText("İşlem Geçmişi")).toBeTruthy();
    expect(screen.getByText("Tahsil Edildi")).toBeTruthy();
    expect(screen.getByText("Portföyde -> Tahsil Edildi")).toBeTruthy();
  });

  test("locks cheque mutations for read only permissions", () => {
    render(
      <ChequeSurface
        permissions={{ canMutateCheques: false }}
        rows={[cheque]}
      />,
    );

    expect(screen.getByRole("button", { name: "Yeni" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(
      screen.getByRole("button", { name: "Tahsil Et CEK-0001" }),
    ).toHaveProperty("disabled", true);
  });
});
