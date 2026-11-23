import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Car, Clock, Globe, House, Languages, Mail, MapPin } from "lucide-react";
import { MEETING_FILTER_KEY, meetingTypes } from "@/lib/meeting";
import { db } from "@/lib/db";
import { publicProfileWhere } from "@/lib/queries/profiles";
import { trackProfiles } from "@/lib/stats";
import { getCurrentUser } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media";
import { WEEKDAYS } from "@/lib/labels";
import { formatDate, formatEuro } from "@/lib/format";
import { parsePrices } from "@/lib/prices";
import { Gallery } from "@/components/profiles/gallery";
import { ContactReveal } from "@/components/profiles/contact-reveal";
import { ReportDialog } from "@/components/report/report-dialog";
import { AdSlot } from "@/components/ads/ad-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StartConversationForm } from "@/components/messages/start-conversation";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return db.profile.findFirst({
    where: { AND: [publicProfileWhere(), { slug }] },
    include: {
      category: true,
      owner: { select: { id: true, role: true, companyName: true, displayName: true } },
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

export default async function ProfilePage({ params }: Params) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const user = await getCurrentUser();
  await trackProfiles([p.id], "views");

  const meeting = meetingTypes(p);

  // Eigenschaften-Tabelle: Alter + ALLE aktiven Eigenschaften der Kategorie (ohne Angabe: „–“),
  // außer Treffpunkt (Incall/Outcall-Symbole) und Leistungen (eigene Zeile darunter)
  const HIDDEN_IN_TABLE = [MEETING_FILTER_KEY, "leistungen"];
  const categoryFilters = await db.filterDefinition.findMany({
    where: { active: true, key: { notIn: HIDDEN_IN_TABLE }, categories: { some: { categoryId: p.categoryId } } },
    orderBy: { sortOrder: "asc" },
  });
  const traits: { label: string; value: string }[] = [
    { label: "Alter", value: p.age ? `${p.age} Jahre` : "–" },
    ...categoryFilters.map((f) => {
      const a = p.attributes.find((x) => x.filterId === f.id);
      const value = !a ? ""
        : f.type === "BOOLEAN" ? (a.boolValue == null ? "" : a.boolValue ? "Ja" : "Nein")
        : f.type === "NUMBER" ? (a.numberValue != null ? `${a.numberValue}${f.unit ? ` ${f.unit}` : ""}` : "")
        : a.options.map((o) => o.option.label).join(", ");
      return { label: f.label, value: value || "–" };
    }),
  ];
  // Preisliste: Spalte nur befüllen, wenn Incall bzw. Outcall beim Treffpunkt gewählt ist (ohne Auswahl: beide)
  const prices = parsePrices(p.prices);
  const noMeetingChoice = !meeting.incall && !meeting.outcall;
  const showIncall = meeting.incall || noMeetingChoice;
  const showOutcall = meeting.outcall || noMeetingChoice;
  const services = p.attributes.find((a) => a.filter.key === "leistungen" && a.filter.active)?.options.map((o) => o.option.label) ?? [];
  const availability = (p.availability ?? {}) as Record<string, { active?: boolean; from?: string; to?: string }>;
  const hasAvailability = WEEKDAYS.some(([k]) => availability[k]?.active);
  const isBusinessOwner = ["AGENCY", "CLUB", "MASSAGE_STUDIO"].includes(p.owner.role);

  return (
    <div className="container-page py-10">
      <nav aria-label="Brotkrumen" className="mb-6 text-xs text-subtle">
        <Link href="/" className="hover:text-gold">Startseite</Link> / <Link href={`/${p.category.slug}`} className="hover:text-gold">{p.category.name}</Link> / <span className="text-muted">{p.stageName}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Zeile 1 links: Bilder */}
        <div>
          <Gallery name={p.stageName} images={p.images.map((i) => ({ id: i.id, src: mediaUrl(i.storageKey)!, thumb: mediaUrl(i.thumbKey)! }))} />
        </div>

        <div>
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
          {isBusinessOwner && p.owner.companyName ? <p className="mt-2 text-xs text-subtle">Inserent: {p.owner.companyName}</p> : null}

          <div className="gold-hairline my-8" />

          <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
            <div className="space-y-8">
              <section>
                <h2 className="mb-3 font-display text-2xl text-white">Über mich</h2>
                <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{p.description}</div>
              </section>

              {traits.length || services.length ? (
                <section>
                  <h2 className="mb-3 font-display text-2xl text-white">Eigenschaften</h2>
                  <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {traits.map((t) => (
                      <div key={t.label} className="flex justify-between gap-3 border-b border-border pb-2 text-sm">
                        <dt className="text-subtle">{t.label}</dt>
                        <dd className={`text-right ${t.value === "–" ? "text-subtle" : "text-foreground"}`}>{t.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {services.length ? (
                    <div className="mt-6">
                      <h3 className="mb-2 text-sm text-subtle">Leistungen</h3>
                      <ul className="flex flex-wrap gap-2">
                        {services.map((s) => <li key={s} className="rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-sm text-foreground">{s}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-5">
                <p className="mb-4 font-display text-xl text-white">Kontakt</p>
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
              </div>
              <AdSlot location="PROFILE_SIDEBAR" layout="stack" />
              <div className="flex items-center justify-between px-1 text-xs text-subtle">
                <span>Online seit {formatDate(p.publishedAt)}</span>
                <ReportDialog targetType="PROFILE" targetId={p.id} loggedIn={!!user} />
              </div>
            </aside>
          </div>
        </div>
        {/* Zeile 2 links: Verfügbarkeit (unter den Bildern) */}
        <div>
          {hasAvailability || p.availabilityNote ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-2xl text-white"><Clock className="size-5 text-gold" /> Verfügbarkeit</h2>
              {hasAvailability ? (
                <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                  {WEEKDAYS.map(([k, label]) => (
                    <li key={k} className="flex justify-between gap-3 rounded-md bg-surface px-3 py-2">
                      <span className="text-muted">{label}</span>
                      <span className={`whitespace-nowrap ${availability[k]?.active ? "text-foreground" : "text-subtle"}`}>{availability[k]?.active ? `${availability[k]?.from ?? ""} – ${availability[k]?.to ?? ""} Uhr` : "–"}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {p.availabilityNote ? <p className="mt-3 text-sm text-muted">{p.availabilityNote}</p> : null}
            </section>
          ) : null}
        </div>
        {/* Zeile 2 rechts: Preise – auf Höhe der Verfügbarkeit, gleiche Breite wie die Eigenschaften-Tabelle */}
        <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
        <section>
          <h2 className="mb-3 font-display text-2xl text-white">Preise</h2>
          {prices.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-subtle">
                  <th className="pb-2 font-normal">Dauer</th>
                  <th className="pb-2 text-right font-normal"><span className="inline-flex items-center gap-1.5"><House className="size-3.5 text-gold" /> Incall</span></th>
                  <th className="pb-2 text-right font-normal"><span className="inline-flex items-center gap-1.5"><Car className="size-3.5 text-gold" /> Outcall</span></th>
                </tr>
              </thead>
              <tbody>
                {prices.map((r, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-2 text-foreground/90">{r.label}</td>
                    <td className={`py-2 text-right ${showIncall && r.incallCents != null ? "text-foreground" : "text-subtle"}`}>{showIncall && r.incallCents != null ? formatEuro(r.incallCents) : "–"}</td>
                    <td className={`py-2 text-right ${showOutcall && r.outcallCents != null ? "text-foreground" : "text-subtle"}`}>{showOutcall && r.outcallCents != null ? formatEuro(r.outcallCents) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-subtle">Preise auf Anfrage.</p>
          )}
          {p.priceNote ? <p className="mt-2 text-xs text-muted">{p.priceNote}</p> : null}
        </section>
        </div>
      </div>
    </div>
  );
}
