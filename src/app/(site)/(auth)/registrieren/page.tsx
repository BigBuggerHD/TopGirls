import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Registrieren" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthCard wide title="Konto erstellen" subtitle="Registriere dich kostenlos bei Top Girls. Die Registrierung ist nur für Volljährige möglich.">
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted">
        Bereits registriert? <Link href="/login" className="text-gold hover:underline">Zum Login</Link>
      </p>
    </AuthCard>
  );
}
