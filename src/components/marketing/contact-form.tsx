import PublicCapabilityNotice from "./public-capability-notice";
import { getPublicCapability } from "@/lib/marketing/public-capabilities";

export default function ContactForm() {
  return (
    <PublicCapabilityNotice
      capability={getPublicCapability("contact-delivery")}
      headingLevel={3}
      linkHref="/sss"
      linkLabel="Mevcut ürün bilgilerini inceleyin"
    />
  );
}
