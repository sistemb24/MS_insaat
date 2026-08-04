import PublicCapabilityNotice from "./public-capability-notice";
import { getPublicCapability } from "@/lib/marketing/public-capabilities";

export default function NewsletterForm() {
  return (
    <PublicCapabilityNotice
      capability={getPublicCapability("newsletter-subscription")}
      headingLevel={3}
    />
  );
}
