"use client";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Checkbox, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Country = { code: string; name: string; popular: boolean };

/** Mehrfachauswahl von Ländern mit Suche; gewählte Länder als entfernbare Chips. Sendet `name=<ISO-Code>` je Land. */
export function CountryPicker({ name, options, defaultValue }: { name: string; options: Country[]; defaultValue: string[] }) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [q, setQ] = useState("");
  const toggle = (code: string, on: boolean) => setSelected((cur) => (on ? [...cur, code] : cur.filter((c) => c !== code)));
  const byCode = useMemo(() => new Map(options.map((o) => [o.code, o])), [options]);
  const term = q.trim().toLowerCase();
  const filtered = term ? options.filter((o) => o.name.toLowerCase().includes(term) || o.code.toLowerCase() === term) : options;
  const popular = filtered.filter((o) => o.popular);
  const others = filtered.filter((o) => !o.popular);

  const item = (o: Country) => {
    const on = selected.includes(o.code);
    return (
      <label key={o.code} className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-3", on ? "text-foreground" : "text-muted")}>
        <Checkbox checked={on} onChange={(e) => toggle(o.code, e.target.checked)} aria-label={o.name} />
        <span className="min-w-0 truncate">{o.name}</span>
      </label>
    );
  };

  return (
    <div className="space-y-3">
      {selected.map((c) => <input key={c} type="hidden" name={name} value={c} />)}
      <div className="flex min-h-10 flex-wrap items-center gap-2">
        {selected.length ? (
          <>
            {selected.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/10 py-1 pl-3 pr-1.5 text-sm text-foreground">
                {byCode.get(c)?.name ?? c}
                <button type="button" onClick={() => toggle(c, false)} aria-label={`${byCode.get(c)?.name ?? c} entfernen`} className="flex size-5 items-center justify-center rounded-full text-muted hover:bg-black/30 hover:text-foreground"><X className="size-3.5" /></button>
              </span>
            ))}
            <button type="button" onClick={() => setSelected([])} className="text-xs text-subtle underline hover:text-foreground">Alle entfernen</button>
          </>
        ) : (
          <span className="text-sm text-subtle">Keine Länder ausgeschlossen – deine Sedcard ist überall sichtbar.</span>
        )}
      </div>
      <div className="rounded-xl border border-border bg-background-alt/60">
        <div className="relative border-b border-border p-2">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Land suchen …" aria-label="Land suchen" className="h-9 border-0 bg-transparent pl-9 focus:border-0" />
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {popular.length ? (
            <>
              <p className="px-2.5 pb-1 pt-1 text-[11px] uppercase tracking-wider text-subtle">Häufig</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3">{popular.map(item)}</div>
            </>
          ) : null}
          {others.length ? (
            <>
              <p className="px-2.5 pb-1 pt-3 text-[11px] uppercase tracking-wider text-subtle">Alle Länder</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3">{others.map(item)}</div>
            </>
          ) : null}
          {!filtered.length ? <p className="px-2.5 py-3 text-sm text-subtle">Kein Land gefunden.</p> : null}
        </div>
      </div>
    </div>
  );
}
