/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { CompanyLocationDirectoryRow } from "@/lib/company-location";

import { CompanyLocationDirectoryPanel } from "./company-location-directory-panel";

afterEach(cleanup);

const rows: CompanyLocationDirectoryRow[] = [
  {
    addressLine: "Atatürk Bulvarı",
    canManage: true,
    city: "Ankara",
    code: "MRK-01",
    district: "Çankaya",
    email: "merkez@example.com",
    href: null,
    id: "location-1",
    name: "Ana Merkez",
    phone: "+90 312 555 00 00",
    postalCode: "06550",
    responsiblePerson: "Ayşe Demir",
    revisionNo: 1,
    source: "company-location",
    status: "ACTIVE",
    type: "HEADQUARTERS",
    updatedAt: "2026-07-30T12:00:00.000Z",
  },
  {
    addressLine: "",
    canManage: false,
    city: "",
    code: "SANT-0001",
    district: "",
    email: "",
    href: "/santiyeler",
    id: "site::SANT-0001",
    name: "Kuzey Şantiyesi",
    phone: "",
    postalCode: "",
    responsiblePerson: "Ali",
    revisionNo: 0,
    source: "site-record",
    status: "ACTIVE",
    type: "SITE",
    updatedAt: "2026-07-30T12:00:00.000Z",
  },
];

describe("CompanyLocationDirectoryPanel", () => {
  test("renders managed locations and read-only site links", () => {
    render(<CompanyLocationDirectoryPanel canManage locations={rows} onSave={vi.fn()} />);
    const panel = screen.getByRole("region", { name: "Şirket Lokasyon Dizini" });
    expect(within(panel).getByText("Ana Merkez")).toBeTruthy();
    expect(within(panel).getByText("Kuzey Şantiyesi")).toBeTruthy();
    expect(within(panel).getByRole("link", { name: "Şantiyelerde Aç" }).getAttribute("href")).toBe("/santiyeler");
  });

  test("creates a branch through the supplied action", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<CompanyLocationDirectoryPanel canManage locations={[]} onSave={onSave} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Kod" }), { target: { value: "SB-01" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Ad" }), { target: { value: "Ankara Şubesi" } });
    fireEvent.click(screen.getByRole("button", { name: "Lokasyonu Kaydet" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      code: "SB-01",
      expectedRevisionNo: 0,
      name: "Ankara Şubesi",
      type: "BRANCH",
    }));
  });

  test("keeps every mutation control out of a viewer surface", () => {
    render(<CompanyLocationDirectoryPanel canManage={false} locations={rows} onSave={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Yeni Lokasyon" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Düzenle" })).toBeNull();
    expect(screen.queryByRole("form", { name: "Şirket lokasyonu formu" })).toBeNull();
    expect(screen.getByText("Bu kapsamda lokasyon dizini salt okunur.")).toBeTruthy();
  });
});
