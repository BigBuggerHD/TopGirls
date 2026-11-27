"use client";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Ban, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WEEKDAYS } from "@/lib/labels";
import { dayMode, type Availability, type DayMode } from "@/lib/availability";
import { centsToInput, PRICE_DURATIONS, type PriceRow } from "@/lib/prices";
import { cn } from "@/lib/utils";
import { FancySelect } from "@/components/ui/fancy-select";
import { Switch } from "@/components/ui/switch";

type DayState = { active: boolean; mode: DayMode; from: string; to: string };

/** Uhrzeiten im 30-Minuten-Raster für die Auswahl (vorhandene abweichende Werte werden ergänzt). */
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const timeOptions = (current: string) => {
  const list = TIMES.includes(current) || !/^\d{2}:\d{2}$/.test(current) ? TIMES : [...TIMES, current].sort();
  return list.map((t) => ({ value: t, label: `${t} Uhr` }));
};

const MODES: { mode: DayMode; label: string }[] = [
  { mode: "time", label: "Uhrzeit" },
  { mode: "allday", label: "Ganztägig" },
  { mode: "arrange", label: "Zeit n. Absprache" },
];

/**
 * Verfügbarkeit je Wochentag: Schalter pro Tag, Art (Uhrzeit / Ganztägig / Uhrzeit nach Absprache)
 * und Von–Bis als Dropdowns. Nicht aktive Tage gelten als „nach Absprache“.
 */
export function AvailabilityEditor({ initial }: { initial: Availability }) {
  const [days, setDays] = useState<Record<string, DayState>>(() =>
    Object.fromEntries(
      WEEKDAYS.map(([k]) => {
        const d = initial[k];
        return [k, { active: !!d?.active, mode: dayMode(d) ?? "time", from: d?.from ?? "10:00", to: d?.to ?? "20:00" }];
      }),
    ),
  );
  const set = (k: string, patch: Partial<DayState>) => setDays((all) => ({ ...all, [k]: { ...all[k], ...patch } }));
  const firstActive = WEEKDAYS.map(([k]) => k).find((k) => days[k].active);
  const copyToAll = () => {
    if (!firstActive) return;
    const src = days[firstActive];
    setDays((all) => Object.fromEntries(Object.entries(all).map(([k, d]) => [k, d.active ? { ...d, mode: src.mode, from: src.from, to: src.to } : d])));
  };

  return (
    <fieldset className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="font-display text-xl text-white">Verfügbarkeit</legend>
        <div className="flex flex-wrap gap-2">
          {firstActive ? (
            <Button type="button" variant="outline" size="sm" onClick={copyToAll} title="Zeiten des ersten aktiven Tages für alle aktiven Tage übernehmen">
              <Copy /> Für alle aktiven Tage übernehmen
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => setDays((all) => Object.fromEntries(Object.entries(all).map(([k, d]) => [k, { ...d, active: false }])))}>
            <Ban /> Verfügbarkeit nach Absprache
          </Button>
        </div>
      </div>
      <p className="text-xs text-subtle">Schalte die Tage ein, an denen du verfügbar bist. Ausgeschaltete Tage erscheinen auf deiner Sedcard als „nach Absprache“.</p>
      <div className="divide-y divide-border rounded-xl border border-border bg-surface-2 px-4 sm:px-5">
        {WEEKDAYS.map(([k, label]) => {
          const d = days[k];
          return (
            <div key={k} className="grid gap-3 py-3 md:grid-cols-[9.5rem_auto_1fr] md:items-center">
              {/* Tag + Schalter */}
              <div className="flex items-center gap-3">
                <Switch name={`av_${k}_on`} checked={d.active} onChange={(v) => set(k, { active: v })} label={`${label} verfügbar`} />
                <span className={cn("text-sm font-medium", d.active ? "text-foreground" : "text-subtle")}>{label}</span>
                {!d.active ? <span className="ml-auto text-sm text-subtle md:hidden">nach Absprache</span> : null}
              </div>
              {d.active ? (
                <>
                  {/* Art der Verfügbarkeit */}
                  <div className="inline-flex w-fit rounded-lg border border-border bg-background-alt p-0.5" role="radiogroup" aria-label={`${label}: Art der Verfügbarkeit`}>
                    {MODES.map((m) => (
                      <button key={m.mode} type="button" role="radio" aria-checked={d.mode === m.mode} onClick={() => set(k, { mode: m.mode })}
                        className={cn("rounded-md px-3 py-1.5 text-xs transition-colors", d.mode === m.mode ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground")}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {/* Uhrzeit von – bis */}
                  {d.mode === "time" ? (
                    <div className="flex items-center gap-2 md:justify-end">
                      <div className="w-32"><FancySelect key={`${k}-from-${d.from}`} name={`av_${k}_from`} allowEmpty={false} defaultValue={d.from} onChange={(v) => set(k, { from: v })} ariaLabel={`${label} von`} options={timeOptions(d.from)} /></div>
                      <span className="text-sm text-subtle">bis</span>
                      <div className="w-32"><FancySelect key={`${k}-to-${d.to}`} name={`av_${k}_to`} allowEmpty={false} defaultValue={d.to} onChange={(v) => set(k, { to: v })} ariaLabel={`${label} bis`} options={timeOptions(d.to)} /></div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted md:text-right">{d.mode === "allday" ? "ganztägig verfügbar" : "Uhrzeit nach Absprache"}</p>
                  )}
                </>
              ) : (
                <p className="hidden text-sm text-subtle md:col-span-2 md:block md:text-right">nach Absprache</p>
              )}
              <input type="hidden" name={`av_${k}_mode`} value={d.active ? d.mode : "none"} />
              {!(d.active && d.mode === "time") ? (
                <>
                  <input type="hidden" name={`av_${k}_from`} value={d.from} />
                  <input type="hidden" name={`av_${k}_to`} value={d.to} />
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

type Side = "inc" | "out";

/**
 * Preise: zwei Tabellen nebeneinander (Incall / Outcall) mit den festen Positionen der Vorgabe.
 * Was in Schritt 3 „Service“ nicht gewählt ist, wird ausgegraut (Werte bleiben erhalten).
 */
export function PriceEditor({ initial, incall, outcall, outcallPlace, serviceHref }: { initial: PriceRow[]; incall: boolean; outcall: boolean; outcallPlace?: string | null; serviceHref: string }) {
  const start = (side: Side) =>
    PRICE_DURATIONS.map((d) => {
      const r = initial.find((x) => x.label === d);
      return centsToInput(side === "inc" ? r?.incallCents : r?.outcallCents);
    });
  const [values, setValues] = useState<Record<Side, string[]>>(() => ({ inc: start("inc"), out: start("out") }));
  const enabled: Record<Side, boolean> = { inc: incall, out: outcall };
  const set = (side: Side, i: number, v: string) => setValues((all) => ({ ...all, [side]: all[side].map((x, j) => (j === i ? v : x)) }));
  const copyFrom = (from: Side, to: Side) => setValues((all) => ({ ...all, [to]: all[to].map((x, i) => all[from][i] || x) }));

  const table = (side: Side) => {
    const on = enabled[side];
    const other: Side = side === "inc" ? "out" : "inc";
    const title = side === "inc" ? "Incall" : `Outcall${outcallPlace ? ` (${outcallPlace})` : ""}`;
    return (
      <div className={cn("rounded-xl border border-border bg-surface-2 p-4 transition-opacity sm:p-5", !on && "opacity-45")} aria-disabled={!on}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="font-display text-lg text-white">{title}</h4>
          {on && enabled[other] ? (
            <button type="button" onClick={() => copyFrom(other, side)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-gold/60 hover:text-gold">
              {side === "inc" ? <ArrowLeft className="size-3" /> : <ArrowRight className="size-3" />} Von {side === "inc" ? "Outcall" : "Incall"} übernehmen
            </button>
          ) : !on ? (
            <p className="text-right text-xs text-subtle">In Schritt 3 nicht ausgewählt · <a href={serviceHref} className="text-gold underline">Ändern</a></p>
          ) : null}
        </div>
        <div className="divide-y divide-border">
          {PRICE_DURATIONS.map((d, i) => (
            <div key={d} className="flex items-center justify-between gap-3 py-1.5">
              <span className={cn("text-sm", values[side][i] ? "text-foreground" : "text-muted")}>{d}</span>
              <div className="relative w-32">
                <Input name={`price_${side === "inc" ? "in" : "out"}_${i}`} value={values[side][i]} onChange={(e) => set(side, i, e.target.value)} readOnly={!on} tabIndex={on ? undefined : -1}
                  inputMode="decimal" placeholder="–" aria-label={`${side === "inc" ? "Incall" : "Outcall"} ${d} in Euro`} className="h-9 pr-8 text-right" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">€</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <fieldset className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="font-display text-xl text-white">Preise</legend>
        <Button type="button" variant="outline" size="sm" onClick={() => setValues({ inc: PRICE_DURATIONS.map(() => ""), out: PRICE_DURATIONS.map(() => "") })}><Ban /> Preise nach Absprache</Button>
      </div>
      <p className="text-xs text-subtle">Trage nur die Preise ein, die du anbietest – leere Felder erscheinen nicht auf deiner Sedcard. Ohne Preise steht dort „Preise nach Absprache“.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {table("inc")}
        {table("out")}
      </div>
    </fieldset>
  );
}
