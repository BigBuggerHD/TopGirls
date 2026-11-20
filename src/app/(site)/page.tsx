import Link from "next/link";
import { ArrowRight, BadgeCheck, Search } from "lucide-react";
import { MeetingLegend } from "@/components/profiles/meeting-icons";
import { db } from "@/lib/db";
import { cardSelect, publicProfileWhere } from "@/lib/queries/profiles";
import { runHousekeeping } from "@/lib/housekeeping";
import { trackProfiles } from "@/lib/stats";
import { ProfileCard } from "@/components/profiles/profile-card";
import { MarqueeBanner } from "@/components/home/marquee-banner";
import { getTopProfiles } from "@/lib/queries/top-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategorySelect } from "@/components/home/category-select";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await runHousekeeping();
  const [profiles, categories, top] = await Promise.all([
    db.profile.findMany({ where: { AND: [publicProfileWhere(), { category: { slug: "frauen" } }] }, orderBy: { publishedAt: "desc" }, take: 24, select: cardSelect }),
    db.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getTopProfiles(10, 30, "frauen"),
  ]);
  await trackProfiles([...profiles, ...top].map((p) => p.id), "impressions");

  return (
    <>
      {/* Einleitung */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(243,194,198,0.12),transparent_55%)]" />
        <div className="container-page relative pb-10 pt-14 sm:pt-20">
          <h1 className="max-w-3xl font-display text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
            Exklusive Anzeigen.<br /><span className="text-gold-gradient">Diskret & hochwertig.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
            Top Girls verbindet volljährige Anbieterinnen, Agenturen, Clubs und Massagestudios mit einer anspruchsvollen Zielgruppe – mit geprüften Profilen und klaren Regeln.
          </p>
        </div>
      </section>

      <div className="container-page space-y-6">
        {/* Laufband mit den Top-10-Sedcards – gleiche Breite wie die Sedcards */}
        <MarqueeBanner profiles={top} />

        {/* Suche – gleiche Breite */}
        <form action="/suche" className="grid gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="sr-only" htmlFor="hero-city">Stadt</label>
          <Input id="hero-city" name="stadt" placeholder="Stadt, z. B. Berlin" className="h-12 border-transparent bg-background-alt" />
          <CategorySelect categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
          <Button size="lg" type="submit" className="h-12 sm:px-10"><Search /> Suchen</Button>
        </form>

        {/* Sedcards */}
        <section aria-label="Sedcards" className="pt-4">
          <div className="mb-5 flex flex-wrap justify-end gap-x-6 gap-y-2 text-sm text-muted">
            <span className="flex items-center gap-2"><BadgeCheck className="size-4 text-gold" /> Identitätsgeprüfte Profile</span>
            <MeetingLegend />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4">
            {profiles.map((p, i) => <ProfileCard key={p.id} p={p} priority={i < 4} />)}
          </div>
          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline"><Link href="/frauen">Alle Frauen ansehen <ArrowRight /></Link></Button>
          </div>
        </section>
      </div>

    </>
  );
}
