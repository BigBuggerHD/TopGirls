import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; zurueckgesetzt?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const sp = await searchParams;
  return (
    <AuthCard title="Willkommen zurück" subtitle="Melde dich bei Top Girls an.">
      {sp.zurueckgesetzt ? <Alert variant="success" className="mb-5">Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.</Alert> : null}
      <LoginForm next={sp.next} />
      <p className="mt-6 text-center text-sm text-muted">
        Noch kein Konto? <Link href="/registrieren" className="text-gold hover:underline">Jetzt registrieren</Link>
      </p>
    </AuthCard>
  );
}
