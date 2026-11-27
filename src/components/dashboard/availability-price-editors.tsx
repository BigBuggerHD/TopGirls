"use client";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";
import { WEEKDAYS } from "@/lib/labels";
import { dayMode, type Availability, type DayMode } from "@/lib/availability";
import { centsToInput, MAX_PRICE_ROWS, type PriceRow } from "@/lib/prices";
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

type RowState = { label: string; inc: string; out: string };

/** Preisliste mit Übernahme Incall ↔ Outcall und „Preise nach Absprache“. Leere Preise erscheinen als „nach Absprache“. */
export function PriceEditor({ initial }: { initial: PriceRow[] }) {
  const [rows, setRows] = useState<RowState[]>(() =>
    Array.from({ length: MAX_PRICE_ROWS }, (_, i) => ({ label: initial[i]?.label ?? "", inc: centsToInput(initial[i]?.incallCents), out: centsToInput(initial[i]?.outcallCents) })),
  );
  const set = (i: number, patch: Partial<RowState>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const copy = (dir: "in2out" | "out2in") => setRows((all) => all.map((r) => (dir === "in2out" ? { ...r, out: r.inc || r.out } : { ...r, inc: r.out || r.inc })));

  const euro = (i: number, field: "inc" | "out", label: string) => (
    <div className="relative">
      <Input name={`price_${field === "inc" ? "in" : "out"}_${i}`} value={rows[i][field]} onChange={(e) => set(i, { [field]: e.target.value })} inputMode="decimal" placeholder={label} aria-label={`Preis ${i + 1} – ${label} in Euro`} className="pr-8" />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">€</span>
    </div>
  );

  return (
    <fieldset className="space-y-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <legend className="text-sm font-medium">Preise</legend>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => copy("in2out")} title="Incall-Preise in die Outcall-Spalte übernehmen"><ArrowRight /> Incall → Outcall übernehmen</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => copy("out2in")} title="Outcall-Preise in die Incall-Spalte übernehmen"><ArrowLeft /> Outcall → Incall übernehmen</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRows((all) => all.map((r) => ({ ...r, inc: "", out: "" })))}><Ban /> Preise nach Absprache</Button>
        </div>
      </div>
      <p className="text-xs text-subtle">
        Bis zu {MAX_PRICE_ROWS} Positionen, z. B. „1 Stunde“. Leere Preisfelder erscheinen als „nach Absprache“. Angezeigt wird nur Incall bzw. Outcall, je nachdem, was du unter „Treffpunkt“ (Schritt 4) gewählt hast.
      </p>
      <div className="hidden grid-cols-[1fr_130px_130px] gap-3 text-xs text-subtle sm:grid"><span>Bezeichnung</span><span>Incall</span><span>Outcall</span></div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_130px_130px]">
          <Input name={`price_label_${i}`} value={r.label} onChange={(e) => set(i, { label: e.target.value })} placeholder={i === 0 ? "z. B. 1 Stunde" : ""} maxLength={60} aria-label={`Preis ${i + 1} – Bezeichnung`} className="col-span-2 sm:col-span-1" />
          {euro(i, "inc", "Incall")}
          {euro(i, "out", "Outcall")}
        </div>
      ))}
    </fieldset>
  );
}
