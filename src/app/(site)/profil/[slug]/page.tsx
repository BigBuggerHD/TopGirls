import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Car, Check, ChevronDown, Clock, House, Languages, MapPin, Sparkles } from "lucide-react";
import { MEETING_FILTER_KEY, OUTCALL_PLACE_KEY, meetingTypes } from "@/lib/meeting";
import { db } from "@/lib/db";
import { publicProfileWhere } from "@/lib/queries/profiles";
import { trackProfiles } from "@/lib/stats";
import { getCurrentUser } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media";
import { WEEKDAYS } from "@/lib/labels";
import { formatDate, formatEuro } from "@/lib/format";
import { parsePrices } from "@/lib/prices";
import { BY_ARRANGEMENT, dayLabel, dayMode, hasAnyAvailability, type Availability } from "@/lib/availability";
import { Gallery } from "@/components/profiles/gallery";
import { ContactReveal } from "@/components/profiles/contact-reveal";
import { publicLocation } from "@/lib/districts";
import { ReportDialog } from "@/components/report/report-dialog";
import { AdSlot } from "@/components/ads/ad-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  // Eigenschaften-Tabelle: Alter + ALLE aktiven Eigenschaften der Kategorie (ohne Angabe: „–“).
  // Service-Angaben (Bereich „service“) stehen im eigenen Block darunter.
  const categoryFilters = await db.filterDefinition.findMany({
    where: { active: true, section: "eigenschaften", categories: { some: { categoryId: p.categoryId } } },
    orderBy: { sortOrder: "asc" },
  });
  const duo = p.profileType === "DUO";
  const valueFor = (f: (typeof categoryFilters)[number], person: number) => {
    const a = p.attributes.find((x) => x.filterId === f.id && x.person === person);
    const value = !a ? ""
      : f.type === "BOOLEAN" ? (a.boolValue == null ? "" : a.boolValue ? "Ja" : "Nein")
      : f.type === "NUMBER" ? (a.numberValue != null ? `${a.numberValue}${f.unit ? ` ${f.unit}` : ""}` : "")
      : a.options.map((o) => o.option.label).join(", ");
    return value || "–";
  };
  // Zeilen in Listen-Reihenfolge; „Alter“ steht nach „Orientierung“ (bzw. am Anfang)
  const traits: { label: string; values: [string, string] }[] = categoryFilters.map((f) => ({
    label: f.label,
    values: [valueFor(f, 1), duo && f.perPerson ? valueFor(f, 2) : valueFor(f, 1)] as [string, string],
  }));
  const ageRow = { label: "Alter", values: [p.age ? `${p.age} Jahre` : "–", p.age2 ? `${p.age2} Jahre` : "–"] as [string, string] };
  const orientationIndex = categoryFilters.findIndex((f) => f.key === "orientierung");
  traits.splice(orientationIndex >= 0 ? orientationIndex + 1 : 0, 0, ageRow);
  // Preisliste: Spalte nur befüllen, wenn Incall bzw. Outcall beim Treffpunkt gewählt ist (ohne Auswahl: beide)
  const prices = parsePrices(p.prices);
  const noMeetingChoice = !meeting.incall && !meeting.outcall;
  const showIncall = meeting.incall || noMeetingChoice;
  const showOutcall = meeting.outcall || noMeetingChoice;
  // Service: nur Angaben mit Auswahl, Reihenfolge wie im Assistenten
  const serviceAttrs = p.attributes
    .filter((a) => a.person === 1 && a.filter.active && a.filter.section === "service")
    .map((a) => ({ key: a.filter.key, label: a.filter.label, type: a.filter.type, bool: a.boolValue, items: a.options.map((o) => o.option).filter((o) => o.active).sort((x, y) => x.sortOrder - y.sortOrder).map((o) => o.label) }));
  const serviceItems = (key: string) => serviceAttrs.find((a) => a.key === key)?.items ?? [];
  // Outcall-Ort: „Beides“ wird öffentlich als „Hotel & Privat“ angezeigt
  const outcallPlaceValue = p.attributes.find((a) => a.person === 1 && a.filter.key === OUTCALL_PLACE_KEY)?.options[0]?.option;
  const outcallPlace = outcallPlaceValue ? (outcallPlaceValue.value === "privat-hotel" ? "Hotel & Privat" : outcallPlaceValue.label) : undefined;
  const serviceSummary = [
    { label: "Wen treff ich?", value: serviceItems("wen_treff_ich").join(", ") },
    { label: "Treffmöglichkeiten", value: serviceItems(MEETING_FILTER_KEY).map((l) => (l === "Outcall" && outcallPlace ? `Outcall (${outcallPlace})` : l)).join(", ") },
    { label: "Auch mit", value: serviceItems("auch_mit").join(", ") },
  ].filter((r) => r.value);
  const serviceGroups = serviceAttrs.filter((a) => !["wen_treff_ich", MEETING_FILTER_KEY, OUTCALL_PLACE_KEY, "auch_mit"].includes(a.key) && a.type !== "BOOLEAN" && a.items.length);
  const moreOnRequest = serviceAttrs.some((a) => a.type === "BOOLEAN" && a.key === "weitere_services" && a.bool);
  const serviceCount = serviceGroups.reduce((n, g) => n + g.items.length, 0);
  const availability = (p.availability ?? {}) as Availability;
  const hasAvailability = hasAnyAvailability(availability);

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
            {duo ? <Badge variant="rose">Duo</Badge> : null}
            {meeting.incall ? <Badge><House className="size-3" /> Incall</Badge> : null}
            {meeting.outcall ? <Badge><Car className="size-3" /> Outcall</Badge> : null}
          </div>
          <h1 className="mt-4 font-display text-5xl text-white">{p.stageName}{p.age ? <span className="text-3xl text-muted">, {p.age}{duo && p.age2 ? ` & ${p.age2}` : ""}</span> : null}</h1>
          {p.headline ? <p className="mt-2 text-lg text-gold-light">{p.headline}</p> : null}
          <p className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><MapPin className="size-4 text-gold" /> {publicLocation(p)}</span>
            {p.languages.length ? <span className="flex items-center gap-1.5"><Languages className="size-4 text-gold" /> {p.languages.join(", ")}</span> : null}
          </p>
          {p.owner.companyName ? <p className="mt-2 text-xs text-subtle">Inserent: {p.owner.companyName}</p> : null}

          <div className="gold-hairline my-8" />

          <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
            <div className="space-y-8">
              <section>
                <h2 className="mb-3 font-display text-2xl text-white">Über mich</h2>
                <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{p.description}</div>
              </section>

              {traits.length ? (
                <section>
                  <h2 className="mb-3 font-display text-2xl text-white">Eigenschaften</h2>
                  {duo ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 font-normal text-subtle"><span className="sr-only">Eigenschaft</span></th>
                          <th className="pb-2 text-right font-display text-lg font-normal text-white">{p.stageName.split("&")[0]?.trim() || "Person 1"}</th>
                          <th className="pb-2 text-right font-display text-lg font-normal text-white">{p.partnerName || "Person 2"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {traits.map((t) => (
                          <tr key={t.label} className="border-b border-border">
                            <td className="py-2 text-subtle">{t.label}</td>
                            {t.values.map((v, i) => <td key={i} className={`py-2 text-right ${v === "–" ? "text-subtle" : "text-foreground"}`}>{v}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                      {traits.map((t) => (
                        <div key={t.label} className="flex justify-between gap-3 border-b border-border pb-2 text-sm">
                          <dt className="text-subtle">{t.label}</dt>
                          <dd className={`text-right ${t.values[0] === "–" ? "text-subtle" : "text-foreground"}`}>{t.values[0]}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>
              ) : null}
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-5">
                <p className="mb-4 font-display text-xl text-white">Kontakt</p>
                <div className="space-y-2">
                  <ContactReveal profileId={p.id} hasPhone={!!p.contactPhone && !!p.phoneVerifiedAt} />
                </div>
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
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl text-white"><Clock className="size-5 text-gold" /> Verfügbarkeit</h2>
            {hasAvailability ? (
              <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                {WEEKDAYS.map(([k, label]) => {
                  const fixed = dayMode(availability[k]) !== null;
                  return (
                    <li key={k} className="flex justify-between gap-3 rounded-md bg-surface px-3 py-2">
                      <span className="text-muted">{label}</span>
                      <span className={`whitespace-nowrap ${fixed ? "text-foreground" : "text-subtle"}`}>{dayLabel(availability[k])}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Verfügbarkeit nach Absprache.</p>
            )}
          </section>
        </div>
        {/* Zeile 2 rechts: Preise – auf Höhe der Verfügbarkeit, gleiche Breite wie die Eigenschaften-Tabelle */}
        <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
        <section>
          <h2 className="mb-3 font-display text-2xl text-white">Preise</h2>
          {prices.some((r) => r.incallCents != null || r.outcallCents != null) ? (
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
                    <td className={`py-2 text-right ${showIncall && r.incallCents != null ? "text-foreground" : "text-subtle"}`}>{!showIncall ? "–" : r.incallCents != null ? formatEuro(r.incallCents) : BY_ARRANGEMENT}</td>
                    <td className={`py-2 text-right ${showOutcall && r.outcallCents != null ? "text-foreground" : "text-subtle"}`}>{!showOutcall ? "–" : r.outcallCents != null ? formatEuro(r.outcallCents) : BY_ARRANGEMENT}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">Preise nach Absprache.</p>
          )}
          {p.priceNote ? <p className="mt-2 text-xs text-muted">{p.priceNote}</p> : null}
        </section>
        </div>

        {/* Zeile 3: Service als aufklappbares Menü – von der Verfügbarkeit bis zum Ende der Preistabelle */}
        <details className="group rounded-xl border border-border bg-surface lg:col-span-2 xl:mr-[calc(280px+2rem)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 font-display text-2xl text-white">
              <Sparkles className="size-5 text-gold" /> Service
              <span className="font-sans text-sm text-subtle">({serviceCount})</span>
            </span>
            <ChevronDown className="size-5 text-gold transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="space-y-6 border-t border-border px-5 py-5">
            {serviceSummary.length ? (
              <dl className="divide-y divide-border text-sm">
                {serviceSummary.map((r) => (
                  <div key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-4 py-2">
                    <dt className="text-subtle">{r.label}</dt>
                    <dd className="text-foreground">{r.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {serviceGroups.length ? (
              <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {serviceGroups.map((g) => (
                  <div key={g.key}>
                    <p className="mb-2 text-xs uppercase tracking-wider text-gold">{g.label}</p>
                    <ul className="space-y-1.5">
                      {g.items.map((s) => (
                        <li key={s} className="flex items-center gap-2 text-sm text-foreground"><Check className="size-4 shrink-0 text-gold" /> {s}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
            {moreOnRequest ? <p className="text-sm text-gold-light">Weitere Services auf Anfrage.</p> : null}
            {!serviceSummary.length && !serviceGroups.length && !moreOnRequest ? <p className="text-sm text-subtle">Keine Angaben zum Service.</p> : null}
          </div>
        </details>
      </div>
    </div>
  );
}
