"use client";
import { useState, useTransition } from "react";
import { BadgeCheck, Copy, ExternalLink, Link2, MessageCircle } from "lucide-react";
import { createAuthenticityLinkAction } from "@/actions/authenticity";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type StepAuthCheck = { status: "OPEN" | "SUBMITTED" | "REJECTED" | "APPROVED"; createdAt: string; recordedAt: string | null; reviewNote: string | null };

/** Schritt 7 „Echtheit“: Einmal-Link für das Echtheits-Video erstellen und teilen; Status der Prüfung. */
export function AuthenticityStep({ profileId, stageName, verifiedAt, check }: { profileId: string; stageName: string; verifiedAt: string | null; check: StepAuthCheck | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const create = () => start(async () => {
    const r = await createAuthenticityLinkAction(profileId);
    setMsg(r.ok ? null : { ok: false, text: r.message });
    if (r.url) { setUrl(r.url); setCopied(false); }
  });
  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(false); }
  };
  const shareText = url ? `Bitte nimm über diesen Link dein kurzes Echtheits-Video für „${stageName}“ auf (Dessous, im Spiegel, mit Fingerherz): ${url}` : "";

  const status = verifiedAt
    ? { tone: "success", text: `Echtheit bestätigt am ${verifiedAt}.` }
    : check?.status === "SUBMITTED" ? { tone: "info", text: `Video eingegangen am ${check.recordedAt} – wird vom Team geprüft.` }
    : check?.status === "REJECTED" ? { tone: "error", text: `Video abgelehnt${check.reviewNote ? `: ${check.reviewNote}` : "."} Über denselben Link kann ein neues Video aufgenommen werden.` }
    : check?.status === "OPEN" ? { tone: "info", text: `Link erstellt am ${check.createdAt} – noch keine Aufnahme eingegangen.` }
    : { tone: "warning", text: "Noch nicht geprüft." };

  return (
    <div className="space-y-6">
      <div className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm",
        status.tone === "success" ? "border-success/30 bg-success/10 text-success" : status.tone === "error" ? "border-danger/30 bg-danger/10 text-danger" : status.tone === "info" ? "border-gold/30 bg-gold/5 text-foreground" : "border-warning/30 bg-warning/10 text-warning")}>
        <BadgeCheck className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-medium">{status.text}</p>
          {!verifiedAt ? <p className="mt-1 text-xs opacity-80">Pflicht: Ohne bestätigte Echtheit wird die Sedcard nicht veröffentlicht.</p> : null}
        </div>
      </div>

      {!verifiedAt ? (
        <section className="space-y-4 rounded-xl border border-border bg-surface-2 p-4 sm:p-5">
          <h3 className="font-display text-xl text-white">Verifizierungslink</h3>
          <p className="text-sm leading-relaxed text-foreground/85">
            Erstelle einen Einmal-Link und schicke ihn der Dame. Über den Link nimmt sie direkt auf dem Handy ein kurzes Verifizierungs-Video
            (Dessous, im Spiegel, mit Fingerherz) auf – mit Standort, Datum und Uhrzeit. Das Echtheitsfoto wird von uns als Standbild aus dem
            Video erstellt. Der Link bleibt gültig, bis die Aufnahme freigegeben wurde.
          </p>
          {url ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-gold/40 bg-background-alt px-3 py-2.5">
                <Link2 className="size-4 shrink-0 text-gold" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground" title={url}>{url}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={copy}><Copy /> {copied ? "Kopiert" : "Link kopieren"}</Button>
                <Button asChild size="sm" variant="outline"><a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> Per WhatsApp senden</a></Button>
                <Button asChild size="sm" variant="outline"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Selbst öffnen</a></Button>
              </div>
              <p className="text-xs text-subtle">Der Link wird aus Sicherheitsgründen nur jetzt angezeigt. Kopiere ihn oder sende ihn direkt. Ein neuer Link macht den alten ungültig.</p>
            </div>
          ) : (
            <Button type="button" onClick={create} disabled={pending}><Link2 /> {check && check.status !== "APPROVED" ? "Neuen Verifizierungs-Link erstellen" : "Verifizierungs-Link erstellen"}</Button>
          )}
          {msg ? <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert> : null}
          <p className="text-xs text-subtle">Alternativ prüft unser Team die Echtheit anhand deiner Bilder. Video und Standort werden nach der Prüfung gelöscht und nie veröffentlicht.</p>
        </section>
      ) : null}
    </div>
  );
}
