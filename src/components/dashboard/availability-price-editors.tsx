"use client";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";
import { WEEKDAYS } from "@/lib/labels";
import { dayMode, type Availability, type DayMode } from "@/lib/availability";
import { centsToInput, PRICE_DURATIONS, type PriceRow } from "@/lib/prices";
import { cn } from "@/lib/utils";

type DayState = { active: boolean; mode: DayMode; from: string; to: string };

/** Verfügbarkeit je Wochentag mit „Ganztägig“ und „Uhrzeit nach Absprache“. Nicht ausgewählte Tage gelten als „nach Absprache“. */
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
  const toggleMode = (k: string, mode: DayMode) => set(k, { active: true, mode: days[k].mode === mode ? "time" : mode });

  return (
    <fieldset className="space-y-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <legend className="text-sm font-medium">Verfügbarkeit</legend>
        <Button type="button" variant="outline" size="sm" onClick={() => setDays((all) => Object.fromEntries(Object.entries(all).map(([k, d]) => [k, { ...d, active: false }])))}>
          <Ban /> Verfügbarkeit nach Absprache
        </Button>
      </div>
      <p className="text-xs text-subtle">Nicht ausgewählte Tage erscheinen auf deiner Sedcard als „nach Absprache“.</p>
      {WEEKDAYS.map(([k, label]) => {
        const d = days[k];
        const mode = d.active ? d.mode : null;
        const chip = (m: DayMode, text: string) => (
          <button
            type="button"
            onClick={() => toggleMode(k, m)}
            aria-pressed={mode === m}
            className={cn("h-9 rounded-md border px-3 text-xs transition-colors", mode === m ? "border-gold bg-gold/15 text-gold" : "border-border text-muted hover:text-foreground")}
          >
            {text}
          </button>
        );
        return (
          <div key={k} className="grid items-center gap-2 rounded-md bg-background-alt px-3 py-2 text-sm sm:grid-cols-[130px_1fr_1fr_auto_auto]">
            <label className="flex items-center gap-2">
              <Checkbox checked={d.active} onChange={(e) => set(k, { active: e.target.checked })} aria-label={`${label} verfügbar`} />
              {label}
            </label>
            <Input type="time" value={d.from} onChange={(e) => set(k, { from: e.target.value })} disabled={mode !== "time"} aria-label={`${label} von`} className="h-9" />
            <Input type="time" value={d.to} onChange={(e) => set(k, { to: e.target.value })} disabled={mode !== "time"} aria-label={`${label} bis`} className="h-9" />
            {chip("allday", "Ganztägig")}
            {chip("arrange", "Uhrzeit nach Absprache")}
            <input type="hidden" name={`av_${k}_mode`} value={mode ?? "none"} />
            <input type="hidden" name={`av_${k}_from`} value={d.from} />
            <input type="hidden" name={`av_${k}_to`} value={d.to} />
          </div>
        );
      })}
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
