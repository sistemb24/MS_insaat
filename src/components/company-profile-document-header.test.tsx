/**
 * @vitest-environment jsdom
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { EffectiveCompanyProfile } from "@/lib/company-profile";
import { CompanyProfileDocumentHeader } from "./company-profile-document-header";

afterEach(cleanup);

const profile: EffectiveCompanyProfile = {
  addressLine: "Atatürk Cad. No: 10",
  canManage: true,
  city: "İstanbul",
  district: "Kadıköy",
  email: "bilgi@ornek.com",
  legalName: "Örnek İnşaat A.Ş.",
  mersisNumber: "0123456789012345",
  phone: "+90 212 555 00 00",
  postalCode: "34710",
  revisionNo: 1,
  source: "persisted",
  taxNumber: "1234567890",
  taxOffice: "Kadıköy",
  updatedAt: "2026-07-30T15:00:00.000Z",
  updatedBy: "admin",
};

describe("CompanyProfileDocumentHeader", () => {
  it("renders legal, tax, address and contact values for a new document render", () => {
    render(<CompanyProfileDocumentHeader profile={profile} />);

    const header = screen.getByRole("banner", { name: "Firma belge başlığı" });
    expect(header.textContent).toContain("Örnek İnşaat A.Ş.");
    expect(header.textContent).toContain("VKN/TCKN 1234567890");
    expect(header.textContent).toContain("MERSİS 0123456789012345");
    expect(header.textContent).toContain("Atatürk Cad. No: 10");
    expect(header.textContent).toContain("bilgi@ornek.com");
  });

  it("renders nothing without an effective profile", () => {
    const { container } = render(<CompanyProfileDocumentHeader />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the persisted company logo beside the legal identity", () => {
    render(
      <CompanyProfileDocumentHeader
        brandAsset={{
          canManage: true,
          dataUrl: "data:image/png;base64,AA==",
          height: 64,
          mimeType: "image/png",
          revisionNo: 1,
          sizeBytes: 128,
          source: "persisted",
          updatedAt: "2026-07-31T00:00:00.000Z",
          updatedBy: "admin",
          width: 128,
        }}
        profile={profile}
      />,
    );

    expect(
      screen.getByRole("img", { name: `${profile.legalName} logosu` }),
    ).toBeTruthy();
  });
});
