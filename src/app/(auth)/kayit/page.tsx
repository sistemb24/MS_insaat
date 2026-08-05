import PublicCapabilityNotice from "@/components/marketing/public-capability-notice";
import { getPublicCapability } from "@/lib/marketing/public-capabilities";

export default function KayitPage() {
  return (
    <PublicCapabilityNotice
      capability={getPublicCapability("self-service-registration")}
      linkHref="/giris"
      linkLabel="Mevcut hesabınızla giriş yapın"
    />
  );
}
