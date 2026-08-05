import { notFound } from "next/navigation";

/** Phase 34 extended-auth routes stay closed until their server capability is configured. */
export default function DisabledSuperAdminSecurityRoute() {
  notFound();
}
