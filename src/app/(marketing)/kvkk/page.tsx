import type { Metadata } from "next";

import LegalDraftNotice from "@/components/marketing/legal-draft-notice";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni Taslağı — NOA İnşaat",
  description: "NOA İnşaat KVKK aydınlatma metni yayın durumu.",
  robots: { follow: false, index: false },
};

export default function KvkkPage() {
  return <LegalDraftNotice documentName="KVKK Aydınlatma Metni Taslağı" />;
}
