"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Circle, Heart, MapPin, RefreshCw, Send, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SECONDS = 10;
const MIN_SECONDS = 3;
type Phase = "intro" | "camera" | "recording" | "review" | "uploading" | "done";
type Loc = { state: "idle" | "asking" | "ok" | "denied"; lat?: number; lon?: number };

function pickMime() {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

/** Aufnahme des Echtheits-Videos im Browser (Kamera ohne Ton, max. 10 Sekunden), danach Vorschau und Upload. */
export function AuthenticityRecorder({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<{ blob: Blob; url: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [loc, setLoc] = useState<Loc>({ state: "idle" });
  const [now, setNow] = useState<Date | null>(null);
  const live = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(t); stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }

  function askLocation() {
    if (!("geolocation" in navigator)) return setLoc({ state: "denied" });
    setLoc({ state: "asking" });
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ state: "ok", lat: p.coords.latitude, lon: p.coords.longitude }),
      () => setLoc({ state: "denied" }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  }

  async function startCamera(mode = facing) {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) return setError("Dein Browser unterstützt keine Kamera-Aufnahme. Bitte öffne den Link in Chrome oder Safari auf deinem Handy.");
    stopStream();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      stream.current = s;
      setPhase("camera");
      requestAnimationFrame(() => { if (live.current) { live.current.srcObject = s; live.current.play().catch(() => {}); } });
      if (loc.state === "idle") askLocation();
    } catch {
      setError("Kein Zugriff auf die Kamera. Bitte erlaube den Kamerazugriff in den Browser-Einstellungen und versuche es erneut.");
    }
  }

  function startRecording() {
    if (!stream.current) return;
    const mime = pickMime();
    const chunks: Blob[] = [];
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream.current, mime ? { mimeType: mime, videoBitsPerSecond: 2_500_000 } : undefined);
    } catch {
      return setError("Aufnahme wird von diesem Browser nicht unterstützt.");
    }
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (timer.current) clearInterval(timer.current);
      const blob = new Blob(chunks, { type: rec.mimeType || mime || "video/webm" });
      setClip({ blob, url: URL.createObjectURL(blob) });
      stopStream();
      setPhase("review");
    };
    recorder.current = rec;
    rec.start(250);
    setSeconds(0);
    setPhase("recording");
    const started = Date.now();
    timer.current = setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS && rec.state === "recording") rec.stop();
    }, 200);
  }

  function retake() {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    startCamera();
  }

  function upload() {
    if (!clip) return;
    setPhase("uploading");
    setProgress(0);
    setError(null);
    const fd = new FormData();
    fd.append("video", new File([clip.blob], clip.blob.type.includes("mp4") ? "echtheit.mp4" : "echtheit.webm", { type: clip.blob.type }));
    if (loc.state === "ok" && loc.lat != null && loc.lon != null) { fd.append("lat", String(loc.lat)); fd.append("lon", String(loc.lon)); }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/echtheit/${token}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) setPhase("done");
      else {
        let msg = "Upload fehlgeschlagen. Bitte versuche es erneut.";
        try { msg = JSON.parse(xhr.responseText).error ?? msg; } catch {}
        setError(msg);
        setPhase("review");
      }
    };
    xhr.onerror = () => { setError("Keine Verbindung. Bitte versuche es erneut."); setPhase("review"); };
    xhr.send(fd);
  }

  const stamp = now ? now.toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-6 text-center">
        <Check className="mx-auto mb-3 size-10 text-success" />
        <p className="font-display text-2xl text-white">Danke!</p>
        <p className="mt-2 text-sm text-muted">Dein Video ist eingegangen und wird vom Top-Girls-Team geprüft. Du kannst diese Seite jetzt schließen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {phase === "intro" ? (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-3 font-medium text-white">So geht&apos;s</p>
          <ol className="space-y-2.5 text-sm text-foreground/90">
            <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs text-gold">1</span><span>Zieh Dessous an und stell dich vor einen Spiegel.</span></li>
            <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs text-gold">2</span><span>Filme dich im Spiegel und zeig mit den Fingern ein Herz <Heart className="inline size-4 -translate-y-px text-gold" aria-hidden />.</span></li>
            <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs text-gold">3</span><span>Die Aufnahme dauert höchstens {MAX_SECONDS} Sekunden. Danach kannst du sie ansehen und absenden.</span></li>
          </ol>
          <p className="mt-4 text-xs text-subtle">Wir fragen nach Kamera und Standort. Der Ton wird nicht aufgenommen.</p>
          <Button className="mt-5 w-full" size="lg" onClick={() => startCamera()}><Camera /> Kamera starten</Button>
        </div>
      ) : null}

      {phase === "camera" || phase === "recording" ? (
        <div className="space-y-3">
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-black">
            <video ref={live} muted playsInline className={cn("absolute inset-0 size-full object-cover", facing === "user" && "-scale-x-100")} />
            <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{stamp}</div>
            {phase === "recording" ? (
              <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-danger/90 px-3 py-1 text-xs font-semibold text-white">
                <Circle className="size-2.5 fill-current" /> {Math.max(0, MAX_SECONDS - seconds)} s
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            {phase === "camera" ? (
              <>
                <Button className="flex-1" size="lg" onClick={startRecording}><Circle className="fill-current" /> Aufnahme starten</Button>
                <Button variant="outline" size="lg" aria-label="Kamera wechseln" onClick={() => { const f = facing === "user" ? "environment" : "user"; setFacing(f); startCamera(f); }}><SwitchCamera /></Button>
              </>
            ) : (
              <Button className="flex-1" size="lg" variant="outline" disabled={seconds < MIN_SECONDS} onClick={() => recorder.current?.stop()}>
                {seconds < MIN_SECONDS ? `Mindestens ${MIN_SECONDS} Sekunden …` : "Aufnahme beenden"}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {(phase === "review" || phase === "uploading") && clip ? (
        <div className="space-y-3">
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-black">
            <video src={clip.url} controls playsInline className="absolute inset-0 size-full object-contain" />
          </div>
          {phase === "uploading" ? (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-surface-3"><div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="text-center text-xs text-muted">Wird gesendet … {progress} %</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="lg" onClick={retake}><RefreshCw /> Neu aufnehmen</Button>
              <Button className="flex-1" size="lg" onClick={upload}><Send /> Video absenden</Button>
            </div>
          )}
        </div>
      ) : null}

      {phase !== "intro" ? (
        <p className={cn("flex items-center gap-1.5 text-xs", loc.state === "ok" ? "text-success" : loc.state === "denied" ? "text-warning" : "text-subtle")}>
          <MapPin className="size-3.5" />
          {loc.state === "ok" ? "Standort freigegeben" : loc.state === "denied" ? "Standort nicht freigegeben – bitte erlaube den Standort, damit die Prüfung schneller geht." : "Standort wird abgefragt …"}
          {loc.state === "denied" ? <button type="button" onClick={askLocation} className="ml-1 text-gold underline">Erneut</button> : null}
        </p>
      ) : null}
      {error ? <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
