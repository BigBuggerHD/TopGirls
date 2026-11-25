import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatDate } from "@/lib/format";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountForm, DeleteAccountForm, PasswordForm } from "@/components/account/forms";
import { ResendVerificationButton } from "@/components/dashboard/resend-verification";
import { logoutAction } from "@/actions/auth";

export const metadata = { title: "Kontoeinstellungen" };

export default async function SettingsPage() {
  const user = await requireUser();
  const sessions = await db.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } });
  return (
    <div>
      <PageHeader title="Kontoeinstellungen" description={`${ROLE_LABELS[user.role]} · ${user.email}`} actions={<form action={logoutAction}><Button type="submit" variant="outline">Abmelden</Button></form>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Kontodaten</CardTitle><CardDescription>E-Mail: {user.email} {user.emailVerifiedAt ? `(bestätigt am ${formatDate(user.emailVerifiedAt)})` : "(nicht bestätigt)"}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {!user.emailVerifiedAt ? <ResendVerificationButton /> : null}
            <AccountForm displayName={user.displayName} companyName={user.companyName} business={user.role !== "ADMIN" && user.role !== "MODERATOR"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Passwort</CardTitle><CardDescription>Aktive Sitzungen: {sessions}</CardDescription></CardHeader>
          <CardContent><PasswordForm /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Datenexport</CardTitle><CardDescription>Lade alle über dich gespeicherten Daten als JSON-Datei herunter (Art. 15 und 20 DSGVO).</CardDescription></CardHeader>
          <CardContent><Button asChild variant="outline"><a href="/api/account/export">Daten exportieren</a></Button></CardContent>
        </Card>
        <Card className="border-danger/40">
          <CardHeader><CardTitle>Konto löschen</CardTitle><CardDescription>Sedcards, Bilder, Inserate und Prüfunterlagen werden gelöscht. Buchungsbelege werden aus gesetzlichen Gründen anonymisiert bis zu 10 Jahre aufbewahrt. Nicht verbrauchte Token verfallen.</CardDescription></CardHeader>
          <CardContent><DeleteAccountForm /></CardContent>
        </Card>
      </div>
    </div>
  );
}
