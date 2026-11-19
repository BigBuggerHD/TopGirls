import Link from "next/link";
import { MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { runHousekeeping } from "@/lib/housekeeping";
import { formatDate, formatEuro } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/ads/ad-banner";
import { cn } from "@/lib/utils";

export const metadata = { title: "Marktplatz" };

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ kategorie?: string; q?: string; stadt?: string }> }) {
  await runHousekeeping();
  const sp = await searchParams;
  const categories = await db.marketplaceCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const cat = categories.find((c) => c.slug === sp.kategorie);
  const q = (sp.q ?? "").slice(0, 80);
  const listings = await db.marketplaceListing.findMany({
    where: {
      status: "PUBLISHED", owner: { status: "ACTIVE" },
      ...(cat ? { categoryId: cat.id } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
      ...(sp.stadt ? { city: { contains: sp.stadt.slice(0, 80), mode: "insensitive" } } : {}),
    },
    include: { category: true, owner: { select: { companyName: true, displayName: true } } },
    orderBy: { publishedAt: "desc" },
    take: 60,
  });
  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Branchen-Marktplatz" title="Marktplatz" description="Apartmentvermietung, Stellenanzeigen, Agenturangebote und weitere Geschäftsanzeigen – ausschließlich für gewerbliche und legale Angebote." actions={<Button asChild variant="outline"><Link href="/dashboard/marktplatz/neu">Inserat aufgeben</Link></Button>} />
      <AdSlot location="MARKETPLACE_TOP" className="mb-8" />
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/marktplatz" className={cn("rounded-full border px-3 py-1.5 text-xs", !cat ? "border-gold bg-gold/10 text-gold" : "border-border text-muted hover:text-foreground")}>Alle</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/marktplatz?kategorie=${c.slug}`} className={cn("rounded-full border px-3 py-1.5 text-xs", cat?.id === c.id ? "border-gold bg-gold/10 text-gold" : "border-border text-muted hover:text-foreground")}>{c.name}</Link>
        ))}
      </div>
      <form className="mb-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        {cat ? <input type="hidden" name="kategorie" value={cat.slug} /> : null}
        <Input name="q" defaultValue={q} placeholder="Suchbegriff" aria-label="Suchbegriff" />
        <Input name="stadt" defaultValue={sp.stadt ?? ""} placeholder="Stadt" aria-label="Stadt" />
        <Button type="submit">Suchen</Button>
      </form>
      {listings.length === 0 ? <EmptyState title="Keine Inserate gefunden" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((l) => (
            <Link key={l.id} href={`/marktplatz/${l.id}`} className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-gold/50">
              <p className="text-[11px] uppercase tracking-wider text-gold">{l.category.name}</p>
              <p className="mt-2 font-display text-2xl text-white">{l.title}</p>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{l.description}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-subtle">
                <span className="flex items-center gap-1"><MapPin className="size-3" /> {l.city} · {formatDate(l.publishedAt)}</span>
                {l.priceCents != null ? <span className="text-sm text-gold">{formatEuro(l.priceCents)} {l.priceUnit}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
