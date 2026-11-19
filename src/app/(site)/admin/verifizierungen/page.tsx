import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { DOC_TYPE, VERIFICATION_STATUS } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/rbac";
import { mediaUrl } from "@/lib/media";
import { reviewVerificationAction } from "@/actions/admin";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AdminFlash, HiddenBack, inputCls } from "@/components/admin/ui";

export default async function AdminVerifications({ searchParams }: { searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  await requirePermission("moderation.verifications", "/admin");
  const sp = await searchParams;
  const [pending, recent] = await Promise.all([
    db.identityVerification.findMany({ where: { status: "PENDING" }, include: { user: true, profile: { select: { stageName: true, id: true } } }, orderBy: { createdAt: "asc" } }),
    db.identityVerification.findMany({ where: { status: { not: "PENDING" } }, include: { user: { select: { email: true } }, reviewer: { select: { displayName: true } } }, orderBy: { reviewedAt: "desc" }, take: 30 }),
  ]);
  return (
    <div>
      <PageHeader title="Alters- & Identitätsprüfung" description="Prüfe Ausweis, Geburtsjahr und Übereinstimmung mit Profilbildern. Nach der Entscheidung werden die Dokumente automatisch gelöscht." />
      <AdminFlash sp={sp} />
      <Alert variant="info" className="mb-6">Prüfkriterien: Volljährigkeit, Echtheit des Dokuments, Übereinstimmung von Selfie und Dokument, keine Anzeichen von Fremdsteuerung (z. B. identische Dokumente bei mehreren Konten).</Alert>
      {pending.length === 0 ? <EmptyState title="Keine offenen Prüfungen" /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {pending.map((v) => (
            <div key={v.id} className="rounded-xl border border-border bg-surface p-5 text-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Link href={`/admin/benutzer/${v.userId}`} className="font-medium text-gold hover:underline">{v.user.email}</Link>
                <span className="text-xs text-subtle">{formatDateTime(v.createdAt)}</span>
              </div>
              <p>{ROLE_LABELS[v.user.role]} · {DOC_TYPE[v.docType]}{v.profile ? ` · für Sedcard „${v.profile.stageName}“` : ""}</p>
              <p>Angegebenes Geburtsjahr: <strong>{v.birthYear ?? "–"}</strong>{v.birthYear ? ` (≈ ${new Date().getFullYear() - v.birthYear} Jahre)` : ""}</p>
              <div className="my-3 flex gap-3">
                {v.documentKey ? <a href={mediaUrl(v.documentKey)!} target="_blank" rel="noreferrer" className="text-gold underline">Dokument öffnen</a> : null}
                {v.selfieKey ? <a href={mediaUrl(v.selfieKey)!} target="_blank" rel="noreferrer" className="text-gold underline">Selfie öffnen</a> : null}
              </div>
              <form action={reviewVerificationAction} className="space-y-2">
                <HiddenBack path="/admin/verifizierungen" />
                <input type="hidden" name="verificationId" value={v.id} />
                <input name="note" placeholder="Notiz / Ablehnungsgrund" className={`${inputCls} w-full`} />
                <div className="flex gap-2"><Button size="sm" name="decision" value="approve">Bestätigen</Button><Button size="sm" variant="destructive" name="decision" value="reject">Ablehnen</Button></div>
              </form>
            </div>
          ))}
        </div>
      )}
      {recent.length ? (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-2xl text-white">Zuletzt entschieden</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
            {recent.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>{v.user.email} · {DOC_TYPE[v.docType]}</span>
                <span className="flex items-center gap-2 text-xs text-subtle"><Badge variant={v.status === "APPROVED" ? "success" : "danger"}>{VERIFICATION_STATUS[v.status]}</Badge>{v.reviewer?.displayName} · {formatDateTime(v.reviewedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
