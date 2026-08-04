import Image from "next/image";

import type { EffectiveCompanyBrandAsset } from "@/lib/company-brand-asset";
import type { EffectiveCompanyProfile } from "@/lib/company-profile";

export function CompanyProfileDocumentHeader({
  brandAsset,
  className = "",
  profile,
}: {
  brandAsset?: EffectiveCompanyBrandAsset;
  className?: string;
  profile?: EffectiveCompanyProfile;
}) {
  if (!profile) return null;

  const location = [
    profile.addressLine,
    profile.district,
    profile.city,
    profile.postalCode,
  ]
    .filter(Boolean)
    .join(" · ");
  const tax = [
    profile.taxOffice ? `${profile.taxOffice} VD` : "",
    profile.taxNumber ? `VKN/TCKN ${profile.taxNumber}` : "",
    profile.mersisNumber ? `MERSİS ${profile.mersisNumber}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const contact = [profile.phone, profile.email].filter(Boolean).join(" · ");

  return (
    <header
      aria-label="Firma belge başlığı"
      className={`border-b border-divider pb-4 ${className}`.trim()}
    >
      <div className="flex items-start gap-4">
        {brandAsset?.dataUrl && brandAsset.width && brandAsset.height ? (
          <Image
            alt={`${profile.legalName} logosu`}
            className="max-h-16 w-auto shrink-0 object-contain"
            height={brandAsset.height}
            src={brandAsset.dataUrl}
            unoptimized
            width={brandAsset.width}
          />
        ) : null}
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-content">{profile.legalName}</h2>
          {tax ? <p className="mt-1 text-xs text-content-subtle">{tax}</p> : null}
          {location ? (
            <p className="mt-1 text-xs text-content-subtle">{location}</p>
          ) : null}
          {contact ? (
            <p className="mt-1 text-xs text-content-subtle">{contact}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
