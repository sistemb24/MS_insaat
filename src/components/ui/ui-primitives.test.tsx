/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  ActionBar,
  Button,
  DataTable,
  FormField,
  Icon,
  MetricCard,
  PageHeader,
  Panel,
  StatusBadge,
  SurfaceState,
  type DataTableColumn,
} from ".";

afterEach(() => {
  cleanup();
});

describe("Faz 2 UI primitives", () => {
  test("renders a panel with a semantic heading and action area", () => {
    render(
      <Panel actions={<Button>Kaydet</Button>} description="Güncel dönem" title="Finans Özeti">
        Panel içeriği
      </Panel>,
    );

    expect(screen.getByRole("heading", { name: "Finans Özeti", level: 2 })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeTruthy();
    expect(screen.getByText("Panel içeriği")).toBeTruthy();
  });

  test("keeps pending buttons disabled and exposes busy state", () => {
    const onClick = vi.fn();

    render(
      <Button isPending onClick={onClick} pendingLabel="Kaydediliyor">
        Kaydet
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Kaydediliyor" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test("associates visible form labels, help and errors with the control", () => {
    render(
      <FormField
        error="Tutar sıfırdan büyük olmalıdır."
        hint="KDV hariç tutarı girin."
        id="amount"
        label="Tutar"
        required
      >
        {(controlProps) => <input {...controlProps} />}
      </FormField>,
    );

    const input = screen.getByLabelText(/Tutar/);
    expect(input.getAttribute("aria-describedby")).toBe("amount-hint amount-error");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect((input as HTMLInputElement).required).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("sıfırdan büyük");
  });

  test("renders accessible table headers, row headers and numeric cells", () => {
    type Row = { amount: string; code: string };
    const columns: DataTableColumn<Row>[] = [
      { cell: (row) => row.code, header: "Belge", id: "code", rowHeader: true },
      { cell: (row) => row.amount, header: "Tutar", id: "amount", numeric: true },
    ];

    render(
      <DataTable
        caption="Tahsilat hareketleri"
        columns={columns}
        getRowKey={(row) => row.code}
        rows={[{ amount: "1.250,00 TL", code: "THS-0001" }]}
      />,
    );

    expect(screen.getByRole("table", { name: "Tahsilat hareketleri" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Tutar" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "THS-0001" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "1.250,00 TL" }).className).toContain("font-mono");
  });

  test("shows explicit empty, loading and error states", () => {
    const { rerender } = render(<SurfaceState kind="empty" title="Kayıt bulunamadı" />);
    expect(screen.getByRole("status").textContent).toContain("Kayıt bulunamadı");

    rerender(<SurfaceState kind="loading" title="Veriler yükleniyor" />);
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");

    rerender(<SurfaceState kind="error" title="Veriler alınamadı" />);
    expect(screen.getByRole("alert").textContent).toContain("Veriler alınamadı");
  });

  test("keeps decorative icons hidden and labels informative icons", () => {
    const { rerender } = render(<Icon data-testid="decorative-icon" name="info" />);
    expect(screen.getByTestId("decorative-icon").getAttribute("aria-hidden")).toBe("true");

    rerender(<Icon label="Bilgi" name="info" />);
    expect(screen.getByRole("img", { name: "Bilgi" })).toBeTruthy();
  });

  test("renders status text in addition to its color treatment", () => {
    render(<StatusBadge tone="success">Onaylandı</StatusBadge>);
    expect(screen.getByText("Onaylandı")).toBeTruthy();
  });

  test("standardizes page hierarchy, metrics and action areas", () => {
    render(
      <>
        <PageHeader
          actions={<Button>Yeni kayıt</Button>}
          description="Kapsamlı çalışma alanı"
          eyebrow="Finans · Operasyon"
          title="Standart Sayfa"
        />
        <MetricCard detail="Açık dönem" label="Toplam" value="1.250,00 TL" />
        <ActionBar actions={<Button variant="secondary">Yenile</Button>} resultSummary="Gösterilen 4 / 8">
          <label>
            Ara
            <input />
          </label>
        </ActionBar>
      </>,
    );

    expect(screen.getByRole("heading", { name: "Standart Sayfa", level: 1 })).toBeTruthy();
    expect(screen.getByText("1.250,00 TL").className).toContain("font-mono");
    expect(screen.getByText("Gösterilen 4 / 8")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yeni kayıt" })).toBeTruthy();
  });
});
