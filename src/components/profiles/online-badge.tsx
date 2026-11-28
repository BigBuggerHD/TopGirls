"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Als „online“ gilt, wer in den letzten 10 Minuten aktiv war. */
export const ONLINE_WINDOW_MS = 10 * 60_000;

/**
 * Grüner „Online“-Hinweis. Wird erst im Browser berechnet (zeitabhängig – vermeidet Abweichungen zwischen Server und Browser).
 * `lastSeen` nur übergeben, wenn die Inhaberin den Online-Status in den Einstellungen freigegeben hat.
 */
export function OnlineBadge({ lastSeen, className, compact = false }: { lastSeen: string | null | undefined; className?: string; compact?: boolean }) {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    if (!lastSeen) return;
    const check = () => setOnline(Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS);
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [lastSeen]);
  if (!online) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-success", className)}>
      <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" /><span className="relative inline-flex size-2 rounded-full bg-success" /></span>
      {compact ? null : "Online"}
    </span>
  );
}
