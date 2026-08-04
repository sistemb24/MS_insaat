import type { Metadata } from "next";

import LegalDraftNotice from "@/components/marketing/legal-draft-notice";

export const metadata: Metadata = {
  title: "Kullanım Koşulları Taslağı — NOA İnşaat",
  description: "NOA İnşaat kullanım koşulları yayın durumu.",
  robots: { follow: false, index: false },
};

export default function TermsPage() {
  return <LegalDraftNotice documentName="Kullanım Koşulları Taslağı" />;
}
