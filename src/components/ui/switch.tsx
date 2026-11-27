"use client";
import { cn } from "@/lib/utils";

/** Schiebeschalter (Ja/Nein). Sendet `name=on`, wenn eingeschaltet. */
export function Switch({ name, checked, onChange, id, label }: { name: string; checked: boolean; onChange: (v: boolean) => void; id?: string; label: string }) {
  return (
    <>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
          checked ? "border-gold bg-gold" : "border-border bg-surface-3",
        )}
      >
        <span className={cn("inline-block size-4 rounded-full shadow transition-transform", checked ? "translate-x-6 bg-background" : "translate-x-1 bg-muted")} />
      </button>
      {checked ? <input type="hidden" name={name} value="on" /> : null}
    </>
  );
}
