import type { Metadata } from "next";
import { LogoMark } from "@/components/logo";
import { db } from "@/lib/db";
import { hashAuthToken } from "@/lib/authenticity";
import { AuthenticityRecorder } from "@/components/authenticity/recorder";

export const metadata: Metadata = { title: "Echtheits-Video", robots: { index: false, follow: false } };

/** Seite hinter dem Einmal-Link: kurzes Echtheits-Video direkt im Handy-Browser aufnehmen. */
export default async function AuthenticityPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = /^[A-Za-z0-9_-]{20,64}$/.test(token)
    ? await db.authenticityCheck.findUnique({ where: { tokenHash: hashAuthToken(token) }, include: { profile: { select: { stageName: true } } } })
    : null;
  const valid = !!check && check.status !== "APPROVED";

  return (
    <main id="inhalt" className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark className="size-10" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Top Girls</p>
            <h1 className="font-display text-2xl text-white">Echtheits-Video</h1>
          </div>
        </div>
        {!valid ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
            {check?.status === "APPROVED" ? "Die Echtheit wurde bereits bestätigt. Dieser Link ist nicht mehr gültig." : "Dieser Link ist ungültig oder wurde durch einen neuen Link ersetzt."}
          </div>
        ) : (
          <>
            <p className="mb-1 text-sm text-muted">Für die Sedcard</p>
            <p className="mb-5 font-display text-3xl text-white">{check.profile.stageName}</p>
            {check.status === "SUBMITTED" ? (
              <p className="mb-5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">Deine Aufnahme ist eingegangen und wird geprüft. Bei Bedarf kannst du sie hier neu aufnehmen.</p>
            ) : check.status === "REJECTED" ? (
              <p className="mb-5 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">Die letzte Aufnahme wurde abgelehnt{check.reviewNote ? `: ${check.reviewNote}` : "."} Bitte nimm ein neues Video auf.</p>
            ) : null}
            <AuthenticityRecorder token={token} />
          </>
        )}
        <p className="mt-8 text-xs leading-relaxed text-subtle">
          Das Video sieht nur das Top-Girls-Team. Datum und Uhrzeit werden beim Eingang gespeichert, vom Standort nur die nächstgelegene größere Stadt.
          Das Video wird nach der Prüfung gelöscht; aufbewahrt wird nur ein internes Standbild als Echtheitsnachweis. Es wird nicht veröffentlicht.
        </p>
      </div>
    </main>
  );
}
