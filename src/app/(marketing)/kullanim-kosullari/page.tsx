import type { Metadata } from "next";

import LegalDocumentPage from "@/components/marketing/legal-document-page";
import { createLegalMetadata, termsDocument } from "@/lib/marketing/legal-documents";

export const metadata: Metadata = createLegalMetadata(termsDocument);

export default function TermsPage() {
  return <LegalDocumentPage document={termsDocument} />;
}
