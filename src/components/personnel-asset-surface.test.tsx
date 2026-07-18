/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { EntityRow } from "@/lib/entities";
import type { PersonnelAssetRow } from "@/lib/personnel-asset-service";
import { PersonnelAssetSurface } from "./personnel-asset-surface";

afterEach(cleanup);

const personnel = { code: "PER-0001", name: "Ali Usta", status: "Aktif" } as EntityRow;
const row = {
  assetCategory: "KKD",
  assetCode: "KKD-001",
  assetName: "Koruyucu Başlık",
  assignedAt: "2026-07-14",
  companyId: "company-1",
  createdAt: "2026-07-14T10:00:00.000Z",
  createdBy: "user-1",
  id: "asset-1",
  periodId: "period-1",
  personnelCode: personnel.code,
  personnelName: personnel.name,
  quantity: 1,
  serialNo: "SN-001",
  status: "Zimmetli",
  tenantId: "tenant-1",
  updatedAt: "2026-07-14T10:00:00.000Z",
  updatedBy: "user-1",
} as PersonnelAssetRow;

function persistence() {
  return {
    assign: vi.fn(async () => ({ data: row, ok: true as const })),
    markLost: vi.fn(async () => ({ data: { ...row, status: "Kayıp" as const }, ok: true as const })),
    markUnusable: vi.fn(async () => ({ data: { ...row, status: "Kullanılamaz" as const }, ok: true as const })),
    returnAsset: vi.fn(async () => ({ data: { ...row, returnedAt: "2026-07-15", status: "İade Edildi" as const }, ok: true as const })),
  };
}

describe("PersonnelAssetSurface", () => {
  test("creates a personnel assignment from the visible workflow", async () => {
    const store = persistence();
    render(<PersonnelAssetSurface canMutate persistence={store} personnelRows={[personnel]} rows={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Yeni Zimmet" }));
    fireEvent.change(screen.getByLabelText("Personel"), { target: { value: personnel.code } });
    fireEvent.change(screen.getByLabelText("Varlık Kodu"), { target: { value: "KKD-001" } });
    fireEvent.change(screen.getByLabelText("Varlık Adı"), { target: { value: "Koruyucu Başlık" } });
    fireEvent.click(screen.getByRole("button", { name: "Zimmetle" }));
    await waitFor(() => expect(store.assign).toHaveBeenCalledWith(expect.objectContaining({ personnelCode: "PER-0001", personnelName: "Ali Usta", assetCode: "KKD-001" })));
    expect(await screen.findByText("Zimmet kaydı oluşturuldu.")).toBeTruthy();
  });

  test("returns an active assignment and updates its visible status", async () => {
    const store = persistence();
    render(<PersonnelAssetSurface canMutate persistence={store} personnelRows={[personnel]} rows={[row]} />);
    fireEvent.click(screen.getByRole("button", { name: "İade Al KKD-001" }));
    await waitFor(() => expect(store.returnAsset).toHaveBeenCalledWith("asset-1"));
    expect(await screen.findByText("Varlık iade alındı.")).toBeTruthy();
    expect(screen.getAllByText("İade Edildi")).toHaveLength(2);
  });
});
