import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deleteFilterOptionAction, saveFilterOptionAction } from "@/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { AdminFlash, HiddenBack, inputCls } from "@/components/admin/ui";
import { FilterForm } from "@/components/admin/filter-form";

export default async function FilterDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  await requirePermission("admin.filters", "/admin");
  const { id } = await params;
  const sp = await searchParams;
  const f = await db.filterDefinition.findUnique({ where: { id }, include: { categories: true, options: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { values: true } } } } } });
  if (!f) notFound();
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const self = `/admin/filter/${id}`;
  const hasOptions = f.type === "SELECT" || f.type === "MULTISELECT";
  return (
    <div>
      <Link href="/admin/filter" className="text-xs text-subtle hover:text-gold">← Filter</Link>
      <PageHeader title={f.label} />
      <AdminFlash sp={sp} />
      <FilterForm f={{ ...f, categoryIds: f.categories.map((c) => c.categoryId) }} categories={categories} back={self} />
      {hasOptions ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-2xl text-white">Optionen</h2>
          <div className="space-y-2">
            {f.options.map((o) => (
              <div key={o.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-background-alt p-3 text-xs">
                <form action={saveFilterOptionAction} className="flex flex-1 flex-wrap items-end gap-2">
                  <HiddenBack path={self} /><input type="hidden" name="filterId" value={id} /><input type="hidden" name="id" value={o.id} />
                  <label>Bezeichnung<input name="label" defaultValue={o.label} className={`${inputCls} w-48`} /></label>
                  <label>Wert (URL)<input name="value" defaultValue={o.value} className={`${inputCls} w-40`} /></label>
                  <label>Sort.<input name="sortOrder" type="number" defaultValue={o.sortOrder} className={`${inputCls} w-16`} /></label>
                  <label className="flex items-center gap-1.5 pb-2"><input type="checkbox" name="active" defaultChecked={o.active} className="accent-[#C6A76B]" /> aktiv</label>
                  <Button size="sm">Speichern</Button>
                  <span className="pb-2 text-subtle">{o._count.values}× verwendet</span>
                </form>
                <form action={deleteFilterOptionAction}><HiddenBack path={self} /><input type="hidden" name="id" value={o.id} /><Button size="sm" variant="ghost" className="text-danger">Löschen</Button></form>
              </div>
            ))}
            <form action={saveFilterOptionAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-gold/40 p-3 text-xs">
              <HiddenBack path={self} /><input type="hidden" name="filterId" value={id} />
              <label>Neue Option<input name="label" required className={`${inputCls} w-48`} /></label>
              <label>Wert (optional)<input name="value" className={`${inputCls} w-40`} /></label>
              <label>Sort.<input name="sortOrder" type="number" defaultValue={(f.options.at(-1)?.sortOrder ?? 0) + 1} className={`${inputCls} w-16`} /></label>
              <input type="hidden" name="active" value="on" />
              <Button size="sm">Hinzufügen</Button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
