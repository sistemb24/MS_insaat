import type { Metadata } from "next";

import LegalDocumentPage from "@/components/marketing/legal-document-page";
import { createLegalMetadata, privacyDocument } from "@/lib/marketing/legal-documents";

export const metadata: Metadata = createLegalMetadata(privacyDocument);

export default function PrivacyPage() {
  return <LegalDocumentPage document={privacyDocument} />;
}
