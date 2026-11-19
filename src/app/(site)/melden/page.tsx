import { getCurrentUser } from "@/lib/auth/session";
import { LegalPage } from "@/components/legal/legal-page";
import { ReportForm } from "@/components/report/report-dialog";

export const metadata = { title: "Inhalt melden" };

export default async function Page({ searchParams }: { searchParams: Promise<{ typ?: string; id?: string }> }) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const allowed = ["PROFILE", "LISTING", "THREAD", "POST", "USER", "AD", "IMAGE"];
  return (
    <LegalPage title="Inhalt melden" draft={false}>
      <p>Über dieses Formular kannst du rechtswidrige Inhalte oder Verstöße gegen unsere Richtlinien melden (Melde- und Abhilfeverfahren nach Art. 16 DSA). Meldungen zu Minderjährigkeit, Zwang oder Menschenhandel werden mit höchster Priorität bearbeitet; betroffene Sedcards werden bis zur Prüfung sofort deaktiviert.</p>
      <p>Gib bitte die Adresse (URL) des Inhalts in der Beschreibung an, wenn du nicht direkt über die „Melden“-Funktion an einem Inhalt hierher gekommen bist.</p>
      <div className="not-prose mt-8 rounded-xl border border-border bg-surface p-6">
        <ReportForm targetType={allowed.includes(sp.typ ?? "") ? sp.typ! : "USER"} targetId={sp.id?.slice(0, 60) || "allgemein"} loggedIn={!!user} />
      </div>
    </LegalPage>
  );
}
