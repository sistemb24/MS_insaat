/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SupplierCategoryPanel } from "./supplier-category-panel";

afterEach(cleanup);

const discovered = {
  canManage: false,
  description: "",
  id: "existing:malzeme",
  name: "Malzeme",
  normalizedName: "malzeme",
  revisionNo: 0,
  source: "existing-record" as const,
  status: "ACTIVE" as const,
  updatedAt: null,
  updatedBy: null,
  usageCount: 3,
};

describe("SupplierCategoryPanel", () => {
  it("converts a discovered category into a managed category", async () => {
    const onSave = vi.fn(async (values: unknown) => {
      void values;
      return {
        data: {
          category: { ...discovered, canManage: true, id: "managed-1", revisionNo: 1, source: "managed" as const },
          idempotent: false,
        },
        ok: true as const,
      };
    });
    render(<SupplierCategoryPanel canManage categories={[discovered]} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Yönet" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({ expectedRevisionNo: 0, name: "Malzeme" });
  });

  it("shows categories without mutation controls to viewers", () => {
    render(<SupplierCategoryPanel canManage={false} categories={[discovered]} />);
    expect(screen.getByText("Malzeme")).toBeTruthy();
    expect(screen.getByText("Salt okunur")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Yeni Kategori" })).toBeNull();
  });
});
