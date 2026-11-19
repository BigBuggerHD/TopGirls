import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getFiltersForCategory, searchProfiles, type SearchParams } from "@/lib/queries/profiles";
import { trackProfiles } from "@/lib/stats";
import { runHousekeeping } from "@/lib/housekeeping";
import { formatNumber } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { FilterPanel, type ClientFilter } from "./filter-panel";
import { ProfileGrid } from "./profile-card";
import { Pagination } from "@/components/pagination";
import { AdSlot } from "@/components/ads/ad-banner";

/** Gemeinsame Such-/Kategorieseite. Ohne slug = Gesamtsuche mit Kategorieauswahl. */
export async function CategorySearch({ slug, basePath, searchParams }: { slug?: string; basePath: string; searchParams: SearchParams }) {
  await runHousekeeping();
  const categories = await db.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const effectiveSlug = slug ?? (typeof searchParams.kategorie === "string" ? searchParams.kategorie : undefined);
  const category = effectiveSlug ? categories.find((c) => c.slug === effectiveSlug) : undefined;
  if (slug && !category) notFound();

  const filters = await getFiltersForCategory(category?.id);
  const result = await searchProfiles(searchParams, filters, category?.id);
  await trackProfiles([...result.items, ...result.sponsored].map((p) => p.id), "impressions");

  const clientFilters: ClientFilter[] = filters.map((f) => ({
    key: f.key, label: f.label, type: f.type, unit: f.unit, minValue: f.minValue, maxValue: f.maxValue,
    options: f.options.map((o) => ({ value: o.value, label: o.label })),
  }));

  const sort = typeof searchParams.sortierung === "string" ? searchParams.sortierung : "";
  const sortHref = (s: string) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (k !== "sortierung" && k !== "seite" && v) (Array.isArray(v) ? v : [v]).forEach((x) => p.append(k, x));
    if (s) p.set("sortierung", s);
    return `${basePath}${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow={category ? "Kategorie" : "Suche"}
        title={category?.name ?? "Alle Anzeigen durchsuchen"}
        description={category?.description ?? "Finde Profile nach Stadt, Kategorie und individuellen Eigenschaften."}
      />
      <AdSlot location="SEARCH_TOP" className="mb-8" />
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div><FilterPanel filters={clientFilters} categories={slug ? undefined : categories.map((c) => ({ slug: c.slug, name: c.name }))} /></div>
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">{formatNumber(result.total)} {result.total === 1 ? "Ergebnis" : "Ergebnisse"}</p>
            <div className="flex gap-1 text-xs">
              <Link href={sortHref("")} className={`rounded-full px-3 py-1 ${sort !== "neu" ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground"}`}>Empfohlen</Link>
              <Link href={sortHref("neu")} className={`rounded-full px-3 py-1 ${sort === "neu" ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground"}`}>Neueste</Link>
            </div>
          </div>
          {result.total === 0 ? (
            <EmptyState title="Keine passenden Profile" text="Passe deine Filter an oder versuche es mit einer anderen Stadt." />
          ) : (
            <ProfileGrid items={result.items} sponsored={result.sponsored} />
          )}
          <Pagination page={result.page} pages={result.pages} basePath={basePath} params={searchParams} />
          <AdSlot location="SEARCH_SIDEBAR" take={2} className="mt-10" />
        </div>
      </div>
    </div>
  );
}
