import { describe, expect, it } from "vitest";

import {
  createLegalMetadata,
  kvkkDocument,
  LEGAL_CONTACT_EMAIL,
  LEGAL_DOCUMENT_VERSION,
  LEGAL_EFFECTIVE_DATE,
  privacyDocument,
  termsDocument,
} from "../legal-documents";

const documents = [kvkkDocument, privacyDocument, termsDocument];

describe("approved legal documents", () => {
  it("keeps every document on the same approved version and effective date", () => {
    for (const document of documents) {
      expect(document.version).toBe(LEGAL_DOCUMENT_VERSION);
      expect(document.effectiveDate).toBe(LEGAL_EFFECTIVE_DATE);
      expect(document.sections.length).toBeGreaterThan(0);
    }

    expect(LEGAL_CONTACT_EMAIL).toBe("info@msinsaat.com");
  });

  it("contains no unresolved legal-review markers", () => {
    const serialized = JSON.stringify(documents);

    expect(serialized).not.toMatch(
      /HUKUK (KARARI|ONAYI)|\[TAM|\[VARSA|\[YYYY|Yayına hazır değil/,
    );
  });

  it("keeps every legal route out of indexing", () => {
    for (const document of documents) {
      expect(createLegalMetadata(document).robots).toEqual({
        follow: false,
        index: false,
      });
    }
  });

  it("preserves fail-closed provider and product boundaries", () => {
    const serialized = JSON.stringify(documents);

    expect(serialized).toContain("gerçek kullanıcı trafiği");
    expect(serialized).toContain("Public iletişim formu");
    expect(serialized).toContain("Open Banking");
    expect(serialized).toContain("analitik veya reklam çerezi kullanılmaz");
  });
});
