import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default function ForgotPage() {
  return (
    <AuthCard title="Passwort vergessen" subtitle="Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
