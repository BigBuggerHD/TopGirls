import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { saveCategoryAction } from "@/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { AdminFlash, HiddenBack, inputCls } from "@/components/admin/ui";

type Cat = { id: string; name: string; slug: string; description: string | null; sortOrder: number; active: boolean };

function CatForm({ kind, c }: { kind: string; c?: Cat }) {
  return (
    <form action={saveCategoryAction} className="grid items-end gap-2 rounded-lg border border-border bg-background-alt p-3 text-xs sm:grid-cols-[1fr_1fr_2fr_70px_auto_auto]">
      <HiddenBack path="/admin/kategorien" />
      <input type="hidden" name="kind" value={kind} />
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <label>Name<input name="name" defaultValue={c?.name} required className={`${inputCls} w-full`} /></label>
      <label>Slug<input name="slug" defaultValue={c?.slug} className={`${inputCls} w-full`} /></label>
      <label>Beschreibung<input name="description" defaultValue={c?.description ?? ""} className={`${inputCls} w-full`} /></label>
      <label>Sortierung<input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className={`${inputCls} w-full`} /></label>
      <label className="flex items-center gap-1.5 pb-2"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} className="accent-[#F3C2C6]" /> aktiv</label>
      <Button size="sm">{c ? "Speichern" : "Anlegen"}</Button>
    </form>
  );
}

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  await requirePermission("admin.categories", "/admin");
  const sp = await searchParams;
  const [profileCats, mpCats, forumCats] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.marketplaceCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.forumCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const section = (title: string, kind: string, cats: Cat[], hint?: string) => (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      {hint ? <p className="mb-3 text-xs text-subtle">{hint}</p> : <div className="mb-3" />}
      <div className="space-y-2">{cats.map((c) => <CatForm key={c.id} kind={kind} c={c} />)}<p className="pt-2 text-xs uppercase tracking-wider text-gold">Neu</p><CatForm kind={kind} /></div>
    </section>
  );
  return (
    <div>
      <PageHeader title="Kategorien" description="Profil-, Marktplatz- und Forenkategorien verwalten. Deaktivierte Kategorien werden ausgeblendet." />
      <AdminFlash sp={sp} />
      {section("Profilkategorien", "profile", profileCats, "Die Slugs frauen, online-inserate, clubs und massagen sind mit den Hauptnavigationsseiten verknüpft; weitere Kategorien erscheinen in der Suche.")}
      {section("Marktplatz", "marketplace", mpCats)}
      {section("Forum", "forum", forumCats)}
    </div>
  );
}
