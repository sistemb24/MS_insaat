import { acceptUserInvitationAction } from "@/app/actions/user-invitation-actions";
import { InvitationAcceptSurface } from "@/components/invitation-accept-surface";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Davet | NOA İnşaat",
};

type InvitationPageProps = {
  searchParams?: Promise<{
    token?: string | string[];
  }>;
};

export default async function InvitationPage({
  searchParams,
}: InvitationPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params?.token)
    ? params.token[0]
    : params?.token;

  return (
    <InvitationAcceptSurface
      acceptAction={acceptUserInvitationAction}
      initialToken={token ?? ""}
    />
  );
}
