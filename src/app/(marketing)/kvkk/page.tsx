import type { Metadata } from "next";

import LegalDocumentPage from "@/components/marketing/legal-document-page";
import { createLegalMetadata, kvkkDocument } from "@/lib/marketing/legal-documents";

export const metadata: Metadata = createLegalMetadata(kvkkDocument);

export default function KvkkPage() {
  return <LegalDocumentPage document={kvkkDocument} />;
}
