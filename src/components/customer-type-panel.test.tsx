/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CustomerTypePanel } from "./customer-type-panel";

afterEach(cleanup);

const discovered = {
  canManage: false,
  description: "",
  id: "existing:kamu",
  name: "Kamu",
  normalizedName: "kamu",
  revisionNo: 0,
  source: "existing-record" as const,
  status: "ACTIVE" as const,
  updatedAt: null,
  updatedBy: null,
  usageCount: 3,
};

describe("CustomerTypePanel", () => {
  it("converts a discovered type into a managed customer type", async () => {
    const onSave = vi.fn(async (values: unknown) => {
      void values;
      return {
        data: {
          customerType: {
            ...discovered,
            canManage: true,
            id: "managed-1",
            revisionNo: 1,
            source: "managed" as const,
          },
          idempotent: false,
        },
        ok: true as const,
      };
    });
    render(
      <CustomerTypePanel
        canManage
        customerTypes={[discovered]}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Yönet" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      expectedRevisionNo: 0,
      name: "Kamu",
    });
    expect(screen.getByRole("row", { name: /Kamu/ }).textContent).toContain("3");
  });

  it("shows types without mutation controls to viewers", () => {
    render(
      <CustomerTypePanel canManage={false} customerTypes={[discovered]} />,
    );
    expect(screen.getByText("Kamu")).toBeTruthy();
    expect(screen.getByText("Salt okunur")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Yeni Müşteri Tipi" }),
    ).toBeNull();
  });
});
