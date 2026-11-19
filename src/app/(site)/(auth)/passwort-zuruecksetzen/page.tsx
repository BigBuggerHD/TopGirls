import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Passwort zurücksetzen", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Neues Passwort festlegen">
      {token ? <ResetPasswordForm token={token} /> : <Alert variant="error">Der Link ist unvollständig. Bitte fordere einen neuen an.</Alert>}
    </AuthCard>
  );
}
