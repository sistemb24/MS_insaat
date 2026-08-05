/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompanyBrandAssetPanel } from "./company-brand-asset-panel";

afterEach(cleanup);

const emptyAsset = {
  canManage: true,
  dataUrl: null,
  height: null,
  mimeType: null,
  revisionNo: 0,
  sizeBytes: 0,
  source: "none" as const,
  updatedAt: null,
  updatedBy: null,
  width: null,
};

describe("CompanyBrandAssetPanel", () => {
  it("uploads a selected logo with revision and request key", async () => {
    const onUpload = vi.fn(async (formData: FormData) => {
      void formData;
      return {
      data: {
        asset: { ...emptyAsset, revisionNo: 1, source: "persisted" as const },
        idempotent: false,
      },
      ok: true as const,
      };
    });
    const { container } = render(
      <CompanyBrandAssetPanel asset={emptyAsset} onUpload={onUpload} />,
    );

    const input = screen.getByLabelText("Logo dosyası");
    fireEvent.change(input, {
      target: {
        files: [new File(["logo"], "logo.png", { type: "image/png" })],
      },
    });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    const formData = onUpload.mock.calls[0]?.[0];
    expect(formData.get("expectedRevisionNo")).toBe("0");
    expect(String(formData.get("requestKey"))).toContain("company-brand-upload-");
  });

  it("shows persisted preview but hides mutation controls from viewers", () => {
    render(
      <CompanyBrandAssetPanel
        asset={{
          ...emptyAsset,
          canManage: false,
          dataUrl: "data:image/png;base64,AA==",
          height: 64,
          mimeType: "image/png",
          revisionNo: 2,
          sizeBytes: 128,
          source: "persisted",
          width: 128,
        }}
      />,
    );

    expect(screen.getByAltText("Firma logosu önizlemesi")).toBeTruthy();
    expect(screen.queryByLabelText("Logo dosyası")).toBeNull();
    expect(screen.getByText(/yalnız yönetici rolü/)).toBeTruthy();
  });
});
