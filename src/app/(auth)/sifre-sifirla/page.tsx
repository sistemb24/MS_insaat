import PublicCapabilityNotice from "@/components/marketing/public-capability-notice";
import { getPublicCapability } from "@/lib/marketing/public-capabilities";

export default function SifreSifirlaPage() {
  return (
    <PublicCapabilityNotice
      capability={getPublicCapability("password-recovery")}
      linkHref="/giris"
      linkLabel="Giriş sayfasına dönün"
    />
  );
}
