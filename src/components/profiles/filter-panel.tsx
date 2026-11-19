"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Input, Select, Checkbox } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type ClientFilter = {
  key: string;
  label: string;
  type: "SELECT" | "MULTISELECT" | "BOOLEAN" | "NUMBER";
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  options: { value: string; label: string }[];
};

/** Dynamisches Filterpanel: aktualisiert die URL, die Ergebnisse werden serverseitig neu geladen. */
export function FilterPanel({ filters, categories }: { filters: ClientFilter[]; categories?: { slug: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [city, setCity] = useState(sp.get("stadt") ?? "");

  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setCity(sp.get("stadt") ?? "");
  }, [sp]);

  function update(mut: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("seite");
    start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  }

  // Textfelder verzögert übernehmen
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q || (sp.get("stadt") ?? "") !== city) {
        update((p) => {
          q ? p.set("q", q) : p.delete("q");
          city ? p.set("stadt", city) : p.delete("stadt");
        });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, city]);

  const activeCount = [...sp.keys()].filter((k) => k !== "seite" && k !== "sortierung").length;

  const body = (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="flt-q" className="text-xs uppercase tracking-wider text-subtle">Suchbegriff</label>
        <Input id="flt-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, Stichwort …" />
      </div>
      <div className="space-y-2">
        <label htmlFor="flt-city" className="text-xs uppercase tracking-wider text-subtle">Stadt</label>
        <Input id="flt-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="z. B. Berlin" />
      </div>
      {categories ? (
        <div className="space-y-2">
          <label htmlFor="flt-cat" className="text-xs uppercase tracking-wider text-subtle">Kategorie</label>
          <Select id="flt-cat" value={sp.get("kategorie") ?? ""} onChange={(e) => update((p) => (e.target.value ? p.set("kategorie", e.target.value) : p.delete("kategorie")))}>
            <option value="">Alle Kategorien</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </Select>
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={sp.get("verifiziert") === "1"} onChange={(e) => update((p) => (e.target.checked ? p.set("verifiziert", "1") : p.delete("verifiziert")))} />
        Nur verifizierte Profile
      </label>
      {filters.map((f) => {
        const name = `f_${f.key}`;
        if (f.type === "BOOLEAN") {
          return (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={sp.get(name) === "1"} onChange={(e) => update((p) => (e.target.checked ? p.set(name, "1") : p.delete(name)))} />
              {f.label}
            </label>
          );
        }
        if (f.type === "NUMBER") {
          return (
            <fieldset key={f.key} className="space-y-2">
              <legend className="text-xs uppercase tracking-wider text-subtle">{f.label}{f.unit ? ` (${f.unit})` : ""}</legend>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" inputMode="numeric" aria-label={`${f.label} von`} placeholder={`von ${f.minValue ?? ""}`} defaultValue={sp.get(`${name}_min`) ?? ""} onBlur={(e) => update((p) => (e.target.value ? p.set(`${name}_min`, e.target.value) : p.delete(`${name}_min`)))} />
                <Input type="number" inputMode="numeric" aria-label={`${f.label} bis`} placeholder={`bis ${f.maxValue ?? ""}`} defaultValue={sp.get(`${name}_max`) ?? ""} onBlur={(e) => update((p) => (e.target.value ? p.set(`${name}_max`, e.target.value) : p.delete(`${name}_max`)))} />
              </div>
            </fieldset>
          );
        }
        const selected = sp.getAll(name);
        return (
          <fieldset key={f.key} className="space-y-2">
            <legend className="text-xs uppercase tracking-wider text-subtle">{f.label}</legend>
            <div className="flex flex-wrap gap-1.5">
              {f.options.map((o) => {
                const on = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      update((p) => {
                        const cur = p.getAll(name).filter((v) => v !== o.value);
                        p.delete(name);
                        const next = on ? cur : f.type === "SELECT" ? [...cur, o.value] : [...cur, o.value];
                        next.forEach((v) => p.append(name, v));
                      })
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-gold bg-gold/15 text-gold" : "border-border text-muted hover:border-border-strong hover:text-foreground"}`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      {activeCount > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => start(() => router.replace(pathname, { scroll: false }))}>
          <X /> Alle Filter zurücksetzen
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="filter-panel">
          <SlidersHorizontal /> Filter{activeCount ? ` (${activeCount})` : ""}
        </Button>
        {pending ? <span className="text-xs text-subtle">Aktualisiere …</span> : null}
      </div>
      <div id="filter-panel" className={`${open ? "block" : "hidden"} mb-6 rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-24 lg:mb-0 lg:block`}>
        <div className="mb-5 hidden items-center justify-between lg:flex">
          <p className="font-display text-xl text-white">Filter</p>
          {pending ? <span className="text-xs text-subtle">Aktualisiere …</span> : null}
        </div>
        {body}
      </div>
    </>
  );
}
