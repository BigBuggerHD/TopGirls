import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Gem, Search, ShieldCheck, Sparkles, Globe2 } from "lucide-react";
import { db } from "@/lib/db";
import { cardSelect, publicProfileWhere } from "@/lib/queries/profiles";
import { runHousekeeping } from "@/lib/housekeeping";
import { trackProfiles } from "@/lib/stats";
import { ProfileCard } from "@/components/profiles/profile-card";
import { AdSlot } from "@/components/ads/ad-banner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  frauen: Gem, "online-inserate": Globe2, clubs: Building2, massagen: Sparkles,
};

export default async function HomePage() {
  await runHousekeeping();
  const now = new Date();
  const [premium, latest, categories, counts] = await Promise.all([
    db.profile.findMany({ where: { AND: [publicProfileWhere(), { premiumUntil: { gt: now } }] }, orderBy: { premiumUntil: "desc" }, take: 8, select: cardSelect }),
    db.profile.findMany({ where: publicProfileWhere(), orderBy: { publishedAt: "desc" }, take: 8, select: cardSelect }),
    db.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.profile.groupBy({ by: ["categoryId"], where: publicProfileWhere(), _count: true }),
  ]);
  await trackProfiles([...new Set([...premium, ...latest].map((p) => p.id))], "impressions");
  const countMap = new Map(counts.map((c) => [c.categoryId, c._count]));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(198,167,107,0.16),transparent_55%),radial-gradient(ellipse_at_90%_100%,rgba(201,138,149,0.08),transparent_50%)]" />
        <div className="container-page relative py-20 sm:py-28">
          <p className="text-xs uppercase tracking-[0.5em] text-gold">Premium-Anzeigenportal</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
            Exklusive Anzeigen.<br /><span className="text-gold-gradient">Diskret & hochwertig.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
            Top Girls verbindet volljährige Anbieterinnen, Agenturen, Clubs und Massagestudios mit einer anspruchsvollen Zielgruppe – mit geprüften Profilen und klaren Regeln.
          </p>
          <form action="/suche" className="mt-10 grid max-w-3xl gap-3 rounded-xl border border-border bg-surface/80 p-3 backdrop-blur sm:grid-cols-[1fr_1fr_auto]">
            <label className="sr-only" htmlFor="hero-city">Stadt</label>
            <Input id="hero-city" name="stadt" placeholder="Stadt, z. B. Berlin" className="h-12 border-transparent bg-background-alt" />
            <label className="sr-only" htmlFor="hero-cat">Kategorie</label>
            <Select id="hero-cat" name="kategorie" className="h-12 border-transparent bg-background-alt" defaultValue="">
              <option value="">Alle Kategorien</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </Select>
            <Button size="lg" type="submit" className="h-12"><Search /> Suchen</Button>
          </form>
          <div className="mt-8 flex flex-wrap gap-6 text-xs text-subtle">
            <span className="flex items-center gap-2"><BadgeCheck className="size-4 text-gold" /> Identitätsgeprüfte Profile</span>
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-gold" /> Moderierte Inhalte</span>
            <span className="flex items-center gap-2"><Gem className="size-4 text-gold" /> Premium-Platzierungen</span>
          </div>
        </div>
      </section>

      {/* Kategorien */}
      <section className="container-page py-16">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? Gem;
            return (
              <Link key={c.id} href={`/${c.slug}`} className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-gold/50 sm:p-6">
                <Icon className="size-6 text-gold" />
                <p className="mt-4 font-display text-2xl text-white">{c.name}</p>
                <p className="mt-1 text-xs text-subtle">{countMap.get(c.id) ?? 0} Anzeigen</p>
                <p className="mt-4 flex items-center gap-1 text-xs text-gold opacity-0 transition-opacity group-hover:opacity-100">Entdecken <ArrowRight className="size-3" /></p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="container-page"><AdSlot location="HOME_HERO" take={2} /></div>

      {premium.length > 0 ? (
        <section className="container-page py-16">
          <SectionHead eyebrow="Ausgewählt" title="Premium-Anzeigen" href="/suche" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {premium.map((p, i) => <ProfileCard key={p.id} p={p} priority={i < 4} />)}
          </div>
        </section>
      ) : null}

      <div className="container-page"><AdSlot location="HOME_INLINE" /></div>

      <section className="container-page py-16">
        <SectionHead eyebrow="Neu bei Top Girls" title="Neueste Profile" href="/suche?sortierung=neu" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {latest.map((p) => <ProfileCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* Inserenten */}
      <section className="container-page py-16">
        <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-surface-2 via-surface to-background-alt p-8 sm:p-14">
          <div aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-gold/10 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.4em] text-gold">Für Inserenten</p>
          <h2 className="mt-4 max-w-xl font-display text-4xl text-white">Präsentiere dich auf höchstem Niveau.</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Erstelle deine Sedcard in wenigen Schritten, buche Premium-Platzierungen und Werbeflächen und behalte deine Statistiken im Blick. Für Agenturen, Clubs und Studios mit Mehrfachverwaltung.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/registrieren">Jetzt inserieren</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/werbung">Werbung & Preise</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({ eyebrow, title, href }: { eyebrow: string; title: string; href: string }) {
  return (
    <div className="mb-8 flex items-end justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">{title}</h2>
      </div>
      <Link href={href} className="hidden items-center gap-1 text-sm text-gold hover:underline sm:flex">Alle ansehen <ArrowRight className="size-4" /></Link>
    </div>
  );
}
