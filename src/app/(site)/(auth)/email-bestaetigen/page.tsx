import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { verifyEmailToken } from "@/actions/auth";

export const metadata: Metadata = { title: "E-Mail bestätigen", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailToken(token) : false;
  return (
    <AuthCard title="E-Mail-Bestätigung">
      {ok ? <Alert variant="success">Vielen Dank! Deine E-Mail-Adresse wurde bestätigt.</Alert> : <Alert variant="error">Der Bestätigungslink ist ungültig oder abgelaufen.</Alert>}
      <Button asChild className="mt-6 w-full"><Link href="/dashboard">Zum Dashboard</Link></Button>
    </AuthCard>
  );
}
