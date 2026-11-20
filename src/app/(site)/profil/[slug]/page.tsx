import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Car, Clock, Euro, Globe, House, Languages, Mail, Map as MapIcon, MapPin, Phone, Sparkles } from "lucide-react";
import { meetingTypes } from "@/lib/meeting";
import { db } from "@/lib/db";
import { publicProfileWhere } from "@/lib/queries/profiles";
import { trackProfiles } from "@/lib/stats";
import { getCurrentUser } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media";
import { WEEKDAYS } from "@/lib/labels";
import { formatDate, formatEuro } from "@/lib/format";
import { parsePrices } from "@/lib/prices";
import { CityMap } from "@/components/profiles/city-map";
import { Gallery } from "@/components/profiles/gallery";
import { ContactReveal } from "@/components/profiles/contact-reveal";
import { ReportDialog } from "@/components/report/report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StartConversationForm } from "@/components/messages/start-conversation";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return db.profile.findFirst({
    where: { AND: [publicProfileWhere(), { slug }] },
    include: {
      category: true,
      owner: { select: { id: true } },
      images: { where: { status: "APPROVED" }, orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      attributes: { include: { filter: true, options: { include: { option: true } } }, orderBy: { filter: { sortOrder: "asc" } } },
    },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await db.profile.findFirst({ where: { AND: [publicProfileWhere(), { slug }] }, select: { stageName: true, city: true, headline: true, category: { select: { name: true } } } });
  if (!p) return { title: "Profil nicht gefunden" };
  return { title: `${p.stageName} in ${p.city}`, description: p.headline ?? `${p.stageName} – ${p.category.name} in ${p.city} auf Top Girls.`, alternates: { canonical: `/profil/${slug}` } };
}

const SERVICES_KEY = "leistungen";

function Tile({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-surface p-5 sm:p-6 ${className ?? ""}`}>
      <h2 className="mb-4 flex items-center gap-2 font-display text-2xl text-white">{icon}{title}</h2>
      {children}
    </section>
  );
}

export default async function ProfilePage({ params }: Params) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const user = await getCurrentUser();
  await trackProfiles([p.id], "views");

  const meeting = meetingTypes(p);
  const availability = (p.availability ?? {}) as Record<string, { active?: boolean; from?: string; to?: string }>;
  const hasAvailability = WEEKDAYS.some(([k]) => availability[k]?.active);
  const prices = parsePrices(p.prices);
  const services = p.attributes.find((a) => a.filter.key === SERVICES_KEY && a.filter.active)?.options.map((o) => o.option) ?? [];

  // Eigenschaften als Kacheln (ohne „Leistungen“, die eine eigene Kachel haben)
  const traits = p.attributes
    .filter((a) => a.filter.active && a.filter.key !== SERVICES_KEY)
    .map((a) => ({
      id: a.id,
      label: a.filter.label,
      value:
        a.filter.type === "BOOLEAN" ? (a.boolValue == null ? null : a.boolValue ? "Ja" : "Nein")
        : a.filter.type === "NUMBER" ? (a.numberValue != null ? `${a.numberValue}${a.filter.unit ? ` ${a.filter.unit}` : ""}` : null)
        : a.options.map((o) => o.option.label).join(", ") || null,
    }))
    .filter((t): t is { id: string; label: string; value: string } => !!t.value);

  return (
    <div className="container-page py-10">
      <nav aria-label="Brotkrumen" className="mb-6 text-xs text-subtle">
        <Link href="/" className="hover:text-gold">Startseite</Link> / <Link href={`/${p.category.slug}`} className="hover:text-gold">{p.category.name}</Link> / <span className="text-muted">{p.stageName}</span>
      </nav>

      {/* Bilder links, Infos rechts – die Eigenschaften-Kacheln schließen unten mit dem Bild ab */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)]">
        <Gallery name={p.stageName} images={p.images.map((i) => ({ id: i.id, src: mediaUrl(i.storageKey)!, thumb: mediaUrl(i.thumbKey)! }))} />

        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {p.verified ? <Badge variant="success"><BadgeCheck className="size-3" /> Verifiziert</Badge> : null}
            <Badge>{p.category.name}</Badge>
            {meeting.incall ? <Badge><House className="size-3" /> Incall</Badge> : null}
            {meeting.outcall ? <Badge><Car className="size-3" /> Outcall</Badge> : null}
          </div>
          <h1 className="mt-4 font-display text-5xl text-white">{p.stageName}{p.age ? <span className="text-3xl text-muted">, {p.age}</span> : null}</h1>
          {p.headline ? <p className="mt-2 text-lg text-gold-light">{p.headline}</p> : null}
          <p className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><MapPin className="size-4 text-gold" /> {p.postalCode ? `${p.postalCode} ` : ""}{p.city}{p.region ? `, ${p.region}` : ""}</span>
            {p.languages.length ? <span className="flex items-center gap-1.5"><Languages className="size-4 text-gold" /> {p.languages.join(", ")}</span> : null}
          </p>

          <div className="gold-hairline my-6" />

          {traits.length ? (
            <dl className="grid flex-1 auto-rows-fr grid-cols-2 gap-3 xl:grid-cols-3">
              {traits.map((t) => (
                <div key={t.id} className="flex min-h-16 flex-col justify-center rounded-lg border border-border bg-surface px-4 py-3">
                  <dt className="text-[11px] uppercase tracking-wider text-subtle">{t.label}</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{t.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-subtle">Keine Eigenschaften angegeben.</p>
          )}
        </div>
      </div>

      {/* Leistungen | Kontakt */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Tile title="Leistungen" icon={<Sparkles className="size-5 text-gold" />}>
          {services.length ? (
            <ul className="flex flex-wrap gap-2">
              {services.map((s) => <li key={s.id} className="rounded-full border border-gold/40 bg-gold/5 px-3.5 py-1.5 text-sm text-foreground">{s.label}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-subtle">Keine Leistungen angegeben.</p>
          )}
        </Tile>

        <Tile title="Kontakt" icon={<Phone className="size-5 text-gold" />}>
          <div className="space-y-2">
            <ContactReveal profileId={p.id} hasPhone={p.showPhone && !!p.contactPhone} hasWhatsapp={p.showPhone && !!p.contactWhatsapp} />
            {p.contactEmail ? <Button asChild variant="secondary" className="w-full"><a href={`mailto:${p.contactEmail}`}><Mail /> E-Mail</a></Button> : null}
            {p.contactWebsite ? <Button asChild variant="secondary" className="w-full"><a href={p.contactWebsite} target="_blank" rel="noopener noreferrer nofollow ugc"><Globe /> Website</a></Button> : null}
          </div>
          {p.allowMessages ? (
            <div className="mt-5 border-t border-border pt-5">
              {user ? (
                user.id === p.owner.id ? <p className="text-xs text-subtle">Das ist deine eigene Sedcard.</p> : <StartConversationForm profileId={p.id} />
              ) : (
                <p className="text-xs text-muted"><Link href={`/login?next=/profil/${p.slug}`} className="text-gold hover:underline">Melde dich an</Link>, um eine Nachricht zu senden.</p>
              )}
            </div>
          ) : null}
          <p className="mt-5 text-[11px] leading-relaxed text-subtle">Top Girls vermittelt keine Dienstleistungen. Vereinbarungen kommen ausschließlich zwischen Inserent und Interessent zustande.</p>
        </Tile>
      </div>

      {/* Verfügbarkeit | Preise */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Tile title="Verfügbarkeit" icon={<Clock className="size-5 text-gold" />}>
          {hasAvailability ? (
            <ul className="space-y-1.5 text-sm">
              {WEEKDAYS.map(([k, label]) => (
                <li key={k} className="flex justify-between gap-3 rounded-md bg-background-alt px-3 py-2">
                  <span className="text-muted">{label}</span>
                  <span className={`whitespace-nowrap ${availability[k]?.active ? "text-foreground" : "text-subtle"}`}>{availability[k]?.active ? `${availability[k]?.from ?? ""} – ${availability[k]?.to ?? ""} Uhr` : "–"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-subtle">Keine festen Zeiten angegeben.</p>
          )}
          {p.availabilityNote ? <p className="mt-3 text-sm text-muted">{p.availabilityNote}</p> : null}
        </Tile>

        <Tile title="Preise" icon={<Euro className="size-5 text-gold" />}>
          {prices.length ? (
            <ul className="divide-y divide-border text-sm">
              {prices.map((r, i) => (
                <li key={i} className="flex justify-between gap-3 py-2.5">
                  <span className="text-foreground/90">{r.label}</span>
                  <span className="whitespace-nowrap font-medium text-gold">{formatEuro(r.amountCents)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-subtle">Preise auf Anfrage.</p>
          )}
          {p.priceNote ? <p className="mt-3 text-xs text-muted">{p.priceNote}</p> : null}
        </Tile>
      </div>

      {/* Karte */}
      <Tile title={p.city ? `Standort: ${p.city}` : "Standort"} icon={<MapIcon className="size-5 text-gold" />} className="mt-6">
        <CityMap city={p.city} />
      </Tile>

      <div className="mt-4 flex items-center justify-between px-1 text-xs text-subtle">
        <span>Online seit {formatDate(p.publishedAt)}</span>
        <ReportDialog targetType="PROFILE" targetId={p.id} loggedIn={!!user} />
      </div>
    </div>
  );
}
