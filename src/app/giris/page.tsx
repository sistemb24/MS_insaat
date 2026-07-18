import { signInWithCredentialsAction } from "@/app/actions/session-actions";
import { LoginSurface } from "@/components/login-surface";
import { getActiveSessionOptions } from "@/lib/server-active-scope";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Giriş | NOA İnşaat",
};

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const sessionOptions = await getActiveSessionOptions();

  return (
    <LoginSurface
      loginAction={signInWithCredentialsAction}
      loginError={params?.error === "credentials"}
      sessionOptions={sessionOptions}
    />
  );
}
