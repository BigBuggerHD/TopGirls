import { saveFilterAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { HiddenBack, inputCls } from "./ui";

type F = { id: string; key: string; label: string; type: string; unit: string | null; helpText: string | null; sortOrder: number; minValue: number | null; maxValue: number | null; active: boolean; showInSearch: boolean; perPerson: boolean; categoryIds: string[] };

export function FilterForm({ f, categories, back }: { f?: F; categories: { id: string; name: string }[]; back: string }) {
  return (
    <form action={saveFilterAction} className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
      <HiddenBack path={back} />
      {f ? <input type="hidden" name="id" value={f.id} /> : null}
      <label>Bezeichnung<input name="label" defaultValue={f?.label} required className={`${inputCls} w-full`} /></label>
      <label>Schlüssel (URL)<input name="key" defaultValue={f?.key} required pattern="[a-z0-9_]{2,40}" className={`${inputCls} w-full`} /></label>
      <label>Typ
        <select name="type" defaultValue={f?.type ?? "SELECT"} className={`${inputCls} w-full`}>
          <option value="SELECT">Einfachauswahl</option><option value="MULTISELECT">Mehrfachauswahl</option><option value="BOOLEAN">Ja/Nein</option><option value="NUMBER">Zahl (Bereich)</option>
        </select>
      </label>
      <label>Sortierung<input name="sortOrder" type="number" defaultValue={f?.sortOrder ?? 0} className={`${inputCls} w-full`} /></label>
      <label>Einheit<input name="unit" defaultValue={f?.unit ?? ""} className={`${inputCls} w-full`} /></label>
      <label>Min.<input name="minValue" type="number" defaultValue={f?.minValue ?? ""} className={`${inputCls} w-full`} /></label>
      <label>Max.<input name="maxValue" type="number" defaultValue={f?.maxValue ?? ""} className={`${inputCls} w-full`} /></label>
      <label>Hilfetext<input name="helpText" defaultValue={f?.helpText ?? ""} className={`${inputCls} w-full`} /></label>
      <fieldset className="sm:col-span-2 lg:col-span-4">
        <legend className="mb-1">Kategorien</legend>
        <div className="flex flex-wrap gap-3">{categories.map((c) => <label key={c.id} className="flex items-center gap-1.5"><input type="checkbox" name="categories" value={c.id} defaultChecked={f?.categoryIds.includes(c.id)} className="accent-[#F3C2C6]" />{c.name}</label>)}</div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-4">
        <label className="flex items-center gap-1.5"><input type="checkbox" name="active" defaultChecked={f?.active ?? true} className="accent-[#F3C2C6]" /> aktiv</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="showInSearch" defaultChecked={f?.showInSearch ?? true} className="accent-[#F3C2C6]" /> in der Suche anzeigen</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="perPerson" defaultChecked={f?.perPerson ?? false} className="accent-[#F3C2C6]" /> pro Person (bei Duo getrennt)</label>
        <Button size="sm">{f ? "Speichern" : "Filter anlegen"}</Button>
      </div>
    </form>
  );
}
