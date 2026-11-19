import { ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { DOC_TYPE, VERIFICATION_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { VerificationForm } from "@/components/account/forms";

export const metadata = { title: "Verifizierung" };

export default async function VerificationPage() {
  const user = await requirePermission("verification.request");
  const history = await db.identityVerification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <PageHeader title="Identitäts- & Altersprüfung" description="Zum Schutz vor Minderjährigkeit, Identitätsmissbrauch und Menschenhandel prüfen wir jedes Inserentenkonto, bevor Inhalte veröffentlicht werden." />
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-surface p-5">
        <ShieldCheck className="size-8 text-gold" />
        <div>
          <p className="text-sm text-muted">Aktueller Status</p>
          <p className="font-display text-2xl text-white">{VERIFICATION_STATUS[user.verificationStatus]}</p>
        </div>
      </div>
      {user.verificationStatus === "APPROVED" ? <Alert variant="success">Dein Konto ist verifiziert. Du kannst Sedcards zur Veröffentlichung einreichen.</Alert> : null}
      {user.verificationStatus === "PENDING" ? <Alert variant="info">Deine Unterlagen werden geprüft. Wir benachrichtigen dich, sobald die Prüfung abgeschlossen ist.</Alert> : null}
      {user.verificationStatus === "NONE" || user.verificationStatus === "REJECTED" ? (
        <section className="rounded-xl border border-border bg-surface p-5 sm:p-8">
          {user.verificationStatus === "REJECTED" ? <Alert variant="error" className="mb-5">Deine letzte Prüfung wurde abgelehnt: {history[0]?.reviewNote ?? "–"}. Du kannst neue Unterlagen einreichen.</Alert> : null}
          <p className="mb-5 text-sm text-muted">Hinweis: Eine automatisierte Altersverifikation durch einen zertifizierten Anbieter (z. B. KJM-positiv bewertete AVS) ist noch nicht integriert. Derzeit erfolgt die Prüfung manuell durch geschultes Personal.</p>
          <VerificationForm />
        </section>
      ) : null}
      {history.length ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-2xl text-white">Verlauf</h2>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <span>{DOC_TYPE[h.docType]} · {formatDateTime(h.createdAt)}</span>
                <Badge variant={h.status === "APPROVED" ? "success" : h.status === "REJECTED" ? "danger" : "warning"}>{VERIFICATION_STATUS[h.status]}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
