import { Car, House } from "lucide-react";
import { cn } from "@/lib/utils";

/** Symbole für Incall (Haus) und Outcall (Auto). */
export function MeetingIcons({ incall, outcall, className, size = "md" }: { incall: boolean; outcall: boolean; className?: string; size?: "sm" | "md" }) {
  if (!incall && !outcall) return null;
  const box = size === "md" ? "size-9" : "size-7";
  const icon = size === "md" ? "size-[18px]" : "size-4";
  return (
    <div className={cn("flex gap-1.5", className)}>
      {incall ? (
        <span title="Incall – empfängt in eigenen Räumlichkeiten" className={cn("flex items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/15 backdrop-blur", box)}>
          <House className={icon} aria-hidden /><span className="sr-only">Incall</span>
        </span>
      ) : null}
      {outcall ? (
        <span title="Outcall – Haus- und Hotelbesuche" className={cn("flex items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/15 backdrop-blur", box)}>
          <Car className={icon} aria-hidden /><span className="sr-only">Outcall</span>
        </span>
      ) : null}
    </div>
  );
}

/** Legende über den Sedcards. */
export function MeetingLegend() {
  return (
    <>
      <span className="flex items-center gap-2"><House className="size-4 text-gold" /> Incall</span>
      <span className="flex items-center gap-2"><Car className="size-4 text-gold" /> Outcall</span>
    </>
  );
}
