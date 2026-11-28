"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, MapPin } from "lucide-react";
import { confirmAuthenticityAction, rejectAuthenticityAction, revokeAuthenticityAction, saveAuthenticityPhotoAction } from "@/actions/authenticity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inputCls } from "./ui";

export type AdminAuthCheck = {
  id: string; status: "OPEN" | "SUBMITTED" | "REJECTED" | "APPROVED"; createdAt: string; videoUrl: string | null;
  recordedAt: string | null; locationShared: boolean; locationCity: string | null; locationKm: number | null; reviewNote: string | null;
};

const STATUS: Record<AdminAuthCheck["status"], string> = { OPEN: "Link erstellt – noch keine Aufnahme", SUBMITTED: "Aufnahme eingegangen", REJECTED: "Aufnahme abgelehnt", APPROVED: "Bestätigt" };

/** Echtheit prüfen: Video ansehen, Standbild als internes Echtheitsfoto speichern, bestätigen oder ablehnen. */
export function AuthenticityReview({ profileId, verifiedAt, photoUrl, check, sedcardCity }: {
  profileId: string; verifiedAt: string | null; photoUrl: string | null; check: AdminAuthCheck | null; sedcardCity: string;
}) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Browser-Aufnahmen (WebM) haben oft keine Dauer – einmal ans Ende springen, damit gespult werden kann
  const fixDuration = () => {
    const v = video.current;
    if (!v || Number.isFinite(v.duration)) return;
    v.currentTime = 1e101;
    v.ontimeupdate = () => { v.ontimeupdate = null; v.currentTime = 0; };
  };

  const capture = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return setMsg("Video noch nicht geladen.");
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    const data = c.toDataURL("image/jpeg", 0.9);
    start(async () => {
      const r = await saveAuthenticityPhotoAction(profileId, data);
      setMsg(r.message);
      router.refresh();
    });
  };

  const sameCity = check?.locationCity && sedcardCity && check.locationCity.toLowerCase().startsWith(sedcardCity.trim().toLowerCase().slice(0, 5));

  return (
    <section className="rounded-xl border border-border bg-surface p-5 text-sm">
      <h2 className="mb-3 font-display text-xl text-white">Echtheit</h2>
      <p className="mb-3">
        {verifiedAt ? <Badge variant="success">Bestätigt am {verifiedAt}</Badge> : <Badge variant="warning">Noch nicht bestätigt – Pflicht für die Freigabe</Badge>}
      </p>

      {check ? (
        <div className="mb-4 space-y-2">
          <p className="text-muted">Link vom {check.createdAt}: <span className="text-foreground">{STATUS[check.status]}</span></p>
          {check.status === "REJECTED" && check.reviewNote ? <p className="text-xs text-danger">Grund: {check.reviewNote}</p> : null}
          {check.videoUrl ? (
            <>
              <video ref={video} src={check.videoUrl} controls playsInline preload="auto" onLoadedMetadata={fixDuration} className="aspect-[3/4] w-full rounded-lg bg-black object-contain" />
              <Button type="button" size="sm" variant="outline" className="w-full" disabled={pending} onClick={capture}>
                <Camera /> Aktuelles Bild als Echtheitsfoto übernehmen
              </Button>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between gap-2"><dt className="text-subtle">Aufgenommen (Serverzeit)</dt><dd>{check.recordedAt}</dd></div>
                <div className="flex justify-between gap-2">
                  <dt className="flex items-center gap-1 text-subtle"><MapPin className="size-3" /> Standort (grob)</dt>
                  <dd className={check.locationShared ? (sameCity ? "text-success" : "text-warning") : "text-warning"}>
                    {check.locationShared ? `ca. ${check.locationKm} km von ${check.locationCity}` : "nicht freigegeben"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2"><dt className="text-subtle">Stadt der Sedcard</dt><dd>{sedcardCity || "–"}</dd></div>
              </dl>
            </>
          ) : null}
        </div>
      ) : (
        <p className="mb-4 text-xs text-subtle">Noch kein Verifizierungs-Link erstellt. Ohne Video kannst du die Echtheit anhand der Bilder prüfen und bestätigen.</p>
      )}

      {photoUrl ? (
        <div className="mb-4">
          <p className="mb-1 text-xs text-subtle">Echtheitsfoto (intern)</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Echtheitsfoto" className="w-full rounded-lg border border-border" />
        </div>
      ) : null}
      {msg ? <p role="status" className="mb-3 text-xs text-muted">{msg}</p> : null}

      <div className="space-y-2">
        {!verifiedAt ? (
          <form action={confirmAuthenticityAction}>
            <input type="hidden" name="profileId" value={profileId} />
            <Button size="sm" className="w-full">Echtheit bestätigen</Button>
          </form>
        ) : (
          <form action={revokeAuthenticityAction}>
            <input type="hidden" name="profileId" value={profileId} />
            <Button size="sm" variant="ghost" className="w-full text-danger">Bestätigung zurücknehmen</Button>
          </form>
        )}
        {check && check.status === "SUBMITTED" ? (
          <form action={rejectAuthenticityAction} className="space-y-2 border-t border-border pt-3">
            <input type="hidden" name="checkId" value={check.id} />
            <input name="note" placeholder="Grund (z. B. Fingerherz nicht erkennbar)" className={`${inputCls} w-full`} />
            <Button size="sm" variant="secondary" className="w-full">Aufnahme ablehnen</Button>
            <p className="text-[11px] text-subtle">Der Link bleibt gültig – es kann ein neues Video aufgenommen werden.</p>
          </form>
        ) : null}
        <p className="text-[11px] leading-relaxed text-subtle">Beim Bestätigen werden Video und Standort gelöscht; das Echtheitsfoto bleibt intern gespeichert.</p>
      </div>
    </section>
  );
}
