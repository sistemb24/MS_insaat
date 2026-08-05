import type { Metadata } from "next";

import LegalDraftNotice from "@/components/marketing/legal-draft-notice";

export const metadata: Metadata = {
  title: "Gizlilik Politikası Taslağı — NOA İnşaat",
  description: "NOA İnşaat gizlilik politikası yayın durumu.",
  robots: { follow: false, index: false },
};

export default function PrivacyPage() {
  return <LegalDraftNotice documentName="Gizlilik Politikası Taslağı" />;
}
